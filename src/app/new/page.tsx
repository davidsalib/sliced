import Link from "next/link";
import { NewRequestForm } from "@/components/NewRequestForm";
import { Shell } from "@/components/Shell";
import { requireMember } from "@/lib/auth";
import { getMembers, getSettings } from "@/lib/data";
import { computeSliceAt, formatWhen } from "@/lib/time";

export const metadata = { title: "I paid for pizza" };

export default async function NewRequest() {
  const viewer = await requireMember("/new");
  const [settings, members] = await Promise.all([getSettings(), getMembers()]);
  const subscribers = members.filter((m) => m.id !== viewer.id && m.auto_join && m.has_card).length;
  const sliceAt = computeSliceAt(new Date(), settings.days_before_slice, settings.charge_time, settings.timezone);

  return (
    <Shell viewer={viewer} crewName={settings.crew_name}>
      <h1 className="font-display text-4xl font-extrabold">I picked up pizza</h1>
      <p className="mt-1 text-dough">Log what you spent on this week&apos;s service pizza. The crew gets an email and the pie is sliced {formatWhen(sliceAt, settings.timezone)}.</p>

      {!viewer.can_receive ? (
        <div className="mt-8 grid gap-3 rounded-3xl border border-cheese/40 bg-cheese/10 p-5">
          <p className="font-display text-xl font-extrabold">Connect your bank first</p>
          <p className="text-dough">The crew&apos;s cards pay you back through Stripe, so it needs to know where to send the money. Takes about two minutes.</p>
          <Link href="/api/stripe/connect" prefetch={false} className="justify-self-start rounded-full bg-cheese px-5 py-3 font-bold text-oven">
            Connect bank with Stripe
          </Link>
        </div>
      ) : (
        <NewRequestForm subscribers={subscribers} />
      )}
    </Shell>
  );
}
