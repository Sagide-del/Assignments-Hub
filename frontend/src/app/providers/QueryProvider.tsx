import { QueryClient } from '@tanstack/react-query';

// Single shared TanStack Query client. Conservative defaults: this is a
// school-facing app where a stale assignment list for 30s is harmless, but
// we don't want silent background refetch storms on every window focus.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
