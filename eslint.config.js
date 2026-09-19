import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // `const { [k]: _drop, ...rest } = errors` is how this codebase clears one
      // key from an error map. The binding exists only to be discarded.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // Every hit is the same shape: an effect calling an async `load()` whose
      // first statement is a synchronous `setStatus('loading')`. That is the
      // intended fetch-on-mount pattern, not the cascading-render bug the rule
      // targets — it cannot see past the async boundary. Re-enable if a real
      // synchronous setState-in-effect ever shows up.
      'react-hooks/set-state-in-effect': 'off',
      // Dev-time Fast Refresh nicety only — it has no effect on a production
      // build. The hits are idiomatic (`useAuth` beside `AuthProvider`; pure
      // helpers beside the one tile component that uses them), so this warns
      // rather than blocks CI.
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    // Test helpers export fixtures and render helpers next to components on
    // purpose; Fast Refresh never applies to files that only run under Vitest.
    files: ['tests/**/*.{ts,tsx}'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
])
