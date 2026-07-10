import { redirect } from "next/navigation";
import { getGlobalAdminUser } from "@/lib/supabase/require-global-admin";
import { getConsoleData } from "@/lib/admin/console-data";
import { AdminConsoleView } from "@/components/admin/AdminConsoleView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Global Admin Console" };
export const dynamic = "force-dynamic";

export default async function GlobalAdminConsolePage() {
  const saUser = await getGlobalAdminUser();
  // Non-global tiers are bounced to /console, which in turn sends a plain user to /user.
  if (!saUser) redirect("/console");

  const { practitioners, sessions, requests, payouts, agreements, photos, confirmations } = await getConsoleData();
  return (
    <AdminConsoleView
      practitioners={practitioners}
      sessions={sessions}
      requests={requests}
      payouts={payouts}
      agreements={agreements}
      photos={photos}
      confirmations={confirmations}
      email={saUser.email}
      isGlobalAdmin={true}
      galleryAdminAccess={true}
    />
  );
}
