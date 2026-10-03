"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { regenerateInvite, setRole, updateSettings, type FormState } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import type { Role, Settings } from "@/lib/types";

type Person = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  full_name: string | null;
  role: Role;
  auto_join: boolean;
  has_card: boolean;
  can_receive: boolean;
  isMe: boolean;
};

const ZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const field = "rounded-2xl border border-ash bg-oven-2 px-4 py-3 outline-none focus:border-cheese";

export function AdminPanel({ settings, inviteUrl, people }: { settings: Settings; inviteUrl: string; people: Person[] }) {
  const router = useRouter();
  const [state, action, saving] = useActionState<FormState, FormData>(updateSettings, undefined);
  const [days, setDays] = useState(settings.days_before_slice);
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<FormState>();
  const [copied, setCopied] = useState(false);
  const zones = ZONES.includes(settings.timezone) ? ZONES : [settings.timezone, ...ZONES];

  const run = (fn: () => Promise<FormState>) =>
    start(async () => {
      setFlash(await fn());
      router.refresh();
    });

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-6 grid gap-10">
      <form action={action} className="grid gap-5">
        <h2 className="font-display text-xl font-extrabold">When pizzas get sliced</h2>

        <label className="grid gap-2">
          <span className="text-sm font-semibold text-dough">Crew name</span>
          <input name="crew_name" defaultValue={settings.crew_name} maxLength={40} className={field} />
        </label>

        <label className="grid gap-2">
          <span className="flex items-baseline justify-between text-sm font-semibold text-dough">
            Days before slices are sliced
            <span className="font-display text-2xl font-extrabold text-cheese tabular">{days}</span>
          </span>
          <input
            type="range"
            name="days_before_slice"
            min={0}
            max={14}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="accent-tomato"
          />
          <span className="text-xs text-dough">
            {days === 0 ? "Sliced the same day it's logged, at the charge time." : `The crew gets ${days} day${days === 1 ? "" : "s"} to chip in before cards are charged.`}
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-dough">Charge time</span>
            <input type="time" name="charge_time" defaultValue={settings.charge_time.slice(0, 5)} required className={field} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-dough">Time zone</span>
            <select name="timezone" defaultValue={settings.timezone} className={field}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-dough">Card fees (about 2.9% + 30¢ per charge)</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-oven-2 p-3">
            <input type="radio" name="fees_paid_by" value="eaters" defaultChecked={settings.fees_paid_by === "eaters"} className="mt-1 accent-tomato" />
            <span>
              <span className="block font-semibold">Everyone chipping in covers them</span>
              <span className="block text-xs text-dough">Each charge is a little higher. Whoever picked up the pizza gets back exactly what they spent.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-oven-2 p-3">
            <input type="radio" name="fees_paid_by" value="payer" defaultChecked={settings.fees_paid_by === "payer"} className="mt-1 accent-tomato" />
            <span>
              <span className="block font-semibold">Whoever picked up the pizza covers them</span>
              <span className="block text-xs text-dough">Everyone pays an even split. Fees come out of the payout.</span>
            </span>
          </label>
        </fieldset>

        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="apply_open" className="size-5 accent-tomato" />
          Also re-time splits that haven&apos;t been sliced yet
        </label>

        {state?.error && <p className="font-semibold text-tomato">{state.error}</p>}
        {state?.ok && <p className="font-semibold text-basil">{state.ok}</p>}
        <button disabled={saving} className="btn-pep justify-self-start rounded-full bg-tomato px-6 py-3 font-display text-lg font-extrabold text-oven disabled:opacity-60">
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-extrabold">Invite volunteers</h2>
        <p className="text-sm text-dough">Anyone who opens this link and signs in with Google joins the crew.</p>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-oven-2 p-3">
          <code className="min-w-0 flex-1 text-sm break-all select-all">{inviteUrl}</code>
          <button onClick={copyInvite} className="rounded-full bg-cheese px-4 py-2 text-sm font-bold text-oven">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <button onClick={() => run(regenerateInvite)} disabled={pending} className="justify-self-start text-sm font-semibold text-dough hover:text-flour">
          Make a new link (the old one stops working)
        </button>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-extrabold">People</h2>
        {flash?.error && <p className="text-sm font-semibold text-tomato">{flash.error}</p>}
        <ul className="grid gap-2">
          {people.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-oven-2 p-3">
              <Avatar profile={p} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">
                  {p.name}
                  {p.isMe && <span className="text-dough"> (you)</span>}
                </span>
                <span className="block truncate text-xs text-dough">
                  {p.email}
                  {p.auto_join && " · subscribed"}
                  {p.has_card ? " · card" : " · no card"}
                  {p.can_receive && " · bank"}
                </span>
              </span>
              <select
                aria-label={`Role for ${p.name}`}
                value={p.role}
                disabled={pending}
                onChange={(e) => run(() => setRole(p.id, e.target.value as Role))}
                className="rounded-full border border-ash bg-oven-3 px-3 py-1.5 text-sm font-semibold"
              >
                <option value="pending">Waiting</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
