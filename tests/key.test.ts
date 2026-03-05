import { describe, it, expect } from 'vitest'
import { buildKey, buildLabel } from '../src/key'

describe('buildKey', () => {
  it('builds a query key with path and type', () => {
    const key = buildKey(['tasks'], { type: 'query' })
    expect(key).toEqual([['tasks'], { type: 'query' }])
  })

  it('includes input when provided', () => {
    const key = buildKey(['tasks', ':id', '$get'], { type: 'query', input: { param: { id: '1' } } })
    expect(key).toEqual([
      ['tasks', ':id', '$get'],
      { type: 'query', input: { param: { id: '1' } } },
    ])
  })

  it('omits input when undefined', () => {
    const key = buildKey(['tasks', '$get'], { type: 'query', input: undefined })
    expect(key).toEqual([['tasks', '$get'], { type: 'query' }])
  })

  it('builds a mutation key without input', () => {
    const key = buildKey(['tasks', '$post'], { type: 'mutation' })
    expect(key).toEqual([['tasks', '$post'], { type: 'mutation' }])
  })

  it('attaches devtools label when provided', () => {
    const key = buildKey(['tasks', '$get'], { type: 'query' }, 'GET /tasks')
    expect(key).toEqual([['tasks', '$get'], { type: 'query', _label: 'GET /tasks' }])
  })

  it('omits label when not provided', () => {
    const key = buildKey(['tasks', '$get'], { type: 'query' })
    const meta = (key as any[])[1] as Record<string, unknown>
    expect(meta).not.toHaveProperty('_label')
  })
})

describe('buildLabel', () => {
  it('builds a GET label', () => {
    expect(buildLabel(['tasks', '$get'])).toBe('GET /tasks')
  })

  it('builds a POST label', () => {
    expect(buildLabel(['tasks', '$post'])).toBe('POST /tasks')
  })

  it('builds a nested path label', () => {
    expect(buildLabel(['tasks', ':id', '$put'])).toBe('PUT /tasks/:id')
  })

  it('handles empty path gracefully', () => {
    expect(buildLabel([])).toBe(' /')
  })
})
