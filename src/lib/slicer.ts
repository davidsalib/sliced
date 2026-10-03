import "server-only";
import Stripe from "stripe";
import { stripe, accountCanReceive } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase/admin";
import { getBilling, getProfilesById, getSettings } from "@/lib/data";
import { notifyPayerNeedsBank, notifySliced } from "@/lib/notify";
import { planCharges, splitShares, STRIPE_MIN_CHARGE_CENTS, type ChargeLine } from "@/lib/split";
import { displayName } from "@/lib/auth";
import type { Participant, SpendRequest } from "@/lib/types";

export type SliceResult = { id: string; outcome: "sliced" | "skipped" | "postponed"; charged?: number; failed?: number };

/** Slices every open split whose time has come. Safe to call as often as you like. */
export async function sliceDueRequests(limit = 10): Promise<SliceResult[]> {
  const { data } = await adminDb()
    .from("requests")
    .select("id")
    .eq("status", "open")
    .lte("slice_at", new Date().toISOString())
    .order("slice_at", { ascending: true })
    .limit(limit);
  const results: SliceResult[] = [];
  for (const { id } of data ?? []) results.push(await sliceRequest(id));
  return results;
}

export async function sliceRequest(id: string): Promise<SliceResult> {
  const db = adminDb();

  // Claim the split so two scheduler runs can't charge it twice.
  const { data: claimed } = await db
    .from("requests")
    .update({ status: "slicing" })
    .eq("id", id)
    .eq("status", "open")
    .select("*");
  const request = claimed?.[0] as SpendRequest | undefined;
  if (!request) return { id, outcome: "skipped" };

  const settings = await getSettings();
  const { data: rows } = await db.from("participants").select("*").eq("request_id", id).order("joined_at", { ascending: true });
  const participants = (rows ?? []) as Participant[];
  const profiles = await getProfilesById([request.payer_id, ...participants.map((p) => p.user_id)]);
  const payer = profiles.get(request.payer_id)!;

  // The payer's bank must be able to receive money before anyone is charged.
  const payerBilling = await getBilling(request.payer_id);
  const destination = payerBilling.stripe_account_id;
  if (!destination || !(await accountCanReceive(destination))) {
    await db
      .from("requests")
      .update({ status: "open", slice_at: new Date(Date.now() + 24 * 3600_000).toISOString() })
      .eq("id", id);
    await db.from("profiles").update({ can_receive: false }).eq("id", request.payer_id);
    await notifyPayerNeedsBank(payer, request);
    return { id, outcome: "postponed" };
  }

  const shares = splitShares(
    request.amount_cents,
    participants.map((p) => ({ id: p.user_id, isPayer: p.kind === "payer" })),
  );

  // Everyone being charged splits Stripe's card fees evenly, so the payer gets every share in full.
  const owing = participants.filter((p) => p.kind !== "payer" && (shares.get(p.user_id) ?? 0) >= STRIPE_MIN_CHARGE_CENTS / 2);
  const plan = new Map<string, ChargeLine>();
  planCharges(owing.map((p) => shares.get(p.user_id) ?? 0)).forEach((line, i) => plan.set(owing[i].user_id, line));

  let transferTotal = 0;
  let charged = 0;
  let failed = 0;

  for (const p of participants) {
    const share = shares.get(p.user_id) ?? 0;
    if (p.kind === "payer") {
      await db.from("participants").update({ share_cents: share, charge_cents: 0, status: "covered" }).eq("request_id", id).eq("user_id", p.user_id);
      continue;
    }
    const line = plan.get(p.user_id);
    const base = { share_cents: share, charge_cents: line?.charge ?? 0 };

    if (!line) {
      // A few cents isn't worth a card charge; the payer covers it.
      await db.from("participants").update({ ...base, charge_cents: 0, status: "covered" }).eq("request_id", id).eq("user_id", p.user_id);
      continue;
    }

    const billing = await getBilling(p.user_id);
    if (!billing.stripe_customer_id || !billing.payment_method_id) {
      failed++;
      await db.from("participants").update({ ...base, status: "failed", failure: "No card on file" }).eq("request_id", id).eq("user_id", p.user_id);
      continue;
    }

    await db.from("participants").update({ ...base, status: "charging" }).eq("request_id", id).eq("user_id", p.user_id);
    try {
      const pi = await stripe().paymentIntents.create(
        {
          amount: line.charge,
          currency: "usd",
          customer: billing.stripe_customer_id,
          payment_method: billing.payment_method_id,
          off_session: true,
          confirm: true,
          description: `Service pizza with ${displayName(payer)} (${settings.crew_name})`,
          statement_descriptor_suffix: "PIZZA",
          // Destination charge: the payer receives exactly the share; the fee slice pays Stripe.
          transfer_data: { destination },
          ...(line.fee > 0 ? { application_fee_amount: line.fee } : {}),
          transfer_group: `request_${id}`,
          metadata: { request_id: id, user_id: p.user_id, share_cents: String(share) },
        },
        { idempotencyKey: `slice-${id}-${p.user_id}` },
      );
      const paid = pi.status === "succeeded";
      if (paid) {
        charged++;
        transferTotal += line.share;
      }
      await db
        .from("participants")
        .update({
          ...base,
          payment_intent_id: pi.id,
          status: paid ? "paid" : pi.status === "processing" ? "charging" : "failed",
          failure: paid || pi.status === "processing" ? null : "Your bank needs you to confirm this charge",
        })
        .eq("request_id", id)
        .eq("user_id", p.user_id);
      if (!paid && pi.status !== "processing") failed++;
    } catch (e) {
      failed++;
      const err = e as Stripe.errors.StripeError;
      const message =
        err.code === "authentication_required" ? "Your bank needs you to confirm this charge" : err.message || "The charge didn't go through";
      await db
        .from("participants")
        .update({ ...base, status: "failed", failure: message, payment_intent_id: err.payment_intent?.id ?? null })
        .eq("request_id", id)
        .eq("user_id", p.user_id);
    }
  }

  await db.from("requests").update({ status: "sliced", sliced_at: new Date().toISOString() }).eq("id", id);

  const { data: after } = await db.from("participants").select("*").eq("request_id", id);
  await notifySliced({ request, payer, participants: (after ?? []) as Participant[], profiles, transferTotal });
  return { id, outcome: "sliced", charged, failed };
}
