import type { Metadata } from "next";

import { ConsoleShell } from "@/features/console/ConsoleShell";
import { loadConsolePanels } from "@/features/console/panels/loadPanels";
import { requireRole } from "@/features/console/requireRole";
import { toConsoleRole } from "@/features/console/roles";

/** The console is never indexable — it is behind a login and about real people. */
export const metadata: Metadata = {
  title: "Global admin console — iqcommune",
  robots: { index: false, follow: false },
};

export default async function GlobalAdminConsole({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
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

  const { panels, counts, search } = await loadConsolePanels(viewing);

  return (
    <ConsoleShell
      role={viewing}
      actualRole={role}
      email={email}
      panels={panels}
      counts={counts}
      search={search}
    />
  );
}
