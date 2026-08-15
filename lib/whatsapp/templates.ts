import { buildLink } from "@/lib/email/links";

/**
 * The WhatsApp half of the console-generated messages, as the delivered
 * document writes them.
 *
 * Deliberately a separate register from `lib/email/templates.ts` and not a
 * transformation of it: the document keeps these informal — contractions,
 * "Quick note", an exclamation mark — because that is what the channel reads
 * like, and signs them "— iqcommune team" rather than the email's two-line
 * block. A shared body with a different signature would lose that.
 *
 * There is still no WhatsApp delivery integration. These are composed into the
 * console draft dialog's WhatsApp tab, where an admin copies the text and sends
 * it from their own handset — the same exit the V7 prototype gave it. Sending
 * through the WhatsApp Business API additionally needs a provider, a template
 * name, category and language per message, and variables numbered rather than
 * named; none of that is decided, and none of it changes this copy.
 *
 * `sessionRequestCancelled` has no entry: the document supplies no WhatsApp
 * body for it, so the dialog offers no WhatsApp tab on that send rather than
 * inventing one.
 */

/** Every body closes the same way — the informal counterpart of `SIGN_OFF`. */
const SIGN_OFF = "— iqcommune team";

/**
 * "Hi Asha, this is iqcommune." — every body opens with it.
 *
 * The name is optional because the console invite has only an address and a
 * role to work from, and `excited` carries the two openers the document ends
 * with "!" instead of "." rather than having those two write their own line.
 */
function greeting(firstName?: string, excited = false): string {
  const who = firstName ? `Hi ${firstName}, ` : "Hi, ";
  return `${who}this is iqcommune${excited ? "!" : "."}`;
}

/**
 * A body: blocks separated by a blank line, the sign-off always last.
 *
 * A block is one paragraph, a bare link, or several lines that belong together
 * (the request echo in `sessionRequestFollowUp`), so a caller that wants lines
 * kept adjacent joins them itself with a single newline.
 */
function message(...blocks: string[]): string {
  return [...blocks, SIGN_OFF].join("\n\n");
}

/** What a composed WhatsApp message carries. No subject: the channel has none. */
export interface WhatsAppMessage {
  /** Matches the email template id, so the pair can be traced as one send. */
  template: string;
  body: string;
}

export function onboardingLink(
  firstName: string,
  agreementId: string,
  practitionerReference: string,
): WhatsAppMessage {
  return {
    template: "onboarding-link",
    body: message(
      // The only body whose first sentence runs on from the greeting.
      `${greeting(firstName)} Your empanelment agreement (Ref. ${practitionerReference}) is ready — please review and sign online here:`,
      buildLink("onboarding", agreementId),
    ),
  };
}

export function practitionerWelcome(firstName: string): WhatsAppMessage {
  return {
    template: "practitioner-welcome",
    body: message(
      `${greeting(firstName, true)} 🎉`,
      "Great news — you're officially empanelled with us.",
      "As matching session requests come in, we'll reach out to check your availability before confirming anything. No pressure, no minimum commitment.",
      "Welcome aboard — glad to have you with us!",
    ),
  };
}

export function applicationRejected(firstName: string): WhatsAppMessage {
  return {
    template: "application-rejected",
    body: message(
      greeting(firstName),
      "Thank you for applying to join us as a practitioner. After review, we won't be moving forward at this time — this isn't a reflection of your expertise, we're often working within a specific mix of modules and cities at any given time.",
      "We'd welcome you applying again in future. Thanks again for your interest!",
    ),
  };
}

export function practitionerDeactivated(firstName: string): WhatsAppMessage {
  return {
    template: "practitioner-deactivated",
    body: message(
      greeting(firstName),
      "Quick note — we've paused matching you to new sessions for now. This doesn't affect any agreement already in place. Let us know if you'd like to be reactivated in future!",
    ),
  };
}

export function consentRequest(
  firstName: string,
  assignmentId: string,
  session: { module: string; confirmationReference: string },
): WhatsAppMessage {
  return {
    template: "consent-request",
    body: message(
      greeting(firstName),
      `Here's the consent link for your session (${session.module}, ref. ${session.confirmationReference}) — please review the details and payout, then confirm:`,
      buildLink("consent", assignmentId),
    ),
  };
}

export function photoReminder(firstName: string, assignmentId: string, module: string): WhatsAppMessage {
  return {
    template: "photo-reminder",
    body: message(
      greeting(firstName),
      `Quick heads-up ahead of your session on ${module} — if you get a chance, we'd love a few photos from the room for our website. Once you have them, use this link to send them over:`,
      buildLink("photos", assignmentId),
      "Good luck with it!",
    ),
  };
}

/** The request echo, as WhatsApp writes it — a middot rather than the email's comma. */
export function sessionRequestFollowUp(
  firstName: string,
  request: { topic: string; audience: string; groupSize?: string; preferredWindow?: string },
): WhatsAppMessage {
  // Kept adjacent, not one block each: they read as a short summary, and a
  // blank line between two labelled values makes them look like paragraphs.
  // A value we do not hold is dropped rather than shown empty, exactly as the
  // email echo does.
  const echo = [
    request.groupSize
      ? `Your group: ${request.groupSize} participants · ${request.audience}`
      : `Your group: ${request.audience}`,
    ...(request.preferredWindow ? [`Preferred: ${request.preferredWindow}`] : []),
  ].join("\n");

  return {
    template: "session-request-follow-up",
    body: message(
      greeting(firstName, true),
      // Asterisks are WhatsApp's bold, not a typo.
      `Thanks for your training request on *${request.topic}*. We've reviewed it and are aligning a practitioner for your group.`,
      "We'll confirm session details (date, time, venue) within 2–3 working days.",
      echo,
      "Feel free to reply here if anything changes!",
    ),
  };
}

export function sessionCancelled(
  firstName: string,
  module: string,
  sessionReference: string,
): WhatsAppMessage {
  return {
    template: "session-cancelled",
    body: message(
      greeting(firstName),
      `Just letting you know your session on ${module} (ref. ${sessionReference}) has been cancelled. Reply here if you'd like to reschedule or have any questions.`,
    ),
  };
}

export function ratingRequest(
  firstName: string,
  assignmentId: string,
  session: { module: string; practitionerName: string },
): WhatsAppMessage {
  return {
    template: "rating-request",
    body: message(
      greeting(firstName),
      `Hope the session on ${session.module} with ${session.practitionerName} went well! Could you share a quick rating for the practitioner? Takes less than a minute:`,
      buildLink("rate", assignmentId),
      "Thanks again for having us!",
    ),
  };
}

export function adminInvite(inviteId: string, roleLabel: string): WhatsAppMessage {
  // Same article agreement as the email: "as a Global Admin", "as an Admin".
  const article = /^[aeio]/i.test(roleLabel) ? "an" : "a";
  return {
    template: "admin-invite",
    body: message(
      // No name — an invitation stores an address and a role, nothing else.
      greeting(),
      `You've been invited to the admin console as ${article} ${roleLabel}. Set up your account here:`,
      buildLink("invite", inviteId),
    ),
  };
}
