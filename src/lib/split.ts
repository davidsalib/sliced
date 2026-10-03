/** Stripe's standard US card pricing. International cards cost more; the crew absorbs that difference. */
export const STRIPE_PERCENT = 0.029;
export const STRIPE_FIXED_CENTS = 30;
export const STRIPE_MIN_CHARGE_CENTS = 50;

export function money(cents: number) {
  return (cents < 0 ? "-$" : "$") + (Math.abs(cents) / 100).toFixed(2);
}

/**
 * Splits `amount` evenly across `eaters` (in join order). Leftover cents go to the
 * payer when they eat, since they are never charged; otherwise to the earliest joiners.
 */
export function splitShares(amountCents: number, eaters: { id: string; isPayer: boolean }[]) {
  const shares = new Map<string, number>();
  const n = eaters.length;
  if (!n) return shares;
  const base = Math.floor(amountCents / n);
  let remainder = amountCents - base * n;
  for (const e of eaters) shares.set(e.id, base);
  const payer = eaters.find((e) => e.isPayer);
  if (payer && remainder) {
    shares.set(payer.id, base + remainder);
    remainder = 0;
  }
  for (const e of eaters) {
    if (!remainder) break;
    shares.set(e.id, base + 1);
    remainder--;
  }
  return shares;
}

/** Stripe's fee on one card charge, rounded up so the pool never comes up short. */
export function stripeFee(chargeCents: number) {
  return Math.ceil(chargeCents * STRIPE_PERCENT) + STRIPE_FIXED_CENTS;
}

/** Splits `total` into `n` near-equal whole-cent parts (earlier parts get the extra cents). */
function evenParts(total: number, n: number) {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => base + (i < total - base * n ? 1 : 0));
}

export type ChargeLine = { share: number; fee: number; charge: number };

/**
 * What each person being charged pays, so that whoever picked up the pizza receives
 * every share in full and Stripe's card fees are pooled and split evenly across
 * everyone chipping in. Each charge = their share + their slice of the fee pool;
 * the pool always covers Stripe's fee on every charge.
 */
export function planCharges(shares: number[]): ChargeLine[] {
  const n = shares.length;
  if (!n) return [];
  let pool = shares.reduce((t, s) => t + stripeFee(s), 0);
  for (let round = 0; round < 50; round++) {
    const parts = evenParts(pool, n);
    // Stripe won't charge less than $0.50; a tiny share pays a little more fee to reach it.
    const lines = shares.map((share, i) => {
      const charge = Math.max(share + parts[i], STRIPE_MIN_CHARGE_CENTS);
      return { share, fee: charge - share, charge };
    });
    const needed = lines.reduce((t, l) => t + stripeFee(l.charge), 0);
    const collected = lines.reduce((t, l) => t + l.fee, 0);
    if (collected >= needed) return lines;
    pool = needed;
  }
  throw new Error("Couldn't balance the card fees.");
}

/** Rough per-person estimate for the UI: `eaters` share the pizza, `charged` of them get a card charge. */
export function estimateEach(amountCents: number, eaters: number, charged: number) {
  if (eaters <= 0) return null;
  const share = Math.ceil(amountCents / eaters);
  if (charged <= 0) return { share, charge: share };
  const lines = planCharges(Array.from({ length: charged }, () => share));
  return { share, charge: Math.max(...lines.map((l) => l.charge)) };
}
