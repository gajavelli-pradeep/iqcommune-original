/** Names the elements that push the PAGE wider than the viewport. A table is
 *  allowed to scroll inside its own region; the document is not. */
import { chromium } from "@playwright/test";
const tab = process.argv[2] ?? "sessions";
const width = Number(process.argv[3] ?? 320);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width, height: 900 } });
await p.goto("http://localhost:3000/console-preview", { waitUntil: "networkidle" });
await p.evaluate((t) => document.querySelector(`[data-tab="${t}"]`)?.click(), tab);
await p.waitForTimeout(500);
const out = await p.evaluate((vw) => {
  const bad = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    if (r.right > vw + 1) {
      const style = getComputedStyle(el);
      // Only report the element if its PARENT is not itself overflowing —
      // that isolates the source rather than listing every ancestor.
      const pr = el.parentElement?.getBoundingClientRect();
      if (pr && pr.right > vw + 1) continue;
      bad.push(`${el.tagName.toLowerCase()}.${(el.className||"").toString().split(" ").slice(0,3).join(".")} right=${Math.round(r.right)} w=${Math.round(r.width)} overflowX=${style.overflowX}`);
    }
  }
  return { scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, bad: bad.slice(0, 8) };
}, width);
console.log(`${width}px doc ${out.scrollW}/${out.clientW}`);
for (const line of out.bad) console.log("  " + line);
await b.close();
