import { logger } from '../utils/logger';
import { getCacheService, TTL_CONFIG } from './CacheService';
import crypto from 'crypto';
import { withErrorHandling } from '../utils/error-handler';
import { getAgentParameterTuner } from './AgentParameterTuner';
import { getAgentLearningService } from './AgentLearningService';
import type { IStorage } from '../storage-poc';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface CodebaseSearchResult {
  path: string;
  startLine: number;
  endLine: number;
  explanation: string;
}

export interface GrepResult {
  file: string;
  line: number;
  content: string;
}

export interface CachedSearchEntry {
  result: CodebaseSearchResult[] | GrepResult[];
  timestamp: number;
  query: string;
  targetDirectories?: string[];
  pattern?: string;
  path?: string;
  affectedFiles?: string[];
  invalidationRules?: InvalidationRule[];
}

export interface InvalidationRule {
  type: 'file' | 'directory' | 'pattern';
  value: string;
}

export interface SearchCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSearches: number;
  cacheSize: number;
}

// ========================================
// AGENT SEARCH CACHE SERVICE
// ========================================

/**
 * Service de cache intelligent pour les recherches codebase (codebase_search et grep)
 * Optimise les performances en évitant les recherches redondantes
 */
export class AgentSearchCacheService {
  private cacheService = getCacheService();
  private hits: number = 0;
  private misses: number = 0;
  private readonly CACHE_PREFIX = 'agent:search:';
  private similarityThreshold: number = 0.8; // Dynamique via ParameterTuner
  private storage?: IStorage;
  private parameterTuner?: ReturnType<typeof getAgentParameterTuner>;
  private learningService?: ReturnType<typeof getAgentLearningService>;

  /**
   * Initialise les services d'optimisation (optionnel)
   */
  initializeOptimizationServices(storage: IStorage): void {
    this.storage = storage;
    this.parameterTuner = getAgentParameterTuner(storage);
    this.learningService = getAgentLearningService();
    this.updateParametersFromTuner();
  }

  /**
   * Met à jour les paramètres depuis ParameterTuner
   */
  private updateParametersFromTuner(): void {
    if (this.parameterTuner) {
      const params = this.parameterTuner.getCurrentParameters();
      this.similarityThreshold = params.similarityThresholds.searchCache;
    }
  }

  /**
   * Récupère le TTL dynamique pour codebase_search
   */
  private getCodebaseSearchTTL(): number {
    if (this.parameterTuner) {
      const params = this.parameterTuner.getCurrentParameters();
      return params.ttl.codebaseSearch;
    }
    return TTL_CONFIG.AGENT_CODEBASE_SEARCH;
  }

  /**
   * Récupère le TTL dynamique pour grep
   */
  private getGrepTTL(): number {
    if (this.parameterTuner) {
      const params = this.parameterTuner.getCurrentParameters();
      return params.ttl.grep;
    }
    return TTL_CONFIG.AGENT_GREP;
  }

  /**
   * Génère une clé de cache pour une recherche codebase_search
   */
  private generateCodebaseSearchKey(
    query: string,
    targetDirectories: string[]
  ): string {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedDirs = targetDirectories
      .map(d => d.toLowerCase().trim())
      .sort()
      .join(',');
    
    const hash = crypto
      .createHash('md5')
      .update(`${normalizedQuery}:${normalizedDirs}`)
      .digest('hex');
    
    return `${this.CACHE_PREFIX}codebase:${hash}`;
  }

  /**
   * Génère une clé de cache pour une recherche grep
   */
  private generateGrepKey(pattern: string, path: string): string {
    const normalizedPattern = pattern.toLowerCase().trim();
    const normalizedPath = path.toLowerCase().trim();
    
    const hash = crypto
      .createHash('md5')
      .update(`${normalizedPattern}:${normalizedPath}`)
      .digest('hex');
    
    return `${this.CACHE_PREFIX}grep:${hash}`;
  }

  /**
   * Calcule la similarité entre deux requêtes (simple Jaccard)
   */
  private calculateQuerySimilarity(query1: string, query2: string): number {
    const words1 = new Set(query1.toLowerCase().split(/\s+/));
    const words2 = new Set(query2.toLowerCase().split(/\s+/));
    
    const words1Array = Array.from(words1);
    const words2Array = Array.from(words2);
    
    const intersection = new Set(words1Array.filter(x => words2.has(x)));
    const union = new Set([...words1Array, ...words2Array]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Recherche codebase_search avec cache intelligent
   */
  async cachedCodebaseSearch(
    query: string,
    targetDirectories: string[] = [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    codebaseSearchFn: (query: string, targetDirectories: string[]) => Promise<any>
  ): Promise<CodebaseSearchResult[]> {
    return withErrorHandling(
      async () => {
        // 1. Générer clé de cache
        const cacheKey = this.generateCodebaseSearchKey(query, targetDirectories);
        
        // 2. Vérifier cache
        const cached = await this.cacheService.get<CachedSearchEntry>(cacheKey);
        if (cached && !this.isCacheExpired(cached)) {
          this.hits++;
          logger.info('Cache hit pour codebase_search', {
            metadata: {
              service: 'AgentSearchCacheService',
              operation: 'cachedCodebaseSearch',
              query: query.substring(0, 100),
              cacheKey,
              resultCount: cached.result.length
            }
          });
          return cached.result as CodebaseSearchResult[];
        }
        
        // 3. Chercher recherches similaires si cache miss
        // Mettre à jour seuil depuis ParameterTuner
        this.updateParametersFromTuner();
        
        const similarResult = await this.findSimilarCodebaseSearch(
          query,
          targetDirectories
        );
        if (similarResult) {
          this.hits++;
          logger.info('Réutilisation recherche similaire', {
            metadata: {
              service: 'AgentSearchCacheService',
              operation: 'cachedCodebaseSearch',
              query: query.substring(0, 100),
              similarity: similarResult.similarity,
              originalQuery: similarResult.originalQuery.substring(0, 100)
            }
          });
          
          // Mettre en cache l'adaptation
          await this.cacheService.set(
            cacheKey,
            {
              result: similarResult.result,
              timestamp: Date.now(),
              query,
              targetDirectories,
              invalidationRules: this.generateInvalidationRules(targetDirectories)
            },
            this.getCodebaseSearchTTL()
          );
          
          return similarResult.result;
        }
        
        // 4. Effectuer nouvelle recherche
        this.misses++;
        logger.debug('Cache miss, exécution recherche codebase_search', {
          metadata: {
            service: 'AgentSearchCacheService',
            operation: 'cachedCodebaseSearch',
            query: query.substring(0, 100),
            targetDirectories
          }
        });
        
        const result = await codebaseSearchFn(query, targetDirectories);
        
        // 5. Mettre en cache résultat
        await this.cacheService.set(
          cacheKey,
          {
            result,
            timestamp: Date.now(),
            query,
            targetDirectories,
            invalidationRules: this.generateInvalidationRules(targetDirectories)
          },
          this.getCodebaseSearchTTL()
        );
        
        return result;
      },
      {
        operation: 'cachedCodebaseSearch',
        service: 'AgentSearchCacheService',
        metadata: { query: query.substring(0, 100) }
      }
    );
  }

  /**
   * Recherche grep avec cache intelligent
   */
  async cachedGrep(
    pattern: string,
    path: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grepFn: (pattern: string, path: string) => Promise<any>
  ): Promise<GrepResult[]> {
    return withErrorHandling(
      async () => {
        // 1. Générer clé de cache
        const cacheKey = this.generateGrepKey(pattern, path);
        
        // 2. Vérifier cache
        const cached = await this.cacheService.get<CachedSearchEntry>(cacheKey);
        if (cached && !this.isCacheExpired(cached)) {
          // Vérifier si fichiers affectés ont été modifiés
          if (!cached.affectedFiles || cached.affectedFiles.length === 0) {
            this.hits++;
            logger.info('Cache hit pour grep', {
              metadata: {
                service: 'AgentSearchCacheService',
                operation: 'cachedGrep',
                pattern: pattern.substring(0, 50),
                path,
                cacheKey,
                resultCount: cached.result.length
              }
            });
            return cached.result as GrepResult[];
          }
        }
        
        // 3. Effectuer nouvelle recherche
        this.misses++;
        logger.debug('Cache miss, exécution recherche grep', {
          metadata: {
            service: 'AgentSearchCacheService',
            operation: 'cachedGrep',
            pattern: pattern.substring(0, 50),
            path
          }
        });
        
        const result = await grepFn(pattern, path);
        
        // 4. Identifier fichiers affectés (simplifié - utiliser path comme indicateur)
        const affectedFiles = [path];
        
        // 5. Mettre en cache résultat
        await this.cacheService.set(
          cacheKey,
          {
            result,
            timestamp: Date.now(),
            pattern,
            path,
            affectedFiles,
            invalidationRules: this.generateFileInvalidationRules(affectedFiles)
          },
          this.getGrepTTL()
        );
        
        return result;
      },
      {
        operation: 'cachedGrep',
        service: 'AgentSearchCacheService',
        metadata: { pattern: pattern.substring(0, 50), path }
      }
    );
  }

  /**
   * Trouve une recherche codebase_search similaire dans le cache
   */
  private async findSimilarCodebaseSearch(
    query: string,
    targetDirectories: string[]
  ): Promise<{ result: CodebaseSearchResult[]; similarity: number; originalQuery: string } | null> {
    try {
      // Récupérer toutes les clés de cache codebase_search
      const allKeys = await this.cacheService.getStats();
      const codebaseKeys = allKeys.keys.filter(key => 
        key.startsWith(`${this.CACHE_PREFIX}codebase:`)
      );
      
      let bestMatch: {
        result: CodebaseSearchResult[];
        similarity: number;
        originalQuery: string;
        key: string;
      } | null = null;
      
      // Parcourir les entrées du cache pour trouver la meilleure similarité
      for (const key of codebaseKeys) {
        const cached = await this.cacheService.get<CachedSearchEntry>(key);
        if (!cached || this.isCacheExpired(cached)) continue;
        
        // Vérifier que les répertoires cibles sont compatibles
        const dirsMatch = targetDirectories.length === 0 || 
          (cached.targetDirectories && 
           targetDirectories.some(td => 
             cached.targetDirectories!.some(cd => 
               td.includes(cd) || cd.includes(td)
             )
           ));
        
        if (!dirsMatch) continue;
        
        const similarity = this.calculateQuerySimilarity(query, cached.query);
        
        if (similarity >= this.similarityThreshold) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = {
              result: cached.result as CodebaseSearchResult[],
              similarity,
              originalQuery: cached.query,
              key
            };
          }
        }
      }
      
      return bestMatch ? {
        result: bestMatch.result,
        similarity: bestMatch.similarity,
        originalQuery: bestMatch.originalQuery
      } : null;
    } catch (error) {
      logger.warn('Erreur lors de la recherche de recherches similaires', {
        metadata: {
          service: 'AgentSearchCacheService',
          operation: 'findSimilarCodebaseSearch',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return null;
    }
  }

  /**
   * Vérifie si une entrée de cache est expirée
   */
  private isCacheExpired(entry: CachedSearchEntry): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    // TTL dynamique: utiliser ParameterTuner si disponible
    const maxAge = entry.pattern ? 
      this.getGrepTTL() * 1000 : 
      this.getCodebaseSearchTTL() * 1000;
    
    return age > maxAge;
  }

  /**
   * Génère des règles d'invalidation basées sur les répertoires cibles
   */
  private generateInvalidationRules(
    targetDirectories: string[]
  ): InvalidationRule[] {
    return targetDirectories.map(dir => ({
      type: 'directory',
      value: dir
    }));
  }

  /**
   * Génère des règles d'invalidation basées sur les fichiers affectés
   */
  private generateFileInvalidationRules(
    affectedFiles: string[]
  ): InvalidationRule[] {
    return affectedFiles.map(file => ({
      type: 'file',
      value: file
    }));
  }

  /**
   * Invalide le cache pour des fichiers modifiés
   */
  async invalidateForFiles(files: string[]): Promise<number> {
    return withErrorHandling(
      async () => {
        const stats = await this.cacheService.getStats();
        let invalidatedCount = 0;
        
        for (const key of stats.keys) {
          if (!key.startsWith(this.CACHE_PREFIX)) continue;
          
          const cached = await this.cacheService.get<CachedSearchEntry>(key);
          if (!cached) continue;
          
          // Vérifier si les fichiers modifiés correspondent aux règles d'invalidation
          const shouldInvalidate = files.some(file => {
            if (cached.invalidationRules) {
              return cached.invalidationRules.some(rule => {
                if (rule.type === 'file') {
                  return file === rule.value;
                }
                if (rule.type === 'directory') {
                  return file.startsWith(rule.value);
                }
                if (rule.type === 'pattern') {
                  const regex = new RegExp(rule.value);
                  return regex.test(file);
                }
                return false;
              });
            }
            return false;
          });
          
          if (shouldInvalidate) {
            await this.cacheService.invalidate(key);
            invalidatedCount++;
          }
        }
        
        logger.info('Cache invalidé pour fichiers modifiés', {
          metadata: {
            service: 'AgentSearchCacheService',
            operation: 'invalidateForFiles',
            filesCount: files.length,
            invalidatedCount
          }
        });
        
        return invalidatedCount;
      },
      {
        operation: 'invalidateForFiles',
        service: 'AgentSearchCacheService',
        metadata: { filesCount: files.length }
      }
    );
  }

  /**
   * Invalide le cache pour un répertoire
   */
  async invalidateForDirectory(directory: string): Promise<number> {
    return withErrorHandling(
      async () => {
        const pattern = `${this.CACHE_PREFIX}*`;
        const stats = await this.cacheService.getStats();
        let invalidatedCount = 0;
        
        for (const key of stats.keys) {
          if (!key.startsWith(this.CACHE_PREFIX)) continue;
          
          const cached = await this.cacheService.get<CachedSearchEntry>(key);
          if (!cached) continue;
          
          // Vérifier si le répertoire correspond
          const shouldInvalidate = cached.targetDirectories?.some(td => 
            td.includes(directory) || directory.includes(td)
          ) || cached.invalidationRules?.some(rule => 
            rule.type === 'directory' && 
            (rule.value.includes(directory) || directory.includes(rule.value))
          );
          
          if (shouldInvalidate) {
            await this.cacheService.invalidate(key);
            invalidatedCount++;
          }
        }
        
        logger.info('Cache invalidé pour répertoire', {
          metadata: {
            service: 'AgentSearchCacheService',
            operation: 'invalidateForDirectory',
            directory,
            invalidatedCount
          }
        });
        
        return invalidatedCount;
      },
      {
        operation: 'invalidateForDirectory',
        service: 'AgentSearchCacheService',
        metadata: { directory }
      }
    );
  }

  /**
   * Récupère les statistiques du cache
   */
  async getStats(): Promise<SearchCacheStats> {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    const cacheStats = await this.cacheService.getStats();
    const cacheSize = cacheStats.keys.filter(key => 
      key.startsWith(this.CACHE_PREFIX)
    ).length;
    
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: parseFloat(hitRate.toFixed(2)),
      totalSearches: total,
      cacheSize
    };
  }

  /**
   * Vide le cache des recherches
   */
  async flush(): Promise<void> {
    return withErrorHandling(
      async () => {
        const stats = await this.cacheService.getStats();
        const searchKeys = stats.keys.filter(key => 
          key.startsWith(this.CACHE_PREFIX)
        );
        
        for (const key of searchKeys) {
          await this.cacheService.invalidate(key);
        }
        
        this.hits = 0;
        this.misses = 0;
        
        logger.info('Cache recherches vidé', {
          metadata: {
            service: 'AgentSearchCacheService',
            operation: 'flush',
            invalidatedCount: searchKeys.length
          }
        });
      },
      {
        operation: 'flush',
        service: 'AgentSearchCacheService',
        metadata: {}
      }
    );
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================

let agentSearchCacheServiceInstance: AgentSearchCacheService | null = null;

export function getAgentSearchCacheService(): AgentSearchCacheService {
  if (!agentSearchCacheServiceInstance) {
    agentSearchCacheServiceInstance = new AgentSearchCacheService();
  }
  return agentSearchCacheServiceInstance;
}

