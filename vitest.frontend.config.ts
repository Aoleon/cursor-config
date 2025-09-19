/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/frontend/**/*.test.{ts,tsx}'],
    setupFiles: ['./tests/frontend/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['client/src/**/*.{ts,tsx}'],
      exclude: [
        'client/src/main.tsx',
        'client/src/**/*.d.ts'
      ],
      thresholds: {
        global: {
          lines: 81,        // > 80% strict
          statements: 81,   // > 80% strict
          functions: 81,    // > 80% strict
          branches: 76      // > 75% strict
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared')
    }
  },
  define: {
    'import.meta.env': {}
  }
})