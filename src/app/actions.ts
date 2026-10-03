"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { randomBytes } from "node:crypto";
import { memberOrThrow, getViewer } from "@/lib/auth";
import { getBilling, getMembers, getRequest, getSettings, upsertBilling } from "@/lib/data";
import { notifyNewRequest } from "@/lib/notify";
import { THANK_YOU } from "@/lib/brand";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/supabase/admin";
import { computeSliceAt, isValidTimeZone } from "@/lib/time";
import type { Role, SpendRequest } from "@/lib/types";

export type FormState = { error?: string; ok?: string } | undefined;

function refreshAll(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/r/${id}`);
}

// ---------------------------------------------------------------------------
// Spend requests
// ---------------------------------------------------------------------------

export async function createRequest(_prev: FormState, form: FormData): Promise<FormState> {
  let viewer;
  try {
    viewer = await memberOrThrow();
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!viewer.can_receive) return { error: "Connect your bank in Wallet first so the crew can pay you back." };

  const amount = Math.round(parseFloat(String(form.get("amount") ?? "").replace(/[^0-9.]/g, "")) * 100);
  if (!Number.isFinite(amount) || amount < 100 || amount > 200000) return { error: "Enter an amount between $1 and $2,000." };
  const note = String(form.get("note") ?? "").trim().slice(0, 140) || null;
  const payerEats = form.get("payer_eats") === "on";

  const settings = await getSettings();
  const sliceAt = computeSliceAt(new Date(), settings.days_before_slice, settings.charge_time, settings.timezone);
  const db = adminDb();

  const { data, error } = await db
    .from("requests")
    .insert({ payer_id: viewer.id, amount_cents: amount, note, payer_eats: payerEats, slice_at: sliceAt.toISOString() })
    .select("*")
    .single();
  if (error || !data) return { error: "Couldn't save the request. Try again." };
  const request = data as SpendRequest;

  // Subscribers with a card are in automatically.
  const members = await getMembers();
  const subscribers = members.filter((m) => m.id !== viewer.id && m.auto_join && m.has_card);
  const rows = [
    ...(payerEats ? [{ request_id: request.id, user_id: viewer.id, kind: "payer" }] : []),
    ...subscribers.map((m) => ({ request_id: request.id, user_id: m.id, kind: "subscriber" })),
  ];
  if (rows.length) await db.from("participants").insert(rows);

  after(() =>
    notifyNewRequest({ request, payer: viewer, members, subscriberIds: new Set(subscribers.map((s) => s.id)), settings }).catch((e) =>
      console.error("New request email failed", e),
    ),
  );

  refreshAll();
  redirect(`/r/${request.id}?new=1`);
}

export async function joinRequest(id: string): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    const { request, participants } = await getRequest(id);
    if (!request || request.status !== "open") return { error: "This split is already sliced." };
    if (participants.some((p) => p.user_id === viewer.id)) return { ok: "You're already in." };

    const isPayer = request.payer_id === viewer.id;
    if (!isPayer && !viewer.has_card) return { error: "Add a card first so we can charge your share." };

    const db = adminDb();
    await db.from("participants").insert({ request_id: id, user_id: viewer.id, kind: isPayer ? "payer" : "once" });
    if (isPayer) await db.from("requests").update({ payer_eats: true }).eq("id", id);
    refreshAll(id);
    return { ok: isPayer ? `${THANK_YOU}. Your slice is counted.` : `${THANK_YOU}. You're chipping in on this one.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function leaveRequest(id: string): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    const { request } = await getRequest(id);
    if (!request || request.status !== "open") return { error: "This split is already sliced." };
    const db = adminDb();
    await db.from("participants").delete().eq("request_id", id).eq("user_id", viewer.id);
    if (request.payer_id === viewer.id) await db.from("requests").update({ payer_eats: false }).eq("id", id);
    refreshAll(id);
    return { ok: "You're out of this one." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function cancelRequest(id: string): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    const { request } = await getRequest(id);
    if (!request || request.status !== "open") return { error: "Only open splits can be canceled." };
    if (request.payer_id !== viewer.id && viewer.role !== "admin") return { error: "Only the payer or an admin can cancel." };
    await adminDb().from("requests").update({ status: "canceled" }).eq("id", id).eq("status", "open");
    refreshAll(id);
    return { ok: "Canceled. Nobody will be charged." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Admin escape hatch: slice right now instead of waiting for the scheduled time. */
export async function sliceNow(id: string): Promise<FormState> {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") return { error: "Only admins can slice early." };
  const { sliceRequest } = await import("@/lib/slicer");
  const result = await sliceRequest(id);
  refreshAll(id);
  if (result.outcome === "postponed") return { error: "The payer's bank can't receive money yet. We emailed them." };
  if (result.outcome === "skipped") return { error: "This split was already sliced." };
  return { ok: `Sliced! ${result.charged} charged${result.failed ? `, ${result.failed} need to pay by hand` : ""}.` };
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export async function setAutoJoin(on: boolean): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    if (on && !viewer.has_card) return { error: "Add a card first." };
    const db = adminDb();
    await db.from("profiles").update({ auto_join: on }).eq("id", viewer.id);

    const { data: open } = await db.from("requests").select("id, payer_id").eq("status", "open");
    const openIds = (open ?? []).filter((r) => r.payer_id !== viewer.id).map((r) => r.id as string);
    if (on && openIds.length) {
      // Jump into this week's open splits too.
      await db
        .from("participants")
        .upsert(
          openIds.map((request_id) => ({ request_id, user_id: viewer.id, kind: "subscriber" })),
          { onConflict: "request_id,user_id", ignoreDuplicates: true },
        );
    } else if (!on && openIds.length) {
      await db.from("participants").delete().eq("user_id", viewer.id).eq("kind", "subscriber").in("request_id", openIds);
    }
    refreshAll();
    return { ok: on ? `${THANK_YOU}. You'll chip in every week.` : "Unsubscribed. Chip in one week at a time." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function removeCard(): Promise<FormState> {
  try {
    const viewer = await memberOrThrow();
    const billing = await getBilling(viewer.id);
    if (billing.payment_method_id) await stripe().paymentMethods.detach(billing.payment_method_id).catch(() => undefined);
    await upsertBilling(viewer.id, { payment_method_id: null });
    const db = adminDb();
    await db.from("profiles").update({ has_card: false, card_label: null, auto_join: false }).eq("id", viewer.id);

    // Leave splits that haven't been sliced yet, since we can't charge you.
    const { data: open } = await db.from("requests").select("id").eq("status", "open").neq("payer_id", viewer.id);
    const ids = (open ?? []).map((r) => r.id as string);
    if (ids.length) await db.from("participants").delete().eq("user_id", viewer.id).in("request_id", ids);
    refreshAll();
    return { ok: "Card removed." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

async function adminOrError() {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") throw new Error("Only admins can change crew settings.");
  return viewer;
}

export async function updateSettings(_prev: FormState, form: FormData): Promise<FormState> {
  try {
    await adminOrError();
    const days = Number(form.get("days_before_slice"));
    const time = String(form.get("charge_time") ?? "");
    const tz = String(form.get("timezone") ?? "");
    const fees = String(form.get("fees_paid_by") ?? "");
    const name = String(form.get("crew_name") ?? "").trim().slice(0, 40);
    if (!Number.isInteger(days) || days < 0 || days > 14) return { error: "Days before slicing must be 0 to 14." };
    if (!/^\d{2}:\d{2}$/.test(time)) return { error: "Pick a charge time." };
    if (!isValidTimeZone(tz)) return { error: "That time zone isn't recognized." };
    if (fees !== "eaters" && fees !== "payer") return { error: "Pick who covers card fees." };

    await adminDb()
      .from("settings")
      .update({
        crew_name: name || "Pizza Service",
        days_before_slice: days,
        charge_time: time,
        timezone: tz,
        fees_paid_by: fees,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (form.get("apply_open") === "on") {
      // Re-time splits that haven't been sliced yet, counting from when each was created.
      const db = adminDb();
      const { data: open } = await db.from("requests").select("id, created_at").eq("status", "open");
      for (const r of open ?? []) {
        const at = computeSliceAt(new Date(r.created_at as string), days, time, tz);
        const floor = Date.now() + 5 * 60_000;
        await db
          .from("requests")
          .update({ slice_at: new Date(Math.max(at.getTime(), floor)).toISOString() })
          .eq("id", r.id);
      }
    }
    refreshAll();
    return { ok: "Saved." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function regenerateInvite(): Promise<FormState> {
  try {
    await adminOrError();
    await adminDb().from("settings").update({ invite_code: randomBytes(6).toString("hex") }).eq("id", 1);
    revalidatePath("/admin");
    return { ok: "New invite link made. The old one stops working." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function setRole(userId: string, role: Role): Promise<FormState> {
  try {
    const viewer = await adminOrError();
    if (userId === viewer.id && role !== "admin") {
      const { count } = await adminDb().from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count ?? 0) <= 1) return { error: "You're the only admin. Make someone else admin first." };
    }
    await adminDb().from("profiles").update({ role, ...(role === "pending" ? { auto_join: false } : {}) }).eq("id", userId);
    revalidatePath("/admin");
    return { ok: "Updated." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
