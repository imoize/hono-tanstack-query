import { createEndpoint } from './endpoint'
import type { ClientRequestEndpoint, HcQueryConfig, QueryClientProxy } from './types'

const HTTP_VERBS = new Set(['$get', '$post', '$put', '$patch', '$delete'])

export function createProxy<T extends object>(
  target: T,
  config: HcQueryConfig,
  path: string[] = [],
): QueryClientProxy<T> {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      // Pass through symbols, non-strings, and Promise internals
      if (typeof prop !== 'string' || prop === 'then') return value

      const nextPath = [...path, prop]

      // HTTP verb → wrap in QueryEndpoint
      if (HTTP_VERBS.has(prop)) {
        return createEndpoint(value as ClientRequestEndpoint, nextPath, config)
      }

      // Nested object → recurse
      return createProxy(value as T, config, nextPath)
    },
  }) as QueryClientProxy<T>
}
