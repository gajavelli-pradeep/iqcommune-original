import "server-only";

import {
  AGREEMENT_CLAUSES,
  AGREEMENT_CONSENT_TEXT,
  AGREEMENT_DOCUMENT_TITLE,
  AGREEMENT_INTRO,
  AGREEMENT_PLATFORM_LABEL,
  AGREEMENT_PLATFORM_NAME,
  AGREEMENT_SIGNATURE_HEADING,
} from "@/constants/agreement";

import { FAINT, GREEN, INK, RED, startDocument } from "./document";

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

/**
 * No `modules`: the 2026-08-14 spec removed the Module(s) row from the
 * agreement's detail table, so carrying one here would put a term in the
 * archived contract that never appeared on the page it was signed from — the
 * exact divergence the note above rules out.
 */
export interface SignedAgreement {
  reference: string;
  practitioner: string;
  issuedOn: string;
  signedName: string | null;
  signedDesignation: string | null;
  signedAt: string | null;
  signatureMode: string | null;
  signedIp: string | null;
  version: string;
}

export async function renderSignedAgreement(agreement: SignedAgreement): Promise<Uint8Array> {
  const { doc, writer } = await startDocument(
    `Empanelment agreement — ${agreement.practitioner} (${agreement.reference})`,
    AGREEMENT_DOCUMENT_TITLE,
  );

  writer.field("Practitioner", agreement.practitioner);
  // The other party, which this document did not name at all. A contract
  // between one named party and nobody is not a contract.
  writer.field(AGREEMENT_PLATFORM_LABEL, AGREEMENT_PLATFORM_NAME);
  writer.field("Agreement reference", agreement.reference);
  writer.field("Issued on", agreement.issuedOn);
  writer.field("Agreement version", agreement.version);
  writer.gap(12);

  // Names both parties and fixes when the agreement takes effect. Also absent
  // before, so nothing in the file said what it was or when it began.
  writer.text(AGREEMENT_INTRO);
  writer.gap(10);

  for (const clause of AGREEMENT_CLAUSES) {
    writer.gap(8);
    writer.text(clause.title, { size: 10, bold: true, colour: INK });
    writer.gap(3);
    // One flat list, in the client's order. Splitting it into sub-clauses and
    // highlights and printing the groups separately is what put clause 4's
    // "(f)" above the (a)–(e) it follows.
    for (const paragraph of clause.paragraphs) {
      writer.text(paragraph);
      writer.gap(4);
    }
  }

  // ── Execution block ───────────────────────────────────────────────────────
  writer.gap(18);
  writer.rule();
  writer.gap(10);
  writer.text(AGREEMENT_SIGNATURE_HEADING, { size: 10, bold: true, colour: INK });
  writer.gap(6);

  // What signing means. The block below records how and when the signature was
  // captured, which is provenance — this is the sentence that makes it consent.
  writer.text(AGREEMENT_CONSENT_TEXT);
  writer.gap(10);

  if (agreement.signedAt) {
    writer.field("Signed by", agreement.signedName ?? agreement.practitioner);
    writer.field("Designation", agreement.signedDesignation ?? "—");
    writer.field("Signed at", agreement.signedAt, GREEN);
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
    writer.text("NOT YET SIGNED", { size: 11, bold: true, colour: RED });
    writer.gap(4);
    writer.text(
      "This is the unsigned agreement as issued. No signature has been recorded against this reference.",
      { size: 8.5, colour: FAINT },
    );
  }

  return doc.save();
}
