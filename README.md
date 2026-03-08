# hono-tanstack-query

> TanStack Query bindings for [Hono](https://hono.dev/) typed clients — fully
> typed, zero boilerplate.

[![npm version](https://img.shields.io/npm/v/hono-tanstack-query)](https://www.npmjs.com/package/hono-tanstack-query)
[![npm downloads](https://img.shields.io/npm/dm/hono-tanstack-query)](https://www.npmjs.com/package/hono-tanstack-query)
[![license](https://img.shields.io/npm/l/hono-tanstack-query)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)](https://www.typescriptlang.org/)

Stop writing query keys. Stop duplicating types. `hono-tanstack-query` wraps
your Hono typed client and gives you `useQuery`, `useMutation`, and cache
helpers — all derived directly from your server's route definitions. No codegen,
no schemas, no manual type extraction.

---

## Features

- 🔒 **End-to-end type safety** — server route types flow directly into every
  hook, helper, and cache operation
- ⚡ **TanStack Query v5** — built for the latest API including
  `useInfiniteQuery` and Suspense variants
- 🧠 **Zero query keys** — keys are inferred automatically from your route path
  structure
- 🔁 **Full cache API** — `getCache`, `setCache`, `invalidate`, `resetCache`,
  `removeCache`, `prefetch`, `ensureData`
- 🎯 **Optimistic updates** — first-class `onMutate` / `onSettled` support with
  typed rollback context
- 🪶 **Zero runtime overhead** — all type magic is compile-time only
- 🛠 **Works everywhere** — React components, SSR, router loaders, and custom
  hook composition

---

## Installation

```bash
npm install hono-tanstack-query
# or
pnpm add hono-tanstack-query
# or
yarn add hono-tanstack-query
```

**Peer dependencies**

| Package                 | Version                     |
| ----------------------- | --------------------------- |
| `hono`                  | `>= 4`                      |
| `@tanstack/react-query` | `>= 5`                      |
| `react`                 | `>= 18` _(for React hooks)_ |

---

## Quick Start

### 1. Export your app type from the server

```ts
// server/src/index.ts
import { Hono } from 'hono'

const app = new Hono()
  .get('/posts', (c) => c.json([{ id: '1', title: 'Hello' }], 200))
  .get('/posts/:id', (c) =>
    c.json({ id: '1', title: 'Hello', content: '...' }, 200),
  )
  .post('/posts', (c) => c.json({ id: '2', title: 'New' }, 201))

export type AppType = typeof app
```

### 2. Create the typed API client

```ts
// client/src/lib/api.ts
import { hc } from 'hono/client'
import { HonoReactQuery } from 'hono-tanstack-query'
import { queryClient } from './query-client'
import type { AppType } from 'your-server'

const honoClient = hc<AppType>('http://localhost:3000')

export const api = HonoReactQuery(honoClient, { queryClient })
```

### 3. Use in components — fully typed, no annotations

```tsx
function PostList() {
  const { data: posts } = api.posts.$get.useQuery()
  //            ^? Post[]  — inferred automatically

  return posts?.map((post) => <div key={post.id}>{post.title}</div>)
}
```

---

## Configuration

`HonoReactQuery` accepts a config object as the second argument:

```ts
export const api = HonoReactQuery(honoClient, {
  // Required — TanStack QueryClient instance
  queryClient,

  // Default invalidation strategy after every mutation. Default: 'siblings'
  invalidation: 'siblings',

  // Global error handler — fires for every query and mutation error
  onError: (err) => {
    if (err.isUnauthorized()) window.location.href = '/login'
    if (err.isUnprocessable()) toast.error('Validation failed')
  },

  // Global success handler
  onSuccess: (data) => {
    console.log('Request succeeded', data)
  },
})
```

---

## Queries

### Basic query

```ts
const { data, isPending, isError, error } = api.posts.$get.useQuery()
```

### Query with path params

```ts
const { data: post } = api.posts[':id'].$get.useQuery({
  param: { id: '42' },
})
```

### Query with search params

```ts
const { data: orders } = api.orders.$get.useQuery({
  query: { status: 'pending', limit: '10' },
})
```

### Query with TanStack options

All standard TanStack Query options are available alongside your Hono input:

```ts
const { data } = api.posts[':id'].$get.useQuery({
  param: { id },
  staleTime: 30_000,
  gcTime: 5 * 60 * 1000,
  enabled: !!id,
  retry: 2,
  refetchOnWindowFocus: false,
})
```

### Query with `select` transform

```ts
const { data: title } = api.posts[':id'].$get.useQuery({
  param: { id },
  select: (post) => post.title,
  //                       ^? post: Post — fully typed
  // data is now: string
})
```

### Suspense query

```tsx
// Wrap with <Suspense> — no isPending check needed
const { data: post } = api.posts[':id'].$get.useSuspenseQuery({
  param: { id },
})
```

---

## Mutations

### Basic mutation

```ts
const { mutate, isPending } = api.posts.$post.useMutation({
  onSuccess: (post) => {
    console.log('Created', post.id)
    navigate(`/posts/${post.id}`)
  },
})

mutate({ json: { title: 'Hello', content: '...' } })
```

### Mutation with per-call invalidation override

```ts
const { mutate } = api.posts[':id'].$delete.useMutation({
  invalidate: 'parent', // Override the global strategy for this mutation
  onSuccess: () => navigate('/posts'),
})
```

### Mutation with explicit query keys to invalidate

```ts
const { mutate } = api.posts.$post.useMutation({
  invalidate: [['posts'], ['dashboard', 'stats']],
  onSuccess: () => toast.success('Post created'),
})
```

### Optimistic updates

```ts
api.posts[':id'].$put.useMutation({
  onMutate: async (variables) => {
    // Cancel in-flight queries to avoid overwriting the optimistic update
    await api.posts[':id'].$get.invalidate({ param: variables.param })

    // Snapshot the current cache value for rollback
    const previous = api.posts[':id'].$get.getCache({ param: variables.param })

    // Optimistically apply the change immediately
    api.posts[':id'].$get.setCache({ param: variables.param }, (old) => ({
      ...old,
      ...variables.json,
    }))

    return { previous }
  },
  onError: (_err, variables, context) => {
    // Roll back to the snapshot on failure
    api.posts[':id'].$get.setCache(
      { param: variables.param },
      () => context?.previous,
    )
  },
  onSettled: (_data, _err, variables) => {
    // Always refetch to sync with the server
    api.posts[':id'].$get.invalidate({ param: variables.param })
  },
})
```

---

## Infinite / Paginated Queries

```ts
const {
  data,
  fetchNextPage,
  fetchPreviousPage,
  hasNextPage,
  hasPreviousPage,
  isFetchingNextPage,
} = api.feed.$get.useInfiniteQuery({
  query: { limit: '20' },
  initialPageParam: null,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  getPreviousPageParam: (firstPage) => firstPage.prevCursor ?? undefined,
})

// data.pages is an array of your response type
data?.pages.flatMap((page) => page.items)
```

### Suspense infinite query

```ts
const { data } = api.feed.$get.useSuspenseInfiniteQuery({
  initialPageParam: null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
```

---

## Cache Helpers

All cache helpers are available directly on every endpoint — no `queryClient`
import needed.

```ts
// Read the cached value without triggering a fetch
const post = api.posts[':id'].$get.getCache({ param: { id: '42' } })
//    ^? Post | undefined

// Write directly to cache (updater receives the current value)
api.posts[':id'].$get.setCache({ param: { id: '42' } }, (old) => ({
  ...old,
  title: 'Updated title',
}))

// Invalidate — marks stale and triggers a background refetch for active queries
await api.posts.$get.invalidate()

// Invalidate a specific entry
await api.posts[':id'].$get.invalidate({ param: { id: '42' } })

// Remove from cache entirely (no refetch)
api.posts[':id'].$get.removeCache({ param: { id: '42' } })

// Reset — removes from cache AND refetches if the query is actively observed
await api.posts[':id'].$get.resetCache({ param: { id: '42' } })

// Prefetch — runs the query and stores in cache (useful in loaders)
await api.posts.$get.prefetch()

// Ensure data — returns cached data if fresh, otherwise fetches
const posts = await api.posts.$get.ensureData()
```

---

## Invalidation Strategies

Control what gets invalidated after a mutation via the `invalidation` config
option or per-mutation `invalidate` option:

| Strategy     | What gets invalidated                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------- |
| `'siblings'` | All queries at the same path level — e.g. after `posts.$post`, invalidates `posts.$get` _(default)_ |
| `'parent'`   | One level up — e.g. after `posts[':id'].$put`, invalidates all `posts.*` queries                    |
| `'exact'`    | Only the exact endpoint + input combination                                                         |
| `'none'`     | No automatic invalidation                                                                           |

```ts
// Global default
export const api = HonoReactQuery(honoClient, {
  queryClient,
  invalidation: 'parent',
})

// Per-mutation override
api.posts[':id'].$delete.useMutation({
  invalidate: 'parent',
})

// Explicit query key list
api.posts.$post.useMutation({
  invalidate: [['posts'], ['stats', 'post-count']],
})
```

---

## Error Handling

Every error thrown by a query or mutation is an `ApiError` instance. Use the
typed narrowing methods to handle specific status codes:

```ts
import { ApiError } from 'hono-tanstack-query'

const { error } = api.posts[':id'].$get.useQuery({ param: { id } })

if (error instanceof ApiError) {
  error.isNotFound() // 404
  error.isUnauthorized() // 401
  error.isForbidden() // 403
  error.isUnprocessable() // 422
  error.isServerError() // 5xx

  // Typed body — matches your server's declared response shape
  const body = error.body
}
```

### Validation error body

```ts
const { mutate } = api.posts.$post.useMutation({
  onError: (err) => {
    if (err.isUnprocessable()) {
      type ValidationError = (typeof api.posts.$post.$infer)['error']['body']
      const body = err.body as ValidationError
      const titleError = body.issues.find((i) => i.path[0] === 'title')?.message
    }
  },
})
```

### Global error handler

```ts
export const api = HonoReactQuery(honoClient, {
  queryClient,
  onError: (err) => {
    if (err.isUnauthorized()) window.location.href = '/login'
    toast.error(err.message)
  },
})
```

---

## Options Builders (SSR / Loaders)

Use `queryOptions` and `infiniteQueryOptions` outside of components — for
TanStack Router loaders, `getServerSideProps`, or custom hook composition.

```ts
// TanStack Router loader
export const Route = createFileRoute('/posts/$id')({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(
      api.posts[':id'].$get.queryOptions({
        param: { id: params.id },
      }),
    ),
})

// Custom hook composition
function usePostWithFallback(id: string) {
  return useQuery({
    ...api.posts[':id'].$get.queryOptions({ param: { id } }),
    placeholderData: keepPreviousData,
    select: (post) => post.title,
  })
}

// Mutation options builder
const opts = api.posts.$post.mutationOptions({
  onSuccess: () => toast('Post created'),
})
const { mutate } = useMutation(opts)
```

---

## Type Inference

Use `$infer` to extract types without any server imports. This is especially
useful in monorepos or shared frontend packages:

```ts
// Extract response data types
type Post      = typeof api.posts[':id'].$get.$infer['data']
type PostList  = typeof api.posts.$get.$infer['data']

// Extract request input type
type PostInput = typeof api.posts.$post.$infer['input']

// Extract error body type
type PostError = typeof api.posts[':id'].$get.$infer['error']

// Use in component props
interface PostCardProps {
  post: typeof api.posts.$get.$infer['data'][number]
}
```

`$infer` is a phantom type namespace — it exists only at compile time and
produces zero runtime bytes.

---

## Query Keys

Each endpoint's query key is derived automatically from the route path. You can
read the key directly if you need it for manual `queryClient` operations:

```ts
// Get the query key for an endpoint
const key = api.posts[':id'].$get.getQueryKey({ param: { id: '42' } })
// → [['posts', ':id', '$get'], { type: 'query', param: { id: '42' } }]

// Use with queryClient directly
queryClient.invalidateQueries({ queryKey: api.posts.$get.getQueryKey() })
```

---

## Raw Client Access

Each endpoint exposes the original Hono client method via `.call` — useful for
one-off fetches outside React Query:

```ts
const response = await api.posts.$get.call()
const posts = await response.json()
```

---

## Full Example

```ts
// lib/api.ts
import { hc } from 'hono/client'
import { HonoReactQuery } from 'hono-tanstack-query'
import { QueryClient } from '@tanstack/react-query'
import type { AppType } from 'your-server'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const honoClient = hc<AppType>('/api')

export const api = HonoReactQuery(honoClient, {
  queryClient,
  invalidation: 'siblings',
  onError: (err) => {
    if (err.isUnauthorized()) window.location.href = '/login'
  },
})
```

```tsx
// components/PostDetail.tsx
import { api } from '@/lib/api'
import { ApiError } from 'hono-tanstack-query'

export function PostDetail({ id }: { id: string }) {
  const {
    data: post,
    isPending,
    error,
  } = api.posts[':id'].$get.useQuery({
    param: { id },
    staleTime: 60_000,
  })
  //  ^? { id: string; title: string; content: string } | undefined

  if (isPending) return <Spinner />
  if (error instanceof ApiError && error.isNotFound()) return <NotFound />

  return <article>{post.title}</article>
}
```

```tsx
// components/CreatePost.tsx
import { api } from '@/lib/api'

export function CreatePost() {
  const { mutate, isPending } = api.posts.$post.useMutation({
    onSuccess: (post) => navigate(`/posts/${post.id}`),
  })

  return (
    <button
      onClick={() => mutate({ json: { title: 'Hello', content: '...' } })}
    >
      {isPending ? 'Creating…' : 'Create Post'}
    </button>
  )
}
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
