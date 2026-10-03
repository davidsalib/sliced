// End-to-end Stripe check for the pizza split, in TEST MODE ONLY.
// Creates throwaway test objects, runs the same calls the app makes, then deletes them.
// Usage: npm run stripe:smoke
import Stripe from "stripe";
import { chargePlan, splitShares } from "../src/lib/split.ts";

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!/^(sk|rk)_test_/.test(key)) {
  console.error("Refusing to run: STRIPE_SECRET_KEY must be a test key (sk_test_ or rk_test_).");
  process.exit(1);
}
const stripe = new Stripe(key);
const cleanup = [];
let failed = false;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const bad = (msg) => ((failed = true), console.log(`  ✘ ${msg}`));
const step = (msg) => console.log(`\n${msg}`);

function recipientParams(extra = {}) {
  return {
    contact_email: "payer@example.com",
    display_name: "Smoke Test Payer",
    identity: { country: "US", entity_type: "individual" },
    defaults: {
      currency: "usd",
      responsibilities: { fees_collector: "application", losses_collector: "application" },
      profile: { product_description: "Getting paid back by a community service crew for shared pizza orders." },
    },
    configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
    include: ["configuration.recipient", "requirements"],
    metadata: { smoke_test: "pizza-service" },
    ...extra,
  };
}
const transfersStatus = (a) => a.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;

try {
  step("1. Platform");
  const platform = await stripe.accounts.retrieve();
  platform.country === "US" ? ok(`US platform ${platform.id}`) : bad(`platform is ${platform.country}; the app expects a US platform`);

  step("2. Payout account, created the way the app does (Express Dashboard, platform covers losses)");
  const appAcct = await stripe.v2.core.accounts.create(recipientParams({ dashboard: "express" }));
  cleanup.push(() => stripe.v2.core.accounts.close(appAcct.id, { applied_configurations: ["recipient"] }));
  ok(`created ${appAcct.id}, transfers capability: ${transfersStatus(appAcct)}`);
  const link = await stripe.v2.core.accountLinks.create({
    account: appAcct.id,
    use_case: { type: "account_onboarding", account_onboarding: { refresh_url: "https://example.com/refresh", return_url: "https://example.com/return", collection_options: { fields: "eventually_due" } } },
  });
  link.url?.startsWith("https://") ? ok("hosted onboarding link created") : bad("no onboarding link");

  step("3. A payout account that can already receive money (Stripe test identity data)");
  const now = new Date();
  const ready = await stripe.v2.core.accounts.create(
    recipientParams({
      dashboard: "none",
      identity: {
        country: "US",
        entity_type: "individual",
        attestations: { terms_of_service: { account: { date: now.toISOString(), ip: "8.8.8.8" } } },
        individual: {
          given_name: "Jenny",
          surname: "Rosen",
          email: "payer@example.com",
          phone: "+14158675309",
          date_of_birth: { day: 1, month: 1, year: 1901 },
          address: { line1: "address_full_match", city: "San Francisco", state: "CA", postal_code: "94103", country: "US" },
          id_numbers: [{ type: "us_ssn", value: "000000000" }],
        },
      },
    }),
  );
  cleanup.push(() => stripe.v2.core.accounts.close(ready.id, { applied_configurations: ["recipient"] }));
  let status = transfersStatus(ready);
  for (let i = 0; i < 10 && status !== "active"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    status = transfersStatus(await stripe.v2.core.accounts.retrieve(ready.id, { include: ["configuration.recipient"] }));
  }
  if (status === "active") ok(`${ready.id} can receive transfers`);
  else {
    const req = await stripe.v2.core.accounts.retrieve(ready.id, { include: ["requirements"] });
    bad(`transfers capability is "${status}"; outstanding: ${JSON.stringify(req.requirements?.entries?.map((e) => e.description ?? e.awaiting_action_from) ?? []).slice(0, 300)}`);
  }

  step("4. Save a card, then charge it off-session as a destination charge (app's math)");
  const customer = await stripe.customers.create({ email: "eater@example.com", metadata: { smoke_test: "pizza-service" } });
  cleanup.push(() => stripe.customers.del(customer.id));
  const si = await stripe.setupIntents.create({ customer: customer.id, usage: "off_session", allowed_payment_method_types: ["card"], payment_method: "pm_card_visa", confirm: true });
  si.status === "succeeded" ? ok("card saved for weekly charges") : bad(`setup intent ${si.status}`);

  // $39.80 split by the payer and 4 others; check one non-payer's charge.
  const shares = splitShares(3980, [{ id: "payer", isPayer: true }, ...["a", "b", "c", "d"].map((id) => ({ id, isPayer: false }))]);
  const share = shares.get("a");
  const plan = chargePlan(share, "eaters");
  if (status === "active") {
    const pi = await stripe.paymentIntents.create(
      {
        amount: plan.charge,
        currency: "usd",
        customer: customer.id,
        payment_method: si.payment_method,
        off_session: true,
        confirm: true,
        description: "Pizza Service smoke test",
        transfer_data: { destination: ready.id },
        application_fee_amount: plan.charge - plan.transfer,
      },
      { idempotencyKey: `smoke-${Date.now()}` },
    );
    pi.status === "succeeded" ? ok(`charged $${(plan.charge / 100).toFixed(2)} (share $${(share / 100).toFixed(2)} + card fee)`) : bad(`payment ${pi.status}`);
    pi.transfer_data?.destination === ready.id ? ok("destination charge routed to the payer's account") : bad(`destination is ${pi.transfer_data?.destination}`);
    const net = pi.amount - (pi.application_fee_amount ?? 0);
    net === share ? ok(`payer's cut is exactly $${(net / 100).toFixed(2)}; the $${((pi.application_fee_amount ?? 0) / 100).toFixed(2)} fee covers Stripe`) : bad(`payer's cut is ${net} cents, expected ${share}`);
    // Stripe creates the transfer and fee shortly after the charge; give it a moment.
    let transfer;
    for (let i = 0; i < 15 && !transfer; i++) {
      transfer = (await stripe.transfers.list({ destination: ready.id, limit: 1 })).data[0];
      if (!transfer) await new Promise((r) => setTimeout(r, 2000));
    }
    transfer ? ok(`transfer of $${(transfer.amount / 100).toFixed(2)} reached the payer's account`) : console.log("  … transfer not listed yet (Stripe creates it asynchronously)");
    const bal = await stripe.balance.retrieve({}, { stripeAccount: ready.id });
    const pending = [...bal.pending, ...bal.available].filter((b) => b.currency === "usd").reduce((t, b) => t + b.amount, 0);
    pending === share ? ok(`payer's Stripe balance shows $${(pending / 100).toFixed(2)}, on its way to their bank`) : console.log(`  … payer balance shows ${pending} cents so far (expected ${share})`);
  } else {
    bad("skipped the charge: no account could receive transfers");
  }

  step("5. Declined card");
  try {
    await stripe.paymentIntents.create({ amount: plan.charge, currency: "usd", customer: customer.id, payment_method: "pm_card_chargeDeclined", off_session: true, confirm: true });
    bad("expected a decline");
  } catch (e) {
    e.code === "card_declined" ? ok("declined as expected; the app marks the share failed and emails a pay-my-share link") : bad(`unexpected error ${e.code}`);
  }
} catch (e) {
  bad(`${e.type ?? "error"}: ${e.message}`);
} finally {
  step("Cleanup");
  for (const fn of cleanup.reverse()) await fn().catch((e) => console.log(`  (cleanup: ${e.message.slice(0, 120)})`));
  console.log("  done");
  process.exit(failed ? 1 : 0);
}
