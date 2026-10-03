"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelRequest, joinRequest, leaveRequest, setAutoJoin, sliceNow, type FormState } from "@/app/actions";
import { Blessing } from "@/components/Blessing";
import { useConfetti } from "@/components/Confetti";
import { THANK_YOU } from "@/lib/brand";
import { CardSetup, PayNow } from "@/components/stripe";

type Props = {
  requestId: string;
  status: "open" | "slicing" | "sliced" | "canceled";
  isIn: boolean;
  isPayer: boolean;
  isAdmin: boolean;
  hasCard: boolean;
  autoJoin: boolean;
  myStatus: string | null;
  estimate: string | null;
};

export function JoinControls(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<FormState>();
  const [addingCard, setAddingCard] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { fire, node } = useConfetti();

  const run = (fn: () => Promise<FormState>, celebrate?: React.MouseEvent) =>
    start(async () => {
      const res = await fn();
      setFlash(res);
      if (res?.ok && celebrate) fire(celebrate);
      router.refresh();
    });

  const join = (e: React.MouseEvent) => {
    if (!p.isPayer && !p.hasCard) {
      setAddingCard(true);
      return;
    }
    run(() => joinRequest(p.requestId), e);
  };

  return (
    <div className="grid gap-3">
      {node}

      {p.status === "open" && (
        <>
          {!p.isIn ? (
            <motion.button
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.02 }}
              onClick={join}
              disabled={pending}
              className="btn-pep relative rounded-full bg-tomato px-6 py-4 font-display text-xl font-extrabold text-oven shadow-[0_10px_30px_-8px_rgb(255_91_61/0.7)] disabled:opacity-60"
            >
              {pending ? "Cutting you a slice…" : p.isPayer ? "Count my slice too" : "I'm chipping in"}
              {p.estimate && !pending && <span className="block font-sans text-sm font-semibold opacity-80">about {p.estimate} if you join now</span>}
            </motion.button>
          ) : (
            <div className="flex items-center gap-3 rounded-3xl border border-basil/40 bg-basil/10 p-4">
              <motion.span initial={{ rotate: -30, scale: 0 }} animate={{ rotate: 0, scale: 1 }} className="text-3xl" aria-hidden>
                🍕
              </motion.span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-extrabold">You&apos;re in</p>
                <p className="text-sm font-semibold text-cheese">{THANK_YOU}</p>
                <p className="text-sm text-dough">
                  {p.isPayer ? "You picked up the pizza, so you're never charged." : p.autoJoin ? "You're subscribed, so you chip in every week." : "You're chipping in for this one."}
                </p>
              </div>
              <button
                onClick={() => run(() => leaveRequest(p.requestId))}
                disabled={pending}
                className="rounded-full border border-ash px-4 py-2 text-sm font-semibold text-dough hover:text-flour"
              >
                Skip it
              </button>
            </div>
          )}

          {!p.isPayer && !p.autoJoin && p.hasCard && (
            <button
              onClick={(e) => run(() => setAutoJoin(true), e)}
              disabled={pending}
              className="rounded-full border border-cheese/50 px-5 py-3 text-sm font-bold text-cheese hover:bg-cheese/10"
            >
              Subscribe: chip in every week automatically
            </button>
          )}
        </>
      )}

      <AnimatePresence>
        {addingCard && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="rounded-3xl border border-ash bg-oven-2 p-4"
          >
            <p className="mb-3 font-display text-lg font-extrabold">Add a card to chip in</p>
            <CardSetup
              returnPath={`/r/${p.requestId}`}
              onSaved={() => {
                setAddingCard(false);
                run(() => joinRequest(p.requestId), undefined);
                fire();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {p.status === "sliced" && p.myStatus === "failed" && (
        <div className="rounded-3xl border border-tomato/50 bg-tomato/10 p-4">
          {!paying ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold">Your card didn&apos;t go through.</p>
              <button onClick={() => setPaying(true)} className="rounded-full bg-tomato px-5 py-2.5 font-bold text-oven">
                Pay my share
              </button>
            </div>
          ) : (
            <PayNow
              requestId={p.requestId}
              onPaid={() => {
                setPaying(false);
                setFlash({ ok: THANK_YOU });
                fire();
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {p.status === "open" && (p.isPayer || p.isAdmin) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {p.isAdmin && (
            <button onClick={(e) => run(() => sliceNow(p.requestId), e)} disabled={pending} className="rounded-full bg-oven-3 px-4 py-2 text-sm font-semibold">
              Slice now
            </button>
          )}
          {!confirmCancel ? (
            <button onClick={() => setConfirmCancel(true)} className="rounded-full px-4 py-2 text-sm font-semibold text-dough hover:text-flour">
              Cancel this split
            </button>
          ) : (
            <span className="flex items-center gap-2 text-sm">
              Nobody gets charged.
              <button onClick={() => run(() => cancelRequest(p.requestId))} className="rounded-full bg-tomato-deep px-3 py-1.5 font-semibold">
                Cancel split
              </button>
              <button onClick={() => setConfirmCancel(false)} className="px-2 py-1.5 font-semibold text-dough">
                Keep it
              </button>
            </span>
          )}
        </div>
      )}

      <AnimatePresence>
        {flash?.ok?.startsWith(THANK_YOU) ? (
          <Blessing key={flash.ok} detail={flash.ok.slice(THANK_YOU.length).replace(/^[.!\s🍕]+/, "") || undefined} />
        ) : flash && (flash.ok || flash.error) && (
          <motion.p
            key={flash.ok ?? flash.error}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className={`text-sm font-semibold ${flash.error ? "text-tomato" : "text-basil"}`}
          >
            {flash.error ?? flash.ok}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
