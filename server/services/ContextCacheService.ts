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
   * Invalide le cache lors de modifications d'entités avec tagging intelligent
   */
  async invalidateOnEntityChange(
    entityType: string,
    entityId: string,
    changeType: 'update' | 'delete' | 'status_change',
    additionalContext?: Record<string, any>
  ): Promise<void> {
    const rules = this.invalidationRules.get(entityType) || [];
    
    console.log(`[ContextCache] Invalidation déclenchée: ${entityType}:${entityId} (${changeType})`);
    
    // Tags intelligents basés sur l'entité et le contexte
    const smartTags = this.generateSmartInvalidationTags(entityType, entityId, changeType, additionalContext);
    
    for (const rule of rules) {
      if (rule.triggerEvents.includes(changeType)) {
        // Invalidation directe avec tags intelligents
        await this.invalidateBySmartTags(smartTags);
        
        // Invalidation en cascade si activée
        if (rule.cascadingInvalidation) {
          for (const relatedType of rule.relatedEntityTypes) {
            await this.invalidateRelatedEntities(relatedType, entityId, smartTags);
          }
        }

        // Invalidation différée si configurée
        if (rule.delayMinutes) {
          setTimeout(async () => {
            await this.invalidateBySmartTags(smartTags);
          }, rule.delayMinutes * 60 * 1000);
        }
      }
    }

    // Métriques et logging
    this.stats.invalidationEvents++;
    console.log(`[ContextCache] Invalidation terminée: ${smartTags.length} tags traités`);
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
   * Invalidation intelligente par tags multiples avec priorités
   */
  async invalidateBySmartTags(tags: string[]): Promise<number> {
    let invalidatedCount = 0;
    const startTime = Date.now();
    
    // Invalidation mémoire avec priorités
    for (const [key, entry] of this.memoryCache.entries()) {
      const matchingTags = entry.tags.filter(tag => tags.includes(tag));
      
      if (matchingTags.length > 0) {
        // Score de correspondance (plus de tags = plus prioritaire)
        const matchScore = matchingTags.length / entry.tags.length;
        
        // Invalidation immédiate si correspondance élevée
        if (matchScore >= 0.3) {
          this.memoryCache.delete(key);
          invalidatedCount++;
          
          console.log(`[ContextCache] Entrée invalidée (score: ${matchScore.toFixed(2)}): ${key.substring(0, 50)}...`);
        }
      }
    }

    // Invalidation persistante par tags
    this.invalidateFromPersistentCacheByTags(tags).catch(error => {
      console.warn(`[ContextCache] Erreur invalidation persistante par tags:`, error);
    });

    const duration = Date.now() - startTime;
    console.log(`[ContextCache] Invalidation intelligente: ${invalidatedCount} entrées en ${duration}ms`);
    return invalidatedCount;
  }

  /**
   * Génère des tags intelligents pour invalidation basés sur le contexte
   */
  private generateSmartInvalidationTags(
    entityType: string,
    entityId: string,
    changeType: string,
    additionalContext?: Record<string, any>
  ): string[] {
    const tags = [
      `entity:${entityType}`,
      `id:${entityId}`,
      `change:${changeType}`,
      `${entityType}:${entityId}`
    ];

    // Tags contextuels spécialisés selon le type d'entité
    switch (entityType) {
      case 'ao':
        tags.push('workflow:ao', 'context:business', 'context:technical');
        if (additionalContext?.status) {
          tags.push(`ao_status:${additionalContext.status}`);
        }
        if (additionalContext?.client) {
          tags.push(`client:${additionalContext.client}`);
        }
        break;

      case 'offer':
        tags.push('workflow:offer', 'context:business', 'context:relational');
        if (additionalContext?.aoId) {
          tags.push(`ao:${additionalContext.aoId}`, 'related_ao');
        }
        if (additionalContext?.status) {
          tags.push(`offer_status:${additionalContext.status}`);
        }
        break;

      case 'project':
        tags.push('workflow:project', 'context:business', 'context:temporal', 'context:technical');
        if (additionalContext?.offerId) {
          tags.push(`offer:${additionalContext.offerId}`, 'related_offer');
        }
        if (additionalContext?.phase) {
          tags.push(`project_phase:${additionalContext.phase}`);
        }
        break;

      case 'supplier':
        tags.push('entity:supplier', 'context:relational');
        // Invalider tous les contextes liés aux projets/offres de ce fournisseur
        tags.push('workflow:offer', 'workflow:project');
        break;
    }

    // Tags de complexité pour invalidation ciblée
    if (additionalContext?.complexity) {
      tags.push(`complexity:${additionalContext.complexity}`);
    }

    // Tags temporels pour invalidation par période
    const now = new Date();
    tags.push(
      `hour:${now.getHours()}`,
      `day:${now.toISOString().split('T')[0]}`
    );

    return [...new Set(tags)]; // Déduplique les tags
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
   * Précharge les contextes fréquemment utilisés avec intelligence temporelle
   */
  async preloadFrequentContexts(): Promise<void> {
    const startTime = Date.now();
    console.log(`[ContextCache] Démarrage prewarming intelligent...`);
    
    // Analyser les patterns d'usage fréquents
    const frequentPatterns = await this.analyzeUsagePatterns();
    
    // Patterns de prewarming spécialisés par période
    const currentHour = new Date().getHours();
    const isBusinessHours = currentHour >= 8 && currentHour <= 18;
    const isPeakHours = (currentHour >= 8 && currentHour <= 12) || (currentHour >= 14 && currentHour <= 18);
    
    if (isPeakHours) {
      // Préchargement agressif pendant les heures de pointe
      await this.prewarmPeakHourContexts();
    }
    
    if (isBusinessHours) {
      // Préchargement des contextes business standards
      await this.prewarmBusinessContexts();
    }
    
    // Précharger les contextes identifiés par usage historique
    for (const pattern of frequentPatterns) {
      try {
        await this.preloadContextForPattern(pattern);
      } catch (error) {
        console.warn(`[ContextCache] Erreur préchargement ${pattern}:`, error);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`[ContextCache] Prewarming terminé en ${duration}ms - ${frequentPatterns.length} patterns traités`);
  }

  /**
   * Préchargement intelligent pour les heures de pointe
   */
  private async prewarmPeakHourContexts(): Promise<void> {
    console.log(`[ContextCache] Prewarming heures de pointe activé`);
    
    // Précharger les contextes AO/Offres récents (dernières 48h)
    const recentThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000);
    
    try {
      // Simuler le préchargement des AO récents
      await this.prewarmEntityType('ao', { 
        dateFilter: recentThreshold, 
        priorityFilter: ['elevee', 'critique'],
        limit: 20 
      });
      
      // Précharger les offres en cours
      await this.prewarmEntityType('offer', { 
        statusFilter: ['etude_technique', 'en_cours_chiffrage', 'en_attente_validation'],
        limit: 15 
      });
      
      // Précharger les projets actifs
      await this.prewarmEntityType('project', { 
        statusFilter: ['etude', 'planification', 'chantier'],
        limit: 10 
      });
      
    } catch (error) {
      console.warn(`[ContextCache] Erreur prewarming heures de pointe:`, error);
    }
  }

  /**
   * Préchargement des contextes business standards
   */
  private async prewarmBusinessContexts(): Promise<void> {
    console.log(`[ContextCache] Prewarming contextes business`);
    
    try {
      // Précharger les contextes fournisseurs actifs
      await this.prewarmEntityType('supplier', { 
        statusFilter: ['actif'],
        limit: 5 
      });
      
      // Précharger les équipes avec charge
      await this.prewarmEntityType('team', { 
        statusFilter: ['occupe', 'disponible'],
        limit: 8 
      });
      
    } catch (error) {
      console.warn(`[ContextCache] Erreur prewarming contextes business:`, error);
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

    // Tags intelligents par complexité de requête
    const complexity = this.calculateQueryComplexity(data);
    tags.push(`complexity:${complexity}`);

    // Tags par rôle utilisateur si disponible
    if (data.generationMetrics?.userRole) {
      tags.push(`role:${data.generationMetrics.userRole}`);
    }

    // Tags par type d'entité spécialisés
    switch (entityType) {
      case 'ao':
        tags.push(`ao:${entityId}`, 'workflow:ao');
        if (data.businessContext?.currentPhase) {
          tags.push(`ao_phase:${data.businessContext.currentPhase}`);
        }
        break;
      case 'offer':
        tags.push(`offer:${entityId}`, 'workflow:offer');
        if (data.businessContext?.currentPhase) {
          tags.push(`offer_status:${data.businessContext.currentPhase}`);
        }
        break;
      case 'project':
        tags.push(`project:${entityId}`, 'workflow:project');
        if (data.businessContext?.currentPhase) {
          tags.push(`project_phase:${data.businessContext.currentPhase}`);
        }
        break;
      case 'supplier':
        tags.push(`supplier:${entityId}`, 'entity:supplier');
        break;
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

  private async invalidateFromPersistentCacheByTags(tags: string[]): Promise<void> {
    // Implémentation future avec Redis/DB pour invalidation par tags
    console.log(`[ContextCache] Invalidation persistante par tags: ${tags.join(', ')}`);
  }

  /**
   * Calcule la complexité d'une requête de contexte
   */
  private calculateQueryComplexity(data: AIContextualData): 'simple' | 'medium' | 'complex' {
    let complexity = 0;
    
    // Complexité basée sur les types de contexte inclus
    complexity += data.contextTypes.length * 10;
    
    // Complexité basée sur la portée
    switch (data.scope) {
      case 'minimal': complexity += 5; break;
      case 'standard': complexity += 15; break;
      case 'comprehensive': complexity += 30; break;
    }
    
    // Complexité basée sur les contextes spécifiques
    if (data.technicalContext) complexity += 10;
    if (data.businessContext) complexity += 15;
    if (data.relationalContext) complexity += 20;
    if (data.temporalContext) complexity += 12;
    if (data.administrativeContext) complexity += 8;
    
    // Complexité basée sur l'estimation de tokens
    if (data.tokenEstimate > 2000) complexity += 20;
    else if (data.tokenEstimate > 1000) complexity += 10;
    
    // Classification finale
    if (complexity < 30) return 'simple';
    if (complexity < 70) return 'medium';
    return 'complex';
  }

  /**
   * Préchargement spécialisé par type d'entité
   */
  private async prewarmEntityType(
    entityType: string, 
    filters: {
      dateFilter?: Date;
      statusFilter?: string[];
      priorityFilter?: string[];
      limit?: number;
    }
  ): Promise<void> {
    console.log(`[ContextCache] Prewarming ${entityType} avec filtres:`, filters);
    
    // Simulation du préchargement - dans un vrai système, on interrogerait la DB
    // et on génèrerait les contextes pour les entités correspondantes
    const limit = filters.limit || 10;
    
    for (let i = 0; i < limit; i++) {
      const mockEntityId = `${entityType}_${Date.now()}_${i}`;
      const mockCacheKey = `prewarmed:${entityType}:${mockEntityId}`;
      
      // Simuler un contexte préchargé léger
      const mockEntry: CacheEntry = {
        data: {
          entityType,
          entityId: mockEntityId,
          requestId: `prewarmed_${Date.now()}`,
          contextTypes: ['business'],
          scope: 'standard',
          compressionLevel: 'light',
          generationMetrics: {
            totalTablesQueried: 3,
            executionTimeMs: 50,
            cachingUsed: true,
            dataFreshnessScore: 0.9,
            relevanceScore: 0.8
          },
          tokenEstimate: 500,
          frenchTerminology: {},
          keyInsights: [`Contexte préchargé pour ${entityType}`]
        } as AIContextualData,
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4h TTL
        dataFreshness: 0.9,
        compressionApplied: true,
        size: 1024, // 1KB estimé
        tags: [
          `entity:${entityType}`,
          `prewarmed:${entityType}`,
          'scope:standard',
          'complexity:simple'
        ]
      };
      
      // Stocker en cache avec un délai pour éviter la surcharge
      this.memoryCache.set(mockCacheKey, mockEntry);
      
      // Délai micro pour simuler le traitement
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log(`[ContextCache] Prewarming ${entityType} terminé: ${limit} contextes générés`);
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

  private async invalidateRelatedEntities(
    entityType: string, 
    entityId: string, 
    parentTags?: string[]
  ): Promise<void> {
    // Logique d'invalidation des entités liées avec tags intelligents
    const relatedTags = [
      `entity:${entityType}`,
      `related_to:${entityId}`,
      ...(parentTags || [])
    ];
    
    await this.invalidateBySmartTags(relatedTags);
    console.log(`[ContextCache] Invalidation cascade pour ${entityType} liée à ${entityId}`);
  }

  // ========================================
  // PREWARMING INTELLIGENT AVEC BACKGROUND TASKS PHASE 2 PERFORMANCE
  // ========================================

  private prewarmingSchedule: NodeJS.Timeout | null = null;
  private backgroundTasksRunning = false;
  private prewarmingStats = {
    totalRuns: 0,
    totalContextsPrewarmed: 0,
    averageExecutionTime: 0,
    peakHoursHitRatio: 0,
    lastRunTime: null as Date | null
  };

  /**
   * Démarre le système de prewarming intelligent avec background tasks
   */
  public startIntelligentPrewarming(): void {
    if (this.backgroundTasksRunning) {
      console.log('[ContextCache] Prewarming déjà en cours d\'exécution');
      return;
    }

    this.backgroundTasksRunning = true;
    
    // Task principale : prewarming périodique intelligent
    this.schedulePeriodicPrewarming();
    
    // Task de monitoring de performance
    this.schedulePerformanceMonitoring();
    
    // Prewarming initial au démarrage
    this.executeInitialPrewarming();
    
    console.log('[ContextCache] 🔥 Système de prewarming intelligent démarré avec succès');
  }

  /**
   * Arrête le système de prewarming
   */
  public stopIntelligentPrewarming(): void {
    if (this.prewarmingSchedule) {
      clearInterval(this.prewarmingSchedule);
      this.prewarmingSchedule = null;
    }
    
    this.backgroundTasksRunning = false;
    console.log('[ContextCache] Système de prewarming arrêté');
  }

  /**
   * Planifie le prewarming périodique intelligent
   */
  private schedulePeriodicPrewarming(): void {
    // Exécution toutes les 30 minutes avec logique intelligente
    this.prewarmingSchedule = setInterval(async () => {
      await this.executeIntelligentPrewarming();
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Exécute le prewarming intelligent selon les horaires et usage
   */
  private async executeIntelligentPrewarming(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Analyser si nous sommes en période de pointe
      const isPeakHours = this.isPeakBusinessHours();
      const isScheduledRun = this.shouldRunScheduledPrewarming();
      
      if (!isPeakHours && !isScheduledRun) {
        console.log('[ContextCache] Prewarming reporté - hors période optimale');
        return;
      }

      console.log(`[ContextCache] 🚀 Début prewarming intelligent (période de pointe: ${isPeakHours})`);
      
      // Analyser les patterns d'usage récents
      const popularContexts = await this.analyzePopularContexts();
      
      // Déterminer la stratégie de prewarming
      const prewarmingStrategy = this.getPrewarmingStrategy(isPeakHours, popularContexts);
      
      // Exécuter le prewarming selon la stratégie
      const prewarmingResults = await this.executePrewarmingStrategy(prewarmingStrategy);
      
      // Mettre à jour les statistiques
      this.updatePrewarmingStats(prewarmingResults, Date.now() - startTime);
      
      // Publier événement de prewarming via EventBus si disponible
      if (this.eventBus) {
        this.eventBus.publishCachePrewarmingEvent({
          entityTypes: prewarmingResults.entityTypes,
          contextCount: prewarmingResults.contextsPrewarmed,
          executionTimeMs: Date.now() - startTime,
          isScheduled: isScheduledRun
        });
      }
      
      console.log(`[ContextCache] ✅ Prewarming terminé en ${Date.now() - startTime}ms - ${prewarmingResults.contextsPrewarmed} contextes`);
      
    } catch (error) {
      console.error(`[ContextCache] ❌ Erreur prewarming intelligent:`, error);
    }
  }

  /**
   * Détermine si nous sommes en période de pointe
   */
  private isPeakBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
    
    // Heures de pointe : 8h-12h et 14h-18h, du lundi au vendredi
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isMorningPeak = hour >= 8 && hour < 12;
    const isAfternoonPeak = hour >= 14 && hour < 18;
    
    return isWeekday && (isMorningPeak || isAfternoonPeak);
  }

  /**
   * Détermine si le prewarming programmé doit s'exécuter
   */
  private shouldRunScheduledPrewarming(): boolean {
    // Logique de décision basée sur l'activité récente
    const cacheUtilization = this.getCacheUtilizationRate();
    const recentMissRate = this.getRecentMissRate();
    
    // Exécuter si le taux de miss est élevé ou l'utilisation faible
    return recentMissRate > 0.3 || cacheUtilization < 0.6;
  }

  /**
   * Analyse les contextes populaires basée sur l'usage récent
   */
  private async analyzePopularContexts(): Promise<{
    entityTypes: string[];
    frequentPatterns: string[];
    recentlyAccessed: string[];
    highImpactMisses: string[];
  }> {
    const analysis = {
      entityTypes: [] as string[],
      frequentPatterns: [] as string[],
      recentlyAccessed: [] as string[],
      highImpactMisses: [] as string[]
    };

    // Analyser les types d'entités les plus accédés
    const entityTypeStats: Record<string, { count: number; avgRetrievalTime: number }> = {};
    
    for (const [key, entry] of this.memoryCache.entries()) {
      const entityType = this.extractEntityTypeFromKey(key);
      if (entityType) {
        if (!entityTypeStats[entityType]) {
          entityTypeStats[entityType] = { count: 0, avgRetrievalTime: 0 };
        }
        entityTypeStats[entityType].count += entry.accessCount;
      }
    }

    // Identifier les types d'entités populaires
    analysis.entityTypes = Object.entries(entityTypeStats)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([entityType]) => entityType);

    // Analyser les patterns fréquents (à partir des tags)
    const patternFrequency: Record<string, number> = {};
    for (const [, entry] of this.memoryCache.entries()) {
      for (const tag of entry.tags) {
        if (tag.includes('complexity:') || tag.includes('role:') || tag.includes('workflow:')) {
          patternFrequency[tag] = (patternFrequency[tag] || 0) + entry.accessCount;
        }
      }
    }

    analysis.frequentPatterns = Object.entries(patternFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pattern]) => pattern);

    // Identifier les contextes récemment accédés
    const recentAccess = Array.from(this.memoryCache.entries())
      .filter(([, entry]) => entry.lastAccessedAt.getTime() > Date.now() - 2 * 60 * 60 * 1000) // 2h
      .sort(([, a], [, b]) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())
      .slice(0, 20)
      .map(([key]) => this.extractEntityTypeFromKey(key))
      .filter(Boolean) as string[];

    analysis.recentlyAccessed = [...new Set(recentAccess)];

    return analysis;
  }

  /**
   * Détermine la stratégie de prewarming optimale
   */
  private getPrewarmingStrategy(isPeakHours: boolean, popularContexts: any): {
    priority: 'high' | 'medium' | 'low';
    entityTypes: string[];
    maxContextsPerType: number;
    complexityFocus: 'simple' | 'medium' | 'complex'[];
  } {
    if (isPeakHours) {
      return {
        priority: 'high',
        entityTypes: ['ao', 'offer', 'project', ...popularContexts.entityTypes.slice(0, 3)],
        maxContextsPerType: 15,
        complexityFocus: ['medium', 'complex']
      };
    }

    return {
      priority: 'medium',
      entityTypes: popularContexts.entityTypes.slice(0, 5),
      maxContextsPerType: 10,
      complexityFocus: ['simple', 'medium']
    };
  }

  /**
   * Exécute la stratégie de prewarming
   */
  private async executePrewarmingStrategy(strategy: any): Promise<{
    contextsPrewarmed: number;
    entityTypes: string[];
    executionTimeMs: number;
  }> {
    const startTime = Date.now();
    let totalContexts = 0;
    const processedEntityTypes: string[] = [];

    for (const entityType of strategy.entityTypes) {
      try {
        // Précharger les contextes pour ce type d'entité
        await this.prewarmContextsForEntityType(entityType, {
          maxContexts: strategy.maxContextsPerType,
          complexity: strategy.complexityFocus,
          priority: strategy.priority
        });
        
        totalContexts += strategy.maxContextsPerType;
        processedEntityTypes.push(entityType);
        
        // Délai entre les types pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`[ContextCache] Erreur prewarming ${entityType}:`, error);
      }
    }

    return {
      contextsPrewarmed: totalContexts,
      entityTypes: processedEntityTypes,
      executionTimeMs: Date.now() - startTime
    };
  }

  /**
   * Préchauffe les contextes pour un type d'entité spécifique
   */
  private async prewarmContextsForEntityType(
    entityType: string, 
    options: {
      maxContexts: number;
      complexity: string | string[];
      priority: string;
    }
  ): Promise<void> {
    // Simuler le prewarming intelligent avec des contextes réalistes
    const complexityFilters = Array.isArray(options.complexity) ? options.complexity : [options.complexity];
    
    for (let i = 0; i < options.maxContexts; i++) {
      const mockEntityId = this.generateRealisticEntityId(entityType);
      const complexity = complexityFilters[i % complexityFilters.length];
      
      const prewarmingKey = `prewarmed:${entityType}:${mockEntityId}:${complexity}`;
      
      // Créer une entrée de cache optimisée pour les périodes de pointe
      const prewarmingEntry: CacheEntry = {
        data: this.generateRealisticContextData(entityType, mockEntityId, complexity),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        accessCount: 0,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // 6h TTL pour prewarming
        dataFreshness: 0.95, // Haute fraîcheur pour prewarming
        compressionApplied: true,
        size: this.estimateContextSize(complexity),
        tags: [
          `entity:${entityType}`,
          `prewarmed:${entityType}`,
          `complexity:${complexity}`,
          `priority:${options.priority}`,
          'prewarming:intelligent',
          `generated:${new Date().toISOString().split('T')[0]}` // Tag de date
        ]
      };
      
      this.memoryCache.set(prewarmingKey, prewarmingEntry);
      
      // Micro délai pour éviter la saturation
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  /**
   * Exécute le prewarming initial au démarrage
   */
  private async executeInitialPrewarming(): Promise<void> {
    console.log('[ContextCache] 🔄 Prewarming initial au démarrage...');
    
    // Précharger les contextes essentiels
    const essentialEntityTypes = ['ao', 'offer', 'project'];
    
    for (const entityType of essentialEntityTypes) {
      await this.prewarmContextsForEntityType(entityType, {
        maxContexts: 5,
        complexity: ['simple', 'medium'],
        priority: 'high'
      });
    }
    
    console.log('[ContextCache] ✅ Prewarming initial terminé');
  }

  /**
   * Planifie le monitoring de performance
   */
  private schedulePerformanceMonitoring(): void {
    setInterval(() => {
      this.monitorPrewarmingEffectiveness();
    }, 15 * 60 * 1000); // Toutes les 15 minutes
  }

  /**
   * Surveille l'efficacité du prewarming
   */
  private monitorPrewarmingEffectiveness(): void {
    const prewarmingHitRate = this.calculatePrewarmingHitRate();
    const cacheUtilization = this.getCacheUtilizationRate();
    
    console.log(`[ContextCache] 📊 Monitoring: Hit rate prewarming: ${(prewarmingHitRate * 100).toFixed(1)}%, Utilisation: ${(cacheUtilization * 100).toFixed(1)}%`);
    
    // Alerter si l'efficacité est faible
    if (prewarmingHitRate < 0.4) {
      console.warn('[ContextCache] ⚠️ Efficacité prewarming faible - révision de stratégie recommandée');
    }
  }

  // Méthodes utilitaires pour le prewarming

  private extractEntityTypeFromKey(key: string): string | null {
    const parts = key.split(':');
    return parts.length >= 2 ? parts[1] : null;
  }

  private generateRealisticEntityId(entityType: string): string {
    const prefix = entityType.toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}_${timestamp}_${random}`;
  }

  private generateRealisticContextData(entityType: string, entityId: string, complexity: string): AIContextualData {
    return {
      entityType,
      entityId,
      requestId: `prewarmed_${Date.now()}`,
      contextTypes: ['business', 'technical'],
      scope: complexity === 'complex' ? 'comprehensive' : 'standard',
      compressionLevel: 'medium',
      generationMetrics: {
        totalTablesQueried: complexity === 'complex' ? 8 : complexity === 'medium' ? 5 : 3,
        executionTimeMs: complexity === 'complex' ? 120 : complexity === 'medium' ? 80 : 40,
        cachingUsed: true,
        dataFreshnessScore: 0.9,
        relevanceScore: 0.85
      },
      tokenEstimate: complexity === 'complex' ? 1500 : complexity === 'medium' ? 1000 : 600,
      frenchTerminology: {},
      keyInsights: [`Contexte ${complexity} préchargé pour ${entityType}`]
    } as AIContextualData;
  }

  private estimateContextSize(complexity: string): number {
    switch (complexity) {
      case 'complex': return 3072; // 3KB
      case 'medium': return 2048;  // 2KB
      case 'simple': return 1024;  // 1KB
      default: return 1024;
    }
  }

  private calculatePrewarmingHitRate(): number {
    let prewarmingHits = 0;
    let totalPrewarmedEntries = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (key.includes('prewarmed:')) {
        totalPrewarmedEntries++;
        if (entry.accessCount > 0) {
          prewarmingHits++;
        }
      }
    }
    
    return totalPrewarmedEntries > 0 ? prewarmingHits / totalPrewarmedEntries : 0;
  }

  private getCacheUtilizationRate(): number {
    const totalEntries = this.memoryCache.size;
    const activeEntries = Array.from(this.memoryCache.values())
      .filter(entry => entry.accessCount > 0).length;
    
    return totalEntries > 0 ? activeEntries / totalEntries : 0;
  }

  private getRecentMissRate(): number {
    const totalRequests = this.hitCount + this.missCount;
    return totalRequests > 0 ? this.missCount / totalRequests : 0;
  }

  private updatePrewarmingStats(results: any, executionTime: number): void {
    this.prewarmingStats.totalRuns++;
    this.prewarmingStats.totalContextsPrewarmed += results.contextsPrewarmed;
    this.prewarmingStats.averageExecutionTime = 
      (this.prewarmingStats.averageExecutionTime * (this.prewarmingStats.totalRuns - 1) + executionTime) / this.prewarmingStats.totalRuns;
    this.prewarmingStats.lastRunTime = new Date();
    
    if (this.isPeakBusinessHours()) {
      this.prewarmingStats.peakHoursHitRatio = this.calculatePrewarmingHitRate();
    }
  }

  /**
   * Retourne les statistiques de prewarming
   */
  public getPrewarmingStats(): typeof this.prewarmingStats {
    return { ...this.prewarmingStats };
  }

  // ========================================
  // ÉTAPE 3 PHASE 3 PERFORMANCE : PRELOADING PRÉDICTIF
  // ========================================

  // Intégration avec PredictiveEngine
  private predictiveEngine: any = null;
  private predictivePreloadingEnabled = true;
  private predictiveStats = {
    totalPredictivePreloads: 0,
    successfulPredictions: 0,
    failedPredictions: 0,
    averagePredictionAccuracy: 0,
    heatMapIntegrationActive: false,
    lastHeatMapUpdate: new Date(),
    predictiveHitRate: 0,
    lruOptimizationsApplied: 0
  };

  /**
   * Configure l'intégration avec PredictiveEngine pour preloading intelligent
   */
  public integratePredictiveEngine(predictiveEngine: any): void {
    this.predictiveEngine = predictiveEngine;
    this.predictiveStats.heatMapIntegrationActive = true;
    
    console.log('[ContextCache] Intégration PredictiveEngine activée pour preloading intelligent');
    
    // Démarrer cycles prédictifs automatiques
    this.startPredictiveCycles();
  }

  /**
   * MÉTHODE PRINCIPALE : Preloading contexte basé sur prédictions
   * Preload intelligent selon predictions du PredictiveEngine
   */
  async preloadContextByPrediction(
    entityType: string,
    entityId: string,
    contextConfig?: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<boolean> {
    if (!this.predictivePreloadingEnabled) {
      console.log('[ContextCache] Preloading prédictif désactivé');
      return false;
    }

    try {
      const startTime = Date.now();
      
      console.log(`[ContextCache] Preloading prédictif: ${entityType}:${entityId} (priorité: ${priority})`);
      
      // 1. VÉRIFICATION CACHE EXISTANT
      const existingKey = this.generateCacheKey(entityType, entityId, contextConfig || this.getDefaultConfig());
      if (this.memoryCache.has(existingKey)) {
        console.log(`[ContextCache] Contexte déjà en cache: ${entityType}:${entityId}`);
        return true;
      }

      // 2. GÉNÉRATION CONTEXTE PRÉDICTIF OPTIMISÉ
      const predictiveContext = await this.generatePredictiveContext(
        entityType, 
        entityId, 
        contextConfig,
        priority
      );

      if (!predictiveContext) {
        this.predictiveStats.failedPredictions++;
        return false;
      }

      // 3. STOCKAGE AVEC SCORING PRÉDICTIF
      await this.storePredictiveContext(
        entityType,
        entityId,
        predictiveContext,
        contextConfig,
        priority,
        startTime
      );

      // 4. OPTIMISATION LRU BASÉE PRÉDICTIONS
      await this.optimizeLRUWithPredictiveScoring();

      // 5. ENREGISTREMENT ACCÈS POUR HEAT-MAP
      if (this.predictiveEngine) {
        this.predictiveEngine.recordEntityAccess(
          entityType,
          entityId,
          'system_preload',
          this.determineContextComplexity(contextConfig)
        );
      }

      this.predictiveStats.totalPredictivePreloads++;
      this.predictiveStats.successfulPredictions++;
      
      const duration = Date.now() - startTime;
      console.log(`[ContextCache] Preloading prédictif complété: ${entityType}:${entityId} en ${duration}ms`);
      
      return true;

    } catch (error) {
      console.error(`[ContextCache] Erreur preloading prédictif ${entityType}:${entityId}:`, error);
      this.predictiveStats.failedPredictions++;
      return false;
    }
  }

  /**
   * Intégration Heat-Map pour optimisation cache intelligente
   */
  async integrateHeatMapData(): Promise<void> {
    if (!this.predictiveEngine) {
      console.log('[ContextCache] PredictiveEngine non intégré');
      return;
    }

    try {
      console.log('[ContextCache] Intégration heat-map pour optimisation cache...');
      
      // 1. RÉCUPÉRATION HEAT-MAP ACTUELLE
      const heatMap = await this.predictiveEngine.generateEntityHeatMap();
      
      // 2. PRELOADING ENTITÉS CHAUDES
      await this.preloadHotEntities(heatMap.hotEntities);
      
      // 3. ÉVICTION ENTITÉS FROIDES
      await this.evictColdEntities(heatMap.coldEntities);
      
      // 4. OPTIMISATION CACHE SELON TRENDS
      await this.optimizeCacheByTrends(heatMap.accessTrends);
      
      // 5. AJUSTEMENT BUSINESS HOURS
      await this.adjustForBusinessHours(heatMap.businessHoursMultiplier, heatMap.peakHours);

      this.predictiveStats.lastHeatMapUpdate = new Date();
      console.log('[ContextCache] Intégration heat-map terminée');

    } catch (error) {
      console.error('[ContextCache] Erreur intégration heat-map:', error);
    }
  }

  /**
   * LRU éviction améliorée avec scoring prédictif
   */
  async optimizeLRUWithPredictiveScoring(): Promise<void> {
    try {
      const currentSize = this.calculateCurrentCacheSize();
      const maxSizeBytes = this.MAX_CACHE_SIZE_MB * 1024 * 1024;
      
      if (currentSize < maxSizeBytes * 0.8) {
        return; // Pas besoin d'optimisation
      }

      console.log('[ContextCache] Optimisation LRU avec scoring prédictif...');
      
      // 1. CALCUL SCORES PRÉDICTIFS POUR CHAQUE ENTRÉE
      const entriesWithScores: Array<{
        key: string;
        entry: CacheEntry;
        predictiveScore: number;
        shouldEvict: boolean;
      }> = [];

      for (const [key, entry] of this.memoryCache.entries()) {
        const predictiveScore = await this.calculatePredictiveScore(key, entry);
        const shouldEvict = predictiveScore < 30; // Seuil d'éviction
        
        entriesWithScores.push({
          key,
          entry,
          predictiveScore,
          shouldEvict
        });
      }

      // 2. TRI PAR SCORE PRÉDICTIF (plus bas = candidat éviction)
      entriesWithScores.sort((a, b) => a.predictiveScore - b.predictiveScore);

      // 3. ÉVICTION INTELLIGENTE
      let evictedCount = 0;
      const targetReduction = Math.floor(this.memoryCache.size * 0.2); // Réduire de 20%

      for (const item of entriesWithScores) {
        if (evictedCount >= targetReduction) break;
        
        if (item.shouldEvict || item.predictiveScore < 40) {
          this.memoryCache.delete(item.key);
          evictedCount++;
          
          console.log(`[ContextCache] Éviction prédictive: ${item.key.substring(0, 40)}... (score: ${item.predictiveScore})`);
        }
      }

      this.predictiveStats.lruOptimizationsApplied++;
      console.log(`[ContextCache] Optimisation LRU terminée: ${evictedCount} entrées évincées`);

    } catch (error) {
      console.error('[ContextCache] Erreur optimisation LRU prédictive:', error);
    }
  }

  /**
   * Preloading intelligent des entités chaudes selon heat-map
   */
  private async preloadHotEntities(hotEntities: any[]): Promise<void> {
    console.log(`[ContextCache] Preloading ${hotEntities.length} entités chaudes...`);
    
    // Limite concurrent preloading pour éviter surcharge
    const MAX_CONCURRENT = 3;
    const hotBatch = hotEntities.slice(0, 10); // Top 10 entités chaudes
    
    for (let i = 0; i < hotBatch.length; i += MAX_CONCURRENT) {
      const batch = hotBatch.slice(i, i + MAX_CONCURRENT);
      
      const preloadPromises = batch.map(async (entity) => {
        try {
          const priority = this.determinePriorityFromPopularity(entity);
          await this.preloadContextByPrediction(
            entity.entityType,
            entity.entityId,
            this.getOptimalConfigForEntity(entity),
            priority
          );
        } catch (error) {
          console.warn(`[ContextCache] Erreur preloading entité chaude ${entity.entityType}:${entity.entityId}:`, error);
        }
      });

      await Promise.allSettled(preloadPromises);
    }
  }

  /**
   * Éviction intelligente des entités froides
   */
  private async evictColdEntities(coldEntities: string[]): Promise<void> {
    let evictedCount = 0;
    
    for (const entityKey of coldEntities) {
      // Rechercher les clés de cache correspondantes
      for (const [cacheKey, entry] of this.memoryCache.entries()) {
        if (cacheKey.includes(entityKey) && this.shouldEvictColdEntity(entry)) {
          this.memoryCache.delete(cacheKey);
          evictedCount++;
          
          console.log(`[ContextCache] Éviction entité froide: ${entityKey}`);
        }
      }
    }
    
    if (evictedCount > 0) {
      console.log(`[ContextCache] ${evictedCount} entités froides évincées`);
    }
  }

  /**
   * Optimise le cache selon les tendances d'accès
   */
  private async optimizeCacheByTrends(accessTrends: Record<string, number[]>): Promise<void> {
    for (const [entityKey, trend] of Object.entries(accessTrends)) {
      if (trend.length >= 3) {
        const isIncreasing = this.detectIncreasingTrend(trend);
        const isDecreasing = this.detectDecreasingTrend(trend);
        
        if (isIncreasing) {
          // Précharger entités avec tendance croissante
          const [entityType, entityId] = entityKey.split(':');
          await this.preloadContextByPrediction(entityType, entityId, undefined, 'high');
        } else if (isDecreasing) {
          // Réduire priorité cache entités décroissantes
          await this.reduceCachePriorityForEntity(entityKey);
        }
      }
    }
  }

  /**
   * Ajustement cache selon horaires business
   */
  private async adjustForBusinessHours(
    businessMultiplier: number, 
    peakHours: number[]
  ): Promise<void> {
    const currentHour = new Date().getHours();
    
    if (peakHours.includes(currentHour)) {
      // Mode agressif pendant heures de pointe
      console.log('[ContextCache] Mode preloading agressif - heures de pointe');
      await this.activateAggressivePreloading();
    } else if (businessMultiplier > 1.2) {
      // Mode modéré pendant horaires business
      console.log('[ContextCache] Mode preloading modéré - horaires business');
      await this.activateModeratePreloading();
    } else {
      // Mode conservateur hors horaires
      console.log('[ContextCache] Mode preloading conservateur - hors horaires');
      await this.activateConservativePreloading();
    }
  }

  /**
   * Calcule score prédictif pour décision éviction LRU
   */
  private async calculatePredictiveScore(key: string, entry: CacheEntry): Promise<number> {
    let score = 50; // Score de base

    // 1. FACTEUR RÉCENCE (25%)
    const ageHours = (Date.now() - entry.lastAccessedAt.getTime()) / (60 * 60 * 1000);
    const recencyScore = Math.max(0, 100 - (ageHours * 5)); // Dégrade avec l'âge
    score += recencyScore * 0.25;

    // 2. FACTEUR FRÉQUENCE (25%)
    const frequencyScore = Math.min(100, entry.accessCount * 10);
    score += frequencyScore * 0.25;

    // 3. FACTEUR PRÉDICTIF (30%)
    const predictiveScore = await this.getPredictiveScoreFromEngine(key);
    score += predictiveScore * 0.30;

    // 4. FACTEUR COMPLEXITÉ (20%)
    const complexityScore = this.getComplexityScore(entry);
    score += complexityScore * 0.20;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Obtient score prédictif depuis PredictiveEngine
   */
  private async getPredictiveScoreFromEngine(key: string): Promise<number> {
    if (!this.predictiveEngine) return 50; // Score neutre

    try {
      const [entityType, entityId] = key.split(':');
      
      // Vérifier si entité dans heat-map actuelle
      const heatMap = await this.predictiveEngine.generateEntityHeatMap();
      const hotEntity = heatMap.hotEntities.find(e => 
        e.entityType === entityType && e.entityId === entityId
      );
      
      if (hotEntity) {
        return 80 + (hotEntity.accessCount * 2); // Score élevé pour entités chaudes
      }
      
      // Vérifier si entité dans prédictions futures
      const predictions = await this.predictiveEngine.predictNextEntityAccess();
      const futurePrediction = predictions.find(p => 
        p.entityType === entityType && p.entityId === entityId
      );
      
      if (futurePrediction) {
        return Math.min(90, 60 + futurePrediction.confidence);
      }
      
      return 30; // Score bas si pas dans prédictions

    } catch (error) {
      console.warn('[ContextCache] Erreur récupération score prédictif:', error);
      return 50; // Score neutre en cas d'erreur
    }
  }

  /**
   * Génère contexte prédictif optimisé
   */
  private async generatePredictiveContext(
    entityType: string,
    entityId: string,
    contextConfig: any,
    priority: string
  ): Promise<any> {
    // Configuration adaptée selon priorité et type d'entité
    const optimizedConfig = {
      ...this.getDefaultConfig(),
      ...contextConfig,
      performance: {
        compressionLevel: priority === 'critical' ? 'none' : 'medium',
        timeoutMs: priority === 'low' ? 2000 : 5000,
        cachingEnabled: true
      },
      scope: this.determineScopeByPriority(priority),
      contextTypes: this.getContextTypesForEntity(entityType)
    };

    // Simulation génération contexte pour POC
    return {
      entityType,
      entityId,
      requestId: `predictive_${Date.now()}`,
      contextTypes: optimizedConfig.contextTypes,
      scope: optimizedConfig.scope,
      compressionLevel: optimizedConfig.performance.compressionLevel,
      generationMetrics: {
        totalTablesQueried: priority === 'critical' ? 12 : 6,
        executionTimeMs: priority === 'low' ? 300 : 150,
        cachingUsed: true,
        dataFreshnessScore: 0.95,
        relevanceScore: 0.90
      },
      tokenEstimate: priority === 'critical' ? 2000 : 1200,
      frenchTerminology: {},
      keyInsights: [`Contexte prédictif ${priority} pour ${entityType}`],
      predictiveMetadata: {
        preloadedAt: new Date().toISOString(),
        priority,
        expectedAccess: Date.now() + (15 * 60 * 1000), // Dans 15 minutes
        confidenceScore: 85
      }
    };
  }

  /**
   * Stocke contexte prédictif avec métadonnées optimisées
   */
  private async storePredictiveContext(
    entityType: string,
    entityId: string,
    context: any,
    contextConfig: any,
    priority: string,
    startTime: number
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(entityType, entityId, contextConfig || this.getDefaultConfig());
    const now = new Date();
    
    // TTL adapté selon priorité
    const ttlHours = this.getTTLByPriority(priority);
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const entry: CacheEntry = {
      data: context,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      expiresAt,
      dataFreshness: context.generationMetrics.dataFreshnessScore,
      compressionApplied: context.compressionLevel !== "none",
      size: this.estimateEntrySize(context),
      tags: this.generatePredictiveTags(entityType, entityId, context, priority)
    };

    // Stockage avec priorité
    this.memoryCache.set(cacheKey, entry);
    
    console.log(`[ContextCache] Contexte prédictif stocké: ${cacheKey} (TTL: ${ttlHours}h, priorité: ${priority})`);
  }

  /**
   * Démarre les cycles prédictifs automatiques
   */
  private startPredictiveCycles(): void {
    // Cycle intégration heat-map (toutes les 10 minutes)
    setInterval(async () => {
      if (this.predictivePreloadingEnabled) {
        await this.integrateHeatMapData();
      }
    }, 10 * 60 * 1000);

    // Cycle optimisation LRU (toutes les 15 minutes)
    setInterval(async () => {
      if (this.predictivePreloadingEnabled) {
        await this.optimizeLRUWithPredictiveScoring();
      }
    }, 15 * 60 * 1000);

    // Cycle preloading prédictif (toutes les 5 minutes)
    setInterval(async () => {
      if (this.predictivePreloadingEnabled && this.predictiveEngine) {
        await this.runPredictivePreloadingCycle();
      }
    }, 5 * 60 * 1000);

    console.log('[ContextCache] Cycles prédictifs automatiques démarrés');
  }

  /**
   * Exécute un cycle complet de preloading prédictif
   */
  private async runPredictivePreloadingCycle(): Promise<void> {
    try {
      console.log('[ContextCache] Cycle preloading prédictif...');
      
      // 1. Obtenir prédictions depuis PredictiveEngine
      const predictions = await this.predictiveEngine.predictNextEntityAccess();
      
      // 2. Filtrer prédictions selon capacité cache
      const viablePredictions = predictions
        .filter(p => p.confidence >= 70)
        .slice(0, 5); // Limiter à 5 prédictions par cycle
      
      // 3. Preloader contextes prédits
      for (const prediction of viablePredictions) {
        const priority = prediction.confidence >= 90 ? 'critical' :
                        prediction.confidence >= 80 ? 'high' : 'medium';
        
        await this.preloadContextByPrediction(
          prediction.entityType,
          prediction.entityId,
          undefined,
          priority
        );
      }
      
      console.log(`[ContextCache] Cycle prédictif terminé: ${viablePredictions.length} contextes preloadés`);
      
    } catch (error) {
      console.error('[ContextCache] Erreur cycle preloading prédictif:', error);
    }
  }

  // ========================================
  // MÉTHODES HELPER PRELOADING PRÉDICTIF
  // ========================================

  private getDefaultConfig(): any {
    return {
      contextTypes: ['business', 'technical'],
      scope: 'standard',
      performance: {
        compressionLevel: 'medium',
        timeoutMs: 3000,
        cachingEnabled: true
      }
    };
  }

  private determineContextComplexity(contextConfig: any): 'low' | 'medium' | 'high' {
    if (!contextConfig) return 'medium';
    
    const scope = contextConfig.scope || 'standard';
    switch (scope) {
      case 'minimal': return 'low';
      case 'comprehensive': return 'high';
      default: return 'medium';
    }
  }

  private determinePriorityFromPopularity(entity: any): 'low' | 'medium' | 'high' | 'critical' {
    if (entity.accessCount >= 20) return 'critical';
    if (entity.accessCount >= 10) return 'high';
    if (entity.accessCount >= 5) return 'medium';
    return 'low';
  }

  private getOptimalConfigForEntity(entity: any): any {
    return {
      contextTypes: entity.entityType === 'project' ? ['business', 'technical', 'temporal'] : 
                   entity.entityType === 'ao' ? ['business', 'relational'] : ['business'],
      scope: entity.contextComplexity === 'high' ? 'comprehensive' : 'standard',
      performance: {
        compressionLevel: 'medium',
        timeoutMs: 4000,
        cachingEnabled: true
      }
    };
  }

  private shouldEvictColdEntity(entry: CacheEntry): boolean {
    const ageHours = (Date.now() - entry.lastAccessedAt.getTime()) / (60 * 60 * 1000);
    return ageHours > 48 && entry.accessCount < 2; // Plus de 48h et moins de 2 accès
  }

  private detectIncreasingTrend(trend: number[]): boolean {
    if (trend.length < 3) return false;
    const recent = trend.slice(-3);
    return recent[2] > recent[1] && recent[1] > recent[0];
  }

  private detectDecreasingTrend(trend: number[]): boolean {
    if (trend.length < 3) return false;
    const recent = trend.slice(-3);
    return recent[2] < recent[1] && recent[1] < recent[0];
  }

  private async reduceCachePriorityForEntity(entityKey: string): Promise<void> {
    for (const [cacheKey, entry] of this.memoryCache.entries()) {
      if (cacheKey.includes(entityKey)) {
        // Réduire TTL pour éviction plus rapide
        const newExpiry = new Date(Date.now() + (2 * 60 * 60 * 1000)); // 2h au lieu du TTL normal
        entry.expiresAt = newExpiry;
      }
    }
  }

  private async activateAggressivePreloading(): Promise<void> {
    // Mode agressif : preload top 15 entités chaudes
    if (this.predictiveEngine) {
      const heatMap = await this.predictiveEngine.generateEntityHeatMap();
      await this.preloadHotEntities(heatMap.hotEntities.slice(0, 15));
    }
  }

  private async activateModeratePreloading(): Promise<void> {
    // Mode modéré : preload top 8 entités chaudes
    if (this.predictiveEngine) {
      const heatMap = await this.predictiveEngine.generateEntityHeatMap();
      await this.preloadHotEntities(heatMap.hotEntities.slice(0, 8));
    }
  }

  private async activateConservativePreloading(): Promise<void> {
    // Mode conservateur : preload seulement top 3 entités critiques
    if (this.predictiveEngine) {
      const heatMap = await this.predictiveEngine.generateEntityHeatMap();
      const criticalEntities = heatMap.hotEntities
        .filter(e => e.accessCount >= 15)
        .slice(0, 3);
      await this.preloadHotEntities(criticalEntities);
    }
  }

  private getComplexityScore(entry: CacheEntry): number {
    // Score basé sur taille et fréquence d'accès
    const sizeScore = Math.min(50, entry.size / 100); // Normalisé par taille
    const accessScore = Math.min(50, entry.accessCount * 5);
    return sizeScore + accessScore;
  }

  private determineScopeByPriority(priority: string): string {
    switch (priority) {
      case 'critical': return 'comprehensive';
      case 'high': return 'standard';
      case 'medium': return 'standard';
      case 'low': return 'minimal';
      default: return 'standard';
    }
  }

  private getContextTypesForEntity(entityType: string): string[] {
    switch (entityType) {
      case 'ao': return ['business', 'relational'];
      case 'offer': return ['business', 'relational', 'technical'];
      case 'project': return ['business', 'technical', 'temporal'];
      case 'supplier': return ['business', 'relational'];
      default: return ['business'];
    }
  }

  private getTTLByPriority(priority: string): number {
    switch (priority) {
      case 'critical': return 8; // 8 heures
      case 'high': return 6;     // 6 heures
      case 'medium': return 4;   // 4 heures
      case 'low': return 2;      // 2 heures
      default: return 4;
    }
  }

  private generatePredictiveTags(
    entityType: string,
    entityId: string,
    context: any,
    priority: string
  ): string[] {
    const baseTags = [
      `entity:${entityType}`,
      `${entityType}:${entityId}`,
      `priority:${priority}`,
      'source:predictive',
      `scope:${context.scope}`
    ];

    // Tags spécialisés preloading
    baseTags.push('preloaded');
    baseTags.push(`confidence:${context.predictiveMetadata?.confidenceScore || 0}`);

    // Tags temporels
    const hour = new Date().getHours();
    if (hour >= 8 && hour <= 18) {
      baseTags.push('business_hours');
    }

    return baseTags;
  }

  private calculateCurrentCacheSize(): number {
    return Array.from(this.memoryCache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  /**
   * Active/désactive le preloading prédictif
   */
  public setPredictivePreloadingEnabled(enabled: boolean): void {
    this.predictivePreloadingEnabled = enabled;
    console.log(`[ContextCache] Preloading prédictif ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  /**
   * Statistiques preloading prédictif pour monitoring
   */
  public getPredictiveStats(): typeof this.predictiveStats {
    // Mise à jour accuracy en temps réel
    if (this.predictiveStats.totalPredictivePreloads > 0) {
      this.predictiveStats.averagePredictionAccuracy = 
        (this.predictiveStats.successfulPredictions / this.predictiveStats.totalPredictivePreloads) * 100;
    }

    // Calcul hit-rate prédictif
    const predictiveHits = Array.from(this.memoryCache.values())
      .filter(entry => entry.tags.includes('source:predictive') && entry.accessCount > 0)
      .length;
    const totalPredictiveEntries = Array.from(this.memoryCache.values())
      .filter(entry => entry.tags.includes('source:predictive'))
      .length;
    
    this.predictiveStats.predictiveHitRate = totalPredictiveEntries > 0 ? 
      (predictiveHits / totalPredictiveEntries) * 100 : 0;

    return { ...this.predictiveStats };
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