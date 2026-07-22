"use client";

import { useState, useTransition } from "react";

import { controlClass } from "@/components/ui/control";

import {
  deleteSessionRequest,
  sendRequestCancellation,
  sendRequestFollowUp,
  setSessionRequestStatus,
  updateSessionRequestTerms,
} from "../actions";
import { DetailClose } from "../ExpandableRows";
import { RowAction } from "../RowAction";
import { can, type ConsoleRole } from "../roles";
import type { AssignablePractitioner, SessionRequestRow } from "@/services/console";

/**
 * The session-request detail card (V7 `.req-expand`) — three columns: what was
 * asked for, who agreed to it, and what state the request is in.
 *
 * The middle column is where a request becomes work. V7's own hint says it
 * plainly: nothing is matched automatically, these are filled in after the call
 * with the practitioner. Setting the status to Matched then creates the session
 * and the assignment, so the downstream tabs fill themselves — which is why the
 * status control refuses to move until both fields are recorded.
 */

const SEC_TITLE = "mb-3.5 text-2xs font-semibold uppercase tracking-caps text-ink-faint";
const FIELD = controlClass({ tone: "inline", className: "min-w-[118px]" });
const HINT = "mt-1 text-3xs text-ink-faint";

function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="w-[110px] shrink-0 text-xs text-ink-faint">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

export function RequestDetail({
  row,
  role,
  practitioners,
}: {
  row: SessionRequestRow;
  role: ConsoleRole;
  practitioners: readonly AssignablePractitioner[];
}) {
  const [assignee, setAssignee] = useState(row.assignedPractitionerId ?? "");
  const [payout, setPayout] = useState(row.agreedPayout?.toString() ?? "");
  const [status, setStatus] = useState(row.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const mayEdit = can(role, "mutate");
  const mayPurge = can(role, "purge");

  /**
   * Runs one change and surfaces whatever comes back.
   *
   * A refusal arrives as a returned result (the match needs its terms first);
   * a genuine fault arrives as a throw. Both have to reach the operator —
   * swallowing either would leave the select looking as though it had worked.
   */
  const save = (change: () => Promise<{ ok: boolean; message?: string } | void>) =>
    start(async () => {
      setError(null);
      try {
        const result = await change();
        if (result && result.ok === false) {
          setError(result.message ?? "That change was not applied.");
          setStatus(row.status);
        }
      } catch {
        setError("That change could not be saved. Please try again.");
        setStatus(row.status);
      }
    });

  return (
    <div className="relative px-7 py-8">
      <DetailClose label={`the request from ${row.name}`} />

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── What was asked for ───────────────────────────────────────── */}
        <div>
          <div className={SEC_TITLE}>Request details</div>
          <div className="flex flex-col gap-[0.55rem]">
            <Kv label="From" value={row.name} />
            <Kv label="Organisation" value={row.organisation ?? "—"} />
            <Kv label="Email" value={<span className="text-xs">{row.email}</span>} />
            <Kv label="Phone" value={<span className="text-xs">{row.phone}</span>} />
            <Kv label="City" value={row.city} />
            <Kv label="State" value={row.state ?? "—"} />
            <Kv label="Topic" value={row.topic} />
            <Kv label="Audience" value={row.audience} />
            <Kv label="Group size" value={row.groupSize ? `${row.groupSize} people` : "—"} />
            <Kv
              label="Min. commitment"
              value={
                row.minCommitment ? (
                  <span className="font-semibold text-gold-dark">{row.minCommitment} participants</span>
                ) : (
                  <span className="italic text-ink-faint">Not stated</span>
                )
              }
            />
            <Kv
              label="Venue"
              value={
                row.venue ? (
                  <span className="text-xs">{row.venue}</span>
                ) : (
                  <span className="text-xs italic text-ink-faint">Not specified — pending from SPOC</span>
                )
              }
            />
            <Kv label="Preferred dates" value={row.preferredDates ?? "—"} />
            <Kv label="Received" value={row.receivedOn} />
            {row.notes ? <Kv label="Notes" value={<span className="text-xs">{row.notes}</span>} /> : null}
          </div>
        </div>

        {/* ── Who agreed to it ─────────────────────────────────────────── */}
        {mayEdit ? (
          <div>
            <div className={SEC_TITLE}>Assignment</div>
            <p className="mb-2 text-3xs text-ink-faint">
              Fill these in after your call with the practitioner — nothing is matched automatically.
            </p>

            <label className="mb-[3px] block text-2xs text-ink-muted" htmlFor={`${row.id}-assignee`}>
              Practitioner who agreed
            </label>
            <select
              id={`${row.id}-assignee`}
              value={assignee}
              disabled={pending}
              onChange={(event) => {
                const next = event.target.value;
                setAssignee(next);
                save(() => updateSessionRequestTerms(row.id, { assignedPractitionerId: next || null }));
              }}
              className={`${FIELD} mb-2.5 cursor-pointer`}
            >
              <option value="">— Not yet assigned —</option>
              {practitioners.map((practitioner) => (
                <option key={practitioner.id} value={practitioner.id}>
                  {practitioner.name}
                  {practitioner.averageRating !== null
                    ? ` — ★${practitioner.averageRating}`
                    : " — not yet rated"}
                </option>
              ))}
            </select>

            <label className="mb-[3px] block text-2xs text-ink-muted" htmlFor={`${row.id}-payout`}>
              Agreed gross payout (₹)
            </label>
            <input
              id={`${row.id}-payout`}
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={payout}
              disabled={pending}
              placeholder="e.g. 7500"
              onChange={(event) => setPayout(event.target.value)}
              onBlur={() =>
                save(() =>
                  updateSessionRequestTerms(row.id, {
                    agreedPayout: payout === "" ? null : Number(payout),
                  }),
                )
              }
              className={FIELD}
            />

            {row.sessionReference ? (
              <p className="mt-1 text-2xs text-ink-faint">→ Session {row.sessionReference}</p>
            ) : null}
          </div>
        ) : (
          <div>
            <div className={SEC_TITLE}>Assignment</div>
            <Kv label="Practitioner" value={row.assignedTo ?? "— Not yet assigned —"} />
            {row.sessionReference ? <Kv label="Session" value={row.sessionReference} /> : null}
          </div>
        )}

        {/* ── What state it is in ──────────────────────────────────────── */}
        {mayEdit ? (
          <div>
            <div className={SEC_TITLE}>Status</div>
            <label className="sr-only" htmlFor={`${row.id}-status`}>
              Request status
            </label>
            <select
              id={`${row.id}-status`}
              value={status}
              disabled={pending}
              onChange={(event) => {
                const next = event.target.value;
                setStatus(next);
                save(() => setSessionRequestStatus(row.id, next));
              }}
              className={`${FIELD} cursor-pointer`}
            >
              {["New", "Matched", "Cancelled"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className={`${HINT} mb-3`}>
              Set to Matched once you’ve filled in the practitioner and payout on the left — that creates
              the session. Set to Cancelled if the session falls through.
            </p>

            {error ? (
              <p role="alert" className="mb-3 rounded-lg border border-red-edge bg-red-light px-3 py-2 text-xs text-red">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <RowAction
                action={sendRequestFollowUp.bind(null, row.id)}
                label="Send follow-up to client"
                pendingMessage={`Sending a follow-up to ${row.name}…`}
                variant="dark"
                icon={
                  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                }
              />
              <RowAction
                action={sendRequestCancellation.bind(null, row.id)}
                label="Send cancellation message"
                pendingMessage={`Sending a cancellation to ${row.name}…`}
                variant="ghost-block"
              />
            </div>

            {row.status === "New" && mayPurge ? (
              <div className="mt-3.5 border-t border-dashed border-border-strong pt-3.5">
                <div className="mb-2 text-3xs font-semibold uppercase tracking-caps text-ink-faint">
                  Danger zone
                </div>
                <RowAction
                  action={deleteSessionRequest.bind(null, row.id)}
                  label="Delete permanently"
                  pendingMessage={`Deleting the request from ${row.name}…`}
                  variant="ghost"
                  tone="danger"
                />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">
            You have view-only access — matching and status changes are available to an Admin.
          </p>
        )}
      </div>
    </div>
  );
}
