"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface AdminUI {
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
  activeTab: string;
  setActiveTab: (v: string) => void;
}

const AdminUIContext = createContext<AdminUI | null>(null);

export function AdminUIProvider({ children }: { children: React.ReactNode }) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [activeTab, setActiveTab] = useState("practitioners");

  const value = useMemo(
    () => ({ globalSearch, setGlobalSearch, activeTab, setActiveTab }),
    [globalSearch, activeTab]
  );

  return <AdminUIContext.Provider value={value}>{children}</AdminUIContext.Provider>;
}

export function useAdminUI(): AdminUI {
  const ctx = useContext(AdminUIContext);
  if (!ctx) throw new Error("useAdminUI must be used within AdminUIProvider");
  return ctx;
}
