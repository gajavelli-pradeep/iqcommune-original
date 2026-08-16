/**
 * One rendering for every timestamp that evidences an act — a signature, a
 * consent, the receipt shown for either.
 *
 * `toLocaleString` with no `timeZone` reads the *host's* zone, and this codebase
 * renders the same instant on both sides of the network: the PDF is built on
 * Vercel, which runs UTC, and the on-screen receipt in the signer's own browser,
 * which in practice is IST. So a signed agreement recorded 1:36 pm while the
 * page the practitioner signed from said 7:06 pm — the same moment, five and a
 * half hours apart, with neither surface naming the zone it meant.
 *
 * Pinned to India rather than to the reader's locale on purpose. This is a
 * record of when something happened, not a convenience for whoever is looking:
 * it has to read identically to the practitioner, to the admin, and to anyone
 * who opens the file later from somewhere else. The suffix carries as much
 * weight as the digits — an unlabelled wall-clock time evidences nothing.
 */

export const RECORD_TIME_ZONE = "Asia/Kolkata";
const RECORD_ZONE_LABEL = "IST";

const RECORD_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: RECORD_TIME_ZONE,
};

/** e.g. `14 Aug 2026, 7:06:58 pm IST`. */
export function formatRecordedAt(value: string | Date): string {
  const at = typeof value === "string" ? new Date(value) : value;
  return `${at.toLocaleString("en-IN", RECORD_FORMAT)} ${RECORD_ZONE_LABEL}`;
}

/**
 * The running clock the onboarding page shows while the form is still open.
 *
 * Same zone as `formatRecordedAt`, for the reason that function exists: a signer
 * watching one zone tick and receiving a receipt in another has been shown two
 * different answers to when they signed.
 */
export function formatLiveClock(now: Date): string {
  return now.toLocaleString("en-IN", RECORD_FORMAT);
}

/**
 * How long ago, in the roughest unit that is still true.
 *
 * "Sent 3 days ago" answers the only question being asked of it — has this been
 * sitting too long? — which an exact timestamp answers worse. `now` is a
 * parameter rather than read inside, so the label is deterministic in a test and
 * cannot drift between the server render and the client's clock.
 *
 * Moved here from `consent-stage.ts`, which went with the "Next step" column it
 * existed for. Nothing about this was ever consent-specific.
 */
export function sinceLabel(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
