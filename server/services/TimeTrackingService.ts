/**
 * TimeTrackingService
 * Service de suivi du temps back-office
 * 
 * Fonctionnalités :
 * - Enregistrer temps passé
 * - Récupérer résumé temps par projet
 * - Calculer coûts back-office
 */

import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError } from './utils/error-handler';
import type { IStorage } from '../storage-poc';
import type { EventBus } from '../eventBus';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import type { TimeTracking, InsertTimeTracking } from '@shared/schema';

export interface ProjectTimeSummary {
  projectId: string;
  totalHours: number;
  hoursByType: Record<string, number>;
  totalCost: number;
  costByType: Record<string, number>;
  entries: TimeTracking[];
}

export class TimeTrackingService {
  constructor(
    private storage: IStorage,
    private eventBus?: EventBus
  ) {}

  /**
   * Enregistre du temps passé
   */
  async recordTime(data: InsertTimeTracking): Promise<TimeTracking> {
    return withErrorHandling(
      async () => {
        // Validation : projectId ou offerId requis
        if (!data.projectId && !data.offerId) {
          throw new ValidationError('projectId or offerId is required');
        }

        // Vérifier que l'utilisateur existe
        const user = await this.storage.getUser(data.userId);
        if (!user) {
          throw new NotFoundError(`User with id ${data.userId} not found`);
        }

        // Vérifier que le projet existe si fourni
        if (data.projectId) {
          const project = await this.storage.getProject(data.projectId);
          if (!project) {
            throw new NotFoundError(`Project with id ${data.projectId} not found`);
          }
        }

        // Vérifier que l'offre existe si fournie
        if (data.offerId) {
          const offer = await this.storage.getOffer(data.offerId);
          if (!offer) {
            throw new NotFoundError(`Offer with id ${data.offerId} not found`);
          }
        }

        // Créer enregistrement
        const tracking = await this.storage.createTimeTracking(data);

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
            id: crypto.randomUUID(),
            type: 'time:tracking:recorded' as any,
            entity: data.projectId ? 'project' : 'offer',
            entityId: data.projectId || data.offerId || '',
            message: `${data.hours}h enregistrées pour ${data.taskType}`,
            severity: 'info',
            affectedQueryKeys: [
              data.projectId 
                ? ['/api/projects', data.projectId, 'time-tracking']
                : ['/api/offers', data.offerId!, 'time-tracking']
            ],
            userId: data.userId,
            timestamp: new Date().toISOString(),
            metadata: {
              trackingId: tracking.id,
              hours: Number(data.hours),
              taskType: data.taskType
        }
                  );
        }

        logger.info('Temps enregistré', {
          metadata: {
            service: 'TimeTrackingService',
            operation: 'recordTime',
            trackingId: tracking.id,
            hours: Number(data.hours),
            taskType: data.taskType
        }
                );

        return tracking;
      },
      {
        service: 'TimeTrackingService',
        operation: 'recordTime'
      }
    );
  }

  /**
   * Récupère le résumé du temps par projet
   */
  async getProjectTimeSummary(projectId: string): Promise<ProjectTimeSummary> {
    return withErrorHandling(
      async () => {
        // Vérifier que le projet existe
        const project = await this.storage.getProject(projectId);
        if (!project) {
          throw new NotFoundError(`Project with id ${projectId} not found`);
        }

        // Récupérer tous les enregistrements
        const entries = await this.storage.getProjectTimeTracking(projectId);

        // Calculer totaux
        let totalHours = 0;
        const hoursByType: Record<string, number> = {};
        let totalCost = 0;
        const costByType: Record<string, number> = {};

        for (const entry of entries) {
          const hours = Number(entry.hours);
          totalHours += hours;

          // Par type
          if (!hoursByType[entry.taskType]) {
            hoursByType[entry.taskType] = 0;
          }
          hoursByType[entry.taskType] += hours;

          // Coûts
          if (entry.hourlyRate) {
            const cost = hours * Number(entry.hourlyRate);
            totalCost += cost;

            if (!costByType[entry.taskType]) {
              costByType[entry.taskType] = 0;
            }
            costByType[entry.taskType] += cost;
          }
        }

        return {
          projectId,
          totalHours,
          hoursByType,
          totalCost,
          costByType,
          entries
        };
      },
      {
        service: 'TimeTrackingService',
        operation: 'getProjectTimeSummary'
      }
    );
  }
}

// Export singleton instance
import { storage } from '../storage-poc';
import { eventBus } from '../eventBus';

export const timeTrackingService = new TimeTrackingService(storage, eventBus);

