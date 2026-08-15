/**
 * Turning a stored phone number into a WhatsApp link.
 *
 * `wa.me` wants digits only, in full international form: no plus, no spaces, no
 * dashes. What the apply form collects is whatever the applicant typed, which
 * in practice is a bare ten-digit Indian mobile — no country code, sometimes
 * spaced or hyphenated, sometimes with a `+91` in front.
 *
 * Normalising is therefore not tidying: a link built from the raw value opens
 * WhatsApp on a contact that does not exist, and the admin finds out by having
 * nothing happen.
 */

/** India. The only country this platform runs sessions in. */
const DEFAULT_DIALLING_CODE = "91";
const INDIAN_MOBILE_DIGITS = 10;

/**
 * The number as `wa.me` wants it, or null when there is nothing usable.
 *
 * Null rather than a best guess: a wrong number is worse than an absent button,
 * because the admin cannot tell it went to the wrong person until someone
 * replies who should not have been messaged.
 */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  // A bare mobile gets the country code it was always assumed to have.
  if (digits.length === INDIAN_MOBILE_DIGITS) return `${DEFAULT_DIALLING_CODE}${digits}`;

  // Anything longer is treated as already carrying one — including a leading
  // zero trunk prefix, which is dropped, since `wa.me` reads it as part of the
  // country code and dials nowhere.
  if (digits.length > INDIAN_MOBILE_DIGITS) {
    const trimmed = digits.replace(/^0+/, "");
    return trimmed.length >= INDIAN_MOBILE_DIGITS ? trimmed : null;
  }

  // Shorter than a mobile: a landline fragment or a typo. Neither reaches
  // anyone on WhatsApp.
  return null;
}

/**
 * The link that opens WhatsApp on that number with the message ready to send.
 *
 * `wa.me` hands off to the desktop app where one is installed and to WhatsApp
 * Web where it is not, so the admin does not have to care which they have. The
 * message is prefilled and not sent — pressing send stays a human act, which is
 * the whole reason this is a link rather than an API call.
 */
export function waLink(phone: string | null | undefined, message: string): string | null {
  const number = waNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
