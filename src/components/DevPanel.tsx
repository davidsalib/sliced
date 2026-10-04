"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ROLES = [
  { as: "admin", label: "Admin", hint: "Posts the weekly message, crew settings" },
  { as: "member", label: "Member", hint: "A regular volunteer" },
  { as: "waiting", label: "Waiting", hint: "Signed in, no invite yet" },
] as const;

/** Localhost-only switcher to act as different kinds of user. Never rendered in production. */
export function DevPanel({ current }: { current: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const next = encodeURIComponent(pathname || "/");

  return (
    <div className="fixed bottom-24 left-3 z-[60] text-sm" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="mb-2 grid w-64 gap-1.5 rounded-2xl border border-cheese/50 bg-oven-2/95 p-3 shadow-2xl backdrop-blur"
          >
            <p className="text-xs font-bold tracking-widest text-cheese uppercase">Local dev · act as</p>
            {ROLES.map((r) => (
              <a
                key={r.as}
                href={`/api/dev/login?as=${r.as}&next=${next}`}
                className={`grid rounded-xl px-3 py-2 hover:bg-oven-3 ${current === r.as ? "bg-oven-3 ring-1 ring-cheese" : ""}`}
              >
                <span className="font-bold">{r.label}</span>
                <span className="text-xs text-dough">{r.hint}</span>
              </a>
            ))}
            <form action="/auth/signout" method="post">
              <button className="w-full rounded-xl px-3 py-2 text-left font-bold hover:bg-oven-3">Sign out</button>
            </form>
            <a href="http://localhost:44324" target="_blank" rel="noreferrer" className="px-3 pt-1 text-xs text-dough underline">
              Local emails (sign-in codes)
            </a>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-full border border-cheese/60 bg-oven/90 px-3 py-1.5 font-mono text-xs font-bold text-cheese shadow-lg backdrop-blur"
      >
        DEV · {current ?? "signed out"}
      </button>
    </div>
  );
}
