# Progression Migration storage-poc.ts

**Date:** 2025-01-29  
**Statut:** Migration en cours  
**Dernière mise à jour:** 2025-01-29

---

## 📊 État Actuel

### Métriques

- **storage-poc.ts:** 3547 lignes (était 3414, +133 lignes pour méthodes Offer)
- **StorageFacade.ts:** 3992 lignes
- **Méthodes Offer:** ✅ Implémentées dans DatabaseStorage (délégation vers OfferRepository)

### Découvertes

1. **Méthodes Offer manquantes**
   - Les méthodes Offer étaient déclarées dans `IStorage` mais non implémentées dans `DatabaseStorage`
   - Cela créait une incompatibilité TypeScript potentielle
   - **Solution:** Implémentation des méthodes avec délégation vers `OfferRepository`

2. **Usages directs**
   - 15 fichiers utilisent `storage.getOffer*` directement
   - Ces fichiers doivent être migrés vers `StorageFacade` progressivement

---

## ✅ Actions Complétées

### 1. Implémentation Méthodes Offer dans DatabaseStorage

**Méthodes ajoutées:**
- ✅ `getOffers()` - Délègue vers `OfferRepository.findAll()`
- ✅ `getOffersPaginated()` - Délègue vers `OfferRepository.findPaginated()`
- ✅ `getCombinedOffersPaginated()` - Implémentation simplifiée
- ✅ `getOffer()` - Délègue vers `OfferRepository.findById()`
- ✅ `createOffer()` - Délègue vers `OfferRepository.create()`
- ✅ `updateOffer()` - Délègue vers `OfferRepository.update()`
- ✅ `deleteOffer()` - Délègue vers `OfferRepository.delete()`

**Pattern utilisé:**
- Lazy-loading de `OfferRepository` pour éviter les dépendances circulaires
- Délégation transparente vers le repository
- Compatibilité maintenue avec l'interface `IStorage`

### 2. Documentation

- ✅ `docs/STORAGE_MIGRATION_ANALYSIS.md` - Analyse détaillée
- ✅ `docs/STORAGE_MIGRATION_STATUS.md` - État actuel
- ✅ `docs/STORAGE_MIGRATION_PLAN.md` - Plan de migration
- ✅ `docs/STORAGE_MIGRATION_PROGRESS.md` - Ce document

---

## ⏳ Actions En Cours

### 1. Migration Usages Directs

**15 fichiers à migrer:**
- `server/services/PredictiveEngineService.ts`
- `server/services/predictive/RecommendationService.ts`
- `server/services/predictive/ForecastService.ts`
- `server/routes-workflow.ts`
- `server/routes/validation-milestones.ts`
- `server/services/BeQualityChecklistService.ts`
- `server/routes/chiffrage.ts`
- `server/services/consolidated/BusinessAnalyticsService.ts`
- `server/modules/commercial/routes.ts`
- `server/modules/chiffrage/routes.ts`
- `server/services/DateAlertDetectionService.ts`
- `server/services/TimeTrackingService.ts`
- `server/seeders/mondaySeed-simple.ts`
- `server/services/PrevuVsReelService.ts`
- `server/storage/facade/StorageFacade.ts` (déjà migré)

**Plan:**
1. Identifier les usages dans chaque fichier
2. Remplacer `storage.getOffer*` par `storageFacade.getOffer*`
3. Vérifier que les imports utilisent `StorageFacade`
4. Tests de non-régression

### 2. Migration Méthodes AO

**Méthodes à migrer:**
- `getAos()` → `AoRepository.findAll()`
- `getAOsPaginated()` → `AoRepository.findPaginated()`
- `getAo()` → `AoRepository.findById()`
- `createAo()` → `AoRepository.create()`
- `updateAo()` → `AoRepository.update()`
- `deleteAo()` → `AoRepository.delete()`

---

## 🎯 Prochaines Étapes

### Immédiat (Semaine 1)

1. **Migrer usages directs Offer**
   - Analyser chaque fichier
   - Remplacer par StorageFacade
   - Tests de non-régression

2. **Implémenter méthodes AO dans DatabaseStorage**
   - Même pattern que Offer
   - Délégation vers AoRepository

### Court terme (Semaine 2-3)

1. **Migrer méthodes Project**
   - Vers ProductionRepository
   - Implémentation dans DatabaseStorage

2. **Migrer méthodes Supplier**
   - Vers SuppliersRepository
   - Implémentation dans DatabaseStorage

---

## 📝 Notes Techniques

### Pattern de Délégation

```typescript
// Pattern utilisé pour les méthodes Offer
async getOffers(search?: string, status?: string): Promise<Offer[]> {
  const repo = this.getOfferRepository();
  const filters: { search?: string; status?: string } = {};
  if (search) filters.search = search;
  if (status) filters.status = status;
  return await repo.findAll(filters);
}
```

### Lazy-Loading Repository

```typescript
private getOfferRepository() {
  if (!this.offerRepository) {
    const { OfferRepository } = require('./storage/commercial/OfferRepository');
    this.offerRepository = new OfferRepository();
  }
  return this.offerRepository;
}
```

**Avantages:**
- Évite les dépendances circulaires
- Chargement à la demande
- Compatibilité TypeScript

---

## 🔗 Références

- **Analyse:** `docs/STORAGE_MIGRATION_ANALYSIS.md`
- **Plan:** `docs/STORAGE_MIGRATION_PLAN.md`
- **État:** `docs/STORAGE_MIGRATION_STATUS.md`
- **Code:** `server/storage-poc.ts` lignes 1321-1389

