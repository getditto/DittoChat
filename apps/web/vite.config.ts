import path from "path"
import { fileURLToPath } from "url"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, "../../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../../node_modules/react-dom"),
    },
    // Ensure Vite can resolve workspace packages from source
    conditions: ['development', 'default'],
  },
  optimizeDeps: {
    // Don't pre-bundle workspace packages - use source directly
    exclude: ['@dittolive/ditto-chat-core', '@dittolive/ditto-chat-ui'],
  },
})