# Contributing to hono-tanstack-query

Thank you for your interest in contributing! This document covers everything you
need to get started.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Tests](#tests)
- [Linting and Formatting](#linting-and-formatting)
- [Commit Messages](#commit-messages)
- [Releasing](#releasing)
- [Opening a Pull Request](#opening-a-pull-request)
- [Reporting Issues](#reporting-issues)

---

## Project Structure

```
hono-tanstack-query/
├── src/
│   ├── index.ts          # Public exports
│   ├── types.ts          # All TypeScript types and interfaces
│   ├── endpoint.ts       # QueryEndpoint implementation (hooks + cache helpers)
│   ├── proxy.ts          # HonoReactQuery proxy factory
│   ├── invalidation.ts   # Invalidation strategy logic
│   ├── key.ts            # Query key builder
│   └── error.ts          # ApiError class
├── tests/
│   ├── endpoint.test.ts  # Hook and cache helper tests
│   ├── invalidation.test.ts
│   ├── key.test.ts
│   └── error.test.ts
├── tsup.config.ts        # Build config (ESM + CJS + .d.ts)
├── vitest.config.ts
├── eslint.config.ts
└── package.json
```

---

## Development Setup

**Prerequisites:** Node.js >= 18, pnpm >= 9

```bash
# Clone the repo
git clone https://github.com/your-org/hono-tanstack-query.git
cd hono-tanstack-query

# Install dependencies
pnpm install

# Run tests to verify everything is working
pnpm test
```

### Available Scripts

| Command           | Description                             |
| ----------------- | --------------------------------------- |
| `pnpm build`      | Compile to `dist/` (ESM + CJS + types)  |
| `pnpm test`       | Run all tests with Vitest               |
| `pnpm test:watch` | Run tests in watch mode                 |
| `pnpm lint`       | ESLint check                            |
| `pnpm lint:fix`   | ESLint with auto-fix                    |
| `pnpm typecheck`  | Run `tsc --noEmit`                      |
| `pnpm publint`    | Verify package.json exports are correct |
| `pnpm attw`       | Check "Are the Types Wrong?"            |

---

## Making Changes

### Types (`src/types.ts`)

This is the most sensitive file. A few rules:

- `ClientRequestEndpoint` uses `any` intentionally — it is a base constraint
  type, not a call site. Changing it to `unknown` breaks
  `InferResponseType<TEndpoint>` because Hono's type machinery matches against
  the concrete arg type.
- `InferSuccessType` must filter to 2xx status codes only
  (`200 | 201 | ... | 206`). Without the filter, error response bodies (e.g.
  `{ message: string }` from a 404) leak into `data`.
- Generic defaults on `useQuery`, `useSuspenseQuery`, and `queryOptions`
  **must** include `= InferSuccessType<TEndpoint>`. Without them, TypeScript
  resolves `TSelected` to `unknown` when `select` is not provided.
- `QueryClientProxy` must handle **both** forms of Hono endpoint functions:
  `(args: R, ...) => ...` (required args, e.g. routes with `param`) and
  `(args?: R, ...) => ...` (optional args). Both must resolve to
  `QueryEndpoint<T>`, not recurse as a nested proxy object.

### Endpoint implementation (`src/endpoint.ts`)

- All cache helpers (`getCache`, `setCache`, `invalidate`, etc.) must delegate
  to `queryClient` — never store state locally.
- `getCache` must `return queryClient.getQueryData(...)` — an early version
  omitted the `return`.
- `queryFn` wraps the Hono client call in `Promise.resolve().catch()` to handle
  both sync and async throws.
- Mutation `onSuccess` / `onError` / `onSettled` callbacks follow TanStack v5 —
  they receive 4 arguments: `(data, variables, context, meta)`.

### Adding a new cache helper or hook method

1. Add the signature to `QueryEndpoint<TEndpoint>` in `src/types.ts`
2. Implement it in `src/endpoint.ts` inside the `createEndpoint` factory
3. Add tests in `tests/endpoint.test.ts`
4. Document it in `README.md`

---

## Tests

Tests use [Vitest](https://vitest.dev/) and run in a Node environment (no
JSDOM). Hooks are tested by calling `queryFn` and `mutationFn` directly — no
`renderHook` or `@testing-library/react` required.

```bash
# Run once
pnpm test

# Watch mode
pnpm test:watch

# With coverage
pnpm test --coverage
```

### Writing tests

Tests create a real Hono app and use `hc()` with `app.request` as the `fetch`
option — this exercises the full type chain end-to-end:

```ts
import { Hono } from 'hono'
import { hc } from 'hono/client'
import { HonoReactQuery } from '../src'
import { QueryClient } from '@tanstack/react-query'

const app = new Hono().get('/posts', (c) => c.json([{ id: '1' }], 200))
const client = hc<typeof app>('http://localhost', { fetch: app.request })
const queryClient = new QueryClient()
const api = HonoReactQuery(client, { queryClient })

it('fetches posts', async () => {
  const queryFn = api.posts.$get.queryOptions().queryFn
  const data = await queryFn({
    queryKey: [],
    signal: new AbortController().signal,
    meta: undefined,
  })
  expect(data).toEqual([{ id: '1' }])
})
```

---

## Linting and Formatting

```bash
pnpm lint        # Check
pnpm lint:fix    # Fix
```

ESLint is configured in `eslint.config.ts`. The most important rules:

- `@typescript-eslint/no-explicit-any` — allowed only in `ClientRequestEndpoint`
  and `QueryClientProxy`, where `any` is a required base constraint. These are
  annotated with `// eslint-disable-next-line` comments explaining why.
- `@typescript-eslint/no-redundant-type-constituents` — union types must not
  include redundant members.

Prettier is used for formatting via the ESLint Prettier plugin.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

| Type       | When to use                              |
| ---------- | ---------------------------------------- |
| `feat`     | New feature or new public API            |
| `fix`      | Bug fix                                  |
| `types`    | Type-only change (no runtime effect)     |
| `test`     | Adding or fixing tests                   |
| `docs`     | Documentation only                       |
| `refactor` | Code change that is not a fix or feature |
| `chore`    | Tooling, deps, config                    |

Examples:

```
feat(endpoint): add ensureData helper
fix(types): add default to TSelected in useQuery
types(proxy): handle required-args endpoints in QueryClientProxy
docs: update README cache helpers section
```

---

## Releasing

This project uses [Changesets](https://github.com/changesets/changesets) for
versioning and changelog generation.

### Adding a changeset

When your PR includes a user-visible change, add a changeset:

```bash
pnpm changeset
```

This opens an interactive prompt. Choose:

- **major** — breaking API change
- **minor** — new feature, backwards compatible
- **patch** — bug fix or internal change

The generated `.changeset/*.md` file should be committed with your PR.

### What counts as a breaking change

- Removing or renaming a public export
- Changing the signature of `HonoReactQuery` in a non-backwards-compatible way
- Changing the query key structure (would break existing `queryClient` caches)
- Narrowing or widening types in a way that breaks existing call sites

### Release process (maintainers only)

```bash
# Consume all pending changesets, bump versions, update CHANGELOG.md
pnpm changeset version

# Build and publish to npm
pnpm build && pnpm publish
```

---

## Opening a Pull Request

1. Fork the repository and create a branch from `main`
2. Make your changes following the guidelines above
3. Run `pnpm test`, `pnpm lint`, and `pnpm typecheck` — all must pass
4. Add a changeset if your change is user-visible (`pnpm changeset`)
5. Open a PR with a clear description of what changed and why
6. Link any related issues

### PR checklist

- [ ] Tests pass (`pnpm test`)
- [ ] No lint errors (`pnpm lint`)
- [ ] No type errors (`pnpm typecheck`)
- [ ] Changeset added if needed (`pnpm changeset`)
- [ ] README updated if public API changed

---

## Reporting Issues

Please include:

- Your `hono-tanstack-query`, `hono`, and `@tanstack/react-query` versions
- A minimal reproduction — ideally a TypeScript snippet that demonstrates the
  issue
- Expected vs actual behavior
- Any relevant TypeScript error messages (the full error including the type
  output)

Type inference issues are especially welcome — please include the inferred type
you're seeing vs what you expected.
