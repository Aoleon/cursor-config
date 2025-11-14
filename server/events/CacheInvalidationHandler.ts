/**
 * CacheInvalidationHandler - Handler pour invalidation automatique du cache
 * 
 * Responsabilités:
 * - Invalidation cache selon événements
 * - Mapping événements → entités
 * - Configuration hooks d'invalidation
 * 
 * Target LOC: ~150-200
 */

import type { RealtimeEvent } from '../../shared/events';
import { EventType as EventTypeEnum } from '../../shared/events';
import type { ContextCacheService } from '../services/ContextCacheService';
import { logger } from '../utils/logger';
import { log } from '../vite';

export class CacheInvalidationHandler {
  private contextCacheService: ContextCacheService | null = null;
  private cacheInvalidationEnabled = true;
  private autoInvalidationHooks = new Map<string, (event: RealtimeEvent) => void>();

  /**
   * Configure l'intégration avec le service de cache contextuel
   */
  integrateWithContextCache(cacheService: ContextCacheService): void {
    this.contextCacheService = cacheService;
    this.cacheInvalidationEnabled = true;
    log('[EventBus] Intégration ContextCacheService activée - invalidation automatique disponible');
  }

  /**
   * Active/désactive l'invalidation automatique du cache
   */
  setCacheInvalidationEnabled(enabled: boolean): void {
    this.cacheInvalidationEnabled = enabled;
    log(`[EventBus] Invalidation cache automatique: ${enabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}`);
  }

  /**
   * Traite l'invalidation automatique du cache selon l'événement
   */
  async processAutomaticCacheInvalidation(event: RealtimeEvent): Promise<void> {
    if (!this.contextCacheService || !this.cacheInvalidationEnabled) return;

    try {
      const startTime = Date.now();
      
      // Mapping des événements vers les types d'entités et actions
      const invalidationMapping = this.getInvalidationMapping(event);
      
      if (invalidationMapping) {
        await this.contextCacheService.invalidateOnEntityChange(
          invalidationMapping.entityType,
          invalidationMapping.entityId,
          invalidationMapping.changeType,
          invalidationMapping.additionalContext
        );
        
        const duration = Date.now() - startTime;
        log(`[EventBus] Invalidation cache auto: ${invalidationMapping.entityType}:${invalidationMapping.entityId} en ${duration}ms`);
      }
    } catch (error) {
      log(`[EventBus] Erreur lors de l'invalidation automatique du cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Génère le mapping d'invalidation selon l'événement
   */
  private getInvalidationMapping(event: RealtimeEvent): {
    entityType: string;
    entityId: string;
    changeType: 'update' | 'delete' | 'status_change';
    additionalContext?: Record<string, unknown>;
  } | null {
    switch (event.type) {
      // Événements AO
      case EventTypeEnum.AO_STATUS_CHANGED:
        return {
          entityType: 'ao',
          entityId: event.entityId,
          changeType: 'status_change',
          additionalContext: {
            status: event.newStatus,
            previousStatus: event.prevStatus
          }
        };

      // Événements Offres
      case EventTypeEnum.OFFER_STATUS_CHANGED:
      case EventTypeEnum.OFFER_SIGNED:
      case EventTypeEnum.OFFER_VALIDATED:
        return {
          entityType: 'offer',
          entityId: event.entityId,
          changeType: event.type === EventTypeEnum.OFFER_STATUS_CHANGED ? 'status_change' : 'update',
          additionalContext: {
            status: event.newStatus || 'updated',
            previousStatus: event.prevStatus,
            aoId: event.metadata?.aoId,
            complexity: 'medium'
          }
        };

      // Événements Projets
      case EventTypeEnum.PROJECT_CREATED:
      case EventTypeEnum.PROJECT_STATUS_CHANGED:
        return {
          entityType: 'project',
          entityId: event.entityId,
          changeType: event.type === EventTypeEnum.PROJECT_STATUS_CHANGED ? 'status_change' : 'update',
          additionalContext: {
            status: event.newStatus || 'created',
            previousStatus: event.prevStatus,
            offerId: event.offerId,
            phase: event.newStatus,
            complexity: 'complex'
          }
        };

      // Événements Fournisseurs
      case EventTypeEnum.SUPPLIER_QUOTE_RECEIVED:
        return {
          entityType: 'supplier',
          entityId: event.entityId,
          changeType: 'update',
          additionalContext: {
            offerId: event.offerId,
            complexity: 'simple'
          }
        };

      // Événements Tâches
      case EventTypeEnum.TASK_STATUS_CHANGED:
      case EventTypeEnum.TASK_OVERDUE:
        return {
          entityType: 'project', // Les tâches impactent le contexte projet
          entityId: event.projectId || 'unknown',
          changeType: 'update',
          additionalContext: {
            taskId: event.entityId,
            taskStatus: event.newStatus,
            complexity: 'medium'
          }
        };

      default:
        return null; // Pas d'invalidation pour ce type d'événement
    }
  }

  /**
   * Configure les hooks d'invalidation automatique
   */
  setupAutomaticCacheInvalidation(): void {
    // Hook pour les modifications d'AO
    this.autoInvalidationHooks.set('ao_changes', (event) => {
      if (event.entity === 'ao' || event.entity === 'appel_offres') {
        log(`[EventBus] Hook AO déclenché pour ${event.entityId}`);
      }
    });

    // Hook pour les modifications d'offres
    this.autoInvalidationHooks.set('offer_changes', (event) => {
      if (event.entity === 'offer') {
        log(`[EventBus] Hook Offre déclenché pour ${event.entityId}`);
      }
    });

    // Hook pour les modifications de projets
    this.autoInvalidationHooks.set('project_changes', (event) => {
      if (event.entity === 'project') {
        log(`[EventBus] Hook Projet déclenché pour ${event.entityId}`);
      }
    });

    log('[EventBus] Hooks d\'invalidation automatique configurés');
  }
}

