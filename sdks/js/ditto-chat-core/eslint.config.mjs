import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import pluginReactHooks from 'eslint-plugin-react-hooks'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import keySort from 'eslint-plugin-sort-keys-fix'

import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  // ESLint config files - use recommended without TypeScript project
  {
    files: ['eslint.config.{js,mjs}'],
    extends: [js.configs.recommended],
  },
  // Other config files - lint without type checking
  {
    files: ['*.config.{ts,js,mjs}', '*.setup.{ts,js}'],
    ignores: ['eslint.config.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
    },
    rules: {
      curly: ['error', 'all'],
    },
  },
  // Test files - lint without type checking
  {
    files: [
      'tests/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
    ],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
    },
    rules: {
      curly: ['error', 'all'],
    },
  },
  // Source files - lint with type checking
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'simple-import-sort': simpleImportSort,
      react: pluginReact,
      'react-hooks': pluginReactHooks,
      'sort-keys-fix': keySort,
    },
    rules: {
      curly: ['error', 'all'],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'sort-imports': 'off',
      semi: 0,
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
])
