import "server-only";
import type Stripe from "stripe";
import { stripe, accountCanReceive } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase/admin";
import { getBilling, upsertBilling } from "@/lib/data";
import { displayName } from "@/lib/auth";
import type { Profile } from "@/lib/types";

export async function ensureCustomer(profile: Profile): Promise<string> {
  const billing = await getBilling(profile.id);
  if (billing.stripe_customer_id) return billing.stripe_customer_id;
  const customer = await stripe().customers.create(
    { email: profile.email, name: displayName(profile), metadata: { user_id: profile.id } },
    { idempotencyKey: `customer-${profile.id}` },
  );
  await upsertBilling(profile.id, { stripe_customer_id: customer.id });
  return customer.id;
}

export async function ensureConnectedAccount(profile: Profile): Promise<string> {
  const billing = await getBilling(profile.id);
  if (billing.stripe_account_id) return billing.stripe_account_id;
  const account = await stripe().accounts.create(
    {
      type: "express",
      country: "US",
      email: profile.email,
      business_type: "individual",
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: "Getting paid back by a community service crew for shared pizza orders." },
      metadata: { user_id: profile.id },
    },
    { idempotencyKey: `account-${profile.id}` },
  );
  await upsertBilling(profile.id, { stripe_account_id: account.id });
  return account.id;
}

/** Re-reads a connected account and stores whether it can receive payouts. */
export async function syncConnectedAccount(userId: string, account?: Stripe.Account) {
  const billing = await getBilling(userId);
  if (!billing.stripe_account_id) return false;
  const acct = account ?? (await stripe().accounts.retrieve(billing.stripe_account_id));
  const ok = accountCanReceive(acct);
  await adminDb().from("profiles").update({ can_receive: ok }).eq("id", userId);
  return ok;
}

/** Makes a confirmed SetupIntent's card the one we charge every week. */
export async function saveCardFromSetupIntent(profile: Profile, setupIntentId: string) {
  const billing = await getBilling(profile.id);
  const si = await stripe().setupIntents.retrieve(setupIntentId, { expand: ["payment_method"] });
  if (!billing.stripe_customer_id || si.customer !== billing.stripe_customer_id) throw new Error("That card setup belongs to someone else.");
  if (si.status !== "succeeded") throw new Error("Your card isn't confirmed yet. Try again.");
  const pm = si.payment_method as Stripe.PaymentMethod | null;
  if (!pm) throw new Error("No card came back from Stripe.");

  await stripe().customers.update(billing.stripe_customer_id, { invoice_settings: { default_payment_method: pm.id } });
  const old = billing.payment_method_id;
  await upsertBilling(profile.id, { payment_method_id: pm.id });
  if (old && old !== pm.id) await stripe().paymentMethods.detach(old).catch(() => undefined);

  const label = pm.card ? `${cap(pm.card.brand)} •••• ${pm.card.last4}` : "Card on file";
  await adminDb().from("profiles").update({ has_card: true, card_label: label }).eq("id", profile.id);
  return label;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
