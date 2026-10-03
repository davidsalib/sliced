import Link from "next/link";
import { GospelCard } from "@/components/GospelCard";
import { QuestionCard, type AnswerRow } from "@/components/QuestionCard";
import { Logo, Shell } from "@/components/Shell";
import { Pep } from "@/components/Toppings";
import { formatWeekOf } from "@/lib/neighbors";
import type { NeighborHit, Profile, QuestionKind, Settings, WeeklyPost } from "@/lib/types";

export type OlderPost = Pick<WeeklyPost, "id" | "week_of" | "title" | "gospel_reference" | "published"> & { answerCount: number };

export type WeeklyData = {
  viewer: Profile;
  settings: Settings;
  post: WeeklyPost | null;
  answers: Record<QuestionKind, AnswerRow[]>;
  older: OlderPost[];
  /** False on an older week's page: read-only, no new answers. */
  isCurrent?: boolean;
  banner?: string | null;
  openQuestion?: QuestionKind | null;
  sampleHits?: NeighborHit[];
  activeHref?: string;
};

export function WeeklyView({ viewer, settings, post, answers, older, isCurrent = true, banner, openQuestion, sampleHits, activeHref }: WeeklyData) {
  const isAdmin = viewer.role === "admin";
  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref={activeHref}>
      {banner && <p className="mb-5 rounded-2xl bg-basil/15 p-4 font-semibold text-basil">{banner}</p>}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-widest text-dough uppercase">
            {isCurrent ? "This week of service" : "An earlier week"} <Pep size={12} />
          </p>
          <h1 className="font-display text-3xl font-extrabold">{post ? formatWeekOf(post.week_of) : "This week"}</h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {post && (
              <Link href={`/weekly/${post.id}/edit`} className="rounded-full border border-ash px-4 py-2 text-sm font-semibold">
                Edit
              </Link>
            )}
            {isCurrent && (
              <Link href="/weekly/new" className="btn-pep rounded-full bg-tomato px-4 py-2 text-sm font-bold text-oven">
                New weekly message
              </Link>
            )}
          </div>
        )}
      </div>

      {!post ? (
        <div className="mt-6 grid justify-items-center gap-3 rounded-3xl border border-dashed border-ash p-8 text-center">
          <Logo className="size-16 animate-wiggle" />
          <p className="font-display text-xl font-extrabold">No message posted yet</p>
          <p className="max-w-xs text-dough">
            {isAdmin ? "Post this week's gospel, a message to share, and two questions. Everyone gets an email." : "When an admin posts this week's message, it shows up here and in your email."}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {!post.published && <p className="rounded-2xl bg-cheese/10 p-3 text-sm font-semibold text-cheese">Draft: only admins can see this until it&apos;s published.</p>}
          {post.title && <p className="font-display text-xl font-extrabold text-cheese">{post.title}</p>}
          <GospelCard reference={post.gospel_reference} text={post.gospel_text} />
          <section aria-labelledby="message" className="rounded-3xl border border-ash bg-oven-2 p-5">
            <p className="text-xs font-bold tracking-widest text-dough uppercase">A message to share</p>
            <div id="message" className="mt-2 text-[17px] leading-relaxed whitespace-pre-line">
              {post.message}
            </div>
          </section>
          <QuestionCard postId={post.id} kind="hope" question={post.hope_question} answers={answers.hope} canAnswer={isCurrent && post.published} startOpen={openQuestion === "hope"} sampleHits={sampleHits} />
          <QuestionCard
            postId={post.id}
            kind="friendship"
            question={post.friendship_question}
            answers={answers.friendship}
            canAnswer={isCurrent && post.published}
            startOpen={openQuestion === "friendship"}
            sampleHits={sampleHits}
          />
        </div>
      )}

      {older.length > 0 && (
        <section aria-labelledby="earlier" className="mt-10 grid gap-2">
          <h2 id="earlier" className="font-display text-xl font-extrabold">
            Earlier weeks
          </h2>
          <ul className="grid gap-1">
            {older.map((p) => (
              <li key={p.id}>
                <Link href={`/weekly/${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl px-3 py-3 hover:bg-oven-2">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.title || p.gospel_reference}</span>
                    <span className="block text-xs text-dough">
                      {formatWeekOf(p.week_of, { month: "short", day: "numeric" })}
                      {p.title && ` · ${p.gospel_reference}`}
                      {!p.published && " · draft"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-dough tabular">{p.answerCount} shared</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}
