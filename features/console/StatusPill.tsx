/**
 * Status pills.
 *
 * The spec has three real dictionaries (`prStatusMeta`, `reqMeta`, `roleClass`)
 * and four panels that compute the same thing with an inline ternary. They all
 * produce a label and a colour, so they are one table here — the ternaries were
 * duplication, not a different idea.
 *
 * Tone names describe meaning, not colour, and follow the project's reserved
 * semantics: green is success, red is a true failure, amber is "needs action",
 * gold is brand. A routine pending count is amber, never red.
 */

export type PillTone = "neutral" | "progress" | "success" | "warning" | "danger";

const TONES: Record<PillTone, string> = {
  neutral: "border-border-strong bg-surface-soft text-ink-muted",
  progress: "border-gold-border bg-gold-light text-gold-dark",
  success: "border-green-light bg-green-light text-green",
  warning: "border-gold-border bg-gold-light text-gold-dark",
  danger: "border-red bg-red-light text-red",
};

export function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-2xs font-semibold ${TONES[tone]}`}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/** Maps a stored value to its label and tone, per panel. */
export type PillMap<Value extends string> = Record<Value, { label: string; tone: PillTone }>;

/**
 * Practitioner pipeline — the spec's `prStatusMeta`. Note the label case: the
 * stored value is "Screening Done" but the pill reads "Screening done".
 */
export const PRACTITIONER_STATUS: PillMap<
  "Applied" | "Screening Done" | "Agreement Sent" | "Empanelled" | "Rejected" | "Deactivated"
> = {
  Applied: { label: "Applied", tone: "neutral" },
  "Screening Done": { label: "Screening done", tone: "progress" },
  "Agreement Sent": { label: "Agreement sent", tone: "progress" },
  Empanelled: { label: "Empanelled", tone: "success" },
  // Both map to the same class in the spec; a rejection and a deactivation are
  // different events but read identically once they have happened.
  Rejected: { label: "Rejected", tone: "danger" },
  Deactivated: { label: "Deactivated", tone: "danger" },
};

/** Session requests — the spec's `reqMeta`. */
export const REQUEST_STATUS: PillMap<"New" | "Matched" | "Cancelled"> = {
  New: { label: "New", tone: "warning" },
  Matched: { label: "Matched", tone: "success" },
  Cancelled: { label: "Cancelled", tone: "danger" },
};

/** Console roles — the spec's `roleClass`, whose keys are also its labels. */
export const TEAM_ROLE_STATUS: PillMap<"Global Admin" | "Admin" | "User"> = {
  "Global Admin": { label: "Global Admin", tone: "success" },
  Admin: { label: "Admin", tone: "progress" },
  User: { label: "User", tone: "warning" },
};

/** Agreements — the spec computes this inline; it is a dictionary like the rest. */
export const AGREEMENT_STATUS: PillMap<"Signed" | "Pending"> = {
  Signed: { label: "Signed", tone: "success" },
  Pending: { label: "Pending", tone: "warning" },
};

/** Payouts. "Paid" carries its date in the spec, so the label is built at use. */
export const PAYOUT_STATUS: PillMap<"Paid" | "Pending"> = {
  Paid: { label: "Paid", tone: "success" },
  Pending: { label: "Pending", tone: "warning" },
};

/** Session consent. */
export const CONSENT_STATUS: PillMap<"Received" | "Pending"> = {
  Received: { label: "Received", tone: "success" },
  Pending: { label: "Pending", tone: "warning" },
};

/**
 * Sessions. Carries both the current DB enum (Scheduled/Delivered/Cancelled)
 * and the V7 redesign values (Pending/Confirmed/Completed) so the pill renders
 * correctly before and after the H2 status migration.
 */
export const SESSION_STATUS: PillMap<
  "Scheduled" | "Delivered" | "Cancelled" | "Pending" | "Confirmed" | "Completed"
> = {
  Pending: { label: "Pending", tone: "warning" },
  Scheduled: { label: "Scheduled", tone: "progress" },
  Confirmed: { label: "Confirmed", tone: "progress" },
  Delivered: { label: "Delivered", tone: "success" },
  Completed: { label: "Completed", tone: "success" },
  Cancelled: { label: "Cancelled", tone: "danger" },
};

/** Photo submissions — the review pipeline. */
export const PHOTO_STATUS: PillMap<"Pending" | "Approved" | "Rejected" | "Expired"> = {
  Pending: { label: "Pending", tone: "warning" },
  Approved: { label: "Approved", tone: "success" },
  Rejected: { label: "Rejected", tone: "danger" },
  Expired: { label: "Expired", tone: "neutral" },
};

/** Gallery — whether a photo is live on the public site. */
export const GALLERY_STATUS: PillMap<"Published" | "Draft"> = {
  Published: { label: "Published", tone: "success" },
  Draft: { label: "Draft", tone: "neutral" },
};
