import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
        },
        rules: {
            // Enforce curly braces for all control statements
            curly: ['error', 'all'],
        },
    },
]
