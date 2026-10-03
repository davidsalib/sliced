import assert from "node:assert/strict";
import { planCharges, splitShares, stripeFee, estimateEach } from "../src/lib/split.ts";

function check(amount: number, people: number, payerEats: boolean) {
  const eaters = [...(payerEats ? [{ id: "payer", isPayer: true }] : []), ...Array.from({ length: people }, (_, i) => ({ id: `p${i}`, isPayer: false }))];
  const shares = splitShares(amount, eaters);
  const charged = eaters.filter((e) => !e.isPayer).map((e) => shares.get(e.id)!);
  const lines = planCharges(charged);
  const payerGets = lines.reduce((t, l) => t + l.share, 0);
  const payerOwn = payerEats ? shares.get("payer")! : 0;
  assert.equal(payerGets + payerOwn, amount, "payer is made whole");
  const pool = lines.reduce((t, l) => t + l.fee, 0);
  const stripeTotal = lines.reduce((t, l) => t + stripeFee(l.charge), 0);
  assert.ok(pool >= stripeTotal, `fee pool ${pool} covers Stripe ${stripeTotal}`);
  assert.ok(pool - stripeTotal <= lines.length + 1, `pool barely over (${pool - stripeTotal}c extra)`);
  const fees = lines.map((l) => l.fee);
  assert.ok(Math.max(...fees) - Math.min(...fees) <= 1 || lines.some((l) => l.charge === 50), "fee split evenly");
  return { amount, people, payerEats, charges: lines.map((l) => l.charge), feeEach: fees, pool, stripeTotal };
}
const rows = [];
for (const amount of [995, 2985, 3980, 5970, 12340]) for (const people of [1, 2, 4, 7, 15]) for (const eats of [true, false]) rows.push(check(amount, people, eats));
console.log(`${rows.length} scenarios: payer always made whole, fee pool always covers Stripe, fees split evenly`);
for (const r of rows.filter((r) => r.amount === 3980 && [4, 5].includes(r.people) || r.people === 4 && r.amount === 3980)) console.log(JSON.stringify(r));
console.log("estimate $39.80, 5 eaters, 4 charged:", estimateEach(3980, 5, 4));
