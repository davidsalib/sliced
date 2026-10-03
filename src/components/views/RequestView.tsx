import { Avatar } from "@/components/Avatar";
import { Countdown } from "@/components/Countdown";
import { JoinControls } from "@/components/JoinControls";
import { LiveRefresh } from "@/components/LiveRefresh";
import { Pizza } from "@/components/Pizza";
import { Blessing } from "@/components/Blessing";
import { Shell } from "@/components/Shell";
import { Pep } from "@/components/Toppings";
import { displayName } from "@/lib/auth-shared";
import { seatColor } from "@/lib/colors";
import { estimateEach, money } from "@/lib/split";
import { formatWhen } from "@/lib/time";
import type { Participant, Profile, Settings, SpendRequest } from "@/lib/types";

const statusText: Record<Participant["status"], { label: string; cls: string }> = {
  in: { label: "In", cls: "bg-oven-3 text-flour" },
  charging: { label: "Charging…", cls: "bg-cheese/15 text-cheese" },
  paid: { label: "Paid", cls: "bg-basil/15 text-basil" },
  covered: { label: "Covered", cls: "bg-basil/15 text-basil" },
  failed: { label: "Needs to pay", cls: "bg-tomato/15 text-tomato" },
};

export type RequestData = {
  viewer: Profile;
  settings: Settings;
  request: SpendRequest;
  participants: Participant[];
  people: Map<string, Profile>;
  isNew?: boolean;
  live?: boolean;
  activeHref?: string;
};

export function RequestView({ viewer, settings, request, participants, people, isNew, live = true, activeHref }: RequestData) {
  const payer = people.get(request.payer_id);
  const me = participants.find((p) => p.user_id === viewer.id) ?? null;
  const n = participants.length;
  const est = estimateEach(request.amount_cents, n, settings.fees_paid_by);
  const ifJoined = estimateEach(request.amount_cents, n + 1, settings.fees_paid_by);
  const collected = participants.filter((p) => p.status === "paid").reduce((s, p) => s + (p.share_cents ?? 0), 0);
  const owed = participants.filter((p) => p.status === "failed").reduce((s, p) => s + (p.share_cents ?? 0), 0);

  const headline =
    request.status === "sliced" ? "Sliced!" : request.status === "canceled" ? "Canceled" : request.status === "slicing" ? "Slicing…" : n ? `Cut into ${n}` : "Nobody's in yet";

  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref={activeHref}>
      {live && <LiveRefresh requestId={request.id} />}
      {isNew && <Blessing className="mb-4" detail="Thanks for picking up the pizza. We emailed the crew, and subscribers are already chipping in." />}

      <section className="grid justify-items-center gap-2 text-center">
        <p className="text-sm font-semibold tracking-widest text-dough uppercase">
          {displayName(payer)} picked up {money(request.amount_cents)}
        </p>
        <h1 className="font-display text-5xl font-extrabold">{headline}</h1>
        {request.note && <p className="text-dough">{request.note}</p>}

        <Pizza
          seed={request.id}
          state={request.status === "sliced" ? "sliced" : request.status === "canceled" ? "canceled" : "open"}
          className="my-2 w-full max-w-[22rem]"
          label={`${money(request.amount_cents)} pizza cut into ${n} slices`}
          slices={participants.map((p, i) => {
            const who = people.get(p.user_id);
            return { id: p.user_id, name: displayName(who), avatarUrl: who?.avatar_url, color: seatColor(i), status: p.status };
          })}
        />

        {request.status === "open" && (
          <div className="grid w-full grid-cols-2 gap-2">
            <div className="rounded-2xl bg-oven-2 p-3">
              <p className="text-xs font-semibold tracking-wider text-dough uppercase">Slices in</p>
              <Countdown to={request.slice_at} className="font-display text-2xl font-extrabold text-cheese" />
              <p className="text-xs text-dough">{formatWhen(request.slice_at, settings.timezone)}</p>
            </div>
            <div className="rounded-2xl bg-oven-2 p-3">
              <p className="text-xs font-semibold tracking-wider text-dough uppercase">Each, right now</p>
              <p className="font-display text-2xl font-extrabold tabular">{est ? money(est.charge) : "—"}</p>
              <p className="text-xs text-dough">{settings.fees_paid_by === "eaters" ? "incl. card fee" : "card fee from payout"}</p>
            </div>
          </div>
        )}
        {request.status === "sliced" && (
          <Blessing
            className="mt-1 w-full text-left"
            detail={`${displayName(payer)} picked up the pizza and ${Math.max(n - 1, 0)} ${n - 1 === 1 ? "person" : "people"} chipped in.`}
          />
        )}
        {request.status === "sliced" && (
          <p className="text-dough">
            Sliced {formatWhen(request.sliced_at ?? request.slice_at, settings.timezone)} · {money(collected)} sent to {displayName(payer)}
            {owed > 0 && <span className="text-tomato"> · {money(owed)} still owed</span>}
          </p>
        )}
      </section>

      <div className="mt-6">
        <JoinControls
          requestId={request.id}
          status={request.status}
          isIn={!!me}
          isPayer={request.payer_id === viewer.id}
          isAdmin={viewer.role === "admin"}
          hasCard={viewer.has_card}
          autoJoin={viewer.auto_join}
          myStatus={me?.status ?? null}
          estimate={ifJoined ? money(ifJoined.charge) : null}
        />
      </div>

      <section aria-labelledby="eaters" className="mt-8 grid gap-2">
        <h2 id="eaters" className="flex items-center gap-2 font-display text-xl font-extrabold">
          Who&apos;s chipping in <span className="text-dough tabular">({n})</span> <Pep size={16} />
        </h2>
        {n === 0 && <p className="text-dough">Be the first to chip in.</p>}
        <ul className="grid gap-1">
          {participants.map((p, i) => {
            const who = people.get(p.user_id);
            const st = statusText[p.status];
            return (
              <li key={p.user_id} className="flex items-center gap-3 rounded-2xl bg-oven-2 px-3 py-2.5">
                <Avatar profile={who} size={36} color={seatColor(i)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {displayName(who)}
                    {p.user_id === viewer.id && <span className="text-dough"> (you)</span>}
                  </span>
                  <span className="block text-xs text-dough">
                    {p.kind === "payer" ? "Picked up the pizza" : p.kind === "subscriber" ? "Subscriber" : "Chipped in this week"}
                    {p.failure && p.status === "failed" ? ` · ${p.failure}` : ""}
                  </span>
                </span>
                {request.status === "sliced" && p.kind !== "payer" && <span className="text-sm font-bold tabular">{money(p.charge_cents ?? 0)}</span>}
                {request.status !== "open" && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </Shell>
  );
}
