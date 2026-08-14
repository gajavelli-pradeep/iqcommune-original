/**
 * Shared shapes for the five tokenised link pages (audit H6).
 *
 * These are the contract between a server loader (`services/link-pages.ts`) and
 * the client component that renders it. They live here — not inside the
 * `"use client"` feature files — so a server module never imports a type *out
 * of* the client graph. The `import/no-restricted-paths` guard enforces the
 * direction; this file is what makes obeying it possible.
 *
 * Every field is a `string`: the loader formats dates, amounts and joined
 * "City, State" values in one place, so the components format nothing.
 */

export interface RatedSession {
  practitioner: string;
  module: string;
  sessionDate: string;
  city: string;
  reference: string;
  requestedBy: string;
}

export interface ConsentSession {
  reference: string;
  agreementReference: string;
  issuedOn: string;
  firstName: string;
  module: string;
  date: string;
  startTime: string;
  duration: string;
  venue: string;
  cityState: string;
  audience: string;
  participants: string;
  spoc: string;
  grossPayout: string;
}

export interface PhotoSession {
  practitioner: string;
  practitionerRole: string;
  practitionerRef: string;
  sessionDate: string;
  module: string;
  city: string;
  state: string;
  sessionId: string;
}

/**
 * No `module`: the 2026-08-14 spec decouples module from the agreement, which
 * now records only that sessions fall "within their selected module(s) of
 * expertise". Preferences live on the practitioner record and are edited in the
 * console — `practitioner_agreements.modules` is still written, just no longer
 * a term of the document the practitioner signs.
 */
export interface OnboardingPractitioner {
  name: string;
  role: string;
  organisation: string;
  city: string;
  agreementReference: string;
}

export interface AdminInvite {
  email: string;
  role: string;
}

export interface ApplicationStatus {
  firstName: string;
  /** Short, public-facing restatement of the raw pipeline status — never the
   *  enum value itself (see `services/link-pages.ts`). */
  headline: string;
  detail: string;
  appliedOn: string;
  /** Index into `PIPELINE_STEPS` (features/status/PipelineStepper), or `null`
   *  when the status isn't one of the four forward-moving stages — Rejected
   *  has no step to highlight, and the stepper does not render for it. */
  pipelineStep: number | null;
  /** What was applied with — reminds the applicant what they submitted. */
  modules: string;
  cityState: string;
  experience: string;
}
