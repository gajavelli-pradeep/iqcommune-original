"use client";

import { useState, useTransition } from "react";

import {
  deactivatePractitioner,
  deleteApplication,
  empanelPractitioner,
  generateAndSendAgreement,
  overridePractitionerField,
  reactivatePractitioner,
  rejectApplication,
  savePractitionerNotes,
  sendWelcomeMessage,
  setApplicationStage,
  type OverridableField,
} from "../actions";
import { DetailClose } from "../ExpandableRows";
import { RowAction } from "../RowAction";
import { PRACTITIONER_STATUS, StatusPill } from "../StatusPill";
import { can, type ConsoleRole } from "../roles";
import type { PractitionerRow } from "@/services/console";

/**
 * The practitioner detail card (V7 `.profile-card`) — three columns: who they
 * are, where they are in the pipeline, and what can be done about it.
 *
 * The right-hand column is the part worth reading twice. V7 shows a status
 * `<select>` on some rows and a read-only box on others, and that is not a
 * quirk: 'Applied', 'Screening Done' and 'Rejected' are an admin's judgement
 * call (the screening call happens offline, so nothing can set them
 * automatically), while 'Agreement Sent', 'Empanelled' and 'Deactivated' are
 * set by the system when the link goes out, the signature returns, or an
 * explicit deactivation runs. Offering a dropdown for those would let an admin
 * silently desynchronise the pipeline from the agreement record, so the card
 * shows the state and says who set it instead. `setApplicationStage` enforces
 * the same rule server-side — the select is the affordance, not the guard.
 */

/** The pipeline V7 draws in the middle column, in order. */
const PIPELINE = ["Applied", "Screening Done", "Agreement Sent", "Empanelled"] as const;

const PencilIcon = () => (
  <svg width="9" height="9" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const MailIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const SEC_TITLE = "mb-3.5 text-2xs font-semibold uppercase tracking-caps text-ink-faint";
const HINT = "mt-1 text-3xs text-ink-faint";

/** V7 `.sec-btn` — the half-width pair at the foot of the card. */
const SEC_BTN =
  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-surface px-2 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/** One label/value line, with the Global-Admin correction control (V7 `.kv-row`). */
function KvRow({
  label,
  value,
  field,
  rowId,
  canOverride,
  small,
}: {
  label: string;
  value: string | null;
  /** Omit for a value nothing may correct by hand (Applied, Ref., Status). */
  field?: OverridableField;
  rowId: string;
  canOverride: boolean;
  small?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, start] = useTransition();

  const save = () => {
    start(async () => {
      await overridePractitionerField(rowId, field!, draft);
      setEditing(false);
    });
  };

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-[90px] shrink-0 text-xs text-ink-faint">{label}</span>

      {editing ? (
        <span className="flex flex-1 flex-wrap items-center gap-1.5">
          <label className="sr-only" htmlFor={`${rowId}-${field}`}>
            {label}
          </label>
          <input
            id={`${rowId}-${field}`}
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-2 py-1 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
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
        </span>
      ) : (
        <span className={`font-medium text-ink ${small ? "text-xs" : ""}`}>
          {value ?? (
            <span className="italic text-ink-faint">Not provided — collected on newer applications</span>
          )}{" "}
          {field && canOverride ? (
            <button
              type="button"
              onClick={() => {
                setDraft(value ?? "");
                setEditing(true);
              }}
              title="Global Admin override"
              /**
               * The drawn size is V7's 9px pencil; the pseudo-element grows the
               * tap area to 44×44 on touch without changing it. Both axes here,
               * unlike the tool chips — the pencil is narrow as well as short,
               * and the global coarse-pointer rule only sets a height floor.
               */
              className="relative inline-flex items-center gap-[3px] rounded px-1 py-0.5 text-3xs text-gold-dark transition-colors hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold [@media(any-pointer:coarse)]:after:absolute [@media(any-pointer:coarse)]:after:left-1/2 [@media(any-pointer:coarse)]:after:top-1/2 [@media(any-pointer:coarse)]:after:h-11 [@media(any-pointer:coarse)]:after:w-11 [@media(any-pointer:coarse)]:after:-translate-x-1/2 [@media(any-pointer:coarse)]:after:-translate-y-1/2 [@media(any-pointer:coarse)]:after:content-['']"
            >
              <PencilIcon />
              <span className="sr-only">Correct {label}</span>
            </button>
          ) : null}
        </span>
      )}
    </div>
  );
}

/** The middle column: which stages are done, which is live, which are ahead. */
function Pipeline({ status }: { status: string }) {
  const current = PIPELINE.indexOf(status as (typeof PIPELINE)[number]);
  const rejected = status === "Rejected";

  return (
    <div>
      <div className={SEC_TITLE}>Pipeline progress</div>
      <ol className="flex flex-col">
        {PIPELINE.map((step, index) => {
          const done = !rejected && (index < current || status === "Empanelled");
          const active = !rejected && index === current;

          const marker = done
            ? "border border-green-edge bg-green-light text-green"
            : active
              ? "bg-ink text-surface"
              : "border border-border-strong bg-surface-soft text-ink-faint";

          return (
            <li key={step} className="relative flex items-start gap-2.5 py-1.5">
              {index < PIPELINE.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute left-[9px] top-[22px] h-[calc(100%-4px)] w-px bg-border-strong"
                />
              ) : null}
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-3xs font-semibold ${marker}`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span className="text-xs font-medium text-ink">{step}</span>
              <span className="sr-only">
                {done ? " — done" : active ? " — current stage" : " — not reached"}
              </span>
            </li>
          );
        })}
      </ol>
      {rejected ? (
        <p className="mt-2 text-3xs text-ink-faint">
          Rejected before the pipeline completed — no stage is current.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The "Notes" editor. V7's button toasts "Notes saved" and saves nothing; a
 * control that claims to persist and does not is a defect, so this writes to
 * `practitioner_applications.admin_notes` (migration 0008).
 *
 * It sits below the two-button row rather than inside it, so the textarea gets
 * the card's full column width instead of the button's half.
 */
function NotesEditor({ rowId, initial }: { rowId: string; initial: string }) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="mt-2">
      <label className="sr-only" htmlFor={`${rowId}-notes`}>
        Internal notes
      </label>
      <textarea
        id={`${rowId}-notes`}
        rows={3}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setSaved(false);
        }}
        placeholder="Internal only — never shown to the practitioner."
        className="w-full rounded-lg border border-border-strong bg-surface-soft px-2.5 py-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await savePractitionerNotes(rowId, draft);
            setSaved(true);
          })
        }
        className="mt-1.5 rounded-md px-2 py-1 text-xs font-semibold text-gold-dark underline underline-offset-2 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save notes"}
      </button>
      <span aria-live="polite" className="ml-2 text-xs text-green">
        {saved && !pending ? "Saved" : ""}
      </span>
    </div>
  );
}

export function PractitionerProfile({ row, role }: { row: PractitionerRow; role: ConsoleRole }) {
  const [stage, setStage] = useState(row.status);
  const [notesOpen, setNotesOpen] = useState(false);
  const [pending, start] = useTransition();

  const mayEdit = can(role, "mutate");
  const mayOverride = can(role, "override");
  const mayPurge = can(role, "purge");

  const meta = PRACTITIONER_STATUS[row.status as keyof typeof PRACTITIONER_STATUS];

  // The dropdown appears only on the stages an admin actually decides. See the
  // note at the top of this file — the other stages are system-set.
  const decidesByHand = ["Applied", "Screening Done", "Rejected"].includes(row.status);

  const systemNote =
    row.status === "Agreement Sent"
      ? "System-set — waiting on the practitioner to open the link and sign. Updates itself the moment they submit."
      : row.status === "Empanelled"
        ? "System-set — the practitioner’s signed agreement came back automatically."
        : "Set manually — pausing this practitioner while keeping their history.";

  return (
    <div className="relative p-7 px-[1.75rem] py-8">
      <DetailClose label={row.name} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Who they are ─────────────────────────────────────────────── */}
        <div>
          <div className="mb-2 flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-gold-light text-lg font-semibold text-gold-dark"
            >
              {row.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .join("")}
            </span>
            <div>
              <div className="text-[17px] font-semibold tracking-tight text-ink">{row.name}</div>
              <div className="mt-0.5 text-sm text-ink-muted">{row.role}</div>
              {row.organisation ? <div className="mt-px text-xs text-ink-faint">{row.organisation}</div> : null}
            </div>
          </div>

          <div className="mb-3.5 flex items-center gap-1.5 rounded-lg bg-surface-soft px-3 py-2">
            {row.averageRating !== null ? (
              <>
                <span aria-hidden className="text-[15px] text-gold">
                  ★
                </span>
                <span className="text-sm font-semibold text-ink">{row.averageRating} average</span>
                <span className="text-xs text-ink-faint">across completed sessions</span>
              </>
            ) : (
              <span className="text-xs italic text-ink-faint">
                Not yet rated — no completed sessions with a rating
              </span>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-[0.55rem]">
            <KvRow label="Module" value={row.module} field="module" rowId={row.id} canOverride={mayOverride} />
            <KvRow label="City" value={row.city} field="city" rowId={row.id} canOverride={mayOverride} />
            <KvRow label="State" value={row.state} field="state" rowId={row.id} canOverride={mayOverride} />
            <KvRow
              label="Communication address"
              value={row.address}
              field="address"
              rowId={row.id}
              canOverride={mayOverride}
              small
            />
            <KvRow label="T-shirt size" value={row.tshirtSize} field="tshirt" rowId={row.id} canOverride={mayOverride} />
            <KvRow
              label="Experience"
              value={row.experience}
              field="experience"
              rowId={row.id}
              canOverride={mayOverride}
            />
            <KvRow label="Email" value={row.email} field="email" rowId={row.id} canOverride={mayOverride} small />
            <KvRow label="Phone" value={row.phone} field="phone" rowId={row.id} canOverride={mayOverride} small />
            <KvRow label="Applied" value={row.appliedOn} rowId={row.id} canOverride={false} />
            <div className="flex items-start gap-2 text-sm">
              <span className="w-[90px] shrink-0 text-xs text-ink-faint">Ref.</span>
              <span className="font-medium text-ink">
                {row.reference ?? (
                  <span className="italic text-ink-faint">Assigned when the agreement is generated</span>
                )}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="w-[90px] shrink-0 text-xs text-ink-faint">Status</span>
              {meta ? <StatusPill {...meta} /> : <StatusPill label={row.status} tone="neutral" />}
            </div>
          </div>
        </div>

        {/* ── Where they are ───────────────────────────────────────────── */}
        <Pipeline status={row.status} />

        {/* ── What can be done ─────────────────────────────────────────── */}
        {mayEdit ? (
          <div className="flex flex-col gap-2.5">
            <div>
              <div className={SEC_TITLE}>Status</div>

              {decidesByHand ? (
                <>
                  <label className="sr-only" htmlFor={`${row.id}-stage`}>
                    Pipeline stage for {row.name}
                  </label>
                  <select
                    id={`${row.id}-stage`}
                    value={stage}
                    disabled={pending}
                    onChange={(event) => {
                      const next = event.target.value;
                      setStage(next);
                      start(async () => {
                        await setApplicationStage(row.id, next);
                      });
                    }}
                    className="w-full min-w-[118px] cursor-pointer rounded-lg border border-border-strong bg-surface-soft px-3 py-2.5 text-sm text-ink focus:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold disabled:opacity-60"
                  >
                    {["Applied", "Screening Done", "Rejected"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <p className={`${HINT} mb-2.5`}>
                    These two stages are your judgement call — the screening call happens offline, so nothing
                    here is automatic.
                  </p>
                </>
              ) : (
                <div className="mb-2.5 rounded-lg bg-surface-soft px-3 py-2.5">
                  {meta ? <StatusPill {...meta} /> : <StatusPill label={row.status} tone="neutral" />}
                  <p className="mt-1.5 text-3xs text-ink-faint">{systemNote}</p>
                </div>
              )}
            </div>

            <div>
              <div className={SEC_TITLE}>Automated actions</div>
              <div className="flex flex-col gap-1.5">
                {row.status === "Screening Done" ? (
                  <>
                    <RowAction
                      action={generateAndSendAgreement.bind(null, row.id)}
                      label="Generate & send empanelment agreement"
                      pendingMessage={`Sending the agreement to ${row.name}…`}
                      variant="primary"
                      icon={<MailIcon />}
                    />
                    <RowAction
                      action={rejectApplication.bind(null, row.id)}
                      label="Send rejection message"
                      pendingMessage={`Rejecting ${row.name}…`}
                      variant="ghost-block"
                      tone="danger"
                    />
                  </>
                ) : null}

                {row.status === "Agreement Sent" ? (
                  <>
                    <RowAction
                      action={generateAndSendAgreement.bind(null, row.id)}
                      label="Resend agreement link"
                      pendingMessage={`Resending the agreement to ${row.name}…`}
                      variant="ghost-block"
                    />
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-3xs text-ink-faint">
                        Signed copy received some other way?
                      </summary>
                      <div className="mt-1.5">
                        <RowAction
                          action={empanelPractitioner.bind(null, row.id)}
                          label="Mark Empanelled manually"
                          pendingMessage={`Empanelling ${row.name}…`}
                          variant="ghost-block"
                        />
                      </div>
                    </details>
                  </>
                ) : null}

                {row.status === "Empanelled" ? (
                  <>
                    <RowAction
                      action={sendWelcomeMessage.bind(null, row.id)}
                      label="Send welcome message"
                      pendingMessage={`Sending a welcome to ${row.name}…`}
                      variant="ghost-block"
                    />
                    <RowAction
                      action={deactivatePractitioner.bind(null, row.id)}
                      label="Send deactivation message"
                      pendingMessage={`Deactivating ${row.name}…`}
                      variant="ghost-block"
                      tone="danger"
                    />
                  </>
                ) : null}

                {row.status === "Deactivated" ? (
                  <RowAction
                    action={reactivatePractitioner.bind(null, row.id)}
                    label="Reactivate"
                    pendingMessage={`Reactivating ${row.name}…`}
                    variant="primary"
                  />
                ) : null}

                {row.status === "Applied" ? (
                  <p className="text-xs text-ink-faint">
                    Move to “Screening Done” above once the offline call happens — that unlocks the agreement
                    send.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-3.5 border-t border-dashed border-border-strong pt-3.5">
              <div className="mb-2 text-3xs font-semibold uppercase tracking-caps text-ink-faint">
                Danger zone
              </div>
              {mayPurge && row.practitionerId === null ? (
                <RowAction
                  action={deleteApplication.bind(null, row.id)}
                  label="Delete permanently"
                  pendingMessage={`Deleting ${row.name}…`}
                  variant="ghost"
                  tone="danger"
                />
              ) : (
                <p className="text-3xs text-ink-faint">
                  {row.practitionerId
                    ? "Can’t be deleted — agreement/session history exists. Use “Deactivated” instead — it hides them from future matching without losing history."
                    : "Deleting an application is a Global Admin action."}
                </p>
              )}
            </div>

            {/* V7 `.sec-btns` — Message and Notes, side by side. */}
            <div className="mt-2">
              <div className="flex gap-1.5">
                <a
                  href={`mailto:${row.email}`}
                  className={SEC_BTN}
                >
                  <svg
                    width="13"
                    height="13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Message
                </a>
                <button
                  type="button"
                  aria-expanded={notesOpen}
                  onClick={() => setNotesOpen((current) => !current)}
                  className={SEC_BTN}
                >
                  <PencilIcon />
                  Notes
                </button>
              </div>
              {notesOpen ? <NotesEditor rowId={row.id} initial={row.notes ?? ""} /> : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-faint">
            You have view-only access — pipeline actions are available to an Admin.
          </p>
        )}
      </div>
    </div>
  );
}
