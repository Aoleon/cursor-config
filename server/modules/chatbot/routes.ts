import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/errorHandler';
import { isAuthenticated } from '../../replitAuth';
import { rateLimits } from '../../middleware/rate-limiter';
import { validateBody, validateQuery } from '../../middleware/validation';
import { sendSuccess, sendPaginatedSuccess } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
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
  type ActionHistoryRequest,
  type UpdateConfirmationRequest,
} from '@shared/schema';
import { getAIService } from '../../services/AIService';
import { RBACService } from '../../services/RBACService';
import { BusinessContextService } from '../../services/BusinessContextService';
import { SQLEngineService } from '../../services/SQLEngineService';
import { ActionExecutionService } from '../../services/ActionExecutionService';
import { AuditService } from '../../services/AuditService';
import { ChatbotOrchestrationService } from '../../services/ChatbotOrchestrationService';

function getRequestContext(req: Request): { userId: string; userRole: string; sessionId?: string } {
  const sessionUser = (req.session as any)?.user;
  const authUser = (req as any).user;
  const userId = sessionUser?.id ?? authUser?.id ?? 'anonymous';
  const userRole = sessionUser?.role ?? authUser?.role ?? 'user';
  const sessionId = (req.session as any)?.id;
  return { userId, userRole, sessionId };
}

export function createChatbotRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  const aiService = getAIService(storage);
  const rbacService = new RBACService(storage);
  const businessContextService = new BusinessContextService(storage, rbacService, eventBus);
  const sqlEngineService = new SQLEngineService(aiService, rbacService, businessContextService, eventBus, storage);
  const auditService = new AuditService(eventBus, storage);
  const actionExecutionService = new ActionExecutionService(aiService, rbacService, auditService, eventBus, storage);
  const chatbotService = new ChatbotOrchestrationService(
    aiService,
    rbacService,
    sqlEngineService,
    businessContextService,
    actionExecutionService,
    eventBus,
    storage
  );

  router.post(
    '/api/chatbot/query',
    isAuthenticated,
    rateLimits.chatbot,
    validateBody(chatbotQueryRequestSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole, sessionId } = getRequestContext(req);
      const payload: ChatbotQueryRequest = {
        ...req.body,
        userId,
        userRole,
        sessionId,
      };

      logger.info('Chatbot query received', {
        metadata: { userId, userRole }
      });

      const result = await chatbotService.processChatbotQuery(payload);
      sendSuccess(res, result);
    })
  );

  router.post(
    '/api/chatbot/suggestions',
    isAuthenticated,
    rateLimits.chatbot,
    validateBody(chatbotSuggestionsRequestSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole } = getRequestContext(req);
      const payload: ChatbotSuggestionsRequest = {
        ...req.body,
        userId,
        userRole,
      };

      const result = await chatbotService.getIntelligentSuggestions(payload);
      sendSuccess(res, result);
    })
  );

  router.post(
    '/api/chatbot/validate',
    isAuthenticated,
    rateLimits.chatbot,
    validateBody(chatbotValidateRequestSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole } = getRequestContext(req);
      const payload: ChatbotValidateRequest = {
        ...req.body,
        userId,
        userRole,
      };

      const result = await chatbotService.validateChatbotQuery(payload);
      sendSuccess(res, result);
    })
  );

  router.get(
    '/api/chatbot/history',
    isAuthenticated,
    rateLimits.chatbot,
    validateQuery(chatbotHistoryRequestSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole } = getRequestContext(req);
      const payload: ChatbotHistoryRequest = {
        ...req.query,
        userId,
        userRole,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      } as ChatbotHistoryRequest;

      const result = await chatbotService.getChatbotHistory(payload);
      sendPaginatedSuccess(res, result.conversations, {
        total: result.pagination.total,
        page: payload.offset ? Math.floor(payload.offset / (payload.limit ?? 1)) + 1 : 1,
        limit: payload.limit,
      });
    })
  );

  router.post(
    '/api/chatbot/feedback',
    isAuthenticated,
    rateLimits.chatbot,
    validateBody(chatbotFeedbackRequestSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole } = getRequestContext(req);
      const payload: ChatbotFeedbackRequest = {
        ...req.body,
        userId,
        userRole,
      };

      const result = await chatbotService.processChatbotFeedback(payload);
      sendSuccess(res, result);
    })
  );

  router.get(
    '/api/chatbot/stats',
    isAuthenticated,
    rateLimits.general,
    validateQuery(chatbotStatsRequestSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const { userRole } = getRequestContext(req);
      const payload: ChatbotStatsRequest = {
        ...req.query,
        userRole,
      } as ChatbotStatsRequest;

      const result = await chatbotService.getChatbotStats(payload);
      sendSuccess(res, result);
    })
  );

  router.post(
    '/api/chatbot/actions/propose',
    isAuthenticated,
    rateLimits.chatbot,
    validateBody(proposeActionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole } = getRequestContext(req);
      const payload: ProposeActionRequest = {
        ...req.body,
        userId,
        userRole,
      };

      const result = await chatbotService.proposeAction(payload);
      sendSuccess(res, result);
    })
  );

  router.post(
    '/api/chatbot/actions/execute',
    isAuthenticated,
    rateLimits.chatbot,
    validateBody(executeActionSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole } = getRequestContext(req);
      const payload: ExecuteActionRequest = {
        ...req.body,
        userId,
        userRole,
      };

      const result = await chatbotService.executeAction(payload);
      sendSuccess(res, result);
    })
  );

  router.get(
    '/api/chatbot/actions/history',
    isAuthenticated,
    rateLimits.chatbot,
    validateQuery(actionHistoryRequestSchema.partial()),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole } = getRequestContext(req);
      const payload: ActionHistoryRequest = {
        ...req.query,
        userId,
        userRole,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      } as ActionHistoryRequest;

      const result = await chatbotService.getActionHistory(payload);
      sendPaginatedSuccess(res, result.actions, {
        total: result.pagination.total,
        page: payload.offset ? Math.floor(payload.offset / (payload.limit ?? 1)) + 1 : 1,
        limit: payload.limit,
      });
    })
  );

  router.post(
    '/api/chatbot/actions/confirmations',
    isAuthenticated,
    rateLimits.chatbot,
    validateBody(updateConfirmationSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const { userId, userRole } = getRequestContext(req);
      const payload: UpdateConfirmationRequest & { userId: string | undefined; userRole: string } = {
        ...req.body,
        userId,
        userRole,
      };

      const result = await chatbotService.updateActionConfirmation(payload);
      sendSuccess(res, result);
    })
  );

  return router;
}
