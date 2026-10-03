import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminDb } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

/** The signed-in person, verified with Supabase Auth, or null. */
export async function getViewer(): Promise<Profile | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null; // not configured yet: show the landing page
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await adminDb().from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  return (profile as Profile | null) ?? null;
}

export const isMember = (p: Profile | null) => p?.role === "member" || p?.role === "admin";

/** For pages: send strangers to login and pending people home. */
export async function requireMember(next = "/"): Promise<Profile> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!isMember(viewer)) redirect("/");
  return viewer;
}

export async function requireAdmin(): Promise<Profile> {
  const viewer = await requireMember("/admin");
  if (viewer.role !== "admin") redirect("/");
  return viewer;
}

/** For server actions and route handlers: throw instead of redirecting. */
export async function memberOrThrow(): Promise<Profile> {
  const viewer = await getViewer();
  if (!viewer || !isMember(viewer)) throw new Error("Sign in with an invited account first.");
  return viewer;
}

export { displayName } from "@/lib/auth-shared";
