import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Console reads.
 *
 * Every one of these runs behind `requireRole`, which has already established
 * who is asking. They use the service-role client because the console shows
 * data across every practitioner and session — RLS scoped to a single user is
 * the wrong shape for an admin view, and the route is the boundary.
 */

export interface PractitionerRow {
  id: string;
  reference: string;
  name: string;
  role: string;
  organisation: string | null;
  module: string;
  city: string;
  appliedOn: string;
  status: string;
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

export async function listPractitioners(): Promise<PractitionerRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioners")
    .select(
      "id, reference, full_name, role, organisation, city, status, created_at, practitioner_agreements ( modules, deleted_at )",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    // Bounded (audit M15): the console table is not paginated yet, so cap the
    // read rather than fetch an unbounded set as the network grows.
    .limit(500);

  if (error) throw new Error(`practitioners read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    // Exclude soft-deleted agreements (audit M15): a withdrawn agreement must
    // not contribute its module to what a practitioner is shown as teaching.
    const agreements = ((row.practitioner_agreements ?? []) as Array<{
      modules: string[];
      deleted_at: string | null;
    }>).filter((agreement) => !agreement.deleted_at);
    return {
      id: row.id,
      reference: row.reference,
      name: row.full_name,
      role: row.role,
      organisation: row.organisation,
      // The module a practitioner teaches lives on their agreement, not on
      // them: it is what they were empanelled for, and it can change between
      // agreements without rewriting who they are.
      module: agreements.flatMap((agreement) => agreement.modules).join(", ") || "—",
      city: row.city,
      appliedOn: date(row.created_at),
      status: row.status,
    };
  });
}

// ── Session requests ────────────────────────────────────────────────────────

export interface SessionRequestRow {
  id: string;
  name: string;
  organisation: string | null;
  topic: string;
  audience: string;
  location: string;
  requestedOn: string;
  status: string;
}

export async function listSessionRequests(): Promise<SessionRequestRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_requests")
    .select("id, first_name, last_name, organisation_name, topic, audience, city, state, status, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`session_requests read failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    name: `${row.first_name} ${row.last_name}`,
    organisation: row.organisation_name,
    topic: row.topic,
    audience: row.audience,
    location: [row.city, row.state].filter(Boolean).join(", "),
    requestedOn: date(row.created_at),
    status: row.status,
  }));
}

// ── Agreements ──────────────────────────────────────────────────────────────

export interface AgreementRow {
  id: string;
  reference: string;
  practitioner: string;
  modules: string;
  issuedOn: string;
  version: string;
  status: "Signed" | "Pending";
}

export async function listAgreements(): Promise<AgreementRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioner_agreements")
    .select("id, reference, modules, issued_on, version, signed_at, practitioners ( full_name )")
    .is("deleted_at", null)
    .order("issued_on", { ascending: false });

  if (error) throw new Error(`practitioner_agreements read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const practitioner = one<{ full_name: string }>(row.practitioners);
    return {
      id: row.id,
      reference: row.reference,
      practitioner: practitioner?.full_name ?? "—",
      modules: (row.modules ?? []).join(", ") || "—",
      issuedOn: date(row.issued_on),
      version: row.version,
      status: row.signed_at ? "Signed" : "Pending",
    };
  });
}

// ── Sessions ────────────────────────────────────────────────────────────────

export interface SessionRow {
  id: string;
  reference: string;
  module: string;
  sessionDate: string;
  location: string;
  spoc: string;
  status: string;
}

export async function listSessions(): Promise<SessionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, reference, module, session_date, city, state, spoc_name, status")
    .is("deleted_at", null)
    .order("session_date", { ascending: false });

  if (error) throw new Error(`sessions read failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    module: row.module,
    sessionDate: date(row.session_date),
    location: [row.city, row.state].filter(Boolean).join(", "),
    spoc: row.spoc_name,
    status: row.status,
  }));
}

// ── Session consent (per assignment) ────────────────────────────────────────

export interface ConsentRow {
  id: string;
  practitioner: string;
  session: string;
  grossPayout: string;
  status: "Received" | "Pending";
  recordedOn: string;
}

export async function listConsents(): Promise<ConsentRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .select("id, gross_payout, currency, consent_given_at, practitioners ( full_name ), sessions ( reference )")
    .is("deleted_at", null)
    .order("confirmation_issued_on", { ascending: false });

  if (error) throw new Error(`session_practitioners read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const practitioner = one<{ full_name: string }>(row.practitioners);
    const session = one<{ reference: string }>(row.sessions);
    return {
      id: row.id,
      practitioner: practitioner?.full_name ?? "—",
      session: session?.reference ?? "—",
      grossPayout: money(row.gross_payout, row.currency),
      status: row.consent_given_at ? "Received" : "Pending",
      recordedOn: date(row.consent_given_at),
    };
  });
}

// ── Payouts (per assignment) ────────────────────────────────────────────────

export interface PayoutRow {
  id: string;
  reference: string;
  practitioner: string;
  session: string;
  grossPayout: string;
  status: "Pending";
}

export async function listPayouts(): Promise<PayoutRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_practitioners")
    .select("id, confirmation_reference, gross_payout, currency, practitioners ( full_name ), sessions ( reference )")
    .is("deleted_at", null)
    .order("confirmation_issued_on", { ascending: false });

  if (error) throw new Error(`payouts read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const practitioner = one<{ full_name: string }>(row.practitioners);
    const session = one<{ reference: string }>(row.sessions);
    return {
      id: row.id,
      reference: row.confirmation_reference,
      practitioner: practitioner?.full_name ?? "—",
      session: session?.reference ?? "—",
      grossPayout: money(row.gross_payout, row.currency),
      // Paid state (invoice_reference/paid_on) is not in the schema yet — every
      // payout reads Pending until that column lands (audit M10).
      status: "Pending",
    };
  });
}

// ── Photo submissions ───────────────────────────────────────────────────────

export interface PhotoRow {
  id: string;
  submitter: string;
  module: string;
  sessionDate: string;
  photoCount: number;
  submittedOn: string;
  status: string;
}

export async function listPhotoSubmissions(): Promise<PhotoRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("photo_submissions")
    .select("id, submitter_name, module_taught, session_date, storage_keys, status, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`photo_submissions read failed: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    submitter: row.submitter_name,
    module: row.module_taught,
    sessionDate: date(row.session_date),
    photoCount: (row.storage_keys ?? []).length,
    submittedOn: date(row.created_at),
    status: row.status,
  }));
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
    .order("sort_order", { ascending: true });

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