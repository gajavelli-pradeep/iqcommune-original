/**
 * Fetches both documents the Session Consent tab offers — the confirmation and
 * the photo guide — and confirms each is a real PDF carrying the text it is
 * supposed to carry.
 *
 * Same reasoning as `check-pdf-text.mjs`: a valid PDF that drew its content off
 * the page edge is indistinguishable from a good one by status code and byte
 * count alone.
 *
 * Usage: CONSOLE_EMAIL=… CONSOLE_PASSWORD=… node scripts/check-consent-pdf.mjs
 */
import zlib from "node:zlib";
import { chromium } from "@playwright/test";

const ESCAPED = new RegExp(String.raw`\\([()\\])`, "g");
const LITERAL = new RegExp(String.raw`\(((?:\\.|[^\\)])*)\)\s*Tj`, "g");
const HEX = /<([0-9A-Fa-f\s]+)>\s*Tj/g;

function fromHex(hex) {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}

function extract(buf) {
  let raw = buf.toString("latin1");
  let at = 0;
  while ((at = buf.indexOf("stream", at)) !== -1) {
    let start = at + 6;
    if (buf[start] === 0x0d) start += 1;
    if (buf[start] === 0x0a) start += 1;
    const end = buf.indexOf("endstream", start);
    if (end === -1) break;
    try {
      raw += zlib.inflateSync(buf.subarray(start, end)).toString("latin1");
    } catch {
      // Fonts and metadata are streams too.
    }
    at = end + 9;
  }
  return [
    ...[...raw.matchAll(LITERAL)].map((match) => match[1].replace(ESCAPED, "$1")),
    ...[...raw.matchAll(HEX)].map((match) => fromHex(match[1])),
  ].join(" ");
}

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await page.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });

await page.evaluate(() => document.querySelector('[data-tab="confirmations"]')?.click());
await page.waitForTimeout(600);

const hrefs = await page.$$eval('a[href*="/api/consents/"]', (anchors) =>
  anchors.map((anchor) => anchor.getAttribute("href")),
);
const guide = await page.$eval("#guide-session option:nth-child(2)", (option) => option.value).catch(() => null);
if (guide) hrefs.push(`/api/consents/${guide}/pdf?doc=photo-guide`);

for (const href of [...new Set(hrefs)]) {
  const response = await page.request.get(`http://localhost:3000${href}`);
  const buf = await response.body();
  const text = extract(buf);

  const isGuide = href.includes("photo-guide");
  const expect = isGuide
    ? ["SESSION PHOTO GUIDE", "THE 8 SHOTS", "Group photo", "BEFORE YOU SHOOT"]
    : ["SESSION CONFIRMATION", "GROSS PAYOUT AMOUNT", "CONSENT"];
  const missing = expect.filter((phrase) => !text.includes(phrase));

  console.log(
    `${response.status()} ${String(buf.length).padStart(5)}b ${isGuide ? "guide  " : "confirm"} ` +
      (missing.length ? `MISSING → ${missing.join(", ")}` : "all expected text present"),
  );
}

await browser.close();
