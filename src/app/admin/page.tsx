import { AdminPanel } from "@/components/AdminPanel";
import { Shell } from "@/components/Shell";
import { displayName, requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { env } from "@/lib/env";
import { adminDb } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Crew settings" };

export default async function Admin() {
  const viewer = await requireAdmin();
  const settings = await getSettings();
  const { data } = await adminDb().from("profiles").select("*").order("created_at", { ascending: true });
  const people = ((data ?? []) as Profile[]).map((p) => ({
    id: p.id,
    name: displayName(p),
    email: p.email,
    avatar_url: p.avatar_url,
    full_name: p.full_name,
    role: p.role,
    auto_join: p.auto_join,
    has_card: p.has_card,
    can_receive: p.can_receive,
    isMe: p.id === viewer.id,
  }));

  return (
    <Shell viewer={viewer} crewName={settings.crew_name}>
      <h1 className="font-display text-4xl font-extrabold">Crew settings</h1>
      <AdminPanel settings={settings} inviteUrl={`${env.siteUrl()}/join/${settings.invite_code}`} people={people} />
    </Shell>
  );
}
