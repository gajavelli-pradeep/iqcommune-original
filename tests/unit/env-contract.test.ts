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

  it("keeps the inbox the site displays changeable without a code change", () => {
    // The same rule as the senders below, for the address the site prints. It
    // was hardcoded in both chrome components, so changing the public inbox
    // meant editing components and shipping a deploy.
    expect(ENV_SOURCE).toMatch(/process\.env\.CONTACT_EMAIL \|\| CONTACT_EMAIL_DEFAULT/);

    for (const file of [
      "components/layout/SiteFooter.tsx",
      "components/layout/LinkPageShell.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/@iqcommune\.com/);
    }
  });

  it("keeps the legal documents on the same inbox as the site", () => {
    // Legal copy keeps the address as a literal deliberately, so it is NOT in
    // the loop above. An unset variable rendering "write to us at undefined"
    // inside a privacy policy is a worse failure than a stale address; the
    // rendered policy has to stay word-identical to the archived markdown; and
    // changing a contact address in a legal document is a reviewed commit
    // rather than an ops flip.
    //
    // Literal is right. Drifting from the configured inbox silently is not —
    // which is what this assertion prevents.
    const fallback = ENV_SOURCE.match(/CONTACT_EMAIL_DEFAULT = "([^"]+)"/)?.[1];
    expect(fallback).toBeTruthy();

    for (const file of [
      "content/legal.ts",
      "docs/legal/privacy-policy.md",
      "features/onboarding/OnboardingForm.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toContain(fallback);
    }
  });

  it("never falls back from a displayed contact to a sending account", () => {
    // Reported live: both forms offered "write to us at gajavellisbiz@gmail.com".
    // Nothing hardcoded it — the contact chain ended at BREVO_SENDER_EMAIL, so
    // with the dedicated variables unset the page published whatever address
    // the mailer happened to authenticate as. A sending account is not a
    // contact address; an unconfigured contact surface falls back to the public
    // inbox instead.
    for (const file of [
      "features/landing/LandingSections.tsx",
      "features/practitioners/PractitionerSections.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain("contactEmail()");
      expect(source).not.toContain("senderFor(");
    }
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
