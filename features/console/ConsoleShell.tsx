"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { selectClass } from "@/components/ui/control";

import { ConsoleSearch } from "./ConsoleSearch";
import { CacheAllTabs, type TabRead } from "./panels/CacheAllTabs";
import { RowFocusContext } from "./RowFocusContext";
import { CONSOLE_ROLES, ROLE_LABELS, can, tabsFor, type ConsoleRole } from "./roles";
import type { RowFocus, SearchHit } from "./search";

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
  actualRole,
  email,
  panels,
  counts,
  search = [],
  failedTabs = [],
  tabReads = [],
}: {
  role: ConsoleRole;
  email: string;
  /**
   * The signed-in role, when it differs from the one being rendered — a Global
   * Admin previewing a narrower console. Only they get the switch.
   */
  actualRole?: ConsoleRole;
  /** Rendered panel keyed by tab id. A tab with no panel yet says so. */
  panels?: Partial<Record<string, ReactNode>>;
  /** Row count per tab id, for the sidebar badges (V7 `.sb-badge`). */
  counts?: Record<string, number>;
  /** What the header search can find, already scoped to this role. */
  search?: readonly SearchHit[];
  /** Tab ids whose live read failed this request (see `loadConsolePanels`).
   *  Non-empty renders a slim "known issue" strip above the header — this is
   *  a backend problem, not something the admin broke. */
  failedTabs?: readonly string[];
  /** Every simple-row tab's read result, win or lose — mirrored into the
   *  client cache regardless of which tab is currently open (see
   *  `CacheAllTabs`), so a tab nobody has clicked into yet still has a
   *  same-session fallback the day its own read fails. */
  tabReads?: readonly TabRead[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  const tabs = tabsFor(role);

  /**
   * The open tab lives in the URL (`?tab=payouts`), not in component state.
   *
   * With state alone a refresh — or a back button, or a shared link — dropped
   * you back on Practitioners, which on a ten-tab console means finding your
   * place again every time. In the URL the tab survives a reload, can be sent
   * to a colleague, and makes browser Back mean what it looks like it means.
   *
   * Validated against the tabs THIS role may open rather than trusted: a `?tab`
   * naming a tab the role has no access to (Activity, for an Admin) must fall
   * back rather than render an empty panel.
   */
  const requested = params.get("tab");
  const fromUrl = tabs.some((tab) => tab.id === requested) ? requested! : tabs[0].id;

  /**
   * The URL is the source of truth on arrival; after that, state is.
   *
   * Deriving `active` from `useSearchParams` alone was correct and slow: every
   * tab click went through `router.replace`, which re-runs the route on the
   * server, so the console kept showing the OLD tab's rows for a second or two
   * before the new ones arrived. Measured, not guessed — clicking Payouts and
   * sampling the DOM found the previous tab's controls still mounted at 400ms
   * and the payouts controls only at ~2s.
   *
   * So the click updates state (instant, no network) and the URL is rewritten
   * with `history.replaceState`, which Next reflects in `useSearchParams`
   * without refetching the route.
   *
   * When the URL moves on its own — Back/Forward, or the role switch, which IS
   * a real navigation — state has to follow it. That resync happens DURING
   * render against a remembered previous value, not in an effect: an effect
   * would render the stale tab first and the right one a commit later, which is
   * the flash this whole change exists to remove.
   */
  const [active, setActive] = useState(fromUrl);
  const [syncedFrom, setSyncedFrom] = useState(fromUrl);
  if (syncedFrom !== fromUrl) {
    setSyncedFrom(fromUrl);
    setActive(fromUrl);
  }

  /**
   * The console menu, below the desktop breakpoint.
   *
   * Under 900px the sidebar used to stack above the panel, so every tab in the
   * console sat between the header and the content you came to read; and the
   * header actions were squeezed into a bar with no room for them. Both now
   * live behind one control at the LEFT of the header — navigation belongs
   * where navigation is, and a header action that cannot fit belongs in the
   * overflow rather than wrapping.
   */
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Choosing a tab is the end of navigating, so the menu closes with it.
   *
   * `replaceState`, not `push`: ten tabs would otherwise bury the page you
   * arrived from under ten history entries, and Back would walk the tabs
   * instead of leaving the console. Any other query already in the URL — `?as=`
   * for the role preview — is preserved, so switching tabs does not silently
   * end a preview.
   *
   * The first tab writes no `?tab=` at all, so the console's own URL stays
   * clean; anything else is only reachable by having chosen it.
   */
  const openTab = (id: string) => {
    setActive(id);
    setMenuOpen(false);

    const next = new URLSearchParams(window.location.search);
    if (id === tabs[0].id) next.delete("tab");
    else next.set("tab", id);

    const query = next.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  };

  /**
   * The row a search result asked for, handed to the panel through context.
   *
   * Opening a tab is only half of answering a search: the operator asked for a
   * RECORD, and landing them on a fifty-row table to find it themselves is the
   * half-measure that makes search not worth using. The panel takes it from
   * here — clearing its filters so the row is not filtered out, expanding it,
   * and scrolling it into view.
   */
  const [focus, setFocus] = useState<RowFocus | null>(null);

  const openHit = (entry: SearchHit) => {
    openTab(entry.tab);
    // The nonce makes a repeat selection of the same row a new event; without
    // it, re-picking a row you had since collapsed would change nothing.
    setFocus((current) => ({
      tab: entry.tab,
      rowKey: entry.rowKey,
      nonce: (current?.nonce ?? 0) + 1,
    }));
  };

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

  /** Switching the previewed role keeps you on the tab you were reading. */
  const roleHref = (next: string) => {
    const query = new URLSearchParams();
    if (next !== "global_admin") query.set("as", next);
    if (active !== tabs[0].id) query.set("tab", active);
    const search = query.toString();
    return search ? `/globaladmin?${search}` : "/globaladmin";
  };

  return (
    <div className="flex min-h-dvh flex-col bg-surface-soft">
      <CacheAllTabs tabs={tabReads} />
      {failedTabs.length > 0 ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 border-b border-flag-warn-edge bg-flag-warn px-4 py-2 text-center text-sm text-gold-dark"
        >
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-gold" />
          <span>
            We&apos;re having a technical issue on our end — our team is already fixing it. You can keep
            working; some data may be a little out of date until it&apos;s resolved.
          </span>
        </div>
      ) : null}
      <header className="sticky top-0 z-[var(--z-header)] flex h-16 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-[12px] sm:gap-6 sm:px-7">
        {/* The console menu, left of the wordmark — below 900px it owns the
            navigation and the actions that do not fit the bar. */}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="console-menu"
          aria-label={menuOpen ? "Close the console menu" : "Open the console menu"}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border-strong text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold min-[900px]:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            {menuOpen ? (
              <path d="M18 6 6 18M6 6l12 12" />
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        {/* Logo + "Admin Console" lockup (V7 .nav-logo).
            Allowed to shrink, unlike the actions on the right. Both sides were
            `shrink-0`, so at exactly 360px — where the strapline switches on —
            nothing could give and the bar pushed the whole page into
            horizontal scroll. The identity truncates; the controls do not. */}
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-baseline leading-none">
              <span className="text-4xl font-bold tracking-display text-gold">iq</span>
              <span className="text-4xl font-light tracking-display text-ink">commune</span>
            </span>
            <span className="hidden truncate text-2xs font-medium uppercase leading-none tracking-caps text-ink-faint min-[360px]:block">
              Insight Quotient - Unleashed
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
          <ConsoleSearch
            index={search}
            onSelect={openHit}
            inputId="console-search"
            className="w-[300px]"
          />
        </div>

        <div className="ml-auto hidden shrink-0 items-center gap-3 sm:flex min-[900px]:ml-0">
          {/*
            V7's "Viewing as:" switch. In the mockup it swaps a `role-*` class
            on `<body>` so one static file can demonstrate three permission
            levels; here it re-renders the console with a narrower capability
            set, which is the same question asked honestly.

            Offered only to a Global Admin, and only ever narrowing — checking
            what an Admin or a User actually sees is how a control that leaked
            into the wrong tier gets caught. Everyone else has nothing to switch
            to, so their role is stated instead.
          */}
          {actualRole === "global_admin" ? (
            <>
              <label className="sr-only" htmlFor="viewing-as">
                Viewing the console as
              </label>
              <select
                id="viewing-as"
                value={role}
                onChange={(event) => router.push(roleHref(event.target.value))}
                className={selectClass({ tone: "inline", size: "sm", className: "hidden w-auto sm:block" })}
              >
                {CONSOLE_ROLES.map((value) => (
                  <option key={value} value={value}>
                    Viewing as: {SHORT_ROLE[value]}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span
              title={ROLE_LABELS[role]}
              className="hidden rounded-md border border-border-strong bg-surface px-2.5 py-1.5 text-sm text-ink-muted sm:block"
            >
              <span className="sr-only">Signed in as: </span>
              Viewing as: {SHORT_ROLE[role]}
              <span className="sr-only"> — {ROLE_LABELS[role]}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => waiting && openTab(waiting.id)}
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
          id="console-menu"
          aria-label="Console sections"
          /* Below 900px this is the menu and is collapsed by default; at 900px
             and above it is the permanent sidebar and `menuOpen` is irrelevant.
             It owns its own scroll in both modes — a menu taller than the
             screen with no scroll path is a menu whose last item cannot be
             reached. */
          className={`${
            menuOpen ? "block" : "hidden"
          } max-h-[calc(100dvh-64px)] shrink-0 overflow-y-auto overscroll-y-contain border-b border-border bg-surface min-[900px]:sticky min-[900px]:top-16 min-[900px]:!block min-[900px]:h-[calc(100dvh-64px)] min-[900px]:w-[230px] min-[900px]:self-start min-[900px]:border-b-0 min-[900px]:border-r`}
        >
          {/* What the header sheds on the way down: the search (hidden below
              900px) and the identity/actions (below 640px). They are offered
              here rather than dropped, because a control that disappears on a
              phone is a control that does not exist there. */}
          <div className="border-b border-border p-4 min-[900px]:hidden">
            <ConsoleSearch
              index={search}
              onSelect={openHit}
              inputId="menu-search"
              className="mb-3"
            />

            {actualRole === "global_admin" ? (
              <>
                <label className="sr-only" htmlFor="menu-viewing-as">
                  Viewing the console as
                </label>
                <select
                  id="menu-viewing-as"
                  value={role}
                  onChange={(event) => router.push(roleHref(event.target.value))}
                  className={selectClass({ tone: "inline", size: "sm" })}
                >
                  {CONSOLE_ROLES.map((value) => (
                    <option key={value} value={value}>
                      Viewing as: {SHORT_ROLE[value]}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Viewing as: {SHORT_ROLE[role]}</p>
            )}

            {waiting ? (
              <button
                type="button"
                onClick={() => openTab(waiting.id)}
                className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-md border border-border-strong px-3 text-left text-sm text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                <span aria-hidden className="h-[7px] w-[7px] shrink-0 rounded-full bg-gold" />
                {counts?.[waiting.id]} waiting in {waiting.label}
              </button>
            ) : null}
          </div>

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
                          onClick={() => openTab(tab.id)}
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
                            //
                            // A failed live read reports `count: 0` — showing
                            // that as-is would read as "queue cleared" on the
                            // exact red/gold tabs this badge exists to flag as
                            // urgent, during the one moment (a backend outage)
                            // an operator most needs the real number. An em
                            // dash says "unknown", not "empty".
                            <span
                              title={
                                failedTabs.includes(tab.id)
                                  ? "Last count unavailable — backend issue"
                                  : undefined
                              }
                              className={`ml-auto rounded-full px-[7px] py-px text-2xs font-semibold ${
                                tab.badge === "green"
                                  ? "bg-green text-surface"
                                  : tab.badge === "red"
                                    ? "bg-red text-surface"
                                    : "bg-gold text-ink"
                              }`}
                            >
                              {failedTabs.includes(tab.id) ? "—" : count}
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
            {/* Panels arrive as server-rendered nodes, so they cannot be handed
                the focus target as a prop from here — they were built before
                this component ran. Context reaches them because they render
                inside it.

                `key={current.id}` forces a remount on every tab switch. Every
                simple-row tab renders through the same `CachedPanel` component
                type now (see `loadPanels.tsx`) — without a key, React reconciles
                tab B's props onto tab A's fiber instead of remounting, so tab
                B's first render briefly runs with tab A's still-cached state
                and can feed one tab's rows into another tab's panel. */}
            <RowFocusContext.Provider
              key={current.id}
              value={focus?.tab === current.id ? focus : null}
            >
              {panels?.[current.id] ?? (
                <p className="rounded-lg border border-border bg-surface px-6 py-8 text-center text-base text-ink-muted">
                  This panel is not built yet.
                </p>
              )}
            </RowFocusContext.Provider>
          </div>
        </main>
      </div>
    </div>
  );
}
