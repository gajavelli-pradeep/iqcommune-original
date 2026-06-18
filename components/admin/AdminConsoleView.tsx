"use client";

import { useState } from "react";
import { PractitionerTable } from "@/components/admin/PractitionerTable";
import { SessionTable } from "@/components/admin/SessionTable";
import { RequestTable } from "@/components/admin/RequestTable";
import { PayoutTable } from "@/components/admin/PayoutTable";
import type { Database } from "@/lib/supabase/database.types";

type PractitionerRow = Database["public"]["Tables"]["practitioners"]["Row"];
type SessionRow = Database["public"]["Tables"]["sessions"]["Row"] & {
  practitioner: { name: string; email: string } | null;
};
type RequestRow = Database["public"]["Tables"]["session_requests"]["Row"] & {
  assigned_practitioner: { name: string } | null;
};
type PayoutRow = Database["public"]["Tables"]["payouts"]["Row"] & {
  session: { ref_code: string; module: string } | null;
  practitioner: { name: string } | null;
};

interface Counts {
  applied: number;
  empanelled: number;
  pendingRequests: number;
  pendingSessions: number;
  pendingPayouts: number;
}

interface Props {
  practitioners: PractitionerRow[];
  sessions: SessionRow[];
  requests: RequestRow[];
  payouts: PayoutRow[];
  counts: Counts;
}

const TAB_META: Record<string, { title: string; subtitle: string }> = {
  requests:       { title: "Session Requests",  subtitle: "Incoming and active session requests from organisations." },
  practitioners:  { title: "Practitioners",     subtitle: "Manage applications and empanelment pipeline." },
  sessions:       { title: "Sessions",          subtitle: "Track confirmed and completed sessions." },
  agreements:     { title: "Agreements",        subtitle: "Signed practitioner empanelment agreements." },
  payouts:        { title: "Payouts",           subtitle: "Track and manage practitioner payments." },
};

type SidebarItem = { label: string; tab: string; badge?: number; badgeBg?: string };
type SidebarSection = { heading: string; items: SidebarItem[] };

function buildSections(counts: Counts): SidebarSection[] {
  return [
    {
      heading: "PIPELINE",
      items: [
        { label: "Session Requests", tab: "requests",      badge: counts.pendingRequests, badgeBg: "#c9982a" },
        { label: "Practitioners",    tab: "practitioners", badge: counts.applied,         badgeBg: "#534ab7" },
        { label: "Sessions",         tab: "sessions",      badge: counts.pendingSessions,  badgeBg: "#185fa5" },
        { label: "Agreements",       tab: "agreements" },
      ],
    },
    {
      heading: "FINANCE",
      items: [
        { label: "Payouts", tab: "payouts", badge: counts.pendingPayouts, badgeBg: "#a32d2d" },
      ],
    },
  ];
}

const STAT_CARDS = (c: Counts) => [
  { label: "New Applications",  value: c.applied,          accent: "#534ab7" },
  { label: "Empanelled",        value: c.empanelled,        accent: "#2a6b2a" },
  { label: "Open Requests",     value: c.pendingRequests,  accent: "#c9982a" },
  { label: "Upcoming Sessions", value: c.pendingSessions,  accent: "#185fa5" },
  { label: "Payouts Pending",   value: c.pendingPayouts,   accent: "#a32d2d" },
];

export function AdminConsoleView({ practitioners, sessions, requests, payouts, counts }: Props) {
  const [activeTab, setActiveTab] = useState<string>("requests");
  const [hovered, setHovered] = useState<string | null>(null);

  const sections = buildSections(counts);
  const stats = STAT_CARDS(counts);
  const meta = TAB_META[activeTab] ?? { title: activeTab, subtitle: "" };

  return (
    <div style={{ display: "flex", paddingTop: 64, minHeight: "100vh", background: "#f8f7f4" }}>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          background: "#ffffff",
          borderRight: "1px solid rgba(15,17,23,.10)",
          position: "sticky",
          top: 64,
          height: "calc(100vh - 64px)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {sections.map((section, si) => (
          <div key={section.heading}>
            {si > 0 && (
              <div style={{ height: 1, background: "rgba(15,17,23,.10)", margin: "0.5rem 1.25rem" }} />
            )}
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#9496a1",
                padding: "1.25rem 1.25rem 0.4rem",
              }}
            >
              {section.heading}
            </div>
            {section.items.map((item) => {
              const isActive = activeTab === item.tab;
              const isHov = hovered === item.tab && !isActive;
              return (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  onMouseEnter={() => setHovered(item.tab)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0.6rem 1.25rem",
                    fontSize: 13,
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? "#8a6510" : isHov ? "#0f1117" : "#4a4d5c",
                    cursor: "pointer",
                    background: isActive ? "#f5e9c8" : isHov ? "#f8f7f4" : "transparent",
                    border: "none",
                    borderLeft: `2.5px solid ${isActive ? "#c9982a" : "transparent"}`,
                    textAlign: "left",
                    fontFamily: "inherit",
                    transition: "background 0.12s, color 0.12s",
                  }}
                >
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      style={{
                        background: item.badgeBg ?? "#9496a1",
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 7px",
                        borderRadius: 100,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        {/* Sidebar footer */}
        <div style={{ marginTop: "auto", padding: "1rem 1.25rem", borderTop: "1px solid rgba(15,17,23,.10)" }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#0f1117" }}>iqcommune</div>
          <div style={{ fontSize: 11, color: "#9496a1" }}>Admin</div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, padding: "2rem 1.75rem" }}>

        {/* Page header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "#0f1117", margin: 0 }}>
            {meta.title}
          </h1>
          <p style={{ fontSize: 13, color: "#9496a1", marginTop: 3, marginBottom: 0 }}>
            {meta.subtitle}
          </p>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "1rem",
            marginBottom: "1.75rem",
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#ffffff",
                border: "1px solid rgba(15,17,23,.10)",
                borderRadius: 10,
                padding: "1rem 1.5rem",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: stat.accent, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 12, color: "#9496a1", marginTop: 6 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "requests" && <RequestTable initialData={requests} />}
        {activeTab === "practitioners" && <PractitionerTable initialData={practitioners} />}
        {activeTab === "sessions" && <SessionTable initialData={sessions} />}
        {activeTab === "payouts" && <PayoutTable initialData={payouts} />}
        {activeTab === "agreements" && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,17,23,.10)",
              borderRadius: 10,
              padding: "2.5rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "#9496a1", lineHeight: 1.65 }}>
              Agreement records are managed through the practitioner onboarding flow.<br />
              Each signed agreement is linked to the practitioner&apos;s profile.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
