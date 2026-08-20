/**
 * The single group-size taxonomy — one source of truth (client's spec,
 * iqcommune-admin-console-automated.html, 2026-08-19), matching `MODULES`'s
 * own pattern (audit M4).
 *
 * Each band's `minimum` is what the spec's own sample data always sets
 * `Min. commitment` to — size "16–25" pairs with `minCommit: 16` on every
 * row, "9–15" with 9, "5–8" with 5. Requester picks a band; the platform
 * derives the number it is billing to, rather than asking for both. Declared
 * here so the request form (which shows the label) and the request service
 * (which derives the commitment at submission) cannot drift apart the way two
 * separately-typed copies would.
 */
export const GROUP_SIZES = [
  { value: "5-8", label: "5 – 8 people", minimum: 5 },
  { value: "9-15", label: "9 – 15 people", minimum: 9 },
  { value: "16-25", label: "16 – 25 people", minimum: 16 },
] as const;

export type GroupSize = (typeof GROUP_SIZES)[number]["value"];

/** The band's own minimum, for whichever value a request actually holds. */
export function minCommitmentFor(groupSize: string | null | undefined): number | null {
  return GROUP_SIZES.find((size) => size.value === groupSize)?.minimum ?? null;
}
