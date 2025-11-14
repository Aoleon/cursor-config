# Plan d'Amélioration Couverture Tests

## Objectifs

- **Backend:** 82% → 85% (+3%)
- **Frontend:** 78% → 80% (+2%)

## Services à Tester (Nouveaux)

### 1. ContextLoaderService
**Fichier:** `server/services/context/ContextLoaderService.ts`  
**Tests à créer:** `tests/backend/services/context/ContextLoaderService.test.ts`

**Cas de test:**
- `loadAoData()` - Chargement AO avec lots
- `loadOfferData()` - Chargement offre avec lots
- `loadProjectData()` - Chargement projet
- Gestion erreurs (NotFoundError)

### 2. ContextMetricsService
**Fichier:** `server/services/context/ContextMetricsService.ts`  
**Tests à créer:** `tests/backend/services/context/ContextMetricsService.test.ts`

**Cas de test:**
- `trackQuery()` - Suivi requêtes
- `resetMetrics()` - Réinitialisation
- `getMetrics()` - Récupération métriques
- `buildPerformance()` - Construction métriques performance

### 3. SQLPerformanceMonitor
**Fichier:** `server/services/SQLPerformanceMonitor.ts`  
**Tests à créer:** `tests/backend/services/SQLPerformanceMonitor.test.ts`

**Cas de test:**
- `recordQuery()` - Enregistrement requête lente
- `getRecentAlerts()` - Récupération alertes récentes
- `getStatistics()` - Statistiques
- Génération recommandations

### 4. CacheInvalidationService
**Fichier:** `server/services/cache/CacheInvalidationService.ts`  
**Tests à créer:** `tests/backend/services/cache/CacheInvalidationService.test.ts`

**Cas de test:**
- `invalidateOnEntityChange()` - Invalidation sur changement entité
- `addRule()` - Ajout règle
- Invalidation en cascade
- Intégration EventBus

### 5. ServiceInitialization
**Fichier:** `server/services/initialization.ts`  
**Tests à créer:** `tests/backend/services/initialization.test.ts`

**Cas de test:**
- `initializeServices()` - Initialisation tous services
- Disponibilité via app.get()
- Gestion erreurs initialisation

## Modules Migrés à Tester

### Modules Prioritaires (Impact élevé)

1. **chiffrage/** - Tests routes DPGF et chiffrage
2. **suppliers/** - Tests workflow fournisseurs
3. **projects/** - Tests gestion projets
4. **analytics/** - Tests KPIs et analytics

## Stratégie

1. **Phase 1:** Tests nouveaux services (4 services)
2. **Phase 2:** Tests modules migrés prioritaires
3. **Phase 3:** Tests intégration entre services

## Commandes

```bash
# Tests backend avec couverture
npm run test:backend -- --coverage

# Tests nouveaux services
npx vitest run --config vitest.backend.config.ts tests/backend/services/context
npx vitest run --config vitest.backend.config.ts tests/backend/services/cache

# Vérification couverture
npx vitest run --coverage --config vitest.backend.config.ts
```

