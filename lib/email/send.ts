import { log } from "@/lib/logger";

import {
  classifyStatus,
  classifyThrown,
  isSendableAddress,
  result,
  type EmailResult,
} from "./outcome";

/**
 * Outbound email — F2.
 *
 * **Dry run unless explicitly enabled.** Nothing is dispatched unless
 * `EMAIL_DELIVERY=live`. A development database full of test rows will happily
 * generate mail to real addresses, and the previous system's practitioners are
 * real people; a misfire is not recoverable by deleting a row. In dry-run mode
 * the rendered message is logged instead, which is also what makes the link in
 * it checkable without sending anything.
 *
 * Delivery is best-effort by design: a request that was written must not fail
 * because a mail provider was slow. Callers pass a trace id so a missing email
 * can be traced back to the request that should have sent it.
 *
 * Every attempt ends in a named `EmailResult` and a row in `email_log` —
 * including the ones that never reach Brevo, which are precisely the failures
 * Brevo's own dashboard cannot show you. Transient outcomes are retried with
 * backoff; permanent ones are not, because re-posting a malformed message or a
 * bad credential fails identically forever and spends the rate limit a real
 * transient failure will need.
 */

/**
 * Which mailbox a message goes out from (client decision, 2026-07-23).
 *
 * Practitioner-pipeline mail comes from practitioner@iqcommune.com and
 * session mail from session@iqcommune.com, so a reply lands with the person
 * whose job it is rather than in one shared inbox. `platform` is everything
 * that is neither — console team invites — and uses the default sender.
 *
 * The stream is declared on the TEMPLATE, not chosen at the call site: which
 * mailbox an email belongs to is a property of the email, and a caller picking
 * it is a caller that can pick wrong.
 */
export type EmailStream = "practitioner" | "session" | "platform";

export interface EmailMessage {
  to: string;
  subject: string;
  /** Plain text. Always sent, even when `html` is also set — some clients
   *  and previews render text-only. */
  body: string;
  /** Optional rich version, e.g. a styled button in place of a bare link.
   *  Templates that need one build it with `lib/email/html.ts`'s escaping. */
  html?: string;
  /** Defaults to `platform` — the shared sender — when a template omits it. */
  stream?: EmailStream;
  /**
   * Stable slug identifying which template this is, e.g. `practitioner-welcome`.
   * It is what makes the log answerable ("did the onboarding link go out?") and
   * what the duplicate check keys on, so it is required rather than derived — a
   * name inferred from a subject line changes the moment the copy does.
   */
  template: string;
}

/** The env var holding each stream's From address. */
const SENDER_ENV: Record<EmailStream, string> = {
  practitioner: "BREVO_SENDER_PRACTITIONER",
  session: "BREVO_SENDER_SESSION",
  platform: "BREVO_SENDER_EMAIL",
};

/**
 * The From address for a stream, falling back to the shared sender.
 *
 * The fallback is the point, not a safety net. The dedicated mailboxes arrive
 * with Google Workspace and then have to be verified with Brevo before Brevo
 * will send as them — sending from an unverified address is rejected outright.
 * So the app ships ready: set the variable when the mailbox is live and mail
 * moves to it with no deploy; leave it unset and everything keeps working from
 * the existing sender.
 */
export function senderFor(stream: EmailStream = "platform"): string | undefined {
  return process.env[SENDER_ENV[stream]] || process.env.BREVO_SENDER_EMAIL;
}

/**
 * Where replies to each stream belong — the other half of the routing above.
 *
 * `senderFor` only decides which mailbox mail leaves FROM, and it falls back to
 * the shared sender until a dedicated mailbox is verified. With no Reply-To,
 * that fallback silently routes the return trip too: every reply to a session
 * confirmation lands in the shared inbox — the human one printed on the site —
 * burying real enquiries under answers to automated mail. That is the stream
 * rule broken in the direction nobody inspects, because nothing about the
 * outgoing message looks wrong.
 *
 * Constants rather than env vars, deliberately. Brevo validates the *sender*
 * and never Reply-To, so this header carries no verification dependency and can
 * be correct from the first deploy — through the whole window where
 * `BREVO_SENDER_SESSION` cannot safely be set yet. Deriving it from that same
 * variable would be worse than useless: the variable is what makes `senderFor`
 * return the dedicated address, so the two could never disagree, and a Reply-To
 * equal to the From routes nothing.
 */
const REPLY_TO: Record<EmailStream, string | undefined> = {
  practitioner: "practitioner@iqcommune.com",
  session: "session@iqcommune.com",
  // Platform mail already leaves from the shared inbox replies should reach.
  platform: undefined,
};

/** The stream's reply mailbox, omitted once it is already the From address. */
export function replyToFor(stream: EmailStream = "platform"): string | undefined {
  const address = REPLY_TO[stream];
  return address && address !== senderFor(stream) ? address : undefined;
}

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const TIMEOUT_MS = 8000;
/** Attempts after the first. Three calls is the most a request should wait through. */
const MAX_RETRIES = 2;
const BACKOFF_MS = [400, 1200];

/**
 * Seams so the sender can be exercised without a network or a database. The
 * defaults are the real ones; tests pass fakes.
 */
export interface SendDeps {
  fetch: typeof globalThis.fetch;
  sleep: (ms: number) => Promise<void>;
  alreadySent: (traceId: string, template: string, recipient: string) => Promise<boolean>;
  record: (attempt: {
    traceId: string;
    template: string;
    recipient: string;
    stream: string;
    result: EmailResult;
  }) => Promise<void>;
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function defaultDeps(): Promise<SendDeps> {
  // Imported lazily so this module stays loadable from a unit test, which
  // cannot pull in `server-only`.
  const { alreadySent, recordEmailAttempt } = await import("@/services/email-log");
  return { fetch: globalThis.fetch, sleep: realSleep, alreadySent, record: recordEmailAttempt };
}

/** One call to Brevo. Never throws — every failure comes back as a result. */
async function attempt(
  deps: SendDeps,
  message: EmailMessage,
  sender: string,
  replyTo: string | undefined,
  apiKey: string,
): Promise<EmailResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await deps.fetch(ENDPOINT, {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { email: sender, name: process.env.BREVO_SENDER_NAME || "iqcommune" },
        to: [{ email: message.to }],
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
        subject: message.subject,
        textContent: message.body,
        ...(message.html ? { htmlContent: message.html } : {}),
      }),
      signal: controller.signal,
    });

    const status = classifyStatus(response.status);
    if (status === "sent" || status === "queued") {
      const payload = (await response.json().catch(() => ({}))) as { messageId?: string };
      return result(status, { providerMessageId: payload.messageId ?? null });
    }

    // Brevo describes its own refusals, and that text is the difference between
    // "rejected" and "rejected because the sender is unverified".
    const detail = await response.text().catch(() => "");
    return result(status, {
      errorCode: String(response.status),
      errorMessage: detail.slice(0, 500) || null,
    });
  } catch (cause) {
    return result(classifyThrown(cause), {
      errorCode: cause instanceof Error ? cause.name : "UnknownError",
      errorMessage: String(cause).slice(0, 500),
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function sendEmail(
  traceId: string,
  message: EmailMessage,
  overrides?: Partial<SendDeps>,
): Promise<EmailResult> {
  const deps = { ...(await defaultDeps()), ...overrides };
  const stream = message.stream ?? "platform";
  const finish = async (outcome: EmailResult) => {
    await deps.record({
      traceId,
      template: message.template,
      recipient: message.to,
      stream,
      result: outcome,
    });
    return outcome;
  };

  // 1. The message itself, before anything external is consulted. An address
  //    with a newline in it is header injection, not a typo.
  if (!isSendableAddress(message.to)) {
    log.warn(traceId, "email not sent — recipient is not a sendable address", {
      template: message.template,
      stream,
    });
    return finish(result("invalid-recipient", { errorCode: "INVALID_RECIPIENT" }));
  }

  const apiKey = process.env.BREVO_API_KEY;
  const sender = senderFor(message.stream);
  const replyTo = replyToFor(message.stream);

  // 2. Dry run, checked before configuration: a developer with no Brevo key
  //    should see "not sent — dry run", which is true, rather than a
  //    misconfiguration they do not have.
  if (process.env.EMAIL_DELIVERY !== "live") {
    // The rendered body + recipient are what make the link checkable without
    // sending — but only log them OUTSIDE production (audit M9). In production
    // this branch means EMAIL_DELIVERY was left unset by mistake, and the logger
    // contract forbids spilling addresses/names into those logs.
    const inspectable = process.env.NODE_ENV !== "production";
    log.info(traceId, "email not sent — dry run", {
      subject: message.subject,
      template: message.template,
      // The stream and resolved sender are logged even in production: they
      // carry no personal data, and they are the only way to confirm the
      // routing is right before the mailboxes are live.
      stream,
      from: sender ?? "(no sender configured)",
      // Carries no personal data either, and it is the half of the routing that
      // is live before the mailboxes are — so it is the half worth checking.
      replyTo: replyTo ?? "(same as from)",
      hasHtml: Boolean(message.html),
      ...(inspectable ? { to: message.to, body: message.body } : {}),
    });
    return finish(result("dry-run"));
  }

  if (!apiKey || !sender) {
    log.error(traceId, "email not sent — BREVO_API_KEY or a sender address is missing", {
      template: message.template,
      stream,
      missing: !apiKey ? "BREVO_API_KEY" : SENDER_ENV[stream],
    });
    return finish(
      result("not-configured", {
        errorCode: "NOT_CONFIGURED",
        errorMessage: !apiKey ? "BREVO_API_KEY is unset" : "no sender address for this stream",
      }),
    );
  }

  // 3. Already done? Only a *successful* recent attempt counts — a previous
  //    failure is exactly the case where a second try is wanted.
  if (await deps.alreadySent(traceId, message.template, message.to)) {
    log.info(traceId, "email skipped — an identical one was sent recently", {
      template: message.template,
      stream,
    });
    return finish(result("duplicate"));
  }

  // 4. Send, retrying only what a retry could fix.
  let outcome = await attempt(deps, message, sender, replyTo, apiKey);
  let retries = 0;
  while (outcome.retryable && retries < MAX_RETRIES) {
    await deps.sleep(BACKOFF_MS[retries] ?? BACKOFF_MS[BACKOFF_MS.length - 1]);
    retries += 1;
    log.warn(traceId, "email attempt failed, retrying", {
      template: message.template,
      status: outcome.status,
      attempt: retries + 1,
    });
    outcome = await attempt(deps, message, sender, replyTo, apiKey);
  }
  outcome = { ...outcome, retryCount: retries };

  if (outcome.ok) {
    // A 201 means accepted for delivery, not delivered. Anything downstream
    // that treats this as proof the person read it will be wrong.
    log.info(traceId, "email accepted by provider", {
      template: message.template,
      status: outcome.status,
      retries,
    });
  } else {
    log.error(traceId, "email failed", {
      template: message.template,
      status: outcome.status,
      code: outcome.errorCode,
      detail: outcome.errorMessage,
      retries,
    });
  }

  return finish(outcome);
}
