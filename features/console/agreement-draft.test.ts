import { beforeEach, describe, expect, it, vi } from "vitest";

import { LINK_PLACEHOLDER } from "./draft-kinds";

/**
 * The agreement draft shows the link an admin is about to send (client,
 * 2026-08-17).
 *
 * Both halves are asserted, because they fail in opposite directions and only
 * one of them is visible. Showing the link is the request. Withholding it on a
 * first issue is the constraint: there is no agreement row yet, so a link would
 * have to point at one the preview invented — and this dialog's whole promise is
 * that opening it and closing it again leaves nothing behind.
 */

const PRACTITIONER_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const AGREEMENT_ID = "3a0f1e5c-2b6d-4c8a-9f21-7d4e6b1a0c93";

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

  it("shows it in the WhatsApp copy too, which leaves by the clipboard", async () => {
    // Nothing substitutes into that text after the admin pastes it, so a
    // stand-in there reaches the practitioner as the words themselves.
    rows.practitioner_agreements = { id: AGREEMENT_ID, reference: "IQC-AGR-0007" };

    const draft = await compose();

    expect(draft!.whatsapp).toContain("https://iqcommune.com/onboarding?t=");
    expect(draft!.whatsapp).not.toContain(LINK_PLACEHOLDER);
  });

  it("withholds it on a first issue, where there is nothing to link to", async () => {
    // No open agreement row: the send creates one. A preview must not.
    const draft = await compose();

    expect(draft!.body).toContain(LINK_PLACEHOLDER);
    expect(draft!.body).not.toContain("?t=");
    expect(draft!.whatsapp).not.toContain("?t=");
  });

  it("never renders a link against the preview id", async () => {
    // The stand-in uuid exists so the template has something to render. A token
    // minted against it would be a working link to a row that does not exist —
    // the failure this placeholder was introduced to prevent.
    const draft = await compose();

    expect(draft!.body).not.toContain("00000000-0000-4000-8000-000000000000");
    expect(draft!.whatsapp).not.toContain("00000000-0000-4000-8000-000000000000");
  });
});
