import type { Metadata } from "next";

import { ConsoleShell } from "@/features/console/ConsoleShell";
import { ConsoleUnavailable } from "@/features/console/ConsoleUnavailable";
import { loadConsolePanels } from "@/features/console/panels/loadPanels";
import { BackendUnavailableError, requireRole } from "@/features/console/requireRole";

/** The console is never indexable — it is behind a login and about real people. */
export const metadata: Metadata = {
  title: "Admin console — iqcommune",
  robots: { index: false, follow: false },
};

/** Everything that can throw `BackendUnavailableError`, kept out of the JSX
 *  return so the try/catch below only ever wraps the awaits — `react-hooks`'s
 *  error-boundaries rule (rightly) flags JSX constructed inside a try block,
 *  since a component's own render errors would not be caught by it anyway. */
async function loadAdminConsole() {
  const { role, email } = await requireRole("admin");
  const { panels, counts, search, failedTabs, tabReads } = await loadConsolePanels(role);
  return { role, email, panels, counts, search, failedTabs, tabReads };
}

export default async function AdminConsole() {
  let props: Awaited<ReturnType<typeof loadAdminConsole>>;
  try {
    props = await loadAdminConsole();
  } catch (error) {
    if (error instanceof BackendUnavailableError) return <ConsoleUnavailable />;
    throw error;
  }

  return <ConsoleShell {...props} />;
}
