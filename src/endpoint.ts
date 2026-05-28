import {
  useQuery as tanstackUseQuery,
  useMutation as tanstackUseMutation,
  useSuspenseQuery as tanstackUseSuspenseQuery,
  useInfiniteQuery as tanstackUseInfiniteQuery,
  useSuspenseInfiniteQuery as tanstackUseSuspenseInfiniteQuery,
} from '@tanstack/react-query'
import type { QueryFunctionContext, QueryKey, InfiniteData } from '@tanstack/react-query'

import { ApiError } from './error'
import { buildKey, buildLabel } from './key'
import { getInvalidationKey } from './invalidation'
import type { InvalidationStrategy } from './invalidation'
import type {
  ClientRequestEndpoint,
  EndpointApiError,
  FlatInfiniteQueryArgs,
  FlatMutationArgs,
  FlatQueryArgs,
  FlatSuspenseInfiniteQueryArgs,
  FlatSuspenseQueryArgs,
  HcQueryConfig,
  InferEndpoint,
  InferRequestType,
  InferSuccessType,
  QueryEndpoint,
  TypedInfiniteQueryOptions,
  TypedMutationOptions,
  TypedQueryOptions,
} from './types'

// ─── Internal: split flat args into Hono input vs TanStack options ────────────
// - Hono keys  → { param, query, json, form } → passed to the endpoint fn
// - TanStack keys → everything else            → spread into queryOptions/mutationOptions
// They coexist in one flat object so the DX is ergonomic, but internally they
// are kept strictly separate so neither leaks into the wrong layer.
const HONO_INPUT_KEYS = new Set(['param', 'query', 'json', 'form'])

function splitArgs<TArgs extends Record<string, unknown>>(
  args: TArgs = {} as TArgs,
): { input: Record<string, unknown>; tanstack: Record<string, unknown> } {
  const input: Record<string, unknown> = {}
  const tanstack: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(args)) {
    if (HONO_INPUT_KEYS.has(k)) input[k] = v
    else tanstack[k] = v
  }
  return { input, tanstack }
}

// ─── Internal: Hono response shape ───────────────────────────────────────────
interface HonoResponse {
  ok: boolean
  status: number
  headers: Headers
  json(): Promise<unknown>
  text(): Promise<string>
}

// ─── Internal: resolve Hono response → typed data or throw ApiError ───────────
// Awaiting json() then checking ok keeps the stack frame for error handling
// and matches how Hono's ClientResponse actually works at runtime.
// Checks res.ok and content-type BEFORE calling .json() so non-JSON error
// responses (e.g. text/plain, proxy errors) surface as a
// proper ApiError instead of a confusing SyntaxError.
async function resolveResponse<TData>(res: HonoResponse): Promise<TData> {
  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json') ? await res.json() : await res.text()
    throw new ApiError(res.status, body)
  }
  return (await res.json()) as TData
}

// ─── createEndpoint ───────────────────────────────────────────────────────────
export function createEndpoint<TEndpoint extends ClientRequestEndpoint>(
  endpoint: TEndpoint,
  path: string[],
  config: HcQueryConfig,
): QueryEndpoint<TEndpoint> {
  const {
    queryClient,
    invalidation = 'siblings',
    retry = 2,
    staleTime = 0,
    onError,
    onSuccess,
    devtools,
  } = config

  type TData = InferSuccessType<TEndpoint>
  type TError = EndpointApiError<TEndpoint>
  type TVariables = InferRequestType<TEndpoint>
  type TPages = InfiniteData<TData>

  const devLabel = (devtools?.labelMode ?? 'path') === 'path' ? buildLabel(path) : undefined

  // ── Shared query function ─────────────────────────────────────────────────
  function makeQueryFn(input: unknown, infinite = false) {
    return async ({ signal, pageParam }: QueryFunctionContext): Promise<TData> => {
      try {
        const resolvedInput =
          infinite && pageParam !== undefined ? mergePageParam(input, pageParam) : input

        const res = (await endpoint(resolvedInput, { init: { signal } })) as HonoResponse
        return await resolveResponse<TData>(res)
      } catch (err) {
        if (err instanceof ApiError) onError?.(err as ApiError)
        throw err
      }
    }
  }

  function mergePageParam(input: unknown, pageParam: unknown): unknown {
    if (input == null || typeof input !== 'object') return input
    const inp = input as Record<string, unknown>
    return {
      ...inp,
      query: { ...((inp['query'] as object | undefined) ?? {}), cursor: pageParam },
    }
  }

  // ── Shared invalidation helper ────────────────────────────────────────────
  async function runInvalidation(
    invalidate: InvalidationStrategy | QueryKey[] | undefined,
  ): Promise<void> {
    if (Array.isArray(invalidate)) {
      await Promise.all(invalidate.map((key) => queryClient.invalidateQueries({ queryKey: key })))
    } else {
      const strategy = invalidate ?? invalidation
      const key = getInvalidationKey(path, strategy)
      if (key) await queryClient.invalidateQueries({ queryKey: key })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  const ep: QueryEndpoint<TEndpoint> = {
    call: endpoint,

    // $infer is a phantom type — never accessed at runtime, always undefined.
    $infer: undefined as unknown as InferEndpoint<TEndpoint>,

    getQueryKey(input?) {
      return buildKey(path, { type: 'query', input }, devLabel)
    },

    queryOptions<TSelected>(
      args?: FlatQueryArgs<TEndpoint, TSelected>,
    ): TypedQueryOptions<TData, TError, TSelected> {
      const { input, tanstack } = splitArgs(args as Record<string, unknown>)
      return {
        retry,
        staleTime,
        ...tanstack,
        queryKey: buildKey(path, { type: 'query', input }, devLabel),
        queryFn: makeQueryFn(input),
      } as TypedQueryOptions<TData, TError, TSelected>
    },

    infiniteQueryOptions<TSelected extends TPages = TPages>(
      args: FlatInfiniteQueryArgs<TEndpoint, TSelected>,
    ): TypedInfiniteQueryOptions<TData, TError, TSelected> {
      const { input, tanstack } = splitArgs(args as Record<string, unknown>)
      const { getNextPageParam, getPreviousPageParam, initialPageParam, maxPages, ...rest } =
        tanstack as {
          getNextPageParam: unknown
          getPreviousPageParam?: unknown
          initialPageParam: unknown
          maxPages?: number
          [k: string]: unknown
        }
      return {
        retry,
        staleTime,
        ...rest,
        queryKey: buildKey(path, { type: 'infinite', input }, devLabel),
        queryFn: makeQueryFn(input, true),
        getNextPageParam: getNextPageParam as TypedInfiniteQueryOptions<
          TData,
          TError,
          TSelected
        >['getNextPageParam'],
        getPreviousPageParam,
        initialPageParam,
        maxPages,
      } as TypedInfiniteQueryOptions<TData, TError, TSelected>
    },

    mutationOptions(
      args?: FlatMutationArgs<TEndpoint>,
    ): TypedMutationOptions<TData, TVariables, TError> {
      const {
        invalidate,
        onSuccess: userOnSuccess,
        onError: userOnError,
        onMutate: userOnMutate,
        onSettled: userOnSettled,
        ...rest
      } = (args ?? {}) as {
        invalidate?: InvalidationStrategy | QueryKey[]
        onSuccess?: (...a: unknown[]) => Promise<void> | void
        onError?: (err: TError, ...a: unknown[]) => void
        onMutate?: (variables: TVariables) => Promise<unknown> | void
        onSettled?: (...a: unknown[]) => Promise<void> | void
        [key: string]: unknown
      }

      return {
        ...rest,
        mutationKey: buildKey(path, { type: 'mutation' }, devLabel),

        mutationFn: async (variables: TVariables): Promise<TData> => {
          try {
            const res = (await endpoint(variables)) as HonoResponse
            return await resolveResponse<TData>(res)
          } catch (err) {
            if (err instanceof ApiError) onError?.(err as ApiError)
            throw err
          }
        },

        // onMutate runs before the request — return value is passed as context
        // to onError and onSettled for rollback.
        onMutate: (variables: TVariables) => {
          // userOnMutate may or may not be async — Promise.resolve handles both
          return Promise.resolve(userOnMutate?.(variables))
        },

        onSuccess: async (data, variables, context, meta) => {
          await runInvalidation(invalidate)
          onSuccess?.(data)
          await userOnSuccess?.(data, variables, context, meta)
        },

        onError: (err, variables, context, meta) => {
          onError?.(err as ApiError)
          userOnError?.(err, variables, context, meta)
        },

        // onSettled always runs (success or error) — void return is intentional
        onSettled: (data, err, variables, context, meta) => {
          void userOnSettled?.(data, err, variables, context, meta)
        },
      }
    },

    // ── React hooks ──────────────────────────────────────────────────────────

    useQuery<TSelected>(args?: FlatQueryArgs<TEndpoint, TSelected>) {
      return tanstackUseQuery(ep.queryOptions<TSelected>(args))
    },

    useSuspenseQuery<TSelected>(args?: FlatSuspenseQueryArgs<TEndpoint, TSelected>) {
      return tanstackUseSuspenseQuery(
        ep.queryOptions<TSelected>(args as FlatQueryArgs<TEndpoint, TSelected>),
      )
    },

    useInfiniteQuery<TSelected extends TPages = TPages>(
      args: FlatInfiniteQueryArgs<TEndpoint, TSelected>,
    ) {
      return tanstackUseInfiniteQuery(ep.infiniteQueryOptions<TSelected>(args))
    },

    useSuspenseInfiniteQuery<TSelected extends TPages = TPages>(
      args: FlatSuspenseInfiniteQueryArgs<TEndpoint, TSelected>,
    ) {
      return tanstackUseSuspenseInfiniteQuery(
        ep.infiniteQueryOptions<TSelected>(args as FlatInfiniteQueryArgs<TEndpoint, TSelected>),
      )
    },

    useMutation(args?: FlatMutationArgs<TEndpoint>) {
      return tanstackUseMutation(ep.mutationOptions(args))
    },

    // ── Imperative helpers ───────────────────────────────────────────────────

    async invalidate(input?) {
      await queryClient.invalidateQueries({
        queryKey: buildKey(path, { type: 'query', input }, devLabel),
      })
    },

    async prefetch(args?) {
      await queryClient.prefetchQuery(ep.queryOptions(args))
    },

    async ensureData(args?) {
      return queryClient.ensureQueryData(ep.queryOptions(args)) as Promise<TData>
    },

    getCache(input?) {
      return queryClient.getQueryData<TData>(buildKey(path, { type: 'query', input }, devLabel))
    },

    setCache(input, updater) {
      queryClient.setQueryData<TData>(
        buildKey(path, { type: 'query', input }, devLabel),
        updater as TData | ((prev: TData | undefined) => TData),
      )
    },

    removeCache(input?) {
      queryClient.removeQueries({
        queryKey: buildKey(path, { type: 'query', input }, devLabel),
      })
    },

    async resetCache(input?) {
      await queryClient.resetQueries({
        queryKey: buildKey(path, { type: 'query', input }, devLabel),
      })
    },
  }

  return ep
}
