import { vi } from 'vitest'

// Configuration spécifique aux tests backend
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'

// Mock des variables d'environnement
vi.mock('process', () => ({
  env: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    SESSION_SECRET: 'test-secret',
  }
}))

// Mock de la base de données pour les tests unitaires
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  pool: {
    connect: vi.fn(),
    end: vi.fn(),
  }
}))