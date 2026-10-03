"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useMemo, useState } from "react";

export type PizzaSlice = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  color: string;
  status?: "in" | "charging" | "paid" | "failed" | "covered";
};

type Props = {
  slices: PizzaSlice[];
  seed: string;
  /** "open": steamy and waiting for eaters. "sliced": slices burst apart. */
  state?: "open" | "sliced" | "canceled";
  toppings?: number;
  className?: string;
  label?: string;
  showSteam?: boolean;
};

const R_CRUST = 118;
const R_SAUCE = 106;
const TAU = Math.PI * 2;

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

function cheesePath(rand: () => number) {
  const n = 30;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const r = 97 + (rand() - 0.5) * 7;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  const mid = (i: number) => {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    return [(x1 + x2) / 2, (y1 + y2) / 2];
  };
  let d = `M${r2(mid(n - 1)[0])} ${r2(mid(n - 1)[1])}`;
  for (let i = 0; i < n; i++) {
    const [cx, cy] = pts[i];
    const [mx, my] = mid(i);
    d += `Q${r2(cx)} ${r2(cy)} ${r2(mx)} ${r2(my)}`;
  }
  return d + "Z";
}

function layoutToppings(rand: () => number, count: number) {
  const peps: { x: number; y: number; r: number }[] = [];
  let guard = 0;
  while (peps.length < count && guard++ < 900) {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * 82;
    const p = { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 10 + rand() * 3 };
    if (peps.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > q.r + p.r + 4)) peps.push(p);
  }
  const basil = Array.from({ length: 5 }, () => {
    const a = rand() * TAU;
    const d = 20 + rand() * 66;
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, rot: rand() * 180 };
  });
  const bubbles = Array.from({ length: 9 }, () => {
    const a = rand() * TAU;
    const d = Math.sqrt(rand()) * 86;
    return { x: r2(Math.cos(a) * d), y: r2(Math.sin(a) * d), r: r2(2.5 + rand() * 3.5), delay: r2(-rand() * 3.2) };
  });
  return { peps, basil, bubbles };
}

function wedgePath(a0: number, a1: number, r: number) {
  // Two arcs so even a full circle (one eater) draws cleanly.
  const am = (a0 + a1) / 2;
  const p = (a: number) => `${r2(Math.cos(a) * r)} ${r2(Math.sin(a) * r)}`;
  return `M0 0L${p(a0)}A${r} ${r} 0 0 1 ${p(am)}A${r} ${r} 0 0 1 ${p(a1)}Z`;
}

/** The pie itself: crust, sauce, melted cheese, toppings. Pure art, drawn once per wedge when exploding. */
function PieArt({ uid, cheese, toppings, animateIn, bubbling }: { uid: string; cheese: string; toppings: ReturnType<typeof layoutToppings>; animateIn: boolean; bubbling?: boolean }) {
  return (
    <>
      <circle r={R_CRUST} fill={`url(#${uid}-crust)`} />
      <circle r={R_CRUST - 5} fill="none" stroke="#f5c48a" strokeOpacity={0.35} strokeWidth={2} strokeDasharray="2 9" />
      <circle r={R_SAUCE} fill="#d63a1f" />
      <path d={cheese} fill={`url(#${uid}-cheese)`} />
      {bubbling &&
        toppings.bubbles.map((b, i) => (
          <circle key={`c${i}`} className="cheese-bubble" cx={b.x} cy={b.y} r={b.r} fill="#fff1c2" style={{ animationDelay: `${b.delay}s` }} />
        ))}
      {toppings.basil.map((b, i) => (
        <motion.ellipse
          key={`b${i}`}
          cx={b.x}
          cy={b.y}
          rx={8}
          ry={3.6}
          fill="#3d9b5c"
          transform={`rotate(${b.rot} ${b.x} ${b.y})`}
          initial={animateIn ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 + i * 0.05 }}
        />
      ))}
      {toppings.peps.map((p, i) => (
        <motion.g
          key={`p${i}`}
          initial={animateIn ? { scale: 0, y: -40, opacity: 0 } : false}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 14, delay: 0.15 + i * 0.035 }}
        >
          <circle cx={p.x} cy={p.y} r={p.r} fill="#a8291a" />
          <circle cx={p.x} cy={p.y} r={p.r - 2.2} fill="#c23a24" />
          <circle cx={p.x - p.r * 0.3} cy={p.y - p.r * 0.25} r={1.6} fill="#7e1d12" />
          <circle cx={p.x + p.r * 0.35} cy={p.y + p.r * 0.2} r={1.3} fill="#7e1d12" />
        </motion.g>
      ))}
    </>
  );
}

function Cutter() {
  return (
    <g>
      <rect x={-4} y={-58} width={8} height={40} rx={4} fill="#5b4033" />
      <rect x={-2.5} y={-22} width={5} height={10} fill="#9aa3ad" />
      <motion.g initial={{ rotate: 0 }} animate={{ rotate: 540 }} transition={{ duration: 0.9, ease: "easeInOut" }}>
        <circle r={15} fill="#dfe5ea" stroke="#9aa3ad" strokeWidth={2} />
        <path d="M-11 0H11M0 -11V11" stroke="#9aa3ad" strokeWidth={2} />
        <circle r={4} fill="#9aa3ad" />
      </motion.g>
    </g>
  );
}

export function Pizza({ slices, seed, state = "open", toppings = 14, className, label, showSteam = true }: Props) {
  const uid = useId().replace(/[:«»]/g, "");
  const reduce = useReducedMotion() ?? false;
  const art = useMemo(() => {
    const rand = rng(seed);
    return { cheese: cheesePath(rand), toppings: layoutToppings(rand, toppings) };
  }, [seed, toppings]);

  const n = slices.length;
  // Each time the crew grows, bump a key so the cutter rolls down the newest cut.
  const [prevN, setPrevN] = useState(n);
  const [cuts, setCuts] = useState(0);
  if (n !== prevN) {
    setPrevN(n);
    if (n > prevN) setCuts((c) => c + 1);
  }

  const step = n ? 360 / n : 360;
  const badgeR = n <= 1 ? 0 : n === 2 ? 56 : n <= 8 ? 68 : 78;
  const badgeSize = n <= 1 ? 30 : Math.max(11, Math.min(24, 30 - n * 1.3));
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, stiffness: 260, damping: 22 };
  const exploded = state === "sliced" && n > 1;

  return (
    <motion.svg
      viewBox="-140 -150 280 290"
      className={className}
      role="img"
      aria-label={label ?? `Pizza cut into ${n} ${n === 1 ? "slice" : "slices"}`}
      initial={reduce ? false : { scale: 0.7, rotate: -50, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: state === "canceled" ? 0.45 : 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 16 }}
    >
      <defs>
        <radialGradient id={`${uid}-crust`}>
          <stop offset="78%" stopColor="#f0b26a" />
          <stop offset="92%" stopColor="#d98f45" />
          <stop offset="100%" stopColor="#a8622a" />
        </radialGradient>
        <radialGradient id={`${uid}-cheese`} cx="45%" cy="40%">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="70%" stopColor="#ffc23d" />
          <stop offset="100%" stopColor="#f2a524" />
        </radialGradient>
        <clipPath id={`${uid}-avatar`} clipPathUnits="objectBoundingBox">
          <circle cx={0.5} cy={0.5} r={0.5} />
        </clipPath>
        {exploded &&
          slices.map((s, i) => (
            <clipPath key={s.id} id={`${uid}-w${i}`}>
              <path d={wedgePath(((i * step - 90) * Math.PI) / 180, (((i + 1) * step - 90) * Math.PI) / 180, R_CRUST + 2)} />
            </clipPath>
          ))}
        <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>

      {showSteam && state === "open" && !reduce && (
        <g opacity={0.5}>
          {[-34, 0, 34].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} -124 q 10 -10 0 -20 q -10 -10 0 -20`}
              fill="none"
              stroke="#fff3e3"
              strokeWidth={4}
              strokeLinecap="round"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: [0, 0.8, 0], y: [6, -8, -18] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
            />
          ))}
        </g>
      )}

      <g filter={`url(#${uid}-shadow)`}>
        {exploded ? (
          slices.map((s, i) => {
            const mid = (((i + 0.5) * step - 90) * Math.PI) / 180;
            return (
              <motion.g
                key={s.id}
                clipPath={`url(#${uid}-w${i})`}
                initial={{ x: 0, y: 0 }}
                animate={{ x: Math.cos(mid) * 12, y: Math.sin(mid) * 12 }}
                transition={{ type: "spring", stiffness: 180, damping: 9, delay: reduce ? 0 : 0.2 + i * 0.05 }}
              >
                <PieArt uid={uid} cheese={art.cheese} toppings={art.toppings} animateIn={false} />
              </motion.g>
            );
          })
        ) : (
          <PieArt uid={uid} cheese={art.cheese} toppings={art.toppings} animateIn={!reduce} bubbling={state === "open"} />
        )}
      </g>

      {/* Cuts: they spin into their new spots whenever the crew grows or shrinks. */}
      {!exploded && n > 1 && (
        <g>
          {Array.from({ length: n }, (_, i) => {
            const a = ((i * step - 90) * Math.PI) / 180;
            const x2 = r2(Math.cos(a) * (R_CRUST + 1));
            const y2 = r2(Math.sin(a) * (R_CRUST + 1));
            return (
              <motion.line
                key={i}
                x1={0}
                y1={0}
                stroke="#2a160d"
                strokeOpacity={0.8}
                strokeWidth={3.2}
                strokeLinecap="round"
                initial={reduce ? false : { x2: 0, y2: 0 }}
                animate={{ x2, y2 }}
                transition={spring}
              />
            );
          })}
        </g>
      )}

      {/* The cutter rolls down the newest cut when someone joins. */}
      {cuts > 0 && !reduce && state === "open" && n > 1 && (
        <g key={cuts} transform={`rotate(${(n - 1) * step})`}>
          <motion.g
            initial={{ y: -R_CRUST - 12, opacity: 1 }}
            animate={{ y: 0, opacity: [1, 1, 0] }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          >
            <Cutter />
          </motion.g>
        </g>
      )}

      {/* Who's eating each slice */}
      <AnimatePresence>
        {slices.map((s, i) => {
          const mid = (((i + 0.5) * step - 90) * Math.PI) / 180;
          const push = exploded ? 12 : 0;
          const x = Math.cos(mid) * (badgeR + push);
          const y = Math.sin(mid) * (badgeR + push);
          const ring = s.status === "paid" || s.status === "covered" ? "#5cc983" : s.status === "failed" ? "#ff5b3d" : "#fff3e3";
          const size = badgeSize;
          return (
            <motion.g
              key={s.id}
              initial={reduce ? false : { x, y, scale: 0 }}
              animate={{ x, y, scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 18 }}
            >
              <circle r={size + 3} fill={ring} />
              <circle r={size} fill={s.color} />
              {s.avatarUrl ? (
                <image
                  href={s.avatarUrl}
                  x={-size}
                  y={-size}
                  width={size * 2}
                  height={size * 2}
                  clipPath={`url(#${uid}-avatar)`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fff"
                  fontWeight={800}
                  fontSize={size * 0.95}
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {(s.name.trim()[0] ?? "?").toUpperCase()}
                </text>
              )}
              <title>{s.name}</title>
            </motion.g>
          );
        })}
      </AnimatePresence>
    </motion.svg>
  );
}
