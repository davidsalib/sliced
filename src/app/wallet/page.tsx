import { WalletView } from "@/components/views/WalletView";
import { requireMember } from "@/lib/auth";
import { getBilling, getSettings } from "@/lib/data";
import { adminDb } from "@/lib/supabase/admin";
import type { Participant, SpendRequest } from "@/lib/types";

export const metadata = { title: "Wallet" };

const BANK_MESSAGES: Record<string, string> = {
  connected: "Bank connected. You can get paid back now.",
  pending: "Stripe is still checking your details. We'll switch you on once they're done.",
  error: "Couldn't reach Stripe. Try again.",
};

export default async function Wallet(props: PageProps<"/wallet">) {
  const sp = await props.searchParams;
  const viewer = await requireMember("/wallet");
  const [settings, billing] = await Promise.all([getSettings(), getBilling(viewer.id)]);

  const db = adminDb();
  const [{ data: mine }, { data: paidFor }] = await Promise.all([
    db.from("participants").select("*").eq("user_id", viewer.id).neq("kind", "payer").order("joined_at", { ascending: false }).limit(20),
    db.from("requests").select("*").eq("payer_id", viewer.id).order("created_at", { ascending: false }).limit(10),
  ]);
  const charges = (mine ?? []) as Participant[];
  const reqIds = charges.map((c) => c.request_id);
  const { data: reqs } = reqIds.length ? await db.from("requests").select("*").in("id", reqIds) : { data: [] };

  return (
    <WalletView
      viewer={viewer}
      settings={settings}
      hasStripeAccount={!!billing.stripe_account_id}
      charges={charges}
      requestsById={new Map(((reqs ?? []) as SpendRequest[]).map((r) => [r.id, r]))}
      paidFor={(paidFor ?? []) as SpendRequest[]}
      bankMsg={typeof sp.bank === "string" ? (BANK_MESSAGES[sp.bank] ?? null) : null}
      setupIntentReturn={typeof sp.setup_intent === "string" ? sp.setup_intent : null}
    />
  );
}
