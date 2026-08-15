"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { controlClass, selectClass } from "@/components/ui/control";
import { useDeferredSend } from "@/hooks/useDeferredSend";

import {
  generateConfirmation,
  overrideConfirmationField,
  sendConsentRequest,
  sendPhotoGuide,
  setSessionStatus,
  type ConfirmationField,
  type SessionStatusResult,
} from "../actions";
import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { DownloadLink } from "../DownloadLink";
import { DraftModal } from "../DraftModal";
import type { DraftOverride } from "../draft-kinds";
import { PendingSendToast } from "../PendingSendToast";
import { RowAction } from "../RowAction";
import { CONSENT_STATUS, StatusPill } from "../StatusPill";
import { consentStage } from "@/lib/consent-stage";
import { can, type ConsoleRole } from "../roles";
import type { ConfirmableSession, ConsentRow } from "@/services/console";

/**
 * Session Consent — "the critical junction of the whole loop", and the only
 * console tab that is a workflow rather than a table.
 *
 * Two parts now, where V7 has three. Part 1 creates a confirmation, which is
 * real data entry and keeps its form. Everything after that — ask for consent,
 * chase it, confirm the session, send the photo guide — is one sequence a
 * confirmation moves through, and the table is where it lives.
 *
 * V7's Part 3 was a second picker asking an admin to find a session the table
 * on the same screen was already showing them, and it could only be reached by
 * knowing it was there. Its two actions moved onto the row: the send appears at
 * the stage where it is the next thing to do, the download wherever the guide
 * exists. Gating is unchanged and now structural — the guide cannot be offered
 * before consent because that is a later stage than the one the row is at.
 */

const CARD = "rounded-[10px] border border-border-strong bg-surface p-5";
const PART = "mb-1.5 text-2xs font-bold uppercase tracking-caps text-gold-dark";
const LABEL = "mb-[5px] block text-xs font-semibold text-ink";

/** V7's abbreviated month names on the "Issued in" filter. */
const MONTHS_ISSUED = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * The two follow-on actions before a confirmation exists — V7's `.btn-ghost`
 * at `opacity:.45`.
 *
 * Rendered as spans rather than disabled buttons, and `aria-hidden`: they are
 * placeholders showing what will become available, and a disabled control that
 * can never be reached by keyboard is noise to a screen reader. The line beside
 * them says what to do instead, which is the part worth announcing.
 */
const DIMMED_PILL =
  "inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted";
/** The confirmation form's own controls — V7's tight white selects. */
const FIELD = controlClass({ tone: "compact" });

/**
 * The session picker is NOT on the compact family the fields beside it use.
 *
 * V7 gives it `class="status-sel"` (the inline family) with a 480px cap, while
 * the hour/minute/meridiem/duration selects under it are the tight compact ones
 * — a deliberate split, since the picker carries a full session description and
 * the others carry two characters each. Sharing one constant between them made
 * the picker 6px-cornered and 6px-padded against V7's 8/12.
 */
const PICKER = selectClass({ tone: "inline" });

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

const inr = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

/** "02", "30", "PM" → "14:30" — what Postgres `time` wants. */
function to24Hour(hour: string, minute: string, meridiem: string): string {
  const value = meridiem === "PM" ? (Number(hour) % 12) + 12 : Number(hour) % 12;
  return `${String(value).padStart(2, "0")}:${minute}`;
}

/**
 * What the pickers should show before the admin touches them: the session's own
 * values if it has them, and otherwise nothing at all.
 *
 * These three are labelled "(admin enters)" and used to open at 10:00 AM and 3
 * hours — values no admin had chosen, on a document a practitioner signs. An
 * admin could generate without touching the form and send a practitioner a
 * start time nobody agreed to, which reads as a decision precisely because it
 * is printed on a signed confirmation. An empty picker cannot be mistaken for
 * one; the guard in `confirmation-fields` then refuses to generate until they
 * are filled.
 *
 * The inheritance stays, because it is not an invention: a session that really
 * does hold 2:00 PM should show 2:00 PM. Today nothing does — Part 1 lists only
 * sessions never confirmed, and these two columns are written by the generate
 * action alone — so in practice every picker opens blank.
 *
 * Derived at render rather than held in state: state seeded once would keep the
 * first session's time after the admin picks a different session.
 */
export function seedFrom(session: ConfirmableSession | undefined): {
  hour: string;
  minute: string;
  meridiem: string;
  duration: string;
} {
  // Only the two lengths the picker offers. A stored 240 would seed "4", which
  // matches no option — the select falls back to its placeholder and submits
  // Number("") as the duration.
  const stored = session?.durationMinutes ? String(session.durationMinutes / 60) : "";
  const duration = stored === "3" || stored === "6" ? stored : "";

  // Postgres hands back "14:30:00"; anything else is not a time we can seed from.
  const match = session?.startTime?.match(/^(\d{2}):(\d{2})/);
  if (!match) return { hour: "", minute: "", meridiem: "", duration };

  const hour24 = Number(match[1]);
  return {
    hour: String(hour24 % 12 === 0 ? 12 : hour24 % 12).padStart(2, "0"),
    minute: match[2],
    meridiem: hour24 >= 12 ? "PM" : "AM",
    duration,
  };
}

/**
 * One auto-populated field, with V7's Global-Admin correction pencil.
 *
 * `field` omitted means nothing may correct this by hand — the same convention
 * `KvRow` uses on the practitioner card. V7 instead renders a pencil on every
 * row and raises "this field is computed" when two of them are clicked; an
 * absent pencil says that before the click rather than after it.
 */
function AutoField({
  label,
  value,
  field,
  assignmentId,
  canOverride,
}: {
  label: string;
  value: string;
  field?: ConfirmationField;
  /** Both omitted where the field is display-only, as in Part 3's summary. */
  assignmentId?: string;
  canOverride?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, start] = useTransition();

  const save = () => {
    start(async () => {
      await overrideConfirmationField(assignmentId!, field!, draft);
      setEditing(false);
    });
  };

  return (
    <div>
      <div className="flex items-center gap-1 text-3xs uppercase tracking-caps text-ink-faint">
        {label}
        {field && canOverride && !editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            title="Global Admin: correct the source record"
            // 9px pencil as V7 draws it, with the pseudo-element growing the
            // tap target to 44×44 on touch without changing the visual.
            className="relative inline-flex items-center rounded px-1 py-0.5 text-gold-dark transition-colors hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold [@media(any-pointer:coarse)]:after:absolute [@media(any-pointer:coarse)]:after:left-1/2 [@media(any-pointer:coarse)]:after:top-1/2 [@media(any-pointer:coarse)]:after:h-11 [@media(any-pointer:coarse)]:after:w-11 [@media(any-pointer:coarse)]:after:-translate-x-1/2 [@media(any-pointer:coarse)]:after:-translate-y-1/2 [@media(any-pointer:coarse)]:after:content-['']"
          >
            <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            <span className="sr-only">Correct {label}</span>
          </button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-px flex flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor={`${assignmentId}-${field}`}>
            {label}
          </label>
          <input
            id={`${assignmentId}-${field}`}
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") setEditing(false);
            }}
            className={controlClass({ tone: "compact", className: "min-w-0 flex-1" })}
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-md px-2 py-1 text-xs font-semibold text-gold-dark underline underline-offset-2 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md px-2 py-1 text-xs text-ink-faint underline underline-offset-2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="mt-px font-medium text-ink">{value}</div>
      )}
    </div>
  );
}

/**
 * What the select may show, and what it may offer.
 *
 * They differ on purpose. Confirmed is an outcome of consent coming back, not
 * something an admin asserts — the agreement says a session is not confirmed
 * until the practitioner consents, and offering it as a dropdown choice invited
 * exactly that contradiction. It reaches the row through the Next step button,
 * which appears only once consent is in.
 *
 * Cancelled stays, because cancelling is a decision rather than an outcome and
 * this is where V7 puts it. Pending stays as the way back from a cancellation.
 *
 * `setSessionStatus` refuses an unconsented Confirmed regardless of who asks, so
 * removing the option is the affordance and the server is the rule.
 */
const SESSION_STATUS_VALUES = ["Pending", "Confirmed", "Cancelled"];
const SESSION_STATUS_CHOICES = ["Pending", "Cancelled"];

/**
 * What the select may show, which is not the same as what it may be set to.
 *
 * A select cannot display a value it has no option for. Confirmed was withheld
 * from the option list — correctly, since confirming is the Next step button's
 * job and only once consent is in — but that left the browser resolving a
 * confirmed row to the first option it did have. The cell read "Pending" for a
 * session that was confirmed: not a blank to puzzle over but a definite, wrong
 * answer, on the one control an admin uses to see where a session stands.
 *
 * Offered only when it is already the answer, and disabled, so it stays a thing
 * being displayed rather than becoming a thing to pick. Moving the row to
 * Pending drops it again, which is right — Confirmed is an outcome, and the way
 * back to it is consent, not this control.
 */
const statusOptions = (status: string) =>
  status === "Confirmed" ? SESSION_STATUS_VALUES : SESSION_STATUS_CHOICES;

/** Quiet text for a row with nothing to do — a stage, not an absence of one. */
const SETTLED = "text-3xs text-ink-faint";

/**
 * The shot list as a PDF, for a practitioner who wants it outside the email.
 *
 * Carried on the row because Part 3 used to own it, and Part 3 is gone: its
 * picker asked an admin to find a session the table was already showing them.
 */
function GuideDownload({ row }: { row: ConsentRow }) {
  return (
    <DownloadLink
      href={`/api/consents/${row.id}/pdf?doc=photo-guide`}
      label="Download photo guide (PDF)"
      title={`Download the photo guide for ${row.session}`}
    />
  );
}

/**
 * The single action for wherever this confirmation has reached.
 *
 * Every branch is one stage of `ConsentStage`, and the switch is exhaustive on
 * purpose: a new stage should fail to compile here rather than render an empty
 * cell that reads as "nothing to do" when it means "nobody taught this row what
 * to do".
 */
function NextStep({ row }: { row: ConsentRow }) {
  const stage = consentStage(row);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  switch (stage) {
    case "cancelled":
      return <span className={SETTLED}>No longer in progress</span>;
    case "delivered":
      return <span className={SETTLED}>Delivered</span>;
    case "in-flight":
      // Sent, but the guide stays downloadable: a practitioner who lost the
      // email asks for it, and that is not a reason to send a second one.
      return (
        <div className="flex flex-col items-start gap-1">
          <span className={SETTLED}>Waiting for the session</span>
          <GuideDownload row={row} />
        </div>
      );

    case "confirm":
      // Confirming is offered only here, and only once consent is in. That is
      // the agreement's own precondition — "not confirmed until the
      // Practitioner provides digital consent" — expressed as an action that
      // does not exist yet rather than as a warning after the fact.
      return (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await setSessionStatus(row.sessionId, "Confirmed");
                setError(result.ok ? null : result.message);
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-surface transition-opacity hover:opacity-[0.87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending ? "Confirming…" : "Confirm the session"}
          </button>
          {error ? (
            <p role="alert" className="mt-1 max-w-[170px] text-3xs text-red">
              {error}
            </p>
          ) : null}
        </>
      );

    case "guide":
      return (
        <div className="flex flex-col items-start gap-1">
          <RowAction
            action={sendPhotoGuide.bind(null, row.id)}
            draft={{ kind: "photo-guide", id: row.id }}
            // V7's own labels, kept word for word. Part 3 is gone, but its two
            // controls moved rather than being reinvented — a shorter label
            // would be a second deviation on top of the one already recorded.
            label="Send photo guide email"
            pendingMessage={`Sending the photo guide to ${row.practitioner}…`}
            variant="ghost"
          />
          <GuideDownload row={row} />
        </div>
      );

    case "request":
    case "waiting":
      return (
        // Stacked with a gap, as the "guide" case above already does: two
        // hairline pills are siblings now, and inline they would touch.
        <div className="flex flex-col items-start gap-1">
          {/* How long it has been waiting, which is the only question anyone
              asks of a request that has not come back yet. */}
          {row.requestSentLabel ? (
            <span className="text-3xs text-ink-faint">Sent {row.requestSentLabel}</span>
          ) : null}
          <RowAction
            action={sendConsentRequest.bind(null, row.id)}
            draft={{ kind: "consent-request", id: row.id }}
            label={stage === "waiting" ? "Resend" : "Send consent request"}
            pendingMessage={`Sending the consent request to ${row.practitioner}…`}
            // Both look like the button they are. Resend was the underlined
            // `link` variant, which reads as a footnote next to the pill above
            // it — and it sends a real email to a practitioner, which is not
            // something to make look incidental.
            variant="ghost"
          />
          {/* The offline fallback, in the one place it is ever the answer: the
              email cannot reach them, so the admin sends the confirmation by
              hand. Unsigned by definition — which is why it is here and not
              under a column headed "Download Signed Consent".

              The qualifier is on hover rather than in the pill. This is a table
              cell, and it was carrying more words than the action it labels —
              "Download PDF" is already the whole of what the control does, and
              when it is the right one to reach for is context, not label. Part
              1 keeps it visible: that card has the room, and there the download
              is being offered rather than found. */}
          <DownloadLink
            href={`/api/consents/${row.id}/pdf`}
            label="Download PDF"
            title={`Download ${row.reference} — the fallback, for sending offline`}
          />
        </div>
      );
  }
}

/**
 * Part 2's Session status cell — a control, not a label (V7 `.status-sel
 * .role-edit`).
 *
 * The options are Pending / Confirmed / Cancelled, which is not the same set
 * the Session Details tab offers: this is the issuing view, and cancelling is
 * what happens here when a session falls through. Completed is deliberately
 * absent, so a session already delivered displays as Confirmed — V7 does the
 * same rather than showing a value the select cannot represent.
 */
function SessionStatusSelect({ row }: { row: ConsentRow }) {
  const [status, setStatus] = useState(row.sessionStatus === "Completed" ? "Confirmed" : row.sessionStatus);
  const [notice, setNotice] = useState<{ text: string; failed: boolean } | null>(null);
  const [pending, start] = useTransition();
  const { pending: held, schedule, undo } = useDeferredSend();
  const [drafting, setDrafting] = useState(false);

  /**
   * Reads back what the server actually did.
   *
   * The toast said "Cancelling…" and then stopped, whatever happened next — so
   * a cancellation with nobody to email looked exactly like one that went out.
   * A refusal puts the control back; a warning keeps the change, because the
   * status did move and reverting it would misreport the database.
   */
  const report = (result: SessionStatusResult, previous: string) => {
    if (!result.ok) {
      setStatus(previous);
      setNotice({ text: result.message, failed: true });
    } else {
      setNotice(result.warning ? { text: result.warning, failed: false } : null);
    }
  };

  /**
   * Cancelling emails the client, so it goes through the draft dialog like
   * every other admin-initiated send rather than firing off a `select`.
   *
   * The select keeps showing the old value until the send is actually
   * scheduled. Moving it to "Cancelled" the moment the dialog opens would have
   * the row claim a status it does not have yet, and closing the dialog would
   * leave that claim behind.
   */
  const cancel = (edited: DraftOverride) => {
    setDrafting(false);
    const previous = status;
    setStatus("Cancelled");
    setNotice(null);
    schedule(async () => {
      report(await setSessionStatus(row.sessionId, "Cancelled", edited), previous);
    }, `Cancelling ${row.session}…`);
  };

  return (
    <>
      <label className="sr-only" htmlFor={`${row.id}-session-status`}>
        Session status for {row.session}
      </label>
      <select
        id={`${row.id}-session-status`}
        // Confirmed still DISPLAYS — a confirmed session must read as one — but
        // it is not offered as a choice, so the value list and the option list
        // are deliberately different.
        value={SESSION_STATUS_VALUES.includes(status) ? status : "Pending"}
        disabled={pending || Boolean(held)}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "Cancelled") {
            setDrafting(true);
            return;
          }
          const previous = status;
          setStatus(next);
          setNotice(null);
          start(async () => {
            report(await setSessionStatus(row.sessionId, next), previous);
          });
        }}
        className={selectClass({ tone: "inline", className: "min-w-[110px]" })}
      >
        {statusOptions(status).map((option) => (
          <option key={option} value={option} disabled={option === "Confirmed"}>
            {option}
          </option>
        ))}
      </select>
      {row.sessionStatus === "Completed" ? (
        <span className="mt-0.5 block text-3xs text-ink-faint">Delivered</span>
      ) : null}

      {notice ? (
        <p role="alert" className={`mt-1 max-w-[170px] text-3xs ${notice.failed ? "text-red" : "text-attention"}`}>
          {notice.text}
        </p>
      ) : null}

      {drafting ? (
        <DraftModal
          kind="session-cancellation"
          id={row.sessionId}
          onClose={() => setDrafting(false)}
          onSend={cancel}
        />
      ) : null}

      {held ? (
        <PendingSendToast
          pending={held}
          onUndo={() => {
            undo();
            setStatus(row.sessionStatus === "Completed" ? "Confirmed" : row.sessionStatus);
          }}
        />
      ) : null}
    </>
  );
}

const COLUMNS: ReadonlyArray<ColumnDef<ConsentRow>> = [
  {
    key: "reference",
    header: "Confirmation ref.",
    render: (row) => <span className="font-mono text-xs text-ink-muted">{row.reference}</span>,
  },
  {
    key: "session",
    header: "Session",
    render: (row) => (
      <div>
        <span className="font-medium text-ink">{row.session}</span>
        <div className="text-3xs text-ink-faint">{row.sessionDate}</div>
      </div>
    ),
  },
  { key: "practitioner", header: "Practitioner", render: (row) => row.practitioner },
  {
    key: "grossPayout",
    header: "Gross payout",
    align: "right",
    render: (row) => <span className="font-semibold text-ink">{row.grossPayout}</span>,
  },
  {
    key: "consentStatus",
    header: "Consent status",
    render: (row) => (
      <div>
        <StatusPill {...CONSENT_STATUS[row.status]} />
        {row.status === "Received" ? (
          <div className="mt-0.5 text-3xs text-ink-faint">{row.recordedOn}</div>
        ) : null}
      </div>
    ),
  },
  /**
   * Only once it has actually been signed.
   *
   * The column offered the download at every stage, so before consent came back
   * it handed over a document stamped CONSENT NOT YET RECEIVED under a heading
   * promising a signed one. The file was honest; the column was not.
   *
   * The unsigned version has a real use — an admin who cannot reach the
   * practitioner by email sends it by hand — but that is a step in getting
   * consent, not a record of having it, so it lives in `Next step` beside the
   * send it belongs to.
   */
  {
    key: "download",
    header: "Download Signed Consent",
    render: (row) =>
      row.status === "Received" ? (
        <DownloadLink href={`/api/consents/${row.id}/pdf`} label="Download" title={`Download ${row.reference}`} />
      ) : (
        <span className="text-3xs text-ink-faint">Not signed yet</span>
      ),
  },
  /**
   * An eighth column V7 does not have: the one thing this row needs next.
   *
   * V7 spreads the work across three boxes — generate here, chase there, send
   * the guide somewhere else — and leaves the table to be read rather than
   * acted on. An admin had to know which box a session belonged in, and Part 1
   * only offered its actions in the render following a successful generate, so
   * closing the tab lost them with no way back.
   *
   * A confirmation is only ever at one point in that sequence and each point
   * has one sensible next action, so the row says what it needs and nothing
   * else. Derived from stored facts by `consentStage`, never from what the page
   * remembers, which is what makes it survive a reload.
   */
  {
    key: "next",
    header: "Next step",
    requires: "mutate",
    render: (row) => <NextStep key={row.id} row={row} />,
  },
  {
    key: "sessionStatus",
    header: "Session status",
    requires: "mutate",
    render: (row) => <SessionStatusSelect key={row.id} row={row} />,
  },
];

/** Part 1 — generate a confirmation for a matched session. */
function GenerateConfirmation({
  sessions,
  role,
}: {
  sessions: readonly ConfirmableSession[];
  role: ConsoleRole;
}) {
  const [selected, setSelected] = useState("");
  // Empty until touched, so the session's own values show through — the same
  // shape `date` already uses below.
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [meridiem, setMeridiem] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  /**
   * The confirmation just generated, held here rather than derived from
   * `sessions`.
   *
   * Generating one removes that session from the confirmable list — correctly,
   * it now has a confirmation — so anything derived from the list disappears
   * the instant it succeeds, taking the Download and Send-consent buttons with
   * it. Those are the two things an admin wants *next*, so the generated
   * session is remembered until they pick another.
   */
  const [done, setDone] = useState<ConfirmableSession | null>(null);

  const session = useMemo(() => sessions.find((entry) => entry.id === selected), [sessions, selected]);
  const seeded = useMemo(() => seedFrom(session), [session]);

  // What the form is actually holding: the admin's choice where they made one,
  // the session's own value where they have not, and "" where neither exists.
  // The pickers and the submit both read this, so what is sent is what is shown.
  const picked = {
    hour: hour || seeded.hour,
    minute: minute || seeded.minute,
    meridiem: meridiem || seeded.meridiem,
    duration: duration || seeded.duration,
  };

  /**
   * Everything typed into the form belongs to the session it was typed for.
   *
   * Switching sessions leaves the four pickers and the date box holding the
   * previous one's answers, which then read as the new session's — the exact
   * failure the empty fields exist to prevent, moved one session along. The
   * date carried across even before the pickers did.
   */
  const clearEntry = () => {
    setDate("");
    setHour("");
    setMinute("");
    setMeridiem("");
    setDuration("");
  };

  // Shared by every field in the grid; only the label, value and column differ.
  const auto = { assignmentId: session?.id ?? "", canOverride: can(role, "override") };

  return (
    <section>
      <h2 className={PART}>Part 1 — Generate &amp; Send Consent</h2>
      <div className={`${CARD} mb-7`}>
        <h3 className="text-base font-semibold text-ink">Generate a new confirmation</h3>
        <p className="mb-3.5 mt-0.5 text-xs text-ink-muted">
          All fields below flow from the original Session Request and Practitioner onboarding record.
          Global Admin can correct any field here — the fix is saved on the underlying record, not just
          this document.
        </p>

        <div className="mb-3.5">
          <label className={LABEL} htmlFor="confirm-session">
            Select confirmed session
          </label>
          <select
            id="confirm-session"
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setDone(null);
              setError(null);
              clearEntry();
            }}
            className={`${PICKER} max-w-[480px]`}
          >
            <option value="">— Choose a session —</option>
            {sessions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.sessionReference} — {entry.practitioner} — {entry.module}
              </option>
            ))}
          </select>
          {sessions.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-faint">
              Nothing waiting — every matched session already has its confirmation.
            </p>
          ) : null}
        </div>

        {session ? (
          <>
            <div className="mb-3.5 rounded-lg bg-surface-soft px-3.5 py-3">
              <div className="mb-2 text-3xs font-semibold uppercase tracking-caps text-ink-faint">
                Auto-populated — from the request and practitioner record
              </div>
              {/* V7's eleven fields, in its order and under its labels. The
                  earlier eight renamed most of them, dropped Date, State and
                  the payout, and showed the confirmation reference under a
                  label that means the empanelment agreement — two different
                  identifiers on two different records. */}
              <div className="grid gap-x-5 gap-y-2.5 text-xs sm:grid-cols-2">
                <AutoField {...auto} label="First name" field="practitioner" value={session.practitioner.split(" ")[0]} />
                <AutoField {...auto} label="Module confirmed for" field="module" value={session.module} />
                <AutoField {...auto} label="Date" field="sessionDate" value={session.sessionDate ?? "[to be scheduled]"} />
                <AutoField {...auto} label="Venue" field="venue" value={session.venue ?? "Pending from SPOC"} />
                <AutoField {...auto} label="City" field="city" value={session.city} />
                <AutoField {...auto} label="State" field="state" value={session.state ?? "—"} />
                <AutoField {...auto} label="Audience type" field="audience" value={session.audience} />
                <AutoField {...auto} label="Participant count" field="participants" value={session.participants ?? "—"} />
                <AutoField {...auto} label="SPOC name" field="spoc" value={session.spoc} />
                {/* No pencil: this is the agreement's identity, not a value of
                    this confirmation. */}
                <AutoField {...auto} label="Empanelment agreement ref." value={session.agreementReference} />
                <AutoField
                  {...auto}
                  label="Agreed gross payout (₹)"
                  field="grossPayout"
                  value={inr(session.grossPayout, session.currency)}
                />
              </div>
            </div>

            <div className="mb-3.5 grid gap-3 sm:grid-cols-3">
              <div>
                <label className={LABEL} htmlFor="confirm-date">
                  Session date <span className="font-normal text-ink-faint">(admin enters)</span>
                </label>
                {/* Not pre-filled from `session.sessionDate`. A date already on
                    the record is one the admin has not looked at on this screen,
                    and this screen is where it becomes a term of a signed
                    document. */}
                <input
                  id="confirm-date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={FIELD}
                />
              </div>
              <div>
                <span className={LABEL}>
                  Start time <span className="font-normal text-ink-faint">(admin enters)</span>
                </span>
                <div className="flex gap-1.5">
                  <label className="sr-only" htmlFor="confirm-hour">
                    Hour
                  </label>
                  {/* The empty option is what lets a dropdown say "nothing
                      chosen". Without one the browser selects the first item,
                      so the control can only ever report a value. */}
                  <select id="confirm-hour" value={picked.hour} onChange={(e) => setHour(e.target.value)} className={PICKER}>
                    <option value="">Hour</option>
                    {HOURS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="confirm-minute">
                    Minute
                  </label>
                  <select
                    id="confirm-minute"
                    value={picked.minute}
                    onChange={(e) => setMinute(e.target.value)}
                    className={PICKER}
                  >
                    <option value="">Min</option>
                    {MINUTES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="confirm-meridiem">
                    AM or PM
                  </label>
                  <select
                    id="confirm-meridiem"
                    value={picked.meridiem}
                    onChange={(e) => setMeridiem(e.target.value)}
                    className={PICKER}
                  >
                    <option value="">AM/PM</option>
                    <option>AM</option>
                    <option>PM</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL} htmlFor="confirm-duration">
                  Duration <span className="font-normal text-ink-faint">(admin enters)</span>
                </label>
                <select
                  id="confirm-duration"
                  value={picked.duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className={PICKER}
                >
                  <option value="">Select duration</option>
                  <option value="3">3 hours — single module</option>
                  <option value="6">6 hours — bundled, two modules</option>
                </select>
              </div>
            </div>

            <div className="mb-3.5 rounded-lg bg-green-light px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xs font-semibold uppercase tracking-caps text-green">
                  Gross payout amount
                </span>
                <span className="text-2xl font-semibold text-green">
                  {inr(session.grossPayout, session.currency)}
                </span>
              </div>
              <p className="mt-1.5 text-3xs text-ink-muted">
                This amount is pre-tax. TDS, GST, and net calculations are handled separately by the
                finance/accounting team — not on this platform.
              </p>
            </div>

            {error ? (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-edge bg-red-light px-3 py-2 text-xs text-red"
              >
                {error}
              </p>
            ) : null}

            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  // Half a time is not a time: `to24Hour("10", "", "")` returns
                  // "10:", which reads as malformed rather than as missing and
                  // would earn a message about the format of something the admin
                  // never filled in. Send "" and let the guard name the field.
                  const complete = picked.hour && picked.minute && picked.meridiem;
                  const result = await generateConfirmation(session.id, {
                    startTime: complete ? to24Hour(picked.hour, picked.minute, picked.meridiem) : "",
                    durationHours: Number(picked.duration),
                    sessionDate: date,
                  });
                  if (result.ok) {
                    setDone(session);
                    setSelected("");
                  } else {
                    setError(result.message);
                  }
                })
              }
              className="inline-flex items-center gap-[7px] rounded-lg bg-ink px-3.5 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {pending ? "Generating…" : "Generate Confirmation"}
            </button>
          </>
        ) : null}

        {/* V7 keeps both actions on screen from the start, dimmed to 45% and
            disabled, then turns them gold once a confirmation exists — the
            state change is how it tells you the generate worked. They were
            absent-until-ready here, which loses that signal and moves the
            layout under the cursor.

            Gold takes an ink label, not V7's white: white on --color-gold is
            2.1:1 and fails AA. Recorded here so it is not "corrected" back. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
          {done ? (
            <>
              <DownloadLink
                href={`/api/consents/${done.id}/pdf`}
                label="Download PDF"
                sublabel="(fallback, for sending offline)"
                title="Download the confirmation, for sending offline"
                tone="gold"
              />
              <RowAction
                action={sendConsentRequest.bind(null, done.id)}
                draft={{ kind: "consent-request", id: done.id }}
                label="Send consent request"
                pendingMessage={`Sending the consent request to ${done.practitioner}…`}
                variant="gold-pill"
              />
              <span aria-live="polite" className="text-xs text-ink-faint">
                Generated {done.confirmationReference} for {done.practitioner} — download the PDF if
                needed, or send the consent request directly.
              </span>
            </>
          ) : (
            <>
              <span className={`${DIMMED_PILL} opacity-45`} aria-hidden>
                Download PDF <span className="font-normal opacity-75">(fallback, for sending offline)</span>
              </span>
              <span className={`${DIMMED_PILL} opacity-45`} aria-hidden>
                Send consent request
              </span>
              <span className="text-xs text-ink-faint">
                Generate a confirmation to download it or request consent.
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}


export function ConsentPanel({
  rows,
  role,
  confirmable,
}: {
  rows: readonly ConsentRow[];
  role: ConsoleRole;
  confirmable: readonly ConfirmableSession[];
}) {
  const mayEdit = can(role, "mutate");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [refreshing, start] = useTransition();
  const [checked, setChecked] = useState<string | null>(null);
  const router = useRouter();

  /**
   * The years actually present, not V7's hardcoded [2025, 2026, 2027].
   * That window is already nearly spent — its own generated references read
   * IQC-2026 — and a year missing from the list silently hides every
   * confirmation issued in it.
   */
  const years = useMemo(
    () => [...new Set(rows.map((row) => row.issuedMonth.slice(0, 4)).filter(Boolean))].sort().reverse(),
    [rows],
  );

  const visible = useMemo(
    () =>
      rows.filter((row) => {
        if (month !== "all" && row.issuedMonth.slice(5, 7) !== month) return false;
        if (year !== "all" && row.issuedMonth.slice(0, 4) !== year) return false;
        return !pendingOnly || row.status !== "Received";
      }),
    [rows, month, year, pendingOnly],
  );

  /**
   * Counted across every confirmation, not the filtered view.
   *
   * V7 derives this from the filtered set, so narrowing "Issued in" to a quiet
   * month drops the number — and it feeds the sidebar badge, so a workload
   * indicator visible from every other tab reads zero while the work still
   * exists. Fidelity is not worth that.
   */
  const awaitingConsent = rows.filter((row) => row.status !== "Received").length;

  return (
    <>
      {/* V7 `.pending-bar` — the count hard left, the period filter hard right. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        {/* A button, not V7's `<div onclick>`: that version cannot be reached
            by Tab or fired by Enter, and its "showing only this" caption lives
            in CSS `content`, where no screen reader or translation reaches it. */}
        <button
          type="button"
          aria-pressed={pendingOnly}
          onClick={() => setPendingOnly((on) => !on)}
          className={`min-w-[120px] select-none rounded-lg border bg-red-light px-4 py-2 text-left transition-[box-shadow,border-color] hover:border-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
            pendingOnly ? "border-red shadow-[0_0_0_2px_rgba(163,45,45,0.18)]" : "border-red/30"
          }`}
        >
          <span className="block text-4xl font-bold leading-[1.1] text-red">{awaitingConsent}</span>
          <span className="block text-xs text-ink-muted">Signed copy not yet received</span>
          {pendingOnly ? (
            <span className="mt-[3px] block text-3xs font-semibold text-red">✓ showing only this</span>
          ) : null}
        </button>

        <div className="flex items-center gap-1.5">
          <span className="mr-0.5 text-xs text-ink-faint">Issued in:</span>
          <label className="sr-only" htmlFor="consent-month">
            Month issued
          </label>
          <select
            id="consent-month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className={PICKER}
          >
            <option value="all">All months</option>
            {MONTHS_ISSUED.map((name, index) => (
              <option key={name} value={String(index + 1).padStart(2, "0")}>
                {name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="consent-year">
            Year issued
          </label>
          <select
            id="consent-year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className={PICKER}
          >
            <option value="all">All years</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {mayEdit ? <GenerateConfirmation sessions={confirmable} role={role} /> : null}

      <section>
        {/* V7 puts the refresh on the section header line, right-aligned. */}
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <h2 className={`${PART} mb-0`}>Part 2 — Track Status</h2>
          {mayEdit ? (
            <div className="flex items-center gap-2">
              {checked ? (
                <span aria-live="polite" className="text-xs text-ink-faint">
                  {checked}
                </span>
              ) : null}
              <button
                type="button"
                disabled={refreshing}
                onClick={() =>
                  start(async () => {
                    // V7 re-reads localStorage, because that is where its
                    // consent statuses live. Ours are in the database and a
                    // practitioner's consent lands there directly, so the
                    // honest equivalent is re-fetching the server data.
                    router.refresh();
                    setChecked("Checked just now.");
                  })
                }
                className="rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {refreshing ? "Checking…" : "Check for updates now"}
              </button>
            </div>
          ) : null}
        </div>
        <ConsoleTable
          caption="Generated confirmations"
          columns={COLUMNS}
          rows={visible}
          role={role}
          rowKey={(row) => row.id}
          empty={
            rows.length === 0
              ? "No confirmations generated yet. Select a matched session above to generate one."
              : "Nothing matches this filter."
          }
        />
      </section>

    </>
  );
}
