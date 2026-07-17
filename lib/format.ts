export type InitialsOptions = {
  /** Upper-case the result. AgreementTable renders names as typed. */
  uppercase?: boolean;
  /**
   * `false` (default): first letter of each of the first two words — a blank
   * segment from a double space yields a single letter.
   * `true`: skip blank segments, then take the first two letters of all initials
   * joined. Differs from the default only on 3+ word or irregularly spaced names.
   */
  compact?: boolean;
};

/**
 * Initials for an avatar circle.
 *
 * Both option flags exist because the admin tables genuinely render two ways and
 * both are live: PayoutTable / PhotosTable / PractitionerTable use the uppercase
 * word-wise form; AgreementTable renders as-typed and compact. The behaviour is
 * configured, not normalised — collapsing either would change rendered letters.
 */
export function initials(name: string, { uppercase = true, compact = false }: InitialsOptions = {}): string {
  const words = compact ? name.split(" ").filter(Boolean) : name.split(" ").slice(0, 2);
  const letters = words.map((w) => w[0] ?? "").join("");
  const result = compact ? letters.slice(0, 2) : letters;
  return uppercase ? result.toUpperCase() : result;
}
