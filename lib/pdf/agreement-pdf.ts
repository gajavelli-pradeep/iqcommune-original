import { jsPDF } from "jspdf";

// iqcommune brand colors (CSS var equivalents — Satori can't resolve var(), so literals here)
const INK:    [number, number, number] = [20,  22,  29];
const MUTED:  [number, number, number] = [56,  59,  71];
const GOLD:   [number, number, number] = [138, 101, 16];  // --gold-dark (readable on light)
const SOFT:   [number, number, number] = [244, 242, 236]; // --surface-sunken
const BORDER: [number, number, number] = [220, 216, 204];

export interface AgreementPdfData {
  practitionerName: string;
  designation:      string;
  org:              string;
  module:           string;
  city:             string;
  state:            string;
  ref:              string;       // 4-digit ref, e.g. "0042"
  signedAt?:        string;       // ISO timestamp; omit to render a prefilled UNSIGNED copy (P3)
  sigMode?:         "typed" | "drawn";
  sigTypedName?:    string;
}

export function generateAgreementPdf(data: AgreementPdfData): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.getWidth();   // 210mm
  const H   = doc.internal.pageSize.getHeight();  // 297mm
  const M   = 18;
  const CW  = W - M * 2;
  const MID = W / 2;
  let y = M;

  // pt → mm line-height helper
  const lh = (fsPt: number, factor = 1.35) => (fsPt * factor) / 2.834646;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("PRACTITIONER AGREEMENT", MID, y + 4, { align: "center" });

  y += 10;
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text("iqcommune", MID, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Reference: IQC-EMP-${data.ref}`, MID, y, { align: "center" });

  y += 8;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, y, W - M, y);

  // ── Practitioner Details ─────────────────────────────────────────────────────
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Practitioner Details", M, y);

  y += 8;

  const halfW = CW / 2 - 4;

  const field = (label: string, value: string, x: number, maxW: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(value || "—", maxW) as string[];
    doc.text(lines, x, y + 5);
  };

  field("Full Name",   data.practitionerName,          M,       halfW);
  field("Designation", data.designation,                MID + 4, halfW);
  y += 16;

  field("Organisation", data.org,                       M,       halfW);
  field("Location",     `${data.city}, ${data.state}`,  MID + 4, halfW);
  y += 16;

  doc.setDrawColor(...BORDER);
  doc.line(M, y, W - M, y);

  // ── Assigned Module ──────────────────────────────────────────────────────────
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Assigned Module", M, y);

  y += 8;
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, y - 4, CW, 12, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  const moduleLines = doc.splitTextToSize(data.module, CW - 10) as string[];
  doc.text(moduleLines, M + 5, y + 4);

  y += 18;
  doc.setDrawColor(...BORDER);
  doc.line(M, y, W - M, y);

  // ── Agreement Terms ──────────────────────────────────────────────────────────
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Agreement Terms", M, y);

  y += 7;
  const terms = [
    "The practitioner agrees to deliver iqcommune-approved financial literacy sessions under the assigned module, maintaining content integrity and impartiality.",
    "No products, services, or investments may be pitched, sold, or referred to participants during or after the session in connection with iqcommune engagements.",
    "The practitioner agrees to adhere to iqcommune's code of conduct for the full duration of this empanelment. Revenue share and payout terms are as communicated by the iqcommune coordinator.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  for (let i = 0; i < terms.length; i++) {
    const lines = doc.splitTextToSize(`${i + 1}.  ${terms[i]}`, CW) as string[];
    doc.text(lines, M, y, { lineHeightFactor: 1.4 });
    y += lines.length * lh(9.5) + 3;
  }

  y += 4;
  doc.setDrawColor(...BORDER);
  doc.line(M, y, W - M, y);

  // ── Signature Block ──────────────────────────────────────────────────────────
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Digital Signature", M, y);

  y += 8;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.roundedRect(M, y - 3, CW, 36, 3, 3, "S");

  if (data.signedAt) {
    // ── Signed copy ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("SIGNED BY", M + 5, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(data.sigMode === "typed" ? 16 : 11);
    doc.setTextColor(...INK);
    doc.text(
      data.sigMode === "typed" ? (data.sigTypedName ?? "") : "[Drawn signature on file]",
      M + 5,
      y + 14
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("SIGNED ON", M + 5, y + 22);
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const parsedDate = new Date(data.signedAt);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`generateAgreementPdf: invalid signedAt "${data.signedAt}"`);
    }
    const sigDate = parsedDate.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "long",
      timeStyle: "short",
    });
    doc.text(`${sigDate} IST`, M + 5, y + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Mode: ${data.sigMode === "typed" ? "Typed" : "Drawn"} · Ref: IQC-EMP-${data.ref}`,
      W - M,
      y + 28,
      { align: "right" }
    );
  } else {
    // ── Prefilled UNSIGNED copy (P3: download before signing) — blank signature lines ──
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("SIGNED BY", M + 5, y + 5);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(M + 5, y + 15, MID - 6, y + 15);

    doc.text("SIGNED ON", M + 5, y + 23);
    doc.line(M + 5, y + 31, MID - 6, y + 31);

    doc.setFont("helvetica", "italic");
    doc.setTextColor(...MUTED);
    doc.text(
      `Awaiting signature · Ref: IQC-EMP-${data.ref}`,
      W - M,
      y + 28,
      { align: "right" }
    );
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `iqcommune · Confidential · Generated ${new Date().toLocaleDateString("en-IN")}`,
    MID,
    H - 12,
    { align: "center" }
  );

  // server-safe: arraybuffer → Buffer (never doc.save() — that's browser-only)
  return Buffer.from(doc.output("arraybuffer"));
}
