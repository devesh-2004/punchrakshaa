/**
 * Generate branded placeholder files for missing STATIC homepage assets that
 * are referenced by code but absent from public/. ONLY creates files that do
 * not already exist — never overwrites an existing image.
 *
 *   node scripts/repair-static-images.js
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const G = require("./_placeholderLib");

const PUB = path.join(__dirname, "..", "public");
const DIR = "/images/homepage/Homepage-content";

// [ targetPath, generator, rasterFormat|null, width, height ]
const BANNER_D = [1920, 800], BANNER_M = [1080, 1080];
const targets = [
  // 12 USP badge SVGs (rendered by AyurvedicBadges + WhyPunchRaksha)
  [`${DIR}/sugar-free-herbal-formula.svg`, () => G.badge("No Sugar\nAdded")],
  [`${DIR}/pure-vegetarian-herbal-formula.svg`, () => G.badge("100%\nVegetarian")],
  [`${DIR}/vegan-ayurvedic-products.svg`, () => G.badge("100%\nVegan")],
  [`${DIR}/cruelty-free-ayurvedic-products.svg`, () => G.badge("Cruelty\nFree")],
  [`${DIR}/gluten-free-ayurvedic-products.svg`, () => G.badge("Gluten\nFree")],
  [`${DIR}/no-artificial-colour-natural-products.svg`, () => G.badge("No Artificial\nColour")],
  [`${DIR}/ayurvedic-1000-years-knowledge.svg`, () => G.badge("1000+ Years\nKnowledge")],
  [`${DIR}/ayurvedic-root-cause-healing.svg`, () => G.badge("Root Cause\nHealing")],
  [`${DIR}/trusted-by-300-customers-india.svg`, () => G.badge("Trusted by\n300+ Indians")],
  [`${DIR}/quality-tested-natural-products.svg`, () => G.badge("Quality\nTested")],
  [`${DIR}/non-habit-forming-formula.svg`, () => G.badge("Non-Habit\nForming")],
  [`${DIR}/formulated-by-experienced-professionals.svg`, () => G.badge("Expert\nFormulated")],
  // Hero banners (HeroSection slider) — desktop 1920x800, mobile 1080x1080
  [`${DIR}/mega-sale-is-live.webp`, () => G.banner("Mega Sale is Live", ...BANNER_D, "Up to 50% off Ayurvedic essentials"), "webp"],
  [`${DIR}/mega-sale-is-live-mobile.webp`, () => G.banner("Mega Sale is Live", ...BANNER_M), "webp"],
  [`${DIR}/natural-and-effective-solutions-for-daily-wellness.webp`, () => G.banner("Natural & Effective Solutions for Daily Wellness", ...BANNER_D), "webp"],
  [`${DIR}/natural-and-effective-solutions-for-daily-wellness-mobile.webp`, () => G.banner("Natural & Effective Daily Wellness", ...BANNER_M), "webp"],
  [`${DIR}/traditional-approaches-to-sugar-management.webp`, () => G.banner("Traditional Approaches to Sugar Management", ...BANNER_D), "webp"],
  [`${DIR}/traditional-approaches-to-sugar-management-mobile.webp`, () => G.banner("Sugar Management the Ayurvedic Way", ...BANNER_M), "webp"],
  [`${DIR}/say-goodbye-to-digestive-issues.webp`, () => G.banner("Say Goodbye to Digestive Issues", ...BANNER_D), "webp"],
  [`${DIR}/say-goodbye-to-digestive-issues-mobile.webp`, () => G.banner("Say Goodbye to Digestive Issues", ...BANNER_M), "webp"],
  [`${DIR}/natural-health-solutions.webp`, () => G.banner("Natural Health Solutions", ...BANNER_D), "webp"],
  [`${DIR}/holistic-ayurvedic-healthcare.webp`, () => G.banner("Holistic Ayurvedic Healthcare", 900, 900), "webp"],
  // Doctor portrait (ConsultationCTA)
  [`${DIR}/dr-shail-chauhan-ayurvedic-doctor.webp`, () => G.portrait("Ayurvedic Doctor"), "webp"],
  // Generic product fallback used by blog page
  [`/images/PunchRaksha_Product.png`, () => G.product("PunchRaksha"), "png"],
];

(async () => {
  let created = 0, skipped = 0;
  for (const [rel, gen, fmt] of targets) {
    const dest = path.join(PUB, rel);
    if (fs.existsSync(dest)) { skipped++; continue; }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const svg = Buffer.from(gen());
    if (!fmt) {
      fs.writeFileSync(dest, svg);
    } else if (fmt === "webp") {
      await sharp(svg).webp({ quality: 82 }).toFile(dest);
    } else if (fmt === "png") {
      await sharp(svg).png().toFile(dest);
    }
    created++;
    console.log("  +", rel);
  }
  console.log(`\nStatic placeholders — created: ${created}, skipped (already present): ${skipped}`);
})().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
