import type { Profile } from "@/lib/types";

export function displayName(p: Pick<Profile, "full_name" | "email"> | null | undefined) {
  if (!p) return "Someone";
  return p.full_name?.trim() || p.email.split("@")[0] || "Someone";
}
