import "server-only";
import { getProfilesById } from "@/lib/data";
import { answerRows } from "@/lib/rows";
import type { Profile, WeeklyPost } from "@/lib/types";
import { getAnswers, getNeighborsById, getPosts } from "@/lib/weekly";
import type { OlderPost } from "@/components/views/WeeklyView";

/** Everything the weekly feed needs for one post, plus the list of earlier weeks. */
export async function loadWeekly(viewer: Profile, post: WeeklyPost | null) {
  const isAdmin = viewer.role === "admin";
  const all = await getPosts({ includeDrafts: isAdmin, limit: 30 });
  const answers = await getAnswers(all.map((p) => p.id).concat(post && !all.some((p) => p.id === post.id) ? [post.id] : []));
  const mine = post ? answers.filter((a) => a.post_id === post.id) : [];
  const [neighbors, people] = await Promise.all([getNeighborsById(mine.map((a) => a.neighbor_id)), getProfilesById(mine.map((a) => a.recorded_by).filter(Boolean) as string[])]);
  const rows = answerRows(mine, neighbors, people, viewer);
  const older: OlderPost[] = all
    .filter((p) => p.id !== post?.id)
    .map((p) => ({ id: p.id, week_of: p.week_of, title: p.title, gospel_reference: p.gospel_reference, published: p.published, answerCount: answers.filter((a) => a.post_id === p.id).length }));
  const latestPublished = all.find((p) => p.published) ?? null;
  return {
    answers: { hope: rows.filter((_, i) => mine[i].question === "hope"), friendship: rows.filter((_, i) => mine[i].question === "friendship") },
    older,
    isCurrent: !!post && post.id === latestPublished?.id,
    latestPublished,
  };
}

/** The Sunday on or after today, as YYYY-MM-DD: a sensible default "week of". */
export function nextSunday(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
