/**
 * Escaping shared by the HTML email bodies (plain-text templates need none of
 * this). A first name is free-form user input (audit: application/session
 * forms) — embedding it in HTML unescaped is a stored-XSS vector the moment
 * any client renders the message as markup.
 */

/** HTML-encode characters meaningful inside element content or attribute values. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * A URL safe to place in an href — blocks `javascript:`/`data:` URIs that
 * `escapeHtml` alone would not catch, since neither contains an HTML-special
 * character for it to encode.
 */
export function safeHref(url: string): string {
  try {
    const { protocol } = new URL(url);
    if (protocol !== "https:" && protocol !== "http:") return "#";
  } catch {
    return "#";
  }
  return escapeHtml(url);
}
