# Cache Intelligent des Recherches - Saxium

**Objectif:** Mettre en cache les résultats de recherche fréquents pour améliorer les performances et réduire la latence.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT mettre en cache les résultats de recherche fréquents pour éviter de refaire les mêmes recherches et améliorer les performances.

**Bénéfices:**
- ✅ Réduit la latence des recherches répétitives
- ✅ Améliore les performances de l'agent
- ✅ Évite les recherches redondantes
- ✅ Optimise l'utilisation des ressources
- ✅ Accélère le développement

## 📋 Règles de Cache Intelligent

### 1. Cache Automatique des Recherches Sémantiques

**TOUJOURS:**
- ✅ Mettre en cache les résultats de `codebase_search`
- ✅ Réutiliser les résultats de recherche similaires
- ✅ Invalider le cache si code modifié
- ✅ Limiter la taille du cache

**Pattern:**
```typescript
// Cache automatique des recherches
async function cachedCodebaseSearch(
  query: string,
  targetDirectories: string[],
  context: Context
): Promise<SearchResult> {
  // 1. Générer clé de cache
  const cacheKey = generateCacheKey(query, targetDirectories);
  
  // 2. Vérifier cache
  const cached = await getCachedSearch(cacheKey);
  if (cached && !isCacheExpired(cached)) {
    logger.info('Cache hit pour recherche', {
      metadata: { query, cacheKey }
    });
    return cached.result;
  }
  
  // 3. Effectuer recherche
  const result = await codebase_search(query, targetDirectories);
  
  // 4. Mettre en cache
  await setCachedSearch(cacheKey, result, {
    ttl: calculateTTL(query, result),
    invalidation: generateInvalidationRules(targetDirectories)
  });
  
  return result;
}
```

### 2. Cache Intelligent des Recherches Exactes

**TOUJOURS:**
- ✅ Mettre en cache les résultats de `grep`
- ✅ Réutiliser les résultats de recherche exacte similaires
- ✅ Invalider le cache si fichiers modifiés
- ✅ Optimiser les patterns de recherche

**Pattern:**
```typescript
// Cache intelligent des recherches exactes
async function cachedGrep(
  pattern: string,
  path: string,
  context: Context
): Promise<GrepResult> {
  // 1. Générer clé de cache
  const cacheKey = generateGrepCacheKey(pattern, path);
  
  // 2. Vérifier cache
  const cached = await getCachedGrep(cacheKey);
  if (cached && !isCacheExpired(cached) && !areFilesModified(cached.files, path)) {
    logger.info('Cache hit pour grep', {
      metadata: { pattern, path, cacheKey }
    });
    return cached.result;
  }
  
  // 3. Effectuer recherche
  const result = await grep(pattern, path);
  
  // 4. Identifier fichiers affectés
  const affectedFiles = identifyAffectedFiles(result, path);
  
  // 5. Mettre en cache
  await setCachedGrep(cacheKey, result, {
    ttl: calculateGrepTTL(pattern, result),
    files: affectedFiles,
    invalidation: generateFileInvalidationRules(affectedFiles)
  });
  
  return result;
}
```

### 3. Invalidation Intelligente du Cache

**TOUJOURS:**
- ✅ Invalider le cache si fichiers modifiés
- ✅ Invalider le cache si code modifié
- ✅ Invalider le cache si dépendances modifiées
- ✅ Optimiser l'invalidation pour éviter cache obsolète

**Pattern:**
```typescript
// Invalidation intelligente du cache
async function invalidateCacheIntelligently(
  modification: Modification,
  context: Context
): Promise<InvalidationResult> {
  // 1. Identifier fichiers affectés
  const affectedFiles = identifyAffectedFiles(modification, context);
  
  // 2. Identifier recherches affectées
  const affectedSearches = await identifyAffectedSearches(affectedFiles);
  
  // 3. Invalider cache des recherches affectées
  const invalidated = await invalidateSearches(affectedSearches);
  
  // 4. Invalider cache des dépendances
  const dependencies = await identifyDependencies(affectedFiles);
  const invalidatedDeps = await invalidateDependencyCache(dependencies);
  
  return {
    invalidated: invalidated.length + invalidatedDeps.length,
    searches: invalidated,
    dependencies: invalidatedDeps
  };
}
```

### 4. Réutilisation Intelligente des Résultats Similaires

**TOUJOURS:**
- ✅ Réutiliser les résultats de recherche similaires
- ✅ Adapter les résultats similaires au contexte actuel
- ✅ Éviter les recherches redondantes
- ✅ Optimiser les recherches similaires

**Pattern:**
```typescript
// Réutiliser résultats similaires
async function reuseSimilarSearchResults(
  query: string,
  targetDirectories: string[],
  context: Context
): Promise<SearchResult> {
  // 1. Chercher recherches similaires dans le cache
  const similarSearches = await findSimilarSearches(query, targetDirectories);
  
  // 2. Si recherche très similaire trouvée (> 80%)
  if (similarSearches.length > 0) {
    const bestMatch = similarSearches[0];
    
    if (bestMatch.similarity > 0.8) {
      // 3. Adapter résultats au contexte actuel
      const adapted = await adaptSearchResults(bestMatch.result, query, context);
      
      // 4. Mettre en cache adaptation
      await cacheAdaptedSearch(query, targetDirectories, adapted);
      
      return adapted;
    }
  }
  
  // 5. Effectuer nouvelle recherche si pas de match
  return await cachedCodebaseSearch(query, targetDirectories, context);
}
```

## 🔄 Workflow de Cache Intelligent

### Workflow: Recherche avec Cache Intelligent

**Étapes:**
1. Générer clé de cache
2. Vérifier cache existant
3. Si cache hit, retourner résultat
4. Si cache miss, chercher recherches similaires
5. Si recherche similaire trouvée, adapter résultats
6. Sinon, effectuer nouvelle recherche
7. Mettre en cache résultat
8. Invalider cache si fichiers modifiés

**Pattern:**
```typescript
async function searchWithIntelligentCache(
  query: string,
  targetDirectories: string[],
  context: Context
): Promise<SearchResult> {
  // 1. Générer clé de cache
  const cacheKey = generateCacheKey(query, targetDirectories);
  
  // 2. Vérifier cache
  const cached = await getCachedSearch(cacheKey);
  if (cached && !isCacheExpired(cached)) {
    return cached.result;
  }
  
  // 3. Chercher recherches similaires
  const similar = await reuseSimilarSearchResults(query, targetDirectories, context);
  if (similar.fromCache) {
    return similar.result;
  }
  
  // 4. Effectuer nouvelle recherche
  const result = await codebase_search(query, targetDirectories);
  
  // 5. Mettre en cache
  await setCachedSearch(cacheKey, result, {
    ttl: calculateTTL(query, result),
    invalidation: generateInvalidationRules(targetDirectories)
  });
  
  return result;
}
```

## ⚠️ Règles de Cache Intelligent

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer le cache pour recherches répétitives
- ❌ Utiliser cache obsolète
- ❌ Ne pas invalider le cache si fichiers modifiés
- ❌ Ignorer les recherches similaires

**TOUJOURS:**
- ✅ Mettre en cache les recherches fréquentes
- ✅ Réutiliser les résultats similaires
- ✅ Invalider le cache si fichiers modifiés
- ✅ Optimiser la taille du cache

## 📊 Checklist Cache Intelligent

### Avant Recherche

- [ ] Générer clé de cache
- [ ] Vérifier cache existant
- [ ] Chercher recherches similaires
- [ ] Réutiliser si similaire trouvé

### Pendant Recherche

- [ ] Effectuer recherche si cache miss
- [ ] Mettre en cache résultat
- [ ] Générer règles d'invalidation

### Après Modification

- [ ] Identifier fichiers affectés
- [ ] Invalider cache des recherches affectées
- [ ] Invalider cache des dépendances

## 🔗 Références

- `@.cursor/rules/context-search.md` - Recherche contextuelle avancée
- `@.cursor/rules/performance.md` - Optimisations performance
- `@.cursor/rules/context-optimization.md` - Gestion intelligente du contexte

---

**Note:** Cette règle garantit que l'agent met en cache les résultats de recherche fréquents pour améliorer les performances et réduire la latence.

