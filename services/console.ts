import "server-only";

import { AUDIENCE_LABELS, type Audience } from "@/lib/schemas/session-request";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Console reads.
 *
 * Every one of these runs behind `requireRole`, which has already established
 * who is asking. They use the service-role client because the console shows
 * data across every practitioner and session — RLS scoped to a single user is
 * the wrong shape for an admin view, and the route is the boundary.
 *
 * Every list ends `.order("id")`. That is not decoration: the visible sort keys
 * here are dates and integers that rows routinely SHARE — two payouts issued
 * the same day, two sessions on the same date — and rows tied on the sort key
 * have no defined order in SQL. Without a unique tiebreaker the table quietly
 * reshuffles between reads, so an edit typed into "the second row" can be saved
 * against whichever record has drifted into that position. That is how a payout
 * gets another payout's invoice reference.
 */

/**
 * One row of the V7 practitioner pipeline.
 *
 * The pipeline spans two tables: `practitioner_applications` holds the first
 * four stages (Applied → Screening Done → Agreement Sent → Rejected) and every
 * profile field the detail card renders; `practitioners` holds the last two
 * (Empanelled, Deactivated). A row is one person seen through whichever of
 * those records exists, which is why both ids are carried — a mutation has to
 * know which table it owns.
 */
export interface PractitionerRow {
  /** Namespaced `app:<uuid>` / `prac:<uuid>` so ids stay unique across the union. */
  id: string;
  applicationId: string | null;
  practitionerId: string | null;
  /** Assigned at empanelment — `null` before it, never invented. */
  reference: string | null;
  name: string;
  role: string;
  organisation: string | null;
  module: string;
  city: string;
  state: string | null;
  /** Postal address for the welcome kit; only newer applications carry one. */
  address: string | null;
  tshirtSize: string | null;
  experience: string | null;
  email: string;
  phone: string | null;
  appliedOn: string;
  status: string;
  /** Mean of this practitioner's session ratings, or `null` if never rated. */
  averageRating: number | null;
  /** Internal admin notes — never shown to the practitioner. */
  notes: string | null;
}

const date = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";

/**
 * Normalises an embedded Supabase relation. The query builder types every embed
 * as an array even for a to-one FK; at runtime a to-one is a single object. This
 * returns the one row (or null) regardless of which shape arrives.
 */
function one<T>(relation: unknown): T | null {
  if (Array.isArray(relation)) return (relation[0] ?? null) as T | null;
  return (relation ?? null) as T | null;
}

/** A practitioner's mean rating, keyed by practitioner id. Unrated → absent. */
async function averageRatings(
  supabase: ReturnType<typeof createAdminClient>,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("session_ratings")
    .select("rating, session_practitioners ( practitioner_id, deleted_at )");

  // A rating is decoration on this table, not its subject: failing the whole
  // pipeline read because the ratings join broke would be the wrong trade.
  if (error) return new Map();

  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const assignment = one<{ practitioner_id: string; deleted_at: string | null }>(
      row.session_practitioners,
    );
    if (!assignment || assignment.deleted_at) continue;
    const running = totals.get(assignment.practitioner_id) ?? { sum: 0, count: 0 };
    running.sum += row.rating;
    running.count += 1;
    totals.set(assignment.practitioner_id, running);
  }

  return new Map(
    [...totals].map(([id, { sum, count }]) => [id, Math.round((sum / count) * 10) / 10]),
  );
}

/**
 * The whole practitioner pipeline — applications and practitioners as one list.
 *
 * A practitioner that came from an application appears once, not twice: the
 * application supplies the profile, the practitioner record supplies the
 * outcome. Where the two disagree the practitioner wins, because a live
 * Deactivated must not be masked by the stage the application stopped at.
 */
export async function listPractitioners(): Promise<PractitionerRow[]> {
  const supabase = createAdminClient();

  // Bounded (audit M15): the console table is not paginated yet, so cap each
  // read rather than fetch an unbounded set as the network grows.
  const [applications, practitioners, ratings] = await Promise.all([
    supabase
      .from("practitioner_applications")
      .select(
        "id, status, first_name, last_name, email, phone, job_title, city, state, experience_band, address, tshirt_size, modules, admin_notes, created_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(500),
    supabase
      .from("practitioners")
      .select(
        "id, reference, full_name, role, organisation, city, email, status, application_id, created_at, practitioner_agreements ( modules, deleted_at )",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(500),
    averageRatings(supabase),
  ]);

  if (applications.error) {
    throw new Error(`practitioner_applications read failed: ${applications.error.message}`);
  }
  if (practitioners.error) {
    throw new Error(`practitioners read failed: ${practitioners.error.message}`);
  }

  const applicationById = new Map((applications.data ?? []).map((row) => [row.id, row]));

  // A practitioner seeded before `application_id` was populated still has an
  // application behind them; without this they appear twice — once as the
  // applicant and once as the practitioner — which reads as two people. Email
  // is the identity the rest of the system already keys on (both tables carry a
  // `lower(email)` index for exactly this).
  const applicationByEmail = new Map(
    (applications.data ?? []).map((row) => [row.email.toLowerCase(), row]),
  );

  const claimed = new Set<string>();

  // Sorted on the raw timestamp, not the rendered one: "12 Jun 2025" sorts
  // lexically, which puts December before June.
  const sortable: Array<{ at: string; row: PractitionerRow }> = [];

  for (const row of practitioners.data ?? []) {
    const application =
      (row.application_id ? applicationById.get(row.application_id) : undefined) ??
      applicationByEmail.get(row.email.toLowerCase());
    if (application) claimed.add(application.id);

    // Exclude soft-deleted agreements (audit M15): a withdrawn agreement must
    // not contribute its module to what a practitioner is shown as teaching.
    const agreements = ((row.practitioner_agreements ?? []) as Array<{
      modules: string[];
      deleted_at: string | null;
    }>).filter((agreement) => !agreement.deleted_at);

    const appliedAt = application?.created_at ?? row.created_at;
    sortable.push({
      at: appliedAt,
      row: {
        id: `prac:${row.id}`,
        applicationId: application?.id ?? null,
        practitionerId: row.id,
        reference: row.reference,
        name: row.full_name,
        role: row.role,
        organisation: row.organisation,
        // The module a practitioner teaches lives on their agreement, not on
        // them: it is what they were empanelled for, and it can change between
        // agreements without rewriting who they are.
        module:
          agreements.flatMap((agreement) => agreement.modules).join(", ") ||
          (application?.modules ?? []).join(", ") ||
          "—",
        city: row.city,
        state: application?.state ?? null,
        address: application?.address ?? null,
        tshirtSize: application?.tshirt_size ?? null,
        experience: application?.experience_band ?? null,
        email: row.email,
        phone: application?.phone ?? null,
        appliedOn: date(appliedAt),
        // A paused or deactivated practitioner shows that, not the stage their
        // application happens to sit at. 'Pending' is the pre-empanelment
        // placeholder the agreement FK needs, so it defers to the application.
        status: row.status === "Pending" ? (application?.status ?? "Agreement Sent") : row.status,
        averageRating: ratings.get(row.id) ?? null,
        notes: application?.admin_notes ?? null,
      },
    });
  }

  for (const row of applications.data ?? []) {
    if (claimed.has(row.id)) continue;
    sortable.push({
      at: row.created_at,
      row: {
        id: `app:${row.id}`,
        applicationId: row.id,
        practitionerId: null,
        // Assigned at empanelment. Showing a placeholder here would be
        // inventing an identifier nothing else in the system could resolve.
        reference: null,
        name: `${row.first_name} ${row.last_name}`,
        role: row.job_title,
        organisation: null,
        module: (row.modules ?? []).join(", ") || "—",
        city: row.city,
        state: row.state,
        address: row.address,
        tshirtSize: row.tshirt_size,
        experience: row.experience_band,
        email: row.email,
        phone: row.phone,
        appliedOn: date(row.created_at),
        status: row.status,
        averageRating: null,
        notes: row.admin_notes,
      },
    });
  }

  // Tie-broken on the id for the same reason the SQL orderings are: two people
  // who applied at the same moment must not swap places between reads.
  return sortable
    .sort((a, b) => b.at.localeCompare(a.at) || a.row.id.localeCompare(b.row.id))
    .map((entry) => entry.row);
}

// ── Session requests ────────────────────────────────────────────────────────

/** One incoming "Request a Session" submission from the public site. */
export interface SessionRequestRow {
  id: string;
  name: string;
  organisation: string | null;
  email: string;
  phone: string;
  topic: string;
  audience: string;
  city: string;
  state: string | null;
  groupSize: string | null;
  /** Participants the client guarantees — distinct from the expected range. */
  minCommitment: number | null;
  preferredDates: string | null;
  /** `null` while the SPOC has not named one — the panel flags that. */
  venue: string | null;
  notes: string | null;
  receivedOn: string;
  status: string;
  /** The practitioner who agreed on the call, once one has. */
  assignedPractitionerId: string | null;
  assignedTo: string | null;
  agreedPayout: number | null;
  /** The session this request became, once matched. */
  sessionReference: string | null;
}

export async function listSessionRequests(): Promise<SessionRequestRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_requests")
    // One string literal, not a concatenation: the client parses this at the
    // type level and a `+` erases the literal type, so every column comes back
    // as an error type.
    .select(
      "id, first_name, last_name, organisation_name, email, phone, topic, audience, city, state, group_size, min_commitment, preferred_window, venue_details, notes, status, created_at, assigned_practitioner_id, agreed_gross_payout, practitioners ( full_name ), sessions ( reference, deleted_at )",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(500);

  if (error) throw new Error(`session_requests read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const practitioner = one<{ full_name: string }>(row.practitioners);
    // A request can only have produced one live session, but the embed arrives
    // as an array; a soft-deleted one must not be shown as the outcome.
    const sessions = ((row.sessions ?? []) as Array<{ reference: string; deleted_at: string | null }>).filter(
      (session) => !session.deleted_at,
    );

    return {
      id: row.id,
      name: `${row.first_name} ${row.last_name}`,
      organisation: row.organisation_name,
      email: row.email,
      phone: row.phone,
      topic: row.topic,
      // The stored value is the enum ('corporate'); the console shows the same
      // words the requester chose on the public form.
      audience: AUDIENCE_LABELS[row.audience as Audience] ?? row.audience,
      city: row.city,
      state: row.state,
      groupSize: row.group_size,
      minCommitment: row.min_commitment,
      preferredDates: row.preferred_window,
      venue: row.venue_details,
      notes: row.notes,
      receivedOn: date(row.created_at),
      status: row.status,
      assignedPractitionerId: row.assigned_practitioner_id,
      assignedTo: practitioner?.full_name ?? null,
      agreedPayout: row.agreed_gross_payout,
      sessionReference: sessions[0]?.reference ?? null,
    };
  });
}

/** Empanelled practitioners, for the request panel's assignment select. */
export interface AssignablePractitioner {
  id: string;
  name: string;
  averageRating: number | null;
}

export async function listAssignablePractitioners(): Promise<AssignablePractitioner[]> {
  const supabase = createAdminClient();
  const [{ data, error }, ratings] = await Promise.all([
    supabase
      .from("practitioners")
      .select("id, full_name")
      .eq("status", "Empanelled")
      .is("deleted_at", null)
      .order("full_name")
      .order("id"),
    averageRatings(supabase),
  ]);

  if (error) throw new Error(`practitioners read failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.full_name,
    averageRating: ratings.get(row.id) ?? null,
  }));
}

// ── Agreements ──────────────────────────────────────────────────────────────

/**
 * One empanelment agreement.
 *
 * A practitioner reaches this panel automatically once their agreement is
 * issued; everything but the reference is captured when they sign online, which
 * is why the unsigned columns read "awaiting signature" rather than being blank
 * — nothing is missing, it has not happened yet.
 */
export interface AgreementRow {
  id: string;
  practitionerId: string;
  reference: string;
  practitioner: string;
  modules: string;
  /** `null` until signed. */
  signedOn: string | null;
  /** Full timestamp of the signature, for the detail line and the PDF. */
  signedAt: string | null;
  /** How they signed — "Drawn" or "Typed". `null` until signed. */
  method: string | null;
  status: "Signed" | "Pending";
}

const SIGNATURE_METHOD: Record<string, string> = { drawn: "Drawn", typed: "Typed" };

export async function listAgreements(): Promise<AgreementRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_agreements")
    .select(
      "id, practitioner_id, reference, modules, issued_on, signed_at, signature_mode, practitioners ( full_name )",
    )
    .is("deleted_at", null)
    .order("issued_on", { ascending: false })
    .order("id")
    .limit(500);

  if (error) throw new Error(`practitioner_agreements read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const practitioner = one<{ full_name: string }>(row.practitioners);
    return {
      id: row.id,
      practitionerId: row.practitioner_id,
      reference: row.reference,
      practitioner: practitioner?.full_name ?? "—",
      modules: (row.modules ?? []).join(", ") || "—",
      signedOn: row.signed_at ? date(row.signed_at) : null,
      signedAt: row.signed_at ? dateTime(row.signed_at) : null,
      // An unrecognised mode is shown as itself rather than dropped — a value
      // the console does not know about is a thing to notice.
      method: row.signed_at
        ? (SIGNATURE_METHOD[row.signature_mode as string] ?? row.signature_mode ?? "—")
        : null,
      status: row.signed_at ? "Signed" : "Pending",
    };
  });
}

// ── Sessions ────────────────────────────────────────────────────────────────

/**
 * One row of the Session Details dashboard.
 *
 * V7 shows only Confirmed and Completed sessions here — a session that is still
 * Pending has no delivery to report on, and this tab is the delivery view.
 */
export interface SessionRow {
  id: string;
  /** The assignment, which is what a rating and a payout hang off. */
  assignmentId: string | null;
  reference: string;
  module: string;
  sessionDate: string;
  requester: string;
  requesterOrganisation: string | null;
  practitioner: string;
  audience: string;
  participants: string | null;
  grossPayout: string | null;
  status: string;
  /** 1–5 once the requestor has rated it, else `null`. */
  rating: number | null;
  /** Set when an admin keyed the rating in from a verbal report. */
  ratingRecordedBy: string | null;
}

export async function listSessions(): Promise<SessionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, reference, module, session_date, city, state, spoc_name, audience, participants, status, session_requests ( first_name, last_name, organisation_name ), session_practitioners ( id, gross_payout, currency, deleted_at, practitioners ( full_name ), session_ratings ( rating, recorded_by ) )",
    )
    .is("deleted_at", null)
    // The delivery view: a Pending session has nothing to report yet.
    .in("status", ["Confirmed", "Completed", "Delivered", "Scheduled"])
    .order("session_date", { ascending: false, nullsFirst: false })
    .order("id")
    .limit(500);

  if (error) throw new Error(`sessions read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const request = one<{
      first_name: string;
      last_name: string;
      organisation_name: string | null;
    }>(row.session_requests);

    const assignments = ((row.session_practitioners ?? []) as Array<{
      id: string;
      gross_payout: number;
      currency: string;
      deleted_at: string | null;
      practitioners: unknown;
      session_ratings: unknown;
    }>).filter((assignment) => !assignment.deleted_at);

    const assignment = assignments[0];
    const practitioner = assignment ? one<{ full_name: string }>(assignment.practitioners) : null;
    const rating = assignment
      ? one<{ rating: number; recorded_by: string | null }>(assignment.session_ratings)
      : null;

    return {
      id: row.id,
      assignmentId: assignment?.id ?? null,
      reference: row.reference,
      module: row.module,
      sessionDate: date(row.session_date),
      // The SPOC is denormalised onto the session precisely because a session
      // may have no originating request; the request is the richer source when
      // there is one.
      requester: request ? `${request.first_name} ${request.last_name}` : row.spoc_name,
      requesterOrganisation: request?.organisation_name ?? null,
      practitioner: practitioner?.full_name ?? "—",
      audience: AUDIENCE_LABELS[row.audience as Audience] ?? row.audience,
      participants: row.participants,
      grossPayout: assignment ? money(assignment.gross_payout, assignment.currency) : null,
      status: row.status,
      rating: rating?.rating ?? null,
      ratingRecordedBy: rating?.recorded_by ?? null,
    };
  });
}

// ── Session consent (per assignment) ────────────────────────────────────────

/** A generated confirmation, as V7's "Part 2 — Track Status" table shows it. */
export interface ConsentRow {
  id: string;
  /** The session itself — Part 2's status control writes to it, not to the row. */
  sessionId: string;
  reference: string;
  session: string;
  sessionDate: string;
  practitioner: string;
  grossPayout: string;
  status: "Received" | "Pending";
  recordedOn: string;
  sessionStatus: string;
  issuedOn: string;
}

const CONSENT_SELECT =
  "id, session_id, confirmation_reference, confirmation_generated_at, gross_payout, currency, consent_given_at, practitioners ( full_name ), sessions ( reference, session_date, status )";

export async function listConsents(): Promise<ConsentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .select(CONSENT_SELECT)
    .is("deleted_at", null)
    // Only generated confirmations appear here — an assignment carries a
    // reference from the moment it is matched, but the document does not exist
    // until someone produces it.
    .not("confirmation_generated_at", "is", null)
    .order("confirmation_generated_at", { ascending: false })
    .order("id")
    .limit(500);

  if (error) throw new Error(`session_practitioners read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const practitioner = one<{ full_name: string }>(row.practitioners);
    const session = one<{ reference: string; session_date: string | null; status: string }>(row.sessions);
    return {
      id: row.id,
      sessionId: row.session_id,
      reference: row.confirmation_reference,
      session: session?.reference ?? "—",
      sessionDate: date(session?.session_date ?? null),
      practitioner: practitioner?.full_name ?? "—",
      grossPayout: money(row.gross_payout, row.currency),
      status: row.consent_given_at ? "Received" : "Pending",
      recordedOn: date(row.consent_given_at),
      sessionStatus: session?.status ?? "—",
      issuedOn: date(row.confirmation_generated_at),
    };
  });
}

/**
 * A session whose confirmation has not been generated yet — the options in
 * V7's "Part 1" picker, with everything the form auto-populates from the
 * request and the practitioner record.
 */
export interface ConfirmableSession {
  /** The assignment id — what the confirmation is generated against. */
  id: string;
  sessionReference: string;
  confirmationReference: string;
  practitioner: string;
  module: string;
  sessionDate: string | null;
  city: string;
  state: string | null;
  venue: string | null;
  participants: string | null;
  spoc: string;
  audience: string;
  grossPayout: number;
  currency: string;
  startTime: string | null;
  durationMinutes: number | null;
  /** Whether the practitioner has returned consent — Part 3 gates on it. */
  consentGiven: boolean;
  confirmationGenerated: boolean;
}

async function listAssignments(generated: boolean): Promise<ConfirmableSession[]> {
  const supabase = createAdminClient();
  const query = supabase
    .from("session_practitioners")
    .select(
      "id, confirmation_reference, confirmation_generated_at, gross_payout, currency, consent_given_at, practitioners ( full_name ), sessions ( reference, module, session_date, city, state, venue, participants, spoc_name, audience, start_time, duration_minutes, deleted_at )",
    )
    .is("deleted_at", null)
    .limit(500);

  const { data, error } = generated
    ? await query.not("confirmation_generated_at", "is", null)
    : await query.is("confirmation_generated_at", null);

  if (error) throw new Error(`session_practitioners read failed: ${error.message}`);

  return (data ?? [])
    .map((row) => {
      const practitioner = one<{ full_name: string }>(row.practitioners);
      const session = one<{
        reference: string;
        module: string;
        session_date: string | null;
        city: string;
        state: string | null;
        venue: string | null;
        participants: string | null;
        spoc_name: string;
        audience: string;
        start_time: string | null;
        duration_minutes: number | null;
        deleted_at: string | null;
      }>(row.sessions);

      // An assignment whose session was withdrawn is not confirmable.
      if (!session || session.deleted_at) return null;

      return {
        id: row.id,
        sessionReference: session.reference,
        confirmationReference: row.confirmation_reference,
        practitioner: practitioner?.full_name ?? "—",
        module: session.module,
        sessionDate: session.session_date,
        city: session.city,
        state: session.state,
        venue: session.venue,
        participants: session.participants,
        spoc: session.spoc_name,
        audience: AUDIENCE_LABELS[session.audience as Audience] ?? session.audience,
        grossPayout: row.gross_payout,
        currency: row.currency,
        startTime: session.start_time,
        durationMinutes: session.duration_minutes,
        consentGiven: Boolean(row.consent_given_at),
        confirmationGenerated: Boolean(row.confirmation_generated_at),
      };
    })
    .filter((row): row is ConfirmableSession => row !== null);
}

/** Part 1's picker: matched sessions with no confirmation generated yet. */
export const listConfirmableSessions = () => listAssignments(false);

/**
 * Part 3's picker: sessions whose practitioner has returned consent. V7 gates
 * the photo guide on Confirmed for a reason — the guide tells them what to
 * shoot at a session they have not yet agreed to deliver.
 */
export async function listPhotoGuideSessions(): Promise<ConfirmableSession[]> {
  const generated = await listAssignments(true);
  return generated.filter((row) => row.consentGiven);
}

// ── Payouts (per assignment) ────────────────────────────────────────────────

export interface PayoutRow {
  id: string;
  reference: string;
  practitioner: string;
  session: string;
  sessionDate: string;
  grossPayout: string;
  /** The raw figure, for the "amount pending" total the panel adds up. */
  grossAmount: number;
  invoiceReference: string | null;
  paidOn: string | null;
  status: "Paid" | "Pending";
}

export async function listPayouts(): Promise<PayoutRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .select(
      "id, confirmation_reference, gross_payout, currency, invoice_reference, paid_on, sessions ( reference, session_date, status, deleted_at ), practitioners ( full_name )",
    )
    .is("deleted_at", null)
    .order("confirmation_issued_on", { ascending: false })
    .order("id")
    .limit(500);

  if (error) throw new Error(`payouts read failed: ${error.message}`);

  return (data ?? [])
    .map((row) => {
      const practitioner = one<{ full_name: string }>(row.practitioners);
      const session = one<{
        reference: string;
        session_date: string | null;
        status: string;
        deleted_at: string | null;
      }>(row.sessions);

      // A withdrawn session owes nobody anything.
      if (!session || session.deleted_at) return null;

      return {
        id: row.id,
        reference: row.confirmation_reference,
        practitioner: practitioner?.full_name ?? "—",
        session: session.reference,
        sessionDate: date(session.session_date),
        grossPayout: money(row.gross_payout, row.currency),
        grossAmount: Number(row.gross_payout),
        invoiceReference: row.invoice_reference,
        paidOn: row.paid_on ? date(row.paid_on) : null,
        status: row.paid_on ? ("Paid" as const) : ("Pending" as const),
      };
    })
    .filter((row): row is PayoutRow => row !== null);
}

// ── Photo submissions ───────────────────────────────────────────────────────

/**
 * One row of the Photos tab.
 *
 * The row is a COMPLETED SESSION, not a photo submission — V7's subtitle says
 * it outright: "every completed session appears here", with photos either
 * landed or still pending. Listing submissions instead would hide exactly the
 * rows an admin needs to chase, since a session with no photos has no
 * submission to list.
 */
export interface PhotoRow {
  /** The session — stable whether or not photos exist yet. */
  id: string;
  submissionId: string | null;
  practitioner: string;
  practitionerReference: string | null;
  sessionReference: string;
  module: string;
  city: string;
  sessionDate: string;
  photoCount: number;
  uploadedOn: string | null;
  expiresOn: string | null;
  /** Negative once past expiry; `null` while nothing has been uploaded. */
  daysLeft: number | null;
}

/** Whole days from today to `date`, negative once past. */
function daysUntil(value: string | null): number | null {
  if (!value) return null;
  const target = new Date(value);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export async function listPhotoSubmissions(): Promise<PhotoRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, reference, module, city, session_date, session_practitioners ( deleted_at, practitioners ( full_name, reference ) ), photo_submissions ( id, storage_keys, created_at, expiry_date, deleted_at )",
    )
    .eq("status", "Completed")
    .is("deleted_at", null)
    .order("session_date", { ascending: false, nullsFirst: false })
    .order("id")
    .limit(500);

  if (error) throw new Error(`sessions read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const assignment = ((row.session_practitioners ?? []) as Array<{
      deleted_at: string | null;
      practitioners: unknown;
    }>).find((entry) => !entry.deleted_at);
    const practitioner = assignment
      ? one<{ full_name: string; reference: string }>(assignment.practitioners)
      : null;

    const submission = ((row.photo_submissions ?? []) as Array<{
      id: string;
      storage_keys: string[];
      created_at: string;
      expiry_date: string;
      deleted_at: string | null;
    }>).find((entry) => !entry.deleted_at);

    return {
      id: row.id,
      submissionId: submission?.id ?? null,
      practitioner: practitioner?.full_name ?? "—",
      practitionerReference: practitioner?.reference ?? null,
      sessionReference: row.reference,
      module: row.module,
      city: row.city,
      sessionDate: date(row.session_date),
      photoCount: (submission?.storage_keys ?? []).length,
      uploadedOn: submission ? date(submission.created_at) : null,
      expiresOn: submission ? date(submission.expiry_date) : null,
      daysLeft: submission ? daysUntil(submission.expiry_date) : null,
    };
  });
}

// ── Gallery ─────────────────────────────────────────────────────────────────

export interface GalleryRow {
  id: string;
  caption: string;
  city: string;
  sortOrder: number;
  status: "Published" | "Draft";
  addedOn: string;
}

export async function listGallery(): Promise<GalleryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, caption, city, sort_order, published, created_at")
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("id");

  if (error) throw new Error(`gallery_photos read failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    caption: row.caption,
    city: row.city,
    sortOrder: row.sort_order,
    status: row.published ? "Published" : "Draft",
    addedOn: date(row.created_at),
  }));
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    amount,
  );

// ── Activity log (audit M9) ─────────────────────────────────────────────────

export interface ActivityRow {
  id: string;
  actor: string;
  action: string;
  entity: string;
  detail: string;
  at: string;
}

export async function listActivity(limit = 200): Promise<ActivityRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, actor_email, action, entity_type, entity_ref, detail, created_at")
    .order("created_at", { ascending: false })
    .order("id")
    .limit(limit);

  if (error) {
    // A table that hasn't been migrated yet (PostgREST "Could not find the
    // table" / undefined_table) must not take the whole console down. Degrade
    // to an empty log and let the rest of the console load.
    if (error.code === "PGRST205" || error.code === "42P01" || /Could not find the table/i.test(error.message)) {
      return [];
    }
    throw new Error(`activity_log read failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    actor: row.actor_email ?? "system",
    action: row.action,
    entity: [row.entity_type, row.entity_ref].filter(Boolean).join(" "),
    detail: row.detail ?? "",
    at: dateTime(row.created_at),
  }));
}

/**
 * Appends one audit-trail entry (audit M9). Best-effort by design: a failure to
 * log must never fail the action being logged, so callers do not await a throw.
 */
export async function recordActivity(entry: {
  actorEmail?: string;
  action: string;
  entityType?: string;
  entityRef?: string;
  detail?: string;
}): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("activity_log").insert({
    actor_email: entry.actorEmail ?? null,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_ref: entry.entityRef ?? null,
    detail: entry.detail ?? null,
  });
}

const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";