# Plan — gallery, mobile nav, Brevo error handling

Client brief, 2026-07-23. Three independent features; L4 (cross-cutting, 3 lanes).

## Question

Ship three production features: (1) the public "latest 20 published photos" section driven
entirely by the console Gallery module, (2) a mobile hamburger drawer, (3) enterprise-grade
Brevo send handling with a persisted attempt log.

## Answer

Lanes are disjoint by file. No lane touches another's write set, so each is built, verified and
committed on its own.

Two decisions the brief leaves open, taken here rather than deferred:

- **Error state, public gallery.** The brief lists loading / empty / error states. The error path
  renders the branded artwork and reports to the server log, rather than an alert on the marketing
  page. Reason: the brief also says never leave empty spaces, no photo has ever been published, and
  a visitor cannot act on a database outage. The path is explicit and tested — not swallowed.
- **Duplicate suppression, email.** Keyed on (template, recipient, entity ref) inside a window,
  stored in the log table, so a double-submitted form or a retried server action does not send twice.

## Implementation

### Lane A — public gallery + console gallery module

Owns: `services/gallery.ts` · `features/landing/sections/Gallery.tsx` ·
`features/landing/sections/GalleryCarousel.tsx` · `features/console/actions.ts` (gallery block only) ·
`features/console/panels/GalleryPanel.tsx` · `constants/gallery.ts` · gallery tests

- A1 `reorderGalleryPhoto` — move a live photo up/down through `sort_order`; console controls.
- A2 `unpublishGalleryPhoto` — live → draft, distinct from delete (which also drops the object).
- A3 `revalidatePath("/")` on **every** gallery mutation, not just publish/remove.
- A4 Loading: Suspense fallback renders the artwork carousel — same box, no layout shift.
- A5 Error: explicit catch → artwork + `console.error`, covered by a test.
- A6 Responsive: verify the carousel at 320/480/768/1024/1440/1920 for overflow and reachability.
- A7 Lazy + optimisation: `next/image`, correct `sizes`, no eager loads below the fold.

### Lane B — mobile navigation

Owns: `components/layout/SiteHeader.tsx` · `components/layout/MobileNav.tsx` (new) ·
`features/landing/LandingSections.tsx` (section ids) · nav tests

- Hamburger below 768px, slide-in drawer, focus trap, Escape, click-outside, body-scroll lock,
  ≥44px targets, motion behind `prefers-reduced-motion`.
- Contents: landing section anchors, the practitioner site, the page's own call to action.

### Lane C — Brevo email

Owns: `lib/email/send.ts` · `lib/email/outcome.ts` (new) · `services/email-log.ts` (new) ·
`supabase/migrations/0016_email_log.sql` (new) · email tests

- Ten named outcomes; recipient validation; config/auth/rate-limit/timeout/network/server
  classification; retry with backoff on transient only; every attempt persisted.

## Done

Per lane: `vitest run` · `eslint` · `tsc --noEmit` · `next build` · driven in a real browser.
Full regression at the end, plus the responsive sweep.
