import Link from "next/link";
import { PrayerForm, PrayerList, type PrayerRow } from "@/components/Prayers";
import { Shell } from "@/components/Shell";
import { Pep } from "@/components/Toppings";
import type { NeighborHit, Profile, Settings } from "@/lib/types";

export type PrayersData = {
  viewer: Profile;
  settings: Settings;
  groups: { label: string; rows: PrayerRow[] }[];
  sampleHits?: NeighborHit[];
  activeHref?: string;
};

export function PrayersView({ viewer, settings, groups, sampleHits, activeHref }: PrayersData) {
  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref={activeHref}>
      <div className="flex items-end justify-between gap-3">
        <h1 className="flex items-center gap-2 font-display text-4xl font-extrabold">
          Prayers <Pep size={22} />
        </h1>
        <Link href="/neighbors" className="rounded-full border border-ash px-4 py-2 text-sm font-semibold">
          Neighbors
        </Link>
      </div>
      <p className="mt-1 text-dough">Share what someone asked us to pray for. This week&apos;s requests go out with next week&apos;s message.</p>

      <div className="mt-5">
        <PrayerForm sampleHits={sampleHits} />
      </div>

      {groups.length === 0 ? (
        <p className="mt-8 text-center text-dough">No prayer requests yet.</p>
      ) : (
        groups.map((g) => (
          <section key={g.label} aria-label={g.label} className="mt-8 grid gap-2">
            <h2 className="font-display text-xl font-extrabold">
              {g.label} <span className="text-dough tabular">({g.rows.length})</span>
            </h2>
            <PrayerList rows={g.rows} />
          </section>
        ))
      )}
    </Shell>
  );
}
