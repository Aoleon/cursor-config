import { vi } from 'vitest'

/**
 * Helpers utilitaires pour les tests JLM ERP
 * Optimisations anti-boucles et patterns de test robustes
 */

// Mock factory pour éviter la duplication
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-1',
  email: 'test@jlm-menuiserie.fr',
  firstName: 'Test',
  lastName: 'User',
  role: 'responsable_be',
  profileImageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

export const createMockOffer = (overrides = {}) => ({
  id: 'offer-1',
  reference: 'OFF-2024-001',
  client: 'Test Client',
  location: 'Test Location',
  menuiserieType: 'bardage',
  estimatedAmount: '50000',
  status: 'nouveau',
  responsibleUserId: 'user-1',
  deadline: new Date(),
  isPriority: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

export const createMockBeWorkload = (overrides = {}) => ({
  id: 'workload-1',
  userId: 'user-1',
  weekNumber: 10,
  year: 2024,
  plannedHours: 40,
  actualHours: 38,
  capacityHours: 40,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})

// Détection de boucles infinites dans les tests
export const createLoopDetector = (maxCalls = 100) => {
  const callCounts = new Map()
  
  return (testName: string) => {
    const count = callCounts.get(testName) || 0
    callCounts.set(testName, count + 1)
    
    if (count > maxCalls) {
      throw new Error(`Possible infinite loop detected in test: ${testName}`)
    }
  }
}

// Mock robuste avec timeout
export const createTimedMock = <T>(returnValue: T, delay = 0) => {
  return vi.fn(() => {
    return new Promise(resolve => {
      setTimeout(() => resolve(returnValue), delay)
    })
  })
}

// Mock du fetch avec gestion d'erreur
export const createMockFetch = (responses: Record<string, any>) => {
  return vi.fn((url: string) => {
    const response = responses[url]
    
    if (!response) {
      return Promise.reject(new Error(`Mock fetch: No response defined for ${url}`))
    }
    
    return Promise.resolve({
      ok: response.status < 400,
      status: response.status || 200,
      json: () => Promise.resolve(response.data),
      text: () => Promise.resolve(JSON.stringify(response.data))
    })
  })
}

// Attente conditionnelle pour éviter les flaky tests
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
) => {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    if (condition()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error(`Condition not met within ${timeout}ms`)
}

// Nettoyage automatique des mocks
export const createAutoCleanupMock = () => {
  const mocks: any[] = []
  
  const addMock = (mock: any) => {
    mocks.push(mock)
    return mock
  }
  
  const cleanup = () => {
    mocks.forEach(mock => {
      if (mock.mockClear) mock.mockClear()
      if (mock.mockReset) mock.mockReset()
    })
    mocks.length = 0
  }
  
  return { addMock, cleanup }
}