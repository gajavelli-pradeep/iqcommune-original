import type { Metadata } from "next";

import { ConsoleShell } from "@/features/console/ConsoleShell";
import { requireRole } from "@/features/console/requireRole";

/** The console is never indexable — it is behind a login and about real people. */
export const metadata: Metadata = {
  title: "Global admin console — iqcommune",
  robots: { index: false, follow: false },
};

export default async function GlobalAdminConsole() {
  const { role, email } = await requireRole("global_admin");
  return <ConsoleShell role={role} email={email} />;
}
