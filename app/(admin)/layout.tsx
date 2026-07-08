import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { isGlobalAdminRole } from "@/lib/supabase/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAdmin =
    !!user &&
    (user.app_metadata?.role === "admin" ||
      isGlobalAdminRole(user.app_metadata?.role) ||
      (!!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL));

  if (!isAdmin) redirect("/login");

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4" }}>
      <AdminShell email={user!.email ?? ""}>{children}</AdminShell>
    </div>
  );
}
