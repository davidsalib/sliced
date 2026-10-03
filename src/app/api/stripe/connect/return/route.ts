import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { syncConnectedAccount } from "@/lib/billing";
import { env } from "@/lib/env";

export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${env.siteUrl()}/login?next=/wallet`);
  const ok = await syncConnectedAccount(viewer.id).catch(() => false);
  return NextResponse.redirect(`${env.siteUrl()}/wallet?bank=${ok ? "connected" : "pending"}`, 303);
}
