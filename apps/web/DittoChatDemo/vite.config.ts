import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Ensure Vite can resolve workspace packages from source
    conditions: ["development", "default"],
  },
  optimizeDeps: {
    // Don't pre-bundle workspace packages - use source directly
    exclude: ["@dittolive/ditto-chat-core", "@dittolive/ditto-chat-ui"],
  },
});
