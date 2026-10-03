// Renders the Sliced app icons (PWA + Apple) from one SVG. Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const pizza = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1a110d"/>
  <g transform="translate(244 276) scale(${(1 - pad) * 2.05})">
    <circle r="100" fill="#e3a05c"/>
    <circle r="86" fill="#d63a1f"/>
    <circle r="80" fill="#ffc23d"/>
    <circle cx="-30" cy="22" r="15" fill="#c23a24"/>
    <circle cx="26" cy="36" r="13" fill="#c23a24"/>
    <circle cx="-18" cy="-36" r="12" fill="#c23a24"/>
    <circle cx="36" cy="-6" r="11" fill="#c23a24"/>
    <path d="M0 0 L0 -100 A100 100 0 0 1 86.6 -50 Z" fill="#1a110d"/>
    <g transform="translate(18 -26)">
      <path d="M0 0 L0 -100 A100 100 0 0 1 86.6 -50 Z" fill="#e3a05c"/>
      <path d="M0 0 L0 -86 A86 86 0 0 1 74.5 -43 Z" fill="#ffc23d"/>
      <circle cx="20" cy="-58" r="11" fill="#c23a24"/>
    </g>
  </g>
</svg>`;

await mkdir("public/icons", { recursive: true });
const jobs = [
  ["icon-192.png", 192, 0],
  ["icon-512.png", 512, 0],
  ["icon-maskable-512.png", 512, 0.2],
  ["apple-touch-icon.png", 180, 0.08],
];
for (const [name, size, pad] of jobs) {
  await sharp(Buffer.from(pizza(pad))).resize(size, size).png().toFile(`public/icons/${name}`);
}
console.log("icons written");
