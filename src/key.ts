import type { QueryKey } from '@tanstack/react-query'

type KeyType = 'query' | 'mutation' | 'infinite'

interface BuildKeyOptions<TType extends KeyType, TInput> {
  type: TType
  input?: TType extends 'mutation' ? never : TInput
  /** Appended as a devtools label when devtools.labelMode = 'path' */
  label?: string
}

export function buildKey<TType extends KeyType, TInput>(
  path: string[],
  opts: BuildKeyOptions<TType, TInput>,
  label?: string,
): QueryKey {
  return [
    path,
    {
      type: opts.type,
      ...(opts.input !== undefined && { input: opts.input }),
      // Label is always included when provided — TanStack Devtools renders it as the display name
      ...(label !== undefined && { _label: label }),
    },
  ] as const
}

/** Build a human-readable path label for Devtools, e.g. GET /equipment/:id */
export function buildLabel(path: string[]): string {
  const verb = path[path.length - 1] ?? ''
  const route = '/' + path.slice(0, -1).join('/')
  const method = verb.replace('$', '').toUpperCase()
  return `${method} ${route}`
}
