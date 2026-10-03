import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) client = new Stripe(env.stripeSecretKey());
  return client;
}

/**
 * Connected accounts (whoever picks up the pizza) are Accounts v2 "recipients":
 * they can receive transfers from the platform and pay out to their bank.
 * True when Stripe says both are active.
 */
export async function accountCanReceive(accountId: string): Promise<boolean> {
  try {
    const account = await stripe().v2.core.accounts.retrieve(accountId, { include: ["configuration.recipient"] });
    const balance = account.configuration?.recipient?.capabilities?.stripe_balance;
    const transfers = balance?.stripe_transfers?.status;
    const payouts = balance?.payouts?.status ?? "active";
    return transfers === "active" && payouts === "active";
  } catch {
    return false;
  }
}
