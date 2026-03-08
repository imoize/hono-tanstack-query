import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { postsRouter } from './routes/posts.js'

// ─── App ──────────────────────────────────────────────────────────────────────
// Routes are chained so TypeScript can infer the full route tree into one type.

const app = new Hono()
  .use(logger())
  .use(cors({ origin: 'http://localhost:5173', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }))
  .route('/posts', postsRouter)

// ─── AppType ──────────────────────────────────────────────────────────────────
// This is the ONLY thing the client imports from the server.
// It is a pure TypeScript type — zero runtime coupling between packages.
//
// Client usage:
//   import type { AppType } from 'posts-server'
//   const honoClient = hc<AppType>('http://localhost:3000')
//
// From that one line, TypeScript knows:
//   - every route path and method
//   - the exact input shape (param, query, json, form)
//   - the response body type for every status code
//   - which errors each endpoint can return

export type AppType = typeof app

// ─── Dev server ───────────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`\n🔥  Server → http://localhost:${info.port}\n`)
  console.log('  GET  /posts')
  console.log('  GET  /posts/:id')
  console.log('  POST /posts\n')
})
