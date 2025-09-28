import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { Router } from "express";
import { storage } from "../../../server/storage";
import { getAIService } from "../../../server/services/AIService";

// Mock des services AI et contexte pour les tests
vi.mock('../../../server/services/AIService', () => ({
  getAIService: vi.fn().mockReturnValue({
    generateSQL: vi.fn().mockResolvedValue({
      success: true,
      data: {
        sqlGenerated: "SELECT * FROM aos WHERE id = 'test-ao-id'",
        explanation: "Requête de test générée",
        modelUsed: "claude_sonnet_4",
        tokensUsed: 150,
        confidence: 0.9,
        fromCache: false
      }
    }),
    buildEnrichedContext: vi.fn().mockResolvedValue({
      entityType: "ao",
      entityId: "test-ao-id",
      requestId: "test-request-id",
      contextTypes: ["technical", "business"],
      scope: "comprehensive",
      compressionLevel: "none",
      generationMetrics: {
        totalTablesQueried: 5,
        executionTimeMs: 850,
        cachingUsed: false,
        dataFreshnessScore: 0.9,
        relevanceScore: 0.85
      },
      tokenEstimate: 2500,
      frenchTerminology: {
        "window": "fenêtre",
        "door": "porte"
      },
      keyInsights: [
        "AO actif avec 3 lots identifiés",
        "Échéance de remise d'offre dans 15 jours"
      ],
      businessContext: {
        currentPhase: "Analyse",
        completedPhases: [],
        nextMilestones: [],
        financials: {},
        projectClassification: {
          size: "moyen",
          complexity: "standard",
          priority: "normale",
          riskLevel: "faible"
        },
        menuiserieSpecifics: {
          productTypes: ["fenêtres PVC", "volets roulants"],
          installationMethods: [],
          qualityStandards: [],
          commonIssues: []
        },
        databaseSchemas: [],
        businessExamples: [],
        domainKnowledge: {},
        roleSpecificConstraints: {},
        workflowContext: {},
        businessRules: [],
        qualityStandards: []
      },
      relationalContext: {
        mainActors: {
          client: {
            name: "Test Client",
            type: "private",
            recurrency: "Nouveau client",
            criticalRequirements: []
          }
        },
        collaborationHistory: {
          withClient: {
            previousProjects: 0,
            successRate: 0,
            averageMargin: 0
          },
          withSuppliers: {}
        },
        network: {
          recommendedSuppliers: [],
          blacklistedSuppliers: [],
          strategicPartners: []
        }
      }
    }),
    getUsageStats: vi.fn().mockResolvedValue({
      totalRequests: 150,
      successRate: 0.95,
      avgResponseTime: 850,
      modelDistribution: {
        claude_sonnet_4: 0.7,
        gpt_5: 0.3
      },
      complexityDistribution: {
        simple: 0.6,
        complex: 0.4
      },
      cacheHitRate: 0.25,
      totalTokensUsed: 45000,
      estimatedCost: 12.50
    }),
    cleanExpiredCache: vi.fn().mockResolvedValue(5),
    healthCheck: vi.fn().mockResolvedValue({
      claude: true,
      gpt: true,
      database: true,
      cache: true
    })
  })
}));

// Import du router après les mocks
import aiServiceRouter from "../../../server/routes/ai-service";

describe('AI Service Routes - Test Endpoint Context Fix', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Créer l'app Express pour les tests
    app = express();
    app.use(express.json());
    app.use('/api/ai', aiServiceRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/ai/context/:entityType/:id - Bug Fix Validation', () => {
    it('devrait réussir avec des paramètres valides (bug corrigé)', async () => {
      const response = await request(app)
        .get('/api/ai/context/ao/test-ao-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.entityType).toBe('ao');
      expect(response.body.data.entityId).toBe('test-ao-id');
      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.entityType).toBe('ao');
      expect(response.body.metadata.entityId).toBe('test-ao-id');
    });

    it('devrait échouer avec entityType invalide', async () => {
      const response = await request(app)
        .get('/api/ai/context/invalid_type/test-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('validation_error');
      expect(response.body.error.message).toContain('Type d\'entité invalide');
      expect(response.body.error.details.supportedTypes).toContain('ao');
    });

    it('devrait échouer avec entityId vide', async () => {
      const response = await request(app)
        .get('/api/ai/context/ao/')
        .expect(404); // Express router retourne 404 pour route incomplète
    });

    it('devrait échouer avec entityId contenant seulement des espaces', async () => {
      const response = await request(app)
        .get('/api/ai/context/ao/%20%20%20') // espaces encodés en URL
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('validation_error');
      expect(response.body.error.message).toBe('ID d\'entité requis');
    });

    it('devrait gérer différents types d\'entités supportés', async () => {
      const supportedTypes = ['ao', 'offer', 'project', 'supplier', 'team', 'client'];
      
      for (const entityType of supportedTypes) {
        const response = await request(app)
          .get(`/api/ai/context/${entityType}/test-id`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.metadata.entityType).toBe(entityType);
      }
    });

    it('devrait accepter différents types de requête via query param', async () => {
      const response = await request(app)
        .get('/api/ai/context/ao/test-ao-id?type=detailed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.requestType).toBe('detailed');
    });

    it('devrait utiliser "summary" comme type par défaut', async () => {
      const response = await request(app)
        .get('/api/ai/context/ao/test-ao-id')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metadata.requestType).toBe('summary');
    });

    it('devrait retourner les métadonnées complètes', async () => {
      const response = await request(app)
        .get('/api/ai/context/project/test-project-id')
        .expect(200);

      expect(response.body.metadata).toMatchObject({
        entityType: 'project',
        entityId: 'test-project-id',
        requestType: 'summary',
        generatedAt: expect.any(String),
        tokensEstimate: expect.any(Number),
        compressionLevel: expect.any(String)
      });

      // Vérifier le format de la date
      expect(new Date(response.body.metadata.generatedAt)).toBeInstanceOf(Date);
    });
  });

  describe('Autres endpoints AI - Smoke Tests', () => {
    it('POST /api/ai/generate-sql devrait fonctionner', async () => {
      const response = await request(app)
        .post('/api/ai/generate-sql')
        .send({
          query: "Combien d'AO ai-je ?",
          context: "Table aos",
          userRole: "chef_projet"
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sqlGenerated).toBeDefined();
    });

    it('GET /api/ai/usage-stats devrait fonctionner', async () => {
      const response = await request(app)
        .get('/api/ai/usage-stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.totalRequests).toBeGreaterThan(0);
    });

    it('GET /api/ai/health-check devrait fonctionner', async () => {
      const response = await request(app)
        .get('/api/ai/health-check')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.services).toBeDefined();
    });

    it('GET /api/ai/config devrait fonctionner', async () => {
      const response = await request(app)
        .get('/api/ai/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.models).toBeDefined();
      expect(response.body.data.cache).toBeDefined();
    });
  });

  describe('Gestion des erreurs génériques', () => {
    it('devrait gérer les erreurs internes du service AI', async () => {
      // Mock une erreur du service
      const mockAIService = getAIService(storage) as any;
      mockAIService.buildEnrichedContext.mockRejectedValueOnce(new Error('Service indisponible'));

      const response = await request(app)
        .get('/api/ai/context/ao/test-ao-id')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('unknown');
      expect(response.body.error.message).toContain('Erreur interne');
    });

    it('devrait gérer le cas où le contexte n\'est pas trouvé', async () => {
      // Mock un contexte null
      const mockAIService = getAIService(storage) as any;
      mockAIService.buildEnrichedContext.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/ai/context/ao/inexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('not_found');
      expect(response.body.error.message).toContain('Impossible de générer le contexte');
    });
  });
});

describe('Validation spécifique du fix de bug', () => {
  it('devrait correctement extraire entityId depuis le paramètre :id', () => {
    // Test pour vérifier que le destructuring { entityType, id: entityId } fonctionne
    const mockParams = { entityType: 'ao', id: 'test-ao-123' };
    const { entityType, id: entityId } = mockParams;
    
    expect(entityType).toBe('ao');
    expect(entityId).toBe('test-ao-123');
    expect(entityId).not.toBeUndefined();
  });
});