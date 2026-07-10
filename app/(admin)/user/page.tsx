import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getConsoleData } from "@/lib/admin/console-data";
import { AdminConsoleView } from "@/components/admin/AdminConsoleView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "User Console" };
export const dynamic = "force-dynamic";

// Read-only console (User tier): view all data + download/export only, no writes.
// The (admin) layout already gated console access; every mutation affordance is
// stripped by AdminConsoleView's readOnly mode, and the data-mutating APIs stay
// admin-gated (403 for a user) as defense in depth.
export default async function UserConsolePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

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
      email={user?.email}
      readOnly={true}
    />
  );
}
