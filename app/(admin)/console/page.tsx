import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getConsoleData } from "@/lib/admin/console-data";
import { AdminConsoleView } from "@/components/admin/AdminConsoleView";
import { isAdminRole } from "@/lib/supabase/roles";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Console" };
export const dynamic = "force-dynamic";

export default async function ConsolePage() {
  // The (admin) layout admits users into the shell; the regular console is
  // admin-and-above only, so send a read-only user to their own console.
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  const isBootstrapAdmin =
    !!process.env.ADMIN_EMAIL &&
    user?.email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();
  if (!isAdminRole(role) && !isBootstrapAdmin) redirect("/user");

  const { practitioners, sessions, requests, payouts, agreements, photos, confirmations } = await getConsoleData();
  // This admin's OWN gallery access — granted per-account by a global admin.
  const galleryAdminAccess = user?.app_metadata?.gallery_access === true;
  return (
    <AdminConsoleView
      practitioners={practitioners}
      sessions={sessions}
      requests={requests}
      payouts={payouts}
      agreements={agreements}
      photos={photos}
      confirmations={confirmations}
      email={user?.email ?? process.env.ADMIN_EMAIL}
      galleryAdminAccess={galleryAdminAccess}
    />
  );
}
