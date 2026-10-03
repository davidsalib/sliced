"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormState } from "@/app/actions";
import { deletePrayer, savePrayer } from "@/app/weekly-actions";
import { Blessing } from "@/components/Blessing";
import { useConfetti } from "@/components/Confetti";
import { NeighborPicker, type PickedNeighbor } from "@/components/NeighborPicker";
import { THANK_YOU } from "@/lib/brand";
import type { NeighborHit } from "@/lib/types";

export function PrayerForm({ sampleHits }: { sampleHits?: NeighborHit[] }) {
  const router = useRouter();
  const [anonymous, setAnonymous] = useState(false);
  const [person, setPerson] = useState<PickedNeighbor>(null);
  const [request, setRequest] = useState("");
  const [flash, setFlash] = useState<FormState>();
  const [pending, start] = useTransition();
  const { fire, node } = useConfetti();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    start(async () => {
      const res = await savePrayer({ anonymous, neighborId: person?.neighborId ?? null, newName: person?.newName ?? null, request });
      setFlash(res);
      if (res?.ok) {
        setRequest("");
        setPerson(null);
        fire();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-ash bg-oven-2 p-5">
      {node}
      <div role="radiogroup" aria-label="Who is this prayer for?" className="grid grid-cols-2 gap-1 rounded-full bg-oven-3 p-1">
        {[
          { v: false, label: "For someone by name" },
          { v: true, label: "Anonymous" },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={anonymous === o.v}
            onClick={() => setAnonymous(o.v)}
            className="relative rounded-full px-3 py-2 text-sm font-bold"
          >
            {anonymous === o.v && <motion.span layoutId="prayer-mode" className="absolute inset-0 -z-0 rounded-full bg-flour" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
            <span className={`relative ${anonymous === o.v ? "text-oven" : "text-dough"}`}>{o.label}</span>
          </button>
        ))}
      </div>

      {!anonymous && <NeighborPicker value={person} onChange={setPerson} id="prayer-name" label="Who should we pray for?" sampleHits={sampleHits} />}

      <label className="grid gap-1.5">
        <span className="text-sm font-semibold text-dough">What to pray for</span>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Healing for her knee, and a warm place to sleep this week"
          className="rounded-2xl border border-ash bg-oven px-4 py-3 outline-none focus:border-cheese"
        />
      </label>

      {flash?.error && <p className="text-sm font-semibold text-tomato">{flash.error}</p>}
      <button
        disabled={pending || !request.trim() || (!anonymous && !person)}
        className="btn-pep justify-self-start rounded-full bg-tomato px-5 py-3 font-display font-extrabold text-oven disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add prayer request"}
      </button>

      <AnimatePresence>
        {flash?.ok?.startsWith(THANK_YOU) && <Blessing key={flash.ok} detail={flash.ok.slice(THANK_YOU.length).replace(/^[.!\s]+/, "")} />}
      </AnimatePresence>
    </form>
  );
}

export type PrayerRow = {
  id: string;
  neighborId: string | null;
  who: string;
  request: string;
  meta: string;
  canDelete: boolean;
};

export function PrayerList({ rows }: { rows: PrayerRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <ul className="grid gap-2">
      <AnimatePresence initial={false}>
        {rows.map((p) => (
          <motion.li key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex gap-3 rounded-2xl bg-oven-2 px-4 py-3">
            <span className="mt-0.5 text-xl" aria-hidden="true">
              🙏
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {p.neighborId ? (
                  <Link href={`/neighbors/${p.neighborId}`} className="text-cheese hover:underline">
                    {p.who}
                  </Link>
                ) : (
                  <span className="text-dough">{p.who}</span>
                )}
              </p>
              <p className="leading-relaxed">{p.request}</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-dough">
                {p.meta}
                {p.canDelete && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await deletePrayer(p.id);
                        router.refresh();
                      })
                    }
                    className="ml-auto font-semibold hover:text-flour"
                  >
                    Remove
                  </button>
                )}
              </p>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
