"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getViewer, memberOrThrow } from "@/lib/auth";
import { THANK_YOU } from "@/lib/brand";
import { getMembers } from "@/lib/data";
import { parseName } from "@/lib/neighbors";
import { notifyWeekly } from "@/lib/notify";
import { adminDb } from "@/lib/supabase/admin";
import type { Profile, QuestionKind, WeeklyPost } from "@/lib/types";
import { getAnswers, getNeighborsById, getPrayers, getPreviousPost } from "@/lib/weekly";
import type { FormState } from "@/app/actions";

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Weekly message (admins)
// ---------------------------------------------------------------------------

export async function savePost(_prev: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return { error: "Only admins can post the weekly message." };

  const text = (k: string, max: number) => String(form.get(k) ?? "").trim().slice(0, max);
  const id = text("id", 64) || null;
  const weekOf = text("week_of", 10);
  const fields = {
    week_of: weekOf,
    title: text("title", 120) || null,
    gospel_reference: text("gospel_reference", 120),
    gospel_text: text("gospel_text", 20000),
    message: text("message", 20000),
    hope_question: text("hope_question", 500),
    friendship_question: text("friendship_question", 500),
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) return { error: "Pick the week this message is for." };
  if (!fields.gospel_reference || !fields.gospel_text) return { error: "Add the gospel reading and its text." };
  if (!fields.message) return { error: "Add the message to share." };
  if (!fields.hope_question || !fields.friendship_question) return { error: "Add both questions." };

  const publish = form.get("intent") !== "draft";
  const sendEmail = publish && form.get("email") === "on";
  const db = adminDb();
  const now = new Date().toISOString();

  let post: WeeklyPost;
  let wasPublished = false;
  if (id) {
    const { data: existing } = await db.from("weekly_posts").select("*").eq("id", id).maybeSingle();
    if (!existing) return { error: "That message no longer exists." };
    wasPublished = (existing as WeeklyPost).published;
    const { data, error } = await db
      .from("weekly_posts")
      .update({ ...fields, published: publish || wasPublished, published_at: (existing as WeeklyPost).published_at ?? (publish ? now : null), updated_at: now })
      .eq("id", id)
      .select("*")
      .single();
    if (error || !data) return { error: "Couldn't save. Try again." };
    post = data as WeeklyPost;
  } else {
    const { data, error } = await db
      .from("weekly_posts")
      .insert({ ...fields, published: publish, published_at: publish ? now : null, created_by: viewer.id })
      .select("*")
      .single();
    if (error || !data) return { error: "Couldn't save. Try again." };
    post = data as WeeklyPost;
  }

  if (sendEmail) {
    const isUpdate = wasPublished;
    after(async () => {
      try {
        await emailWeekly(post, isUpdate);
        await adminDb().from("weekly_posts").update({ emailed_at: new Date().toISOString() }).eq("id", post.id);
      } catch (e) {
        console.error("Weekly email failed", e);
      }
    });
  }

  refresh();
  redirect(publish ? `/?posted=${sendEmail ? "emailed" : "1"}` : `/weekly/${post.id}/edit?saved=1`);
}

/** Builds and sends the weekly email: this week's message plus last week's answers and prayers. */
async function emailWeekly(post: WeeklyPost, isUpdate: boolean) {
  const [members, previousPost] = await Promise.all([getMembers(), getPreviousPost(post)]);
  const since = previousPost?.published_at ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [prevAnswers, prayers] = await Promise.all([previousPost ? getAnswers([previousPost.id]) : Promise.resolve([]), getPrayers({ since })]);
  const neighbors = await getNeighborsById([...prevAnswers.map((a) => a.neighbor_id), ...prayers.map((p) => p.neighbor_id)]);
  await notifyWeekly({
    post,
    isUpdate,
    members: members.filter((m: Profile) => m.email),
    previous: previousPost ? { post: previousPost, answers: prevAnswers } : null,
    prayers: [...prayers].reverse(),
    neighbors,
  });
}

export async function deletePost(id: string): Promise<FormState> {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return { error: "Only admins can delete weekly messages." };
  await adminDb().from("weekly_posts").delete().eq("id", id);
  refresh();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Neighbors, answers, prayers (all members)
// ---------------------------------------------------------------------------

type PersonInput = { neighborId?: string | null; newName?: string | null };

/** Finds the chosen neighbor or adds a new one. Returns null when no name was given. */
async function resolveNeighbor(viewer: Profile, person: PersonInput): Promise<string | null> {
  const db = adminDb();
  const now = new Date().toISOString();
  if (person.neighborId) {
    const { data } = await db.from("neighbors").update({ last_seen_at: now }).eq("id", person.neighborId).select("id").maybeSingle();
    if (!data) throw new Error("That neighbor wasn't found. Search again.");
    return data.id as string;
  }
  const parsed = person.newName ? parseName(person.newName) : null;
  if (!parsed) return null;
  const { data, error } = await db
    .from("neighbors")
    .insert({ first_name: parsed.first, last_name: parsed.last, created_by: viewer.id, last_seen_at: now })
    .select("id")
    .single();
  if (error || !data) throw new Error("Couldn't save that name. Try again.");
  return data.id as string;
}

export async function saveAnswer(input: { postId: string; question: QuestionKind } & PersonInput & { answer: string }): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    const answer = input.answer.trim().slice(0, 4000);
    if (!answer) return { error: "Write down what they shared." };
    if (input.question !== "hope" && input.question !== "friendship") return { error: "Pick a question." };
    const { data: post } = await adminDb().from("weekly_posts").select("id, published").eq("id", input.postId).maybeSingle();
    if (!post?.published) return { error: "That weekly message isn't up anymore." };
    const neighborId = await resolveNeighbor(viewer, input);
    if (!neighborId) return { error: "Add their name so we can find them again next week." };
    await adminDb().from("answers").insert({ post_id: input.postId, question: input.question, neighbor_id: neighborId, answer, recorded_by: viewer.id });
    refresh();
    return { ok: `${THANK_YOU}. Their answer is saved.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deleteAnswer(id: string): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    const db = adminDb();
    const { data } = await db.from("answers").select("recorded_by").eq("id", id).maybeSingle();
    if (!data) return { ok: "Already removed." };
    if (data.recorded_by !== viewer.id && viewer.role !== "admin") return { error: "Only the person who wrote it, or an admin, can remove it." };
    await db.from("answers").delete().eq("id", id);
    refresh();
    return { ok: "Removed." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function savePrayer(input: PersonInput & { anonymous: boolean; request: string }): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    const request = input.request.trim().slice(0, 2000);
    if (!request) return { error: "Write what to pray for." };
    const neighborId = input.anonymous ? null : await resolveNeighbor(viewer, input);
    if (!input.anonymous && !neighborId) return { error: "Add a name, or switch to anonymous." };
    await adminDb().from("prayers").insert({ neighbor_id: neighborId, anonymous: input.anonymous, request, submitted_by: viewer.id });
    refresh();
    return { ok: `${THANK_YOU}. We'll pray for this, and it goes in next week's email.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function deletePrayer(id: string): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    const db = adminDb();
    const { data } = await db.from("prayers").select("submitted_by").eq("id", id).maybeSingle();
    if (!data) return { ok: "Already removed." };
    if (data.submitted_by !== viewer.id && viewer.role !== "admin") return { error: "Only the person who added it, or an admin, can remove it." };
    await db.from("prayers").delete().eq("id", id);
    refresh();
    return { ok: "Removed." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
