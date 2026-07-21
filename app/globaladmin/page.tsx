import type { Metadata } from "next";

import { ConsoleShell } from "@/features/console/ConsoleShell";
import { PractitionersPanel } from "@/features/console/panels/PractitionersPanel";
import { requireRole } from "@/features/console/requireRole";
import { listPractitioners } from "@/services/console";

/** The console is never indexable — it is behind a login and about real people. */
export const metadata: Metadata = {
  title: "Global admin console — iqcommune",
  robots: { index: false, follow: false },
};

export default async function GlobalAdminConsole() {
  const { role, email } = await requireRole("global_admin");
  const practitioners = await listPractitioners();

  return (
    <ConsoleShell
      role={role}
      email={email}
      panels={{ practitioners: <PractitionersPanel rows={practitioners} role={role} /> }}
    />
  );
}
