import { AIService } from "./AIService";
import { RBACService } from "./RBACService";
import { BusinessContextService } from "./BusinessContextService";
import { EventBus } from "../eventBus";
import { IStorage } from "../storage-poc";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import sqlParserModule from 'node-sql-parser';
import type {
  AiQueryRequest,
  AiQueryResponse,
  AccessValidationRequest,
  PermissionCheckResult,
  UserPermissionsResponse,
  SQLQueryRequest,
  SQLQueryResult,
  SQLValidationRequest,
  SQLValidationResult
} from "@shared/schema";
import { logger } from '../utils/logger';

// ========================================
// TYPES IMPORTÉS DEPUIS SHARED/SCHEMA.TS
// ========================================

// Note: SQLQueryRequest, SQLQueryResult, SQLValidationRequest, SQLValidationResult
// sont maintenant importés depuis @shared/schema pour éviter la duplication

// ========================================
// CONSTANTES DE SÉCURITÉ
// ========================================

const MAX_RESULTS_DEFAULT = 1000;
const MAX_RESULTS_ADMIN = 10000;
const QUERY_TIMEOUT_DEFAULT = 45000; // 45 secondes (temporaire - TODO: optimiser SQL pour <20s)
const QUERY_TIMEOUT_COMPLEX = 60000; // 60 secondes pour requêtes complexes

// Instance parser SQL pour analyse AST
const sqlParser = new sqlParserModule.Parser();

// SQL DDL/DML interdits (read-only strict) - DEPRECATED: remplacé par AST
const FORBIDDEN_STATEMENT_TYPES = [
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'DECLARE', 'SET',
  'MERGE', 'BULK', 'LOAD', 'COPY', 'IMPORT', 'EXPORT'
];

// Tables autorisées pour les requêtes métier JLM
const ALLOWED_BUSINESS_TABLES = [
  'offers', 'projects', 'suppliers', 'ao_documents', 'project_tasks',
  'team_resources', 'chiffrage_elements', 'validation_milestones',
  'project_timelines', 'date_alerts', 'business_alerts', 'users'
];

// Colonnes sensibles nécessitant des restrictions spéciales
const SENSITIVE_COLUMNS = {
  'users': ['password_hash', 'api_keys', 'tokens'],
  'projects': ['internal_notes', 'confidential_data'],
  'offers': ['internal_margin', 'cost_breakdown']
};

// ========================================
// CLASSE PRINCIPALE MOTEUR SQL SÉCURISÉ
// ========================================

export class SQLEngineService {
  private aiService: AIService;
  private rbacService: RBACService;
  private businessContextService: BusinessContextService;
  private eventBus: EventBus;
  private storage: IStorage;

  constructor(
    aiService: AIService, 
    rbacService: RBACService, 
    businessContextService: BusinessContextService,
    eventBus: EventBus,
    storage: IStorage
  ) {
    this.aiService = aiService;
    this.rbacService = rbacService;
    this.businessContextService = businessContextService;
    this.eventBus = eventBus;
    this.storage = storage;
  }

  // ========================================
  // MÉTHODE DE CORRECTION DES TYPOS SQL
  // ========================================

  /**
   * Corrige les erreurs de frappe courantes dans le SQL généré
   */
  private fixCommonSQLTypos(sql: string): string {
    let correctedSQL = sql;
    
    // Corrections des erreurs de frappe courantes
    const corrections: Array<[RegExp, string]> = [
      [/\bGROP\s+BY\b/gi, 'GROUP BY'],
      [/\bGROUO\s+BY\b/gi, 'GROUP BY'],
      [/\bORDER\s+BT\b/gi, 'ORDER BY'],
      [/\bORDER\s+YB\b/gi, 'ORDER BY'],
      [/\bWHERE\s+AND\b/gi, 'WHERE'],
      [/\bWHEER\b/gi, 'WHERE'],
      [/\bSELECT\s+FORM\b/gi, 'SELECT FROM'],
      [/\bSELCT\b/gi, 'SELECT'],
      [/\bFORM\b/gi, 'FROM'],
      [/\bFROM\s+FROM\b/gi, 'FROM'],
      [/\bINNER\s+JOIM\b/gi, 'INNER JOIN'],
      [/\bLEFT\s+JOIM\b/gi, 'LEFT JOIN'],
      [/\bRIGHT\s+JOIM\b/gi, 'RIGHT JOIN'],
      [/\bOUTER\s+JOIM\b/gi, 'OUTER JOIN'],
      [/\bCOUNT\s*\(\s*\*\s*\)\s+AS\s+COUNT\b/gi, 'COUNT(*) AS total_count'],
      [/\bDESC\s+LIMIT\b/gi, 'DESC\nLIMIT'],
      [/\bASC\s+LIMIT\b/gi, 'ASC\nLIMIT'],
      [/\bHAVING\s+WHERE\b/gi, 'HAVING'],
      [/\bDISTINCT\s+DISTINCT\b/gi, 'DISTINCT'],
      [/\bUNION\s+UNION\b/gi, 'UNION'],
      [/\bINSET\b/gi, 'INSERT'],
      [/\bUPDAE\b/gi, 'UPDATE'],
      [/\bDELETE\s+FORM\b/gi, 'DELETE FROM'],
      [/\bCREATE\s+TABEL\b/gi, 'CREATE TABLE']
    ];
    
    corrections.forEach(([pattern, replacement]) => {
      correctedSQL = correctedSQL.replace(pattern, replacement);
    });
    
    // Logger si des corrections ont été appliquées
    if (correctedSQL !== sql) {
      logger.info('Corrections SQL appliquées', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'fixCommonSQLTypos',
          original: sql.substring(0, 100),
          corrected: correctedSQL.substring(0, 100),
          totalCorrections: (sql.length - correctedSQL.length)
        }
      });
    }
    
    return correctedSQL;
  }

  // ========================================
  // MÉTHODE PRINCIPALE - GÉNÉRATION ET EXÉCUTION SQL SÉCURISÉE
  // ========================================

  /**
   * Pipeline complet : NL → Context → AI → Parse → RBAC → Validation → Execution
   */
  async executeNaturalLanguageQuery(request: SQLQueryRequest): Promise<SQLQueryResult> {
    const startTime = Date.now();
    const queryId = crypto.randomUUID();

    try {
      logger.info('Démarrage requête', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        queryId,
        userId: request.userId
      }
    });

      // 1. Validation et nettoyage de la requête d'entrée
      const validationResult = this.validateInputQuery(request);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: {
            type: "validation",
            message: "Requête d'entrée invalide",
            details: validationResult.errors
          }
        };
      }

      // 2. Construction du contexte intelligent métier AVEC ANALYSE D'INTENTION
      const enrichedContext = await this.buildIntelligentContext(request);

      // 2.5 UTILISATION DE L'ANALYSE D'INTENTION
      const queryAnalysis = (request as any).queryAnalysis;
      const queryComplexity = queryAnalysis?.complexity || this.detectQueryComplexity(request.naturalLanguageQuery);
      const queryType = queryAnalysis?.queryType || this.analyzeQueryType(request.naturalLanguageQuery);
      
      logger.info('Analyse d\'intention reçue', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'executeNaturalLanguageQuery',
          queryType,
          complexity: queryComplexity,
          entities: queryAnalysis?.entities,
          temporalContext: queryAnalysis?.temporalContext,
          hasAnalysis: !!queryAnalysis
        }
      });

      // 3. Génération SQL via IA avec CONTEXTE D'INTENTION
      // Version du prompt pour invalidation cache automatique si prompt change
      const PROMPT_VERSION = "v3_intention_aware_2025"; // Version avec analyse d'intention
      
      // Sélection du template approprié basé sur l'analyse
      let contextTemplate = '';
      if (queryType && this.PROMPT_TEMPLATES[queryType as keyof typeof this.PROMPT_TEMPLATES]) {
        const template = this.PROMPT_TEMPLATES[queryType as keyof typeof this.PROMPT_TEMPLATES];
        contextTemplate = `\nTYPE DE REQUÊTE: ${queryType}\n${template.guardrails}\n`;
        logger.info('Template spécialisé utilisé', {
          metadata: {
            service: 'SQLEngineService',
            operation: 'executeNaturalLanguageQuery',
            queryType,
            templateUsed: true
          }
        });
      }
      
      const versionedContext = `[PROMPT_VERSION:${PROMPT_VERSION}]\n${enrichedContext}\n${contextTemplate}`;
      
      // Ajustement des limites et timeouts basé sur la complexité
      const adjustedTimeout = queryComplexity === 'complex' || queryComplexity === 'expert' 
        ? QUERY_TIMEOUT_COMPLEX 
        : QUERY_TIMEOUT_DEFAULT;
        
      const adjustedMaxResults = queryComplexity === 'expert' && request.userRole === 'admin'
        ? MAX_RESULTS_ADMIN
        : request.maxResults || MAX_RESULTS_DEFAULT;
      
      const aiRequest: AiQueryRequest = {
        query: request.naturalLanguageQuery,
        context: versionedContext, // Inclut version et template spécialisé
        userRole: request.userRole,
        complexity: queryComplexity, // Utilise l'analyse transmise
        queryType: "text_to_sql",
        useCache: !request.dryRun,
        maxTokens: queryComplexity === 'expert' ? 10000 : 8192,
        // Transmission des données d'analyse pour optimisation
        metadata: {
          queryAnalysis: queryAnalysis,
          templateType: queryType,
          adjustedTimeout,
          adjustedMaxResults
        }
      };

      const aiResponse = await this.aiService.generateSQL(aiRequest);
      if (!aiResponse.success || !aiResponse.data?.sqlGenerated) {
        return {
          success: false,
          error: {
            type: "parsing",
            message: "Échec de génération SQL par IA",
            details: aiResponse.error
          }
        };
      }

      // Appliquer les corrections de typos automatiquement
      let generatedSQL = aiResponse.data.sqlGenerated;
      generatedSQL = this.fixCommonSQLTypos(generatedSQL);
      
      // S'assurer que le SQL se termine par un point-virgule
      if (!generatedSQL.trim().endsWith(';')) {
        generatedSQL = generatedSQL.trim() + ';';
      }

      logger.info('SQL généré par l\'IA', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        sqlLength: generatedSQL.length,
        queryId
      }
    });
      logger.info('SQL query', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        sql: generatedSQL,
        queryId
      }
    });

      // 3.5. Validation post-génération du SQL
      const queryTypeDetected = this.analyzeQueryType(request.naturalLanguageQuery);
      const postValidation = await this.validateGeneratedSQL(generatedSQL, queryTypeDetected);
      
      if (!postValidation.isValid) {
        logger.warn('SQL généré invalide - violations détectées', {
          metadata: {
            service: 'SQLEngineService',
            operation: 'executeNaturalLanguageQuery',
            queryId,
            violations: postValidation.violations,
            warnings: postValidation.warnings
          }
        });
        
        const errorDetails = postValidation.violations?.join(', ') || 'Validation échouée';
        
        // Analyser le type d'erreur pour un message plus utile
        let userMessage = 'Je ne peux pas exécuter cette requête pour des raisons de sécurité.';
        
        if (errorDetails.includes('LIMIT')) {
          userMessage = 'Votre requête pourrait retourner trop de résultats. Essayez de la préciser davantage.';
        } else if (errorDetails.includes('sensible')) {
          userMessage = 'Cette requête accède à des données sensibles non autorisées.';
        } else if (errorDetails.includes('RBAC')) {
          userMessage = 'Vous n\'avez pas les permissions nécessaires pour cette requête.';
        } else if (errorDetails.includes('JOIN')) {
          userMessage = 'Votre requête est trop complexe. Essayez de simplifier en utilisant moins de jointures.';
        } else if (errorDetails.includes('SELECT *')) {
          userMessage = 'Merci de préciser les colonnes spécifiques que vous souhaitez voir au lieu de sélectionner toutes les colonnes.';
        } else if (errorDetails.includes('Timeframe')) {
          userMessage = 'La période demandée est trop large. Essayez avec une période plus courte (maximum 5 ans).';
        } else if (errorDetails.includes('semicolon')) {
          userMessage = 'La requête SQL générée semble incomplète. Veuillez reformuler votre question.';
        }
        
        return {
          success: false,
          error: {
            type: "validation",
            message: userMessage,
            details: {
              technicalDetails: errorDetails, // Pour le debug mode
              violations: postValidation.violations,
              warnings: postValidation.warnings,
              sql: request.options?.includeDebugInfo ? generatedSQL : undefined
            }
          },
          debugInfo: {
            generatedSQL: generatedSQL,
            validationErrors: postValidation.violations,
            queryAnalysis: (request as any).queryAnalysis,
            executionTime: Date.now() - startTime
          }
        };
      }

      if (postValidation.warnings.length > 0) {
        logger.info('Avertissements SQL post-génération', {
          metadata: {
            service: 'SQLEngineService',
            operation: 'executeNaturalLanguageQuery',
            queryId,
            warnings: postValidation.warnings
          }
        });
      }

      // 4. Parsing et validation sécurité SQL
      const securityCheck = await this.validateSQLSecurity(generatedSQL, request.userId, request.userRole);
      if (!securityCheck.isSecure) {
        return {
          success: false,
          error: {
            type: "security",
            message: "Requête SQL non sécurisée",
            details: {
              violations: securityCheck.securityViolations,
              sql: generatedSQL
            }
          }
        };
      }

      // 5. Application automatique des filtres RBAC
      const rbacFilteredSQL = await this.applyRBACFilters(
        generatedSQL, 
        request.userId, 
        request.userRole,
        securityCheck.allowedTables
      );

      if (!rbacFilteredSQL.success) {
        return {
          success: false,
          error: {
            type: "rbac",
            message: "Accès refusé par le système RBAC",
            details: rbacFilteredSQL.rbacViolations
          }
        };
      }

      // 6. Exécution sécurisée si pas en mode dry-run
      let results: any[] = [];
      let executionTime = 0;

      if (!request.dryRun) {
        const execResult = await this.executeSecureSQL(
          rbacFilteredSQL.filteredSQL!,
          rbacFilteredSQL.parameters || [],
          request.maxResults || (request.userRole === 'admin' ? MAX_RESULTS_ADMIN : MAX_RESULTS_DEFAULT),
          request.timeoutMs || QUERY_TIMEOUT_DEFAULT
        );

        if (!execResult.success) {
          return {
            success: false,
            error: {
              type: "execution",
              message: "Erreur d'exécution SQL",
              details: execResult.error
            }
          };
        }

        // Sanitize results pour JSON serialization (BigInt → string)
        results = this.sanitizeResultsForJSON(execResult.results || []);
        executionTime = execResult.executionTime || 0;
      }

      // 7. Logging et audit
      await this.logQueryExecution(queryId, request, rbacFilteredSQL.filteredSQL!, results.length, startTime);

      // 8. Publication d'événement si requête sensible
      if (this.isSensitiveQuery(rbacFilteredSQL.filteredSQL!, request.userRole)) {
        await this.eventBus.publish('sql_engine.sensitive_query_executed', {
          queryId,
          userId: request.userId,
          userRole: request.userRole,
          tablesAccessed: securityCheck.allowedTables,
          timestamp: new Date()
        });
      }

      return {
        success: true,
        sql: rbacFilteredSQL.filteredSQL,
        parameters: rbacFilteredSQL.parameters,
        results,
        executionTime,
        rbacFiltersApplied: rbacFilteredSQL.filtersApplied,
        confidence: aiResponse.data.confidence,
        warnings: this.generateWarnings(rbacFilteredSQL.filteredSQL!, results.length, request.userRole),
        metadata: {
          tablesAccessed: securityCheck.allowedTables,
          columnsAccessed: securityCheck.allowedColumns,
          securityChecks: securityCheck.securityViolations,
          aiModelUsed: aiResponse.data.modelUsed,
          cacheHit: aiResponse.data.fromCache
        }
      };

    } catch (error) {
      logger.error('Erreur requête', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        queryId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
      
      return {
        success: false,
        error: {
          type: "execution",
          message: "Erreur interne du moteur SQL",
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // ========================================
  // VALIDATION UNIQUEMENT SQL (SANS EXÉCUTION)
  // ========================================

  /**
   * Valide un SQL existant selon les règles RBAC et sécurité
   */
  async validateSQL(request: SQLValidationRequest): Promise<SQLValidationResult> {
    try {
      // 1. Validation sécurité de base
      const securityCheck = await this.validateSQLSecurity(request.sql, request.userId, request.userRole);
      
      // 2. Vérification RBAC
      const rbacResult = await this.applyRBACFilters(
        request.sql, 
        request.userId, 
        request.userRole,
        securityCheck.allowedTables
      );

      return {
        isValid: securityCheck.isSecure && rbacResult.success,
        isSecure: securityCheck.isSecure,
        allowedTables: securityCheck.allowedTables,
        deniedTables: securityCheck.deniedTables || [],
        allowedColumns: securityCheck.allowedColumns,
        deniedColumns: securityCheck.deniedColumns || [],
        securityViolations: securityCheck.securityViolations,
        rbacViolations: rbacResult.rbacViolations || [],
        suggestions: this.generateSuggestions(request.sql, securityCheck, rbacResult)
      };

    } catch (error) {
      return {
        isValid: false,
        isSecure: false,
        allowedTables: [],
        deniedTables: [],
        allowedColumns: [],
        deniedColumns: [],
        securityViolations: [`Erreur de validation: ${error}`],
        rbacViolations: []
      };
    }
  }

  // ========================================
  // TYPES DE REQUÊTES ET TEMPLATES SPÉCIALISÉS
  // ========================================

  private readonly QUERY_TYPES = {
    KPI_METRICS: 'kpi_metrics',
    LIST_DETAILS: 'list_details', 
    COMPARISONS: 'comparisons',
    ANALYTICS: 'analytics',
    SEARCH: 'search'
  } as const;

  private readonly PROMPT_TEMPLATES = {
    kpi_metrics: {
      focus: ['COUNT', 'SUM', 'AVG', 'GROUP BY', 'HAVING'],
      guardrails: `
-- KPI/METRICS SPECIFIC RULES:
-- Must use GROUP BY for dimensions
-- Limit to 100 rows for aggregated results
-- Use DATE_TRUNC for time grouping
-- Include COUNT(*) for volume metrics`,
      examples: [
        `-- Monthly revenue by project type
SELECT 
  DATE_TRUNC('month', date_created) as month,
  project_type,
  COUNT(*) as total_projects,
  SUM(montant_total) as revenue
FROM projects
WHERE date_created >= NOW() - INTERVAL '12 months'
GROUP BY 1, 2
ORDER BY 1 DESC, 4 DESC
LIMIT 100;`
      ]
    },
    list_details: {
      focus: ['WHERE', 'ORDER BY', 'LIMIT', 'OFFSET', 'JOIN'],
      guardrails: `
-- LIST/DETAILS SPECIFIC RULES:
-- Must include ORDER BY clause
-- Must include LIMIT/OFFSET for pagination
-- Maximum 50 rows per page
-- Include relevant JOIN for details`,
      examples: [
        `-- List recent projects with details
SELECT 
  p.id, p.name, p.status, p.date_created,
  u.name as responsable_name
FROM projects p
LEFT JOIN users u ON p.responsible_user_id = u.id
WHERE p.status = 'active'
ORDER BY p.date_created DESC
LIMIT 50 OFFSET 0;`
      ]
    },
    comparisons: {
      focus: ['CTE', 'CASE WHEN', 'LAG', 'LEAD', 'JOIN'],
      guardrails: `
-- COMPARISON SPECIFIC RULES:
-- Use CTEs for readability
-- Maximum 24 months timeframe
-- Use CASE WHEN for categorization
-- Include delta calculations`,
      examples: [
        `-- Compare current vs previous period
WITH current_period AS (
  SELECT COUNT(*) as current_count, SUM(montant_total) as current_revenue
  FROM projects
  WHERE date_created >= NOW() - INTERVAL '3 months'
),
previous_period AS (
  SELECT COUNT(*) as previous_count, SUM(montant_total) as previous_revenue
  FROM projects
  WHERE date_created >= NOW() - INTERVAL '6 months' 
    AND date_created < NOW() - INTERVAL '3 months'
)
SELECT 
  c.current_count, p.previous_count,
  c.current_revenue, p.previous_revenue,
  CASE 
    WHEN p.previous_count > 0 
    THEN ROUND(((c.current_count - p.previous_count)::numeric / p.previous_count) * 100, 2)
    ELSE NULL
  END as count_change_pct
FROM current_period c, previous_period p;`
      ]
    },
    analytics: {
      focus: ['CTE', 'WINDOW', 'RANK', 'DENSE_RANK', 'PERCENTILE'],
      guardrails: `
-- ANALYTICS SPECIFIC RULES:
-- Prefer CTEs over subqueries
-- Limit window functions usage
-- Include appropriate indexes hints
-- Max 3 analytical functions per query`,
      examples: [
        `-- Top performers analysis
WITH project_stats AS (
  SELECT 
    responsible_user_id,
    COUNT(*) as project_count,
    AVG(montant_total) as avg_revenue,
    RANK() OVER (ORDER BY COUNT(*) DESC) as rank_by_count
  FROM projects
  WHERE date_created >= NOW() - INTERVAL '6 months'
  GROUP BY responsible_user_id
)
SELECT * FROM project_stats
WHERE rank_by_count <= 10
ORDER BY rank_by_count;`
      ]
    },
    search: {
      focus: ['LIKE', 'ILIKE', 'SIMILAR TO', 'GIN INDEX', 'TEXT SEARCH'],
      guardrails: `
-- SEARCH SPECIFIC RULES:
-- Use ILIKE for case-insensitive search
-- Add % wildcards appropriately
-- Consider GIN indexes for text
-- Limit results to 100`,
      examples: [
        `-- Search projects by name or description
SELECT 
  id, name, description, status, date_created
FROM projects
WHERE name ILIKE '%menuiserie%' 
   OR description ILIKE '%menuiserie%'
ORDER BY date_created DESC
LIMIT 100;`
      ]
    }
  };

  // ========================================
  // CONSTRUCTION DU CONTEXTE INTELLIGENT AMÉLIORÉ
  // ========================================

  /**
   * Utilise BusinessContextService pour générer un contexte métier intelligent et adaptatif
   * AMÉLIORATION PHASE 4: Templates adaptatifs et guardrails contextuels
   */
  private async buildIntelligentContext(request: SQLQueryRequest): Promise<string> {
    const startTime = Date.now();
    
    try {
      // 1. Détection du type de requête
      const queryType = this.analyzeQueryType(request.naturalLanguageQuery);
      
      logger.info('Contexte intelligent - Type détecté', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'buildIntelligentContext',
          queryType,
          userId: request.userId,
          userRole: request.userRole
        }
      });
      
      // 2. Récupération du contexte enrichi de BusinessContextService
      const enrichedContext = await this.businessContextService.buildIntelligentContextForSQL(
        request.userId,
        request.userRole,
        request.naturalLanguageQuery
      );

      // 3. Sélection du template adapté
      const template = this.PROMPT_TEMPLATES[queryType as keyof typeof this.PROMPT_TEMPLATES];
      
      // 4. Construction des guardrails adaptifs
      const adaptiveGuardrails = this.buildAdaptiveGuardrails(queryType, request.userRole);
      
      // 5. Génération des hints de performance contextuels
      const performanceHints = this.generatePerformanceHints(request.naturalLanguageQuery, queryType);
      
      // 6. Sélection d'exemples pertinents
      const relevantExamples = this.selectRelevantExamples(queryType, request.naturalLanguageQuery);
      
      // 7. Construction du prompt optimisé pour Claude/GPT
      const optimizedPrompt = this.buildOptimizedPrompt({
        userContext: request.context,
        enrichedContext,
        queryType,
        template,
        guardrails: adaptiveGuardrails,
        performanceHints,
        examples: relevantExamples,
        userRole: request.userRole
      });

      // 8. Métriques de qualité
      await this.trackPromptQuality(queryType, Date.now() - startTime);

      return optimizedPrompt;

    } catch (error) {
      logger.error('Erreur génération contexte intelligent', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'buildIntelligentContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      // Fallback vers contexte basique
      return this.buildFallbackContext(request);
    }
  }

  /**
   * Analyse le type de requête pour sélectionner le template approprié
   */
  private analyzeQueryType(query: string): string {
    const queryLower = query.toLowerCase();
    
    // Patterns pour KPI/Métriques
    if (/\b(kpi|métrique|indicateur|performance|taux|moyenne|total|somme|nombre)\b/i.test(query) ||
        /\b(combien|quel est le|quelle est la)\b/i.test(query)) {
      return this.QUERY_TYPES.KPI_METRICS;
    }
    
    // Patterns pour Comparaisons
    if (/\b(comparer|comparaison|versus|vs|évolution|delta|différence|changement)\b/i.test(query) ||
        /\b(par rapport|entre|avant et après)\b/i.test(query)) {
      return this.QUERY_TYPES.COMPARISONS;
    }
    
    // Patterns pour Analyses
    if (/\b(analyser|analyse|tendance|pattern|corrélation|distribution|répartition)\b/i.test(query) ||
        /\b(top|meilleur|pire|classement|rang)\b/i.test(query)) {
      return this.QUERY_TYPES.ANALYTICS;
    }
    
    // Patterns pour Recherche
    if (/\b(chercher|rechercher|trouver|contient|contenant|avec|sans)\b/i.test(query) ||
        query.includes('%') || query.includes('*')) {
      return this.QUERY_TYPES.SEARCH;
    }
    
    // Par défaut: Liste/Détails
    return this.QUERY_TYPES.LIST_DETAILS;
  }

  /**
   * Construit des guardrails adaptatifs selon le type de requête
   */
  private buildAdaptiveGuardrails(queryType: string, userRole: string): string {
    const baseGuardrails = [
      '-- MANDATORY RULES:',
      '-- Return ONLY valid PostgreSQL SELECT query',
      '-- NO comments in the SQL output',
      `-- RBAC: Apply ${userRole} role filters`
    ];

    const specificGuardrails: Record<string, string[]> = {
      [this.QUERY_TYPES.KPI_METRICS]: [
        '-- GROUP BY all non-aggregate columns',
        '-- LIMIT 100 for aggregated results',
        '-- Use appropriate time grouping (DATE_TRUNC)',
        '-- Include COUNT(*) for volume context'
      ],
      [this.QUERY_TYPES.LIST_DETAILS]: [
        '-- MANDATORY: Include ORDER BY clause',
        '-- MANDATORY: Include LIMIT (max 50)',
        '-- Support OFFSET for pagination',
        '-- Join only necessary tables'
      ],
      [this.QUERY_TYPES.COMPARISONS]: [
        '-- Use CTEs for clear structure',
        '-- Maximum 24 months timeframe',
        '-- Include percentage changes',
        '-- Handle NULL cases in calculations'
      ],
      [this.QUERY_TYPES.ANALYTICS]: [
        '-- Prefer CTEs over nested subqueries',
        '-- Limit to 3 window functions',
        '-- Use appropriate indexes',
        '-- Consider query performance'
      ],
      [this.QUERY_TYPES.SEARCH]: [
        '-- Use ILIKE for case-insensitive',
        '-- Add wildcards (%) appropriately',
        '-- Consider text search indexes',
        '-- LIMIT 100 maximum results'
      ]
    };

    return [...baseGuardrails, ...(specificGuardrails[queryType] || [])].join('\n');
  }

  /**
   * Génère des hints de performance contextuels
   */
  private generatePerformanceHints(query: string, queryType: string): string[] {
    const hints: string[] = [];
    const queryLower = query.toLowerCase();

    // Hints pour jointures
    if (queryLower.includes('project') && queryLower.includes('offer')) {
      hints.push('-- HINT: Use index on projects.id and offers.project_id');
    }

    // Hints pour filtres de date
    if (/\b(date|période|mois|année|semaine)\b/.test(queryLower)) {
      hints.push('-- HINT: Ensure date filters use indexed columns (date_created, date_updated)');
    }

    // Hints pour agrégations
    if (queryType === this.QUERY_TYPES.KPI_METRICS && queryLower.includes('montant')) {
      hints.push('-- HINT: Consider parallel aggregation for large datasets');
    }

    // Hints pour recherche texte
    if (queryType === this.QUERY_TYPES.SEARCH) {
      hints.push('-- HINT: GIN indexes available on name and description columns');
    }

    // Hints pour les CTEs
    if (queryType === this.QUERY_TYPES.COMPARISONS || queryType === this.QUERY_TYPES.ANALYTICS) {
      hints.push('-- HINT: CTEs are materialized, use them for complex calculations');
    }

    return hints;
  }

  /**
   * Sélectionne les exemples SQL les plus pertinents
   */
  private selectRelevantExamples(queryType: string, query: string): string[] {
    const template = this.PROMPT_TEMPLATES[queryType as keyof typeof this.PROMPT_TEMPLATES];
    const examples = [...template.examples];
    
    // Ajouter des exemples supplémentaires selon le contexte
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('projet') && queryType === this.QUERY_TYPES.KPI_METRICS) {
      examples.push(`-- Projects KPI example
SELECT 
  status, 
  COUNT(*) as count,
  AVG(EXTRACT(DAY FROM NOW() - date_created)) as avg_age_days
FROM projects
WHERE date_created >= NOW() - INTERVAL '3 months'
GROUP BY status
ORDER BY count DESC;`);
    }

    if (queryLower.includes('fournisseur') && queryType === this.QUERY_TYPES.LIST_DETAILS) {
      examples.push(`-- Suppliers list example
SELECT 
  s.id, s.name, s.contact_email,
  COUNT(sr.id) as request_count
FROM suppliers s
LEFT JOIN supplier_requests sr ON s.id = sr.supplier_id
GROUP BY s.id, s.name, s.contact_email
ORDER BY request_count DESC
LIMIT 25;`);
    }

    return examples.slice(0, 3); // Maximum 3 exemples
  }

  /**
   * Construit le prompt final optimisé
   */
  private buildOptimizedPrompt(params: {
    userContext?: string;
    enrichedContext: string;
    queryType: string;
    template: any;
    guardrails: string;
    performanceHints: string[];
    examples: string[];
    userRole: string;
  }): string {
    const sections: string[] = [];
    
    // 1. CONTEXT
    sections.push('=== CONTEXT ===');
    if (params.userContext) {
      sections.push(`User Context: ${params.userContext}`);
    }
    sections.push(`Query Type: ${params.queryType}`);
    sections.push(`User Role: ${params.userRole}`);
    sections.push('');

    // 2. SCHEMA
    sections.push('=== SCHEMA & BUSINESS CONTEXT ===');
    sections.push(params.enrichedContext);
    sections.push('');

    // 3. EXAMPLES
    sections.push('=== SQL EXAMPLES ===');
    sections.push(params.examples.join('\n\n'));
    sections.push('');

    // 4. GUARDRAILS
    sections.push('=== GUARDRAILS ===');
    sections.push(params.guardrails);
    sections.push(params.template.guardrails);
    if (params.performanceHints.length > 0) {
      sections.push('\n-- PERFORMANCE HINTS:');
      sections.push(params.performanceHints.join('\n'));
    }
    sections.push('');

    // 5. QUERY INSTRUCTION
    sections.push('=== QUERY ===');
    sections.push('Generate a single, complete PostgreSQL SELECT query.');
    sections.push('Output ONLY the SQL query, no explanations.');
    sections.push(`Focus on: ${params.template.focus.join(', ')}`);
    sections.push(`LIMIT: ${params.userRole === 'admin' ? MAX_RESULTS_ADMIN : MAX_RESULTS_DEFAULT}`);

    return sections.join('\n');
  }

  /**
   * Système de validation post-génération SQL
   * Vérifie que le SQL généré respecte les guardrails et bonnes pratiques
   */
  async validateGeneratedSQL(sql: string, queryType: string): Promise<{
    isValid: boolean;
    violations: string[];
    warnings: string[];
  }> {
    const violations: string[] = [];
    const warnings: string[] = [];
    const sqlLower = sql.toLowerCase();

    try {
      // Parse SQL avec le parser
      const ast = sqlParser.astify(sql);

      // 1. Vérifier présence LIMIT (sauf pour aggregations)
      const hasAggregation = /\b(group\s+by|count\(|sum\(|avg\(|max\(|min\()/i.test(sql);
      if (queryType !== this.QUERY_TYPES.KPI_METRICS && !hasAggregation && !sqlLower.includes('limit')) {
        violations.push('Missing LIMIT clause for non-aggregated query');
      }
      
      // Log détaillé pour debug
      logger.info('Validation SQL détaillée', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'validateGeneratedSQL',
          sql: sql.substring(0, 200),
          hasGroupBy: sql.toLowerCase().includes('group by'),
          hasLimit: sql.toLowerCase().includes('limit'),
          hasAggregation: hasAggregation,
          queryType: queryType,
          violations: violations
        }
      });

      // 2. Valider timeframe raisonnable
      const timeframeMatch = sqlLower.match(/interval\s+'(\d+)\s+(year|month|day)s?'/);
      if (timeframeMatch) {
        const amount = parseInt(timeframeMatch[1]);
        const unit = timeframeMatch[2];
        if ((unit === 'year' && amount > 5) || (unit === 'month' && amount > 60)) {
          violations.push(`Timeframe too large: ${amount} ${unit}s (max 5 years)`);
        }
      }

      // 3. Contrôler nombre de jointures
      const joinCount = (sqlLower.match(/\bjoin\b/g) || []).length;
      if (joinCount > 4) {
        violations.push(`Too many JOINs: ${joinCount} (max 4)`);
      }

      // 4. Détecter SELECT *
      if (sqlLower.includes('select *') || sqlLower.includes('select\n*')) {
        violations.push('SELECT * not allowed, specify columns explicitly');
      }

      // 5. Vérifications spécifiques par type
      // Assouplir la validation ORDER BY - ce n'est plus obligatoire mais seulement un warning
      if (queryType === this.QUERY_TYPES.LIST_DETAILS && !sqlLower.includes('order by')) {
        warnings.push('Considérez ajouter ORDER BY pour un tri cohérent');
      }

      if (queryType === this.QUERY_TYPES.KPI_METRICS && !sqlLower.includes('group by')) {
        warnings.push('KPI query without GROUP BY - consider adding dimensions');
      }

      // 6. Vérifier les fonctions window si limitées
      if (queryType !== this.QUERY_TYPES.ANALYTICS) {
        const windowFunctions = ['row_number', 'rank', 'dense_rank', 'lead', 'lag'];
        const foundWindows = windowFunctions.filter(fn => sqlLower.includes(fn));
        if (foundWindows.length > 0) {
          warnings.push(`Window functions used in ${queryType}: ${foundWindows.join(', ')}`);
        }
      }

      // 7. Vérification de la terminaison par point-virgule
      if (!sql.trim().endsWith(';')) {
        violations.push('SQL query must end with semicolon (;)');
      }

      // 8. Vérification des CTEs pour les comparaisons
      if (queryType === this.QUERY_TYPES.COMPARISONS && !sqlLower.includes('with ')) {
        warnings.push('Comparison query without CTEs - consider using CTEs for better readability');
      }

      // 9. Vérification de l'utilisation des index hints
      if (joinCount > 2 && !sqlLower.includes('/*')) {
        warnings.push('Complex query without index hints - consider adding performance hints');
      }

      // 10. Vérification des limites de pagination
      if (queryType === this.QUERY_TYPES.LIST_DETAILS) {
        const limitMatch = sqlLower.match(/limit\s+(\d+)/);
        if (limitMatch && parseInt(limitMatch[1]) > 100) {
          violations.push(`LIMIT too high for list query: ${limitMatch[1]} (max 100)`);
        }
      }

    } catch (parseError) {
      violations.push(`SQL parsing error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    };
  }

  /**
   * Track des métriques de qualité des prompts
   */
  private async trackPromptQuality(
    queryType: string,
    generationTime: number,
    success: boolean = true,
    retryCount: number = 0
  ): Promise<void> {
    try {
      await this.eventBus.publish('sql_engine.prompt_metrics', {
        queryType,
        generationTime,
        success,
        retryCount,
        timestamp: new Date()
      });

      logger.info('Métriques prompt SQL', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'trackPromptQuality',
          queryType,
          generationTime,
          success,
          retryCount
        }
      });
    } catch (error) {
      logger.error('Erreur tracking métriques', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'trackPromptQuality',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Contexte de fallback en cas d'erreur du BusinessContextService
   */
  private buildFallbackContext(request: SQLQueryRequest): string {
    const userContext = request.context ? `\nCONTEXTE UTILISATEUR:\n${request.context}\n` : "";
    
    return `${userContext}

SCHÉMA BASIQUE SAXIUM (Mode dégradé):
Tables principales: projects, offers, aos, team_resources, project_tasks
Colonnes courantes: id, nom, status, responsableUserId, dateEcheance, montantTotal

INSTRUCTIONS DE BASE:
- SQL SELECT uniquement
- LIMIT ${request.userRole === 'admin' ? MAX_RESULTS_ADMIN : MAX_RESULTS_DEFAULT}
- Filtres RBAC: WHERE responsableUserId = $1 (sauf admin)
- Format PostgreSQL standard
- Préférer JOINs explicites aux sous-requêtes
- Gérer NULL/dates invalides avec COALESCE/CASE WHEN
`;
  }

  // ========================================
  // VALIDATION SÉCURITÉ SQL AVANCÉE
  // ========================================

  /**
   * Validation AST + patterns d'injection + DDL/DML interdits
   */
  private async validateSQLSecurity(sql: string, userId: string, userRole: string): Promise<{
    isSecure: boolean;
    allowedTables: string[];
    deniedTables?: string[];
    allowedColumns: string[];
    deniedColumns?: string[];
    securityViolations: string[];
  }> {
    const violations: string[] = [];
    const allowedTables: string[] = [];
    const allowedColumns: string[] = [];

    logger.info('Validation SQL', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        userId,
        userRole
      }
    });
    logger.info('SQL à valider', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        sqlPreview: sql.substring(0, 200) + (sql.length > 200 ? '...' : '')
      }
    });

    try {
      // 0. NETTOYAGE SQL COMPLET : Retirer TOUS les commentaires et normaliser
      let cleanedSQL = sql;
      try {
        // Décoder les entités HTML d'abord
        cleanedSQL = this.decodeHTMLEntities(sql)
          // Retirer commentaires multi-lignes /* */
          .replace(/\/\*[\s\S]*?\*\//g, ' ')
          // Retirer commentaires simples --
          .split('\n')
          .map(line => line.replace(/--.*$/, '').trim())
          .filter(line => line.length > 0)
          .join(' ')
          // Normaliser les espaces multiples
          .replace(/\s+/g, ' ')
          .trim();
        
        logger.info('SQL nettoyé', {
          metadata: {
            service: 'SQLEngineService',
            operation: 'validateSQL',
            cleanedSQLLength: cleanedSQL.length,
            cleanedSQLPreview: cleanedSQL.substring(0, 150) + (cleanedSQL.length > 150 ? '...' : '')
          }
        });
      } catch (cleanError) {
        logger.warn('Erreur nettoyage SQL, utilisation SQL brut', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        cleanError
      }
    });
        cleanedSQL = sql.trim();
      }
      
      // 1. ANALYSE AST COMPLÈTE avec node-sql-parser
      logger.info('Parsing AST', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 1
      }
    });
      const ast = sqlParser.astify(cleanedSQL, { database: 'postgresql' });
      logger.info('Parsing AST réussi', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });
      
      // 2. ENFORCEMENT READ-ONLY STRICT
      const astArray = Array.isArray(ast) ? ast : [ast];
      logger.info('Vérification READ-ONLY', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 2,
        statementsCount: astArray.length
      }
    });
      
      for (const statement of astArray) {
        // Vérifier que TOUTES les statements sont SELECT
        if (statement.type !== 'select') {
          const violation = `Opération dangereuse détectée: ${statement.type.toUpperCase()}. Seuls les SELECT sont autorisés.`;
          logger.warn('Violation sécurité SQL', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        violation
      }
    });
          violations.push(violation);
          continue;
        }
        logger.info('Statement type: SELECT', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });

        // 3. EXTRACTION ET VALIDATION DES TABLES
        logger.info('Validation des tables', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 3
      }
    });
        const tablesInQuery = this.extractTablesFromAST(statement);
        logger.info('Tables extraites', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        tables: tablesInQuery.join(', ')
      }
    });
        
        for (const tableName of tablesInQuery) {
          if (ALLOWED_BUSINESS_TABLES.includes(tableName)) {
            allowedTables.push(tableName);
            logger.info('Table autorisée', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        tableName
      }
    });
          } else {
            const violation = `Table non autorisée: ${tableName}`;
            logger.warn('Violation sécurité SQL', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        violation
      }
    });
            violations.push(violation);
          }
        }

        // 4. COLUMN WHITELISTING ET VALIDATION - RENFORCÉ
        logger.info('Validation des colonnes', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 4
      }
    });
        const columnsInQuery = this.extractColumnsFromAST(statement);
        logger.info('Colonnes extraites', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        columnsCount: columnsInQuery.length
      }
    });
        
        // SÉCURITÉ CRITIQUE : Vérification stricte des colonnes sensibles
        const accessedSensitiveColumns: string[] = [];
        
        for (const { table, column } of columnsInQuery) {
          // Vérifier colonnes sensibles - REJET IMMÉDIAT
          if (table && SENSITIVE_COLUMNS[table]) {
            const sensitiveCols = SENSITIVE_COLUMNS[table];
            if (sensitiveCols.includes(column)) {
              if (userRole !== 'admin') {
                // REJET IMMÉDIAT - pas de continuation
                const violation = `SÉCURITÉ CRITIQUE: Accès interdit aux colonnes sensibles pour rôle ${userRole}: ${table}.${column}`;
                logger.error('Violation sécurité CRITIQUE', {
                  metadata: {
                    service: 'SQLEngineService',
                    operation: 'validateSQL',
                    violation,
                    table,
                    column,
                    userRole,
                    severity: 'CRITICAL'
                  }
                });
                violations.push(violation);
                accessedSensitiveColumns.push(`${table}.${column}`);
                // Ne pas ajouter aux colonnes autorisées
                continue;
              } else {
                // Admin peut accéder, mais on log
                logger.warn('Admin accède à colonne sensible', {
                  metadata: {
                    service: 'SQLEngineService',
                    operation: 'validateSQL',
                    table,
                    column,
                    userRole: 'admin'
                  }
                });
              }
            }
          }
          
          // Ajouter seulement les colonnes non sensibles ou admin
          if (!accessedSensitiveColumns.includes(`${table}.${column}`)) {
            allowedColumns.push(column);
          }
        }
        
        // Si accès à colonnes sensibles détecté, REJETER IMMÉDIATEMENT
        if (accessedSensitiveColumns.length > 0 && userRole !== 'admin') {
          logger.error('Requête rejetée - colonnes sensibles', {
            metadata: {
              service: 'SQLEngineService',
              operation: 'validateSQL',
              accessedSensitiveColumns,
              userRole,
              severity: 'CRITICAL'
            }
          });
          violations.push(`REJET SÉCURITÉ: Accès refusé aux colonnes sensibles: ${accessedSensitiveColumns.join(', ')}`);
        }

        // 5. DÉTECTION INJECTIONS AVANCÉES VIA AST
        logger.info('Détection patterns d\'injection', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 5
      }
    });
        const injectionViolationsBefore = violations.length;
        this.detectAdvancedInjectionPatterns(statement, violations);
        if (violations.length > injectionViolationsBefore) {
          logger.warn('Patterns d\'injection détectés', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        patterns: violations.slice(injectionViolationsBefore).join(', ')
      }
    });
        } else {
          logger.info('Aucun pattern d\'injection détecté', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });
        }

        // 6. VALIDATION CONTRAINTES MÉTIER
        logger.info('Validation contraintes métier', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        step: 6
      }
    });
        const businessViolationsBefore = violations.length;
        this.validateBusinessConstraints(statement, userRole, violations);
        if (violations.length > businessViolationsBefore) {
          logger.warn('Contraintes métier violées', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        violations: violations.slice(businessViolationsBefore).join(', ')
      }
    });
        } else {
          logger.info('Contraintes métier respectées', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });
        }
      }

    } catch (parseError) {
      // Ne pas rejeter immédiatement, essayer une validation basique
      logger.warn('Parsing SQL échoué, validation basique', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'validateSQL',
          error: parseError instanceof Error ? parseError.message : String(parseError),
          sql: sql.substring(0, 100)
        }
      });
      
      // Validation basique si le parser échoue
      const basicViolations: string[] = [];
      
      // Vérifier les opérations dangereuses
      if (/\b(drop|truncate|delete\s+from|update\s+set|insert\s+into|alter|create|grant|revoke)\b/i.test(sql)) {
        basicViolations.push('Opération destructive ou DDL détectée');
      }
      
      // Vérifier les colonnes sensibles
      for (const [table, columns] of Object.entries(SENSITIVE_COLUMNS)) {
        for (const col of columns) {
          const regex = new RegExp(`\\b${col}\\b`, 'i');
          if (regex.test(sql)) {
            basicViolations.push(`Accès potentiel à colonne sensible: ${col}`);
          }
        }
      }
      
      // Si des violations sont détectées, les ajouter
      if (basicViolations.length > 0) {
        violations.push(...basicViolations);
        logger.error('Violations détectées en validation basique', {
          metadata: {
            service: 'SQLEngineService',
            operation: 'validateSQL',
            violations: basicViolations
          }
        });
      } else {
        // Si aucune violation basique, juste avertir du parsing échoué
        logger.warn('Parser SQL échoué, validation basique appliquée', {
          metadata: {
            service: 'SQLEngineService',
            operation: 'validateSQL',
            warning: 'Parser SQL échoué mais aucune violation basique détectée'
          }
        });
      }
    }

    const isSecure = violations.length === 0;
    
    logger.info('Résultat validation SQL', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        result: isSecure ? 'SÉCURISÉ' : 'REJETÉ'
      }
    });
    logger.info('Violations count', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL',
        violationsCount: violations.length
      }
    });
    if (violations.length > 0) {
      logger.info('Détail violations', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'validateSQL'
      }
    });
      violations.forEach((v, i) => logger.info('Violation', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'validateSQL',
          index: i + 1,
          violation: v
        }
      }));
    }

    return {
      isSecure,
      allowedTables: [...new Set(allowedTables)], // Déduplique
      allowedColumns: [...new Set(allowedColumns)],
      securityViolations: violations
    };
  }

  /**
   * Extrait toutes les tables référencées dans l'AST
   */
  private extractTablesFromAST(ast: any): string[] {
    const tables: string[] = [];
    
    // Tables FROM clause
    if (ast.from) {
      for (const fromItem of ast.from) {
        if (fromItem.table) {
          tables.push(fromItem.table);
        }
      }
    }
    
    // Tables JOINs
    if (ast.from) {
      for (const fromItem of ast.from) {
        if (fromItem.join) {
          for (const joinItem of fromItem.join) {
            if (joinItem.table) {
              tables.push(joinItem.table);
            }
          }
        }
      }
    }
    
    return tables;
  }

  /**
   * Extrait toutes les colonnes référencées dans l'AST
   */
  private extractColumnsFromAST(ast: any): Array<{table?: string, column: string}> {
    const columns: Array<{table?: string, column: string}> = [];
    
    // Colonnes SELECT
    if (ast.columns && Array.isArray(ast.columns)) {
      for (const col of ast.columns) {
        if (col.expr && col.expr.type === 'column_ref') {
          const table = col.expr.table;
          const column = col.expr.column;
          columns.push({ table, column });
        }
        // Handle wildcards
        if (col.expr && col.expr.type === 'star') {
          columns.push({ column: '*' });
        }
      }
    }
    
    return columns;
  }

  /**
   * Détecte les patterns d'injection sophistiqués via AST
   */
  private detectAdvancedInjectionPatterns(ast: any, violations: string[]): void {
    // Détection UNION injections
    if (ast.union) {
      violations.push('UNION statements non autorisés - risque d\'injection');
    }
    
    // Détection sous-requêtes suspectes
    if (this.hasNestedSelectionsWithSuspiciousPatterns(ast)) {
      violations.push('Sous-requêtes suspectes détectées');
    }
    
    // Détection fonctions système dangereuses
    this.detectDangerousFunctions(ast, violations);
  }

  /**
   * Validation des contraintes métier JLM
   */
  private validateBusinessConstraints(ast: any, userRole: string, violations: string[]): void {
    // Les utilisateurs non-admin doivent avoir des filtres user_id
    if (userRole !== 'admin') {
      const hasUserFilter = this.hasUserIdFilter(ast);
      if (!hasUserFilter) {
        // Cette violation sera corrigée automatiquement par RBAC, mais on la note
        logger.info('Filtre user_id manquant, sera ajouté par RBAC', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'generateIntelligentContext'
      }
    });
      }
    }
  }

  /**
   * Vérifie la présence de sous-requêtes suspectes
   */
  private hasNestedSelectionsWithSuspiciousPatterns(ast: any): boolean {
    // TODO: Implémenter détection patterns sophistiqués
    return false;
  }

  /**
   * Détecte les fonctions système dangereuses
   */
  private detectDangerousFunctions(ast: any, violations: string[]): void {
    // TODO: Analyser les appels de fonctions dans l'AST
    // Chercher pg_sleep, version(), etc.
  }

  /**
   * Vérifie la présence d'un filtre user_id
   */
  private hasUserIdFilter(ast: any): boolean {
    // TODO: Analyser WHERE clauses pour user_id
    return false;
  }

  // ========================================
  // APPLICATION AUTOMATIQUE FILTRES RBAC
  // ========================================

  /**
   * Applique les contraintes RBAC automatiquement dans le SQL
   */
  private async applyRBACFilters(
    sql: string, 
    userId: string, 
    userRole: string,
    allowedTables: string[]
  ): Promise<{
    success: boolean;
    filteredSQL?: string;
    parameters?: any[];
    filtersApplied?: string[];
    rbacViolations?: string[];
  }> {
    try {
      const filtersApplied: string[] = [];
      const violations: string[] = [];
      let filteredSQL = sql;
      const parameters: any[] = [userId]; // Premier paramètre toujours userId
      let rbacFiltersRequired = false;
      let rbacFiltersApplied = false;

      // SÉCURITÉ CRITIQUE: Pour non-admin, les filtres RBAC sont OBLIGATOIRES
      if (userRole !== 'admin' && allowedTables.length > 0) {
        rbacFiltersRequired = true;
        logger.info('Filtres RBAC obligatoires pour non-admin', {
          metadata: {
            service: 'SQLEngineService',
            operation: 'applyRBACFilters',
            userRole,
            tables: allowedTables,
            userId
          }
        });
      }

      // 1. Vérification permissions par table
      for (const table of allowedTables) {
        const accessCheck: AccessValidationRequest = {
          userId,
          role: userRole,
          tableName: table,
          action: "read"
        };

        const permission = await this.rbacService.validateTableAccess(accessCheck);
        if (!permission.allowed) {
          violations.push(`SÉCURITÉ: Accès refusé à la table: ${table} - ${permission.denialReason}`);
          logger.error('Accès table refusé', {
            metadata: {
              service: 'SQLEngineService',
              operation: 'applyRBACFilters',
              table,
              reason: permission.denialReason,
              severity: 'HIGH'
            }
          });
          continue;
        }

        // 2. Application FORCÉE des filtres pour non-admin
        if (userRole !== 'admin') {
          if (this.hasUserIdColumn(table)) {
            // OBLIGATOIRE: Filtre par userId pour données personnelles
            const userIdFilter = this.buildUserIdFilter(table, parameters.length);
            if (!userIdFilter) {
              violations.push(`SÉCURITÉ CRITIQUE: Impossible d'appliquer filtre utilisateur sur ${table}`);
              logger.error('Filtre RBAC impossible', {
                metadata: {
                  service: 'SQLEngineService',
                  operation: 'applyRBACFilters',
                  table,
                  severity: 'CRITICAL'
                }
              });
              continue;
            }
            
            filteredSQL = this.injectWhereClause(filteredSQL, table, userIdFilter);
            filtersApplied.push(`Filtre utilisateur FORCÉ sur ${table}`);
            rbacFiltersApplied = true;
            
            logger.info('Filtre RBAC appliqué', {
              metadata: {
                service: 'SQLEngineService',
                operation: 'applyRBACFilters',
                table,
                filter: userIdFilter
              }
            });
          } else if (this.hasDepartementColumn(table)) {
            // OBLIGATOIRE: Au minimum restreindre l'accès
            logger.warn('Table sans filtre userId, restriction département requise', {
              metadata: {
                service: 'SQLEngineService',
                operation: 'applyRBACFilters',
                table,
                warning: 'département_filter_needed'
              }
            });
            // Pour l'instant, on rejette si pas de filtre utilisateur disponible
            if (!rbacFiltersApplied) {
              violations.push(`SÉCURITÉ: Table ${table} nécessite filtres RBAC non disponibles`);
            }
          }
        }

        // 3. Masquage colonnes sensibles selon le rôle
        if (permission.deniedColumns && permission.deniedColumns.length > 0) {
          filteredSQL = this.maskSensitiveColumns(filteredSQL, table, permission.deniedColumns);
          filtersApplied.push(`Colonnes sensibles MASQUÉES sur ${table}: ${permission.deniedColumns.join(', ')}`);
          logger.info('Colonnes sensibles masquées', {
            metadata: {
              service: 'SQLEngineService',
              operation: 'applyRBACFilters',
              table,
              maskedColumns: permission.deniedColumns
            }
          });
        }
      }

      // VALIDATION CRITIQUE: Si filtres requis mais pas appliqués, REJETER
      if (rbacFiltersRequired && !rbacFiltersApplied && filtersApplied.length === 0) {
        const criticalViolation = 'SÉCURITÉ CRITIQUE: Filtres RBAC obligatoires non appliqués pour utilisateur non-admin';
        logger.error(criticalViolation, {
          metadata: {
            service: 'SQLEngineService',
            operation: 'applyRBACFilters',
            userRole,
            userId,
            tables: allowedTables,
            severity: 'CRITICAL',
            action: 'REJECT_QUERY'
          }
        });
        violations.push(criticalViolation);
      }

      // Si violations critiques, REJETER la requête
      if (violations.length > 0) {
        logger.error('Requête REJETÉE - violations RBAC', {
          metadata: {
            service: 'SQLEngineService',
            operation: 'applyRBACFilters',
            violations,
            userRole,
            severity: 'CRITICAL'
          }
        });
        return {
          success: false,
          rbacViolations: violations
        };
      }

      logger.info('Filtres RBAC appliqués avec succès', {
        metadata: {
          service: 'SQLEngineService',
          operation: 'applyRBACFilters',
          filtersApplied,
          userRole
        }
      });

      return {
        success: true,
        filteredSQL,
        parameters,
        filtersApplied
      };

    } catch (error) {
      return {
        success: false,
        rbacViolations: [`Erreur application RBAC: ${error}`]
      };
    }
  }

  // ========================================
  // EXÉCUTION SÉCURISÉE AVEC TIMEOUT
  // ========================================

  /**
   * Décode les entités HTML dans une chaîne SQL
   */
  private decodeHTMLEntities(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&nbsp;/g, ' ');
  }

  /**
   * Exécute le SQL avec timeout et limitation de résultats
   */
  private async executeSecureSQL(
    sql: string, 
    parameters: any[], 
    maxResults: number, 
    timeoutMs: number
  ): Promise<{
    success: boolean;
    results?: any[];
    executionTime?: number;
    error?: any;
  }> {
    const startTime = Date.now();
    
    // Limitation des résultats si pas déjà présente
    const limitedSQL = this.ensureLimitClause(sql, maxResults);
    
    // Décoder les entités HTML qui pourraient être présentes dans le SQL
    const decodedSQL = this.decodeHTMLEntities(limitedSQL);

    try {

      // Exécution avec timeout robuste (évite unhandled rejection)
      let timeoutId: NodeJS.Timeout | null = null;
      let isTimedOut = false;
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          isTimedOut = true;
          reject(new Error('Query timeout'));
        }, timeoutMs);
      });

      // Créer la promesse de requête  
      // Pour exécuter du SQL dynamique dans Drizzle avec Neon
      // On utilise directement le pool sous-jacent pour le SQL brut
      const queryPromise = pool.query(decodedSQL);
      
      try {
        // Race entre la requête et le timeout
        const results = await Promise.race([
          queryPromise,
          timeoutPromise
        ]) as any[];
        
        // Nettoyer le timeout si la requête réussit avant
        if (timeoutId) clearTimeout(timeoutId);
        
        // Marquer la requête comme terminée pour éviter les rejets non gérés
        isTimedOut = true;
        
        // Si la requête est encore en cours, l'ignorer (elle finira en arrière-plan)
        queryPromise.catch(() => {
          // Ignorer les erreurs après le succès
        });
        
        const executionTime = Date.now() - startTime;

        return {
          success: true,
          results: Array.isArray(results) ? results : [results],
          executionTime
        };
      } catch (raceError) {
        // Nettoyer le timeout même en cas d'erreur
        if (timeoutId) clearTimeout(timeoutId);
        
        // Marquer comme timeout et gérer la promesse de requête
        isTimedOut = true;
        
        // Ignorer les erreurs de la requête après timeout
        queryPromise.catch(() => {
          // Ignorer les erreurs après timeout
        });
        
        throw raceError;
      }

    } catch (error) {
      // Log détaillé de l'erreur pour diagnostic
      logger.error('Erreur exécution SQL sécurisée', error as Error, {
        metadata: {
          module: 'SQLEngineService',
          operation: 'executeSecureSQL',
          sqlPreview: decodedSQL.substring(0, 200),
          errorDetails: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : String(error)
        }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  private validateInputQuery(request: SQLQueryRequest): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!request.naturalLanguageQuery || request.naturalLanguageQuery.trim().length === 0) {
      errors.push("Requête vide");
    }
    if (request.naturalLanguageQuery && request.naturalLanguageQuery.length > 5000) {
      errors.push("Requête trop longue (max 5000 caractères)");
    }
    if (!request.userId || !request.userRole) {
      errors.push("userId et userRole requis");
    }

    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private detectQueryComplexity(query: string): "simple" | "complex" | "expert" {
    const complexKeywords = ['join', 'group by', 'having', 'window', 'union', 'case when', 'subquery'];
    const expertKeywords = ['recursive', 'partition', 'lead', 'lag', 'rank', 'dense_rank'];
    
    const lowerQuery = query.toLowerCase();
    
    if (expertKeywords.some(kw => lowerQuery.includes(kw))) return "expert";
    if (complexKeywords.some(kw => lowerQuery.includes(kw))) return "complex";
    return "simple";
  }

  private isValidBusinessTable(tableName: string): boolean {
    const validTables = [
      'projects', 'offers', 'aos', 'chiffrage_elements', 'team_resources', 
      'project_tasks', 'users', 'supplier_requests', 'validation_milestones',
      'technical_alerts', 'date_alerts', 'business_metrics'
    ];
    return validTables.includes(tableName.toLowerCase());
  }

  private hasUserIdColumn(tableName: string): boolean {
    const userIdTables = ['projects', 'offers', 'project_tasks', 'supplier_requests'];
    return userIdTables.includes(tableName.toLowerCase());
  }

  private hasDepartementColumn(tableName: string): boolean {
    const deptTables = ['projects', 'offers', 'aos'];
    return deptTables.includes(tableName.toLowerCase());
  }

  private buildUserIdFilter(tableName: string, paramIndex: number): string {
    const userIdColumns = {
      'projects': 'responsableUserId',
      'offers': 'userId', 
      'project_tasks': 'assigneeUserId',
      'supplier_requests': 'userId'
    };

    const column = userIdColumns[tableName.toLowerCase() as keyof typeof userIdColumns];
    return column ? `${tableName}.${column} = $${paramIndex}` : '';
  }

  private injectWhereClause(sql: string, tableName: string, condition: string): string {
    if (!condition) return sql;

    // Injection simple dans la clause WHERE existante ou création
    if (sql.toLowerCase().includes('where')) {
      return sql.replace(/where/i, `WHERE ${condition} AND`);
    } else {
      // Injecter avant ORDER BY, GROUP BY, ou LIMIT
      const insertionPoint = sql.search(/(order by|group by|limit)/i);
      if (insertionPoint > -1) {
        return sql.slice(0, insertionPoint) + ` WHERE ${condition} ` + sql.slice(insertionPoint);
      } else {
        return sql + ` WHERE ${condition}`;
      }
    }
  }

  private maskSensitiveColumns(sql: string, tableName: string, deniedColumns: string[]): string {
    // Remplacement basique des colonnes sensibles par NULL
    let maskedSQL = sql;
    for (const column of deniedColumns) {
      const pattern = new RegExp(`\\b${tableName}\\.${column}\\b`, 'gi');
      maskedSQL = maskedSQL.replace(pattern, 'NULL as ' + column);
    }
    return maskedSQL;
  }

  private ensureLimitClause(sql: string, maxResults: number): string {
    if (sql.toLowerCase().includes('limit')) {
      return sql; // Déjà une limite
    }
    return sql + ` LIMIT ${maxResults}`;
  }

  private isSensitiveQuery(sql: string, userRole: string): boolean {
    const sensitiveTables = ['team_resources', 'business_metrics', 'technical_alerts'];
    const sensitiveColumns = ['montantTotal', 'prixUnitaire', 'salaire', 'chargeActuelle'];
    
    const lowerSQL = sql.toLowerCase();
    const hasSensitiveTable = sensitiveTables.some(table => lowerSQL.includes(table));
    const hasSensitiveColumn = sensitiveColumns.some(col => lowerSQL.includes(col.toLowerCase()));
    
    return hasSensitiveTable || hasSensitiveColumn;
  }

  private generateWarnings(sql: string, resultCount: number, userRole: string): string[] {
    const warnings: string[] = [];

    if (resultCount === 0) {
      warnings.push("Aucun résultat trouvé. Vérifiez les critères de recherche.");
    }
    
    if (resultCount >= MAX_RESULTS_DEFAULT && userRole !== 'admin') {
      warnings.push(`Résultats limités à ${MAX_RESULTS_DEFAULT}. Contactez un admin pour plus de données.`);
    }

    if (sql.toLowerCase().includes('*')) {
      warnings.push("Requête avec SELECT * détectée. Privilégiez les colonnes spécifiques pour de meilleures performances.");
    }

    return warnings;
  }

  private generateSuggestions(sql: string, securityCheck: any, rbacResult: any): string[] {
    const suggestions: string[] = [];

    if (!securityCheck.isSecure) {
      suggestions.push("Utilisez uniquement des requêtes SELECT avec des paramètres ($1, $2...)");
    }

    if (!rbacResult.success) {
      suggestions.push("Vérifiez vos permissions d'accès aux tables demandées");
    }

    return suggestions;
  }

  private async logQueryExecution(
    queryId: string, 
    request: SQLQueryRequest, 
    finalSQL: string, 
    resultCount: number, 
    startTime: number
  ): Promise<void> {
    try {
      logger.info('Query executed', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'executeNaturalLanguageQuery',
        queryId,
        durationMs: Date.now() - startTime,
        resultsCount: resultCount
      }
    });
      
      // TODO: Persister en base pour audit complet
      // await this.storage.createQueryLog({
      //   queryId,
      //   userId: request.userId,
      //   userRole: request.userRole,
      //   originalQuery: request.naturalLanguageQuery,
      //   finalSQL,
      //   resultCount,
      //   executionTimeMs: Date.now() - startTime
      // });
      
    } catch (error) {
      logger.error('Erreur logging', {
      metadata: {
        service: 'SQLEngineService',
        operation: 'logQueryToAudit',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    }
  }

  // ========================================
  // MÉTHODE CONTEXTE BASE DE DONNÉES (POUR TESTS ET DÉMO)
  // ========================================

  /**
   * Construction du contexte de base de données pour utilisateur donné
   * Utilisé par les tests et démos pour comprendre les capacités du moteur
   */
  async buildDatabaseContext(userId: string, userRole: string): Promise<{
    availableTables: string[];
    context: string;
    rbacFiltersInfo: string;
    exampleQueries: string[];
  }> {
    const availableTables = [
      'projects', 'offers', 'aos', 'chiffrage_elements', 'team_resources',
      'project_tasks', 'users', 'supplier_requests', 'validation_milestones',
      'technical_alerts', 'date_alerts', 'business_metrics'
    ];

    // Filtrer les tables selon le rôle
    const accessibleTables = userRole === 'admin' 
      ? availableTables 
      : availableTables.filter(table => !['users', 'business_metrics'].includes(table));

    const context = `
Base de données Saxium - Entreprise de menuiserie JLM

Tables disponibles:
${accessibleTables.map(table => `- ${table}`).join('\n')}

Schéma métier:
- projects: Projets de menuiserie avec phases (passation, etude, planification, chantier, sav)
- offers: Offres commerciales 
- aos: Appels d'offres sources
- chiffrage_elements: Éléments de chiffrage détaillés
- team_resources: Ressources équipes
- project_tasks: Tâches projet
- technical_alerts: Alertes techniques
- date_alerts: Alertes dates et échéances

Contraintes:
- Données en français (menuiserie, départements français)
- Montants en EUR
- Dates au format ISO
- Status avec valeurs enum spécifiques`;

    const rbacFiltersInfo = userRole === 'admin' 
      ? 'Accès complet à toutes les données (rôle administrateur)'
      : `Accès filtré pour rôle "${userRole}": 
        - Projets et offres: filtrés par utilisateur responsable
        - Tâches: filtrées par utilisateur assigné  
        - Tables système réservées aux admins`;

    const exampleQueries = userRole === 'admin' ? [
      'Analyse de rentabilité par type de matériau',
      'Performance des équipes par département',
      'Évolution du CA mensuel',
      'Statistiques des retards projets',
      'Utilisation des ressources équipes'
    ] : [
      'Mes projets en cours',
      'Mes offres en attente de validation', 
      'Mes tâches de la semaine',
      'Projets en retard sous ma responsabilité',
      'Charge de travail équipe'
    ];

    return {
      availableTables: accessibleTables,
      context,
      rbacFiltersInfo,
      exampleQueries
    };
  }

  /**
   * Sanitize SQL results pour JSON serialization
   * Convertit BigInt → string, Date → ISO, Buffer → base64
   */
  private sanitizeResultsForJSON(results: any[]): any[] {
    return results.map(row => this.sanitizeValueForJSON(row));
  }

  private sanitizeValueForJSON(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // BigInt → string (cause principale du 500)
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // Date → ISO string
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Buffer → base64
    if (Buffer.isBuffer(value)) {
      return value.toString('base64');
    }

    // Object/Array → récursif
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map(item => this.sanitizeValueForJSON(item));
      }
      
      const sanitized: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = this.sanitizeValueForJSON(val);
      }
      return sanitized;
    }

    // Primitives (string, number, boolean) → inchangés
    return value;
  }
}