# PLAN — implement `client requirements/pending/` HTML specs

## Question

Bring `/onboarding` and `/submit-photos` to pixel/content parity with the two revised
specs delivered on 2026-08-14 in `client requirements/pending/`:

- `iqcommune-onboarding.html` (supersedes the 2026-08-12 copy in `spec/v7/`)
- `iqcommune-postsession-photos.html` (same)

Both routes already exist and already pass their parity gates against the **2026-08-12**
specs. So this is a re-sync to a re-delivery, not a greenfield build.

## Answer

Use the repo's own documented re-delivery workflow, stated in `tests/unit/spec-freshness.test.ts`:

> "If this fails after a re-delivery, copy the new files over spec/v7/ and re-run the
> parity gates — the diff they then report is the real work."

So: copy the two new specs into `spec/v7/`, let the parity gates enumerate the delta, and
close it. The gates are the acceptance criteria — no hand-eyeballing of 61KB of HTML.

### The delta (from `diff spec/v7/… "client requirements/pending/…"`)

**`iqcommune-postsession-photos.html` — 3 changed lines, already satisfied.**
Adds a `.footer-note` ("Confidential · Questions? Reply to the email this link was sent
from, or write to hello@iqcommune.com") to the form page and the receipt page, plus its
CSS. `components/layout/LinkPageShell.tsx` **already renders exactly this string** for
every emailed page — the app was ahead of the spec. Expected work: none beyond vendoring
the spec and proving the gate still passes.

**`iqcommune-onboarding.html` — 20 changed lines, one coherent theme: module is
decoupled from the agreement.**

1. `Module assigned` removed from the practitioner summary card (6 fields → 5).
2. `Module(s)` row removed from the agreement detail table (4 rows → 3).
3. `Module assigned` removed from the signed receipt.
4. Clause 2 (SCOPE OF ENGAGEMENT) reworded: "for the module(s) listed above" →
   "within their selected module(s) of expertise … Module preferences are recorded
   separately from this Agreement and may be updated by the Practitioner from time to time."
5. `module` dropped from the page's URL contract and script entirely.
6. Same `.footer-note` added (already rendered by `LinkPageShell`).

### Decisions taken

- **The signed PDF follows the on-screen agreement.** `lib/pdf/agreement.ts:42` writes a
  `Module(s)` field. Its own header comment says the downloaded copy must not differ from
  the one on screen ("worse than no download at all"). Once the on-screen agreement drops
  that row, the PDF must too, or the archived contract states a term the practitioner
  never signed. Removing it — flagged in the report as an adjacent change.
- **`OnboardingPractitioner.module` is deleted, not left dangling.** After (1) and (2) it
  has no reader; a populated-but-unrendered field on a legal page is dead code.
  `practitioner_agreements.modules` stays in the database — only the onboarding read stops
  selecting it. Every other `module` reader (sessions, consent, photos, console) is
  untouched and out of scope.
- **`client requirements/` root gets the new copies too.** `spec-freshness.test.ts`
  compares `spec/v7/` against `client requirements/` *root*, not `pending/`. Vendoring the
  new specs without updating the delivery root would turn that gate red in the user's main
  checkout. `pending/` is left intact as the client's original drop.

## Implementation

Serial, single-threaded: every lane below feeds the next (spec → gate output → code →
gate re-run). No subagents — the work has a real dependency chain, and the parity gate is
the only oracle worth trusting here.

| # | Step | Files owned |
|---|------|-------------|
| 0 | Baseline: run both parity suites green against the old spec | — (read-only) |
| 1 | Vendor the re-delivery | `spec/v7/iqcommune-onboarding.html`, `spec/v7/iqcommune-postsession-photos.html` |
| 2 | Re-run gates → capture the authoritative missing-copy list | — (read-only) |
| 3 | Summary card + agreement table | `features/onboarding/OnboardingForm.tsx` |
| 4 | Clause 2 rewording | `constants/agreement.ts` |
| 5 | Drop the orphaned field | `types/link-pages.ts`, `services/link-pages.ts` |
| 6 | Keep the signed PDF identical to the signed page | `lib/pdf/agreement.ts`, `app/api/agreements/[id]/pdf/route.ts` |
| 7 | Fixtures that carry the removed field | `tests/parity/onboarding.parity.test.tsx`, `features/onboarding/OnboardingForm.test.tsx` |
| 8 | Prune any pending declaration the re-delivery made stale | `tests/parity/pending-onboarding.ts`, `tests/parity/pending-photos.ts` |
| 9 | Verify: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` | — |

## Verification

- Both parity gates green against the **new** specs, with no undeclared missing copy and
  no stale pending declarations (the suite fails on either).
- `pnpm verify` clean.
- Runtime check of `/onboarding`: summary card reads 5 fields, agreement table 3 rows,
  clause 2 carries the new sentence, footer note present.
