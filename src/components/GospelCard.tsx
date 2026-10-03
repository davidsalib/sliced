"use client";

import { motion } from "motion/react";
import { useState } from "react";

/** The week's gospel reading. Long passages fold so the questions stay close. */
export function GospelCard({ reference, text }: { reference: string; text: string }) {
  const long = text.length > 420;
  const [open, setOpen] = useState(!long);
  return (
    <section aria-labelledby="gospel" className="relative overflow-hidden rounded-3xl border border-ash bg-oven-2 p-5">
      <svg className="pointer-events-none absolute -top-3 -right-3 size-24 text-cheese/10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M10 2h4v6h6v4h-6v10h-4V12H4V8h6z" />
      </svg>
      <p className="text-xs font-bold tracking-widest text-dough uppercase">The Gospel</p>
      <h2 id="gospel" className="mt-1 font-display text-2xl font-extrabold">
        {reference}
      </h2>
      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 132 }}
        className="relative mt-3 overflow-hidden text-[17px] leading-relaxed whitespace-pre-line text-flour/90"
      >
        {text}
        {!open && <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-oven-2 to-transparent" />}
      </motion.div>
      {long && (
        <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 text-sm font-bold text-cheese" aria-expanded={open}>
          {open ? "Show less" : "Read the whole passage"}
        </button>
      )}
    </section>
  );
}
