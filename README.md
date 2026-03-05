# hono-tanstack-query

> TanStack Query bindings for [Hono](https://hono.dev/) typed clients — fully typed, zero boilerplate.

[![npm version](https://img.shields.io/npm/v/hono-tanstack-query)](https://www.npmjs.com/package/hono-tanstack-query)
[![npm downloads](https://img.shields.io/npm/dm/hono-tanstack-query)](https://www.npmjs.com/package/hono-tanstack-query)
[![license](https://img.shields.io/npm/l/hono-tanstack-query)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)](https://www.typescriptlang.org/)

Stop writing query keys. Stop duplicating types. `hono-tanstack-query` wraps your Hono typed client and gives you `useQuery`, `useMutation`, and cache helpers — all derived directly from your server's type definitions.

---

## Features

- 🔒 **End-to-end type safety** — your server types flow directly into every query and mutation
- ⚡ **TanStack Query v5** — built for the latest API, including `useInfiniteQuery`
- 🧠 **Zero query keys** — keys are inferred automatically from your route structure
- 🔁 **Cache helpers** — `getCache`, `setCache`, `invalidate`, `resetCache` out of the box
- 🪶 **Lightweight** — no runtime overhead, pure type-level magic
- 🛠 **Works everywhere** — React, SSR, and router loader contexts

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

| Package | Version |
|---|---|
| `hono` | `>= 4` |
| `@tanstack/react-query` | `>= 5` |
| `react` | `>= 18` *(optional, for React bindings)* |

---

## Quick Start

```ts
import { hc } from 'hono/client'
import { HonoReactQuery } from 'hono-tanstack-query'
import { queryClient } from './query-client'
import type { App } from '@your-org/server'

const hono = hc<App>('http://localhost:3000').api

export const api = HonoReactQuery(hono, { queryClient })
```

That's it. `api` now has fully-typed query and mutation hooks available on every route.

---

## Usage

### Queries

```ts
// Fetch all users
const { data, isLoading, error } = api.users.$get.useQuery()

// Fetch a single todo by ID
const { data } = api.todos[':id'].$get.useQuery({
  param: { id: '42' },
})

// Fetch orders with search params
const { data } = api.orders.$get.useQuery({
  query: { status: 'pending', limit: '10' },
})

// Infinite / paginated query (e.g. activity feed)
const { data, fetchNextPage, hasNextPage } = api.feed.$get.useInfiniteQuery({
  initialPageParam: null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
```

### Mutations

```ts
// Create a new user
const { mutate, isPending } = api.users.$post.useMutation({
  onSuccess: () => console.log('User created!'),
})

mutate({ json: { name: 'Alice', email: 'alice@example.com' } })

// Update a todo with optimistic update
api.todos[':id'].$put.useMutation({
  onMutate: async (vars) => {
    await api.todos[':id'].$get.invalidate({ param: vars.param })
    const previous = api.todos[':id'].$get.getCache({ param: vars.param })

    // Optimistically apply the update immediately
    api.todos[':id'].$get.setCache(
      { param: vars.param },
      () => vars.json
    )

    return { previous }
  },
  onError: (_err, vars, context) => {
    // Roll back on failure
    api.todos[':id'].$get.setCache(
      { param: vars.param },
      () => context?.previous
    )
  },
})

// Delete an order
const { mutate: deleteOrder } = api.orders[':id'].$delete.useMutation({
  onSuccess: () => api.orders.$get.invalidate(),
})

deleteOrder({ param: { id: '99' } })
```

### Cache Helpers

```ts
// Read from cache without triggering a fetch
const todo = api.todos[':id'].$get.getCache({ param: { id: '42' } })

// Write to cache directly
api.todos[':id'].$get.setCache({ param: { id: '42' } }, () => updatedTodo)

// Invalidate (triggers background refetch for all todo queries)
await api.todos.$get.invalidate()

// Reset (removes cache + refetches if actively observed)
await api.todos[':id'].$get.resetCache({ param: { id: '42' } })
```

### Invalidation Strategies

Pass a `strategy` option to control what gets invalidated:

```ts
// After creating an order, invalidate the whole orders list
await api.orders.$get.invalidate(undefined, { strategy: 'siblings' })
```

| Strategy | Description |
|---|---|
| `siblings` | All queries at the same path level *(default)* |
| `parent` | One level up in the route tree |
| `exact` | Only this exact endpoint + input combination |
| `none` | No automatic invalidation |

---

## Type Inference

Use `$infer` to extract types from your API without importing server code:

```ts
type Todo      = typeof api.todos[':id'].$get.$infer['data']
type TodoInput = typeof api.todos[':id'].$get.$infer['input']

type User      = typeof api.users[':id'].$get.$infer['data']
type OrderList = typeof api.orders.$get.$infer['data']
```

This is especially useful in shared frontend packages or monorepos where you want to avoid bundling server code.

---

## Using in Loaders (SSR / Router)

```ts
// TanStack Router loader — prefetch a user's orders before the page renders
export const Route = createFileRoute('/users/$userId/orders')({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(
      api.users[':id'].orders.$get.queryOptions({ param: { id: params.userId } })
    ),
})
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.


SOFTWARE.
