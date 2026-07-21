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

export async function listPractitioners(): Promise<PractitionerRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("practitioners")
    .select("id, reference, full_name, role, organisation, city, status, created_at, practitioner_agreements ( modules )")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`practitioners read failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const agreements = (row.practitioner_agreements ?? []) as Array<{ modules: string[] }>;
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
