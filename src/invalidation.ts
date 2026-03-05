import type { QueryKey } from '@tanstack/react-query'
import { buildKey } from './key'

/**
 * Controls what gets invalidated after a mutation succeeds.
 *
 * | Strategy    | What gets invalidated                                        |
 * |-------------|--------------------------------------------------------------|
 * | `siblings`  | All queries at the same resource path  ← **default**        |
 * |             | e.g. equipment.$put → invalidates equipment.$get            |
 * | `parent`    | One level up — all methods on the resource                  |
 * |             | e.g. equipment[':id'].$put → invalidates all equipment.*    |
 * | `exact`     | Only this exact endpoint + input combo                      |
 * | `none`      | No automatic invalidation                                   |
 */
export type InvalidationStrategy = 'siblings' | 'parent' | 'exact' | 'none'

export function getInvalidationKey(
  path: string[],
  strategy: InvalidationStrategy,
): QueryKey | null {
  const withoutVerb = path.slice(0, -1)

  switch (strategy) {
    case 'siblings':
      return [withoutVerb]
    case 'parent':
      return [withoutVerb.slice(0, -1)]
    case 'exact':
      return buildKey(path, { type: 'query' })
    case 'none':
      return null
  }
}
