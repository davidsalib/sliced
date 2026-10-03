import { notFound } from "next/navigation";
import { PostEditor } from "@/components/PostEditor";
import { Shell } from "@/components/Shell";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { getPost } from "@/lib/weekly";
import { nextSunday } from "@/lib/weekly-load";

export const metadata = { title: "Edit weekly message" };

export default async function EditWeekly(props: PageProps<"/weekly/[id]/edit">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const viewer = await requireAdmin();
  const [settings, post] = await Promise.all([getSettings(), getPost(id)]);
  if (!post) notFound();
  return (
    <Shell viewer={viewer} crewName={settings.crew_name} activeHref="/">
      <h1 className="font-display text-4xl font-extrabold">Edit this week</h1>
      <PostEditor post={post} defaultWeekOf={nextSunday()} saved={!!sp.saved} />
    </Shell>
  );
}
