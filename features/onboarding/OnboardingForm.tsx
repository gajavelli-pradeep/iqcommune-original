"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TextField } from "@/components/ui/Field";
import { focusFirstError } from "@/components/ui/focus-first-error";
import { Stepper } from "@/components/ui/Stepper";
import { useApiSubmit } from "@/hooks/useApiSubmit";
import { useFocusWhen } from "@/hooks/useFocusWhen";
import type { OnboardingPractitioner } from "@/types/link-pages";

import { AGREEMENT_CLAUSES } from "@/constants/agreement";
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

export function OnboardingForm({
  practitioner,
  token,
  agreementDate,
}: {
  practitioner: OnboardingPractitioner;
  token: string;
  /**
   * The on-screen "Date:" line, computed once on the server in IST (audit M7).
   * Deriving it in the client render body made the server (UTC) and client (IST)
   * disagree at the day boundary — a hydration mismatch, and a wrong date on a
   * legally-binding agreement. The authoritative signing time is the server's
   * `signedAt`; this is display only.
   */
  agreementDate: string;
}) {
  const [readToEnd, setReadToEnd] = useState(false);
  const [fullName, setFullName] = useState(practitioner.name);
  const [designation, setDesignation] = useState(practitioner.role);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
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
      setLiveTimestamp(
        `${now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}  ` +
          now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
      );
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
        {/* V7 promises the first session details "within 2-3 working days".
            That was written before the waitlist phase: a practitioner who signs
            today is empanelled ahead of demand, and no session exists to send
            them. The 2-3 day window still holds for reviewing an *application*
            — see features/practitioners — but not for a session. */}
        {/* V7 .success-sub: 15px/1.65, centred and capped at 480px. */}
        <p className="mx-auto mb-8 max-w-[480px] text-lg leading-[1.65] text-ink-muted">
          Your empanelment is confirmed. We&apos;ll be in touch with your first session details
          as soon as sessions open in your city. Keep an eye on{" "}
          <span className="font-medium text-ink">{practitioner.email}</span>.
        </p>
        <dl className="rounded-lg border border-border bg-surface-soft px-4 py-3 text-left">
          {(
            [
              // Four rows, as V7 — no Designation row; it collects the field but
              // does not read it back on the receipt.
              ["Signed by", fullName],
              ["Agreement ref.", practitioner.agreementReference],
              ["Timestamp", signedAt],
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
            to one at the spec's 600px breakpoint — a half-width card holds an
            organisation name badly on a phone. */}
        <dl className="grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
          {(
            [
              ["Name", practitioner.name],
              ["Current role", practitioner.role],
              ["Organisation", practitioner.organisation],
              ["City", practitioner.city],
              ["Agreement reference", practitioner.agreementReference],
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
              <p className="truncate text-xs text-on-dark-faint">
                {practitioner.agreementReference} · {agreementDate}
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
                ["Agreement Date", agreementDate],
                ["Platform", "InvestQ Commune, operating as iqcommune (\"the Platform\")"],
                // V7 builds this row as `name · city · email` in script, which is
                // why the copy gate never saw it missing.
                [
                  "Practitioner",
                  `${practitioner.name} · ${practitioner.city} · ${practitioner.email}`,
                ],
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
              token exists for the half-pixel. */}
          <p className="mb-5 text-base leading-[1.7] text-ink-muted">
            This Agreement is entered into between the Platform and the Practitioner (individually
            a &quot;Party&quot;, collectively the &quot;Parties&quot;). Together they agree to the
            following terms governing the Practitioner&apos;s empanelment and participation in
            iqcommune sessions.
          </p>

          {AGREEMENT_CLAUSES.map((clause) => (
            <section key={clause.title}>
              <h3 className="mb-2 mt-6 text-md font-semibold leading-[1.75] text-ink">
                {clause.title}
              </h3>
              {clause.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mb-2 text-base leading-[1.7] text-ink-muted">
                  {paragraph}
                </p>
              ))}
              {clause.highlights?.map((highlight) => (
                <p
                  key={highlight}
                  className="my-4 rounded-r-md border-l-[3px] border-l-gold bg-gold-light px-4 py-3 text-base leading-[1.65] text-gold-dark"
                >
                  {highlight}
                </p>
              ))}
              {clause.subClauses?.map((sub) => (
                <p key={sub} className="mb-1.5 pl-5 text-base leading-[1.7] text-ink-muted">
                  {sub}
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
          const receipt = await submit("/api/agreements", {
            fullName,
            designation,
            signature: signature.mode === "drawn" ? signature.dataUrl : signature.text,
            signatureMode: signature.mode,
          });
          if (receipt) {
            setSignedAt(
              new Date(receipt.at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            );
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
        </div>

        <TextField
          label="Full name (as it should appear on the agreement)"
          placeholder="Your full legal name"
          value={fullName}
          onChange={setFullName}
          error={errors.fullName}
        />
        <TextField
          label="Designation"
          placeholder="e.g. Equity Analyst"
          value={designation}
          onChange={setDesignation}
          hint="As per your current employment."
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
            with — the same hydration trap `agreementDate` avoids. */}
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
