# City and State become searchable pickers, on both public forms

## Question

City and State are free-text inputs on the waitlist form and the practitioner
application. They should offer a list — tier-1 and tier-2 Indian cities, and all
Indian states — while still accepting a place that is not on it, and the list
should be searchable.

## Answer

`<input list>` backed by `<datalist>`, not `<select>`.

A `<select>` cannot do either of the two things asked for: it cannot filter as
you type, and it cannot hold a value that is not one of its options. An input
with a datalist does both natively — the browser filters the list as you type,
and because it is an input, anything typed is accepted. That removes the need
for an "Other" option entirely: free entry is the control's default behaviour,
not a branch in it.

Cost, stated up front: the suggestion panel a datalist draws is browser-drawn
and cannot be styled the way `appearance: base-select` let us style the
`<select>` list. The **field** keeps the form's styling — border, hover, focus,
error — because it is still a normal input on `controlClass`; only the
suggestion popup is the browser's. That is the price of search, and it is a
requirement rather than a preference, so it is paid deliberately.

Nothing else changes shape: both forms already hold `city` and `state` as
strings and both schemas already validate them as `required().max(80)`, so the
submitted payload, the API and the database are untouched.

## Implementation

Serial — each step depends on the one before. No subagents.

1. **`constants/india.ts`** (new) — `TIER_1_CITIES`, `TIER_2_CITIES`, the two
   joined as `CITIES`, and `INDIAN_STATES` (28 states + 8 union territories).
   Tiers stay separate exports rather than one flat list, because which tier a
   city is in is a fact worth keeping, and matching may want it later.
2. **`components/ui/Field.tsx`** — a `ComboField`: the same `Shell`, label, hint
   and error wiring every other field has, rendering an input plus its datalist.
   Sits beside `TextField` and `SelectField` so a third call site cannot invent
   its own.
3. **`features/landing/sections/RequestModal.tsx`** — City and State swap
   `TextField` for `ComboField`.
4. **`features/practitioners/ApplyModalBody.tsx`** — the same two swaps.
5. **`tests/e2e/form-dropdowns.spec.ts`** — extend the existing table-driven
   spec: both forms offer the list, filter on typing, and still accept a place
   that is not on it.

Verify: `tsc`, `eslint`, `vitest`, the e2e spec, and the fields driven in a real
browser on both forms.
