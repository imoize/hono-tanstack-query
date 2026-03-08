import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Post, ValidationError, NotFoundError } from '../types/api.js'

// ─── In-memory store ─────────────────────────────────────────────────────────
const posts: Post[] = [
  {
    id: '1',
    title: 'Getting Started with Hono',
    content:
      'Hono is a small, simple, and ultrafast web framework built for the edge. ' +
      'Runs on Cloudflare Workers, Bun, Deno, and Node.js with a single unified API. ' +
      'Perfect for edge-first apps with minimal overhead.',
    author: 'Adil Shaikh',
    createdAt: new Date().toISOString(),
    tags: ['hono', 'typescript', 'edge'],

  },
  {
    id: '2',
    title: 'Advanced TanStack Query Patterns',
    content:
      'Learn how to use TanStack Query v5 with Hono for full-stack type safety. ' +
      'Includes invalidation, optimistic updates, and query key composition.',
    author: 'Adil Shaikh',
    createdAt: new Date().toISOString(),
    tags: ['react', 'tanstack', 'data-fetching', 'hono-tanstack-query'],

  },
  {
    id: '3',
    title: 'End-to-End Types with hono-tanstack-query',
    content:
      'hono-tanstack-query bridges Hono\'s typed RPC client with TanStack Query. ' +
      'Define routes once, export AppType, and get fully-typed hooks with zero codegen.',
    author: 'Adil Shaikh',
    createdAt: new Date().toISOString(),
    tags: ['hono', 'tanstack', 'typescript', 'rpc', 'full-stack'],

  },
  {
    id: '4',
    title: 'Using Mutations & Optimistic Updates',
    content:
      'Demonstrates how to mutate posts and optimistically update the UI with TanStack Query. ' +
      'Errors automatically typed from the server response.',
    author: 'Adil Shaikh',
    createdAt: new Date().toISOString(),
    tags: ['tanstack', 'react', 'mutation', 'optimistic'],

  },
  {
    id: '5',
    title: 'Filtering & Query Invalidation',
    content:
      'Learn how invalidation strategies work with sibling queries. ' +
      'Example: POST /posts invalidates GET /posts automatically using hono-tanstack-query.',
    author: 'Adil Shaikh',
    createdAt: new Date().toISOString(),
    tags: ['tanstack', 'react-query', 'invalidation', 'hono'],

  },
]

export default posts

let nextId = 4

// ─── Validation schema ────────────────────────────────────────────────────────

const createPostSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  author: z.string().min(2, 'Author must be at least 2 characters'),
  tags: z.array(z.string()).optional().default([]),
})

// ─── Router ───────────────────────────────────────────────────────────────────
//
// HOW TYPES FLOW TO THE CLIENT:
//
//  c.json(body, 200)  →  ClientResponse<Post, 200, 'json'>
//  c.json(err,  404)  →  ClientResponse<NotFoundError, 404, 'json'>
//
//  These become a discriminated union on the return type of each endpoint.
//  hono-tanstack-query reads that union to produce:
//    - InferSuccessType  → the 2xx body  → typeof data
//    - InferErrorBodyType → non-2xx body  → typeof error.body
//
//  `satisfies` is used to verify our response shapes match the domain types
//  without widening the literal types Hono needs for inference.

export const postsRouter = new Hono()

  // GET /posts
  .get('/', (c) => {
    return c.json(posts, 200)
  })

  // GET /posts/:id
  .get('/:id', (c) => {
    const post = posts.find((p) => p.id === c.req.param('id'))

    if (!post) {
      return c.json(
        { message: `Post "${c.req.param('id')}" not found` } satisfies NotFoundError,
        404,
      )
    }

    return c.json(post satisfies Post, 200)
  })

  // POST /posts
  .post(
    '/',
    zValidator('json', createPostSchema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            message: 'Validation failed',
            issues: result.error.issues.map((issue) => ({
              path: issue.path.map(String),
              message: issue.message,
            })),
          } satisfies ValidationError,
          422,
        )
      }
    }),
    (c) => {
      const body = c.req.valid('json')
      const post: Post = {
        id: String(nextId++),
        title: body.title,
        content: body.content,
        author: body.author,
        createdAt: new Date().toISOString(),
        tags: body.tags,
      }
      posts.push(post)
      return c.json(post satisfies Post, 201)
    },
  )
