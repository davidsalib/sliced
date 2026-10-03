"use client";

import { motion } from "motion/react";
import { Pep } from "@/components/Toppings";
import { THANK_YOU } from "@/lib/brand";

/** The thank-you shown when someone pays for the pizza or chips in. */
export function Blessing({ detail, className = "" }: { detail?: string; className?: string }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`flex items-center gap-3 rounded-3xl border border-cheese/40 bg-cheese/10 p-4 ${className}`}
    >
      <Pep size={26} />
      <div className="min-w-0">
        <p className="font-display text-lg leading-tight font-extrabold text-cheese">{THANK_YOU}</p>
        {detail && <p className="mt-0.5 text-sm text-dough">{detail}</p>}
      </div>
    </motion.div>
  );
}
