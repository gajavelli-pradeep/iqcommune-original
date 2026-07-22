import { after } from "next/server";

import { sendEmail, type EmailMessage } from "./send";

/**
 * The only email primitive a route may call (audit C2, Wave 0A).
 *
 * `sendEmail` must never be invoked as a bare `void sendEmail(...)` from a
 * handler: a floating promise in a serverless function can be frozen the moment
 * the response is sent, dropping the send *and* its own success/failure log
 * lines. `after()` registers the work to run after the response flushes, on an
 * instance the platform keeps alive for exactly this. Routes import
 * `dispatchEmail`; they do not reach the raw sender.
 */
export function dispatchEmail(traceId: string, message: EmailMessage): void {
  after(() => sendEmail(traceId, message));
}
