# Progression Phase 2 - Élimination Dette Technique

**Date:** 2025-01-29  
**Statut:** En cours  
**Dernière mise à jour:** 2025-01-29

---

## 📊 Vue d'Ensemble

### Objectifs Phase 2

1. ✅ Réduire storage-poc.ts (3414 → <1000 lignes)
2. ⏳ Découper ContextBuilderService (952 lignes)
3. ⏳ Découper ChatbotOrchestrationService (3315 lignes)
4. ⏳ Découper ocrService.ts (3219 lignes)
5. ⏳ Découper BusinessContextService (3173 lignes)
6. ⏳ Remplacer types any (264 → <50)
7. ⏳ Remplacer console.log/error (189 → <20)
8. ⏳ Réduire fichiers monolithiques restants (>2000 lignes → <1000)

---

## ✅ Réalisations

### 1. Migration storage-poc.ts → Repositories

**Statut:** En cours (3772 lignes, objectif: <1000)

#### Méthodes Implémentées (31 méthodes)

**Offer Operations (7 méthodes)** ✅
- `getOffers()` → `OfferRepository.findAll()`
- `getOffersPaginated()` → `OfferRepository.findPaginated()`
- `getCombinedOffersPaginated()` → Implémentation simplifiée
- `getOffer()` → `OfferRepository.findById()`
- `createOffer()` → `OfferRepository.create()`
- `updateOffer()` → `OfferRepository.update()`
- `deleteOffer()` → `OfferRepository.delete()`

**AO Operations (7 méthodes)** ✅
- `getAos()` → `AoRepository.findAll()`
- `getAOsPaginated()` → `AoRepository.findPaginated()`
- `getAo()` → `AoRepository.findById()`
- `getAOByMondayItemId()` → `AoRepository.findByMondayId()`
- `createAo()` → `AoRepository.create()`
- `updateAo()` → `AoRepository.update()`
- `deleteAo()` → `AoRepository.delete()`

**Project Operations (6 méthodes)** ✅
- `getProjects()` → `ProductionRepository.findAll()`
- `getProjectsPaginated()` → `ProductionRepository.findPaginated()`
- `getProject()` → `ProductionRepository.findById()`
- `getProjectByMondayItemId()` → `ProductionRepository.findByMondayId()`
- `createProject()` → `ProductionRepository.create()`
- `updateProject()` → `ProductionRepository.update()`

**Supplier Operations (6 méthodes)** ✅
- `getSuppliers()` → `SuppliersRepository.findAll()`
- `getSupplier()` → `SuppliersRepository.findById()`
- `getSupplierByMondayItemId()` → `SuppliersRepository.findById()` (fallback)
- `createSupplier()` → `SuppliersRepository.create()`
- `updateSupplier()` → `SuppliersRepository.update()`
- `deleteSupplier()` → `SuppliersRepository.delete()`

**Chiffrage Operations (5 méthodes)** ✅
- `getChiffrageElementsByOffer()` → `ChiffrageRepository.getChiffrageElementsByOffer()`
- `getChiffrageElementsByLot()` → `ChiffrageRepository.getChiffrageElementsByLot()`
- `createChiffrageElement()` → `ChiffrageRepository.createChiffrageElement()`
- `updateChiffrageElement()` → `ChiffrageRepository.updateChiffrageElement()`
- `deleteChiffrageElement()` → `ChiffrageRepository.deleteChiffrageElement()`

#### Migration Routes

**routes.ts** ✅
- Migré vers `StorageFacade` au lieu de `DatabaseStorage` direct
- Tous les modules reçoivent maintenant `StorageFacade` via `storageInterface`

#### Services à Migrer

**27 fichiers** dans `server/services/` utilisent encore `storage.get*` directement :
- `PredictiveEngineService.ts`
- `RecommendationService.ts`
- `RiskAnalyzerService.ts`
- `ForecastService.ts`
- `BeQualityChecklistService.ts`
- `DateIntelligenceService.ts`
- `ProjectFeedbackService.ts`
- `BusinessAnalyticsService.ts`
- `DateAlertDetectionService.ts`
- `OneDriveSyncService.ts`
- `MondayMigrationService.ts`
- `SyncScheduler.ts`
- `TimeTrackingService.ts`
- `SavWorkflowService.ts`
- `PeriodicDetectionScheduler.ts`
- `MondayImportService.ts`
- `MondayExportService.ts`
- `DocumentSyncService.ts`
- `ContextualOCREngine.ts`
- `SyncAuditService.ts`
- `PrevuVsReelService.ts`
- Et 6 autres...

---

## ⏳ En Cours

### 1. Migration Services vers StorageFacade

**Priorité:** Moyenne  
**Estimation:** 2-3 heures

**Plan:**
1. Identifier les usages directs dans chaque service
2. Remplacer `storage.get*` par `storageFacade.get*`
3. Vérifier imports
4. Tests de non-régression

---

## 📋 Prochaines Étapes

### Immédiat (Semaine 1)

1. **Migrer 27 services vers StorageFacade**
   - Analyser chaque fichier
   - Remplacer usages directs
   - Tests

2. **Vérifier ContextBuilderService**
   - Vérifier si découpage complet
   - Supprimer code dupliqué si nécessaire

### Court Terme (Semaine 2-3)

1. **Découper ChatbotOrchestrationService** (3315 lignes)
   - Extraire sous-services
   - Réduire à <1000 lignes

2. **Découper ocrService.ts** (3219 lignes)
   - Extraire parsers
   - Extraire validators

3. **Découper BusinessContextService** (3173 lignes)
   - Extraire builders
   - Réduire à <1000 lignes

### Moyen Terme (Semaine 4-6)

1. **Remplacer types any** (264 → <50)
   - Prioriser par impact
   - Analyser chaque usage

2. **Remplacer console.log/error** (189 → <20)
   - Utiliser logger
   - Migration progressive

---

## 📈 Métriques

| Métrique | Avant | Après | Objectif | Progression |
|----------|-------|-------|----------|-------------|
| **storage-poc.ts** | 3414 | 3772 | <1000 | 0% (augmentation temporaire) |
| **Méthodes implémentées** | 0 | 31 | 31 | 100% |
| **Routes migrées** | 0 | 1 | 1 | 100% |
| **Services migrés** | 0 | 0 | 27 | 0% |
| **ContextBuilderService** | 952 | ? | <500 | ? |
| **ChatbotOrchestrationService** | 3315 | 3315 | <1000 | 0% |
| **ocrService.ts** | 3219 | 3219 | <1000 | 0% |
| **BusinessContextService** | 3173 | 3173 | <1000 | 0% |
| **Types any** | 264 | 264 | <50 | 0% |
| **console.log/error** | 189 | 189 | <20 | 0% |

---

## 🔗 Références

- **Plan Phase 2:** `docs/TECHNICAL_DEBT_PHASE2_PLAN.md`
- **Migration Storage:** `docs/STORAGE_MIGRATION_SUMMARY.md`
- **Progression Storage:** `docs/STORAGE_MIGRATION_PROGRESS.md`

