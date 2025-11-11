/**
 * PrevuVsReelService
 * Service de comparaison prévu vs réel
 * 
 * Fonctionnalités :
 * - Comparer dates prévues vs réelles
 * - Comparer budget prévu vs réel
 * - Comparer heures prévues vs réelles
 */

import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError } from './utils/error-handler';
import type { IStorage } from '../storage-poc';
import { logger } from '../utils/logger';
import type { Project, Offer } from '@shared/schema';

export interface PrevuVsReelComparison {
  projectId: string;
  dates: {
    planned: {
      start?: Date;
      end?: Date;
    };
    actual: {
      start?: Date;
      end?: Date;
    };
    variance: {
      startDays?: number;
      endDays?: number;
    };
  };
  budget: {
    planned: number;
    actual: number;
    variance: number;
    variancePercent: number;
  };
  hours: {
    planned: number;
    actual: number;
    variance: number;
    variancePercent: number;
    byType: Record<string, { planned: number; actual: number }>;
  };
}

export class PrevuVsReelService {
  constructor(private storage: IStorage) {}

  /**
   * Compare prévu vs réel pour un projet
   */
  async compareProject(projectId: string): Promise<PrevuVsReelComparison> {
    return withErrorHandling(
      async () => {
        // Vérifier que le projet existe
        const project = await this.storage.getProject(projectId);
        if (!project) {
          throw new NotFoundError(`Project with id ${projectId} not found`);
        }

        // Récupérer l'offre associée
        const offer = project.offerId 
          ? await this.storage.getOffer(project.offerId)
          : null;

        // Comparer dates
        const dates = this.compareDates(project, offer);

        // Comparer budget
        const budget = this.compareBudget(project, offer);

        // Comparer heures
        const hours = await this.compareHours(projectId);

        return {
          projectId,
          dates,
          budget,
          hours
        };
      },
      {
        service: 'PrevuVsReelService',
        operation: 'compareProject'
      }
    );
  }

  /**
   * Compare les dates
   */
  private compareDates(project: Project, offer: Offer | null): PrevuVsReelComparison['dates'] {
    const planned = {
      start: offer?.dateDebutPrevue ? new Date(offer.dateDebutPrevue) : undefined,
      end: offer?.dateFinPrevue ? new Date(offer.dateFinPrevue) : undefined
    };

    const actual = {
      start: project.dateDebut ? new Date(project.dateDebut) : undefined,
      end: project.dateFin ? new Date(project.dateFin) : undefined
    };

    const variance = {
      startDays: planned.start && actual.start
        ? Math.floor((actual.start.getTime() - planned.start.getTime()) / (1000 * 60 * 60 * 24))
        : undefined,
      endDays: planned.end && actual.end
        ? Math.floor((actual.end.getTime() - planned.end.getTime()) / (1000 * 60 * 60 * 24))
        : undefined
    };

    return { planned, actual, variance };
  }

  /**
   * Compare le budget
   */
  private compareBudget(project: Project, offer: Offer | null): PrevuVsReelComparison['budget'] {
    const planned = offer?.montantHT ? Number(offer.montantHT) : 0;
    const actual = project.montantHT ? Number(project.montantHT) : 0;
    const variance = actual - planned;
    const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;

    return { planned, actual, variance, variancePercent };
  }

  /**
   * Compare les heures
   */
  private async compareHours(projectId: string): Promise<PrevuVsReelComparison['hours']> {
    // Récupérer temps enregistré
    const timeEntries = await this.storage.getProjectTimeTracking(projectId);

    // Calculer heures réelles
    let actual = 0;
    const byType: Record<string, { planned: number; actual: number }> = {};

    for (const entry of timeEntries) {
      const hours = Number(entry.hours);
      actual += hours;

      if (!byType[entry.taskType]) {
        byType[entry.taskType] = { planned: 0, actual: 0 };
      }
      byType[entry.taskType].actual += hours;
    }

    // TODO: Récupérer heures prévues depuis offre (beHoursEstimated, etc.)
    const planned = 0; // À implémenter depuis offre.beHoursEstimated

    const variance = actual - planned;
    const variancePercent = planned > 0 ? (variance / planned) * 100 : 0;

    return { planned, actual, variance, variancePercent, byType };
  }
}

// Export singleton instance
import { storage } from '../storage-poc';

export const prevuVsReelService = new PrevuVsReelService(storage);

