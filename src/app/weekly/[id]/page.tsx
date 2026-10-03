import { notFound } from "next/navigation";
import { WeeklyView } from "@/components/views/WeeklyView";
import { requireMember } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { getPost } from "@/lib/weekly";
import { loadWeekly } from "@/lib/weekly-load";

export const metadata = { title: "Weekly message" };

export default async function WeeklyPostPage(props: PageProps<"/weekly/[id]">) {
  const { id } = await props.params;
  const viewer = await requireMember(`/weekly/${id}`);
  const [settings, post] = await Promise.all([getSettings(), getPost(id)]);
  if (!post || (!post.published && viewer.role !== "admin")) notFound();
  const data = await loadWeekly(viewer, post);
  return <WeeklyView viewer={viewer} settings={settings} post={post} answers={data.answers} older={data.older} isCurrent={data.isCurrent} activeHref="/" />;
}
