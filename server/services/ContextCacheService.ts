import { IStorage } from "../storage-poc";
import crypto from "crypto";
import memoize from "memoizee";
import type { 
  AIContextualData, 
  ContextGenerationConfig,
  ContextGenerationResult 
} from "@shared/schema";

// ========================================
// SERVICE CACHE INTELLIGENT POUR CONTEXTE IA
// ========================================

export interface CacheEntry {
  data: AIContextualData;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  expiresAt: Date;
  dataFreshness: number;
  compressionApplied: boolean;
  size: number; // taille estimée en octets
  tags: string[]; // pour invalidation par tag
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  averageRetrievalTime: number;
  cacheSize: number; // en octets
  memoryUsage: number; // pourcentage
  expiredEntries: number;
  invalidationEvents: number;
}

export interface CacheInvalidationRule {
  entityType: string;
  triggerEvents: string[]; // 'update', 'delete', 'status_change', etc.
  relatedEntityTypes: string[]; // entités liées à invalider
  delayMinutes?: number; // délai avant invalidation
  cascadingInvalidation: boolean;
}

// ========================================
// CLASSE PRINCIPALE SERVICE CACHE CONTEXTUEL
// ========================================

export class ContextCacheService {
  private storage: IStorage;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats;
  private invalidationRules: Map<string, CacheInvalidationRule[]> = new Map();

  // Configuration cache
  private readonly MAX_CACHE_SIZE_MB = 100;
  private readonly DEFAULT_TTL_HOURS = 4;
  private readonly CLEANUP_INTERVAL_MINUTES = 30;
  private readonly MAX_ENTRIES = 1000;

  // Métriques temps réel
  private hitCount = 0;
  private missCount = 0;
  private totalRetrievalTime = 0;
  private retrievalCount = 0;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.stats = this.initializeStats();
    this.setupInvalidationRules();
    this.startPeriodicCleanup();
  }

  // ========================================
  // MÉTHODES PRINCIPALES CACHE
  // ========================================

  /**
   * Récupère un contexte depuis le cache
   */
  async getContext(
    entityType: string, 
    entityId: string, 
    config: ContextGenerationConfig
  ): Promise<AIContextualData | null> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(entityType, entityId, config);
    
    try {
      // Vérification cache mémoire d'abord
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry && this.isValidEntry(memoryEntry)) {
        await this.recordCacheHit(cacheKey, Date.now() - startTime);
        return memoryEntry.data;
      }

      // Tentative de récupération depuis stockage persistant
      const persistentEntry = await this.getFromPersistentCache(cacheKey);
      if (persistentEntry && this.isValidEntry(persistentEntry)) {
        // Restaurer en mémoire
        this.memoryCache.set(cacheKey, persistentEntry);
        await this.recordCacheHit(cacheKey, Date.now() - startTime);
        return persistentEntry.data;
      }

      // Cache miss
      await this.recordCacheMiss(cacheKey, Date.now() - startTime);
      return null;

    } catch (error) {
      console.error(`[ContextCache] Erreur récupération cache ${cacheKey}:`, error);
      await this.recordCacheMiss(cacheKey, Date.now() - startTime);
      return null;
    }
  }

  /**
   * Stocke un contexte dans le cache
   */
  async setContext(
    entityType: string,
    entityId: string,
    config: ContextGenerationConfig,
    data: AIContextualData,
    customTTL?: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(entityType, entityId, config);
    const now = new Date();
    const ttlHours = customTTL || this.getTTLForEntityType(entityType);
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const entry: CacheEntry = {
      data,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      expiresAt,
      dataFreshness: data.generationMetrics.dataFreshnessScore,
      compressionApplied: config.performance.compressionLevel !== "none",
      size: this.estimateEntrySize(data),
      tags: this.generateTags(entityType, entityId, data)
    };

    try {
      // Stockage mémoire
      this.memoryCache.set(cacheKey, entry);
      
      // Stockage persistant (asynchrone)
      this.storeToPersistentCache(cacheKey, entry).catch(error => {
        console.warn(`[ContextCache] Erreur stockage persistant ${cacheKey}:`, error);
      });

      // Nettoyage si nécessaire
      await this.enforeCacheLimits();

    } catch (error) {
      console.error(`[ContextCache] Erreur stockage cache ${cacheKey}:`, error);
    }
  }

  // ========================================
  // SYSTÈME D'INVALIDATION INTELLIGENT
  // ========================================

  /**
   * Invalide le cache lors de modifications d'entités
   */
  async invalidateOnEntityChange(
    entityType: string,
    entityId: string,
    changeType: 'update' | 'delete' | 'status_change'
  ): Promise<void> {
    const rules = this.invalidationRules.get(entityType) || [];
    
    for (const rule of rules) {
      if (rule.triggerEvents.includes(changeType)) {
        // Invalidation directe
        await this.invalidateByPattern(`${entityType}:${entityId}`);
        
        // Invalidation en cascade si activée
        if (rule.cascadingInvalidation) {
          for (const relatedType of rule.relatedEntityTypes) {
            await this.invalidateRelatedEntities(relatedType, entityId);
          }
        }

        // Invalidation différée si configurée
        if (rule.delayMinutes) {
          setTimeout(() => {
            this.invalidateByPattern(`${entityType}:${entityId}`);
          }, rule.delayMinutes * 60 * 1000);
        }
      }
    }

    this.stats.invalidationEvents++;
  }

  /**
   * Invalide les entrées correspondant à un pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    let invalidatedCount = 0;
    
    // Invalidation mémoire
    for (const [key, entry] of this.memoryCache.entries()) {
      if (key.includes(pattern) || entry.tags.some(tag => tag.includes(pattern))) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    // Invalidation persistante (asynchrone)
    this.invalidateFromPersistentCache(pattern).catch(error => {
      console.warn(`[ContextCache] Erreur invalidation persistante ${pattern}:`, error);
    });

    console.log(`[ContextCache] Invalidé ${invalidatedCount} entrées pour pattern: ${pattern}`);
    return invalidatedCount;
  }

  /**
   * Invalide tout le cache
   */
  async invalidateAll(): Promise<void> {
    this.memoryCache.clear();
    await this.clearPersistentCache();
    this.resetStats();
    console.log(`[ContextCache] Cache entièrement vidé`);
  }

  // ========================================
  // OPTIMISATIONS ET NETTOYAGE
  // ========================================

  /**
   * Nettoyage automatique des entrées expirées
   */
  async cleanupExpiredEntries(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    // Nettoyage mémoire
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt < now) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    // Nettoyage persistant
    const persistentCleaned = await this.cleanupPersistentCache();
    cleanedCount += persistentCleaned;

    this.stats.expiredEntries += cleanedCount;
    if (cleanedCount > 0) {
      console.log(`[ContextCache] Nettoyé ${cleanedCount} entrées expirées`);
    }

    return cleanedCount;
  }

  /**
   * Précharge les contextes fréquemment utilisés
   */
  async preloadFrequentContexts(): Promise<void> {
    // Analyser les patterns d'usage fréquents
    const frequentPatterns = await this.analyzeUsagePatterns();
    
    // Précharger les contextes identifiés
    for (const pattern of frequentPatterns) {
      try {
        // Logique de préchargement basée sur l'historique
        await this.preloadContextForPattern(pattern);
      } catch (error) {
        console.warn(`[ContextCache] Erreur préchargement ${pattern}:`, error);
      }
    }
  }

  // ========================================
  // MÉTRIQUES ET MONITORING
  // ========================================

  /**
   * Obtient les statistiques actuelles du cache
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const cacheSize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);

    return {
      ...this.stats,
      totalEntries: this.memoryCache.size,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      missRate: totalRequests > 0 ? this.missCount / totalRequests : 0,
      averageRetrievalTime: this.retrievalCount > 0 ? this.totalRetrievalTime / this.retrievalCount : 0,
      cacheSize,
      memoryUsage: cacheSize / (this.MAX_CACHE_SIZE_MB * 1024 * 1024)
    };
  }

  /**
   * Analyse l'efficacité du cache par type d'entité
   */
  async analyzeEfficiencyByEntityType(): Promise<Record<string, any>> {
    const analysis: Record<string, any> = {};
    
    for (const [key, entry] of this.memoryCache.entries()) {
      const entityType = key.split(':')[0];
      if (!analysis[entityType]) {
        analysis[entityType] = {
          totalEntries: 0,
          averageSize: 0,
          averageAccessCount: 0,
          totalSize: 0
        };
      }
      
      analysis[entityType].totalEntries++;
      analysis[entityType].totalSize += entry.size;
      analysis[entityType].averageAccessCount += entry.accessCount;
    }

    // Calcul des moyennes
    for (const entityType in analysis) {
      const data = analysis[entityType];
      data.averageSize = data.totalSize / data.totalEntries;
      data.averageAccessCount = data.averageAccessCount / data.totalEntries;
    }

    return analysis;
  }

  // ========================================
  // MÉTHODES PRIVÉES UTILITAIRES
  // ========================================

  private generateCacheKey(
    entityType: string, 
    entityId: string, 
    config: ContextGenerationConfig
  ): string {
    const configHash = crypto
      .createHash('md5')
      .update(JSON.stringify(config))
      .digest('hex')
      .substring(0, 8);
    
    return `${entityType}:${entityId}:${configHash}`;
  }

  private isValidEntry(entry: CacheEntry): boolean {
    const now = new Date();
    return entry.expiresAt > now && entry.dataFreshness > 0.5;
  }

  private getTTLForEntityType(entityType: string): number {
    // TTL adaptatif selon le type d'entité
    const ttlMap: Record<string, number> = {
      'ao': 2,        // AO changent moins souvent
      'offer': 1,     // Offres en cours d'évolution
      'project': 6,   // Projets plus stables
      'supplier': 12, // Fournisseurs très stables
      'team': 8,      // Équipes assez stables
      'client': 24    // Clients très stables
    };
    
    return ttlMap[entityType] || this.DEFAULT_TTL_HOURS;
  }

  private estimateEntrySize(data: AIContextualData): number {
    // Estimation grossière de la taille en mémoire
    return JSON.stringify(data).length * 2; // facteur 2 pour l'overhead JS
  }

  private generateTags(entityType: string, entityId: string, data: AIContextualData): string[] {
    const tags = [
      `entity:${entityType}`,
      `id:${entityId}`,
      `scope:${data.scope}`,
      ...data.contextTypes.map(type => `context:${type}`)
    ];

    // Tags spécialisés selon le type de contexte
    if (data.relationalContext?.mainActors.client) {
      tags.push(`client:${data.relationalContext.mainActors.client.name}`);
    }
    
    if (data.businessContext?.currentPhase) {
      tags.push(`phase:${data.businessContext.currentPhase}`);
    }

    return tags;
  }

  private setupInvalidationRules(): void {
    // Règles d'invalidation pour les projets
    this.invalidationRules.set('project', [
      {
        entityType: 'project',
        triggerEvents: ['update', 'status_change'],
        relatedEntityTypes: ['offer', 'supplier', 'team'],
        cascadingInvalidation: true
      }
    ]);

    // Règles d'invalidation pour les offres
    this.invalidationRules.set('offer', [
      {
        entityType: 'offer',
        triggerEvents: ['update', 'status_change'],
        relatedEntityTypes: ['project', 'ao', 'supplier'],
        cascadingInvalidation: true
      }
    ]);

    // Règles d'invalidation pour les AO
    this.invalidationRules.set('ao', [
      {
        entityType: 'ao',
        triggerEvents: ['update'],
        relatedEntityTypes: ['offer'],
        cascadingInvalidation: false
      }
    ]);

    // Règles d'invalidation pour les fournisseurs
    this.invalidationRules.set('supplier', [
      {
        entityType: 'supplier',
        triggerEvents: ['update', 'status_change'],
        relatedEntityTypes: ['offer', 'project'],
        cascadingInvalidation: true,
        delayMinutes: 5 // Délai pour éviter invalidations trop fréquentes
      }
    ]);
  }

  private startPeriodicCleanup(): void {
    setInterval(async () => {
      await this.cleanupExpiredEntries();
      await this.enforeCacheLimits();
    }, this.CLEANUP_INTERVAL_MINUTES * 60 * 1000);
  }

  private async enforeCacheLimits(): Promise<void> {
    // Limite par nombre d'entrées
    if (this.memoryCache.size > this.MAX_ENTRIES) {
      await this.evictLeastRecentlyUsed(this.memoryCache.size - this.MAX_ENTRIES);
    }

    // Limite par taille mémoire
    const currentSize = Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
    
    const maxSizeBytes = this.MAX_CACHE_SIZE_MB * 1024 * 1024;
    if (currentSize > maxSizeBytes) {
      await this.evictLargestEntries(currentSize - maxSizeBytes);
    }
  }

  private async evictLeastRecentlyUsed(count: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime());
    
    for (let i = 0; i < count && i < entries.length; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  private async evictLargestEntries(bytesToFree: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => b.size - a.size);
    
    let freedBytes = 0;
    for (const [key, entry] of entries) {
      if (freedBytes >= bytesToFree) break;
      this.memoryCache.delete(key);
      freedBytes += entry.size;
    }
  }

  private async recordCacheHit(key: string, retrievalTime: number): Promise<void> {
    this.hitCount++;
    this.totalRetrievalTime += retrievalTime;
    this.retrievalCount++;
    
    // Mettre à jour l'entrée
    const entry = this.memoryCache.get(key);
    if (entry) {
      entry.lastAccessedAt = new Date();
      entry.accessCount++;
    }
  }

  private async recordCacheMiss(key: string, retrievalTime: number): Promise<void> {
    this.missCount++;
    this.totalRetrievalTime += retrievalTime;
    this.retrievalCount++;
  }

  private initializeStats(): CacheStats {
    return {
      totalEntries: 0,
      hitRate: 0,
      missRate: 0,
      averageRetrievalTime: 0,
      cacheSize: 0,
      memoryUsage: 0,
      expiredEntries: 0,
      invalidationEvents: 0
    };
  }

  private resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.totalRetrievalTime = 0;
    this.retrievalCount = 0;
    this.stats = this.initializeStats();
  }

  // Méthodes persistantes (à implémenter selon le besoin)
  private async getFromPersistentCache(key: string): Promise<CacheEntry | null> {
    // Implémentation future avec Redis/DB si nécessaire
    return null;
  }

  private async storeToPersistentCache(key: string, entry: CacheEntry): Promise<void> {
    // Implémentation future avec Redis/DB si nécessaire
  }

  private async invalidateFromPersistentCache(pattern: string): Promise<void> {
    // Implémentation future avec Redis/DB si nécessaire
  }

  private async clearPersistentCache(): Promise<void> {
    // Implémentation future avec Redis/DB si nécessaire
  }

  private async cleanupPersistentCache(): Promise<number> {
    // Implémentation future avec Redis/DB si nécessaire
    return 0;
  }

  private async analyzeUsagePatterns(): Promise<string[]> {
    // Analyse basique des patterns fréquents
    const patterns: Record<string, number> = {};
    
    for (const [key] of this.memoryCache.entries()) {
      const entityType = key.split(':')[0];
      patterns[entityType] = (patterns[entityType] || 0) + 1;
    }

    // Retourner les patterns les plus fréquents
    return Object.entries(patterns)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);
  }

  private async preloadContextForPattern(pattern: string): Promise<void> {
    // Logique de préchargement future
    console.log(`[ContextCache] Préchargement pattern: ${pattern}`);
  }

  private async invalidateRelatedEntities(entityType: string, entityId: string): Promise<void> {
    // Logique d'invalidation des entités liées
    await this.invalidateByPattern(`${entityType}:`);
    console.log(`[ContextCache] Invalidation cascade pour ${entityType} liée à ${entityId}`);
  }
}

// ========================================
// INSTANCE SINGLETON GLOBALE
// ========================================

let globalContextCacheService: ContextCacheService | null = null;

export function getContextCacheService(storage: IStorage): ContextCacheService {
  if (!globalContextCacheService) {
    globalContextCacheService = new ContextCacheService(storage);
  }
  return globalContextCacheService;
}

export default ContextCacheService;