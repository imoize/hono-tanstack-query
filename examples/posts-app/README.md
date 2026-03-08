# posts-app

A full-stack example showing how `hono-tanstack-query` connects a typed Hono API to React with zero boilerplate and complete end-to-end type safety.

## Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Server   | Hono · Node.js · TypeScript · ESM               |
| Client   | React · Vite · TypeScript · ESM                 |
| Fetching | TanStack Query v5 · hono-tanstack-query          |
| UI       | shadcn/ui · Tailwind CSS · React Router v6      |

## Project structure

```
posts-app/
├── package.json              # pnpm workspace root
├── pnpm-workspace.yaml
│
├── server/                   # Hono API
│   ├── package.json          # name: "posts-server"
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # App entry — exports AppType
│       ├── routes/
│       │   └── posts.ts      # GET /posts, GET /posts/:id, POST /posts
│       └── types/
│           └── api.ts        # Post, ValidationError, NotFoundError
│
└── client/                   # React + Vite
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.ts
    ├── index.html
    └── src/
        ├── main.tsx          # QueryClientProvider
        ├── App.tsx           # React Router routes
        ├── index.css         # Tailwind directives + shadcn CSS vars
        ├── lib/
        │   ├── query-client.ts   # QueryClient singleton
        │   └── api.ts            # ← THE integration point
        ├── components/
        │   ├── ui/               # shadcn primitives
        │   ├── PostList.tsx
        │   └── CreatePostForm.tsx
        └── pages/
            ├── HomePage.tsx
            ├── PostDetailPage.tsx
            └── NewPostPage.tsx
```

## Setup

Requires Node.js 20+ and pnpm.

```bash
# Clone and install
git clone <repo>
cd posts-app
pnpm install

# Terminal 1 — API server (http://localhost:3000)
pnpm dev:server

# Terminal 2 — Vite dev server (http://localhost:5173)
pnpm dev:client
```

Or run both in parallel:

```bash
pnpm dev
```

## How the integration works

### 1 — Server exports `AppType`

```ts
// server/src/index.ts
const app = new Hono()
  .use(cors())
  .route('/posts', postsRouter)

export type AppType = typeof app   // ← pure TS type, zero runtime cost
```

`AppType` encodes the entire route tree: every path, method, input shape,
and response body per status code. Nothing runs in the browser — it's erased
at compile time.

### 2 — Routes are typed via `c.json(body, status)`

```ts
// server/src/routes/posts.ts
.get('/:id', (c) => {
  if (!post) return c.json({ message: 'Not found' } satisfies NotFoundError, 404)
  return c.json(post satisfies Post, 200)
})
```

`c.json(body, 200)` produces `ClientResponse<Post, 200, 'json'>`.
`c.json(err, 404)` produces `ClientResponse<NotFoundError, 404, 'json'>`.

Hono merges these into a discriminated union that `hono-tanstack-query` reads
to type `data` and `error` on the client — no code generation required.

### 3 — `hc<AppType>` + `HonoReactQuery` (one file)

```ts
// client/src/lib/api.ts
import { hc } from 'hono/client'
import { HonoReactQuery } from 'hono-tanstack-query'
import type { AppType } from 'posts-server'

const honoClient = hc<AppType>('/api')   // Vite proxies /api → :3000

export const api = HonoReactQuery(honoClient, {
  queryClient,
  invalidation: 'siblings',   // POST /posts → auto-invalidates GET /posts
})
```

This is the only file that knows about both layers.
Every other file just imports `api` and uses the hooks.

### 4 — Typed hooks in components

```ts
// Fetching a list — data is Post[] automatically
const { data: posts, isPending } = api.posts.$get.useQuery()

// Fetching a single item with a param
const { data: post, isError, error } = api.posts[':id'].$get.useQuery({
  param: { id },        // ← typed: must match the route param name
  staleTime: 30_000,    // ← TanStack option, same object, no wrapper
})

// Mutation — mutate's argument is typed from the route's json input
const { mutate, isPending } = api.posts.$post.useMutation({
  onSuccess: (post) => navigate(`/posts/${post.id}`),
})
mutate({ json: { title, content, author, tags } })
```

### 5 — Typed error handling

```ts
// error is ApiError<NotFoundError | ValidationError | ...>
if (error instanceof ApiError && error.isNotFound()) {
  // error.body is typed as NotFoundError here
}

// 422 field-level errors from the server's ValidationError shape
if (error.isUnprocessable()) {
  const body = error.body as ValidationError
  const titleError = body.issues.find(i => i.path[0] === 'title')?.message
}
```

### 6 — Type extraction without imports

```ts
// Extract the data type of any endpoint — no import from server needed
type Post = typeof api.posts.$get.$infer['data'][number]
type PostInput = typeof api.posts.$post.$infer['input']
```

## API reference

| Method | Path         | Body (request)     | Success        | Error                    |
|--------|--------------|--------------------|----------------|--------------------------|
| GET    | /posts       | —                  | `Post[]` 200   | —                        |
| GET    | /posts/:id   | —                  | `Post` 200     | `NotFoundError` 404      |
| POST   | /posts       | `CreatePostBody`   | `Post` 201     | `ValidationError` 422    |
