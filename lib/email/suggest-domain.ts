/**
 * "Did you mean gmail.com?" — the one check that catches an email which is
 * well-formed but dead.
 *
 * Format validation already accepts every legitimate address and rejects every
 * malformed one, including company domains, plus-tags, subdomains and long
 * TLDs. What it cannot see is a typo: `vikram@gmial.com` is a perfectly valid
 * address at a domain nobody owns. The applicant submits, the confirmation
 * never arrives, and neither side knows why.
 *
 * This only ever *suggests*. It must not block, because "close to a known
 * provider" is not the same as "wrong" — somebody's real company domain may sit
 * one keystroke from a free one, and rejecting them would be a far worse error
 * than the typo it prevents.
 */

/** Free providers people actually use here. Compared against, never enforced. */
const COMMON_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.in",
  "yahoo.co.in",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "protonmail.com",
  "proton.me",
  "rediffmail.com",
  "mail.com",
  "email.com",
  "aol.com",
  "zoho.com",
  "zohomail.com",
];

/** Edit distance, stopped as soon as it exceeds what we care about. */
function editDistance(a: string, b: string, ceiling: number): number {
  if (Math.abs(a.length - b.length) > ceiling) return ceiling + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    if (Math.min(...current) > ceiling) return ceiling + 1;
    previous = current;
  }

  return previous[b.length];
}

/**
 * The corrected address, or nothing when there is no confident correction.
 *
 * Returns the whole address rather than the domain so a caller can offer it as
 * a one-click fix instead of asking someone to retype what they just typed.
 */
export function suggestEmailDomain(email: string): string | undefined {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  // Nothing to compare until there is a local part and a domain with a dot.
  if (at < 1 || at === trimmed.length - 1) return undefined;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (!domain.includes(".")) return undefined;

  // Already a known provider, or too short for a typo to be distinguishable
  // from a genuinely different domain.
  if (COMMON_DOMAINS.includes(domain) || domain.length < 5) return undefined;

  // Two keystrokes is the limit. Three starts suggesting unrelated domains at
  // people whose address was right all along.
  const ceiling = 2;
  let best: { domain: string; distance: number } | undefined;

  for (const candidate of COMMON_DOMAINS) {
    const distance = editDistance(domain, candidate, ceiling);
    if (distance <= ceiling && (!best || distance < best.distance)) {
      best = { domain: candidate, distance };
    }
  }

  return best ? `${local}@${best.domain}` : undefined;
}
