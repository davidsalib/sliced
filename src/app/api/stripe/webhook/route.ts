import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase/admin";
import { syncConnectedAccount } from "@/lib/billing";

function verify(body: string, signature: string): Stripe.Event | null {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  for (const secret of secrets) {
    try {
      return stripe().webhooks.constructEvent(body, signature, secret);
    } catch {
      // try the next endpoint's secret
    }
  }
  return null;
}

export async function POST(req: Request) {
  const body = await req.text();
  const event = verify(body, req.headers.get("stripe-signature") ?? "");
  if (!event) return NextResponse.json({ error: "Bad signature" }, { status: 400 });

  const db = adminDb();
  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const { request_id, user_id } = pi.metadata ?? {};
      if (request_id && user_id) {
        await db
          .from("participants")
          .update({ status: "paid", failure: null, payment_intent_id: pi.id })
          .eq("request_id", request_id)
          .eq("user_id", user_id);
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const { request_id, user_id } = pi.metadata ?? {};
      if (request_id && user_id) {
        await db
          .from("participants")
          .update({ status: "failed", failure: pi.last_payment_error?.message ?? "The charge didn't go through" })
          .eq("request_id", request_id)
          .eq("user_id", user_id)
          .neq("status", "paid");
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object;
      const { data } = await db.from("billing").select("user_id").eq("stripe_account_id", account.id).maybeSingle();
      if (data?.user_id) await syncConnectedAccount(data.user_id, account);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
