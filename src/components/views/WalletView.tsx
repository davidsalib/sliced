import Link from "next/link";
import { Shell } from "@/components/Shell";
import { WalletCard } from "@/components/WalletCard";
import { Pep } from "@/components/Toppings";
import { money } from "@/lib/split";
import { formatWhen } from "@/lib/time";
import type { Participant, Profile, Settings, SpendRequest } from "@/lib/types";

export type WalletData = {
  viewer: Profile;
  settings: Settings;
  hasStripeAccount: boolean;
  charges: Participant[];
  requestsById: Map<string, SpendRequest>;
  paidFor: SpendRequest[];
  bankMsg: string | null;
  setupIntentReturn: string | null;
  activeHref?: string;
};

export function WalletView({ viewer, settings, hasStripeAccount, charges, requestsById, paidFor, bankMsg, setupIntentReturn, activeHref }: WalletData) {
  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref={activeHref}>
      <h1 className="flex items-center gap-2 font-display text-4xl font-extrabold">Wallet <Pep size={22} /></h1>

      <section aria-labelledby="pay" className="mt-6 grid gap-3">
        <h2 id="pay" className="font-display text-xl font-extrabold">
          Chipping in
        </h2>
        <WalletCard hasCard={viewer.has_card} cardLabel={viewer.card_label} autoJoin={viewer.auto_join} setupIntentReturn={setupIntentReturn} />
      </section>

      <section aria-labelledby="receive" className="mt-8 grid gap-3">
        <h2 id="receive" className="font-display text-xl font-extrabold">
          Getting paid back
        </h2>
        {bankMsg && <p className="rounded-2xl bg-oven-3 p-3 text-sm font-semibold text-cheese">{bankMsg}</p>}
        <div className="grid gap-3 rounded-3xl border border-ash bg-oven-2 p-5">
          {viewer.can_receive ? (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <span className="size-2.5 rounded-full bg-basil" aria-hidden /> Bank connected through Stripe
              </p>
              <p className="text-sm text-dough">When you pick up the pizza, everyone&apos;s share lands in your bank, usually 2 business days after slicing.</p>
              <Link href="/api/stripe/dashboard" prefetch={false} className="justify-self-start rounded-full border border-ash px-4 py-2 text-sm font-semibold">
                Payouts &amp; bank details
              </Link>
            </>
          ) : (
            <>
              <p className="text-dough">Only needed if you&apos;re the one picking up the pizza. Stripe asks for your bank and a few ID details so it can pay you.</p>
              <Link href="/api/stripe/connect" prefetch={false} className="justify-self-start rounded-full bg-cheese px-5 py-3 font-bold text-oven">
                {hasStripeAccount ? "Finish Stripe setup" : "Connect bank with Stripe"}
              </Link>
            </>
          )}
        </div>
      </section>

      {(charges.length > 0 || paidFor.length > 0) && (
        <section aria-labelledby="history" className="mt-8 grid gap-2">
          <h2 id="history" className="font-display text-xl font-extrabold">
            History
          </h2>
          <ul className="grid gap-1 text-sm">
            {paidFor.map((r) => (
              <li key={`p${r.id}`}>
                <Link href={`/r/${r.id}`} className="flex justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-oven-2">
                  <span>You picked up pizza · {formatWhen(r.created_at, settings.timezone, false)}</span>
                  <span className="font-bold text-basil tabular">{money(r.amount_cents)}</span>
                </Link>
              </li>
            ))}
            {charges.map((c) => {
              const r = requestsById.get(c.request_id);
              if (!r) return null;
              return (
                <li key={`c${c.request_id}`}>
                  <Link href={`/r/${r.id}`} className="flex justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-oven-2">
                    <span>
                      Slice · {formatWhen(r.created_at, settings.timezone, false)}
                      {r.status === "open" && <span className="text-dough"> · not sliced yet</span>}
                      {r.status === "canceled" && <span className="text-dough"> · canceled</span>}
                    </span>
                    <span className={`font-bold tabular ${c.status === "failed" ? "text-tomato" : ""}`}>
                      {c.status === "failed" ? "Needs payment" : c.charge_cents ? `-${money(c.charge_cents)}` : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Shell>
  );
}
