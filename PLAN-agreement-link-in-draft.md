# Show the agreement link in the draft dialog

## Question

The practitioner agreement email is composed in the draft dialog before it goes
out. Where the link belongs, the dialog shows
`[a secure one-time link is inserted here when you send]`. The client wants the
actual link visible there.

## Answer

Show the real link whenever the agreement it points at already exists, and keep
the stand-in only when it genuinely cannot exist yet.

Two facts decide this, and they were worth establishing before touching
anything:

- **Minting a token costs nothing.** `mintToken` is a stateless HMAC over
  `{kind, id, exp}` — no row is written, nothing is consumed, nothing is
  reserved. The comment about previewing "leaving no trace" is about the
  agreement row and its IQC-AGR reference, not the token. So building a link
  during a preview writes nothing.
- **A resend already has the row.** `sendAgreement` looks up the open unsigned
  agreement and reuses its id; only a first issue inserts one. The draft runs the
  same query one field short — it selects `reference` and not `id`.

So on a resend the link can be real, and it points at exactly the agreement the
send will use. On a first issue there is no agreement row and therefore nothing
to link to: the stand-in stays, because inventing a link there would mean
allocating the agreement during a preview, which is the thing the dialog must
not do.

The WhatsApp copy matters at least as much as the email here. Its only exit is
the clipboard — the admin pastes it and sends it from their own handset — so a
placeholder in that text reaches the practitioner as literal words where a link
should be. Both halves get the real link under the same condition.

**Sending must not then double it.** `withLink` substitutes the placeholder and,
if the admin deleted it, appends the link so the email is not sent useless. A
body that already carries a real URL matches neither case, so it would be
appended a second time. `withLink` learns to replace a link that is already
there — with the freshly minted one, so what is sent is what the send minted.

## Implementation

Serial; each step depends on the one before.

1. **`features/console/draft-kinds.ts`** — `withLink` replaces an existing
   tokenised URL, else the placeholder, else appends.
2. **`features/console/actions.ts`** — the `onboarding-link` draft selects the
   agreement's `id`, and when one exists builds the real link for both the email
   body and the WhatsApp copy instead of masking.
3. **`features/console/draft-kinds.test.ts`** — the new `withLink` case, and that
   a preview-then-send round trip carries exactly one link.

Verify: `tsc`, `eslint`, `vitest`, the e2e suite, and `next build`.
