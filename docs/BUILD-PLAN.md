# Build plan — how iqcommune-v7 gets built

**The unit of work is a section inside a page — never a whole page.**
Smallest first, largest last. One section in flight at a time. Every section passes the same
eight checks; every page passes the same four. Nothing else to remember.

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

## 4. Phase P — Pages, smallest first

Ordered by **total work** (lines × dependencies), not line count alone. `user-setup` is the smallest
file but needs auth, so it waits; `landing` is the second-largest file but is nearly all static
content, so it comes late without risk.

| # | Page | Lines | Route | Sections (the actual units of work) |
|---|---|---|---|---|
| **P1** | practitioner-rating | 227 | `/rate` | `Nav` · `SessionDetailsCard` · `StarRating` · `Comments` · `SubmitBar` · `SuccessReceipt` · `AlreadyRated` · `InvalidLink` · `Footer` |
| **P2** | session-consent | 205 | `/consent` | `Nav` · `Header` · `RefBlock` · `SessionDetails` · `PayoutBlock` *(gross only)* · `ConsentChecklist` *(3 items)* · `SignBar` · `SuccessCard` · `InvalidLink` · `Footer` |
| **P3** | postsession-photos | 385 | `/submit-photos` | `Nav` · `Stepper` · `Intro` · `IdentityStrip` · `SessionBand` · `StoragePolicy` · `ShotChecklist` · `Uploader` · `ConsentBox` · `SubmitBar` · `SuccessReceipt` · `Footer` |
| **P4** | user-setup | 159 | `/join-admin` | **+ auth foundation** · `Nav` · `ReadOnlyIdentity` · `PasswordForm` · `SubmitBar` · `SuccessCard` · `InviteUnavailable` · `Footer` |
| **P5** | onboarding | 709 | `/onboarding` | `Nav` · `Stepper` · `DetailsSummary` · `AgreementBody` *(clauses 1–13, incl. rewritten 3(a)–(d) and 4A)* · `SignChecklist` · `SignaturePad` *(draw/type)* · `SubmitBar` · `SuccessReceipt` · `Footer` |
| **P6** | empanelment | 1,343 | `/practitioners` | `Nav` · `Hero` · `PerksCard` · `TrustBar` · `RolesGrid` · `ProcessSteps` · `DivisionOfWork` · `ModulesGrid` · `BundleNudge` · `FitLists` · `DisclosureCards` · `ApplyCta` *(3 bullets + button)* · **`ApplyModal`** · `Faqs` · `Footer` |
| **P7** | main-landing-page | 2,242 | `/` | `Nav` · `Hero` · `PoolStats` · `TrainerComparison` · `WhoIsThisFor` · `TrainingTopics` · `BundledSessions` · `HowItWorks` · `Takeaways` · `Faqs` · `ToolsCalculators` · `Gallery` · `RequestModal` · `Footer` |
| **P8** | admin-console | 3,761 | `/console` `/globaladmin` `/user` | **P8a** shell + nav + tabs + login · **P8b** Practitioners + Requests · **P8c** Sessions + Consent/Confirmations · **P8d** Payouts + Agreements + Gallery + Activity |

**P1 is the teacher.** At 227 lines it is the smallest *complete* journey — token link → read a
record → fill a form → validate → write → success → already-submitted. Every check gets exercised
end to end on a page small enough to hold in your head. By P8 the process is muscle memory and the
primitives already exist.

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
