import "server-only";
import { adminDb } from "@/lib/supabase/admin";
import type { Answer, Neighbor, NeighborHit, Prayer, WeeklyPost } from "@/lib/types";

export async function getPosts({ includeDrafts = false, limit = 12 } = {}) {
  let q = adminDb().from("weekly_posts").select("*").order("week_of", { ascending: false }).order("created_at", { ascending: false }).limit(limit);
  if (!includeDrafts) q = q.eq("published", true);
  const { data } = await q;
  return (data ?? []) as WeeklyPost[];
}

export async function getPost(id: string) {
  const { data } = await adminDb().from("weekly_posts").select("*").eq("id", id).maybeSingle();
  return (data as WeeklyPost | null) ?? null;
}

/** The published post just before this one, by week. */
export async function getPreviousPost(post: WeeklyPost) {
  const { data } = await adminDb()
    .from("weekly_posts")
    .select("*")
    .eq("published", true)
    .lt("week_of", post.week_of)
    .order("week_of", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as WeeklyPost | undefined) ?? null;
}

export async function getAnswers(postIds: string[]) {
  if (!postIds.length) return [] as Answer[];
  const { data } = await adminDb().from("answers").select("*").in("post_id", postIds).order("created_at", { ascending: true });
  return (data ?? []) as Answer[];
}

export async function getPrayers({ since, limit = 200 }: { since?: string; limit?: number } = {}) {
  let q = adminDb().from("prayers").select("*").order("created_at", { ascending: false }).limit(limit);
  if (since) q = q.gte("created_at", since);
  const { data } = await q;
  return (data ?? []) as Prayer[];
}

export async function getNeighbor(id: string) {
  const { data } = await adminDb().from("neighbors").select("*").eq("id", id).maybeSingle();
  return (data as Neighbor | null) ?? null;
}

export async function getNeighborsById(ids: (string | null)[]) {
  const map = new Map<string, Neighbor>();
  const list = [...new Set(ids.filter(Boolean) as string[])];
  if (!list.length) return map;
  const { data } = await adminDb().from("neighbors").select("*").in("id", list);
  for (const n of (data ?? []) as Neighbor[]) map.set(n.id, n);
  return map;
}

export async function searchNeighbors(q: string, max = 8): Promise<NeighborHit[]> {
  const { data, error } = await adminDb().rpc("search_neighbors", { q, max_results: max });
  if (error) throw new Error(`Name search failed: ${error.message}`);
  return ((data ?? []) as NeighborHit[]).map((h) => ({ ...h, mentions: Number(h.mentions) }));
}
