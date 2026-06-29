import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const ADMIN_REFRESH_INTERVAL_MS = 20_000;

type AdminRefreshContextValue = {
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refetchInterval: typeof ADMIN_REFRESH_INTERVAL_MS | false;
};

const AdminRefreshContext = createContext<AdminRefreshContextValue | null>(null);

export function AdminRefreshProvider({ children }: { children: ReactNode }) {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const value = useMemo<AdminRefreshContextValue>(
    () => ({
      autoRefresh,
      setAutoRefresh,
      refetchInterval: autoRefresh ? ADMIN_REFRESH_INTERVAL_MS : false,
    }),
    [autoRefresh],
  );

  return <AdminRefreshContext.Provider value={value}>{children}</AdminRefreshContext.Provider>;
}

export function useAdminRefresh() {
  const context = useContext(AdminRefreshContext);

  if (!context) {
    throw new Error("useAdminRefresh must be used within AdminRefreshProvider");
  }

  return context;
}
