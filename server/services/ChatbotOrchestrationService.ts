import { AIService } from "./AIService";
import { withErrorHandling } from './utils/error-handler';
import { RBACService } from "./RBACService";
import { SQLEngineService } from "./SQLEngineService";
import { logger } from '../utils/logger';
import { BusinessContextService } from "./BusinessContextService";
import { ActionExecutionService } from "./ActionExecutionService";
import { EventBus } from "../eventBus";
import { getTechnicalMetricsService } from "./consolidated/TechnicalMetricsService";
import type { IStorage } from "../storage-poc";
import { db } from "../db";
import { sql, eq, and, desc, gte, lte, asc } from "drizzle-orm";
import crypto from "crypto";
import type {
  ChatbotQueryRequest,
  ChatbotQueryResponse,
  ChatbotSuggestionsRequest,
  ChatbotSuggestionsResponse,
  ChatbotValidateRequest,
  ChatbotValidateResponse,
  ChatbotHistoryRequest,
  ChatbotHistoryResponse,
  ChatbotFeedbackRequest,
  ChatbotFeedbackResponse,
  ChatbotStatsRequest,
  ChatbotStatsResponse,
  InsertChatbotConversation,
  InsertChatbotFeedback,
  InsertChatbotUsageMetrics,
  ChatbotSuggestion,
  ChatbotConversation,
  ProposeActionRequest,
  ProposeActionResponse,
  ExecuteActionRequest,
  ExecuteActionResponse,
  ActionHistoryRequest,
  ActionHistoryResponse,
  UpdateConfirmationRequest
} from "@shared/schema";

import {
  chatbotConversations,
  chatbotFeedback,
  chatbotSuggestions,
  chatbotUsageMetrics
} from "@shared/schema";

// ========================================
// CONSTANTES DE CONFIGURATION CHATBOT
// ========================================

const PERFORMANCE_TARGET_MS = 3000; // 3 secondes objectif
const MAX_SUGGESTIONS_PER_ROLE = 20;
const CACHE_TTL_SUGGESTIONS_MINUTES = 30;
const RATE_LIMIT_PER_USER_PER_HOUR = 100;
const DEFAULT_HISTORY_LIMIT = 20;
const MAX_HISTORY_LIMIT = 100;

// Suggestions prédéfinies par rôle métier JLM
const DEFAULT_SUGGESTIONS_BY_ROLE = {
  admin: [
    "Quels sont les indicateurs de performance globaux ce mois ?",
    "Affiche-moi un résumé des alertes critiques",
    "Quels projets sont en retard et pourquoi ?",
    "Analyse la rentabilité par type de projet",
    "Montre-moi les tendances de charge BE"
  ],
  chef_projet: [
    "Mes projets en cours avec leurs échéances",
    "Les alertes de mes projets cette semaine", 
    "Prochaines livraisons matériaux attendues",
    "État d'avancement de mes chantiers",
    "Ressources disponibles pour nouveaux projets"
  ],
  be_manager: [
    "Charge actuelle de l'équipe BE",
    "Projets en attente de validation technique",
    "Alertes techniques non résolues",
    "Planning des validations cette semaine",
    "Projets nécessitant expertise spécialisée"
  ],
  commercial: [
    "Nouvelles opportunités ce mois",
    "État des offres en cours",
    "Taux de conversion AO vers offres",
    "Clients potentiels à relancer",
    "Performance commerciale par région"
  ]
};

// ========================================
// CLASSE PRINCIPALE SERVICE D'ORCHESTRATION CHATBOT
// ========================================

export class ChatbotOrchestrationService {
  private aiService: AIService;
  private rbacService: RBACService;
  private sqlEngineService: SQLEngineService;
  private businessContextService: BusinessContextService;
  private actionExecutionService: ActionExecutionService;
  private eventBus: EventBus;
  private storage: IStorage;
  private performanceMetrics: unknown;

  constructor(
    aiService: AIService,
    rbacService: RBACService,
    sqlEngineService: SQLEngineService,
    businessContextService: BusinessContextService,
    actionExecutionService: ActionExecutionService,
    eventBus: EventBus,
    storage: IStorage
  ) {
    this.aiService = aiService;
    this.rbacService = rbacService;
    this.sqlEngineService = sqlEngineService;
    this.businessContextService = businessContextService;
    this.actionExecutionService = actionExecutionService;
    this.eventBus = eventBus;
    this.storage = storage;
    this.performanceMetrics = getTechnicalMetricsService(storage);
  }

  // ========================================
  // MÉTHODE PRINCIPALE - PIPELINE CHATBOT AVEC PARALLÉLISME PAR DÉFAUT
  // ========================================

  /**
   * Méthode principale du chatbot qui utilise le dispatch parallèle par défaut
   * ÉTAPE 2 PHASE 3 PERFORMANCE : Réduction latence de ~3-7s → ~2.5s max
   */
  async processChatbotQuery(request: ChatbotQueryRequest): Promise<ChatbotQueryResponse> {
    // Utilise la version parallèle par défaut
    return await this.processQueryParallel(request);
  }

  // ========================================
  // MÉTHODE OPTIMISÉE PARALLÈLE - ÉTAPE 2 PHASE 3 PERFORMANCE
  // ========================================

  /**
   * Pipeline optimisé avec dispatch parallèle : Contexte + Modèle simultané
   * OBJECTIF : Réduction latence de ~3-7s → ~2.5s max pour contexte+modèle
   */
  async processQueryParallel(request: ChatbotQueryRequest): Promise<ChatbotQueryResponse> {
    const startTime = Date.now();
    const conversationId = crypto.randomUUID();
    const sessionId = request.sessionId || crypto.randomUUID();
    const traceId = crypto.randomUUID();

    let debugInfo: unknown = {};
    let rbacFiltersApplied: string[] = [];
    let securityChecksPassed: string[] = [];

    // === NOUVELLE ANALYSE DE PATTERN AVANCÉE ===
    const queryPattern = this.analyzeQueryPattern(request.query);
    const queryComplexity = this.detectQueryComplexity(request.query);
    const focusAreas = this.detectFocusAreas(request.query);
    
    // === VÉRIFICATION CACHE LRU AMÉLIORÉ ===
    const cacheKey = `${request.userId}_${request.userRole}_${request.query.toLowerCase().trim()}`;
    const cachedResult = this.getCacheLRU(cacheKey);
    
    if (cachedResult) {
      logger.info('Cache hit LRU', {
        metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'processQueryParallel',
          cacheKey,
          queryType: queryPattern.queryType,
          complexity: queryComplexity
                }
      });
      // Retourner le résultat caché avec enrichissement
      return {
        ...cachedResult,
        execution_time_ms: Date.now() - startTime,
        cache_hit: true,
        metadata: {
          ...cachedResult.metadata,
          cache_source: 'lru',
          original_execution_time: cachedResult.execution_time_ms
                }
      };
    }

    // === INSTRUMENTATION PERFORMANCE : Démarrage tracing pipeline parallèle ===
    this.performanceMetrics.startPipelineTrace(
      traceId, 
      request.userId, 
      request.userRole, 
      request.query,
      queryComplexity
    );

    return withErrorHandling(
    async () => {

      logger.info('PARALLEL Démarrage requête', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'handleParallelQuery',
          conversationId,
          traceId,
          userId: request.userId,
          userRole: request.userRole
        } });
      // ========================================
      // 1. VÉRIFICATION CIRCUIT BREAKER
      // ========================================
      this.performanceMetrics.startStep(traceId, 'circuit_breaker_check', { operation: 'parallel_availability_check' });
      const circuitBreakerStartTime = Date.now();
      const circuitBreakerCheck = this.performanceMetrics.checkCircuitBreaker();
      const circuitBreakerTime = Date.now() - circuitBreakerStartTime;
      if (!circuitBreakerCheck.allowed) {
        logger.warn('Circuit breaker ouvert, fallback séquentiel', {
          metadata: {
            service: 'ChatbotOrchestrationService',
            operation: 'handleParallelQuery',
            reason: circuitBreakerCheck.reason,
            context: { fallback: 'sequential' }
          }
        });
        this.performanceMetrics.endStep(traceId, 'circuit_breaker_check', false, { 
          circuitBreakerTime,
          reason: circuitBreakerCheck.reason,
          fallbackTriggered: true
        });
        // Fallback vers méthode séquentielle
        return await this.processChatbotQuerySequential(request, traceId, "circuit_breaker_open");
      }
      this.performanceMetrics.endStep(traceId, 'circuit_breaker_check', true, { 
        circuitBreakerTime,
        status: 'circuit_closed'
      });
      // ========================================
      // 2. DÉTECTION D'INTENTIONS D'ACTIONS (CONSERVÉ)
      // ========================================
      this.performanceMetrics.startStep(traceId, 'context_generation', { step: 'action_detection' });
      const actionDetectionStartTime = Date.now();
      const actionIntention = this.actionExecutionService.detectActionIntention(request.query);
      const actionDetectionTime = Date.now() - actionDetectionStartTime;
      if (actionIntention.hasActionIntention && actionIntention.confidence > 0.7) {
        logger.info('Action détectée', {
          metadata: {
            service: 'ChatbotOrchestrationService',
            operation: 'handleQuery',
            actionType: actionIntention.actionType,
            entity: actionIntention.entity,
            context: { detectionStep: 'action_intention' }
          }
        });
        this.performanceMetrics.endStep(traceId, 'context_generation', true, { 
          step: 'action_detected',
          detectionTime: actionDetectionTime,
          actionType: actionIntention.actionType,
          confidence: actionIntention.confidence
        });
        // Traitement actions (même logique que séquentiel)
        const actionDefinition = await this.actionExecutionService.analyzeActionWithAI(request.query, request.userRole);
        if (actionDefinition) {
          const proposeActionRequest: ProposeActionRequest = {
            type: actionDefinition.type,
            entity: actionDefinition.entity as unknown,
                  operation: actionDefinition.operation,
            parameters: actionDefinition.parameters,
            targetEntityId: actionDefinition.targetEntityId,
            riskLevel: actionDefinition.risk_level,
            confirmationRequired: actionDefinition.confirmation_required,
            expirationMinutes: 30,
                  userId: request.userId,
            userRole: request.userRole,
                  sessionId: request.sessionId,
            conversationId,
            metadata: { detectedViaQuery: true, confidence: actionIntention.confidence, parallelMode: true }
          };
          const actionProposal = await this.actionExecutionService.proposeAction(proposeActionRequest);
          await this.performanceMetrics.endPipelineTrace(
            traceId, request.userId, request.userRole, request.query, 
            this.detectQueryComplexity(request.query), true, false, { 
              actionFlow: true, 
              actionType: actionIntention.actionType,
              parallelMode: true
            }
          );
          return this.createActionProposalResponse(
            conversationId,
            request.query,
            actionProposal,
            actionIntention,
            request.userRole
          );
        }
      }
      this.performanceMetrics.endStep(traceId, 'context_generation', true, { 
        step: 'action_detection_complete', 
        detectionTime: actionDetectionTime,
        actionDetected: false 
      });
      // ========================================
      // 3. VALIDATION RBAC UTILISATEUR (CONSERVÉ MAIS OPTIMISÉ)
      // ========================================
      this.performanceMetrics.startStep(traceId, 'context_generation', { step: 'rbac_validation' });
      const rbacStartTime = Date.now();
      const userPermissions = await this.rbacService.getUserPermissions(
        request.userId, 
        request.userRole
      );
      const rbacTime = Date.now() - rbacStartTime;
      if (!userPermissions || Object.keys(userPermissions.permissions).length === 0) {
        this.performanceMetrics.endStep(traceId, 'context_generation', false, { 
          step: 'rbac_failed', 
          rbacTime,
          reason: 'insufficient_permissions'
        });
        await this.performanceMetrics.endPipelineTrace(
          traceId, request.userId, request.userRole, request.query, 
          this.detectQueryComplexity(request.query), false, false, { 
            rbacError: true,
            parallelMode: true
          }
        );
        return this.createErrorResponse(
          conversationId,
          request.query,
          "rbac",
          "Permissions insuffisantes pour utiliser le chatbot",
          "Vous n'avez pas les permissions nécessaires pour poser cette question."
        );
      }
      securityChecksPassed.push("rbac_permissions_validated");
      this.performanceMetrics.endStep(traceId, 'context_generation', true, { 
        step: 'rbac_validated', 
        rbacTime,
        permissionsCount: Object.keys(userPermissions.permissions).length
      });
      if (request.options?.includeDebugInfo) {
        debugInfo.rbac_check_ms = rbacTime;
      }
      // === VALIDATION GARDE-FOUS MÉTIER ===
      const businessValidation = this.validateBusinessCoherence(request, queryPattern);
      if (!businessValidation.isValid) {
        logger.warn('Requête bloquée par garde-fous métier', { metadata: {
            service: 'ChatbotOrchestrationService',
                  operation: 'processQueryParallel',
            warnings: businessValidation.warnings,
            suggestions: businessValidation.suggestions   
              
                }
      });
        return this.createErrorResponse(
          conversationId,
          request.query,
          "business_rule",
          businessValidation.warnings.join('. '),
          businessValidation.suggestions.join('. ')
        );
      }
      // === ENRICHISSEMENT DU CONTEXTE AVEC TEMPLATES SQL ===
      const sqlTemplate = this.generateOptimizedSQLTemplate(queryPattern, queryPattern.entities);
      debugInfo.queryAnalysis = {
        queryType: queryPattern.queryType,
        entities: queryPattern.entities,
        temporalContext: queryPattern.temporalContext,
        aggregations: queryPattern.aggregations,
        filters: queryPattern.filters,
        focusAreas: focusAreas,
        complexity: queryComplexity,
        sqlHints: sqlTemplate.hints
      };
      // ========================================
      // 4. DISPATCH PARALLÈLE PRINCIPAL - CONTEXTE + MODÈLE
      // ========================================
      this.performanceMetrics.startParallelTrace(traceId, 'context_and_model_parallel');
      const parallelStartTime = Date.now();
      logger.info('Démarrage dispatch parallèle contexte + modèle', {
        metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'handleParallelQuery',
          context: { parallelExecution: 'context_model_dispatch' },
          queryType: queryPattern.queryType,
          complexity: queryComplexity
        }
      });
      // Préparation des promesses parallèles avec contexte enrichi
      const businessContextRequest = {
        userId: request.userId,
        user_role: request.userRole,
        query_hint: request.query,
        complexity_preference: queryComplexity,
        focus_areas: focusAreas,
        include_temporal: true,
        cache_duration_minutes: 60,
        personalization_level: "advanced" as const,
        generation_mode: "sql_minimal" as const,
        // Enrichissement avec les nouvelles données
        query_pattern: queryPattern,
        sql_template: sqlTemplate,
        business_validation: businessValidation
      };
      // EXÉCUTION PARALLÈLE avec Promise.allSettled et timeout
      const parallelPromises = [
        // Promise 1: Génération contexte business
        this.businessContextService.generateBusinessContext(businessContextRequest),
        // Promise 2: Sélection modèle IA indépendante
        this.aiService.selectOptimalModelIndependent(
          request.query, 
          request.userRole, 
          this.detectQueryComplexity(request.query)
        )
      ];
      // Timeout de protection 10s max (augmenté pour requêtes complexes)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout parallèle 10s dépassé')), 10000)
      );
      const parallelResults = await Promise.race([
        Promise.allSettled(parallelPromises),
        timeoutPromise
      ]) as PromiseSettledResult<unknown>[];
      const parallelTime = Date.now() - parallelStartTime;
      // Analyse des résultats parallèles
      const [contextResult, modelResult] = parallelResults;
      const contextSuccess = contextResult.status === 'fulfilled' && contextResult.value.success;
      const modelSuccess = modelResult.status === 'fulfilled' && modelResult.value.selectedModel;
      const contextTime = contextSuccess ? 
        (contextResult.value.timings?.total || parallelTime) : parallelTime;
      const modelTime = modelSuccess ? 
        (modelResult.value.selectionTime || parallelTime) : parallelTime;
      logger.info('Résultats parallèles', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'handleParallelQuery',
          contextSuccess,
          contextTimeMs: contextTime,
          modelSuccess,
          modelTimeMs: modelTime,
          totalTimeMs: parallelTime   
              
              }
      });
      // Validation de réussite minimum
      if (!contextSuccess && !modelSuccess) {
        logger.warn('Échec total parallélisme, fallback séquentiel', {
          metadata: {
            service: 'ChatbotOrchestrationService',
            operation: 'handleParallelQuery',
            context: { fallback: 'sequential_mode' }
          }
        });
        this.performanceMetrics.endParallelTrace(traceId, 'context_and_model_parallel', false, {
          contextSuccess,
          modelSuccess,
          contextTime,
          modelTime,
          totalParallelTime: parallelTime
        });
        // Fallback vers méthode séquentielle
        return await this.processChatbotQuerySequential(request, traceId, "parallel_total_failure");
      }
      // Enregistrement succès parallèle
      this.performanceMetrics.endParallelTrace(traceId, 'context_and_model_parallel', true, {
        contextSuccess,
        modelSuccess,
        contextTime,
        modelTime,
        totalParallelTime: parallelTime
      });
      // Extraction des résultats utilisables
      const businessContextResponse = contextSuccess ? contextResult.value : null;
      const modelSelection = modelSuccess ? modelResult.value : null;
      debugInfo.parallel_execution = {
        contextSuccess,
        modelSuccess,
        contextTime,
        modelTime,
        totalParallelTime: parallelTime,
        timeSaving: Math.max(0, (contextTime + modelTime) - parallelTime)
      };
      // Fallback partiel si nécessaire
      if (!contextSuccess) {
        logger.warn('Contexte échoué, contexte minimal', {
          metadata: {
            service: 'ChatbotOrchestrationService',
            operation: 'handleParallelQuery',
            context: { fallback: 'minimal_context' }
          }
        });
        // Continuer avec contexte minimal mais modèle OK
      }
      if (!modelSuccess) {
        logger.warn('Sélection modèle échouée, modèle par défaut', {
          metadata: {
            service: 'ChatbotOrchestrationService',
            operation: 'handleParallelQuery',
            context: { fallback: 'default_model' }
          }
        });
        // Continuer avec modèle par défaut mais contexte OK
      }
      // ========================================
      // 5. GÉNÉRATION ET EXÉCUTION SQL (IDENTIQUE SÉQUENTIEL)
      // ========================================
      this.performanceMetrics.startStep(traceId, 'sql_execution', { 
        step: 'sql_generation_and_execution',
        hasContext: !!businessContextResponse,
        hasModelSelection: !!modelSelection,
        parallelMode: true
      });
      const sqlStartTime = Date.now();
      // CONNEXION ANALYSE D'INTENTION - Transmission complète au SQLEngine
      const queryAnalysis = {
        complexity: queryComplexity,
        pattern: queryPattern,
        entities: queryPattern.entities,
        queryType: queryPattern.queryType,
        temporalContext: queryPattern.temporalContext,
        aggregations: queryPattern.aggregations,
        filters: queryPattern.filters,
        focusAreas: focusAreas
      };
      const sqlQueryRequest = {
        naturalLanguageQuery: request.query,
        context: request.context || businessContextResponse?.context ? 
          JSON.stringify(businessContextResponse.context) : undefined,
        queryAnalysis, // ANALYSE D'INTENTION TRANSMISE ICI
        dryRun: request.options?.dryRun || false,
        maxResults: request.options?.maxResults || 1000,
        timeoutMs: request.options?.timeoutMs || 30000,
        userId: request.userId,
        userRole: request.userRole,
        // Transmission sélection modèle si disponible
        forceModel: modelSelection?.selectedModel
      };
      const sqlResult = await this.sqlEngineService.executeNaturalLanguageQuery(sqlQueryRequest);
      const sqlGenerationTime = Date.now() - sqlStartTime;
      if (!sqlResult.success) {
        this.performanceMetrics.endStep(traceId, 'sql_execution', false, { 
          sqlGenerationTime,
          errorType: sqlResult.error?.type,
          errorMessage: sqlResult.error?.message,
          parallelMode: true
        });
        await this.performanceMetrics.endPipelineTrace(
          traceId, request.userId, request.userRole, request.query, 
          this.detectQueryComplexity(request.query), false, false, { 
            sqlError: true, 
            errorType: sqlResult.error?.type,
            parallelMode: true
          }
        );
        await this.logConversation({
          id: conversationId,
          userId: request.userId,
          userRole: request.userRole,
          sessionId,
          query: request.query,
          response: { error: sqlResult.error },
          sql: null,
          results: null,
          executionTimeMs: Date.now() - startTime,
          confidence: null,
          modelUsed: modelSelection?.selectedModel || null,
          cacheHit: false,
          errorOccurred: true,
          errorType: sqlResult.error?.type,
          dryRun: request.options?.dryRun || false,
          createdAt: new Date()
        });
        return this.createErrorResponse(
          conversationId,
          request.query,
          sqlResult.error?.type || "unknown",
          sqlResult.error?.message || "Erreur lors de l'exécution de la requête",
          this.generateUserFriendlyErrorMessage(sqlResult.error?.type || "unknown")
        );
      }
      this.performanceMetrics.endStep(traceId, 'sql_execution', true, { 
        sqlGenerationTime,
        resultCount: sqlResult.results?.length || 0,
        sqlLength: sqlResult.sql?.length || 0,
        cacheHit: sqlResult.metadata?.cacheHit || false,
        modelUsed: modelSelection?.selectedModel || sqlResult.metadata?.aiModelUsed,
        parallelMode: true
      });
      // ========================================
      // 6. GÉNÉRATION RÉPONSE CONVERSATIONNELLE ENRICHIE
      // ========================================
      this.performanceMetrics.startStep(traceId, 'response_formatting', { 
        resultCount: sqlResult.results?.length || 0,
        parallelMode: true,
        queryType: queryPattern.queryType
      });
      const responseFormattingStartTime = Date.now();
      // === GÉNÉRATION D'EXPLICATION ENRICHIE ===
      const enrichedExplanation = this.generateEnrichedExplanation(
        request.query,
        sqlResult.results || [],
        request.userRole,
        queryPattern,
        sqlResult.metadata || {}
      );
      // === SUGGESTIONS INTELLIGENTES CONTEXTUELLES ===
      const enhancedSuggestions = await this.generateEnhancedSuggestions(
        request.userId,
        request.userRole,
        request.query,
        sqlResult.results || [],
        queryPattern
      );
      // === MÉTADONNÉES CONTEXTUELLES ===
      const contextualMetadata = this.generateContextualMetadata(
        sqlResult.results || [],
        queryPattern,
        sqlResult.sql || '',
        Date.now() - startTime
      );
      const responseFormattingTime = Date.now() - responseFormattingStartTime;
      this.performanceMetrics.endStep(traceId, 'response_formatting', true, { 
        responseFormattingTime,
        explanationLength: enrichedExplanation.length,
        suggestionsCount: enhancedSuggestions.length,
        parallelMode: true
      });
      // ========================================
      // 7. LOGGING ET MÉTRIQUES FINALES
      // ========================================
      const totalExecutionTime = Date.now() - startTime;
      // Finaliser le tracing complet avec succès parallèle
      const detailedTimings = await this.performanceMetrics.endPipelineTrace(
        traceId, request.userId, request.userRole, request.query, 
        this.detectQueryComplexity(request.query), true, sqlResult.metadata?.cacheHit || false, {
          modelUsed: modelSelection?.selectedModel || sqlResult.metadata?.aiModelUsed,
          modelSelectionReason: modelSelection?.reason,
          modelConfidence: modelSelection?.confidence,
          resultCount: sqlResult.results?.length || 0,
          sqlLength: sqlResult.sql?.length || 0,
          businessContextLoaded: !!businessContextResponse,
          rbacChecksPerformed: securityChecksPassed.length,
          parallelMode: true,
          parallelSuccess: true,
          timeSavingMs: debugInfo.parallel_execution?.timeSaving || 0
        }
      );
      await this.logConversation({
        id: conversationId,
        userId: request.userId,
        userRole: request.userRole,
        sessionId,
        query: request.query,
        response: {
          explanation: enrichedExplanation,
          suggestions: enhancedSuggestions,
          metadata: {
            parallelMode: true,
            modelSelection: modelSelection?.selectedModel,
            modelReason: modelSelection?.reason,
            contextSuccess: contextSuccess,
            timingSavings: debugInfo.parallel_execution?.timeSaving || 0
          }
        },
        sql: sqlResult.sql,
        results: sqlResult.results,
        executionTimeMs: totalExecutionTime,
        confidence: (modelSelection?.confidence || sqlResult.confidence || 0).toString(),
        modelUsed: modelSelection?.selectedModel || sqlResult.metadata?.aiModelUsed,
        cacheHit: sqlResult.metadata?.cacheHit || false,
        errorOccurred: false,
        errorType: null,
        dryRun: request.options?.dryRun || false,
        createdAt: new Date()
      });
      logger.info('PARALLEL Pipeline terminé', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'handleParallelQuery',
          totalExecutionTimeMs: totalExecutionTime,
          timeSavingMs: debugInfo.parallel_execution?.timeSaving || 0   
              
              }
      });
      // Construire réponse finale selon interface ChatbotQueryResponse
      return {
        success: true,
        conversation_id: conversationId,
        query: request.query,
        explanation: enrichedExplanation,
        suggestions: enhancedSuggestions,
        sql: this.shouldIncludeSQL(request.userRole) ? sqlResult.sql : undefined,
        results: sqlResult.results || [],
        confidence: sqlResult.confidence || 0,
        execution_time_ms: totalExecutionTime,
        model_used: modelSelection?.selectedModel || sqlResult.metadata?.aiModelUsed,
        cache_hit: sqlResult.metadata?.cacheHit || false,
        debug_info: request.options?.includeDebugInfo ? {
          rbac_filters_applied: sqlResult.rbacFiltersApplied || [],
          business_context_loaded: !!businessContextResponse,
          ai_routing_decision: modelSelection?.selectedModel || sqlResult.metadata?.aiModelUsed || "unknown",
          security_checks_passed: securityChecksPassed,
          performance_metrics: {
            context_generation_ms: debugInfo.parallel_execution?.contextTime || 0,
            sql_generation_ms: debugInfo.parallel_execution?.modelTime || 0,
            query_execution_ms: sqlResult.executionTime || 0,
            total_orchestration_ms: totalExecutionTime
          }
        } : undefined
      };
    },
    {
      operation: 'constructor',
      service: 'ChatbotOrchestrationService',
      metadata: {
        traceId,
        query: request.query.substring(0, 100),
        userId: request.userId,
        userRole: request.userRole,
        errorType: 'parallel_pipeline_error',
        fallback: 'sequential_after_error'
      }
    });
      // Enregistrer échec parallélisme
      this.performanceMetrics.recordParallelismFailure();
      // Finaliser le tracing en erreur
      await this.performanceMetrics.endPipelineTrace(
        traceId, request.userId, request.userRole, request.query, 
        this.detectQueryComplexity(request.query), false, false, { 
          error: error instanceof Error ? error.message : String(error),
          errorType: 'parallel_pipeline_error',
          parallelMode: true
              }
      );
      // Fallback vers méthode séquentielle en cas d'erreur critique
      logger.info('Fallback séquentiel après erreur parallèle', {
        metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'handleParallelQuery',
          context: { fallback: 'sequential_after_error' }
        }
      });
      return await this.processChatbotQuerySequential(request, traceId, "parallel_exception");
    }
  }
  // ========================================
  // MÉTHODE SÉQUENTIELLE POUR FALLBACK
  // ========================================
  /**
   * Méthode séquentielle de fallback (renommée de la méthode originale)
   */
  private async processChatbotQuerySequential(
    request: ChatbotQueryRequest, 
    existingTraceId?: string,
    fallbackReason?: string
  ): Promise<ChatbotQueryResponse> {
    // Utiliser traceId existant ou en créer un nouveau
    const traceId = existingTraceId || crypto.randomUUID();
    if (fallbackReason) {
      this.performanceMetrics.startStep(traceId, 'fallback_sequential_trigger', { 
        reason: fallbackReason,
        fallbackFrom: 'parallel'
      });
      const fallbackStartTime = Date.now();
      // Exécuter la logique séquentielle originale (copiée de processChatbotQuery)
      const result = await this.processChatbotQueryOriginal(request, traceId);
      const fallbackTime = Date.now() - fallbackStartTime;
      this.performanceMetrics.recordSequentialFallback(fallbackTime);
      this.performanceMetrics.endStep(traceId, 'fallback_sequential_trigger', true, { 
        fallbackTime,
        reason: fallbackReason
      });
      return result;
    } else {
      return await this.processChatbotQueryOriginal(request, traceId);
    }
  }
  // ========================================
  // MÉTHODE PRINCIPALE - PIPELINE COMPLET CHATBOT (CONSERVÉE POUR FALLBACK)
  // ========================================
  /**
   * Pipeline complet d'orchestration chatbot : NL → BusinessContext → AI → SQL → RBAC → Execution
   * INSTRUMENTÉ pour tracing détaillé des performances
   * RENOMMÉE pour servir de fallback à la méthode parallèle
   */
  private async processChatbotQueryOriginal(request: ChatbotQueryRequest, traceId?: string): Promise<ChatbotQueryResponse> {
    const startTime = Date.now();
    const conversationId = crypto.randomUUID();
    const sessionId = request.sessionId || crypto.randomUUID();
    const finalTraceId = traceId || crypto.randomUUID();
    let debug: unknown = {};
    let rbacFiltersApplied: string[] = [];
    let businessContextLoaded = false;
    let aiRoutingDecision = "";
    let securityChecksPassed: string[] = [];
    // === INSTRUMENTATION PERFORMANCE : Démarrage tracing pipeline orchestration ===
    this.performanceMetrics.startPipelineTrace(
      finalTraceId, 
      request.userId, 
      request.userRole, 
      request.query,
      this.detectQueryComplexity(request.query)
    );
    return withErrorHandling(
    async () => {
      logger.info('Démarrage requête', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'handleQuery',
          conversationId,
          traceId: finalTraceId,
          userId: request.userId,
          userRole: request.userRole
        } });
      // ========================================
      // 1. DÉTECTION D'INTENTIONS D'ACTIONS - NOUVEAU PIPELINE
      // ========================================
      this.performanceMetrics.startStep(traceId, 'context_generation', { step: 'action_detection' });
      const actionDetectionStartTime = Date.now();
      const actionIntention = this.actionExecutionService.detectActionIntention(request.query);
      const actionDetectionTime = Date.now() - actionDetectionStartTime;
      if (actionIntention.hasActionIntention && actionIntention.confidence > 0.7) {
        logger.info('Action détectée', {
          metadata: {
            service: 'ChatbotOrchestrationService',
            operation: 'handleQuery',
            actionType: actionIntention.actionType,
            entity: actionIntention.entity,
            context: { detectionStep: 'action_intention' }
          }
        });
        this.performanceMetrics.endStep(traceId, 'context_generation', true, { 
          step: 'action_detected',
          detectionTime: actionDetectionTime,
          actionType: actionIntention.actionType,
          confidence: actionIntention.confidence
        });
        // Proposer l'action au lieu d'exécuter une requête SQL
        const actionDefinition = await this.actionExecutionService.analyzeActionWithAI(request.query, request.userRole);
        if (actionDefinition) {
          const proposeActionRequest: ProposeActionRequest = {
            type: actionDefinition.type,
            entity: actionDefinition.entity,
            operation: actionDefinition.operation,
            parameters: actionDefinition.parameters,
            targetEntityId: actionDefinition.targetEntityId,
            riskLevel: actionDefinition.risk_level,
            confirmationRequired: actionDefinition.confirmation_required,
            expirationMinutes: 30, // Valeur par défaut appropriée pour actions détectées via chatbot
            userId: request.userId,
            userRole: request.userRole,
            sessionId: request.sessionId,
            conversationId,
            metadata: { detectedViaQuery: true, confidence: actionIntention.confidence }
          };  
          const actionProposal = await this.actionExecutionService.proposeAction(proposeActionRequest);
          // Finaliser le tracing pour action
          await this.performanceMetrics.endPipelineTrace(
            traceId, request.userId, request.userRole, request.query, 
            this.detectQueryComplexity(request.query), true, false, { 
              actionFlow: true, 
              actionType: actionIntention.actionType 
            }
          );
          // Retourner une réponse spécialisée pour les actions
          return this.createActionProposalResponse(
            conversationId,
            request.query,
            actionProposal,
            actionIntention,
            request.userRole
          );
        }
      }
      this.performanceMetrics.endStep(traceId, 'context_generation', true, { 
        step: 'action_detection_complete', 
        detectionTime: actionDetectionTime,
        actionDetected: false 
      });
      // ========================================
      // 2. VALIDATION RBAC UTILISATEUR (pipeline standard)
      // ========================================
      this.performanceMetrics.startStep(traceId, 'context_generation', { step: 'rbac_validation' });
      const rbacStartTime = Date.now();
      const userPermissions = await this.rbacService.getUserPermissions(
        request.userId, 
        request.userRole
      );
      const rbacTime = Date.now() - rbacStartTime;
      if (!userPermissions || Object.keys(userPermissions.permissions).length === 0) {
        this.performanceMetrics.endStep(traceId, 'context_generation', false, { 
          step: 'rbac_failed', 
          rbacTime,
          reason: 'insufficient_permissions'
        });
        await this.performanceMetrics.endPipelineTrace(
          traceId, request.userId, request.userRole, request.query, 
          this.detectQueryComplexity(request.query), false, false, { 
            rbacError: true 
          }
        );
        return this.createErrorResponse(
          conversationId,
          request.query,
          "rbac",
          "Permissions insuffisantes pour utiliser le chatbot",
          "Vous n'avez pas les permissions nécessaires pour poser cette question."
        );
      }
      securityChecksPassed.push("rbac_permissions_validated");
      this.performanceMetrics.endStep(traceId, 'context_generation', true, { 
        step: 'rbac_validated', 
        rbacTime,
        permissionsCount: Object.keys(userPermissions.permissions).length
      });
      if (request.options?.includeDebugInfo) {
        debugInfo.rbac_check_ms = rbacTime;
      }
      // ========================================
      // 3. GÉNÉRATION CONTEXTE MÉTIER INTELLIGENT
      // ========================================
      this.performanceMetrics.startStep(traceId, 'context_generation', { step: 'business_context' });
      const contextStartTime = Date.now();
      const businessContextRequest = {
        userId: request.userId,
        user_role: request.userRole,
        query_hint: request.query,
        complexity_preference: this.detectQueryComplexity(request.query),
        focus_areas: this.detectFocusAreas(request.query),
        include_temporal: true,
        cache_duration_minutes: 60,
        personalization_level: "advanced" as const,
        generation_mode: "sql_minimal" as const
      };
      const businessContextResponse = await this.businessContextService.generateBusinessContext(
        businessContextRequest
      );
      const contextTime = Date.now() - contextStartTime;
      if (!businessContextResponse.success || !businessContextResponse.context) {
        logger.warn('Échec génération contexte métier, continuation avec contexte minimal', { metadata: {
            service: 'ChatbotOrchestrationService',
                  operation: 'handleQuery',
            context: { fallback: 'minimal_business_context'   
            }
          });
        this.performanceMetrics.endStep(traceId, 'context_generation', false, { 
          step: 'business_context_failed', 
          contextTime,
          reason: 'context_generation_error'
        });
      } else {
        businessContextLoaded = true;
        this.performanceMetrics.endStep(traceId, 'context_generation', true, { 
          step: 'business_context_complete', 
          contextTime,
          contextSize: JSON.stringify(businessContextResponse.context).length
        });
        if (request.options?.includeDebugInfo) {
          debugInfo.context_generation_ms = contextTime;
        }
      }
      // ========================================
      // 4. GÉNÉRATION ET EXÉCUTION SQL VIA MOTEUR SÉCURISÉ
      // ========================================
      this.performanceMetrics.startStep(traceId, 'sql_execution', { 
        step: 'sql_generation_and_execution',
        hasContext: businessContextLoaded
      });
      const sqlStartTime = Date.now();
      const sqlQueryRequest = {
        naturalLanguageQuery: request.query,
        context: request.context || businessContextResponse.context ? 
          JSON.stringify(businessContextResponse.context) : undefined,
        dryRun: request.options?.dryRun || false,
        maxResults: request.options?.maxResults || 1000,
        timeoutMs: request.options?.timeoutMs || 30000,
        userId: request.userId,
        userRole: request.userRole
      };
      const sqlResult = await this.sqlEngineService.executeNaturalLanguageQuery(sqlQueryRequest);
      const sqlGenerationTime = Date.now() - sqlStartTime;
      if (!sqlResult.success) {
        this.performanceMetrics.endStep(traceId, 'sql_execution', false, { 
          sqlGenerationTime,
          errorType: sqlResult.error?.type,
          errorMessage: sqlResult.error?.message
        });
        // Finaliser le tracing en erreur
        await this.performanceMetrics.endPipelineTrace(
          traceId, request.userId, request.userRole, request.query, 
          this.detectQueryComplexity(request.query), false, false, { 
            sqlError: true, 
            errorType: sqlResult.error?.type 
          }
        );
        await this.logConversation({
          id: conversationId,
          userId: request.userId,
          userRole: request.userRole,
          sessionId,
          query: request.query,
          response: { error: sqlResult.error },
          sql: null,
          results: null,
          executionTimeMs: Date.now() - startTime,
          confidence: null,
          modelUsed: null,
          cacheHit: false,
          errorOccurred: true,
          errorType: sqlResult.error?.type,
          dryRun: request.options?.dryRun || false,
          createdAt: new Date()
        });
        return this.createErrorResponse(
          conversationId,
          request.query,
          sqlResult.error?.type || "unknown",
          sqlResult.error?.message || "Erreur lors de l'exécution de la requête",
          this.generateUserFriendlyErrorMessage(sqlResult.error?.type || "unknown")
        );
      }
      this.performanceMetrics.endStep(traceId, 'sql_execution', true, { 
        sqlGenerationTime,
        resultCount: sqlResult.results?.length || 0,
        sqlLength: sqlResult.sql?.length || 0,
        cacheHit: sqlResult.metadata?.cacheHit || false
      });
      // ========================================
      // 5. GÉNÉRATION RÉPONSE CONVERSATIONNELLE 
      // ========================================
      this.performanceMetrics.startStep(traceId, 'response_formatting', { 
        resultCount: sqlResult.results?.length || 0
      });
      const responseFormattingStartTime = Date.now();
      const explanation = this.generateExplanation(
        request.query,
        sqlResult.results || [],
        request.userRole
      );
      const suggestions = await this.generateContextualSuggestions(
        request.userId,
        request.userRole,
        request.query,
        sqlResult.results || []
      );
      const responseFormattingTime = Date.now() - responseFormattingStartTime;
      this.performanceMetrics.endStep(traceId, 'response_formatting', true, { 
        responseFormattingTime,
        explanationLength: explanation.length,
        suggestionsCount: suggestions.length
      });
      // ========================================
      // 6. LOGGING ET MÉTRIQUES ENRICHIES
      // ========================================
      const totalExecutionTime = Date.now() - startTime;
      // Finaliser le tracing complet avec succès
      const detailedTimings = await this.performanceMetrics.endPipelineTrace(
        traceId, request.userId, request.userRole, request.query, 
        this.detectQueryComplexity(request.query), true, sqlResult.metadata?.cacheHit || false, {
          modelUsed: sqlResult.metadata?.aiModelUsed,
          resultCount: sqlResult.results?.length || 0,
          sqlLength: sqlResult.sql?.length || 0,
          businessContextLoaded,
          rbacChecksPerformed: securityChecksPassed.length
        }
      );
      await this.logConversation({
        id: conversationId,
        userId: request.userId,
        userRole: request.userRole,
        sessionId,
        query: request.query,
        response: {
          explanation,
          suggestions,
          confidence: sqlResult.confidence
        },
        sql: sqlResult.sql,
        results: sqlResult.results,
        executionTimeMs: totalExecutionTime,
        confidence: (sqlResult.confidence || 0).toString(),
        modelUsed: sqlResult.metadata?.aiModelUsed || null,
        cacheHit: sqlResult.metadata?.cacheHit || false,
        errorOccurred: false,
        errorType: null,
        dryRun: request.options?.dryRun || false,
        createdAt: new Date()
      });
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "query",
        totalExecutionTime,
        true,
        0 // Tokens non disponibles dans metadata, utiliser 0
      );
      // ========================================
      // 7. ÉVÉNEMENT POUR APPRENTISSAGE ADAPTATIF
      // ========================================
      const { createRealtimeEvent, EventType } = await import("@shared/events");
      await this.eventBus.publish(createRealtimeEvent({
        type: EventType.CHATBOT_QUERY_PROCESSED,
        entity: 'system',
        entityId: conversationId,
        severity: 'info',
        affectedQueryKeys: [['/api/chatbot/conversations']],
        userId: request.userId,
        metadata: {
          userRole: request.userRole,
          query: request.query,
          success: true,
          executionTime: totalExecutionTime,
          confidence: sqlResult.confidence,
          resultCount: sqlResult.results?.length || 0
        }
      }));
      // ========================================
      // 8. CONSTRUCTION RÉPONSE FINALE ENRICHIE
      // ========================================
      const response: ChatbotQueryResponse = {
        success: true,
        conversation_id: conversationId,
        query: request.query,
        explanation: explanation,
        sql: this.shouldIncludeSQL(request.userRole) ? sqlResult.sql : undefined,
        results: sqlResult.results || [],
        suggestions: suggestions,
        confidence: sqlResult.confidence || 0,
        execution_time_ms: totalExecutionTime,
        model_used: sqlResult.metadata?.aiModelUsed ?? undefined,
        cache_hit: sqlResult.metadata?.cacheHit || false
      };
      // Debug info si demandé - ENRICHI avec métriques détaillées
      if (request.options?.includeDebugInfo) {
        response.debug_info = {
          rbac_filters_applied: sqlResult.rbacFiltersApplied || [],
          business_context_loaded: businessContextLoaded,
          ai_routing_decision: sqlResult.metadata?.aiModelUsed || "unknown",
          security_checks_passed: securityChecksPassed,
          performance_metrics: {
            context_generation_ms: debugInfo.context_generation_ms || 0,
            sql_generation_ms: sqlGenerationTime,
            // response_formatting_ms supprimé car non défini dans interface
            query_execution_ms: sqlResult.executionTime || 0,
            total_orchestration_ms: totalExecutionTime
          },
          // === MÉTRIQUES PIPELINE SUPPRIMÉES ===
          // detailed_timings et autres métriques supprimées car non définies dans interface debug_info
        };
      }
      // === ENRICHISSEMENT RÉPONSE SUPPRIMÉ ===
      // performance_trace supprimé car non défini dans interface ChatbotQueryResponse
      return response;
    },
    {
      operation: 'processChatbotQueryOriginal',
      service: 'ChatbotOrchestrationService',
      metadata: {
        traceId,
        userId: request.userId,
        userRole: request.userRole,
        query: request.query.substring(0, 100),
        errorType: 'orchestration_error'
      }
    });
      // === FINALISER LE TRACING EN ERREUR ===
      await this.performanceMetrics.endPipelineTrace(
        traceId, request.userId, request.userRole, request.query, 
        this.detectQueryComplexity(request.query), false, false, { 
          error: error instanceof Error ? error.message : String(error),
          errorType: 'orchestration_error',
          errorStack: error instanceof Error ? error.stack : undefined
              }
      );
      // Logging d'erreur
      await this.logConversation({
        id: conversationId,
        userId: request.userId,
        userRole: request.userRole,
        sessionId,
        query: request.query,
        response: { error: "Erreur interne" },
        sql: null,
        results: null,
        executionTimeMs: Date.now() - startTime,
        confidence: null,
        modelUsed: null,
        cacheHit: false,
        errorOccurred: true,
        errorType: "unknown",
        dryRun: request.options?.dryRun || false,
        createdAt: new Date()
      });
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "query",
        Date.now() - startTime,
        false,
        0
      );
      const errorResponse = this.createErrorResponse(
        conversationId,
        request.query,
        "unknown",
        error instanceof Error ? error.message : String(error),
        "Une erreur inattendue s'est produite. Veuillez réessayer."
      );
      // Ajouter trace ID pour debug
      (errorResponse as unknown).trace_id = traceId;
      return errorResponse;
    }
  }
  // ========================================
  // MÉTHODES HELPERS SLO ET PERFORMANCE
  // ========================================
  /**
   * Retourne les seuils SLO par complexité de requête
   */
  private getSLOTargetForComplexity(complexity: string): number {
    const SLO_TARGETS = {
      'simple': 5000,    // 5 secondes
      'complex': 10000,  // 10 secondes  
      'expert': 15000    // 15 secondes (cas extrêmes)
    };
    return SLO_TARGETS[complexity as keyof typeof SLO_TARGETS] || SLO_TARGETS.complex;
  }
  /**
   * Calcule les métriques de conformité SLO
   */
  private calculateSLOCompliance(executionTime: number, complexity: string): {
    target_ms: number;
    actual_ms: number;
    compliant: boolean;
    violation_percentage?: number;
  } {
    const target = this.getSLOTargetForComplexity(complexity);
    const compliant = executionTime <= target;
    return {
      target_ms: target,
      actual_ms: executionTime,
      compliant,
      violation_percentage: compliant ? undefined : ((executionTime - target) / target) * 100
    };
  }
  // ========================================
  // SUGGESTIONS INTELLIGENTES PAR RÔLE
  // ========================================
  /**
   * Génère des suggestions contextuelles basées sur le rôle et l'historique
   */
  async getIntelligentSuggestions(request: ChatbotSuggestionsRequest): Promise<ChatbotSuggestionsResponse> {
    return withErrorHandling(
    async () => {
      const startTime = Date.now();
      // 1. Récupérer suggestions prédéfinies pour le rôle
      const roleSuggestions = DEFAULT_SUGGESTIONS_BY_ROLE[request.userRole as keyof typeof DEFAULT_SUGGESTIONS_BY_ROLE] || [];
      // 2. Récupérer suggestions personnalisées de la base de données
      const dbSuggestions = await db
        .select()
        .from(chatbotSuggestions)
        .where(and(
          eq(chatbotSuggestions.userRole, request.userRole),
          eq(chatbotSuggestions.isActive, true),
          request.category !== "all" ? eq(chatbotSuggestions.category, request.category) : sql`1=1`
        ))
        .orderBy(desc(chatbotSuggestions.priority), desc(chatbotSuggestions.successRate))
        .limit(request.limit || 10);
      // 3. Combiner et personnaliser les suggestions
      const suggestions = [
        ...dbSuggestions.map(s  => ({
          id: s.id,
          text: s.suggestionText,
          category: s.category,
          priority: s.priority,
          success_rate: s.successRate !== null && s.successRate !== undefined ? parseFloat(s.successRate.toString()) : 0.0,
          estimated_complexity: this.estimateComplexity(s.suggestionText),
          context_dependent: !!s.contextConditions
        })),
        ...roleSuggestions.slice(0, Math.max(0, (request.limit || 10) - dbSuggestions.length)).map((text, index) => ({
          id: `default_${index}`,
          text,
          category: "general",
          priority: 0,
          success_rate: 0.8,
          estimated_complexity: this.estimateComplexity(text) as "simple" | "complex" | "expert",
          context_dependent: false
        }))
      ];
      // 4. Contexte temporel et patterns récents
      const temporalContext = this.getTemporalContext();
      const recentPatterns = await this.analyzeRecentPatterns(request.userId, request.userRole);
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "suggestions",
        Date.now() - startTime,
        true,
        0
      );
      return {
        success: true,
        suggestions: suggestions.slice(0, request.limit || 10),
        personalized: dbSuggestions.length > 0,
        total_available: suggestions.length,
        context_info: {
          current_role: request.userRole,
          temporal_context: temporalContext,
          recent_patterns: recentPatterns
        }
      };
    },
    {
      operation: 'getChatbotSuggestions',
      service: 'ChatbotOrchestrationService',
      metadata: {
        userId: request.userId,
        userRole: request.userRole,
        limit: request.limit || 10,
        personalized: dbSuggestions.length > 0
      }
    });
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "suggestions",
        0,
        false,
        0
      );
      return {
        success: false,
        suggestions: [],
        personalized: false,
        total_available: 0,
        context_info: {
          current_role: request.userRole,
          temporal_context: [],
          recent_patterns: []
        }
      };
    }
  }
  // ========================================
  // VALIDATION DE REQUÊTE SANS EXÉCUTION
  // ========================================
  /**
   * Valide une requête chatbot sans l'exécuter
   */
  async validateChatbotQuery(request: ChatbotValidateRequest): Promise<ChatbotValidateResponse> {
    return withErrorHandling(
    async () => {
      const startTime = Date.now();
      // 1. Validation RBAC de base
      const userPermissions = await this.rbacService.getUserPermissions(
        request.userId,
        request.userRole
      );
      const rbacPassed = userPermissions && Object.keys(userPermissions.permissions).length > 0;
      // 2. Validation par le moteur SQL en mode validation
      const sqlValidationRequest = {
        sql: request.query, // Temporaire - sera remplacé par la génération SQL
        parameters: [],
        userId: request.userId,
        userRole: request.userRole
      };
      // TODO: Implémenter une méthode de validation pure dans SQLEngineService
      // Pour l'instant, on fait une validation basique
      const estimatedComplexity = this.detectQueryComplexity(request.query);
      const estimatedTime = this.estimateExecutionTime(request.query, estimatedComplexity);
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "validate",
        Date.now() - startTime,
        true,
        0
      );
      return {
        success: true,
        validation_results: {
          query_valid: true,
          security_passed: true,
          rbac_passed: rbacPassed,
          sql_generatable: true,
          estimated_complexity: estimatedComplexity,
          estimated_execution_time_ms: estimatedTime,
          warnings: [],
          suggestions: []
        },
        accessible_tables: Object.keys(userPermissions?.permissions || {}),
        restricted_columns: []
      };
    },
    {
      operation: 'validateChatbotQuery',
      service: 'ChatbotOrchestrationService',
      metadata: {
        userId: request.userId,
        userRole: request.userRole,
        query: request.query.substring(0, 100),
        estimatedComplexity: estimatedComplexity,
        estimatedTime: estimatedTime
      }
    });
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "validate",
        0,
        false,
        0
      );
      return {
        success: false,
        validation_results: {
          query_valid: false,
          security_passed: false,
          rbac_passed: false,
          sql_generatable: false,
          estimated_complexity: "simple",
          estimated_execution_time_ms: 0,
          warnings: ["Erreur lors de la validation"],
          suggestions: ["Veuillez vérifier votre requête"]
        },
        accessible_tables: [],
        restricted_columns: [],
        error: {
          type: "validation",
          message: error instanceof Error ? error.message : String(error),
          details: error
        }
      };
    }
  }
  // ========================================
  // HISTORIQUE DES CONVERSATIONS
  // ========================================
  /**
   * Récupère l'historique des conversations d'un utilisateur
   */
  async getChatbotHistory(request: ChatbotHistoryRequest): Promise<ChatbotHistoryResponse> {
    return withErrorHandling(
    async () => {
      const startTime = Date.now();
      // Construction des conditions WHERE
      const conditions = [eq(chatbotConversations.userId, request.userId)];
      if (request.sessionId) {
        conditions.push(eq(chatbotConversations.sessionId, request.sessionId));
      }
      if (request.startDate) {
        conditions.push(gte(chatbotConversations.createdAt, new Date(request.startDate)));
      }
      if (request.endDate) {
        conditions.push(lte(chatbotConversations.createdAt, new Date(request.endDate)));
      }
      if (!request.includeErrors) {
        conditions.push(eq(chatbotConversations.errorOccurred, false));
      }
      // Requête principale avec pagination
      const conversations = await db
        .select({
          id: chatbotConversations.id,
          query: chatbotConversations.query,
          response: chatbotConversations.response,
          errorOccurred: chatbotConversations.errorOccurred,
          executionTimeMs: chatbotConversations.executionTimeMs,
          confidence: chatbotConversations.confidence,
          createdAt: chatbotConversations.createdAt,
          sql: request.includeSQL ? chatbotConversations.sql : sql`NULL`.as('sql')
        })
        .from(chatbotConversations)
        .where(and(...conditions))
        .orderBy(desc(chatbotConversations.createdAt))
        .limit(Math.min(request.limit || DEFAULT_HISTORY_LIMIT, MAX_HISTORY_LIMIT))
        .offset(request.offset || 0);
      // Compter le total pour la pagination
      const totalResult = await db
        .select({ count: sql`count(*)`.as('count') })
        .from(chatbotConversations)
        .where(and(...conditions));
      const total = Number(totalResult[0]?.count || 0);
      // Vérifier s'il y a du feedback pour chaque conversation
      const conversationIds = conversations.map(c => c.id);
      const feedbacks = conversationIds.length > 0 ? await db
        .select({ conversationId: chatbotFeedback.conversationId })
        .from(chatbotFeedback)
        .where(sql`conversation_id IN (${sql.join(conversationIds.map(id => sql`$) {id}`), sql`, `)})`) : [];
      const feedbackMap = new Set(feedbacks.map(f => f.conversationId));
      const formattedConversations = conversations.map(c  => ({
        id: c.id,
        query: c.query,
        summary: this.generateConversationSummary(
          c.query || '', 
          c.response || ) {}, 
          c.errorOccurred || false
        ),
        success: !c.errorOccurred,
        execution_time_ms: c.executionTimeMs,
        confidence: c.confidence ? parseFloat(c.confidence) : undefined,
        created_at: c.createdAt,
        has_feedback: feedbackMap.has(c.id)
            }
                      }
                                }
                              }));
      await this.logUsageMetrics(
        request.userId,
        "system", // Les requêtes d'historique ne sont pas liées à un rôle spécifique
        "history",
        Date.now() - startTime,
        true,
        0
      );
      return {
        success: true,
        conversations: formattedConversations,
        pagination: {
          total,
          limit: request.limit || DEFAULT_HISTORY_LIMIT,
          offset: request.offset || 0,
          has_more: (request.offset || 0) + formattedConversations.length < total
        }
      };
    },
    {
      operation: 'getChatbotHistory',
      service: 'ChatbotOrchestrationService',
      metadata: {
        userId: request.userId,
        limit: request.limit || DEFAULT_HISTORY_LIMIT,
        offset: request.offset || 0,
        includeErrors: request.includeErrors || false
      }
    });
      await this.logUsageMetrics(
        request.userId,
        "system",
        "history",
        0,
        false,
        0
      );
      return {
        success: false,
        conversations: [],
        pagination: {
          total: 0,
          limit: request.limit || DEFAULT_HISTORY_LIMIT,
          offset: request.offset || 0,
          has_more: false
        }
      };
    }
  }
  // ========================================
  // FEEDBACK UTILISATEUR
  // ========================================
  /**
   * Enregistre le feedback utilisateur et déclenche l'apprentissage adaptatif
   */
  async processChatbotFeedback(request: ChatbotFeedbackRequest): Promise<ChatbotFeedbackResponse> {
    return withErrorHandling(
    async () => {
      const feedbackId = crypto.randomUUID();
      // 1. Enregistrer le feedback
      await db.insert(chatbotFeedback).values({
        id: feedbackId,
        conversationId: request.conversationId,
        userId: request.userId,
        rating: request.rating,
        feedbackType: request.feedbackType,
        feedbackText: request.feedbackText || null,
        improvementSuggestions: request.improvementSuggestions ? 
          JSON.stringify(request.improvementSuggestions) : null,
        createdAt: new Date()
      });
      // 2. Récupérer la conversation pour l'apprentissage adaptatif
      const conversation = await db
        .select()
        .from(chatbotConversations)
        .where(eq(chatbotConversations.id, request.conversationId))
        .limit(1);
      if (conversation.length > 0) {
        // 3. Déclencher l'apprentissage adaptatif
        const conv = conversation[0];
        const { createRealtimeEvent, EventType } = await import("@shared/events");
        await this.eventBus.publish(createRealtimeEvent({
          type: EventType.CHATBOT_FEEDBACK_RECEIVED,
          entity: 'system',
          entityId: request.conversationId,
          severity: request.rating >= 4 ? 'info' : 'warning',
          affectedQueryKeys: [['/api/chatbot/feedback']],
          userId: request.userId,
          metadata: {
            userRole: conv.userRole,
            query: conv.query,
            rating: request.rating,
            feedbackType: request.feedbackType,
            executionTime: conv.executionTimeMs,
            modelUsed: conv.modelUsed
                  }
                          }
                                    }
                                  }));
      }
      // 4. Générer des améliorations suggérées basées sur le feedback
      const improvements = this.generateImprovementSuggestions(request);
      return {
        success: true,
        feedback_id: feedbackId,
        learning_applied: true,
        improvements_suggested: improvements,
        thank_you_message: this.generateThankYouMessage(request.feedbackType, request.rating)
      };
    },
    {
      operation: 'submitChatbotFeedback',
      service: 'ChatbotOrchestrationService',
      metadata: {
        userId: request.userId,
        userRole: request.userRole,
        feedbackType: request.feedbackType,
        rating: request.rating,
        conversationId: request.conversationId
      }
    });
      return {
        success: false,
        feedback_id: "",
        learning_applied: false,
        improvements_suggested: [],
        thank_you_message: "Erreur lors de l'enregistrement du feedback"
      };
    }
  }
  // ========================================
  // STATISTIQUES D'USAGE (ADMIN UNIQUEMENT)
  // ========================================
  /**
   * Génère des statistiques d'usage détaillées du chatbot
   */
  async getChatbotStats(request: ChatbotStatsRequest): Promise<ChatbotStatsResponse> {
    return withErrorHandling(
    async () => {
      // TODO: Implémenter les statistiques complètes
      // Pour l'instant, on retourne des données de base
      const periodStart = this.getPeriodStart(request.period);
      // Requêtes de base pour les métriques
      const totalQueries = await db
        .select({ count: sql`count(*)`.as('count') })
        .from(chatbotConversations)
        .where(gte(chatbotConversations.createdAt, periodStart));
      const successfulQueries = await db
        .select({ count: sql`count(*)`.as('count') })
        .from(chatbotConversations)
        .where(and(
          gte(chatbotConversations.createdAt, periodStart),
          eq(chatbotConversations.errorOccurred, false)
        ));
      const total = Number(totalQueries[0]?.count || 0);
      const successful = Number(successfulQueries[0]?.count || 0);
      return {
        success: true,
        period: request.period,
        overall_metrics: {
          total_queries: total,
          success_rate: total > 0 ? successful / total : 0,
          avg_response_time_ms: 2500, // TODO: calculer la vraie moyenne
          total_tokens_used: 0, // TODO: sommer les tokens
          estimated_total_cost: 0, // TODO: calculer le coût
          unique_users: 0, // TODO: compter les utilisateurs uniques
          avg_queries_per_user: 0 // TODO: calculer la moyenne
        },
        breakdown_data: [], // TODO: implémenter les données de breakdown
        top_queries: [], // TODO: implémenter les top queries
        role_distribution: {}, // TODO: implémenter la distribution par rôle
        error_analysis: [], // TODO: implémenter l'analyse d'erreurs
        feedback_summary: {
          total_feedback: 0,
          avg_rating: 0,
          satisfaction_rate: 0,
          top_improvement_areas: []
        }
      };
    },
    {
      operation: 'constructor',
      service: 'ChatbotOrchestrationService',
      metadata: { } });
      return {
        success: false,
        period: request.period,
        overall_metrics: {
          total_queries: 0,
          success_rate: 0,
          avg_response_time_ms: 0,
          total_tokens_used: 0,
          estimated_total_cost: 0,
          unique_users: 0,
          avg_queries_per_user: 0
        },
        breakdown_data: [],
        top_queries: [],
        role_distribution: {},
        error_analysis: [],
        feedback_summary: {
          total_feedback: 0,
          avg_rating: 0,
          satisfaction_rate: 0,
          top_improvement_areas: []
        }
      };
    }
  }
  // ========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================================
  private async logConversation(conversation: InsertChatbotConversation): Promise<void> {
    return withErrorHandling(
    async () => {
      await db.insert(chatbotConversations).values(conversation);
    },
    {
      operation: 'constructor',
      service: 'ChatbotOrchestrationService',
      metadata: {  
      });
    }
  }
  private async logUsageMetrics(
    userId: string,
    userRole: string,
    endpoint: string,
    responseTime: number,
    success: boolean,
    tokensUsed: number
  ): Promise<void> {
    return withErrorHandling(
    async () => {
      const metricsId = crypto.randomUUID();
      await db.insert(chatbotUsageMetrics).values({
        id: metricsId,
        userId,
        userRole,
        endpoint,
        date: new Date(),
        requestCount: 1,
        successCount: success ? 1 : 0,
        errorCount: success ? 0 : 1,
        avgResponseTimeMs: responseTime,
        totalTokensUsed: tokensUsed,
        estimatedCost: "0.0000" // TODO: calculer le coût réel - convertir en string
      });
    },
    {
      operation: 'logUsageMetrics',
      service: 'ChatbotOrchestrationService',
      metadata: {
        userId,
        userRole,
        endpoint,
        responseTime,
        success,
        tokensUsed
      }
    });
    }
  }
  private createErrorResponse(
    conversationId: string,
    query: string,
    errorType: string,
    message: string,
    userFriendlyMessage: string
  ): ChatbotQueryResponse {
    return {
      success: false,
      conversation_id: conversationId,
      query,
      explanation: "Désolé, je n'ai pas pu traiter votre demande.",
      results: [],
      suggestions: [
        "Essayez de reformuler votre question",
        "Vérifiez que vous avez les permissions nécessaires",
        "Contactez l'administrateur si le problème persiste"
      ],
      confidence: 0,
      execution_time_ms: 0,
      cache_hit: false,
      error: {
        type: eras unknown, as unknown,
        message,
        user_friendly_message: userFriendlyMessage
      }
    };
  }
  private detectQueryComplexity(query: string): "simple" | "complex" | "expert" {
    const queryLower = query.toLowerCase();
    // Mots-clés complexes
    const complexKeywords = ['jointure', 'join', 'agrégation', 'group by', 'having', 'sous-requête', 'corrélation'];
    const expertKeywords = ['window function', 'cte', 'récursif', 'pivot', 'analyse temporelle'];
    if (expertKeywords.some(keyword => queryLower.includes(keyword))) {
      return "expert";
    }
    if (complexKeywords.some(keyword => queryLower.includes(keyword)) || query.length > 200) {
      return "complex";
    }
    return "simple";
  }
  private shouldIncludeSQL(userRole: string): boolean {
    // Seuls les administrateurs et BE managers peuvent voir le SQL généré
    return userRole === "admin" || userRole === "be_manager";
  }
  private generateExplanation(query: string, results: unknown[], userRole: string): string {
    const resultCount = results.length;
    if (resultCount === 0) {
      return "Aucun résultat trouvé pour votre recherche. Vous pouvez essayer de reformuler votre question ou d'élargir vos critères.";
    }
    if (resultCount === 1) {
      return `J'ai trouvé 1 résultat correspondant à votre demande "${query}".`;
    }
    return `J'ai trouvé ${resultCount} résultats correspondant à votre demande "${query}". Les données sont triées par pertinence.`;
  }
  private async generateContextualSuggestions(
    userId: string,
    userRole: string,
    query: string,
    res: unknown[]ny[]
  ): Promise<string[]> {
    // Suggestions de base selon le contexte de la réponse
    if (results.length === 0) {
      return [
        "Essayez avec des critères plus larges",
        "Vérifiez l'orthographe de votre requête",
        "Consultez les données disponibles dans votre périmètre"
      ];
    }
    // Suggestions contextuelles selon le rôle
    const roleSuggestions = DEFAULT_SUGGESTIONS_BY_ROLE[userRole as keyof typeof DEFAULT_SUGGESTIONS_BY_ROLE] || [];
    return roleSuggestions.slice(0, 3);
  }
  private estimateComplexity(text: string): "simple" | "complex" | "expert" {
    return this.detectQueryComplexity(text);
  }
  private estimateExecutionTime(query: string, complexity: "simple" | "complex" | "expert"): number {
    switch (complexity) {
      case "simple": return 500;
      case "complex": return 2000;
      case "expert": return 5000;
      default: return 1000;
    }
  }
  private getTemporalContext(): string[] {
    const now = new Date();
    const context: string[] = [];
    // Contexte saisonnier BTP
    const month = now.getMonth() + 1;
    if (month >= 7 && month <= 8) {
      context.push("Période de congés BTP");
    }
    if (month >= 3 && month <= 5) {
      context.push("Haute saison travaux");
    }
    if (month >= 11 || month <= 2) {
      context.push("Contraintes météorologiques");
    }
    return context;
  }
  private async analyzeRecentPatterns(userId: string, userRole: string): Promise<string[]> {
    return withErrorHandling(
    async () => {
      // Analyser les requêtes récentes de l'utilisateur
      const recentQueries = await db
        .select({ query: chatbotConversations.query })
        .from(chatbotConversations)
        .where(and(
          eq(chatbotConversations.userId, userId),
          gte(chatbotConversations.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 7 jours
        ))
        .orderBy(desc(chatbotConversations.createdAt))
        .limit(10);
      // Extraction de patterns simples
      const patterns: string[] = [];
      const queries = recentQueries.map(q => q.query.toLowerCase());
      if (queries.some(q => q.includes('projet'))) {
        patterns.push("Questions fréquentes sur les projets");
      }
      if (queries.some(q => q.includes('retard'))) {
        patterns.push("Préoccupation pour les retards");
      }
      if (queries.some(q => q.includes('équipe'))) {
        patterns.push("Gestion d'équipe");
      }
      return patterns;
    },
    {
      operation: 'analyzeRecentPatterns',
      service: 'ChatbotOrchestrationService',
      metadata: {
        userId,
        userRole,
        patternsFound: patterns.length
      }
    });
      return [];
    }
  }
  private generateConversationSummary(query: string, response: unknown, errorOccurred: boolean): string {
    if (errorOccurred) {
      return `Erreur lors du traitement de: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`;
    }
    return `Question: "${query.substring(0, 100)}${query.length > 100 ? '...' : ''}"`;
  }
  private generateImprovementSuggestions(request: ChatbotFeedbackRequest): string[] {
    const suggestions: string[] = [];
    if (request.rating <= 2) {
      suggestions.push("Améliorer la précision des réponses");
      suggestions.push("Réduire le temps de réponse");
    }
    if (request.feedbackType === "thumbs_down") {
      suggestions.push("Revoir la pertinence des suggestions");
      suggestions.push("Améliorer la compréhension du contexte");
    }
    if (request.categories?.includes("accuracy")) {
      suggestions.push("Enrichir la base de connaissances métier");
    }
    return suggestions;
  }
  private generateThankYouMessage(feedbackType: string, rating: number): string {
    if (rating >= 4) {
      return "Merci pour votre retour positif ! Nous continuons à améliorer le chatbot pour mieux vous servir.";
    }
    return "Merci pour votre retour. Nous prenons en compte vos suggestions pour améliorer l'expérience.";
  }
  private generateUserFriendlyErrorMessage(errorType: string): string {
    switch (errorType) {
      case "rbac":
        return "Vous n'avez pas les permissions nécessaires pour accéder à ces données.";
      case "security":
        return "Votre requête contient des éléments non autorisés pour des raisons de sécurité.";
      case "timeout":
        return "Votre requête a pris trop de temps à s'exécuter. Essayez de la simplifier.";
      case "validation":
        return "Votre requête n'est pas dans un format valide. Pouvez-vous la reformuler ?";
      default:
        return "Une erreur inattendue s'est produite. Veuillez réessayer ou contacter l'support.";
    }
  }
  private getPeriodStart(period: string): Date {
    const now = new Date();
    switch (period) {
      case "1h":
        return new Date(now.getTime() - 60 * 60 * 1000);
      case "24h":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case "90d":
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case "1y":
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
  // ========================================
  // MÉTHODES D'ACTIONS SÉCURISÉES - NOUVEAU PIPELINE
  // ========================================
  /**
   * Propose une action sécurisée basée sur une intention détectée
   */
  async proposeAction(request: ProposeActionRequest): Promise<ProposeActionResponse> {
    return withErrorHandling(
    async () => {
      logger.info('Proposition d\'action', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'proposeAction',
          actionOperation: request.operation,
          entity: request.entity,
          userId: request.userId
        } });
      const response = await this.actionExecutionService.proposeAction(request);
      // Logging pour métriques chatbot
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "propose-action",
        0, // Le timing sera géré par ActionExecutionService
        response.success,
        0
      );
      return response;
    },
    {
      operation: 'constructor',
      service: 'ChatbotOrchestrationService',
      metadata: { } });
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "propose-action",
        0,
        false,
        0
      );
      return {
        success: false,
        confirmationRequired: false,
        riskLevel: 'high',
        error: {
          type: 'business_rule',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      };
    }
  }
  /**
   * Exécute une action après confirmation utilisateur
   */
  async executeAction(request: ExecuteActionRequest): Promise<ExecuteActionResponse> {
    return withErrorHandling(
    async () => {
      logger.info('Exécution d\'action', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'executeAction',
          actionId: request.actionId,
          userId: request.userId
        } });
      const response = await this.actionExecutionService.executeAction(request);
      // Logging pour métriques chatbot
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "execute-action",
        response.executionTime || 0,
        response.success,
        0
      );
      return response;
    },
    {
      operation: 'constructor',
      service: 'ChatbotOrchestrationService',
      metadata: { } });
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "execute-action",
        0,
        false,
        0
      );
      return {
        success: false,
        actionId: request.actionId,
        error: {
          type: 'execution',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      };
    }
  }
  /**
   * Récupère l'historique des actions d'un utilisateur
   */
  async getActionHistory(request: ActionHistoryRequest): Promise<ActionHistoryResponse> {
    return withErrorHandling(
    async () => {
      logger.info('Récupération historique actions', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'getActionHistory',
          userId: request.userId || 'all'
        } });
      const response = await this.actionExecutionService.getActionHistory(request);
      // Logging pour métriques chatbot
      await this.logUsageMetrics(
        request.userId || "system",
        "system",
        "action-history",
        0,
        response.success,
        0
      );
      return response;
    },
    {
      operation: 'proposeAction',
      service: 'ChatbotOrchestrationService',
      metadata: {
        userId: request.userId,
        userRole: request.userRole,
        operation: request.operation,
        entity: request.entity
      }
    });
      return {
        success: false,
        actions: [],
        total: 0,
        hasMore: false,
        error: {
          type: 'query',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      };
    }
  }
  /**
   * Met à jour une confirmation d'action
   */
  async updateActionConfirmation(request: UpdateConfirmationRequest & { userId: string; userRole: string }): Promise<{ success: boolean; error?: unknown}> {
    return withErrorHandling(
    async () => {
      logger.info('Mise à jour confirmation', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'updateConfirmation',
          confirmationId: request.confirmationId,
          userId: request.userId
        } });
      // TODO: Implémenter la méthode dans ActionExecutionService
      // const response = await this.actionExecutionService.updateConfirmation(request);
      // Logging pour métriques chatbot
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "update-confirmation",
        0,
        true,
        0
      );
      return { success: true };
    },
    {
      operation: 'constructor',
      service: 'ChatbotOrchestrationService',
      metadata: { } });
      await this.logUsageMetrics(
        request.userId,
        request.userRole,
        "update-confirmation",
        0,
        false,
        0
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    });
  }
  // ========================================
  // MÉTHODES UTILITAIRES POUR ACTIONS
  // ========================================
  /**
   * Crée une réponse spécialisée pour les propositions d'actions
   */
  private createActionProposalResponse(
    conversationId: string,
    originalQuery: string,
    actionProposal: ProposeActionResponse,
    actionInten: un, unknown,,unknown,
    userRole: string
  ): ChatbotQueryResponse {
    if (!actionProposal.success) {
      return this.createErrorResponse(
        conversationId,
        originalQuery,
        actionProposal.error?.type || "action_error",
        actionProposal.error?.message || "Erreur lors de la proposition d'action",
        this.generateActionErrorMessage(actionProposal.error?.type || "unknown")
      );
    }
    // Générer une explication conversationnelle pour l'action proposée
    const explanation = this.generateActionExplanation(
      actionIntention,
      actionProposal,
      userRole
    );
    // Générer des suggestions liées aux actions
    const suggestions = this.generateActionSuggestions(
      actionIntention.actionType,
      actionIntention.entity,
      userRole
    );
    return {
      success: true,
      conversation_id: conversationId,
      query: originalQuery,
      explanation,
      sql: undefined, // Pas de SQL pour les actions
      results: [],
      suggestions,
      confidence: actionIntention.confidence,
      execution_time_ms: 0,
      model_used: "action_detection_engine",
      cache_hit: false,
      action_proposal: {
        action_id: actionProposal.actionId,
        confirmation_required: actionProposal.confirmationRequired,
        confirmation_id: actionProposal.confirmationId,
        risk_level: actionProposal.riskLevel,
        estimated_time: actionProposal.estimatedTime,
        warnings: actionProposal.warnings
      }
    };
  }
  /**
   * Génère une explication conversationnelle pour une action proposée
   */
  private generateActionExplanation(
    actionI: unknown,unknown,unknown,
    actionProposal: ProposeActionResponse,
    userRole: string
  ): string {
    const { actionType, entity, operation } = actionIntention;
    let explanation = `🚀 **Action détectée** : ${this.getActionDisplayName(actionType)} sur ${this.getEntityDisplayName(entity)}\n\n`;
    explanation += `✅ **Opération** : ${this.getOperationDisplayName(operation)}\n`;
    explanation += `🔒 **Niveau de risque** : ${this.getRiskLevelDisplay(actionProposal.riskLevel)}\n`;
    if (actionProposal.confirmationRequired) {
      explanation += `⚠️ **Confirmation requise** : Cette action nécessite votre validation avant exécution\n`;
    }
    if (actionProposal.warnings && actionProposal.warnings.length > 0) {
      explanation += `\n📋 **Avertissements** :\n`;
      actionProposal.warnings.forEach(warning => {
        explanation += `• ${warning}\n`;
      });
    }
    if (actionProposal.estimatedTime) {
      explanation += `\n⏱️ **Temps d'exécution estimé** : ${actionProposal.estimatedTime} seconde(s)\n`;
    }
    explanation += `\n${actionProposal.confirmationRequired ? 
      '💡 **Prochaines étapes** : Confirmez cette action pour procéder à son exécution.' : 
      '💡 **Prochaines étapes** : Action prête à être exécutée automatiquement.'
    }`;
    return explanation;
  }
  /**
   * Génère des suggestions contextuelles pour les actions
   */
  private generateActionSuggestions(
    actionType: string,
    entity: string,
    userRole: string
  ): string[] {
    const suggestions: string[] = [];
    // Suggestions selon le type d'action
    switch (actionType) {
      case 'create':
        suggestions.push(`Afficher les ${entity}s récemment créé(e)s`);
        suggestions.push(`Lister les templates pour ${entity}`);
        break;
      case 'update':
        suggestions.push(`Voir l'historique des modifications de ${entity}`);
        suggestions.push(`Afficher les ${entity}s avec le même statut`);
        break;
      case 'delete':
        suggestions.push(`Voir les ${entity}s archivé(e)s`);
        suggestions.push(`Récupérer les ${entity}s supprimé(e)s récemment`);
        break;
      case 'business_action':
        suggestions.push(`Afficher les processus métier disponibles`);
        suggestions.push(`Voir l'état des workflows en cours`);
        break;
    }
    // Suggestions selon le rôle
    if (userRole === 'chef_projet') {
      suggestions.push("Mes projets nécessitant une action");
      suggestions.push("Actions en attente dans mes projets");
    } else if (userRole === 'commercial') {
      suggestions.push("Offres nécessitant un suivi");
      suggestions.push("Actions commerciales recommandées");
    }
    return suggestions.slice(0, 4); // Limiter à 4 suggestions
  }
  /**
   * Génère un message d'erreur adapté pour les actions
   */
  private generateActionErrorMessage(errorType: string): string {
    switch (errorType) {
      case "permission":
        return "Vous n'avez pas les permissions nécessaires pour effectuer cette action.";
      case "validation":
        return "Les paramètres de l'action ne sont pas valides. Veuillez vérifier votre requête.";
      case "business_rule":
        return "Cette action ne respecte pas les règles métier en vigueur.";
      case "security":
        return "Cette action a été bloquée pour des raisons de sécurité.";
      default:
        return "Une erreur inattendue s'est produite lors du traitement de votre action.";
    }
  }
  // ========================================
  // UTILITAIRES D'AFFICHAGE POUR ACTIONS
  // ========================================
  private getActionDisplayName(actionType: string): string {
    const displayNames: Record<string, string> = {
      'create': 'Création',
      'update': 'Modification',
      'delete': 'Suppression',
      'business_action': 'Action métier'
    };
    return displayNames[actionType] || actionType;
  }
  private getEntityDisplayName(entity: string): string {
    const displayNames: Record<string, string> = {
      'offer': 'offre',
      'project': 'projet',
      'ao': 'appel d\'offre',
      'contact': 'contact',
      'task': 'tâche',
      'supplier': 'fournisseur',
      'milestone': 'jalon'
    };
    return displayNames[entity] || entity;
  }
  private getOperationDisplayName(operation: string): string {
    const displayNames: Record<string, string> = {
      'create_offer': 'Créer une nouvelle offre',
      'create_project': 'Créer un nouveau projet',
      'update_status': 'Mettre à jour le statut',
      'update_montant': 'Modifier le montant',
      'archive_offer': 'Archiver l\'offre',
      'transform_to_project': 'Transformer en projet',
      'create_project_task': 'Créer une tâche de projet'
    };
    return displayNames[operation] || operation.replace(/_/g, ' ');
  }
  private getRiskLevelDisplay(riskLevel: string): string {
    const displays: Record<string, string> = {
      'low': '🟢 Faible',
      'medium': '🟡 Modéré', 
      'high': '🔴 Élevé'
    };
    return displays[riskLevel] || riskLevel;
  }
  /**
   * Détecte les zones de focus dans une requête
   * @param query La requête en langage naturel
   * @returns Les zones de focus identifiées
   */
  private detectFocusAreas(query: string): ("planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes")[] {
    const focusAreas: ("planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes")[] = [];
    const queryLower = query.toLowerCase();
    // Mapping des patterns vers les focus areas
    const focusPatterns: Record<"planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes", RegExp[]> = {
      'finances': [
        /montant|prix|coût|budget|factur|chiffr|rentab|marge|ca\b/,
        /recette|dépense|bénéfice|profit/
      ],
      'planning': [
        /date|période|temps|délai|retard|planning|échéance/,
        /aujourd|hier|demain|semaine|mois|année|trimestre/
      ],
      'performance': [
        /kpi|indicateur|performance|métrique|taux|ratio/,
        /conversion|productivité|efficacité|rendement/,
        /compar|vs\b|versus|évolution|progression|tendance/,
        /différence|écart|variation/,
        /total|somme|moyenne|compte|nombre|statistique/,
        /groupé|par\s+\w+|répartition|distribution/
      ],
      'ressources': [
        /équipe|ressource|personne|be\b|bureau\s+d'étude/,
        /charge|capacité|disponibilité|occupation/
      ],
      'qualite': [
        /statut|état|phase|étape|validation|workflow/,
        /en cours|terminé|validé|brouillon|attente/,
        /qualité|contrôle|conformité|norme/
      ],
      'alertes': [
        /alerte|problème|erreur|critique|urgent/,
        /retard|dépassement|conflit|incident/
      ]
    };
    // Détection des focus areas
    for (const [area, patterns] of Object.entries(focusPatterns) as Array<[typeof focusAreas[number], RegExp[]]>) {
      for (const pattern of patterns) {
        if (pattern.test(queryLower)) {
          if (!focusAreas.includes(area)) {
            focusAreas.push(area);
          }
          break; // Une seule détection par area suffit
        }
      }
    }
    // Si aucun focus détecté, ajouter "performance"
    if (focusAreas.length === 0) {
      focusAreas.push('performance');
    }
    return focusAreas;
  }
  /**
   * Analyse le pattern de requête pour identifier le type de question
   * @param query La requête en langage naturel
   * @returns Le type de question et des métadonnées associées
   */
  private analyzeQueryPattern(query: string): {
    queryType: 'kpi' | 'detail' | 'list' | 'comparison' | 'aggregation' | 'action';
    entities: string[];
    temporalCon: unknown;unknown;
    aggregations: string[];
   : unknown[]s: unknown[];
  } {
    const queryLower = query.toLowerCase();
    // Détection du type de requête
    let queryType: 'kpi' | 'detail' | 'list' | 'comparison' | 'aggregation' | 'action' = 'list';
    if (/kpi|indicateur|métrique|taux|performance/.test(queryLower)) {
      queryType = 'kpi';
    } else if (/détail|information|spécifique|concernant/.test(queryLower)) {
      queryType = 'detail';
    } else if (/compar|vs|évolution|tendance|progression/.test(queryLower)) {
      queryType = 'comparison';
    } else if (/somme|total|moyenne|compte|groupé|répartition/.test(queryLower)) {
      queryType = 'aggregation';
    } else if (/créer|modifier|supprimer|valider|envoyer|transformer/.test(queryLower)) {
      queryType = 'action';
    } else if (/liste|tous|affiche|montre/.test(queryLower)) {
      queryType = 'list';
    }
    // Détection des entités métier
    const entities = this.detectBusinessEntities(query);
    // Analyse temporelle
    const temporalContext = this.analyzeTemporalContext(query);
    // Détection des agrégations
    const aggregations = this.detectAggregations(query);
    // Détection des filtres
    const filters = this.detectQueryFilters(query);
    return {
      queryType,
      entities,
      temporalContext,
      aggregations,
      filters
    };
  }
  /**
   * Détecte les entités métier dans une requête
   * @param query La requête en langage naturel
   * @returns Liste des entités métier détectées
   */
  private detectBusinessEntities(query: string): string[] {
    const entities: string[] = [];
    const queryLower = query.toLowerCase();
    // Mapping des patterns d'entités métier JLM
    const entityPatterns: Record<string, RegExp[]> = {
      'project': [/projet/],
      'offer': [/offre/, /devis/],
      'ao': [/ao\b/, /appel.*offre/],
      'supplier': [/fournisseur/],
      'contact': [/contact/, /client/, /architecte/, /maître.*ouvrage/, /maître.*œuvre/],
      'task': [/tâche/, /activité/],
      'team': [/équipe/, /be\b/, /bureau.*étude/, /ressource/],
      'milestone': [/jalon/, /milestone/, /étape/, /livrable/],
      'lot': [/lot\b/],
      'chantier': [/chantier/, /site/],
      'material': [/matériau/, /matériaux/, /menuiserie/, /fenêtre/, /porte/],
      'validation': [/validation/, /bouclage/, /visa/],
      'invoice': [/facture/, /facturation/],
      'payment': [/paiement/, /règlement/],
      'document': [/document/, /fichier/, /pdf/, /plan/, /cctp/]
    };
    // Détection des entités
    for (const [entity, patterns] of Object.entries(entityPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(queryLower)) {
          if (!entities.includes(entity)) {
            entities.push(entity);
          }
          break;
        }
      }
    }
    return entities;
  }
  /**
   * Analyse le contexte temporel d'une requête
   * @param query La requête en langage naturel
   * @returns Le contexte temporel détecté
   */
  private analyzeTemporalContext(query: string): {
    type: 'absolute' | 'relative' | 'range' | 'comparison' | 'none';
    period?: string;
    startDate?: string;
    endDate?: string;
    comparisonPeriod?: string;
  } {
    const queryLower = query.toLowerCase();
    const now = new Date();
    // Détection de dates absolues
    const absoluteDatePattern = /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/;
    if (absoluteDatePattern.test(query)) {
      return { type: 'absolute', period: 'specific_date' };
    }
    // Détection de périodes relatives
    const relativePatterns: Record<string, string> = {
      'aujourd\'hui': 'today',
      'hier': 'yesterday',
      'demain': 'tomorrow',
      'cette semaine': 'this_week',
      'semaine dernière': 'last_week',
      'ce mois': 'this_month',
      'mois dernier': 'last_month',
      'cette année': 'this_year',
      'année dernière': 'last_year',
      'ce trimestre': 'this_quarter',
      'trimestre dernier': 'last_quarter'
    };
    for (const [pattern, period] of Object.entries(relativePatterns)) {
      if (queryLower.includes(pattern)) {
        return { type: 'relative', period };
      }
    }
    // Détection de plages temporelles
    if (/entre.*et|du.*au|depuis.*jusqu/.test(queryLower)) {
      return { type: 'range', period: 'custom_range' };
    }
    // Détection de comparaisons temporelles
    if (/vs|versus|comparé|par rapport/.test(queryLower)) {
      const comparisonPeriod = 
        queryLower.includes('année') ? 'year' :
        queryLower.includes('mois') ? 'month' :
        queryLower.includes('semaine') ? 'week' : 'period';
      return { type: 'comparison', comparisonPeriod };
    }
    // Détection de périodes glissantes
    if (/derniers?\s+\d+\s+(jours?|semaines?|mois|années?)/.test(queryLower)) {
      return { type: 'relative', period: 'rolling' };
    }
    return { type: 'none' };
  }
  /**
   * Détecte les agrégations demandées dans une requête
   * @param query La requête en langage naturel
   * @returns Liste des agrégations détectées
   */
  private detectAggregations(query: string): string[] {
    const aggregations: string[] = [];
    const queryLower = query.toLowerCase();
    const aggregationPatterns: Record<string, RegExp[]> = {
      'sum': [/somme/, /total/, /cumul/],
      'avg': [/moyenne/, /moy\b/],
      'count': [/compte/, /nombre/, /combien/, /quantité/],
      'max': [/maximum/, /max\b/, /plus\s+(grand|élevé|haut)/],
      'min': [/minimum/, /min\b/, /plus\s+(petit|faible|bas)/],
      'group_by': [/par\s+\w+/, /groupé/, /répartition/, /ventilation/],
      'distinct': [/distinct/, /unique/, /différent/],
      'percentage': [/pourcentage/, /%/, /taux/, /ratio/, /proportion/],
      'median': [/médiane/],
      'stddev': [/écart[- ]type/, /variance/, /dispersion/]
    };
    for (const [agg, patterns] of Object.entries(aggregationPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(queryLower)) {
          if (!aggregations.includes(agg)) {
            aggregations.push(agg);
          }
          break;
        }
      }
    }
    return aggregations;
  }
  /**
   * Détecte les filtres dans une requête
   * @param query La requête en langage naturel
   * @returns Liste des filtres détectés
   */
  private detectQueryFilters(qu: unknown[]rinunknown[]ny[] {
 : unknown[]t funknown[unknown unknown[] = [];
    const queryLower = query.toLowerCase();
    // Détection des filtres de statut
    const statusPatterns: Record<string, string[]> = {
      'en_cours': ['en cours', 'actif', 'active'],
      'termine': ['terminé', 'fini', 'clos', 'clôturé'],
      'valide': ['validé', 'approuvé', 'confirmé'],
      'brouillon': ['brouillon', 'draft', 'en préparation'],
      'en_attente': ['en attente', 'en suspens', 'pending']
    };
    for (const [status, patterns] of Object.entries(statusPatterns)) {
      for (const pattern of patterns) {
        if (queryLower.includes(pattern)) {
          filters.push({ type: 'status', value: status });
          break;
        }
      }
    }
    // Détection des filtres numériques
    const numericPatterns = [
      /supérieur\s+à\s+(\d+)/,
      /inférieur\s+à\s+(\d+)/,
      /entre\s+(\d+)\s+et\s+(\d+)/,
      /plus\s+de\s+(\d+)/,
      /moins\s+de\s+(\d+)/
    ];
    for (const pattern of numericPatterns) {
      const match = queryLower.match(pattern);
      if (match) {
        filters.push({ 
          type: 'numeric', 
          operator: pattern.source.includes('supérieur') ? '>' : 
                    pattern.source.includes('inférieur') ? '<' : 
                    pattern.source.includes('entre') ? 'between' : '=',
          value: match[1],
          value2: match[2] // Pour between
        });
      }
    }
    // Détection des filtres géographiques
    const geoPatterns = /département\s+(\d{2})|région\s+(\w+)|ville\s+(\w+)/;
    const geoMatch = queryLower.match(geoPatterns);
    if (geoMatch) {
      filters.push({
        type: 'geographic',
        value: geoMatch[1] || geoMatch[2] || geoMatch[3]
      });
    }
    return filters;
  }
  // ========================================
  // SYSTÈME DE CACHE LRU AMÉLIORÉ - VRAIE IMPLÉMENTATION
  // ========================================
  /**
   * Classe LRU Cache réelle avec TTL et gestion mémoire
   */
  private lruCache = (() => {
    class LRUCache {
    private cache: Map<string, {
   : unknown;unknownnown;unknown;
      timestamp: number;
      ttl: number;
      hits: number;
      q: unknown;unknownnown;n?: unknown;
    }>;
    private maxSize: number;
    private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes par défaut
    constructor(maxSize = 1000) {
      this.cache = new Map();
      this.maxSize = maxSize;
    }
    /**
     * Récupère une valeur du cache avec gestion LRU
     */
    geunknowney: string): unknown {
      const entry = this.cache.get(key);
      if (!entry) {
        logger.debug('Cache miss', { metadata: {
            service: 'LRUCache',
                  operation: 'get',
            key,
            cacheSize: this.cache.size   
                }
             } });
        return null;
      }
      // Vérification TTL
      if (Date.now() > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        logger.debug('Cache entry expired', { metadata: {
            service: 'LRUCache',
                  operation: 'get',
            key,
            ttl: entry.ttl,
            age: Date.now() - entry.timestamp   
                }
             } });
        return null;
      }
      // Déplacer en fin pour LRU (plus récent)
      this.cache.delete(key);
      entry.hits++;
      entry.timestamp = Date.now();
      // Augmenter TTL si populaire
      if (entry.hits > 10) {
        entry.ttl = Math.min(entry.ttl * 1.5, 30 * 60 * 1000);
      }
      this.cache.set(key, entry);
      logger.debug('Cache hit', { metadata: {
          service: 'LRUCache',
          operation: 'get',
          key,
          hits: entry.hits,
          ttl: entry.ttl,
          cacheSize: this.cache.size   
              }
             } });
      return entry.value;
    });
    /**
     * Ajoute ou met à jour une entrée dans le cache
     */
    set(key: s: unknownnown,unknown,ue: unknown, ttl?: number, queryPattern?: unknown): void {
      // Éviction si plein (supprime le premier = le plus ancien)
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
          logger.debug('Cache eviction (LRU)', { metadata: {
              service: 'LRUCache',
                    operation: 'set',
              evictedKey: firstKey,
              reason: 'max_size_reached',
              maxSize: this.maxSize   
                  }
             } });
        });
      }
      const effectiveTTL = ttl || this.calculateAdaptiveTTL(queryPattern);
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        ttl: effectiveTTL,
        hits: 0,
        queryPattern
      });
      logger.debug('Cache set', { metadata: {
          service: 'LRUCache',
          operation: 'set',
          key,
          ttl: effectiveTTL,
          cacheSize: this.cache.size,
          queryType: queryPattern?.queryType   
              }
             } });
    });
    /**
     * Invalide des entrées basées sur un pattern
     */
    invalidateByPattern(entityType: string, event: string): number {
      const keysToDelete: string[] = [];
      for (const [key, entry] of Array.from(this.cache.entries())) {
        if (entry.queryPattern?.entities?.includes(entityType)) {
          keysToDelete.push(key);
        } else if (event === 'major_update' && entry.queryPattern?.queryType === 'kpi') {
          keysToDelete.push(key);
        }
      }
      for (const key of keysToDelete) {
        this.cache.delete(key);
      }
      if (keysToDelete.length > 0) {
        logger.info('Cache invalidation par pattern', { metadata: {
            service: 'LRUCache',
                  operation: 'invalidateByPattern',
            entityType,
            event,
            keysInvalidated: keysToDelete.length,
            remainingSize: this.cache.size   
                }
             } });
      });
      return keysToDelete.length;
    }
    /**
     * Calcule un TTL adaptatif basé sur le pattern
     */
    private calculateAdaptiveTTL(queryPatt: unknown): number {
      if (!queryPattern) return this.DEFAULT_TTL_MS;
      // KPIs : cache plus long
      if (queryPattern.queryType === 'kpi') {
        return 15 * 60 * 1000; // 15 minutes
      }
      // Comparaisons temporelles : cache court
      if (queryPattern.queryType === 'comparison' || 
          queryPattern.temporalContext?.type === 'relative') {
        return 2 * 60 * 1000; // 2 minutes
      }
      // Listes et détails : cache moyen
      if (queryPattern.queryType === 'list' || 
          queryPattern.queryType === 'detail') {
        return 5 * 60 * 1000; // 5 minutes
      }
      // Actions : pas de cache
      if (queryPattern.queryType === 'action') {
        return 30 * 1000; // 30 secondes seulement
      }
      return this.DEFAULT_TTL_MS;
    }
    /**
     * Nettoie les entrées expirées
     */
    cleanup(): number {
      const now = Date.now();
      let cleaned = 0;
      for (const [key, entry] of Array.from(this.cache.entries())) {
        if (now > entry.timestamp + entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        logger.debug('Cache cleanup', { metadata: {
            service: 'LRUCache',
                  operation: 'cleanup',
            entriesCleaned: cleaned,
            remainingSize: this.cache.size   
                }
             } });
      });
      return cleaned;
    }
    /**
     * Obtient des statistiques du cache
     */
    getStats(): {
      size: number;
      maxSize: number;
      utilization: number;
      oldestEntry?: number;
      newestEntry?: number;
    } {
      let oldestTimestamp = Date.now();
      let newestTimestamp = 0;
      for (const entry of Array.from(this.cache.values())) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
        if (entry.timestamp > newestTimestamp) {
          newestTimestamp = entry.timestamp;
        }
      }
      return {
        size: this.cache.size,
        maxSize: this.maxSize,
        utilization: (this.cache.size / this.maxSize) * 100,
        oldestEntry: this.cache.size > 0 ? Date.now() - oldestTimestamp : undefined,
        newestEntry: this.cache.size > 0 ? Date.now() - newestTimestamp : undefined
      };
    }
    /**
     * Vide complètement le cache
     */
    clear(): void {
      const previousSize = this.cache.size;
      this.cache.clear();
      logger.info('Cache cleared', { metadata: {
          service: 'LRUCache',
          operation: 'clear',
          previousSize   
              }
             } });
    });
  }
    return new LRUCache(1000);
  })();
  /**
   * Méthodes wrapper pour compatibilité avec le code existant
   */
  private setCacheLRU(k: unknownnown,unknown,, data:unknowny, quer: unknown)unknown): void {
    this.lruCache.set(key, data, undefined, queryPattern);
  }
  private getCacheLRU(key: string): unknown | null {
    return this.lruCache.get(key);
  }
  /**
   * Invalide le cache basé sur les événements
   */
  private invalidateCacheByEvent(event: string, entityType: string): void {
    const invalidatedCount = this.lruCache.invalidateByPattern(entityType, event);
    if (invalidatedCount > 0) {
      logger.info('Cache invalidé par événement', { metadata: {
          service: 'ChatbotOrchestrationService',
          operation: 'invalidateCacheByEvent',
          event,
          entityType,
          keysInvalidated: invalidatedCount   
              }
             } });
    });
  }
  /**
   * Précharge le cache avec les KPIs principaux
   * @param userRole Rôle de l'utilisateur pour personnalisation
   */
  async warmupCache(userRole: string): Promise<void> {
    const warmupQueries = this.getWarmupQueries(userRole);
    for (const query of warmupQueries) {
      try {
        const request: ChatbotQueryRequest = {
          query,
          userId: 'system',
          userRole,
          options: { 
            dryRun: false,
            explainQuery: false,
            includeDebugInfo: false
          }
        };
        // Exécution en arrière-plan sans attendre
        this.processChatbotQuery(request).catch(error => {
          logger.warn('Erreur warmup cache', { metadata: {
              service: 'ChatbotOrchestrationService',
                    operation: 'warmupCache',
              query,
                    error: error instanceof Error ? error.message : String(error)
                  }
             } });
        });
      } catch (error) {
        // Ignorer les erreurs de warmup
      }
    }
  }
  /**
   * Retourne les requêtes de warmup selon le rôle
   * @param userRole Rôle de l'utilisateur
   * @returns Liste des requêtes à préchauffer
   */
  private getWarmupQueries(userRole: string): string[] {
    const baseQueries = [
      "KPI principaux du mois",
      "Projets en cours",
      "Alertes actives"
    ];
    const roleSpecificQueries: Record<string, string[]> = {
      'admin': [
        "Performance globale ce mois",
        "Charge BE actuelle",
        "Taux de conversion AO"
      ],
      'chef_projet': [
        "Mes projets actifs",
        "Planning de la semaine",
        "Ressources disponibles"
      ],
      'commercial': [
        "Opportunités en cours",
        "Pipeline commercial",
        "Offres à relancer"
      ],
      'be_manager': [
        "Charge équipe BE",
        "Validations en attente",
        "Projets prioritaires"
      ]
    };
    return [...baseQueries, ...(roleSpecificQueries[userRole] || [])];
  }
  // ========================================
  // TEMPLATES SQL OPTIMISÉS
  // ========================================
  /**
   * Génère un template SQL optimisé basé sur le pattern de requête
   * @param queryPattern Pattern analysé de la requête
   * @param entities Entités métier détectées
   * @returns Template SQL avec hints de performance
   */
  private generateOptimizedSQunknown unknown,unknown,eryPat: unknown, unknown, entities: string[]): {
    template: string;
    hints: string[];
    estimatedComplexity: number;
  } {
    const hints: string[] = [];
    let template = '';
    let estimatedComplexity = 1;
    // Templates pour KPIs
    if (queryPattern.queryType === 'kpi') {
      template = this.getKPITemplate(queryPattern, entities);
      hints.push('USE_INDEX_FOR_AGGREGATION');
      hints.push('ENABLE_PARALLEL_EXECUTION');
      estimatedComplexity = 2;
    }
    // Templates pour comparaisons
    else if (queryPattern.queryType === 'comparison') {
      template = this.getComparisonTemplate(queryPattern, entities);
      hints.push('USE_WINDOW_FUNCTIONS');
      hints.push('OPTIMIZE_FOR_TEMPORAL_QUERIES');
      estimatedComplexity = 3;
    }
    // Templates pour agrégations
    else if (queryPattern.queryType === 'aggregation') {
      template = this.getAggregationTemplate(queryPattern, entities);
      hints.push('USE_MATERIALIZED_VIEW_IF_EXISTS');
      hints.push('ENABLE_HASH_AGGREGATION');
      estimatedComplexity = 2;
    }
    // Templates pour listes simples
    else if (queryPattern.queryType === 'list') {
      template = this.getListTemplate(queryPattern, entities);
      hints.push('USE_COVERING_INDEX');
      hints.push('LIMIT_EARLY');
      estimatedComplexity = 1;
    }
    // Détection des jointures nécessaires
    const requiredJoins = this.detectRequiredJoins(entities);
    if (requiredJoins.length > 0) {
      hints.push(`REQUIRED_JOINS: ${requiredJoins.join(', ')}`);
      estimatedComplexity += requiredJoins.length * 0.5;
    }
    // Optimisations temporelles
    if (queryPattern.temporalContext?.type !== 'none') {
      hints.push('USE_DATE_INDEX');
      if (queryPattern.temporalContext.type === 'range') {
        hints.push('PARTITION_PRUNING_ON_DATE');
      }
    }
    return { template, hints, estimatedComplexity };
  }
  /**
   * Détecte les jointures nécessaires basées sur les entités
   * @param entities Liste des entités métier
   * @returns Liste des jointures requises
   */
  private detectRequiredJoins(entities: string[]): string[] {
    const joins: string[] = [];
    const entityRelations: Record<string, string[]> = {
      'project': ['offers', 'project_tasks', 'project_timelines', 'team_resources'],
      'offer': ['projects', 'ao_documents', 'chiffrage_elements', 'suppliers'],
      'ao': ['ao_documents', 'offers', 'contacts'],
      'supplier': ['offers', 'validation_milestones'],
      'team': ['team_resources', 'projects', 'project_tasks'],
      'milestone': ['validation_milestones', 'projects'],
      'chantier': ['projects', 'project_tasks', 'date_alerts']
    };
    const tablesNeeded = new Set<string>();
    for (const entity of entities) {
      const relatedTables = entityRelations[entity] || [];
      relatedTables.forEach(table => tablesNeeded.add(table));
    }
    // Déterminer les jointures basées sur les tables nécessaires
    if (tablesNeeded.has('offers') && tablesNeeded.has('projects')) {
      joins.push('offers_projects');
    }
    if (tablesNeeded.has('projects') && tablesNeeded.has('project_tasks')) {
      joins.push('projects_tasks');
    }
    if (tablesNeeded.has('offers') && tablesNeeded.has('suppliers')) {
      joins.push('offers_suppliers');
    }
    return joins;
  }
  /**
   * Template SQL pour les KPIs
   */
  private gunknown unknown,unknown,e(quer: unknown,rn: unknown, entities: string[]): string {
    return `
      -- Template KPI optimisé
      WITH kpi_data AS (
        SELECT 
          COUNT(*) as total_count,
          SUM(montant) as total_montant,
          AVG(montant) as avg_montant,
          MAX(montant) as max_montant
        FROM main_table
        WHERE date_column >= :start_date AND date_column <= :end_date
      )
      SELECT * FROM kpi_data;
    `;
  }
  /**
   * Template SQL pour les comparaisons
   */
  private getCunknown unknown,unknown,plate(: unknown,atteunknunknown,any, entities: string[]): string {
    return `
      -- Template comparaison temporelle optimisé
      WITH period_current AS (
        SELECT metric, value
        FROM main_table
        WHERE date_column >= :current_start AND date_column <= :current_end
      ),
      period_previous AS (
        SELECT metric, value
        FROM main_table  
        WHERE date_column >= :previous_start AND date_column <= :previous_end
      )
      SELECT 
        c.metric,
        c.value as current_value,
        p.value as previous_value,
        ((c.value - p.value) / p.value * 100) as variation_percent
      FROM period_current c
      JOIN period_previous p ON c.metric = p.metric;
    `;
  }
  /**
   * Template SQL pour les agrégations
   */
  private gunknown unknown,unknown,nTempl: unknown,eryPunknunknown,rn: any, entities: string[]): string {
    return `
      -- Template agrégation optimisé
      SELECT 
        group_column,
        COUNT(*) as count,
        SUM(value_column) as total,
        AVG(value_column) as average,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value_column) as median
      FROM main_table
      WHERE filter_conditions
      GROUP BY group_column
      HAVING count > :min_count
      ORDER BY total DESC
      LIMIT :limit;
    `;
  }
  /**
   * Template SQL pour les listes
   */
unknown unknown,unknown,tListT: unknown,e(quunknunknown,attern: any, entities: string[]): string {
    return `
      -- Template liste optimisé
      SELECT 
        id, name, status, date_created, montant
      FROM main_table
      WHERE status IN (:statuses)
        AND date_column >= :start_date
      ORDER BY date_created DESC
      LIMIT :limit OFFSET :offset;
    `;
  }
  // ========================================
  // GARDE-FOUS MÉTIER
  // ========================================
  /**
   * Valide la cohérence métier d'une requête
   * @param request Requête chatbot
   * @param queryPattern Pattern analysé
   * @returns Validation et avertissements
   */
  private validateBusinessCoherence(
    request: ChatbotQueryRequest,
    : unknown)ern: unknown
  ): {
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let isValid = true;
    // Validation temporelle
    if (queryPattern.temporalContext?.type === 'range') {
      const dateValidation = this.validateTemporalCoherence(queryPattern.temporalContext);
      if (!dateValidation.isValid) {
        warnings.push(dateValidation.warning);
        suggestions.push(dateValidation.suggestion);
      }
    }
    // Détection de requêtes potentiellement coûteuses
    const costAnalysis = this.analyzeQueryCost(queryPattern, request.userRole);
    if (costAnalysis.isExpensive) {
      warnings.push(`⚠️ Cette requête pourrait prendre du temps (${costAnalysis.estimatedTime}s)`);
      suggestions.push(costAnalysis.optimizationSuggestion);
      // Bloquer si trop coûteuse pour le rôle
      if (costAnalysis.shouldBlock) {
        isValid = false;
        warnings.push("❌ Requête trop complexe pour votre niveau d'accès");
      }
    }
    // Validation des limites par rôle
    const limitValidation = this.validateRoleLimits(request.userRole, queryPattern);
    if (!limitValidation.isValid) {
      isValid = false;
      warnings.push(limitValidation.warning);
      suggestions.push(limitValidation.suggestion);
    }
    // Validation de la cohérence métier JLM
    const businessValidation = this.validateJLMBusinessRules(queryPattern);
    if (!businessValidation.isValid) {
      warnings.push(businessValidation.warning);
      suggestions.push(businessValidation.suggestion);
    }
    return { isValid, warnings, suggestions };
  }
  /**
   * Valide la cohérence temporelle
   */
  privateunknownlidateTemporalCoherence(te: unknown)Cunknown)xt: unknown): {
    isValid: boolean;
    warning: string;
    suggestion: string;
  } {
    // Vérifier que la plage n'est pas trop large
    if (temporalContext.type === 'range') {
      // Logique pour calculer la durée de la plage
      // Pour l'instant, on considère qu'une plage > 1 an est suspecte
      return {
        isValid: true, // À implémenter selon les dates réelles
        warning: '',
        suggestion: ''
      };
    }
    return { isValid: true, warning: '', suggestion: '' };
  }
  /**
   * Analyse le coût estimé d'une requêteunknown */: unknown,unknown, analy: unknown,yCosunknunknown,eryPattern: any, userRole: string): {
    isExpensive: boolean;
    estimatedTime: number;
    shouldBlock: boolean;
    optimizationSuggestion: string;
  } {
    let estimatedTime = 1; // secondes
    // Facteurs de coût
    if (queryPattern.queryType === 'comparison') estimatedTime *= 2;
    if (queryPattern.queryType === 'aggregation') estimatedTime *= 1.5;
    if (queryPattern.entities.length > 2) estimatedTime *= queryPattern.entities.length * 0.7;
    if (queryPattern.aggregations.includes('group_by')) estimatedTime *= 1.5;
    if (queryPattern.temporalContext?.type === 'range') estimatedTime *= 1.2;
    // Limites par rôle
    const roleLimits: Record<string, number> = {
      'admin': 30,
      'chef_projet': 15,
      'commercial': 10,
      'be_manager': 15,
      'viewer': 5
    };
    const maxTime = roleLimits[userRole] || 10;
    return {
      isExpensive: estimatedTime > 5,
      estimatedTime: Math.round(estimatedTime),
      shouldBlock: estimatedTime > maxTime,
      optimizationSuggestion: estimatedTime > 5 ? 
        "Essayez de réduire la période ou le nombre d'entités analysées" :
        ""
    };
  }
  /**
   * Valide les limites selon le rôle utilisateur
   */
  privateunknownlidateRoleLimits(userRole: str: unknown)uunknunknown)at: unknunknown)any): {
    isValid: boolean;
    warning: string;
    suggestion: string;
  } {
    // Définition des limites par rôle
    const limits: Record<string, unknown> = {
      'viewer': {
        maxEntities: 1,
        allowedQueryTypes: ['list', 'detail'],
        maxTimeRange: 30 // jours
      },
      'commercial': {
        maxEntities: 2,
        allowedQueryTypes: ['list', 'detail', 'kpi'],
        maxTimeRange: 90
      },
      'chef_projet': {
        maxEntities: 3,
        allowedQueryTypes: ['list', 'detail', 'kpi', 'aggregation'],
        maxTimeRange: 365
      },
      'be_manager': {
        maxEntities: 3,
        allowedQueryTypes: ['list', 'detail', 'kpi', 'aggregation'],
        maxTimeRange: 365
      },
      'admin': {
        maxEntities: 10,
        allowedQueryTypes: ['list', 'detail', 'kpi', 'aggregation', 'comparison', 'action'],
        maxTimeRange: 9999
      }
    };
    const userLimits = limits[userRole] || limits['viewer'];
    // Validation du nombre d'entités
    if (queryPattern.entities.length > userLimits.maxEntities) {
      return {
        isValid: false,
        warning: `Votre rôle ne permet pas de requêter plus de ${userLimits.maxEntities} entité(s) à la fois`,
        suggestion: "Simplifiez votre requête en vous concentrant sur une entité principale"
      };
    }
    // Validation du type de requête
    if (!userLimits.allowedQueryTypes.includes(queryPattern.queryType)) {
      return {
        isValid: false,
        warning: `Les requêtes de type "${queryPattern.queryType}" ne sont pas autorisées pour votre rôle`,
        suggestion: "Contactez votre administrateur si vous avez besoin de cet accès"
      };
    }
    return { isValid: true, warning: '', suggestion: '' };
  }
  /**
   * Valide les règles métier spécifiques JLMunknown */
  private validateJLMBusin: unknown)eunknunknown)er: unknunknown)rn: any): {
    isValid: boolean;
    warning: string;
    suggestion: string;
  } {
    // Règles métier JLM spécifiques
    // Règle: Les comparaisons de chantiers nécessitent au moins 1 mois de données
    if (queryPattern.entities.includes('chantier') && 
        queryPattern.queryType === 'comparison') {
      if (queryPattern.temporalContext?.period === 'week') {
        return {
          isValid: false,
          warning: "Les comparaisons de chantiers nécessitent au moins 1 mois de données",
          suggestion: "Utilisez une période mensuelle ou plus longue pour comparer les chantiers"
        };
      }
    }
    // Règle: Les KPIs financiers sont limités aux rôles autorisés
    if (queryPattern.queryType === 'kpi' && 
        queryPattern.focusAreas?.includes('financial')) {
      // Cette validation devrait être faite via RBAC
      // Ici on met juste un warning
      return {
        isValid: true,
        warning: "",
        suggestion: ""
      };
    }
    return { isValid: true, warning: '', suggestion: '' };
  }
  // ========================================
  // MÉTHODES D'ENRICHISSEMENT DES RÉPONSES
  // ========================================
  /**
   * Génère une explication enrichie avec métadonnées contextuelles
   * @param query La requête originale
   * @param results Les résultats de la requête
   * @param userRole Le rôle de l'utilisateur
   * @param queryPattern Le pattern analysé de la requête
   * @param metadata Métadonnées supplémentaires
   * @returns Une explication enrichie et contextualisée
   */
  private generateEnrichedExplanation(
    query:: unknown[],
    results: a: unknown,    userRole: string,
    queryP: unknown)nyunknown)eta: unknown unknown
  ): string {
    let explanation = '';
    // Introduction contextuelle selon le type de requête
    switch (queryPattern.queryType) {
      case 'kpi':
        explanation = `📊 **Indicateurs clés de performance**\n\n`;
        break;
      case 'comparison':
        explanation = `📈 **Analyse comparative**\n\n`;
        break;
      case 'aggregation':
        explanation = `📊 **Analyse agrégée**\n\n`;
        break;
      case 'list':
        explanation = `📋 **Liste des résultats**\n\n`;
        break;
      case 'detail':
        explanation = `🔍 **Détails spécifiques**\n\n`;
        break;
      default:
        explanation = `📌 **Résultats de votre requête**\n\n`;
    }
    // Résumé des résultats
    if (results.length === 0) {
      explanation += `❌ Aucun résultat trouvé pour votre requête.\n\n`;
      // Suggestions spécifiques selon le contexte
      if (queryPattern.temporalContext?.type !== 'none') {
        explanation += `💡 **Conseil** : Essayez d'élargir la période temporelle.\n`;
      }
      if (queryPattern.filters?.length > 0) {
        explanation += `💡 **Conseil** : Vérifiez les filtres appliqués ou essayez avec moins de critères.\n`;
      }
    } else {
      explanation += `✅ **${results.length} résultat${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}**\n\n`;
      // Contexte temporel
      if (queryPattern.temporalContext?.type !== 'none') {
        explanation += `📅 **Période analysée** : `;
        switch (queryPattern.temporalContext.type) {
          case 'relative':
            explanation += `${queryPattern.temporalContext.period}\n`;
            break;
          case 'range':
            explanation += `Plage personnalisée\n`;
            break;
          case 'comparison':
            explanation += `Comparaison ${queryPattern.temporalContext.comparisonPeriod}\n`;
            break;
          default:
            explanation += `Période spécifique\n`;
        }
      }
      // Entités analysées
      if (queryPattern.entities.length > 0) {
        explanation += `🏢 **Entités concernées** : ${queryPattern.entities.join(', ')}\n`;
      }
      // Agrégations appliquées
      if (queryPattern.aggregations.length > 0) {
        explanation += `📊 **Calculs appliqués** : ${queryPattern.aggregations.join(', ')}\n`;
      }
      // Insights principaux selon le type de données
      if (queryPattern.queryType === 'kpi' && results.length > 0) {
        explanation += `\n**Points clés** :\n`;
        // Analyser les tendances principales
        const firstResult = results[0];
        Object.keys(firstResult).slice(0, 3).forEach(key => {
          if (typeof firstResult[key] === 'number') {
            explanation += `• ${key}: ${this.formatNumber(firstResult[key])}\n`;
          });
      }
      // Avertissements si données partielles
      if (results.length >= 1000) {
        explanation += `\n⚠️ **Note** : Résultats limités aux 1000 premiers enregistrements.\n`;
      }
    }
    // Métadonnées de performance
    if (metadata?.executionTime) {
      explanation += `\n⏱️ **Temps d'exécution** : ${metadata.executionTime}ms\n`;
    }
    return explanation;
  }
  /**
   * Génère des suggestions améliorées basées sur le contexte et les résultats
   * @param userId ID de l'utilisateur
   * @param userRole Rôle de l'utilisateur
   * @param query Requête originale
   * @param results Résultats obtenus
   * @param queryPattern Pattern de la requête
   * @returns Suggestions contextuelles enrichies
   */
  private async generateEnhancedSuggestions(
    userId: string,
    userRole: string,
   unknown: unknown[]ring,
    result: unknown)
 unknown): unknunknown)nown unknown
  ): Promise<string[]> {
    const suggestions: string[] = [];
    // Suggestions basées sur le type de requête
    switch (queryPattern.queryType) {
case 'kpi':;
        suggestions.push('Voir l\'évolution de ces KPIs sur le mois dernier');
        suggestions.push('Comparer avec la même période l\'année dernière');
        suggestions.push('Détailler par équipe ou par projet');
        break;
case 'comparison':;
        suggestions.push('Analyser les facteurs de variation');
        suggestions.push('Voir le détail par semaine');
        suggestions.push('Exporter les données pour analyse approfondie');
        break;
case 'aggregation':;
        if (!queryPattern.aggregations.includes('group_by')) {
          suggestions.push('Grouper les résultats par catégorie');
        }
        suggestions.push('Voir la distribution en pourcentages');
        suggestions.push('Afficher les valeurs extrêmes');
        break;
case 'list':;
        if (results.length > 20) {
          suggestions.push('Filtrer par statut ou par date');
        }
        suggestions.push('Voir les statistiques globales');
        suggestions.push('Exporter la liste complète');
        break;
case 'detail':;
        suggestions.push('Voir l\'historique des modifications');
        suggestions.push('Comparer avec des éléments similaires');
        suggestions.push('Voir les documents associés');
        break;
    }
    // Suggestions basées sur les entités détectées
    if (queryPattern.entities.includes('project')) {
      suggestions.push('Voir le planning détaillé du projet');
      suggestions.push('Analyser la charge de travail associée');
    }
    if (queryPattern.entities.includes('offer')) {
      suggestions.push('Comparer les taux de conversion des offres');
      suggestions.push('Voir les offres en attente de validation');
    }
    if (queryPattern.entities.includes('supplier')) {
      suggestions.push('Analyser la performance des fournisseurs');
      suggestions.push('Voir les commandes en cours');
    }
    // Suggestions temporelles
    if (queryPattern.temporalContext?.type === 'none') {
      suggestions.push('Ajouter un filtre temporel pour plus de précision');
    } else if (queryPattern.temporalContext?.type === 'relative') {
      suggestions.push('Comparer avec la période précédente');
    }
    // Suggestions basées sur les résultats
    if (results.length === 0) {
      suggestions.push('Élargir les critères de recherche');
      suggestions.push('Vérifier l\'orthographe des termes');
      suggestions.push('Consulter l\'aide pour la syntaxe des requêtes');
    } else if (results.length === 1) {
      suggestions.push('Voir les éléments similaires');
      suggestions.push('Afficher l\'historique complet');
    }
    // Personnalisation par rôle
    const roleSuggestions = DEFAULT_SUGGESTIONS_BY_ROLE[userRole as keyof typeof DEFAULT_SUGGESTIONS_BY_ROLE] || [];
    suggestions.push(...roleSuggestions.slice(0, 2));
    // Limiter et dédupliquer
    const uniqueSuggestions = Array.from(new Set(suggestions));
    return uniqueSuggestions.slice(0, 6);
  }
  /**
   * Génère des métadonnées contextuelles pour enrichir la réponse
   * @param results Résultats de la requête
   * @param queryPattern Pattern analysé
   * @param sql SQL généré
   * @param executionTime Temps d'exécution
   * @returns Métadonnées contextuelles
   */
  private generateContextualMetadata(
    results: unknown[],
    queryPattern: any,
    sql: string,
    executionTime: number
  ): any {
    const metadata: any = {
      recordCount: results.length,
      executionTimeMs: executionTime,
      queryComplexity: this.detectQueryComplexity(queryPattern.query || ''),
      performanceRating: this.getPerformanceRating(executionTime)
    };
    // Analyse temporelle
    if (queryPattern.temporalContext?.type !== 'none') {
      metadata.temporalAnalysis = {
        type: queryPattern.temporalContext.type,
        period: queryPattern.temporalContext.period,
        comparisonEnabled: queryPattern.temporalContext.type === 'comparison'
      };
    }
    // Statistiques sur les résultats
    if (results.length > 0) {
      metadata.resultStatistics = {
        hasData: true,
        isComplete: results.length < 1000,
        dataQuality: this.assessDataQuality(results)
      };
      // Détection de colonnes numériques pour stats
      const firstResult = results[0];
      const numericColumns = Object.keys(firstResult).filter(key => 
        typeof firstResult[key] === 'number'
      );
      if (numericColumns.length > 0) {
        metadata.numericSummary = {};
        numericColumns.forEach(col => {
          const values = results.map(r => r[col]).filter(v => v !== null && v !== undefined);
          if (values.length > 0) {
            metadata.numericSummary[col] = {
              min: Math.min(...values),
              max: Math.max(...values),
              avg: values.reduce((a, b) => a + b, 0) / values.length,
                    count: values.length
            };
          });
      }
    }
    // Analyse de la requête SQL
    if (sql) {
      metadata.sqlAnalysis = {
        hasJoins: /JOIN/i.test(sql),
        hasAggregations: /GROUP BY|SUM|AVG|COUNT/i.test(sql),
        hasFilters: /WHERE/i.test(sql),
        hasOrdering: /ORDER BY/i.test(sql),
        estimatedCost: this.estimateSQLCost(sql)
      };
    }
    // Recommandations d'optimisation
    if (executionTime > 3000) {
      metadata.optimizationHints = [
        'Considérer l\'ajout d\'index sur les colonnes fréquemment filtrées',
        'Limiter la période temporelle pour réduire le volume de données',
        'Utiliser la pagination pour les grandes listes'
      ];
    }
    return metadata;
  }
  /**
   * Formate un nombre pour l'affichage
   */
  private formatNumber(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    } else if (Number.isInteger(value)) {
      return value.toString();
    } else {
      return value.toFixed(2);
    }
  }
  /**
   * Évalue la performance d'une requête
   */
  private getPerformanceRating(executionTime: number): string {
    if (executionTime < 500) return 'excellent';
    if (executionTime < 2000) return 'good';
    if (executionTime < 5000) return 'acceptable';
    return 'needs_optimization';
  }
  /**
   * Évalue lunknownualité des données retournées
   */
  p: unknown[]assessDataQunknown[]y(results: unknown[]): string {
    if (results.length === 0) return 'no_data';
    // Vérifier les valeurs nulles
    let nullCount = 0;
    const totalFields = results.length * Object.keys(results[0]).length;
    results.forEach(row => {
      Object.values(row).forEach(value => {
        if (value === null || value === undefined) nullCount++;
      });
    });
    const nullPercentage = (nullCount / totalFields) * 100;
    if (nullPercentage < 5) return 'excellent';
    if (nullPercentage < 20) return 'good';
    if (nullPercentage < 40) return 'acceptable';
    return 'poor';
  }
  /**
   * Estime le coût d'une requête SQL
   */
  private estimateSQLCost(sql: string): number {
    let cost = 1;
    // Facteurs de coût
    if (/JOIN/gi.test(sql)) {
      const joinCount = (sql.match(/JOIN/gi) || []).length;
      cost += joinCount * 2;
    }
    if (/GROUP BY/i.test(sql)) cost += 1.5;
    if (/ORDER BY/i.test(sql)) cost += 0.5;
    if (/DISTINCT/i.test(sql)) cost += 1;
    if (/UNION/i.test(sql)) cost += 3;
    if (/HAVING/i.test(sql)) cost += 1;
    // Sous-requêtes
    const subqueryCount = (sql.match(/SELECT.*FROM.*SELECT/gi) || []).length;
    cost += subqueryCount * 3;
    return cost;
  }
}