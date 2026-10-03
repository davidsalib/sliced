"use client";

import { motion } from "motion/react";
import { useActionState, useState } from "react";
import { createRequest, type FormState } from "@/app/actions";
import { Pizza } from "@/components/Pizza";
import { seatColor } from "@/lib/colors";
import { estimateEach, money } from "@/lib/split";


export function NewRequestForm({ subscribers, initialAmount = "" }: { subscribers: number; initialAmount?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createRequest, undefined);
  const [amount, setAmount] = useState(initialAmount);
  const [eats, setEats] = useState(true);

  const cents = Math.round((parseFloat(amount) || 0) * 100);
  const eaters = subscribers + (eats ? 1 : 0);
  const est = cents >= 100 ? estimateEach(cents, Math.max(eaters, 1), subscribers) : null;
  // More money, more pizza: toppings grow with the amount.
  const toppings = Math.min(22, 4 + Math.round(cents / 400));

  return (
    <form action={action} className="mt-6 grid gap-6">
      <div className="relative">
        <Pizza
          seed="new-pizza"
          toppings={toppings}
          className="mx-auto w-56"
          slices={Array.from({ length: Math.max(eaters, 1) }, (_, i) => ({ id: String(i), name: i === 0 && eats ? "You" : "Volunteer", color: seatColor(i) }))}
          label="Preview of this week's pizza"
        />
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-dough">How much did you pay?</span>
        <span className="flex items-center gap-1 rounded-3xl border border-ash bg-oven-2 px-5 py-3 focus-within:border-cheese">
          <span className="font-display text-4xl font-extrabold text-dough">$</span>
          <input
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            required
            placeholder="39.80"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent font-display text-5xl font-extrabold tabular outline-none placeholder:text-ash"
            aria-label="Amount in dollars"
          />
        </span>
        <span className="text-xs text-dough">Four whole pizzas at the food court is $39.80.</span>
      </label>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-dough">What did you get? (optional)</span>
        <input
          name="note"
          maxLength={140}
          placeholder="2 pepperoni, 2 cheese"
          className="rounded-2xl border border-ash bg-oven-2 px-4 py-3 outline-none focus:border-cheese"
        />
      </label>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-oven-2 px-4 py-3">
        <span>
          <span className="block font-semibold">Count my slice too</span>
          <span className="block text-xs text-dough">You chip in like everyone else. Your share comes out of what you get back.</span>
        </span>
        <input type="checkbox" name="payer_eats" checked={eats} onChange={(e) => setEats(e.target.checked)} className="size-6 accent-tomato" />
      </label>

      <motion.div layout className="rounded-2xl bg-oven-3 p-4 text-sm">
        <p>
          <b className="text-cheese">{subscribers}</b> subscriber{subscribers === 1 ? " is" : "s are"} chipping in automatically. Anyone else on the crew can join before it&apos;s sliced.
        </p>
        {est && (
          <p className="mt-1 text-dough">
            Right now that&apos;s about <b className="text-flour tabular">{money(est.charge)}</b> each, including an even share of the card fees. You get back every cent. It drops as more people join.
          </p>
        )}
      </motion.div>

      {state?.error && <p className="font-semibold text-tomato">{state.error}</p>}

      <motion.button
        whileTap={{ scale: 0.96 }}
        disabled={pending}
        className="btn-pep rounded-full bg-tomato px-6 py-4 font-display text-xl font-extrabold text-oven shadow-[0_10px_30px_-8px_rgb(255_91_61/0.7)] disabled:opacity-60"
      >
        {pending ? "Telling the crew…" : "Send to the crew"}
      </motion.button>
    </form>
  );
}
