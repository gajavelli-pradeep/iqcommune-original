# ADR 0004 — One tokenised-link contract for every emailed page

**Date:** 2026-07-21 · **Status:** Accepted · **Decision owner:** project owner

## Context

Five of the eight V7 pages are not navigated to — they are opened from a link in an email:

| Page | Opened by | Identifies |
|---|---|---|
| `/rate` | rating request | a session |
| `/consent` | consent request | a session |
| `/submit-photos` | photo reminder | a session |
| `/onboarding` | onboarding link | a practitioner |
| `/join-admin` | admin invite | an invite |

In the V7 spec each is a static file that reads plain query parameters and fills `—` placeholders
from them. That is fine for a mockup and unusable in production: anyone could edit
`?session=IQC-S003` in the address bar and rate, consent for, or upload photos against someone
else's session.

These pages are being cloned now and wired to a database later. If each one invents its own
parameter shape while being cloned, five different link formats have to be reconciled at wiring
time — and the ones already emailed to practitioners cannot be changed retroactively.

## Decision

**Every emailed page takes exactly one query parameter, `t`, holding an HMAC-signed token. One
verifier, one shape, decided before the pages are built.**

```
https://<host>/rate?t=<base64url(payload)>.<base64url(hmac-sha256(payload, HMAC_SECRET))>
```

The payload is compact JSON:

```jsonc
{ "k": "rate", "id": "<uuid>", "exp": 1780000000 }
```

- `k` — the kind of link. A token minted for `rate` is rejected by `/consent`, so one leaked link
  cannot be replayed against a different flow.
- `id` — the row the page acts on. **A uuid, never a human-readable reference** like `IQC-S003`:
  sequential references invite enumeration, and the spec's sample values are exactly that shape.
- `exp` — absolute expiry, seconds. Links die on their own rather than living in an inbox forever.

Verification is one function, `lib/tokens.ts`, used by every route: constant-time compare, then
`k` match, then `exp`. Anything else renders the page's invalid-link state — which the spec already
defines for each of these pages, so there is nothing new to design.

**No page reads any other query parameter.** Names, dates and amounts shown on these pages are
loaded from the row named by `id`, never taken from the URL. The spec fills them from query params;
doing that in production would let anyone display arbitrary text on an iqcommune-branded page.

## Alternatives considered

**Signed JWT.** Standard, and a library exists. Rejected as more than this needs: there is no
session, no claims to negotiate, no third party to interoperate with. HMAC over a 3-field payload
is auditable in one short file.

**Opaque random token stored in a table.** Strictly better on revocation — a row can be deleted to
kill a link. Rejected for now because it needs a table and a lookup per page load before any page
exists to use it. Revisit if a link ever needs revoking before expiry; the payload shape does not
change, only the verifier.

**Keep the spec's plain parameters and add auth later.** Rejected outright. It is the same amount
of work done twice, and the intermediate state is a live page that will act on any session id typed
into the address bar.

## Consequences

**Accepted:**
- Tokens cannot be revoked before `exp`. Expiry is therefore short — days, not months.
- `HMAC_SECRET` rotation invalidates every outstanding link at once. It is promoted from FEATURE to
  REQUIRED in `lib/env.ts` the moment the first of these pages is wired.
- The five pages have no meaningful default state, so each needs its invalid-link view built and
  screenshotted, not left as an afterthought.

**Gained:**
- One verifier to audit rather than five, before P8's authorization work begins.
- The pages can be cloned now against this shape and wired later without touching their markup.

## Follow-through

1. `lib/tokens.ts` — `mintToken(kind, id, ttl)` / `verifyToken(kind, t)` — lands with the first
   wired page, not before.
2. Every cloned link page reads `t` only, and renders its invalid-link state when verification
   fails.
3. Email templates build links through `mintToken`; no template concatenates a raw id.
