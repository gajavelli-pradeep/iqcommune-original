"use client";

import { useState } from "react";
import { StatusPill } from "@/components/shared/StatusPill";
import { formatInr } from "@/lib/tds";

interface Session {
  id: string;
  ref_code: string;
  module: string;
  session_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  audience_type: string;
  participants: number;
  payout_amount: number;
  tds_applicable: boolean;
  tds_rate: number | null;
  consent_status: string;
  status: string;
  practitioner: { name: string; email: string } | null;
}

export function SessionTable({ initialData }: { initialData: Session[] }) {
  const [data] = useState(initialData);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {["Ref", "Module", "Practitioner", "Date", "Venue", "Payout", "Consent", "Status"].map((h) => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((s) => (
            <tr key={s.id} style={{ borderBottom: "1px solid rgba(15,17,23,.07)" }}>
              <td style={tdStyle}><span style={{ fontFamily: "monospace", fontSize: 12 }}>{s.ref_code}</span></td>
              <td style={tdStyle}>{s.module}</td>
              <td style={tdStyle}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.practitioner?.name ?? "—"}</div>
                <div style={{ fontSize: 11, color: "#9496a1" }}>{s.practitioner?.email}</div>
              </td>
              <td style={tdStyle}>
                <div>{s.session_date}</div>
                <div style={{ fontSize: 11, color: "#9496a1" }}>{s.start_time}–{s.end_time}</div>
              </td>
              <td style={tdStyle}>{s.venue}</td>
              <td style={{ ...tdStyle, fontWeight: 500 }}>{formatInr(s.payout_amount)}</td>
              <td style={tdStyle}><StatusPill status={s.consent_status} /></td>
              <td style={tdStyle}><StatusPill status={s.status} /></td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: 32, color: "#9496a1", fontSize: 13 }}>
                No sessions yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 12px", background: "#f8f7f4", fontWeight: 500, fontSize: 11, color: "#9496a1", borderBottom: "1px solid rgba(15,17,23,.1)" };
const tdStyle: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
