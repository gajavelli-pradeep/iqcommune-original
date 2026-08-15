import "server-only";

import {
  AGREEMENT_CLAUSES,
  AGREEMENT_CONSENT_TEXT,
  AGREEMENT_DOCUMENT_TITLE,
  AGREEMENT_HEADER_FIELDS,
  AGREEMENT_INTRO,
  AGREEMENT_SIGNATURE_FIELDS,
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
 *
 * No `signedDesignation` either, for the same reason: v2 (2026-08-15) removed
 * the Designation input from the onboarding page, so there is no longer a value
 * the practitioner ever supplied to print.
 */
export interface SignedAgreement {
  /** IQC-AGR — this document's own reference. Not a header row in v2: it names
   *  the file and appears in the attestation, while the header carries the
   *  practitioner's IQC-EMP number instead. */
  reference: string;
  /** The practitioner's IQC-EMP number — the client's fourth header field. */
  empanelmentReference: string;
  practitioner: string;
  city: string;
  /** Blank on records predating migration 0017, never a placeholder. */
  state: string;
  issuedOn: string;
  signedName: string | null;
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

  // The header is the client's list, walked in their order, rather than rows
  // this file names — so the next header change is a JSON edit and a rebuild.
  // The generator refuses to emit a key that has no value here, which is what
  // stops an unrecognised field printing a silent dash on a contract.
  const headerValues: Record<string, string> = {
    practitionerName: agreement.practitioner,
    city: agreement.city,
    state: agreement.state,
    empanelmentRef: agreement.empanelmentReference,
  };
  for (const field of AGREEMENT_HEADER_FIELDS) {
    writer.field(field.label, headerValues[field.key] || "—");
  }
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
    // Three rows, the client's, walked the same way as the header.
    const signatureValues: Record<string, string> = {
      practitionerName: agreement.signedName ?? agreement.practitioner,
      signatureTimestamp: agreement.signedAt,
      signatureMethod: agreement.signatureMode ?? "—",
    };
    for (const field of AGREEMENT_SIGNATURE_FIELDS) {
      // The execution date is the one value a reader looks for first.
      const colour = field.key === "signatureTimestamp" ? GREEN : undefined;
      writer.field(field.label, signatureValues[field.key] || "—", colour);
    }
    writer.gap(10);
    // The IP, the version and this document's own reference are what make an
    // online signature evidential, and v2's three-row block has no place for
    // them. They belong in the platform's attestation rather than among the
    // contract's own fields — dropping them to match the row count would throw
    // away the provenance the block below exists to assert.
    writer.text(
      `Signed electronically through the iqcommune onboarding link. Recorded by the platform at the moment of submission, and not editable from the practitioner's side: originating address ${agreement.signedIp ?? "not recorded"}, agreement ${agreement.reference}, version ${agreement.version}, issued ${agreement.issuedOn}.`,
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
