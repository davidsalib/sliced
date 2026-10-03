"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

type Burst = { id: number; x: number; y: number; bits: { dx: number; dy: number; rot: number; kind: number; delay: number }[] };

function SliceBit({ kind }: { kind: number }) {
  if (kind === 0)
    return (
      <svg width="26" height="26" viewBox="-13 -13 26 26" aria-hidden>
        <path d="M0 12 L-10 -9 Q0 -14 10 -9 Z" fill="#ffc23d" stroke="#e3a05c" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="-2" cy="-3" r="2.6" fill="#c23a24" />
        <circle cx="3" cy="3" r="2.2" fill="#c23a24" />
      </svg>
    );
  if (kind === 1)
    return (
      <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden>
        <circle r="7" fill="#c23a24" />
      </svg>
    );
  return (
    <svg width="14" height="8" viewBox="-7 -4 14 8" aria-hidden>
      <ellipse rx="7" ry="3.5" fill="#5cc983" />
    </svg>
  );
}

/** Pizza-slice confetti. `fire(event)` bursts from the click point. */
export function useConfetti() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  const fire = useCallback((at?: { clientX: number; clientY: number }) => {
    if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const x = at?.clientX ?? window.innerWidth / 2;
    const y = at?.clientY ?? window.innerHeight / 2;
    const bits = Array.from({ length: 22 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 22 + Math.random() * 0.4;
      const v = 90 + Math.random() * 140;
      return { dx: Math.cos(a) * v, dy: Math.sin(a) * v - 80, rot: (Math.random() - 0.5) * 720, kind: i % 5 === 0 ? 2 : i % 2, delay: Math.random() * 0.08 };
    });
    const id = Date.now() + Math.random();
    setBursts((b) => [...b, { id, x, y, bits }]);
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1600);
  }, []);

  const node = (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {bursts.map((b) =>
          b.bits.map((bit, i) => (
            <motion.div
              key={`${b.id}-${i}`}
              className="absolute"
              style={{ left: b.x, top: b.y }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
              animate={{ x: bit.dx, y: [0, bit.dy, bit.dy + 260], rotate: bit.rot, opacity: [1, 1, 0], scale: 1 }}
              transition={{ duration: 1.4, ease: "easeOut", delay: bit.delay }}
            >
              <SliceBit kind={bit.kind} />
            </motion.div>
          )),
        )}
      </AnimatePresence>
    </div>
  );

  return { fire, node };
}
