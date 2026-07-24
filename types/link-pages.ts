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

export interface OnboardingPractitioner {
  name: string;
  role: string;
  organisation: string;
  module: string;
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
}
