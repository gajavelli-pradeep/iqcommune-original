import { test } from "@playwright/test";
import * as path from "path";

const SHOTS = process.env.V6_SHOT_DIR ?? path.resolve(process.cwd(), "..", "v6-clone-shots");
const ROUTES = [
  { key: "home", url: "/" },
  { key: "practitioners", url: "/practitioners" },
];

for (const w of [375, 320]) {
  test(`public @${w}`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: w, height: 800 });
    for (const r of ROUTES) {
      await page.goto(r.url);
      await page.waitForTimeout(900);
      const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      await page.screenshot({ path: `${SHOTS}/pub-${r.key}-${w}.png`, fullPage: true });
      console.log(`HSCROLL ${r.key}@${w}=${hScroll}`);
    }
  });
}
