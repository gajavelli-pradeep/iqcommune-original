/**
 * Drives the Photos tab's two dialogs end to end: uploads real image bytes
 * through the upload modal, then opens the download modal and checks the
 * thumbnails actually resolve.
 *
 * It generates a genuine 1x1 PNG rather than a text file named .png — the
 * upload path sniffs magic bytes and rejects a mislabelled file, so a fake
 * would test the rejection instead of the upload.
 */
import { chromium } from "@playwright/test";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill(process.env.CONSOLE_EMAIL);
await page.getByLabel(/password/i).first().fill(process.env.CONSOLE_PASSWORD);
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForURL(/\/(console|globaladmin|user)/, { timeout: 30_000 });

await page.evaluate(() => document.querySelector('[data-tab="photos"]')?.click());
await page.waitForTimeout(700);

// ── Upload ──────────────────────────────────────────────────────────────────
const upload = page.getByRole("button", { name: /^Upload$/ });
console.log("upload triggers:", await upload.count());

if (await upload.count()) {
  await upload.first().click();
  await page.waitForTimeout(500);
  console.log("upload dialog open:", await page.getByRole("dialog").isVisible().catch(() => false));

  await page.locator('input[type="file"]').setInputFiles([
    { name: "session-1.png", mimeType: "image/png", buffer: PNG_1X1 },
    { name: "session-2.png", mimeType: "image/png", buffer: PNG_1X1 },
  ]);
  await page.waitForTimeout(400);
  const listed = await page.locator("li", { hasText: /session-\d\.png/ }).count();
  console.log("files listed in dialog:", listed);
  await page.screenshot({ path: "_parity/t6-upload-modal.png", fullPage: true });

  await page.getByRole("button", { name: /^Upload$/ }).last().click();
  await page.waitForTimeout(6000);
}

// ── Download ────────────────────────────────────────────────────────────────
await page.evaluate(() => document.querySelector('[data-tab="photos"]')?.click());
await page.waitForTimeout(700);

const download = page.getByRole("button", { name: /^Download$/ });
console.log("download triggers:", await download.count());

if (await download.count()) {
  await download.last().click();
  await page.waitForTimeout(2500);
  const thumbs = await page.locator('[role="dialog"] img').count();
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('[role="dialog"] img')].filter((img) => !img.naturalWidth).length,
  );
  console.log("thumbnails rendered:", thumbs, "broken:", broken);
  await page.screenshot({ path: "_parity/t6-download-modal.png", fullPage: true });
}

console.log(errors.length ? `console errors:\n  ${errors.join("\n  ")}` : "console errors: none");
await browser.close();
