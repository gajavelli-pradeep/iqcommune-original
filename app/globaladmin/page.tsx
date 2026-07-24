import type { Metadata } from "next";

import { ConsoleShell } from "@/features/console/ConsoleShell";
import { ConsoleUnavailable } from "@/features/console/ConsoleUnavailable";
import { loadConsolePanels } from "@/features/console/panels/loadPanels";
import { BackendUnavailableError, requireRole } from "@/features/console/requireRole";
import { toConsoleRole } from "@/features/console/roles";

/** The console is never indexable — it is behind a login and about real people. */
export const metadata: Metadata = {
  title: "Global admin console — iqcommune",
  robots: { index: false, follow: false },
};

/** Everything that can throw `BackendUnavailableError`, kept out of the JSX
 *  return so the try/catch below only ever wraps the awaits — `react-hooks`'s
 *  error-boundaries rule (rightly) flags JSX constructed inside a try block,
 *  since a component's own render errors would not be caught by it anyway. */
async function loadGlobalAdminConsole(searchParams: Promise<{ as?: string }>) {
  const { role, email } = await requireRole("global_admin");
  const { as } = await searchParams;

  /**
   * "Viewing as" — a Global Admin previewing the narrower consoles.
   *
   * V7 has this as a role `<select>`; it swaps a class on `<body>` so one
   * static file can demonstrate three permission levels. The real product
   * serves a different route per role, so the switch cannot literally change
   * who you are — but the question behind it is a fair one, and a Global Admin
   * checking what an Admin or a User actually sees is exactly how you catch a
   * control that leaked into the wrong tier.
   *
   * Safe because it only ever REMOVES. The preview renders the console with a
   * narrower capability set, and narrowing your own view is not an escalation.
   * It is a view aid and not a security boundary: every server action still
   * re-checks the REAL session (`requireCapability`), so a Global Admin
   * previewing as User remains a Global Admin to the server — which is correct,
   * because they are.
   */
  const previewing = role === "global_admin" ? toConsoleRole(as) : null;
  const viewing = previewing ?? role;

  const { panels, counts, search, failedTabs } = await loadConsolePanels(viewing);

  return { role: viewing, actualRole: role, email, panels, counts, search, failedTabs };
}

export default async function GlobalAdminConsole({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  let props: Awaited<ReturnType<typeof loadGlobalAdminConsole>>;
  try {
    props = await loadGlobalAdminConsole(searchParams);
  } catch (error) {
    if (error instanceof BackendUnavailableError) return <ConsoleUnavailable />;
    throw error;
  }

  return <ConsoleShell {...props} />;
}
