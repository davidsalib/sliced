const PALETTE = ["#4f8cff", "#2fbf8f", "#a36bff", "#ff8a3d", "#ff5fa2", "#22b8cf", "#9bc53d", "#f25f5c", "#6c7bff", "#e0a100", "#14a3a3", "#d65db1"];

/** A stable color per person, used for their slice and avatar fallback. */
export function personColor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Colors by seat around the pizza, so neighbouring slices never match. */
export function seatColor(index: number) {
  return PALETTE[index % PALETTE.length];
}
