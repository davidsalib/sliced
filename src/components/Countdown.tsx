"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** "2d 4h 10m" until the pizza gets sliced. */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);

  if (now === null) return <span className={className}>&nbsp;</span>;
  const left = target - now;
  if (left <= 0) return <span className={className}>Slicing now…</span>;
  const { d, h, m, s } = parts(left);
  const text = d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, "0")}s`;
  return (
    <span className={`tabular ${className ?? ""}`} suppressHydrationWarning>
      {text}
    </span>
  );
}
