# Send a submitted rating to hello@iqcommune.com

## Question

When a session requester submits the rating form on `/rate` — stars, and a
comment they may or may not leave — the rating is recorded and nothing else
happens. It should also reach `hello@iqcommune.com`, so the feedback is read
rather than only stored.

## Answer

Follow the pattern the codebase already has for exactly this. A public form that
records something and then tells the team about it is `/api/session-requests`
and `/api/applications`: both write first, then `dispatchEmail` a
`*ForAdmin` template. This is the third of the same shape, so it gets
`newRatingForAdmin` and a dispatch in `app/api/ratings/route.ts`.

**Sent after the write, off the response path.** `dispatchEmail` hands off to
`after()`, so a slow or failing mail provider cannot turn a rating that was
saved into an error the person sees. The rating is the record; the email is a
notification about it, and the two must not share a fate.

**Addressed to `CONTACT_EMAIL_DEFAULT`.** That constant is already
`"hello@iqcommune.com"` — hardcoded as asked, and the codebase's own name for
that inbox rather than a second copy of the string. Deliberately *not*
`adminInboxFor("session")`, which is the mechanism the other two use: it reads
`ADMIN_NOTIFY_SESSION` first, so in production it may resolve to a different
inbox, and the instruction named this one.

**Carries its context.** A mail saying only "4 stars" cannot be acted on. The
assignment already knows the practitioner, module, session reference, date, city
and who requested it — `getRatedSession` returns exactly that — so the mail says
which session, which practitioner, who rated, and what they wrote.

**Sent whether or not a comment was left.** The comment is optional on the form;
the stars are the rating. A mail that arrives only when someone typed something
would silently drop most of the feedback.

## Implementation

Serial.

1. **`lib/email/templates.ts`** — `newRatingForAdmin(to, rating)`, matching
   `newSessionRequestForAdmin`'s text-and-html shape.
2. **`app/api/ratings/route.ts`** — after `recordRating` succeeds, look up the
   session context and dispatch.
3. **`tests/unit/rating-route.test.ts`** — the mail is sent, addressed to
   hello@, carries the stars and the comment, still goes when no comment was
   left, and a mail failure does not fail the submission.

Verify: `tsc`, `eslint`, `vitest`, the e2e suite, `next build`.

## Open, and worth confirming

Listed rather than guessed:

- **Reply-to.** The mail is about a requester's feedback but is not from them.
  Setting reply-to to the requester would make it answerable in one click;
  nothing does that today.
- **The practitioner.** They are the subject of the rating and are not told.
  Deliberately unchanged — telling someone their score is a product decision,
  not a plumbing one.
- **Low ratings.** No special handling; a one-star and a five-star arrive the
  same way.

## Update, 2026-08-17

The address was left open above pending confirmation, then set to
`hello@iqcommune.com` as a first pass. The client has since named the actual
target: **pg@iqcommune.com**, their own inbox — distinct from `hello@`, which is
the public/support line. `constants/inboxes.ts` and the test now read pg@; the
reasoning above (hardcoded, own file, not `adminInboxFor`) is unchanged, only
the address is.
