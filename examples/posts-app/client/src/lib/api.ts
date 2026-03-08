// ─── hono-tanstack-query integration ─────────────────────────────────────────
//
// This is the only file that knows about both the server and TanStack Query.
// Everything exported from here is fully typed — no generics, no casting needed
// anywhere else in the application.
//
// HOW IT WORKS:
//
//  1. `hc<AppType>('/api')` creates a typed proxy client.
//     AppType is a pure TS type — zero server code ships to the browser.
//     The proxy mirrors every route as a callable function.
//
//  2. `HonoReactQuery(honoClient, config)` wraps every endpoint with:
//       .useQuery()         — data fetching hook
//       .useMutation()      — mutation hook with onSuccess/onError/onSettled
//       .queryOptions()     — for router loaders / Suspense
//       .prefetch()         — prime the cache in loaders
//       .getCache()         — read without fetching
//       .setCache()         — write directly to cache
//       .invalidate()       — trigger refetch
//       .$infer             — extract TData / TError types (phantom, no runtime cost)
//
//  3. `api` is exported and imported directly into components.
//     No context, no provider, no custom hooks needed for simple cases.

import { hc } from 'hono/client'
import { HonoReactQuery } from 'hono-tanstack-query'
import { queryClient } from './query-client.js'
import type { AppType } from 'posts-server'

// hc<AppType> creates the Hono typed RPC proxy.
// The base URL '/api' is proxied to http://localhost:3000 by Vite in dev.
// In production, point this at your deployed server URL.
const honoClient = hc<AppType>('/api')

// HonoReactQuery wraps the proxy — every endpoint now has React Query hooks.
export const api = HonoReactQuery(honoClient, {
  queryClient,

  // Default invalidation strategy after mutations.
  // 'siblings' means: after POST /posts, invalidate GET /posts (same path, all methods).
  // Other options: 'parent' | 'exact' | 'none'
  invalidation: 'siblings',

  // Global error handler — runs for every query and mutation error.
  // Useful for toast notifications or auth redirects.
  onError: (err) => {
    if (err.isUnauthorized()) {
      window.location.href = '/login'
    }
  },
})

// Type helpers — extract data/input types without any annotation.
// Usage in a component:
type Post = typeof api.posts.$get.$infer['data']   // → Post type from GET /posts
type PostInput = typeof api.posts.$post.$infer['input']

