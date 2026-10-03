import { PrayersView } from "@/components/views/PrayersView";
import { requireMember } from "@/lib/auth";
import { getProfilesById, getSettings } from "@/lib/data";
import { groupByWeek, prayerRows } from "@/lib/rows";
import { getNeighborsById, getPrayers } from "@/lib/weekly";

export const metadata = { title: "Prayers" };

export default async function PrayersPage() {
  const viewer = await requireMember("/prayers");
  const [settings, prayers] = await Promise.all([getSettings(), getPrayers({ limit: 300 })]);
  const [neighbors, people] = await Promise.all([
    getNeighborsById(prayers.map((p) => p.neighbor_id)),
    getProfilesById(prayers.map((p) => p.submitted_by).filter(Boolean) as string[]),
  ]);
  const groups = groupByWeek(prayers).map((g) => ({ label: g.label, rows: prayerRows(g.items, neighbors, people, viewer) }));
  return <PrayersView viewer={viewer} settings={settings} groups={groups} />;
}
