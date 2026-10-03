import type { Neighbor } from "@/lib/types";

const cap = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);

/** "maria g" -> { first: "Maria", last: "G" }; "  ana  maria lopez " -> { first: "Ana", last: "Maria Lopez" }. */
export function parseName(raw: string): { first: string; last: string | null } | null {
  const parts = raw.trim().replace(/\s+/g, " ").replace(/\.$/, "").split(" ").filter(Boolean);
  if (!parts.length) return null;
  const first = cap(parts[0]).slice(0, 40);
  const rest = parts.slice(1).map((p) => cap(p.replace(/\.$/, ""))).join(" ").slice(0, 40);
  return { first, last: rest || null };
}

/** Last initials get a period: "Maria G." */
export function neighborName(n: Pick<Neighbor, "first_name" | "last_name"> | null | undefined) {
  if (!n) return "Someone";
  if (!n.last_name) return n.first_name;
  return n.last_name.length === 1 ? `${n.first_name} ${n.last_name}.` : `${n.first_name} ${n.last_name}`;
}

export const QUESTION_LABEL = { hope: "Question of hope", friendship: "Question of friendship and knowing" } as const;

/** "2026-10-04" -> "October 4, 2026" (no time zone drift). */
export function formatWeekOf(weekOf: string, opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }) {
  const [y, m, d] = weekOf.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(new Date(Date.UTC(y, m - 1, d)));
}
