import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import type { Billing, Participant, Profile, Settings, SpendRequest } from "@/lib/types";

export async function getSettings(): Promise<Settings> {
  const { data, error } = await adminDb().from("settings").select("*").eq("id", 1).single();
  if (error) throw new Error(`Could not load settings: ${error.message}`);
  return data as Settings;
}

export async function getMembers(): Promise<Profile[]> {
  const { data } = await adminDb()
    .from("profiles")
    .select("*")
    .in("role", ["member", "admin"])
    .order("created_at", { ascending: true });
  return (data ?? []) as Profile[];
}

export async function getProfilesById(ids: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>();
  if (!ids.length) return map;
  const { data } = await adminDb().from("profiles").select("*").in("id", [...new Set(ids)]);
  for (const p of (data ?? []) as Profile[]) map.set(p.id, p);
  return map;
}

export async function getRequest(id: string) {
  const db = adminDb();
  const [{ data: request }, { data: participants }] = await Promise.all([
    db.from("requests").select("*").eq("id", id).maybeSingle(),
    db.from("participants").select("*").eq("request_id", id).order("joined_at", { ascending: true }),
  ]);
  return { request: request as SpendRequest | null, participants: (participants ?? []) as Participant[] };
}

export async function getRequests(status: SpendRequest["status"][], limit = 30) {
  const { data } = await adminDb()
    .from("requests")
    .select("*")
    .in("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as SpendRequest[];
}

export async function getParticipantsFor(requestIds: string[]) {
  const by = new Map<string, Participant[]>();
  if (!requestIds.length) return by;
  const { data } = await adminDb()
    .from("participants")
    .select("*")
    .in("request_id", requestIds)
    .order("joined_at", { ascending: true });
  for (const p of (data ?? []) as Participant[]) {
    const list = by.get(p.request_id) ?? [];
    list.push(p);
    by.set(p.request_id, list);
  }
  return by;
}

export async function getBilling(userId: string): Promise<Billing> {
  const { data } = await adminDb().from("billing").select("*").eq("user_id", userId).maybeSingle();
  return (data as Billing | null) ?? { user_id: userId, stripe_customer_id: null, payment_method_id: null, stripe_account_id: null };
}

export async function upsertBilling(userId: string, patch: Partial<Omit<Billing, "user_id">>) {
  const { error } = await adminDb()
    .from("billing")
    .upsert({ user_id: userId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(`Could not save billing: ${error.message}`);
}
