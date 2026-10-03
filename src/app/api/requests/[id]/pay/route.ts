import { NextResponse } from "next/server";
import { memberOrThrow } from "@/lib/auth";
import { ensureCustomer } from "@/lib/billing";
import { getBilling, getRequest } from "@/lib/data";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase/admin";
import { chargePlan } from "@/lib/split";
import { getSettings } from "@/lib/data";

/** Pay-now for a share whose automatic charge failed. Returns a PaymentIntent client secret. */
export async function POST(_req: Request, ctx: RouteContext<"/api/requests/[id]/pay">) {
  try {
    const { id } = await ctx.params;
    const viewer = await memberOrThrow();
    const { request, participants } = await getRequest(id);
    const me = participants.find((p) => p.user_id === viewer.id);
    if (!request || request.status !== "sliced" || !me || me.status !== "failed" || !me.share_cents) {
      throw new Error("There's nothing for you to pay on this split.");
    }
    const payerBilling = await getBilling(request.payer_id);
    if (!payerBilling.stripe_account_id) throw new Error("The payer hasn't connected a bank yet.");
    const settings = await getSettings();
    const plan = chargePlan(me.share_cents, settings.fees_paid_by);
    const customer = await ensureCustomer(viewer);

    const pi = await stripe().paymentIntents.create(
      {
        amount: plan.charge,
        currency: "usd",
        customer,
        allowed_payment_method_types: ["card"],
        setup_future_usage: "off_session",
        transfer_data: { destination: payerBilling.stripe_account_id, amount: plan.transfer },
        transfer_group: `request_${id}`,
        metadata: { request_id: id, user_id: viewer.id, share_cents: String(me.share_cents), retry: "1" },
      },
      { idempotencyKey: `retry-${id}-${viewer.id}-${me.payment_intent_id ?? "none"}` },
    );
    await adminDb()
      .from("participants")
      .update({ charge_cents: plan.charge, payment_intent_id: pi.id })
      .eq("request_id", id)
      .eq("user_id", viewer.id);
    return NextResponse.json({ clientSecret: pi.client_secret, amount: plan.charge });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Marks the share paid as soon as the browser confirms (the webhook does the same). */
export async function PUT(req: Request, ctx: RouteContext<"/api/requests/[id]/pay">) {
  try {
    const { id } = await ctx.params;
    const viewer = await memberOrThrow();
    const { paymentIntentId } = (await req.json()) as { paymentIntentId?: string };
    if (!paymentIntentId?.startsWith("pi_")) throw new Error("Missing payment id.");
    const pi = await stripe().paymentIntents.retrieve(paymentIntentId);
    if (pi.metadata.request_id !== id || pi.metadata.user_id !== viewer.id) throw new Error("That payment isn't yours.");
    if (pi.status === "succeeded") {
      await adminDb()
        .from("participants")
        .update({ status: "paid", failure: null, payment_intent_id: pi.id })
        .eq("request_id", id)
        .eq("user_id", viewer.id);
    }
    return NextResponse.json({ status: pi.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
