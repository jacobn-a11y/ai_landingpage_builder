import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: { VITEST: '1', DATABASE_URL: 'postgresql://test:test@localhost:5432/test' },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
