// Writes the running local Supabase's URL and keys to .env.development.local.
// Next.js reads that file only in development, ahead of .env.local, so your hosted
// keys in .env.local are untouched and still used for production builds.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const raw = execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const status = Object.fromEntries(
  raw
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const pick = (...names) => names.map((n) => status[n]).find(Boolean);

const file = ".env.development.local";
const existing = existsSync(file) ? readFileSync(file, "utf8") : "";
const keep = (k) => existing.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1];

const values = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: pick("API_URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: pick("PUBLISHABLE_KEY", "ANON_KEY"),
  SUPABASE_SECRET_KEY: pick("SECRET_KEY", "SERVICE_ROLE_KEY"),
  // Local-only password for the dev sign-in buttons (admin / member / waiting).
  DEV_LOGIN_PASSWORD: keep("DEV_LOGIN_PASSWORD") || randomBytes(18).toString("base64url"),
  CRON_SECRET: keep("CRON_SECRET") || randomBytes(24).toString("base64url"),
};
const missing = Object.entries(values).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`Couldn't read ${missing.join(", ")} from \`supabase status\`. Is local Supabase running?`);
  process.exit(1);
}

writeFileSync(
  file,
  `# Written by scripts/sync-local-env.mjs for local development. Safe to delete; it's recreated.\n` +
    Object.entries(values).map(([k, v]) => `${k}=${v}`).join("\n") +
    "\n",
);
console.log(`Local Supabase keys written to ${file}`);
