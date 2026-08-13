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
} from "../actions";
import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { DownloadLink } from "../DownloadLink";
import { DraftModal } from "../DraftModal";
import type { DraftOverride } from "../draft-kinds";
import { PendingSendToast } from "../PendingSendToast";
import { RowAction } from "../RowAction";
import { CONSENT_STATUS, StatusPill } from "../StatusPill";
import { can, type ConsoleRole } from "../roles";
import type { ConfirmableSession, ConsentRow } from "@/services/console";

/**
 * Session Consent — "the critical junction of the whole loop", and the only
 * console tab that is a workflow rather than a table.
 *
 * Three parts in the order the work happens: generate the confirmation, track
 * whether it came back signed, then — once it has — send the photo guide. The
 * third part is gated on the second deliberately: the guide tells a
 * practitioner what to shoot at a session they have not yet agreed to deliver.
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
  const [pending, start] = useTransition();
  const { pending: held, schedule, undo } = useDeferredSend();
  const [drafting, setDrafting] = useState(false);

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
    setStatus("Cancelled");
    schedule(async () => {
      await setSessionStatus(row.sessionId, "Cancelled", edited);
    }, `Cancelling ${row.session}…`);
  };

  return (
    <>
      <label className="sr-only" htmlFor={`${row.id}-session-status`}>
        Session status for {row.session}
      </label>
      <select
        id={`${row.id}-session-status`}
        value={["Pending", "Confirmed", "Cancelled"].includes(status) ? status : "Pending"}
        disabled={pending || Boolean(held)}
        onChange={(event) => {
          const next = event.target.value;
          if (next === "Cancelled") {
            setDrafting(true);
            return;
          }
          setStatus(next);
          start(async () => {
            await setSessionStatus(row.sessionId, next);
          });
        }}
        className={selectClass({ tone: "inline", className: "min-w-[110px]" })}
      >
        {["Pending", "Confirmed", "Cancelled"].map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {row.sessionStatus === "Completed" ? (
        <span className="mt-0.5 block text-3xs text-ink-faint">Delivered</span>
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
  {
    key: "download",
    header: "Download Signed Consent",
    render: (row) => (
      <DownloadLink href={`/api/consents/${row.id}/pdf`} label="Download" title={`Download ${row.reference}`} />
    ),
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
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [meridiem, setMeridiem] = useState("AM");
  const [duration, setDuration] = useState("3");
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
                <input
                  id="confirm-date"
                  type="date"
                  value={date || (session.sessionDate ?? "")}
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
                  <select id="confirm-hour" value={hour} onChange={(e) => setHour(e.target.value)} className={PICKER}>
                    {HOURS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="confirm-minute">
                    Minute
                  </label>
                  <select
                    id="confirm-minute"
                    value={minute}
                    onChange={(e) => setMinute(e.target.value)}
                    className={PICKER}
                  >
                    {MINUTES.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor="confirm-meridiem">
                    AM or PM
                  </label>
                  <select
                    id="confirm-meridiem"
                    value={meridiem}
                    onChange={(e) => setMeridiem(e.target.value)}
                    className={PICKER}
                  >
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
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  className={PICKER}
                >
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
                  const result = await generateConfirmation(session.id, {
                    startTime: to24Hour(hour, minute, meridiem),
                    durationHours: Number(duration),
                    sessionDate: date || session.sessionDate,
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

/** Part 3 — the photo guide, once consent is in. */
function PhotoGuidePart({ sessions }: { sessions: readonly ConfirmableSession[] }) {
  const [selected, setSelected] = useState("");
  const session = sessions.find((entry) => entry.id === selected);

  return (
    <section className="mt-7">
      <h2 className={PART}>Part 3 — Send Photo Guide</h2>
      <div className={CARD}>
        <h3 className="text-base font-semibold text-ink">Send the photo guide</h3>
        <p className="mb-3.5 mt-0.5 text-xs text-ink-muted">
          Only sessions marked Confirmed above show up here — this is the moment to tell the practitioner
          what shots to capture, before the session happens.
        </p>

        <div className="mb-3.5">
          <label className={LABEL} htmlFor="guide-session">
            Select Confirmed session
          </label>
          <select
            id="guide-session"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            className={`${PICKER} max-w-[480px]`}
          >
            <option value="">— Select a confirmed session —</option>
            {sessions.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.sessionReference} — {entry.practitioner} — {entry.module}
              </option>
            ))}
          </select>
          {sessions.length === 0 ? (
            <p className="mt-1.5 text-xs text-ink-faint">
              Nothing here yet — a session appears once its practitioner has returned consent.
            </p>
          ) : null}
        </div>

        {session ? (
          <>
            <div className="mb-3.5 grid gap-x-5 gap-y-2 rounded-lg bg-surface-soft px-3.5 py-3 text-xs sm:grid-cols-2">
              <AutoField label="Practitioner" value={session.practitioner} />
              <AutoField label="Module" value={session.module} />
              <AutoField label="Venue" value={session.venue ?? "Pending from SPOC"} />
              <AutoField label="City" value={session.city} />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <DownloadLink
                href={`/api/consents/${session.id}/pdf?doc=photo-guide`}
                label="Download photo guide (PDF)"
              />
              <RowAction
                action={sendPhotoGuide.bind(null, session.id)}
                draft={{ kind: "photo-guide", id: session.id }}
                label="Send photo guide email"
                pendingMessage={`Sending the photo guide to ${session.practitioner}…`}
                variant="ghost"
              />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

export function ConsentPanel({
  rows,
  role,
  confirmable,
  photoGuideSessions,
}: {
  rows: readonly ConsentRow[];
  role: ConsoleRole;
  confirmable: readonly ConfirmableSession[];
  photoGuideSessions: readonly ConfirmableSession[];
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

      {mayEdit ? <PhotoGuidePart sessions={photoGuideSessions} /> : null}
    </>
  );
}
