/**
 * Draws the illustrative gallery slides the landing page falls back to until
 * real session photos are published from the console.
 *
 * The client supplied slides 1-10. This regenerates 11-20 in the same artwork,
 * so the carousel is not ten unique frames followed by ten repeats. Every
 * constant below was measured off `gallery-placeholder-3.png` rather than
 * guessed — see MEASURED. Re-running is idempotent: same input, same pixels.
 *
 * It draws through the running app so the wordmark uses the app's own DM Sans
 * (next/font serves it from .next); a system fallback would render a different
 * shape at the same size and the new slides would not match the client's.
 *
 *   pnpm dev                                    # in another terminal
 *   node scripts/generate-gallery-placeholders.mjs
 */
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { chromium } from "@playwright/test";

const APP = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "gallery");

/**
 * Measured off the client's artwork, not invented. The wordmark solves to
 * DM Sans Medium at 214px: its ink box is 164x203 against the client's 165x204.
 */
const MEASURED = {
  width: 1280,
  height: 960,
  bg: "#0F1117",
  bar: { x: 40, y: 40, w: 1200, h: 100, radius: 16, fill: "#151619" },
  caption: { x: 83, baseline: 104, size: 44, weight: 400, fill: "#FFFFFF" },
  mark: { originX: 545, baseline: 544, size: 214, weight: 500, gold: "#C9982A", cream: "#F5E9C8" },
  dot: { x: 706, y: 611, r: 14, fill: "#2A6B2A" },
};

/** Slides 11-20, in the voice of the ten the client wrote. */
const CAPTIONS = [
  "Questions you were told were too basic",
  "Twenty-five people, one room, no jargon",
  "The person teaching still does the job",
  "Bring your actual numbers. We'll work through them.",
  "No commission. No product. No catch.",
  "Money talk, without the sales pitch",
  "Learn it once, use it for life",
  "Weekends well spent, in a room that gets it",
  "Every session ends with what to do next",
  "Built for people, not for portfolios",
];

const FIRST_INDEX = 11;

function drawSlide(caption, spec) {
  const canvas = document.createElement("canvas");
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = spec.bg;
  ctx.fillRect(0, 0, spec.width, spec.height);

  const { x, y, w, h, radius, fill } = spec.bar;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();

  ctx.fillStyle = spec.caption.fill;
  ctx.font = `${spec.caption.weight} ${spec.caption.size}px "DM Sans"`;
  ctx.textBaseline = "alphabetic";
  // Start the ink at the measured x, whatever left bearing this glyph carries.
  const bearing = ctx.measureText(caption).actualBoundingBoxLeft;
  ctx.fillText(caption, spec.caption.x + bearing, spec.caption.baseline);

  // "iq" is two colours, so it is drawn as two runs: the gold i, then the cream
  // q shifted by the i's advance.
  ctx.font = `${spec.mark.weight} ${spec.mark.size}px "DM Sans"`;
  ctx.fillStyle = spec.mark.gold;
  ctx.fillText("i", spec.mark.originX, spec.mark.baseline);
  ctx.fillStyle = spec.mark.cream;
  ctx.fillText("q", spec.mark.originX + ctx.measureText("i").width, spec.mark.baseline);

  ctx.fillStyle = spec.dot.fill;
  ctx.beginPath();
  ctx.arc(spec.dot.x, spec.dot.y, spec.dot.r, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL("image/png");
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });

try {
  await page.goto(APP, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => document.fonts.ready);

  const loaded = await page.evaluate(() => document.fonts.check('500 214px "DM Sans"'));
  if (!loaded) throw new Error(`DM Sans did not load from ${APP} — is the dev server running?`);

  // The drawing runs in the page, where the font lives.
  await page.evaluate(`window.drawSlide = ${drawSlide.toString()}`);

  for (const [i, caption] of CAPTIONS.entries()) {
    const dataUrl = await page.evaluate(
      ([text, spec]) => window.drawSlide(text, spec),
      [caption, MEASURED],
    );
    const file = path.join(OUT_DIR, `gallery-placeholder-${FIRST_INDEX + i}.png`);
    await writeFile(file, Buffer.from(dataUrl.split(",")[1], "base64"));
    console.log(`wrote ${path.basename(file)} — "${caption}"`);
  }
} finally {
  await browser.close();
}
