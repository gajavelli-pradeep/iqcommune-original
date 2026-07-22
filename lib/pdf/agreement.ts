import "server-only";

import { AGREEMENT_CLAUSES } from "@/constants/agreement";

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

export async function renderSignedAgreement(agreement: SignedAgreement): Promise<Uint8Array> {
  const { doc, writer } = await startDocument(
    `Empanelment agreement — ${agreement.practitioner} (${agreement.reference})`,
    "PRACTITIONER EMPANELMENT AGREEMENT",
  );

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
