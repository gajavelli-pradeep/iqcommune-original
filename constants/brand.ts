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
