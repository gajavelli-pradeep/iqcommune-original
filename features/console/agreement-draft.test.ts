import { beforeEach, describe, expect, it, vi } from "vitest";

import { LINK_PLACEHOLDER } from "./draft-kinds";

/**
 * The agreement draft shows the link an admin is about to send (client,
 * 2026-08-17), in both of the cases it opens in.
 *
 * A resend points at the agreement that already exists. A first issue has no
 * row yet, so the dialog settles the id the send will create it under and shows
 * a link to that — which is what lets this behave like every other send in the
 * console, all of which preview a row that exists already.
 *
 * What is asserted alongside is that the preview still writes nothing. Choosing
 * an id is not allocating one, and the promise that opening this dialog and
 * closing it again leaves no trace is the one thing this feature must not cost.
 */

const PRACTITIONER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const AGREEMENT_ID = "3a0f1e5c-2b6d-4c8a-9f21-7d4e6b1a0c93";
const APPLICATION_ID = "b1d7f2a4-8c33-4e19-9a52-6f0b3c8d1e77";

/** Rows the stubbed client hands back, keyed by table. Set per test. */
const rows: Record<string, unknown> = {};

const mocks = vi.hoisted(() => ({ requireCapability: vi.fn() }));

vi.mock("./requireRole", () => ({
  requireCapability: mocks.requireCapability,
  // Imported alongside it by the module under test.
  getConsoleSession: vi.fn(),
}));

/**
 * A stub shaped like the query builder rather than like the data: every method
 * the module chains returns `this`, and the table chosen at `.from()` decides
 * what `maybeSingle()` resolves to. That keeps each test to the rows it cares
 * about instead of a script of call order.
 */
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    let table = "";
    const builder: Record<string, unknown> = {
      from(name: string) {
        table = name;
        return builder;
      },
      maybeSingle: async () => ({ data: rows[table] ?? null }),
      single: async () => ({ data: rows[table] ?? null }),
    };
    for (const method of ["select", "eq", "is", "not", "in", "order", "limit", "neq"]) {
      builder[method] = () => builder;
    }
    return builder;
  },
}));

describe("the agreement draft", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_BASE_URL = "https://iqcommune.com";
    process.env.HMAC_SECRET = "test-secret-for-signing-only";
    mocks.requireCapability.mockResolvedValue({ email: "admin@iqcommune.com" });
    rows.practitioners = {
      email: "vikram@example.com",
      phone: "+919876543210",
      full_name: "Vikram Kulkarni",
      reference: "IQC-EMP-0042",
    };
    delete rows.practitioner_agreements;
    delete rows.practitioner_applications;
  });

  /** `pipelineId`'s namespaced form — `prac:` is the practitioner side. */
  const compose = async () => {
    const { composeDraft } = await import("./actions");
    return composeDraft("onboarding-link", `prac:${PRACTITIONER_ID}`);
  };

  it("shows the real link when the agreement already exists", async () => {
    rows.practitioner_agreements = { id: AGREEMENT_ID, reference: "IQC-AGR-0007" };

    const draft = await compose();

    expect(draft).not.toBeNull();
    expect(draft!.body).toContain("https://iqcommune.com/onboarding?t=");
    expect(draft!.body).not.toContain(LINK_PLACEHOLDER);
    // The reference is real on a resend too, and is what the email quotes.
    expect(draft!.body).toContain("IQC-AGR-0007");
  });

  it("shows a link that actually opens the agreement", async () => {
    // The shape of a URL is not the requirement — a working link is. This mints
    // nothing of its own: it reads the token out of the body the dialog would
    // display and verifies it the way `/onboarding` will.
    rows.practitioner_agreements = { id: AGREEMENT_ID, reference: "IQC-AGR-0007" };

    const draft = await compose();
    const token = draft!.body.match(/\?t=(\S+)/)?.[1];
    expect(token, "the body carries a token to check").toBeTruthy();

    const { verifyToken } = await import("@/lib/tokens");
    const result = verifyToken("onboarding", token);

    expect(result.ok, "the previewed token verifies").toBe(true);
    // And opens this agreement, not merely something.
    expect(result.ok && result.payload.id).toBe(AGREEMENT_ID);
    // Minted for this flow alone — a token replayed against another page must
    // fail, which is what `k` in the payload is for.
    expect(verifyToken("consent", token).ok).toBe(false);
  });

  it("shows it in the WhatsApp copy too, which leaves by the clipboard", async () => {
    // Nothing substitutes into that text after the admin pastes it, so a
    // stand-in there reaches the practitioner as the words themselves.
    rows.practitioner_agreements = { id: AGREEMENT_ID, reference: "IQC-AGR-0007" };

    const draft = await compose();

    expect(draft!.whatsapp).toContain("https://iqcommune.com/onboarding?t=");
    expect(draft!.whatsapp).not.toContain(LINK_PLACEHOLDER);
  });

  it("shows a link on a first issue too, against the id the send will use", async () => {
    // No agreement row yet. The dialog picks the id, shows a link to it, and
    // hands it back as `linkId` so the send inserts under the same one.
    const draft = await compose();

    expect(draft!.body).not.toContain(LINK_PLACEHOLDER);
    expect(draft!.body).toContain("https://iqcommune.com/onboarding?t=");
    expect(draft!.whatsapp).toContain("https://iqcommune.com/onboarding?t=");

    const { verifyToken } = await import("@/lib/tokens");
    const token = draft!.body.match(/\?t=(\S+)/)?.[1];
    const result = verifyToken("onboarding", token);
    expect(result.ok).toBe(true);
    // The link and the id travelling back must be the same row, or the admin
    // read a link to something the send never creates.
    expect(result.ok && result.payload.id).toBe(draft!.linkId);
  });

  it("does not hand back an id on a resend, where the row already exists", async () => {
    // The send finds that row for itself; an id here would be noise at best and
    // a second agreement at worst.
    rows.practitioner_agreements = { id: AGREEMENT_ID, reference: "IQC-AGR-0007" };

    const draft = await compose();

    expect(draft!.linkId).toBeUndefined();
  });

  it("shows a link for an applicant, which is where this dialog usually opens", async () => {
    // At "Screening Done" the profile row is still `app:<uuid>` — the
    // practitioner record is created by the send — and this is the case an admin
    // meets first. It gets a link on the same terms as any other first issue.
    rows.practitioner_applications = {
      email: "vikram@example.com",
      phone: "+919876543210",
      first_name: "Vikram",
    };

    const { composeDraft } = await import("./actions");
    const draft = await composeDraft("onboarding-link", `app:${APPLICATION_ID}`);

    expect(draft!.body).not.toContain(LINK_PLACEHOLDER);
    expect(draft!.body).toContain("https://iqcommune.com/onboarding?t=");
    expect(draft!.linkId).toBeTruthy();
  });

  it("never falls back to the shared preview id", async () => {
    // That stand-in uuid is the same for everyone. A link against it would open
    // one row for every practitioner, which is the failure the masking existed
    // to prevent and which choosing a fresh id per draft is what replaces.
    const draft = await compose();

    expect(draft!.body).not.toContain("00000000-0000-4000-8000-000000000000");
    expect(draft!.linkId).not.toBe("00000000-0000-4000-8000-000000000000");
  });

  it("chooses a different id for each draft, and writes none of them", async () => {
    // Two previews, two ids: nothing is reserved, so nothing is shared. The
    // stubbed client has no insert at all — reaching for one would throw here,
    // which is what keeps "a preview leaves no trace" honest.
    const first = await compose();
    const second = await compose();

    expect(first!.linkId).toBeTruthy();
    expect(second!.linkId).toBeTruthy();
    expect(first!.linkId).not.toBe(second!.linkId);
  });
});
