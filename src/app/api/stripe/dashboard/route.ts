import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getBilling } from "@/lib/data";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

/** Opens the payer's Stripe Express dashboard (payouts, bank details). */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${env.siteUrl()}/login?next=/wallet`);
  const billing = await getBilling(viewer.id);
  if (!billing.stripe_account_id) return NextResponse.redirect(`${env.siteUrl()}/api/stripe/connect`);
  try {
    const login = await stripe().accounts.createLoginLink(billing.stripe_account_id);
    return NextResponse.redirect(login.url, 303);
  } catch {
    return NextResponse.redirect(`${env.siteUrl()}/api/stripe/connect`, 303);
  }
}
