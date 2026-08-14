/**
 * The brand line, in one place.
 *
 * It reads "insight quotient unleashed" because that is what iqcommune stands
 * for — the name is the sentence, not a word that happens to start with IQ.
 *
 * Here rather than inline because it was written out four times across
 * `app/layout.tsx` and `app/opengraph-image.tsx`, and a set of literals is a
 * set of places to forget: an earlier retitle was lost in exactly that way, and
 * three of the four copies would have agreed with each other while the fourth
 * quietly shipped the old line in the share card. Metadata has no gate to catch
 * that — nothing renders it into a page the parity suites read.
 */

export const BRAND_TITLE = "iqcommune — insight quotient unleashed";

/** The line under the title, on the OpenGraph and Twitter cards. */
export const BRAND_STRAPLINE = "real insights from active professionals";

/**
 * The line under the wordmark on generated documents — the agreement and the
 * session confirmation.
 *
 * Those printed "WHERE FINANCIAL INTELLIGENCE CONNECTS", which appears in no
 * client source at all: not in the eight delivered V7 pages, which all carry the
 * line below, and not in the agreement JSON, whose `branding.tagline` is also
 * the line below. It was invented, and it was invented on the two documents a
 * practitioner keeps.
 *
 * Kept apart from `BRAND_STRAPLINE` because they are different registers doing
 * different jobs: that one is the sentence under a share card, this one is the
 * mark on a contract.
 */
export const BRAND_DOCUMENT_TAGLINE = "INSIGHT QUOTIENT — UNLEASHED";
