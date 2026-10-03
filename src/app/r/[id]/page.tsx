import { notFound } from "next/navigation";
import { RequestView } from "@/components/views/RequestView";
import { requireMember } from "@/lib/auth";
import { getProfilesById, getRequest, getSettings } from "@/lib/data";

export const metadata = { title: "Split" };

export default async function RequestPage(props: PageProps<"/r/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const viewer = await requireMember(`/r/${id}`);
  const [{ request, participants }, settings] = await Promise.all([getRequest(id), getSettings()]);
  if (!request) notFound();
  const people = await getProfilesById([request.payer_id, ...participants.map((p) => p.user_id)]);

  return <RequestView viewer={viewer} settings={settings} request={request} participants={participants} people={people} isNew={!!sp.new} />;
}
