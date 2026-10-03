import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";
import { APP_NAME } from "@/lib/brand";

type Mail = { to: string; subject: string; html: string; text: string };

let resend: Resend | null = null;
function client() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const from = () => process.env.EMAIL_FROM ?? `${APP_NAME} <onboarding@resend.dev>`;

/** Sends in batches of 100. Without RESEND_API_KEY it logs instead, so local dev works. */
export async function sendMail(mails: Mail[]) {
  const list = mails.filter((m) => m.to);
  if (!list.length) return;
  const r = client();
  if (!r) {
    for (const m of list) console.info(`[email skipped: no RESEND_API_KEY] to=${m.to} subject="${m.subject}"`);
    return;
  }
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100).map((m) => ({ from: from(), ...m }));
    const { error } = await r.batch.send(chunk);
    if (error) console.error("Resend batch failed", error);
  }
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Small, inline-styled layout that renders in every mail client. */
/** `lines` are short paragraphs; `html` is pre-escaped block markup for richer emails like the weekly message. */
export function layout(opts: { heading: string; lines?: string[]; html?: string; cta?: { label: string; url: string } }) {
  const lines = (opts.lines ?? []).map((l) => `<p style="margin:0 0 12px;font-size:16px;line-height:1.5;color:#3b2a20">${l}</p>`).join("");
  const cta = opts.cta
    ? `<a href="${opts.cta.url}" style="display:inline-block;margin-top:8px;background:#e8452c;color:#fff7ec;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px;font-size:16px">${esc(opts.cta.label)}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#fff4e2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff4e2;padding:32px 16px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;padding:28px">
      <tr><td>
        <div style="font-size:40px;line-height:1">🍕</div>
        <h1 style="margin:12px 0 16px;font-size:24px;line-height:1.2;color:#1f130d">${esc(opts.heading)}</h1>
        ${lines}${opts.html ?? ""}${cta}
        <p style="margin:24px 0 0;font-size:12px;color:#9a8270">Sent by ${APP_NAME} for your community service crew. Baked in San Francisco.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export const link = (path: string) => `${env.siteUrl()}${path}`;
export { esc as escapeHtml };
