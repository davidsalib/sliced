import { NextResponse } from "next/server";
import { memberOrThrow } from "@/lib/auth";
import { saveCardFromSetupIntent } from "@/lib/billing";

/** Called right after Stripe confirms a SetupIntent in the browser. */
export async function POST(req: Request) {
  try {
    const viewer = await memberOrThrow();
    const { setupIntentId } = (await req.json()) as { setupIntentId?: string };
    if (!setupIntentId?.startsWith("seti_")) throw new Error("Missing card setup id.");
    const label = await saveCardFromSetupIntent(viewer, setupIntentId);
    return NextResponse.json({ ok: true, label });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
