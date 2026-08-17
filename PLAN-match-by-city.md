# Match a session request to practitioners in its own city

## Question

The console's request panel offers every empanelled practitioner in the
"assign" dropdown, whatever city the request is for. Matching is done by city,
so a request from Bengaluru should offer practitioners based in Bengaluru.

## Answer

Filter the dropdown against the request's own city, in the component that
renders it.

The list is loaded once for the whole panel — `listAssignablePractitioners()`
returns every empanelled practitioner and `RequestsPanel` hands the same array to
each request — so it cannot be filtered in the query: each request has a
different city. What the query is missing is the city itself, which the row does
not currently carry. Adding it lets each request narrow the same list to its own
city with no extra round trip.

Compared case- and whitespace-insensitively. Practitioner cities were free text
until recently and still hold whatever was typed, so "bengaluru " and "Bengaluru"
must not read as two places.

**When nobody matches, say so.** A strict filter with no matches renders an empty
dropdown, which looks like a loading fault rather than an answer. The control
states that no empanelled practitioner is based in that city, so the admin knows
why it is empty and that the list is not broken.

Deliberately not built: an override to pick someone from another city. "Only
practitioners from that city" is the instruction, and an escape hatch nobody
asked for would quietly undo it. Recorded here as the obvious follow-up if the
strictness turns out to block real matches.

## Implementation

Serial.

1. **`services/console.ts`** — `AssignablePractitioner` gains `city`, and the
   query selects it.
2. **`features/console/panels/RequestDetail.tsx`** — the dropdown filters on the
   request's city, and carries the empty-state line.
3. **`features/console/panels/RequestDetail.test.tsx`** (or the panel's existing
   test) — a practitioner in the city is offered, one from elsewhere is not, the
   comparison ignores case and padding, and the empty case explains itself.

Verify: `tsc`, `eslint`, `vitest`, the e2e suite, `next build`.
