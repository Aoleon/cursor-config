import { logger } from '../utils/logger';
import type { EventBus } from '../eventBus';

// ========================================
// TTL CONFIGURATION
// ========================================

export const TTL_CONFIG = {
  MONDAY_BOARDS_LIST: 600,      // 10 minutes
  MONDAY_BOARD_DETAIL: 300,     // 5 minutes
  ANALYTICS_KPI: 120,            // 2 minutes
  ANALYTICS_REALTIME: 60,        // 1 minute
  ANALYTICS_METRICS: 90          // 1.5 minutes
} as const;

// ========================================
// CACHE ADAPTER INTERFACE
// ========================================

export interface ICacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  flush(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
}

// ========================================
// MEMORY CACHE ADAPTER
// ========================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCacheAdapter implements ICacheAdapter {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);

    logger.info('[MemoryCacheAdapter] Initialisé', {
      metadata: {
        service: 'MemoryCacheAdapter',
        operation: 'constructor',
        cleanupIntervalMs
      }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async flush(): Promise<void> {
    this.cache.clear();
    logger.info('[MemoryCacheAdapter] Cache vidé', {
      metadata: {
        service: 'MemoryCacheAdapter',
        operation: 'flush'
      }
    });
  }

  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  async size(): Promise<number> {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('[MemoryCacheAdapter] Nettoyage cache', {
        metadata: {
          service: 'MemoryCacheAdapter',
          operation: 'cleanup',
          cleanedCount,
          remainingSize: this.cache.size
        }
      });
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// ========================================
// CACHE STATS
// ========================================

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  keys: string[];
}

// ========================================
// CACHE SERVICE
// ========================================

export class CacheService {
  private adapter: ICacheAdapter;
  private hits: number = 0;
  private misses: number = 0;
  private eventBus?: EventBus;

  constructor(adapter?: ICacheAdapter) {
    this.adapter = adapter || new MemoryCacheAdapter();
    
    logger.info('[CacheService] Initialisé', {
      metadata: {
        service: 'CacheService',
        operation: 'constructor',
        adapterType: adapter ? 'custom' : 'MemoryCacheAdapter'
      }
    });
  }

  /**
   * Build normalized cache key
   */
  buildKey(service: string, resource: string, params?: Record<string, any>): string {
    const baseKey = `${service}:${resource}`;
    
    if (!params || Object.keys(params).length === 0) {
      return baseKey;
    }

    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');

    return `${baseKey}:${sortedParams}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.adapter.get<T>(key);
      
      if (value !== null) {
        this.hits++;
        logger.debug('[CacheService] Cache hit', {
          metadata: {
            service: 'CacheService',
            operation: 'get',
            key,
            hit: true
          }
        });
      } else {
        this.misses++;
        logger.debug('[CacheService] Cache miss', {
          metadata: {
            service: 'CacheService',
            operation: 'get',
            key,
            hit: false
          }
        });
      }

      return value;
    } catch (error) {
      logger.error('[CacheService] Erreur get cache', {
        metadata: {
          service: 'CacheService',
          operation: 'get',
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      this.misses++;
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.adapter.set(key, value, ttlSeconds);
      
      logger.debug('[CacheService] Valeur mise en cache', {
        metadata: {
          service: 'CacheService',
          operation: 'set',
          key,
          ttlSeconds
        }
      });
    } catch (error) {
      logger.error('[CacheService] Erreur set cache', {
        metadata: {
          service: 'CacheService',
          operation: 'set',
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Invalidate specific cache key
   */
  async invalidate(key: string): Promise<void> {
    try {
      await this.adapter.del(key);
      
      logger.info('[CacheService] Clé invalidée', {
        metadata: {
          service: 'CacheService',
          operation: 'invalidate',
          key
        }
      });
    } catch (error) {
      logger.error('[CacheService] Erreur invalidation cache', {
        metadata: {
          service: 'CacheService',
          operation: 'invalidate',
          key,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Invalidate all keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.adapter.keys();
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      const matchingKeys = keys.filter(key => regex.test(key));
      
      for (const key of matchingKeys) {
        await this.adapter.del(key);
      }

      logger.info('[CacheService] Pattern invalidé', {
        metadata: {
          service: 'CacheService',
          operation: 'invalidatePattern',
          pattern,
          invalidatedCount: matchingKeys.length
        }
      });
    } catch (error) {
      logger.error('[CacheService] Erreur invalidation pattern', {
        metadata: {
          service: 'CacheService',
          operation: 'invalidatePattern',
          pattern,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Flush all cache
   */
  async flush(): Promise<void> {
    try {
      await this.adapter.flush();
      this.hits = 0;
      this.misses = 0;
      
      logger.info('[CacheService] Cache complètement vidé', {
        metadata: {
          service: 'CacheService',
          operation: 'flush'
        }
      });
    } catch (error) {
      logger.error('[CacheService] Erreur flush cache', {
        metadata: {
          service: 'CacheService',
          operation: 'flush',
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const size = await this.adapter.size();
      const keys = await this.adapter.keys();
      const total = this.hits + this.misses;
      const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

      return {
        hits: this.hits,
        misses: this.misses,
        hitRate: parseFloat(hitRate.toFixed(2)),
        size,
        keys
      };
    } catch (error) {
      logger.error('[CacheService] Erreur récupération stats', {
        metadata: {
          service: 'CacheService',
          operation: 'getStats',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return {
        hits: this.hits,
        misses: this.misses,
        hitRate: 0,
        size: 0,
        keys: []
      };
    }
  }

  /**
   * Setup EventBus integration for automatic cache invalidation
   */
  setupEventBusIntegration(eventBus: EventBus): void {
    this.eventBus = eventBus;

    // Monday.com board updates
    eventBus.on('monday:board:updated', async (data: any) => {
      const { boardId } = data;
      await this.invalidatePattern(`monday:board:${boardId}:*`);
      await this.invalidatePattern('monday:boards:*');
    });

    // AO creation/update invalidates analytics
    eventBus.on('ao:created', async () => {
      await this.invalidatePattern('analytics:*');
    });

    eventBus.on('ao:updated', async () => {
      await this.invalidatePattern('analytics:*');
    });

    // Offer events invalidate analytics
    eventBus.on('offer:created', async () => {
      await this.invalidatePattern('analytics:*');
    });

    eventBus.on('offer:updated', async () => {
      await this.invalidatePattern('analytics:*');
    });

    // Project events invalidate analytics
    eventBus.on('project:created', async () => {
      await this.invalidatePattern('analytics:*');
    });

    eventBus.on('project:updated', async () => {
      await this.invalidatePattern('analytics:*');
    });

    // Analytics recalculation
    eventBus.on('analytics:calculated', async () => {
      await this.invalidatePattern('analytics:*');
    });

    logger.info('[CacheService] EventBus integration configurée', {
      metadata: {
        service: 'CacheService',
        operation: 'setupEventBusIntegration',
        listeners: [
          'monday:board:updated',
          'ao:created',
          'ao:updated',
          'offer:created',
          'offer:updated',
          'project:created',
          'project:updated',
          'analytics:calculated'
        ]
      }
    });
  }

  /**
   * Warmup cache with frequently accessed data
   */
  async warmupCache(warmupFunctions: (() => Promise<void>)[]): Promise<void> {
    logger.info('[CacheService] Démarrage warmup cache', {
      metadata: {
        service: 'CacheService',
        operation: 'warmupCache',
        functionsCount: warmupFunctions.length
      }
    });

    const results = await Promise.allSettled(
      warmupFunctions.map(fn => fn())
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    logger.info('[CacheService] Warmup cache terminé', {
      metadata: {
        service: 'CacheService',
        operation: 'warmupCache',
        successCount,
        failureCount,
        totalFunctions: warmupFunctions.length
      }
    });

    if (failureCount > 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => r.reason);
      
      logger.warn('[CacheService] Certaines fonctions warmup ont échoué', {
        metadata: {
          service: 'CacheService',
          operation: 'warmupCache',
          errors
        }
      });
    }
  }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}

export function initializeCacheService(adapter?: ICacheAdapter): CacheService {
  cacheServiceInstance = new CacheService(adapter);
  return cacheServiceInstance;
}
