/** Small cheese and pepperoni flourishes used across the app. All CSS-animated, all decorative. */

/** A strip of melted cheese with drips that slowly stretch. Drawn at a fixed scale and cropped, so drips never smear on wide screens. */
const DRIPS = Array.from({ length: 30 }, (_, i) => {
  const x = 18 + i * 48 + ((i * 37) % 17);
  const w = 3 + ((i * 13) % 4);
  const h = 6 + ((i * 29) % 9);
  return { x, w, h, delay: -((i * 0.53) % 3.6) };
});

export function CheeseDrip({ className = "" }: { className?: string }) {
  return (
    <svg className={`cheese-drip ${className}`} viewBox="0 0 1440 18" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
      <path d="M0 0H1440V4Q1260 7 1080 4.5T720 5T360 4T0 5Z" fill="#ffc23d" />
      {DRIPS.map((d, i) => (
        <path
          key={i}
          className="drip"
          style={{ animationDelay: `${d.delay}s` }}
          d={`M${d.x - d.w} 4C${d.x - d.w} ${4 + d.h * 0.6} ${d.x - d.w * 0.9} ${4 + d.h} ${d.x} ${4 + d.h}S${d.x + d.w} ${4 + d.h * 0.6} ${d.x + d.w} 4Z`}
          fill="#ffc23d"
        />
      ))}
    </svg>
  );
}

/** A tiny bobbing pepperoni, for headings and chips. */
export function Pep({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`pep-bob inline-block shrink-0 ${className}`} width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      <circle r="9.5" fill="#a8291a" />
      <circle r="7.6" fill="#c23a24" />
      <circle cx="-3" cy="-2.4" r="1.5" fill="#7e1d12" />
      <circle cx="3.2" cy="2.4" r="1.2" fill="#7e1d12" />
      <circle cx="-1" cy="4" r="0.9" fill="#7e1d12" />
    </svg>
  );
}

/** Two slices pulling apart with stretchy cheese: the loading state. */
export function CheesePull({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid justify-items-center gap-2 py-6" role="status" aria-label={label}>
      <svg className="cheese-pull" width="120" height="56" viewBox="0 0 120 56" aria-hidden="true">
        <g className="pull-left">
          <path d="M8 50L48 10L50 50Z" fill="#ffc23d" stroke="#e3a05c" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="36" cy="34" r="4" fill="#c23a24" />
        </g>
        <g className="pull-strings" stroke="#ffd36b" strokeWidth="2.5" strokeLinecap="round" fill="none">
          <path d="M50 22Q60 28 70 22" />
          <path d="M50 32Q60 40 70 32" />
          <path d="M50 42Q60 47 70 42" />
        </g>
        <g className="pull-right">
          <path d="M112 50L72 10L70 50Z" fill="#ffc23d" stroke="#e3a05c" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="84" cy="36" r="4" fill="#c23a24" />
        </g>
      </svg>
      <span className="text-sm text-dough">{label}…</span>
    </div>
  );
}
