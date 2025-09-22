import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLEngineService } from '../../server/services/SQLEngineService';
import { RBACService } from '../../server/services/RBACService';
import { getAIService } from '../../server/services/AIService';
import { storage } from '../../server/storage';
import { eventBus } from '../../server/eventBus';
import type { SQLQueryRequest } from '../../shared/schema';

// ========================================
// TESTS DE PERFORMANCE MOTEUR SQL - VALIDATION SLOs
// ========================================

describe('SQLEngine Performance Tests', () => {
  let sqlEngine: SQLEngineService;
  let rbacService: RBACService;
  
  beforeEach(async () => {
    // Initialisation des services
    rbacService = new RBACService(storage as any);
    const aiService = getAIService(storage as any);
    sqlEngine = new SQLEngineService(aiService, rbacService, eventBus, storage as any);
  });

  afterEach(() => {
    // Nettoyage après chaque test
  });

  // ========================================
  // TESTS SLO < 5 SECONDES - REQUÊTES SIMPLES
  // ========================================

  describe('Simple Query Performance SLO < 5s', () => {
    it('should execute simple query under 5 seconds', async () => {
      const startTime = Date.now();
      
      const simpleRequest: SQLQueryRequest = {
        naturalLanguageQuery: "Affiche-moi tous les projets actifs",
        userId: "test-user-perf",
        userRole: "user",
        timeoutMs: 5000 // Timeout explicite 5s
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(simpleRequest);
      const executionTime = Date.now() - startTime;
      
      console.log(`[PERF] Requête simple exécutée en ${executionTime}ms`);
      
      // SLO: < 5 secondes pour requêtes simples
      expect(executionTime).toBeLessThan(5000);
      expect(result.executionTime).toBeLessThan(5000);
      
      // La requête doit réussir (même si pas de données)
      expect(result.success).toBe(true);
    }, 10000); // Timeout test 10s pour laisser de la marge

    it('should execute basic aggregation under 5 seconds', async () => {
      const startTime = Date.now();
      
      const aggregationRequest: SQLQueryRequest = {
        naturalLanguageQuery: "Combien de projets par département ?",
        userId: "test-user-perf",
        userRole: "user",
        timeoutMs: 5000
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(aggregationRequest);
      const executionTime = Date.now() - startTime;
      
      console.log(`[PERF] Agrégation simple exécutée en ${executionTime}ms`);
      
      // SLO: < 5 secondes pour agrégations simples
      expect(executionTime).toBeLessThan(5000);
      expect(result.executionTime).toBeLessThan(5000);
      expect(result.success).toBe(true);
    }, 10000);

    it('should validate SQL security checks under 1 second', async () => {
      const startTime = Date.now();
      
      const validationRequest = {
        sql: "SELECT id, nom FROM projects WHERE user_id = $1 LIMIT 100",
        userId: "test-user-perf",
        userRole: "user",
        parameters: ["test-user-perf"]
      };

      const result = await sqlEngine.validateSQL(validationRequest);
      const executionTime = Date.now() - startTime;
      
      console.log(`[PERF] Validation sécurité exécutée en ${executionTime}ms`);
      
      // SLO: < 1 seconde pour validation sécurité
      expect(executionTime).toBeLessThan(1000);
      expect(result.isSecure).toBe(true);
    }, 5000);
  });

  // ========================================
  // TESTS SLO < 15 SECONDES - REQUÊTES COMPLEXES
  // ========================================

  describe('Complex Query Performance SLO < 15s', () => {
    it('should execute complex multi-table query under 15 seconds', async () => {
      const startTime = Date.now();
      
      const complexRequest: SQLQueryRequest = {
        naturalLanguageQuery: "Affiche-moi un rapport détaillé des projets avec leurs offres, équipes et tâches associées, groupé par département et statut",
        userId: "test-admin-perf", 
        userRole: "admin",
        timeoutMs: 15000 // Timeout explicite 15s
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(complexRequest);
      const executionTime = Date.now() - startTime;
      
      console.log(`[PERF] Requête complexe exécutée en ${executionTime}ms`);
      
      // SLO: < 15 secondes pour requêtes complexes
      expect(executionTime).toBeLessThan(15000);
      expect(result.executionTime).toBeLessThan(15000);
      expect(result.success).toBe(true);
    }, 20000); // Timeout test 20s

    it('should execute analytical query with multiple JOINs under 15 seconds', async () => {
      const startTime = Date.now();
      
      const analyticalRequest: SQLQueryRequest = {
        naturalLanguageQuery: "Calcule-moi le taux de conversion des offres en projets par trimestre et par équipe, avec les montants moyens",
        userId: "test-admin-perf",
        userRole: "admin", 
        timeoutMs: 15000
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(analyticalRequest);
      const executionTime = Date.now() - startTime;
      
      console.log(`[PERF] Analyse complexe exécutée en ${executionTime}ms`);
      
      // SLO: < 15 secondes pour analyses complexes
      expect(executionTime).toBeLessThan(15000);
      expect(result.executionTime).toBeLessThan(15000);
      expect(result.success).toBe(true);
    }, 20000);
  });

  // ========================================
  // TESTS DE CHARGE ET SCALABILITÉ
  // ========================================

  describe('Load and Scalability Tests', () => {
    it('should handle multiple concurrent simple queries under SLO', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
        naturalLanguageQuery: `Affiche-moi les projets du département 0${i + 1}`,
        userId: `test-user-concurrent-${i}`,
        userRole: "user" as const,
        timeoutMs: 5000
      }));

      const promises = requests.map(req => 
        sqlEngine.executeNaturalLanguageQuery(req)
      );
      
      const results = await Promise.all(promises);
      const totalExecutionTime = Date.now() - startTime;
      
      console.log(`[PERF] ${concurrentRequests} requêtes concurrentes exécutées en ${totalExecutionTime}ms`);
      
      // Toutes les requêtes doivent réussir
      results.forEach((result, i) => {
        expect(result.success).toBe(true);
        expect(result.executionTime).toBeLessThan(8000); // Tolérance +3s pour concurrence
        console.log(`[PERF] Requête ${i+1} : ${result.executionTime}ms`);
      });
      
      // Le temps total ne doit pas être beaucoup plus que le temps d'une requête
      expect(totalExecutionTime).toBeLessThan(10000); // Max 10s pour 5 requêtes concurrentes
    }, 15000);

    it('should maintain performance with AST parsing under load', async () => {
      const iterations = 10;
      const executionTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        const validationRequest = {
          sql: `SELECT * FROM projects WHERE departement = '${String(i % 95 + 1).padStart(2, '0')}' AND status = 'actif'`,
          userId: `test-load-${i}`,
          userRole: "user",
          parameters: []
        };

        const result = await sqlEngine.validateSQL(validationRequest);
        const executionTime = Date.now() - startTime;
        
        executionTimes.push(executionTime);
        expect(result.isSecure).toBe(true);
        expect(executionTime).toBeLessThan(2000); // < 2s par validation
      }
      
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxTime = Math.max(...executionTimes);
      
      console.log(`[PERF] Validation AST moyenne: ${avgTime.toFixed(2)}ms, max: ${maxTime}ms`);
      
      // Performance moyenne doit rester stable
      expect(avgTime).toBeLessThan(1000); // < 1s en moyenne
      expect(maxTime).toBeLessThan(2000);  // < 2s maximum
    }, 25000);
  });

  // ========================================
  // TESTS DE TIMEOUT ET LIMITES
  // ========================================

  describe('Timeout and Limits Tests', () => {
    it('should respect timeout limits for long queries', async () => {
      const shortTimeoutRequest: SQLQueryRequest = {
        naturalLanguageQuery: "Fais-moi une analyse très complexe de tous les projets avec historique complet",
        userId: "test-timeout",
        userRole: "admin",
        timeoutMs: 2000 // Timeout très court intentionnel
      };

      const startTime = Date.now();
      const result = await sqlEngine.executeNaturalLanguageQuery(shortTimeoutRequest);
      const executionTime = Date.now() - startTime;
      
      console.log(`[PERF] Test timeout exécuté en ${executionTime}ms`);
      
      // Si la requête échoue par timeout, c'est normal
      // Si elle réussit, elle doit respecter le timeout
      if (result.success) {
        expect(executionTime).toBeLessThan(3000); // Marge 1s
      } else if (result.error?.type === 'timeout') {
        expect(executionTime).toBeLessThan(3000); // Le timeout doit être respecté
      }
    }, 10000);

    it('should enforce maxResults limits efficiently', async () => {
      const largeResultRequest: SQLQueryRequest = {
        naturalLanguageQuery: "Affiche-moi tous les éléments de chiffrage de tous les projets",
        userId: "test-limits",
        userRole: "user",
        maxResults: 50, // Limite explicite
        timeoutMs: 5000
      };

      const startTime = Date.now();
      const result = await sqlEngine.executeNaturalLanguageQuery(largeResultRequest);
      const executionTime = Date.now() - startTime;
      
      console.log(`[PERF] Test limites exécuté en ${executionTime}ms`);
      
      if (result.success && result.results) {
        expect(result.results.length).toBeLessThanOrEqual(50);
        expect(executionTime).toBeLessThan(5000);
      }
    }, 10000);
  });
});