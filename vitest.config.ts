/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

/**
 * Configuration Vitest pour Tests Phase 2.5
 * Suite exhaustive intelligence temporelle menuiserie française
 */

export default defineConfig({
  test: {
    // Configuration globale
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    
    // Couverture de code exhaustive Phase 2.5 - Frontend focus
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'client/src/**/*.{ts,tsx,js,jsx}',
        'shared/**/*.{ts,js}'
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/types/**',
        'server/vite.ts',
        'vite.config.ts',
        'drizzle.config.ts'
      ],
      // Seuils de couverture critiques Phase 2.5
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Seuils spécialisés par module intelligence temporelle
        'server/services/DateIntelligenceService.ts': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'server/services/DateAlertDetectionService.ts': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    },
    
    // Patterns de fichiers de test - Frontend et shared seulement  
    include: [
      'tests/frontend/**/*.{test,spec}.{ts,tsx}',
      'client/src/**/*.{test,spec}.{ts,tsx}',
      'shared/**/*.{test,spec}.{ts,js}'
    ],
    // Exclure integration tests (doivent être dans backend config avec node env)
    exclude: ['tests/integration/**/*'],
    
    // Configuration pour tests de performance
    sequence: {
      concurrent: true
    },
    testTimeout: 30000, // 30s pour tests performance
    hookTimeout: 10000, // 10s pour setup/teardown
    
    // Reporters pour CI/CD
    reporter: [
      'verbose',
      'json'
    ],
    outputFile: './test-results/results.json',
    
    // Mock configurations
    deps: {
      inline: ['@testing-library/user-event']
    },
    
    // Parallélisation optimisée
    pool: 'threads',
    poolOptions: {
      threads: {
        maxThreads: 4,
        minThreads: 1
      }
    }
  },
  
  // Résolution des alias pour les tests
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
      '@tests': resolve(__dirname, './tests'),
      '@server': resolve(__dirname, './server'),
      '@assets': resolve(__dirname, './attached_assets')
    }
  },
  
  // Configuration pour le support ESM
  esbuild: {
    target: 'node18'
  }
})