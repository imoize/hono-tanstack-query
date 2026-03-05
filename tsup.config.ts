import { defineConfig } from 'tsup'

export default defineConfig({
  // ── Entry ────────────────────────────────────────────────────────────────
  entry: ['src/index.ts'],

  // ── Output formats ───────────────────────────────────────────────────────
  // ESM  → dist/index.js    (modern bundlers, Node ESM)
  // CJS  → dist/index.cjs   (CommonJS / Next.js / Jest without transform)
  format: ['esm', 'cjs'],

  // ── Types ────────────────────────────────────────────────────────────────
  // Generates dist/index.d.ts  (for ESM) and dist/index.d.cts (for CJS)
  // so TypeScript correctly resolves types in both module systems.
  dts: true,

  // ── Source maps ──────────────────────────────────────────────────────────
  // Inline source maps in dev, external in production build
  sourcemap: false,

  // ── Clean dist on every build ─────────────────────────────────────────────
  clean: true,

  // ── Tree-shaking ─────────────────────────────────────────────────────────
  // Keep imports that TanStack React Query uses (hooks need to be left in)
  treeshake: true,

  // ── External dependencies ─────────────────────────────────────────────────
  // Peer deps are never bundled — consumers provide them.
  // tsup infers from peerDependencies automatically; this is explicit backup.
  external: ['react', 'hono', 'hono/client', '@tanstack/react-query'],

  // ── Output target ────────────────────────────────────────────────────────
  // Match what modern Node + bundlers support. Keep broad for library compat.
  target: 'es2020',

  // ── tsconfig ─────────────────────────────────────────────────────────────
  tsconfig: './tsconfig.build.json',

  // ── Splitting ─────────────────────────────────────────────────────────────
  // Disable for libraries — a single file per format is simpler to publish.
  splitting: false,

  // ── Banner ─────────────────────────────────────────────────────────────────
  // Adds a "use client" directive for RSC compatibility in the ESM build.
  // Remove if your library is not React-specific.
  // banner: { js: '"use client";' },
})
