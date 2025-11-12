# Invalidation Cache - Saxium

**Objectif:** Améliorer la logique d'invalidation du cache pour éviter les données obsolètes.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT implémenter une invalidation de cache fiable et cohérente pour éviter les données obsolètes.

**Bénéfices:**
- ✅ Élimination données obsolètes
- ✅ Cohérence données garantie
- ✅ Performance maintenue (cache efficace)
- ✅ Expérience utilisateur améliorée

## 📊 Détection Problèmes Cache

### 1. Identification Données Obsolètes

**TOUJOURS:**
- ✅ Détecter cache non invalidé après modification
- ✅ Identifier dépendances cache manquantes
- ✅ Analyser patterns d'invalidation
- ✅ Proposer corrections

**Pattern:**
```typescript
// Détecter cache obsolète
function detectStaleCache(cacheKey: string, data: any, lastModified: Date) {
  const cacheEntry = getCacheEntry(cacheKey);
  
  if (cacheEntry && cacheEntry.lastModified < lastModified) {
    return {
      issue: 'Cache obsolète',
      cacheKey,
      cacheTime: cacheEntry.lastModified,
      actualTime: lastModified,
      fix: 'Invalider cache après modification'
    };
  }
  
  return null;
}
```

### 2. Analyse Dépendances Cache

**TOUJOURS:**
- ✅ Identifier dépendances entre caches
- ✅ Détecter invalidations manquantes
- ✅ Analyser graphe de dépendances
- ✅ Proposer invalidations en cascade

**Pattern:**
```typescript
// Analyser dépendances cache
function analyzeCacheDependencies(cacheKey: string) {
  const dependencies = {
    direct: getDirectDependencies(cacheKey),
    indirect: getIndirectDependencies(cacheKey),
    dependents: getDependents(cacheKey)
  };
  
  return {
    cacheKey,
    dependencies,
    invalidationStrategy: proposeInvalidationStrategy(dependencies)
  };
}
```

## 🔧 Stratégies d'Invalidation

### 1. Invalidation par Événement

**TOUJOURS:**
- ✅ Utiliser EventBus pour invalidation
- ✅ Écouter événements de modification
- ✅ Invalider cache automatiquement
- ✅ Invalider dépendances en cascade

**Pattern:**
```typescript
// Invalidation par événement
eventBus.on('entity:updated', async (event: EntityUpdatedEvent) => {
  const { entityType, entityId } = event;
  
  // Invalider cache direct
  await invalidateCache(`${entityType}:${entityId}`);
  
  // Invalider dépendances
  const dependents = getCacheDependents(entityType);
  for (const dependent of dependents) {
    await invalidateCache(dependent);
  }
});
```

### 2. Invalidation par TTL Intelligent

**TOUJOURS:**
- ✅ Utiliser TTL adaptatif selon type données
- ✅ TTL court pour données fréquemment modifiées
- ✅ TTL long pour données stables
- ✅ Invalider avant expiration si modification

**Pattern:**
```typescript
// TTL intelligent
function getIntelligentTTL(dataType: string): number {
  const ttlMap = {
    'user': 3600, // 1h - données stables
    'project': 1800, // 30min - modifiées modérément
    'task': 300, // 5min - modifiées fréquemment
    'analytics': 7200 // 2h - calculées périodiquement
  };
  
  return ttlMap[dataType] || 1800; // Default 30min
}
```

### 3. Invalidation Tag-Based

**TOUJOURS:**
- ✅ Utiliser tags pour groupement cache
- ✅ Invalider par tag (tous caches avec tag)
- ✅ Gérer tags hiérarchiques
- ✅ Invalider tags dépendants

**Pattern:**
```typescript
// Invalidation tag-based
async function invalidateByTag(tag: string) {
  const cacheKeys = await getCacheKeysByTag(tag);
  
  for (const key of cacheKeys) {
    await invalidateCache(key);
  }
  
  // Invalider tags dépendants
  const dependentTags = getDependentTags(tag);
  for (const dependentTag of dependentTags) {
    await invalidateByTag(dependentTag);
  }
}
```

### 4. Invalidation Version-Based

**TOUJOURS:**
- ✅ Utiliser version pour cache
- ✅ Incrémenter version après modification
- ✅ Invalider cache avec ancienne version
- ✅ Valider version avant utilisation

**Pattern:**
```typescript
// Invalidation version-based
async function getCachedData(key: string) {
  const cacheEntry = await getCacheEntry(key);
  const currentVersion = await getCurrentVersion(key);
  
  if (cacheEntry && cacheEntry.version === currentVersion) {
    return cacheEntry.data;
  }
  
  // Cache invalide, recharger
  const data = await loadData(key);
  await setCacheEntry(key, data, currentVersion);
  
  return data;
}
```

## 📈 Validation Invalidation

### 1. Tests Invalidation

**TOUJOURS:**
- ✅ Tester invalidation après modification
- ✅ Tester invalidation en cascade
- ✅ Tester TTL expiration
- ✅ Vérifier pas de données obsolètes

**Pattern:**
```typescript
// Tester invalidation
test('cache invalidation after update', async () => {
  // Setup: mettre en cache
  await setCache('user:1', userData);
  
  // Action: modifier
  await updateUser(1, { name: 'New Name' });
  
  // Verify: cache invalidé
  const cached = await getCache('user:1');
  expect(cached).toBeNull();
  
  // Verify: nouvelles données chargées
  const fresh = await getUser(1);
  expect(fresh.name).toBe('New Name');
});
```

### 2. Monitoring Cache

**TOUJOURS:**
- ✅ Tracker hit/miss ratio
- ✅ Tracker invalidations
- ✅ Détecter patterns d'invalidation manquants
- ✅ Alerter si données obsolètes détectées

**Pattern:**
```typescript
// Monitorer cache
const cacheMetrics = {
  hits: 0,
  misses: 0,
  invalidations: 0,
  staleDetections: 0
};

function trackCacheAccess(key: string, hit: boolean) {
  if (hit) {
    cacheMetrics.hits++;
  } else {
    cacheMetrics.misses++;
  }
}

function trackInvalidation(key: string) {
  cacheMetrics.invalidations++;
}
```

## 🎯 Règles Spécifiques

### Cache Données Utilisateur

**TOUJOURS:**
- ✅ Invalider après modification profil
- ✅ Invalider après changement permissions
- ✅ Utiliser TTL 1h
- ✅ Invalider en cascade si organisation modifiée

### Cache Données Projet

**TOUJOURS:**
- ✅ Invalider après modification projet
- ✅ Invalider après modification tâches
- ✅ Utiliser TTL 30min
- ✅ Invalider listes projets si projet modifié

### Cache Analytics

**TOUJOURS:**
- ✅ Invalider après modification données sources
- ✅ Utiliser TTL 2h
- ✅ Invalider calculs dépendants
- ✅ Pré-calculer si possible

### Cache Requêtes SQL

**TOUJOURS:**
- ✅ Invalider après modification données
- ✅ Utiliser tags pour groupement
- ✅ Invalider par table modifiée
- ✅ Utiliser TTL court (5-15min)

## 🔗 Intégration

### Règles Associées

- `performance.md` - Optimisations performance
- `cache-optimization.md` - Optimisation cache
- `auto-performance-detection.md` - Détection performance

### Documentation

- `docs/project/activeContext.md` - Cache invalidation identifiée
- `docs/AGENT-METRICS.md` - Métriques cache

## ✅ Checklist

**Avant implémentation cache:**
- [ ] Identifier dépendances cache
- [ ] Planifier stratégie invalidation
- [ ] Définir TTL approprié
- [ ] Prévoir invalidations en cascade

**Pendant implémentation:**
- [ ] Implémenter invalidation par événement
- [ ] Configurer TTL intelligent
- [ ] Gérer dépendances cache
- [ ] Documenter stratégie

**Après implémentation:**
- [ ] Tester invalidation complète
- [ ] Monitorer hit/miss ratio
- [ ] Vérifier pas de données obsolètes
- [ ] Ajuster TTL si nécessaire

---

**Référence:** `@docs/project/activeContext.md` - Cache invalidation identifiée

