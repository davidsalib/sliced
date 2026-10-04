import { NextResponse } from "next/server";
import { DEV_USERS, devToolsEnabled, type DevUserKind } from "@/lib/dev";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";

/** Localhost-only: sign in as a local test admin, member, or not-yet-invited visitor. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!devToolsEnabled(req.headers.get("host"))) return new NextResponse("Not found", { status: 404 });

  const as = url.searchParams.get("as") as DevUserKind | null;
  const user = as ? DEV_USERS[as] : null;
  const password = process.env.DEV_LOGIN_PASSWORD;
  if (!user || !password) return NextResponse.json({ error: "Run `npm run dev:local` so the dev password is set." }, { status: 400 });
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  // Make sure the test user exists with the right password and role.
  const db = adminDb();
  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 200 });
  if (listError) return NextResponse.json({ error: listError.message }, { status: 500 });
  let id = list.users.find((u) => u.email === user.email)?.id;
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({ email: user.email, password, email_confirm: true, user_metadata: { full_name: user.name } });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Couldn't create the test user." }, { status: 500 });
    id = data.user.id;
  } else {
    await db.auth.admin.updateUserById(id, { password });
  }
  await db.from("profiles").update({ role: user.role, full_name: user.name }).eq("id", id);

  // Sign in for real, so the session cookie is a genuine Supabase session.
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.redirect(new URL(next, url.origin), 303);
}
