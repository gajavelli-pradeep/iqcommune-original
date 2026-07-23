"use client";

import { useMemo, useState, useTransition } from "react";

import { checkboxClass, controlClass, selectClass } from "@/components/ui/control";

import { ScrollRegion } from "@/components/ui/ScrollRegion";

import { inviteTeamMember, removeTeamMember } from "../actions";
import { ConsoleTable, type ColumnDef } from "../ConsoleTable";
import { DownloadIcon } from "../DownloadLink";
import { StatusPill, TEAM_ROLE_STATUS } from "../StatusPill";
import { CONSOLE_ROLES, can, type ConsoleRole } from "../roles";
import type { MasterDataRow, TeamMemberRow } from "@/services/console";

/**
 * Settings — three reference-and-access sections, in V7's order.
 *
 * 1. Practitioner Master Data — a searchable, sortable, exportable contact
 *    sheet. Five fields on purpose: V7's own subtitle says full profiles live
 *    under Practitioners, and this exists for the moment someone needs to phone
 *    a practitioner.
 * 2. Team & Access — who can sign in, and the invite box that widens that set.
 * 3. Roles & Permissions — the capability matrix, Global Admin only, because it
 *    describes the boundary rather than operating within it.
 */

const SECTION_TITLE = "mb-1 text-[15px] font-semibold text-ink";
const SECTION_NOTE = "mb-4 text-xs text-ink-muted";
const CONTROL = controlClass({ tone: "inline" });
const PICKER = selectClass({ tone: "inline" });
const XS =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-2xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45";
const XS_GHOST = `${XS} border border-border-strong bg-surface text-ink-muted hover:bg-surface-soft hover:text-ink`;
const XS_DARK = `${XS} bg-ink text-surface hover:opacity-90`;

/**
 * A 44px tap area for a bare checkbox. Checkbox and radio are excluded from the
 * global coarse-pointer floor on purpose (clamping them fights their own
 * design), on the understanding that a wrapping label carries the target — and
 * a checkbox alone in a table cell has no such label.
 */
const TAP_TARGET =
  "relative [@media(any-pointer:coarse)]:after:absolute [@media(any-pointer:coarse)]:after:left-1/2 [@media(any-pointer:coarse)]:after:top-1/2 [@media(any-pointer:coarse)]:after:h-11 [@media(any-pointer:coarse)]:after:w-11 [@media(any-pointer:coarse)]:after:-translate-x-1/2 [@media(any-pointer:coarse)]:after:-translate-y-1/2 [@media(any-pointer:coarse)]:after:content-['']";

type SortKey = keyof Pick<MasterDataRow, "name" | "phone" | "email" | "city" | "state">;

const MASTER_COLUMNS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
];

/** Section 1 — the offline contact sheet. */
function MasterData({ rows }: { rows: readonly MasterDataRow[] }) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({ key: "name", ascending: true });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const cities = useMemo(
    () => [...new Set(rows.map((row) => row.city).filter((value) => value && value !== "—"))].sort(),
    [rows],
  );
  const states = useMemo(
    () => [...new Set(rows.map((row) => row.state).filter((value) => value && value !== "—"))].sort(),
    [rows],
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (city && row.city !== city) return false;
      if (state && row.state !== state) return false;
      if (!needle) return true;
      return [row.name, row.email, row.phone].some((field) => field.toLowerCase().includes(needle));
    });

    return [...filtered].sort((a, b) => {
      const compared = a[sort.key].localeCompare(b[sort.key]);
      // Tie-broken on the id so the order cannot shift between renders — the
      // same reason every service ordering carries one.
      return (sort.ascending ? compared : -compared) || a.id.localeCompare(b.id);
    });
  }, [rows, query, city, state, sort]);

  const allShownSelected = shown.length > 0 && shown.every((row) => selected.has(row.id));

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const exportHref = selected.size
    ? `/api/master-data?ids=${[...selected].map(encodeURIComponent).join(",")}`
    : "/api/master-data";

  return (
    <section className="mb-8">
      <h2 className={SECTION_TITLE}>Practitioner Master Data</h2>
      <p className={SECTION_NOTE}>
        Quick reference for offline contact — name, phone, email, city, and state only. Full profiles
        (modules, experience, payment details) live under Practitioners.
      </p>

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="master-search">
          Search practitioners
        </label>
        <input
          id="master-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, email, phone…"
          className={`${CONTROL} min-w-[200px] flex-1`}
        />
        <label className="sr-only" htmlFor="master-city">
          Filter by city
        </label>
        <select id="master-city" value={city} onChange={(event) => setCity(event.target.value)} className={PICKER}>
          <option value="">All cities</option>
          {cities.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="master-state">
          Filter by state
        </label>
        <select id="master-state" value={state} onChange={(event) => setState(event.target.value)} className={PICKER}>
          <option value="">All states</option>
          {states.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <span className="text-xs text-ink-faint">
          {shown.length} of {rows.length}
        </span>
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink-muted">{selected.size} selected</span>
        <div className="flex gap-2">
          <a
            href={exportHref}
            aria-disabled={selected.size === 0}
            className={`${XS_GHOST} ${selected.size === 0 ? "pointer-events-none opacity-45" : ""}`}
          >
            <DownloadIcon />
            Download selected
          </a>
          <a href="/api/master-data" className={XS_DARK}>
            <DownloadIcon />
            Download all
          </a>
        </div>
      </div>

      <ScrollRegion ariaLabel="Practitioner master data" axis="x" className="bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">Practitioner master data</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-7 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allShownSelected}
                  aria-label="Select all practitioners shown"
                  onChange={(event) =>
                    setSelected(event.target.checked ? new Set(shown.map((row) => row.id)) : new Set())
                  }
                  className={`${checkboxClass} ${TAP_TARGET}`}
                />
              </th>
              {MASTER_COLUMNS.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3">
                  {/* A real button, not a click handler on the <th>: sorting is
                      an action, and V7's bare cursor:pointer cannot be reached
                      from a keyboard. */}
                  <button
                    type="button"
                    onClick={() =>
                      setSort((current) =>
                        current.key === column.key
                          ? { key: column.key, ascending: !current.ascending }
                          : { key: column.key, ascending: true },
                      )
                    }
                    aria-label={`Sort by ${column.label}`}
                    className="flex items-center gap-1 text-2xs font-semibold uppercase tracking-caps text-ink-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [@media(any-pointer:coarse)]:min-w-11"
                  >
                    {column.label}{" "}
                    <span aria-hidden className={sort.key === column.key ? "text-gold-dark" : "opacity-40"}>
                      {sort.key === column.key ? (sort.ascending ? "↑" : "↓") : "⇅"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    aria-label={`Select ${row.name}`}
                    onChange={() => toggle(row.id)}
                    className={`${checkboxClass} ${TAP_TARGET}`}
                  />
                </td>
                <td className="px-4 py-3 align-top text-base font-medium text-ink">{row.name}</td>
                <td className="px-4 py-3 align-top text-xs text-ink-muted">{row.phone}</td>
                <td className="px-4 py-3 align-top text-xs text-ink-muted">{row.email}</td>
                <td className="px-4 py-3 align-top text-xs text-ink-muted">{row.city}</td>
                <td className="px-4 py-3 align-top text-xs text-ink-muted">{row.state}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>

      {shown.length === 0 ? (
        <p className="mt-3 rounded-lg border border-border bg-surface px-6 py-6 text-center text-sm text-ink-muted">
          No practitioners match your search or filters.
        </p>
      ) : null}
    </section>
  );
}

/** The per-row remove, which can legitimately refuse (the last Global Admin). */
function RemoveMember({ row }: { row: TeamMemberRow }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await removeTeamMember(row.id);
            setError(result.ok ? null : result.message);
          })
        }
        className={`${XS_GHOST} border-red-edge text-red hover:text-red`}
      >
        {pending ? "Removing…" : row.pending ? "Withdraw invite" : "Remove"}
      </button>
      {error ? (
        <p role="alert" className="mt-1 max-w-[220px] text-3xs text-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Section 2 — who can sign in. */
function TeamAccess({ rows, role }: { rows: readonly TeamMemberRow[]; role: ConsoleRole }) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ConsoleRole>("user");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const columns: ReadonlyArray<ColumnDef<TeamMemberRow>> = [
    { key: "name", header: "Name", render: (row) => <span className="font-medium text-ink">{row.name}</span> },
    { key: "email", header: "Email", render: (row) => <span className="text-xs text-ink-muted">{row.email}</span> },
    {
      key: "role",
      header: "Role",
      render: (row) => <StatusPill {...TEAM_ROLE_STATUS[row.roleLabel as keyof typeof TEAM_ROLE_STATUS]} />,
    },
    {
      key: "lastActive",
      header: "Last active",
      render: (row) =>
        // An invite nobody accepted is why a colleague "can't get in", so it
        // says so rather than showing an empty cell.
        //
        // It used to say "Invite sent" whenever the invite row existed, which
        // is a fact about the database and not about anyone's inbox: with
        // delivery switched off the banner above said no email was sent and
        // this said the opposite, on the same screen. It now reads the delivery
        // the email log recorded. Amber, not red — the invite is real and
        // recoverable, it just has not reached anyone yet.
        row.pending ? (
          <span
            className={`text-xs ${
              row.expired ? "text-red" : row.emailDelivered === false ? "text-attention" : "text-gold-dark"
            }`}
          >
            {row.expired
              ? "Invite expired"
              : row.emailDelivered === false
                ? "Created — email not sent"
                : "Invite sent — not yet accepted"}
          </span>
        ) : (
          <span className="text-xs text-ink-muted">{row.lastActive}</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      requires: "manageTeam",
      render: (row) => <RemoveMember key={row.id} row={row} />,
    },
  ];

  return (
    <section className="mb-8">
      <h2 className={SECTION_TITLE}>Team &amp; Access</h2>
      <p className={SECTION_NOTE}>
        Everyone below can sign in to this console. Their role determines what they can do once inside.
      </p>

      <ConsoleTable
        caption="Console team"
        columns={columns}
        rows={rows}
        role={role}
        rowKey={(row) => row.id}
        empty="No console accounts yet."
      />

      {can(role, "manageTeam") ? (
        <div className="mt-3.5 rounded-lg bg-surface-soft px-4 py-3.5">
          <p className="mb-2 text-xs font-semibold text-ink">Invite a new team member</p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="invite-email">
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className={`${CONTROL} min-w-[200px] flex-[2]`}
            />
            <label className="sr-only" htmlFor="invite-role">
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as ConsoleRole)}
              className={`${PICKER} min-w-[130px] flex-1`}
            >
              {CONSOLE_ROLES.map((value) => (
                <option key={value} value={value}>
                  {value === "global_admin" ? "Global Admin" : value === "admin" ? "Admin" : "User"}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pending || !email.trim()}
              onClick={() =>
                start(async () => {
                  const result = await inviteTeamMember(email, inviteRole);
                  setMessage(
                    result.ok
                      ? { ok: true, text: `Invite sent to ${email.trim().toLowerCase()}.` }
                      : { ok: false, text: result.message },
                  );
                  if (result.ok) setEmail("");
                })
              }
              className="inline-flex items-center gap-[7px] rounded-lg bg-ink px-3.5 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-45"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {pending ? "Sending…" : "Send invite"}
            </button>
          </div>

          {message ? (
            <p role={message.ok ? "status" : "alert"} className={`mt-2 text-xs ${message.ok ? "text-green" : "text-red"}`}>
              {message.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Section 3 — the capability matrix, verbatim from V7. */
const CAPABILITIES: ReadonlyArray<{ capability: string; global: boolean; admin: boolean; user: boolean }> = [
  {
    capability: "View all data (requests, practitioners, sessions, agreements, payouts, photos)",
    global: true,
    admin: true,
    user: true,
  },
  { capability: "Download & export (photos, agreements, reports)", global: true, admin: true, user: true },
  {
    capability: "Add, edit & delete platform data (sessions, practitioners, photos, payouts, etc.)",
    global: true,
    admin: true,
    user: false,
  },
  { capability: "Send communications (agreements, reminders, confirmations)", global: true, admin: true, user: false },
  { capability: "Invite a new Admin or User", global: true, admin: false, user: false },
  { capability: "Remove an Admin or User", global: true, admin: false, user: false },
  { capability: "View platform-wide Activity log", global: true, admin: false, user: false },
];

function Permissions() {
  const mark = (allowed: boolean) => (
    <span className={allowed ? "text-green" : "text-ink-faint"}>
      <span className="sr-only">{allowed ? "Yes" : "No"}</span>
      <span aria-hidden>{allowed ? "✓" : "—"}</span>
    </span>
  );

  return (
    <section>
      <h2 className={SECTION_TITLE}>Roles &amp; Permissions</h2>
      <p className={SECTION_NOTE}>Reference — what each role can and can&apos;t do across the console.</p>

      <ScrollRegion ariaLabel="Roles and permissions" axis="x" className="bg-surface">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <caption className="sr-only">What each console role may do</caption>
          <thead>
            <tr className="border-b border-border">
              {["Capability", "Global Admin", "Admin", "User"].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-4 py-3 text-2xs font-semibold uppercase tracking-caps text-ink-faint"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map((row) => (
              <tr key={row.capability} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 text-sm text-ink">{row.capability}</td>
                <td className="px-4 py-3">{mark(row.global)}</td>
                <td className="px-4 py-3">{mark(row.admin)}</td>
                <td className="px-4 py-3">{mark(row.user)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </section>
  );
}

export function SettingsPanel({
  role,
  team,
  masterData,
}: {
  role: ConsoleRole;
  team: readonly TeamMemberRow[];
  masterData: readonly MasterDataRow[];
}) {
  return (
    <>
      <MasterData rows={masterData} />
      <TeamAccess rows={team} role={role} />
      {/* V7 marks this section `role-override` — Global Admin only. It
          describes the permission boundary, so it sits with the role that
          administers it rather than the roles it constrains. */}
      {can(role, "override") ? <Permissions /> : null}
    </>
  );
}
