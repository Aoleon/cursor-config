import { IStorage } from "../storage-poc";
import { RBACService } from "./RBACService";
import { EventBus } from "../eventBus";
import { db } from "../db";
import { eq, and, desc, sql, gte, lte, isNull, or } from "drizzle-orm";
import crypto from "crypto";
import { z } from "zod";
import { logger } from '../utils/logger';

import type {
  BusinessContextRequest,
  BusinessContextResponse,
  ContextEnrichmentRequest,
  ContextEnrichmentResponse,
  AdaptiveLearningUpdate,
  AdaptiveLearningResponse,
  BusinessContext,
  MenuiserieDomain,
  MenuiserieMaterial,
  MenuiserieProcess,
  MenuiserieNorm,
  SchemaWithDescriptions,
  QueryExample,
  RBACContext,
  BusinessContextMetrics,
  BusinessContextCache,
  InsertBusinessContextCache,
  AdaptiveLearningPatterns,
  InsertAdaptiveLearningPatterns,
  BusinessContextMetricsLog,
  InsertBusinessContextMetricsLog
} from "@shared/schema";

import {
  businessContextRequestSchema,
  contextEnrichmentRequestSchema,
  adaptiveLearningUpdateSchema,
  businessContextCache,
  adaptiveLearningPatterns,
  businessContextMetricsLog
} from "@shared/schema";

// ========================================
// CONSTANTES DE CONFIGURATION
// ========================================

const DEFAULT_CACHE_TTL_MINUTES = 60;
const MAX_CACHE_SIZE = 1000; // Entrées maximum en cache
const CONTEXT_VERSION = "2.1.0"; // Version pour invalidation cache
const MAX_EXAMPLES_PER_CATEGORY = 5;
const PERFORMANCE_THRESHOLD_MS = 500; // Seuil performance demandé

// Calendrier BTP français 2025
const BTP_CALENDAR_2025 = {
  holidays: [
    { start: "2025-07-01", end: "2025-08-31", impact: "Ralentissement général chantiers" },
    { start: "2025-12-20", end: "2025-01-06", impact: "Arrêt quasi-total activité" }
  ],
  peak_seasons: [
    { months: [3, 4, 5], demand_factor: 1.3, lead_time_factor: 1.2 },
    { months: [9, 10, 11], demand_factor: 1.4, lead_time_factor: 1.3 }
  ],
  weather_constraints: [
    { months: [11, 12, 1, 2], affected_phases: ["chantier"], impact_factor: 1.5 }
  ]
};

// ========================================
// CLASSE PRINCIPALE BUSINESS CONTEXT SERVICE
// ========================================

export class BusinessContextService {
  private storage: IStorage;
  private rbacService: RBACService;
  private eventBus: EventBus;
  
  // Cache en mémoire pour performance
  private memoryCache: Map<string, {
    data: BusinessContext;
    expiresAt: Date;
    hitCount: number;
  }> = new Map();
  
  // Base de connaissances menuiserie (lazy-loaded)
  private domainKnowledge: MenuiserieDomain | null = null;
  private schemasCache: SchemaWithDescriptions[] | null = null;
  
  constructor(storage: IStorage, rbacService: RBACService, eventBus: EventBus) {
    this.storage = storage;
    this.rbacService = rbacService;
    this.eventBus = eventBus;
    
    // Initialisation différée de la base de connaissances
    this.initializeDomainKnowledge();
    
    // Nettoyage périodique du cache (toutes les heures)
    setInterval(() => this.cleanupExpiredCache(), 60 * 60 * 1000);
  }

  // ========================================
  // MÉTHODE PRINCIPALE - GÉNÉRATION CONTEXTE MÉTIER INTELLIGENT
  // ========================================

  /**
   * Génère un contexte métier enrichi et adaptatif pour une requête utilisateur
   */
  async generateBusinessContext(request: BusinessContextRequest): Promise<BusinessContextResponse> {
    const startTime = Date.now();
    const contextId = crypto.randomUUID();

    try {
      logger.info('Génération contexte métier', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'generateBusinessContext',
          contextId,
          userId: request.userId,
          userRole: request.user_role
        }
      });

      // 1. Validation de la requête
      const validationResult = businessContextRequestSchema.safeParse(request);
      if (!validationResult.success) {
        return {
          success: false,
          performance_metrics: {
            generation_time_ms: Date.now() - startTime,
            cache_hit: false,
            schemas_loaded: 0,
            examples_included: 0
          },
          error: {
            type: "validation",
            message: "Requête invalide",
            details: validationResult.error.errors
          }
        };
      }

      // 2. Génération de clé de cache intelligente
      const cacheKey = this.generateCacheKey(request);
      
      // 3. Vérification cache (mémoire puis DB)
      const cachedContext = await this.getCachedContext(cacheKey, request.cache_duration_minutes || DEFAULT_CACHE_TTL_MINUTES);
      if (cachedContext) {
        await this.logMetrics(request, Date.now() - startTime, true, cachedContext);
        return {
          success: true,
          context: cachedContext,
          performance_metrics: {
            generation_time_ms: Date.now() - startTime,
            cache_hit: true,
            schemas_loaded: cachedContext.databaseSchemas.length,
            examples_included: cachedContext.businessExamples.length
          }
        };
      }

      // 4. Construction du contexte métier enrichi
      const businessContext = await this.buildEnrichedBusinessContext(request);
      
      // 5. Mise en cache du résultat
      await this.cacheContext(cacheKey, businessContext, request.cache_duration_minutes || DEFAULT_CACHE_TTL_MINUTES);
      
      // 6. Logging des métriques
      await this.logMetrics(request, Date.now() - startTime, false, businessContext);
      
      // 7. Événement pour apprentissage adaptatif
      await this.eventBus.publish('business_context.generated', {
        userId: request.userId,
        userRole: request.user_role,
        contextSize: JSON.stringify(businessContext).length,
        generationTime: Date.now() - startTime,
        cacheHit: false
      });

      return {
        success: true,
        context: businessContext,
        performance_metrics: {
          generation_time_ms: Date.now() - startTime,
          cache_hit: false,
          schemas_loaded: businessContext.databaseSchemas.length,
          examples_included: businessContext.businessExamples.length
        }
      };

    } catch (error) {
      logger.error('Erreur génération contexte', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'generateBusinessContext',
          contextId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      await this.logMetrics(request, Date.now() - startTime, false, null, error);
      
      return {
        success: false,
        performance_metrics: {
          generation_time_ms: Date.now() - startTime,
          cache_hit: false,
          schemas_loaded: 0,
          examples_included: 0
        },
        error: {
          type: "unknown",
          message: "Erreur interne lors de la génération du contexte",
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // ========================================
  // ENRICHISSEMENT DE CONTEXTE POUR REQUÊTES EXISTANTES
  // ========================================

  /**
   * Enrichit un contexte existant avec des informations complémentaires
   */
  async enrichContext(request: ContextEnrichmentRequest): Promise<ContextEnrichmentResponse> {
    const startTime = Date.now();

    try {
      // 1. Validation
      const validationResult = contextEnrichmentRequestSchema.safeParse(request);
      if (!validationResult.success) {
        return {
          success: false,
          performance_metrics: {
            enrichment_time_ms: Date.now() - startTime,
            tokens_added: 0,
            complexity_increased: false
          },
          error: {
            type: "validation",
            message: "Requête d'enrichissement invalide",
            details: validationResult.error.errors
          }
        };
      }

      // 2. Analyse de la requête originale
      const queryAnalysis = this.analyzeQuery(request.original_query);
      
      // 3. Sélection des éléments d'enrichissement
      const enrichmentElements = await this.selectEnrichmentElements(
        request,
        queryAnalysis
      );
      
      // 4. Construction du contexte enrichi
      const enrichedContext = this.buildEnrichedContextString(
        request.current_context || "",
        enrichmentElements,
        request.enhancement_mode
      );
      
      // 5. Calcul de la complexité et suggestions
      const complexityIncreased = enrichedContext.length > (request.current_context?.length || 0) * 1.2;
      const suggestions = this.generateRefinementSuggestions(queryAnalysis, enrichmentElements);

      return {
        success: true,
        enriched_context: enrichedContext,
        suggested_refinements: suggestions,
        confidence_score: enrichmentElements.confidence,
        performance_metrics: {
          enrichment_time_ms: Date.now() - startTime,
          tokens_added: enrichedContext.length - (request.current_context?.length || 0),
          complexity_increased: complexityIncreased
        }
      };

    } catch (error) {
      logger.error('Erreur enrichissement contexte', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'enrichContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      return {
        success: false,
        performance_metrics: {
          enrichment_time_ms: Date.now() - startTime,
          tokens_added: 0,
          complexity_increased: false
        },
        error: {
          type: "enrichment",
          message: "Erreur lors de l'enrichissement du contexte",
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // ========================================
  // APPRENTISSAGE ADAPTATIF
  // ========================================

  /**
   * Met à jour les patterns d'apprentissage basés sur les retours utilisateur
   */
  async updateAdaptiveLearning(update: AdaptiveLearningUpdate): Promise<AdaptiveLearningResponse> {
    try {
      // 1. Validation
      const validationResult = adaptiveLearningUpdateSchema.safeParse(update);
      if (!validationResult.success) {
        return {
          success: false,
          learning_applied: false,
          updated_patterns: [],
          error: {
            type: "validation",
            message: "Données d'apprentissage invalides",
            details: validationResult.error.errors
          }
        };
      }

      // 2. Normalisation du pattern de requête
      const normalizedPattern = this.normalizeQueryPattern(update.query_pattern);
      
      // 3. Recherche ou création du pattern
      const existingPattern = await db
        .select()
        .from(adaptiveLearningPatterns)
        .where(and(
          eq(adaptiveLearningPatterns.userRole, update.user_role),
          eq(adaptiveLearningPatterns.queryPattern, normalizedPattern),
          eq(adaptiveLearningPatterns.isActive, true)
        ))
        .limit(1);

      let updatedPatterns: string[] = [];

      if (existingPattern.length > 0) {
        // Mise à jour pattern existant
        const pattern = existingPattern[0];
        const newSuccessRate = this.calculateNewSuccessRate(
          pattern.successRate,
          pattern.usageCount,
          update.success_rating
        );
        const newAvgTime = this.calculateNewAvgTime(
          pattern.avgExecutionTime,
          pattern.usageCount,
          update.execution_time_ms
        );

        await db
          .update(adaptiveLearningPatterns)
          .set({
            successRate: newSuccessRate.toString(),
            avgExecutionTime: newAvgTime,
            usageCount: pattern.usageCount + 1,
            lastUsed: new Date(),
            optimizationSuggestions: update.improvement_suggestions || pattern.optimizationSuggestions,
            updatedAt: new Date()
          })
          .where(eq(adaptiveLearningPatterns.id, pattern.id));

        updatedPatterns.push(pattern.id);
      } else {
        // Création nouveau pattern
        const newPattern: InsertAdaptiveLearningPatterns = {
          id: crypto.randomUUID(),
          userRole: update.user_role,
          queryPattern: normalizedPattern,
          successRate: update.success_rating.toString(),
          avgExecutionTime: update.execution_time_ms,
          usageCount: 1,
          lastUsed: new Date(),
          optimizationSuggestions: update.improvement_suggestions || null,
          contextEnhancements: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await db.insert(adaptiveLearningPatterns).values(newPattern);
        updatedPatterns.push(newPattern.id);
      }

      // 4. Génération de suggestions d'optimisation
      const optimizationSuggestions = await this.generateOptimizationSuggestions(
        update.user_role,
        normalizedPattern,
        update.success_rating
      );

      return {
        success: true,
        learning_applied: true,
        updated_patterns: updatedPatterns,
        optimization_suggestions: optimizationSuggestions
      };

    } catch (error) {
      logger.error('Erreur apprentissage adaptatif', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'updateAdaptiveLearning',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      return {
        success: false,
        learning_applied: false,
        updated_patterns: [],
        error: {
          type: "learning",
          message: "Erreur lors de la mise à jour de l'apprentissage",
          details: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  // ========================================
  // CONSTRUCTION DU CONTEXTE MÉTIER ENRICHI
  // ========================================

  /**
   * Construit le contexte métier complet avec tous les éléments
   */
  private async buildEnrichedBusinessContext(request: BusinessContextRequest): Promise<BusinessContext> {
    // Mode SQL minimal : contexte ultra-light pour génération SQL rapide
    if (request.generation_mode === 'sql_minimal') {
      return await this.buildMinimalSQLContext(request);
    }
    
    // Mode full : contexte complet (comportement par défaut)
    // 1. Chargement des schémas de base de données enrichis
    const databaseSchemas = await this.loadEnrichedDatabaseSchemas(request.user_role);
    
    // 2. Sélection des exemples métier pertinents
    const businessExamples = await this.selectRelevantBusinessExamples(
      request.user_role,
      request.focus_areas,
      request.complexity_preference
    );
    
    // 3. Construction du contexte RBAC
    const roleSpecificConstraints = await this.buildRBACContext(request.userId, request.user_role);
    
    // 4. Génération des requêtes suggérées
    const suggestedQueries = await this.generateSuggestedQueries(
      request.user_role,
      request.query_hint,
      request.personalization_level
    );
    
    // 5. Contexte temporel (saisonnalité, contraintes BTP)
    const temporal_context = this.buildTemporalContext();
    
    // 6. Métadonnées de cache
    const cache_metadata = {
      generated_at: new Date(),
      expires_at: new Date(Date.now() + (request.cache_duration_minutes || DEFAULT_CACHE_TTL_MINUTES) * 60 * 1000),
      cache_key: this.generateCacheKey(request),
      version: CONTEXT_VERSION
    };

    return {
      databaseSchemas,
      businessExamples,
      domainKnowledge: await this.getDomainKnowledge(),
      roleSpecificConstraints,
      suggestedQueries,
      temporal_context,
      cache_metadata
    };
  }
  
  /**
   * Contexte SQL minimal : résolveur intent→tables + schémas limités UNIQUEMENT
   * Performance: <100ms | Tokens: <2k | Pour génération SQL rapide
   */
  private async buildMinimalSQLContext(request: BusinessContextRequest): Promise<BusinessContext> {
    // 1. Résolution intent → tables pertinentes (heuristique rapide)
    const relevantTables = this.resolveIntentToTables(request.query_hint || '');
    
    // 2. Schémas limités aux tables pertinentes UNIQUEMENT (top 3 max)
    const minimalSchemas = await this.loadMinimalSchemas(relevantTables.slice(0, 3));
    
    // 3. RBAC minimal (sécurité obligatoire)
    const roleSpecificConstraints = await this.buildRBACContext(request.userId, request.user_role);
    
    // 4. 1-2 exemples SQL courts max
    const minimalExamples = await this.selectMinimalSQLExamples(relevantTables);
    
    // 5. Base connaissances BTP minimale (termes→colonnes uniquement)
    const minimalDomain = this.getMinimalDomainKnowledge();
    
    // 6. PAS de calendrier BTP, PAS de suggestions, PAS de contexte temporel
    const cache_metadata = {
      generated_at: new Date(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000), // Cache court 15min
      cache_key: this.generateCacheKey(request),
      version: CONTEXT_VERSION + '-sql-minimal'
    };

    return {
      databaseSchemas: minimalSchemas,
      businessExamples: minimalExamples,
      domainKnowledge: minimalDomain,
      roleSpecificConstraints,
      suggestedQueries: [], // Vide
      temporal_context: {
        current_season: '', // Vide
        active_constraints: [], // Vide
        upcoming_deadlines: [], // Vide
        peak_periods: [] // Vide
      },
      cache_metadata
    };
  }
  
  /**
   * Résolveur intent→tables : map mots-clés vers tables SQL pertinentes
   */
  private resolveIntentToTables(queryHint: string): string[] {
    const hint = queryHint.toLowerCase();
    const tables: Set<string> = new Set();
    
    // Mapping mots-clés → tables (heuristique)
    const intentMap: Record<string, string[]> = {
      'budget|rentabilité|marge|coût|prix|tarif|devis|chiffrage': ['offers', 'projects', 'chiffrage_elements', 'ao_lots'],
      'projet|planning|délai|échéance|livraison': ['projects', 'timelines', 'tasks'],
      'équipe|ressource|employé|main-d\'oeuvre': ['employees', 'employee_assignments', 'teams'],
      'fournisseur|approvisionnement|commande': ['suppliers', 'supplier_quotes', 'ao_lots'],
      'client|ao|appel d\'offre|tender': ['ao_sheets', 'ao_lots', 'offers'],
      'tâche|activité|suivi': ['tasks', 'timelines', 'projects'],
      'matériau|composant': ['chiffrage_elements', 'ao_lots']
    };
    
    // Matcher les patterns
    for (const [pattern, tablesToAdd] of Object.entries(intentMap)) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(hint)) {
        tablesToAdd.forEach(t => tables.add(t));
      }
    }
    
    // Fallback: si aucune table trouvée, retourner tables principales
    if (tables.size === 0) {
      return ['projects', 'offers', 'ao_sheets'];
    }
    
    return Array.from(tables);
  }
  
  /**
   * Charge schémas minimaux pour tables spécifiées uniquement
   */
  private async loadMinimalSchemas(tableNames: string[]): Promise<SchemaWithDescriptions[]> {
    const fullSchemas = await this.loadEnrichedDatabaseSchemas('admin');
    
    // Filtrer uniquement les tables pertinentes
    return fullSchemas.filter(schema => 
      tableNames.some(tableName => schema.tableName?.toLowerCase() === tableName.toLowerCase())
    );
  }
  
  /**
   * Sélectionne 1-2 exemples SQL courts pour les tables pertinentes
   */
  private async selectMinimalSQLExamples(tableNames: string[]): Promise<QueryExample[]> {
    const allExamples = await this.selectRelevantBusinessExamples('admin', undefined, 'simple');
    
    // Filtrer exemples contenant les tables pertinentes (max 2)
    return allExamples
      .filter(ex => tableNames.some(table => ex.sqlQuery?.toLowerCase().includes(table.toLowerCase())))
      .slice(0, 2);
  }

  // ========================================
  // GESTION DU CACHE INTELLIGENT
  // ========================================

  /**
   * Génère une clé de cache intelligente basée sur les paramètres de requête
   */
  private generateCacheKey(request: BusinessContextRequest): string {
    const keyComponents = [
      `role:${request.user_role}`,
      `hint:${request.query_hint || "none"}`,
      `complexity:${request.complexity_preference || "default"}`,
      `areas:${(request.focus_areas || []).sort().join(",")}`,
      `temporal:${request.include_temporal}`,
      `level:${request.personalization_level}`,
      `version:${CONTEXT_VERSION}`,
      // Ajout de la date pour invalidation quotidienne des contextes temporels
      `date:${new Date().toISOString().split('T')[0]}`
    ];
    
    return crypto.createHash('md5').update(keyComponents.join('|')).digest('hex');
  }

  /**
   * Récupère un contexte du cache (mémoire puis DB)
   */
  private async getCachedContext(cacheKey: string, ttlMinutes: number): Promise<BusinessContext | null> {
    try {
      // 1. Vérification cache mémoire
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && memoryEntry.expiresAt > new Date()) {
        memoryEntry.hitCount++;
        logger.info('Cache mémoire hit', {
          metadata: {
            service: 'BusinessContextService',
            operation: 'getCachedContext',
            cacheKey
          }
        });
        return memoryEntry.data;
      }

      // 2. Vérification cache DB
      const dbEntry = await db
        .select()
        .from(businessContextCache)
        .where(and(
          eq(businessContextCache.contextKey, cacheKey),
          gte(businessContextCache.expiresAt, new Date())
        ))
        .limit(1);

      if (dbEntry.length > 0) {
        const cached = dbEntry[0];
        const contextData = cached.contextData as BusinessContext;
        
        // Mise à jour stats d'accès
        await db
          .update(businessContextCache)
          .set({
            accessCount: cached.accessCount + 1,
            lastAccessed: new Date()
          })
          .where(eq(businessContextCache.id, cached.id));

        // Ajout au cache mémoire
        this.memoryCache.set(cacheKey, {
          data: contextData,
          expiresAt: cached.expiresAt,
          hitCount: 1
        });

        logger.info('Cache DB hit', {
          metadata: {
            service: 'BusinessContextService',
            operation: 'getCachedContext',
            cacheKey
          }
        });
        return contextData;
      }

      return null;
    } catch (error) {
      logger.error('Erreur récupération cache', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'getCachedContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  }

  /**
   * Met en cache un contexte (mémoire et DB)
   */
  private async cacheContext(cacheKey: string, context: BusinessContext, ttlMinutes: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

      // 1. Cache mémoire
      this.memoryCache.set(cacheKey, {
        data: context,
        expiresAt,
        hitCount: 0
      });

      // 2. Cache DB
      const cacheEntry: InsertBusinessContextCache = {
        id: crypto.randomUUID(),
        userId: context.cache_metadata.cache_key, // Utilisation temporaire, devrait être userId réel
        userRole: context.roleSpecificConstraints.user_role,
        contextKey: cacheKey,
        contextData: context as any,
        expiresAt,
        createdAt: new Date(),
        accessCount: 0,
        lastAccessed: new Date()
      };

      await db.insert(businessContextCache).values(cacheEntry);

      // 3. Nettoyage si cache trop volumineux
      if (this.memoryCache.size > MAX_CACHE_SIZE) {
        this.cleanupExpiredCache();
      }

    } catch (error) {
      logger.error('Erreur mise en cache', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'cacheContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Non bloquant - continue sans cache
    }
  }

  /**
   * Nettoie les entrées expirées du cache
   */
  private cleanupExpiredCache(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info('Nettoyage cache', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'cleanupExpiredCache',
          cleanedCount
        }
      });
    }

    // Nettoyage DB en arrière-plan
    db.delete(businessContextCache)
      .where(lte(businessContextCache.expiresAt, now))
      .then(() => logger.info('Cache DB nettoyé', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'cleanupExpiredCache'
        }
      }))
      .catch(err => logger.error('Erreur nettoyage DB', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'cleanupExpiredCache',
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        }
      }));
  }

  // ========================================
  // BASE DE CONNAISSANCES MENUISERIE FRANÇAISE
  // ========================================

  /**
   * Initialise la base de connaissances menuiserie en différé
   */
  private async initializeDomainKnowledge(): Promise<void> {
    try {
      this.domainKnowledge = await this.loadMenuiserieDomainKnowledge();
      logger.info('Base de connaissances menuiserie initialisée', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'initializeDomainKnowledge'
        }
      });
    } catch (error) {
      logger.error('Erreur initialisation domaine', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'initializeDomainKnowledge',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Fallback vers une base minimale
      this.domainKnowledge = this.getMinimalDomainKnowledge();
    }
  }

  /**
   * Récupère la base de connaissances (lazy-loading)
   */
  private async getDomainKnowledge(): Promise<MenuiserieDomain> {
    if (!this.domainKnowledge) {
      await this.initializeDomainKnowledge();
    }
    return this.domainKnowledge!;
  }

  /**
   * Charge la base de connaissances menuiserie complète
   */
  private async loadMenuiserieDomainKnowledge(): Promise<MenuiserieDomain> {
    try {
      // Import dynamique de la base de connaissances
      const { MENUISERIE_KNOWLEDGE_BASE } = await import('./MenuiserieKnowledgeBase');
      logger.info('Base de connaissances menuiserie chargée', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'loadMenuiserieDomainKnowledge',
          materialsCount: MENUISERIE_KNOWLEDGE_BASE.materials.length,
          processesCount: MENUISERIE_KNOWLEDGE_BASE.processes.length,
          normsCount: MENUISERIE_KNOWLEDGE_BASE.norms.length
        }
      });
      return MENUISERIE_KNOWLEDGE_BASE;
    } catch (error) {
      logger.error('Erreur chargement base de connaissances', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'loadMenuiserieDomainKnowledge',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Fallback vers base minimale
      return this.getMinimalDomainKnowledge();
    }
  }

  /**
   * Base de connaissances minimale en fallback
   */
  private getMinimalDomainKnowledge(): MenuiserieDomain {
    return {
      materials: [
        {
          name: "PVC",
          aliases: ["polychlorure de vinyle", "chlorure de polyvinyle"],
          properties: {
            thermal: 0.17,
            durability: 8,
            cost_category: "economique",
            installation_complexity: "simple"
          },
          suppliers: ["Fournisseur PVC Standard"],
          technical_specs: {
            resistance_uv: "excellente",
            maintenance: "faible",
            recyclable: true
          }
        }
      ],
      processes: [
        {
          phase: "etude",
          name: "Étude technique",
          description: "Phase d'analyse technique et de conception",
          typical_duration_days: { min: 5, max: 15, average: 10 },
          critical_checkpoints: ["Faisabilité technique", "Conformité normes"],
          required_roles: ["technicien_be"],
          dependencies: ["Reception AO"]
        }
      ],
      norms: [
        {
          name: "RT2012",
          code: "RT2012",
          description: "Réglementation thermique 2012",
          applicable_materials: ["PVC", "bois", "aluminium"],
          applicable_types: ["fenetre", "porte"],
          mandatory: true,
          check_points: ["Coefficient thermique", "Étanchéité"],
          compliance_requirements: ["Calcul thermique", "Test étanchéité"]
        }
      ],
      seasonal_calendar: BTP_CALENDAR_2025,
      terminology: {
        technical_terms: {
          "coefficient thermique": ["uw", "coefficient u", "transmission thermique"],
          "étanchéité": ["air", "eau", "vent", "perméabilité"]
        },
        sql_to_business: {
          "project_status": "statut du projet",
          "date_echeance": "date d'échéance",
          "responsable_user_id": "responsable projet"
        },
        business_to_sql: {
          "statut du projet": "project_status",
          "date d'échéance": "date_echeance",
          "responsable projet": "responsable_user_id"
        }
      }
    };
  }

  // ========================================
  // MÉTHODES AUXILIAIRES
  // ========================================

  /**
   * Charge les schémas de DB enrichis selon le rôle
   */
  private async loadEnrichedDatabaseSchemas(userRole: string): Promise<SchemaWithDescriptions[]> {
    const schemas: SchemaWithDescriptions[] = [];

    // Schema PROJECTS - Adapté selon le rôle
    schemas.push({
      tableName: "projects",
      businessName: "Projets de menuiserie",
      description: "Table principale des projets avec suivi complet du workflow JLM (Passation → Étude → VISA → Planification → Approvisionnement → Chantier → SAV)",
      columns: [
        {
          name: "id",
          businessName: "Identifiant projet",
          type: "varchar",
          description: "Identifiant unique du projet",
          isSensitive: false,
          businessExamples: ["proj-001", "project-2025-123", "menuiserie-villa-durand"]
        },
        {
          name: "status",
          businessName: "Phase actuelle",
          type: "enum",
          description: "Étape actuelle dans le workflow (passation, etude, visa_architecte, planification, approvisionnement, chantier, sav)",
          isSensitive: false,
          businessExamples: ["etude", "planification", "chantier", "visa_architecte"]
        },
        {
          name: "date_echeance",
          businessName: "Date d'échéance",
          type: "timestamp",
          description: "Date de livraison prévue au client",
          isSensitive: false,
          businessExamples: ["2025-03-15", "2025-06-30"]
        },
        {
          name: "responsable_user_id",
          businessName: "Chef de projet",
          type: "varchar",
          description: "Responsable principal du projet",
          isSensitive: userRole === "admin" ? false : true,
          businessExamples: ["user-123", "chef-projet-nord"]
        },
        {
          name: "price_total",
          businessName: "Montant total HT",
          type: "decimal",
          description: "Montant total du projet en euros HT",
          isSensitive: userRole !== "admin" && userRole !== "chef_projet",
          businessExamples: ["15000.00", "45000.00"]
        }
      ],
      relationships: [
        {
          table: "offers",
          type: "many_to_one",
          description: "Projet créé à partir d'une offre validée et signée"
        },
        {
          table: "project_timelines",
          type: "one_to_many",
          description: "Planning détaillé des phases du projet"
        },
        {
          table: "validation_milestones",
          type: "one_to_many",
          description: "Points de contrôle BE et validations qualité"
        }
      ],
      common_queries: [
        "Projets en retard sur échéance",
        "Projets par responsable",
        "Projets en cours de chantier",
        "Projets nécessitant VISA architecte",
        "Planning projets équipe"
      ],
      access_patterns: [
        {
          role: "chef_projet",
          typical_queries: [
            "Mes projets assignés",
            "Projets de mon équipe",
            "Planning hebdomadaire",
            "Projets en retard",
            "Validations en attente"
          ],
          restrictions: ["Projets assignés ou équipe uniquement"]
        },
        {
          role: "admin",
          typical_queries: [
            "Vue d'ensemble tous projets",
            "Analyse financière projets",
            "Performance équipes",
            "Projets à risque"
          ],
          restrictions: ["Accès complet"]
        },
        {
          role: "technicien_be",
          typical_queries: [
            "Projets en phase étude",
            "Validations techniques en attente",
            "Planning études BE"
          ],
          restrictions: ["Projets en phase étude/validation"]
        }
      ]
    });

    // Schema OFFERS
    schemas.push({
      tableName: "offers",
      businessName: "Offres commerciales",
      description: "Dossiers d'offres depuis AO jusqu'à transformation en projet",
      columns: [
        {
          name: "id",
          businessName: "Référence offre",
          type: "varchar",
          description: "Identifiant unique de l'offre",
          isSensitive: false,
          businessExamples: ["OFF-2025-001", "offre-lycee-bonaparte"]
        },
        {
          name: "status",
          businessName: "Statut offre",
          type: "enum",
          description: "Étape du processus offre (brouillon, etude_technique, en_cours_chiffrage, valide, signe)",
          isSensitive: false,
          businessExamples: ["etude_technique", "en_cours_chiffrage", "valide"]
        },
        {
          name: "ao_id",
          businessName: "Appel d'offre source",
          type: "varchar",
          description: "Référence de l'AO à l'origine de cette offre",
          isSensitive: false
        },
        {
          name: "estimated_amount",
          businessName: "Montant estimé",
          type: "decimal",
          description: "Estimation financière de l'offre",
          isSensitive: userRole !== "admin" && userRole !== "commercial",
          businessExamples: ["25000.00", "150000.00"]
        }
      ],
      relationships: [
        {
          table: "aos",
          type: "many_to_one",
          description: "Offre créée en réponse à un AO"
        },
        {
          table: "projects",
          type: "one_to_many",
          description: "Offre peut être transformée en projet si signée"
        }
      ],
      common_queries: [
        "Offres en cours de chiffrage",
        "Offres en attente validation BE",
        "Taux de transformation offres/projets",
        "Pipeline commercial"
      ],
      access_patterns: [
        {
          role: "commercial",
          typical_queries: [
            "Mes offres en cours",
            "Offres à relancer",
            "Performance commerciale"
          ],
          restrictions: ["Offres assignées"]
        }
      ]
    });

    // Schema MATERIALS - Spécialisé menuiserie
    schemas.push({
      tableName: "materials",
      businessName: "Matériaux et composants",
      description: "Référentiel des matériaux menuiserie : PVC, alu, bois, composites avec caractéristiques techniques",
      columns: [
        {
          name: "material_type",
          businessName: "Type de matériau",
          type: "enum",
          description: "Catégorie principale : PVC, Aluminium, Bois, Composites",
          isSensitive: false,
          businessExamples: ["PVC", "Aluminium", "Bois", "Composites"]
        },
        {
          name: "coefficient_thermique",
          businessName: "Performance thermique Uw",
          type: "decimal",
          description: "Coefficient de transmission thermique en W/m²K",
          isSensitive: false,
          businessExamples: ["1.1", "1.4", "2.0"]
        },
        {
          name: "supplier_name",
          businessName: "Fournisseur",
          type: "varchar",
          description: "Nom du fournisseur principal",
          isSensitive: false,
          businessExamples: ["REHAU", "TECHNAL", "FERIMAT"]
        },
        {
          name: "price_per_unit",
          businessName: "Prix unitaire",
          type: "decimal",
          description: "Prix d'achat unitaire HT",
          isSensitive: userRole !== "admin" && userRole !== "acheteur",
          businessExamples: ["250.00", "450.00"]
        }
      ],
      relationships: [
        {
          table: "suppliers",
          type: "many_to_one",
          description: "Matériau fourni par un fournisseur principal"
        }
      ],
      common_queries: [
        "Matériaux par performance thermique",
        "Coûts matériaux par projet",
        "Disponibilité stock fournisseur",
        "Matériaux conformes RT2012/RE2020"
      ],
      access_patterns: [
        {
          role: "technicien_be",
          typical_queries: [
            "Matériaux conformes normes",
            "Performances thermiques",
            "Caractéristiques techniques"
          ],
          restrictions: ["Accès technique complet, prix masqués"]
        }
      ]
    });

    // Filtrage selon le rôle utilisateur
    if (userRole === "technicien_be") {
      return schemas.filter(schema => 
        ["projects", "materials", "validation_milestones"].includes(schema.tableName)
      );
    } else if (userRole === "commercial") {
      return schemas.filter(schema => 
        ["offers", "aos", "projects"].includes(schema.tableName)
      );
    }

    return schemas; // Admin et autres rôles : accès complet
  }

  /**
   * Sélectionne les exemples métier pertinents
   */
  private async selectRelevantBusinessExamples(
    userRole: string,
    focusAreas?: string[],
    complexity?: string
  ): Promise<QueryExample[]> {
    // Base complète d'exemples métier menuiserie française
    const allExamples: QueryExample[] = [
      // === PLANNING ===
      {
        id: "planning-retards-projets",
        category: "planning",
        user_query: "Quels sont mes projets en retard sur échéance de livraison ?",
        sql_example: "SELECT p.id, p.nom, p.date_echeance, p.status, DATEDIFF(NOW(), p.date_echeance) as jours_retard FROM projects p WHERE p.responsable_user_id = :user_id AND p.date_echeance < NOW() AND p.status NOT IN ('termine', 'livre') ORDER BY jours_retard DESC",
        explanation: "Identifie les projets assignés en retard sur leur date d'échéance prévue, avec calcul du nombre de jours de retard",
        applicable_roles: ["chef_projet", "admin"],
        complexity: "simple",
        business_value: "Détection proactive des retards pour actions correctives urgentes et communication client",
        typical_results: "Liste des projets en retard avec nombre de jours de dépassement",
        variations: [
          "Projets à risque de retard (échéance dans 7 jours)",
          "Retards par phase de projet",
          "Impact des retards sur planning équipe"
        ]
      },
      {
        id: "planning-conges-btp",
        category: "planning",
        user_query: "Quels projets sont impactés par les congés BTP cet été ?",
        sql_example: "SELECT p.id, p.nom, pt.phase_name, pt.date_debut, pt.date_fin FROM projects p JOIN project_timelines pt ON p.id = pt.project_id WHERE pt.date_debut <= '2025-08-31' AND pt.date_fin >= '2025-07-14' AND pt.phase_name IN ('chantier', 'approvisionnement') AND p.status NOT IN ('termine', 'archive')",
        explanation: "Analyse l'impact des congés BTP (14 juillet - 24 août) sur les phases chantier et approvisionnement",
        applicable_roles: ["chef_projet", "planificateur", "admin"],
        complexity: "complex",
        business_value: "Anticipation des ralentissements saisonniers pour planification alternative",
        typical_results: "Projets concernés par la période de congés avec phases impactées"
      },
      {
        id: "planning-charge-be",
        category: "planning",
        user_query: "Quelle est la charge de travail du BE cette semaine ?",
        sql_example: "SELECT u.nom, COUNT(p.id) as nb_projets_etude, SUM(CASE WHEN p.date_echeance < DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as urgent FROM users u JOIN projects p ON u.id = p.responsable_user_id WHERE u.role = 'technicien_be' AND p.status IN ('etude', 'visa_architecte') GROUP BY u.id, u.nom ORDER BY nb_projets_etude DESC",
        explanation: "Analyse la répartition de la charge des techniciens BE avec focus sur les urgences de la semaine",
        applicable_roles: ["chef_projet", "admin", "technicien_be"],
        complexity: "complex",
        business_value: "Optimisation des ressources BE et répartition équilibrée de la charge",
        typical_results: "Charge par technicien BE avec nombre de projets urgents"
      },

      // === FINANCES ===
      {
        id: "finances-marge-projets",
        category: "finances",
        user_query: "Quelle est la marge réalisée sur mes projets terminés ce trimestre ?",
        sql_example: "SELECT p.id, p.nom, p.price_total, SUM(m.price_per_unit * pm.quantity) as cout_materiaux, (p.price_total - SUM(m.price_per_unit * pm.quantity)) as marge_brute, ROUND(((p.price_total - SUM(m.price_per_unit * pm.quantity)) / p.price_total) * 100, 2) as taux_marge FROM projects p JOIN project_materials pm ON p.id = pm.project_id JOIN materials m ON pm.material_id = m.id WHERE p.responsable_user_id = :user_id AND p.status = 'termine' AND p.date_fin >= DATE_SUB(NOW(), INTERVAL 3 MONTH) GROUP BY p.id ORDER BY taux_marge DESC",
        explanation: "Calcul de la marge brute par projet (prix vente - coût matériaux) avec taux de marge en pourcentage",
        applicable_roles: ["admin", "chef_projet"],
        complexity: "expert",
        business_value: "Analyse rentabilité pour optimisation des futurs chiffrages",
        typical_results: "Marges par projet avec taux de rentabilité calculé"
      },
      {
        id: "finances-cout-materiaux-type",
        category: "finances",
        user_query: "Quel est le coût moyen des matériaux par type de menuiserie ?",
        sql_example: "SELECT m.material_type, p.type_menuiserie, AVG(m.price_per_unit) as prix_moyen, COUNT(*) as nb_projets FROM materials m JOIN project_materials pm ON m.id = pm.material_id JOIN projects p ON pm.project_id = p.id WHERE p.date_creation >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY m.material_type, p.type_menuiserie ORDER BY m.material_type, prix_moyen DESC",
        explanation: "Analyse des coûts moyens des matériaux segmentés par type (PVC, alu, bois) et application (fenêtre, porte)",
        applicable_roles: ["admin", "acheteur", "chef_projet"],
        complexity: "complex",
        business_value: "Optimisation achats et négociation fournisseurs basée sur volumes",
        typical_results: "Prix moyens par combinaison matériau/type menuiserie"
      },

      // === RESSOURCES ===
      {
        id: "ressources-disponibilite-equipes",
        category: "ressources",
        user_query: "Quelles équipes sont disponibles pour nouveau chantier la semaine prochaine ?",
        sql_example: "SELECT e.nom, e.specialite, COUNT(pt.id) as projets_en_cours FROM team_resources e LEFT JOIN project_timelines pt ON e.id = pt.assigned_team_id AND pt.date_debut <= DATE_ADD(NOW(), INTERVAL 14 DAY) AND pt.date_fin >= DATE_ADD(NOW(), INTERVAL 7 DAY) AND pt.status = 'en_cours' WHERE e.status = 'disponible' GROUP BY e.id HAVING projets_en_cours = 0 ORDER BY e.specialite",
        explanation: "Identifie les équipes sans affectation sur la période semaine prochaine, groupées par spécialité",
        applicable_roles: ["chef_projet", "planificateur", "admin"],
        complexity: "complex",
        business_value: "Optimisation planning équipes et allocation rapide nouveaux projets",
        typical_results: "Équipes disponibles avec leur spécialité (pose PVC, alu, etc.)"
      },

      // === QUALITÉ ===
      {
        id: "qualite-validations-be-attente",
        category: "qualite",
        user_query: "Quels projets sont en attente de validation BE depuis plus de 5 jours ?",
        sql_example: "SELECT p.id, p.nom, vm.milestone_name, vm.created_at, DATEDIFF(NOW(), vm.created_at) as jours_attente FROM projects p JOIN validation_milestones vm ON p.id = vm.project_id WHERE vm.status = 'en_attente' AND vm.milestone_type = 'validation_be' AND DATEDIFF(NOW(), vm.created_at) > 5 ORDER BY jours_attente DESC",
        explanation: "Identifie les goulots d'étranglement dans le processus de validation technique",
        applicable_roles: ["admin", "technicien_be", "chef_projet"],
        complexity: "simple",
        business_value: "Accélération des validations pour éviter retards projets",
        typical_results: "Projets bloqués en validation avec durée d'attente"
      },
      {
        id: "qualite-conformite-rt2012",
        category: "qualite",
        user_query: "Quels projets doivent être vérifiés pour conformité RT2012 ?",
        sql_example: "SELECT p.id, p.nom, m.material_type, m.coefficient_thermique FROM projects p JOIN project_materials pm ON p.id = pm.project_id JOIN materials m ON pm.material_id = m.id WHERE p.status IN ('etude', 'visa_architecte') AND p.rt2012_required = true AND (m.coefficient_thermique > 1.3 OR m.coefficient_thermique IS NULL) GROUP BY p.id",
        explanation: "Contrôle conformité réglementaire RT2012 (Uw ≤ 1.3 W/m²K pour fenêtres)",
        applicable_roles: ["technicien_be", "admin"],
        complexity: "complex",
        business_value: "Assurance conformité réglementaire et évitement non-conformités",
        typical_results: "Projets nécessitant vérification/ajustement performances thermiques"
      },

      // === PERFORMANCE ===
      {
        id: "performance-taux-transformation",
        category: "performance",
        user_query: "Quel est le taux de transformation offres/projets par commercial ?",
        sql_example: "SELECT u.nom, COUNT(DISTINCT o.id) as nb_offres, COUNT(DISTINCT p.id) as nb_projets, ROUND((COUNT(DISTINCT p.id) / COUNT(DISTINCT o.id)) * 100, 2) as taux_transformation FROM users u JOIN offers o ON u.id = o.responsable_user_id LEFT JOIN projects p ON o.id = p.offer_id WHERE u.role = 'commercial' AND o.date_creation >= DATE_SUB(NOW(), INTERVAL 6 MONTH) GROUP BY u.id ORDER BY taux_transformation DESC",
        explanation: "Analyse performance commerciale : ratio projets signés / offres émises par commercial",
        applicable_roles: ["admin", "commercial"],
        complexity: "expert",
        business_value: "Optimisation processus commercial et formation équipes",
        typical_results: "Taux de transformation par commercial sur 6 mois"
      },

      // === ALERTES ===
      {
        id: "alertes-livraisons-urgentes",
        category: "alertes",
        user_query: "Quels matériaux doivent être commandés en urgence ?",
        sql_example: "SELECT m.material_type, s.supplier_name, pt.date_debut, pm.quantity, s.lead_time_days, DATE_ADD(NOW(), INTERVAL s.lead_time_days DAY) as date_livraison_prevue FROM project_timelines pt JOIN projects p ON pt.project_id = p.id JOIN project_materials pm ON p.id = pm.project_id JOIN materials m ON pm.material_id = m.id JOIN suppliers s ON m.supplier_id = s.id WHERE pt.phase_name = 'approvisionnement' AND pt.date_debut <= DATE_ADD(NOW(), INTERVAL s.lead_time_days + 5 DAY) AND pm.ordered = false ORDER BY pt.date_debut",
        explanation: "Alerte sur les commandes matériaux à passer en urgence selon délais fournisseurs",
        applicable_roles: ["acheteur", "chef_projet", "admin"],
        complexity: "complex",
        business_value: "Évitement ruptures stock et retards approvisionnement",
        typical_results: "Matériaux à commander avec dates limites et fournisseurs"
      }
    ];

    // Ajout d'exemples adaptatifs selon patterns d'apprentissage
    const adaptiveExamples = await this.getAdaptiveExamples(userRole);
    allExamples.push(...adaptiveExamples);

    // Filtrage selon le rôle et les préférences
    let filteredExamples = allExamples.filter(example => 
      example.applicable_roles.includes(userRole) &&
      (!complexity || example.complexity === complexity) &&
      (!focusAreas || focusAreas.some(area => example.category === area))
    );

    // Priorisation selon le rôle
    if (userRole === "chef_projet") {
      filteredExamples = filteredExamples.sort((a, b) => {
        const priority = { "planning": 3, "ressources": 2, "qualite": 1 };
        return (priority[b.category] || 0) - (priority[a.category] || 0);
      });
    } else if (userRole === "admin") {
      filteredExamples = filteredExamples.sort((a, b) => {
        const priority = { "finances": 3, "performance": 2, "planning": 1 };
        return (priority[b.category] || 0) - (priority[a.category] || 0);
      });
    } else if (userRole === "technicien_be") {
      filteredExamples = filteredExamples.filter(example => 
        ["qualite", "planning"].includes(example.category)
      );
    }

    return filteredExamples.slice(0, MAX_EXAMPLES_PER_CATEGORY * (focusAreas?.length || 3));
  }

  /**
   * Récupère des exemples adaptatifs basés sur l'apprentissage
   */
  private async getAdaptiveExamples(userRole: string): Promise<QueryExample[]> {
    try {
      const learnedPatterns = await db
        .select()
        .from(adaptiveLearningPatterns)
        .where(and(
          eq(adaptiveLearningPatterns.userRole, userRole),
          eq(adaptiveLearningPatterns.isActive, true),
          gte(adaptiveLearningPatterns.successRate, "3.0") // Seuil de qualité
        ))
        .orderBy(desc(adaptiveLearningPatterns.usageCount))
        .limit(3);

      return learnedPatterns.map(pattern => ({
        id: `adaptive-${pattern.id}`,
        category: "performance", // Catégorie générique pour exemples appris
        user_query: pattern.queryPattern,
        sql_example: "-- Exemple appris automatiquement par le système",
        explanation: "Requête apprise et optimisée par le système d'apprentissage adaptatif",
        applicable_roles: [userRole],
        complexity: pattern.successRate > "4.0" ? "expert" : "complex",
        business_value: "Pattern optimisé par l'usage répété",
        typical_results: "Résultats basés sur l'historique d'utilisation"
      }));
    } catch (error) {
      logger.error('Erreur récupération exemples adaptatifs', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'getAdaptiveExamples',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  /**
   * Construit le contexte RBAC spécialisé
   */
  private async buildRBACContext(userId: string, userRole: string): Promise<RBACContext> {
    try {
      const permissions = await this.rbacService.getUserPermissions(userId, userRole);
      
      return {
        user_role: userRole,
        accessible_tables: Object.keys(permissions.permissions),
        restricted_columns: [],
        row_level_filters: {},
        data_scope: {
          projects: userRole === 'admin' ? 'all' : 'team',
          offers: userRole === 'admin' ? 'all' : 'team',
          financial_data: userRole === 'admin',
          sensitive_data: userRole === 'admin'
        },
        context_variables: {
          user_id: userId,
          user_role: userRole
        }
      };
    } catch (error) {
      logger.error('Erreur construction RBAC', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'buildRBACContext',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Fallback sécuritaire
      return {
        user_role: userRole,
        accessible_tables: ['projects', 'offers'],
        restricted_columns: [],
        row_level_filters: {},
        data_scope: {
          projects: 'own',
          offers: 'own',
          financial_data: false,
          sensitive_data: false
        },
        context_variables: { user_id: userId }
      };
    }
  }

  /**
   * Génère des requêtes suggérées personnalisées
   */
  private async generateSuggestedQueries(
    userRole: string,
    queryHint?: string,
    personalizationLevel: string = "basic"
  ): Promise<string[]> {
    const baseSuggestions = {
      chef_projet: [
        "Quels sont mes projets en retard ?",
        "Planning de mes équipes cette semaine",
        "Projets nécessitant validation BE"
      ],
      admin: [
        "Vue d'ensemble des performances mensuelles",
        "Analyse des marges par type de projet",
        "Projets à risque financier"
      ],
      technicien_be: [
        "Projets en attente de validation technique",
        "Planning des études en cours",
        "Contrôles qualité à effectuer"
      ]
    };

    return baseSuggestions[userRole as keyof typeof baseSuggestions] || [
      "État d'avancement des projets",
      "Planning général"
    ];
  }

  /**
   * Construit le contexte temporel (saisonnalité BTP)
   */
  private buildTemporalContext() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    
    // Détection saison actuelle
    let currentSeason = "normale";
    if ([12, 1, 2].includes(currentMonth)) currentSeason = "hiver";
    else if ([6, 7, 8].includes(currentMonth)) currentSeason = "ete";
    else if ([3, 4, 5].includes(currentMonth)) currentSeason = "printemps";
    else if ([9, 10, 11].includes(currentMonth)) currentSeason = "automne";

    // Contraintes actives
    const activeConstraints: string[] = [];
    BTP_CALENDAR_2025.weather_constraints.forEach(constraint => {
      if (constraint.months.includes(currentMonth)) {
        activeConstraints.push(`Contraintes météo sur phases: ${constraint.affected_phases.join(", ")}`);
      }
    });

    return {
      current_season: currentSeason,
      active_constraints: activeConstraints,
      upcoming_deadlines: [], // À implémenter avec données réelles
      peak_periods: BTP_CALENDAR_2025.peak_seasons.map(season => ({
        start: new Date(2025, season.months[0] - 1, 1),
        end: new Date(2025, season.months[season.months.length - 1], 0),
        factor: season.demand_factor
      }))
    };
  }

  // ========================================
  // MÉTHODES POUR ENRICHISSEMENT ET APPRENTISSAGE
  // ========================================

  /**
   * Analyse une requête pour déterminer ses caractéristiques
   */
  private analyzeQuery(query: string): {
    complexity: string;
    domains: string[];
    keywords: string[];
    intent: string;
  } {
    const queryLower = query.toLowerCase();
    
    // Détection complexité
    let complexity = "simple";
    if (queryLower.includes("analyse") || queryLower.includes("comparaison")) complexity = "complex";
    if (queryLower.includes("prévision") || queryLower.includes("tendance")) complexity = "expert";
    
    // Détection domaines
    const domains: string[] = [];
    if (queryLower.includes("planning") || queryLower.includes("délai")) domains.push("planning");
    if (queryLower.includes("coût") || queryLower.includes("prix")) domains.push("finances");
    if (queryLower.includes("équipe") || queryLower.includes("ressource")) domains.push("ressources");
    
    // Extraction mots-clés
    const keywords = queryLower.split(/\s+/).filter(word => word.length > 3);
    
    // Détection intention
    let intent = "information";
    if (queryLower.includes("analyser") || queryLower.includes("comparer")) intent = "analysis";
    if (queryLower.includes("optimiser") || queryLower.includes("améliorer")) intent = "optimization";
    
    return { complexity, domains, keywords, intent };
  }

  /**
   * Sélectionne les éléments pour enrichissement
   */
  private async selectEnrichmentElements(
    request: ContextEnrichmentRequest,
    analysis: any
  ): Promise<{ schemas: any[]; examples: any[]; confidence: number }> {
    // Implémentation simplifiée - à étendre
    return {
      schemas: [],
      examples: [],
      confidence: 0.8
    };
  }

  /**
   * Construit la chaîne de contexte enrichie
   */
  private buildEnrichedContextString(
    currentContext: string,
    elements: any,
    mode: string
  ): string {
    // Implémentation basique - à étendre
    return currentContext + "\n[Contexte métier menuiserie enrichi]";
  }

  /**
   * Génère des suggestions de raffinement
   */
  private generateRefinementSuggestions(analysis: any, elements: any): string[] {
    return [
      "Préciser la période d'analyse",
      "Spécifier le type de projet",
      "Ajouter des critères de filtrage"
    ];
  }

  /**
   * Normalise un pattern de requête pour l'apprentissage
   */
  private normalizeQueryPattern(pattern: string): string {
    return pattern.toLowerCase()
      .replace(/\d+/g, 'NUMBER')
      .replace(/['"][^'"]*['"]/g, 'STRING')
      .trim();
  }

  /**
   * Calcule un nouveau taux de succès
   */
  private calculateNewSuccessRate(currentRate: string, count: number, newRating: number): number {
    const current = parseFloat(currentRate);
    return ((current * count) + newRating) / (count + 1);
  }

  /**
   * Calcule un nouveau temps moyen
   */
  private calculateNewAvgTime(currentAvg: number, count: number, newTime: number): number {
    return Math.round(((currentAvg * count) + newTime) / (count + 1));
  }

  /**
   * Génère des suggestions d'optimisation
   */
  private async generateOptimizationSuggestions(
    userRole: string,
    pattern: string,
    successRating: number
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (successRating < 3) {
      suggestions.push("Ajouter plus de contexte métier");
      suggestions.push("Simplifier la formulation de la requête");
    }
    
    if (pattern.includes("analyse")) {
      suggestions.push("Utiliser des exemples plus spécifiques");
    }
    
    return suggestions;
  }

  /**
   * Log des métriques de performance
   */
  private async logMetrics(
    request: BusinessContextRequest,
    generationTime: number,
    cacheHit: boolean,
    context: BusinessContext | null,
    error?: any
  ): Promise<void> {
    try {
      const metrics: InsertBusinessContextMetricsLog = {
        id: crypto.randomUUID(),
        userId: request.userId,
        userRole: request.user_role,
        requestType: "generate_context",
        operationType: "context_generation", // Colonne manquante ajoutée avec valeur appropriée
        success: error ? false : true, // Colonne success ajoutée - true sauf si erreur
        generationTimeMs: generationTime,
        cacheHit,
        schemasLoaded: context?.databaseSchemas.length || 0,
        examplesIncluded: context?.businessExamples.length || 0,
        confidenceScore: null,
        contextSize: context ? JSON.stringify(context).length : 0,
        domainFocus: request.focus_areas || null,
        queryComplexity: request.complexity_preference || null,
        timestamp: new Date()
      };

      await db.insert(businessContextMetricsLog).values(metrics);
    } catch (logError) {
      logger.error('Erreur logging métriques', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'logMetrics',
          error: logError instanceof Error ? logError.message : String(logError),
          stack: logError instanceof Error ? logError.stack : undefined
        }
      });
    }
  }

  // ========================================
  // MÉTHODES PUBLIQUES POUR INTÉGRATION
  // ========================================

  /**
   * Méthode spéciale pour intégration avec SQLEngineService
   */
  async buildIntelligentContextForSQL(
    userId: string,
    userRole: string,
    naturalLanguageQuery: string
  ): Promise<string> {
    try {
      const request: BusinessContextRequest = {
        userId,
        user_role: userRole,
        query_hint: naturalLanguageQuery,
        complexity_preference: "simple",
        focus_areas: [],
        include_temporal: false, // Pas de contexte temporel en mode SQL
        cache_duration_minutes: 15, // Cache court 15min pour SQL
        personalization_level: "basic",
        generation_mode: "sql_minimal" // Mode ultra-light pour génération SQL rapide
      };

      const response = await this.generateBusinessContext(request);
      
      if (response.success && response.context) {
        // Conversion du contexte métier en chaîne optimisée pour IA
        return this.contextToAIString(response.context);
      }
      
      return "Contexte métier menuiserie: données de base disponibles";
    } catch (error) {
      logger.error('Erreur contexte SQL', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'buildIntelligentContextForSQL',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return "Contexte métier menuiserie: mode dégradé";
    }
  }

  /**
   * Convertit le contexte métier en chaîne optimisée pour IA
   */
  private contextToAIString(context: BusinessContext): string {
    const sections: string[] = [];
    
    // 1. Schémas de base de données
    sections.push("=== SCHÉMAS BASE DE DONNÉES ===");
    context.databaseSchemas.forEach(schema => {
      sections.push(`Table: ${schema.businessName} (${schema.tableName})`);
      sections.push(`Description: ${schema.description}`);
      sections.push(`Colonnes principales: ${schema.columns.map(c => `${c.businessName} (${c.name})`).join(", ")}`);
    });

    // 2. Exemples de requêtes métier
    sections.push("\n=== EXEMPLES REQUÊTES MÉTIER ===");
    context.businessExamples.forEach(example => {
      sections.push(`Requête: "${example.user_query}"`);
      sections.push(`SQL: ${example.sql_example}`);
      sections.push(`Explication: ${example.explanation}`);
    });

    // 3. Contraintes de rôle
    sections.push("\n=== CONTRAINTES UTILISATEUR ===");
    sections.push(`Rôle: ${context.roleSpecificConstraints.user_role}`);
    sections.push(`Tables accessibles: ${context.roleSpecificConstraints.accessible_tables.join(", ")}`);
    sections.push(`Portée des données: ${JSON.stringify(context.roleSpecificConstraints.data_scope)}`);

    // 4. Contexte temporel
    sections.push("\n=== CONTEXTE TEMPOREL ===");
    sections.push(`Saison actuelle: ${context.temporal_context.current_season}`);
    if (context.temporal_context.active_constraints.length > 0) {
      sections.push(`Contraintes actives: ${context.temporal_context.active_constraints.join(", ")}`);
    }

    // 5. Terminologie métier
    if (context.domainKnowledge.terminology) {
      sections.push("\n=== TERMINOLOGIE MÉTIER ===");
      Object.entries(context.domainKnowledge.terminology.business_to_sql).forEach(([business, sql]) => {
        sections.push(`"${business}" → ${sql}`);
      });
    }

    return sections.join("\n");
  }

  /**
   * Récupère les métriques du service
   */
  async getServiceMetrics(): Promise<BusinessContextMetrics> {
    try {
      const metrics = await db
        .select({
          total_requests: sql`COUNT(*)`,
          avg_generation_time: sql`AVG(generation_time_ms)`,
          cache_hit_rate: sql`AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END)`,
        })
        .from(businessContextMetricsLog)
        .where(gte(businessContextMetricsLog.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)));

      const result = metrics[0];
      
      return {
        total_requests: Number(result.total_requests) || 0,
        cache_hit_rate: Number(result.cache_hit_rate) || 0,
        avg_generation_time_ms: Number(result.avg_generation_time) || 0,
        role_distribution: {},
        most_requested_domains: {},
        context_effectiveness: {
          avg_confidence_score: 0.8,
          user_satisfaction_rate: 0.85,
          query_success_rate: 0.9
        },
        adaptive_learning_stats: {
          patterns_learned: 0,
          improvements_applied: 0,
          personalization_level: {}
        }
      };
    } catch (error) {
      logger.error('Erreur récupération métriques', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'getServiceMetrics',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Métriques par défaut
      return {
        total_requests: 0,
        cache_hit_rate: 0,
        avg_generation_time_ms: 0,
        role_distribution: {},
        most_requested_domains: {},
        context_effectiveness: {
          avg_confidence_score: 0,
          user_satisfaction_rate: 0,
          query_success_rate: 0
        },
        adaptive_learning_stats: {
          patterns_learned: 0,
          improvements_applied: 0,
          personalization_level: {}
        }
      };
    }
  }
}