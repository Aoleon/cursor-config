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

  // ========================================
  // MÉTADONNÉES ENRICHIES JLM - PHASE 3
  // ========================================

  /**
   * Retourne des métadonnées enrichies complètes sur toutes les tables JLM
   * @returns Métadonnées détaillées incluant descriptions métier, exemples, relations, index
   */
  async getEnrichedSchemaMetadata(): Promise<{
    tables: Record<string, {
      tableName: string;
      businessName: string;
      description: string;
      domain: string[];
      columns: Array<{
        name: string;
        type: string;
        businessName: string;
        description: string;
        examples: string[];
        nullable: boolean;
        constraints?: string[];
        relatedTo?: string;
      }>;
      relations: Array<{
        targetTable: string;
        type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
        via?: string;
        description: string;
      }>;
      indexes: string[];
      commonQueries: string[];
      sqlExamples: Array<{
        description: string;
        sql: string;
        explanation: string;
      }>;
    }>;
    businessDictionary: Record<string, string>;
    domainContexts: Record<string, any>;
  }> {
    const metadata = {
      tables: {} as any,
      businessDictionary: this.getJLMBusinessDictionary(),
      domainContexts: this.getDomainSpecializedContexts()
    };

    // Table OFFERS - Offres commerciales
    metadata.tables.offers = {
      tableName: 'offers',
      businessName: 'Offres commerciales',
      description: 'Devis clients et propositions commerciales, de la création à la signature',
      domain: ['commercial', 'financier'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'Référence offre',
          description: 'Identifiant unique de l\'offre',
          examples: ['OFF-2025-001', 'OFF-2025-047', 'offre-lycee-bonaparte'],
          nullable: false,
          constraints: ['PRIMARY KEY', 'UNIQUE']
        },
        {
          name: 'status',
          type: 'enum',
          businessName: 'Statut offre',
          description: 'Étape actuelle dans le workflow offre',
          examples: ['etude_technique', 'en_cours_chiffrage', 'valide', 'signe'],
          nullable: false,
          constraints: ['NOT NULL']
        },
        {
          name: 'ao_id',
          type: 'varchar',
          businessName: 'Référence AO source',
          description: 'Lien vers l\'appel d\'offres d\'origine',
          examples: ['AO-2025-001', 'AO-2025-123'],
          nullable: true,
          relatedTo: 'aos.id'
        },
        {
          name: 'estimated_amount',
          type: 'decimal(10,2)',
          businessName: 'Montant estimé HT',
          description: 'Estimation financière de l\'offre en euros HT',
          examples: ['25000.00', '150000.00', '450000.00'],
          nullable: true
        },
        {
          name: 'margin_percentage',
          type: 'decimal(5,2)',
          businessName: 'Marge prévisionnelle %',
          description: 'Pourcentage de marge commerciale prévue',
          examples: ['15.50', '22.00', '18.75'],
          nullable: true
        },
        {
          name: 'validation_date',
          type: 'timestamp',
          businessName: 'Date validation BE',
          description: 'Date de validation technique par le BE',
          examples: ['2025-03-15T14:30:00Z', '2025-04-01T09:00:00Z'],
          nullable: true
        },
        {
          name: 'responsable_user_id',
          type: 'varchar',
          businessName: 'Commercial responsable',
          description: 'Commercial en charge de l\'offre',
          examples: ['user-123', 'commercial-nord-01'],
          nullable: false,
          relatedTo: 'users.id'
        }
      ],
      relations: [
        {
          targetTable: 'aos',
          type: 'many_to_one',
          description: 'Offre créée en réponse à un appel d\'offres'
        },
        {
          targetTable: 'projects',
          type: 'one_to_many',
          description: 'Offre transformée en projet après signature'
        },
        {
          targetTable: 'chiffrage_elements',
          type: 'one_to_many',
          description: 'Éléments de chiffrage détaillés de l\'offre'
        }
      ],
      indexes: ['idx_offers_status', 'idx_offers_ao_id', 'idx_offers_responsable'],
      commonQueries: [
        'Offres en cours de chiffrage',
        'Offres en attente validation BE',
        'Taux transformation offres signées',
        'Pipeline commercial par mois'
      ],
      sqlExamples: [
        {
          description: 'Offres en cours de chiffrage avec montants',
          sql: `SELECT o.id, o.estimated_amount, u.name as commercial
                FROM offers o 
                LEFT JOIN users u ON o.responsable_user_id = u.id
                WHERE o.status = 'en_cours_chiffrage'
                ORDER BY o.created_at DESC`,
          explanation: 'Liste les offres actuellement en phase de chiffrage avec leurs montants et commerciaux'
        },
        {
          description: 'Taux de transformation offres → projets',
          sql: `SELECT 
                  COUNT(CASE WHEN status = 'signe' THEN 1 END)::float / COUNT(*) * 100 as taux_transformation
                FROM offers 
                WHERE created_at >= NOW() - INTERVAL '3 months'`,
          explanation: 'Calcule le pourcentage d\'offres transformées en projets sur 3 mois'
        }
      ]
    };

    // Table PROJECTS - Projets de chantier
    metadata.tables.projects = {
      tableName: 'projects',
      businessName: 'Projets de chantier',
      description: 'Gestion complète des projets de menuiserie de la passation au SAV',
      domain: ['operationnel', 'financier', 'planning'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'Code projet',
          description: 'Identifiant unique du projet',
          examples: ['PRJ-2025-001', 'projet-villa-martin', 'PRJ-2025-089'],
          nullable: false,
          constraints: ['PRIMARY KEY']
        },
        {
          name: 'status',
          type: 'enum',
          businessName: 'Phase actuelle',
          description: 'Étape dans le workflow projet (passation→étude→visa→planification→approvisionnement→chantier→sav)',
          examples: ['passation', 'etude', 'visa_architecte', 'chantier'],
          nullable: false,
          constraints: ['NOT NULL']
        },
        {
          name: 'date_echeance',
          type: 'timestamp',
          businessName: 'Date livraison prévue',
          description: 'Date de livraison contractuelle au client',
          examples: ['2025-06-30', '2025-09-15', '2025-12-20'],
          nullable: true
        },
        {
          name: 'price_total',
          type: 'decimal(12,2)',
          businessName: 'Montant total HT',
          description: 'Montant total du projet en euros HT',
          examples: ['45000.00', '125000.00', '380000.00'],
          nullable: true
        },
        {
          name: 'actual_margin',
          type: 'decimal(12,2)',
          businessName: 'Marge réelle',
          description: 'Marge réellement réalisée sur le projet',
          examples: ['8500.00', '22000.00', '45000.00'],
          nullable: true
        },
        {
          name: 'responsable_user_id',
          type: 'varchar',
          businessName: 'Chef de projet',
          description: 'Responsable principal du projet',
          examples: ['user-456', 'chef-projet-01'],
          nullable: false,
          relatedTo: 'users.id'
        },
        {
          name: 'offer_id',
          type: 'varchar',
          businessName: 'Offre source',
          description: 'Offre commerciale ayant généré ce projet',
          examples: ['OFF-2025-001', 'OFF-2025-047'],
          nullable: true,
          relatedTo: 'offers.id'
        }
      ],
      relations: [
        {
          targetTable: 'offers',
          type: 'many_to_one',
          description: 'Projet créé depuis une offre signée'
        },
        {
          targetTable: 'project_timelines',
          type: 'one_to_many',
          description: 'Planning détaillé et jalons du projet'
        },
        {
          targetTable: 'project_tasks',
          type: 'one_to_many',
          description: 'Tâches et activités du projet'
        },
        {
          targetTable: 'validation_milestones',
          type: 'one_to_many',
          description: 'Jalons de validation et contrôles qualité'
        }
      ],
      indexes: ['idx_projects_status', 'idx_projects_responsable', 'idx_projects_echeance'],
      commonQueries: [
        'Projets en retard sur planning',
        'Charge par chef de projet',
        'Projets en phase chantier',
        'Rentabilité par projet'
      ],
      sqlExamples: [
        {
          description: 'Projets en retard avec responsables',
          sql: `SELECT p.id, p.date_echeance, u.name as chef_projet, 
                  DATE_PART('day', p.date_echeance - NOW()) as jours_retard
                FROM projects p
                JOIN users u ON p.responsable_user_id = u.id
                WHERE p.date_echeance < NOW() 
                  AND p.status NOT IN ('termine', 'sav')
                ORDER BY jours_retard DESC`,
          explanation: 'Identifie tous les projets en retard avec nombre de jours et responsables'
        },
        {
          description: 'Rentabilité moyenne par type de projet',
          sql: `SELECT 
                  p.project_type,
                  AVG((p.actual_margin / p.price_total) * 100) as marge_moyenne_pct,
                  COUNT(*) as nb_projets
                FROM projects p
                WHERE p.status = 'termine' 
                  AND p.price_total > 0
                GROUP BY p.project_type
                ORDER BY marge_moyenne_pct DESC`,
          explanation: 'Analyse la marge moyenne réalisée par type de projet terminé'
        }
      ]
    };

    // Table AOS - Appels d'offres
    metadata.tables.aos = {
      tableName: 'aos',
      businessName: 'Appels d\'offres',
      description: 'Opportunités commerciales reçues (marchés publics et privés)',
      domain: ['commercial'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'Référence AO',
          description: 'Identifiant unique de l\'appel d\'offres',
          examples: ['AO-2025-001', 'AO-2025-156', 'ao-mairie-paris'],
          nullable: false,
          constraints: ['PRIMARY KEY']
        },
        {
          name: 'title',
          type: 'text',
          businessName: 'Titre AO',
          description: 'Libellé complet de l\'appel d\'offres',
          examples: ['Rénovation menuiseries lycée Bonaparte', 'Remplacement fenêtres mairie'],
          nullable: false
        },
        {
          name: 'deadline',
          type: 'timestamp',
          businessName: 'Date limite dépôt',
          description: 'Date limite de remise des offres',
          examples: ['2025-03-31T12:00:00Z', '2025-05-15T14:00:00Z'],
          nullable: false
        },
        {
          name: 'estimated_budget',
          type: 'decimal(12,2)',
          businessName: 'Budget estimé',
          description: 'Enveloppe budgétaire estimée de l\'AO',
          examples: ['250000.00', '500000.00', '1200000.00'],
          nullable: true
        },
        {
          name: 'market_type',
          type: 'enum',
          businessName: 'Type de marché',
          description: 'Catégorie du marché (public, privé, restreint, etc.)',
          examples: ['public', 'prive', 'ao_restreint'],
          nullable: false
        }
      ],
      relations: [
        {
          targetTable: 'offers',
          type: 'one_to_many',
          description: 'AO peut générer plusieurs variantes d\'offres'
        },
        {
          targetTable: 'ao_documents',
          type: 'one_to_many',
          description: 'Documents associés (CCTP, plans, etc.)'
        }
      ],
      indexes: ['idx_aos_deadline', 'idx_aos_market_type'],
      commonQueries: [
        'AO proches échéance',
        'AO par type de marché',
        'Taux de réponse aux AO'
      ],
      sqlExamples: [
        {
          description: 'AO urgents (échéance < 7 jours)',
          sql: `SELECT id, title, deadline, 
                  DATE_PART('day', deadline - NOW()) as jours_restants
                FROM aos
                WHERE deadline > NOW() 
                  AND deadline <= NOW() + INTERVAL '7 days'
                ORDER BY deadline ASC`,
          explanation: 'Liste les appels d\'offres dont la date limite approche'
        }
      ]
    };

    // Plus de tables enrichies...
    await this.enrichRemainingTables(metadata);
    
    return metadata;
  }

  /**
   * Enrichit les tables restantes avec métadonnées
   */
  private async enrichRemainingTables(metadata: any): Promise<void> {
    // Table SUPPLIERS - Fournisseurs
    metadata.tables.suppliers = {
      tableName: 'suppliers',
      businessName: 'Fournisseurs',
      description: 'Base fournisseurs pour matériaux et prestations menuiserie',
      domain: ['achat', 'fournisseur'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'Code fournisseur',
          description: 'Identifiant unique du fournisseur',
          examples: ['SUPP-001', 'REHAU-FR', 'TECHNAL-01'],
          nullable: false,
          constraints: ['PRIMARY KEY']
        },
        {
          name: 'name',
          type: 'varchar',
          businessName: 'Raison sociale',
          description: 'Nom commercial du fournisseur',
          examples: ['REHAU SAS', 'TECHNAL', 'FERIMAT'],
          nullable: false
        },
        {
          name: 'specialty',
          type: 'text',
          businessName: 'Spécialité',
          description: 'Domaine de spécialisation du fournisseur',
          examples: ['Profilés PVC', 'Systèmes aluminium', 'Vitrages isolants'],
          nullable: true
        },
        {
          name: 'lead_time_days',
          type: 'integer',
          businessName: 'Délai livraison (jours)',
          description: 'Délai de livraison moyen en jours',
          examples: ['15', '21', '30'],
          nullable: true
        }
      ],
      relations: [
        {
          targetTable: 'supplier_quote_sessions',
          type: 'one_to_many',
          description: 'Sessions de consultation fournisseur'
        }
      ],
      indexes: ['idx_suppliers_name'],
      commonQueries: [
        'Fournisseurs par délai de livraison',
        'Performance fournisseurs'
      ],
      sqlExamples: [
        {
          description: 'Fournisseurs avec délais courts',
          sql: `SELECT name, specialty, lead_time_days
                FROM suppliers
                WHERE lead_time_days <= 15
                ORDER BY lead_time_days ASC`,
          explanation: 'Liste les fournisseurs pouvant livrer rapidement (≤ 15 jours)'
        }
      ]
    };

    // Table PROJECT_TIMELINES - Plannings projets
    metadata.tables.project_timelines = {
      tableName: 'project_timelines',
      businessName: 'Plannings projets',
      description: 'Jalons et échéances détaillés des projets',
      domain: ['planning', 'temporel'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'ID timeline',
          description: 'Identifiant unique du jalon',
          examples: ['TL-001', 'timeline-prj-001-phase1'],
          nullable: false
        },
        {
          name: 'project_id',
          type: 'varchar',
          businessName: 'Projet associé',
          description: 'Référence du projet parent',
          examples: ['PRJ-2025-001'],
          nullable: false,
          relatedTo: 'projects.id'
        },
        {
          name: 'phase_name',
          type: 'varchar',
          businessName: 'Nom de la phase',
          description: 'Libellé de la phase projet',
          examples: ['Étude technique', 'VISA Architecte', 'Livraison matériaux'],
          nullable: false
        },
        {
          name: 'start_date',
          type: 'timestamp',
          businessName: 'Date début',
          description: 'Date de début prévue de la phase',
          examples: ['2025-04-01', '2025-05-15'],
          nullable: false
        },
        {
          name: 'end_date',
          type: 'timestamp',
          businessName: 'Date fin',
          description: 'Date de fin prévue de la phase',
          examples: ['2025-04-15', '2025-06-01'],
          nullable: false
        },
        {
          name: 'actual_end_date',
          type: 'timestamp',
          businessName: 'Date fin réelle',
          description: 'Date de fin effectivement réalisée',
          examples: ['2025-04-18', '2025-06-05'],
          nullable: true
        }
      ],
      relations: [
        {
          targetTable: 'projects',
          type: 'many_to_one',
          description: 'Timeline appartient à un projet'
        }
      ],
      indexes: ['idx_timelines_project', 'idx_timelines_dates'],
      commonQueries: [
        'Phases en retard',
        'Planning hebdomadaire global'
      ],
      sqlExamples: [
        {
          description: 'Phases en cours cette semaine',
          sql: `SELECT pt.phase_name, p.id as projet, pt.end_date
                FROM project_timelines pt
                JOIN projects p ON pt.project_id = p.id
                WHERE pt.start_date <= NOW()
                  AND pt.end_date >= NOW()
                  AND pt.actual_end_date IS NULL
                ORDER BY pt.end_date ASC`,
          explanation: 'Montre toutes les phases actuellement actives'
        }
      ]
    };

    // Table DATE_ALERTS - Alertes temporelles
    metadata.tables.date_alerts = {
      tableName: 'date_alerts',
      businessName: 'Alertes temporelles',
      description: 'Système d\'alertes sur dates et échéances critiques',
      domain: ['temporel', 'alertes'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'ID alerte',
          description: 'Identifiant unique de l\'alerte',
          examples: ['ALERT-001', 'alert-retard-prj-001'],
          nullable: false
        },
        {
          name: 'entity_type',
          type: 'varchar',
          businessName: 'Type entité',
          description: 'Type d\'objet concerné (project, offer, ao)',
          examples: ['project', 'offer', 'ao'],
          nullable: false
        },
        {
          name: 'entity_id',
          type: 'varchar',
          businessName: 'Référence entité',
          description: 'ID de l\'entité concernée',
          examples: ['PRJ-2025-001', 'OFF-2025-047'],
          nullable: false
        },
        {
          name: 'alert_type',
          type: 'varchar',
          businessName: 'Type alerte',
          description: 'Catégorie d\'alerte temporelle',
          examples: ['retard_livraison', 'echeance_proche', 'jalon_depasse'],
          nullable: false
        },
        {
          name: 'severity',
          type: 'varchar',
          businessName: 'Sévérité',
          description: 'Niveau de criticité (low, medium, high, critical)',
          examples: ['high', 'critical', 'medium'],
          nullable: false
        },
        {
          name: 'days_offset',
          type: 'integer',
          businessName: 'Jours de décalage',
          description: 'Nombre de jours de retard/avance',
          examples: ['-5', '10', '3'],
          nullable: true
        }
      ],
      relations: [],
      indexes: ['idx_alerts_entity', 'idx_alerts_severity'],
      commonQueries: [
        'Alertes critiques actives',
        'Retards par projet'
      ],
      sqlExamples: [
        {
          description: 'Alertes critiques non traitées',
          sql: `SELECT da.*, p.id as projet, p.responsable_user_id
                FROM date_alerts da
                LEFT JOIN projects p ON da.entity_id = p.id AND da.entity_type = 'project'
                WHERE da.severity IN ('high', 'critical')
                  AND da.resolved_at IS NULL
                ORDER BY da.created_at DESC`,
          explanation: 'Liste toutes les alertes critiques nécessitant une action'
        }
      ]
    };

    // Table BUSINESS_ALERTS - Alertes métier
    metadata.tables.business_alerts = {
      tableName: 'business_alerts',
      businessName: 'Alertes métier',
      description: 'Alertes sur indicateurs métier et seuils KPI',
      domain: ['alertes', 'kpi'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'ID alerte métier',
          description: 'Identifiant unique de l\'alerte métier',
          examples: ['BIZ-ALERT-001'],
          nullable: false
        },
        {
          name: 'metric_name',
          type: 'varchar',
          businessName: 'Indicateur',
          description: 'Nom de l\'indicateur métier surveillé',
          examples: ['taux_transformation', 'marge_moyenne', 'delai_moyen'],
          nullable: false
        },
        {
          name: 'threshold_value',
          type: 'decimal',
          businessName: 'Seuil déclenché',
          description: 'Valeur seuil qui a déclenché l\'alerte',
          examples: ['15.0', '30000', '0.75'],
          nullable: false
        },
        {
          name: 'actual_value',
          type: 'decimal',
          businessName: 'Valeur constatée',
          description: 'Valeur réelle mesurée',
          examples: ['12.5', '25000', '0.65'],
          nullable: false
        }
      ],
      relations: [],
      indexes: ['idx_business_alerts_metric'],
      commonQueries: [
        'KPIs hors seuils',
        'Tendances alertes métier'
      ],
      sqlExamples: [
        {
          description: 'Alertes KPI actives',
          sql: `SELECT metric_name, threshold_value, actual_value,
                  (actual_value - threshold_value) as ecart
                FROM business_alerts
                WHERE created_at >= NOW() - INTERVAL '7 days'
                ORDER BY ABS(actual_value - threshold_value) DESC`,
          explanation: 'Montre les écarts par rapport aux seuils définis'
        }
      ]
    };

    // Table CHIFFRAGE_ELEMENTS
    metadata.tables.chiffrage_elements = {
      tableName: 'chiffrage_elements',
      businessName: 'Éléments de chiffrage',
      description: 'Détail des éléments DPGF pour chiffrage précis',
      domain: ['financier', 'chiffrage'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'ID élément',
          description: 'Identifiant unique de l\'élément de chiffrage',
          examples: ['CHIFF-001', 'element-dpgf-001'],
          nullable: false
        },
        {
          name: 'offer_id',
          type: 'varchar',
          businessName: 'Offre associée',
          description: 'Référence de l\'offre contenant cet élément',
          examples: ['OFF-2025-001'],
          nullable: false,
          relatedTo: 'offers.id'
        },
        {
          name: 'designation',
          type: 'text',
          businessName: 'Désignation',
          description: 'Libellé détaillé de l\'élément',
          examples: ['Fenêtre PVC 2 vantaux 120x140', 'Porte-fenêtre alu coulissante 240x215'],
          nullable: false
        },
        {
          name: 'quantity',
          type: 'decimal',
          businessName: 'Quantité',
          description: 'Nombre d\'unités',
          examples: ['12', '25', '8.5'],
          nullable: false
        },
        {
          name: 'unit_price',
          type: 'decimal(10,2)',
          businessName: 'Prix unitaire HT',
          description: 'Prix à l\'unité hors taxes',
          examples: ['450.00', '1250.00', '850.00'],
          nullable: false
        },
        {
          name: 'total_price',
          type: 'decimal(12,2)',
          businessName: 'Prix total HT',
          description: 'Montant total ligne (quantité × prix unitaire)',
          examples: ['5400.00', '31250.00', '7225.00'],
          nullable: false
        }
      ],
      relations: [
        {
          targetTable: 'offers',
          type: 'many_to_one',
          description: 'Élément appartient à une offre'
        }
      ],
      indexes: ['idx_chiffrage_offer'],
      commonQueries: [
        'Détail chiffrage par offre',
        'Top éléments par valeur'
      ],
      sqlExamples: [
        {
          description: 'Synthèse chiffrage par offre',
          sql: `SELECT o.id as offre, 
                  COUNT(ce.id) as nb_lignes,
                  SUM(ce.total_price) as montant_total_ht
                FROM offers o
                LEFT JOIN chiffrage_elements ce ON ce.offer_id = o.id
                WHERE o.status = 'en_cours_chiffrage'
                GROUP BY o.id
                ORDER BY montant_total_ht DESC`,
          explanation: 'Récapitulatif des montants chiffrés par offre en cours'
        }
      ]
    };

    // Table TEAM_RESOURCES  
    metadata.tables.team_resources = {
      tableName: 'team_resources',
      businessName: 'Ressources équipes',
      description: 'Gestion des ressources humaines BE et chantier',
      domain: ['ressources', 'planning'],
      columns: [
        {
          name: 'id',
          type: 'varchar',
          businessName: 'ID ressource',
          description: 'Identifiant unique de la ressource',
          examples: ['RES-001', 'team-be-01'],
          nullable: false
        },
        {
          name: 'user_id',
          type: 'varchar',
          businessName: 'Collaborateur',
          description: 'Référence du collaborateur',
          examples: ['user-123', 'tech-be-01'],
          nullable: false,
          relatedTo: 'users.id'
        },
        {
          name: 'team_type',
          type: 'varchar',
          businessName: 'Type équipe',
          description: 'Catégorie d\'équipe (BE, chantier, commercial)',
          examples: ['BE', 'chantier', 'commercial'],
          nullable: false
        },
        {
          name: 'availability_percentage',
          type: 'integer',
          businessName: 'Disponibilité %',
          description: 'Pourcentage de disponibilité actuelle',
          examples: ['100', '75', '50'],
          nullable: false
        },
        {
          name: 'current_load',
          type: 'integer',
          businessName: 'Charge actuelle %',
          description: 'Taux de charge actuel en pourcentage',
          examples: ['80', '120', '60'],
          nullable: false
        }
      ],
      relations: [
        {
          targetTable: 'users',
          type: 'many_to_one',
          description: 'Ressource liée à un utilisateur'
        },
        {
          targetTable: 'project_tasks',
          type: 'one_to_many',
          description: 'Tâches assignées à la ressource'
        }
      ],
      indexes: ['idx_resources_team', 'idx_resources_load'],
      commonQueries: [
        'Charge équipe BE',
        'Disponibilités par équipe'
      ],
      sqlExamples: [
        {
          description: 'Charge de l\'équipe BE',
          sql: `SELECT u.name, tr.current_load, tr.availability_percentage
                FROM team_resources tr
                JOIN users u ON tr.user_id = u.id
                WHERE tr.team_type = 'BE'
                  AND tr.current_load > 80
                ORDER BY tr.current_load DESC`,
          explanation: 'Identifie les membres du BE en surcharge (>80%)'
        }
      ]
    };

    logger.info('Métadonnées enrichies générées', {
      metadata: {
        service: 'BusinessContextService',
        operation: 'getEnrichedSchemaMetadata',
        tablesCount: Object.keys(metadata.tables).length
      }
    });
  }

  /**
   * Dictionnaire métier JLM complet
   */
  private getJLMBusinessDictionary(): Record<string, string> {
    return {
      // Termes métier → Tables SQL
      'devis': 'offers',
      'offre': 'offers',
      'proposition': 'offers',
      'chantier': 'projects',
      'projet': 'projects',
      'réalisation': 'projects',
      'AO': 'aos',
      'appel d\'offres': 'aos',
      'consultation': 'aos',
      'marché': 'aos',
      'planning': 'project_timelines',
      'échéancier': 'project_timelines',
      'jalons': 'project_timelines',
      'calendrier': 'project_timelines',
      'fournisseur': 'suppliers',
      'sous-traitant': 'suppliers',
      'prestataire': 'suppliers',
      'équipe BE': 'team_resources WHERE team_type=\'BE\'',
      'bureau d\'études': 'team_resources WHERE team_type=\'BE\'',
      'équipe chantier': 'team_resources WHERE team_type=\'chantier\'',
      'retard': 'date_alerts WHERE alert_type LIKE \'%retard%\'',
      'alerte': 'date_alerts OR business_alerts',
      'dépassement': 'date_alerts WHERE alert_type=\'depassement\'',
      'chiffrage': 'chiffrage_elements',
      'DPGF': 'chiffrage_elements',
      'bordereau': 'chiffrage_elements',
      'validation': 'validation_milestones',
      'contrôle': 'validation_milestones',
      'VISA': 'validation_milestones WHERE milestone_type=\'visa_architecte\'',
      
      // Statuts métier → Valeurs enum
      'en cours': 'IN (\'en_cours\', \'etude\', \'chantier\')',
      'terminé': '= \'termine\'',
      'validé': '= \'valide\'',
      'signé': '= \'signe\'',
      'en attente': 'LIKE \'%attente%\'',
      'urgent': 'WITH HIGH PRIORITY OR critical severity',
      
      // Indicateurs métier
      'rentabilité': '(actual_margin / price_total * 100)',
      'marge': 'margin_percentage OR actual_margin',
      'taux de transformation': 'COUNT(status=\'signe\') / COUNT(*)',
      'charge de travail': 'current_load',
      'disponibilité': 'availability_percentage'
    };
  }

  /**
   * Contextes spécialisés par domaine métier
   */
  private getDomainSpecializedContexts(): Record<string, any> {
    return {
      financier: {
        description: 'Contexte pour analyses financières et chiffrage',
        tables: ['offers', 'projects', 'chiffrage_elements'],
        key_columns: ['price_total', 'estimated_amount', 'actual_margin', 'margin_percentage', 'unit_price'],
        aggregations: ['SUM', 'AVG', 'MIN', 'MAX'],
        business_rules: [
          'Marge minimale cible: 15%',
          'Seuil rentabilité projet: margin > 0',
          'Alerte si dépassement budget > 10%'
        ],
        sample_queries: [
          'Rentabilité par type de projet',
          'Évolution des marges mensuelles',
          'Top 10 projets par valeur'
        ]
      },
      
      temporel: {
        description: 'Contexte pour planning et gestion des délais',
        tables: ['project_timelines', 'date_alerts', 'projects', 'aos'],
        key_columns: ['start_date', 'end_date', 'actual_end_date', 'date_echeance', 'deadline'],
        functions: ['DATE_PART', 'INTERVAL', 'NOW()', 'DATE_TRUNC'],
        business_rules: [
          'Alerte retard si actual_end_date > end_date',
          'Notification J-7 avant échéance',
          'Escalade si retard > 15 jours'
        ],
        sample_queries: [
          'Projets en retard cette semaine',
          'Planning charge sur 3 mois',
          'Jalons critiques du mois'
        ]
      },
      
      ressources: {
        description: 'Contexte pour gestion des équipes et charge',
        tables: ['team_resources', 'users', 'project_tasks'],
        key_columns: ['current_load', 'availability_percentage', 'team_type'],
        business_rules: [
          'Alerte surcharge si load > 100%',
          'Équilibrage charge entre équipes',
          'Priorisation par compétence'
        ],
        sample_queries: [
          'Charge BE par personne',
          'Disponibilités équipe chantier',
          'Répartition tâches par équipe'
        ]
      },
      
      fournisseurs: {
        description: 'Contexte pour achats et consultations fournisseurs',
        tables: ['suppliers', 'supplier_quote_sessions', 'supplier_documents', 'supplier_quote_analysis'],
        key_columns: ['lead_time_days', 'quote_amount', 'supplier_id'],
        business_rules: [
          'Consultation minimum 3 fournisseurs',
          'Délai commande = lead_time + 5 jours sécurité',
          'Scoring fournisseur sur prix/délai/qualité'
        ],
        sample_queries: [
          'Comparatif devis fournisseurs',
          'Performance délais par fournisseur',
          'Historique prix matériaux'
        ]
      },
      
      qualite: {
        description: 'Contexte pour validations et conformité',
        tables: ['validation_milestones', 'business_alerts', 'date_alerts'],
        key_columns: ['milestone_type', 'status', 'severity', 'validation_status'],
        business_rules: [
          'Validation BE obligatoire avant commande',
          'VISA architecte requis avant chantier',
          'Contrôle conformité DTU systematique'
        ],
        sample_queries: [
          'Validations en attente',
          'Taux de non-conformité',
          'Délais moyens validation'
        ]
      }
    };
  }

  /**
   * Système de synonymes métier enrichi
   */
  private getEnrichedBusinessSynonyms(): Record<string, string> {
    return {
      // Synonymes français → SQL
      'devis': 'offers',
      'offre': 'offers',
      'offres': 'offers',
      'proposition': 'offers',
      'propositions': 'offers',
      
      'chantier': 'projects',
      'chantiers': 'projects',
      'projet': 'projects',
      'projets': 'projects',
      'réalisation': 'projects',
      'réalisations': 'projects',
      'affaire': 'projects',
      'affaires': 'projects',
      
      'appel d\'offres': 'aos',
      'appels d\'offres': 'aos',
      'AO': 'aos',
      'consultation': 'aos',
      'consultations': 'aos',
      'marché': 'aos',
      'marchés': 'aos',
      'tender': 'aos',
      
      'planning': 'project_timelines',
      'plannings': 'project_timelines',
      'calendrier': 'project_timelines',
      'échéancier': 'project_timelines',
      'jalons': 'project_timelines',
      'phases': 'project_timelines',
      
      'fournisseur': 'suppliers',
      'fournisseurs': 'suppliers',
      'sous-traitant': 'suppliers',
      'sous-traitants': 'suppliers',
      'prestataire': 'suppliers',
      'prestataires': 'suppliers',
      'partenaire': 'suppliers',
      
      'équipe BE': 'team_resources',
      'bureau d\'études': 'team_resources',
      'technicien': 'team_resources',
      'techniciens': 'team_resources',
      'équipe': 'team_resources',
      'équipes': 'team_resources',
      'ressource': 'team_resources',
      'ressources': 'team_resources',
      
      'retard': 'date_alerts',
      'retards': 'date_alerts',
      'alerte': 'alerts',
      'alertes': 'alerts',
      'dépassement': 'date_alerts',
      'dépassements': 'date_alerts',
      'échéance': 'date_alerts',
      'échéances': 'date_alerts',
      
      'chiffrage': 'chiffrage_elements',
      'chiffrages': 'chiffrage_elements',
      'DPGF': 'chiffrage_elements',
      'bordereau': 'chiffrage_elements',
      'devis détaillé': 'chiffrage_elements',
      'lignes de chiffrage': 'chiffrage_elements',
      
      'validation': 'validation_milestones',
      'validations': 'validation_milestones',
      'contrôle': 'validation_milestones',
      'contrôles': 'validation_milestones',
      'VISA': 'validation_milestones',
      'jalon': 'validation_milestones',
      
      // Termes d'action → Clauses SQL
      'en retard': 'WHERE date_echeance < NOW()',
      'urgent': 'WHERE severity = \'critical\' OR priority = \'high\'',
      'cette semaine': 'WHERE date >= DATE_TRUNC(\'week\', NOW())',
      'ce mois': 'WHERE date >= DATE_TRUNC(\'month\', NOW())',
      'trimestre': 'WHERE date >= DATE_TRUNC(\'quarter\', NOW())',
      'en cours': 'WHERE status NOT IN (\'termine\', \'archive\', \'annule\')',
      'terminé': 'WHERE status = \'termine\'',
      'validé': 'WHERE status = \'valide\' OR validation_status = \'approved\'',
      'à valider': 'WHERE status = \'en_attente_validation\'',
      'signé': 'WHERE status = \'signe\'',
      
      // Métriques métier
      'rentabilité': '(actual_margin / price_total * 100) as rentabilite_pct',
      'marge': 'margin_percentage',
      'charge': 'current_load',
      'disponibilité': 'availability_percentage',
      'taux de transformation': '(COUNT(CASE WHEN status = \'signe\' THEN 1 END)::float / COUNT(*) * 100)',
      'délai moyen': 'AVG(DATE_PART(\'day\', end_date - start_date))'
    };
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
   * Méthode spéciale pour intégration avec SQLEngineService - VERSION ENRICHIE PHASE 3
   * Analyse intelligente du domaine et génération de contexte optimisé
   */
  async buildIntelligentContextForSQL(
    userId: string,
    userRole: string,
    naturalLanguageQuery: string
  ): Promise<string> {
    try {
      const startTime = Date.now();
      
      // 1. Détection intelligente du domaine et des entités
      const queryAnalysis = this.analyzeQueryDomain(naturalLanguageQuery);
      
      // 2. Vérification cache avec clé enrichie
      const cacheKey = `sql_context_${userRole}_${queryAnalysis.primaryDomain}_${crypto.createHash('md5').update(naturalLanguageQuery.toLowerCase()).digest('hex')}`;
      const cachedContext = await this.getCachedSQLContext(cacheKey);
      if (cachedContext) {
        logger.info('Cache SQL hit', {
          metadata: {
            service: 'BusinessContextService',
            operation: 'buildIntelligentContextForSQL',
            domain: queryAnalysis.primaryDomain,
            cacheKey
          }
        });
        return cachedContext;
      }
      
      // 3. Récupération des métadonnées enrichies
      const enrichedMetadata = await this.getEnrichedSchemaMetadata();
      
      // 4. Construction du contexte spécialisé par domaine
      const contextSections: string[] = [];
      
      // Header avec version et domaine
      contextSections.push('=== CONTEXTE SQL INTELLIGENT JLM V3 ===');
      contextSections.push(`Domaine principal: ${queryAnalysis.primaryDomain}`);
      contextSections.push(`Entités détectées: ${queryAnalysis.detectedEntities.join(', ')}`);
      contextSections.push(`Rôle utilisateur: ${userRole}`);
      contextSections.push('');
      
      // 5. Synonymes métier pertinents
      contextSections.push('=== SYNONYMES MÉTIER ===');
      const relevantSynonyms = this.getRelevantSynonyms(queryAnalysis.keywords);
      relevantSynonyms.forEach(syn => {
        contextSections.push(`"${syn.business}" → ${syn.sql}`);
      });
      contextSections.push('');
      
      // 6. Tables pertinentes avec métadonnées enrichies
      contextSections.push('=== TABLES PERTINENTES ===');
      const relevantTables = this.selectRelevantTables(queryAnalysis, enrichedMetadata.tables);
      
      for (const tableName of relevantTables) {
        const table = enrichedMetadata.tables[tableName];
        if (!table) continue;
        
        contextSections.push(`\nTABLE: ${table.businessName} (${table.tableName})`);
        contextSections.push(`Description: ${table.description}`);
        contextSections.push('Colonnes clés:');
        
        // Colonnes filtrées selon le domaine et le rôle
        const relevantColumns = this.filterColumnsForRole(table.columns, userRole, queryAnalysis.primaryDomain);
        relevantColumns.forEach(col => {
          const examples = col.examples ? ` Ex: [${col.examples.slice(0, 2).join(', ')}]` : '';
          contextSections.push(`  - ${col.businessName} (${col.name}): ${col.type}${examples}`);
        });
        
        // Relations importantes
        if (table.relations.length > 0) {
          contextSections.push('Relations:');
          table.relations.slice(0, 3).forEach(rel => {
            contextSections.push(`  - ${rel.type} avec ${rel.targetTable}: ${rel.description}`);
          });
        }
        
        // Index pour optimisation
        if (table.indexes && table.indexes.length > 0) {
          contextSections.push(`Index disponibles: ${table.indexes.join(', ')}`);
        }
      }
      contextSections.push('');
      
      // 7. Contexte spécialisé du domaine
      const domainContext = enrichedMetadata.domainContexts[queryAnalysis.primaryDomain];
      if (domainContext) {
        contextSections.push(`=== CONTEXTE DOMAINE: ${queryAnalysis.primaryDomain.toUpperCase()} ===`);
        contextSections.push(`Description: ${domainContext.description}`);
        
        if (domainContext.business_rules) {
          contextSections.push('Règles métier:');
          domainContext.business_rules.forEach((rule: string) => {
            contextSections.push(`  - ${rule}`);
          });
        }
        
        if (domainContext.key_columns) {
          contextSections.push(`Colonnes clés du domaine: ${domainContext.key_columns.join(', ')}`);
        }
        
        if (domainContext.aggregations) {
          contextSections.push(`Agrégations courantes: ${domainContext.aggregations.join(', ')}`);
        }
        contextSections.push('');
      }
      
      // 8. Exemples SQL pertinents
      contextSections.push('=== EXEMPLES SQL PERTINENTS ===');
      const relevantExamples = await this.selectRelevantSQLExamples(queryAnalysis, enrichedMetadata.tables, relevantTables);
      
      relevantExamples.forEach(example => {
        contextSections.push(`\n// ${example.description}`);
        contextSections.push(example.sql);
        contextSections.push(`// Explication: ${example.explanation}`);
      });
      contextSections.push('');
      
      // 9. Jointures recommandées
      contextSections.push('=== JOINTURES RECOMMANDÉES ===');
      const recommendedJoins = this.getRecommendedJoins(relevantTables, enrichedMetadata.tables);
      recommendedJoins.forEach(join => {
        contextSections.push(join);
      });
      contextSections.push('');
      
      // 10. Contraintes RBAC
      contextSections.push('=== CONTRAINTES DE SÉCURITÉ ===');
      const rbacConstraints = await this.getRBACConstraintsForSQL(userId, userRole, relevantTables);
      rbacConstraints.forEach(constraint => {
        contextSections.push(constraint);
      });
      contextSections.push('');
      
      // 11. Hints d'optimisation
      contextSections.push('=== HINTS D\'OPTIMISATION ===');
      contextSections.push('- Utiliser les index disponibles pour les jointures');
      contextSections.push('- Limiter les résultats avec LIMIT pour les requêtes exploratoires');
      contextSections.push('- Préférer les filtres sur colonnes indexées');
      if (queryAnalysis.primaryDomain === 'temporel') {
        contextSections.push('- Utiliser DATE_TRUNC pour grouper par période');
        contextSections.push('- Indexer sur les colonnes de dates pour performance');
      }
      if (queryAnalysis.primaryDomain === 'financier') {
        contextSections.push('- Arrondir les montants avec ROUND() pour lisibilité');
        contextSections.push('- Vérifier price_total > 0 avant calcul de ratios');
      }
      
      const finalContext = contextSections.join('\n');
      
      // 12. Mise en cache du contexte généré
      await this.cacheSQLContext(cacheKey, finalContext, 30); // Cache 30 minutes
      
      logger.info('Contexte SQL enrichi généré', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'buildIntelligentContextForSQL',
          domain: queryAnalysis.primaryDomain,
          tablesIncluded: relevantTables.length,
          examplesIncluded: relevantExamples.length,
          generationTime: Date.now() - startTime,
          contextSize: finalContext.length
        }
      });
      
      return finalContext;
      
    } catch (error) {
      logger.error('Erreur contexte SQL enrichi', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'buildIntelligentContextForSQL',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Fallback vers méthode basique
      return "Contexte métier JLM: tables offers, projects, aos, suppliers disponibles. Utilisez les jointures standards.";
    }
  }

  /**
   * Analyse le domaine métier de la requête
   */
  private analyzeQueryDomain(query: string): {
    primaryDomain: string;
    secondaryDomains: string[];
    detectedEntities: string[];
    keywords: string[];
    complexity: 'simple' | 'medium' | 'complex';
  } {
    const queryLower = query.toLowerCase();
    const analysis = {
      primaryDomain: 'general',
      secondaryDomains: [] as string[],
      detectedEntities: [] as string[],
      keywords: [] as string[],
      complexity: 'simple' as 'simple' | 'medium' | 'complex'
    };
    
    // Détection des domaines
    const domainPatterns = {
      financier: /\b(montant|prix|coût|budget|marge|rentabilité|chiffr|devis|factur|total|somme|moyenne|€)\b/i,
      temporel: /\b(date|délai|retard|planning|calendrier|semaine|mois|année|échéance|jalon|phase|période|aujourd|demain|hier)\b/i,
      ressources: /\b(équipe|ressource|charge|disponibilité|capacité|be|bureau|technicien|employé|collaborateur)\b/i,
      fournisseurs: /\b(fournisseur|devis|consultation|livraison|commande|achat|sous-traitant|prestataire)\b/i,
      qualite: /\b(validation|contrôle|conformité|visa|qualité|alerte|critique|bloquant|erreur)\b/i,
      commercial: /\b(offre|ao|appel|marché|client|prospect|transformation|pipeline|commercial)\b/i,
      operationnel: /\b(projet|chantier|réalisation|avancement|statut|phase|étape|sav)\b/i
    };
    
    let maxScore = 0;
    for (const [domain, pattern] of Object.entries(domainPatterns)) {
      const matches = queryLower.match(pattern);
      if (matches) {
        const score = matches.length;
        if (score > maxScore) {
          if (analysis.primaryDomain !== 'general') {
            analysis.secondaryDomains.push(analysis.primaryDomain);
          }
          analysis.primaryDomain = domain;
          maxScore = score;
        } else if (score > 0) {
          analysis.secondaryDomains.push(domain);
        }
      }
    }
    
    // Détection des entités métier
    const entityPatterns = {
      offers: /\b(offre|devis|proposition|commercial)\b/i,
      projects: /\b(projet|chantier|réalisation|affaire)\b/i,
      aos: /\b(ao|appel|d'offre|consultation|marché)\b/i,
      suppliers: /\b(fournisseur|sous-traitant|prestataire)\b/i,
      timelines: /\b(planning|calendrier|échéancier|jalon)\b/i,
      alerts: /\b(alerte|retard|dépassement|critique)\b/i,
      resources: /\b(équipe|ressource|be|technicien)\b/i,
      chiffrage: /\b(chiffrage|dpgf|bordereau|ligne)\b/i
    };
    
    for (const [entity, pattern] of Object.entries(entityPatterns)) {
      if (pattern.test(queryLower)) {
        analysis.detectedEntities.push(entity);
      }
    }
    
    // Extraction des mots-clés significatifs
    const words = queryLower.split(/\s+/);
    const stopWords = ['le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'à', 'pour', 'dans', 'sur', 'avec', 'par'];
    analysis.keywords = words.filter(word => word.length > 3 && !stopWords.includes(word));
    
    // Évaluation de la complexité
    if (queryLower.includes('group by') || queryLower.includes('avg') || queryLower.includes('sum')) {
      analysis.complexity = 'complex';
    } else if (queryLower.includes('join') || analysis.detectedEntities.length > 2) {
      analysis.complexity = 'medium';
    }
    
    return analysis;
  }

  /**
   * Sélectionne les tables pertinentes selon l'analyse
   */
  private selectRelevantTables(
    queryAnalysis: any,
    allTables: Record<string, any>
  ): string[] {
    const relevantTables = new Set<string>();
    
    // Ajouter les entités directement détectées
    queryAnalysis.detectedEntities.forEach((entity: string) => {
      if (allTables[entity]) {
        relevantTables.add(entity);
      }
    });
    
    // Ajouter les tables du domaine principal
    const domainTables: Record<string, string[]> = {
      financier: ['offers', 'projects', 'chiffrage_elements'],
      temporel: ['project_timelines', 'date_alerts', 'projects'],
      ressources: ['team_resources', 'users', 'project_tasks'],
      fournisseurs: ['suppliers', 'supplier_quote_sessions'],
      qualite: ['validation_milestones', 'business_alerts'],
      commercial: ['offers', 'aos', 'projects'],
      operationnel: ['projects', 'project_tasks', 'project_timelines']
    };
    
    const primaryDomainTables = domainTables[queryAnalysis.primaryDomain] || ['projects', 'offers'];
    primaryDomainTables.forEach(table => relevantTables.add(table));
    
    // Limiter à 5 tables maximum pour ne pas surcharger le contexte
    return Array.from(relevantTables).slice(0, 5);
  }

  /**
   * Filtre les colonnes selon le rôle et le domaine
   */
  private filterColumnsForRole(columns: any[], userRole: string, domain: string): any[] {
    return columns.filter(col => {
      // Exclure les colonnes sensibles selon le rôle
      if (col.name.includes('margin') && userRole !== 'admin' && userRole !== 'chef_projet') {
        return false;
      }
      if (col.name.includes('cost') && userRole !== 'admin') {
        return false;
      }
      
      // Inclure les colonnes pertinentes pour le domaine
      if (domain === 'financier' && (col.name.includes('price') || col.name.includes('amount') || col.name.includes('margin'))) {
        return true;
      }
      if (domain === 'temporel' && (col.type.includes('timestamp') || col.name.includes('date'))) {
        return true;
      }
      
      // Colonnes de base toujours incluses
      return ['id', 'status', 'name', 'title'].some(base => col.name.includes(base));
    }).slice(0, 8); // Limiter à 8 colonnes max
  }

  /**
   * Sélectionne les exemples SQL pertinents
   */
  private async selectRelevantSQLExamples(
    queryAnalysis: any,
    allTables: Record<string, any>,
    relevantTables: string[]
  ): Promise<Array<{description: string; sql: string; explanation: string}>> {
    const examples: Array<{description: string; sql: string; explanation: string}> = [];
    
    // Collecter les exemples des tables pertinentes
    for (const tableName of relevantTables) {
      const table = allTables[tableName];
      if (table?.sqlExamples) {
        // Filtrer les exemples selon les mots-clés de la requête
        const relevantExamples = table.sqlExamples.filter((ex: any) => {
          const exampleText = `${ex.description} ${ex.sql}`.toLowerCase();
          return queryAnalysis.keywords.some((keyword: string) => exampleText.includes(keyword));
        });
        
        if (relevantExamples.length > 0) {
          examples.push(...relevantExamples.slice(0, 2)); // Max 2 exemples par table
        } else if (table.sqlExamples.length > 0) {
          examples.push(table.sqlExamples[0]); // Au moins 1 exemple par table
        }
      }
    }
    
    // Limiter à 5 exemples total
    return examples.slice(0, 5);
  }

  /**
   * Génère les jointures recommandées
   */
  private getRecommendedJoins(tables: string[], allTables: Record<string, any>): string[] {
    const joins: string[] = [];
    
    // Jointures standards
    if (tables.includes('projects') && tables.includes('offers')) {
      joins.push('projects p JOIN offers o ON p.offer_id = o.id');
    }
    if (tables.includes('offers') && tables.includes('aos')) {
      joins.push('offers o JOIN aos a ON o.ao_id = a.id');
    }
    if (tables.includes('projects') && tables.includes('project_timelines')) {
      joins.push('projects p JOIN project_timelines pt ON p.id = pt.project_id');
    }
    if (tables.includes('projects') && tables.includes('users')) {
      joins.push('projects p JOIN users u ON p.responsable_user_id = u.id');
    }
    
    return joins.slice(0, 3); // Max 3 jointures recommandées
  }

  /**
   * Récupère les contraintes RBAC pour le SQL
   */
  private async getRBACConstraintsForSQL(userId: string, userRole: string, tables: string[]): Promise<string[]> {
    const constraints: string[] = [];
    
    // Contraintes de base selon le rôle
    if (userRole !== 'admin') {
      constraints.push(`-- Accès limité selon le rôle: ${userRole}`);
      
      if (tables.includes('projects')) {
        if (userRole === 'chef_projet') {
          constraints.push('-- Filtrer projets: WHERE responsable_user_id = :userId OR team_id IN (SELECT team_id FROM user_teams WHERE user_id = :userId)');
        }
      }
      
      if (tables.includes('offers')) {
        if (userRole === 'commercial') {
          constraints.push('-- Filtrer offres: WHERE responsable_user_id = :userId');
        }
      }
      
      constraints.push('-- Colonnes sensibles masquées: actual_cost, internal_margin');
    } else {
      constraints.push('-- Accès complet administrateur');
    }
    
    return constraints;
  }

  /**
   * Récupère les synonymes pertinents
   */
  private getRelevantSynonyms(keywords: string[]): Array<{business: string; sql: string}> {
    const allSynonyms = this.getEnrichedBusinessSynonyms();
    const relevant: Array<{business: string; sql: string}> = [];
    
    for (const keyword of keywords) {
      for (const [business, sql] of Object.entries(allSynonyms)) {
        if (business.includes(keyword) || keyword.includes(business)) {
          relevant.push({ business, sql });
          if (relevant.length >= 10) break; // Max 10 synonymes
        }
      }
    }
    
    return relevant;
  }

  /**
   * Cache pour contextes SQL
   */
  private async cacheSQLContext(key: string, context: string, ttlMinutes: number): Promise<void> {
    try {
      // Cache en mémoire simplifié pour SQL
      this.memoryCache.set(key, {
        data: { contextData: context } as any,
        expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
        hitCount: 0
      });
    } catch (error) {
      // Non-bloquant
      logger.error('Erreur cache SQL', {
        metadata: {
          service: 'BusinessContextService',
          operation: 'cacheSQLContext',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Récupère un contexte SQL du cache
   */
  private async getCachedSQLContext(key: string): Promise<string | null> {
    try {
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiresAt > new Date()) {
        cached.hitCount++;
        return (cached.data as any).contextData || null;
      }
    } catch (error) {
      // Non-bloquant
    }
    return null;
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