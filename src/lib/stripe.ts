import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) client = new Stripe(env.stripeSecretKey());
  return client;
}

/** True when a connected account can receive transfers and pay them out to a bank. */
export function accountCanReceive(account: Stripe.Account) {
  return Boolean(account.payouts_enabled && account.capabilities?.transfers === "active");
}
