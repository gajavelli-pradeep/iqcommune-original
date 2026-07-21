# ADR 0002 — Parallel page lanes, with a serially-owned shared surface

**Date:** 2026-07-21 · **Status:** Accepted · **Decision owner:** project owner

## Context

`BUILD-PLAN.md` §7 originally read: *"Parallel work is read-only. Audits and reviews fan out; every
write is serial, applied by one hand. Two writers on sibling sections still collide on the page file
that composes them."*

The justification is correct and it is also narrower than the rule it was used to defend. Two
writers on `Hero` and `TrainerComparison` do collide — both edit `app/page.tsx`. Two writers on
`/practitioners` and `/rate` share **no file at all**: separate `features/<domain>/` trees, separate
`app/<route>/` directories, separate tests. The collision argument was generalised from *within a
page* to *across pages*, where it does not hold.

The cost of that generalisation is measurable. Observed throughput on 2026-07-21 was 11 sections in
roughly three hours — genuinely fast. Remaining scope is ~50 further sections across P2–P7 plus the
3,761-line admin console, against a Thursday 2026-07-23 go-live (ADR 0001 already records that this
date is at risk). A single serial lane makes the arithmetic close to impossible; it is the binding
constraint, and it is self-imposed rather than technical.

Part II §14 of the same document already permits exactly this — *"if parallel implementation is
necessary: independent ownership boundaries → separate branches/worktrees → controlled integration"*
— so the plan contradicted itself once Part II was adopted.

## Decision

**Parallelise at the granularity of one page per lane, in its own git worktree, with an explicitly
enumerated set of serially-owned shared files that no lane may touch.**

- A lane owns one `features/<domain>/**` and its `app/<route>/**`. One section in flight *per lane*.
- Shared surface — `globals.css`, `app/layout.tsx`, `components/ui/**`, `components/layout/**`,
  `supabase/migrations/**`, `lib/env.ts`, `lib/schemas/**`, project config, `BUILD-PLAN.md` — is
  owned by one integrator and is never edited inside a lane.
- A lane that needs a new primitive or token requests it and waits.
- Merge requires `pnpm verify` green in the lane's worktree **and again after rebase onto `main`**,
  by the integrator.
- **A lane opens only when the foundation it depends on already exists.**

## Alternatives considered

**Keep the serial rule.** Safest, and honest about the fact that integration bugs cost more than
they appear to. Rejected because the deadline makes it a decision to miss the date rather than a
decision to be careful, and because the rule's own stated justification does not extend to
cross-page work.

**Parallelise at section granularity within a page.** Highest theoretical throughput. Rejected: it
is the one case where the original collision argument is exactly right — every section lands in the
same `page.tsx`, and `app/page.tsx` is deliberately the file this project protects from growth.

**Parallelise without worktrees, using one working copy and discipline.** Rejected outright.
Discipline is not an isolation mechanism; a plan that merely *assigns* lanes does not *enforce*
them. The worktree makes the boundary physical.

## Consequences

**Accepted:**
- Integration cost is real and lands on one person. Rebase conflicts on `app/` composition are
  expected; the second `pnpm verify` after rebase is the check that catches them, and it must never
  be skipped to save time.
- Duplicate primitives are the characteristic failure of this model — two lanes independently
  inventing the same card or button. Mitigated by the request-and-wait rule, not eliminated by it.
  The integrator must read for duplication at merge, not only for correctness.
- Review attention thins across concurrent lanes at exactly the moment ADR 0001 says drift must be
  *measured rather than trusted*. The content-parity gate and per-section tests carry more weight
  under this model than they did under the serial one.

**Gained:**
- Up to four lanes concurrent once F2 and F3 land, against one today.
- The foundation-readiness table makes an implicit dependency explicit: it was always true that
  `/rate` could not start before the data layer; now that fact is written down where it schedules
  work instead of surprising it.

## Follow-through

1. **Build F2 (data layer) and F3 (schema) next**, out of dependency order. They gate four lanes;
   until they exist, this ADR unlocks exactly one additional lane (P2).
2. P2 `/practitioners` opens immediately — it needs nothing beyond F0 + F1.
3. Integrator merges serially and audits each merge for duplicated primitives.
4. If duplicate primitives appear in two consecutive merges, narrow the model back to one lane and
   record the reversal here. This decision is reversible and should be reversed on evidence.
