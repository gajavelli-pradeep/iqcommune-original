import { createAdminClient } from "@/lib/supabase/admin";
import { verifyStatusToken } from "@/lib/hmac";
import { PipelineStepper } from "@/components/shared/PipelineStepper";
import { StatusPill } from "@/components/shared/StatusPill";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ ref?: string; token?: string }>;
}

export const metadata = { title: "Application Status — iqcommune", robots: "noindex" };

export default async function StatusPage({ searchParams }: Props) {
  const { ref, token } = await searchParams;

  const invalid = !ref || !token || !verifyStatusToken(ref, token);

  const practitioner = invalid
    ? null
    : await (async () => {
        const supabase = createAdminClient();
        const { data } = await supabase
          .from("practitioners")
          .select("name, role, org, city, state, modules, experience, status, ref_code, created_at")
          .eq("ref_code", ref)
          .single();
        return data ?? null;
      })();

  const right = (
    <Link
      href="/"
      style={{ fontSize: 13, color: "var(--ink-soft)", textDecoration: "none" }}
    >
      ← iqcommune.in
    </Link>
  );

  return (
    <>
      <SiteHeader badge={["Application", "Status"]} right={right} />

      <main
        style={{
          minHeight: "calc(100vh - 68px - 80px)",
          background: "var(--surface-soft)",
          padding: "3rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          {/* Invalid / expired token */}
          {(!practitioner) && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(20,18,12,.10)",
                borderRadius: 12,
                padding: "2.5rem 2rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>🔗</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                {invalid ? "Link invalid or expired" : "Application not found"}
              </h1>
              <p style={{ fontSize: 14, color: "var(--ink-soft)", maxWidth: 400, margin: "0 auto 24px" }}>
                This status link is no longer valid. Check your confirmation email for a
                fresh link, or write to{" "}
                <a href="mailto:practitioners@iqcommune.com" style={{ color: "var(--gold-dark)" }}>
                  practitioners@iqcommune.com
                </a>
                .
              </p>
              <Link
                href="/"
                style={{
                  display: "inline-block",
                  background: "var(--ink)",
                  color: "#fff",
                  padding: "11px 24px",
                  borderRadius: 100,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Go to homepage
              </Link>
            </div>
          )}

          {/* Valid — show application */}
          {practitioner && (
            <>
              {/* Page heading */}
              <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 4 }}>
                  Your Application Status
                </h1>
                <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                  Ref: IQC-EMP-{practitioner.ref_code} ·{" "}
                  Applied{" "}
                  {practitioner.created_at
                    ? new Date(practitioner.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>

              {/* Card */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid rgba(20,18,12,.09)",
                  borderTop: "3px solid var(--gold)",
                  borderRadius: 12,
                  padding: "2rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "2.5rem",
                }}
              >
                {/* Left — profile summary */}
                <div>
                  {/* Avatar + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: "1.5rem" }}>
                    <div
                      aria-hidden="true"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: "var(--gold-light)",
                        color: "var(--gold-dark)",
                        fontWeight: 700,
                        fontSize: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {practitioner.name
                        .split(" ")
                        .map((w: string) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>
                        {practitioner.name}
                      </div>
                      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
                        {practitioner.role}
                        {practitioner.org ? ` · ${practitioner.org}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Detail rows */}
                  {(
                    [
                      ["Module(s)", (practitioner.modules as string[] ?? []).join(", ") || "—"],
                      ["City", [practitioner.city, practitioner.state].filter(Boolean).join(", ") || "—"],
                      ["Experience", practitioner.experience ?? "—"],
                      ["Current status", null], // rendered separately
                    ] as [string, string | null][]
                  ).map(([label, value]) =>
                    value === null ? (
                      <div
                        key={label}
                        style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: "0.55rem" }}
                      >
                        <span style={{ color: "var(--ink-faint)", width: 100, flexShrink: 0, fontSize: 13 }}>
                          {label}
                        </span>
                        <StatusPill status={practitioner.status} />
                      </div>
                    ) : (
                      <div
                        key={label}
                        style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: "0.55rem" }}
                      >
                        <span style={{ color: "var(--ink-faint)", width: 100, flexShrink: 0, fontSize: 13 }}>
                          {label}
                        </span>
                        <span style={{ color: "var(--ink)", fontWeight: 500, fontSize: 13 }}>{value}</span>
                      </div>
                    )
                  )}
                </div>

                {/* Right — pipeline stepper */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-faint)",
                      marginBottom: "1rem",
                    }}
                  >
                    Pipeline Progress
                  </div>
                  <PipelineStepper
                    status={practitioner.status}
                    timestamps={{ Applied: practitioner.created_at ?? undefined }}
                  />

                  {practitioner.status === "Empanelled" && (
                    <div
                      style={{
                        marginTop: "1.5rem",
                        padding: "0.85rem 1rem",
                        background: "var(--green-light, #e6f4e6)",
                        border: "1px solid var(--green-border, #a3d9a3)",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "var(--green)",
                        fontWeight: 500,
                      }}
                    >
                      🎉 Welcome to the iqcommune practitioner network!
                    </div>
                  )}
                </div>
              </div>

              {/* Help text */}
              <p
                style={{
                  marginTop: 20,
                  fontSize: 13,
                  color: "var(--ink-faint)",
                  textAlign: "center",
                }}
              >
                Questions? Write to{" "}
                <a
                  href="mailto:practitioners@iqcommune.com"
                  style={{ color: "var(--gold-dark)", textDecoration: "none" }}
                >
                  practitioners@iqcommune.com
                </a>
              </p>
            </>
          )}
        </div>
      </main>

      <SiteFooter
        tagline="Where financial intelligence connects"
        email="hello@iqcommune.com"
      />
    </>
  );
}
