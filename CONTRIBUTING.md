# Contributing

## Setup

```bash
# Install deps (pnpm recommended)
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Lint + format check
pnpm check
```

## Toolchain

| Tool                  | Purpose                                         | Config file                    |
| --------------------- | ----------------------------------------------- | ------------------------------ |
| **tsup**              | Build — dual ESM+CJS output + `.d.ts`           | `tsup.config.ts`               |
| **typescript-eslint** | Linting with type-aware rules                   | `eslint.config.ts`             |
| **Prettier**          | Formatting                                      | `prettier.config.ts`           |
| **Vitest**            | Testing with jsdom                              | `vitest.config.ts`             |
| **husky**             | Git hooks                                       | `.husky/`                      |
| **lint-staged**       | Run linter/formatter only on staged files       | `package.json` → `lint-staged` |
| **Changesets**        | Versioning + changelog                          | `.changeset/`                  |
| **publint**           | Validates `package.json` exports before publish | `pnpm publint`                 |
| **attw**              | Checks types work for ESM + CJS consumers       | `pnpm attw`                    |

## Scripts

```bash
pnpm build           # Compile to dist/ (ESM + CJS + .d.ts)
pnpm build:check     # Type-check src without emitting
pnpm dev             # Watch mode build

pnpm lint            # ESLint (0 warnings allowed)
pnpm lint:fix        # ESLint with auto-fix
pnpm format          # Prettier write
pnpm format:check    # Prettier check (used in CI)

pnpm test            # Run tests once
pnpm test:watch      # Vitest watch mode
pnpm test:coverage   # Coverage report (enforces thresholds)
pnpm test:types      # Type-check tests

pnpm check           # build:check + lint + format:check + test (run before PR)

pnpm publint         # Validate package.json exports
pnpm attw            # Check type resolution for all module systems
```

## Making a release

1. `pnpm changeset` — describe your change (patch/minor/major)
2. Commit the generated `.changeset/*.md` file
3. On merge to `main`, the CI release job runs `pnpm release` which:
   - Runs `pnpm check` (type check + lint + format + tests)
   - Validates exports with `publint` and `attw`
   - Bumps version + updates `CHANGELOG.md`
   - Publishes to npm

## TypeScript config

Three tsconfig files for different contexts:

| File                  | Used by              | Notes                              |
| --------------------- | -------------------- | ---------------------------------- |
| `tsconfig.json`       | Editor / IDE         | Base config, `noEmit: true`        |
| `tsconfig.build.json` | `build:check` script | Checks `src/` only                 |
| `tsconfig.test.json`  | `test:types`, Vitest | Adds `tests/`, JSX, jest-dom types |

## Code style decisions

- **`import type`** is enforced everywhere — helps tree-shaking and avoids
  circular issues
- **`any`** is `warn` not `error` — unavoidable in the Proxy layer; use
  `// eslint-disable-next-line` with a comment
- Type parameters must be prefixed with `T` (enforced by
  `@typescript-eslint/naming-convention`)
- Interfaces must not be prefixed with `I`
- No trailing semicolons, single quotes, LF line endings (enforced by Prettier)
