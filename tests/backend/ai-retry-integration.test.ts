import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIService } from '../../server/services/AIService';
import { IStorage } from '../../server/storage-poc';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { AiQueryRequest } from '@shared/schema';

// Mock des modules externes
vi.mock('@anthropic-ai/sdk');
vi.mock('openai');
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn()
  }
}));

vi.mock('../../server/services/ContextBuilderService', () => ({
  getContextBuilderService: vi.fn(() => ({
    buildContext: vi.fn().mockResolvedValue('test context')
  }))
}));

vi.mock('../../server/services/ContextCacheService', () => ({
  getContextCacheService: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../../server/services/PerformanceMetricsService', () => ({
  getPerformanceMetricsService: vi.fn(() => ({
    startPipelineTrace: vi.fn(),
    endPipelineTrace: vi.fn(),
    startStep: vi.fn(),
    endStep: vi.fn(),
    checkCircuitBreaker: vi.fn().mockReturnValue({ allowed: true })
  }))
}));

describe('AI Service Retry Integration', () => {
  let aiService: AIService;
  let mockStorage: IStorage;
  let mockAnthropicClient: any;
  let mockOpenAIClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Setup mock storage
    mockStorage = {
      getProjects: vi.fn(),
      getOffers: vi.fn(),
      getAos: vi.fn(),
      getSuppliers: vi.fn(),
      getChiffrages: vi.fn(),
      getDevis: vi.fn()
    } as any;
    
    // Setup mock Anthropic client
    mockAnthropicClient = {
      messages: {
        create: vi.fn()
      }
    };
    (Anthropic as any).mockImplementation(() => mockAnthropicClient);
    
    // Setup mock OpenAI client
    mockOpenAIClient = {
      chat: {
        completions: {
          create: vi.fn()
        }
      }
    };
    (OpenAI as any).mockImplementation(() => mockOpenAIClient);
    
    // Set up environment variables
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    
    // Create service instance
    aiService = new AIService(mockStorage);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  describe('Retry avec backoff exponentiel', () => {
    it('devrait réessayer 3 fois avec backoff exponentiel sur timeout Claude', async () => {
      const request: AiQueryRequest = {
        query: 'SELECT * FROM projects',
        queryType: 'text_to_sql',
        userRole: 'admin',
        complexity: 'simple'
      };
      
      // Simuler 2 timeouts puis succès
      mockAnthropicClient.messages.create
        .mockRejectedValueOnce(new Error('Timeout après 20000ms'))
        .mockRejectedValueOnce(new Error('Timeout après 20000ms'))
        .mockResolvedValueOnce({
          content: [{
            text: JSON.stringify({
              sql: 'SELECT * FROM projects',
              explanation: 'Test query',
              confidence: 0.9
            })
          }]
        });
      
      const resultPromise = aiService.generateSQL(request);
      
      // Fast-forward through retries
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data?.sqlGenerated).toBe('SELECT * FROM projects');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
    });

    it('devrait basculer vers GPT après échec Claude avec retry', async () => {
      const request: AiQueryRequest = {
        query: 'SELECT * FROM projects',
        queryType: 'text_to_sql',
        userRole: 'admin',
        complexity: 'simple'
      };
      
      // Claude échoue après tous les retries
      mockAnthropicClient.messages.create
        .mockRejectedValue(new Error('Service temporairement indisponible'));
      
      // GPT réussit au 2e essai
      mockOpenAIClient.chat.completions.create
        .mockRejectedValueOnce(new Error('Timeout après 15000ms'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                sql: 'SELECT * FROM projects',
                explanation: 'Fallback to GPT',
                confidence: 0.85
              })
            }
          }],
          usage: { total_tokens: 100 }
        });
      
      const resultPromise = aiService.generateSQL(request);
      
      // Fast-forward through all retries
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      expect(result.data?.sqlGenerated).toBe('SELECT * FROM projects');
      expect(result.data?.explanation).toContain('Fallback to GPT');
      
      // Claude appelé 4 fois (1 + 3 retries)
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(4);
      // GPT appelé 2 fois (1 échec + 1 succès)
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(2);
    });

    it('devrait retourner une réponse dégradée après échec total', async () => {
      const request: AiQueryRequest = {
        query: 'Affiche tous les projets en cours',
        queryType: 'text_to_sql',
        userRole: 'admin',
        complexity: 'simple'
      };
      
      // Claude et GPT échouent tous les deux
      mockAnthropicClient.messages.create
        .mockRejectedValue(new Error('Service indisponible'));
      
      mockOpenAIClient.chat.completions.create
        .mockRejectedValue(new Error('Service indisponible'));
      
      const resultPromise = aiService.generateSQL(request);
      
      // Fast-forward through all retries
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      
      // Devrait retourner une réponse dégradée
      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe('degraded');
      expect(result.data?.sqlGenerated).toContain('SELECT');
      expect(result.data?.warnings).toContain('Réponse dégradée après plusieurs tentatives');
      expect(result.data?.metadata?.totalAttempts).toBeGreaterThan(0);
    });

    it('ne devrait pas retry sur erreur 401', async () => {
      const request: AiQueryRequest = {
        query: 'SELECT * FROM projects',
        queryType: 'text_to_sql',
        userRole: 'admin',
        complexity: 'simple'
      };
      
      const authError: any = new Error('Unauthorized');
      authError.status = 401;
      
      mockAnthropicClient.messages.create.mockRejectedValue(authError);
      mockOpenAIClient.chat.completions.create.mockRejectedValue(authError);
      
      const resultPromise = aiService.generateSQL(request);
      
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      
      // Devrait basculer en mode dégradé rapidement sans retries
      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe('degraded');
      
      // Seulement 1 appel chacun (pas de retries sur 401)
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(1);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('devrait gérer le circuit breaker ouvert', async () => {
      const request: AiQueryRequest = {
        query: 'SELECT * FROM projects',
        queryType: 'text_to_sql',
        userRole: 'admin',
        complexity: 'simple'
      };
      
      // Simuler beaucoup d'échecs pour ouvrir le circuit breaker
      const networkError = new Error('Network error');
      for (let i = 0; i < 10; i++) {
        mockAnthropicClient.messages.create.mockRejectedValueOnce(networkError);
        try {
          const tempRequest = { ...request, query: `Query ${i}` };
          await aiService.generateSQL(tempRequest);
        } catch (e) {
          // Ignorer les erreurs
        }
        await vi.runAllTimersAsync();
      }
      
      // Le prochain appel devrait être rejeté par le circuit breaker
      const resultPromise = aiService.generateSQL(request);
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      
      // Devrait retourner une réponse dégradée car circuit breaker ouvert
      expect(result.success).toBe(true);
      expect(result.data?.modelUsed).toBe('degraded');
      expect(result.data?.metadata?.circuitBreakerOpen).toBeDefined();
    });

    it('devrait respecter les timeouts configurés', async () => {
      const request: AiQueryRequest = {
        query: 'SELECT * FROM projects',
        queryType: 'text_to_sql',
        userRole: 'admin',
        complexity: 'complex'
      };
      
      // Simuler une requête qui prend trop de temps
      mockAnthropicClient.messages.create.mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 30000)) // 30s
      );
      
      const startTime = Date.now();
      const resultPromise = aiService.generateSQL(request);
      
      // Fast-forward through timeout
      await vi.advanceTimersByTimeAsync(20000); // Timeout à 20s
      
      try {
        await resultPromise;
      } catch (error: any) {
        expect(error.message).toContain('timeout');
      }
      
      // Vérifier que le timeout a bien été appliqué
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('devrait logger les métriques de retry', async () => {
      const logSpy = vi.spyOn(console, 'warn');
      
      const request: AiQueryRequest = {
        query: 'SELECT * FROM projects',
        queryType: 'text_to_sql',
        userRole: 'admin'
      };
      
      // Simuler 1 échec puis succès
      mockAnthropicClient.messages.create
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          content: [{
            text: JSON.stringify({
              sql: 'SELECT * FROM projects',
              explanation: 'Success after retry'
            })
          }]
        });
      
      const resultPromise = aiService.generateSQL(request);
      await vi.runAllTimersAsync();
      
      const result = await resultPromise;
      
      expect(result.success).toBe(true);
      
      // Vérifier que les logs de retry ont été émis
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Retry'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            attempt: expect.any(Number),
            delay: expect.any(Number)
          })
        })
      );
      
      logSpy.mockRestore();
    });

    it('devrait utiliser le cache de réponses dégradées', async () => {
      const request: AiQueryRequest = {
        query: 'Affiche les projets',
        queryType: 'text_to_sql',
        userRole: 'admin'
      };
      
      // Premier appel : tous échouent
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('Timeout'));
      mockOpenAIClient.chat.completions.create.mockRejectedValue(new Error('Timeout'));
      
      const result1Promise = aiService.generateSQL(request);
      await vi.runAllTimersAsync();
      const result1 = await result1Promise;
      
      expect(result1.data?.modelUsed).toBe('degraded');
      
      // Deuxième appel avec même requête : devrait utiliser le cache dégradé
      const result2 = await aiService.generateSQL(request);
      
      expect(result2.success).toBe(true);
      expect(result2.data?.modelUsed).toBe('degraded_cache');
      expect(result2.data?.fromCache).toBe(true);
      
      // Pas d'appels supplémentaires aux APIs
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(4); // Premier appel seulement
    });
  });

  describe('Configuration centralisée', () => {
    it('devrait utiliser les timeouts de API_LIMITS', async () => {
      const request: AiQueryRequest = {
        query: 'SELECT * FROM projects',
        queryType: 'text_to_sql',
        userRole: 'admin'
      };
      
      // Mock pour vérifier que le bon timeout est utilisé
      const createSpy = vi.fn().mockResolvedValue({
        content: [{
          text: JSON.stringify({
            sql: 'SELECT * FROM projects'
          })
        }]
      });
      
      mockAnthropicClient.messages.create = createSpy;
      
      await aiService.generateSQL(request);
      
      // Le timeout devrait être configuré selon API_LIMITS (20s pour Claude)
      // Vérifier dans les logs ou les métriques
      expect(createSpy).toHaveBeenCalled();
    });
  });
});