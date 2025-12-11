import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      exclude: ['src/App.tsx', 'src/main.tsx'],
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      name: 'DittoChatUI',
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'html'],
      reportsDirectory: 'coverage',
      exclude: [
        'src/App.tsx',
        'src/index.tsx',
        'src/main.tsx',
        '../DittoChatCore/src/index.ts',
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.tsx',
        '**/*.test.ts',
        'src/test/**',
        'vite.config.ts',
        'eslint.config.js',
      ],
    },
  },
})
