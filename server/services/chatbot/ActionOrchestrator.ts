/**
 * ACTION ORCHESTRATOR - Chatbot Action Orchestration
 * 
 * Extracted from ChatbotOrchestrationService to reduce file size.
 * Handles action proposal, execution, and history management.
 * 
 * Target LOC: ~300-400
 */

import { ActionExecutionService } from '../ActionExecutionService';
import { logger } from '../../utils/logger';
import { withErrorHandling } from '../../utils/error-handler';
import type {
  ProposeActionRequest,
  ProposeActionResponse,
  ExecuteActionRequest,
  ExecuteActionResponse,
  ActionHistoryRequest,
  ActionHistoryResponse,
  UpdateConfirmationRequest
} from '@shared/schema';
import type { IStorage } from '../../storage-poc';

export class ActionOrchestrator {
  constructor(
    private actionExecutionService: ActionExecutionService,
    private storage: IStorage
  ) {}

  /**
   * Propose une action sécurisée basée sur une intention détectée
   */
  async proposeAction(request: ProposeActionRequest): Promise<ProposeActionResponse> {
    return withErrorHandling(
      async () => {
        logger.info('Proposition d\'action', {
          metadata: {
            service: 'ActionOrchestrator',
            operation: 'proposeAction',
            actionOperation: request.operation,
            entity: request.entity,
            userId: request.userId
          }
        });

        const response = await this.actionExecutionService.proposeAction(request);
        return response;
      },
      {
        operation: 'proposeAction',
        service: 'ActionOrchestrator',
        metadata: {
          userId: request.userId,
          userRole: request.userRole,
          operation: request.operation,
          entity: request.entity
        }
      }
    ) || {
      success: false,
      confirmationRequired: false,
      riskLevel: 'high',
      error: {
        type: 'business_rule',
        message: 'Erreur lors de la proposition d\'action'
      }
    };
  }

  /**
   * Exécute une action après confirmation utilisateur
   */
  async executeAction(request: ExecuteActionRequest): Promise<ExecuteActionResponse> {
    return withErrorHandling(
      async () => {
        logger.info('Exécution d\'action', {
          metadata: {
            service: 'ActionOrchestrator',
            operation: 'executeAction',
            actionId: request.actionId,
            userId: request.userId
          }
        });

        const response = await this.actionExecutionService.executeAction(request);
        return response;
      },
      {
        operation: 'executeAction',
        service: 'ActionOrchestrator',
        metadata: {
          userId: request.userId,
          userRole: request.userRole,
          actionId: request.actionId
        }
      }
    ) || {
      success: false,
      actionId: request.actionId,
      error: {
        type: 'execution',
        message: 'Erreur lors de l\'exécution de l\'action'
      }
    };
  }

  /**
   * Récupère l'historique des actions d'un utilisateur
   */
  async getActionHistory(request: ActionHistoryRequest): Promise<ActionHistoryResponse> {
    // ActionExecutionService n'a pas de méthode getActionHistory
    // Cette méthode doit être implémentée dans ActionExecutionService ou supprimée
    logger.warn('getActionHistory non implémenté dans ActionExecutionService', {
      metadata: {
        service: 'ActionOrchestrator',
        operation: 'getActionHistory',
        userId: request.userId || 'all'
      }
    });
    
    return {
      success: false,
      actions: [],
      total: 0,
      hasMore: false,
      error: {
        type: 'unknown',
        message: 'getActionHistory n\'est pas encore implémenté'
      }
    };
  }

  /**
   * Met à jour une confirmation d'action
   */
  async updateActionConfirmation(
    request: UpdateConfirmationRequest & { userId: string; userRole: string }
  ): Promise<{ success: boolean; error?: unknown }> {
    return withErrorHandling(
      async () => {
        logger.info('Mise à jour confirmation', {
          metadata: {
            service: 'ActionOrchestrator',
            operation: 'updateConfirmation',
            confirmationId: request.confirmationId,
            userId: request.userId
          }
        });

        const response = await this.actionExecutionService.updateConfirmation(request);
        return response;
      },
      {
        operation: 'updateActionConfirmation',
        service: 'ActionOrchestrator',
        metadata: {
          userId: request.userId,
          confirmationId: request.confirmationId
        }
      }
    ) || {
      success: false,
      error: 'Erreur lors de la mise à jour de la confirmation'
    };
  }
}

