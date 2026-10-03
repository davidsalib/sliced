type Parts = { y: number; m: number; d: number; h: number; mi: number; s: number };

function zonedParts(date: Date, timeZone: string): Parts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

/** Milliseconds the zone is ahead of UTC at this instant. */
function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The UTC instant of a wall-clock time in a zone (handles DST shifts). */
export function zonedTimeToUtc(y: number, m: number, d: number, h: number, mi: number, timeZone: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const first = offsetMs(new Date(guess), timeZone);
  let t = guess - first;
  const second = offsetMs(new Date(t), timeZone);
  if (second !== first) t = guess - second;
  return new Date(t);
}

/**
 * When a split created `now` gets sliced: `days` calendar days later at `chargeTime`
 * in the crew's time zone. Never sooner than 15 minutes from now.
 */
export function computeSliceAt(now: Date, days: number, chargeTime: string, timeZone: string): Date {
  const today = zonedParts(now, timeZone);
  const [h, mi] = chargeTime.split(":").map(Number);
  for (let extra = 0; extra < 3; extra++) {
    const day = new Date(Date.UTC(today.y, today.m - 1, today.d + days + extra));
    const at = zonedTimeToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), h, mi, timeZone);
    if (at.getTime() > now.getTime() + 15 * 60_000) return at;
  }
  return new Date(now.getTime() + 24 * 3600_000);
}

export function formatWhen(iso: string | Date, timeZone: string, withTime = true) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(iso));
}

export function formatChargeTime(chargeTime: string) {
  const [h, mi] = chargeTime.split(":").map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, mi));
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(d);
}

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
