# Visual Parity Report — React vs V7 HTML

**Method:** Playwright (headless Chromium) screenshotting each React page and its V7 HTML
reference at the same viewport, read back and compared side by side. Fixes were re-screenshotted
and re-compared until they matched.

## Comparable surfaces

| Page | React | V7 reference | Comparable? |
|---|---|---|---|
| Landing | `/` | `iqcommune-main-landing-page.html` | ✅ fully |
| Practitioners | `/practitioners` | `iqcommune-empanelment.html` | ✅ fully |
| Rate / Consent / Photos / Onboarding / Join-admin | token pages | rating/consent/photos/onboarding/user-setup | ⛔ show the invalid-link state without a **valid token + DB row** — the full forms can't be rendered for comparison without seeded data |
| Admin console | `/console` etc. | `admin-console-automated.html` | ⛔ behind auth — needs a signed-in session (first-admin credential) |

## Defects found and fixed (verified by re-screenshot)

| # | Page | Defect | Root cause | Fix |
|---|---|---|---|---|
| 1 | Landing | Header "Request a Session" button had a leading message icon; V7 has a trailing right-arrow | `RequestSessionButton` used one icon for all variants | Variant-aware: nav/ghost trail `→`, hero/CTA lead with the message icon |
| 2 | Practitioners | Hero rendered on **light cream**; V7 hero is **dark ink** (white headline, gold accent, gold corner glows, dark card) | Hero built with `bg-surface-soft` | Inverted to `bg-ink` + glows + `text-surface`/`text-gold` + dark `tool-card`; added `--color-gold-glow[-soft]` tokens |
| 3 | Practitioners | "This works well for some people" section rendered **light**; V7 is **dark** | `FitLists` built light | `bg-ink` + `SectionHeading tone="dark"` + green-tint good card / faint not-for-you card |
| 4 | Practitioners | Division-of-work was two separate cards; V7 is one split box with a **dark "We Handle" header** | Two `bg-surface` cards | Single bordered grid: cream "You Bring" header, dark ink "We Handle" header, medium-ink We-Handle rows |

## Status by page

- **Landing (`/`)** — parity high; structure, sections, colors, typography match. Header CTA fixed.
  Remaining: sub-pixel spacing/pill-padding nits tracked as P2/P3 in `../FIDELITY-FLAWS.md`.
- **Practitioners (`/practitioners`)** — the three structural mismatches above are fixed; the page
  now reads as the V7 dark-hero design end to end.

## Not yet compared (blocked)

- **Responsive breakpoints** (320–1920): only 1440 was compared this pass; the mobile/tablet sweep
  is the next iteration.
- **Token-gated and admin pages**: require seeded DB rows + a signed-in session to render their real
  content — external data/credential blockers, not implementation gaps.

_All fixes shipped on `feat/v7-production-hardening`; `pnpm verify` green (183 tests)._
