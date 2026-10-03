"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { removeCard, setAutoJoin, type FormState } from "@/app/actions";
import { Blessing } from "@/components/Blessing";
import { useConfetti } from "@/components/Confetti";
import { THANK_YOU } from "@/lib/brand";
import { CardReturn, CardSetup } from "@/components/stripe";

type Props = { hasCard: boolean; cardLabel: string | null; autoJoin: boolean; setupIntentReturn: string | null };

export function WalletCard({ hasCard, cardLabel, autoJoin, setupIntentReturn }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [flash, setFlash] = useState<FormState>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const { fire, node } = useConfetti();

  const run = (fn: () => Promise<FormState>, e?: React.MouseEvent) =>
    start(async () => {
      const res = await fn();
      setFlash(res);
      if (res?.ok && e) fire(e);
      router.refresh();
    });

  const onReturn = useCallback(
    (msg: string) => {
      setFlash({ ok: msg });
      router.replace("/wallet");
    },
    [router],
  );

  return (
    <div className="grid gap-3 rounded-3xl border border-ash bg-oven-2 p-5">
      {node}
      {setupIntentReturn && <CardReturn setupIntentId={setupIntentReturn} onDone={onReturn} />}

      {hasCard && !editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative grid h-9 w-14 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-cheese to-crust font-display text-xs font-extrabold text-oven" aria-hidden>
              CARD
              <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-[#c23a24] shadow-[inset_-2px_-2px_0_rgb(126_29_18/0.6)]" />
            </span>
            <span className="font-semibold">{cardLabel ?? "Card on file"}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="rounded-full border border-ash px-3 py-1.5 text-sm font-semibold">
              Replace
            </button>
            {!confirmRemove ? (
              <button onClick={() => setConfirmRemove(true)} className="rounded-full px-3 py-1.5 text-sm font-semibold text-dough">
                Remove
              </button>
            ) : (
              <button onClick={() => run(removeCard)} disabled={pending} className="rounded-full bg-tomato-deep px-3 py-1.5 text-sm font-semibold">
                Remove card &amp; unsubscribe
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <p className="text-dough">Add a card to chip in. It&apos;s only charged when a pizza you&apos;re chipping in on gets sliced.</p>
          <CardSetup
            onSaved={(label) => {
              setEditing(false);
              setFlash({ ok: `${label} saved.` });
              fire();
              router.refresh();
            }}
          />
          {editing && (
            <button onClick={() => setEditing(false)} className="justify-self-start text-sm font-semibold text-dough">
              Keep my current card
            </button>
          )}
        </div>
      )}

      {hasCard && (
        <label className="mt-2 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-oven-3 p-4">
          <span>
            <span className="block font-display text-lg font-extrabold">Subscribe to Pizza Service</span>
            <span className="block text-sm text-dough">Chip in every week automatically. Skip any week from its page.</span>
          </span>
          <Toggle on={autoJoin} disabled={pending} onChange={(on, e) => run(() => setAutoJoin(on), on ? e : undefined)} />
        </label>
      )}

      <AnimatePresence>
        {flash?.ok?.startsWith(THANK_YOU) ? (
          <Blessing key={flash.ok} detail={flash.ok.slice(THANK_YOU.length).replace(/^[.!\s]+/, "") || undefined} />
        ) : flash && (flash.ok || flash.error) && (
          <motion.p key={flash.ok ?? flash.error} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} role="status" className={`text-sm font-semibold ${flash.error ? "text-tomato" : "text-basil"}`}>
            {flash.error ?? flash.ok}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: (on: boolean, e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={(e) => onChange(!on, e)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? "bg-basil" : "bg-ash"} disabled:opacity-60`}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 30 }} className={`absolute top-1 size-6 rounded-full bg-flour ${on ? "right-1" : "left-1"}`} />
      <span className="sr-only">Subscribe</span>
    </button>
  );
}
