/**
 * The words shown when a public form cannot be saved and the drafted `mailto:`
 * is offered instead — client copy, MOM 2026-08-10.
 *
 * One module rather than the same three sentences typed into both dialogs. The
 * session request and the practitioner application show identical wording and
 * differ only in which inbox they name, so a copy change that reached one and
 * not the other would be invisible until someone hit the rarer of the two
 * failures.
 *
 * This copy is used ONLY where the escape hatch appears — a genuine server
 * fault, or a server that could not be reached. Validation and rate-limit
 * failures keep the message the API sent, because those tell the person what to
 * actually fix and this one does not.
 */
export const SUBMIT_FAILURE = {
  /** Replaces the API's message in the two states that earn the offer. */
  message: "Apologies! Guess something went wrong. Please try again in a few minutes.",

  /**
   * Names the inbox in the sentence, not only in the button. A label carrying
   * the address wraps to two lines at 320px, and the visible text is what makes
   * right-click → copy work for anyone with no mail client registered.
   */
  offer: (address: string) =>
    `Or click below to open a pre-drafted email and send it to ${address}`,

  /** The reassurance: nothing they typed has been lost. */
  reassurance:
    "Not to worry. Everything you have entered has been captured in the email. You just need to click 'send'.",

  /** The anchor's label. */
  action: "Open pre-filled email",
} as const;
