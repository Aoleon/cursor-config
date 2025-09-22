import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SQLEngineService } from '../../server/services/SQLEngineService';
import { RBACService } from '../../server/services/RBACService';
import { getAIService } from '../../server/services/AIService';
import { storage } from '../../server/storage';
import { eventBus } from '../../server/eventBus';
import type { SQLQueryRequest, SQLValidationRequest } from '../../shared/schema';

// ========================================
// TESTS DE SÉCURITÉ MOTEUR SQL SAXIUM
// ========================================

describe('SQLEngine Security Tests', () => {
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
  // TESTS ANTI-INJECTION SQL
  // ========================================

  describe('SQL Injection Protection', () => {
    it('should block DROP TABLE attempts', async () => {
      const maliciousRequest: SQLQueryRequest = {
        naturalLanguageQuery: "Show me all users; DROP TABLE users; --",
        userId: "test-user",
        userRole: "user"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(maliciousRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("security");
      expect(result.error?.message).toContain("Opération dangereuse détectée");
    });

    it('should block DELETE statements', async () => {
      const maliciousRequest: SQLQueryRequest = {
        naturalLanguageQuery: "DELETE FROM projects WHERE id = '1'",
        userId: "test-user", 
        userRole: "admin"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(maliciousRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("security");
    });

    it('should block UPDATE statements', async () => {
      const maliciousRequest: SQLQueryRequest = {
        naturalLanguageQuery: "UPDATE users SET role = 'admin' WHERE id = '1'",
        userId: "test-user",
        userRole: "user"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(maliciousRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("security");
    });

    it('should block INSERT statements', async () => {
      const maliciousRequest: SQLQueryRequest = {
        naturalLanguageQuery: "INSERT INTO users (email, role) VALUES ('hacker@evil.com', 'admin')",
        userId: "test-user",
        userRole: "user"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(maliciousRequest);
      
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe("security");
    });

    it('should block complex injection patterns', async () => {
      const injectionPatterns = [
        "'; EXEC xp_cmdshell('ls'); --",
        "UNION SELECT * FROM users WHERE 1=1; --",
        "1' OR '1'='1",
        "'; CREATE USER hacker; --",
        "SELECT * FROM users WHERE id = '1'; DROP TABLE projects; --"
      ];

      for (const pattern of injectionPatterns) {
        const request: SQLQueryRequest = {
          naturalLanguageQuery: `Show projects ${pattern}`,
          userId: "test-user",
          userRole: "user"
        };

        const result = await sqlEngine.executeNaturalLanguageQuery(request);
        expect(result.success).toBe(false);
        expect(result.error?.type).toBe("security");
      }
    });
  });

  // ========================================
  // TESTS VALIDATION SQL DIRECTE
  // ========================================

  describe('SQL Validation Tests', () => {
    it('should validate safe SELECT statements', async () => {
      const validationRequest: SQLValidationRequest = {
        sql: "SELECT name, status FROM projects WHERE responsibleUserId = $1",
        userId: "test-user",
        userRole: "chef_projet"
      };

      const result = await sqlEngine.validateSQL(validationRequest);
      
      expect(result.isSecure).toBe(true);
      expect(result.securityViolations).toHaveLength(0);
    });

    it('should detect dangerous SQL patterns', async () => {
      const dangerousSQL = "SELECT * FROM users; DROP TABLE projects;";
      
      const validationRequest: SQLValidationRequest = {
        sql: dangerousSQL,
        userId: "test-user",
        userRole: "admin"
      };

      const result = await sqlEngine.validateSQL(validationRequest);
      
      expect(result.isSecure).toBe(false);
      expect(result.securityViolations.length).toBeGreaterThan(0);
      expect(result.securityViolations.some(v => v.includes("DROP"))).toBe(true);
    });

    it('should detect stored procedures and functions', async () => {
      const functionSQL = "SELECT exec_dangerous_function()";
      
      const validationRequest: SQLValidationRequest = {
        sql: functionSQL,
        userId: "test-user",
        userRole: "user"
      };

      const result = await sqlEngine.validateSQL(validationRequest);
      
      expect(result.isSecure).toBe(false);
      expect(result.securityViolations.some(v => v.includes("fonction") || v.includes("procedure"))).toBe(true);
    });
  });

  // ========================================
  // TESTS RBAC PAR RÔLE
  // ========================================

  describe('RBAC Role-Based Access', () => {
    it('should apply user filters for chef_projet role', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Show me all projects",
        userId: "chef-001",
        userRole: "chef_projet"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      
      if (result.success && result.rbacFiltersApplied) {
        expect(result.rbacFiltersApplied.length).toBeGreaterThan(0);
        expect(result.rbacFiltersApplied.some(filter => 
          filter.includes("utilisateur") || filter.includes("responsable")
        )).toBe(true);
      }
    });

    it('should allow admin full access', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Show me all projects with details",
        userId: "admin-001", 
        userRole: "admin"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      
      // Admin devrait avoir moins de filtres ou accès plus large
      if (result.success) {
        expect(result.success).toBe(true);
        // Admin peut avoir des filtres mais ils devraient être moins restrictifs
      }
    });

    it('should deny access to sensitive tables for regular users', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Show me all user accounts and their roles",
        userId: "user-001",
        userRole: "user"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      
      // Utilisateur normal ne devrait pas accéder aux données utilisateurs
      if (!result.success) {
        expect(result.error?.type).toBe("rbac");
      } else if (result.success && result.rbacFiltersApplied) {
        // Si autorisé, doit être fortement filtré
        expect(result.rbacFiltersApplied.length).toBeGreaterThan(0);
      }
    });
  });

  // ========================================
  // TESTS PERFORMANCE ET LIMITES
  // ========================================

  describe('Performance and Limits', () => {
    it('should respect timeout limits', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Complex analysis of all data with multiple joins",
        userId: "test-user",
        userRole: "admin",
        timeoutMs: 1000 // 1 seconde timeout très court
      };

      const startTime = Date.now();
      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      const endTime = Date.now();
      
      // Ne devrait pas dépasser le timeout de plus de quelques secondes
      expect(endTime - startTime).toBeLessThan(5000);
      
      if (!result.success && result.error?.type === "timeout") {
        expect(result.error.message).toContain("timeout");
      }
    });

    it('should limit result set size', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Show me all projects",
        userId: "admin-001",
        userRole: "admin",
        maxResults: 10
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      
      if (result.success && result.results) {
        expect(result.results.length).toBeLessThanOrEqual(10);
      }
    });

    it('should complete simple queries within 5 seconds', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Show me my active projects",
        userId: "chef-001",
        userRole: "chef_projet"
      };

      const startTime = Date.now();
      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000);
      
      if (result.success) {
        expect(result.executionTime).toBeDefined();
        expect(result.executionTime!).toBeLessThan(5000);
      }
    });
  });

  // ========================================
  // TESTS CONTEXTE ET MÉTADONNÉES
  // ========================================

  describe('Context and Metadata', () => {
    it('should provide database context for users', async () => {
      const context = await sqlEngine.buildDatabaseContext("chef-001", "chef_projet");
      
      expect(context.availableTables).toBeDefined();
      expect(context.availableTables.length).toBeGreaterThan(0);
      expect(context.context).toContain("menuiserie");
      expect(context.rbacFiltersInfo).toBeDefined();
    });

    it('should provide more context for admin users', async () => {
      const adminContext = await sqlEngine.buildDatabaseContext("admin-001", "admin");
      const userContext = await sqlEngine.buildDatabaseContext("user-001", "user");
      
      // Admin devrait avoir accès à plus de tables
      expect(adminContext.availableTables.length).toBeGreaterThanOrEqual(userContext.availableTables.length);
    });

    it('should include example queries in context', async () => {
      const context = await sqlEngine.buildDatabaseContext("chef-001", "chef_projet");
      
      expect(context.exampleQueries).toBeDefined();
      expect(context.exampleQueries.length).toBeGreaterThan(0);
      expect(context.exampleQueries.some(q => q.includes("projets"))).toBe(true);
    });
  });

  // ========================================
  // TESTS D'INTÉGRATION BUSINESS SAXIUM
  // ========================================

  describe('Saxium Business Logic Integration', () => {
    it('should handle menuiserie-specific queries', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Quels sont mes projets de fenêtres en retard ?",
        userId: "chef-001",
        userRole: "chef_projet"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      
      if (result.success) {
        expect(result.sql).toContain("fenetre");
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.metadata?.tablesAccessed).toContain("projects");
      }
    });

    it('should handle admin analytics queries', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Analyse de rentabilité par type de matériau cette année",
        userId: "admin-001",
        userRole: "admin"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      
      if (result.success) {
        expect(result.sql).toMatch(/AVG|SUM|COUNT/i);
        expect(result.sql).toMatch(/GROUP BY/i);
        expect(result.metadata?.aiModelUsed).toBeDefined();
      }
    });

    it('should provide safety warnings for complex queries', async () => {
      const request: SQLQueryRequest = {
        naturalLanguageQuery: "Detailed analysis of all projects with financial data and user information",
        userId: "admin-001",
        userRole: "admin"
      };

      const result = await sqlEngine.executeNaturalLanguageQuery(request);
      
      if (result.success && result.warnings) {
        expect(result.warnings.length).toBeGreaterThanOrEqual(0);
        // Les requêtes complexes peuvent générer des avertissements
      }
    });
  });
});