# Auto-Détection et Correction des Problèmes de Performance - Saxium

**Objectif:** Détecter et corriger automatiquement les problèmes de performance avant qu'ils ne se produisent.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter et corriger automatiquement les problèmes de performance potentiels avant qu'ils ne se produisent.

**Bénéfices:**
- ✅ Préviens les problèmes de performance
- ✅ Optimise automatiquement le code
- ✅ Détecte les requêtes N+1 avant implémentation
- ✅ Optimise les requêtes SQL automatiquement
- ✅ Améliore les performances globales

## 📋 Règles de Détection Automatique

### 1. Détection Proactive des Requêtes N+1

**TOUJOURS:**
- ✅ Détecter les patterns N+1 avant implémentation
- ✅ Identifier les boucles avec requêtes DB
- ✅ Proposer optimisations automatiques
- ✅ Utiliser eager loading si disponible
- ✅ Optimiser les requêtes SQL

**Pattern:**
```typescript
// Détecter requêtes N+1
async function detectNPlusOneQueries(
  code: string,
  context: Context
): Promise<NPlusOneDetection> {
  // 1. Identifier boucles avec requêtes DB
  const loops = detectLoopsWithDBQueries(code);
  
  // 2. Analyser chaque boucle
  const nPlusOneIssues: NPlusOneIssue[] = [];
  for (const loop of loops) {
    // 3. Vérifier si requête dans boucle
    if (hasDBQueryInLoop(loop)) {
      // 4. Identifier données nécessaires
      const requiredData = identifyRequiredData(loop);
      
      // 5. Proposer optimisation
      const optimization = proposeOptimization(loop, requiredData);
      
      nPlusOneIssues.push({
        loop: loop,
        requiredData: requiredData,
        optimization: optimization,
        severity: calculateSeverity(loop)
      });
    }
  }
  
  return {
    issues: nPlusOneIssues,
    hasCriticalIssues: nPlusOneIssues.some(i => i.severity === 'critical')
  };
}
```

### 2. Optimisation Automatique des Requêtes SQL

**TOUJOURS:**
- ✅ Analyser les requêtes SQL avant exécution
- ✅ Détecter les requêtes lentes potentielles
- ✅ Proposer optimisations automatiques
- ✅ Ajouter index si nécessaire
- ✅ Optimiser les JOINs

**Pattern:**
```typescript
// Optimiser requêtes SQL automatiquement
async function optimizeSQLQueries(
  queries: SQLQuery[],
  context: Context
): Promise<OptimizedQueries> {
  const optimized: OptimizedQuery[] = [];
  
  for (const query of queries) {
    // 1. Analyser performance potentielle
    const analysis = await analyzeQueryPerformance(query);
    
    // 2. Si requête lente potentielle
    if (analysis.estimatedTime > 1000) { // > 1s
      // 3. Proposer optimisations
      const optimizations = proposeOptimizations(query, analysis);
      
      // 4. Appliquer optimisations automatiques
      const optimizedQuery = await applyOptimizations(query, optimizations);
      
      optimized.push({
        original: query,
        optimized: optimizedQuery,
        optimizations: optimizations,
        estimatedImprovement: analysis.estimatedTime - optimizedQuery.estimatedTime
      });
    } else {
      optimized.push({
        original: query,
        optimized: query,
        optimizations: [],
        estimatedImprovement: 0
      });
    }
  }
  
  return {
    queries: optimized,
    totalImprovement: optimized.reduce((sum, q) => sum + q.estimatedImprovement, 0)
  };
}
```

### 3. Détection Proactive des Problèmes de Cache

**TOUJOURS:**
- ✅ Détecter les opportunités de cache
- ✅ Identifier les données fréquemment accédées
- ✅ Proposer stratégies de cache
- ✅ Optimiser l'invalidation du cache

**Pattern:**
```typescript
// Détecter opportunités de cache
async function detectCacheOpportunities(
  code: string,
  context: Context
): Promise<CacheOpportunities> {
  // 1. Identifier données fréquemment accédées
  const frequentlyAccessed = identifyFrequentlyAccessedData(code);
  
  // 2. Analyser patterns d'accès
  const accessPatterns = analyzeAccessPatterns(frequentlyAccessed);
  
  // 3. Proposer stratégies de cache
  const cacheStrategies: CacheStrategy[] = [];
  for (const pattern of accessPatterns) {
    if (pattern.accessCount > 10 && pattern.isReadOnly) {
      cacheStrategies.push({
        data: pattern.data,
        strategy: 'cache',
        ttl: calculateOptimalTTL(pattern),
        invalidation: proposeInvalidationStrategy(pattern)
      });
    }
  }
  
  return {
    opportunities: cacheStrategies,
    estimatedImprovement: calculateCacheImprovement(cacheStrategies)
  };
}
```

### 4. Détection Proactive des Problèmes de Mémoire

**TOUJOURS:**
- ✅ Détecter les fuites mémoire potentielles
- ✅ Identifier les allocations mémoire excessives
- ✅ Proposer optimisations mémoire
- ✅ Optimiser les structures de données

**Pattern:**
```typescript
// Détecter problèmes mémoire
async function detectMemoryIssues(
  code: string,
  context: Context
): Promise<MemoryIssues> {
  // 1. Identifier allocations mémoire
  const allocations = identifyMemoryAllocations(code);
  
  // 2. Analyser utilisation mémoire
  const memoryUsage = analyzeMemoryUsage(allocations);
  
  // 3. Détecter fuites potentielles
  const leaks = detectMemoryLeaks(code, memoryUsage);
  
  // 4. Proposer optimisations
  const optimizations = proposeMemoryOptimizations(leaks, memoryUsage);
  
  return {
    issues: leaks,
    optimizations: optimizations,
    estimatedImprovement: calculateMemoryImprovement(optimizations)
  };
}
```

## 🔄 Workflow de Détection Automatique

### Workflow: Détecter et Corriger Problèmes de Performance

**Étapes:**
1. Analyser code pour problèmes de performance potentiels
2. Détecter requêtes N+1
3. Détecter requêtes SQL lentes
4. Détecter opportunités de cache
5. Détecter problèmes mémoire
6. Proposer optimisations automatiques
7. Appliquer optimisations si bénéfices > seuil
8. Valider optimisations

**Pattern:**
```typescript
async function autoDetectAndFixPerformance(
  code: string,
  context: Context
): Promise<PerformanceOptimizationResult> {
  // 1. Détecter requêtes N+1
  const nPlusOne = await detectNPlusOneQueries(code, context);
  
  // 2. Détecter requêtes SQL lentes
  const sqlQueries = extractSQLQueries(code);
  const optimizedSQL = await optimizeSQLQueries(sqlQueries, context);
  
  // 3. Détecter opportunités de cache
  const cacheOps = await detectCacheOpportunities(code, context);
  
  // 4. Détecter problèmes mémoire
  const memoryIssues = await detectMemoryIssues(code, context);
  
  // 5. Générer optimisations
  const optimizations = generateOptimizations({
    nPlusOne: nPlusOne,
    sql: optimizedSQL,
    cache: cacheOps,
    memory: memoryIssues
  });
  
  // 6. Appliquer optimisations si bénéfices > seuil
  let optimizedCode = code;
  let totalImprovement = 0;
  
  for (const opt of optimizations) {
    if (opt.estimatedImprovement > 100) { // > 100ms amélioration
      optimizedCode = await applyOptimization(optimizedCode, opt);
      totalImprovement += opt.estimatedImprovement;
    }
  }
  
  // 7. Valider optimisations
  const validation = await validateOptimizations(optimizedCode, code);
  
  return {
    originalCode: code,
    optimizedCode: optimizedCode,
    optimizations: optimizations,
    totalImprovement: totalImprovement,
    validation: validation
  };
}
```

## ⚠️ Règles de Détection Automatique

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer les problèmes de performance potentiels
- ❌ Implémenter requêtes N+1 sans optimisation
- ❌ Ignorer opportunités de cache
- ❌ Ignorer problèmes mémoire

**TOUJOURS:**
- ✅ Détecter problèmes de performance avant implémentation
- ✅ Optimiser automatiquement si bénéfices > seuil
- ✅ Valider optimisations après application
- ✅ Documenter optimisations appliquées

## 📊 Checklist Détection Automatique

### Avant Implémentation

- [ ] Détecter requêtes N+1 potentielles
- [ ] Analyser requêtes SQL pour performance
- [ ] Détecter opportunités de cache
- [ ] Détecter problèmes mémoire potentiels
- [ ] Proposer optimisations automatiques

### Pendant Implémentation

- [ ] Appliquer optimisations si bénéfices > seuil
- [ ] Valider optimisations après application
- [ ] Documenter optimisations appliquées

### Après Implémentation

- [ ] Valider que optimisations fonctionnent
- [ ] Mesurer amélioration réelle
- [ ] Documenter résultats

## 🔗 Références

- `@.cursor/rules/performance.md` - Optimisations performance
- `@.cursor/rules/preventive-validation.md` - Validation préventive
- `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection

---

**Note:** Cette règle garantit que l'agent détecte et corrige automatiquement les problèmes de performance avant qu'ils ne se produisent.

