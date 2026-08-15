"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TextField } from "@/components/ui/Field";
import { focusFirstError } from "@/components/ui/focus-first-error";
import { Stepper } from "@/components/ui/Stepper";
import { useApiSubmit } from "@/hooks/useApiSubmit";
import { useFocusWhen } from "@/hooks/useFocusWhen";
import { formatLiveClock, formatRecordedAt } from "@/lib/timestamp";
import type { OnboardingPractitioner } from "@/types/link-pages";

import {
  AGREEMENT_CLAUSES,
  AGREEMENT_CONSENT_TEXT,
  AGREEMENT_INTRO,
} from "@/constants/agreement";
import { SignaturePad, type Signature } from "./SignaturePad";

/** P6 — review and sign the empanelment agreement. */

/** Keyed by the control at fault; `form` covers what belongs to no one control. */
type FormErrors = Partial<Record<"form" | "fullName" | "signature", string>>;

// Shape lives in types/, out of the client graph (audit H6); re-exported here.
export type { OnboardingPractitioner };

const STEPS = [
  "Application submitted",
  "Screening call done",
  "Review & sign agreement",
  "Empanelment confirmed",
] as const;

const CONFIRMATIONS = [
  "You have read and understood the full Practitioner Empanelment Agreement above.",
  "You agree to the terms as stated, including Clause 5 (in-session conduct) and Clause 4 (disclosure tiers).",
  "You confirm that your details shown above are accurate.",
  "You understand this agreement is legally binding and digitally timestamped.",
  // V7 lists this as the fifth thing the signer confirms, not as a note beside
  // the pad. The distinction is the point: here it is part of the declaration
  // being agreed to, and it appears exactly once in the spec.
  "This digital signature has the same legal standing as a physical signature under the Information Technology Act, 2000.",
] as const;

/**
 * No `agreementDate`. It existed for the "Agreement Date" header row and the
 * toolbar line beside the reference, and v2 removed both — the document is dated
 * by its Execution Date once signed, not by when it was opened. It was computed
 * on the server in IST (audit M7) because deriving it in the client render body
 * made server and client disagree at the day boundary; that hazard leaves with
 * the prop, and the live clock below still avoids it the same way.
 */
export function OnboardingForm({
  practitioner,
  token,
}: {
  practitioner: OnboardingPractitioner;
  token: string;
}) {
  const [readToEnd, setReadToEnd] = useState(false);
  const [fullName, setFullName] = useState(practitioner.name);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  /**
   * Allocated by the submission itself, so it cannot come from the loader: this
   * page is rendered before the practitioner is empanelled, and the IQC-EMP
   * number does not exist until they press the button (migration 0019). It
   * travels back on the receipt.
   */
  const [empanelmentReference, setEmpanelmentReference] = useState<string | null>(null);
  // Client-side validation, keyed by the control at fault so the message can sit
  // beside it. `form` is the one problem that belongs to no single control.
  // `submitError` is the network/route path, now shared (audit H8).
  const [errors, setErrors] = useState<FormErrors>({});
  const { submit, busy, error: submitError } = useApiSubmit(token);
  const successRef = useFocusWhen<HTMLHeadingElement>(Boolean(signedAt));

  // The signature pad is hand-built rather than a `Field`, so it wires its own
  // error message to the control the way `Field` does for everything else.
  const signatureErrorId = useId();

  // V7 ticks this every second beside the sign button. Client-only, so it stays
  // null through SSR and the markup matches the spec's "—" until it mounts.
  const [liveTimestamp, setLiveTimestamp] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLiveTimestamp(formatLiveClock(now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const agreementRef = useRef<HTMLDivElement>(null);
  // V7 hides the signing section until the agreement is read to the end, then
  // reveals it and scrolls it into view.
  const signFormRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (readToEnd) signFormRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [readToEnd]);

  if (signedAt) {
    // V7 .success-card is `var(--radius)` = 12px, as .card is.
    return (
      <section
        role="status"
        className="rounded-[12px] border border-border bg-surface px-8 py-12 text-center"
      >
        <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-green-light text-green">
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden
            focusable="false"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1
          ref={successRef}
          tabIndex={-1}
          /* V7 .success-title is 24px, not the 18px card title. */
          className="mb-2 text-5xl font-semibold leading-[1.7] tracking-[-0.01em] text-ink outline-none"
        >
          Agreement signed. Welcome to iqcommune.
        </h1>
        {/* The 2026-08-14 confirmations delivery replaces V7's "within 2-3 working
            days" with the client's own waitlist wording, and says outright that
            there is no fixed timeline. This page had already dropped that promise
            — a practitioner signing today is empanelled ahead of demand, so no
            session exists to send them — but on wording chosen here rather than by
            the client. The delivery makes it theirs, and names what the wait is
            actually on: a session matching this practitioner's profile and city.
            The 2-3 day window still holds for reviewing an *application* — see
            features/practitioners — but not for a session. */}
        {/* V7 .success-sub: 15px/1.65, centred and capped at 480px.

            One unbroken sentence, with "your inbox" set like the words around it.
            V7 emphasises that phrase — `font-weight:500; color:var(--ink)` — but
            there it is a placeholder its own script overwrites with the
            practitioner's address (iqcommune-onboarding.html:562), so the weight
            was marking a VALUE. The client's 2026-08-14 delivery prints the
            literal words instead, and their document writes the sentence as plain
            prose; keeping the emphasis left two ordinary words looking like a
            variable that never arrived.

            Restoring V7's behaviour means rendering {practitioner.email} here —
            noted because no gate covers it: the whole success view sits behind a
            signature and is declared state-gated, so this comment is the only
            record that printing the literal words is deliberate. */}
        <p className="mx-auto mb-8 max-w-[480px] text-lg leading-[1.65] text-ink-muted">
          Your empanelment is confirmed. We&apos;ll reach out the moment a session comes up that
          matches your profile and city — there&apos;s no fixed timeline, since it depends on
          demand in your area. Keep an eye on your inbox.
        </p>
        <dl className="rounded-lg border border-border bg-surface-soft px-4 py-3 text-left">
          {(
            [
              // v2's receipt. The reference changes identity here, not just
              // label: before signing the page shows the Agreement Reference
              // Number, and the receipt is the first surface that can show the
              // Empanelment one, because that is what submitting produces.
              ["Signed by", fullName],
              ["Empanelment Reference Number", empanelmentReference ?? "—"],
              ["Execution Date", signedAt],
              ["Signature Method", signature?.mode === "drawn" ? "Drawn" : "Typed"],
              ["Status", "✓ Digitally signed"],
            ] as ReadonlyArray<[string, string]>
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-b-0"
            >
              <dt className="text-sm text-ink-muted">{label}</dt>
              <dd className="text-right text-base font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  return (
    <>
      {/* A sibling of the card, not a child: `.stepper` is its own bordered box
          in V7 and Stepper already draws one, so nesting it here put a card
          inside a card. */}
      <Stepper steps={STEPS} current={2} />
      {/* rounded-[12px], not rounded-lg: V7 `.card` is `var(--radius)` = 12px in
          seven of the eight specs. `--radius-lg` is 8px here because audit H4
          counted literal `border-radius:12px` and missed the variable — 8px is
          right for `.summary-item`, which sets it literally, and wrong for the
          card. The agreement card below already carries the correction. */}
      <section className="rounded-[12px] border border-border bg-surface p-8">
        {/* V7 .card-title — 18px/600/-0.01em, on the page's inherited 1.7 leading. */}
        <h1 className="mb-1.5 text-2xl font-semibold leading-[1.7] tracking-[-0.01em] text-ink">
          Welcome to the iqcommune practitioner network.
        </h1>
        <p className="mb-6 text-md leading-[1.6] text-ink-muted">
          Your application has been reviewed and we&apos;d love to have you on board. Please review
          your details below, read through the empanelment agreement carefully, and provide your
          digital signature to complete the onboarding.
        </p>
        {/* V7 .summary-item: filled surface-soft cards, two columns that collapse
            to one at the spec's 600px breakpoint.

            v2 replaced Current role and Organisation with State, and spelled the
            reference label out in full. The two dropped rows are the same two the
            agreement itself stopped printing — the page no longer shows a
            practitioner anything the contract does not carry. */}
        <dl className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
          {(
            [
              ["Name", practitioner.name],
              ["City", practitioner.city],
              ["State", practitioner.state],
              ["Agreement Reference Number", practitioner.agreementReference],
            ] as ReadonlyArray<[string, string]>
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg bg-surface-soft px-4 py-3">
              {/* Both inherit the page's 1.7 leading in V7; Tailwind's per-size
                  defaults are tighter and shrank each card by ~7px. */}
              <dt className="mb-[3px] text-xs font-medium uppercase leading-[1.7] tracking-eyebrow text-ink-faint">
                {label}
              </dt>
              <dd className="text-md font-medium leading-[1.7] text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-[1.55] text-ink-faint">
          If any detail above is incorrect, please reply to the email you received this link from
          before proceeding.
        </p>
      </section>

      <section className="mt-6 rounded-[12px] border border-border bg-surface p-8">
        <h2 className="mb-1.5 text-2xl font-semibold leading-[1.7] tracking-[-0.01em] text-ink">
          Practitioner Empanelment Agreement
        </h2>
        {/* V7 .card-sub carries its own 1.6 leading, unlike the 1.7 around it. */}
        <p className="mb-4 text-md leading-[1.6] text-ink-muted">
          Please read the full agreement below before signing. You must scroll to the end to
          proceed.
        </p>

        {/* V7 .agreement-viewer — a dark toolbar over the scrolling body. */}
        <div className="overflow-hidden rounded-[12px] border border-border">
          <div className="flex items-center justify-between gap-3 bg-ink px-5 py-4">
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-surface">
                iqcommune — Practitioner Empanelment Agreement
              </p>
              {/* Reference alone in v2 — the date left the toolbar with the
                  Agreement Date row it mirrored. */}
              <p className="truncate text-xs text-on-dark-faint">
                {practitioner.agreementReference}
              </p>
            </div>
            <span
              aria-live="polite"
              className={`flex shrink-0 items-center gap-1.5 text-base font-medium ${
                readToEnd ? "text-gold" : "text-on-dark-muted"
              }`}
            >
              {readToEnd ? "✓ Agreement read" : "Scroll to read"}
              {!readToEnd ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                  focusable="false"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              ) : null}
            </span>
          </div>
          {/*
            The agreement scrolls inside its own panel. `overscroll-contain` stops
            a flick at the bottom from scrolling the page instead — on a phone that
            is how someone skips the last clause without meaning to.
          */}
          <div
            ref={agreementRef}
            tabIndex={0}
            aria-label="Practitioner Empanelment Agreement"
            onScroll={(event) => {
              const el = event.currentTarget;
              if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadToEnd(true);
            }}
            /* V7 .agreement-body: 1.75rem 2rem padding on its own 1.75 leading,
               which everything inside inherits unless it sets its own. */
            className="max-h-[420px] overflow-y-auto overscroll-contain bg-surface-soft px-8 py-7 leading-[1.75] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
          >
          {/* Literal capitals, not `uppercase`: the spec's own text is capitalised
              and the parity gate compares characters, not rendered casing. */}
          {/* `leading-[1.75]` is repeated on each of these rather than left to
              the viewer: a Tailwind text-* utility sets its own line-height, so
              it overrides the container's inherited value instead of taking it. */}
          <p className="text-2xl font-semibold leading-[1.75] tracking-[-0.01em] text-ink">
            PRACTITIONER EMPANELMENT AGREEMENT
          </p>
          <p className="mb-6 text-base leading-[1.75] text-ink-faint">
            Non-Exclusive · Confidential · India
          </p>

          <dl className="mb-4 overflow-hidden rounded-md border border-border">
            {(
              [
                // v2's four rows. Deliberately NOT `AGREEMENT_HEADER_FIELDS`,
                // which is the *executed document's* header: that one ends on
                // the Empanelment Reference Number, and this one ends on the
                // Agreement Reference Number. The client's readme is explicit
                // that the difference is intentional — IQC-EMP does not exist
                // until submission, so the page before signing cannot show it.
                //
                // The Platform row went with the same delivery: the preamble
                // below now names InvestQ Commune inline, and a row repeating it
                // would state the same party twice.
                ["Name", practitioner.name],
                ["City", practitioner.city],
                ["State", practitioner.state],
                ["Agreement Reference Number", practitioner.agreementReference],
              ] as ReadonlyArray<[string, string]>
            ).map(([label, value]) => (
              <div key={label} className="flex border-b border-border last:border-b-0">
                {/* V7 .ag-detail-table td: 0.6rem 0.9rem, 13px. */}
                <dt className="w-[38%] shrink-0 bg-gold-light px-[0.9rem] py-[0.6rem] text-base font-semibold leading-[1.75] text-gold-dark">
                  {label}
                </dt>
                <dd className="flex-1 bg-surface px-[0.9rem] py-[0.6rem] text-base font-medium leading-[1.75] text-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {/* V7 .ag-preamble is 13.5px; the scale's nearest step is 13px and no
              token exists for the half-pixel.

              The wording is the client's own introParagraph rather than V7's,
              because this sentence fixes when the agreement takes effect and the
              PDF prints the same one. Two preambles for one contract is how the
              page and the archive end up saying different things. */}
          <p className="mb-5 text-base leading-[1.7] text-ink-muted">{AGREEMENT_INTRO}</p>

          {AGREEMENT_CLAUSES.map((clause) => (
            <section key={clause.title}>
              <h3 className="mb-2 mt-6 text-md font-semibold leading-[1.75] text-ink">
                {clause.title}
              </h3>
              {/* One flat list in the client's order. A lettered sub-clause is
                  indented on the strength of its own "(a)" rather than a
                  separate field, so the order on screen is the order in the
                  contract — which is what the PDF was getting wrong. */}
              {clause.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className={`mb-2 text-base leading-[1.7] text-ink-muted ${
                    /^\([a-z]\)/.test(paragraph) ? "pl-5" : ""
                  }`}
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
          {/* V7 .ag-end is italic, 13px — the border stands in for the spec's
              separate .ag-divider element rather than adding an empty node. */}
          <p className="mt-6 border-t border-border pt-4 text-center text-base italic leading-[1.75] text-ink-faint">
            — End of Agreement — · iqcommune (InvestQ Commune) · hello@iqcommune.com
          </p>
          </div>
        </div>

        {/* V7 .scroll-gate-notice — a box with a shield icon that turns green
            once the agreement has been read to the end. */}
        <p
          aria-live="polite"
          className={`mt-3 flex items-center gap-2 rounded-lg border px-4 py-3 text-base ${
            readToEnd
              ? "border-green/40 bg-green-light text-green"
              : "border-border bg-surface-soft text-ink-muted"
          }`}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
            focusable="false"
            className="shrink-0"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {readToEnd
            ? "You've read the full agreement. Please complete your signature below."
            : "Please scroll through and read the full agreement above before you can proceed to sign."}
        </p>
      </section>

      <form
        ref={signFormRef}
        // Hidden until the agreement is read to the end, as in V7.
        className={`mt-6 rounded-[12px] border border-border bg-surface p-8 ${readToEnd ? "" : "hidden"}`}
        onSubmit={async (event) => {
          event.preventDefault();
          // Each problem names the control it belongs to, so the message renders
          // beside that control and `focusFirstError` can travel to it. A single
          // shared message at the foot of the form said what was wrong but never
          // where, which on a page this long is most of the answer.
          const fail = (next: FormErrors) => {
            setErrors(next);
            focusFirstError(signFormRef.current);
          };
          if (!readToEnd) return fail({ form: "Please read the full agreement before signing." });
          if (!fullName.trim()) return fail({ fullName: "Your full name is required." });
          if (!signature) return fail({ signature: "Please draw or type your signature." });
          setErrors({});
          // Typed at the call site rather than widening the shared hook: this is
          // the one route that answers with more than a timestamp, because it
          // allocates the empanelment number while handling the request.
          const receipt = await submit<{ at: string; empanelmentReference: string | null }>(
            "/api/agreements",
            {
              fullName,
              signature: signature.mode === "drawn" ? signature.dataUrl : signature.text,
              signatureMode: signature.mode,
            },
          );
          // The same instant the PDF prints, rendered by the same function, so
          // the receipt on screen and the archived agreement cannot disagree.
          if (receipt) {
            setEmpanelmentReference(receipt.empanelmentReference ?? null);
            setSignedAt(formatRecordedAt(receipt.at));
          }
        }}
      >
        {/* V7 .declaration-box — gold box, gold-dark title + list-marker points. */}
        <div className="mb-5 rounded-[12px] border-[1.5px] border-gold-border bg-gold-light px-6 py-5">
          <h2 className="mb-3 text-md font-semibold text-gold-dark">
            By signing below, you confirm that:
          </h2>
          <ul className="list-disc pl-4 text-base leading-[1.7] text-gold-dark">
            {CONFIRMATIONS.map((item) => (
              <li key={item} className="mb-[0.35rem] last:mb-0">
                {item}
              </li>
            ))}
          </ul>
          {/* The client's own consent sentence, and the one the PDF prints above
              the signature block. The bullets above are what the practitioner is
              confirming; this is what confirming them means. */}
          <p className="mt-3.5 border-t border-gold-border pt-3 text-base leading-[1.7] text-gold-dark">
            {AGREEMENT_CONSENT_TEXT}
          </p>
        </div>

        {/* Designation was removed by the v2 delivery, along with the Current
            role and Organisation rows above — the agreement no longer prints any
            of them, so collecting one would be asking for something nothing
            reads. */}
        <TextField
          label="Full name (as per any valid ID proof)"
          placeholder="Your full legal name"
          value={fullName}
          onChange={setFullName}
          error={errors.fullName}
        />

        {/* `tabIndex={-1}` so an unsigned form can send focus here: the pad is a
            canvas and a set of controls, with no single input to land on. The
            message sits directly beneath rather than at the foot of the form. */}
        <div
          tabIndex={-1}
          data-invalid={errors.signature ? true : undefined}
          aria-describedby={errors.signature ? signatureErrorId : undefined}
          className="outline-none"
        >
          <ErrorBoundary label="signature-pad">
            <SignaturePad onChange={setSignature} />
          </ErrorBoundary>
          {errors.signature ? (
            <p id={signatureErrorId} role="alert" className="mt-1 text-sm text-red">
              {errors.signature}
            </p>
          ) : null}
        </div>

        {/* V7 .timestamp-row: a live clock on the left, the note pushed right.
            The value starts as the spec's own "—" placeholder and is filled
            after mount, so the server never renders a time the client disagrees
            with — the UTC/IST day-boundary trap (audit M7). */}
        <p className="mb-4 flex items-center gap-2 text-sm text-ink-faint">
          <span>
            Digital timestamp: <span className="font-medium text-ink">{liveTimestamp ?? "—"}</span>
          </span>
          <span className="ml-auto text-xs">Auto-captured at submission</span>
        </p>

        {/* Only what belongs to no single control still shows here; the field
            problems now render beside the field they describe. */}
        {errors.form ? (
          <p role="alert" className="mb-3 rounded-md border border-red bg-red-light px-3 py-2 text-sm text-red">
            {errors.form}
          </p>
        ) : null}

        {submitError ? (
          <p role="alert" className="mb-3 rounded-md border border-red bg-red-light px-3 py-2 text-sm text-red">
            {submitError}
          </p>
        ) : null}

        {/* V7 .btn-sign carries the same shield as the scroll gate, 8px before
            the label, on 15px padding. */}
        <button
          type="submit"
          disabled={!readToEnd || busy}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink p-[15px] text-lg font-semibold text-surface transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
            focusable="false"
            className="shrink-0"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {busy ? "Signing…" : "I agree — sign & complete onboarding"}
        </button>
        {/* V7 .sign-fine sets no line-height, so it takes the page's 1.7. */}
        <p className="mt-3 text-center text-sm leading-[1.7] text-ink-faint">
          This action is irreversible. A copy of the signed agreement will be sent to your
          registered email.
        </p>
      </form>
    </>
  );
}
