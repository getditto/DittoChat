import js from '@eslint/js'
import tseslint from 'typescript-eslint'
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
    files: ['tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
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
    rules: {
      curly: ['error', 'all'],
    },
  },
])
