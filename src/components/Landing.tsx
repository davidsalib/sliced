"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Pizza, type PizzaSlice } from "@/components/Pizza";
import { FloatingSlices } from "@/components/FloatingSlices";
import { GoogleButton } from "@/components/GoogleButton";
import { Pep } from "@/components/Toppings";
import { APP_NAME } from "@/lib/brand";

// Example eaters for the demo pizza only.
const DEMO: PizzaSlice[] = [
  { id: "a", name: "Ava", color: "#4f8cff" },
  { id: "b", name: "Ben", color: "#2fbf8f" },
  { id: "c", name: "Cam", color: "#a36bff" },
  { id: "d", name: "Dee", color: "#ff8a3d" },
  { id: "e", name: "Eli", color: "#ff5fa2" },
  { id: "f", name: "Fox", color: "#22b8cf" },
  { id: "g", name: "Gus", color: "#9bc53d" },
];

/** The landing pizza keeps getting sliced thinner as volunteers chip in. */
function DemoPizza() {
  const [n, setN] = useState(2);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x >= DEMO.length ? 2 : x + 1)), 1600);
    return () => clearInterval(t);
  }, []);
  const each = (39.8 / n).toFixed(2);
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <Pizza slices={DEMO.slice(0, n)} seed="landing" className="w-full" label="Demo pizza being sliced for more volunteers" />
      <motion.div
        key={n}
        initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: -4 }}
        className="absolute right-0 bottom-6 rounded-2xl bg-cheese px-4 py-2 font-display font-extrabold text-oven shadow-xl"
      >
        <span className="tabular">{n}</span> chipping in · ${each} each
      </motion.div>
    </div>
  );
}

export function Landing({ notice }: { notice?: string }) {
  return (
    <main className="relative isolate mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-5 py-10">
      <FloatingSlices />
      <p className="flex items-center justify-center gap-2 font-display text-lg font-extrabold tracking-tight text-dough">
        <Pep size={16} /> {APP_NAME} <Pep size={16} className="[animation-delay:-1.4s]" />
      </p>
      <DemoPizza />
      <div className="grid gap-4 text-center">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-6xl"
        >
          Pizza for
          <br />
          <span className="text-cheese">service day.</span>
        </motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }} className="mx-auto max-w-md text-lg text-dough">
          Everything for this week&apos;s community service in one place: the gospel and a message to share, questions to ask our neighbors, prayer requests, and the Costco pizza split so whoever picks it up gets paid back.
        </motion.p>
      </div>
      {notice && <p className="rounded-2xl bg-oven-3 p-4 text-center font-semibold text-cheese">{notice}</p>}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
        <GoogleButton />
      </motion.div>
      <p className="pb-24 text-center text-xs text-dough/70">Baked in San Francisco, under the fog.</p>
    </main>
  );
}
