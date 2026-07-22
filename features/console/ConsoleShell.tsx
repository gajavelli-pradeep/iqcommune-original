"use client";

import { useState } from "react";

import { ROLE_LABELS, tabsFor, type ConsoleRole } from "./roles";

/**
 * The console chrome, shared by all three routes.
 *
 * One component, three routes: `/user`, `/console` and `/globaladmin` render
 * this with a different role. Nothing here is duplicated per role — the sidebar
 * is derived from the capability model, so a tab a role cannot open is not
 * rendered rather than hidden with CSS.
 *
 * Panels arrive per sub-phase (P8b–P8d). Each is passed in rather than imported
 * so this file stays chrome and never becomes the 3,761-line page the spec is.
 */
export function ConsoleShell({
  role,
  email,
  panels,
}: {
  role: ConsoleRole;
  email: string;
  /** Rendered panel keyed by tab id. A tab with no panel yet says so. */
  panels?: Partial<Record<string, React.ReactNode>>;
}) {
  const tabs = tabsFor(role);
  const [active, setActive] = useState(tabs[0].id);

  const sections = tabs.reduce<Record<string, typeof tabs>>((grouped, tab) => {
    grouped[tab.section] = [...(grouped[tab.section] ?? []), tab];
    return grouped;
  }, {});

  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div className="flex min-h-dvh flex-col bg-surface-soft">
      <header className="sticky top-0 z-[var(--z-header)] border-b border-border bg-surface px-4 sm:px-6">
        <div className="flex h-[60px] items-center justify-between gap-4">
          <span className="flex items-baseline leading-none">
            <span className="text-4xl font-bold tracking-display text-gold">iq</span>
            <span className="text-4xl font-light tracking-display text-ink">commune</span>
          </span>
          <div className="flex items-center gap-3">
            {/* The role is stated, not selectable. The mockup's switcher is a
                demo affordance; here the route and the signed-in account decide
                it, and offering a control to change it would be offering a way
                to grant yourself access. */}
            <span className="hidden text-2xs font-semibold uppercase tracking-caps text-gold-dark sm:inline">
              {ROLE_LABELS[role]}
            </span>
            <span className="text-sm text-ink-muted">{email}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 min-[900px]:flex-row">
        <nav aria-label="Console sections" className="shrink-0 min-[900px]:w-[220px]">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section} className="mb-5">
              <p className="mb-2 text-2xs font-semibold uppercase tracking-caps text-ink-faint">
                {section}
              </p>
              <ul>
                {items.map((tab) => (
                  <li key={tab.id}>
                    <button
                      type="button"
                      aria-current={tab.id === active ? "page" : undefined}
                      onClick={() => setActive(tab.id)}
                      className={`mb-0.5 flex min-h-11 w-full items-center rounded-md px-3 text-left text-base transition-colors ${
                        tab.id === active
                          ? "bg-gold-light font-medium text-gold-dark"
                          : "text-ink-muted hover:bg-surface hover:text-ink"
                      }`}
                    >
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <main className="min-w-0 flex-1">
          <h1 className="mb-4 text-3xl font-semibold text-ink">{current.label}</h1>
          {panels?.[current.id] ?? (
            <p className="rounded-lg border border-border bg-surface px-6 py-8 text-center text-base text-ink-muted">
              This panel is not built yet.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
