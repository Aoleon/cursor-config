# Migration Services vers StorageFacade

**Date:** 2025-01-29  
**Statut:** En cours  
**Dernière mise à jour:** 2025-01-29

---

## 📊 Progression

### Services Migrés ✅

1. **PredictiveEngineService** ✅
   - Import: `IStorage` → `StorageFacade`
   - Constructeur: `storage: IStorage` → `storage: StorageFacade`
   - Utilise: `getProjectsPaginated()`, `getOffersPaginated()`, `getProjectDelayHistory()`

2. **BusinessAnalyticsService (AnalyticsEngineService)** ✅
   - Import: `IStorage` → `StorageFacade`
   - Constructeur: `storage: IStorage` → `storage: StorageFacade`
   - BaseCalculator: `storage: IStorage` → `storage: StorageFacade`
   - Fonction getter: `getBusinessAnalyticsService(storage: IStorage)` → `getBusinessAnalyticsService(storage: StorageFacade)`
   - Utilise: `getAos()`, `getOffers()`, `getProjects()`, `getAllTasks()`, `createKPISnapshot()`

3. **initialization.ts** ✅
   - Import: `IStorage` → `StorageFacade`
   - Fonction: `initializeServices(app, storage: IStorage)` → `initializeServices(app, storage: StorageFacade)`

4. **routes.ts** ✅
   - Utilise déjà `storageFacade` via `storageInterface`

---

## ⏳ Services Restants (25 fichiers)

### Services Critiques

1. **DateIntelligenceService**
   - Utilise: `storage.get*` (à vérifier)

2. **DateAlertDetectionService**
   - Utilise: `storage.get*` (à vérifier)

3. **ProjectFeedbackService**
   - Utilise: `storage.get*` (à vérifier)

4. **TimeTrackingService**
   - Utilise: `storage.get*` (à vérifier)

5. **SavWorkflowService**
   - Utilise: `storage.get*` (à vérifier)

6. **DocumentSyncService**
   - Utilise: `storage.get*` (à vérifier)

7. **OneDriveSyncService**
   - Utilise: `storage.get*` (à vérifier)

8. **SyncScheduler**
   - Utilise: `storage.get*` (à vérifier)

9. **SyncAuditService**
   - Utilise: `storage.get*` (à vérifier)

10. **ContextualOCREngine**
    - Utilise: `storage.get*` (à vérifier)

11. **PrevuVsReelService**
    - Utilise: `storage.get*` (à vérifier)

### Services Monday.com

12. **MondayMigrationService**
13. **MondayImportService**
14. **MondayExportService**
15. **MondayDataService**
16. **MondayDataSplitter**
17. **MondayProductionMigrationService**
18. **MondayMigrationServiceEnhanced**
19. **MondayProductionFinalService**
20. **MondayMigrationService** (duplicated?)

### Services Prédictifs

21. **RecommendationService**
22. **RiskAnalyzerService**
23. **ForecastService**

### Autres

24. **BeQualityChecklistService**
25. **PeriodicDetectionScheduler**

---

## 🔧 Pattern de Migration

### Étape 1: Remplacer Import

```typescript
// AVANT
import type { IStorage } from "../storage-poc";

// APRÈS
import type { StorageFacade } from "../storage/facade/StorageFacade";
```

### Étape 2: Remplacer Type dans Constructeur

```typescript
// AVANT
constructor(storage: IStorage) {
  this.storage = storage;
}

// APRÈS
constructor(storage: StorageFacade) {
  this.storage = storage;
}
```

### Étape 3: Remplacer Type dans Fonctions Getter

```typescript
// AVANT
export function getService(storage: IStorage): Service {
  return new Service(storage);
}

// APRÈS
export function getService(storage: StorageFacade): Service {
  return new Service(storage);
}
```

### Étape 4: Vérifier Utilisations

Les méthodes `storage.get*()` fonctionnent de la même manière car `StorageFacade` délègue vers les repositories ou `legacyStorage`.

---

## 📝 Notes

- **Compatibilité:** `StorageFacade` implémente toutes les méthodes de `IStorage` via délégation
- **Performance:** Pas d'impact, délégation transparente
- **Tests:** Aucun changement nécessaire, `StorageFacade` est compatible avec `IStorage`

---

## 🔗 Références

- **StorageFacade:** `server/storage/facade/StorageFacade.ts`
- **Routes:** `server/routes.ts`
- **Initialization:** `server/services/initialization.ts`

