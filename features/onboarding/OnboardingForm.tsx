"use client";

import { useRef, useState } from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TextField } from "@/components/ui/Field";
import { Stepper } from "@/components/ui/Stepper";
import { useApiSubmit } from "@/hooks/useApiSubmit";
import { useFocusWhen } from "@/hooks/useFocusWhen";
import type { OnboardingPractitioner } from "@/types/link-pages";

import { AGREEMENT_CLAUSES } from "./agreement";
import { SignaturePad, type Signature } from "./SignaturePad";

/** P6 — review and sign the empanelment agreement. */

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
  // `error` is client-side confirmation validation; `submitError` is the
  // network/route path, now shared (audit H8).
  const [error, setError] = useState<string>();
  const { submit, busy, error: submitError } = useApiSubmit(token);
  const successRef = useFocusWhen<HTMLHeadingElement>(Boolean(signedAt));

  const agreementRef = useRef<HTMLDivElement>(null);

  if (signedAt) {
    return (
      <section role="status" className="rounded-lg border border-border bg-surface px-8 py-12 text-center">
        <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-green-light text-green">
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
          className="mb-1 text-2xl font-semibold text-ink outline-none"
        >
          Agreement signed. Welcome to iqcommune.
        </h1>
        <p className="mb-5 text-base leading-[1.6] text-ink-muted">
          Your empanelment is confirmed. We&apos;ll be in touch with your first session details
          within 2–3 working days. Keep an eye on your inbox.
        </p>
        <dl className="rounded-lg border border-border bg-surface-soft px-4 py-3 text-left">
          {(
            [
              ["Signed by", fullName],
              ["Designation", designation],
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
      <section className="rounded-lg border border-border bg-surface p-8">
        <Stepper steps={STEPS} current={2} />
        <h1 className="mb-1.5 text-2xl font-semibold text-ink">
          Welcome to the iqcommune practitioner network.
        </h1>
        <p className="mb-6 text-md leading-[1.6] text-ink-muted">
          Your application has been reviewed and we&apos;d love to have you on board. Please review
          your details below, read through the empanelment agreement carefully, and provide your
          digital signature to complete the onboarding.
        </p>
        {/* V7 .summary-item: filled surface-soft cards, always two columns. */}
        <dl className="grid grid-cols-2 gap-3">
          {(
            [
              ["Name", practitioner.name],
              ["Current role", practitioner.role],
              ["Organisation", practitioner.organisation],
              ["Module assigned", practitioner.module],
              ["City", practitioner.city],
              ["Agreement reference", practitioner.agreementReference],
            ] as ReadonlyArray<[string, string]>
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg bg-surface-soft px-4 py-3">
              <dt className="mb-[3px] text-xs font-medium uppercase tracking-eyebrow text-ink-faint">
                {label}
              </dt>
              <dd className="text-md font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-[1.55] text-ink-faint">
          If any detail above is incorrect, please reply to the email you received this link from
          before proceeding.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-border bg-surface p-8">
        <h2 className="mb-1 text-2xl font-semibold text-ink">
          iqcommune — Practitioner Empanelment Agreement
        </h2>
        <p className="mb-4 text-base text-ink-muted">
          Please read the full agreement below before signing. You must scroll to the end to
          proceed.
        </p>

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
          className="max-h-[420px] overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface-soft px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
        >
          {/* Literal capitals, not `uppercase`: the spec's own text is capitalised
              and the parity gate compares characters, not rendered casing. */}
          <p className="text-md font-semibold tracking-caps text-ink">
            PRACTITIONER EMPANELMENT AGREEMENT
          </p>
          <p className="mb-4 text-sm text-ink-faint">Non-Exclusive · Confidential · India</p>

          <dl className="mb-4 overflow-hidden rounded-md border border-border">
            {(
              [
                ["Agreement Date", agreementDate],
                ["Platform", "InvestQ Commune, operating as iqcommune (\"the Platform\")"],
                ["Practitioner", practitioner.name],
                ["Module(s)", practitioner.module],
              ] as ReadonlyArray<[string, string]>
            ).map(([label, value]) => (
              <div key={label} className="flex border-b border-border last:border-b-0">
                <dt className="w-[38%] shrink-0 bg-gold-light px-3 py-2 text-sm font-semibold text-gold-dark">
                  {label}
                </dt>
                <dd className="flex-1 bg-surface px-3 py-2 text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mb-4 text-sm leading-[1.7] text-ink-muted">
            This Agreement is entered into between the Platform and the Practitioner (individually
            a &quot;Party&quot;, collectively the &quot;Parties&quot;). Together they agree to the
            following terms governing the Practitioner&apos;s empanelment and participation in
            iqcommune sessions.
          </p>

          {AGREEMENT_CLAUSES.map((clause) => (
            <section key={clause.title}>
              <h3 className="mb-2 mt-6 text-md font-semibold text-ink">{clause.title}</h3>
              {clause.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mb-2 text-sm leading-[1.7] text-ink-muted">
                  {paragraph}
                </p>
              ))}
              {clause.highlights?.map((highlight) => (
                <p
                  key={highlight}
                  className="my-3 rounded-r-md border-l-[3px] border-l-gold bg-gold-light px-4 py-3 text-sm leading-[1.65] text-gold-dark"
                >
                  {highlight}
                </p>
              ))}
              {clause.subClauses?.map((sub) => (
                <p key={sub} className="mb-1.5 pl-5 text-sm leading-[1.7] text-ink-muted">
                  {sub}
                </p>
              ))}
            </section>
          ))}
          <p className="mt-6 border-t border-border pt-4 text-center text-sm text-ink-faint">
            — End of Agreement — · iqcommune (InvestQ Commune) · hello@iqcommune.com
          </p>
        </div>

        <p className="mt-3 text-2xs font-semibold uppercase tracking-caps text-ink-faint">
          Scroll to read
        </p>
        <p aria-live="polite" className="mt-1 text-sm font-medium text-gold-dark">
          {readToEnd
            ? "✓ Agreement read. Please complete your signature below."
            : "Please scroll through and read the full agreement above before you can proceed to sign."}
        </p>
      </section>

      <form
        className="mt-4 rounded-lg border border-border bg-surface p-8"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!readToEnd) return setError("Please read the full agreement before signing.");
          if (!fullName.trim()) return setError("Your full name is required.");
          if (!signature) return setError("Please draw or type your signature.");
          setError(undefined);
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
        />
        <TextField
          label="Designation"
          placeholder="e.g. Equity Analyst"
          value={designation}
          onChange={setDesignation}
          hint="As per your current employment."
        />

        <ErrorBoundary label="signature-pad">
          <SignaturePad fullName={fullName} onChange={setSignature} />
        </ErrorBoundary>

        <p className="mb-4 text-sm text-ink-faint">
          Digital timestamp: Auto-captured at submission
        </p>

        {error ? (
          <p role="alert" className="mb-3 rounded-md border border-red bg-red-light px-3 py-2 text-sm text-red">
            {error}
          </p>
        ) : null}

        {submitError ? (
          <p role="alert" className="mb-3 rounded-md border border-red bg-red-light px-3 py-2 text-sm text-red">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!readToEnd || busy}
          className="min-h-11 w-full rounded-full bg-ink px-5 py-4 text-lg font-semibold text-surface transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Signing…" : "I agree — sign & complete onboarding"}
        </button>
        <p className="mt-3 text-center text-sm leading-[1.5] text-ink-faint">
          This action is irreversible. A copy of the signed agreement will be sent to your
          registered email.
        </p>
      </form>
    </>
  );
}
