import { createProxy } from './proxy'
import type { HcQueryConfig, QueryClientProxy } from './types'

/**
 * Wraps a Hono typed client with TanStack Query — batteries included.
 *
 * Every HTTP endpoint gets:
 * - `.useQuery()`                  — hook, no double import
 * - `.useSuspenseQuery()`          — suspense variant
 * - `.useInfiniteQuery()`          — cursor / offset pagination
 * - `.useSuspenseInfiniteQuery()`  — suspense + pagination
 * - `.useMutation()`               — hook with onMutate/onSettled for optimistic updates
 * - `.queryOptions()`              — for SSR / router loaders / custom hook composition
 * - `.infiniteQueryOptions()`      — for SSR infinite queries
 * - `.mutationOptions()`           — for composing outside components
 * - `.prefetch()`                  — prime the cache in loaders
 * - `.ensureData()`                — fetch-if-missing in loaders
 * - `.invalidate()`                — imperative cache invalidation
 * - `.getCache()`                  — read cache without triggering fetch
 * - `.setCache()`                  — write directly into the cache
 * - `.removeCache()`               — remove queries from cache entirely
 * - `.resetCache()`                — reset to initial state and refetch
 * - `.getQueryKey()`               — get the raw TanStack QueryKey
 * - `.$infer`                      — zero-annotation type extraction (phantom)
 * - `.call`                        — raw Hono client escape hatch
 *
 * Input is **flat** — no `input:` wrapper:
 * ```ts
 * api.equipment[':id'].$get.useQuery({ param: { id } })
 * //                        not  { input: { param: { id } } }
 * ```
 *
 * Hono input keys and TanStack Query options coexist in one flat object.
 * Internally they are kept strictly separated — neither leaks into the wrong layer.
 * ```ts
 * api.equipment[':id'].$get.useQuery({
 *   param: { id },          // ← Hono input
 *   staleTime: 30_000,      // ← TanStack option
 *   select: (d) => d.name,  // ← TanStack option, return type auto-inferred
 * })
 * ```
 *
 * Status codes are resolved automatically:
 * - 2xx → `data`  (typed from your Hono route schema)
 * - 3xx/4xx/5xx → `error` as `ApiError<TBody>` — never in `data`
 *
 * @example
 * ```ts
 * // ── Setup (once) ──────────────────────────────────────────────────────────
 * import { hc } from 'hono/client'
 * import { HonoReactQuery } from 'hono-tanstack-query'
 * import { queryClient } from './query-client'
 * import type { App } from '@adil6572/server'
 *
 * const hono = hc<App>('http://localhost:3000').api
 *
 * export const api = HonoReactQuery(hono, {
 *   queryClient,
 *   invalidation: 'siblings',
 *   onError: (err) => {
 *     if (err.isUnauthorized()) window.location.href = '/login'
 *   },
 * })
 *
 * // ── Query ─────────────────────────────────────────────────────────────────
 * const { data, error } = api.equipment[':id'].$get.useQuery({
 *   param: { id },
 *   staleTime: 30_000,
 *   select: (d) => d.name,  // data is typed as string automatically
 * })
 *
 * // ── Infinite / paginated query ─────────────────────────────────────────────
 * const { data, fetchNextPage, hasNextPage } = api.feed.$get.useInfiniteQuery({
 *   initialPageParam: null,
 *   getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
 * })
 *
 * // ── Mutation with optimistic update ───────────────────────────────────────
 * const { mutate } = api.equipment[':id'].$put.useMutation({
 *   onMutate: async (variables) => {
 *     await api.equipment[':id'].$get.invalidate()
 *     const previous = api.equipment[':id'].$get.getCache({ param: variables.param })
 *     api.equipment[':id'].$get.setCache({ param: variables.param }, (old) => ({
 *       ...old!, ...variables.json,
 *     }))
 *     return { previous }
 *   },
 *   onError: (_err, variables, context) => {
 *     // Roll back on failure
 *     if (context?.previous) {
 *       api.equipment[':id'].$get.setCache({ param: variables.param }, context.previous)
 *     }
 *   },
 *   onSettled: () => api.equipment[':id'].$get.invalidate(),
 * })
 *
 * // ── Type extraction (no annotation needed) ────────────────────────────────
 * type EquipmentItem = typeof api.equipment[':id'].$get.$infer['data']
 * type EquipmentInput = typeof api.equipment[':id'].$get.$infer['input']
 *
 * // ── Router loader / SSR ───────────────────────────────────────────────────
 * await api.equipment.$get.prefetch()
 * await api.equipment[':id'].$get.prefetch({ param: { id: params.id } })
 *
 * // ── Imperative cache ──────────────────────────────────────────────────────
 * await api.equipment.$get.invalidate()
 * api.equipment[':id'].$get.setCache({ param: { id } }, updatedItem)
 * api.equipment[':id'].$get.removeCache({ param: { id } })
 * await api.equipment[':id'].$get.resetCache({ param: { id } })
 * ```
 */
export function HonoReactQuery<T extends object>(
  client: T,
  config: HcQueryConfig,
): QueryClientProxy<T> {
  return createProxy(client, config)
}

export { ApiError } from './error'
export type { InvalidationStrategy } from './invalidation'
export type {
  HcQueryConfig,
  QueryEndpoint,
  QueryClientProxy,
  InferSuccessType,
  InferErrorBodyType,
  InferRequestType,
  InferEndpoint,
  ClientRequestEndpoint,
  TypedQueryOptions,
  TypedInfiniteQueryOptions,
  TypedMutationOptions,
  FlatQueryArgs,
  FlatMutationArgs,
  FlatSuspenseQueryArgs,
  FlatInfiniteQueryArgs,
  FlatSuspenseInfiniteQueryArgs,
  PageParam,
  InfiniteData,
} from './types'
