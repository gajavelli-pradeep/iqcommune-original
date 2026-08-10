# Per-stream sender name and sign-off

MOM 2026-08-10. A recipient should see `Session Commune <session@iqcommune.com>`
on session mail and `Practitioner Commune <practitioner@iqcommune.com>` on
practitioner mail, and the body should sign off with the same name.

Today both halves are global: `send.ts:168` sends
`name: process.env.BREVO_SENDER_NAME || "iqcommune"` for every stream, and
twelve bodies sign `- iqcommune` with three more saying "The iqcommune Team".

## Decision

`senderNameFor(stream)` mirroring the existing `senderFor(stream)` — per-stream
env key first, constant second. One resolver feeds both the Brevo `sender.name`
and the sign-off, so the two can never disagree.

| Stream | Env key | Constant |
|---|---|---|
| practitioner | `BREVO_SENDER_NAME_PRACTITIONER` | `Practitioner Commune` |
| session | `BREVO_SENDER_NAME_SESSION` | `Session Commune` |
| platform | `BREVO_SENDER_NAME` | `iqcommune` |

Platform resolves to `BREVO_SENDER_NAME || "iqcommune"` — exactly today's
behaviour, so console invites are untouched.

Session and practitioner fall back to the **constant**, not to
`BREVO_SENDER_NAME`. That matters: `BREVO_SENDER_NAME=IQCommune` is set in
production, so falling back to it would leave the From line reading `IQCommune`
while the body signed `Session Commune` until someone set the new keys. The
names the client asked for apply immediately; the env keys exist to change them
later without a deploy.

## Scope — what changes, what does not

"iqcommune" appears in three roles in `templates.ts`. Only the first changes.

| Role | Example | Change? |
|---|---|---|
| Sign-off | `- iqcommune`, `The iqcommune Team` | **Yes** — 12 + 3 sites |
| Subject | `iqcommune — your session request has been received` | No — not asked for |
| The organisation | `the iqcommune practitioner network`, `your empanelment with iqcommune` | No — it names the company, and substituting gives "the Practitioner Commune practitioner network" |

`adminInvite` declares no stream, so it defaults to platform and keeps
`- iqcommune`.

**Flagged:** `sessionRequestReceived` carries the comment "Exact copy from the
client's request-acknowledgment spec — subject, body and sign-off all specified
verbatim". Its sign-off changes here on the newer instruction, which supersedes
that spec. Worth the client knowing a previously-verbatim template moved.

## Lanes

| File | Change |
|---|---|
| `lib/email/send.ts` | `SENDER_NAME_ENV`, `STREAM_BRAND`, `senderNameFor()`; use it at the Brevo payload |
| `lib/email/templates.ts` | sign-offs resolve from the stream |
| `lib/env.ts` | register both keys |
| `.env.example`, `docs/ENVIRONMENT.md` | declare and document |
| `tests/unit/email.test.ts` | each stream's name, the env override, and the sign-off matching the From name |

## Risk

The sign-off and the From name drifting apart. One resolver feeds both, and a
test asserts a practitioner email's body signs the same name its `sender.name`
carries — the cheapest guard against a future edit changing one and not the
other.

## Not in scope

The address half. Recipients keep seeing `<gajavellisbiz@11739808.brevosend.com>`
until the mailboxes are verified in Brevo and `BREVO_SENDER_SESSION` /
`BREVO_SENDER_PRACTITIONER` are set. No code change reaches it.
