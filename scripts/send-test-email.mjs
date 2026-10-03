// Sends one test email through Resend using the key in .env.local.
// Usage: npm run email:test -- you@example.com
import { Resend } from "resend";

const key = process.env.RESEND_API_KEY?.trim();
const to = process.argv[2];

if (!key || /^re_x+$/i.test(key)) {
  console.error("Add your Resend API key to .env.local first:  RESEND_API_KEY=re_...");
  process.exit(1);
}
if (!to || !to.includes("@")) {
  console.error("Say who to send it to:  npm run email:test -- you@example.com");
  process.exit(1);
}

const from = process.env.EMAIL_FROM?.trim() || "Pizza Service <onboarding@resend.dev>";
const { data, error } = await new Resend(key).emails.send({
  from,
  to,
  subject: "🍕 Pizza Service test email",
  html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;color:#1f130d">
    <p style="font-size:40px;margin:0">🍕</p>
    <h1 style="font-size:22px">Resend is connected</h1>
    <p>Weekly messages, prayer requests and pizza receipts will come from <b>${from.replace(/</g, "&lt;")}</b>.</p>
    <p style="color:#c93a22;font-weight:700">Thank You, God Bless your Service</p>
  </div>`,
});

if (error) {
  console.error(`Resend said no: ${error.message}`);
  if (/testing emails|own email|verify a domain/i.test(error.message)) {
    console.error("With onboarding@resend.dev you can only send to your own Resend account email. Verify a domain to email others.");
  }
  process.exit(1);
}
console.log(`Sent to ${to} from ${from} (id ${data?.id}). Check your inbox.`);
