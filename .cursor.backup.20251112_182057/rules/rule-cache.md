# Cache Intelligent des Règles - Saxium

**Objectif:** Mettre en cache les règles fréquemment chargées pour optimiser le chargement et réduire la latence.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT mettre en cache les règles fréquemment chargées pour éviter de recharger les mêmes règles et améliorer les performances.

**Bénéfices:**
- ✅ Réduit la latence de chargement des règles
- ✅ Améliore les performances de l'agent
- ✅ Évite les rechargements redondants
- ✅ Optimise l'utilisation du contexte
- ✅ Accélère le développement

**Référence:** `@.cursor/rules/search-cache.md` - Cache intelligent des recherches

## 📋 Règles de Cache Intelligent

### 1. Cache Automatique des Règles P0

**TOUJOURS:**
- ✅ Mettre en cache les règles P0 (toujours chargées)
- ✅ Réutiliser le cache pour règles P0
- ✅ Invalider le cache uniquement si règles modifiées

**Pattern:**
```typescript
// Cache automatique des règles P0
class RuleCache {
  private p0Cache: Map<string, CachedRule> = new Map();
  private p1Cache: Map<string, CachedRule> = new Map();
  
  async getP0Rules(): Promise<string[]> {
    const cacheKey = 'p0-rules';
    
    // 1. Vérifier cache
    const cached = this.p0Cache.get(cacheKey);
    if (cached && !isCacheExpired(cached)) {
      logger.info('Cache hit pour règles P0', {
        metadata: { cacheKey }
      });
      return cached.rules;
    }
    
    // 2. Charger règles P0
    const rules = ['core.md', 'quality-principles.md', 'code-quality.md'];
    
    // 3. Mettre en cache
    this.p0Cache.set(cacheKey, {
      rules,
      timestamp: Date.now(),
      ttl: Infinity, // P0 toujours valide sauf modification
      invalidation: ['core.md', 'quality-principles.md', 'code-quality.md']
    });
    
    return rules;
  }
}
```

### 2. Cache Intelligent des Règles P1

**TOUJOURS:**
- ✅ Mettre en cache les règles P1 selon contexte
- ✅ Réutiliser le cache pour contextes similaires
- ✅ Invalider le cache si contexte change significativement

**Pattern:**
```typescript
// Cache intelligent des règles P1
async function getCachedP1Rules(
  context: Context,
  task: Task
): Promise<string[]> {
  // 1. Générer clé de cache basée sur contexte
  const cacheKey = generateContextCacheKey(context, task);
  
  // 2. Vérifier cache
  const cached = await getCachedP1Rules(cacheKey);
  if (cached && !isCacheExpired(cached) && !hasContextChanged(cached.context, context)) {
    logger.info('Cache hit pour règles P1', {
      metadata: { cacheKey, rules: cached.rules.length }
    });
    return cached.rules;
  }
  
  // 3. Charger règles P1 selon contexte
  const rules = await loadP1RulesForContext(context, task);
  
  // 4. Mettre en cache
  await setCachedP1Rules(cacheKey, {
    rules,
    context: snapshotContext(context),
    timestamp: Date.now(),
    ttl: calculateTTL(context, task),
    invalidation: generateInvalidationRules(context, task)
  });
  
  return rules;
}
```

### 3. Réutilisation Intelligente des Bundles

**TOUJOURS:**
- ✅ Mettre en cache les bundles fréquemment utilisés
- ✅ Réutiliser les bundles pour contextes similaires
- ✅ Invalider le cache si bundles modifiés

**Pattern:**
```typescript
// Cache intelligent des bundles
async function getCachedBundles(
  task: Task,
  context: Context
): Promise<string[]> {
  // 1. Identifier bundles nécessaires
  const neededBundles = await identifyNeededBundles(task, context);
  
  // 2. Vérifier cache pour chaque bundle
  const cachedBundles: string[] = [];
  const bundlesToLoad: string[] = [];
  
  for (const bundleId of neededBundles) {
    const cacheKey = `bundle-${bundleId}`;
    const cached = await getCachedBundle(cacheKey);
    
    if (cached && !isCacheExpired(cached)) {
      cachedBundles.push(...cached.rules);
    } else {
      bundlesToLoad.push(bundleId);
    }
  }
  
  // 3. Charger bundles non cachés
  const loadedBundles = await loadBundles(bundlesToLoad);
  
  // 4. Mettre en cache nouveaux bundles
  for (const bundleId of bundlesToLoad) {
    const bundle = loadedBundles[bundleId];
    await setCachedBundle(`bundle-${bundleId}`, {
      rules: bundle.rules,
      timestamp: Date.now(),
      ttl: calculateBundleTTL(bundleId),
      invalidation: generateBundleInvalidationRules(bundleId)
    });
  }
  
  return [...cachedBundles, ...Object.values(loadedBundles).flatMap(b => b.rules)];
}
```

### 4. Invalidation Intelligente du Cache

**TOUJOURS:**
- ✅ Invalider le cache si règles modifiées
- ✅ Invalider le cache si contexte change significativement
- ✅ Invalider le cache si dépendances modifiées
- ✅ Optimiser l'invalidation pour éviter cache obsolète

**Pattern:**
```typescript
// Invalidation intelligente du cache
async function invalidateRuleCacheIntelligently(
  modification: Modification,
  context: Context
): Promise<InvalidationResult> {
  // 1. Identifier règles affectées
  const affectedRules = identifyAffectedRules(modification, context);
  
  // 2. Invalider cache des règles affectées
  const invalidatedRules = await invalidateRules(affectedRules);
  
  // 3. Invalider cache des dépendances
  const dependencies = await identifyRuleDependencies(affectedRules);
  const invalidatedDeps = await invalidateDependencyCache(dependencies);
  
  // 4. Invalider cache des bundles contenant règles affectées
  const affectedBundles = await identifyAffectedBundles(affectedRules);
  const invalidatedBundles = await invalidateBundles(affectedBundles);
  
  return {
    invalidated: invalidatedRules.length + invalidatedDeps.length + invalidatedBundles.length,
    rules: invalidatedRules,
    dependencies: invalidatedDeps,
    bundles: invalidatedBundles
  };
}
```

## 🔄 Workflow de Cache Intelligent

### Workflow: Charger Règles avec Cache

**Étapes:**
1. Vérifier cache P0 (toujours valide sauf modification)
2. Générer clé de cache pour P1 selon contexte
3. Vérifier cache P1 pour contexte similaire
4. Si cache miss, charger règles P1
5. Mettre en cache règles P1
6. Vérifier cache bundles
7. Charger bundles non cachés
8. Mettre en cache nouveaux bundles
9. Invalider cache si règles modifiées

**Pattern:**
```typescript
async function loadRulesWithIntelligentCache(
  task: Task,
  context: Context
): Promise<RuleSet> {
  // 1. Charger règles P0 (cache permanent)
  const p0Rules = await getCachedP0Rules();
  
  // 2. Charger règles P1 avec cache
  const p1Rules = await getCachedP1Rules(context, task);
  
  // 3. Charger bundles avec cache
  const bundleRules = await getCachedBundles(task, context);
  
  // 4. Combiner toutes les règles
  const allRules = [
    ...p0Rules,
    ...p1Rules,
    ...bundleRules
  ];
  
  // 5. Dédupliquer
  const uniqueRules = [...new Set(allRules)];
  
  return {
    p0: p0Rules,
    p1: uniqueRules.filter(r => !p0Rules.includes(r)),
    total: uniqueRules.length,
    fromCache: {
      p0: true,
      p1: p1Rules.length > 0,
      bundles: bundleRules.length > 0
    }
  };
}
```

## ⚠️ Règles de Cache Intelligent

### Ne Jamais:

**BLOQUANT:**
- ❌ Utiliser cache obsolète
- ❌ Ne pas invalider le cache si règles modifiées
- ❌ Ignorer changements de contexte significatifs
- ❌ Ne pas mettre en cache règles fréquentes

**TOUJOURS:**
- ✅ Mettre en cache règles P0 (toujours valides)
- ✅ Mettre en cache règles P1 selon contexte
- ✅ Mettre en cache bundles fréquemment utilisés
- ✅ Invalider cache si règles modifiées
- ✅ Optimiser taille du cache

## 📊 Checklist Cache Intelligent

### Avant Chargement

- [ ] Vérifier cache P0
- [ ] Générer clé de cache pour P1
- [ ] Vérifier cache P1 pour contexte similaire
- [ ] Vérifier cache bundles

### Pendant Chargement

- [ ] Charger règles non cachées
- [ ] Mettre en cache nouvelles règles
- [ ] Mettre en cache nouveaux bundles
- [ ] Générer règles d'invalidation

### Après Modification

- [ ] Identifier règles affectées
- [ ] Invalider cache des règles affectées
- [ ] Invalider cache des dépendances
- [ ] Invalider cache des bundles affectés

## 🔗 Références

- `@.cursor/rules/search-cache.md` - Cache intelligent des recherches
- `@.cursor/rules/context-optimization.md` - Gestion intelligente du contexte
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
- `@.cursor/rules/rule-bundles.md` - Bundles de règles

---

**Note:** Ce cache intelligent permet d'optimiser le chargement des règles en évitant les rechargements redondants et en améliorant les performances.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

