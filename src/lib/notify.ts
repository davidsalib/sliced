import "server-only";
import { displayName } from "@/lib/auth";
import { APP_NAME, THANK_YOU } from "@/lib/brand";
import { escapeHtml as esc, layout, link, sendMail } from "@/lib/email";
import { money } from "@/lib/split";
import { formatWhen } from "@/lib/time";
import { formatWeekOf, neighborName, QUESTION_LABEL } from "@/lib/neighbors";
import type { Answer, Neighbor, Participant, Prayer, Profile, QuestionKind, Settings, SpendRequest, WeeklyPost } from "@/lib/types";

export async function notifyNewRequest(opts: {
  request: SpendRequest;
  payer: Profile;
  members: Profile[];
  subscriberIds: Set<string>;
  settings: Settings;
}) {
  const { request, payer, members, subscriberIds, settings } = opts;
  const when = formatWhen(request.slice_at, settings.timezone);
  const amount = money(request.amount_cents);
  const who = esc(displayName(payer));
  const payerMail = {
    to: payer.email,
    subject: `🍕 ${THANK_YOU}`,
    html: layout({
      heading: THANK_YOU,
      lines: [
        `Thanks for picking up <b>${amount}</b> of pizza for this week&#39;s service.`,
        `We let the crew know. Everyone chipping in is charged <b>${when}</b>, and their shares go straight to your bank.`,
      ],
      cta: { label: "Watch the pizza get sliced", url: link(`/r/${request.id}`) },
    }),
    text: `${THANK_YOU}. Thanks for picking up ${amount} of pizza. The crew is charged ${when}. ${link(`/r/${request.id}`)}`,
  };
  await sendMail([
    payerMail,
    ...members
      .filter((m) => m.id !== payer.id)
      .map((m) => {
        const subscribed = subscriberIds.has(m.id);
        const lines = [
          `<b>${who}</b> picked up this week&#39;s service pizza for <b>${amount}</b>${request.note ? `: ${esc(request.note)}` : ""}.`,
          `${THANK_YOU}, ${who}!`,
          `The pizza gets sliced <b>${when}</b>. That's when cards are charged and everyone's share is set.`,
          subscribed
            ? "You're subscribed, so you're already chipping in. Nothing to do unless you're skipping this one."
            : "Chipping in this week? Join before then.",
        ];
        return {
          to: m.email,
          subject: `🍕 ${displayName(payer)} picked up ${amount} of service pizza`,
          html: layout({ heading: `New ${APP_NAME} spend request`, lines, cta: { label: subscribed ? "See the split" : "I'm chipping in", url: link(`/r/${request.id}`) } }),
          text: `${displayName(payer)} picked up ${amount} of service pizza. Sliced ${when}. ${subscribed ? "You're chipping in automatically." : "Chip in: "} ${link(`/r/${request.id}`)}`,
        };
      }),
  ]);
}

export async function notifySliced(opts: {
  request: SpendRequest;
  payer: Profile;
  participants: Participant[];
  profiles: Map<string, Profile>;
  transferTotal: number;
}) {
  const { request, payer, participants, profiles, transferTotal } = opts;
  const url = link(`/r/${request.id}`);
  const eaters = participants.length;
  const mails = participants
    .filter((p) => p.kind !== "payer")
    .map((p) => {
      const person = profiles.get(p.user_id);
      const failed = p.status === "failed";
      return {
        to: person?.email ?? "",
        subject: failed ? "🍕 Your pizza payment needs a hand" : `🍕 ${THANK_YOU}: you chipped in ${money(p.charge_cents ?? 0)}`,
        html: layout({
          heading: failed ? "We couldn't charge your card" : THANK_YOU,
          lines: failed
            ? [`Your share of ${esc(displayName(payer))}'s pizza is <b>${money(p.charge_cents ?? 0)}</b>.`, `Stripe said: ${esc(p.failure ?? "the charge didn't go through")}.`, "Tap below to pay with another card."]
            : [`${eaters} people chipped in on <b>${money(request.amount_cents)}</b>.`, `Your card was charged <b>${money(p.charge_cents ?? 0)}</b>, sent to ${esc(displayName(payer))}.`, "Thanks for chipping in."],
          cta: { label: failed ? "Pay my share" : "See the split", url },
        }),
        text: failed ? `We couldn't charge your card for pizza. Pay here: ${url}` : `Sliced! You paid ${money(p.charge_cents ?? 0)}. ${url}`,
      };
    });
  mails.push({
    to: payer.email,
    subject: `🍕 ${THANK_YOU}: ${money(transferTotal)} is on its way to you`,
    html: layout({
      heading: THANK_YOU,
      lines: [
        `${eaters} ${eaters === 1 ? "person" : "people"} chipped in on your <b>${money(request.amount_cents)}</b> service pizza.`,
        `<b>${money(transferTotal)}</b> is heading to your bank through Stripe. Payouts usually land in 2 business days.`,
        ...(participants.some((p) => p.status === "failed") ? ["A card or two didn't go through. We've emailed them a link to pay."] : []),
      ],
      cta: { label: "See who paid", url },
    }),
    text: `${money(transferTotal)} is on its way to your bank. ${url}`,
  });
  await sendMail(mails);
}

export async function notifyPayerNeedsBank(payer: Profile, request: SpendRequest) {
  await sendMail([
    {
      to: payer.email,
      subject: "🍕 Reconnect your bank to get paid back",
      html: layout({
        heading: "We paused your split",
        lines: [`Your ${money(request.amount_cents)} pizza is ready to slice, but Stripe says your bank account can't receive payouts right now.`, "Finish your Stripe setup and we'll try again tomorrow."],
        cta: { label: "Fix my payouts", url: link("/wallet") },
      }),
      text: `Reconnect your bank to get paid back: ${link("/wallet")}`,
    },
  ]);
}

// ---------------------------------------------------------------------------
// The weekly message
// ---------------------------------------------------------------------------

const h2 = (t: string) => `<h2 style="margin:28px 0 8px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#c93a22">${t}</h2>`;
const para = (t: string) =>
  `<p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#3b2a20">${esc(t).replace(/\n{2,}/g, "</p><p style=\"margin:0 0 12px;font-size:16px;line-height:1.6;color:#3b2a20\">").replace(/\n/g, "<br>")}</p>`;
const card = (inner: string) => `<div style="margin:0 0 12px;padding:16px;border-radius:14px;background:#fff4e2">${inner}</div>`;

export async function notifyWeekly(opts: {
  post: WeeklyPost;
  isUpdate: boolean;
  members: Profile[];
  previous: { post: WeeklyPost; answers: Answer[] } | null;
  prayers: Prayer[];
  neighbors: Map<string, Neighbor>;
}) {
  const { post, isUpdate, members, previous, prayers, neighbors } = opts;
  const week = formatWeekOf(post.week_of);
  const url = link("/");
  const answerLink = (q: QuestionKind) => link(`/?answer=${q}#${q}`);

  let html = "";
  if (post.title) html += `<p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#1f130d">${esc(post.title)}</p>`;
  html += h2(`The Gospel · ${esc(post.gospel_reference)}`) + para(post.gospel_text);
  html += h2("A message to share") + para(post.message);
  for (const q of ["hope", "friendship"] as const) {
    const text = q === "hope" ? post.hope_question : post.friendship_question;
    html += card(
      `<p style="margin:0 0 6px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#9a8270">${QUESTION_LABEL[q]}</p>` +
        `<p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#1f130d">${esc(text)}</p>` +
        `<a href="${answerLink(q)}" style="color:#c93a22;font-weight:700;text-decoration:none">Write down an answer →</a>`,
    );
  }

  if (previous && previous.answers.length) {
    html += h2(`What our neighbors shared last week (${esc(formatWeekOf(previous.post.week_of))})`);
    for (const q of ["hope", "friendship"] as const) {
      const list = previous.answers.filter((a) => a.question === q);
      if (!list.length) continue;
      const qText = q === "hope" ? previous.post.hope_question : previous.post.friendship_question;
      html += `<p style="margin:12px 0 6px;font-size:15px;font-weight:700;color:#1f130d">${esc(qText)}</p>`;
      html += list
        .map((a) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#3b2a20"><b>${esc(a.neighbor_id ? neighborName(neighbors.get(a.neighbor_id)) : "A neighbor")}:</b> ${esc(a.answer)}</p>`)
        .join("");
    }
  }

  if (prayers.length) {
    html += h2("Prayer requests from last week");
    html += prayers
      .map((p) => {
        const who = p.anonymous || !p.neighbor_id ? "Anonymous" : neighborName(neighbors.get(p.neighbor_id));
        return `<p style="margin:0 0 8px;font-size:15px;line-height:1.5;color:#3b2a20">🙏 <b>${esc(who)}:</b> ${esc(p.request)}</p>`;
      })
      .join("");
  }

  const subject = `${isUpdate ? "Updated: " : ""}This week's message · ${post.gospel_reference}`;
  await sendMail(
    members.map((m) => ({
      to: m.email,
      subject: `✝️ ${subject}`,
      html: layout({ heading: `${isUpdate ? "Updated: " : ""}This week of service · ${week}`, html, cta: { label: `Open ${APP_NAME}`, url } }),
      text: `${subject}\n\n${post.gospel_reference}\n\n${post.message}\n\n${QUESTION_LABEL.hope}: ${post.hope_question}\n${QUESTION_LABEL.friendship}: ${post.friendship_question}\n\n${url}`,
    })),
  );
}
