import { describe, it, expect, beforeAll } from 'vitest';
import { SQLEngineService } from '../services/SQLEngineService';
import { AIService } from '../services/AIService';
import { RBACService } from '../services/RBACService';
import { BusinessContextService } from '../services/BusinessContextService';
import { EventBus } from '../eventBus';
import { IStorage } from '../storage-poc';
import type { SQLQueryRequest } from '@shared/schema';

/**
 * Tests pour les améliorations des prompts SQL adaptatifs
 * Phase 4 - Optimisation des prompts selon le type de requête
 */

describe('SQLEngineService - Adaptive Prompts Tests', () => {
  let sqlEngine: SQLEngineService;
  let mockStorage: IStorage;
  let mockEventBus: EventBus;

  beforeAll(() => {
    // Mock dependencies
    const mockAI = new AIService({} as any, {} as any);
    const mockRBAC = new RBACService({} as any);
    const mockBusinessContext = new BusinessContextService({} as any, {} as any, {} as any);
    mockEventBus = new EventBus();
    mockStorage = {} as IStorage;

    sqlEngine = new SQLEngineService(
      mockAI,
      mockRBAC,
      mockBusinessContext,
      mockEventBus,
      mockStorage
    );
  });

  describe('Query Type Detection', () => {
    it('should detect KPI/Metrics queries', () => {
      const testQueries = [
        'Quel est le taux de conversion des AOs?',
        'Combien de projets actifs ce mois?',
        'Calculer la moyenne des montants',
        'Afficher les KPIs du trimestre',
        'Total des revenus par mois'
      ];

      testQueries.forEach(query => {
        const queryType = sqlEngine['analyzeQueryType'](query);
        expect(queryType).toBe('kpi_metrics');
      });
    });

    it('should detect List/Details queries', () => {
      const testQueries = [
        'Liste des projets en cours',
        'Afficher tous les fournisseurs',
        'Montrer les offres récentes',
        'Détails du projet P-2024-001'
      ];

      testQueries.forEach(query => {
        const queryType = sqlEngine['analyzeQueryType'](query);
        expect(queryType).toBe('list_details');
      });
    });

    it('should detect Comparison queries', () => {
      const testQueries = [
        'Comparer Q1 vs Q2',
        'Evolution des ventes cette année par rapport à l\'année dernière',
        'Delta entre prévisions et réalisations',
        'Différence entre les deux périodes'
      ];

      testQueries.forEach(query => {
        const queryType = sqlEngine['analyzeQueryType'](query);
        expect(queryType).toBe('comparisons');
      });
    });

    it('should detect Analytics queries', () => {
      const testQueries = [
        'Analyser les tendances des ventes',
        'Top 10 des meilleurs projets',
        'Distribution des montants par catégorie',
        'Classement des équipes par performance'
      ];

      testQueries.forEach(query => {
        const queryType = sqlEngine['analyzeQueryType'](query);
        expect(queryType).toBe('analytics');
      });
    });

    it('should detect Search queries', () => {
      const testQueries = [
        'Chercher les projets contenant "menuiserie"',
        'Trouver tous les documents avec le mot clé',
        'Rechercher dans les descriptions',
        'Projets sans responsable assigné'
      ];

      testQueries.forEach(query => {
        const queryType = sqlEngine['analyzeQueryType'](query);
        expect(queryType).toBe('search');
      });
    });
  });

  describe('Adaptive Guardrails Generation', () => {
    it('should generate appropriate guardrails for KPI queries', () => {
      const guardrails = sqlEngine['buildAdaptiveGuardrails']('kpi_metrics', 'admin');
      
      expect(guardrails).toContain('GROUP BY all non-aggregate columns');
      expect(guardrails).toContain('LIMIT 100 for aggregated results');
      expect(guardrails).toContain('Use appropriate time grouping');
    });

    it('should generate appropriate guardrails for List queries', () => {
      const guardrails = sqlEngine['buildAdaptiveGuardrails']('list_details', 'user');
      
      expect(guardrails).toContain('MANDATORY: Include ORDER BY');
      expect(guardrails).toContain('MANDATORY: Include LIMIT');
      expect(guardrails).toContain('Support OFFSET for pagination');
    });

    it('should generate appropriate guardrails for Comparison queries', () => {
      const guardrails = sqlEngine['buildAdaptiveGuardrails']('comparisons', 'admin');
      
      expect(guardrails).toContain('Use CTEs for clear structure');
      expect(guardrails).toContain('Maximum 24 months timeframe');
      expect(guardrails).toContain('Include percentage changes');
    });
  });

  describe('Performance Hints Generation', () => {
    it('should generate hints for project+offer joins', () => {
      const hints = sqlEngine['generatePerformanceHints'](
        'Afficher les projets avec leurs offres',
        'list_details'
      );
      
      const hasIndexHint = hints.some(h => h.includes('index on projects.id'));
      expect(hasIndexHint).toBe(true);
    });

    it('should generate hints for date filters', () => {
      const hints = sqlEngine['generatePerformanceHints'](
        'Projets créés ce mois',
        'list_details'
      );
      
      const hasDateHint = hints.some(h => h.includes('indexed columns') && h.includes('date'));
      expect(hasDateHint).toBe(true);
    });

    it('should generate hints for text search', () => {
      const hints = sqlEngine['generatePerformanceHints'](
        'Rechercher menuiserie',
        'search'
      );
      
      const hasGINHint = hints.some(h => h.includes('GIN indexes'));
      expect(hasGINHint).toBe(true);
    });
  });

  describe('SQL Validation Post-Generation', () => {
    it('should validate LIMIT clause for non-aggregated queries', async () => {
      const sqlWithoutLimit = `
        SELECT id, name, status 
        FROM projects 
        WHERE status = 'active';
      `;
      
      const validation = await sqlEngine.validateGeneratedSQL(sqlWithoutLimit, 'list_details');
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('Missing LIMIT clause for non-aggregated query');
    });

    it('should validate reasonable timeframe', async () => {
      const sqlWithLargeTimeframe = `
        SELECT COUNT(*) 
        FROM projects 
        WHERE date_created >= NOW() - INTERVAL '10 years';
      `;
      
      const validation = await sqlEngine.validateGeneratedSQL(sqlWithLargeTimeframe, 'kpi_metrics');
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations.some(v => v.includes('Timeframe too large'))).toBe(true);
    });

    it('should detect SELECT * and reject', async () => {
      const sqlWithSelectStar = `
        SELECT * FROM projects LIMIT 10;
      `;
      
      const validation = await sqlEngine.validateGeneratedSQL(sqlWithSelectStar, 'list_details');
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('SELECT * not allowed, specify columns explicitly');
    });

    it('should validate JOIN count limits', async () => {
      const sqlWithManyJoins = `
        SELECT p.id
        FROM projects p
        JOIN users u1 ON p.user1_id = u1.id
        JOIN users u2 ON p.user2_id = u2.id
        JOIN users u3 ON p.user3_id = u3.id
        JOIN users u4 ON p.user4_id = u4.id
        JOIN users u5 ON p.user5_id = u5.id
        LIMIT 10;
      `;
      
      const validation = await sqlEngine.validateGeneratedSQL(sqlWithManyJoins, 'list_details');
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations.some(v => v.includes('Too many JOINs'))).toBe(true);
    });

    it('should validate ORDER BY for list queries', async () => {
      const sqlWithoutOrderBy = `
        SELECT id, name, status 
        FROM projects 
        LIMIT 50;
      `;
      
      const validation = await sqlEngine.validateGeneratedSQL(sqlWithoutOrderBy, 'list_details');
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('Missing ORDER BY clause for list query');
    });

    it('should validate semicolon termination', async () => {
      const sqlWithoutSemicolon = `
        SELECT COUNT(*) FROM projects
      `;
      
      const validation = await sqlEngine.validateGeneratedSQL(sqlWithoutSemicolon, 'kpi_metrics');
      
      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('SQL query must end with semicolon (;)');
    });

    it('should generate warnings for performance concerns', async () => {
      const sqlWithoutCTE = `
        SELECT 
          (SELECT COUNT(*) FROM projects WHERE status = 'active') as active,
          (SELECT COUNT(*) FROM projects WHERE status = 'completed') as completed;
      `;
      
      const validation = await sqlEngine.validateGeneratedSQL(sqlWithoutCTE, 'comparisons');
      
      expect(validation.warnings.some(w => w.includes('CTEs'))).toBe(true);
    });
  });

  describe('Example Selection', () => {
    it('should select relevant examples for project KPI queries', () => {
      const examples = sqlEngine['selectRelevantExamples'](
        'kpi_metrics',
        'KPI des projets'
      );
      
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.length).toBeLessThanOrEqual(3);
      expect(examples.some(e => e.includes('projects'))).toBe(true);
    });

    it('should select relevant examples for supplier list queries', () => {
      const examples = sqlEngine['selectRelevantExamples'](
        'list_details',
        'Liste des fournisseurs'
      );
      
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.some(e => e.includes('supplier'))).toBe(true);
    });
  });

  describe('Prompt Quality Metrics', () => {
    it('should track prompt generation metrics', async () => {
      const eventPromise = new Promise(resolve => {
        mockEventBus.subscribe('sql_engine.prompt_metrics', (data) => {
          resolve(data);
        });
      });

      await sqlEngine['trackPromptQuality']('kpi_metrics', 250, true, 0);
      
      const event = await eventPromise as any;
      expect(event.queryType).toBe('kpi_metrics');
      expect(event.generationTime).toBe(250);
      expect(event.success).toBe(true);
      expect(event.retryCount).toBe(0);
    });
  });
});