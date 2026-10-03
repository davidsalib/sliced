import { notFound } from "next/navigation";
import { NeighborView } from "@/components/views/NeighborView";
import { displayName, requireMember } from "@/lib/auth";
import { getProfilesById, getSettings } from "@/lib/data";
import { formatWeekOf } from "@/lib/neighbors";
import { adminDb } from "@/lib/supabase/admin";
import type { Answer, Prayer, WeeklyPost } from "@/lib/types";
import { getNeighbor } from "@/lib/weekly";

export const metadata = { title: "Neighbor" };

export default async function NeighborPage(props: PageProps<"/neighbors/[id]">) {
  const { id } = await props.params;
  const viewer = await requireMember(`/neighbors/${id}`);
  const [settings, neighbor] = await Promise.all([getSettings(), getNeighbor(id)]);
  if (!neighbor) notFound();

  const db = adminDb();
  const [{ data: a }, { data: p }] = await Promise.all([
    db.from("answers").select("*").eq("neighbor_id", id).order("created_at", { ascending: false }),
    db.from("prayers").select("*").eq("neighbor_id", id).eq("anonymous", false).order("created_at", { ascending: false }),
  ]);
  const answers = (a ?? []) as Answer[];
  const prayers = (p ?? []) as Prayer[];
  const postIds = [...new Set(answers.map((x) => x.post_id))];
  const { data: posts } = postIds.length ? await db.from("weekly_posts").select("*").in("id", postIds) : { data: [] };
  const byPost = new Map(((posts ?? []) as WeeklyPost[]).map((x) => [x.id, x]));
  const people = await getProfilesById([...answers.map((x) => x.recorded_by), ...prayers.map((x) => x.submitted_by)].filter(Boolean) as string[]);
  const who = (uid: string | null) => (uid === viewer.id ? "you" : displayName(uid ? people.get(uid) : null));
  const day = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

  return (
    <NeighborView
      viewer={viewer}
      settings={settings}
      neighbor={neighbor}
      activeHref="/prayers"
      answers={answers.map((x) => {
        const post = byPost.get(x.post_id);
        return {
          id: x.id,
          postId: x.post_id,
          week: post ? formatWeekOf(post.week_of, { month: "short", day: "numeric" }) : "",
          question: x.question,
          questionText: post ? (x.question === "hope" ? post.hope_question : post.friendship_question) : "",
          answer: x.answer,
          recordedBy: who(x.recorded_by),
        };
      })}
      prayers={prayers.map((x) => ({ id: x.id, request: x.request, when: day(x.created_at), by: who(x.submitted_by) }))}
    />
  );
}
