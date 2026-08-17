/**
 * Client-owned inboxes — the addresses iqcommune's own mail arrives at.
 *
 * Here rather than in `lib/env.ts` because these are a client detail, not
 * environment plumbing. `CONTACT_EMAIL_DEFAULT` (hello@iqcommune.com) names a
 * different address for a different job — "what the site prints when
 * CONTACT_EMAIL is unset", the public/support line. Borrowing it to route mail
 * would tie where feedback lands to what the footer shows, and the day one of
 * those moves the other would follow it silently.
 */

/**
 * Where a submitted session rating is sent — the client's own inbox, not the
 * public one (client, 2026-08-17: "come directly to my email id - pg@
 * iqcommune.com").
 *
 * Hardcoded rather than read from the environment: this is the specific
 * address asked for, and an unset or mistyped variable would send feedback
 * nowhere rather than here. Changing it is a code change, which is the point —
 * it is a decision, not configuration.
 */
export const FEEDBACK_INBOX = "pg@iqcommune.com";
