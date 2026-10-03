import { NextResponse } from "next/server";
import { sliceDueRequests } from "@/lib/slicer";

export const maxDuration = 60;

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await sliceDueRequests();
  return NextResponse.json({ ok: true, results });
}

// Vercel Cron sends GET; Supabase pg_cron (supabase/cron.sql) sends POST.
export const GET = handle;
export const POST = handle;
