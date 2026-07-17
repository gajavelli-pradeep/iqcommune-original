/**
 * fetch + JSON parsing that survives non-JSON responses.
 *
 * A failing response is NOT guaranteed to be JSON. Next.js error pages, Vercel
 * 502/504s, proxy timeouts and auth redirects all return `text/html`. Calling
 * `res.json()` on those throws
 *
 *   Unexpected token '<', "<!DOCTYPE "... is not valid JSON
 *
 * which then surfaces to the user as-is — a parser complaint that describes
 * neither what failed nor what to do. Parse defensively and report the status.
 */

export class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/** Human-readable fallback for a response that carried no usable `error` field. */
function statusMessage(status: number): string {
  if (status === 401) return "Your session has expired — please sign in again.";
  if (status === 403) return "You don't have permission to view this.";
  if (status === 404) return "Not found — it may have been deleted.";
  if (status === 429) return "Too many requests — please wait a moment and retry.";
  if (status >= 500) return `The server had a problem (${status}). Please try again.`;
  return `Request failed (${status}). Please try again.`;
}

/** Parse a JSON body, or return undefined when the payload isn't JSON. */
async function readJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * GET/POST JSON and return the parsed body.
 *
 * Throws HttpError with a message safe to show a user:
 *  - the server's own `{ error }` when it sent one,
 *  - otherwise a status-derived message (never a JSON parser error).
 */
export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    // fetch only rejects on network failure, never on a 4xx/5xx.
    throw new HttpError("Network error — please check your connection and try again.", 0);
  }

  const body = await readJsonSafe(res);
  const serverError =
    body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : undefined;

  if (!res.ok) throw new HttpError(serverError ?? statusMessage(res.status), res.status);

  // 2xx that isn't JSON is still a failure for callers that need a payload.
  if (body === undefined) {
    throw new HttpError(`The server sent an unexpected response (${res.status}). Please try again.`, res.status);
  }

  return body as T;
}
