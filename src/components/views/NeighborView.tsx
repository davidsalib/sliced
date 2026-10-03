import Link from "next/link";
import { Shell } from "@/components/Shell";
import { neighborName, QUESTION_LABEL } from "@/lib/neighbors";
import type { Neighbor, Profile, QuestionKind, Settings } from "@/lib/types";

const day = (iso: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));

export type NeighborData = {
  viewer: Profile;
  settings: Settings;
  neighbor: Neighbor;
  answers: { id: string; postId: string; week: string; question: QuestionKind; questionText: string; answer: string; recordedBy: string }[];
  prayers: { id: string; request: string; when: string; by: string }[];
  activeHref?: string;
};

/** Everything a neighbor has shared with us, and what we've prayed for, over time. */
export function NeighborView({ viewer, settings, neighbor, answers, prayers, activeHref }: NeighborData) {
  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref={activeHref}>
      <Link href="/neighbors" className="text-sm font-semibold text-dough hover:text-flour">
        ← Neighbors
      </Link>
      <h1 className="mt-2 font-display text-4xl font-extrabold">{neighborName(neighbor)}</h1>
      <p className="text-dough">
        First met {day(neighbor.created_at)} · last seen {day(neighbor.last_seen_at)}
      </p>

      <section aria-labelledby="shared" className="mt-8 grid gap-2">
        <h2 id="shared" className="font-display text-xl font-extrabold">
          What they&apos;ve shared <span className="text-dough tabular">({answers.length})</span>
        </h2>
        {answers.length === 0 && <p className="text-dough">Nothing yet.</p>}
        <ul className="grid gap-2">
          {answers.map((a) => (
            <li key={a.id} className="rounded-2xl bg-oven-2 px-4 py-3">
              <p className="text-xs font-bold tracking-widest text-dough uppercase">
                <Link href={`/weekly/${a.postId}`} className="hover:text-flour">
                  {a.week}
                </Link>{" "}
                · <span className={a.question === "hope" ? "text-cheese" : "text-basil"}>{QUESTION_LABEL[a.question]}</span>
              </p>
              <p className="mt-1 text-sm text-dough">{a.questionText}</p>
              <p className="mt-1 leading-relaxed">“{a.answer}”</p>
              <p className="mt-1 text-xs text-dough">written down by {a.recordedBy}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="prayed" className="mt-8 grid gap-2">
        <h2 id="prayed" className="font-display text-xl font-extrabold">
          Prayer requests <span className="text-dough tabular">({prayers.length})</span>
        </h2>
        {prayers.length === 0 && <p className="text-dough">None yet.</p>}
        <ul className="grid gap-2">
          {prayers.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-2xl bg-oven-2 px-4 py-3">
              <span aria-hidden="true">🙏</span>
              <span>
                <span className="block leading-relaxed">{p.request}</span>
                <span className="block text-xs text-dough">
                  {p.when} · added by {p.by}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </Shell>
  );
}
