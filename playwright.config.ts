import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests E2E
 * Tests de l'interface utilisateur Saxium
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  
  // ✅ Retries optimisés : CI robuste (2 retries), local fail-fast (0 retries)
  retries: process.env.CI ? 2 : 0,
  
  // ✅ Workers environment-controlled : CI parallèle (4), local séquentiel (1)
  workers: process.env.CI 
    ? parseInt(process.env.CI_WORKERS || '4')  // CI: 4 workers par défaut
    : parseInt(process.env.WORKERS || '1'),    // Local: 1 worker (debugging)
  
  // ✅ Sharding support : SHARD_INDEX et SHARD_TOTAL pour CI multi-machine
  shard: process.env.SHARD_INDEX && process.env.SHARD_TOTAL 
    ? { 
        current: parseInt(process.env.SHARD_INDEX), 
        total: parseInt(process.env.SHARD_TOTAL) 
      }
    : undefined,
  
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    ['./tests/reporters/metrics-reporter.ts'],
  ],
  outputDir: 'test-results/artifacts',
  
  // ✅ Timeout augmenté pour APIs IA (60s par test)
  timeout: 60 * 1000,
  
  // ✅ Expect timeout pour assertions rapides
  expect: {
    timeout: 5 * 1000,
  },
  
  use: {
    baseURL: 'http://localhost:5000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // ✅ Action timeout pour interactions UI rapides
    actionTimeout: 10 * 1000,
    
    // ✅ Use system Chromium in Replit (Nix package)
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
    },
  },

  projects: [
    // Setup - Authentification globale pour tous les tests
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Tests critiques du chatbot IA
    {
      name: 'chatbot',
      testMatch: /chatbot\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Tests du workflow de chiffrage
    {
      name: 'chiffrage',
      testMatch: /chiffrage\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Tests de résilience et robustesse
    {
      name: 'resilience',
      testMatch: /resilience\.spec\.ts/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'journeys',
      testMatch: /.*journeys.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
        // ✅ Timeout journeys E2E : actions plus longues (parcours complets)
        actionTimeout: 15 * 1000,  // 15s max par action (vs 10s pour core)
      },
      // ✅ Timeout total journeys : 90s (threshold 60s + buffer 50%)
      timeout: 90 * 1000,
      dependencies: ['setup'],
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // GAP CRITIQUE 2: Configuration webServer avec NODE_ENV=test pour E2E
  webServer: {
    command: 'NODE_ENV=test tsx server/index.ts',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NODE_ENV: 'test',
      DISABLE_SCHEDULER: '1'
    }
  },
});