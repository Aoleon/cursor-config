/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'server/**/*.test.ts',
      'tests/backend/**/*.test.ts',
      'tests/integration/**/*.test.ts'
    ],
    setupFiles: ['./tests/backend/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['server/**/*.ts'],
      exclude: [
        'server/index.ts',
        'server/vite.ts'
      ],
      thresholds: {
        global: {
          lines: 86,        // > 85% strict
          statements: 86,   // > 85% strict
          functions: 86,    // > 85% strict
          branches: 81      // > 80% strict
        }
      }
    }
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, './shared'),
      '@server': resolve(__dirname, './server')
    }
  }
})