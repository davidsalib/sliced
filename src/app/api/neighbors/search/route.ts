import { NextResponse } from "next/server";
import { getViewer, isMember } from "@/lib/auth";
import { searchNeighbors } from "@/lib/weekly";

/** Live name search for the neighbor picker. Members only. */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer || !isMember(viewer)) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
  try {
    return NextResponse.json({ results: await searchNeighbors(q, 8) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
