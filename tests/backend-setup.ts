/**
 * Setup pour les tests backend
 * Configure les mocks et l'environnement de test
 */

import { vi } from 'vitest'

// Mock du storage pour éviter les problèmes de base de données en test
vi.mock('../../server/storage-poc', () => {
  return {
    DatabaseStorage: vi.fn().mockImplementation(() => ({
      // Mock des méthodes principales d'AO
      getAos: vi.fn().mockResolvedValue([]),
      getAo: vi.fn().mockResolvedValue(null),
      createAo: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data })),
      updateAo: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
      deleteAo: vi.fn().mockResolvedValue(undefined),
      
      // Mock des méthodes d'offres
      getOffers: vi.fn().mockResolvedValue([]),
      getOffer: vi.fn().mockResolvedValue(null),
      createOffer: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-offer-id', ...data })),
      
      // Mock des méthodes utilisateur
      getUsers: vi.fn().mockResolvedValue([]),
      getUserById: vi.fn().mockResolvedValue(null),
      createUser: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-user-id', ...data })),
      
      // Mock des méthodes de projet
      getProjects: vi.fn().mockResolvedValue([]),
      getProject: vi.fn().mockResolvedValue(null),
      createProject: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-project-id', ...data })),
      
      // Mock autres méthodes nécessaires
      init: vi.fn().mockResolvedValue(undefined)
    })),
    
    // Export par défaut pour compatibilité
    default: vi.fn().mockImplementation(() => ({
      getAos: vi.fn().mockResolvedValue([]),
      getAo: vi.fn().mockResolvedValue(null),
      createAo: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'test-id', ...data })),
      updateAo: vi.fn().mockImplementation((id, data) => Promise.resolve({ id, ...data })),
      deleteAo: vi.fn().mockResolvedValue(undefined)
    }))
  }
})

// Mock des services externes pour éviter les appels réels
vi.mock('../../server/services/monday-migration', () => ({
  MondayMigrationService: vi.fn().mockImplementation(() => ({
    migrate: vi.fn().mockResolvedValue({ success: true }),
    validate: vi.fn().mockResolvedValue(true)
  }))
}))

// Configuration globale des tests
beforeEach(() => {
  // Reset des mocks avant chaque test
  vi.clearAllMocks()
})

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'