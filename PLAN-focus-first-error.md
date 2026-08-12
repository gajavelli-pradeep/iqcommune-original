# PLAN — jump to the first field a failed submit rejected

## Question

Submitting an incomplete form does nothing visible. The error appears next to the
offending field, which is often scrolled out of view — in the waitlist modal
thirteen fields sit in an internally scrolling panel, so a missing first name is
announced entirely off-screen. The visitor sees a dead button and has to hunt
upwards for a red border they cannot see yet.

Move focus, and the viewport, to the first rejected field on every failed submit.

## Answer

Query the form for `[aria-invalid="true"]` and focus the first match.

`components/ui/Field.tsx` already sets `aria-invalid` on every control it
renders, so the browser is already holding the answer in DOM order — no form has
to name its fields twice or keep an ordered list in sync with its own markup, and
a field added later is covered without being registered anywhere.

Two controls are drawn outside `Field.tsx` and mark themselves invalid with a red
border alone: the waitlist modal's audience picker and the two photo pickers.
That is a colour-only error signal (WCAG 1.4.1) and invisible to a screen reader,
so they gain `aria-invalid` regardless of this feature — and gaining it is also
what puts them in the focus order.

Called explicitly from each submit handler rather than from an effect watching
the error state: focus must move because the person pressed submit, never because
a re-render happened to change an error. `PhotoSubmissionForm` clears
`errors.photos` on file choice, which an effect would treat as a cue to steal
focus mid-interaction.

## Implementation

Serial, single lane — the helper is shared, so the four callers depend on it.

| File | Change |
|---|---|
| `components/ui/focus-first-error.ts` | NEW. The helper. |
| `features/landing/sections/RequestModal.tsx` | form ref + call; `aria-invalid` on audience picker |
| `features/landing/sections/PostSessionModal.tsx` | form ref + call; `aria-invalid` on photo picker |
| `features/photos/PhotoSubmissionForm.tsx` | form ref + call; `aria-invalid` on photo picker |
| `features/practitioners/ApplyModalBody.tsx` | form ref + call |
| `features/landing/sections/modals.test.tsx` | covers waitlist + post-session |
| `features/practitioners/ApplyModal.test.tsx` | covers the application |
| `features/photos/PhotoSubmissionForm.test.tsx` | covers the photo upload |

## Verification

- Focus lands on the first rejected control, in DOM order, not merely on any one.
- `scrollIntoView` centres it rather than parking it under the modal's sticky header.
- Honours `prefers-reduced-motion` — no smooth scroll when reduced.
- lint · typecheck · full suite · build, then drive it in a browser.
