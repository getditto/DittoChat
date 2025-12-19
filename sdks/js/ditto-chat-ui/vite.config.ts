import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dts from 'vite-plugin-dts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    dts({
      exclude: ['src/App.tsx', 'src/main.tsx'],
    }),
  ],
  resolve: {
    alias: {
      '@dittolive/ditto-chat-core': resolve(__dirname, '../ditto-chat-core/src/index.ts'),
      '@dittolive/ditto-chat-ui': resolve(__dirname, 'src/index.tsx'),
    },
  },
  build: {
    cssCodeSplit: true,
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.tsx'),
        tailwind: resolve(__dirname, 'src/styles/tailwind.css'),
        'ditto-chat-ui': resolve(__dirname, 'src/styles/ditto-chat-ui.css'),
      },
      name: 'DittoChatUI',
      fileName: (format, entryName) => `${entryName}.${format}.js`,
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
        'src/types.ts',
        '../DittoChatCore/src/index.ts',
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.tsx',
        '**/*.test.ts',
        'src/test/**',
        'vite.config.ts',
        'eslint.config.js',
        'eslint.config.mjs',
        '**/*.config.{js,mjs,ts}',
      ],
    },
  },
})
