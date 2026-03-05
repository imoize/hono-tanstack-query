# hono-tanstack-query

> TanStack Query bindings for [Hono](https://hono.dev/) typed clients — fully
> typed, zero boilerplate.

[![npm version](https://img.shields.io/npm/v/hono-tanstack-query)](https://www.npmjs.com/package/hono-tanstack-query)
[![npm downloads](https://img.shields.io/npm/dm/hono-tanstack-query)](https://www.npmjs.com/package/hono-tanstack-query)
[![license](https://img.shields.io/npm/l/hono-tanstack-query)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue)](https://www.typescriptlang.org/)

Stop writing query keys. Stop duplicating types. `hono-tanstack-query` wraps
your Hono typed client and gives you `useQuery`, `useMutation`, and cache
helpers — all derived directly from your server's type definitions.

---

## Features

- 🔒 **End-to-end type safety** — your server types flow directly into every
  query and mutation
- ⚡ **TanStack Query v5** — built for the latest API, including
  `useInfiniteQuery`
- 🧠 **Zero query keys** — keys are inferred automatically from your route
  structure
- 🔁 **Cache helpers** — `getCache`, `setCache`, `invalidate`, `resetCache` out
  of the box
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

| Package                 | Version                                  |
| ----------------------- | ---------------------------------------- |
| `hono`                  | `>= 4`                                   |
| `@tanstack/react-query` | `>= 5`                                   |
| `react`                 | `>= 18` _(optional, for React bindings)_ |

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

That's it. `api` now has fully-typed query and mutation hooks available on every
route.

---

## Usage

### Queries

```ts
// Simple GET
const { data, isLoading, error } = api.users.$get.useQuery()

// GET with path params
const { data } = api.equipment[':id'].$get.useQuery({
  param: { id: '123' },
})

// GET with search params
const { data } = api.products.$get.useQuery({
  query: { category: 'tools', limit: '20' },
})

// Infinite / paginated query
const { data, fetchNextPage, hasNextPage } = api.feed.$get.useInfiniteQuery({
  initialPageParam: null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
```

### Mutations

```ts
// POST
const { mutate, isPending } = api.users.$post.useMutation({
  onSuccess: () => console.log('User created'),
})

mutate({ json: { name: 'Alice', email: 'alice@example.com' } })

// PUT with optimistic update
api.equipment[':id'].$put.useMutation({
  onMutate: async (vars) => {
    await api.equipment[':id'].$get.invalidate({ param: vars.param })
    const previous = api.equipment[':id'].$get.getCache({ param: vars.param })

    api.equipment[':id'].$get.setCache({ param: vars.param }, () => vars.json)

    return { previous }
  },
  onError: (_err, vars, context) => {
    // Rollback on failure
    api.equipment[':id'].$get.setCache(
      { param: vars.param },
      () => context?.previous,
    )
  },
})
```

### Cache Helpers

```ts
// Read from cache without triggering a fetch
const cached = api.equipment[':id'].$get.getCache({ param: { id: '123' } })

// Write to cache directly
api.equipment[':id'].$get.setCache({ param: { id: '123' } }, () => newData)

// Invalidate (triggers background refetch)
await api.equipment.$get.invalidate()

// Reset (removes cache + refetches if actively observed)
await api.equipment[':id'].$get.resetCache({ param: { id: '123' } })
```

### Invalidation Strategies

Pass a `strategy` option to control what gets invalidated:

```ts
await api.equipment.$get.invalidate(undefined, { strategy: 'parent' })
```

| Strategy   | Description                                    |
| ---------- | ---------------------------------------------- |
| `siblings` | All queries at the same path level _(default)_ |
| `parent`   | One level up in the route tree                 |
| `exact`    | Only this exact endpoint + input combination   |
| `none`     | No automatic invalidation                      |

---

## Type Inference

Use `$infer` to extract types from your API without importing server code:

```ts
type EquipmentItem  = typeof api.equipment[':id'].$get.$infer['data']
type EquipmentInput = typeof api.equipment[':id'].$get.$infer['input']
```

This is especially useful in shared frontend packages or monorepos where you
want to avoid bundling server code.

---

## Using in Loaders (SSR / Router)

```ts
// TanStack Router loader example
export const Route = createFileRoute('/equipment/$id')({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(
      api.equipment[':id'].$get.queryOptions({ param: params }),
    ),
})
```

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md)
before opening a pull request.

---

## License

MIT License

Copyright (c) 2024 Aadil Shaikh

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
