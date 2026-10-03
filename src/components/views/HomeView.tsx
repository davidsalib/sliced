import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Countdown } from "@/components/Countdown";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Pizza } from "@/components/Pizza";
import { Logo, Shell } from "@/components/Shell";
import { Pep } from "@/components/Toppings";
import { displayName } from "@/lib/auth-shared";
import { seatColor } from "@/lib/colors";
import { money } from "@/lib/split";
import { formatWhen } from "@/lib/time";
import type { Participant, Profile, Settings, SpendRequest } from "@/lib/types";

export type HomeData = {
  viewer: Profile;
  settings: Settings;
  open: SpendRequest[];
  past: SpendRequest[];
  parts: Map<string, Participant[]>;
  people: Map<string, Profile>;
  welcome?: boolean;
  live?: boolean;
  activeHref?: string;
};

export function HomeView({ viewer, settings, open, past, parts, people, welcome, live = true, activeHref }: HomeData) {
  const todo = [
    !viewer.has_card && { href: "/wallet", title: "Add a card", body: "So you can chip in." },
    viewer.has_card && !viewer.auto_join && { href: "/wallet", title: "Subscribe", body: "Chip in every week without lifting a finger." },
    !viewer.can_receive && { href: "/wallet", title: "Get paid back", body: "Connect your bank before you pick up the pizza." },
  ].filter(Boolean) as { href: string; title: string; body: string }[];

  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref={activeHref}>
      {live && <LiveRefresh />}
      {welcome && <p className="mb-5 rounded-2xl bg-basil/15 p-4 font-semibold text-basil">Welcome to {settings.crew_name}! Grab a slice below.</p>}

      <section aria-labelledby="this-week" className="grid gap-4">
        <div className="flex items-end justify-between gap-3">
          <h1 id="this-week" className="flex items-center gap-2 font-display text-3xl font-extrabold">
            Pizza this week <Pep size={20} />
          </h1>
          <Link href="/new" className="btn-pep rounded-full bg-tomato px-4 py-2 text-sm font-bold text-oven">
            I picked up pizza
          </Link>
        </div>

        {open.length === 0 ? (
          <div className="grid justify-items-center gap-3 rounded-3xl border border-dashed border-ash p-8 text-center">
            <Logo className="size-16 animate-wiggle" />
            <p className="font-display text-xl font-extrabold">Nothing in the oven yet</p>
            <p className="max-w-xs text-dough">When someone picks up pizza for this week&apos;s service, they log it here and the whole crew gets an email.</p>
          </div>
        ) : (
          open.map((r) => {
            const list = parts.get(r.id) ?? [];
            const payer = people.get(r.payer_id);
            const mine = list.find((p) => p.user_id === viewer.id);
            return (
              <Link
                key={r.id}
                href={`/r/${r.id}`}
                className="group grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-3xl border border-ash bg-oven-2 p-4 transition hover:-translate-y-0.5 hover:border-cheese/50"
              >
                <Pizza
                  seed={r.id}
                  showSteam={false}
                  toppings={8}
                  className="w-24 transition group-hover:rotate-12"
                  slices={list.map((p, i) => {
                    const who = people.get(p.user_id);
                    return { id: p.user_id, name: displayName(who), avatarUrl: who?.avatar_url, color: seatColor(i) };
                  })}
                />
                <div className="min-w-0">
                  <p className="font-display text-2xl font-extrabold tabular">{money(r.amount_cents)}</p>
                  <p className="truncate text-sm text-dough">
                    {displayName(payer)} picked up{r.note ? ` · ${r.note}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-oven-3 px-2.5 py-1">
                      {list.length} chipping in
                    </span>
                    <span className="rounded-full bg-oven-3 px-2.5 py-1 text-cheese">
                      {r.status === "slicing" ? "Slicing now…" : <>Slices in <Countdown to={r.slice_at} /></>}
                    </span>
                    {mine && <span className="rounded-full bg-basil/15 px-2.5 py-1 text-basil">You&apos;re in</span>}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>

      {todo.length > 0 && (
        <section aria-label="Set up" className="mt-8 grid gap-2 sm:grid-cols-2">
          {todo.map((t) => (
            <Link key={t.title} href={t.href} className="rounded-2xl bg-oven-3 p-4 transition hover:bg-ash/60">
              <p className="font-bold text-cheese">{t.title} →</p>
              <p className="text-sm text-dough">{t.body}</p>
            </Link>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past" className="mt-10 grid gap-3">
          <h2 id="past" className="flex items-center gap-2 font-display text-xl font-extrabold">
            Already sliced <Pep size={16} className="[animation-delay:-1s]" />
          </h2>
          <ul className="grid gap-1">
            {past.map((r) => {
              const list = parts.get(r.id) ?? [];
              const mine = list.find((p) => p.user_id === viewer.id);
              return (
                <li key={r.id}>
                  <Link href={`/r/${r.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-oven-2">
                    <Avatar profile={people.get(r.payer_id)} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {displayName(people.get(r.payer_id))} · {money(r.amount_cents)}
                      </span>
                      <span className="block text-xs text-dough">
                        {formatWhen(r.sliced_at ?? r.slice_at, settings.timezone, false)} · {list.length} chipped in
                      </span>
                    </span>
                    {mine && (
                      <span className={`text-sm font-bold tabular ${mine.status === "failed" ? "text-tomato" : "text-dough"}`}>
                        {mine.kind === "payer" ? "You picked up" : mine.status === "failed" ? "Pay now" : `-${money(mine.charge_cents ?? 0)}`}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Shell>
  );
}
