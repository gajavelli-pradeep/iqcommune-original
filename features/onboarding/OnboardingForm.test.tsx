import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingForm } from "./OnboardingForm";

/**
 * The legally-binding e-signature flow (audit C4). `tests/parity/pending-onboarding.ts`
 * exempts the signed-receipt strings on the promise that *this file* proves they
 * render — a promise that, until now, pointed at a file that did not exist. This
 * drives the real flow: read-to-end gate → typed signature → submit → receipt,
 * and asserts every exempted string actually appears.
 */

const practitioner = {
  name: "Jane Doe",
  role: "Senior Analyst",
  organisation: "Acme Capital",
  city: "Pune",
  state: "Maharashtra",
  email: "jane@example.com",
  agreementReference: "IQC-AGR-0007",
  empanelmentReference: "IQC-EMP-0007",
};

afterEach(() => vi.unstubAllGlobals());

describe("OnboardingForm", () => {
  it("heads the agreement with v2's four rows, and blocks signing until read", () => {
    render(<OnboardingForm practitioner={practitioner} token="tok" />);

    expect(screen.getByText("PRACTITIONER EMPANELMENT AGREEMENT")).toBeInTheDocument();

    // v2's header. The Agreement Date and Platform rows went with the same
    // delivery — the first because the document is dated by its Execution Date
    // once signed, the second because the preamble now names the party inline.
    // Two lists carry these four, as the spec does: the summary card at the top
    // and the agreement's own header below it. Asserting both are present is the
    // point — updating one and not the other is exactly how they drifted before.
    for (const label of ["Name", "City", "State", "Agreement Reference Number"]) {
      expect(screen.getAllByText(label, { selector: "dt" })).toHaveLength(2);
    }
    // Gone from the summary with the same delivery that removed them from the
    // contract, so the page cannot show a practitioner a term the PDF omits.
    expect(screen.queryByText("Current role", { selector: "dt" })).not.toBeInTheDocument();
    expect(screen.queryByText("Organisation", { selector: "dt" })).not.toBeInTheDocument();
    // The value, not just the label — a State row rendering blank would satisfy
    // the labels above and still be the bug.
    expect(screen.getAllByText("Maharashtra")).toHaveLength(2);

    // Before signing the page shows the AGREEMENT number. The empanelment one
    // does not exist yet, and showing it here is the substitution the client's
    // readme calls out as wrong.
    expect(screen.getAllByText(practitioner.agreementReference).length).toBeGreaterThan(0);
    expect(screen.queryByText(practitioner.empanelmentReference)).not.toBeInTheDocument();

    expect(
      screen.getByText(/scroll through and read the full agreement/i),
    ).toBeInTheDocument();
  });

  it("collects a full name as per ID proof, and no designation", () => {
    render(<OnboardingForm practitioner={practitioner} token="tok" />);

    expect(screen.getByLabelText("Full name (as per any valid ID proof)")).toBeInTheDocument();
    // Removed by v2. Nothing renders it, so collecting it would be asking for
    // something no document prints.
    expect(screen.queryByLabelText(/Designation/i)).not.toBeInTheDocument();
  });

  it("drives read-to-end → typed signature → submit and renders the signed receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          // The empanelment number comes back on the receipt, not from the
          // loader: it is allocated while this very request is handled, so the
          // page could not have had it. Deliberately different from the
          // fixture's `empanelmentReference` so a receipt that quietly read the
          // prop instead of the response would fail here.
          new Response(
            JSON.stringify({
              data: { at: "2026-01-01T10:00:00Z", empanelmentReference: "IQC-EMP-0099" },
              error: null,
            }),
            { status: 201 },
          ),
        ),
      ),
    );

    render(<OnboardingForm practitioner={practitioner} token="tok" />);

    // Satisfy the scroll-to-end gate. jsdom has no layout, so the scroll metrics
    // are stubbed to represent a panel scrolled to its end.
    const region = screen.getByLabelText("Practitioner Empanelment Agreement");
    Object.defineProperty(region, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(region, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(region, "scrollTop", { value: 700, configurable: true, writable: true });
    fireEvent.scroll(region);
    expect(screen.getByText(/Agreement read/i)).toBeInTheDocument();

    // Typed signature — the keyboard-accessible path.
    fireEvent.click(screen.getByRole("button", { name: /type signature/i }));
    const typed = screen.getByPlaceholderText("Type your name to generate signature");
    fireEvent.change(typed, { target: { value: "Jane Doe" } });

    fireEvent.click(screen.getByRole("button", { name: /sign & complete onboarding/i }));

    await waitFor(() =>
      expect(screen.getByText("Agreement signed. Welcome to iqcommune.")).toBeInTheDocument(),
    );

    // Every string pending-onboarding.ts exempts against this test.
    expect(screen.getByText(/Your empanelment is confirmed/)).toBeInTheDocument();
    // The lede above opens both the old copy and the one the 2026-08-14 delivery
    // replaced it with, so on its own it proves only that *a* lede rendered. The
    // clause below exists solely in the client's wording — without it, reverting
    // to the "within 2-3 working days" promise leaves this test green, and the
    // parity gate cannot catch it either because the receipt is state-gated.
    expect(
      screen.getByText(/no fixed timeline, since it depends on demand in your area/),
    ).toBeInTheDocument();
    // The literal words the client's delivery prints, not V7's substituted
    // address — see the note beside this copy in OnboardingForm.tsx. Asserted
    // both ways round: the address appearing here again is the regression.
    // Matched inside the sentence rather than as its own element: "your inbox"
    // is plain prose now, not an emphasised span, and asserting on the element
    // would only re-pin the styling this deliberately removed.
    expect(screen.getByText(/Keep an eye on your inbox\./)).toBeInTheDocument();
    expect(screen.queryByText(practitioner.email)).not.toBeInTheDocument();
    expect(screen.getByText("Signed by")).toBeInTheDocument();
    // The receipt is the first surface that can show the EMPANELMENT number —
    // submitting is what produces it. The page showed the agreement number
    // before this point, so the two must swap here and not before.
    expect(screen.getByText("Empanelment Reference Number")).toBeInTheDocument();
    // The number the SUBMISSION returned, not the one the fixture carries — the
    // page is loaded before anyone is empanelled, so a receipt reading the prop
    // would be showing a number that did not exist when it was rendered.
    expect(screen.getByText("IQC-EMP-0099")).toBeInTheDocument();
    expect(screen.queryByText(practitioner.empanelmentReference)).not.toBeInTheDocument();
    expect(screen.getByText("Execution Date")).toBeInTheDocument();
    expect(screen.getByText("Signature Method")).toBeInTheDocument();
    // Typed, because this test drove the typed path — asserted rather than
    // taken on trust, since a hardcoded "Typed" would pass either way.
    expect(screen.getByText("Typed")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("✓ Digitally signed")).toBeInTheDocument();
  });

  it("reports a missing name against the name box, and goes there", async () => {
    // The three checks used to share one message at the foot of the form: it
    // said what was wrong but never which control, on a page long enough that
    // the field is routinely scrolled away by the time you read it.
    render(<OnboardingForm practitioner={practitioner} token="tok" />);

    const region = screen.getByLabelText("Practitioner Empanelment Agreement");
    Object.defineProperty(region, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(region, "clientHeight", { value: 500, configurable: true });
    Object.defineProperty(region, "scrollTop", { value: 700, configurable: true, writable: true });
    fireEvent.scroll(region);

    const name = screen.getByLabelText(/Full name/);
    fireEvent.change(name, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /sign & complete onboarding/i }));

    expect(await screen.findByText("Your full name is required.")).toBeInTheDocument();
    expect(name).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(document.activeElement).toBe(name));
  });

  it("keeps the submit button disabled until the agreement is read", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<OnboardingForm practitioner={practitioner} token="tok" />);

    const submit = screen.getByRole("button", { name: /sign & complete onboarding/i });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
