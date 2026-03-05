import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  UseSuspenseQueryOptions,
  UseQueryResult,
  UseMutationResult,
  UseSuspenseQueryResult,
  QueryFunctionContext,
  QueryClient,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
  UseSuspenseInfiniteQueryOptions,
  UseSuspenseInfiniteQueryResult,
  InfiniteData,
  GetNextPageParamFunction,
  GetPreviousPageParamFunction,
} from '@tanstack/react-query'
import type { ClientRequestOptions, InferRequestType, InferResponseType } from 'hono/client'
import type { ApiError } from './error'
import type { InvalidationStrategy } from './invalidation'

// ─── Endpoint signature ───────────────────────────────────────────────────────
// Matches what hc<AppType>() produces for every route method.
// `args` is the flat input object { param?, query?, json?, form?, header?, cookie? }
// `options` is ClientRequestOptions (fetch overrides, signal, etc.)
export type ClientRequestEndpoint = (args?: any, options?: ClientRequestOptions) => Promise<any>

// ─── Re-export Hono's own InferRequestType ────────────────────────────────────
// InferRequestType<TEndpoint> extracts the `args` shape directly from the
// typed hc() proxy — param, query, json, form, header, cookie all included.
export type { InferRequestType }

// ─── Success body — what goes into TanStack `data` ───────────────────────────
// InferResponseType<TEndpoint> gives the union of ALL response bodies.
// InferResponseType<TEndpoint, 200> narrows to a specific status.
// We use the full union here; endpoint.ts calls resolveResponse which throws
// ApiError on non-2xx so at runtime `data` is always the success body.
export type InferSuccessType<TEndpoint extends ClientRequestEndpoint> = InferResponseType<TEndpoint>

// ─── Error body — what goes into ApiError<TBody>.body ────────────────────────
// We derive this by excluding the 2xx response type from the full union.
// This works because Hono encodes status in the ClientResponse discriminant.
export type InferErrorBodyType<TEndpoint extends ClientRequestEndpoint> = Exclude<
  InferResponseType<TEndpoint>,
  InferResponseType<TEndpoint, 200 | 201 | 202 | 203 | 204 | 205 | 206>
>

// ─── Typed ApiError for this endpoint ────────────────────────────────────────
export type EndpointApiError<TEndpoint extends ClientRequestEndpoint> = ApiError<
  InferErrorBodyType<TEndpoint>
>

// ─── $infer namespace — zero-annotation type extraction ──────────────────────
// Usage:
//   type Data  = typeof api.users.$get.$infer['data']
//   type Error = typeof api.users.$get.$infer['error']
//   type Input = typeof api.users.$get.$infer['input']
export interface InferEndpoint<TEndpoint extends ClientRequestEndpoint> {
  data: InferSuccessType<TEndpoint>
  error: EndpointApiError<TEndpoint>
  input: InferRequestType<TEndpoint>
  /** Paged data shape when used with useInfiniteQuery */
  pages: InfiniteData<InferSuccessType<TEndpoint>>
}

// ─── Flat input args — no `input:` wrapper ───────────────────────────────────
interface HonoInput {
  param?: Record<string, string>
  query?: Record<string, string | string[]>
  json?: Record<string, unknown>
  form?: Record<string, string | Blob>
}

// Whether the endpoint needs any input at all
type NeedsInput<TEndpoint extends ClientRequestEndpoint> =
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {} extends InferRequestType<TEndpoint> ? false : true

// ─── TanStack options split ───────────────────────────────────────────────────
// We separate Hono input keys from TanStack Query options clearly.
// This gives developers both: typed Hono params AND full TanStack options.

/** All TanStack UseQueryOptions except the keys we manage internally */
type TanStackQueryOptions<TData, TError, TSelected> = Omit<
  UseQueryOptions<TData, TError, TSelected>,
  'queryKey' | 'queryFn'
>

/** All TanStack UseSuspenseQueryOptions except the keys we manage internally */
type TanStackSuspenseOptions<TData, TError, TSelected> = Omit<
  UseSuspenseQueryOptions<TData, TError, TSelected>,
  'queryKey' | 'queryFn'
>

/** All TanStack UseMutationOptions except the keys we manage internally */
type TanStackMutationOptions<TData, TError, TVariables> = Omit<
  UseMutationOptions<TData, TError, TVariables>,
  'mutationKey' | 'mutationFn'
>

// ─── Flat query args ──────────────────────────────────────────────────────────
// Hono params are spread directly alongside TanStack options.
// If the endpoint needs input (param/query/json/form) those keys are required.
// All TanStack options (staleTime, enabled, select, placeholderData, etc.) are available.
export type FlatQueryArgs<
  TEndpoint extends ClientRequestEndpoint,
  TSelected = InferSuccessType<TEndpoint>,
> = TanStackQueryOptions<InferSuccessType<TEndpoint>, EndpointApiError<TEndpoint>, TSelected> &
  (NeedsInput<TEndpoint> extends true ? InferRequestType<TEndpoint> : Partial<HonoInput>)

// ─── Flat suspense query args ─────────────────────────────────────────────────
export type FlatSuspenseQueryArgs<
  TEndpoint extends ClientRequestEndpoint,
  TSelected = InferSuccessType<TEndpoint>,
> = TanStackSuspenseOptions<InferSuccessType<TEndpoint>, EndpointApiError<TEndpoint>, TSelected> &
  (NeedsInput<TEndpoint> extends true ? InferRequestType<TEndpoint> : Partial<HonoInput>)

// ─── Flat mutation args ───────────────────────────────────────────────────────
// Full TanStack mutation options + our invalidation extension.
// onMutate / onSettled are included for optimistic update support.
export type FlatMutationArgs<TEndpoint extends ClientRequestEndpoint> = TanStackMutationOptions<
  InferSuccessType<TEndpoint>,
  EndpointApiError<TEndpoint>,
  InferRequestType<TEndpoint>
> & {
  /** Override invalidation for this specific mutation call */
  invalidate?: InvalidationStrategy | QueryKey[]
}

// ─── Infinite query page param ────────────────────────────────────────────────
export type PageParam = unknown

// ─── Flat infinite query args ─────────────────────────────────────────────────
// `getNextPageParam` is required — we cannot know the pagination shape.
// `initialPageParam` is required by TanStack v5.
// Hono input keys are spread in alongside TanStack options.
// NOTE: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>
//       takes 5 type args in TanStack Query v5 (TQueryData was merged into TQueryFnData).
export type FlatInfiniteQueryArgs<
  TEndpoint extends ClientRequestEndpoint,
  TSelected = InfiniteData<InferSuccessType<TEndpoint>>,
> = Omit<
  UseInfiniteQueryOptions<
    InferSuccessType<TEndpoint>,
    EndpointApiError<TEndpoint>,
    TSelected,
    QueryKey,
    PageParam
  >,
  'queryKey' | 'queryFn'
> &
  (NeedsInput<TEndpoint> extends true ? InferRequestType<TEndpoint> : Partial<HonoInput>) & {
    getNextPageParam: GetNextPageParamFunction<PageParam, InferSuccessType<TEndpoint>>
    initialPageParam: PageParam
  }

// ─── Flat suspense infinite query args ───────────────────────────────────────
export type FlatSuspenseInfiniteQueryArgs<
  TEndpoint extends ClientRequestEndpoint,
  TSelected = InfiniteData<InferSuccessType<TEndpoint>>,
> = Omit<
  UseSuspenseInfiniteQueryOptions<
    InferSuccessType<TEndpoint>,
    EndpointApiError<TEndpoint>,
    TSelected,
    QueryKey,
    PageParam
  >,
  'queryKey' | 'queryFn'
> &
  (NeedsInput<TEndpoint> extends true ? InferRequestType<TEndpoint> : Partial<HonoInput>) & {
    getNextPageParam: GetNextPageParamFunction<PageParam, InferSuccessType<TEndpoint>>
    initialPageParam: PageParam
  }

// ─── TypedQueryOptions ────────────────────────────────────────────────────────
export type TypedQueryOptions<TData, TError, TSelected = TData> = UseQueryOptions<
  TData,
  TError,
  TSelected
> & {
  queryKey: QueryKey
  queryFn: (opts: QueryFunctionContext) => Promise<TData>
}

// ─── TypedInfiniteQueryOptions ────────────────────────────────────────────────
export type TypedInfiniteQueryOptions<
  TData,
  TError,
  TSelected = InfiniteData<TData>,
> = UseInfiniteQueryOptions<TData, TError, TSelected, QueryKey, PageParam> & {
  queryKey: QueryKey
  queryFn: (opts: QueryFunctionContext<QueryKey, PageParam>) => Promise<TData>
  getNextPageParam: GetNextPageParamFunction<PageParam, TData>
  initialPageParam: PageParam
}

// ─── TypedMutationOptions ─────────────────────────────────────────────────────
export interface TypedMutationOptions<TData, TVariables, TError, TContext = unknown> {
  mutationKey: QueryKey
  mutationFn: (input: TVariables) => Promise<TData>
  onMutate: NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['onMutate']>
  onSuccess: NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['onSuccess']>
  onError: NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['onError']>
  onSettled: NonNullable<UseMutationOptions<TData, TError, TVariables, TContext>['onSettled']>
}

// ─── Optimistic update helpers ────────────────────────────────────────────────
// Passed to onMutate so users can snapshot + rollback safely.
export interface OptimisticContext<TData> {
  /** Snapshot taken before the optimistic write — pass to `queryClient.setQueryData` on rollback */
  previousData: TData | undefined
  /** The query key that was optimistically updated */
  queryKey: QueryKey
}

// ─── Per-endpoint interface ───────────────────────────────────────────────────
export interface QueryEndpoint<TEndpoint extends ClientRequestEndpoint> {
  /** Raw Hono client method — escape hatch for one-off calls */
  call: TEndpoint

  /**
   * Zero-annotation type extraction namespace.
   * Never call this at runtime — it's a phantom type slot.
   * @example
   *   type Data  = typeof api.users.$get.$infer['data']
   *   type Input = typeof api.users.$get.$infer['input']
   */
  $infer: InferEndpoint<TEndpoint>

  // ── Key helpers ────────────────────────────────────────────────────────────
  /** Get the TanStack Query key for this endpoint + optional input */
  getQueryKey(input?: InferRequestType<TEndpoint>): QueryKey

  // ── Options builders (for SSR / router loaders / custom hook composition) ──
  /**
   * Build typed queryOptions — all TanStack options available, Hono input spread in.
   * @example
   *   // SSR dehydration
   *   await queryClient.prefetchQuery(api.users.$get.queryOptions())
   *   // Custom hook composition
   *   return useQuery({ ...api.users.$get.queryOptions(), placeholderData: keepPreviousData })
   */
  queryOptions<TSelected>(
    args?: FlatQueryArgs<TEndpoint, TSelected>,
  ): TypedQueryOptions<InferSuccessType<TEndpoint>, EndpointApiError<TEndpoint>, TSelected>

  /**
   * Build typed infiniteQueryOptions — for use with useInfiniteQuery outside components.
   */
  infiniteQueryOptions<
    TSelected extends InfiniteData<InferSuccessType<TEndpoint>> = InfiniteData<
      InferSuccessType<TEndpoint>
    >,
  >(
    args: FlatInfiniteQueryArgs<TEndpoint, TSelected>,
  ): TypedInfiniteQueryOptions<InferSuccessType<TEndpoint>, EndpointApiError<TEndpoint>, TSelected>

  /**
   * Build typed mutationOptions — includes onMutate/onSettled for optimistic updates.
   * @example
   *   const opts = api.users.$post.mutationOptions({ onSuccess: () => toast('Done') })
   *   useMutation(opts)
   */
  mutationOptions(
    args?: FlatMutationArgs<TEndpoint>,
  ): TypedMutationOptions<
    InferSuccessType<TEndpoint>,
    InferRequestType<TEndpoint>,
    EndpointApiError<TEndpoint>
  >

  // ── React hooks — primary DX surface ─────────────────────────────────────
  /**
   * Drop-in useQuery — full TanStack options available, no double import.
   * `select` return type is automatically inferred.
   * @example
   *   const { data } = api.equipment[':id'].$get.useQuery({
   *     param: { id },
   *     staleTime: 30_000,
   *     select: (d) => d.name,   // ← data typed as string, not full object
   *   })
   */
  useQuery<TSelected>(
    args?: FlatQueryArgs<TEndpoint, TSelected>,
  ): UseQueryResult<TSelected, EndpointApiError<TEndpoint>>

  /** Suspense variant — wrap with <Suspense>, no isLoading needed */
  useSuspenseQuery<TSelected>(
    args?: FlatSuspenseQueryArgs<TEndpoint, TSelected>,
  ): UseSuspenseQueryResult<TSelected, EndpointApiError<TEndpoint>>

  /**
   * Infinite / paginated query — cursor and offset pagination supported.
   * @example
   *   const { data, fetchNextPage } = api.feed.$get.useInfiniteQuery({
   *     query: { limit: '20' },
   *     initialPageParam: null,
   *     getNextPageParam: (lastPage) => lastPage.nextCursor,
   *   })
   */
  useInfiniteQuery<
    TSelected extends InfiniteData<InferSuccessType<TEndpoint>> = InfiniteData<
      InferSuccessType<TEndpoint>
    >,
  >(
    args: FlatInfiniteQueryArgs<TEndpoint, TSelected>,
  ): UseInfiniteQueryResult<TSelected, EndpointApiError<TEndpoint>>

  /** Suspense variant of useInfiniteQuery */
  useSuspenseInfiniteQuery<
    TSelected extends InfiniteData<InferSuccessType<TEndpoint>> = InfiniteData<
      InferSuccessType<TEndpoint>
    >,
  >(
    args: FlatSuspenseInfiniteQueryArgs<TEndpoint, TSelected>,
  ): UseSuspenseInfiniteQueryResult<TSelected, EndpointApiError<TEndpoint>>

  /**
   * Drop-in useMutation with full TanStack options.
   * Supports optimistic updates via onMutate / onSettled.
   * @example
   *   const { mutate } = api.equipment[':id'].$put.useMutation({
   *     onMutate: async (variables) => {
   *       await api.equipment[':id'].$get.invalidate()
   *       const previous = api.equipment[':id'].$get.getCache({ param: variables.param })
   *       api.equipment[':id'].$get.setCache({ param: variables.param }, (old) => ({
   *         ...old!, ...variables.json
   *       }))
   *       return { previous, queryKey: api.equipment[':id'].$get.getQueryKey(variables) }
   *     },
   *     onError: (_err, variables, context) => {
   *       if (context?.previous) {
   *         api.equipment[':id'].$get.setCache({ param: variables.param }, context.previous)
   *       }
   *     },
   *   })
   */
  useMutation(
    args?: FlatMutationArgs<TEndpoint>,
  ): UseMutationResult<
    InferSuccessType<TEndpoint>,
    EndpointApiError<TEndpoint>,
    InferRequestType<TEndpoint>
  >

  // ── Imperative helpers ─────────────────────────────────────────────────────
  /** Invalidate this endpoint's queries (optionally scoped to an input) */
  invalidate(input?: InferRequestType<TEndpoint>): Promise<void>

  /** Prefetch into the query cache — useful in router loaders */
  prefetch(args?: FlatQueryArgs<TEndpoint>): Promise<void>

  /** Ensure data is in cache, fetching only if stale/missing */
  ensureData(args?: FlatQueryArgs<TEndpoint>): Promise<InferSuccessType<TEndpoint>>

  /** Read currently cached data without triggering a fetch */
  getCache(input?: InferRequestType<TEndpoint>): InferSuccessType<TEndpoint> | undefined

  /** Write directly into the cache */
  setCache(
    input: InferRequestType<TEndpoint> | undefined,
    updater:
      | InferSuccessType<TEndpoint>
      | ((prev: InferSuccessType<TEndpoint> | undefined) => InferSuccessType<TEndpoint>),
  ): void

  /** Remove queries from the cache entirely (more aggressive than invalidate) */
  removeCache(input?: InferRequestType<TEndpoint>): void

  /** Reset queries to their initial state and refetch */
  resetCache(input?: InferRequestType<TEndpoint>): Promise<void>
}

// ─── Recursive proxy type ─────────────────────────────────────────────────────
export type QueryClientProxy<T> = {
  [K in keyof T]: T[K] extends ClientRequestEndpoint
    ? QueryEndpoint<T[K]>
    : T[K] extends object
      ? QueryClientProxy<T[K]>
      : T[K]
}

// ─── Config ───────────────────────────────────────────────────────────────────
export interface HcQueryConfig {
  queryClient: QueryClient
  /** Default invalidation strategy for all mutations. @default 'siblings' */
  invalidation?: InvalidationStrategy
  /** Default retry count. @default 2 */
  retry?: number | boolean
  /** Default staleTime in ms applied to all queries. @default 0 */
  staleTime?: number
  /** Global error handler — fires for every query and mutation error */
  onError?: (error: ApiError) => void
  /** Global success handler — fires after every successful mutation */
  onSuccess?: (data: unknown) => void
  /**
   * Devtools label mode.
   * - 'path' → annotates query keys with human-readable path strings so
   *   TanStack Devtools shows  GET /equipment/:id  instead of raw arrays.
   * @default 'path'
   */
  devtools?: { labelMode?: 'path' | 'none' }
}

// ─── Re-exported utility types ────────────────────────────────────────────────
export type { InfiniteData, GetNextPageParamFunction, GetPreviousPageParamFunction }
