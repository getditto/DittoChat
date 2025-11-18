// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom', // Simulates browser for Canvas/File/Document usage
    globals: true,        // Optional: allows using describe/it without imports
    setupFiles: ['./tests/setup.ts'], // Points to your setup file
  },
});