import "server-only";

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Dev sign-in buttons only exist when ALL of these hold: `next dev`, the request
 * is to localhost, and Supabase itself is the local Docker stack. They can never
 * touch a hosted project.
 */
export function devToolsEnabled(host: string | null | undefined) {
  if (process.env.NODE_ENV !== "development") return false;
  if (!host || !LOCAL_HOST.test(host)) return false;
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

export const DEV_USERS = {
  admin: { email: "admin@pizza.local", name: "Dev Admin", role: "admin" },
  member: { email: "member@pizza.local", name: "Dev Member", role: "member" },
  waiting: { email: "waiting@pizza.local", name: "Dev Visitor", role: "pending" },
} as const;

export type DevUserKind = keyof typeof DEV_USERS;
