// Domain types shared between the server implementation and client inference.
// The client never imports these directly — it gets them automatically
// through AppType via hono-tanstack-query's InferSuccessType / InferErrorBodyType.
// They are defined here purely for use with `satisfies` on the server side
// to keep response shapes honest.

export interface Post {
  id: string
  title: string
  content: string
  author: string
  createdAt: string
  tags: string[]
}

export interface ValidationError {
  message: string
  issues: Array<{
    path: string[]
    message: string
  }>
}

export interface NotFoundError {
  message: string
}
