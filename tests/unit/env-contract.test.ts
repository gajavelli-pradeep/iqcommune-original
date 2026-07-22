import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * `.env.example` is the only place an operator looks to find out what this app
 * can be configured with. If a variable the code reads is missing from it, the
 * variable effectively does not exist: nobody sets what they cannot see.
 *
 * `lib/env.ts` already declared `BREVO_SENDER_PRACTITIONER` and
 * `BREVO_SENDER_SESSION`, with a comment saying `.env.example` "can be diffed
 * against it" — and nothing did the diff. Both were absent from `.env.example`
 * for a full release. Nothing broke, because each falls back to the shared
 * sender, which is precisely why it went unnoticed until it was reported by
 * hand. A silent fallback removes the symptom, not the defect.
 *
 * This is the diff that comment promised. It reads `lib/env.ts` as text rather
 * than importing it: the module is `server-only` and validates at import, so
 * importing it here would test the runner's environment instead of the file.
 */

const EXAMPLE = readFileSync(".env.example", "utf8");
const ENV_SOURCE = readFileSync("lib/env.ts", "utf8");

/** Every key inside the `FEATURE_ENV` object literal. */
function featureKeys(): string[] {
  const block = ENV_SOURCE.split("export const FEATURE_ENV")[1];
  if (!block) throw new Error("FEATURE_ENV not found in lib/env.ts");

  const body = block.slice(0, block.indexOf("} as const"));
  // Keys are bare identifiers at the start of a line, followed by a colon.
  return [...body.matchAll(/^\s{2}([A-Z][A-Z0-9_]*):/gm)].map((match) => match[1]);
}

/** Every key in the required zod schema. */
function requiredKeys(): string[] {
  const block = ENV_SOURCE.split("const required = z.object({")[1] ?? "";
  return [...block.slice(0, block.indexOf("});")).matchAll(/^\s{2}([A-Z][A-Z0-9_]*):/gm)].map(
    (match) => match[1],
  );
}

/**
 * Present as a real assignment OR as a commented-out one.
 *
 * A commented entry counts: a sender whose mailbox is not yet verified with
 * Brevo MUST stay unset (Brevo rejects a send from an unverified address), and
 * the commented line is how an operator learns it exists and what to uncomment.
 */
const declared = (key: string) =>
  new RegExp(`^\\s*#?\\s*${key}=`, "m").test(EXAMPLE);

describe("env contract", () => {
  it("documents every required variable in .env.example", () => {
    const missing = requiredKeys().filter((key) => !declared(key));
    expect(missing).toEqual([]);
  });

  it("documents every feature variable in .env.example", () => {
    const missing = featureKeys().filter((key) => !declared(key));
    expect(missing).toEqual([]);
  });

  it("finds the keys it claims to check", () => {
    // Guards the parsing above: a regex that silently matches nothing would
    // make both tests pass while checking no variables at all.
    expect(requiredKeys().length).toBeGreaterThanOrEqual(7);
    expect(featureKeys()).toContain("BREVO_SENDER_PRACTITIONER");
    expect(featureKeys()).toContain("BREVO_SENDER_SESSION");
  });

  it("keeps both per-stream senders changeable without a code change", () => {
    // The client's addresses may change again. Nothing may hardcode one: the
    // sender is resolved from env per stream, so switching mailbox is an env
    // edit and a restart. This asserts the indirection still exists.
    const send = readFileSync("lib/email/send.ts", "utf8");
    expect(send).toMatch(/process\.env\[SENDER_ENV\[stream\]\]/);
    expect(send).toMatch(/practitioner: "BREVO_SENDER_PRACTITIONER"/);
    expect(send).toMatch(/session: "BREVO_SENDER_SESSION"/);
  });
});
