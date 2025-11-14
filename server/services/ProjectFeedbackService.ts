/**
 * ProjectFeedbackService
 * Service de gestion des feedbacks terrain → BE
 * 
 * Fonctionnalités :
 * - Créer feedback terrain
 * - Assigner feedback à un BE
 * - Résoudre feedback avec notes
 * - Publier événements pour notifications
 */

import { withErrorHandling } from '../utils/error-handler';
import { AppError, NotFoundError, ValidationError } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import type { EventBus } from '../eventBus';
import { logger } from '../utils/logger';
import type { 
  ProjectFeedbackTerrain, 
  InsertProjectFeedbackTerrain 
} from '@shared/schema';

export class ProjectFeedbackService {
  constructor(
    private storage: IStorage,
    private eventBus?: EventBus
  ) {}

  /**
   * Crée un nouveau feedback terrain
   */
  async createFeedback(data: InsertProjectFeedbackTerrain): Promise<ProjectFeedbackTerrain> {
    return withErrorHandling(
      async () => {
        // Validation métier : vérifier que le projet existe
        const project = await this.storage.getProject(data.projectId);
        if (!project) {
          throw new NotFoundError(`Project with id ${data.projectId} not found`);
        }

        // Créer feedback avec status "nouveau"
        const feedback = await this.storage.createProjectFeedbackTerrain({
          ...data,
          status: 'nouveau' as const
        });

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
                id: crypto.randomUUID(),
            type: 'project:feedback:created' as unknown,
            entity: 'project',
            entityId: data.projectId,
            message: `Nouveau feedback terrain créé: ${feedback.title}`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/projects', data.projectId, 'feedback-terrain']
            ],
                userId: data.reportedBy,
            timestamp: new Date().toISOString(),
            metadata: {
              feedbackId: feedback.id,
              feedbackType: feedback.feedbackType,
              severity: feedback.severity
            }
          });
        }

        logger.info('Feedback terrain créé', { metadata: {
            service: 'ProjectFeedbackService',
                  operation: 'createFeedback',
            feedbackId: feedback.id,
                  projectId: data.projectId

                        }
 
              
                                                                                                                                                                                                                                                                                          });
        return feedback;
      },
      {
        service: 'ProjectFeedbackService',
        operation: 'createFeedback'
      }
    );
  }

  /**
   * Assigner un feedback à un BE
   */
  async assignFeedback(feedbackId: string, assignedTo: string): Promise<ProjectFeedbackTerrain> {
    return withErrorHandling(
      async () => {
        // Vérifier que le feedback existe
        const feedback = await this.storage.getProjectFeedbackTerrainById(feedbackId);
        if (!feedback) {
          throw new NotFoundError(`Feedback with id ${feedbackId} not found`);
        }

        // Vérifier que l'utilisateur existe
        const user = await this.storage.getUser(assignedTo);
        if (!user) {
          throw new NotFoundError(`User with id ${assignedTo} not found`);
        }

        // Mettre à jour feedback
        const updated = await this.storage.updateProjectFeedbackTerrain(feedbackId, {
          assignedTo,
          status: 'en_cours' as const
        });

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
            id: crypto.randomUUID(),
            type: 'project:feedback:assigned',
            entity: 'project',
            entityId: feedback.projectId,
            message: `Feedback assigné à ${user.email}`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/projects', feedback.projectId, 'feedback-terrain']
            ],
            userId: assignedTo,
            timestamp: new Date().toISOString(),
            metadata: {
              feedbackId: feedback.id,
              assignedTo
            }
          });
        }

        logger.info('Feedback assigné', { metadata: {
            service: 'ProjectFeedbackService',
                  operation: 'assignFeedback',
            feedbackId,
            assignedTo 
              
                }
 
              
            });
        return updated;
      },
      {
        service: 'ProjectFeedbackService',
        operation: 'assignFeedback'
      }
    );
  }

  /**
   * Résoudre un feedback avec notes
   */
  async resolveFeedback(
    feedbackId: string, 
    resolvedBy: string, 
    resolutionNotes: string
  ): Promise<ProjectFeedbackTerrain> {
    return withErrorHandling(
      async () => {
        // Vérifier que le feedback existe
        const feedback = await this.storage.getProjectFeedbackTerrainById(feedbackId);
        if (!feedback) {
          throw new NotFoundError(`Feedback with id ${feedbackId} not found`);
        }

        // Vérifier que le feedback est assigné
        if (!feedback.assignedTo) {
          throw new ValidationError('Feedback must be assigned before resolution');
        }

        // Mettre à jour feedback
        const updated = await this.storage.updateProjectFeedbackTerrain(feedbackId, {
          status: 'resolu' as const,
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNotes
        });

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
            id: crypto.randomUUID(),
            type: 'project:feedback:resolved',
            entity: 'project',
            entityId: feedback.projectId,
            message: `Feedback résolu: ${feedback.title}`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/projects', feedback.projectId, 'feedback-terrain']
            ],
            userId: resolvedBy,
            timestamp: new Date().toISOString(),
            metadata: {
              feedbackId: feedback.id,
              resolvedBy
            }
          });
        }

        logger.info('Feedback résolu', { metadata: {
            service: 'ProjectFeedbackService',
                  operation: 'resolveFeedback',
            feedbackId,
            resolvedBy 
              
                }
 
              
            });
        return updated;
      },
      {
        service: 'ProjectFeedbackService',
        operation: 'resolveFeedback'
      }
    );
  }
}

// Export singleton instance
import { storage } from '../storage-poc';
import { eventBus } from '../eventBus';
import crypto from 'crypto';

export const projectFeedbackService = new ProjectFeedbackService(storage, eventBus);

