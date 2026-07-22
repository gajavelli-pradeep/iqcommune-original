/**
 * IST-pinned date/time formatters (audit M24).
 *
 * Multiple sites formatted dates independently with `en-IN` but no time zone, so
 * the day rendered depended on where the code ran: on the server (UTC) a session
 * late on the IST clock rolled to the previous day, and between server and client
 * it produced a hydration mismatch on a legally-binding agreement. Every date the
 * app shows is an India date, so the zone is fixed to `Asia/Kolkata` here, once.
 * These are display only — the authoritative instant is the server's timestamp.
 */

const TIME_ZONE = "Asia/Kolkata";
const LOCALE = "en-IN";

/** "12 Aug 2026, 4:30 pm" — timestamp lines (receipts, signed-at). */
export function formatDateTimeIST(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** "12 Aug 2026" — the default date rendering across the tokenised pages. */
export function formatDateIST(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: "medium" }).format(
    new Date(iso),
  );
}

/** "12 August 2026" — the agreement's on-screen "Date:" line. */
export function formatDateLongIST(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, dateStyle: "long" }).format(
    new Date(iso),
  );
}
