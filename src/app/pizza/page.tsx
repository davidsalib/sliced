import { HomeView } from "@/components/views/HomeView";
import { requireMember } from "@/lib/auth";
import { getParticipantsFor, getProfilesById, getRequests, getSettings } from "@/lib/data";

export const metadata = { title: "Pizza" };

export default async function PizzaHome() {
  const viewer = await requireMember("/pizza");
  const settings = await getSettings();
  const [open, past] = await Promise.all([getRequests(["open", "slicing"], 20), getRequests(["sliced"], 12)]);
  const parts = await getParticipantsFor([...open, ...past].map((r) => r.id));
  const people = await getProfilesById([...open, ...past].flatMap((r) => [r.payer_id, ...(parts.get(r.id) ?? []).map((p) => p.user_id)]));

  return <HomeView viewer={viewer} settings={settings} open={open} past={past} parts={parts} people={people} />;
}
