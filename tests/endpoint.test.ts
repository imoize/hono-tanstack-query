/**
 * tests/endpoint.test.ts
 *
 * Uses real Hono apps + hc() — exactly like Hono's own client.test.ts.
 * This ensures InferResponseType resolves correctly through the actual
 * ClientResponse<Body, Status, Format> type chain.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Hono } from 'hono'
import { hc } from 'hono/client'
import React from 'react'
import { createEndpoint } from '../src/endpoint'
import { ApiError } from '../src/error'
import type { HcQueryConfig } from '../src/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children)
  }
}

function makeConfig(client: QueryClient, overrides?: Partial<HcQueryConfig>): HcQueryConfig {
  return { queryClient: client, invalidation: 'siblings', retry: false, ...overrides }
}

// ─── Build a minimal typed Hono app for tests ─────────────────────────────────
// Using app.request as the fetch implementation means no server needed.
// This is exactly what Hono's own test suite does.

function buildApp() {
  const app = new Hono()
    .get('/tasks', (c) => {
      return c.json(
        [
          { id: '1', title: 'Task 1', status: 'todo' as const },
          { id: '2', title: 'Task 2', status: 'done' as const },
        ],
        200,
      )
    })
    .get('/tasks/:id', (c) => {
      const id = c.req.param('id')
      if (id === '404') return c.json({ message: 'Not found' }, 404)
      return c.json({ id, title: 'Task', status: 'todo' as const }, 200)
    })
    .post('/tasks', async (c) => {
      const body = await c.req.json<{ title: string }>()
      if (!body.title) {
        return c.json(
          { message: 'Validation failed', issues: [{ path: ['title'], message: 'Required' }] },
          422,
        )
      }
      return c.json({ id: '99', title: body.title, status: 'todo' as const }, 201)
    })
    .delete('/tasks/:id', (c) => {
      return c.json({ success: true }, 200)
    })

  type AppType = typeof app

  // hc() with { fetch: app.request } — no network, pure in-process
  const client = hc<AppType>('http://localhost', { fetch: app.request })

  return { app, client }
}

// ─── useQuery tests ───────────────────────────────────────────────────────────

describe('createEndpoint — useQuery', () => {
  let qc: QueryClient
  let client: ReturnType<typeof buildApp>['client']

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client = buildApp().client
  })

  it('returns data on success', async () => {
    const ep = createEndpoint(client.tasks.$get, ['tasks', '$get'], makeConfig(qc))

    const { result } = renderHook(() => ep.useQuery(), { wrapper: makeWrapper(qc) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([
      { id: '1', title: 'Task 1', status: 'todo' },
      { id: '2', title: 'Task 2', status: 'done' },
    ])
  })

  it('returns ApiError on non-2xx', async () => {
    const ep = createEndpoint(client.tasks[':id'].$get, ['tasks', ':id', '$get'], makeConfig(qc))

    const { result } = renderHook(() => ep.useQuery({ param: { id: '404' } }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(result.current.error?.status).toBe(404)
    expect(result.current.error?.isNotFound()).toBe(true)
  })

  it('calls global onError handler', async () => {
    const onError = vi.fn()
    const ep = createEndpoint(
      client.tasks[':id'].$get,
      ['tasks', ':id', '$get'],
      makeConfig(qc, { onError }),
    )

    const { result } = renderHook(() => ep.useQuery({ param: { id: '404' } }), {
      wrapper: makeWrapper(qc),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(onError).toHaveBeenCalledWith(expect.any(ApiError))
  })

  it('select transforms data — return type auto-inferred', async () => {
    const ep = createEndpoint(client.tasks.$get, ['tasks', '$get'], makeConfig(qc))

    const { result } = renderHook(
      () => ep.useQuery({ select: (tasks) => tasks.map((t) => t.title) }),
      { wrapper: makeWrapper(qc) },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(['Task 1', 'Task 2'])
  })

  it('skips fetch when enabled: false', async () => {
    const ep = createEndpoint(client.tasks.$get, ['tasks', '$get'], makeConfig(qc))

    const { result } = renderHook(() => ep.useQuery({ enabled: false }), {
      wrapper: makeWrapper(qc),
    })

    await new Promise((r) => setTimeout(r, 50))
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })
})

// ─── useMutation tests ────────────────────────────────────────────────────────

describe('createEndpoint — useMutation', () => {
  let qc: QueryClient
  let client: ReturnType<typeof buildApp>['client']

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client = buildApp().client
  })

  it('calls endpoint and returns created data on success', async () => {
    const ep = createEndpoint(client.tasks.$post, ['tasks', '$post'], makeConfig(qc))

    const { result } = renderHook(() => ep.useMutation(), { wrapper: makeWrapper(qc) })

    act(() => result.current.mutate({ json: { title: 'New Task' } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({ title: 'New Task', status: 'todo' })
  })

  it('returns ApiError with typed body on 422', async () => {
    const ep = createEndpoint(client.tasks.$post, ['tasks', '$post'], makeConfig(qc))
    const onError = vi.fn()

    const { result } = renderHook(() => ep.useMutation({ onError }), { wrapper: makeWrapper(qc) })

    // Empty title triggers 422
    act(() => result.current.mutate({ json: { title: '' } }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiError)
    expect(result.current.error?.isUnprocessable()).toBe(true)
    expect(onError).toHaveBeenCalled()
  })

  it('calls onSuccess callback with response data', async () => {
    const ep = createEndpoint(client.tasks.$post, ['tasks', '$post'], makeConfig(qc))
    const onSuccess = vi.fn()

    const { result } = renderHook(() => ep.useMutation({ onSuccess }), { wrapper: makeWrapper(qc) })

    act(() => result.current.mutate({ json: { title: 'CB Test' } }))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'CB Test' }),
      expect.anything(),
      expect.anything(),
    )
  })
})

// ─── Cache helper tests ───────────────────────────────────────────────────────

describe('createEndpoint — cache helpers', () => {
  let qc: QueryClient
  let client: ReturnType<typeof buildApp>['client']

  // Type of task list — inferred from the real Hono app
  type Task = { id: string; title: string; status: 'todo' | 'done' }

  beforeEach(() => {
    qc = new QueryClient()
    client = buildApp().client
  })

  it('getCache returns undefined on cache miss', () => {
    const ep = createEndpoint(client.tasks.$get, ['tasks', '$get'], makeConfig(qc))
    expect(ep.getCache()).toBeUndefined()
  })

  it('setCache writes and getCache reads', () => {
    const ep = createEndpoint(client.tasks.$get, ['tasks', '$get'], makeConfig(qc))
    const tasks: Task[] = [{ id: '1', title: 'From cache', status: 'todo' }]

    ep.setCache(undefined, tasks)
    expect(ep.getCache()).toEqual(tasks)
  })

  it('setCache with updater function', () => {
    const ep = createEndpoint(client.tasks.$get, ['tasks', '$get'], makeConfig(qc))
    const initial: Task[] = [{ id: '1', title: 'Old', status: 'todo' }]

    ep.setCache(undefined, initial)
    ep.setCache(undefined, (prev) => {
      if (!prev) return []
      return prev.map((t): Task => ({ ...t, title: 'Updated' }))
    })

    expect(ep.getCache()).toEqual([{ id: '1', title: 'Updated', status: 'todo' }])
  })

  it('removeCache clears the entry', () => {
    const ep = createEndpoint(client.tasks.$get, ['tasks', '$get'], makeConfig(qc))
    const tasks: Task[] = []
    ep.setCache(undefined, tasks)
    ep.removeCache()
    expect(ep.getCache()).toBeUndefined()
  })

  it('getQueryKey returns stable key for same input', () => {
    const ep = createEndpoint(client.tasks[':id'].$get, ['tasks', ':id', '$get'], makeConfig(qc))
    const a = ep.getQueryKey({ param: { id: '1' } })
    const b = ep.getQueryKey({ param: { id: '1' } })
    expect(a).toEqual(b)
  })

  it('getQueryKey returns different keys for different inputs', () => {
    const ep = createEndpoint(client.tasks[':id'].$get, ['tasks', ':id', '$get'], makeConfig(qc))
    const a = ep.getQueryKey({ param: { id: '1' } })
    const b = ep.getQueryKey({ param: { id: '2' } })
    expect(a).not.toEqual(b)
  })
})

// ─── $infer phantom type test ─────────────────────────────────────────────────

describe('createEndpoint — $infer phantom type', () => {
  it('$infer is undefined at runtime', () => {
    const { client } = buildApp()
    const qc = new QueryClient()
    const ep = createEndpoint(client.tasks.$get, ['tasks', '$get'], makeConfig(qc))
    // $infer is a type-only slot — always undefined at runtime
    expect(ep.$infer).toBeUndefined()
  })
})
