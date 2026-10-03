/**
 * The ambient layer behind every screen: a quiet San Francisco skyline, Karl the Fog
 * rolling through, and a few pepperoni and cheese bits drifting around. Pure SVG + CSS.
 */

const r = (n: number) => Math.round(n * 10) / 10;

/** Points along a quadratic curve, for the Golden Gate's suspender cables. */
function quad(p0: [number, number], c: [number, number], p1: [number, number], steps: number) {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t ** 2 * p1[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t ** 2 * p1[1];
    return [r(x), r(y)] as const;
  });
}

function GoldenGate() {
  const deck = 196;
  const spans: [[number, number], [number, number], [number, number]][] = [
    [[30, 188], [95, 120], [150, 64]],
    [[150, 64], [272, 222], [394, 64]],
    [[394, 64], [450, 120], [514, 188]],
  ];
  const suspenders = spans.flatMap(([a, c, b]) => quad(a, c, b, 14).filter(([, y]) => y < deck - 4));
  return (
    <g className="sf-bridge">
      <path d={`M10 ${deck}H540`} strokeWidth="5" />
      {spans.map(([a, c, b], i) => (
        <path key={i} d={`M${a[0]} ${a[1]}Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`} fill="none" strokeWidth="2.4" />
      ))}
      {suspenders.map(([x, y], i) => (
        <path key={i} d={`M${x} ${y}V${deck}`} strokeWidth="0.9" />
      ))}
      {[150, 394].map((x) => (
        <g key={x}>
          <path d={`M${x - 7} 58V214M${x + 7} 58V214`} strokeWidth="5" />
          <path d={`M${x - 7} 72H${x + 7}M${x - 7} 104H${x + 7}M${x - 7} 140H${x + 7}M${x - 7} 176H${x + 7}`} strokeWidth="3.5" />
        </g>
      ))}
    </g>
  );
}

function Downtown() {
  // A handful of towers, with the Transamerica Pyramid and Salesforce Tower picking out the skyline.
  const boxes = [
    [700, 150, 30], [734, 128, 26], [764, 162, 24], [846, 120, 30], [912, 140, 28], [944, 104, 22], [970, 156, 30],
  ];
  return (
    <g className="sf-far">
      {boxes.map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={230 - y} />
      ))}
      {/* Transamerica Pyramid */}
      <path d="M800 230L812 38L824 230Z" />
      <path d="M803 150h-6v80h6zM821 150h6v80h-6z" />
      {/* Salesforce Tower */}
      <path d="M876 230V58Q889 26 902 58V230Z" />
      {/* Coit Tower on Telegraph Hill */}
      <path d="M600 230Q640 176 690 230Z" />
      <rect x="638" y="150" width="9" height="40" />
      <rect x="636" y="146" width="13" height="5" />
    </g>
  );
}

function Sutro() {
  return (
    <g className="sf-far">
      <path d="M1240 232Q1330 150 1440 222V240H1240Z" />
      <g className="sf-line" fill="none">
        <path d="M1318 176L1330 40M1342 176L1330 40M1330 178V40" strokeWidth="3" />
        <path d="M1316 70H1344M1312 104H1348" strokeWidth="3" />
        <path d="M1330 40V22" strokeWidth="1.5" />
      </g>
    </g>
  );
}

function PaintedLadies() {
  // Alamo Square: Victorians stepping up the hill.
  return (
    <g className="sf-near">
      {Array.from({ length: 7 }, (_, i) => {
        const x = 1010 + i * 34;
        const base = 260;
        const top = 206 - i * 3;
        return (
          <g key={i}>
            <path d={`M${x} ${base}V${top}L${x + 16} ${top - 18}L${x + 32} ${top}V${base}Z`} />
            <rect className="sf-window" x={x + 8} y={top + 10} width="6" height="9" rx="1" />
            <rect className="sf-window" x={x + 18} y={top + 10} width="6" height="9" rx="1" />
          </g>
        );
      })}
    </g>
  );
}

const CABLE_HILL = "M520 262Q640 250 760 214T980 196";

function CableCar() {
  return (
    <g className="sf-near">
      <path d={`${CABLE_HILL}V262Z`} />
      <path className="sf-line" d={CABLE_HILL} fill="none" strokeWidth="1.2" strokeDasharray="3 5" />
      <g className="cable-car">
        <g transform="translate(-16 -20)">
          <rect className="cable-body" x="0" y="4" width="32" height="13" rx="2" />
          <rect className="cable-roof" x="-2" y="1" width="36" height="4" rx="1.5" />
          <path className="sf-window" d="M4 7h5v5H4zM11 7h5v5h-5zM18 7h5v5h-5zM25 7h4v5h-4z" />
          <circle className="cable-wheel" cx="8" cy="18" r="2" />
          <circle className="cable-wheel" cx="24" cy="18" r="2" />
        </g>
        <animateMotion dur="38s" repeatCount="indefinite" rotate="auto" path={CABLE_HILL} keyPoints="0;1;1;0;0" keyTimes="0;0.45;0.5;0.95;1" calcMode="linear" />
      </g>
    </g>
  );
}

function Skyline() {
  return (
    <>
      {/* Wide screens: the city laid out west to east. */}
      <svg className="sf-skyline sf-wide" viewBox="0 0 1440 262" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path className="sf-far" d="M0 240Q180 214 380 236T760 226T1140 232T1440 228V262H0Z" />
        <GoldenGate />
        <Downtown />
        <Sutro />
        <CableCar />
        <PaintedLadies />
        <path className="sf-ground" d="M0 252Q360 244 720 254T1440 250V262H0Z" />
      </svg>
      {/* Phones: the same landmarks pulled together so every one fits. */}
      <svg className="sf-skyline sf-compact" viewBox="0 0 820 262" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <path className="sf-far" d="M0 240Q160 216 340 236T820 228V262H0Z" />
        <g transform="translate(0 78) scale(0.6)">
          <GoldenGate />
        </g>
        <g transform="translate(-300 0)">
          <Downtown />
        </g>
        <g transform="translate(-640 0)">
          <Sutro />
        </g>
        <g transform="translate(-420 0)">
          <CableCar />
        </g>
        <g transform="translate(-470 0)">
          <PaintedLadies />
        </g>
        <path className="sf-ground" d="M0 252Q200 244 410 254T820 250V262H0Z" />
      </svg>
    </>
  );
}

const DRIFTERS: { kind: "pep" | "cheese" | "shred"; left: string; top: string; size: number; delay: string; dur: string }[] = [
  { kind: "pep", left: "4%", top: "18%", size: 22, delay: "0s", dur: "14s" },
  { kind: "cheese", left: "91%", top: "12%", size: 16, delay: "-3s", dur: "17s" },
  { kind: "shred", left: "78%", top: "38%", size: 26, delay: "-7s", dur: "19s" },
  { kind: "pep", left: "88%", top: "62%", size: 18, delay: "-2s", dur: "16s" },
  { kind: "cheese", left: "7%", top: "52%", size: 14, delay: "-9s", dur: "13s" },
  { kind: "shred", left: "14%", top: "80%", size: 22, delay: "-5s", dur: "18s" },
  { kind: "pep", left: "52%", top: "6%", size: 14, delay: "-11s", dur: "15s" },
];

function Drifter({ kind, size }: { kind: "pep" | "cheese" | "shred"; size: number }) {
  if (kind === "pep")
    return (
      <svg width={size} height={size} viewBox="-10 -10 20 20">
        <circle r="9.5" fill="#a8291a" />
        <circle r="7.6" fill="#c23a24" />
        <circle cx="-3" cy="-2" r="1.4" fill="#7e1d12" />
        <circle cx="3" cy="2.5" r="1.1" fill="#7e1d12" />
      </svg>
    );
  if (kind === "cheese")
    return (
      <svg width={size} height={size} viewBox="0 0 20 20">
        <path d="M2 14L10 4L18 14Z" fill="#ffc23d" />
        <circle cx="10" cy="11" r="1.6" fill="#e79c17" />
        <circle cx="6.5" cy="12.5" r="1" fill="#e79c17" />
      </svg>
    );
  return (
    <svg width={size} height={size / 2.5} viewBox="0 0 30 12">
      <path d="M2 8C8 2 14 10 20 5S27 3 28 6" fill="none" stroke="#ffd36b" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      {DRIFTERS.map((d, i) => (
        <span key={i} className="drifter" style={{ left: d.left, top: d.top, animationDelay: d.delay, animationDuration: d.dur }}>
          <Drifter kind={d.kind} size={d.size} />
        </span>
      ))}
      <div className="fog fog-a" />
      <div className="fog fog-b" />
      <Skyline />
      <div className="fog fog-c" />
    </div>
  );
}
