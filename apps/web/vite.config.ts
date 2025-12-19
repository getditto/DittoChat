import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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