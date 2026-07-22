/**
 * Measures every form control in the V7 HTML reference.
 *
 * Reading V7's stylesheet is not enough: a control's real appearance is the
 * cascade plus inline styles plus whatever the browser's own UA sheet supplies
 * for a `<select>`. So this loads each file, activates every panel (V7 keeps
 * them all in the DOM behind a class), and dumps the COMPUTED style of each
 * control — grouped by the V7 class that produced it, since a hundred inputs
 * with the same class are one design decision, not a hundred.
 *
 * Focus styles are captured by actually focusing the element, because a
 * `:focus` rule cannot be read off a resting element.
 *
 * Usage: node scripts/measure-v7-controls.mjs [> _parity/v7-controls.json]
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const V7_DIR = path.join(here, "..", "..", "client_requirements", "thefinalfinalfiles (V7)");

const FILES = [
  "iqcommune-main-landing-page.html",
  "iqcommune-empanelment.html",
  "iqcommune-practitioner-rating.html",
  "iqcommune-session-consent.html",
  "iqcommune-postsession-photos.html",
  "iqcommune-onboarding.html",
  "iqcommune-user-setup.html",
  "iqcommune-admin-console-automated.html",
];

/** The properties that decide whether two controls look the same. */
const PROPERTIES = [
  "backgroundColor",
  "color",
  "borderTopWidth",
  "borderTopStyle",
  "borderTopColor",
  "borderRadius",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "height",
  "boxShadow",
  "outlineWidth",
  "outlineColor",
  "transitionProperty",
  "transitionDuration",
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

/** class signature → measurements, so identical controls collapse to one entry. */
const byClass = new Map();

for (const file of FILES) {
  const url = `file://${path.join(V7_DIR, file).split(path.sep).join("/")}`;
  await page.goto(url);

  // Reveal every panel and modal so hidden controls are measurable.
  await page.evaluate(() => {
    document.body.classList.add("role-global");
    for (const panel of document.querySelectorAll(".tab-panel")) panel.classList.add("active");
    for (const overlay of document.querySelectorAll(".draft-overlay, .apply-modal-overlay, .modal-overlay")) {
      overlay.classList.add("open");
    }
    // Sections V7 reveals only after a pick.
    for (const el of document.querySelectorAll("#conf-auto-wrap, #pg-picker-wrap")) {
      if (el instanceof HTMLElement) el.style.display = "block";
    }
  });
  await page.waitForTimeout(300);

  const measured = await page.evaluate((props) => {
    const results = [];
    const controls = document.querySelectorAll("input, select, textarea");

    for (const el of controls) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;

      const style = getComputedStyle(el);
      const resting = {};
      for (const prop of props) resting[prop] = style[prop];

      // Focus for real — a :focus rule is invisible on a resting element.
      let focus = {};
      try {
        el.focus();
        const focused = getComputedStyle(el);
        focus = {
          borderTopColor: focused.borderTopColor,
          outlineWidth: focused.outlineWidth,
          outlineColor: focused.outlineColor,
          boxShadow: focused.boxShadow,
        };
        el.blur();
      } catch {
        /* some controls refuse focus; resting style is still useful */
      }

      results.push({
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") ?? "",
        className: el.className || "(no class)",
        inlineStyle: el.getAttribute("style") ?? "",
        resting,
        focus,
        placeholderColor: getComputedStyle(el, "::placeholder").color,
      });
    }
    return results;
  }, PROPERTIES);

  for (const control of measured) {
    // Group by what actually determines the look: element kind + class + any
    // inline style, since V7 styles many controls inline.
    const key = `${control.tag}${control.type ? `[${control.type}]` : ""} .${control.className} ${control.inlineStyle}`;
    if (!byClass.has(key)) byClass.set(key, { ...control, files: [], count: 0 });
    const entry = byClass.get(key);
    entry.count += 1;
    if (!entry.files.includes(file)) entry.files.push(file);
  }
}

await browser.close();

const output = [...byClass.entries()]
  .sort((a, b) => b[1].count - a[1].count)
  .map(([key, value]) => ({ key, ...value }));

console.log(JSON.stringify(output, null, 1));
console.error(`measured ${output.length} distinct control styles across ${FILES.length} files`);
