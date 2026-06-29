import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, type AnyRouter } from "@tanstack/react-router";
import { useState } from "react";
import { AuthProvider } from "./AuthContext";
import { SearchProvider } from "./SearchContext";

export function AppProviders({ router }: { router: AnyRouter }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <SearchProvider>
          <RouterProvider router={router} />
        </SearchProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
