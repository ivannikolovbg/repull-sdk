import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.{ts,tsx}'],
    globals: true,
    testTimeout: 10000,
    setupFiles: ['./tests/setup.ts'],
  },
  esbuild: {
    jsx: 'automatic',
  },
});
