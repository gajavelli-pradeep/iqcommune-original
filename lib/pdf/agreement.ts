import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { AGREEMENT_CLAUSES } from "@/constants/agreement";

/**
 * The signed empanelment agreement, as a PDF.
 *
 * Built on the server rather than in the browser as V7 does. V7 generates it
 * client-side with jsPDF, which means the whole legal text and every signature
 * detail must be shipped to any page that offers the button — including to a
 * User, whose access is "view & download only". Here the route holds the
 * document and returns bytes, so the client needs no copy of either.
 *
 * The clause text is the same `AGREEMENT_CLAUSES` the practitioner read and
 * signed against, not a retyped copy: a downloaded agreement that differs from
 * the one on screen would be worse than no download at all.
 */

export interface SignedAgreement {
  reference: string;
  practitioner: string;
  modules: readonly string[];
  issuedOn: string;
  signedName: string | null;
  signedDesignation: string | null;
  signedAt: string | null;
  signatureMode: string | null;
  signedIp: string | null;
  version: string;
}

// A4 in points, with the margins the rest of the brand's documents use.
const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;

const INK = rgb(0.06, 0.07, 0.09);
const MUTED = rgb(0.29, 0.3, 0.36);
const FAINT = rgb(0.44, 0.44, 0.5);
const GOLD = rgb(0.79, 0.6, 0.16);
const RULE = rgb(0.85, 0.85, 0.87);

/** Greedy wrap — pdf-lib draws a string as-is, so lines are broken here. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let line = "";

  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * A cursor that writes down the page and starts a new one when it runs out of
 * room. Without this the tail of a long clause is drawn below the page edge —
 * present in the file, invisible to every reader.
 */
class Writer {
  private page: PDFPage;
  private y: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly body: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.page = doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - MARGIN;
  }

  private ensure(height: number) {
    if (this.y - height >= MARGIN) return;
    this.page = this.doc.addPage([PAGE.width, PAGE.height]);
    this.y = PAGE.height - MARGIN;
  }

  gap(height: number) {
    this.ensure(height);
    this.y -= height;
  }

  text(
    value: string,
    { size = 9.5, bold = false, colour = MUTED, indent = 0, leading = 1.5 } = {},
  ) {
    const font = bold ? this.bold : this.body;
    const lineHeight = size * leading;
    for (const line of wrap(value, font, size, CONTENT_WIDTH - indent)) {
      this.ensure(lineHeight);
      this.y -= lineHeight;
      this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font, color: colour });
    }
  }

  rule(colour = RULE) {
    this.ensure(8);
    this.y -= 8;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE.width - MARGIN, y: this.y },
      thickness: 0.75,
      color: colour,
    });
  }

  /** A label/value pair, as the console's detail cards show them. */
  field(label: string, value: string) {
    const size = 9.5;
    this.ensure(size * 1.6);
    this.y -= size * 1.6;
    this.page.drawText(label, { x: MARGIN, y: this.y, size: 8.5, font: this.body, color: FAINT });
    this.page.drawText(value, {
      x: MARGIN + 150,
      y: this.y,
      size,
      font: this.bold,
      color: INK,
    });
  }
}

export async function renderSignedAgreement(agreement: SignedAgreement): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const body = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  doc.setTitle(`Empanelment agreement — ${agreement.practitioner} (${agreement.reference})`);
  doc.setSubject("iqcommune practitioner empanelment agreement");
  doc.setProducer("iqcommune console");

  const writer = new Writer(doc, body, bold);

  writer.text("iqcommune", { size: 20, bold: true, colour: GOLD });
  writer.text("WHERE FINANCIAL INTELLIGENCE CONNECTS", { size: 7, colour: FAINT });
  writer.gap(14);
  writer.text("PRACTITIONER EMPANELMENT AGREEMENT", { size: 13, bold: true, colour: INK });
  writer.rule(GOLD);
  writer.gap(10);

  writer.field("Practitioner", agreement.practitioner);
  writer.field("Agreement reference", agreement.reference);
  writer.field("Module(s)", agreement.modules.join(", ") || "—");
  writer.field("Issued on", agreement.issuedOn);
  writer.field("Agreement version", agreement.version);
  writer.gap(14);

  for (const clause of AGREEMENT_CLAUSES) {
    writer.gap(8);
    writer.text(clause.title, { size: 10, bold: true, colour: INK });
    writer.gap(3);
    for (const paragraph of clause.paragraphs) {
      writer.text(paragraph);
      writer.gap(4);
    }
    for (const sub of clause.subClauses ?? []) {
      writer.text(sub, { indent: 14 });
      writer.gap(3);
    }
    for (const highlight of clause.highlights ?? []) {
      writer.text(highlight, { indent: 14, colour: INK, bold: true });
      writer.gap(3);
    }
  }

  // ── Execution block ───────────────────────────────────────────────────────
  writer.gap(18);
  writer.rule();
  writer.gap(10);
  writer.text("EXECUTION", { size: 10, bold: true, colour: INK });
  writer.gap(6);

  if (agreement.signedAt) {
    writer.field("Signed by", agreement.signedName ?? agreement.practitioner);
    writer.field("Designation", agreement.signedDesignation ?? "—");
    writer.field("Signed at", agreement.signedAt);
    writer.field("Signature method", agreement.signatureMode ?? "—");
    // The IP is part of what makes an online signature evidential; it is
    // captured server-side where the signer cannot edit it.
    writer.field("Recorded from", agreement.signedIp ?? "—");
    writer.gap(10);
    writer.text(
      "Signed electronically through the iqcommune onboarding link. The timestamp, originating address and agreement version above were recorded by the platform at the moment of submission and cannot be edited from the practitioner's side.",
      { size: 8, colour: FAINT },
    );
  } else {
    // A downloadable "signed agreement" that is not signed must say so on its
    // face — otherwise the file itself becomes the misleading artefact.
    writer.text("NOT YET SIGNED", { size: 11, bold: true, colour: rgb(0.75, 0.22, 0.17) });
    writer.gap(4);
    writer.text(
      "This is the unsigned agreement as issued. No signature has been recorded against this reference.",
      { size: 8.5, colour: FAINT },
    );
  }

  return doc.save();
}
