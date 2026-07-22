/**
 * The eight photo angles for a session. Shared by the on-page checklist
 * (`ShotChecklist`) and the photo-guide email (audit G4b): the operating
 * procedure requires the email to carry the shot ideas ahead of the session, not
 * just the upload link, so both must read from one list.
 */
export const SESSION_SHOTS: ReadonlyArray<{ label: string; note: string }> = [
  { label: "Back of room — trainer in focus", note: "Full audience visible in background" },
  { label: "From trainer's position", note: "Audience facing the screen" },
  { label: "Front-left corner", note: "Wide view of the full room" },
  { label: "Front-right corner", note: "Trainer and session materials visible" },
  { label: "Candid — working through numbers", note: "Participant engaged with content" },
  { label: "Candid — Q&A or discussion moment", note: "Natural interaction" },
  { label: "Candid — notes or worksheet close-up", note: "In-session working material" },
  { label: "Group photo", note: "Trainer and all participants" },
];
