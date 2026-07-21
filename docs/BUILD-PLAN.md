# Build plan — how iqcommune-v7 gets built

**The unit of work is a section inside a page — never a whole page.**
Ordered by dependency depth, not line count. One section in flight at a time. Every section passes
the same eight checks; every page passes the same four. Nothing else to remember.

**Stop condition: all eight V7 pages cloned and passing their page checks.** Work continues section
by section until then; the only other reason to stop is a genuine problem that needs a decision.

---

## 0. Progress

`[x]` done and verified · `[ ]` pending. Updated as each unit lands.

**Foundation**

- [x] **F0** design tokens + lint guards — `db57978`
- [x] **F1** app shell: error / global-error / not-found / ErrorBoundary — `e3f7b39`
- [ ] **F2** data layer — built when `Gallery` needs an API read
- [ ] **F3** database + schema — built when `RequestModal` needs a write
- [ ] **F4** content-parity gate — built once P1 has routes to diff
- [ ] **auth** — built at P7, when `/join-admin` needs it

**P1 · main-landing-page → `/`**

- [x] `Footer` *(shared chrome — all 8 pages)* — 5 tests · 320/640×320/1440/1920 clean · AA fix + JSX space defect caught
- [x] `Nav` → `SiteHeader` *(shared chrome — all 8 pages)* — 5 tests · 7 viewports · strapline dropped <640px to stop a measured overflow · right-slot budget 162px @320px
      - [ ] its "Request a Session" button ships with `RequestModal` (needs the modal it opens)
- [ ] `Hero`
- [ ] `PoolStats`
- [ ] `TrainerComparison`
- [ ] `WhoIsThisFor`
- [ ] `TrainingTopics`
- [ ] `BundledSessions`
- [ ] `HowItWorks`
- [ ] `Takeaways`
- [ ] `Faqs`
- [ ] `ToolsCalculators`
- [ ] `Gallery` *(drives F2)*
- [ ] `RequestModal` *(drives F3)*
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
| **P1** | main-landing-page | 2,242 | `/` | **`Footer`** · **`Nav`** · `Hero` · `PoolStats` · `TrainerComparison` · `WhoIsThisFor` · `TrainingTopics` · `BundledSessions` · `HowItWorks` · `Takeaways` · `Faqs` · `ToolsCalculators` · `Gallery` *(drives F2)* · `RequestModal` *(drives F3)* |
| **P2** | empanelment | 1,343 | `/practitioners` | `Hero` · `PerksCard` · `TrustBar` · `RolesGrid` · `ProcessSteps` · `DivisionOfWork` · `ModulesGrid` · `BundleNudge` · `FitLists` · `DisclosureCards` · `ApplyCta` *(3 bullets + button)* · **`ApplyModal`** · `Faqs` |
| **P3** | practitioner-rating | 227 | `/rate` | `SessionDetailsCard` · `StarRating` · `Comments` · `SubmitBar` · `SuccessReceipt` · `AlreadyRated` · `InvalidLink` |
| **P4** | session-consent | 205 | `/consent` | `Header` · `RefBlock` · `SessionDetails` · `PayoutBlock` *(gross only)* · `ConsentChecklist` *(3 items)* · `SignBar` · `SuccessCard` · `InvalidLink` |
| **P5** | postsession-photos | 385 | `/submit-photos` | `Stepper` · `Intro` · `IdentityStrip` · `SessionBand` · `StoragePolicy` · `ShotChecklist` · `Uploader` · `ConsentBox` · `SubmitBar` · `SuccessReceipt` |
| **P6** | onboarding | 709 | `/onboarding` | `Stepper` · `DetailsSummary` · `AgreementBody` *(clauses 1–13, incl. rewritten 3(a)–(d) and 4A)* · `SignChecklist` · `SignaturePad` *(draw/type)* · `SubmitBar` · `SuccessReceipt` |
| **P7** | user-setup | 159 | `/join-admin` | **+ auth foundation** · `ReadOnlyIdentity` · `PasswordForm` · `SubmitBar` · `SuccessCard` · `InviteUnavailable` |
| **P8** | admin-console | 3,761 | `/console` `/globaladmin` `/user` | **P8a** shell + nav + tabs + login · **P8b** Practitioners + Requests · **P8c** Sessions + Consent/Confirmations · **P8d** Payouts + Agreements + Gallery + Activity |

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

- **One section in flight.** No starting the next while the current has open items.
- **Parallel work is read-only.** Audits and reviews fan out; every write is serial, applied by one
  hand. Two writers on sibling sections still collide on the page file that composes them.
- **An ADR for every architectural decision** in `docs/adr/`. The V1–V6 confusion came from
  decisions nobody wrote down, not from bad code.
- **Migrations additive first** — expand → backfill → contract. Never a drop in one deploy.
- **Nothing merges red.** `continue-on-error` never gets added.
