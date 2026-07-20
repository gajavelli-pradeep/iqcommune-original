"use client";

import { useState, useEffect, useId, useRef, Fragment } from "react";
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
import { useSendWithUndo } from "@/components/admin/useSendWithUndo";
import { sendMessageRequest } from "@/lib/admin/send-message";

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
// Per the mockup's `.filter-bar`, this is the table card's top strip — it carries
// the frame's top edge so the `connected` AdminTable below continues it unbroken.
const filterRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
  background: "var(--surface)",
  border: "1px solid rgba(15,17,23,.10)",
  borderBottom: "none",
  borderRadius: "10px 10px 0 0",
  padding: "0.75rem 1.25rem",
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
    border: `1px solid ${active ? "var(--ink)" : "rgba(15,17,23,.18)"}`,
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
// V6 pill-shaped ghost action button (mockup `.btn.btn-ghost`).
const ghostBtn: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--ink-muted)",
  borderRadius: 100, padding: "8px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textAlign: "center",
};

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
  kind?: string; // V6 §3: classifies the send for the audit trail
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

function buildDeactivationEmail(name: string): string {
  return `Dear ${name},

We're writing to let you know that your iqcommune practitioner profile has been set to inactive, so you won't be considered for new session matches for now.

Nothing about your completed sessions or records changes, and we can reactivate your profile at any time — just reply to this email if you'd like to pick things back up.

Thank you for the sessions you've delivered with us.

Warm regards,
The iqcommune Team`;
}

function buildDeactivationWA(name: string): string {
  return `Hi ${name},

Your iqcommune practitioner profile has been set to *inactive*, so you won't be matched to new sessions for now. Your past sessions and records are unchanged.

Reply any time if you'd like us to reactivate it.

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

// V6: single "average across completed sessions" figure for the profile band + row
// sub-line, derived from the per-section averages view already joined onto the row.
function avgRating(p: Practitioner): number | null {
  const s = p.subsection_averages;
  if (!s || (s.rated_sessions ?? 0) < 1) return null;
  const parts = [s.content_avg, s.delivery_avg, s.engagement_avg, s.logistics_avg].filter(
    (x): x is number => x != null,
  );
  if (!parts.length) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;
}

const EDITABLE_PR_STATUSES = ["Applied", "Screening Done", "Rejected"];

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
  // confirmLabel matters: ConfirmDialog defaults to "Delete", which is plainly wrong
  // (and alarming) on a reversible action like Deactivate.
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const closeConfirm = () => setConfirmDialog((d) => ({ ...d, open: false }));
  const undo = useUndoToast();

  // V5 act-then-undo: delete immediately (soft), offer ~9s to Undo (restore via trash).
  async function deletePractitionerWithUndo(p: Practitioner) {
    setData((prev) => prev.filter((pr) => pr.id !== p.id));
    onHardDeleted?.(p.id);
    setExpandedRow(null);
    let res: Response;
    try {
      res = await fetch(`/api/admin/global/practitioners/${p.id}`, { method: "DELETE" });
    } catch {
      // The row was already removed optimistically, so a throw here would leave the
      // console showing a deletion that never reached the database.
      setData((prev) => [p, ...prev]);
      showToast("Network error — nothing was deleted. Please try again.");
      return;
    }
    if (!res.ok) {
      setData((prev) => [p, ...prev]);
      showToast("Delete failed — please try again.");
      return;
    }
    undo.show(`${p.name} deleted`, async () => {
      // Restoring the row locally regardless of the outcome would claim an undo that
      // didn't happen — the practitioner would reappear here and stay deleted in the DB.
      let restore: Response;
      try {
        restore = await fetch("/api/admin/global/trash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "practitioners", id: p.id }),
        });
      } catch {
        showToast("Network error — could not undo. Restore from Trash instead.");
        return;
      }
      if (!restore.ok) {
        showToast("Could not undo — restore from Trash instead.");
        return;
      }
      setData((prev) => [p, ...prev]);
    });
  }
  const [draft, setDraft] = useState<DraftState>({ open: false });
  const sendUndo = useSendWithUndo();
  // Track which row triggered a modal so focus can be restored on close
  const lastFocusRef = useRef<HTMLElement | null>(null);

  // Status-aware draft: welcome on Empanelled, reject on Rejected, neutral otherwise.
  const openDraft = (p: Practitioner, statusForDraft: string = p.status) => {
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
    } else if (statusForDraft === "Deactivated") {
      title = `Deactivation: ${p.name}`;
      subject = "Your iqcommune practitioner profile has been set to inactive";
      emailBody = buildDeactivationEmail(p.name);
      waBody = buildDeactivationWA(p.name);
    } else if (statusForDraft === "agreement") {
      // Op-procedure Part 1 step 4: send the prefilled agreement for signing.
      title = `Agreement: ${p.name}`;
      subject = "Your iqcommune practitioner agreement — please sign";
      emailBody = `Dear ${p.name},\n\nPlease find your iqcommune practitioner agreement, prefilled with your details. Review it, sign, and return it to us to complete your empanelment.\n\nWarm regards,\nThe iqcommune Team`;
      waBody = `Hi ${p.name}! 👋 Your iqcommune practitioner agreement (prefilled) is ready — please review, sign, and send it back to complete your empanelment.`;
    } else {
      title = `Message: ${p.name}`;
      subject = `iqcommune — ${p.name}`;
      emailBody = buildGeneralEmail(p.name);
      waBody = buildGeneralWA(p.name);
    }
    const kind =
      statusForDraft === "Empanelled"  ? "welcome-practitioner" :
      statusForDraft === "Rejected"    ? "reject-practitioner" :
      statusForDraft === "Deactivated" ? "deactivate-practitioner" :
      statusForDraft === "agreement"   ? "agreement-covering" :
      "practitioner-message";
    setDraft({
      open: true,
      title,
      subject,
      emailBody,
      waBody,
      recipientName: p.name,
      recipientEmail: p.email,
      recipientPhone: p.phone ?? undefined,
      kind,
    });
  };

  const closeDraft = () => {
    setDraft({ open: false });
    setTimeout(() => lastFocusRef.current?.focus(), 0);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const updateStatus =
    async (id: string, status: string): Promise<boolean> => {
      let res: Response;
      try {
        res = await fetch(`/api/admin/practitioners/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
      } catch {
        showToast("Network error — status not updated. Please retry.");
        return false;
      }
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
    };

  // V5 P1-3: reversible Danger Zone actions (deactivate / reactivate / revert).
  const lifecycle =
    async (id: string, action: "deactivate" | "reactivate" | "revert") => {
      let res: Response;
      try {
        res = await fetch(`/api/admin/practitioners/${id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      } catch {
        showToast("Network error — the action didn't run. Please retry.");
        return;
      }
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
    };

  const generateLink =
    async (p: Practitioner) => {
      let res: Response;
      try {
        res = await fetch("/api/admin/onboarding-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ practitionerId: p.id }),
        });
      } catch {
        showToast("Network error — the link wasn't generated. Please retry.");
        return;
      }
      if (res.ok) {
        const body = await res.json();
        setGenLink({ ...body, practitioner: p });
        // API advances status server-side; reflect immediately in local state.
        setData((prev) => prev.map((pr) => pr.id === p.id ? { ...pr, status: "Agreement Sent" } : pr));
        onStatusChange?.(p.id, "Agreement Sent");
      } else {
        showToast("Failed to generate link");
      }
    };

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
        standalone
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
                    style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(15,17,23,.07)", cursor: "pointer", background: isExpanded ? "#f8f7f4" : undefined }}
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
                          <div style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                            {p.role}{p.org ? ` · ${p.org}` : ""}
                            {avgRating(p) != null && (
                              <span style={{ color: "var(--gold-dark)" }}> · ★ {avgRating(p)} avg</span>
                            )}
                          </div>
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
                    <tr style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
                      <td colSpan={5} style={{ padding: "0 12px 14px", background: "#f8f7f4" }}>
                        <div style={{ position: "relative", border: "1px solid rgba(15,17,23,.10)", borderRadius: 8, background: "#fff", padding: "1rem 1.25rem", borderTop: "2px solid #c9982a" }}>
                          <button
                            type="button"
                            aria-label="Close profile"
                            onClick={(e) => { e.stopPropagation(); setExpandedRow(null); }}
                            style={{ position: "absolute", top: 10, right: 12, width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(15,17,23,.12)", background: "#fff", color: "var(--ink-faint)", cursor: "pointer", fontSize: 13, lineHeight: 1, fontFamily: "inherit" }}
                          >
                            ✕
                          </button>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "2rem", alignItems: "start" }}>
                            {/* Col 1: Profile details */}
                            <div>
                              {/* V6 identity block — 52px avatar + name/role/org */}
                              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "0.5rem" }}>
                                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f5e9c8", color: "#8a6510", fontWeight: 600, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  {initials(p.name)}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 17, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                                    {p.name}
                                    {/* D12: the only reachable way to correct a practitioner
                                        record (D2's per-field pencils were skipped). GA only. */}
                                    {isGlobalAdmin && !readOnly && onEdit && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                                        title="Global Admin: correct this practitioner's details"
                                        aria-label={`Edit ${p.name}`}
                                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--gold-dark)", display: "inline-flex", lineHeight: 0 }}
                                      >
                                        <svg width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 12.5, color: "var(--ink-muted)" }}>{p.role}</div>
                                  <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{p.org ?? "Independent"}</div>
                                </div>
                              </div>
                              {/* Avg-rating band */}
                              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface-soft)", borderRadius: 8, padding: "8px 12px", marginBottom: "0.85rem" }}>
                                {avgRating(p) != null ? (
                                  <>
                                    <span style={{ color: "var(--gold)", fontSize: 15 }}>★</span>
                                    <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>{avgRating(p)} average</span>
                                    <span style={{ fontSize: 11, color: "var(--ink-faint)" }}>across completed sessions</span>
                                  </>
                                ) : (
                                  <span style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>Not yet rated — no completed sessions with a rating</span>
                                )}
                              </div>
                              {[
                                ["Module", (p.modules ?? []).join(", ") || "—"],
                                ["City", p.city],
                                ["State", p.state || "—"],
                                // V5: welcome-kit intake fields. Legacy records (applied before
                                // these existed) read "Not provided" — real data state, not a bug.
                                ["Communication address", p.communication_address || "Not provided — collected on newer applications"],
                                ["T-shirt size", p.tshirt_size || "Not provided"],
                                ["Experience", p.experience ?? "—"],
                                ["Email", p.email],
                                ["Phone", p.phone ?? "—"],
                                ["Applied", p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN") : "—"],
                                ["Ref.", p.ref_code ? `IQC-EMP-${p.ref_code}` : "—"],
                              ].map(([label, value]) => (
                                <div key={label} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: "0.45rem" }}>
                                  <span style={{ color: "var(--ink-faint)", width: 110, flexShrink: 0, fontSize: 12 }}>{label}</span>
                                  <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13, minWidth: 0, overflowWrap: "anywhere" }}>{value}</span>
                                </div>
                              ))}
                              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "0.45rem" }}>
                                <span style={{ color: "var(--ink-faint)", width: 110, flexShrink: 0, fontSize: 12 }}>Status</span>
                                <StatusPill status={p.status} />
                              </div>
                              {SHOW_OFFSPEC_ACTIONS && p.subsection_averages && (p.subsection_averages.rated_sessions ?? 0) > 0 && (
                                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(15,17,23,.07)" }}>
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
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.85rem" }}>Pipeline progress</div>
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
                              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginBottom: "0.85rem" }}>{readOnly ? "Details" : "Status"}</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                                {!readOnly && (EDITABLE_PR_STATUSES.includes(p.status) ? (
                                  <>
                                    <select
                                      value={p.status}
                                      onChange={(e) => { e.stopPropagation(); updateStatus(p.id, e.target.value); }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid rgba(15,17,23,.18)", fontFamily: "inherit", fontSize: 13, color: "var(--ink)", background: "#f8f7f4", outline: "none", cursor: "pointer" }}
                                    >
                                      {/* V6 §5: only the three judgement-call stages are forward-selectable. */}
                                      {EDITABLE_PR_STATUSES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                      ))}
                                    </select>
                                    <div style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                                      These two stages are your judgement call — the screening call happens offline, so nothing here is automatic.
                                    </div>
                                  </>
                                ) : (
                                  // V6: Agreement Sent / Empanelled / Deactivated are system-set —
                                  // a read-only tinted pill in a soft box + an explanation, no select.
                                  <div style={{ background: "var(--surface-soft)", borderRadius: 8, padding: "10px 12px" }}>
                                    <StatusPill status={p.status} />
                                    <div style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 6, lineHeight: 1.5 }}>
                                      {p.status === "Agreement Sent"
                                        ? "System-set — waiting on the practitioner to open the link and sign. Updates itself the moment they submit."
                                        : p.status === "Empanelled"
                                        ? "System-set — the practitioner's signed agreement came back automatically."
                                        : "Set manually — pausing this practitioner while keeping their history."}
                                    </div>
                                  </div>
                                ))}

                                {!readOnly && (
                                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ink-faint)", marginTop: 4 }}>Automated actions</div>
                                )}

                                {!readOnly && p.status === "Screening Done" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); lastFocusRef.current = e.currentTarget; generateLink(p); }}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: 100, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    <svg width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    Generate &amp; send empanelment agreement
                                  </button>
                                )}

                                {/* V6 Agreement Sent: automated (resend / poll) + a de-emphasised
                                    manual-empanel fallback tucked in a disclosure. */}
                                {!readOnly && p.status === "Agreement Sent" && (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); lastFocusRef.current = e.currentTarget; generateLink(p); }}
                                      style={{ ...ghostBtn, borderRadius: 100 }}
                                    >
                                      Resend agreement link
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); router.refresh(); showToast("Checking for a signed agreement…"); }}
                                      style={{ ...ghostBtn, borderRadius: 100, fontSize: 11, padding: "6px 12px", color: "var(--ink-faint)", alignSelf: "flex-start" }}
                                    >
                                      Check for updates now
                                    </button>
                                    <details style={{ marginTop: 2 }}>
                                      <summary style={{ fontSize: 10.5, color: "var(--ink-faint)", cursor: "pointer" }}>Signed copy received some other way?</summary>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          lastFocusRef.current = e.currentTarget;
                                          openDraft(p, "Empanelled");
                                          void updateStatus(p.id, "Empanelled").then((ok) => {
                                            if (ok) undo.show(`${p.name} empanelled`, () => lifecycle(p.id, "revert"));
                                          });
                                        }}
                                        style={{ ...ghostBtn, borderRadius: 100, marginTop: 6, fontSize: 11, padding: "6px 12px" }}
                                      >
                                        Mark Empanelled manually
                                      </button>
                                    </details>
                                  </div>
                                )}

                                {/* Empanelled: welcome (ghost) + deactivation (red ghost). */}
                                {!readOnly && p.status === "Empanelled" && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); lastFocusRef.current = e.currentTarget; openDraft(p, "Empanelled"); }}
                                      style={{ ...ghostBtn, borderRadius: 100 }}
                                    >
                                      Send welcome message
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        lastFocusRef.current = e.currentTarget;
                                        setConfirmDialog({
                                          open: true,
                                          title: `Deactivate ${p.name}`,
                                          description: "This parks the practitioner as Deactivated and keeps their full history, then opens the deactivation message so you can review and send it. You can Reactivate them at any time.",
                                          confirmLabel: "Deactivate",
                                          onConfirm: () => {
                                            closeConfirm();
                                            // The label promises a message — open the editable
                                            // draft as well as flipping the status.
                                            openDraft(p, "Deactivated");
                                            void lifecycle(p.id, "deactivate");
                                          },
                                        });
                                      }}
                                      style={{ ...ghostBtn, borderRadius: 100, color: "var(--red)" }}
                                    >
                                      Send deactivation message
                                    </button>
                                  </>
                                )}

                                {/* Reject — only offered at Screening Done (mockup shows no reject on Applied). */}
                                {!readOnly && p.status === "Screening Done" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      lastFocusRef.current = e.currentTarget;
                                      openDraft(p, "Rejected");
                                      void updateStatus(p.id, "Rejected").then((ok) => {
                                        if (ok) undo.show(`${p.name} rejected`, () => lifecycle(p.id, "revert"));
                                      });
                                    }}
                                    style={{ ...ghostBtn, borderRadius: 100, color: "var(--red)" }}
                                  >
                                    Send rejection message
                                  </button>
                                )}

                                {/* Deactivated → Reactivate (gold). */}
                                {!readOnly && p.status === "Deactivated" && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); lifecycle(p.id, "reactivate"); }}
                                    style={{ background: "var(--gold)", color: "var(--ink)", border: "none", borderRadius: 100, padding: "9px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", alignSelf: "flex-start" }}
                                  >
                                    Reactivate
                                  </button>
                                )}
                                {!readOnly && p.status === "Applied" && (
                                  <div style={{ fontSize: 11, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                                    Move to &quot;Screening Done&quot; above once the offline call happens — that unlocks the agreement send.
                                  </div>
                                )}

                                {SHOW_OFFSPEC_ACTIONS && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(15,17,23,.08)" }}>
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
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", color: "var(--ink)", border: "1px solid rgba(15,17,23,.18)", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    Edit details
                                  </button>
                                )}

                                {/* V6 danger zone — delete for judgement-call stages (GA only);
                                    else a note (history exists → Deactivate instead). */}
                                {!readOnly && (
                                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border-strong)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" as const, color: "var(--ink-faint)" }}>Danger zone</div>
                                    {DELETABLE_STATUSES.includes(p.status) ? (
                                      isGlobalAdmin ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); deletePractitionerWithUndo(p); }}
                                          style={{ ...ghostBtn, borderRadius: 100, fontSize: 11, padding: "4px 10px", color: "var(--red)", borderColor: "var(--red-border)", alignSelf: "flex-start" }}
                                        >
                                          Delete permanently
                                        </button>
                                      ) : (
                                        <div style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>Only a Global Admin can delete a practitioner record.</div>
                                      )
                                    ) : (
                                      <div style={{ fontSize: 10.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
                                        Can&apos;t be deleted — agreement/session history exists. Use &quot;Deactivated&quot; instead — it hides them from future matching without losing history.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Message / Notes — bottom of the profile card (full width) */}
                            {!readOnly && (
                              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, marginTop: 4 }}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); lastFocusRef.current = e.currentTarget; openDraft(p); }}
                                  style={{ ...ghostBtn, borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 6 }}
                                >
                                  <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                  Message
                                </button>
                                <button
                                  disabled
                                  title="Coming soon"
                                  style={{ ...ghostBtn, borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-faint)", opacity: 0.6, cursor: "not-allowed" }}
                                >
                                  <svg width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                  Notes
                                </button>
                              </div>
                            )}
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
          <div style={{ background: "#f8f7f4", border: "1px solid rgba(15,17,23,.1)", borderRadius: 8, padding: "10px 12px", fontSize: 12, wordBreak: "break-all", marginBottom: 16, color: "var(--ink)", fontFamily: "monospace" }}>
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
              style={btnStyle("rgba(15,17,23,.07)", "var(--ink)")}
            >
              Copy link
            </button>
            <button
              onClick={() => {
                const p = genLink.practitioner;
                const url = genLink.url;
                setGenLink(null);
                // V6 §3: open the editable send-preview (agreement is Type B → 15s undo).
                setDraft({
                  open: true,
                  title: `Agreement: ${p.name}`,
                  subject: "Your iqcommune practitioner agreement — please sign",
                  emailBody: `Dear ${p.name},\n\nYour iqcommune practitioner agreement is ready. Please review and sign it here:\n${url}\n\nWarm regards,\nThe iqcommune Team`,
                  waBody: `Hi ${p.name}! 👋 Your iqcommune practitioner agreement is ready to sign:\n${url}`,
                  recipientName: p.name,
                  recipientEmail: p.email,
                  kind: "send-agreement",
                });
              }}
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
        confirmLabel={confirmDialog.confirmLabel}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirm}
      />
      <ContactDraftModal
        open={draft.open}
        editable
        sendLabel="Click to send"
        subtitle="Click into the text below to edit before sending"
        onClose={closeDraft}
        title={draft.title}
        subject={draft.subject}
        emailBody={draft.emailBody}
        waBody={draft.waBody}
        recipientName={draft.recipientName}
        recipientEmail={draft.recipientEmail}
        recipientPhone={draft.recipientPhone}
        onSend={(edited) => {
          const to = draft.recipientEmail;
          const kind = draft.kind;
          const name = draft.recipientName;
          if (!to) { showToast("No email on file for this practitioner."); return; }
          // Agreement is an external closed-loop send (Type B) → 15s undo; welcome /
          // rejection / general are internal (Type A) → fire instantly.
          const mode = kind === "send-agreement" ? "delayed" : "instant";
          sendUndo.send(mode, `Message to ${to}`, async () => {
            const r = await sendMessageRequest({ to, name, subject: edited.subject, body: edited.emailBody, kind });
            showToast(r.ok ? `Message sent to ${r.sentTo}` : (r.error ?? "Send failed"));
          });
        }}
      />
      {sendUndo.node}
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
      style={{ position: "fixed", inset: 0, background: "rgba(15,17,23,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
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

