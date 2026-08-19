"use client";

import { useMemo, useState, useTransition } from "react";

import { controlClass, selectClass } from "@/components/ui/control";

import {
  deleteSessionRequest,
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
// Separate from `FIELD` because it feeds two `<select>`s (client, 2026-08-18):
// `controlClass` alone left the assignee and status dropdowns without the
// hover-edge/answered-fill states every other console select has, since
// those states are `selectClass`-only.
const SELECT = selectClass({ tone: "inline", className: "min-w-[118px]" });
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
   * Only the practitioners who can actually take this request.
   *
   * Matched by state, not city (client, 2026-08-19 — was city until now).
   * Compared with case and padding stripped, same reasoning as the city match
   * this replaces: no aliases, no guessing which two spellings mean one place.
   *
   * Falls back to city when either side has no state recorded: `state` on a
   * practitioner is null for any record older than migration 0017, and a
   * request predating the state field carries the same gap. Neither side can
   * be compared to a state it doesn't have, so falling back to the
   * finer-grained field that both are more likely to carry is closer to the
   * old behaviour than either matching nothing or matching everything.
   *
   * Filtered here rather than in the query because the panel reads one list
   * and hands the same array to every request, each with its own state.
   */
  const local = useMemo(() => {
    const wantedState = row.state?.trim().toLowerCase();
    if (wantedState) {
      return practitioners.filter((practitioner) => practitioner.state?.trim().toLowerCase() === wantedState);
    }
    const wantedCity = row.city.trim().toLowerCase();
    return practitioners.filter((practitioner) => practitioner.city.trim().toLowerCase() === wantedCity);
  }, [practitioners, row.city, row.state]);

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
              {/* Names whichever field `local` actually matched on — state when
                  the request has one, city when it falls back (see `local`). */}
              <span className="text-ink-faint"> — based in {row.state ?? row.city}</span>
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
              className={`${SELECT} mb-2.5`}
            >
              <option value="">— Not yet assigned —</option>
              {local.map((practitioner) => (
                <option key={practitioner.id} value={practitioner.id}>
                  {practitioner.name}
                  {practitioner.averageRating !== null
                    ? ` — ★${practitioner.averageRating}`
                    : " — not yet rated"}
                </option>
              ))}
            </select>
            {local.length === 0 ? (
              // Said rather than left blank: a dropdown holding nothing but its
              // own placeholder reads as a list that failed to load, and an
              // admin would go looking for the fault instead of for a
              // practitioner.
              <p className="mb-2.5 -mt-1.5 text-3xs text-attention">
                No empanelled practitioner is based in {row.state ?? row.city}.
              </p>
            ) : null}

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
              className={SELECT}
            >
              {["New", "Matched", "Cancelled"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <p className={`${HINT} mb-3`}>
              Set to Matched once you’ve filled in the practitioner and payout on the left. Cancellations
              are handled from Session Consent, Part 2, once a session exists.
            </p>

            {error ? (
              <p role="alert" className="mb-3 rounded-lg border border-red-edge bg-red-light px-3 py-2 text-xs text-red">
                {error}
              </p>
            ) : null}

            <RowAction
              action={sendRequestFollowUp.bind(null, row.id)}
              draft={{ kind: "request-follow-up", id: row.id }}
              // V7's own label (line 1833). This read "Send follow-up to
              // client", then "Send update to client" for a day, and is now
              // back in step with the prototype — no departure left to track.
              //
              // The message stopped being a chase when the delivered
              // console-messages document rewrote it: it reports that a
              // practitioner is being aligned rather than asking for
              // anything, which is what "status update" says and "follow-up"
              // did not.
              label="Send status update to client"
              pendingMessage={`Sending an update to ${row.name}…`}
              variant="dark"
              icon={
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }
            />

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
