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
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockResolvedValue([])
      })
    }),
    insert: vi.fn().mockReturnValue({
      into: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([])
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    }),
    delete: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    }),
    query: {
      aos: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null)
      },
      offers: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null)
      },
      projects: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null)
      }
    }
  },
  pool: {
    connect: vi.fn(),
    end: vi.fn(),
  }
}))

// Mock du storage pour éviter les erreurs DB
vi.mock('../../server/storage-poc', () => ({
  default: {
    // AO methods
    getAos: vi.fn().mockResolvedValue([]),
    getAo: vi.fn().mockResolvedValue(null),
    createAo: vi.fn().mockResolvedValue({ id: 'test-ao-1' }),
    updateAo: vi.fn().mockResolvedValue({ id: 'test-ao-1' }),
    deleteAo: vi.fn().mockResolvedValue(true),
    
    // Offers methods
    getOffers: vi.fn().mockResolvedValue([]),
    getOffer: vi.fn().mockResolvedValue(null),
    createOffer: vi.fn().mockResolvedValue({ id: 'test-offer-1' }),
    updateOffer: vi.fn().mockResolvedValue({ id: 'test-offer-1' }),
    deleteOffer: vi.fn().mockResolvedValue(true),
    
    // Projects methods
    getProjects: vi.fn().mockResolvedValue([]),
    getProject: vi.fn().mockResolvedValue(null),
    createProject: vi.fn().mockResolvedValue({ id: 'test-project-1' }),
    updateProject: vi.fn().mockResolvedValue({ id: 'test-project-1' }),
    deleteProject: vi.fn().mockResolvedValue(true),
    
    // Date intelligence methods
    getDateIntelligenceRules: vi.fn().mockResolvedValue([]),
    createDateIntelligenceRule: vi.fn().mockResolvedValue({ id: 'test-rule-1' }),
    updateDateIntelligenceRule: vi.fn().mockResolvedValue({ id: 'test-rule-1' }),
    deleteDataIntelligenceRule: vi.fn().mockResolvedValue(true),
    
    // Date alerts methods
    getDateAlerts: vi.fn().mockResolvedValue([]),
    createDateAlert: vi.fn().mockResolvedValue({ id: 'test-alert-1' }),
    updateDateAlert: vi.fn().mockResolvedValue({ id: 'test-alert-1' }),
    deleteDeadlineAlert: vi.fn().mockResolvedValue(true),
    
    // Users methods
    getUsers: vi.fn().mockResolvedValue([]),
    getUser: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue({ id: 'test-user-1' }),
    
    // Timeline methods
    getProjectTimelines: vi.fn().mockResolvedValue([]),
    updateProjectTimeline: vi.fn().mockResolvedValue({ id: 'test-timeline-1' }),
    
    // Performance metrics
    getPerformanceMetrics: vi.fn().mockResolvedValue([])
  },
  
  // Export storage instance
  storage: {
    getAos: vi.fn().mockResolvedValue([]),
    getAo: vi.fn().mockResolvedValue(null),
    createAo: vi.fn().mockResolvedValue({ id: 'test-ao-1' }),
    updateAo: vi.fn().mockResolvedValue({ id: 'test-ao-1' }),
    deleteAo: vi.fn().mockResolvedValue(true)
  }
}))

// Mock des services pour éviter les erreurs de dépendances
vi.mock('../../server/services/DateIntelligenceService', () => {
  const mockService = {
    calculateProjectTimeline: vi.fn().mockResolvedValue({
      totalDuration: 30,
      phases: [],
      startDate: new Date(),
      endDate: new Date()
    }),
    evaluateBusinessRules: vi.fn().mockResolvedValue([]),
    optimizeTimeline: vi.fn().mockResolvedValue([])
  };
  
  return {
    DateIntelligenceService: vi.fn().mockImplementation(() => mockService),
    default: {
      getInstance: vi.fn().mockReturnValue(mockService)
    }
  }
})

vi.mock('../../server/services/DateAlertDetectionService', () => {
  const mockService = {
    runDetection: vi.fn().mockResolvedValue([]),
    getAlerts: vi.fn().mockResolvedValue([]),
    acknowledgeAlert: vi.fn().mockResolvedValue(true)
  };
  
  return {
    DateAlertDetectionService: vi.fn().mockImplementation(() => mockService),
    default: {
      getInstance: vi.fn().mockReturnValue(mockService)
    }
  }
})

// Mock du service PeriodicDetectionScheduler 
vi.mock('../../server/services/PeriodicDetectionScheduler', () => ({
  PeriodicDetectionScheduler: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    runDetection: vi.fn().mockResolvedValue([]),
    runOptimizationCheck: vi.fn().mockResolvedValue([])
  })),
  default: {
    getInstance: vi.fn().mockReturnValue({
      start: vi.fn(),
      stop: vi.fn(),
      runDetection: vi.fn().mockResolvedValue([]),
      runOptimizationCheck: vi.fn().mockResolvedValue([])
    })
  }
}))

// Mock des autres services problématiques
vi.mock('../../server/services/pdfGeneratorService', () => ({
  PdfGeneratorService: {
    getInstance: vi.fn().mockReturnValue({
      generateDpgfPdf: vi.fn().mockResolvedValue('test-pdf-buffer'),
      cleanup: vi.fn()
    })
  }
}))

vi.mock('../../server/services/dpgfComputeService', () => ({
  DpgfComputeService: {
    getInstance: vi.fn().mockReturnValue({
      computeDpgf: vi.fn().mockResolvedValue({
        total: 1000,
        totalTva: 1200,
        elements: []
      })
    })
  }
}))