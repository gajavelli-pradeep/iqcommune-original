import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, isExpired } from "@/lib/admin-invite";
import { roleLabel } from "@/lib/supabase/roles";
import { JoinAdminForm } from "@/components/public/JoinAdminForm";
import { SiteHeader } from "@/components/public/SiteHeader";
import type { Metadata } from "next";

// Role-neutral: the tab title is static, but the invite may be for any tier.
export const metadata: Metadata = {
  title: "Join the console — IQCommune",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type InviteState =
  | { ok: true; email: string; token: string; roleLabel: string }
  | { ok: false; reason: string };

async function resolveInvite(token: string | undefined): Promise<InviteState> {
  if (!token) return { ok: false, reason: "This invite link is missing its token." };

  // `role` drives every label on this page — without it the page can only guess,
  // which is exactly how it came to tell a read-only User they were an Admin.
  const { data: invite } = await createAdminClient()
    .from("admin_invites")
    .select("email, role, status, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!invite) return { ok: false, reason: "This invite link is invalid." };
  if (invite.status === "Accepted") return { ok: false, reason: "This invite has already been used." };
  if (invite.status === "Revoked") return { ok: false, reason: "This invite has been revoked." };
  if (invite.status === "Expired" || isExpired(invite.expires_at))
    return { ok: false, reason: "This invite link has expired." };

  return { ok: true, email: invite.email, token, roleLabel: roleLabel(invite.role) };
}

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 460,
  background: "var(--surface)",
  border: "1px solid rgba(20,18,12,.12)",
  borderRadius: 14,
  padding: "2rem",
  boxShadow: "0 8px 40px rgba(0,0,0,.06)",
};

/** V5 chrome: shared sticky header (badge) + centered card + confidential footer note. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--surface-soft)" }}>
      <SiteHeader badge={["Account", "Setup"]} right={<span aria-hidden="true" />} />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem" }}>
        {children}
      </main>
      <footer style={{ textAlign: "center", padding: "1.5rem", fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.6 }}>
        Confidential · This invite is meant only for you.{" "}
        <a href="mailto:hello@iqcommune.com" style={{ color: "var(--ink-soft)", textDecoration: "none" }}>
          hello@iqcommune.com
        </a>
      </footer>
    </div>
  );
}

export default async function JoinAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const state = await resolveInvite(t);

  if (!state.ok) {
    return (
      <Frame>
        <div style={{ ...card, maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            Invite unavailable
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
            {state.reason} Please ask your global admin for a new invite link.
          </p>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-dark)", marginBottom: 6 }}>
          IQCommune · {state.roleLabel}
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>
          Set up your account
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 20px" }}>
          You&apos;ve been invited to join the IQCommune console as{" "}
          <strong style={{ color: "var(--ink)" }}>{state.roleLabel}</strong>
          {" "}for <strong style={{ color: "var(--ink)" }}>{state.email}</strong>. Choose your name and a password to finish.
        </p>
        <JoinAdminForm email={state.email} token={state.token} roleLabel={state.roleLabel} />
      </div>
    </Frame>
  );
}
