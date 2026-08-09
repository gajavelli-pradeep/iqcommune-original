# Emails as props, resolved from env

Client, 2026-08-07: four mailboxes are live — `practitioner@`, `session@`,
`hello@`, `finance@`. Sending already routes per stream from env. What does not
is the address the **site displays**: `hello@iqcommune.com` is hardcoded in nine
places, so changing the public inbox today is a code change and a deploy.

## Decision

One variable, `CONTACT_EMAIL`, resolved on the server and handed to the two
components that render an inbox. It falls back to the literal the site has
always shown, so an unset variable changes nothing.

Scoped deliberately — three categories, three different right answers:

| Category | Treatment | Why |
|---|---|---|
| Chrome (`SiteFooter`, `LinkPageShell`) | env → prop | The point of the exercise. 9 render sites collapse to 1 variable. |
| Legal copy (`content/legal.ts`, the agreement footer, the archived policy) | stays literal, guarded by a test | An unset variable rendering `undefined` **inside a privacy policy** is a worse failure than a stale address, and the rendered policy must stay identical to `docs/legal/privacy-policy.md`. Changing a contact address in a legal document is a reviewed commit, not an env flip. |
| `REPLY_TO` (`lib/email/send.ts`) | stays constant | Already reasoned at `send.ts:99-105`. Brevo never validates `Reply-To`, so constants are correct from day one — through the whole window where `BREVO_SENDER_*` cannot safely be set. Deriving it from those variables makes `Reply-To` equal `From`, which routes nothing. |

Placeholders (`you@iqcommune.com`, `vikram@gmail.com`) are example text inside
inputs, not addresses. Not config.

`finance@` is wired to nothing, per "No action on you."

## Why a new variable and not `BREVO_SENDER_EMAIL`

The same reason `SESSION_CONTACT_EMAIL` is not `BREVO_SENDER_SESSION`, already
documented at `lib/env.ts:81-90`: a sender may only hold a mailbox Brevo has
verified. Pointing it at a plain inbox to change what the website prints would
silently break every outbound platform email. One is sent *from*, the other is
only ever *rendered*.

## Why the components read env rather than take a required prop

`SiteFooter`, `LinkPageShell` and all eight of their callers are server
components — only `LegalLinks` is `"use client"`, and it renders no address. So
each component resolves its own default and the prop stays an override. Threading
a mandatory prop through eight call sites buys nothing and gives eight chances to
pass the wrong thing.

Where the consumer *is* a client component the rule inverts, and the codebase
already does this correctly: `LandingSections.tsx:67-75` resolves
`SESSION_CONTACT_EMAIL` in the last server component and hands `RequestModal` a
plain prop, precisely so no `NEXT_PUBLIC_` value is baked into the bundle.

## Lanes

| File | Change |
|---|---|
| `lib/env.ts` | `CONTACT_EMAIL` in `FEATURE_ENV`; `CONTACT_EMAIL_DEFAULT` + `contactEmail()` |
| `components/layout/SiteFooter.tsx` | default `email = contactEmail()` |
| `components/layout/LinkPageShell.tsx` | new `email` prop, used by the mailto |
| `features/practitioners/PractitionerSections.tsx` | drop the now-redundant literal override |
| `.env.example` | add `CONTACT_EMAIL`; fix `SESSION_CONTACT_EMAIL` appearing 3× under the wrong heading |
| `docs/ENVIRONMENT.md` | document it next to the senders |
| `tests/unit/env-contract.test.ts` | assert no chrome component hardcodes an inbox, and that legal copy cannot drift from it |

## Risk

The guard test is the load-bearing part. Without it the legal carve-out rots:
someone sets `CONTACT_EMAIL` to a new inbox, the footer follows, and the privacy
policy quietly keeps naming an address nobody reads.
