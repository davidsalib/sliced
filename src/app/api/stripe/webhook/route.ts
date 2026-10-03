import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase/admin";
import { syncConnectedAccount } from "@/lib/billing";

/**
 * Two kinds of Stripe deliveries land here:
 *  - classic snapshot events (payment_intent.*) from a webhook endpoint, signed with STRIPE_WEBHOOK_SECRET
 *  - Accounts v2 thin events (v2.core.account[...]) from an event destination, signed with STRIPE_V2_WEBHOOK_SECRET
 */
function verifySnapshot(body: string, signature: string): Stripe.Event | null {
  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(Boolean) as string[];
  for (const secret of secrets) {
    try {
      return stripe().webhooks.constructEvent(body, signature, secret);
    } catch {
      // try the next secret
    }
  }
  return null;
}

function verifyThin(body: string, signature: string) {
  const secret = process.env.STRIPE_V2_WEBHOOK_SECRET;
  if (!secret) return null;
  try {
    return stripe().parseEventNotification(body, signature, secret);
  } catch {
    return null;
  }
}

async function syncByAccountId(accountId: string) {
  const { data } = await adminDb().from("billing").select("user_id").eq("stripe_account_id", accountId).maybeSingle();
  if (data?.user_id) await syncConnectedAccount(data.user_id);
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const thin = verifyThin(body, signature);
  if (thin) {
    // A connected account's recipient capabilities changed (e.g. bank verified): re-check it.
    const related = "related_object" in thin ? (thin.related_object as { id?: string } | null) : null;
    if (thin.type.startsWith("v2.core.account") && related?.id) await syncByAccountId(related.id);
    return NextResponse.json({ received: true });
  }

  const event = verifySnapshot(body, signature);
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
      // Still sent for connected accounts on some setups; harmless to re-check.
      await syncByAccountId(event.data.object.id);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
