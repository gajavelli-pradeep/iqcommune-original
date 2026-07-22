# V7 spec — the tracked source of truth

These eight HTML files are the client's V7 prototype. They are **the spec**: the
parity gates in `tests/parity/` read them and fail when a page in this app is
missing copy the prototype has.

They live here, in the repo, for one reason. They used to be read from
`../client_requirements/thefinalfinalfiles (V7)/` — a folder beside the checkout
that git has never tracked. That folder exists on the machine the client
delivered to and nowhere else, so all eight parity suites passed locally and
failed at import in CI on every run. A gate whose source of truth is not
versioned is not a gate.

## When a new version is delivered

1. Copy the new files over the ones here.
2. Run `pnpm test`. `tests/unit/spec-freshness.test.ts` confirms this directory
   matches the delivery byte for byte; the parity gates then report every piece
   of copy the app is now missing.
3. That diff is the work. Do not edit these files to make a gate pass — they are
   the client's, and editing them is editing the requirement.
