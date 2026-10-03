"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { FormState } from "@/app/actions";
import { deleteAnswer, saveAnswer } from "@/app/weekly-actions";
import { Blessing } from "@/components/Blessing";
import { useConfetti } from "@/components/Confetti";
import { NeighborPicker, type PickedNeighbor } from "@/components/NeighborPicker";
import { Pep } from "@/components/Toppings";
import { THANK_YOU } from "@/lib/brand";
import { QUESTION_LABEL } from "@/lib/neighbors";
import type { NeighborHit, QuestionKind } from "@/lib/types";

export type AnswerRow = {
  id: string;
  neighborId: string | null;
  neighborName: string;
  answer: string;
  recordedBy: string;
  when: string;
  canDelete: boolean;
};

type Props = {
  postId: string;
  kind: QuestionKind;
  question: string;
  answers: AnswerRow[];
  /** Answering is off on older weeks' pages. */
  canAnswer: boolean;
  startOpen?: boolean;
  sampleHits?: NeighborHit[];
};

export function QuestionCard({ postId, kind, question, answers, canAnswer, startOpen = false, sampleHits }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(startOpen && canAnswer);
  const [person, setPerson] = useState<PickedNeighbor>(null);
  const [text, setText] = useState("");
  const [flash, setFlash] = useState<FormState>();
  const [pending, start] = useTransition();
  const { fire, node } = useConfetti();
  const accent = kind === "hope" ? "text-cheese" : "text-basil";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const at = (e.nativeEvent as SubmitEvent).submitter?.getBoundingClientRect();
    start(async () => {
      const res = await saveAnswer({ postId, question: kind, neighborId: person?.neighborId ?? null, newName: person?.newName ?? null, answer: text });
      setFlash(res);
      if (res?.ok) {
        setText("");
        setPerson(null);
        setOpen(false);
        fire(at ? { clientX: at.left + at.width / 2, clientY: at.top } : undefined);
        router.refresh();
      }
    });
  }

  return (
    <section id={kind} aria-labelledby={`${kind}-q`} className="scroll-mt-24 rounded-3xl border border-ash bg-oven-2">
      {node}
      <button
        type="button"
        onClick={() => canAnswer && setOpen((o) => !o)}
        aria-expanded={canAnswer ? open : undefined}
        disabled={!canAnswer}
        className="group grid w-full gap-2 p-5 text-left disabled:cursor-default"
      >
        <span className={`flex items-center gap-2 text-xs font-bold tracking-widest uppercase ${accent}`}>
          <Pep size={14} className={kind === "friendship" ? "[animation-delay:-1.2s]" : ""} /> {QUESTION_LABEL[kind]}
        </span>
        <span id={`${kind}-q`} className="font-display text-2xl leading-tight font-extrabold text-balance">
          {question}
        </span>
        {canAnswer && (
          <span className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-tomato">
            {open ? "Close" : "Tap to write down an answer"}
            <motion.span animate={{ rotate: open ? 45 : 0 }} className="inline-block text-lg leading-none">
              +
            </motion.span>
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-4 border-t border-ash/70 px-5 pt-4 pb-5">
              <NeighborPicker value={person} onChange={setPerson} id={`${kind}-name`} label="Who shared this?" sampleHits={sampleHits} />
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-dough">What they said</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="In their words, as best you can"
                  className="rounded-2xl border border-ash bg-oven px-4 py-3 outline-none focus:border-cheese"
                />
              </label>
              {flash?.error && <p className="text-sm font-semibold text-tomato">{flash.error}</p>}
              <button
                disabled={pending || !text.trim() || !person}
                className="btn-pep justify-self-start rounded-full bg-tomato px-5 py-3 font-display font-extrabold text-oven disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save answer"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flash?.ok?.startsWith(THANK_YOU) && (
          <div className="px-5 pb-4">
            <Blessing key={flash.ok} detail={flash.ok.slice(THANK_YOU.length).replace(/^[.!\s]+/, "")} />
          </div>
        )}
      </AnimatePresence>

      {answers.length > 0 && (
        <ul className="grid gap-2 border-t border-ash/70 p-4">
          <AnimatePresence initial={false}>
            {answers.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl bg-oven-3/70 px-4 py-3"
              >
                <p className="leading-relaxed">“{a.answer}”</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-dough">
                  {a.neighborId ? (
                    <Link href={`/neighbors/${a.neighborId}`} className={`font-bold ${accent} hover:underline`}>
                      {a.neighborName}
                    </Link>
                  ) : (
                    <span className="font-bold">{a.neighborName}</span>
                  )}
                  <span>· written down by {a.recordedBy} · {a.when}</span>
                  {a.canDelete && (
                    <button
                      type="button"
                      onClick={() =>
                        start(async () => {
                          await deleteAnswer(a.id);
                          router.refresh();
                        })
                      }
                      className="ml-auto font-semibold hover:text-flour"
                    >
                      Remove
                    </button>
                  )}
                </p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
