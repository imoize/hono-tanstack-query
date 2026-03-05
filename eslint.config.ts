import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettier from 'eslint-config-prettier'
import reactHooks from 'eslint-plugin-react-hooks'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // ── Files to lint ─────────────────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'tests/**/*.ts', 'tests/**/*.tsx'],
  },

  // ── Ignore patterns ────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.*', // tsup.config, vitest.config etc. — not linted
      '.changeset/**',
    ],
  },

  // ── TypeScript strict rules ────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.build.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // ── Base TS rules ──────────────────────────────────────────────────────
      ...tseslint.configs['strict-type-checked'].rules,
      ...tseslint.configs['stylistic-type-checked'].rules,

      // ── Library-specific overrides ─────────────────────────────────────────

      // `any` is sometimes necessary when wrapping generic proxy types
      // Warn instead of error so it's visible but not a blocker
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // Consistent type imports — enforces `import type` to help tree-shaking
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],

      // Consistent type exports
      '@typescript-eslint/consistent-type-exports': [
        'error',
        {
          fixMixedExportsWithInlineTypeSpecifier: true,
        },
      ],

      // Require return types on exported functions — makes the API surface explicit
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Allow non-null assertions — useful in proxy code where we know shape
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Allow empty object type in generic constraints
      '@typescript-eslint/no-empty-object-type': 'off',

      // Promise handling
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-void': ['error', { allowAsStatement: true }],

      // Naming — interfaces should not be prefixed with I
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase'],
          prefix: ['T'],
        },
      ],

      // No unused vars — but allow _ prefix for intentionally unused
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'all',
        },
      ],
    },
  },

  // ── React hooks rules (applied to src + tests) ─────────────────────────────
  {
    files: ['src/**/*.ts', 'tests/**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Our proxy intentionally calls hooks inside non-hook functions —
      // suppress false positives with eslint-disable-next-line in those spots
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // ── Test-only rules ────────────────────────────────────────────────────────
  {
    files: ['tests/**/*.ts', 'tests/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs['recommended'].rules,
      // Tests are allowed to use any/non-null freely
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },

  // ── Prettier — must be last, turns off all formatting rules ───────────────
  prettier,
]
