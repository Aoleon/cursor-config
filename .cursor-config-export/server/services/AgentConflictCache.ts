import { logger } from '../utils/logger';
import type { Conflict } from './AgentConflictResolver';

// ========================================
// CACHE INTELLIGENT POUR DÉTECTION CONFLITS
// ========================================
// Évite de re-détecter les mêmes conflits
// Optimise les performances de détection
// ========================================

interface CachedConflictResult {
  conflicts: Conflict[];
  timestamp: number;
  fileHashes: Map<string, string>;
  ttl: number;
}

/**
 * Cache intelligent pour résultats de détection de conflits
 * Évite re-détection inutile des mêmes conflits
 */
export class AgentConflictCache {
  private cache: Map<string, CachedConflictResult> = new Map();
  private readonly DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes
  private readonly MAX_CACHE_SIZE = 1000;

  /**
   * Génère une clé de cache basée sur les fichiers
   */
  private generateCacheKey(files: string[]): string {
    const sortedFiles = [...files].sort().join('|');
    return `conflicts:${sortedFiles}`;
  }

  /**
   * Calcule un hash simple pour un fichier (basé sur timestamp de modification)
   */
  private async getFileHash(filePath: string): Promise<string> {
    // Pour l'instant, utiliser le chemin comme hash
    // Dans une implémentation réelle, utiliser le hash du contenu ou timestamp
    return filePath;
  }

  /**
   * Vérifie si le cache est valide pour les fichiers donnés
   */
  private async isCacheValid(
    cacheKey: string,
    files: string[]
  ): Promise<boolean> {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return false;
    }

    // Vérifier TTL
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(cacheKey);
      return false;
    }

    // Vérifier que les fichiers n'ont pas changé
    const currentHashes = new Map<string, string>();
    for (const file of files) {
      currentHashes.set(file, await this.getFileHash(file));
    }

    // Comparer les hashes
    for (const [file, currentHash] of Array.from(currentHashes.entries())) {
      const cachedHash = cached.fileHashes.get(file);
      if (cachedHash !== currentHash) {
        // Fichier modifié, cache invalide
        this.cache.delete(cacheKey);
        return false;
      }
    }

    return true;
  }

  /**
   * Récupère les conflits depuis le cache
   */
  async getCachedConflicts(files: string[]): Promise<Conflict[] | null> {
    const cacheKey = this.generateCacheKey(files);
    const isValid = await this.isCacheValid(cacheKey, files);

    if (isValid) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit pour détection conflits', {
          metadata: {
            service: 'AgentConflictCache',
            operation: 'getCachedConflicts',
            filesCount: files.length,
            conflictsCount: cached.conflicts.length
          }
        });
        return cached.conflicts;
      }
    }

    return null;
  }

  /**
   * Met en cache les résultats de détection de conflits
   */
  async cacheConflicts(
    files: string[],
    conflicts: Conflict[],
    ttl?: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(files);

    // Nettoyer si cache trop grand
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    // Calculer hashes des fichiers
    const fileHashes = new Map<string, string>();
    for (const file of files) {
      fileHashes.set(file, await this.getFileHash(file));
    }

    this.cache.set(cacheKey, {
      conflicts,
      timestamp: Date.now(),
      fileHashes,
      ttl: ttl || this.DEFAULT_TTL_MS
    });

    logger.debug('Conflits mis en cache', {
      metadata: {
        service: 'AgentConflictCache',
        operation: 'cacheConflicts',
        filesCount: files.length,
        conflictsCount: conflicts.length,
        cacheSize: this.cache.size
      }
    });
  }

  /**
   * Invalide le cache pour des fichiers spécifiques
   */
  invalidateForFiles(files: string[]): void {
    let invalidated = 0;

    for (const file of files) {
      for (const [key, cached] of Array.from(this.cache.entries())) {
        if (cached.fileHashes.has(file)) {
          this.cache.delete(key);
          invalidated++;
        }
      }
    }

    if (invalidated > 0) {
      logger.debug('Cache invalidé pour fichiers', {
        metadata: {
          service: 'AgentConflictCache',
          operation: 'invalidateForFiles',
          filesCount: files.length,
          invalidatedCount: invalidated
        }
      });
    }
  }

  /**
   * Nettoie les entrées expirées
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of Array.from(this.cache.entries())) {
      if (now > cached.timestamp + cached.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache nettoyé', {
        metadata: {
          service: 'AgentConflictCache',
          operation: 'cleanup',
          cleanedCount: cleaned,
          remainingSize: this.cache.size
        }
      });
    }

    return cleaned;
  }

  /**
   * Supprime les entrées les plus anciennes
   */
  private evictOldest(): void {
    if (this.cache.size === 0) {
      return;
    }

    // Trouver l'entrée la plus ancienne
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, cached] of Array.from(this.cache.entries())) {
      if (cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Entrée cache évincée', {
        metadata: {
          service: 'AgentConflictCache',
          operation: 'evictOldest',
          evictedKey: oldestKey
        }
      });
    }
  }

  /**
   * Vide complètement le cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache conflits vidé', {
      metadata: {
        service: 'AgentConflictCache',
        operation: 'clear',
        previousSize: size
      }
    });
  }

  /**
   * Récupère les statistiques du cache
   */
  getStats(): {
    size: number;
    maxSize: number;
    utilization: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      utilization: (this.cache.size / this.MAX_CACHE_SIZE) * 100
    };
  }
}

// ========================================
// SINGLETON
// ========================================

let conflictCacheInstance: AgentConflictCache | null = null;

export function getAgentConflictCache(): AgentConflictCache {
  if (!conflictCacheInstance) {
    conflictCacheInstance = new AgentConflictCache();
    // Nettoyer toutes les 5 minutes
    setInterval(() => {
      conflictCacheInstance?.cleanup();
    }, 5 * 60 * 1000);
  }
  return conflictCacheInstance;
}

