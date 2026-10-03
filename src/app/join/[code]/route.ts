import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/supabase/admin";

/** The crew's invite link. Signs you in first if needed, then makes you a member. */
export async function GET(_req: Request, ctx: RouteContext<"/join/[code]">) {
  const { code } = await ctx.params;
  const viewer = await getViewer();
  if (!viewer) return NextResponse.redirect(`${env.siteUrl()}/login?next=${encodeURIComponent(`/join/${code}`)}`);

  const settings = await getSettings();
  if (code !== settings.invite_code) return NextResponse.redirect(`${env.siteUrl()}/?invite=expired`);
  if (viewer.role === "pending") await adminDb().from("profiles").update({ role: "member" }).eq("id", viewer.id);
  return NextResponse.redirect(`${env.siteUrl()}/?welcome=1`);
}
