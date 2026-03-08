import { QueryClient } from '@tanstack/react-query'

// Single QueryClient instance shared across the app.
// Created here (not in a component) so it can be imported by api.ts
// without a circular dependency.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds — avoids redundant refetches
      // when navigating between the list and detail pages.
      staleTime:          30_000,
      // Retry once on failure (default is 3 — too aggressive for a demo).
      retry:              1,
      // Refetch when the window regains focus (good UX default).
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
