// Shared shot list for the post-session photo guide. Rendered on the public
// submission page (PhotoSubmissionForm) and, per op-procedure Part 4 steps 22-24,
// in the admin Consent tab's photo-guide sub-section (download + draft email).
export const PHOTO_SHOT_LIST = [
  { title: "Back of room — trainer in focus",       hint: "Full audience visible in background" },
  { title: "From trainer's position",                hint: "Audience facing the screen" },
  { title: "Front-left corner",                      hint: "Wide view of the full room" },
  { title: "Front-right corner",                     hint: "Trainer and session materials visible" },
  { title: "Candid — working through numbers",       hint: "Participant engaged with content" },
  { title: "Candid — Q&A or discussion moment",      hint: "Natural interaction" },
  { title: "Candid — notes or worksheet close-up",   hint: "In-session working material" },
  { title: "Group photo",                            hint: "Trainer and all participants" },
] as const;

// Plain-text guide body reused by the "Draft email" action.
export function photoGuideEmailBody(practitionerName: string): string {
  const shots = PHOTO_SHOT_LIST.map((s, i) => `${i + 1}. ${s.title} — ${s.hint}`).join("\n");
  return (
    `Dear ${practitionerName || "Practitioner"},\n\n` +
    `Ahead of your session, here is the photo guide — please try to capture these eight shots:\n\n` +
    `${shots}\n\n` +
    `You can submit them all from your phone via the link we'll send once the session is complete.\n\n` +
    `Warm regards,\nThe iqcommune Team`
  );
}

export function photoGuideWaBody(practitionerName: string): string {
  const shots = PHOTO_SHOT_LIST.map((s, i) => `${i + 1}. ${s.title}`).join("\n");
  return (
    `Hi ${practitionerName || ""}! 👋 Ahead of your session, here's the photo guide — please try to capture these 8 shots:\n\n` +
    `${shots}\n\nWe'll send an upload link once the session is done.`
  );
}
