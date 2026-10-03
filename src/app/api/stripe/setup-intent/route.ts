import { NextResponse } from "next/server";
import { memberOrThrow } from "@/lib/auth";
import { ensureCustomer } from "@/lib/billing";
import { stripe } from "@/lib/stripe";

/** Starts saving a card for weekly off-session charges. */
export async function POST() {
  try {
    const viewer = await memberOrThrow();
    const customer = await ensureCustomer(viewer);
    const si = await stripe().setupIntents.create({
      customer,
      usage: "off_session",
      allowed_payment_method_types: ["card"],
      metadata: { user_id: viewer.id },
    });
    return NextResponse.json({ clientSecret: si.client_secret });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
