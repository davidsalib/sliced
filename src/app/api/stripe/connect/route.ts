import { NextResponse } from "next/server";
import { getViewer, isMember } from "@/lib/auth";
import { ensureConnectedAccount } from "@/lib/billing";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

/** Sends the payer to Stripe's hosted onboarding to connect their bank. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer || !isMember(viewer)) return NextResponse.redirect(`${env.siteUrl()}/login?next=/wallet`);
  try {
    const account = await ensureConnectedAccount(viewer);
    const link = await stripe().v2.core.accountLinks.create({
      account,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          refresh_url: `${env.siteUrl()}/api/stripe/connect`,
          return_url: `${env.siteUrl()}/api/stripe/connect/return`,
          collection_options: { fields: "eventually_due" },
        },
      },
    });
    return NextResponse.redirect(link.url, 303);
  } catch (e) {
    console.error("Stripe Connect onboarding failed", e);
    return NextResponse.redirect(`${env.siteUrl()}/wallet?bank=error`, 303);
  }
}
