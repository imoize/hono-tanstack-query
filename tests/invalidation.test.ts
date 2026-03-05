import { describe, it, expect } from 'vitest'
import { getInvalidationKey } from '../src/invalidation'

describe('getInvalidationKey', () => {
  const path = ['tasks', ':id', '$put']

  it("'siblings' returns path without the verb", () => {
    const key = getInvalidationKey(path, 'siblings')
    expect(key).toEqual([['tasks', ':id']])
  })

  it("'parent' returns path without verb and last segment", () => {
    const key = getInvalidationKey(path, 'parent')
    expect(key).toEqual([['tasks']])
  })

  it("'exact' returns full buildKey output", () => {
    const key = getInvalidationKey(path, 'exact')
    // exact returns a full query key: [[...path], { type: 'query' }]
    expect(key).toEqual([[path], { type: 'query' }])
  })

  it("'none' returns null", () => {
    const key = getInvalidationKey(path, 'none')
    expect(key).toBeNull()
  })

  it('works for a top-level path', () => {
    const key = getInvalidationKey(['tasks', '$post'], 'parent')
    expect(key).toEqual([[[]]])
  })
})
