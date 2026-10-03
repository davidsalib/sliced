import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) client = new Stripe(env.stripeSecretKey());
  return client;
}

/**
 * Connected accounts (whoever picks up the pizza) are Accounts v2 "recipients".
 * Stripe's readiness check for destination charges is the recipient's stripe_transfers
 * capability; payouts to their bank follow on Stripe's schedule once it's active.
 */
export async function accountCanReceive(accountId: string): Promise<boolean> {
  try {
    const account = await stripe().v2.core.accounts.retrieve(accountId, { include: ["configuration.recipient"] });
    return account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
  } catch {
    return false;
  }
}
