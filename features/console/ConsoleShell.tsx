"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ROLE_LABELS, can, tabsFor, type ConsoleRole } from "./roles";

/**
 * The console chrome, shared by all three routes.
 *
 * One component, three routes: `/user`, `/console` and `/globaladmin` render
 * this with a different role. Nothing here is duplicated per role — the sidebar
 * is derived from the capability model, so a tab a role cannot open is not
 * rendered rather than hidden with CSS.
 *
 * Panels arrive per sub-phase. Each is passed in rather than imported so this
 * file stays chrome and never becomes the 3,761-line page the spec is.
 */

const SHORT_ROLE: Record<ConsoleRole, string> = {
  user: "User",
  admin: "Admin",
  global_admin: "Global Admin",
};

/** Sidebar icon per tab id (V7 `.sb-item svg`). */
const TAB_ICONS: Record<string, ReactNode> = {
  practitioners: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  agreements: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  requests: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  confirmations: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="9 15 11 17 15 13" />
    </>
  ),
  sessions: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  photos: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  payouts: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  settings: (
    <>
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </>
  ),
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
};

export function ConsoleShell({
  role,
  email,
  panels,
  counts,
}: {
  role: ConsoleRole;
  email: string;
  /** Rendered panel keyed by tab id. A tab with no panel yet says so. */
  panels?: Partial<Record<string, ReactNode>>;
  /** Row count per tab id, for the sidebar badges (V7 `.sb-badge`). */
  counts?: Record<string, number>;
}) {
  const router = useRouter();
  const tabs = tabsFor(role);
  const [active, setActive] = useState(tabs[0].id);

  const sections = tabs.reduce<Record<string, typeof tabs>>((grouped, tab) => {
    grouped[tab.section] = [...(grouped[tab.section] ?? []), tab];
    return grouped;
  }, {});

  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  // The notification bell's target. V7's bell is a `showToast('3 notifications
  // pending')` placeholder; a bell that lights up and goes nowhere is worse
  // than no bell, so it opens the first queue actually waiting on the operator
  // — the same tabs the red sidebar badges mark — and its dot is lit only when
  // one exists, rather than always.
  const waiting = tabs.find((tab) => tab.badge === "red" && (counts?.[tab.id] ?? 0) > 0);

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
          {/*
            V7 puts a "Viewing as:" role `<select>` here, but that select is the
            mockup's own demonstration device — it swaps a `role-*` class on
            `<body>` so one static file can show three permission levels. The
            real product resolves the role from the signed-in session and serves
            a different route per role (see `roles.ts`), so there is nothing for
            it to switch: it would be a dropdown that changes nothing, and a
            Global Admin cannot become an Admin by choosing to.

            The role is therefore stated rather than offered — in the compact
            form, so it occupies the select's footprint rather than dominating
            the bar. The full description is the accessible name.
          */}
          <span
            title={ROLE_LABELS[role]}
            className="hidden rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink-muted sm:block"
          >
            <span className="sr-only">Signed in as: </span>
            Viewing as: {SHORT_ROLE[role]}
            <span className="sr-only"> — {ROLE_LABELS[role]}</span>
          </span>
          <button
            type="button"
            onClick={() => waiting && setActive(waiting.id)}
            disabled={!waiting}
            aria-label={
              waiting
                ? `${counts?.[waiting.id]} waiting in ${waiting.label} — open it`
                : "Nothing is waiting for you"
            }
            /* 34px drawn (V7 `.nav-icon-btn`); the pseudo-element carries the
               44px tap area on touch. */
            className="relative flex h-[34px] w-[34px] items-center justify-center rounded-full border border-border-strong text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold [@media(any-pointer:coarse)]:after:absolute [@media(any-pointer:coarse)]:after:left-1/2 [@media(any-pointer:coarse)]:after:top-1/2 [@media(any-pointer:coarse)]:after:h-11 [@media(any-pointer:coarse)]:after:w-11 [@media(any-pointer:coarse)]:after:-translate-x-1/2 [@media(any-pointer:coarse)]:after:-translate-y-1/2 [@media(any-pointer:coarse)]:after:content-['']"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {waiting ? (
              <span aria-hidden className="absolute right-1.5 top-1.5 h-[7px] w-[7px] rounded-full border-[1.5px] border-surface bg-gold" />
            ) : null}
          </button>
          <span
            aria-hidden
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-ink text-xs font-semibold text-surface"
          >
            {email.slice(0, 2).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col min-[900px]:flex-row">
        {/* V7 .sidebar — flush-left, sticky, its own scroll; a footer identity block. */}
        <nav
          aria-label="Console sections"
          className="shrink-0 border-b border-border bg-surface min-[900px]:sticky min-[900px]:top-16 min-[900px]:flex min-[900px]:h-[calc(100dvh-64px)] min-[900px]:w-[230px] min-[900px]:flex-col min-[900px]:self-start min-[900px]:overflow-y-auto min-[900px]:border-b-0 min-[900px]:border-r"
        >
          <div className="flex-1 py-2 min-[900px]:py-0">
            {Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                <p className="px-5 pt-5 pb-1.5 text-2xs font-semibold uppercase tracking-caps text-ink-faint">
                  {section}
                </p>
                <ul>
                  {items.map((tab) => {
                    const isActive = tab.id === active;
                    const count = counts?.[tab.id];
                    return (
                      <li key={tab.id}>
                        <button
                          type="button"
                          data-tab={tab.id}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setActive(tab.id)}
                          className={`flex min-h-11 w-full items-center gap-2.5 border-l-[2.5px] px-5 py-[0.6rem] text-left text-base transition-colors ${
                            isActive
                              ? "border-l-gold bg-gold-light font-medium text-gold-dark"
                              : "border-l-transparent text-ink-muted hover:bg-surface-soft hover:text-ink"
                          }`}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            aria-hidden
                            className={`shrink-0 ${isActive ? "opacity-100" : "opacity-70"}`}
                          >
                            {TAB_ICONS[tab.id]}
                          </svg>
                          {tab.label}
                          {tab.badge && typeof count === "number" ? (
                            // V7 `.sb-badge` — gold/green/red per tab. The gold
                            // badge takes an ink label where V7 uses white
                            // (2.1:1 — fails AA and the project's
                            // gold-fill-takes-an-ink-label rule); green and red
                            // carry white legibly. Fill and shape are V7's.
                            // Do not "fix" the gold one back.
                            <span
                              className={`ml-auto rounded-full px-[7px] py-px text-2xs font-semibold ${
                                tab.badge === "green"
                                  ? "bg-green text-surface"
                                  : tab.badge === "red"
                                    ? "bg-red text-surface"
                                    : "bg-gold text-ink"
                              }`}
                            >
                              {count}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          {/* V7 .sb-footer — the signed-in identity. */}
          <div className="hidden border-t border-border px-5 py-4 min-[900px]:block">
            <p className="text-base font-medium text-ink">{SHORT_ROLE[role]}</p>
            <p className="text-xs text-ink-faint">{email}</p>
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          {/* V7 .page-hdr — title, subtitle, and the Export action. */}
          <div className="flex items-center justify-between gap-4 border-b border-border bg-surface px-4 py-5 sm:px-7">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-body text-ink">{current.title}</h1>
              <p className="mt-px text-base text-ink-faint">{current.subtitle}</p>
            </div>
            {/* V7 .page-hdr-r — present only on the tabs that declare one. */}
            {current.headerAction &&
            (!current.headerAction.requires || can(role, current.headerAction.requires)) ? (
              <div className="flex shrink-0 gap-2.5">
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className="rounded-full border border-border-strong px-4 py-1.5 text-base text-ink-muted transition-colors hover:border-ink-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                >
                  {current.headerAction.label}
                </button>
              </div>
            ) : null}
          </div>

          <div className="p-4 sm:p-7">
            {panels?.[current.id] ?? (
              <p className="rounded-lg border border-border bg-surface px-6 py-8 text-center text-base text-ink-muted">
                This panel is not built yet.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
