import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard both sides: if ADMIN_EMAIL is unset, process.env.ADMIN_EMAIL is undefined,
  // and null?.email is also undefined — undefined === undefined would be true without the !!user guard.
  const isAdmin =
    !!user &&
    (user.app_metadata?.role === "admin" ||
      (!!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL));

  if (!isAdmin) {
    redirect("/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4" }}>
      <header
        style={{
          background: "#0f1117",
          borderBottom: "1px solid rgba(255,255,255,.08)",
          padding: "0 2rem",
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}
          >
            iqcommune
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#c9982a",
              background: "rgba(201,152,42,.12)",
              border: "1px solid rgba(201,152,42,.25)",
              borderRadius: 100,
              padding: "2px 8px",
            }}
          >
            Admin Console
          </span>
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>
          {user!.email}
        </span>
      </header>
      <main style={{ padding: "2rem", maxWidth: 1280, margin: "0 auto" }}>
        {children}
      </main>
    </div>
  );
}
