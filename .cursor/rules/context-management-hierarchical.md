# Gestion de Contexte Hiérarchique - Saxium

**Objectif:** Permettre des runs de 6+ heures sans saturation du contexte grâce à un système de gestion hiérarchique intelligent.

**Priorité:** CRITIQUE (P0)  
**Version:** 1.0.0  
**Date:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT gérer intelligemment le contexte avec un système hiérarchique à 3 niveaux (Hot/Warm/Cold) pour éviter la saturation et permettre des runs très longs.

**Objectif de Performance:**
- Runs de 6+ heures sans saturation
- Contexte stable à <70% d'utilisation
- Performances constantes sur toute la durée
- Aucune perte d'information critique

---

## 📋 Architecture Hiérarchique du Contexte

### 1. Niveaux de Contexte

#### Niveau 1: Hot Context (Contexte Actif)
**Définition:** Fichiers et informations actuellement utilisés par l'agent.

**Caractéristiques:**
- Accès immédiat (0ms de latence)
- Taille maximale: 20 fichiers
- Durée de vie: Tant qu'utilisés
- Priorité: CRITIQUE

**Contenu typique:**
- Fichier en cours de modification
- Fichiers de dépendances directes
- Tests associés
- Documentation pertinente immédiate

#### Niveau 2: Warm Context (Contexte Récent)
**Définition:** Fichiers récemment utilisés ou susceptibles d'être utilisés prochainement.

**Caractéristiques:**
- Accès rapide (<100ms de latence)
- Taille maximale: 30 fichiers
- Durée de vie: Dernière heure
- Priorité: HAUTE

**Contenu typique:**
- Fichiers modifiés dans l'heure écoulée
- Fichiers liés aux tâches récentes
- Historique de navigation
- Contexte des 5 dernières tâches

#### Niveau 3: Cold Context (Contexte Archivé)
**Définition:** Fichiers et informations archivées mais toujours accessibles.

**Caractéristiques:**
- Accès lent (<500ms de latence)
- Taille: Illimitée
- Durée de vie: Toute la session
- Priorité: BASSE

**Contenu typique:**
- Tous les fichiers du projet
- Historique complet
- Checkpoints précédents
- Logs et métriques

---

## 🔄 Gestion Dynamique des Niveaux

### 2. Promotion/Rétrogradation Automatique

**IMPÉRATIF:** Le système DOIT automatiquement promouvoir ou rétrograder les fichiers selon leur utilisation.

**Pattern:**
```typescript
class HierarchicalContextManager {
  private hotContext: ContextLevel;
  private warmContext: ContextLevel;
  private coldContext: ContextLevel;
  
  // Capacités maximales
  private readonly HOT_MAX = 20;
  private readonly WARM_MAX = 30;
  
  // Durées de vie
  private readonly WARM_TTL = 60 * 60 * 1000; // 1 heure
  private readonly HOT_TTL = 10 * 60 * 1000; // 10 minutes sans accès
  
  async accessFile(filePath: string): Promise<FileContent> {
    // 1. Vérifier si dans Hot Context
    let file = this.hotContext.get(filePath);
    if (file) {
      // Mettre à jour timestamp d'accès
      file.lastAccess = Date.now();
      return file.content;
    }
    
    // 2. Vérifier si dans Warm Context
    file = this.warmContext.get(filePath);
    if (file) {
      // Promouvoir vers Hot Context
      await this.promoteToHot(filePath, file);
      return file.content;
    }
    
    // 3. Charger depuis Cold Context
    file = await this.coldContext.load(filePath);
    
    // 4. Promouvoir vers Hot Context
    await this.promoteToHot(filePath, file);
    
    return file.content;
  }
  
  async promoteToHot(
    filePath: string,
    file: ContextFile
  ): Promise<void> {
    // 1. Vérifier capacité Hot Context
    if (this.hotContext.size >= this.HOT_MAX) {
      // Rétrograder fichier le moins récent
      await this.demoteFromHot();
    }
    
    // 2. Ajouter au Hot Context
    this.hotContext.set(filePath, {
      ...file,
      level: 'hot',
      promotedAt: Date.now(),
      lastAccess: Date.now()
    });
    
    // 3. Retirer du Warm Context si présent
    this.warmContext.delete(filePath);
    
    logger.debug('Promoted to Hot Context', {
      metadata: { filePath, hotSize: this.hotContext.size }
    });
  }
  
  async demoteFromHot(): Promise<void> {
    // 1. Identifier fichier le moins récent
    const leastRecent = this.findLeastRecentFile(this.hotContext);
    
    if (!leastRecent) {
      return;
    }
    
    // 2. Vérifier capacité Warm Context
    if (this.warmContext.size >= this.WARM_MAX) {
      // Rétrograder vers Cold Context
      await this.demoteFromWarm();
    }
    
    // 3. Déplacer vers Warm Context
    this.warmContext.set(leastRecent.path, {
      ...leastRecent.file,
      level: 'warm',
      demotedAt: Date.now()
    });
    
    // 4. Retirer du Hot Context
    this.hotContext.delete(leastRecent.path);
    
    logger.debug('Demoted from Hot Context', {
      metadata: {
        filePath: leastRecent.path,
        hotSize: this.hotContext.size,
        warmSize: this.warmContext.size
      }
    });
  }
  
  async demoteFromWarm(): Promise<void> {
    // 1. Identifier fichier le moins récent
    const leastRecent = this.findLeastRecentFile(this.warmContext);
    
    if (!leastRecent) {
      return;
    }
    
    // 2. Archiver vers Cold Context
    await this.coldContext.archive(leastRecent.path, leastRecent.file);
    
    // 3. Retirer du Warm Context
    this.warmContext.delete(leastRecent.path);
    
    logger.debug('Demoted from Warm Context', {
      metadata: {
        filePath: leastRecent.path,
        warmSize: this.warmContext.size
      }
    });
  }
  
  findLeastRecentFile(
    context: ContextLevel
  ): { path: string; file: ContextFile } | null {
    let leastRecent: { path: string; file: ContextFile; lastAccess: number } | null = null;
    
    for (const [path, file] of context.entries()) {
      if (!leastRecent || file.lastAccess < leastRecent.lastAccess) {
        leastRecent = { path, file, lastAccess: file.lastAccess };
      }
    }
    
    return leastRecent ? { path: leastRecent.path, file: leastRecent.file } : null;
  }
}
```

### 3. Nettoyage Automatique (Garbage Collection)

**IMPÉRATIF:** Nettoyer automatiquement le contexte pour éviter accumulation.

**Pattern:**
```typescript
class ContextGarbageCollector {
  private readonly GC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private gcTimer: NodeJS.Timeout | null = null;
  
  startGC(contextManager: HierarchicalContextManager): void {
    this.gcTimer = setInterval(async () => {
      await this.performGC(contextManager);
    }, this.GC_INTERVAL);
  }
  
  async performGC(contextManager: HierarchicalContextManager): Promise<GCResult> {
    const startTime = Date.now();
    const result: GCResult = {
      hotCleaned: 0,
      warmCleaned: 0,
      coldCleaned: 0,
      duration: 0
    };
    
    // 1. Nettoyer Hot Context
    const hotExpired = contextManager.hotContext.findExpired(
      contextManager.HOT_TTL
    );
    for (const [path, file] of hotExpired) {
      await contextManager.demoteFromHot();
      result.hotCleaned++;
    }
    
    // 2. Nettoyer Warm Context
    const warmExpired = contextManager.warmContext.findExpired(
      contextManager.WARM_TTL
    );
    for (const [path, file] of warmExpired) {
      await contextManager.demoteFromWarm();
      result.warmCleaned++;
    }
    
    // 3. Nettoyer Cold Context (supprimer obsolètes)
    const coldObsolete = await contextManager.coldContext.findObsolete();
    for (const path of coldObsolete) {
      await contextManager.coldContext.delete(path);
      result.coldCleaned++;
    }
    
    result.duration = Date.now() - startTime;
    
    logger.info('Context GC completed', {
      metadata: result
    });
    
    return result;
  }
  
  stopGC(): void {
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
  }
}
```

---

## 💾 Compression et Sérialisation

### 4. Compression Intelligente du Contexte

**IMPÉRATIF:** Compresser le contexte pour réduire l'utilisation mémoire.

**Pattern:**
```typescript
class ContextCompressor {
  async compressContext(
    context: ContextLevel
  ): Promise<CompressedContext> {
    const compressed: CompressedContext = {
      files: new Map(),
      metadata: {
        compressionRatio: 0,
        originalSize: 0,
        compressedSize: 0
      }
    };
    
    let originalSize = 0;
    let compressedSize = 0;
    
    for (const [path, file] of context.entries()) {
      // 1. Compresser contenu du fichier
      const fileContent = JSON.stringify(file.content);
      originalSize += fileContent.length;
      
      const compressedContent = await this.compress(fileContent);
      compressedSize += compressedContent.length;
      
      // 2. Extraire métadonnées essentielles
      const essentialMetadata = this.extractEssentialMetadata(file);
      
      compressed.files.set(path, {
        content: compressedContent,
        metadata: essentialMetadata,
        compressedAt: Date.now()
      });
    }
    
    compressed.metadata = {
      compressionRatio: originalSize / compressedSize,
      originalSize,
      compressedSize
    };
    
    logger.info('Context compressed', {
      metadata: compressed.metadata
    });
    
    return compressed;
  }
  
  async decompress(
    compressed: CompressedContext
  ): Promise<ContextLevel> {
    const decompressed = new Map();
    
    for (const [path, file] of compressed.files.entries()) {
      const content = await this.decompress(file.content);
      const parsedContent = JSON.parse(content);
      
      decompressed.set(path, {
        content: parsedContent,
        ...file.metadata,
        decompressedAt: Date.now()
      });
    }
    
    return decompressed;
  }
  
  private async compress(data: string): Promise<string> {
    // Utiliser zlib ou similaire
    return zlib.gzipSync(Buffer.from(data)).toString('base64');
  }
  
  private async decompress(data: string): Promise<string> {
    return zlib.gunzipSync(Buffer.from(data, 'base64')).toString();
  }
  
  private extractEssentialMetadata(file: ContextFile): EssentialMetadata {
    return {
      path: file.path,
      type: file.type,
      lastModified: file.lastModified,
      lastAccess: file.lastAccess,
      size: file.size,
      dependencies: file.dependencies
    };
  }
}
```

---

## 📊 Monitoring et Optimisation

### 5. Monitoring en Temps Réel

**IMPÉRATIF:** Monitorer en temps réel l'utilisation du contexte.

**Pattern:**
```typescript
class ContextMonitor {
  private metrics: ContextMetrics = {
    hotSize: 0,
    warmSize: 0,
    coldSize: 0,
    totalSize: 0,
    utilization: {
      hot: 0,
      warm: 0,
      cold: 0,
      total: 0
    },
    operations: {
      promotions: 0,
      demotions: 0,
      accesses: 0,
      gcRuns: 0
    },
    performance: {
      avgAccessTime: 0,
      avgPromotionTime: 0,
      avgDemotionTime: 0
    }
  };
  
  updateMetrics(contextManager: HierarchicalContextManager): void {
    // 1. Tailles
    this.metrics.hotSize = contextManager.hotContext.size;
    this.metrics.warmSize = contextManager.warmContext.size;
    this.metrics.coldSize = contextManager.coldContext.size;
    this.metrics.totalSize = this.metrics.hotSize + 
                              this.metrics.warmSize + 
                              this.metrics.coldSize;
    
    // 2. Utilisation
    this.metrics.utilization.hot = this.metrics.hotSize / contextManager.HOT_MAX;
    this.metrics.utilization.warm = this.metrics.warmSize / contextManager.WARM_MAX;
    this.metrics.utilization.total = (this.metrics.hotSize + this.metrics.warmSize) / 
                                      (contextManager.HOT_MAX + contextManager.WARM_MAX);
    
    // 3. Logger si utilisation critique
    if (this.metrics.utilization.total > 0.8) {
      logger.warn('Context utilization critical', {
        metadata: {
          utilization: this.metrics.utilization.total,
          hotSize: this.metrics.hotSize,
          warmSize: this.metrics.warmSize
        }
      });
      
      // Déclencher GC anticipé
      contextManager.gc.performGC(contextManager);
    }
  }
  
  getMetrics(): ContextMetrics {
    return { ...this.metrics };
  }
  
  logMetrics(): void {
    logger.info('Context metrics', {
      metadata: this.metrics
    });
  }
}
```

### 6. Optimisation Proactive

**IMPÉRATIF:** Optimiser proactivement avant saturation.

**Pattern:**
```typescript
class ProactiveContextOptimizer {
  private readonly OPTIMIZATION_THRESHOLD = 0.75; // 75%
  
  async optimizeIfNeeded(
    contextManager: HierarchicalContextManager,
    monitor: ContextMonitor
  ): Promise<OptimizationResult> {
    const metrics = monitor.getMetrics();
    
    // 1. Vérifier si optimisation nécessaire
    if (metrics.utilization.total < this.OPTIMIZATION_THRESHOLD) {
      return {
        optimized: false,
        reason: 'Utilization below threshold'
      };
    }
    
    logger.info('Proactive optimization triggered', {
      metadata: {
        utilization: metrics.utilization.total,
        threshold: this.OPTIMIZATION_THRESHOLD
      }
    });
    
    // 2. Stratégies d'optimisation
    const strategies = [
      this.compressWarmContext,
      this.demoteUnusedFiles,
      this.archiveOldCheckpoints,
      this.clearObsoleteCache
    ];
    
    const results: StrategyResult[] = [];
    
    for (const strategy of strategies) {
      const result = await strategy.call(this, contextManager);
      results.push(result);
      
      // Re-vérifier utilisation
      monitor.updateMetrics(contextManager);
      const newMetrics = monitor.getMetrics();
      
      if (newMetrics.utilization.total < this.OPTIMIZATION_THRESHOLD) {
        // Objectif atteint
        return {
          optimized: true,
          strategies: results,
          finalUtilization: newMetrics.utilization.total,
          reason: 'Optimization successful'
        };
      }
    }
    
    // 3. Si toujours critique, déclencher nettoyage agressif
    if (metrics.utilization.total > 0.9) {
      logger.warn('Aggressive cleanup triggered', {
        metadata: { utilization: metrics.utilization.total }
      });
      
      await this.aggressiveCleanup(contextManager);
    }
    
    return {
      optimized: true,
      strategies: results,
      finalUtilization: monitor.getMetrics().utilization.total,
      reason: 'Optimization completed'
    };
  }
  
  private async compressWarmContext(
    contextManager: HierarchicalContextManager
  ): Promise<StrategyResult> {
    const compressor = new ContextCompressor();
    const compressed = await compressor.compressContext(
      contextManager.warmContext
    );
    
    return {
      strategy: 'compress-warm',
      success: true,
      reduction: compressed.metadata.compressionRatio
    };
  }
  
  private async demoteUnusedFiles(
    contextManager: HierarchicalContextManager
  ): Promise<StrategyResult> {
    const now = Date.now();
    const unusedThreshold = 10 * 60 * 1000; // 10 minutes
    let demoted = 0;
    
    for (const [path, file] of contextManager.hotContext.entries()) {
      if (now - file.lastAccess > unusedThreshold) {
        await contextManager.demoteFromHot();
        demoted++;
      }
    }
    
    return {
      strategy: 'demote-unused',
      success: true,
      reduction: demoted
    };
  }
  
  private async archiveOldCheckpoints(
    contextManager: HierarchicalContextManager
  ): Promise<StrategyResult> {
    // Archiver checkpoints > 1 heure
    const archived = await contextManager.coldContext.archiveOldCheckpoints(
      60 * 60 * 1000
    );
    
    return {
      strategy: 'archive-checkpoints',
      success: true,
      reduction: archived
    };
  }
  
  private async clearObsoleteCache(
    contextManager: HierarchicalContextManager
  ): Promise<StrategyResult> {
    // Nettoyer cache obsolète
    const cleared = await contextManager.coldContext.clearObsoleteCache();
    
    return {
      strategy: 'clear-cache',
      success: true,
      reduction: cleared
    };
  }
  
  private async aggressiveCleanup(
    contextManager: HierarchicalContextManager
  ): Promise<void> {
    // 1. Rétrograder 50% du Hot Context
    const hotToKeep = Math.floor(contextManager.HOT_MAX * 0.5);
    while (contextManager.hotContext.size > hotToKeep) {
      await contextManager.demoteFromHot();
    }
    
    // 2. Rétrograder 50% du Warm Context
    const warmToKeep = Math.floor(contextManager.WARM_MAX * 0.5);
    while (contextManager.warmContext.size > warmToKeep) {
      await contextManager.demoteFromWarm();
    }
    
    // 3. Compresser tout le Warm Context
    const compressor = new ContextCompressor();
    await compressor.compressContext(contextManager.warmContext);
    
    logger.warn('Aggressive cleanup completed', {
      metadata: {
        hotSize: contextManager.hotContext.size,
        warmSize: contextManager.warmContext.size
      }
    });
  }
}
```

---

## ⚠️ Règles de Gestion du Contexte

### Ne JAMAIS:

**INTERDIT:**
- ❌ Dépasser les capacités maximales (Hot: 20, Warm: 30)
- ❌ Perdre des fichiers critiques
- ❌ Ignorer les alertes d'utilisation critique
- ❌ Désactiver le GC automatique
- ❌ Charger tout le projet en Hot Context

### TOUJOURS:

**OBLIGATOIRE:**
- ✅ Promouvoir/rétrograder automatiquement selon utilisation
- ✅ Monitorer en temps réel l'utilisation
- ✅ Optimiser proactivement avant saturation
- ✅ Compresser le Warm/Cold Context
- ✅ Exécuter GC régulièrement
- ✅ Logger toutes les opérations critiques
- ✅ Préserver les fichiers critiques

---

## 📊 Métriques et Objectifs

### Objectifs de Performance

- **Utilisation contexte:** <70% même après 6h
- **Temps d'accès Hot:** <10ms
- **Temps d'accès Warm:** <100ms
- **Temps d'accès Cold:** <500ms
- **GC frequency:** Toutes les 5 minutes
- **Compression ratio:** >3x pour Warm/Cold

### Métriques à Tracker

```typescript
interface ContextPerformanceMetrics {
  utilization: {
    hot: number;      // 0-1
    warm: number;     // 0-1
    total: number;    // 0-1
  };
  accessTimes: {
    hot: number;      // ms
    warm: number;     // ms
    cold: number;     // ms
  };
  operations: {
    promotions: number;
    demotions: number;
    accesses: number;
    gcRuns: number;
  };
  compression: {
    ratio: number;
    savings: number;  // bytes
  };
}
```

---

## 🔗 Intégration avec Règles Existantes

### Intégration avec `persistent-execution.md`
- Optimisation automatique du contexte toutes les 15 minutes
- Sauvegarde du contexte dans les checkpoints
- Restauration depuis checkpoints si nécessaire

### Intégration avec `context-optimization.md`
- Renforce l'optimisation existante avec hiérarchie
- Ajoute compression et archivage
- Améliore la gestion proactive

### Intégration avec `tool-call-limit-workaround.md`
- Contexte optimisé réduit le nombre de tool calls
- Checkpoints incluent snapshot du contexte
- Récupération rapide après interruption

---

## 📝 Checklist d'Utilisation

### Au Démarrage du Run

- [ ] Initialiser contexte hiérarchique
- [ ] Charger fichiers critiques en Hot Context
- [ ] Démarrer monitoring en temps réel
- [ ] Activer GC automatique
- [ ] Configurer optimisation proactive

### Pendant le Run

- [ ] Monitorer utilisation en continu
- [ ] Promouvoir/rétrograder automatiquement
- [ ] Optimiser si >75% d'utilisation
- [ ] Exécuter GC régulièrement
- [ ] Logger métriques toutes les 10 minutes

### À la Fin du Run

- [ ] Archiver contexte important
- [ ] Nettoyer contexte temporaire
- [ ] Sauvegarder métriques
- [ ] Générer rapport d'utilisation
- [ ] Stopper GC

---

## 🔗 Références

- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/context-optimization.md` - Optimisation du contexte
- `@.cursor/rules/tool-call-limit-workaround.md` - Contournement limites

---

**Note:** Ce système est CRITIQUE pour permettre des runs de 6+ heures sans saturation du contexte.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29
