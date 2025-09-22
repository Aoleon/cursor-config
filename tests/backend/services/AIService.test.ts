import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AIService, getAIService } from "../../../server/services/AIService";
import { storage } from "../../../server/storage";
import type { AiQueryRequest } from "@shared/schema";

// Mock des clients IA pour les tests
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ text: JSON.stringify({
          sql: "SELECT COUNT(*) FROM projects WHERE user_id = 'test'",
          explanation: "Compte le nombre de projets pour l'utilisateur test",
          confidence: 0.9,
          warnings: []
        })}]
      })
    }
  }))
}));

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ 
            message: { 
              content: JSON.stringify({
                sql: "SELECT p.*, COUNT(t.*) as task_count FROM projects p LEFT JOIN tasks t ON p.id = t.project_id WHERE p.user_id = 'test' GROUP BY p.id",
                explanation: "Requête complexe avec jointure et agrégation",
                confidence: 0.95,
                warnings: []
              })
            }
          }],
          usage: { total_tokens: 250 }
        })
      }
    }
  }))
}));

// Mock variables d'environnement
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-key';

describe('AIService - Sélection automatique de modèle', () => {
  let aiService: AIService;

  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks();
    aiService = new AIService(storage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Sélection automatique de modèle', () => {
    it('devrait sélectionner Claude pour une requête simple', async () => {
      const request: AiQueryRequest = {
        query: "Combien de projets ai-je ?",
        context: "Table projects avec colonnes id, name, user_id",
        userRole: "chef_projet"
      };

      const result = await aiService.generateSQL(request);

      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe("claude_sonnet_4");
      expect(result.data?.sqlGenerated).toContain("SELECT");
      expect(result.data?.sqlGenerated).toContain("projects");
    });

    it('devrait sélectionner GPT-5 pour une requête complexe explicite', async () => {
      const request: AiQueryRequest = {
        query: "Analyse la rentabilité par type de projet avec corrélation saisonnière",
        context: "Table projects, revenues, costs avec relations complexes",
        userRole: "admin",
        complexity: "complex"
      };

      const result = await aiService.generateSQL(request);

      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe("gpt_5");
      expect(result.data?.tokensUsed).toBeGreaterThan(0);
    });

    it('devrait forcer un modèle spécifique quand demandé', async () => {
      const request: AiQueryRequest = {
        query: "Simple requête",
        context: "Table test",
        userRole: "test",
        forceModel: "gpt_5"
      };

      const result = await aiService.generateSQL(request);

      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe("gpt_5");
    });
  });

  describe('Détection automatique de complexité', () => {
    it('devrait détecter une requête complexe par mots-clés SQL', async () => {
      const request: AiQueryRequest = {
        query: "SELECT p.*, COUNT(t.*) FROM projects p LEFT JOIN tasks t WITH RECURSIVE analysis",
        context: "Schéma complexe multi-tables",
        userRole: "admin"
      };

      // On mock une méthode privée pour tester la logique
      const aiServiceAny = aiService as any;
      const complexityScore = aiServiceAny.analyzeQueryComplexity(request.query, request.context);

      expect(complexityScore).toBeGreaterThan(0.5);
    });

    it('devrait détecter une requête métier menuiserie', async () => {
      const request: AiQueryRequest = {
        query: "Quelles fenêtres PVC sont en stock ?",
        context: "Table materiaux avec colonnes type, matiere, stock",
        userRole: "technicien"
      };

      const aiServiceAny = aiService as any;
      const isMenuiserie = aiServiceAny.isMenuiserieBusinessQuery(request.query, request.context);

      expect(isMenuiserie).toBe(true);
    });

    it('devrait calculer correctement le score de complexité', async () => {
      const aiServiceAny = aiService as any;

      // Requête simple
      const simpleScore = aiServiceAny.analyzeQueryComplexity(
        "SELECT * FROM users", 
        "Table users simple"
      );
      expect(simpleScore).toBeLessThan(0.3);

      // Requête complexe
      const complexScore = aiServiceAny.analyzeQueryComplexity(
        "SELECT u.*, COUNT(p.*) as project_count, AVG(r.margin) as avg_margin FROM users u LEFT JOIN projects p ON u.id = p.user_id INNER JOIN revenues r ON p.id = r.project_id WHERE u.role = 'admin' GROUP BY u.id HAVING COUNT(p.*) > 5 ORDER BY avg_margin DESC",
        "Schema avec 5 tables reliées, analyses statistiques, agrégations"
      );
      expect(complexScore).toBeGreaterThan(0.7);
    });
  });

  describe('Gestion des erreurs et fallbacks', () => {
    it('devrait gérer l\'échec d\'un modèle avec fallback', async () => {
      // Mock une erreur sur Claude
      const mockAnthropic = aiService['anthropic'] as any;
      mockAnthropic.messages.create.mockRejectedValueOnce(new Error("API Error"));

      const request: AiQueryRequest = {
        query: "Test query",
        context: "Test context",
        userRole: "test",
        forceModel: "claude_sonnet_4"
      };

      const result = await aiService.generateSQL(request);

      // Devrait quand même réussir grâce au fallback
      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe("gpt_5"); // Fallback vers GPT
    });

    it('devrait valider et rejeter les requêtes malveillantes', async () => {
      const request: AiQueryRequest = {
        query: "SELECT * FROM users; DROP TABLE users; --",
        context: "Test",
        userRole: "test"
      };

      const result = await aiService.generateSQL(request);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("validation_error");
      expect(result.error?.message).toContain("malveillante");
    });

    it('devrait gérer les requêtes vides', async () => {
      const request: AiQueryRequest = {
        query: "",
        context: "Test",
        userRole: "test"
      };

      const result = await aiService.generateSQL(request);

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("validation_error");
    });
  });

  describe('Système de cache', () => {
    it('devrait mettre en cache les réponses réussies', async () => {
      const request: AiQueryRequest = {
        query: "SELECT * FROM test_table",
        context: "Test table",
        userRole: "test"
      };

      // Première requête
      const result1 = await aiService.generateSQL(request);
      expect(result1.success).toBe(true);
      expect(result1.data?.fromCache).toBe(false);

      // Deuxième requête identique (devrait venir du cache)
      const result2 = await aiService.generateSQL(request);
      expect(result2.success).toBe(true);
      expect(result2.data?.fromCache).toBe(true);
    });

    it('devrait générer des hash cohérents pour le cache', () => {
      const aiServiceAny = aiService as any;

      const request1: AiQueryRequest = {
        query: "SELECT * FROM users",
        context: "Test",
        userRole: "admin"
      };

      const request2: AiQueryRequest = {
        query: "select * from users", // Même requête en minuscules
        context: "Test",
        userRole: "admin"
      };

      const hash1 = aiServiceAny.generateQueryHash(request1);
      const hash2 = aiServiceAny.generateQueryHash(request2);

      expect(hash1).toBe(hash2); // Les hashes doivent être identiques
    });
  });

  describe('Monitoring et métriques', () => {
    it('devrait calculer correctement les coûts estimés', () => {
      const aiServiceAny = aiService as any;

      const claudeCost = aiServiceAny.calculateCostEstimate("claude_sonnet_4", 1000);
      const gptCost = aiServiceAny.calculateCostEstimate("gpt_5", 1000);

      expect(claudeCost).toBeGreaterThan(0);
      expect(gptCost).toBeGreaterThan(0);
      expect(gptCost).toBeGreaterThan(claudeCost); // GPT-5 plus cher
    });

    it('devrait récupérer les statistiques d\'usage', async () => {
      const stats = await aiService.getUsageStats(30);

      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('avgResponseTime');
      expect(stats).toHaveProperty('modelDistribution');
      expect(stats).toHaveProperty('complexityDistribution');
      expect(stats.modelDistribution).toHaveProperty('claude_sonnet_4');
      expect(stats.modelDistribution).toHaveProperty('gpt_5');
    });
  });

  describe('Health check et diagnostics', () => {
    it('devrait vérifier la santé des services', async () => {
      const health = await aiService.healthCheck();

      expect(health).toHaveProperty('claude');
      expect(health).toHaveProperty('gpt');
      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('cache');
      expect(typeof health.claude).toBe('boolean');
      expect(typeof health.gpt).toBe('boolean');
    });
  });

  describe('Patterns des blueprints', () => {
    it('devrait respecter le pattern Claude Sonnet 4 du blueprint', async () => {
      const request: AiQueryRequest = {
        query: "Test Claude pattern",
        context: "Test",
        userRole: "test",
        forceModel: "claude_sonnet_4"
      };

      const result = await aiService.generateSQL(request);
      
      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe("claude_sonnet_4");
      
      // Vérifier que le modèle exact du blueprint est utilisé
      const mockAnthropic = aiService['anthropic'] as any;
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-sonnet-4-20250514" // Modèle exact du blueprint
        })
      );
    });

    it('devrait respecter le pattern GPT-5 du blueprint', async () => {
      const request: AiQueryRequest = {
        query: "Test GPT pattern", 
        context: "Test",
        userRole: "test",
        forceModel: "gpt_5"
      };

      const result = await aiService.generateSQL(request);

      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe("gpt_5");

      // Vérifier que le modèle exact du blueprint est utilisé
      const mockOpenAI = aiService['openai'] as any;
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-5", // Modèle exact du blueprint
          response_format: { type: "json_object" } // Format JSON obligatoire
        })
      );
    });
  });
});

describe('Factory et Singleton', () => {
  it('devrait retourner la même instance via le factory', () => {
    const instance1 = getAIService(storage);
    const instance2 = getAIService(storage);

    expect(instance1).toBe(instance2); // Même référence (singleton)
  });
});

describe('Intégration avec le schéma de données', () => {
  it('devrait utiliser les types corrects du schéma partagé', async () => {
    const request: AiQueryRequest = {
      query: "Test schema types",
      context: "Test",
      userRole: "admin",
      queryType: "text_to_sql",
      complexity: "simple",
      useCache: true,
      maxTokens: 1000
    };

    // Vérifier que TypeScript accepte tous les types
    expect(request.queryType).toBe("text_to_sql");
    expect(request.complexity).toBe("simple");
    expect(typeof request.useCache).toBe("boolean");
  });
});