/**
 * EventRouterService - Service de routage des événements vers handlers appropriés
 * 
 * Responsabilités:
 * - Router les événements vers les handlers par domaine
 * - Coordonner l'exécution des handlers
 * - Gérer les erreurs de routage
 * 
 * Target LOC: ~100-150
 */

import type { RealtimeEvent } from '../../shared/events';
import { CacheInvalidationHandler } from './CacheInvalidationHandler';
import { PredictiveEventHandler } from './PredictiveEventHandler';
import { logger } from '../utils/logger';

export class EventRouterService {
  private cacheInvalidationHandler: CacheInvalidationHandler;
  private predictiveEventHandler: PredictiveEventHandler;

  constructor(
    cacheInvalidationHandler: CacheInvalidationHandler,
    predictiveEventHandler: PredictiveEventHandler
  ) {
    this.cacheInvalidationHandler = cacheInvalidationHandler;
    this.predictiveEventHandler = predictiveEventHandler;
  }

  /**
   * Route un événement vers les handlers appropriés
   */
  async routeEvent(event: RealtimeEvent): Promise<void> {
    try {
      // 1. Invalidation cache (si activée)
      await this.cacheInvalidationHandler.processAutomaticCacheInvalidation(event);

      // 2. Handlers prédictifs (si activés)
      // Les handlers prédictifs sont déjà configurés via subscribe dans PredictiveEventHandler
      // Pas besoin de les appeler explicitement ici

      logger.debug('Événement routé', {
        metadata: {
          module: 'EventRouterService',
          operation: 'routeEvent',
          eventType: event.type,
          entity: event.entity
        }
      });
    } catch (error) {
      logger.error('Erreur lors du routage d\'événement', {
        metadata: {
          module: 'EventRouterService',
          operation: 'routeEvent',
          eventType: event.type,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}

