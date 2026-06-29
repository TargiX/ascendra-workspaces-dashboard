import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SearchContextValue = {
  query: string;
  setQuery: (query: string) => void;
  clearQuery: () => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");

  const value = useMemo(
    () => ({
      query,
      setQuery,
      clearQuery: () => setQuery(""),
    }),
    [query],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useGlobalSearch() {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error("useGlobalSearch must be used within SearchProvider");
  }

  return context;
}
