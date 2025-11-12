import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';

// ========================================
// POOL DE RESSOURCES
// ========================================
// Réutilise les ressources (connexions, instances) pour optimiser performances
// Gère pool avec création, réutilisation, et nettoyage automatique
// ========================================

export interface Resource<T = unknown> {
  id: string;
  resource: T;
  createdAt: number;
  lastUsed: number;
  useCount: number;
  inUse: boolean;
}

export interface ResourcePoolConfig {
  maxSize?: number;
  minSize?: number;
  idleTimeout?: number; // ms avant libération ressource inutilisée
  maxAge?: number; // ms avant recyclage ressource
}

/**
 * Service de pool de ressources pour réutilisation
 * Optimise création/destruction de ressources coûteuses
 */
export class AgentResourcePool<T = unknown> {
  private storage: IStorage;
  private pool: Map<string, Resource<T>> = new Map();
  private factory: (id?: string) => Promise<T>;
  private config: Required<ResourcePoolConfig>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    storage: IStorage,
    factory: (id?: string) => Promise<T>,
    config?: ResourcePoolConfig
  ) {
    if (!storage) {
      throw new Error('Storage requis pour AgentResourcePool');
    }
    if (!factory) {
      throw new Error('Factory requis pour AgentResourcePool');
    }

    this.storage = storage;
    this.factory = factory;
    this.config = {
      maxSize: config?.maxSize || 10,
      minSize: config?.minSize || 2,
      idleTimeout: config?.idleTimeout || 5 * 60 * 1000, // 5 minutes
      maxAge: config?.maxAge || 30 * 60 * 1000 // 30 minutes
    };

    this.startCleanupInterval();
  }

  /**
   * Acquiert une ressource depuis le pool
   */
  async acquire(id?: string): Promise<T> {
    return withErrorHandling(
      async () => {
        const resourceId = id || `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 1. Chercher ressource disponible
        for (const [rid, resource] of Array.from(this.pool.entries())) {
          if (!resource.inUse && (id === undefined || rid === resourceId)) {
            resource.inUse = true;
            resource.lastUsed = Date.now();
            resource.useCount++;

            logger.debug('Ressource acquise depuis pool', {
              metadata: {
                service: 'AgentResourcePool',
                operation: 'acquire',
                resourceId: rid,
                useCount: resource.useCount
              }
            });

            return resource.resource;
          }
        }

        // 2. Créer nouvelle ressource si pool pas plein
        if (this.pool.size < this.config.maxSize) {
          const resource = await this.factory(resourceId);
          const poolResource: Resource<T> = {
            id: resourceId,
            resource,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            useCount: 1,
            inUse: true
          };

          this.pool.set(resourceId, poolResource);

          logger.debug('Nouvelle ressource créée', {
            metadata: {
              service: 'AgentResourcePool',
              operation: 'acquire',
              resourceId,
              poolSize: this.pool.size
            }
          });

          return resource;
        }

        // 3. Attendre qu'une ressource se libère
        return await this.waitForResource();
      },
      {
        operation: 'acquire',
        service: 'AgentResourcePool',
        metadata: { id }
      }
    );
  }

  /**
   * Libère une ressource dans le pool
   */
  release(id: string): void {
    const resource = this.pool.get(id);
    if (!resource) {
      logger.debug('Ressource non trouvée pour libération', {
        metadata: {
          service: 'AgentResourcePool',
          operation: 'release',
          resourceId: id
        }
      });
      return;
    }

    resource.inUse = false;
    resource.lastUsed = Date.now();

    logger.debug('Ressource libérée', {
      metadata: {
        service: 'AgentResourcePool',
        operation: 'release',
        resourceId: id,
        useCount: resource.useCount
      }
    });
  }

  /**
   * Utilise une ressource temporairement (acquire + release automatique)
   */
  async use<R>(
    callback: (resource: T) => Promise<R>,
    id?: string
  ): Promise<R> {
    const resource = await this.acquire(id);
    const resourceId = id || this.findResourceId(resource);

    try {
      return await callback(resource);
    } finally {
      if (resourceId) {
        this.release(resourceId);
      }
    }
  }

  /**
   * Statistiques du pool
   */
  getStats(): {
    total: number;
    inUse: number;
    available: number;
    averageUseCount: number;
    oldestResource: number;
    newestResource: number;
  } {
    const resources = Array.from(this.pool.values());
    const inUse = resources.filter(r => r.inUse).length;
    const available = resources.length - inUse;
    const averageUseCount = resources.length > 0
      ? resources.reduce((sum, r) => sum + r.useCount, 0) / resources.length
      : 0;
    const oldestResource = resources.length > 0
      ? Math.min(...resources.map(r => r.createdAt))
      : 0;
    const newestResource = resources.length > 0
      ? Math.max(...resources.map(r => r.createdAt))
      : 0;

    return {
      total: resources.length,
      inUse,
      available,
      averageUseCount,
      oldestResource,
      newestResource
    };
  }

  /**
   * Nettoie les ressources inutilisées
   */
  cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [id, resource] of Array.from(this.pool.entries())) {
      // Supprimer si inutilisée depuis trop longtemps
      if (!resource.inUse && (now - resource.lastUsed) > this.config.idleTimeout) {
        toRemove.push(id);
      }

      // Supprimer si trop vieille
      if ((now - resource.createdAt) > this.config.maxAge) {
        toRemove.push(id);
      }
    }

    // Garder au moins minSize ressources
    const availableCount = Array.from(this.pool.values()).filter(r => !r.inUse).length;
    const toKeep = Math.max(0, this.config.minSize - (availableCount - toRemove.length));

    if (toKeep > 0 && toRemove.length > toKeep) {
      // Garder les plus récemment utilisées
      const sorted = toRemove
        .map(id => ({ id, resource: this.pool.get(id)! }))
        .sort((a, b) => b.resource.lastUsed - a.resource.lastUsed);

      toRemove.splice(0, sorted.length - toKeep);
    }

    // Supprimer ressources
    for (const id of toRemove) {
      this.pool.delete(id);
    }

    if (toRemove.length > 0) {
      logger.info('Ressources nettoyées', {
        metadata: {
          service: 'AgentResourcePool',
          operation: 'cleanup',
          removed: toRemove.length,
          remaining: this.pool.size
        }
      });
    }
  }

  /**
   * Vide le pool
   */
  clear(): void {
    this.pool.clear();
    logger.info('Pool vidé', {
      metadata: {
        service: 'AgentResourcePool',
        operation: 'clear'
      }
    });
  }

  /**
   * Attend qu'une ressource se libère
   */
  private async waitForResource(): Promise<T> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        for (const [id, resource] of Array.from(this.pool.entries())) {
          if (!resource.inUse) {
            resource.inUse = true;
            resource.lastUsed = Date.now();
            resource.useCount++;

            clearInterval(checkInterval);

            logger.debug('Ressource acquise après attente', {
              metadata: {
                service: 'AgentResourcePool',
                operation: 'waitForResource',
                resourceId: id
              }
            });

            resolve(resource.resource);
            return;
          }
        }
      }, 100); // Vérifier toutes les 100ms

      // Timeout après 5 secondes
      setTimeout(() => {
        clearInterval(checkInterval);
        // Créer nouvelle ressource même si pool plein (dépassement temporaire)
        this.factory().then(resource => {
          const resourceId = `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          this.pool.set(resourceId, {
            id: resourceId,
            resource,
            createdAt: Date.now(),
            lastUsed: Date.now(),
            useCount: 1,
            inUse: true
          });
          resolve(resource);
        });
      }, 5000);
    });
  }

  /**
   * Trouve l'ID d'une ressource
   */
  private findResourceId(resource: T): string | undefined {
    for (const [id, poolResource] of Array.from(this.pool.entries())) {
      if (poolResource.resource === resource) {
        return id;
      }
    }
    return undefined;
  }

  /**
   * Démarre l'intervalle de nettoyage
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.idleTimeout / 2); // Nettoyer 2x plus souvent que timeout
  }

  /**
   * Arrête l'intervalle de nettoyage
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ========================================
// FACTORY POUR POOLS COMMUNS
// ========================================

/**
 * Crée un pool de ressources pour un type spécifique
 */
export function createResourcePool<T>(
  storage: IStorage,
  factory: (id?: string) => Promise<T>,
  config?: ResourcePoolConfig
): AgentResourcePool<T> {
  return new AgentResourcePool(storage, factory, config);
}

