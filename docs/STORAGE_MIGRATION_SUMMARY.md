# Résumé Migration storage-poc.ts → Repositories

**Date:** 2025-01-29  
**Statut:** Migration en cours  
**Dernière mise à jour:** 2025-01-29

---

## 📊 Progression

### Métriques

| Métrique | Avant | Après | Évolution |
|----------|-------|-------|-----------|
| **storage-poc.ts** | 3414 lignes | 3679 lignes | +265 lignes |
| **Méthodes Offer** | ❌ Non implémentées | ✅ Implémentées (7 méthodes) | +133 lignes |
| **Méthodes AO** | ❌ Non implémentées | ✅ Implémentées (7 méthodes) | +52 lignes |
| **Méthodes Project** | ❌ Non implémentées | ✅ Implémentées (6 méthodes) | +50 lignes |

### Méthodes Implémentées

#### Offer Operations ✅
- ✅ `getOffers()` - Délègue vers `OfferRepository.findAll()`
- ✅ `getOffersPaginated()` - Délègue vers `OfferRepository.findPaginated()`
- ✅ `getCombinedOffersPaginated()` - Implémentation simplifiée
- ✅ `getOffer()` - Délègue vers `OfferRepository.findById()`
- ✅ `createOffer()` - Délègue vers `OfferRepository.create()`
- ✅ `updateOffer()` - Délègue vers `OfferRepository.update()`
- ✅ `deleteOffer()` - Délègue vers `OfferRepository.delete()`

#### AO Operations ✅
- ✅ `getAos()` - Délègue vers `AoRepository.findAll()`
- ✅ `getAOsPaginated()` - Délègue vers `AoRepository.findPaginated()`
- ✅ `getAo()` - Délègue vers `AoRepository.findById()`
- ✅ `getAOByMondayItemId()` - Délègue vers `AoRepository.findByMondayId()`
- ✅ `createAo()` - Délègue vers `AoRepository.create()`
- ✅ `updateAo()` - Délègue vers `AoRepository.update()`
- ✅ `deleteAo()` - Délègue vers `AoRepository.delete()`

#### Project Operations ✅
- ✅ `getProjects()` - Délègue vers `ProductionRepository.findAll()`
- ✅ `getProjectsPaginated()` - Délègue vers `ProductionRepository.findPaginated()`
- ✅ `getProject()` - Délègue vers `ProductionRepository.findById()`
- ✅ `getProjectByMondayItemId()` - Délègue vers `ProductionRepository.findByMondayId()`
- ✅ `createProject()` - Délègue vers `ProductionRepository.create()`
- ✅ `updateProject()` - Délègue vers `ProductionRepository.update()`

---

## 🎯 Objectif

**Réduire storage-poc.ts de 3679 → <1000 lignes (-73%)**

### Stratégie

1. **Implémenter méthodes manquantes** ✅ (En cours)
   - Méthodes Offer ✅
   - Méthodes AO ✅
   - Méthodes Project ✅
   - Méthodes Supplier ⏳
   - Méthodes Chiffrage ⏳
   - Méthodes Contacts ⏳

2. **Migrer usages directs** ⏳
   - 15 fichiers utilisent `storage.getOffer*` directement
   - Migrer vers StorageFacade progressivement

3. **Supprimer méthodes migrées** ⏳
   - Une fois tous les usages migrés vers StorageFacade
   - Supprimer implémentations de DatabaseStorage
   - Supprimer déclarations de l'interface IStorage

---

## 📝 Notes Techniques

### Pattern de Délégation Utilisé

```typescript
// Lazy-loading pour éviter dépendances circulaires
private getOfferRepository() {
  if (!this.offerRepository) {
    const { OfferRepository } = require('./storage/commercial/OfferRepository');
    this.offerRepository = new OfferRepository();
  }
  return this.offerRepository;
}

// Délégation transparente
async getOffers(search?: string, status?: string): Promise<Offer[]> {
  const repo = this.getOfferRepository();
  const filters: { search?: string; status?: string } = {};
  if (search) filters.search = search;
  if (status) filters.status = status;
  return await repo.findAll(filters);
}
```

**Avantages:**
- ✅ Compatibilité TypeScript maintenue
- ✅ Pas de dépendances circulaires
- ✅ Chargement à la demande
- ✅ Migration progressive possible

---

## ⏳ Prochaines Étapes

### Immédiat

1. **Implémenter méthodes Supplier** (6 méthodes)
   - `getSuppliers()` → `SuppliersRepository.findAll()`
   - `getSupplier()` → `SuppliersRepository.findById()`
   - `createSupplier()` → `SuppliersRepository.create()`
   - `updateSupplier()` → `SuppliersRepository.update()`
   - `deleteSupplier()` → `SuppliersRepository.delete()`
   - `getSupplierByMondayItemId()` → `SuppliersRepository.findByMondayId()`

2. **Implémenter méthodes Chiffrage** (5 méthodes)
   - `getChiffrageElementsByOffer()` → `ChiffrageRepository.findByOffer()`
   - `getChiffrageElementsByLot()` → `ChiffrageRepository.findByLot()`
   - `createChiffrageElement()` → `ChiffrageRepository.create()`
   - `updateChiffrageElement()` → `ChiffrageRepository.update()`
   - `deleteChiffrageElement()` → `ChiffrageRepository.delete()`

### Court Terme

1. **Migrer usages directs**
   - Analyser chaque fichier des 15 identifiés
   - Remplacer `storage.get*` par `storageFacade.get*`
   - Vérifier imports

2. **Supprimer méthodes migrées**
   - Une fois tous les usages migrés
   - Supprimer implémentations
   - Supprimer déclarations interface

---

## 🔗 Références

- **Plan:** `docs/STORAGE_MIGRATION_PLAN.md`
- **Analyse:** `docs/STORAGE_MIGRATION_ANALYSIS.md`
- **Progression:** `docs/STORAGE_MIGRATION_PROGRESS.md`
- **Code:** `server/storage-poc.ts` lignes 1327-1541

