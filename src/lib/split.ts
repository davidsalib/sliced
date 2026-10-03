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

/** Card charge so that after Stripe's fee the platform still holds `share`. */
export function grossUp(shareCents: number) {
  return Math.ceil((shareCents + STRIPE_FIXED_CENTS) / (1 - STRIPE_PERCENT));
}

export function estimatedFee(chargeCents: number) {
  return Math.round(chargeCents * STRIPE_PERCENT) + STRIPE_FIXED_CENTS;
}

/**
 * What to charge an eater and what to pass on to the payer's bank.
 * The platform never fronts Stripe fees: either eaters cover them, or they come out of the payout.
 */
export function chargePlan(shareCents: number, feesPaidBy: "eaters" | "payer") {
  if (feesPaidBy === "eaters") {
    return { charge: Math.max(grossUp(shareCents), STRIPE_MIN_CHARGE_CENTS), transfer: shareCents };
  }
  const charge = Math.max(shareCents, STRIPE_MIN_CHARGE_CENTS);
  return { charge, transfer: Math.max(0, Math.min(shareCents, charge - estimatedFee(charge))) };
}

/** Rough per-person estimate for the UI. */
export function estimateEach(amountCents: number, eaters: number, feesPaidBy: "eaters" | "payer") {
  if (eaters <= 0) return null;
  const share = Math.ceil(amountCents / eaters);
  return { share, charge: chargePlan(share, feesPaidBy).charge };
}
