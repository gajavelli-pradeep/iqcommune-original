import "server-only";

import { sinceLabel } from "@/lib/timestamp";

import { toConsoleRole, type ConsoleRole } from "@/constants/roles";
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
export function one<T>(relation: unknown): T | null {
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
  /**
   * When the welcome last went out, or null if it never has.
   *
   * Read from the activity log rather than a column on the agreement: sending
   * the welcome is an act against the practitioner, and the log already records
   * it. A second copy on this row would be a second thing to keep true.
   */
  welcomeSentAt: string | null;
}

/**
 * When each practitioner was last welcomed, keyed by practitioner id.
 *
 * Same shape as `lastSendsByAssignment` and for the same reason — the send is
 * recorded once, in the log, and every surface that needs to know reads it
 * there. Practitioners never welcomed are simply absent.
 */
async function welcomesByPractitioner(
  practitionerIds: readonly string[],
): Promise<Map<string, string>> {
  if (practitionerIds.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("activity_log")
    .select("entity_ref, created_at")
    .eq("entity_type", "practitioner")
    .eq("action", "practitioner.welcomed")
    .in("entity_ref", practitionerIds)
    .order("created_at", { ascending: false });

  const welcomed = new Map<string, string>();
  for (const row of data ?? []) {
    const ref = row.entity_ref as string | null;
    // Newest first, so the first one seen for a practitioner is the last sent.
    if (ref && !welcomed.has(ref)) welcomed.set(ref, row.created_at as string);
  }
  return welcomed;
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

  const welcomed = await welcomesByPractitioner(
    (data ?? []).map((row) => row.practitioner_id as string),
  );

  return (data ?? []).map((row) => {
    const practitioner = one<{ full_name: string }>(row.practitioners);
    return {
      id: row.id,
      welcomeSentAt: welcomed.get(row.practitioner_id as string) ?? null,
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
  /** `YYYY-MM` of issue, for Part 2's "Issued in" filter. */
  issuedMonth: string;
  /** When the consent request last went out — drives the row's next step. */
  requestSentAt: string | null;
  /**
   * The same moment as words, e.g. "3 days ago".
   *
   * Rendered here rather than in the cell because a relative label computed
   * during render differs between the server pass and the client one, and React
   * calls that a hydration mismatch. The server's clock is as good as the
   * browser's for "how long ago".
   */
  requestSentLabel: string | null;
  /** When the photo guide last went out. */
  guideSentAt: string | null;
  /** Both shown by Part 3, which reads its list from these same rows. */
  module: string;
  venue: string;
}

const CONSENT_SELECT =
  "id, session_id, confirmation_reference, confirmation_generated_at, gross_payout, currency, consent_given_at, practitioners ( full_name ), sessions ( reference, session_date, status, module, venue )";

/**
 * When each assignment was last sent its consent request and its photo guide.
 *
 * Read from the activity log rather than from a column on the assignment,
 * because the log already records both against the assignment id and has an
 * index on exactly that pair. A column would be the more direct model, but it
 * would also be a migration to store a fact the system is already storing
 * accurately — and the log is the record that survives the row being deleted.
 *
 * Newest first, so the first row seen for an assignment is its latest send;
 * a re-sent request should read as sent now, not as sent the first time.
 *
 * Scoped to the assignments actually on the page, which is the whole reason
 * this takes ids. Reading the newest N log entries globally looks equivalent
 * and is not: the log grows forever, so past some volume the oldest sends fall
 * out of the window, and an assignment whose request went out months ago loses
 * its timestamp. `consentStage` would then read that row as never asked, put
 * "Send consent request" back on it, and an admin would send a second one. A
 * bug that appears only once the product has been used enough is the worst kind
 * to leave in. Bounded by the page instead — `listConsents` caps at 500 — it is
 * correct at any log size.
 *
 * The cost is that this can no longer run beside the consents read, since it
 * needs their ids. One extra round trip against a silent wrong answer later.
 */
async function lastSendsByAssignment(
  assignmentIds: readonly string[],
): Promise<Map<string, { requested?: string; guided?: string }>> {
  if (assignmentIds.length === 0) return new Map();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("activity_log")
    .select("action, entity_ref, created_at")
    .eq("entity_type", "assignment")
    .in("action", ["consent.requested", "photo_guide.sent"])
    .in("entity_ref", assignmentIds)
    .order("created_at", { ascending: false });

  const sends = new Map<string, { requested?: string; guided?: string }>();
  for (const row of data ?? []) {
    const ref = row.entity_ref as string | null;
    if (!ref) continue;
    const entry = sends.get(ref) ?? {};
    const key = row.action === "consent.requested" ? "requested" : "guided";
    if (!entry[key]) entry[key] = row.created_at as string;
    sends.set(ref, entry);
  }
  return sends;
}

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

  const sends = await lastSendsByAssignment((data ?? []).map((row) => row.id as string));

  return (data ?? []).map((row) => {
    const sent = sends.get(row.id as string);
    const practitioner = one<{ full_name: string }>(row.practitioners);
    const session = one<{
      reference: string;
      session_date: string | null;
      status: string;
      module: string | null;
      venue: string | null;
    }>(row.sessions);
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
      // `issuedOn` is already formatted for display, so the period filter gets
      // its own sortable value rather than parsing a rendered date back.
      issuedMonth: (row.confirmation_generated_at as string | null)?.slice(0, 7) ?? "",
      requestSentAt: sent?.requested ?? null,
      requestSentLabel: sent?.requested ? sinceLabel(sent.requested, new Date()) : null,
      guideSentAt: sent?.guided ?? null,
      module: session?.module ?? "—",
      // V7 prints the venue in Part 3's summary, where an em dash reads as
      // "not settled yet" — which is the truth until the SPOC confirms one.
      venue: session?.venue ?? "—",
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
  /** The practitioner's live empanelment agreement — V7 shows it on the panel. */
  agreementReference: string;
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
      "id, confirmation_reference, confirmation_generated_at, gross_payout, currency, consent_given_at, practitioners ( full_name, practitioner_agreements ( reference, deleted_at ) ), sessions ( reference, module, session_date, city, state, venue, participants, spoc_name, audience, start_time, duration_minutes, deleted_at )",
    )
    .is("deleted_at", null)
    .limit(500);

  const { data, error } = generated
    ? await query.not("confirmation_generated_at", "is", null)
    : await query.is("confirmation_generated_at", null);

  if (error) throw new Error(`session_practitioners read failed: ${error.message}`);

  return (data ?? [])
    .map((row) => {
      const practitioner = one<{
        full_name: string;
        practitioner_agreements: { reference: string; deleted_at: string | null }[] | null;
      }>(row.practitioners);
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
        // The empanelment agreement the confirmation sits under. A practitioner
        // has one live agreement at a time (see `generateAndSendAgreement`), so
        // the first undeleted row is it.
        agreementReference:
          practitioner?.practitioner_agreements?.find((row) => !row.deleted_at)?.reference ?? "—",
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
 *
 * But "completed sessions" alone cannot be the whole list, because photos do
 * not wait for an admin to mark anything. A practitioner who uses their link
 * the evening of the session submits against a record still sitting at
 * Confirmed, and the public form on the landing page carries no session at
 * all. Both were accepted, thanked, stored, counted against the 30-day
 * retention, and deleted unseen at expiry — there was no row to attach them
 * to. So the list is completed sessions PLUS every live submission, whatever
 * its session's status and whether or not it has one.
 */
export interface PhotoRow {
  /** The session — or the submission itself, when it arrived without one. */
  id: string;
  submissionId: string | null;
  practitioner: string;
  practitionerReference: string | null;
  sessionReference: string;
  /**
   * The session's own status, for photos that arrived outside the completed
   * flow. `null` when the submission is linked to no session. `"Completed"`
   * — the ordinary case — needs no explaining and is not shown.
   */
  sessionStatus: string | null;
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

/**
 * Every live submission, each with whatever session it names.
 *
 * Read from the submissions side, so a session with two submitters yields two
 * rows. Going the other way — a session and `.find()` on its photos — renders
 * the first and silently drops the rest.
 */
const SUBMISSION_SELECT =
  "id, submitter_name, session_date, module_taught, storage_keys, created_at, expiry_date, " +
  "practitioners ( full_name, reference ), " +
  "sessions ( id, reference, module, city, session_date, status, deleted_at )";

/** Completed sessions, to find the ones still owing photos. */
const PENDING_SELECT =
  "id, reference, module, city, session_date, status, " +
  "session_practitioners ( deleted_at, practitioners ( full_name, reference ) ), " +
  "photo_submissions ( id, deleted_at )";

export interface SubmissionRow {
  id: string;
  submitter_name: string;
  session_date: string | null;
  module_taught: string | null;
  storage_keys: string[];
  created_at: string;
  expiry_date: string;
  practitioners: unknown;
  sessions: unknown;
}

export interface PendingSessionRow {
  id: string;
  reference: string;
  module: string;
  city: string;
  session_date: string | null;
  status: string;
  session_practitioners: Array<{ deleted_at: string | null; practitioners: unknown }> | null;
  photo_submissions: Array<{ id: string; deleted_at: string | null }> | null;
}

interface LinkedSession {
  id: string;
  reference: string;
  module: string;
  city: string;
  session_date: string | null;
  status: string;
  deleted_at: string | null;
}

/** A row carrying photos. Session details fill in only if it names one. */
function rowFromSubmission(row: SubmissionRow): { on: string | null; row: PhotoRow } {
  const session = one<LinkedSession>(row.sessions);
  const practitioner = one<{ full_name: string; reference: string }>(row.practitioners);
  const on = session?.session_date ?? row.session_date;

  return {
    on,
    row: {
      // The submission, not the session: two submitters on one session are two
      // rows and need two keys.
      id: row.id,
      submissionId: row.id,
      // Whoever the link was issued to; the public form has only a typed name.
      practitioner: practitioner?.full_name ?? row.submitter_name,
      practitionerReference: practitioner?.reference ?? null,
      sessionReference: session?.reference ?? "—",
      sessionStatus: session?.status ?? null,
      module: session?.module ?? row.module_taught ?? "—",
      city: session?.city ?? "—",
      sessionDate: date(on),
      photoCount: row.storage_keys.length,
      uploadedOn: date(row.created_at),
      expiresOn: date(row.expiry_date),
      daysLeft: daysUntil(row.expiry_date),
    },
  };
}

/** A completed session with nothing uploaded — the queue worth chasing. */
function rowAwaitingPhotos(row: PendingSessionRow): { on: string | null; row: PhotoRow } {
  const assignment = (row.session_practitioners ?? []).find((entry) => !entry.deleted_at);
  const practitioner = assignment
    ? one<{ full_name: string; reference: string }>(assignment.practitioners)
    : null;

  return {
    on: row.session_date,
    row: {
      id: row.id,
      submissionId: null,
      practitioner: practitioner?.full_name ?? "—",
      practitionerReference: practitioner?.reference ?? null,
      sessionReference: row.reference,
      sessionStatus: row.status,
      module: row.module,
      city: row.city,
      sessionDate: date(row.session_date),
      photoCount: 0,
      uploadedOn: null,
      expiresOn: null,
      daysLeft: null,
    },
  };
}

export async function listPhotoSubmissions(): Promise<PhotoRow[]> {
  const supabase = createAdminClient();

  // Two reads, because the tab answers two questions that no single query
  // covers: which photos have arrived, and which completed sessions still owe
  // some. PostgREST cannot express "status is Completed OR a child row exists"
  // in one `or()`, and widening to every session would let the 500 cap start
  // dropping real rows.
  const [submissions, completed] = await Promise.all([
    supabase.from("photo_submissions").select(SUBMISSION_SELECT).is("deleted_at", null).limit(500),
    supabase
      .from("sessions")
      .select(PENDING_SELECT)
      .eq("status", "Completed")
      .is("deleted_at", null)
      .limit(500),
  ]);

  for (const { error } of [submissions, completed]) {
    if (error) throw new Error(`photo rows read failed: ${error.message}`);
  }

  return photoRows(
    (submissions.data ?? []) as unknown as SubmissionRow[],
    (completed.data ?? []) as unknown as PendingSessionRow[],
  );
}

/**
 * The visibility rule, kept separate from the reads so it can be checked.
 *
 * Every live submission gets a row. A completed session gets one only when
 * nothing has been uploaded against it, so the two never double up.
 */
export function photoRows(
  submissions: readonly SubmissionRow[],
  completed: readonly PendingSessionRow[],
): PhotoRow[] {
  const listed = submissions
    // A submission whose session was soft-deleted keeps its row, minus the
    // session — the photos are still real and still expiring.
    .map((row) => (one<LinkedSession>(row.sessions)?.deleted_at ? { ...row, sessions: null } : row))
    .map(rowFromSubmission);

  for (const row of completed) {
    const uploaded = (row.photo_submissions ?? []).some((entry) => !entry.deleted_at);
    if (!uploaded) listed.push(rowAwaitingPhotos(row));
  }

  // Sorted on the raw ISO date, not the rendered one — comparing "03 Jun"
  // against "15 Jun" as strings orders them by day. Undated rows last, matching
  // the `nullsFirst: false` this replaced.
  listed.sort((a, b) => {
    if (a.on !== b.on) {
      if (!a.on) return 1;
      if (!b.on) return -1;
      return b.on.localeCompare(a.on);
    }
    return a.row.id.localeCompare(b.row.id);
  });

  return listed.map((entry) => entry.row);
}

// ── Gallery ─────────────────────────────────────────────────────────────────

export interface GalleryRow {
  id: string;
  url: string;
  caption: string | null;
  city: string | null;
  sortOrder: number;
  status: "Published" | "Draft";
  addedOn: string;
}

export async function listGallery(): Promise<GalleryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, storage_path, caption, city, sort_order, published, created_at")
    .is("deleted_at", null)
    // GALLERY_ORDER — must match services/gallery.ts exactly, or the panel
    // shows one order and the landing page renders another. Oldest first
    // within a sort_order also keeps the panel's "next to be evicted" marker
    // honest, since eviction is by created_at.
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);

  if (error) throw new Error(`gallery_photos read failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    // The gallery bucket is public by necessity — the landing page serves these
    // directly — so a public URL is the right shape here, unlike session photos.
    url: supabase.storage.from("gallery").getPublicUrl(row.storage_path).data.publicUrl,
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

// ── Team & access (V7 tab 9) ────────────────────────────────────────────────

/**
 * One row of the Team & Access table.
 *
 * Two kinds of person live here: accounts that exist, and invites that have
 * been sent and not yet used. V7 lists both, and it should — an invite nobody
 * accepted is the reason a colleague "can't get in", and a table that only
 * showed real accounts would make that invisible.
 */
export interface TeamMemberRow {
  id: string;
  name: string;
  email: string;
  role: ConsoleRole;
  roleLabel: string;
  lastActive: string;
  /** An outstanding invite rather than an account. */
  pending: boolean;
  /** A pending invite past its expiry — the link no longer works. */
  expired: boolean;
  /**
   * Did the invite email actually go out?
   *
   * The row used to read "Invite sent" purely because the invite row existed,
   * which is a claim about the database, not about anyone's inbox. With
   * EMAIL_DELIVERY unset the banner said no email was sent and the row beneath
   * it said the opposite, on the same screen. `null` for accounts, and for
   * invites created before the email log existed — unknown is not the same as
   * failed, and saying "not delivered" about a historic invite would be its own
   * lie.
   */
  emailDelivered: boolean | null;
}

const ROLE_LABEL: Record<ConsoleRole, string> = {
  global_admin: "Global Admin",
  admin: "Admin",
  user: "User",
};

export async function listTeam(): Promise<TeamMemberRow[]> {
  const supabase = createAdminClient();

  const [accounts, invites, invititeMail] = await Promise.all([
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }),
    supabase
      .from("admin_invites")
      .select("id, email, role, expires_at, consumed_at, created_at")
      .is("deleted_at", null)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .order("id")
      .limit(200),
    // Whether each invite's email left the building. Newest first, so the first
    // row seen for an address is its latest attempt.
    supabase
      .from("email_log")
      .select("recipient, status, created_at")
      .eq("template", "admin-invite")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  if (accounts.error) throw new Error(`team read failed: ${accounts.error.message}`);

  const rows: TeamMemberRow[] = [];

  for (const user of accounts.data?.users ?? []) {
    // Only accounts with a console role belong here. `app_metadata` is the
    // only trustworthy source — `user_metadata` is writable by the account it
    // describes.
    const role = toConsoleRole(user.app_metadata?.role);
    if (!role) continue;

    rows.push({
      id: user.id,
      name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "—",
      email: user.email ?? "—",
      role,
      roleLabel: ROLE_LABEL[role],
      lastActive: user.last_sign_in_at ? dateTime(user.last_sign_in_at) : "Never signed in",
      pending: false,
      expired: false,
      emailDelivered: null,
    });
  }

  // Latest attempt per address. Mirrors lib/email/outcome.ts: only these three
  // statuses mean a message actually reached the recipient — a dry run is a
  // perfectly healthy outcome that sends nothing.
  const DELIVERED = new Set(["sent", "queued", "duplicate"]);
  const latestAttempt = new Map<string, string>();
  for (const row of invititeMail.data ?? []) {
    if (!latestAttempt.has(row.recipient)) latestAttempt.set(row.recipient, row.status);
  }

  const now = Date.now();
  for (const invite of invites.data ?? []) {
    const role = toConsoleRole(invite.role) ?? "user";
    rows.push({
      id: `invite:${invite.id}`,
      name: "—",
      email: invite.email,
      role,
      roleLabel: ROLE_LABEL[role],
      lastActive: "—",
      pending: true,
      expired: new Date(invite.expires_at).getTime() < now,
      emailDelivered: latestAttempt.has(invite.email)
        ? DELIVERED.has(latestAttempt.get(invite.email)!)
        : null,
    });
  }

  return rows.sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Practitioner master data — V7's "quick reference for offline contact".
 *
 * Deliberately five fields and no more. V7 says why in its own subtitle: full
 * profiles live under Practitioners, and this exists to be searched, sorted and
 * exported when someone needs to phone a practitioner.
 */
export interface MasterDataRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
}

export async function listMasterData(): Promise<MasterDataRow[]> {
  const practitioners = await listPractitioners();
  return practitioners.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone ?? "—",
    email: row.email,
    city: row.city,
    state: row.state ?? "—",
  }));
}

// ── Activity log (audit M9) ─────────────────────────────────────────────────

export interface ActivityRow {
  id: string;
  /** The person, by name where the account has one, else their address. */
  user: string;
  /** Their console role at read time — "System" for an automatic transition. */
  role: string;
  /** One readable sentence: what happened. */
  action: string;
  at: string;
}

/**
 * Turns a stored action key into the sentence V7's log reads as.
 *
 * The key is what the system records (`practitioner.empanelled`) because it is
 * stable and filterable; this is what a person reads. Where an action already
 * wrote a `detail`, that is the better sentence and wins.
 */
const ACTION_PHRASE: Record<string, string> = {
  "application.stage_set": "Moved an application to a new stage",
  "application.rejected": "Sent a rejection message",
  "application.deleted": "Deleted an application",
  "agreement.sent": "Sent an empanelment agreement",
  "agreement.downloaded": "Downloaded an agreement",
  "agreement.signature_cleared": "Cleared a signed agreement",
  "practitioner.empanelled": "Empanelled a practitioner",
  "practitioner.deactivated": "Deactivated a practitioner",
  "practitioner.reactivated": "Reactivated a practitioner",
  "practitioner.welcomed": "Sent a welcome message",
  "practitioner.note_saved": "Saved a note on a practitioner",
  "practitioner.field_overridden": "Corrected a practitioner's details",
  "request.terms_updated": "Recorded the agreed terms on a request",
  "request.matched": "Matched a session request",
  "request.cancelled": "Cancelled a session request",
  "request.reopened": "Reopened a session request",
  // The slug stays `followed_up` — rows carrying it are already written, and
  // renaming it would leave every past entry unlabelled. Only what a reader
  // sees moves, which is the whole job of this map.
  "request.followed_up": "Sent an update to a client",
  "request.cancellation_sent": "Sent a cancellation message",
  "request.deleted": "Deleted a session request",
  "confirmation.generated": "Generated a session confirmation",
  "confirmation.regenerated": "Regenerated a session confirmation",
  "confirmation.downloaded": "Downloaded a confirmation",
  "consent.requested": "Sent a consent request",
  "photo_guide.sent": "Sent the photo guide",
  "photo_guide.downloaded": "Downloaded the photo guide",
  "photos.uploaded_by_admin": "Uploaded session photos",
  "photos.downloaded": "Downloaded session photos",
  "photos.deleted": "Deleted session photos",
  "session.confirmed": "Confirmed a session",
  "session.completed": "Marked a session completed",
  "session.cancelled": "Cancelled a session",
  "session.reopened": "Reopened a session",
  "rating.requested": "Sent a rating request",
  "rating.recorded_manually": "Recorded a rating from a verbal report",
  // "Opened", not "sent": handing off to WhatsApp is the last thing we can see.
  "whatsapp.opened": "Opened a message in WhatsApp",
  "payout.invoice_set": "Set a payout's invoice reference",
  "payout.paid": "Marked a payout paid",
  "payout.reopened": "Reopened a payout",
  "gallery.drafted": "Added photos to the gallery draft",
  "gallery.detail_set": "Edited a gallery photo's details",
  "gallery.published": "Published photos to the landing page",
  "gallery.unpublished": "Removed a photo from the landing page",
  "gallery.draft_removed": "Removed a gallery draft",
  "team.invited": "Invited a team member",
  "team.invite_withdrawn": "Withdrew a team invite",
  "team.removed": "Removed a team member",
  "master_data.exported": "Exported practitioner master data",
};

/** One page of the audit trail, with the total so the pager can say where it is. */
export interface ActivityPage {
  rows: ActivityRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const ACTIVITY_PAGE_SIZE = 25;

/**
 * A page of the audit trail, newest first.
 *
 * Paged in the database rather than by slicing a capped fetch: the log runs to
 * ninety days of every action every admin takes, so "fetch 200 and slice"
 * would quietly hide the rest while showing a pager that implies otherwise.
 * The exact count comes back with the page so the range shown is the truth.
 */
export async function listActivity(page = 1, pageSize = ACTIVITY_PAGE_SIZE): Promise<ActivityPage> {
  const supabase = createAdminClient();
  const current = Math.max(1, Math.floor(page));
  const from = (current - 1) * pageSize;

  const [{ data, error, count }, accounts] = await Promise.all([
    supabase
      .from("activity_log")
      .select("id, actor_email, action, entity_type, entity_ref, detail, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + pageSize - 1),
    // The log stores who acted, not what they were — a role can change, and the
    // entry should still say which one they hold. Resolved at read time.
    supabase.auth.admin.listUsers({ page: 1, perPage: 200 }).catch(() => null),
  ]);

  if (error) {
    // A table that hasn't been migrated yet (PostgREST "Could not find the
    // table" / undefined_table) must not take the whole console down. Degrade
    // to an empty log and let the rest of the console load.
    if (error.code === "PGRST205" || error.code === "42P01" || /Could not find the table/i.test(error.message)) {
      return { rows: [], total: 0, page: current, pageSize };
    }
    throw new Error(`activity_log read failed: ${error.message}`);
  }

  const byEmail = new Map(
    (accounts?.data?.users ?? []).map((user) => [
      (user.email ?? "").toLowerCase(),
      {
        name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "—",
        role: toConsoleRole(user.app_metadata?.role),
      },
    ]),
  );

  const rows = (data ?? []).map((row) => {
    const actorEmail = (row.actor_email ?? "").toLowerCase();
    const account = actorEmail ? byEmail.get(actorEmail) : undefined;

    return {
      id: row.id,
      // An automatic transition (a signature coming back, say) has no actor.
      user: account?.name ?? row.actor_email ?? "System",
      role: account?.role ? ROLE_LABEL[account.role] : row.actor_email ? "—" : "System",
      // Phrase first, then the detail as context. The detail alone is often a
      // fragment ("IQC-S003 → Completed.") or, worse, a column name — reading
      // an audit trail should not require knowing the schema.
      action: [ACTION_PHRASE[row.action] ?? row.action, row.detail?.trim()]
        .filter(Boolean)
        .join(" — "),
      at: dateTime(row.created_at),
    };
  });

  return { rows, total: count ?? rows.length, page: current, pageSize };
}

/** How long the log is kept, matching the note the Activity tab shows. */
export const ACTIVITY_RETENTION_DAYS = 90;

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

  /**
   * Retention, enforced on write.
   *
   * The tab tells an admin entries are kept for 90 days; a promise the system
   * does not keep is worse than no promise, and this is a log people will make
   * decisions from. V7 describes exactly this mechanism — a new entry pushes
   * the oldest past the window out — so it happens here rather than waiting for
   * a cron, which ADR-0003 defers until a restore has been proven from backup.
   *
   * One indexed DELETE per logged action, and best-effort like the insert: a
   * failure to prune must never fail the action being logged.
   */
  const cutoff = new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 86_400_000).toISOString();
  await supabase.from("activity_log").delete().lt("created_at", cutoff);
}

const dateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";