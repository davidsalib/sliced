"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/app/actions";
import { deletePost, savePost } from "@/app/weekly-actions";
import type { WeeklyPost } from "@/lib/types";

const field = "rounded-2xl border border-ash bg-oven-2 px-4 py-3 outline-none focus:border-cheese";
const label = "text-sm font-semibold text-dough";

/** Admins write the week's gospel, message, and two questions. */
export function PostEditor({ post, defaultWeekOf, saved }: { post: WeeklyPost | null; defaultWeekOf: string; saved?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePost, undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const published = post?.published ?? false;

  return (
    <form action={action} className="mt-6 grid gap-5">
      {post && <input type="hidden" name="id" value={post.id} />}
      {saved && <p className="rounded-2xl bg-basil/15 p-3 text-sm font-semibold text-basil">Draft saved. Only admins can see it until you publish.</p>}

      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <label className="grid gap-1.5">
          <span className={label}>Week of</span>
          <input type="date" name="week_of" required defaultValue={post?.week_of ?? defaultWeekOf} className={field} />
        </label>
        <label className="grid gap-1.5">
          <span className={label}>Title (optional)</span>
          <input name="title" maxLength={120} defaultValue={post?.title ?? ""} placeholder="Love one another" className={field} />
        </label>
      </div>

      <label className="grid gap-1.5">
        <span className={label}>Gospel reading</span>
        <input name="gospel_reference" required maxLength={120} defaultValue={post?.gospel_reference ?? ""} placeholder="John 15:9–17" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className={label}>Gospel text</span>
        <textarea name="gospel_text" required rows={7} maxLength={20000} defaultValue={post?.gospel_text ?? ""} placeholder="Paste the passage here" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className={label}>Lesson or message to share</span>
        <textarea name="message" required rows={6} maxLength={20000} defaultValue={post?.message ?? ""} placeholder="What should the crew carry into this week's service?" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className={label}>Question of hope</span>
        <input name="hope_question" required maxLength={500} defaultValue={post?.hope_question ?? ""} placeholder="What's something you're hoping for this week?" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className={label}>Question of friendship and knowing</span>
        <input name="friendship_question" required maxLength={500} defaultValue={post?.friendship_question ?? ""} placeholder="Who is someone that really knows you?" className={field} />
      </label>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-oven-2 p-4">
        <input type="checkbox" name="email" defaultChecked className="mt-1 size-5 accent-tomato" />
        <span>
          <span className="block font-semibold">{published ? "Email everyone about this update" : "Email everyone when it's published"}</span>
          <span className="block text-sm text-dough">Includes last week&apos;s answers and prayer requests.</span>
        </span>
      </label>

      {state?.error && <p className="font-semibold text-tomato">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button name="intent" value="publish" disabled={pending} className="btn-pep rounded-full bg-tomato px-6 py-3.5 font-display text-lg font-extrabold text-oven disabled:opacity-60">
          {pending ? "Saving…" : published ? "Save changes" : "Publish this week"}
        </button>
        {!published && (
          <button name="intent" value="draft" disabled={pending} className="rounded-full border border-ash px-5 py-3 font-semibold">
            Save draft
          </button>
        )}
        {post && (
          <span className="ml-auto flex items-center gap-2 text-sm">
            {!confirmDelete ? (
              <button type="button" onClick={() => setConfirmDelete(true)} className="font-semibold text-dough hover:text-flour">
                Delete
              </button>
            ) : (
              <>
                Delete this week and its answers?
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => startDelete(async () => void (await deletePost(post.id)))}
                  className="rounded-full bg-tomato-deep px-3 py-1.5 font-semibold"
                >
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="font-semibold text-dough">
                  Keep
                </button>
              </>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
