import { PostEditor } from "@/components/PostEditor";
import { Shell } from "@/components/Shell";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { nextSunday } from "@/lib/weekly-load";

export const metadata = { title: "New weekly message" };

export default async function NewWeekly() {
  const viewer = await requireAdmin();
  const settings = await getSettings();
  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref="/">
      <h1 className="font-display text-4xl font-extrabold">This week&apos;s message</h1>
      <p className="mt-1 text-dough">The gospel, a message to share, and two questions to ask our neighbors. Publishing emails everyone.</p>
      <PostEditor post={null} defaultWeekOf={nextSunday()} />
    </Shell>
  );
}
