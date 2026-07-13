"use client";

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// The role scope a global admin is previewing the console as. Downgrade-only:
// only a real global admin ever changes this (AdminConsoleView ignores it for
// lower tiers), so it can never grant more than the viewer already has.
export type RoleView = "global" | "admin" | "user";

interface AdminUI {
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
  activeTab: string;
  setActiveTab: (v: string) => void;
  viewAs: RoleView;
  setViewAs: (v: RoleView) => void;
}

const AdminUIContext = createContext<AdminUI | null>(null);

// Every tab the console can show. The active tab is mirrored in the URL (?tab=)
// so it survives a hard refresh and is deep-linkable. Unknown values fall back
// to the default; per-user gating (Activity = SA-only, Gallery) is enforced in
// AdminConsoleView, not here.
const KNOWN_TABS = [
  "requests", "practitioners", "sessions", "agreements",
  "consent", "payouts", "photos", "gallery", "activity", "settings",
];
const DEFAULT_TAB = "practitioners";

export function AdminUIProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [globalSearch, setGlobalSearch] = useState("");

  // Global-admin "Viewing as" preview. Defaults to full access; a non-global
  // viewer's console ignores this entirely (see AdminConsoleView), so it is a
  // pure display toggle with no privilege implications.
  const [viewAs, setViewAs] = useState<RoleView>("global");

  // Seed from the URL on mount so a refresh restores the same tab.
  const [activeTab, setActiveTabState] = useState(() => {
    const t = searchParams.get("tab");
    return t && KNOWN_TABS.includes(t) ? t : DEFAULT_TAB;
  });

  const setActiveTab = useCallback(
    (v: string) => {
      setActiveTabState(v);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("tab", v);
      // Shallow URL update — no scroll jump, no server round-trip.
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const value = useMemo(
    () => ({ globalSearch, setGlobalSearch, activeTab, setActiveTab, viewAs, setViewAs }),
    [globalSearch, activeTab, setActiveTab, viewAs]
  );

  return <AdminUIContext.Provider value={value}>{children}</AdminUIContext.Provider>;
}

export function useAdminUI(): AdminUI {
  const ctx = useContext(AdminUIContext);
  if (!ctx) throw new Error("useAdminUI must be used within AdminUIProvider");
  return ctx;
}
