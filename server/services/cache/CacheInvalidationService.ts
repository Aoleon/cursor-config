/**
 * Cache Invalidation Service
 * 
 * Centralizes cache invalidation rules and coordinates invalidation
 * across different cache services (ContextCacheService, CacheService).
 * 
 * Target: Centralize invalidation rules and improve EventBus integration
 */

import { logger } from '../../utils/logger';
import type { EventBus } from '../../eventBus';
import { getContextCacheService } from '../ContextCacheService';
import { getCacheService } from '../CacheService';

export interface InvalidationRule {
  entityType: string;
  triggerEvents: string[];
  relatedEntityTypes: string[];
  cascadingInvalidation: boolean;
  delayMinutes?: number;
  cacheServices: ('context' | 'general')[];
}

export class CacheInvalidationService {
  private rules: Map<string, InvalidationRule[]> = new Map();
  private eventBus?: EventBus;

  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
    this.setupDefaultRules();
    this.setupEventBusListeners();
    
    logger.info('Cache Invalidation Service initialized', {
      metadata: {
        service: 'CacheInvalidationService',
        operation: 'constructor',
        rulesCount: Array.from(this.rules.values()).flat().length
      }
    });
  }

  /**
   * Sets up default invalidation rules
   */
  private setupDefaultRules(): void {
    // Projects
    this.addRule({
      entityType: 'project',
      triggerEvents: ['update', 'delete', 'status_change'],
      relatedEntityTypes: ['offer', 'supplier', 'team'],
      cascadingInvalidation: true,
      cacheServices: ['context', 'general']
    });

    // Offers
    this.addRule({
      entityType: 'offer',
      triggerEvents: ['update', 'delete', 'status_change'],
      relatedEntityTypes: ['project', 'ao', 'supplier'],
      cascadingInvalidation: true,
      cacheServices: ['context', 'general']
    });

    // AOs
    this.addRule({
      entityType: 'ao',
      triggerEvents: ['update', 'delete'],
      relatedEntityTypes: ['offer'],
      cascadingInvalidation: false,
      cacheServices: ['context', 'general']
    });

    // Suppliers
    this.addRule({
      entityType: 'supplier',
      triggerEvents: ['update', 'delete', 'status_change'],
      relatedEntityTypes: ['offer', 'project'],
      cascadingInvalidation: true,
      delayMinutes: 5, // Delay to avoid too frequent invalidations
      cacheServices: ['context', 'general']
    });

    // Analytics data
    this.addRule({
      entityType: 'analytics',
      triggerEvents: ['update', 'recalculate'],
      relatedEntityTypes: [],
      cascadingInvalidation: false,
      cacheServices: ['general']
    });
  }

  /**
   * Adds an invalidation rule
   */
  addRule(rule: InvalidationRule): void {
    const existing = this.rules.get(rule.entityType) || [];
    existing.push(rule);
    this.rules.set(rule.entityType, existing);
  }

  /**
   * Invalidates cache for an entity change
   */
  async invalidateOnEntityChange(
    entityType: string,
    entityId: string,
    changeType: 'update' | 'delete' | 'status_change' | 'recalculate',
    additionalContext?: Record<string, unknown>
  ): Promise<void> {
    const rules = this.rules.get(entityType) || [];
    
    logger.info('Cache invalidation triggered', {
      metadata: {
        service: 'CacheInvalidationService',
        operation: 'invalidateOnEntityChange',
        entityType,
        entityId,
        changeType,
        rulesCount: rules.length
      }
    });

    for (const rule of rules) {
      if (!rule.triggerEvents.includes(changeType)) {
        continue;
      }

      // Invalidate in all specified cache services
      for (const cacheService of rule.cacheServices) {
        if (cacheService === 'context') {
          const contextCache = getContextCacheService();
          await contextCache.invalidateOnEntityChange(
            entityType,
            entityId,
            changeType as 'update' | 'delete' | 'status_change',
            additionalContext
          );
        } else if (cacheService === 'general') {
          const generalCache = getCacheService();
          // Invalidate by pattern
          const pattern = `${entityType}:${entityId}*`;
          await generalCache.invalidateByPattern(pattern);
        }
      }

      // Cascading invalidation
      if (rule.cascadingInvalidation) {
        for (const relatedType of rule.relatedEntityTypes) {
          await this.invalidateRelatedEntities(relatedType, entityId);
        }
      }

      // Delayed invalidation if configured
      if (rule.delayMinutes) {
        setTimeout(async () => {
          await this.invalidateOnEntityChange(entityType, entityId, changeType, additionalContext);
        }, rule.delayMinutes * 60 * 1000);
      }
    }

    logger.info('Cache invalidation completed', {
      metadata: {
        service: 'CacheInvalidationService',
        operation: 'invalidateOnEntityChange',
        entityType,
        entityId
      }
    });
  }

  /**
   * Invalidates related entities
   */
  private async invalidateRelatedEntities(
    relatedType: string,
    entityId: string
  ): Promise<void> {
    const contextCache = getContextCacheService();
    const generalCache = getCacheService();

    // Invalidate context cache
    await contextCache.invalidateByPattern(`${relatedType}:*${entityId}*`);

    // Invalidate general cache
    const pattern = `${relatedType}:*${entityId}*`;
    await generalCache.invalidateByPattern(pattern);
  }

  /**
   * Sets up EventBus listeners for automatic invalidation
   */
  private setupEventBusListeners(): void {
    if (!this.eventBus) {
      logger.warn('EventBus not available - automatic invalidation disabled', {
        metadata: {
          service: 'CacheInvalidationService',
          operation: 'setupEventBusListeners'
        }
      });
      return;
    }

    // Listen for entity update events
    this.eventBus.subscribe(async (event) => {
      if (event.type === 'entity.updated' || event.type === 'entity.deleted' || event.type === 'entity.status_changed') {
        const { entityType, entityId, changeType } = event.metadata || {};
        if (entityType && entityId) {
          await this.invalidateOnEntityChange(
            entityType,
            entityId,
            changeType || 'update',
            event.metadata
          );
        }
      }
    }, {
      eventTypes: ['entity.updated', 'entity.deleted', 'entity.status_changed']
    });

    logger.info('EventBus listeners configured for cache invalidation', {
      metadata: {
        service: 'CacheInvalidationService',
        operation: 'setupEventBusListeners'
      }
    });
  }

  /**
   * Gets all invalidation rules
   */
  getRules(): Map<string, InvalidationRule[]> {
    return new Map(this.rules);
  }
}

// Singleton instance
let globalCacheInvalidationService: CacheInvalidationService | null = null;

export function getCacheInvalidationService(eventBus?: EventBus): CacheInvalidationService {
  if (!globalCacheInvalidationService) {
    globalCacheInvalidationService = new CacheInvalidationService(eventBus);
    logger.info('Cache Invalidation Service singleton created', {
      metadata: {
        service: 'CacheInvalidationService',
        operation: 'getCacheInvalidationService'
      }
    });
  }
  return globalCacheInvalidationService;
}

export function resetCacheInvalidationService(): void {
  globalCacheInvalidationService = null;
}

