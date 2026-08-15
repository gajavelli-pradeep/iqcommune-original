import "server-only";

import { pipelineStepFor } from "@/constants/pipeline";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminInvite,
  ApplicationStatus,
  ConsentSession,
  OnboardingPractitioner,
  PhotoSession,
  RatedSession,
} from "@/types/link-pages";

/**
 * Loaders for the five tokenised pages.
 *
 * Each takes the uuid a verified token carries and returns the page's own
 * interface, or `null` — which every page renders as its invalid-link state
 * rather than as an error, because a missing row and a bad link are the same
 * thing to the person holding it.
 *
 * The components format nothing: every field they declare is a `string`, so
 * dates, amounts and joined "City, State" values are built here. One place.
 *
 * Three of these load from `session_practitioners`, not `sessions` — the
 * correction recorded in ADR 0004. A session with two practitioners makes a
 * session id ambiguous for a page that names a practitioner or shows a payout.
 */

const date = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" });

const rupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

/** Postgres `time` comes back as "10:00:00"; the page wants "10:00 AM". */
function clockTime(value: string | null): string {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

const ASSIGNMENT_SELECT = `
  id, gross_payout, currency, confirmation_reference, confirmation_issued_on, consent_given_at,
  practitioners ( reference, full_name, role ),
  sessions ( reference, module, session_date, start_time, duration_minutes, venue, city, state, audience, participants, spoc_name ),
  practitioner_agreements ( reference )
`;

interface AssignmentRow {
  id: string;
  gross_payout: number;
  confirmation_reference: string;
  confirmation_issued_on: string;
  consent_given_at: string | null;
  practitioners: { reference: string; full_name: string; role: string } | null;
  sessions: {
    reference: string;
    module: string;
    session_date: string;
    start_time: string | null;
    duration_minutes: number | null;
    venue: string | null;
    city: string;
    state: string;
    audience: string;
    participants: string | null;
    spoc_name: string;
  } | null;
  practitioner_agreements: { reference: string } | null;
}

async function loadAssignment(assignmentId: string): Promise<AssignmentRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .select(ASSIGNMENT_SELECT)
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`session_practitioners read failed: ${error.message}`);
  return (data as AssignmentRow | null) ?? null;
}

export async function getRatedSession(assignmentId: string): Promise<RatedSession | null> {
  const row = await loadAssignment(assignmentId);
  if (!row?.practitioners || !row.sessions) return null;

  return {
    practitioner: row.practitioners.full_name,
    module: row.sessions.module,
    sessionDate: date(row.sessions.session_date),
    city: row.sessions.city,
    reference: row.sessions.reference,
    requestedBy: row.sessions.spoc_name,
  };
}

export async function getConsentSession(assignmentId: string): Promise<ConsentSession | null> {
  const row = await loadAssignment(assignmentId);
  if (!row?.practitioners || !row.sessions) return null;

  return {
    reference: row.confirmation_reference,
    agreementReference: row.practitioner_agreements?.reference ?? "—",
    issuedOn: date(row.confirmation_issued_on),
    // The spec greets by first name only.
    firstName: row.practitioners.full_name.split(" ")[0],
    module: row.sessions.module,
    date: date(row.sessions.session_date),
    startTime: clockTime(row.sessions.start_time),
    duration: row.sessions.duration_minutes ? `${row.sessions.duration_minutes / 60} hours` : "—",
    venue: row.sessions.venue ?? "—",
    cityState: `${row.sessions.city}, ${row.sessions.state}`,
    audience: row.sessions.audience,
    participants: row.sessions.participants ?? "—",
    spoc: row.sessions.spoc_name,
    grossPayout: rupees(row.gross_payout),
  };
}

export async function getPhotoSession(assignmentId: string): Promise<PhotoSession | null> {
  const row = await loadAssignment(assignmentId);
  if (!row?.practitioners || !row.sessions) return null;

  return {
    practitioner: row.practitioners.full_name,
    practitionerRole: row.practitioners.role,
    practitionerRef: row.practitioners.reference,
    sessionDate: date(row.sessions.session_date),
    module: row.sessions.module,
    city: row.sessions.city,
    state: row.sessions.state,
    sessionId: row.sessions.reference,
  };
}

/**
 * Loaded by agreement id, not practitioner id: one practitioner may hold
 * several agreements over time, so a practitioner id selects an unbounded set.
 */
export async function getOnboardingPractitioner(
  agreementId: string,
): Promise<OnboardingPractitioner | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_agreements")
    .select(
      "reference, signed_at, practitioners ( full_name, role, organisation, city, state, email, reference )",
    )
    .eq("id", agreementId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`practitioner_agreements read failed: ${error.message}`);

  const row = data as {
    reference: string;
    signed_at: string | null;
    practitioners: {
      full_name: string;
      role: string;
      organisation: string | null;
      city: string;
      state: string | null;
      email: string | null;
      reference: string | null;
    } | null;
  } | null;
  if (!row?.practitioners) return null;

  return {
    name: row.practitioners.full_name,
    role: row.practitioners.role,
    organisation: row.practitioners.organisation ?? "Independent",
    city: row.practitioners.city,
    // Blank rather than invented when a pre-0017 record never captured one —
    // the agreement header shows an empty State, which is at least true.
    state: row.practitioners.state ?? "",
    // V7 falls back to this same phrase when the link carries no address.
    email: row.practitioners.email ?? "your registered email",
    agreementReference: row.reference,
    empanelmentReference: row.practitioners.reference,
  };
}

/**
 * A consumed invite resolves to `null` — the invalid-link state. Single-use
 * cannot live in the token, which is unrevokable by design, so it lives here.
 */
export async function getAdminInvite(inviteId: string): Promise<AdminInvite | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .select("email, role")
    .eq("id", inviteId)
    .is("consumed_at", null)
    .is("deleted_at", null)
    // Align with getOpenInvite (audit L2): an expired invite must render the
    // invalid-link state, not a live password-setup form whose submit then fails.
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw new Error(`admin_invites read failed: ${error.message}`);
  if (!data) return null;

  const LABELS: Record<string, string> = {
    global_admin: "Global Admin",
    admin: "Admin",
    user: "User",
  };
  // Rendered through a label map so a raw database value can never appear on a
  // page that grants console access.
  return { email: data.email, role: LABELS[data.role] ?? data.role };
}

/**
 * Who and what a photos token refers to. Separate from `getPhotoSession`, which
 * returns display strings: this returns the identifiers and raw values the
 * write needs, so the route never has to re-parse a formatted date.
 */
export interface PhotoSubmissionOwnerRow {
  sessionId: string;
  practitionerId: string;
  practitionerName: string;
  practitionerEmail: string;
  sessionDate: string;
  module: string;
}

export async function getPhotoSubmissionOwner(
  assignmentId: string,
): Promise<PhotoSubmissionOwnerRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .select("session_id, practitioner_id, practitioners ( full_name, email ), sessions ( session_date, module )")
    .eq("id", assignmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`session_practitioners read failed: ${error.message}`);

  const row = data as {
    session_id: string;
    practitioner_id: string;
    practitioners: { full_name: string; email: string } | null;
    sessions: { session_date: string; module: string } | null;
  } | null;
  if (!row?.practitioners || !row.sessions) return null;

  return {
    sessionId: row.session_id,
    practitionerId: row.practitioner_id,
    practitionerName: row.practitioners.full_name,
    practitionerEmail: row.practitioners.email,
    sessionDate: row.sessions.session_date,
    module: row.sessions.module,
  };
}

/** The stored role and email behind an open invite, for account creation. */
export async function getOpenInvite(
  inviteId: string,
): Promise<{ email: string; role: string } | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_invites")
    .select("email, role, expires_at")
    .eq("id", inviteId)
    .is("consumed_at", null)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`admin_invites read failed: ${error.message}`);
  if (!data) return null;
  // Expiry is enforced here as well as in the token: an invite row may outlive
  // or predate the link that points at it.
  if (new Date(data.expires_at) <= new Date()) return null;
  return { email: data.email, role: data.role };
}

/** The pipeline status a track-your-application page can show, restated in
 *  plain language — an applicant sees "you're empanelled", never the raw
 *  "Empanelled" enum value a console operator works with. Anything not in
 *  the active pipeline (a legacy value, or none of the below) gets the same
 *  generic "still with us" line rather than guessing at what an unfamiliar
 *  status means. */
const STATUS_COPY: Record<string, { headline: string; detail: string }> = {
  Applied: {
    headline: "We've received your application",
    detail: "It's next in line for review — we'll be in touch within 2–3 working days.",
  },
  "Screening Done": {
    headline: "Your application has been reviewed",
    detail: "We've had our informal chat and are finalising next steps. We'll follow up shortly.",
  },
  "Agreement Sent": {
    headline: "You're almost there",
    detail: "We've sent your empanelment agreement — check your email to review and sign it.",
  },
  Empanelled: {
    headline: "You're empanelled!",
    detail:
      "Welcome to the iqcommune practitioner network — we'll be in touch with your first session details soon.",
  },
  Rejected: {
    headline: "An update on your application",
    detail:
      "We're not able to move forward with your application at this time. We genuinely appreciate the time you took to apply.",
  },
};

const DEFAULT_STATUS_COPY = {
  headline: "Your application is with us",
  detail: "It's in our pipeline and being reviewed. We'll be in touch as things progress.",
};

export async function getApplicationStatus(applicationId: string): Promise<ApplicationStatus | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_applications")
    .select("first_name, status, created_at, modules, city, state, experience_band")
    .eq("id", applicationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(`practitioner_applications read failed: ${error.message}`);
  if (!data) return null;

  const copy = STATUS_COPY[data.status] ?? DEFAULT_STATUS_COPY;
  return {
    firstName: data.first_name,
    pipelineStep: pipelineStepFor(data.status),
    headline: copy.headline,
    detail: copy.detail,
    appliedOn: date(data.created_at),
    modules: (data.modules as string[]).join(", "),
    cityState: `${data.city}, ${data.state}`,
    experience: data.experience_band,
  };
}