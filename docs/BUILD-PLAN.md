# Build plan — how iqcommune-v7 gets built

This file has two parts.

| | | |
|---|---|---|
| **Part I** | *below* | **The V7 execution plan** — the live ledger. Progress, phase order, what is in flight. Read every session. |
| **Part II** | *[jump](#part-ii--universal-software-delivery-operating-system)* | **The operating system** — the method Part I is an instance of. Project-independent. Read once; consult on any "how should this be done?" question. |

Where the two disagree on a specific, **Part I wins for this project** — it is the concrete instance.
Part II is the general rule that Part I was derived from.

---

# Part I — the V7 execution plan

**The unit of work is a section inside a page — never a whole page.**
Ordered by dependency depth, not line count. One section in flight at a time. Every section passes
the same eight checks; every page passes the same four. Nothing else to remember.

## The spec is V7 and only V7

**This is a fresh version. Do not take design references from V1–V6.** The eight files in
`client_requirements/thefinalfinalfiles (V7)/` are the whole source of truth for what the product
*is*: copy, layout, structure, states, flows, behaviour. When something is unclear, the answer comes
from the V7 file or from the client — never from the old app, its mockups, its components, or how a
previous version happened to solve it. "V6 did it this way" is not a reason.

Concretely, do not: copy a component out of `iqcommune/`, reuse an old page's structure, carry
forward copy that V7 rewrote, or reproduce a V6 behaviour the V7 file does not show. Seven versions
of accumulated assumptions are what made the product impossible to describe; inheriting them again
rebuilds the problem.

**One boundary, deliberately.** This bans *design* inheritance, not knowledge of the running
production system. What is live today — the database holding signed agreements, the crons that
delete rows, the webhook registered against the old host — is operational fact, and V7 must go live
without destroying it. That reality belongs in `docs/adr/0003-cutover-and-data-migration.md` and
nowhere near a component.

## Stop condition

**The project is finished when V7 is live and verified — not when it renders.** Four rungs, in
order. A rung is entered only once the one below it has produced *evidence*, not an impression.

| Rung | Complete when |
|---|---|
| **Section** | its **8 checks** pass — §5 |
| **Page** | every section done **and** its **4 page checks** pass — §5: parity reports 0 missing strings · every control exercised in the running app · e2e green · `pnpm verify` green |
| **Product** | all eight pages at page-complete **and** H1–H4 passed — §6 |
| **Live** | V7 serving production traffic on the real domain, data migrated, rollback rehearsed, and a restore proven from a real backup |

Work continues section by section until then. Only three things legitimately stop it early:

1. the scope above is genuinely finished;
2. a decision is needed that only the client or a human owner can make;
3. a dependency makes continuing unsafe — an unverified backup ahead of a destructive step, an
   unresolved schema conflict, a missing credential.

**None of these are stopping conditions:** it looks right in a screenshot · the happy path works ·
it compiles · the page renders · the section is "basically done" · an agent reported success.
Completion is a claim about evidence. Where the evidence was not produced, the unit is not done —
regardless of how finished it looks.

**The `Live` rung is planned in `docs/adr/0003-cutover-and-data-migration.md`** — share the existing
Supabase project, migrate no data, keep rollback a domain switch. Two things in it are still open and
both need the owner: the ADR is `Proposed` rather than accepted, and **no domain is confirmed as
owned**, which is the one step that cannot be scheduled without an answer.

---

## 0. Progress

`[x]` done and verified · `[ ]` pending. Updated as each unit lands.

**Foundation**

- [x] **F0** design tokens + lint guards — `db57978`
- [x] **F1** app shell: error / global-error / not-found / ErrorBoundary — `e3f7b39`
- [ ] **F2** data layer — built when `Gallery` needs an API read
- [ ] **F3** database + schema — built when `RequestModal` needs a write
- [x] **F4** content-parity gate — `tests/parity/`, runs inside `pnpm test` · first run: 113
      undeclared missing strings on `/`, now 0 · **found 4 units the P1 list did not have**
- [ ] **auth** — built at P7, when `/join-admin` needs it

**P1 · main-landing-page → `/`**

- [x] `Footer` *(shared chrome — all 8 pages)* — 5 tests · 320/640×320/1440/1920 clean · AA fix + JSX space defect caught
- [x] `Nav` → `SiteHeader` *(shared chrome — all 8 pages)* — 5 tests · 7 viewports · strapline dropped <640px to stop a measured overflow · right-slot budget 162px @320px
      - [ ] its "Request a Session" button ships with `RequestModal` (needs the modal it opens)
- [x] `Hero` — 6 tests · 7 viewports · opt-in motion (spec's `opacity:0` base state would blank the page)
      - [ ] its "Request a Session" button ships with `RequestModal`
- [x] `PoolStats` — delivered inside `Hero` as `PractitionerPoolCard`; the spec has them in one `<section>`
- [x] `TrustBar` + `AudienceRibbon` — **found by F4, not by reading.** Two full-width strips at spec
      lines 878–911, inside a region this list called done. 4 tests · one data-driven `IconStrip`
- [x] `TrainerComparison` — 5 tests · 7 viewports · PARITY FIX: spec deletes the left column below 720px; both kept
- [x] `WhoIsThisFor` — 5 tests · 7 viewports · 3 audience cards + 13 sub-segment tags, data-driven
- [x] `TrainingTopics` — 4 tests · 7 viewports · 6 modules, 3→2→1 columns at the spec breakpoints
- [x] `BundledSessions` — 5 tests · 7 viewports · 3 pairings as ordered lists, duration chips never squeezed
- [x] `HowItWorks` — 4 tests · 7 viewports · ordered list, 52px numeral circles hold shape
- [x] `Takeaways` — 4 tests · 6 cards × 4 deliverables · shortened titles preserved as written
- [x] `Faqs` — 7 tests · 7 viewports · single-open accordion, keyboard-operable, aria-expanded/controls
- [x] `ToolsCalculators` — **6 sub-units**, spec extracted to `docs/spec/tools-calculators.md`
      - [x] shared widget chrome — `ToolCard` · `ToolPanel` · `ToolSlider` · `ResultBox` · `SegmentBar` · `ToolFlag` + `format.ts`
      - [x] 1 · 50/30/20 Budget Checker — 7 format tests · 7 viewports · keyboard-drivable slider
      - 11 tests across 2-6 · runtime-verified at 1440/320/640×320 · 3 new shared primitives
        (`ToolNote` · `ToolChips` · `ToolBars`) · **AA fix: `text-on-dark-faint` was never a token,
        so 3 label styles rendered invisible dark-on-dark — now `on-dark-muted`, guarded by
        `tests/unit/design-tokens.test.ts`** · `--text-3xs` added so box labels stop wrapping ·
        chip tap area raised to 44px under coarse pointers
      - [x] 2 · Retirement Corpus Calculator
      - [x] 3 · P/E Valuation Quick-Check
      - [x] 4 · Post-Tax Return Comparator
      - [x] 5 · Portfolio Balance Scorecard
      - [x] 6 · SIP Growth Visualiser
- [x] `CtaSection` — **found by F4** (spec line 1487). 3 tests · reuses the extracted `IconStrip`
      primitive · its "Request a Session" button ships with `RequestModal`
- [ ] `Gallery` *(drives F2)*
- [ ] `RequestModal` *(drives F3)*
- [ ] `PostSessionModal` — **found by F4** (spec line 1768). Shot checklist + uploader + consent,
      reachable from the landing page. Needs F3 **and** file upload; the heaviest unit left in P1
- [ ] **page checks** — parity · functional completeness · e2e + metadata · `pnpm verify`

**P2 · empanelment → `/practitioners`** — not started (13 sections)
**P3 · practitioner-rating → `/rate`** — not started (7 sections)
**P4 · session-consent → `/consent`** — not started (8 sections)
**P5 · postsession-photos → `/submit-photos`** — not started (10 sections)
**P6 · onboarding → `/onboarding`** — not started (7 sections)
**P7 · user-setup → `/join-admin`** — not started (5 sections + auth)
**P8 · admin-console → `/console` `/globaladmin` `/user`** — not started (4 sub-phases)

**Hardening** — H1 security · H2 performance · H3 SEO+a11y · H4 operate. All pending; they run
after the last page.

---

## 1. The 29 SDLC points sort into three rhythms

Running all 29 as a waterfall is what creates the fog. They are not one sequence.

| Bucket | When | Points |
|---|---|---|
| **Foundation** — build once, everything depends on it | Before section 1 | 2 architecture · 3 tech · 5 design tokens · 8 state model · 12 layering · 13 DB · 14 API contract · 15 auth · 21 gates · 22 git · 23 CI · 24 environments |
| **Per section** — the repeating gate | Every section, identically | 6 responsive · 7 clean code · 9 skeletons · 10 errors · 11 forms · 17 a11y · 20 tests · content parity |
| **Hardening** — once, before launch | After the last section | 16 security · 18 SEO · 19 performance · 25 observability · 26 backup/DR · 28 analytics |

Points **1 (requirements)** and **4 (UX flows)** are already answered: the eight V7 HTML files plus
`iqcommune-automated-operating-procedure.md` are the spec and the flows, written by the client.
Points **27 (docs)** and **29 (evolution)** run continuously — an ADR per architectural decision.

## 2. Four levels of granularity

```
Primitive    components/ui/                     Button · Input · Card · Modal · Skeleton
   ↑
Component    features/<page>/components/         ModuleCard · FaqAccordion · StatTile
   ↑
Section      features/<page>/sections/           Hero · PoolStats · Faqs · Gallery
   ↑
Page         app/<route>/page.tsx                ~40 lines of composition, nothing else
```

**Why this matters more than it looks.** The old app's landing page is 1,596 lines and
`AgreementViewer` is 1,447 — not from bad code, but because they were built as *pages* and simply
grew. If every section is its own file from the first commit, a 1,596-line page file becomes
structurally impossible. The page can only ever be a list of sections.

**Primitives are discovered, not guessed.** Build a primitive when a section needs it; extract it
into `components/ui/` at the **second** use. Identical structure with different data becomes one
data-driven component at occurrence #2 — never six pasted cards.

---

## 3. Phase F — Foundation, before section 1

Deliberately thin. Everything else is discovered by building.

| # | Deliverable | Why first |
|---|---|---|
| **F0** | Design tokens in `app/globals.css` `@theme` — ink/cream/gold, type scale, spacing, radius, shadow, motion + ESLint rules banning raw hex and raw size literals | Every component references these. Retrofitting tokens later is the 1,575-inline-style problem again |
| **F1** | App shell — `layout.tsx`, `error.tsx`, **`global-error.tsx`**, `not-found.tsx`, `ErrorBoundary`, `loading.tsx` convention | Error and loading boundaries must exist before anything can fail or be slow |
| **F2** | Data layer — Supabase server/browser clients · `lib/env.ts` fail-fast validation · logger **with a per-request trace ID** · the `services/` pattern · **one** API response envelope + typed error codes · rate limiting | The old app forked its success envelope five ways because this was never decided once |
| **F3** | Database — migrations carrying forward the proven schema **minus every payment/tax column**, with indexes, FK constraints, soft-delete and retention | Schema churn after sections exist is the expensive kind |
| **F4** | **Content-parity gate** — extracts every visible string from the eight V7 files, renders each route, diffs, fails the build on any V7 string missing | This is the answer to "text will go missing." A worry becomes a build failure. Runs from section 1 onward |

CI, the `typecheck` script and `--max-warnings 0` are already in place.

**Auth is deliberately not in Foundation.** It is built as its own page-sized unit (P4) once three
simpler pages have proven the pattern — it is the highest-risk piece and should not be written first.

---

## 4. Phase P — Pages, ordered by dependency depth

**Not by line count.** Once the unit of work is a section, page size stops mattering — a
2,242-line page is fourteen small sections, and roughly 440 of those lines are content arrays,
which is transcription rather than logic. What actually decides the order is **how much invisible
foundation a page needs before it can render at all.**

On that axis the landing page is the *shallowest* page in the spec and the token flow pages are the
deepest:

| Page | Lines | Needs before it can run |
|---|---|---|
| landing | 2,242 | F0 + F1. That is all, for eleven of its fourteen sections |
| `/rate` | 227 | F0 + F1 + **F2 data layer** + **F3 schema** + HMAC token verification |
| `/consent` | 205 | all of the above + signature capture + PDF |

Starting with `/rate` because it is "small" really means *building the entire data layer and
database schema first, before anything visible exists* — a lot of invisible work for a 227-line
payoff. Starting with the landing page inverts that: visible progress immediately, and each
foundation piece gets built at the moment a section genuinely demands it.

| # | Page | Lines | Route | Sections, ordered simple → complex within the page |
|---|---|---|---|---|
| **P1** | main-landing-page | 2,242 | `/` | **`Footer`** · **`Nav`** · `Hero` · `PoolStats` · `TrustBar` · `AudienceRibbon` · `TrainerComparison` · `WhoIsThisFor` · `TrainingTopics` · `BundledSessions` · `HowItWorks` · `Takeaways` · `Faqs` · `ToolsCalculators` · `CtaSection` · `Gallery` *(drives F2)* · `RequestModal` *(drives F3)* · `PostSessionModal` |
| **P2** | empanelment | 1,343 | `/practitioners` | `Hero` · `PerksCard` · `TrustBar` · `RolesGrid` · `ProcessSteps` · `DivisionOfWork` · `ModulesGrid` · `BundleNudge` · `FitLists` · `DisclosureCards` · `ApplyCta` *(3 bullets + button)* · **`ApplyModal`** · `Faqs` |
| **P3** | practitioner-rating | 227 | `/rate` | `SessionDetailsCard` · `StarRating` · `Comments` · `SubmitBar` · `SuccessReceipt` · `AlreadyRated` · `InvalidLink` |
| **P4** | session-consent | 205 | `/consent` | `Header` · `RefBlock` · `SessionDetails` · `PayoutBlock` *(gross only)* · `ConsentChecklist` *(3 items)* · `SignBar` · `SuccessCard` · `InvalidLink` |
| **P5** | postsession-photos | 385 | `/submit-photos` | `Stepper` · `Intro` · `IdentityStrip` · `SessionBand` · `StoragePolicy` · `ShotChecklist` · `Uploader` · `ConsentBox` · `SubmitBar` · `SuccessReceipt` |
| **P6** | onboarding | 709 | `/onboarding` | `Stepper` · `DetailsSummary` · `AgreementBody` *(clauses 1–13, incl. rewritten 3(a)–(d) and 4A)* · `SignChecklist` · `SignaturePad` *(draw/type)* · `SubmitBar` · `SuccessReceipt` |
| **P7** | user-setup | 159 | `/join-admin` | **+ auth foundation** · `ReadOnlyIdentity` · `PasswordForm` · `SubmitBar` · `SuccessCard` · `InviteUnavailable` |
| **P8** | admin-console | 3,761 | `/console` `/globaladmin` `/user` | **P8a** shell + nav + tabs + login · **P8b** Practitioners + Requests · **P8c** Sessions + Consent/Confirmations · **P8d** Payouts + Agreements + Gallery + Activity |

**These section lists are estimates until F4 checks them.** P1 was written as 14 sections; the
parity gate found **18**. Four units — `TrustBar`, `AudienceRibbon`, `CtaSection`,
`PostSessionModal` — were read past, two of them inside a region already marked done. Assume the
same undercount in P2–P8 and treat their counts as lower bounds. The gate, not the reader, closes
each page.

`Nav` and `Footer` appear only in P1 because they are **shared chrome used by all eight pages** —
built once, inherited free by everything after. That makes `Footer` the highest-leverage first
section in the project, and it is also the smallest.

**Foundation arrives on demand, not up front.** `Gallery` is the first section needing an API read,
so it drives F2. `RequestModal` is the first needing validation and a database write, so it drives
F3. `/join-admin` is the first needing auth, so it drives that — which is why it sits at P7, once
the pattern is established, rather than being written first.

**The trade being accepted:** the first complete end-to-end database journey now lands at the *end*
of P1 (`RequestModal`) rather than on day one. That is acceptable because the schema is not a guess
— it is carried forward from a system running in production today. The real unknowns are in the UI,
and P1 attacks those immediately.

---

## 5. Definition of Done

### Per section — 8 checks

1. **States** — 8 on every interactive control (default/hover/focus/active/disabled/loading/error/success); empty + loading + error on every data view.
2. **Responsive** — 320 · 480 · 768 · 1024 · 1440 · 1920 **and 640×320 landscape**, the one that catches unreachable content. No horizontal scroll, no hover-only affordance.
3. **Keyboard & a11y** — Escape + focus trap on anything modal, visible focus ring, sane tab order, every input has an associated `<label>`, heading hierarchy intact.
4. **Skeleton** — on its async boundary. No blank screen, ever.
5. **Error path** — human message + a recovery action; technical detail to the log with the trace ID. A failed request must never render as "empty".
6. **Validation** — one Zod schema used by both the client form and the server route. Never two.
7. **Clean code** — no dead code, no placeholder handler, no copy hardcoded inside a component that should take props.
8. **Component test.**

### Per page — 4 checks, once its sections are all done

1. **Content parity** — the gate reports **0** V7 strings missing for this route.
2. **Functional completeness** — every control wired and *exercised in the running app*; the write confirmed by re-reading the database, not the optimistic UI. Emit the verdict line.
3. **E2E happy path** + metadata / SEO / `noindex` as applicable.
4. **`pnpm verify` green** — lint (0 warnings), typecheck, tests, build.

---

## 6. Phase H — Hardening, once, before launch

| # | Gate |
|---|---|
| **H1** | Security — OWASP pass, **every route's auth guard re-audited**, rate limits confirmed, `pnpm audit` clean, no admin route indexable |
| **H2** | Performance — LCP ≤ 2.5s · INP ≤ 200ms · CLS < 0.1 · `next/image` throughout · bundle check on client-heavy routes |
| **H3** | SEO + a11y sweep — metadata and canonicals per route, JSON-LD, sitemap, WCAG 2.2 AA |
| **H4** | Operate — error reporting, `/health`, funnel analytics, **and a restore tested from a real backup before any destructive cron is enabled** |

H4's last clause is not optional. The previous system ran three nightly permanent-delete crons with
no verified backup behind them. That must not be rebuilt.

---

## 7. Working agreement

- **One section in flight *per lane*.** No starting the next while the current has open items.
- **An ADR for every architectural decision** in `docs/adr/`. The V1–V6 confusion came from
  decisions nobody wrote down, not from bad code.
- **Migrations additive first** — expand → backfill → contract. Never a drop in one deploy.
- **Nothing merges red.** `continue-on-error` never gets added.

### 7.1 Parallel page lanes

The unit of parallelism is **one page**, never two sections of the same page. Sibling sections
collide on the `page.tsx` that composes them; two different pages share no file. That distinction
is the whole rule — see `docs/adr/0002-parallel-page-lanes.md`.

```
git worktree add ../v7-p2 -b p2-practitioners
```

Each lane owns exactly one `features/<domain>/**` tree plus its own `app/<route>/**`. It commits on
its own branch in its own worktree, and merges only when `pnpm verify` is green **in that worktree,
rebased on `main`**.

**Serial-owned — the integrator's files, never touched inside a lane:**

| | |
|---|---|
| `app/globals.css` · `app/layout.tsx` | tokens and root shell — one writer, always |
| `components/ui/**` · `components/layout/**` | primitives and shared chrome, used by all eight pages |
| `supabase/migrations/**` · `lib/env.ts` · `lib/schemas/**` | schema and contracts |
| `package.json` · `pnpm-lock.yaml` · `.gitignore` · `eslint.config.mjs` · `tsconfig.json` | project config |
| `docs/BUILD-PLAN.md` | this file |

A lane that needs a new primitive or token **requests** it and waits; it does not create one. Two
lanes inventing the same `Button` is precisely the duplication this project exists to avoid.

**Read-only work stays unlimited.** Audits, reviews, spec extraction and research fan out freely at
any width — they cannot collide because they write nothing.

### 7.2 A lane opens only when its foundation exists

This is what actually gates concurrency, not willingness to parallelize. A lane whose foundation is
missing will build the foundation *inside the lane* — the one guaranteed way to produce two
conflicting data layers.

| Lane | Needs | Openable |
|---|---|---|
| P1 `/` | F0 + F1 | **now** — in flight |
| P2 `/practitioners` | F0 + F1 only (static + one modal) | **now** — the one lane that can open today |
| P3 `/rate` · P4 `/consent` · P5 `/submit-photos` · P6 `/onboarding` | + F2 data layer + F3 schema | once F2 + F3 land |
| P7 `/join-admin` | + auth | after P3–P6 prove the write path |
| P8 `/console` | + auth + every service above | last, and it subdivides into P8a–P8d as its own lanes |

**Therefore F2 and F3 are pulled forward and built next, out of dependency order**, immediately
after P1's `Gallery` and `RequestModal` force them into existence. They are the gate on four
lanes; every hour they stay unbuilt is an hour those four lanes cannot start. The schema is carried
forward from a system in production today, so this is transcription, not design.

### 7.3 Integration

One integrator, serially, on `main`:

1. Lane reports green — `pnpm verify` passing in its own worktree.
2. Integrator rebases the lane on `main` and re-runs `pnpm verify`. Green in isolation is not green
   after a rebase; the second run is the one that counts.
3. Integrator composes the route into `app/` and updates §0 progress.
4. Merge. Never a merge on a lane's own say-so.

---
---

# Part II — Universal software delivery operating system

> **Scope note.** Part II is project-independent. It defines *the method*; Part I above is *this
> project's instance of it*. Nothing in Part II overrides a Part I decision — Part I already
> resolved these questions against the V7 spec and its deadline.

**Foundation numbering differs between the two parts.** Part I's `F0…F4` are commit-referenced and
stay as they are. Part II uses its own generic `F0…F6`. The crosswalk:

| Part II (generic) | Part I (this project) | State |
|---|---|---|
| F0 architecture and boundaries | ADR `0001-rebuild-v7-in-a-new-project.md` + §2 granularity | done |
| F1 design system and tokens | **F0** design tokens + lint guards | done — `db57978` |
| F2 application shell | **F1** app shell | done — `e3f7b39` |
| F3 data layer | **F2** data layer | on demand — driven by `Gallery` |
| F4 database and persistence | **F3** database + schema | on demand — driven by `RequestModal` |
| F5 authentication and authorization | **auth** | on demand — driven by P7 `/join-admin` |
| F6 quality gates | `pnpm verify` + CI | done |
| §6 content parity | **F4** content-parity gate | pending |

---

## Purpose

This document defines how a production-grade web application is designed, built, verified, hardened, and operated.

It is designed for:

* Human developers
* AI coding agents
* Multi-agent development systems
* Local LLM workflows
* Large applications with thousands to hundreds of thousands of lines of code
* Greenfield projects
* Rebuilds and migrations
* UI clones based on an existing source of truth
* Incremental feature development

The goal is not merely to produce working code.

The goal is to produce a system that is:

* Correct
* Maintainable
* Testable
* Accessible
* Responsive
* Secure
* Observable
* Recoverable
* Evolvable
* Consistent with its source of truth

---

## 0. THE CORE OPERATING RULE

### The unit of work is one bounded feature unit.

Never treat an entire application, page, module, or massive feature as one unit of work.

The preferred hierarchy is:

```text
Application
    ↓
Domain / Product Area
    ↓
Page / Route / Workflow
    ↓
Section / Feature
    ↓
Component
    ↓
Primitive
```

The implementation unit should normally be:

```text
ONE SECTION / FEATURE
```

A feature unit must be:

1. Clearly scoped
2. Independently understandable
3. Independently testable
4. Independently verifiable
5. Small enough for one implementation cycle
6. Large enough to deliver meaningful behavior

---

### One feature unit in flight

Only one implementation unit should be actively modified at a time.

The current unit must not be considered complete until:

* Its implementation is finished
* Its required states exist
* Its responsive behavior is verified
* Its accessibility behavior is verified
* Its loading behavior is verified
* Its error behavior is verified
* Its validation is verified
* Its tests pass
* Its code quality is verified
* Its source-of-truth parity is verified where applicable

Then, and only then, move to the next unit.

---

## 1. STOP CONDITION

The project continues until:

```text
All required product areas
        ↓
All required features
        ↓
All required verification gates
        ↓
All required hardening gates
        ↓
Production readiness
```

The project may stop early only when:

1. The complete product scope is finished, or
2. A genuine blocking decision is required, or
3. A technical dependency makes continued implementation unsafe

Do not stop merely because:

* A feature appears visually complete
* The happy path works
* The code compiles
* The page renders
* The AI agent says it is finished
* A screenshot looks correct

Completion requires evidence.

---

## 2. PROJECT PROGRESS TRACKER

Maintain a living progress tracker.

Use:

```text
[x] Complete and verified
[~] In progress
[ ] Pending
[!] Blocked
```

Example:

```text
FOUNDATION

[x] Design tokens
[x] Application shell
[x] Error boundaries
[ ] Data layer
[ ] Database
[ ] API contracts
[ ] Authentication
[ ] Content parity gate
[ ] CI verification

PRODUCT AREA A

[x] Shared navigation
[x] Shared footer
[x] Primary feature
[ ] Secondary feature
[ ] Data-driven feature
[ ] Modal workflow
[ ] Page verification

PRODUCT AREA B

[ ] Feature 1
[ ] Feature 2
[ ] Feature 3

HARDENING

[ ] Security
[ ] Performance
[ ] SEO
[ ] Accessibility sweep
[ ] Observability
[ ] Backup and recovery
[ ] Analytics
```

Every completed item must have:

```text
Implementation
    ↓
Verification
    ↓
Evidence
    ↓
Progress update
```

Never mark a feature complete based only on implementation.

---

## 3. THE SOFTWARE DEVELOPMENT LIFECYCLE

The complete SDLC is divided into three operating rhythms.

### Rhythm A — Foundation

Build once, before the system becomes too complex.

Includes:

* Architecture
* Technology decisions
* Design system
* State model
* Layering
* Data architecture
* Database architecture
* API contracts
* Authentication architecture
* Testing infrastructure
* CI/CD
* Environments
* Quality gates
* Security baseline

---

### Rhythm B — Feature Delivery

Repeat for every feature unit.

Includes:

* Requirements
* UI implementation
* Responsive behavior
* Loading states
* Empty states
* Error states
* Validation
* Accessibility
* Testing
* Source-of-truth parity
* Code review
* Verification

---

### Rhythm C — Hardening

Perform after the functional product is complete.

Includes:

* Security audit
* Performance optimization
* SEO
* Accessibility audit
* Observability
* Disaster recovery
* Backup restoration
* Analytics
* Operational readiness

---

## 4. FOUNDATION PHASE

The foundation must be deliberately thin.

Do not build every possible infrastructure system before the product needs it.

Build the minimum foundation required to safely begin implementation.

---

### F0 — Architecture and boundaries

Define:

* Application architecture
* Domain boundaries
* Feature boundaries
* Layer boundaries
* Dependency rules
* Data flow
* Server/client boundaries
* External integration boundaries
* Error propagation strategy
* State ownership

The architecture must answer:

```text
Where does this code belong?

Who owns this state?

Who may call this service?

Where does validation happen?

Where does data enter the system?

Where does data leave the system?

What may depend on what?
```

---

### F1 — Design system and tokens

Define centralized tokens for:

* Colors
* Typography
* Font sizes
* Font weights
* Line heights
* Spacing
* Border radius
* Shadows
* Motion
* Breakpoints
* Z-index layers

Prefer:

```text
Design Token
    ↓
Component
    ↓
Feature
```

Avoid:

```text
Random value
Random value
Random value
Random value
```

Enforce tokens through linting or static analysis where practical.

Prevent:

* Raw color duplication
* Random spacing values
* Uncontrolled typography
* Inconsistent border radii
* Uncontrolled animation values

---

### F2 — Application shell

Before complex features are built, establish:

* Root layout
* Loading boundaries
* Error boundaries
* Global error handling
* Not-found handling
* Application-level fallback behavior
* Environment configuration
* Logging foundation

A failure must have a defined destination.

```text
Error
  ↓
Capture
  ↓
Log
  ↓
Trace
  ↓
Human-readable response
  ↓
Recovery action
```

Never allow an unhandled failure to silently become:

```text
Empty screen
```

or:

```text
No data
```

---

### F3 — Data layer

Build the data layer when the first feature genuinely requires persistent or remote data.

The data layer should define:

* Server-side data access
* Client-side data access
* Service boundaries
* Request lifecycle
* Error handling
* Logging
* Request tracing
* Response types
* Error codes
* Retry strategy
* Rate limiting where required

Use one consistent response model.

For example:

```text
Success
{
  data,
  error: null,
  meta
}
```

```text
Failure
{
  data: null,
  error: {
    code,
    message,
    traceId
  },
  meta
}
```

Do not allow every feature to invent its own response format.

---

### F4 — Database and persistence

Build the database architecture when the first real write operation requires it.

Define:

* Tables or collections
* Relationships
* Constraints
* Indexes
* Ownership
* Retention
* Soft deletion where appropriate
* Audit requirements
* Migration strategy

Database changes must follow:

```text
EXPAND
  ↓
BACKFILL
  ↓
CONTRACT
```

Avoid destructive one-step migrations in production.

Never casually:

```text
DROP
    ↓
DEPLOY
    ↓
HOPE
```

---

### F5 — Authentication and authorization

Authentication should be implemented when the product genuinely requires it.

Define:

* Identity model
* Sessions
* Roles
* Permissions
* Route protection
* API protection
* Admin protection
* Token lifecycle
* Recovery flow
* Audit requirements

Authorization must be enforced server-side.

Never rely only on:

```text
Hidden button
```

or:

```text
Frontend route protection
```

The actual security boundary must exist at the server/data layer.

---

### F6 — Quality gates

Define the commands that determine whether the project is healthy.

The verification pipeline should normally include:

```text
Lint
    ↓
Typecheck
    ↓
Unit tests
    ↓
Integration tests
    ↓
E2E tests
    ↓
Build
    ↓
Security checks
```

A project must not merge red.

Do not use:

```text
continue-on-error
```

to hide failures.

Do not weaken verification merely to make CI green.

---

## 5. REQUIREMENTS AND SOURCE OF TRUTH

Before implementation, identify the source of truth.

The source of truth may be:

* Product requirements
* Design files
* Existing application
* Screenshots
* Videos
* HTML
* Existing code
* API specifications
* Database schema
* Legal or business requirements
* Client-provided content

For each feature, identify:

```text
What must exist?
What must it look like?
What must it do?
What states must it support?
What data does it require?
What constraints apply?
```

Never implement from vague assumptions when a source of truth exists.

---

## 6. CONTENT PARITY

For rebuilds, migrations, and clones, content parity must be treated as an engineering requirement.

The system should be able to verify:

```text
Source of truth
        ↓
Extract visible content
        ↓
Render new implementation
        ↓
Compare
        ↓
Report missing content
```

The goal is to detect:

* Missing headings
* Missing labels
* Missing descriptions
* Missing button text
* Missing FAQ content
* Missing error messages
* Missing metadata
* Missing legal copy

Where possible:

```text
Missing content
        ↓
Automated failure
```

Do not rely exclusively on manual memory.

---

## 7. ARCHITECTURAL GRANULARITY

Use the following hierarchy:

```text
Primitive
components/ui/

Button
Input
Card
Modal
Skeleton
Tooltip

        ↑

Component
features/<domain>/components/

DataTable
FormField
FeatureCard
Accordion

        ↑

Feature / Section
features/<domain>/sections/

Hero
Gallery
Dashboard
Checkout
Onboarding

        ↑

Page / Route
app/<route>/page.tsx
```

The page should primarily compose features.

Avoid putting large amounts of business logic directly into route files.

Prefer:

```text
Page
  ↓
Feature sections
  ↓
Components
  ↓
Primitives
```

---

## 8. ABSTRACTION RULES

Do not abstract based on imagination.

Abstract based on real repetition.

#### First use

Build the feature locally.

#### Second use

Evaluate whether the structure should become reusable.

#### Repeated structure with different data

Use a data-driven component.

Example:

```text
One component
    +
Different data
    =
Reusable system
```

Avoid:

```text
CardA
CardB
CardC
CardD
CardE
CardF
```

when the only difference is data.

However, do not create a generic abstraction that has no real second use.

The rule is:

> **Discover abstractions through repetition.**

---

## 9. FEATURE DELIVERY WORKFLOW

Every feature follows the same lifecycle.

```text
1. Understand
      ↓
2. Inspect
      ↓
3. Plan
      ↓
4. Implement
      ↓
5. Verify
      ↓
6. Review
      ↓
7. Record evidence
      ↓
8. Mark complete
```

---

### Step 1 — Understand

Read:

* Requirements
* Source of truth
* Existing architecture
* Related features
* Relevant ADRs
* Existing tests

Determine:

```text
What is being built?
Why is it being built?
What does it depend on?
What depends on it?
```

---

### Step 2 — Inspect

Before editing:

* Inspect the repository
* Inspect relevant files
* Inspect existing patterns
* Inspect existing dependencies
* Inspect existing tests
* Inspect existing data models
* Inspect existing APIs

Never blindly overwrite existing code.

---

### Step 3 — Create a feature contract

Every feature should have a bounded contract.

```text
FEATURE CONTRACT

Name:
Purpose:

Source of truth:

Allowed files:

Forbidden files:

Dependencies:

Inputs:

Outputs:

States:

Responsive requirements:

Accessibility requirements:

Loading requirements:

Error requirements:

Validation requirements:

Data requirements:

Tests required:

Completion evidence:
```

This contract is especially important for AI coding agents.

---

### Step 4 — Implement

Implement only the current feature.

Do not silently expand scope.

Avoid:

* Unrelated refactoring
* Opportunistic rewrites
* Large architecture changes
* Unrequested dependency changes
* Modifying unrelated features

If an architectural problem is discovered:

```text
Stop
    ↓
Document
    ↓
Create decision
    ↓
Resolve
    ↓
Continue
```

---

## 10. THE EIGHT FEATURE COMPLETION CHECKS

Every feature must pass these checks.

---

### Check 1 — Complete state model

Every interactive control should consider:

```text
Default
Hover
Focus
Active
Disabled
Loading
Error
Success
```

Every data-driven view should consider:

```text
Loading
Empty
Error
Success
```

Not every state is necessarily visually different, but every state must be intentionally handled.

---

### Check 2 — Responsive behavior

Verify at meaningful viewport sizes.

At minimum:

```text
320px
480px
768px
1024px
1440px
1920px
```

Also test a landscape viewport such as:

```text
640 × 320
```

Verify:

* No horizontal overflow
* No clipped content
* No unreachable controls
* No broken layout
* No hover-only functionality
* No unusable mobile interactions

Responsive design is not:

```text
Desktop
    ↓
Shrink everything
```

It is:

```text
Different viewport
    ↓
Different layout constraints
    ↓
Intentional adaptation
```

---

### Check 3 — Keyboard and accessibility

Verify:

* Keyboard navigation
* Visible focus states
* Logical tab order
* Escape behavior
* Focus trapping for modals
* Accessible labels
* Form associations
* Heading hierarchy
* Semantic HTML
* Screen-reader meaning
* Sufficient target sizes

Every form input must have an associated label.

Every interactive element must be usable without a mouse.

---

### Check 4 — Loading behavior

Every asynchronous boundary should have an intentional loading state.

Prefer:

```text
Loading
    ↓
Skeleton / Progress / Placeholder
```

Avoid:

```text
Loading
    ↓
Blank page
```

A blank screen is not a loading strategy.

---

### Check 5 — Error behavior

Every meaningful failure must provide:

```text
Human-readable explanation
        +
Recovery action where possible
```

Technical details should be logged separately.

Example:

```text
User:
"Unable to load this information. Please try again."

System log:
traceId
error code
technical details
request context
```

Never silently convert failure into empty content.

---

### Check 6 — Validation

Validation must have a single source of truth.

Prefer:

```text
Shared schema
      ↓
Client validation
      +
Server validation
```

Never trust client-side validation alone.

The server must always validate untrusted input.

---

### Check 7 — Clean code

Before completion, verify:

* No dead code
* No unused imports
* No placeholder handlers
* No fake success behavior
* No unexplained duplication
* No accidental hardcoded content
* No hidden TODOs pretending to be complete
* No unrelated changes
* No unnecessary complexity

A feature is not complete if the visible UI works while the underlying handler is fake.

---

### Check 8 — Automated tests

The feature must have appropriate tests.

Possible layers:

```text
Unit test
    ↓
Component test
    ↓
Integration test
    ↓
E2E test
```

Use the lowest appropriate test level for each behavior.

Critical user journeys should be tested end-to-end.

---

## 11. PAGE / WORKFLOW COMPLETION CHECKS

After all feature units within a page or workflow are complete, perform a higher-level verification.

---

### Page Check 1 — Source-of-truth parity

Verify:

```text
Required content
Required structure
Required behavior
Required states
```

All expected content must be present.

---

### Page Check 2 — Functional completeness

Every control must be:

```text
Rendered
    ↓
Interactive
    ↓
Connected to real behavior
    ↓
Verified in the running application
```

Do not count:

```text
Button exists
```

as:

```text
Feature works
```

For data writes:

```text
User submits
    ↓
Server processes
    ↓
Database writes
    ↓
Database is read again
    ↓
Result is confirmed
```

Do not verify only against optimistic UI state.

---

### Page Check 3 — End-to-end flow

Test the actual user journey.

Verify:

```text
Entry
    ↓
Interaction
    ↓
Validation
    ↓
Loading
    ↓
Success / Error
    ↓
Persistence
    ↓
Final result
```

Also verify:

* Metadata
* SEO
* Indexing behavior
* Redirects
* Authentication requirements

---

### Page Check 4 — Full verification

The project verification pipeline must pass:

```text
Lint
    ↓
Typecheck
    ↓
Unit tests
    ↓
Integration tests
    ↓
E2E tests
    ↓
Build
```

No warnings should be casually ignored.

---

## 12. DEPENDENCY-DRIVEN BUILD ORDER

Build order should be determined by dependency depth, not by:

* Page size
* File size
* Number of lines
* Perceived importance
* What looks easiest

Ask:

```text
What can be built with the current foundation?
```

Then:

```text
What is the next feature that naturally requires new infrastructure?
```

Example:

```text
Static feature
    ↓
Remote data feature
    ↓
Data layer
    ↓
Write workflow
    ↓
Database
    ↓
Authentication
    ↓
Advanced workflows
```

This approach avoids building massive invisible infrastructure before the product has proven that it needs it.

---

## 13. AI AGENT OPERATING MODEL

AI agents must not be given unlimited ambiguous scope.

Each agent receives:

```text
Current feature
    ↓
Feature contract
    ↓
Source of truth
    ↓
Allowed scope
    ↓
Verification requirements
```

The agent must:

1. Read the feature contract
2. Inspect the current code
3. Inspect related patterns
4. Plan the implementation
5. Implement only the current unit
6. Run required verification
7. Fix failures
8. Produce evidence
9. Stop

The agent must not:

* Rewrite unrelated architecture
* Modify unrelated features
* Skip tests
* Ignore errors
* Mark incomplete work as complete
* Invent requirements
* Replace working code without justification

---

## 14. MULTI-AGENT DEVELOPMENT

Parallelism is allowed for read-only work.

Examples:

```text
Agent A → Architecture audit
Agent B → Accessibility audit
Agent C → Security review
Agent D → Performance review
```

But implementation writes should be controlled.

Preferred model:

```text
Many agents review
        ↓
One implementation stream
        ↓
One verification state
```

Avoid multiple agents simultaneously modifying the same composition layer.

If parallel implementation is necessary:

```text
Independent ownership boundaries
        ↓
Separate branches/worktrees
        ↓
Controlled integration
        ↓
Full verification
```

---

## 15. ARCHITECTURAL DECISION RECORDS

Every meaningful architectural decision should be recorded.

An ADR should contain:

```text
Decision:
Context:
Options considered:
Chosen option:
Why:
Tradeoffs:
Consequences:
Date:
Status:
```

Examples:

* Why this database was selected
* Why this state management approach was selected
* Why a service boundary exists
* Why a migration strategy was chosen
* Why authentication is delayed
* Why a component is shared
* Why a feature remains isolated

The purpose is to prevent:

```text
Decision
    ↓
Time passes
    ↓
Context disappears
    ↓
Someone reverses it accidentally
```

---

## 16. MIGRATION SAFETY

All schema and infrastructure changes must consider existing systems.

Preferred migration pattern:

```text
1. Expand
   Add compatible structure

2. Deploy

3. Backfill
   Move or transform existing data

4. Migrate consumers

5. Verify

6. Contract
   Remove obsolete structure later
```

Avoid destructive migrations without:

* Backup
* Rollback plan
* Verification
* Recovery path

---

## 17. SECURITY HARDENING

Before production, perform a security review.

Verify:

* Authentication
* Authorization
* Session management
* Input validation
* Output encoding
* CSRF protection where applicable
* Rate limiting
* Secret handling
* Dependency vulnerabilities
* Injection risks
* File upload security
* Access control
* Admin route protection
* Logging of security events
* Sensitive data exposure

Review every protected route again.

Do not assume that because authentication exists, authorization is correct.

---

## 18. PERFORMANCE HARDENING

Measure real performance.

Verify:

* Largest Contentful Paint
* Interaction to Next Paint
* Cumulative Layout Shift
* JavaScript bundle size
* Image optimization
* Font loading
* Client-side rendering cost
* Database query performance
* API latency
* Cache behavior

Performance should be measured, not guessed.

---

## 19. SEO AND ACCESSIBILITY HARDENING

Perform a final system-wide review.

Verify:

* Metadata
* Titles
* Descriptions
* Canonicals
* Structured data
* Sitemap
* Robots behavior
* Indexing rules
* Semantic HTML
* Keyboard access
* Focus behavior
* Contrast
* Labels
* Screen-reader behavior

Target the applicable accessibility standard.

---

## 20. OBSERVABILITY AND OPERATIONS

A production system must be diagnosable.

Define:

```text
Request
    ↓
Trace ID
    ↓
Logs
    ↓
Metrics
    ↓
Errors
    ↓
Alerts
```

At minimum, consider:

* Structured logs
* Request IDs
* Trace IDs
* Error reporting
* Health checks
* Metrics
* Deployment visibility
* Operational dashboards

A production bug should be answerable:

```text
What happened?
When?
To whom?
Which request?
Which service?
Which data?
Why?
```

---

## 21. BACKUP AND DISASTER RECOVERY

Backups are not complete until restoration has been tested.

The required sequence is:

```text
Backup
    ↓
Restore
    ↓
Verify restored system
    ↓
Document procedure
```

Before enabling destructive automation:

```text
Verified backup
        +
Verified restore
        =
Safe to proceed
```

Never enable permanent deletion workflows merely because a backup exists.

---

## 22. ANALYTICS

Analytics must be intentional.

Define:

* Important user actions
* Conversion events
* Funnel stages
* Error events
* Feature usage
* Performance events

Avoid collecting meaningless events simply because instrumentation is easy.

Analytics should answer:

```text
What are users doing?
Where are they failing?
Which workflows matter?
What should improve?
```

---

## 23. DOCUMENTATION

Documentation evolves with the system.

Maintain:

* Architecture documentation
* ADRs
* API documentation
* Database documentation
* Deployment documentation
* Environment documentation
* Recovery documentation
* Feature contracts
* Operational runbooks

Documentation should explain:

```text
What exists?
Why does it exist?
How does it work?
How do we change it?
How do we recover it?
```

---

## 24. DEFINITION OF DONE

A feature is done only when:

```text
Requirements understood
        ↓
Source of truth inspected
        ↓
Implementation complete
        ↓
All required states handled
        ↓
Responsive behavior verified
        ↓
Accessibility verified
        ↓
Loading behavior verified
        ↓
Error behavior verified
        ↓
Validation verified
        ↓
Tests pass
        ↓
Code quality verified
        ↓
Source parity verified
        ↓
Evidence recorded
```

A page or workflow is done only when:

```text
All features complete
        ↓
Functional journey verified
        ↓
E2E tests pass
        ↓
Metadata verified
        ↓
Full project verification passes
```

The application is launch-ready only when:

```text
All product scope complete
        ↓
Security complete
        ↓
Performance complete
        ↓
SEO complete
        ↓
Accessibility complete
        ↓
Observability complete
        ↓
Backup restoration tested
        ↓
Operational readiness confirmed
```

---

## 25. THE UNIVERSAL EXECUTION LOOP

The entire development process can be reduced to:

```text
UNDERSTAND
    ↓
INSPECT
    ↓
DEFINE BOUNDARIES
    ↓
PLAN
    ↓
IMPLEMENT ONE UNIT
    ↓
TEST
    ↓
VERIFY
    ↓
REVIEW
    ↓
RECORD DECISIONS
    ↓
RECORD EVIDENCE
    ↓
MOVE TO NEXT UNIT
```

Never skip directly from:

```text
Requirement
    ↓
Code
```

The correct flow is:

```text
Requirement
    ↓
Understanding
    ↓
Architecture
    ↓
Bounded feature contract
    ↓
Implementation
    ↓
Verification
    ↓
Evidence
```

---

## FINAL OPERATING PRINCIPLE

The system should be built so that:

> **No individual developer or AI agent needs to remember the entire application.**

The system itself must provide:

```text
Architecture
    +
Feature boundaries
    +
Source of truth
    +
ADRs
    +
Automated gates
    +
Tests
    +
Evidence
    +
Progress tracking
```

The result is a development process where:

```text
Small bounded work
        ↓
Strong verification
        ↓
Recorded decisions
        ↓
Controlled integration
        ↓
Continuous progress
```

This is how large applications become manageable.

The goal is not to make the AI "smart enough to build everything."

The goal is to design an engineering system in which:

```text
Even a limited agent
        +
Clear boundaries
        +
Strong context
        +
Deterministic verification
        +
Architectural memory
```

can reliably contribute to a very large production system.

**Build small. Verify completely. Record decisions. Introduce complexity only when required. Never allow unverified work to become the foundation of the next layer.**
