"use client";

import { useState, useCallback } from "react";
import { StatusPill } from "@/components/shared/StatusPill";

interface SessionRequest {
  id: string;
  name: string;
  org: string;
  email: string;
  phone: string | null;
  topic: string;
  audience_type: string;
  group_size: string;
  min_commit: number;
  venue: string | null;
  preferred_dates: string;
  status: string;
  assigned_practitioner: { name: string } | null;
  created_at: string;
}

export function RequestTable({ initialData }: { initialData: SessionRequest[] }) {
  const [data, setData] = useState(initialData);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const updateStatus = useCallback(async (id: string, status: string) => {
    const res = await fetch(`/api/admin/session-requests?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      showToast("Status updated");
    } else {
      showToast("Update failed");
    }
  }, []);

  const sendFollowup = useCallback(async (r: SessionRequest) => {
    await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "client-followup",
        to: r.email,
        name: r.name,
        topic: r.topic,
        groupSize: r.group_size,
        audienceType: r.audience_type,
        preferredDates: r.preferred_dates,
      }),
    });
    showToast("Follow-up email sent");
  }, []);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {["Client", "Topic", "Audience", "Dates", "Assigned to", "Status", "Actions"].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
              <td style={tdStyle}>
                <div style={{ fontWeight: 500 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: "#9496a1" }}>{r.org} · {r.email}</div>
              </td>
              <td style={tdStyle}>{r.topic}</td>
              <td style={tdStyle}>
                <div>{r.audience_type}</div>
                <div style={{ fontSize: 11, color: "#9496a1" }}>{r.group_size} participants</div>
              </td>
              <td style={tdStyle}>{r.preferred_dates}</td>
              <td style={tdStyle}>{r.assigned_practitioner?.name ?? "—"}</td>
              <td style={tdStyle}><StatusPill status={r.status} /></td>
              <td style={tdStyle}>
                <div style={{ display: "flex", gap: 6 }}>
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    style={selectStyle}
                  >
                    {["New", "Matched", "Confirmed", "Completed"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => sendFollowup(r)} style={btnStyle}>
                    Follow-up
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#9496a1", fontSize: 13 }}>
                No session requests yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f1117", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", background: "#f8f7f4", fontWeight: 500, fontSize: 11, color: "#9496a1", borderBottom: "1px solid rgba(15,17,23,.1)" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
const selectStyle: React.CSSProperties = { fontSize: 12, padding: "4px 6px", borderRadius: 6, border: "1px solid rgba(15,17,23,.15)", background: "#fff", cursor: "pointer", fontFamily: "inherit" };
const btnStyle: React.CSSProperties = { background: "rgba(15,17,23,.07)", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" };
