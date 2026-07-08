import crypto from "crypto";

/**
 * Session-consent revenue math + helpers.
 *
 * The net-payout formula is DELIBERATELY isolated here so it can be swapped in one
 * place. Per the V4 admin-console handoff §4.3:
 *
 *   Net = Gross × (1 − TDS% + GST%)
 *
 * Note this folds GST into the net (unusual — GST is normally added on top of a fee,
 * not netted against TDS withholding). It is implemented as specified by the client's
 * handoff; revisit here if their accountant rules otherwise.
 */

export interface NetInput {
  gross: number;
  tdsRate: number; // percent, e.g. 10 for 10%
  gstRate: number; // percent, e.g. 18 for 18%
}

export interface NetResult {
  gross: number;
  tdsRate: number;
  gstRate: number;
  tdsAmount: number; // informational breakdown (gross × tds%)
  gstAmount: number; // informational breakdown (gross × gst%)
  net: number; // gross × (1 − tds% + gst%), rounded to whole rupees
}

export function computeNet({ gross, tdsRate, gstRate }: NetInput): NetResult {
  const g = Math.max(0, Math.round(gross));
  const tds = clampPct(tdsRate);
  const gst = clampPct(gstRate);
  return {
    gross: g,
    tdsRate: tds,
    gstRate: gst,
    tdsAmount: Math.round((g * tds) / 100),
    gstAmount: Math.round((g * gst) / 100),
    net: Math.round(g * (1 - tds / 100 + gst / 100)),
  };
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** IQC-CNF-XXXXXX — unguessable-enough ref; the DB unique index is the real guard. */
export function generateConfirmationRef(): string {
  return `IQC-CNF-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}
