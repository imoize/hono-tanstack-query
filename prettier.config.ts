/** @type {import('prettier').Config} */
export default {
  // ── Line length ───────────────────────────────────────────────────────────
  // 100 is a common library standard — wider than default 80 but not extreme
  printWidth: 100,

  // ── Indentation ───────────────────────────────────────────────────────────
  tabWidth: 2,
  useTabs: false,

  // ── Semicolons ────────────────────────────────────────────────────────────
  semi: false,

  // ── Quotes ────────────────────────────────────────────────────────────────
  singleQuote: true,
  jsxSingleQuote: false,
  quoteProps: 'as-needed',

  // ── Trailing commas ───────────────────────────────────────────────────────
  // 'all' = trailing commas in function params too (ES2017+, works with TS)
  trailingComma: 'all',

  // ── Brackets ─────────────────────────────────────────────────────────────
  bracketSpacing: true,
  bracketSameLine: false,

  // ── Arrow functions ───────────────────────────────────────────────────────
  arrowParens: 'always',

  // ── End of line ───────────────────────────────────────────────────────────
  // 'lf' prevents Windows CRLF issues in git diffs
  endOfLine: 'lf',

  // ── Per-file overrides ────────────────────────────────────────────────────
  overrides: [
    {
      files: ['*.json', '*.jsonc'],
      options: { trailingComma: 'none' },
    },
    {
      files: ['*.md'],
      options: {
        printWidth: 80,
        proseWrap: 'always',
      },
    },
  ],
}
