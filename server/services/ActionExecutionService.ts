import { AIService } from "./AIService";
import { RBACService } from "./RBACService";
import { AuditService } from "./AuditService";
import { EventBus } from "../eventBus";
import type { IStorage } from "../storage-poc";
import { db } from "../db";
import { sql, eq, and, desc, gte, lte, asc, or } from "drizzle-orm";
import crypto from "crypto";
import { EventType } from "@shared/events";
import { logger } from '../utils/logger';
import type {
  ActionDefinition,
  ActionExecutionResult,
  ProposeActionRequest,
  ProposeActionResponse,
  ExecuteActionRequest,
  ExecuteActionResponse,
  ActionHistoryRequest,
  ActionHistoryResponse,
  UpdateConfirmationRequest,
  InsertAction,
  InsertActionHistory,
  InsertActionConfirmation,
  Action,
  ActionConfirmation,
  User,
  Offer,
  Project,
  Ao,
  ProjectTask
} from "@shared/schema";

import {
  actions,
  actionHistory,
  actionConfirmations,
  users,
  offers,
  projects,
  aos,
  projectTasks,
  suppliers,
  maitresOuvrage,
  maitresOeuvre
} from "@shared/schema";

// ========================================
// CONSTANTES DE CONFIGURATION ACTION SERVICE
// ========================================

const DEFAULT_CONFIRMATION_TIMEOUT_MINUTES = 30;
const MAX_RETRY_ATTEMPTS = 3;
const ACTION_RATE_LIMIT_PER_HOUR = 50;
const HIGH_RISK_CONFIRMATION_REQUIRED = true;
const DEFAULT_EXECUTION_TIMEOUT_MS = 30000;

// Patterns pour la détection d'intentions d'actions
const ACTION_INTENTION_PATTERNS = {
  create: [
    /créer?\s+(un\s+)?(nouveau\s+)?(projet|offre|contact|tâche|fournisseur)/i,
    /ajouter?\s+(un\s+)?(nouveau\s+)?(projet|offre|contact|tâche|fournisseur)/i,
    /nouveau\s+(projet|offre|contact|tâche|fournisseur)/i,
    /faire\s+un\s+(nouveau\s+)?(projet|offre)/i
  ],
  update: [
    /modifier?\s+(le\s+)?(statut|montant|date|assignation)/i,
    /mettre\s+à\s+jour\s+(le\s+)?(statut|montant|date)/i,
    /changer\s+(le\s+)?(statut|montant|assignation)/i,
    /passer\s+(le\s+statut\s+)?en\s+/i,
    /valider?\s+(l'|le\s+)?(offre|projet|phase)/i
  ],
  delete: [
    /supprimer?\s+(le\s+|l')?(projet|offre|contact|tâche)/i,
    /archiver?\s+(le\s+|l')?(projet|offre|contact)/i,
    /effacer?\s+(le\s+|l')?(projet|offre|contact|tâche)/i,
    /retirer?\s+(le\s+|l')?(projet|offre|contact)/i
  ],
  business_action: [
    /lancer\s+(le\s+)?projet/i,
    /démarrer\s+(la\s+)?(phase|étude|planification)/i,
    /valider\s+(la\s+)?fin\s+d'études/i,
    /transformer\s+en\s+projet/i,
    /planifier\s+(la\s+)?(phase|étape)/i
  ]
};

// Mapping des entités vers leurs opérations supportées
const SUPPORTED_OPERATIONS = {
  offer: {
    create: ['create_offer'],
    update: ['update_status', 'update_montant', 'update_deadline', 'assign_responsible'],
    delete: ['archive_offer'],
    business_action: ['validate_fin_etudes', 'transform_to_project']
  },
  project: {
    create: ['create_project'],
    update: ['update_status', 'update_progress', 'assign_chef_travaux'],
    delete: ['archive_project'],
    business_action: ['launch_project', 'plan_phase', 'generate_visa_request']
  },
  ao: {
    create: ['create_ao'],
    update: ['update_selection_status', 'update_deadline'],
    delete: ['archive_ao'],
    business_action: ['select_lots', 'generate_offer']
  },
  contact: {
    create: ['create_maitre_ouvrage', 'create_maitre_oeuvre'],
    update: ['update_contact_info', 'update_status'],
    delete: ['deactivate_contact'],
    business_action: []
  },
  task: {
    create: ['create_project_task'],
    update: ['update_task_status', 'assign_task', 'update_progress'],
    delete: ['delete_task'],
    business_action: ['create_milestone']
  },
  supplier: {
    create: ['create_supplier'],
    update: ['update_supplier_status', 'update_rating'],
    delete: ['deactivate_supplier'],
    business_action: ['send_request']
  }
};

// Niveaux de risque par type d'opération
const OPERATION_RISK_LEVELS = {
  // Opérations à faible risque
  low: [
    'update_progress', 'assign_task', 'update_contact_info', 'create_project_task'
  ],
  // Opérations à risque modéré
  medium: [
    'create_offer', 'create_project', 'update_status', 'assign_responsible', 
    'launch_project', 'send_request'
  ],
  // Opérations à haut risque
  high: [
    'archive_offer', 'archive_project', 'delete_task', 'transform_to_project',
    'validate_fin_etudes', 'deactivate_contact'
  ]
};

// ========================================
// SERVICE PRINCIPAL D'EXÉCUTION D'ACTIONS SÉCURISÉES
// ========================================

export class ActionExecutionService {
  private aiService: AIService;
  private rbacService: RBACService;
  private auditService: AuditService;
  private eventBus: EventBus;
  private storage: IStorage;

  constructor(
    aiService: AIService,
    rbacService: RBACService,
    auditService: AuditService,
    eventBus: EventBus,
    storage: IStorage
  ) {
    this.aiService = aiService;
    this.rbacService = rbacService;
    this.auditService = auditService;
    this.eventBus = eventBus;
    this.storage = storage;
  }

  // ========================================
  // DÉTECTION D'INTENTIONS D'ACTIONS
  // ========================================

  /**
   * Détecte si une requête utilisateur contient une intention d'action
   */
  detectActionIntention(query: string): {
    hasActionIntention: boolean;
    actionType?: 'create' | 'update' | 'delete' | 'business_action';
    entity?: string;
    confidence: number;
    operation?: string;
  } {
    try {
      const queryLower = query.toLowerCase();
      let bestMatch = { type: null, entity: null, confidence: 0, operation: null };

      // Parcourir les patterns d'actions
      for (const [actionType, patterns] of Object.entries(ACTION_INTENTION_PATTERNS)) {
        for (const pattern of patterns) {
          const match = queryLower.match(pattern);
          if (match) {
            // Extraire l'entité mentionnée
            let entity = null;
            if (match[2] || match[1]) {
              const entityMatch = match[2] || match[1];
              entity = this.mapEntityName(entityMatch);
            }

            // Calculer le score de confiance basé sur la spécificité du match
            let confidence = 0.7; // Base pour un match de pattern
            
            if (entity) confidence += 0.2;
            if (match.index === 0) confidence += 0.1; // Début de phrase

            // Détecter l'opération spécifique
            const operation = this.detectSpecificOperation(queryLower, actionType as any, entity);
            if (operation) confidence += 0.1;

            if (confidence > bestMatch.confidence) {
              bestMatch = {
                type: actionType as any,
                entity,
                confidence,
                operation
              };
            }
          }
        }
      }

      return {
        hasActionIntention: bestMatch.confidence > 0.6,
        actionType: bestMatch.type || undefined,
        entity: bestMatch.entity || undefined,
        confidence: bestMatch.confidence,
        operation: bestMatch.operation || undefined
      };

    } catch (error) {
      logger.error('Erreur detectActionIntention', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'detectActionIntention',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return { hasActionIntention: false, confidence: 0 };
    }
  }

  /**
   * Utilise l'IA pour analyser une intention d'action complexe
   */
  async analyzeActionWithAI(query: string, userRole: string): Promise<ActionDefinition | null> {
    try {
      const aiPrompt = `
Analysez cette requête utilisateur et déterminez s'il s'agit d'une demande d'action CRUD sur le système Saxium.

Requête: "${query}"
Rôle utilisateur: ${userRole}

Contexte métier: Système de gestion de projets de menuiserie avec appels d'offres, offres commerciales, projets, tâches, contacts, fournisseurs.

Si c'est une action, retournez un objet JSON avec:
{
  "type": "create|update|delete|business_action",
  "entity": "offer|project|ao|contact|task|supplier|milestone",
  "operation": "nom_operation_specifique",
  "parameters": { "clé": "valeur" },
  "confidence": 0.0-1.0,
  "confirmation_required": boolean,
  "risk_level": "low|medium|high"
}

Si ce n'est pas une action, retournez: null

Soyez précis dans l'extraction des paramètres (IDs, noms, valeurs).
`;

      const aiResponse = await this.aiService.generateSQL({
        query: aiPrompt,
        context: `Analyse d'intention d'action pour ${userRole}`,
        forceModel: 'claude_sonnet_4',
        maxTokens: 500,
        userRole: userRole as any
      });

      if (aiResponse.success && aiResponse.data?.query) {
        try {
          const result = JSON.parse(aiResponse.data.query);
          return result?.type ? result : null;
        } catch (parseError) {
          logger.warn('Erreur parsing JSON AI response', {
            metadata: {
              service: 'ActionExecutionService',
              operation: 'analyzeActionWithAI',
              issue: parseError instanceof Error ? parseError.message : String(parseError)
            }
          });
          return null;
        }
      }

      return null;

    } catch (error) {
      logger.error('Erreur analyzeActionWithAI', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'analyzeActionWithAI',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  }

  // ========================================
  // PROPOSITION D'ACTIONS
  // ========================================

  /**
   * Propose une action basée sur une requête utilisateur
   */
  async proposeAction(request: ProposeActionRequest): Promise<ProposeActionResponse> {
    const startTime = Date.now();
    const actionId = crypto.randomUUID();

    try {
      logger.info('Proposition d\'action', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'proposeAction',
          actionId,
          userId: request.userId
        }
      });

      // 1. Validation RBAC préliminaire
      const rbacCheck = await this.rbacService.validateTableAccess({
        userId: request.userId,
        role: request.userRole as any,
        tableName: this.getTableNameForEntity(request.entity),
        action: this.mapActionTypeToRBACAction(request.type),
        contextValues: {}
      });

      if (!rbacCheck.allowed) {
        await this.auditService.logEvent({
          userId: request.userId,
          userRole: request.userRole,
          sessionId: request.sessionId,
          eventType: 'rbac.access_denied',
          result: 'blocked',
          severity: 'medium',
          resource: `action:${request.entity}:${request.operation}`,
          action: 'propose_action',
          entityType: 'action',
          errorDetails: rbacCheck.denialReason
        });

        return {
          success: false,
          confirmationRequired: false,
          riskLevel: 'high',
          error: {
            type: 'permission',
            message: 'Permissions insuffisantes pour cette action',
            details: rbacCheck.denialReason
          }
        };
      }

      // 2. Validation de l'opération supportée
      if (!this.isOperationSupported(request.entity, request.type, request.operation)) {
        return {
          success: false,
          confirmationRequired: false,
          riskLevel: 'medium',
          error: {
            type: 'permission',
            message: `Opération '${request.operation}' non supportée pour l'entité '${request.entity}'`
          }
        };
      }

      // 3. Détermination du niveau de risque
      const riskLevel = request.riskLevel || this.determineRiskLevel(request.operation);
      const confirmationRequired = request.confirmationRequired || riskLevel !== 'low';

      // 4. Validation des paramètres
      const parameterValidation = await this.validateActionParameters(request);
      if (!parameterValidation.valid) {
        return {
          success: false,
          confirmationRequired: false,
          riskLevel,
          error: {
            type: 'permission',
            message: 'Paramètres d\'action invalides',
            details: parameterValidation.errors
          }
        };
      }

      // 5. Création de l'action en base
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (request.expirationMinutes || DEFAULT_CONFIRMATION_TIMEOUT_MINUTES));

      const actionData: InsertAction = {
        type: request.type,
        entity: request.entity,
        operation: request.operation,
        userId: request.userId,
        userRole: request.userRole,
        sessionId: request.sessionId,
        conversationId: request.conversationId,
        parameters: request.parameters,
        targetEntityId: request.targetEntityId,
        riskLevel,
        confirmationRequired,
        rbacValidated: true,
        status: 'proposed',
        requiredPermissions: rbacCheck.allowedColumns,
        securityContext: {
          rbacContext: rbacCheck,
          proposedAt: new Date(),
          userRole: request.userRole
        },
        expiresAt,
        tags: ['proposed_by_chatbot'],
        metadata: request.metadata || {}
      };

      await db.insert(actions).values([actionData]);

      // 6. Création de la confirmation si requise
      let confirmationId: string | undefined;
      if (confirmationRequired) {
        confirmationId = await this.createActionConfirmation(actionId, request.userId, riskLevel, request.parameters);
      }

      // 7. Logging d'audit
      await this.auditService.logEvent({
        userId: request.userId,
        userRole: request.userRole,
        sessionId: request.sessionId,
        eventType: 'data.modification',
        result: 'success',
        severity: riskLevel === 'high' ? 'high' : 'medium',
        resource: `action:${request.entity}:${request.operation}`,
        action: 'propose_action',
        entityType: 'action',
        entityId: actionId,
        payload: { actionDefinition: request },
        metadata: { executionTime: Date.now() - startTime }
      });

      // 8. Publication d'événement temps réel
      this.eventBus.publish({
        id: crypto.randomUUID(),
        type: EventType.CHATBOT_QUERY_PROCESSED,
        entity: 'system',
        entityId: actionId,
        severity: 'info',
        title: '⚡ Action Proposée',
        message: `Action ${request.operation} proposée pour ${request.entity}`,
        timestamp: new Date().toISOString(),
        affectedQueryKeys: [
          ['/api/chatbot/action-history'],
          ['/api/chatbot/actions', request.userId]
        ],
        userId: request.userId,
        metadata: {
          actionType: request.type,
          entity: request.entity,
          operation: request.operation,
          riskLevel,
          confirmationRequired
        }
      });

      return {
        success: true,
        actionId,
        confirmationRequired,
        confirmationId,
        riskLevel,
        estimatedTime: this.estimateExecutionTime(request.operation),
        warnings: this.generateActionWarnings(request, riskLevel)
      };

    } catch (error) {
      logger.error('Erreur proposeAction', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'proposeAction',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      await this.auditService.logEvent({
        userId: request.userId,
        userRole: request.userRole,
        sessionId: request.sessionId,
        eventType: 'system.error',
        result: 'error',
        severity: 'high',
        resource: `action:${request.entity}:${request.operation}`,
        action: 'propose_action',
        errorDetails: error instanceof Error ? error.message : 'Erreur inconnue',
        metadata: { executionTime: Date.now() - startTime }
      });

      return {
        success: false,
        confirmationRequired: false,
        riskLevel: 'high',
        error: {
          type: 'validation',
          message: 'Erreur lors de la proposition d\'action'
        }
      };
    }
  }

  // ========================================
  // EXÉCUTION D'ACTIONS
  // ========================================

  /**
   * Exécute une action après validation
   */
  async executeAction(request: ExecuteActionRequest): Promise<ExecuteActionResponse> {
    const startTime = Date.now();
    let currentAction: Action | null = null;

    try {
      logger.info('Exécution d\'action', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'executeAction',
          actionId: request.actionId,
          userId: request.userId
        }
      });

      // 1. Récupérer l'action
      const actionResults = await db
        .select()
        .from(actions)
        .where(eq(actions.id, request.actionId))
        .limit(1);

      if (actionResults.length === 0) {
        return {
          success: false,
          actionId: request.actionId,
          error: {
            type: 'permission',
            message: 'Action introuvable'
          }
        };
      }

      currentAction = actionResults[0];

      // 2. Vérifications préliminaires
      if (currentAction.userId !== request.userId) {
        return {
          success: false,
          actionId: request.actionId,
          error: {
            type: 'permission',
            message: 'Action appartient à un autre utilisateur'
          }
        };
      }

      if (currentAction.status !== 'proposed' && currentAction.status !== 'confirmed') {
        return {
          success: false,
          actionId: request.actionId,
          error: {
            type: 'permission',
            message: `Action dans un état invalide: ${currentAction.status}`
          }
        };
      }

      if (currentAction.expiresAt && currentAction.expiresAt < new Date()) {
        // Marquer comme expirée
        await this.updateActionStatus(request.actionId, 'timeout', 'Action expirée');
        return {
          success: false,
          actionId: request.actionId,
          error: {
            type: 'timeout',
            message: 'Action expirée'
          }
        };
      }

      // 3. Gestion de la confirmation si requise
      if (currentAction.confirmationRequired && !request.userConfirmation) {
        return {
          success: false,
          actionId: request.actionId,
          error: {
            type: 'permission',
            message: 'Confirmation utilisateur requise'
          }
        };
      }

      // 4. Re-validation RBAC au moment de l'exécution
      const rbacRecheck = await this.rbacService.validateTableAccess({
        userId: request.userId,
        role: currentAction.userRole as any,
        tableName: this.getTableNameForEntity(currentAction.entity),
        action: this.mapActionTypeToRBACAction(currentAction.type),
        contextValues: {}
      });

      if (!rbacRecheck.allowed) {
        await this.updateActionStatus(request.actionId, 'failed', 'RBAC validation échec');
        return {
          success: false,
          actionId: request.actionId,
          error: {
            type: 'permission',
            message: 'Permissions insuffisantes au moment de l\'exécution'
          }
        };
      }

      // 5. Marquer l'action comme en cours d'exécution
      await this.updateActionStatus(request.actionId, 'executing', 'Démarrage exécution');

      // 6. Exécuter l'action selon son type et entité
      const executionResult = await this.performActionExecution(currentAction);

      // 7. Marquer l'action comme complétée ou échouée
      if (executionResult.success) {
        await this.updateActionStatus(request.actionId, 'completed', 'Action exécutée avec succès');
        
        // Mettre à jour le résultat d'exécution
        await db
          .update(actions)
          .set({
            executionResult: executionResult,
            executionTimeMs: Date.now() - startTime,
            completedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(actions.id, request.actionId));
      } else {
        await this.updateActionStatus(request.actionId, 'failed', executionResult.error?.message || 'Erreur d\'exécution');
        
        await db
          .update(actions)
          .set({
            errorDetails: executionResult.error?.message,
            executionTimeMs: Date.now() - startTime,
            updatedAt: new Date()
          })
          .where(eq(actions.id, request.actionId));
      }

      // 8. Logging d'audit
      await this.auditService.logEvent({
        userId: request.userId,
        userRole: currentAction.userRole,
        sessionId: currentAction.sessionId || 'system',
        eventType: 'data.modification',
        result: executionResult.success ? 'success' : 'error',
        severity: executionResult.success ? 'medium' : 'high',
        resource: `action:${currentAction.entity}:${currentAction.operation}`,
        action: 'execute_action',
        entityType: currentAction.entity,
        entityId: executionResult.entityId,
        payload: { actionParameters: currentAction.parameters },
        response: executionResult,
        errorDetails: executionResult.error,
        metadata: { 
          executionTime: Date.now() - startTime,
          riskLevel: currentAction.riskLevel
        }
      });

      // 9. Publication d'événement temps réel
      this.eventBus.publish({
        id: crypto.randomUUID(),
        type: EventType.CHATBOT_QUERY_PROCESSED,
        entity: 'system',
        entityId: executionResult.entityId || request.actionId,
        severity: executionResult.success ? 'info' : 'error',
        title: executionResult.success ? '✅ Action Exécutée' : '❌ Action Échouée',
        message: executionResult.success 
          ? `Action ${currentAction.operation} exécutée avec succès`
          : `Échec de l'action ${currentAction.operation}: ${executionResult.error?.message}`,
        timestamp: new Date().toISOString(),
        affectedQueryKeys: [
          ['/api/chatbot/action-history'],
          [`/api/${currentAction.entity}s`], // Invalider le cache des entités affectées
          ['/api/dashboard/metrics']
        ],
        userId: request.userId,
        metadata: {
          actionId: request.actionId,
          operation: currentAction.operation,
          executionTime: Date.now() - startTime,
          success: executionResult.success
        }
      });

      return {
        success: executionResult.success,
        result: executionResult,
        actionId: request.actionId,
        executionTime: Date.now() - startTime,
        error: executionResult.error ? {
          type: 'execution',
          message: executionResult.error.message,
          details: executionResult.error.details
        } : undefined
      };

    } catch (error) {
      logger.error('Erreur executeAction', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'executeAction',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });

      // Marquer l'action comme échouée si possible
      if (currentAction) {
        await this.updateActionStatus(request.actionId, 'failed', `Erreur système: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      await this.auditService.logEvent({
        userId: request.userId,
        userRole: currentAction?.userRole || 'unknown',
        eventType: 'system.error',
        result: 'error',
        severity: 'critical',
        resource: `action:execution:${request.actionId}`,
        action: 'execute_action',
        errorDetails: error instanceof Error ? error.message : 'Erreur inconnue',
        metadata: { executionTime: Date.now() - startTime }
      });

      return {
        success: false,
        actionId: request.actionId,
        executionTime: Date.now() - startTime,
        error: {
          type: 'execution',
          message: 'Erreur système lors de l\'exécution'
        }
      };
    }
  }

  // ========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================================

  private mapEntityName(entityText: string): string | null {
    const entityMappings: Record<string, string> = {
      'projet': 'project',
      'offre': 'offer', 
      'ao': 'ao',
      'appel d\'offre': 'ao',
      'contact': 'contact',
      'tâche': 'task',
      'tache': 'task',
      'fournisseur': 'supplier',
      'jalons': 'milestone',
      'jalon': 'milestone'
    };

    return entityMappings[entityText.toLowerCase()] || null;
  }

  private detectSpecificOperation(query: string, actionType: string, entity: string | null): string | null {
    if (!entity || !SUPPORTED_OPERATIONS[entity as keyof typeof SUPPORTED_OPERATIONS]) return null;

    const supportedOps = SUPPORTED_OPERATIONS[entity as keyof typeof SUPPORTED_OPERATIONS][actionType as keyof typeof SUPPORTED_OPERATIONS[keyof typeof SUPPORTED_OPERATIONS]];
    
    // Logique simple pour détecter l'opération spécifique
    if (actionType === 'update' && query.includes('statut')) return 'update_status';
    if (actionType === 'update' && query.includes('montant')) return 'update_montant';
    if (actionType === 'create') return supportedOps?.[0] || null;
    if (actionType === 'delete') return supportedOps?.[0] || null;
    
    return supportedOps?.[0] || null;
  }

  private isOperationSupported(entity: string, actionType: string, operation: string): boolean {
    const entityOps = SUPPORTED_OPERATIONS[entity as keyof typeof SUPPORTED_OPERATIONS];
    if (!entityOps) return false;
    
    const typeOps = entityOps[actionType as keyof typeof entityOps];
    return typeOps?.includes(operation as any) || false;
  }

  private determineRiskLevel(operation: string): 'low' | 'medium' | 'high' {
    for (const [level, operations] of Object.entries(OPERATION_RISK_LEVELS)) {
      if (operations.includes(operation)) {
        return level as 'low' | 'medium' | 'high';
      }
    }
    return 'medium'; // Par défaut
  }

  private getTableNameForEntity(entity: string): string {
    const entityTableMap: Record<string, string> = {
      'offer': 'offers',
      'project': 'projects',
      'ao': 'aos',
      'contact': 'maitres_ouvrage',
      'task': 'project_tasks',
      'supplier': 'suppliers'
    };
    
    return entityTableMap[entity] || entity;
  }

  private mapActionTypeToRBACAction(actionType: string): 'read' | 'write' | 'create' | 'delete' {
    const actionMap: Record<string, 'read' | 'write' | 'create' | 'delete'> = {
      'create': 'create',
      'update': 'write',
      'delete': 'delete',
      'business_action': 'write'
    };
    
    return actionMap[actionType] || 'write';
  }

  private async validateActionParameters(request: ProposeActionRequest): Promise<{ valid: boolean; errors?: string[] }> {
    // Validation basique - peut être étendue selon les besoins
    if (!request.parameters || typeof request.parameters !== 'object') {
      return { valid: false, errors: ['Paramètres manquants ou invalides'] };
    }
    
    // Validations spécifiques par type d'entité et d'opération
    const errors: string[] = [];
    
    if (request.entity === 'offer' && request.operation === 'create_offer') {
      if (!request.parameters.client) errors.push('Client requis pour créer une offre');
      if (!request.parameters.location) errors.push('Localisation requise pour créer une offre');
    }
    
    if (request.entity === 'project' && request.operation === 'create_project') {
      if (!request.parameters.offerId && !request.parameters.client) {
        errors.push('ID d\'offre ou client requis pour créer un projet');
      }
    }
    
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private async createActionConfirmation(actionId: string, userId: string, riskLevel: string, parameters: any): Promise<string> {
    const confirmationId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + DEFAULT_CONFIRMATION_TIMEOUT_MINUTES);

    const confirmationData: InsertActionConfirmation = {
      actionId,
      userId,
      status: 'pending',
      confirmationMessage: this.generateConfirmationMessage(parameters, riskLevel),
      warningMessage: riskLevel === 'high' ? 'Action à haut risque - Vérifiez attentivement avant de confirmer' : undefined,
      expiresAt
    };

    await db.insert(actionConfirmations).values([confirmationData]);
    return confirmationId;
  }

  private generateConfirmationMessage(parameters: any, riskLevel: string): string {
    const riskIndicator = riskLevel === 'high' ? '⚠️' : riskLevel === 'medium' ? '⚡' : 'ℹ️';
    return `${riskIndicator} Confirmer l'action avec les paramètres: ${JSON.stringify(parameters, null, 2)}`;
  }

  private estimateExecutionTime(operation: string): number {
    // Estimations approximatives en secondes
    const timeEstimates: Record<string, number> = {
      'create_offer': 2,
      'create_project': 3,
      'update_status': 1,
      'archive_offer': 2,
      'transform_to_project': 5
    };
    
    return timeEstimates[operation] || 2;
  }

  private generateActionWarnings(request: ProposeActionRequest, riskLevel: string): string[] {
    const warnings: string[] = [];
    
    if (riskLevel === 'high') {
      warnings.push('Cette action peut avoir des conséquences importantes');
    }
    
    if (request.entity === 'offer' && request.operation === 'archive_offer') {
      warnings.push('L\'archivage d\'une offre est irréversible');
    }
    
    if (request.entity === 'project' && request.operation === 'create_project') {
      warnings.push('Un nouveau projet sera créé avec les paramètres spécifiés');
    }
    
    return warnings;
  }

  private async updateActionStatus(actionId: string, status: string, reason: string): Promise<void> {
    try {
      // Récupérer l'état actuel
      const currentAction = await db
        .select()
        .from(actions)
        .where(eq(actions.id, actionId))
        .limit(1);

      if (currentAction.length === 0) return;

      const oldStatus = currentAction[0].status;

      // Mettre à jour l'action
      await db
        .update(actions)
        .set({
          status: status as any,
          updatedAt: new Date(),
          ...(status === 'confirmed' ? { confirmedAt: new Date() } : {}),
          ...(status === 'executing' ? { executedAt: new Date() } : {}),
          ...(status === 'completed' ? { completedAt: new Date() } : {})
        })
        .where(eq(actions.id, actionId));

      // Enregistrer l'historique
      const historyData: InsertActionHistory = {
        actionId,
        fromStatus: oldStatus,
        toStatus: status as any,
        changeReason: reason,
        changeType: 'system_update',
        success: true
      };

      await db.insert(actionHistory).values([historyData]);

    } catch (error) {
      logger.error('Erreur updateActionStatus', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'updateActionStatus',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }

  private async performActionExecution(action: Action): Promise<ActionExecutionResult> {
    try {
      logger.info('Exécution opération', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'performActionExecution',
          actionOperation: action.operation,
          entity: action.entity
        }
      });

      switch (action.entity) {
        case 'offer':
          return await this.executeOfferAction(action);
        case 'project':
          return await this.executeProjectAction(action);
        case 'ao':
          return await this.executeAoAction(action);
        case 'task':
          return await this.executeTaskAction(action);
        case 'contact':
          return await this.executeContactAction(action);
        case 'supplier':
          return await this.executeSupplierAction(action);
        default:
          return {
            success: false,
            error: {
              type: 'permission',
              message: `Type d'entité non supporté: ${action.entity}`
            }
          };
      }
    } catch (error) {
      logger.error('Erreur performActionExecution', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'performActionExecution',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        success: false,
        error: {
          type: 'execution',
          message: error instanceof Error ? error.message : 'Erreur d\'exécution inconnue'
        }
      };
    }
  }

  private async executeOfferAction(action: Action): Promise<ActionExecutionResult> {
    switch (action.operation) {
      case 'create_offer':
        return await this.createOffer(action.parameters);
      case 'update_status':
        return await this.updateOfferStatus(action.targetEntityId!, (action.parameters as any).status);
      case 'archive_offer':
        return await this.archiveOffer(action.targetEntityId!);
      case 'transform_to_project':
        return await this.transformOfferToProject(action.targetEntityId!);
      default:
        return {
          success: false,
          error: {
            type: 'permission',
            message: `Opération d'offre non supportée: ${action.operation}`
          }
        };
    }
  }

  private async executeProjectAction(action: Action): Promise<ActionExecutionResult> {
    switch (action.operation) {
      case 'create_project':
        return await this.createProject(action.parameters);
      case 'update_status':
        return await this.updateProjectStatus(action.targetEntityId!, (action.parameters as any).status);
      case 'archive_project':
        return await this.archiveProject(action.targetEntityId!);
      default:
        return {
          success: false,
          error: {
            type: 'permission',
            message: `Opération de projet non supportée: ${action.operation}`
          }
        };
    }
  }

  private async executeAoAction(action: Action): Promise<ActionExecutionResult> {
    return {
      success: false,
      error: {
        type: 'validation',
        message: 'Opérations AO non implémentées'
      }
    };
  }

  private async executeTaskAction(action: Action): Promise<ActionExecutionResult> {
    switch (action.operation) {
      case 'create_project_task':
        return await this.createProjectTask(action.parameters);
      case 'update_task_status':
        return await this.updateTaskStatus(action.targetEntityId!, (action.parameters as any).status);
      default:
        return {
          success: false,
          error: {
            type: 'permission',
            message: `Opération de tâche non supportée: ${action.operation}`
          }
        };
    }
  }

  private async executeContactAction(action: Action): Promise<ActionExecutionResult> {
    return {
      success: false,
      error: {
        type: 'validation',
        message: 'Opérations contact non implémentées'
      }
    };
  }

  private async executeSupplierAction(action: Action): Promise<ActionExecutionResult> {
    return {
      success: false,
      error: {
        type: 'validation',
        message: 'Opérations fournisseur non implémentées'
      }
    };
  }

  // ========================================
  // OPÉRATIONS SPÉCIFIQUES CRUD
  // ========================================

  private async createOffer(parameters: any): Promise<ActionExecutionResult> {
    try {
      const offerId = crypto.randomUUID();
      const reference = `OF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const offerData = {
        id: offerId,
        reference,
        client: parameters.client,
        location: parameters.location || '',
        menuiserieType: parameters.menuiserieType || 'fenetre',
        montantEstime: parameters.montantEstime ? parseFloat(parameters.montantEstime) : null,
        status: 'brouillon' as any,
        responsibleUserId: parameters.responsibleUserId,
        departement: parameters.departement,
        source: parameters.source || 'website'
      };

      await db.insert(offers).values([offerData]);

      return {
        success: true,
        entityId: offerId,
        affectedRows: 1,
        warnings: parameters.montantEstime ? [] : ['Montant estimé non spécifié']
      };
    } catch (error) {
      logger.error('Erreur createOffer', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'createOffer',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de la création de l\'offre'
        }
      };
    }
  }

  private async updateOfferStatus(offerId: string, status: string): Promise<ActionExecutionResult> {
    try {
      const result = await db
        .update(offers)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(offers.id, offerId));

      return {
        success: true,
        entityId: offerId,
        affectedRows: 1
      };
    } catch (error) {
      logger.error('Erreur updateOfferStatus', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'updateOfferStatus',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de la mise à jour du statut'
        }
      };
    }
  }

  private async archiveOffer(offerId: string): Promise<ActionExecutionResult> {
    try {
      await db
        .update(offers)
        .set({ status: 'archive', updatedAt: new Date() })
        .where(eq(offers.id, offerId));

      return {
        success: true,
        entityId: offerId,
        affectedRows: 1,
        warnings: ['Offre archivée - action irréversible']
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de l\'archivage'
        }
      };
    }
  }

  private async transformOfferToProject(offerId: string): Promise<ActionExecutionResult> {
    try {
      // Récupérer l'offre
      const offerResults = await db
        .select()
        .from(offers)
        .where(eq(offers.id, offerId))
        .limit(1);

      if (offerResults.length === 0) {
        return {
          success: false,
          error: {
            type: 'permission',
            message: 'Offre introuvable'
          }
        };
      }

      const offer = offerResults[0];
      const projectId = crypto.randomUUID();
      const reference = `PROJ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      // Créer le projet
      const projectData = {
        name: `Projet ${offer.client}`,
        client: offer.client,
        location: offer.location,
        montantTotal: offer.montantFinal || offer.montantEstime,
        status: 'passation' as any,
        responsibleUserId: offer.responsibleUserId,
        dateDebutPrevu: offer.demarragePrevu,
        offerId: offer.id
      };

      await db.insert(projects).values([projectData]);

      // Mettre à jour l'offre
      await db
        .update(offers)
        .set({ 
          status: 'transforme_en_projet',
          updatedAt: new Date()
        })
        .where(eq(offers.id, offerId));

      return {
        success: true,
        entityId: projectId,
        affectedRows: 2,
        sideEffects: [
          {
            entity: 'offer',
            action: 'status_update',
            details: { offerId, newStatus: 'transforme_en_projet' }
          }
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de la transformation en projet'
        }
      };
    }
  }

  private async createProject(parameters: any): Promise<ActionExecutionResult> {
    try {
      const projectId = crypto.randomUUID();
      const reference = `PROJ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

      const projectData = {
        name: parameters.name || `Projet ${parameters.client}`,
        client: parameters.client,
        location: parameters.location || '',
        montantTotal: parameters.montantTotal ? parseFloat(parameters.montantTotal) : null,
        status: 'passation' as any,
        responsibleUserId: parameters.responsibleUserId,
        offerId: parameters.offerId,
        dateDebutPrevu: parameters.dateDebutPrevu ? new Date(parameters.dateDebutPrevu) : null
      };

      await db.insert(projects).values([projectData]);

      return {
        success: true,
        entityId: projectId,
        affectedRows: 1
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de la création du projet'
        }
      };
    }
  }

  private async updateProjectStatus(projectId: string, status: string): Promise<ActionExecutionResult> {
    try {
      await db
        .update(projects)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      return {
        success: true,
        entityId: projectId,
        affectedRows: 1
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de la mise à jour du statut du projet'
        }
      };
    }
  }

  private async archiveProject(projectId: string): Promise<ActionExecutionResult> {
    try {
      // Marquer le projet comme terminé plutôt que de le supprimer
      await db
        .update(projects)
        .set({ status: 'sav', updatedAt: new Date() }) // SAV est le dernier statut
        .where(eq(projects.id, projectId));

      return {
        success: true,
        entityId: projectId,
        affectedRows: 1,
        warnings: ['Projet marqué comme terminé (SAV)']
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de l\'archivage du projet'
        }
      };
    }
  }

  private async createProjectTask(parameters: any): Promise<ActionExecutionResult> {
    try {
      const taskId = crypto.randomUUID();

      const taskData = {
        id: taskId,
        projectId: parameters.projectId,
        name: parameters.name,
        description: parameters.description,
        status: 'a_faire' as any,
        assignedUserId: parameters.assignedUserId,
        dateEcheance: parameters.dateEcheance ? new Date(parameters.dateEcheance) : null,
        priority: parameters.priority || 'normale'
      };

      await db.insert(projectTasks).values([taskData]);

      return {
        success: true,
        entityId: taskId,
        affectedRows: 1
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de la création de la tâche'
        }
      };
    }
  }

  private async updateTaskStatus(taskId: string, status: string): Promise<ActionExecutionResult> {
    try {
      await db
        .update(projectTasks)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(projectTasks.id, taskId));

      return {
        success: true,
        entityId: taskId,
        affectedRows: 1
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'execution',
          message: 'Erreur lors de la mise à jour du statut de la tâche'
        }
      };
    }
  }

  // ========================================
  // HISTORIQUE ET RECHERCHE D'ACTIONS
  // ========================================

  /**
   * Récupère l'historique des actions pour un utilisateur
   */
  async getActionHistory(request: ActionHistoryRequest): Promise<ActionHistoryResponse> {
    try {
      let query = db
        .select()
        .from(actions)
        .orderBy(desc(actions.proposedAt));

      // Appliquer les filtres
      const conditions = [];
      
      if (request.userId) {
        conditions.push(eq(actions.userId, request.userId));
      }
      
      if (request.actionType) {
        conditions.push(eq(actions.type, request.actionType));
      }
      
      if (request.entity) {
        conditions.push(eq(actions.entity, request.entity));
      }
      
      if (request.status) {
        conditions.push(eq(actions.status, request.status));
      }
      
      if (request.riskLevel) {
        conditions.push(eq(actions.riskLevel, request.riskLevel));
      }
      
      if (request.startDate) {
        conditions.push(gte(actions.proposedAt, new Date(request.startDate)));
      }
      
      if (request.endDate) {
        conditions.push(lte(actions.proposedAt, new Date(request.endDate)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Pagination
      const results = await query
        .limit(request.limit || 20)
        .offset(request.offset || 0);

      // Nettoyer les résultats selon les options
      const cleanedActions = results.map(action => ({
        ...action,
        parameters: request.includeParameters ? action.parameters : undefined,
        executionResult: request.includeResults ? action.executionResult : undefined
      }));

      // Compter le total pour la pagination
      const countQuery = db
        .select({ count: sql`count(*)` })
        .from(actions);
        
      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }
      
      const countResult = await countQuery;
      const total = Number(countResult[0]?.count || 0);

      return {
        success: true,
        actions: cleanedActions as Action[],
        total,
        hasMore: (request.offset || 0) + results.length < total
      };

    } catch (error) {
      logger.error('Erreur getActionHistory', {
        metadata: {
          service: 'ActionExecutionService',
          operation: 'getActionHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return {
        success: false,
        actions: [],
        total: 0,
        hasMore: false,
        error: {
          type: 'query',
          message: 'Erreur lors de la récupération de l\'historique'
        }
      };
    }
  }
}