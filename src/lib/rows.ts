import { displayName } from "@/lib/auth-shared";
import { neighborName } from "@/lib/neighbors";
import type { Answer, Neighbor, Prayer, Profile } from "@/lib/types";
import type { AnswerRow } from "@/components/QuestionCard";
import type { PrayerRow } from "@/components/Prayers";

const when = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));

export function answerRows(answers: Answer[], neighbors: Map<string, Neighbor>, people: Map<string, Profile>, viewer: Profile): AnswerRow[] {
  return answers.map((a) => ({
    id: a.id,
    neighborId: a.neighbor_id,
    neighborName: a.neighbor_id ? neighborName(neighbors.get(a.neighbor_id)) : "A neighbor",
    answer: a.answer,
    recordedBy: a.recorded_by === viewer.id ? "you" : displayName(a.recorded_by ? people.get(a.recorded_by) : null),
    when: when(a.created_at),
    canDelete: a.recorded_by === viewer.id || viewer.role === "admin",
  }));
}

export function prayerRows(prayers: Prayer[], neighbors: Map<string, Neighbor>, people: Map<string, Profile>, viewer: Profile): PrayerRow[] {
  return prayers.map((p) => {
    const named = !p.anonymous && p.neighbor_id;
    const by = p.submitted_by === viewer.id ? "you" : displayName(p.submitted_by ? people.get(p.submitted_by) : null);
    return {
      id: p.id,
      neighborId: named ? p.neighbor_id : null,
      who: named ? neighborName(neighbors.get(p.neighbor_id!)) : "Anonymous",
      request: p.request,
      // Anonymous requests don't say who added them.
      meta: named ? `${when(p.created_at)} · added by ${by}` : when(p.created_at),
      canDelete: p.submitted_by === viewer.id || viewer.role === "admin",
    };
  });
}

/** Groups prayers into "This week", "Last week", then by week starting Sunday. */
export function groupByWeek<T extends { created_at: string }>(items: T[], now = new Date()) {
  const startOfWeek = (d: Date) => {
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    s.setDate(s.getDate() - s.getDay());
    return s.getTime();
  };
  const thisWeek = startOfWeek(now);
  const groups = new Map<number, T[]>();
  for (const it of items) {
    const k = startOfWeek(new Date(it.created_at));
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([k, list]) => ({
      label:
        k === thisWeek
          ? "This week"
          : k === thisWeek - 7 * 86_400_000
            ? "Last week"
            : `Week of ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(k))}`,
      items: list,
    }));
}
