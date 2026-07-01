import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken, isExpired } from "@/lib/admin-invite";
import { JoinAdminForm } from "@/components/public/JoinAdminForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join as Admin — IQCommune",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

type InviteState =
  | { ok: true; email: string; token: string }
  | { ok: false; reason: string };

async function resolveInvite(token: string | undefined): Promise<InviteState> {
  if (!token) return { ok: false, reason: "This invite link is missing its token." };

  const { data: invite } = await createAdminClient()
    .from("admin_invites")
    .select("email, status, expires_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!invite) return { ok: false, reason: "This invite link is invalid." };
  if (invite.status === "Accepted") return { ok: false, reason: "This invite has already been used." };
  if (invite.status === "Revoked") return { ok: false, reason: "This invite has been revoked." };
  if (invite.status === "Expired" || isExpired(invite.expires_at))
    return { ok: false, reason: "This invite link has expired." };

  return { ok: true, email: invite.email, token };
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--surface-soft)",
  padding: "1.5rem",
};
const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 440,
  background: "var(--surface)",
  border: "1px solid rgba(20,18,12,.12)",
  borderRadius: 14,
  padding: "2rem",
  boxShadow: "0 8px 40px rgba(0,0,0,.06)",
};

export default async function JoinAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const state = await resolveInvite(t);

  if (!state.ok) {
    return (
      <div style={shell}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            Invite unavailable
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6, margin: 0 }}>
            {state.reason} Please ask your super admin for a new invite link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gold-dark)", marginBottom: 6 }}>
          IQCommune · Admin
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: "0 0 6px" }}>
          Set up your admin account
        </h1>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6, margin: "0 0 20px" }}>
          You&apos;ve been invited to join the IQCommune console as an admin
          {" "}for <strong style={{ color: "var(--ink)" }}>{state.email}</strong>. Choose your name and a password to finish.
        </p>
        <JoinAdminForm email={state.email} token={state.token} />
      </div>
    </div>
  );
}
