import { jsPDF } from "jspdf";

// iqcommune brand colors (literals — jsPDF can't resolve CSS var()).
const INK:    [number, number, number] = [20,  22,  29];
const MUTED:  [number, number, number] = [56,  59,  71];
const GOLD:   [number, number, number] = [138, 101, 16];  // --gold-dark (readable on light)
const SOFT:   [number, number, number] = [244, 242, 236]; // --surface-sunken
const BORDER: [number, number, number] = [220, 216, 204];

export interface ConfirmationPdfData {
  refCode:          string;   // IQC-CNF-XXXXXX
  practitionerName: string;
  sessionRef:       string;
  module:           string;
  date:             string;   // display date, e.g. "12 Aug 2026"
  time:             string;   // "10:00 AM – 1:00 PM"
  venue:            string;
  participants:     number;
  gross:            number;
  tdsRate:          number;
  tdsAmount:        number;
  gstRate:          number;
  gstAmount:        number;
  net:              number;
  // V4 parity fields (optional — older confirmations predate them).
  agreementRef?:    string;
  issuedOn?:        string;
  startTime?:       string;   // "10:00 AM"
  duration?:        string;   // "3 hours" | "6 hours"
  city?:            string;
  state?:           string;
  audience?:        string;
  spoc?:            string;
  invoiceBy?:       string;
  paymentMethod?:   string;
  // Present once the practitioner has consented; absent on the admin record copy.
  signedAt?:        string | null;
  sigMode?:         "typed" | "drawn" | null;
  sigTypedName?:    string | null;
}

// jsPDF helvetica (WinAnsi) can't render ₹ — always write rupees as "Rs. ".
const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-IN")}`;

export function generateConfirmationPdf(data: ConfirmationPdfData): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();
  const M   = 18;
  const CW  = W - M * 2;
  const MID = W / 2;
  let y = M;

  const halfW = CW / 2 - 4;
  const field = (label: string, value: string, x: number, maxW: number, atY: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, atY);
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(value || "—", maxW) as string[], x, atY + 5);
  };
  const rule = () => { doc.setDrawColor(...BORDER); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); };
  const heading = (t: string) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...INK);
    doc.text(t, M, y);
  };

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("SESSION REVENUE CONFIRMATION", MID, y + 4, { align: "center" });

  y += 10;
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text("iqcommune", MID, y, { align: "center" });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Reference: ${data.refCode}`, MID, y, { align: "center" });

  y += 8; rule();

  // ── Practitioner ──
  y += 10; heading("Practitioner");
  y += 8;
  field("Name", data.practitionerName, M, halfW, y);
  field("Session Ref", data.sessionRef, MID + 4, halfW, y);
  y += 16;
  field("Empanelment Agreement Ref", data.agreementRef ?? "—", M, halfW, y);
  field("Issued On", data.issuedOn ?? "—", MID + 4, halfW, y);
  y += 16; rule();

  // ── Session details ──
  const cityState = [data.city, data.state].filter(Boolean).join(", ") || "—";
  y += 10; heading("Session Details");
  y += 8;
  field("Module", data.module, M, halfW, y);
  field("Date", data.date, MID + 4, halfW, y);
  y += 16;
  field("Start Time", data.startTime ?? data.time, M, halfW, y);
  field("Duration", data.duration ?? "—", MID + 4, halfW, y);
  y += 16;
  field("Venue", data.venue, M, halfW, y);
  field("City, State", cityState, MID + 4, halfW, y);
  y += 16;
  field("Audience", data.audience ?? "—", M, halfW, y);
  field("Participants", String(data.participants), MID + 4, halfW, y);
  y += 16;
  field("SPOC", data.spoc ?? "—", M, CW, y);
  y += 16; rule();

  // ── Payout breakdown ──
  y += 10; heading("Payout");
  y += 8;
  const rowsTop = y;
  const lineRow = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 10);
    doc.setTextColor(...(bold ? INK : MUTED));
    doc.text(label, M + 4, y);
    doc.setTextColor(...INK);
    doc.text(value, W - M - 4, y, { align: "right" });
    y += 8;
  };
  doc.setFillColor(...SOFT);
  doc.roundedRect(M, rowsTop - 6, CW, 40, 2, 2, "F");
  lineRow("Gross amount", rs(data.gross));
  lineRow(`Less: TDS (${data.tdsRate}%)`, `- ${rs(data.tdsAmount)}`);
  lineRow(`Add: GST (${data.gstRate}%)`, `+ ${rs(data.gstAmount)}`);
  lineRow("Net payout", rs(data.net), true);
  y += 4; rule();

  // ── Tax invoice ──
  y += 10; heading("Tax Invoice");
  y += 8;
  field("Invoice to be raised by", data.invoiceBy ?? "—", M, halfW, y);
  field("Payment method on file", data.paymentMethod ?? "—", MID + 4, halfW, y);
  y += 14;
  doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text("You are responsible for raising this invoice — iqcommune does not raise it on your behalf.", M, y);
  y += 6; rule();

  // ── Signature / consent ──
  y += 10; heading("Practitioner Consent");
  y += 8;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.roundedRect(M, y - 3, CW, 30, 3, 3, "S");

  if (data.signedAt) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text("CONSENTED BY", M + 5, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(data.sigMode === "typed" ? 15 : 11);
    doc.setTextColor(...INK);
    doc.text(data.sigMode === "typed" ? (data.sigTypedName || data.practitionerName) : "[Drawn signature on file]", M + 5, y + 13);
    const d = new Date(data.signedAt);
    const when = isNaN(d.getTime())
      ? data.signedAt
      : d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "long", timeStyle: "short" }) + " IST";
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text(`Consented on ${when}`, M + 5, y + 22);
  } else {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MUTED);
    doc.text("Awaiting practitioner consent.", M + 5, y + 12);
  }

  // ── Footer ──
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text(
    `iqcommune · Confidential · Generated ${new Date().toLocaleDateString("en-IN")}`,
    MID, H - 12, { align: "center" }
  );

  return Buffer.from(doc.output("arraybuffer"));
}
