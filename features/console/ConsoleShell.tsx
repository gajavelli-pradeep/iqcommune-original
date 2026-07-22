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
      <header className="sticky top-0 z-[var(--z-header)] flex h-16 items-center gap-6 border-b border-border bg-surface/95 px-4 backdrop-blur-[12px] sm:px-7">
        {/* Logo + "Admin Console" lockup (V7 .nav-logo). */}
        <div className="flex shrink-0 items-center gap-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-baseline leading-none">
              <span className="text-4xl font-bold tracking-display text-gold">iq</span>
              <span className="text-4xl font-light tracking-display text-ink">commune</span>
            </span>
            <span className="hidden text-2xs font-medium uppercase leading-none tracking-caps text-ink-faint min-[360px]:block">
              Where financial intelligence connects
            </span>
          </div>
          <span aria-hidden className="hidden h-8 w-px bg-border-strong sm:block" />
          <span className="hidden flex-col gap-0.5 sm:flex">
            <span className="text-2xs font-semibold uppercase leading-none tracking-caps text-gold-dark">
              Admin
            </span>
            <span className="text-2xs font-semibold uppercase leading-none tracking-caps text-gold-dark">
              Console
            </span>
          </span>
        </div>

        {/* Global search (V7 .nav-search). */}
        <div className="hidden flex-1 justify-center min-[900px]:flex">
          <div className="flex w-[300px] items-center gap-2 rounded-full border border-border-strong bg-surface-soft px-4 py-[7px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden className="shrink-0 text-ink-faint">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              aria-label="Search across practitioners, sessions, requests"
              placeholder="Search across practitioners, sessions, requests…"
              className="w-full bg-transparent text-base text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-3 min-[900px]:ml-0">
          {/* Global Admin can preview the console as another role (V7 role-switch). */}
          {role === "global_admin" ? (
            <label className="sr-only" htmlFor="console-view-as">
              Viewing as
            </label>
          ) : null}
          {role === "global_admin" ? (
            <select
              id="console-view-as"
              defaultValue="global"
              className="hidden rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold sm:block"
            >
              <option value="global">Viewing as: Global Admin</option>
              <option value="admin">Viewing as: Admin</option>
              <option value="user">Viewing as: User</option>
            </select>
          ) : (
            <span className="hidden text-2xs font-semibold uppercase tracking-caps text-gold-dark sm:inline">
              {ROLE_LABELS[role]}
            </span>
          )}
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full border border-border-strong text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span aria-hidden className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full border-[1.5px] border-surface bg-gold" />
          </button>
          <span
            aria-hidden
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-ink text-xs font-semibold text-surface"
          >
            {email.slice(0, 2).toUpperCase()}
          </span>
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
