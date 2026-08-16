/**
 * Reading a failed response without assuming it is ours.
 *
 * Both photo forms did `await response.json()` unguarded and wrapped the whole
 * submit in one `catch`, so three unrelated things arrived as the same
 * sentence — "we could not reach the server":
 *
 *   - the request never left (a real network failure, the only one that
 *     sentence describes)
 *   - the request was refused before it reached the route, by the platform
 *     rather than the app, which answers with HTML — and `json()` throws on it
 *   - the route answered fine and the success body failed to parse
 *
 * The middle one is the common case and the misleading one: a body over the
 * serverless limit is cut off upstream, and the practitioner is told to check a
 * connection that is working. Nothing in the app ever sees that request.
 */

/** The envelope every route of ours returns on failure. */
interface ApiFailureBody {
  error?: { message?: string; fields?: Record<string, string> };
}

export interface UploadFailure {
  message: string;
  fields?: Record<string, string>;
}

/**
 * What a non-OK response actually means, in words worth showing.
 *
 * Never throws: a response that cannot be parsed is the case this exists for,
 * so falling over while explaining it would be its own joke.
 */
export async function readFailure(response: Response, tooLarge: string): Promise<UploadFailure> {
  const body = await response
    .clone()
    .json()
    .then((value) => value as ApiFailureBody)
    .catch(() => null);

  const message = body?.error?.message;
  if (message) return { message, fields: body?.error?.fields };

  // No usable body: the status is all there is, and it is enough to say
  // something true rather than something generic.
  switch (response.status) {
    case 413:
      return { message: tooLarge };
    case 408:
    case 504:
      return {
        message: "The upload timed out before it finished. A smaller batch usually gets through.",
      };
    case 502:
    case 503:
      return { message: "The server is not accepting uploads at the moment. Please try again shortly." };
    default:
      return {
        message: `The upload was refused (error ${response.status}). Please try again, or reply to the email that brought you here if it keeps happening.`,
      };
  }
}

/**
 * A request that never got an answer.
 *
 * Size is offered as the likely cause when the payload was large, because a
 * body refused mid-flight looks exactly like a dropped connection from here,
 * and "check your connection" sends someone to fix the one thing that is
 * working.
 */
export function networkFailure(totalBytes: number, limitBytes: number): string {
  if (totalBytes > limitBytes / 2) {
    return "The upload did not complete — most likely the photos were too large to send in one go. Try fewer at a time.";
  }
  return "We could not reach the server. Check your connection and try again.";
}
