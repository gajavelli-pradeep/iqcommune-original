"use client";

import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface AdminUI {
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
  activeTab: string;
  setActiveTab: (v: string) => void;
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
    () => ({ globalSearch, setGlobalSearch, activeTab, setActiveTab }),
    [globalSearch, activeTab, setActiveTab]
  );

  return <AdminUIContext.Provider value={value}>{children}</AdminUIContext.Provider>;
}

export function useAdminUI(): AdminUI {
  const ctx = useContext(AdminUIContext);
  if (!ctx) throw new Error("useAdminUI must be used within AdminUIProvider");
  return ctx;
}
