# Optimisation Performances Agent - Saxium

**Objectif:** Optimiser systématiquement les performances de l'agent Cursor pour réduire latence, améliorer efficacité et optimiser utilisation ressources.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT optimiser systématiquement ses performances en utilisant cache intelligent, parallélisation, optimisation contexte et priorisation intelligente.

**Problème identifié:** L'agent a des performances sous-optimales (latence élevée, saturation contexte, exécution séquentielle, pas de priorisation).

**Solution:** Optimisation systématique avec cache intelligent, parallélisation, optimisation contexte proactive et priorisation intelligente.

**Bénéfices:**
- ✅ Réduction latence ~50%
- ✅ Optimisation utilisation contexte
- ✅ Amélioration efficacité ~40-60%
- ✅ Priorisation intelligente tâches
- ✅ Détection automatique opportunités

**Référence:** `@.cursor/rules/search-cache.md` - Cache intelligent recherches (IMPÉRATIF)  
**Référence:** `@.cursor/rules/context-optimization.md` - Optimisation contexte (IMPÉRATIF)  
**Référence:** `@.cursor/rules/parallel-execution.md` - Exécution parallèle (IMPÉRATIF)  
**Référence:** `@.cursor/rules/batch-processing.md` - Traitement par lots (IMPÉRATIF)  
**Référence:** `@.cursor/rules/auto-performance-detection.md` - Détection performance (IMPÉRATIF)

## 📋 Optimisations Systématiques

### 1. Cache Intelligent Renforcé (IMPÉRATIF)

**IMPÉRATIF:** Utiliser cache intelligent pour toutes recherches, règles et résultats intermédiaires.

**TOUJOURS:**
- ✅ **Détecter recherches similaires avant exécution** (IMPÉRATIF - éviter recherches redondantes)
- ✅ **Cache recherches sémantiques avec TTL adaptatif** (IMPÉRATIF)
- ✅ **Cache règles chargées avec hash** (IMPÉRATIF - éviter rechargement)
- ✅ **Cache résultats intermédiaires** (IMPÉRATIF - éviter recalculs)
- ✅ **Invalidation intelligente cache** (IMPÉRATIF - éviter cache obsolète)
- ✅ **Réutilisation résultats similaires** (>80% similarité)

**Pattern:**
```typescript
// Cache intelligent consolidé
interface PerformanceCache {
  searches: Map<string, CachedSearch>;
  rules: Map<string, CachedRule>;
  results: Map<string, CachedResult>;
}

class PerformanceCacheManager {
  private cache: PerformanceCache;
  
  // 1. Cache recherche avec détection similitudes
  async getCachedSearch(
    query: string,
    targetDirectories: string[]
  ): Promise<SearchResult | null> {
    // Vérifier cache exact
    const exactKey = generateCacheKey(query, targetDirectories);
    const exact = this.cache.searches.get(exactKey);
    if (exact && !isExpired(exact)) {
      return exact.result;
    }
    
    // Chercher recherches similaires (IMPÉRATIF)
    const similar = await findSimilarSearches(query, targetDirectories, {
      similarityThreshold: 0.8,
      maxResults: 5
    });
    
    if (similar.length > 0 && similar[0].similarity > 0.8) {
      // Adapter résultats similaires
      return await adaptSearchResults(similar[0].result, query);
    }
    
    return null;
  }
  
  // 2. Cache règle avec hash
  async getCachedRule(rulePath: string): Promise<Rule | null> {
    const hash = await calculateRuleHash(rulePath);
    const cached = this.cache.rules.get(hash);
    
    if (cached && !isExpired(cached)) {
      return cached.rule;
    }
    
    return null;
  }
  
  // 3. Cache résultat intermédiaire
  async getCachedResult(key: string): Promise<any | null> {
    const cached = this.cache.results.get(key);
    
    if (cached && !isExpired(cached)) {
      return cached.result;
    }
    
    return null;
  }
}
```

### 2. Optimisation Contexte Proactive (IMPÉRATIF)

**IMPÉRATIF:** Détecter saturation proactive et agir automatiquement selon seuils.

**TOUJOURS:**
- ✅ **Surveiller utilisation contexte continue** (IMPÉRATIF - toutes les 5 minutes)
- ✅ **Agir automatiquement selon seuils** (IMPÉRATIF):
  - >60% utilisation → Éviction fichiers non essentiels
  - >70% utilisation → Compression fichiers volumineux
  - >80% utilisation → Activation Max Mode automatique
- ✅ **Compression automatique fichiers volumineux** (IMPÉRATIF)
- ✅ **Éviction fichiers non essentiels** (IMPÉRATIF)
- ✅ **Max Mode automatique si nécessaire** (IMPÉRATIF)

**Pattern:**
```typescript
// Optimisation contexte proactive
class ContextOptimizer {
  private contextUsage: number = 0;
  private checkInterval: NodeJS.Timeout;
  
  constructor() {
    // Surveiller contexte toutes les 5 minutes
    this.checkInterval = setInterval(() => {
      this.optimizeContextProactively();
    }, 5 * 60 * 1000);
  }
  
  async optimizeContextProactively(): Promise<void> {
    // 1. Mesurer utilisation contexte
    const usage = await this.measureContextUsage();
    this.contextUsage = usage;
    
    // 2. Agir selon seuils (IMPÉRATIF)
    if (usage > 80) {
      // Activation Max Mode automatique
      await this.activateMaxMode();
      logger.info('Max Mode activé automatiquement', {
        metadata: { usage }
      });
    } else if (usage > 70) {
      // Compression fichiers volumineux
      await this.compressLargeFiles();
      logger.info('Compression fichiers volumineux', {
        metadata: { usage }
      });
    } else if (usage > 60) {
      // Éviction fichiers non essentiels
      await this.evictNonEssentialFiles();
      logger.info('Éviction fichiers non essentiels', {
        metadata: { usage }
      });
    }
  }
  
  private async activateMaxMode(): Promise<void> {
    // Activation Max Mode (si disponible)
    // Note: Implémentation dépendante de l'API Cursor
  }
  
  private async compressLargeFiles(): Promise<void> {
    // Compression fichiers >1000 lignes
    const largeFiles = await this.identifyLargeFiles(1000);
    for (const file of largeFiles) {
      await this.compressFile(file);
    }
  }
  
  private async evictNonEssentialFiles(): Promise<void> {
    // Éviction fichiers non essentiels
    const nonEssential = await this.identifyNonEssentialFiles();
    await this.evictFiles(nonEssential);
  }
}
```

### 3. Parallélisation Systématique (IMPÉRATIF)

**IMPÉRATIF:** Exécuter opérations indépendantes en parallèle systématiquement.

**TOUJOURS:**
- ✅ **Détecter opérations parallélisables automatiquement** (IMPÉRATIF)
- ✅ **Exécuter opérations indépendantes en parallèle** (IMPÉRATIF)
- ✅ **Paralléliser recherches dans différents répertoires** (IMPÉRATIF)
- ✅ **Paralléliser lectures fichiers indépendants** (IMPÉRATIF)
- ✅ **Paralléliser validations indépendantes** (IMPÉRATIF)
- ✅ **Gérer erreurs parallèles** (IMPÉRATIF)

**Pattern:**
```typescript
// Parallélisation systématique
class ParallelExecutionManager {
  // Détecter opérations parallélisables
  detectParallelizableOperations(
    operations: Operation[]
  ): ParallelizableGroup[] {
    // 1. Analyser dépendances
    const dependencyGraph = buildDependencyGraph(operations);
    
    // 2. Identifier groupes parallélisables
    const groups: ParallelizableGroup[] = [];
    const processed = new Set<string>();
    
    for (const op of operations) {
      if (processed.has(op.id)) continue;
      
      // 3. Trouver opérations indépendantes
      const independent = findIndependentOperations(
        op,
        operations,
        dependencyGraph
      );
      
      if (independent.length > 1) {
        groups.push({
          operations: independent,
          canParallelize: true
        });
        independent.forEach(o => processed.add(o.id));
      }
    }
    
    return groups;
  }
  
  // Exécuter en parallèle
  async executeParallel(
    operations: Operation[]
  ): Promise<OperationResult[]> {
    // 1. Détecter groupes parallélisables
    const groups = this.detectParallelizableOperations(operations);
    
    // 2. Exécuter groupes en parallèle
    const results: OperationResult[] = [];
    
    for (const group of groups) {
      if (group.canParallelize) {
        // Exécuter opérations du groupe en parallèle
        const groupResults = await Promise.all(
          group.operations.map(op => this.executeOperation(op))
        );
        results.push(...groupResults);
      } else {
        // Exécuter séquentiellement si dépendances
        for (const op of group.operations) {
          const result = await this.executeOperation(op);
          results.push(result);
        }
      }
    }
    
    return results;
  }
}
```

### 4. Priorisation Intelligente Tâches (IMPÉRATIF)

**IMPÉRATIF:** Prioriser tâches selon impact, urgence et complexité.

**TOUJOURS:**
- ✅ **Analyser impact tâche** (utilisateur, système, business)
- ✅ **Analyser urgence tâche** (immédiate, haute, moyenne, basse)
- ✅ **Analyser complexité tâche** (simple, moyenne, complexe)
- ✅ **Calculer score priorité** (0-100)
- ✅ **Classifier priorité** (critique, haute, moyenne, basse)
- ✅ **Traiter tâches critiques en premier** (IMPÉRATIF)

**Pattern:**
```typescript
// Priorisation intelligente
interface TaskPriority {
  task: Task;
  priority: 'critical' | 'high' | 'medium' | 'low';
  score: number; // 0-100
  impact: {
    user: number; // 0-1
    system: number; // 0-1
    business: number; // 0-1
  };
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  complexity: 'simple' | 'medium' | 'complex';
}

class TaskPrioritizer {
  async prioritizeTask(task: Task): Promise<TaskPriority> {
    // 1. Analyser impact
    const impact = await this.analyzeImpact(task);
    
    // 2. Analyser urgence
    const urgency = await this.analyzeUrgency(task);
    
    // 3. Analyser complexité
    const complexity = await this.analyzeComplexity(task);
    
    // 4. Calculer score priorité
    const score = this.calculatePriorityScore(impact, urgency, complexity);
    
    // 5. Classifier priorité
    const priority = score >= 80 ? 'critical' :
                     score >= 60 ? 'high' :
                     score >= 40 ? 'medium' : 'low';
    
    return {
      task,
      priority,
      score,
      impact,
      urgency,
      complexity
    };
  }
  
  private calculatePriorityScore(
    impact: Impact,
    urgency: Urgency,
    complexity: Complexity
  ): number {
    // Formule: impact * 0.5 + urgence * 0.3 + (1 - complexité) * 0.2
    const impactScore = (impact.user + impact.system + impact.business) / 3;
    const urgencyScore = this.urgencyToNumber(urgency);
    const complexityScore = 1 - this.complexityToNumber(complexity);
    
    return (impactScore * 0.5 + urgencyScore * 0.3 + complexityScore * 0.2) * 100;
  }
  
  // Planifier exécution selon priorité
  async planExecution(tasks: Task[]): Promise<Task[]> {
    // 1. Prioriser toutes tâches
    const prioritized = await Promise.all(
      tasks.map(t => this.prioritizeTask(t))
    );
    
    // 2. Trier par priorité (critique → haute → moyenne → basse)
    const sorted = prioritized.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const orderDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (orderDiff !== 0) return orderDiff;
      return b.score - a.score;
    });
    
    return sorted.map(p => p.task);
  }
}
```

### 5. Détection Automatique Opportunités (IMPÉRATIF)

**IMPÉRATIF:** Détecter automatiquement opportunités d'optimisation.

**TOUJOURS:**
- ✅ **Détecter recherches répétitives** (IMPÉRATIF)
- ✅ **Détecter opérations parallélisables** (IMPÉRATIF)
- ✅ **Détecter saturation contexte** (IMPÉRATIF)
- ✅ **Détecter opportunités cache** (IMPÉRATIF)
- ✅ **Proposer optimisations automatiques** (IMPÉRATIF)
- ✅ **Appliquer optimisations si bénéfices > seuil** (IMPÉRATIF)

**Pattern:**
```typescript
// Détection automatique opportunités
class OpportunityDetector {
  async detectOptimizationOpportunities(
    context: Context
  ): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];
    
    // 1. Détecter recherches répétitives
    const repetitiveSearches = await this.detectRepetitiveSearches(context);
    if (repetitiveSearches.length > 0) {
      opportunities.push({
        type: 'cache-searches',
        description: 'Recherches répétitives détectées',
        benefit: this.calculateCacheBenefit(repetitiveSearches),
        action: () => this.cacheSearches(repetitiveSearches)
      });
    }
    
    // 2. Détecter opérations parallélisables
    const parallelizable = await this.detectParallelizableOperations(context);
    if (parallelizable.length > 0) {
      opportunities.push({
        type: 'parallelize',
        description: 'Opérations parallélisables détectées',
        benefit: this.calculateParallelBenefit(parallelizable),
        action: () => this.parallelizeOperations(parallelizable)
      });
    }
    
    // 3. Détecter saturation contexte
    const contextSaturation = await this.detectContextSaturation(context);
    if (contextSaturation > 70) {
      opportunities.push({
        type: 'optimize-context',
        description: 'Saturation contexte détectée',
        benefit: this.calculateContextBenefit(contextSaturation),
        action: () => this.optimizeContext(context)
      });
    }
    
    // 4. Trier par bénéfice décroissant
    return opportunities.sort((a, b) => b.benefit - a.benefit);
  }
  
  // Appliquer optimisations automatiquement
  async applyOptimizations(
    opportunities: OptimizationOpportunity[],
    threshold: number = 50
  ): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    
    for (const opp of opportunities) {
      if (opp.benefit > threshold) {
        const result = await opp.action();
        results.push({
          opportunity: opp,
          result,
          applied: true
        });
      }
    }
    
    return results;
  }
}
```

## 🔄 Workflow d'Optimisation Performances

### Workflow: Optimiser Performances Systématiquement

**Étapes:**
1. **Détecter opportunités optimisation** - Recherches répétitives, opérations parallélisables, saturation
2. **Prioriser tâches** - Impact, urgence, complexité
3. **Utiliser cache intelligent** - Recherches, règles, résultats
4. **Optimiser contexte** - Détection saturation, compression, éviction
5. **Paralléliser opérations** - Opérations indépendantes en parallèle
6. **Appliquer optimisations** - Si bénéfices > seuil
7. **Mesurer amélioration** - Latence, cache hit, contexte

**Pattern:**
```typescript
// Workflow optimisation performances
async function optimizeAgentPerformance(
  tasks: Task[],
  context: Context
): Promise<PerformanceOptimizationResult> {
  // 1. Détecter opportunités
  const detector = new OpportunityDetector();
  const opportunities = await detector.detectOptimizationOpportunities(context);
  
  // 2. Prioriser tâches
  const prioritizer = new TaskPrioritizer();
  const prioritizedTasks = await prioritizer.planExecution(tasks);
  
  // 3. Utiliser cache intelligent
  const cacheManager = new PerformanceCacheManager();
  const cachedSearches = await cacheManager.cacheSearches(prioritizedTasks);
  
  // 4. Optimiser contexte
  const contextOptimizer = new ContextOptimizer();
  await contextOptimizer.optimizeContextProactively();
  
  // 5. Paralléliser opérations
  const parallelManager = new ParallelExecutionManager();
  const parallelized = await parallelManager.executeParallel(prioritizedTasks);
  
  // 6. Appliquer optimisations
  const applied = await detector.applyOptimizations(opportunities, 50);
  
  // 7. Mesurer amélioration
  const metrics = await measurePerformanceImprovement({
    before: context.initialMetrics,
    after: context.currentMetrics
  });
  
  return {
    tasks: prioritizedTasks,
    opportunities: opportunities,
    applied: applied,
    metrics: metrics,
    improvement: metrics.improvement
  };
}
```

## ⚠️ Règles d'Optimisation Performances

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer cache pour recherches répétitives
- ❌ Exécuter opérations indépendantes séquentiellement
- ❌ Ignorer saturation contexte
- ❌ Traiter toutes tâches de la même manière
- ❌ Ignorer opportunités optimisation

**TOUJOURS:**
- ✅ Utiliser cache intelligent systématiquement
- ✅ Paralléliser opérations indépendantes
- ✅ Optimiser contexte proactive
- ✅ Prioriser tâches intelligemment
- ✅ Détecter opportunités automatiquement

## 📊 Checklist Optimisation Performances

### Avant Exécution

- [ ] Détecter opportunités optimisation
- [ ] Prioriser tâches (impact, urgence, complexité)
- [ ] Vérifier cache recherches/règles
- [ ] Vérifier utilisation contexte
- [ ] Identifier opérations parallélisables

### Pendant Exécution

- [ ] Utiliser cache intelligent
- [ ] Paralléliser opérations indépendantes
- [ ] Surveiller saturation contexte
- [ ] Optimiser contexte si nécessaire
- [ ] Appliquer optimisations automatiques

### Après Exécution

- [ ] Mesurer amélioration performances
- [ ] Analyser métriques (latence, cache hit, contexte)
- [ ] Documenter optimisations appliquées
- [ ] Ajuster stratégies selon résultats

## 🔗 Références

- `@.cursor/rules/transversality-enhancement.md` - Amélioration transversalité agent (vision globale, patterns)
- `@.cursor/rules/search-cache.md` - Cache intelligent recherches (IMPÉRATIF)
- `@.cursor/rules/context-optimization.md` - Optimisation contexte (IMPÉRATIF)
- `@.cursor/rules/parallel-execution.md` - Exécution parallèle (IMPÉRATIF)
- `@.cursor/rules/batch-processing.md` - Traitement par lots (IMPÉRATIF)
- `@.cursor/rules/auto-performance-detection.md` - Détection performance (IMPÉRATIF)
- `@.cursor/rules/agent-optimization.md` - Optimisation agent
- `@docs/AMELIORATION_PERFORMANCES_AGENT_2025-01-29.md` - Analyse performances

---

**Note:** Cette règle garantit que l'agent optimise systématiquement ses performances avec cache intelligent, parallélisation, optimisation contexte et priorisation intelligente.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

