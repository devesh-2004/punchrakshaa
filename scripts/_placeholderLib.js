// Shared branded-SVG placeholder generator (CommonJS, used by repair scripts).
// Produces clean, professional Ayurvedic-brand placeholders. No external deps
// for SVG; raster (webp/png) conversion is done by the caller via sharp.

const GREEN = "#045830";
const GREEN_D = "#034620";
const CREAM = "#eef6f2";
const MINT = "#e4f5e8";
const INK = "#121212";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function lines(text) {
  return String(text).split("\n").map((s) => s.trim()).filter(Boolean);
}

// Small leaf mark used across placeholders.
function leaf(cx, cy, s, fill) {
  return `<path transform="translate(${cx},${cy}) scale(${s})" fill="${fill}"
    d="M0,12 C0,4 8,-4 18,-6 C16,4 8,12 0,12 Z M2,10 C7,6 12,2 15,-2" stroke="${fill}" stroke-width="0.6"/>`;
}

/** Circular USP badge with a label (supports \n). */
function badge(label) {
  const ls = lines(label);
  const startY = 116 - (ls.length - 1) * 13;
  const txt = ls
    .map((l, i) => `<text x="100" y="${startY + i * 26}" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="${GREEN}">${esc(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="92" fill="${MINT}" stroke="${GREEN}" stroke-width="4"/>
  <circle cx="100" cy="100" r="80" fill="none" stroke="${GREEN}" stroke-width="1" stroke-dasharray="3 5" opacity="0.5"/>
  ${leaf(86, 52, 1.4, GREEN)}
  ${txt}
</svg>`;
}

/** Wide promotional banner. */
function banner(title, w, h, subtitle) {
  const big = Math.min(w, h) < 1100 ? 64 : 86;
  const ls = lines(title.replace(/(.{1,22})(\s|$)/g, "$1\n"));
  const cx = w / 2;
  const startY = h / 2 - (ls.length - 1) * (big * 0.62) - 10;
  const txt = ls
    .map((l, i) => `<text x="${cx}" y="${startY + i * big * 1.18}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${big}" font-weight="700" fill="#ffffff">${esc(l)}</text>`)
    .join("");
  const sub = subtitle
    ? `<text x="${cx}" y="${startY + ls.length * big * 1.18 + 18}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${big * 0.34}" fill="#dff2e6">${esc(subtitle)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_D}"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.86}" cy="${h * 0.2}" r="${h * 0.5}" fill="#ffffff" opacity="0.05"/>
  <circle cx="${w * 0.12}" cy="${h * 0.92}" r="${h * 0.4}" fill="#ffffff" opacity="0.05"/>
  ${leaf(cx - 22, startY - big - 10, 2.2, "#9fe0b6")}
  ${txt}${sub}
  <text x="${cx}" y="${h - 26}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${big * 0.26}" letter-spacing="3" fill="#bfe8cd">PUNCHRAKSHA · AYURVEDA</text>
</svg>`;
}

/** Square product placeholder (bottle silhouette + name). */
function product(title) {
  const ls = lines(title.replace(/(.{1,18})(\s|$)/g, "$1\n")).slice(0, 3);
  const txt = ls
    .map((l, i) => `<text x="400" y="${640 + i * 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="${GREEN}">${esc(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${CREAM}"/>
  <g transform="translate(400,300)">
    <rect x="-90" y="-70" width="180" height="300" rx="26" fill="#ffffff" stroke="${GREEN}" stroke-width="6"/>
    <rect x="-54" y="-110" width="108" height="48" rx="12" fill="${GREEN}"/>
    <rect x="-70" y="40" width="140" height="150" rx="14" fill="${MINT}"/>
    ${leaf(-20, 70, 2.6, GREEN)}
  </g>
  ${txt}
  <text x="400" y="740" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" letter-spacing="3" fill="${GREEN}" opacity="0.7">PUNCHRAKSHA AYURVEDA</text>
</svg>`;
}

/** Portrait placeholder (e.g. consultation doctor). */
function portrait(label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="${MINT}"/>
  <circle cx="300" cy="300" r="150" fill="#ffffff" stroke="${GREEN}" stroke-width="6"/>
  <circle cx="300" cy="250" r="58" fill="${GREEN}"/>
  <path d="M190 400 C190 320 410 320 410 400 L410 470 L190 470 Z" fill="${GREEN}"/>
  <text x="300" y="600" text-anchor="middle" font-family="Georgia, serif" font-size="40" font-weight="700" fill="${GREEN}">${esc(label)}</text>
  <text x="300" y="650" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="${INK}" opacity="0.6">PunchRaksha Ayurveda</text>
</svg>`;
}

/** Blog cover (1200x630) with the post title. */
function blogCover(title) {
  const ls = lines(title.replace(/(.{1,26})(\s|$)/g, "$1\n")).slice(0, 4);
  const startY = 315 - (ls.length - 1) * 34;
  const txt = ls
    .map((l, i) => `<text x="80" y="${startY + i * 64}" font-family="Georgia, serif" font-size="54" font-weight="700" fill="#ffffff">${esc(l)}</text>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${GREEN}"/><stop offset="1" stop-color="${GREEN_D}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1050" cy="120" r="240" fill="#ffffff" opacity="0.06"/>
  ${leaf(78, startY - 92, 2.4, "#9fe0b6")}
  <rect x="80" y="${startY - 70}" width="70" height="6" fill="#9fe0b6"/>
  ${txt}
  <text x="80" y="560" font-family="Arial, sans-serif" font-size="24" letter-spacing="3" fill="#bfe8cd">PUNCHRAKSHA · AYURVEDIC WELLNESS BLOG</text>
</svg>`;
}

module.exports = { badge, banner, product, portrait, blogCover };
