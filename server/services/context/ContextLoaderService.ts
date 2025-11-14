/**
 * Context Loader Service
 * 
 * Extracted from ContextBuilderService to handle data loading from database.
 * Responsible for fetching entity data and related entities.
 * 
 * Target LOC: ~200-300
 */

import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { aos, aoLots, offers, projects } from '@shared/schema';
import { NotFoundError } from '../../utils/error-handler';
import { logger } from '../../utils/logger';

export interface EntityData {
  entity: Record<string, any>;
  relatedLots?: Array<Record<string, any>>;
}

export class ContextLoaderService {
  /**
   * Loads AO data with related lots
   */
  async loadAoData(aoId: string): Promise<EntityData> {
    logger.info('[ContextLoader] Loading AO data', {
      metadata: {
        service: 'ContextLoaderService',
        operation: 'loadAoData',
        aoId
      }
    });

    const aoRecord = await db.query.aos.findFirst({ where: eq(aos.id, aoId) });
    if (!aoRecord) {
      throw new NotFoundError(`Appel d'offres ${aoId} introuvable`);
    }

    const lots = await this.fetchAoLots(aoId);

    return {
      entity: aoRecord,
      relatedLots: lots
    };
  }

  /**
   * Loads Offer data with related lots
   */
  async loadOfferData(offerId: string): Promise<EntityData> {
    logger.info('[ContextLoader] Loading Offer data', {
      metadata: {
        service: 'ContextLoaderService',
        operation: 'loadOfferData',
        offerId
      }
    });

    const offerRecord = await db.query.offers.findFirst({ where: eq(offers.id, offerId) });
    if (!offerRecord) {
      throw new NotFoundError(`Offre ${offerId} introuvable`);
    }

    const aoLotsForOffer = offerRecord.aoId ? await this.fetchAoLots(offerRecord.aoId) : [];

    return {
      entity: offerRecord,
      relatedLots: aoLotsForOffer
    };
  }

  /**
   * Loads Project data
   */
  async loadProjectData(projectId: string): Promise<EntityData> {
    logger.info('[ContextLoader] Loading Project data', {
      metadata: {
        service: 'ContextLoaderService',
        operation: 'loadProjectData',
        projectId
      }
    });

    const projectRecord = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
    if (!projectRecord) {
      throw new NotFoundError(`Projet ${projectId} introuvable`);
    }

    return {
      entity: projectRecord
    };
  }

  /**
   * Fetches AO lots for a given AO ID
   */
  private async fetchAoLots(aoId: string): Promise<Array<Record<string, any>>> {
    return db.query.aoLots.findMany({ where: eq(aoLots.aoId, aoId) });
  }
}

