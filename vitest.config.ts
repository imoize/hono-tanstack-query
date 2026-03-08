import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ── Environment ────────────────────────────────────────────────────────
    // node environment — tests call queryFn/mutationFn directly, no DOM needed.
    // Switch to 'jsdom' if you add renderHook tests in future.
    environment: 'node',

    // ── Globals ────────────────────────────────────────────────────────────
    // Enables describe/it/expect without importing — matches Jest API
    globals: true,

    // ── Setup ──────────────────────────────────────────────────────────────
    // Runs before each test file — imports @testing-library/jest-dom matchers
    // setupFiles: ['./tests/setup.ts'],  // Uncomment if you use @testing-library/jest-dom matchers

    // ── TypeScript ─────────────────────────────────────────────────────────
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },

    // ── Coverage ──────────────────────────────────────────────────────────
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types.ts'], // types-only file

      // Enforce minimum coverage thresholds — CI fails below these
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },

    // ── Test file pattern ─────────────────────────────────────────────────
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
  },

  resolve: {
    alias: {
      // Allow tests to import 'hono-tanstack-query' as if installed
      'hono-tanstack-query': new URL('./src/index.ts', import.meta.url).href,
    },
  },
})
