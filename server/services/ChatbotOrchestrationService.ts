import { AIService } from "./AIService";
import { RBACService } from "./RBACService";
import { SQLEngineService } from "./SQLEngineService";
import { BusinessContextService } from "./BusinessContextService";
import { ActionExecutionService } from "./ActionExecutionService";
import { EventBus } from "../eventBus";
import { getPerformanceMetricsService } from "./PerformanceMetricsService";
import { IStorage } from "../storage-poc";
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
  private performanceMetrics: any;

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
    this.performanceMetrics = getPerformanceMetricsService(storage);
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

    let debugInfo: any = {};
    let rbacFiltersApplied: string[] = [];
    let securityChecksPassed: string[] = [];

    // === INSTRUMENTATION PERFORMANCE : Démarrage tracing pipeline parallèle ===
    this.performanceMetrics.startPipelineTrace(
      traceId, 
      request.userId, 
      request.userRole, 
      request.query,
      this.detectQueryComplexity(request.query)
    );

    try {
      console.log(`[ChatbotOrchestration] PARALLEL Démarrage requête ${conversationId} (trace: ${traceId}) pour ${request.userId} (${request.userRole})`);

      // ========================================
      // 1. VÉRIFICATION CIRCUIT BREAKER
      // ========================================
      this.performanceMetrics.startStep(traceId, 'circuit_breaker_check', { operation: 'parallel_availability_check' });
      
      const circuitBreakerStartTime = Date.now();
      const circuitBreakerCheck = this.performanceMetrics.checkCircuitBreaker();
      const circuitBreakerTime = Date.now() - circuitBreakerStartTime;
      
      if (!circuitBreakerCheck.allowed) {
        console.warn(`[ChatbotOrchestration] Circuit breaker ouvert, fallback séquentiel: ${circuitBreakerCheck.reason}`);
        
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
        console.log(`[ChatbotOrchestration] Action détectée: ${actionIntention.actionType} sur ${actionIntention.entity}`);
        
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
            entity: actionDefinition.entity as any,
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

      // ========================================
      // 4. DISPATCH PARALLÈLE PRINCIPAL - CONTEXTE + MODÈLE
      // ========================================
      this.performanceMetrics.startParallelTrace(traceId, 'context_and_model_parallel');
      
      const parallelStartTime = Date.now();
      
      console.log(`[ChatbotOrchestration] Démarrage dispatch parallèle contexte + modèle`);

      // Préparation des promesses parallèles
      const businessContextRequest = {
        userId: request.userId,
        user_role: request.userRole,
        query_hint: request.query,
        complexity_preference: this.detectQueryComplexity(request.query),
        focus_areas: this.detectFocusAreas(request.query),
        include_temporal: true,
        cache_duration_minutes: 60,
        personalization_level: "advanced" as const
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

      // Timeout de protection 5s max
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout parallèle 5s dépassé')), 5000)
      );

      const parallelResults = await Promise.race([
        Promise.allSettled(parallelPromises),
        timeoutPromise
      ]) as PromiseSettledResult<any>[];

      const parallelTime = Date.now() - parallelStartTime;

      // Analyse des résultats parallèles
      const [contextResult, modelResult] = parallelResults;
      
      const contextSuccess = contextResult.status === 'fulfilled' && contextResult.value.success;
      const modelSuccess = modelResult.status === 'fulfilled' && modelResult.value.selectedModel;
      
      const contextTime = contextSuccess ? 
        (contextResult.value.timings?.total || parallelTime) : parallelTime;
      const modelTime = modelSuccess ? 
        (modelResult.value.selectionTime || parallelTime) : parallelTime;

      console.log(`[ChatbotOrchestration] Résultats parallèles - Context: ${contextSuccess ? 'OK' : 'FAIL'} (${contextTime}ms), Model: ${modelSuccess ? 'OK' : 'FAIL'} (${modelTime}ms), Total: ${parallelTime}ms`);

      // Validation de réussite minimum
      if (!contextSuccess && !modelSuccess) {
        console.warn(`[ChatbotOrchestration] Échec total parallélisme, fallback séquentiel`);
        
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
        console.warn(`[ChatbotOrchestration] Contexte échoué, contexte minimal`);
        // Continuer avec contexte minimal mais modèle OK
      }
      
      if (!modelSuccess) {
        console.warn(`[ChatbotOrchestration] Sélection modèle échouée, modèle par défaut`);
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

      const sqlQueryRequest = {
        naturalLanguageQuery: request.query,
        context: request.context || businessContextResponse?.context ? 
          JSON.stringify(businessContextResponse.context) : undefined,
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
      // 6. GÉNÉRATION RÉPONSE CONVERSATIONNELLE (IDENTIQUE)
      // ========================================
      this.performanceMetrics.startStep(traceId, 'response_formatting', { 
        resultCount: sqlResult.results?.length || 0,
        parallelMode: true
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
        suggestionsCount: suggestions.length,
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
          explanation,
          suggestions,
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
        confidence: modelSelection?.confidence || sqlResult.metadata?.confidence,
        modelUsed: modelSelection?.selectedModel || sqlResult.metadata?.aiModelUsed,
        cacheHit: sqlResult.metadata?.cacheHit || false,
        errorOccurred: false,
        errorType: null,
        dryRun: request.options?.dryRun || false,
        createdAt: new Date()
      });

      console.log(`[ChatbotOrchestration] PARALLEL Pipeline terminé en ${totalExecutionTime}ms (économie: ${debugInfo.parallel_execution?.timeSaving || 0}ms)`);

      // Construire réponse finale
      return {
        success: true,
        data: {
          conversationId,
          query: request.query,
          explanation,
          suggestions,
          sql: request.options?.includeSql ? sqlResult.sql : undefined,
          results: sqlResult.results,
          metadata: {
            executionTimeMs: totalExecutionTime,
            modelUsed: modelSelection?.selectedModel || sqlResult.metadata?.aiModelUsed,
            cacheHit: sqlResult.metadata?.cacheHit || false,
            resultCount: sqlResult.results?.length || 0,
            debugInfo: request.options?.includeDebugInfo ? {
              ...debugInfo,
              detailedTimings,
              parallelMode: true,
              modelSelection: {
                model: modelSelection?.selectedModel,
                reason: modelSelection?.reason,
                confidence: modelSelection?.confidence,
                appliedRules: modelSelection?.appliedRules
              },
              businessContext: {
                loaded: !!businessContextResponse,
                complexity: businessContextResponse?.context?.complexity || 'unknown'
              }
            } : undefined
          }
        }
      };

    } catch (error) {
      console.error(`[ChatbotOrchestration] Erreur pipeline parallèle:`, error);
      
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
      console.log(`[ChatbotOrchestration] Fallback séquentiel après erreur parallèle`);
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

    let debugInfo: any = {};
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

    try {
      console.log(`[ChatbotOrchestration] Démarrage requête ${conversationId} (trace: ${finalTraceId}) pour ${request.userId} (${request.userRole})`);

      // ========================================
      // 1. DÉTECTION D'INTENTIONS D'ACTIONS - NOUVEAU PIPELINE
      // ========================================
      this.performanceMetrics.startStep(traceId, 'context_generation', { step: 'action_detection' });
      
      const actionDetectionStartTime = Date.now();
      const actionIntention = this.actionExecutionService.detectActionIntention(request.query);
      const actionDetectionTime = Date.now() - actionDetectionStartTime;
      
      if (actionIntention.hasActionIntention && actionIntention.confidence > 0.7) {
        console.log(`[ChatbotOrchestration] Action détectée: ${actionIntention.actionType} sur ${actionIntention.entity}`);
        
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
            entity: actionDefinition.entity as any,
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
        personalization_level: "advanced" as const
      };

      const businessContextResponse = await this.businessContextService.generateBusinessContext(
        businessContextRequest
      );

      const contextTime = Date.now() - contextStartTime;

      if (!businessContextResponse.success || !businessContextResponse.context) {
        console.warn("[ChatbotOrchestration] Échec génération contexte métier, continuation avec contexte minimal");
        
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
        confidence: sqlResult.confidence !== null && sqlResult.confidence !== undefined ? parseFloat(sqlResult.confidence.toString()) : 0,
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
        sqlResult.metadata?.tokensUsed || 0 // Utiliser les tokens du résultat SQL
      );

      // ========================================
      // 7. ÉVÉNEMENT POUR APPRENTISSAGE ADAPTATIF
      // ========================================
      const { createRealtimeEvent, EventType } = await import("@shared/events");
      await this.eventBus.publish(createRealtimeEvent({
        type: EventType.CHATBOT_QUERY_PROCESSED,
        entity: 'chatbot',
        entityId: conversationId,
        severity: 'info',
        affectedQueryKeys: ['/api/chatbot/conversations'],
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
      // 8. CONSTRUCTION RÉPONSE FINALE
      // ========================================
      const response: ChatbotQueryResponse = {
        success: true,
        conversation_id: conversationId,
        query: request.query,
        explanation,
        sql: this.shouldIncludeSQL(request.userRole) ? sqlResult.sql : undefined,
        results: sqlResult.results || [],
        suggestions,
        confidence: sqlResult.confidence || 0,
        execution_time_ms: totalExecutionTime,
        model_used: sqlResult.metadata?.aiModelUsed,
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
            response_formatting_ms: responseFormattingTime,
            query_execution_ms: sqlResult.executionTime || 0,
            total_orchestration_ms: totalExecutionTime
          },
          // === NOUVELLES MÉTRIQUES DÉTAILLÉES ===
          detailed_timings: detailedTimings,
          trace_id: traceId,
          pipeline_steps_breakdown: {
            action_detection_time: actionDetectionTime || 0,
            rbac_validation_time: debugInfo.rbac_check_ms || 0,
            business_context_time: debugInfo.context_generation_ms || 0,
            sql_execution_time: sqlGenerationTime,
            response_formatting_time: responseFormattingTime
          }
        };
      }

      // === ENRICHISSEMENT RÉPONSE AVEC MÉTRIQUES PERFORMANCE ===
      response.performance_trace = {
        trace_id: traceId,
        detailed_timings: detailedTimings,
        cache_performance: {
          hit: sqlResult.metadata?.cacheHit || false,
          retrieval_time_ms: sqlResult.metadata?.cacheRetrievalTime || 0
        },
        complexity_detected: this.detectQueryComplexity(request.query),
        slo_compliance: {
          target_ms: this.getSLOTargetForComplexity(this.detectQueryComplexity(request.query)),
          actual_ms: totalExecutionTime,
          compliant: totalExecutionTime <= this.getSLOTargetForComplexity(this.detectQueryComplexity(request.query))
        }
      };

      return response;

    } catch (error) {
      console.error(`[ChatbotOrchestration] Erreur pipeline complet (trace: ${traceId}):`, error);
      
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
      (errorResponse as any).trace_id = traceId;
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
    try {
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
        ...dbSuggestions.map(s => ({
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

    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur suggestions:", error);
      
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
    try {
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

    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur validation:", error);
      
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
    try {
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
        .where(sql`conversation_id IN (${sql.join(conversationIds.map(id => sql`${id}`), sql`, `)})`) : [];

      const feedbackMap = new Set(feedbacks.map(f => f.conversationId));

      const formattedConversations = conversations.map(c => ({
        id: c.id,
        query: c.query,
        summary: this.generateConversationSummary(
          c.query || '', 
          c.response || {}, 
          c.errorOccurred || false
        ),
        success: !c.errorOccurred,
        execution_time_ms: c.executionTimeMs,
        confidence: c.confidence ? parseFloat(c.confidence) : undefined,
        created_at: c.createdAt,
        has_feedback: feedbackMap.has(c.id)
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

    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur historique:", error);
      
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
    try {
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
          entity: 'chatbot',
          entityId: request.conversationId,
          severity: request.rating >= 4 ? 'info' : 'warning',
          affectedQueryKeys: ['/api/chatbot/feedback'],
          userId: request.userId,
          metadata: {
            userRole: conv.userRole,
            query: conv.query,
            rating: request.rating,
            feedbackType: request.feedbackType,
            executionTime: conv.executionTimeMs,
            modelUsed: conv.modelUsed
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

    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur feedback:", error);
      
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
    try {
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

    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur statistiques:", error);
      
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
    try {
      await db.insert(chatbotConversations).values(conversation);
    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur logging conversation:", error);
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
    try {
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
        estimatedCost: parseFloat("0.0000") // TODO: calculer le coût réel
      });
    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur logging métriques:", error);
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
        type: errorType as any,
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

  private detectFocusAreas(query: string): ("planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes")[] {
    const queryLower = query.toLowerCase();
    const areas: ("planning" | "finances" | "ressources" | "qualite" | "performance" | "alertes")[] = [];

    if (queryLower.includes('planning') || queryLower.includes('échéance') || queryLower.includes('délai')) {
      areas.push("planning");
    }
    if (queryLower.includes('coût') || queryLower.includes('budget') || queryLower.includes('marge')) {
      areas.push("finances");
    }
    if (queryLower.includes('équipe') || queryLower.includes('ressource') || queryLower.includes('charge')) {
      areas.push("ressources");
    }
    if (queryLower.includes('qualité') || queryLower.includes('contrôle') || queryLower.includes('validation')) {
      areas.push("qualite");
    }
    if (queryLower.includes('performance') || queryLower.includes('kpi') || queryLower.includes('indicateur')) {
      areas.push("performance");
    }
    if (queryLower.includes('alerte') || queryLower.includes('problème') || queryLower.includes('retard')) {
      areas.push("alertes");
    }

    return areas.length > 0 ? areas : ["performance"];
  }

  private shouldIncludeSQL(userRole: string): boolean {
    // Seuls les administrateurs et BE managers peuvent voir le SQL généré
    return userRole === "admin" || userRole === "be_manager";
  }

  private generateExplanation(query: string, results: any[], userRole: string): string {
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
    results: any[]
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
    try {
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
    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur analyse patterns:", error);
      return [];
    }
  }

  private generateConversationSummary(query: string, response: any, errorOccurred: boolean): string {
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
    try {
      console.log(`[ChatbotOrchestration] Proposition d'action ${request.operation} sur ${request.entity} pour ${request.userId}`);
      
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
    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur proposition d'action:", error);
      
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
          type: 'execution',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      };
    }
  }

  /**
   * Exécute une action après confirmation utilisateur
   */
  async executeAction(request: ExecuteActionRequest): Promise<ExecuteActionResponse> {
    try {
      console.log(`[ChatbotOrchestration] Exécution d'action ${request.actionId} pour ${request.userId}`);
      
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
    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur exécution d'action:", error);
      
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
        }
      };
    }
  }

  /**
   * Récupère l'historique des actions d'un utilisateur
   */
  async getActionHistory(request: ActionHistoryRequest): Promise<ActionHistoryResponse> {
    try {
      console.log(`[ChatbotOrchestration] Récupération historique actions pour ${request.userId || 'all'}`);
      
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
    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur historique actions:", error);
      
      return {
        success: false,
        actions: [],
        total: 0,
        hasMore: false,
        error: {
          type: 'execution',
          message: error instanceof Error ? error.message : 'Erreur inconnue'
        }
      };
    }
  }

  /**
   * Met à jour une confirmation d'action
   */
  async updateActionConfirmation(request: UpdateConfirmationRequest & { userId: string; userRole: string }): Promise<{ success: boolean; error?: any }> {
    try {
      console.log(`[ChatbotOrchestration] Mise à jour confirmation ${request.confirmationId} pour ${request.userId}`);
      
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
    } catch (error) {
      console.error("[ChatbotOrchestration] Erreur mise à jour confirmation:", error);
      
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
    }
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
    actionIntention: any,
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
    actionIntention: any,
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
}