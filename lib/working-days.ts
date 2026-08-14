/**
 * When a payout is expected, per clause 3(c): "Payment will be made within 7
 * working days of the session date".
 *
 * The confirmation was recorded as missing this field with "no such date is
 * stored anywhere" as the reason, which was true and also the wrong conclusion.
 * Nothing stores it because nothing needs to: the agreement states the rule and
 * the session date is already on the record, so the date is derived rather than
 * kept. A stored copy would only be a second place for it to disagree with the
 * clause it comes from.
 *
 * Weekends only. India's public holidays vary by state and by year, and a
 * hardcoded list would be wrong somewhere from the day it shipped — the clause
 * says "within", so a date that is at worst slightly early is the safe
 * direction to be wrong in.
 *
 * ponytail: no holiday calendar. Add one if finance starts disputing the date,
 * and take it from a source that knows the practitioner's state.
 */

const SATURDAY = 6;
const SUNDAY = 0;

export const PAYOUT_WORKING_DAYS = 7;

export function addWorkingDays(from: Date, days: number): Date {
  const at = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    at.setDate(at.getDate() + 1);
    const day = at.getDay();
    if (day !== SATURDAY && day !== SUNDAY) remaining -= 1;
  }
  return at;
}

/**
 * The expected payment date for a session, or null when the session has no date
 * yet — a confirmation can be issued before one is fixed, and inventing a
 * payment date from a session date that does not exist would be worse than
 * leaving the row off.
 */
export function expectedPaymentDate(sessionDate: string | null): Date | null {
  if (!sessionDate) return null;
  const session = new Date(sessionDate);
  if (Number.isNaN(session.getTime())) return null;
  return addWorkingDays(session, PAYOUT_WORKING_DAYS);
}
