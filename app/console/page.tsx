import type { Metadata } from "next";

import { ConsoleShell } from "@/features/console/ConsoleShell";
import { loadConsolePanels } from "@/features/console/panels/loadPanels";
import { requireRole } from "@/features/console/requireRole";

/** The console is never indexable — it is behind a login and about real people. */
export const metadata: Metadata = {
  title: "Admin console — iqcommune",
  robots: { index: false, follow: false },
};

export default async function AdminConsole() {
  const { role, email } = await requireRole("admin");
  const { panels, counts, search } = await loadConsolePanels(role);

  return <ConsoleShell role={role} email={email} panels={panels} counts={counts} search={search} />;
}
