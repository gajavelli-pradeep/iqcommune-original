/**
 * Inflates a generated agreement PDF's content streams and reports which of the
 * document's load-bearing strings are actually present.
 *
 * A PDF that opens is not the same as a PDF that says the right thing: a layout
 * bug that draws the clause body below the page edge produces a perfectly valid
 * file containing nothing anyone can read, and a byte count cannot tell the two
 * apart.
 *
 * Usage: CONSOLE_EMAIL=… CONSOLE_PASSWORD=… node scripts/check-pdf-text.mjs
 */
import zlib from "node:zlib";
import { chromium } from "@playwright/test";

/**
 * The strings whose absence would mean something, chosen so a layout bug that
 * silently drops a page is caught by what went missing rather than by a page
 * count.
 *
 * The last four are the terms the document went out without while its text was
 * transcribed from the V7 page instead of the client's contract: the platform
 * party, the sentence that makes a signature consent, the seat of arbitration,
 * and clause 4's first sub-clause — which used to be (f), printed above the
 * (a)-(e) it follows.
 *
 * "SIGNATURE" rather than "EXECUTION" since the block takes the client's own
 * heading. A checker that keeps asserting the old one passes on a document
 * nobody delivered.
 */
const EXPECT = [
  "PRACTITIONER EMPANELMENT AGREEMENT",
  "1. NATURE OF ENGAGEMENT",
  "SIGNATURE",
  "InvestQ Commune",
  "agree to be bound by all clauses",
  "Hyderabad as the seat of arbitration",
  "(a) The Practitioner",
];

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await page.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });

await page.evaluate(() => document.querySelector('[data-tab="agreements"]')?.click());
await page.waitForTimeout(500);

const rows = await page.$$eval("table tbody tr", (trs) =>
  trs.map((tr) => ({
    href: tr.querySelector('a[href*="/pdf"]')?.getAttribute("href") ?? null,
    signed: (tr.textContent ?? "").includes("Signed"),
  })),
);

/**
 * Every stream in the file as text. pdf-lib does not always Flate-compress a
 * content stream, so an inflate-only reader silently returns nothing on a
 * perfectly good document — the raw bytes are included for that case.
 */
function streamText(buf) {
  let out = buf.toString("latin1");
  let at = 0;
  while ((at = buf.indexOf("stream", at)) !== -1) {
    let start = at + 6;
    if (buf[start] === 0x0d) start += 1;
    if (buf[start] === 0x0a) start += 1;
    const end = buf.indexOf("endstream", start);
    if (end === -1) break;
    try {
      out += zlib.inflateSync(buf.subarray(start, end)).toString("latin1");
    } catch {
      // Not a Flate stream — fonts and metadata land here too.
    }
    at = end + 9;
  }
  return out;
}

// pdf-lib draws text as a hex string — `<50524143…> Tj` — not as a
// parenthesised literal. Both forms are legal PDF, and an extractor that only
// knows the literal form reports an empty document for a perfectly good file.
const ESCAPED = new RegExp(String.raw`\\([()\\])`, "g");
const DRAWN_LITERAL = new RegExp(String.raw`\(((?:\\.|[^\\)])*)\)\s*Tj`, "g");
const DRAWN_HEX = /<([0-9A-Fa-f\s]+)>\s*Tj/g;

function fromHex(hex) {
  const clean = hex.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    out += String.fromCharCode(parseInt(clean.slice(i, i + 2), 16));
  }
  return out;
}

for (const row of rows.filter((entry) => entry.href)) {
  const response = await page.request.get(`http://localhost:3000${row.href}`);
  const buf = await response.body();

  const content = streamText(buf);
  const shown = [
    ...[...content.matchAll(DRAWN_LITERAL)].map((match) => match[1].replace(ESCAPED, "$1")),
    ...[...content.matchAll(DRAWN_HEX)].map((match) => fromHex(match[1])),
  ].join(" ");

  const expect = [...EXPECT, row.signed ? "Signature method" : "NOT YET SIGNED"];
  const missing = expect.filter((phrase) => !shown.includes(phrase));

  console.log(
    `${(row.signed ? "Signed" : "Pending").padEnd(7)} ${String(buf.length).padStart(5)}b  ` +
      `text=${String(shown.length).padStart(5)}ch  ` +
      (missing.length ? `MISSING → ${missing.join(", ")}` : "all expected text present"),
  );
}

await browser.close();
