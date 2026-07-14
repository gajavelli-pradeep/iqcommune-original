"use client";

import { useState, useCallback, useEffect, useId, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/shared/StatusPill";
import { PipelineStepper } from "@/components/shared/PipelineStepper";
import type { Database } from "@/lib/supabase/database.types";
import { AdminTable, TD } from "@/components/admin/AdminTable";
import { PendingBar } from "@/components/admin/PendingBar";
import { useDateFilter } from "@/lib/admin/use-date-filter";
import { initials } from "@/lib/format";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useUndoToast } from "@/components/admin/useUndoToast";
import { ContactDraftModal } from "@/components/admin/ContactDraftModal";

type SubsectionAverages = Database["public"]["Views"]["practitioner_subsection_averages"]["Row"];
type Practitioner = Database["public"]["Tables"]["practitioners"]["Row"] & {
  subsection_averages?: SubsectionAverages | null;
};

const STATUSES = [
  "Applied",
  "Screening Done",
  "Agreement Sent",
  "Empanelled",
  "Rejected",
] as const;

// V5 practitioner status filter (Practitioners tab only, per the mockup): a
// "Filter:" label + pill chips. Active chip = ink fill + surface label.
const filterRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  padding: "0 0 1rem",
};
const filterLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: "var(--ink-faint)",
  marginRight: 2,
  whiteSpace: "nowrap",
};
function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: "5px 14px",
    borderRadius: 100,
    fontSize: 12,
    fontWeight: 500,
    border: `1px solid ${active ? "var(--ink)" : "rgba(20,18,12,.18)"}`,
    background: active ? "var(--ink)" : "var(--surface)",
    color: active ? "var(--surface)" : "var(--ink-soft)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  };
}

// V5-MATCH: the mockup's practitioner profile has no Payment-details block,
// Feedback-breakdown, or "Edit details" button — gated off (re-enablable).
const SHOW_OFFSPEC_ACTIONS = false;

// V5 §3.3/§5 stage-gated Danger Zone: exactly one of Delete/Deactivate per stage.
// Hard delete only before there's empanelment history; Deactivate (reversible) once
// an agreement/empanelment exists. A status in neither set (e.g. Deactivated) shows no
// destructive control. `readonly string[]` so `.includes(p.status)` accepts a plain string.
const DELETABLE_STATUSES: readonly string[] = ["Applied", "Screening Done", "Rejected"];
const DEACTIVATABLE_STATUSES: readonly string[] = ["Agreement Sent", "Empanelled"];

// ── Draft-message templates (plain text, copy/paste — mirrors RequestTable) ──────

interface DraftState {
  open: boolean;
  title?: string;
  subject?: string;
  emailBody?: string;
  waBody?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

function buildWelcomeEmail(name: string): string {
  return `Dear ${name},

Congratulations — you're now empanelled with iqcommune.

We're delighted to welcome you to our practitioner network. Our coordinator will be in touch shortly with session scheduling and next steps.

In the meantime, feel free to reply to this email with any questions.

Warm regards,
The iqcommune Team`;
}

function buildWelcomeWA(name: string): string {
  return `Hi ${name}! 👋

Congratulations — you're now *empanelled* with iqcommune! 🎉

Welcome to our practitioner network. Our coordinator will reach out shortly with session scheduling and next steps.

Reach out any time if you have questions!`;
}

function buildRejectEmail(name: string): string {
  return `Dear ${name},

Thank you for your interest in joining the iqcommune practitioner network, and for the time you invested in your application.

After careful review, we're unable to move forward with your empanelment at this stage. This is not a reflection of your expertise — our current cohort needs are simply specific, and we keep applications on file for future openings.

We genuinely appreciate your interest and wish you the very best.

Warm regards,
The iqcommune Team`;
}

function buildRejectWA(name: string): string {
  return `Hi ${name},

Thank you for applying to the iqcommune practitioner network. After careful review, we're unable to move forward with your empanelment at this stage. We'll keep your application on file for future openings.

We truly appreciate your interest and wish you the best.

— The iqcommune Team`;
}

function buildGeneralEmail(name: string): string {
  return `Dear ${name},

[Write your message here.]

Warm regards,
The iqcommune Team`;
}

function buildGeneralWA(name: string): string {
  return `Hi ${name}! 👋

[Write your message here.]

— The iqcommune Team`;
}

export function PractitionerTable({
  initialData,
  onStatusChange,
  filter: filterProp,
  onFilterChange,
  isGlobalAdmin = false,
  readOnly = false,
  onHardDeleted,
  onEdit,
}: {
  initialData: Practitioner[];
  onStatusChange?: (id: string, status: string) => void;
  filter?: string;
  onFilterChange?: (f: string) => void;
  isGlobalAdmin?: boolean;
  readOnly?: boolean;
  onHardDeleted?: (id: string) => void;
  onEdit?: (p: Practitioner) => void;
}) {
  const [data, setData] = useState(initialData);
  const router = useRouter();

  // Sync when parent adds/edits a practitioner (e.g. via PractitionerFormModal).
  // Render-phase prop-adjust (React-recommended) instead of an effect — mirrors
  // RequestTable and avoids the extra render a setState-in-effect would cause.
  const [prevInitial, setPrevInitial] = useState(initialData);
  if (prevInitial !== initialData) { setPrevInitial(initialData); setData(initialData); }

  const [internalFilter, setInternalFilter] = useState<string>("All");
  const filter = filterProp ?? internalFilter;
  const setFilter = onFilterChange ?? setInternalFilter;
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [genLink, setGenLink] = useState<{ url: string; refCode: string; practitioner: Practitioner } | null>(null);
  const [toast, setToast] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));
  const undo = useUndoToast();

  // V5 act-then-undo: delete immediately (soft), offer ~9s to Undo (restore via trash).
  async function deletePractitionerWithUndo(p: Practitioner) {
    setData((prev) => prev.filter((pr) => pr.id !== p.id));
    onHardDeleted?.(p.id);
    setExpandedRow(null);
    const res = await fetch(`/api/admin/global/practitioners/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      setData((prev) => [p, ...prev]);
      showToast("Delete failed — please try again.");
      return;
    }
    undo.show(`${p.name} deleted`, async () => {
      await fetch("/api/admin/global/trash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table: "practitioners", id: p.id }),
      });
      setData((prev) => [p, ...prev]);
    });
  }
  const [draft, setDraft] = useState<DraftState>({ open: false });
  // Track which row triggered a modal so focus can be restored on close
  const lastFocusRef = useRef<HTMLElement | null>(null);

  // Status-aware draft: welcome on Empanelled, reject on Rejected, neutral otherwise.
  const openDraft = useCallback((p: Practitioner, statusForDraft: string = p.status) => {
    let title: string, subject: string, emailBody: string, waBody: string;
    if (statusForDraft === "Empanelled") {
      title = `Welcome: ${p.name}`;
      subject = "Welcome to the iqcommune practitioner network";
      emailBody = buildWelcomeEmail(p.name);
      waBody = buildWelcomeWA(p.name);
    } else if (statusForDraft === "Rejected") {
      title = `Application update: ${p.name}`;
      subject = "Update on your iqcommune practitioner application";
      emailBody = buildRejectEmail(p.name);
      waBody = buildRejectWA(p.name);
    } else {
      title = `Message: ${p.name}`;
      subject = `iqcommune — ${p.name}`;
      emailBody = buildGeneralEmail(p.name);
      waBody = buildGeneralWA(p.name);
    }
    setDraft({
      open: true,
      title,
      subject,
      emailBody,
      waBody,
      recipientName: p.name,
      recipientEmail: p.email,
      recipientPhone: p.phone ?? undefined,
    });
  }, []);

  const closeDraft = useCallback(() => {
    setDraft({ open: false });
    setTimeout(() => lastFocusRef.current?.focus(), 0);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: string): Promise<boolean> => {
      const res = await fetch(`/api/admin/practitioners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        // Mirror the server's prev_status bookkeeping (P1-3) so a Revert affordance
        // appears immediately after a one-way Empanel/Reject, without a refetch.
        const isOneWayGate = status === "Empanelled" || status === "Rejected";
        setData((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, status, prev_status: isOneWayGate ? p.status : null }
              : p,
          )
        );
        onStatusChange?.(id, status);
        showToast(`Status updated to "${status}"`);
        return true;
      }
      showToast("Failed to update status");
      return false;
    },
    [showToast, onStatusChange]
  );

  // V5 P1-3: reversible Danger Zone actions (deactivate / reactivate / revert).
  const lifecycle = useCallback(
    async (id: string, action: "deactivate" | "reactivate" | "revert") => {
      const res = await fetch(`/api/admin/practitioners/${id}/lifecycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const { status } = (await res.json()) as { status: string };
        setData((prev) =>
          prev.map((p) => {
            if (p.id !== id) return p;
            if (action === "deactivate") return { ...p, status, prev_active_status: p.status };
            if (action === "reactivate") return { ...p, status, prev_active_status: null };
            return { ...p, status, prev_status: null }; // revert
          })
        );
        onStatusChange?.(id, status);
        showToast(
          action === "deactivate" ? "Practitioner deactivated"
          : action === "reactivate" ? "Practitioner reactivated"
          : "Status reverted",
        );
      } else {
        const { error } = await res.json().catch(() => ({ error: "" }));
        showToast(error || "Action failed");
      }
    },
    [showToast, onStatusChange]
  );

  const generateLink = useCallback(
    async (p: Practitioner) => {
      const res = await fetch("/api/admin/onboarding-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practitionerId: p.id }),
      });
      if (res.ok) {
        const body = await res.json();
        setGenLink({ ...body, practitioner: p });
        // API advances status server-side; reflect immediately in local state.
        setData((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "Agreement Sent" } : pr));
        onStatusChange?.(p.id, "Agreement Sent");
      } else {
        showToast("Failed to generate link");
      }
    },
    [showToast, onStatusChange]
  );

  const sendAgreementEmail = useCallback(
    async (p: Practitioner, url: string) => {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "agreement-link",
          to: p.email,
          name: p.name,
          onboardingUrl: url,
        }),
      });
      if (res.ok) {
        setGenLink(null);
        showToast("Agreement link sent via email");
      } else {
        showToast("Email failed — copy link manually");
      }
    },
    [showToast]
  );

  function closeGenLink() {
    setGenLink(null);
    // Generating a link creates a "Pending signature" agreement server-side.
    // Refresh so that row appears in the Agreements tab without a manual reload
    // (AdminConsoleView re-syncs agreementsData from the refreshed server props).
    router.refresh();
    setTimeout(() => (lastFocusRef.current as HTMLElement | null)?.focus(), 0);
  }

  const df = useDateFilter(data.map((p) => p.created_at));
  // V5 pending = anyone not yet Empanelled or Rejected (a predicate, not one status).
  // "__pending" is a sentinel value the pending card toggles; the Filter chips set
  // a single exact status. Both feed the row filter below.
  const isPending = (status: string) => status !== "Empanelled" && status !== "Rejected";
  const visible = (
    filter === "All" ? data
    : filter === "__pending" ? data.filter((p) => isPending(p.status))
    : data.filter((p) => p.status === filter)
  ).filter((p) => df.matchesDate(p.created_at));
  const pendingCount = data.filter((p) => isPending(p.status) && df.matchesDate(p.created_at)).length;

  return (
    <div>
      <PendingBar
        pendingCards={[{
          count: pendingCount,
          label: "Pending action (not yet Empanelled/Rejected)",
          active: filter === "__pending",
          onToggle: () => setFilter(filter === "__pending" ? "All" : "__pending"),
        }]}
        dateFilter={df.control}
        dateLabel="Applied in:"
      />

      {/* V5 status filter — Practitioners tab only (per the mockup). */}
      <div style={filterRowStyle}>
        <span style={filterLabelStyle}>Filter:</span>
        {(["All", ...STATUSES] as const).map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              aria-pressed={active}
              style={chipStyle(active)}
            >
              {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <AdminTable
        headers={["Practitioner", "Module", "City", "Applied on", "Status"]}
        isEmpty={visible.length === 0}
        emptyText="No practitioners match this filter."
        connected
      >
        {visible.map((p) => {
              const isExpanded = expandedRow === p.id;
              return (
                <Fragment key={p.id}>
                  <tr
                    tabIndex={0}
                    style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(20,18,12,.07)", cursor: "pointer", background: isExpanded ? "#f8f7f4" : undefined }}
                    onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpandedRow(isExpanded ? null : p.id);
                      }
                    }}
                  >
                    {/* Practitioner — avatar + name (primary) + role (sub-line) */}
                    <td style={TD}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#f5e9c8", color: "#8a6510", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {initials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.role}</div>
                        </div>
                      </div>
                    </td>
                    {/* Module */}
                    <td style={{ ...TD, fontSize: 12, color: "var(--ink-soft)" }}>{(p.modules ?? []).join(", ") || "—"}</td>
                    {/* City */}
                    <td style={TD}>
                      <div>{p.city}</div>
                      {p.state && <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>{p.state}</div>}
                    </td>
                    {/* Applied on */}
                    <td style={{ ...TD, fontSize: 12, color: "var(--ink-faint)", whiteSpace: "nowrap" }}>
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={TD}>
                      <StatusPill status={p.status} />
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr style={{ borderBottom: "1px solid rgba(20,18,12,.07)" }}>
                      <td colSpan={5} style={{ padding: "0 12px 14px", background: "#f8f7f4" }}>
                        <div style={{ border: "1px solid rgba(20,18,12,.10)", borderRadius: 8, background: "#fff", padding: "1rem 1.25rem", borderTop: "2px solid #c9982a" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "2rem", alignItems: "start" }}>
                            {/* Col 1: Profile details */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.85rem" }}>Profile</div>
                              {[
                                ["Ref", p.ref_code ? `IQC-EMP-${p.ref_code}` : "—"],
                                ["Email", p.email],
                                ["Phone", p.phone ?? "—"],
                                ["Role", p.role],
                                ["Org", p.org ?? "Independent"],
                                ["City", p.city],
                                ["State", p.state || "—"],
                                ["Experience", p.experience ?? "—"],
                                ["Modules", (p.modules ?? []).join(", ") || "—"],
                                ["Availability", p.teach_freq ?? "—"],
                                // V5: welcome-kit intake fields. Legacy records (applied before
                                // these existed) read "Not provided" — real data state, not a bug.
                                ["Address", p.communication_address || "Not provided — collected on newer applications"],
                                ["T-shirt size", p.tshirt_size || "Not provided"],
                              ].map(([label, value]) => (
                                <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: "0.45rem" }}>
                                  <span style={{ color: "var(--ink-faint)", width: 90, flexShrink: 0, fontSize: 12 }}>{label}</span>
                                  <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13, minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
                                </div>
                              ))}
                              {p.why && (
                                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(20,18,12,.07)" }}>
                                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 4 }}>Why teach</div>
                                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink)" }}>{p.why}</div>
                                </div>
                              )}
                              {SHOW_OFFSPEC_ACTIONS && p.subsection_averages && (p.subsection_averages.rated_sessions ?? 0) > 0 && (
                                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(20,18,12,.07)" }}>
                                  <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 6 }}>
                                    Feedback breakdown · {p.subsection_averages.rated_sessions} rated
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                                    {([
                                      ["Content", p.subsection_averages.content_avg],
                                      ["Delivery", p.subsection_averages.delivery_avg],
                                      ["Engagement", p.subsection_averages.engagement_avg],
                                      ["Logistics", p.subsection_averages.logistics_avg],
                                    ] as const).map(([label, value]) => value != null && (
                                      <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                                        <span style={{ color: "var(--ink-faint)" }}>{label}</span>
                                        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{Number(value).toFixed(1)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Col 2: Pipeline progress */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.85rem" }}>Pipeline Progress</div>
                              {/* cap width so the right-aligned date sits near its label, not at the far column edge */}
                              <div style={{ maxWidth: 240 }}>
                                <PipelineStepper
                                  status={p.status}
                                  timestamps={{
                                    Applied:            p.created_at ?? undefined,
                                    "Screening Done":   p.screened_at ?? undefined,
                                    "Agreement Sent":   p.agreement_sent_at ?? undefined,
                                    Empanelled:         p.empanelled_at ?? undefined,
                                  }}
                                />
                              </div>
                            </div>

                            {/* Col 3: Actions (read-only tier sees payment details only) */}
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.85rem" }}>{readOnly ? "Details" : "Update Status"}</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                {!readOnly && p.status !== "Deactivated" && (
                                <select
                                  value={p.status}
                                  onChange={(e) => { e.stopPropagation(); updateStatus(p.id, e.target.value); }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(20,18,12,.18)", fontFamily: "inherit", fontSize: 13, color: "var(--ink)", background: "#f8f7f4", outline: "none", cursor: "pointer" }}
                                >
                                  {/* Empanelled/Rejected are button-only gates — not forward dropdown choices;
                                      show them only when they're the current value. A legacy off-pipeline
                                      status (e.g. "Under Review", removed from STATUSES) is prepended so the
                                      select displays the real value instead of falling back to the first option. */}
                                  {((STATUSES as readonly string[]).includes(p.status) ? STATUSES : [p.status, ...STATUSES])
                                    .filter((s) => (s !== "Empanelled" && s !== "Rejected") || s === p.status)
                                    .map((s) => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                )}

                                {/* Message + Notes */}
                                {!readOnly && (
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      lastFocusRef.current = e.currentTarget;
                                      openDraft(p);
                                    }}
                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f8f7f4", border: "1px solid rgba(20,18,12,.15)", borderRadius: 8, padding: "9px 10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "var(--ink)" }}
                                  >
                                    <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                    Message
                                  </button>
                                  <button
                                    disabled
                                    title="Coming soon"
                                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#f8f7f4", border: "1px solid rgba(20,18,12,.10)", borderRadius: 8, padding: "9px 10px", fontSize: 13, cursor: "not-allowed", fontFamily: "inherit", color: "var(--ink-faint)", opacity: 0.6 }}
                                  >
                                    <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Notes
                                  </button>
                                </div>
                                )}

                                {!readOnly && p.status === "Screening Done" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); lastFocusRef.current = e.currentTarget; generateLink(p); }}
                                    style={{ background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    Generate agreement link
                                  </button>
                                )}

                                {/* V4 terminal gates: green Empanel (only at Agreement Sent) + red Reject (any non-terminal).
                                    Each sets the status and opens the matching welcome / reject draft. */}
                                {!readOnly && p.status === "Agreement Sent" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      lastFocusRef.current = e.currentTarget;
                                      // Keep the pre-written welcome draft instant; offer 9s to Undo
                                      // (reverses only the status via the lifecycle revert path).
                                      openDraft(p, "Empanelled");
                                      void updateStatus(p.id, "Empanelled").then((ok) => {
                                        if (ok) undo.show(`${p.name} empanelled`, () => lifecycle(p.id, "revert"));
                                      });
                                    }}
                                    style={{ background: "var(--green)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    Empanel practitioner
                                  </button>
                                )}
                                {!readOnly && p.status !== "Empanelled" && p.status !== "Rejected" && p.status !== "Deactivated" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      lastFocusRef.current = e.currentTarget;
                                      // Keep the pre-written reject draft instant; offer 9s to Undo
                                      // (reverses only the status via the lifecycle revert path).
                                      openDraft(p, "Rejected");
                                      void updateStatus(p.id, "Rejected").then((ok) => {
                                        if (ok) undo.show(`${p.name} rejected`, () => lifecycle(p.id, "revert"));
                                      });
                                    }}
                                    style={{ background: "#fff", color: "var(--red)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    Reject
                                  </button>
                                )}

                                {/* V5 P1-3 reversible lifecycle: Reactivate a deactivated practitioner,
                                    or Revert a one-way Empanel/Reject to its prior status. */}
                                {!readOnly && p.status === "Deactivated" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); lifecycle(p.id, "reactivate"); }}
                                    style={{ background: "var(--green)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    Reactivate practitioner
                                  </button>
                                )}
                                {!readOnly && p.status !== "Deactivated" && p.prev_status && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmDialog({
                                        open: true,
                                        title: `Revert to ${p.prev_status}`,
                                        description: `Revert this practitioner to ${p.prev_status}?`,
                                        onConfirm: () => { closeConfirm(); lifecycle(p.id, "revert"); },
                                      });
                                    }}
                                    style={{ background: "#fff", color: "var(--ink)", border: "1px solid rgba(20,18,12,.18)", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    Revert to {p.prev_status}
                                  </button>
                                )}

                                {SHOW_OFFSPEC_ACTIONS && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(20,18,12,.08)" }}>
                                  <div style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const, marginBottom: 6 }}>Payment details</div>
                                  {/* No payment_method column — method is derived from which fields are filled.
                                      "Invoice name" is the bank_name (name as per bank account) column. */}
                                  {[
                                    ["Method", p.upi_id ? "UPI" : p.bank_account ? "Bank transfer" : "Not provided"],
                                    ["UPI", p.upi_id || "Not provided"],
                                    ["Invoice name", p.bank_name || "Not provided"],
                                    ["Account", p.bank_account || "Not provided"],
                                    ["IFSC", p.ifsc || "Not provided"],
                                  ].map(([label, value]) => (
                                    <div key={String(label)} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 12 }}>
                                      <span style={{ color: "var(--ink-faint)", minWidth: 60, flexShrink: 0 }}>{label}</span>
                                      <span style={{ fontFamily: "monospace", fontWeight: 500, minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-all" }}>{value}</span>
                                    </div>
                                  ))}
                                </div>
                                )}

                                {SHOW_OFFSPEC_ACTIONS && isGlobalAdmin && onEdit && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", color: "var(--ink)", border: "1px solid rgba(20,18,12,.18)", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Edit details
                                  </button>
                                )}

                                {/* V5 §3.3/§5 stage-gated Danger Zone — EXACTLY ONE control per stage:
                                    Deactivate (reversible, keeps history) for Agreement Sent / Empanelled;
                                    hard Delete (Global-Admin only) for records without history
                                    (Applied / Screening Done / Rejected). Never both at once. */}
                                {!readOnly && (DEACTIVATABLE_STATUSES.includes(p.status) || (isGlobalAdmin && DELETABLE_STATUSES.includes(p.status))) && (
                                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--amber)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)" }}>Danger zone</div>
                                    {DEACTIVATABLE_STATUSES.includes(p.status) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDialog({
                                            open: true,
                                            title: `Deactivate ${p.name}`,
                                            description: "This parks the practitioner as Deactivated and keeps their full history. You can Reactivate them at any time to restore their current status.",
                                            onConfirm: () => { closeConfirm(); lifecycle(p.id, "deactivate"); },
                                          });
                                        }}
                                        style={{ width: "100%", background: "var(--amber-light)", color: "var(--amber)", border: "1px solid var(--amber)", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                      >
                                        Deactivate practitioner
                                      </button>
                                    )}
                                    {isGlobalAdmin && DELETABLE_STATUSES.includes(p.status) && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deletePractitionerWithUndo(p); }}
                                        style={{ width: "100%", background: "var(--red-light)", color: "var(--red)", border: "1px solid var(--red-border)", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                      >
                                        Delete practitioner
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
      </AdminTable>

      {/* Generated link modal */}
      {genLink && (
        <Modal onClose={closeGenLink} title="Agreement link generated">
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            Copy this link and send manually, or click &ldquo;Send via email&rdquo; to deliver automatically.
          </p>
          <div style={{ background: "#f8f7f4", border: "1px solid rgba(20,18,12,.1)", borderRadius: 8, padding: "10px 12px", fontSize: 12, wordBreak: "break-all", marginBottom: 16, color: "var(--ink)", fontFamily: "monospace" }}>
            {genLink.url}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(genLink.url);
                  showToast("Copied!");
                } catch {
                  showToast("Copy failed — select and copy manually");
                }
              }}
              style={btnStyle("rgba(20,18,12,.07)", "var(--ink)")}
            >
              Copy link
            </button>
            <button
              onClick={() => sendAgreementEmail(genLink.practitioner, genLink.url)}
              style={btnStyle("#c9982a", "#14161d")}
            >
              Send via email
            </button>
          </div>
        </Modal>
      )}

      {/* Persistent aria-live region — must stay in DOM even when empty so announcements fire reliably */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: toast ? "var(--ink)" : "transparent",
          color: "#fff",
          padding: toast ? "10px 18px" : 0,
          borderRadius: 8,
          fontSize: 13,
          zIndex: 9999,
          transition: "background .15s",
          pointerEvents: "none",
        }}
      >
        {toast}
      </div>
      {undo.node}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
      <ContactDraftModal
        open={draft.open}
        onClose={closeDraft}
        title={draft.title}
        subject={draft.subject}
        emailBody={draft.emailBody}
        waBody={draft.waBody}
        recipientName={draft.recipientName}
        recipientEmail={draft.recipientEmail}
        recipientPhone={draft.recipientPhone}
      />
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus first focusable element on open
  useEffect(() => {
    const el = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href]'
    );
    el?.focus();
  }, []);

  // Close on Escape; trap Tab within dialog
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ background: "#fff", borderRadius: 12, padding: "1.5rem", maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 id={titleId} style={{ fontWeight: 600, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "var(--ink-faint)" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 500 };
}

