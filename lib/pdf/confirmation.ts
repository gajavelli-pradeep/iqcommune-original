import "server-only";

import { SESSION_SHOTS } from "@/constants/photo-shots";

import { FAINT, GREEN, INK, MUTED, RED, startDocument } from "./document";

/**
 * The two documents the Session Consent tab produces.
 *
 * Both are generated server-side for the same reason as the agreement: the
 * route holds the record and returns bytes, so a read-only User can download
 * without the page having to carry the data.
 */

export interface SessionConfirmation {
  confirmationReference: string;
  sessionReference: string;
  practitioner: string;
  module: string;
  sessionDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  city: string;
  state: string | null;
  venue: string | null;
  participants: string | null;
  spoc: string;
  audience: string;
  grossPayout: string;
  /** Derived from the session date per clause 3(c); null when no date is set. */
  expectedPayment: string | null;
  consentGivenAt: string | null;
}

export async function renderConfirmation(session: SessionConfirmation): Promise<Uint8Array> {
  const { doc, writer } = await startDocument(
    `Session confirmation — ${session.confirmationReference}`,
    "SESSION CONFIRMATION & PAYOUT CONSENT",
  );

  writer.field("Confirmation ref.", session.confirmationReference);
  writer.field("Session ref.", session.sessionReference);
  writer.field("Practitioner", session.practitioner);
  writer.field("Module", session.module);
  writer.gap(10);

  writer.text("SESSION", { size: 10, bold: true, colour: INK });
  writer.gap(4);
  writer.field("Date", session.sessionDate);
  writer.field(
    "Time",
    session.startTime
      ? `${session.startTime}${session.durationMinutes ? ` — ${session.durationMinutes / 60} hours` : ""}`
      : "To be confirmed",
  );
  writer.field("Audience", session.audience);
  writer.field("Requested by (SPOC)", session.spoc);
  writer.field("City", [session.city, session.state].filter(Boolean).join(", "));
  writer.field("Venue", session.venue ?? "To be confirmed");
  writer.field("Participants", session.participants ?? "—");
  writer.gap(10);

  writer.amount("GROSS PAYOUT AMOUNT", session.grossPayout);
  // Clause 3(a) says the confirmation sets out the payout "along with
  // expected payment date", and it did not. Derived from the session date
  // rather than stored, because the agreement already fixes the rule.
  if (session.expectedPayment) writer.field("Expected payment", session.expectedPayment);
  // Copied from V7's own wording — this document must not imply the platform
  // has done a tax calculation it has not done.
  writer.text(
    "This amount is pre-tax. TDS, GST and net calculations are handled separately by the finance/accounting team — not on this platform.",
    { size: 8, colour: FAINT },
  );

  writer.gap(16);
  writer.rule();
  writer.gap(10);
  writer.text("CONSENT", { size: 10, bold: true, colour: INK });
  writer.gap(4);

  if (session.consentGivenAt) {
    writer.field("Consent recorded", session.consentGivenAt, GREEN);
    writer.gap(8);
    writer.text(
      "The practitioner named above confirmed these session details and agreed to the gross payout shown, through the consent link issued by the platform. The timestamp was recorded server-side at the moment of submission.",
      { size: 8.5, colour: MUTED },
    );
  } else {
    writer.text("CONSENT NOT YET RECEIVED", { size: 11, bold: true, colour: RED });
    writer.gap(4);
    writer.text(
      "This confirmation has been issued but the practitioner has not yet agreed to it. It is not evidence of an accepted engagement.",
      { size: 8.5, colour: FAINT },
    );
  }

  return doc.save();
}

export interface PhotoGuide {
  sessionReference: string;
  practitioner: string;
  module: string;
  sessionDate: string;
  city: string;
  venue: string | null;
}

/**
 * The pre-session photo guide. The shot list is `SESSION_SHOTS`, the same one
 * the upload page checklists against and the reminder email carries — a guide
 * that asked for different shots than the page accepts would be worse than none.
 */
export async function renderPhotoGuide(session: PhotoGuide): Promise<Uint8Array> {
  const { doc, writer } = await startDocument(
    `Photo guide — ${session.sessionReference}`,
    "SESSION PHOTO GUIDE",
  );

  writer.field("Session ref.", session.sessionReference);
  writer.field("Practitioner", session.practitioner);
  writer.field("Module", session.module);
  writer.field("Date", session.sessionDate);
  writer.field("Where", [session.venue, session.city].filter(Boolean).join(", "));
  writer.gap(12);

  writer.text(
    "Please capture the eight shots below during the session. They are what the landing-page gallery and the session record are built from, so the set matters more than the polish — a clear phone photo is fine.",
    { size: 9.5, colour: MUTED },
  );
  writer.gap(12);

  writer.text(`THE ${SESSION_SHOTS.length} SHOTS`, { size: 10, bold: true, colour: INK });
  writer.gap(6);

  SESSION_SHOTS.forEach((shot, index) => {
    writer.text(`${index + 1}. ${shot.label}`, { size: 9.5, bold: true, colour: INK });
    writer.text(shot.note, { size: 8.5, colour: FAINT, indent: 14 });
    writer.gap(5);
  });

  writer.gap(10);
  writer.rule();
  writer.gap(8);
  writer.text("BEFORE YOU SHOOT", { size: 10, bold: true, colour: INK });
  writer.gap(4);
  writer.text(
    "Tell participants that photos are being taken and that some may appear on the iqcommune site. Anyone who would rather not appear should be kept out of frame — please honour that without needing to be asked twice.",
    { size: 8.5, colour: MUTED },
  );
  writer.gap(8);
  writer.text(
    "Upload them through the link in your email once the session ends. It expires, so do it the same day where you can.",
    { size: 8.5, colour: MUTED },
  );

  return doc.save();
}
