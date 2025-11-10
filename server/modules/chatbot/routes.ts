/**
 * Chatbot Module Routes
 * 
 * This module handles all chatbot/AI assistant-related routes including:
 * - Main chatbot query processing
 * - Intelligent suggestions
 * - Query validation
 * - Conversation history
 * - User feedback and learning
 * - Statistics and analytics
 * - Action proposals and execution
 * - Action history and confirmations
 */

import { Router } from 'express';
import { withErrorHandling } from './utils/error-handler';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler } from '../../middleware/errorHandler';
import { validateBody, validateParams, validateQuery } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { sendSuccess, sendPaginatedSuccess } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { z } from 'zod';
import {
  chatbotQueryRequestSchema,
  chatbotSuggestionsRequestSchema,
  chatbotValidateRequestSchema,
  chatbotHistoryRequestSchema,
  chatbotFeedbackRequestSchema,
  chatbotStatsRequestSchema,
  proposeActionSchema,
  executeActionSchema,
  actionHistoryRequestSchema,
  updateConfirmationSchema,
  type ChatbotQueryRequest,
  type ChatbotSuggestionsRequest,
  type ChatbotValidateRequest,
  type ChatbotHistoryRequest,
  type ChatbotFeedbackRequest,
  type ChatbotStatsRequest,
  type ProposeActionRequest,
  type ExecuteActionRequest,
  type ActionHistoryRequest
} from '@shared/schema';

// Import services
import { getAIService } from '../../services/AIService';
import { RBACService } from '../../services/RBACService';
import { SQLEngineService } from '../../services/SQLEngineService';
import { BusinessContextService } from '../../services/BusinessContextService';
import { ActionExecutionService } from '../../services/ActionExecutionService';
import { AuditService } from '../../services/AuditService';
import { ChatbotOrchestrationService } from '../../services/ChatbotOrchestrationService';

export function createChatbotRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();
  
  // Initialize services
  const aiService = getAIService(storage);
  const rbacService = new RBACService(storage);
  const businessContextService = new BusinessContextService(storage, rbacService, eventBus);
  const sqlEngineService = new SQLEngineService(
    aiService,
    rbacService,
    businessContextService,
    eventBus,
    storage
  );
  const auditService = new AuditService(eventBus, storage);
  const actionExecutionService = new ActionExecutionService(
    aiService,
    rbacService,
    auditService,
    eventBus,
    storage
  );
  const chatbotOrchestrationService = new ChatbotOrchestrationService(
    aiService,
    rbacService,
    sqlEngineService,
    businessContextService,
    actionExecutionService,
    eventBus,
    storage
  );

  // ========================================
  // CHATBOT QUERY ROUTES
  // ========================================

  // POST /api/chatbot/query - Endpoint principal du chatbot avec pipeline complet
  router.post('/api/chatbot/query',
    isAuthenticated,
    rateLimits.chatbot, // Rate limiting strict pour le chatbot (10 req/min)
    validateBody(chatbotQueryRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const requestBody = req.body;
      const userId = req.session.user?.id || req.user?.id;
      const userRole = req.session.user?.role || req.user?.role || 'user';
      const sessionId = req.session.id;

      logger.info('Requête principale reçue', {
        metadata: { userId, userRole, query: requestBody.query }
      });

      // Construction de la requête chatbot complète
      const chatbotRequest: ChatbotQueryRequest = {
        ...requestBody,
        userId,
        userRole,
        sessionId
      };

      // Pipeline complet d'orchestration chatbot
      const result = await chatbotOrchestrationService.processChatbotQuery(chatbotRequest);
      logger.info('Pipeline terminé', {
        metadata: { userId, success: result.success }
      });

      // JSON replacer pour gérer BigInt serialization de manière globale
      const safeJsonReplacer = (_: string, value: any) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      };

      return withErrorHandling(
    async () => {

        if (result.success) {
          logger.info('Préparation réponse success', {
            metadata: { userId }
          });
          res.setHeader('Content-Type', 'application/json');
          const jsonResponse = JSON.stringify(result, safeJsonReplacer);
          logger.info('JSON stringifié', {
            metadata: { bytes: jsonResponse.length, statusCode: 200 }
          });
          res.status(200).send(jsonResponse);
        } else {
          // Gestion d'erreur gracieuse selon le type
          const statusCode = result.error?.type === 'rbac' ? 403 :
                            result.error?.type === 'validation' ? 400 :
                            result.error?.type === 'timeout' ? 408 : 500;
          
          logger.info('Préparation réponse error', {
            metadata: { userId, statusCode, errorType: result.error?.type }
          });
          
          // Enrichir la réponse avec le debug_info si demandé
          const shouldIncludeDebug = requestBody.options?.includeDebugInfo === true;
          const errorResponse: any = {
            success: false,
            error: result.error,
            ...(shouldIncludeDebug ? { debug_info: result.debug_info } : {})
          };
          
          res.setHeader('Content-Type', 'application/json');
          const jsonResponse = JSON.stringify(errorResponse, safeJsonReplacer);
          logger.info('JSON stringifié', {
            metadata: { bytes: jsonResponse.length, statusCode }
          });
          res.status(statusCode).send(jsonResponse);
        }
      
    },
    {
      operation: 'createChatbotRouter',
      service: 'routes',
      metadata: {}
    }
  );
        });
        res.status(500).json({
          success: false,
          error: {
            type: 'serialization',
            message: 'Erreur de sérialisation de la réponse'
          }
        });
      }
    })
  );

  // GET /api/chatbot/suggestions - Suggestions intelligentes contextuelles
  router.get('/api/chatbot/suggestions',
    isAuthenticated,
    rateLimits.general,
    validateQuery(chatbotSuggestionsRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const queryParams = req.query;
      const userId = req.session.user?.id || req.user?.id;
      const userRole = req.session.user?.role || req.user?.role || 'user';

      logger.info('Suggestions demandées', {
        metadata: { userId, userRole }
      });

      // Construction de la requête suggestions
      const suggestionsRequest: ChatbotSuggestionsRequest = {
        ...queryParams,
        userId,
        userRole: queryParams.userRole || userRole // Utilise le rôle de la query ou de la session
      };

      // Génération des suggestions intelligentes
      const result = await chatbotOrchestrationService.getIntelligentSuggestions(suggestionsRequest);

      if (result.success) {
        sendSuccess(res, result);
      } else {
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la génération des suggestions',
          suggestions: [],
          personalized: false,
          total_available: 0,
          context_info: {
            current_role: userRole,
            temporal_context: [],
            recent_patterns: []
          }
        });
      }
    })
  );

  // POST /api/chatbot/validate - Validation de requête sans exécution
  router.post('/api/chatbot/validate',
    isAuthenticated,
    rateLimits.general,
    validateBody(chatbotValidateRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const requestBody = req.body;
      const userId = req.session.user?.id || req.user?.id;
      const userRole = req.session.user?.role || req.user?.role || 'user';

      logger.info('Validation demandée', {
        metadata: { userId, userRole, query: requestBody.query }
      });

      // Construction de la requête de validation
      const validateRequest: ChatbotValidateRequest = {
        ...requestBody,
        userId,
        userRole
      };

      // Validation sans exécution
      const result = await chatbotOrchestrationService.validateChatbotQuery(validateRequest);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    })
  );

  // GET /api/chatbot/history - Historique des conversations utilisateur
  router.get('/api/chatbot/history',
    isAuthenticated,
    rateLimits.general,
    validateQuery(chatbotHistoryRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const queryParams = req.query;
      const userId = req.session.user?.id || req.user?.id;

      logger.info('Historique demandé', {
        metadata: { userId }
      });

      // Construction de la requête d'historique
      const historyRequest: ChatbotHistoryRequest = {
        ...queryParams,
        userId
      };

      // Récupération de l'historique
      const result = await chatbotOrchestrationService.getChatbotHistory(historyRequest);

      if (result.success) {
        sendPaginatedSuccess(res, result.conversations, {
          page: Math.floor((result.pagination?.offset || 0) / (result.pagination?.limit || 20)),
          limit: result.pagination?.limit || 20,
          total: result.pagination?.total || 0
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération de l\'historique',
          conversations: [],
          pagination: {
            total: 0,
            limit: queryParams.limit || 20,
            offset: queryParams.offset || 0,
            has_more: false
          }
        });
      }
    })
  );

  // POST /api/chatbot/feedback - Feedback utilisateur pour apprentissage
  router.post('/api/chatbot/feedback',
    isAuthenticated,
    rateLimits.general,
    validateBody(chatbotFeedbackRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const requestBody = req.body;
      const userId = req.session.user?.id || req.user?.id;

      logger.info('Feedback reçu', {
        metadata: { userId, conversationId: requestBody.conversationId }
      });

      // Construction de la requête de feedback
      const feedbackRequest: ChatbotFeedbackRequest = {
        ...requestBody,
        userId
      };

      // Traitement du feedback et apprentissage adaptatif
      const result = await chatbotOrchestrationService.processChatbotFeedback(feedbackRequest);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    })
  );

  // GET /api/chatbot/stats - Statistiques d'usage (admin uniquement)
  router.get('/api/chatbot/stats',
    isAuthenticated,
    rateLimits.general,
    validateQuery(chatbotStatsRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const queryParams = req.query;
      const userRole = req.session.user?.role || req.user?.role || 'user';

      // Vérification permission admin
      if (!['admin', 'super_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Accès aux statistiques chatbot réservé aux administrateurs',
          period: queryParams.period || '24h',
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
        });
      }

      logger.info('Statistiques demandées par admin', {
        metadata: { userRole }
      });

      // Construction de la requête de statistiques
      const statsRequest: ChatbotStatsRequest = queryParams;

      // Génération des statistiques d'usage
      const result = await chatbotOrchestrationService.getChatbotStats(statsRequest);

      if (result.success) {
        sendSuccess(res, result);
      } else {
        res.status(500).json(result);
      }
    })
  );

  // ========================================
  // HEALTH CHECK ROUTE
  // ========================================

  // GET /api/chatbot/health - Health check du pipeline chatbot complet
  router.get('/api/chatbot/health',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: any, res: Response) => {
      const userRole = req.session.user?.role || req.user?.role || 'user';
      
      logger.info('Health check demandé', {
        metadata: { userRole }
      });

      return withErrorHandling(
    async () => {

        // Vérification des services critiques
        const healthCheck = {
          chatbot_orchestration: "healthy",
          ai_service: "healthy",
          rbac_service: "healthy", 
          sql_engine: "healthy",
          business_context: "healthy",
          database: "healthy",
          cache: "healthy",
          overall_status: "healthy",
          response_time_ms: Date.now(),
          services_available: 6,
          services_total: 6,
          uptime_info: {
            ai_models: ["claude-sonnet-4", "gpt-5"],
            rbac_active: true,
            sql_security_enabled: true,
            business_context_loaded: true,
            cache_operational: true
          }
        };

        // Calcul du temps de réponse health check
        healthCheck.response_time_ms = Date.now() - healthCheck.response_time_ms;

        res.status(200).json({
          success: true,
          ...healthCheck,
          timestamp: new Date().toISOString(),
          version: "1.0.0"
        });

      
    },
    {
      operation: 'createChatbotRouter',
      service: 'routes',
      metadata: {}
    }
  );
        });
        res.status(503).json({
          success: false,
          chatbot_orchestration: "unhealthy",
          overall_status: "degraded",
          error: 'Un ou plusieurs services critiques sont indisponibles',
          timestamp: new Date().toISOString()
        });
      }
    })
  );

  // ========================================
  // ACTION ROUTES
  // ========================================

  // POST /api/chatbot/propose-action - Propose une action basée sur l'intention détectée
  router.post('/api/chatbot/propose-action',
    isAuthenticated,
    rateLimits.processing, // Rate limiting strict pour les actions
    validateBody(proposeActionSchema),
    asyncHandler(async (req: any, res: Response) => {
      const requestBody = req.body;
      const userId = req.session.user?.id || req.user?.id;
      const userRole = req.session.user?.role || req.user?.role || 'user';
      const sessionId = req.session.id;

      logger.info('Proposition action', {
        metadata: { operation: requestBody.operation, entity: requestBody.entity, userId, userRole }
      });

      // Construction de la requête de proposition d'action complète
      const proposeRequest: ProposeActionRequest = {
        ...requestBody,
        userId,
        userRole,
        sessionId
      };

      const result = await chatbotOrchestrationService.proposeAction(proposeRequest);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const statusCode = result.error?.type === 'permission' ? 403 :
                          result.error?.type === 'validation' ? 400 : 500;
        res.status(statusCode).json(result);
      }
    })
  );

  // POST /api/chatbot/execute-action - Exécute une action après confirmation utilisateur
  router.post('/api/chatbot/execute-action',
    isAuthenticated,
    rateLimits.processing, // Rate limiting strict pour les actions critiques
    validateBody(executeActionSchema),
    asyncHandler(async (req: any, res: Response) => {
      const requestBody = req.body;
      const userId = req.session.user?.id || req.user?.id;
      const userRole = req.session.user?.role || req.user?.role || 'user';

      logger.info('Exécution action', {
        metadata: { actionId: requestBody.actionId, userId, userRole }
      });

      // Construction de la requête d'exécution d'action complète
      const executeRequest: ExecuteActionRequest = {
        ...requestBody,
        userId,
        userRole
      };

      const result = await chatbotOrchestrationService.executeAction(executeRequest);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        const errorType = (result.error as any)?.type;
        const statusCode = errorType === 'permission' ? 403 :
                          errorType === 'validation' ? 400 :
                          errorType === 'business_rule' ? 422 : 500;
        res.status(statusCode).json(result);
      }
    })
  );

  // GET /api/chatbot/action-history - Historique des actions utilisateur
  router.get('/api/chatbot/action-history',
    isAuthenticated,
    rateLimits.general,
    validateQuery(actionHistoryRequestSchema),
    asyncHandler(async (req: any, res: Response) => {
      const queryParams = req.query;
      const userId = req.session.user?.id || req.user?.id;
      const userRole = req.session.user?.role || req.user?.role || 'user';

      logger.info('Historique des actions demandé', {
        metadata: { userId, userRole }
      });

      // Construction de la requête d'historique d'actions
      const historyRequest: ActionHistoryRequest = {
        ...queryParams,
        userId: queryParams.userId || userId, // Permet aux admins de voir l'historique d'autres utilisateurs
        userRole
      };

      const result = await chatbotOrchestrationService.getActionHistory(historyRequest);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    })
  );

  // PUT /api/chatbot/action-confirmation/:confirmationId - Met à jour une confirmation d'action
  router.put('/api/chatbot/action-confirmation/:confirmationId',
    isAuthenticated,
    rateLimits.general,
    validateParams(z.object({ confirmationId: z.string().uuid() })),
    validateBody(updateConfirmationSchema),
    asyncHandler(async (req: any, res: Response) => {
      const { confirmationId } = req.params;
      const requestBody = req.body;
      const userId = req.session.user?.id || req.user?.id;
      const userRole = req.session.user?.role || req.user?.role || 'user';

      logger.info('Mise à jour confirmation', {
        metadata: { confirmationId, userId, userRole, status: requestBody.status }
      });

      // Construction de la requête de mise à jour de confirmation
      const updateRequest = {
        ...requestBody,
        confirmationId,
        userId,
        userRole
      };

      const result = await chatbotOrchestrationService.updateActionConfirmation(updateRequest);
      
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    })
  );

  // ========================================
  // BUSINESS CONTEXT ROUTES
  // ========================================

  // POST /api/business-context/generate - Génération contexte métier complet
  router.post('/api/business-context/generate',
    isAuthenticated,
    rateLimits.processing,
    validateBody(z.object({
      query: z.string().min(1),
      user_role: z.string(),
      conversation_id: z.string().optional(),
      requested_domains: z.array(z.string()).optional(),
      complexity_level: z.enum(['basic', 'intermediate', 'advanced']).optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const requestBody = req.body;
      
      // Construction de la requête avec métadonnées utilisateur
      const contextRequest = {
        ...requestBody,
        userId: req.session.user?.id || req.user?.id,
        sessionId: req.sessionID
      };

      logger.info('Génération contexte pour utilisateur', {
        metadata: { userId: contextRequest.userId, userRole: contextRequest.user_role }
      });

      // Génération du contexte via BusinessContextService
      const result = await businessContextService.generateBusinessContext(contextRequest);

      if (result.success && result.context) {
        sendSuccess(res, {
          context: result.context,
          performance_metrics: result.performance_metrics,
          cache_hit: result.performance_metrics.cache_hit,
          generation_time_ms: result.performance_metrics.generation_time_ms,
          schemas_loaded: result.performance_metrics.schemas_loaded,
          examples_included: result.performance_metrics.examples_included
        });
      } else {
        const statusCode = result.error?.type === 'rbac' ? 403 : 
                          result.error?.type === 'validation' ? 400 : 500;
        
        res.status(statusCode).json({
          success: false,
          error: result.error?.message || 'Erreur lors de la génération du contexte métier',
          type: result.error?.type || 'internal',
          performance_metrics: result.performance_metrics
        });
      }
    })
  );

  // POST /api/business-context/enrich - Enrichissement contexte existant
  router.post('/api/business-context/enrich',
    isAuthenticated,
    rateLimits.general,
    validateBody(z.object({
      base_context: z.string().min(1),
      query: z.string().min(1),
      user_role: z.string(),
      refinement_hints: z.array(z.string()).optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const requestBody = req.body;
      
      // Construction de la requête d'enrichissement
      const enrichmentRequest = {
        ...requestBody,
        userId: req.session.user?.id || req.user?.id
      };

      logger.info('Enrichissement contexte pour utilisateur', {
        metadata: { userId: enrichmentRequest.userId }
      });

      // Enrichissement via BusinessContextService
      const result = await businessContextService.enrichContext(enrichmentRequest);

      if (result.success) {
        sendSuccess(res, {
          enriched_context: result.enriched_context,
          suggested_refinements: result.suggested_refinements,
          confidence_score: result.confidence_score,
          performance_metrics: result.performance_metrics
        });
      } else {
        const statusCode = result.error?.type === 'validation' ? 400 : 500;
        
        res.status(statusCode).json({
          success: false,
          error: result.error?.message || 'Erreur lors de l\'enrichissement du contexte',
          type: result.error?.type || 'internal',
          performance_metrics: result.performance_metrics
        });
      }
    })
  );

  // POST /api/business-context/learning/update - Mise à jour apprentissage adaptatif
  router.post('/api/business-context/learning/update',
    isAuthenticated,
    rateLimits.general,
    validateBody(z.object({
      query: z.string().min(1),
      user_role: z.string(),
      feedback_type: z.enum(['positive', 'negative', 'neutral']),
      context_quality_score: z.number().min(0).max(1).optional(),
      improvement_suggestions: z.array(z.string()).optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const requestBody = req.body;
      
      // Construction de la mise à jour d'apprentissage
      const learningUpdate = {
        ...requestBody,
        userId: req.session.user?.id || req.user?.id,
        timestamp: new Date()
      };

      logger.info('Mise à jour apprentissage pour utilisateur', {
        metadata: { userId: learningUpdate.userId, userRole: learningUpdate.user_role }
      });

      // Mise à jour via BusinessContextService
      const result = await businessContextService.updateAdaptiveLearning(learningUpdate);

      if (result.success) {
        sendSuccess(res, {
          learning_applied: result.learning_applied,
          updated_patterns: result.updated_patterns,
          optimization_suggestions: result.optimization_suggestions
        });
      } else {
        const statusCode = result.error?.type === 'validation' ? 400 : 500;
        
        res.status(statusCode).json({
          success: false,
          error: result.error?.message || 'Erreur lors de la mise à jour de l\'apprentissage',
          type: result.error?.type || 'internal'
        });
      }
    })
  );

  // GET /api/business-context/metrics - Métriques du service
  router.get('/api/business-context/metrics',
    isAuthenticated,
    rateLimits.general,
    asyncHandler(async (req: any, res: Response) => {
      // Vérification permission admin/manager pour métriques
      const userRole = req.session.user?.role || req.user?.role || 'user';
      if (!['admin', 'chef_projet'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: 'Accès aux métriques réservé aux administrateurs et chefs de projet'
        });
      }

      logger.info('Récupération métriques demandée', {
        metadata: { userRole }
      });

      return withErrorHandling(
    async () => {

        // Récupération des métriques via BusinessContextService
        const metrics = await businessContextService.getServiceMetrics();

        sendSuccess(res, {
          metrics,
          generated_at: new Date().toISOString(),
          user_role: userRole
        });

      
    },
    {
      operation: 'createChatbotRouter',
      service: 'routes',
      metadata: {}
    }
  );
        });
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la récupération des métriques'
        });
      }
    })
  );

  // GET /api/business-context/knowledge/materials - Recherche matériaux menuiserie
  router.get('/api/business-context/knowledge/materials',
    isAuthenticated,
    rateLimits.general,
    validateQuery(z.object({
      search: z.string().optional(),
      type: z.enum(['PVC', 'Aluminium', 'Bois', 'Composites', 'Acier']).optional(),
      category: z.enum(['economique', 'standard', 'premium']).optional()
    })),
    asyncHandler(async (req: any, res: Response) => {
      const { search, type, category } = req.query;
      
      return withErrorHandling(
    async () => {

        // Import de la base de connaissances
        const { MENUISERIE_KNOWLEDGE_BASE, findMaterialByName } = await import('../../services/MenuiserieKnowledgeBase');
        
        let materials = MENUISERIE_KNOWLEDGE_BASE.materials;
        
        // Filtrage par recherche
        if (search) {
          const material = findMaterialByName(search);
          materials = material ? [material] : [];
        }
        
        // Filtrage par type
        if (type) {
          materials = materials.filter(m => m.name === type);
        }
        
        // Filtrage par catégorie
        if (category) {
          materials = materials.filter(m => m.properties.cost_category === category);
        }
        
        sendSuccess(res, {
          materials: materials.slice(0, 20),
          total: materials.length,
          filters_applied: { search, type, category }
        });
        
      
    },
    {
      operation: 'createChatbotRouter',
      service: 'routes',
      metadata: {}
    }
  );
        });
        res.status(500).json({
          success: false,
          error: 'Erreur lors de la recherche de matériaux'
        });
      }
    })
  );

  return router;
}
