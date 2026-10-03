const spots = [
  { left: "6%", top: "12%", size: 46, delay: "0s", rot: -20 },
  { left: "82%", top: "8%", size: 38, delay: "1.2s", rot: 25 },
  { left: "88%", top: "58%", size: 54, delay: "2.1s", rot: -35 },
  { left: "4%", top: "70%", size: 40, delay: "0.6s", rot: 40 },
  { left: "48%", top: "88%", size: 30, delay: "3s", rot: 10 },
];

/** Little slices bobbing around the edges of the landing page. */
export function FloatingSlices() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {spots.map((s, i) => (
        <div key={i} className="absolute animate-float opacity-60" style={{ left: s.left, top: s.top, animationDelay: s.delay }}>
          <svg width={s.size} height={s.size} viewBox="-13 -13 26 26" style={{ transform: `rotate(${s.rot}deg)` }}>
            <path d="M0 12 L-10 -9 Q0 -14 10 -9 Z" fill="#ffc23d" stroke="#e3a05c" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="-2" cy="-3" r="2.6" fill="#c23a24" />
            <circle cx="3" cy="3" r="2.2" fill="#c23a24" />
          </svg>
        </div>
      ))}
    </div>
  );
}
