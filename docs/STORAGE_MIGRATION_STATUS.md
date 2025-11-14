# État Migration storage-poc.ts → Repositories

**Date:** 2025-01-29  
**Statut:** Migration en cours  
**Objectif:** Réduire storage-poc.ts de 3414 → <1000 lignes (-70%)

---

## 📊 État Actuel

### Fichiers

- **storage-poc.ts:** 3414 lignes
- **StorageFacade.ts:** 3992 lignes
- **Repositories créés:** 11 repositories modulaires

### Méthodes Déjà Migrées dans StorageFacade

#### User Operations ✅
- `getUsers()` → UserRepository
- `getUser()` → UserRepository
- `getUserByEmail()` → UserRepository
- `getUserByUsername()` → UserRepository
- `getUserByMicrosoftId()` → UserRepository
- `createUser()` → UserRepository
- `upsertUser()` → UserRepository

#### Offer Operations ✅ (Partiellement)
- `getOffers()` → OfferRepository (avec fallback legacy)
- `getOffersPaginated()` → OfferRepository (avec fallback legacy)
- `getOffer()` → OfferRepository (avec fallback legacy)
- `createOffer()` → OfferRepository (avec fallback legacy)
- `updateOffer()` → OfferRepository (avec fallback legacy)
- `deleteOffer()` → OfferRepository (avec fallback legacy)

#### AO Operations ⏳ (Partiellement)
- `getAos()` → AoRepository (à vérifier)
- `getAOsPaginated()` → AoRepository (à vérifier)
- `getAo()` → AoRepository (à vérifier)
- `createAo()` → AoRepository (à vérifier)
- `updateAo()` → AoRepository (à vérifier)
- `deleteAo()` → AoRepository (à vérifier)

---

## 🎯 Prochaines Étapes

### Phase 1: Vérifier Implémentations storage-poc.ts

**Objectif:** Identifier les méthodes qui peuvent être supprimées

**Actions:**
1. [ ] Trouver toutes les implémentations de méthodes Offer dans storage-poc.ts
2. [ ] Vérifier si elles sont encore utilisées directement (pas via StorageFacade)
3. [ ] Identifier les méthodes qui peuvent être supprimées
4. [ ] Créer un script pour détecter les usages directs

### Phase 2: Supprimer Méthodes Migrées

**Objectif:** Supprimer les méthodes déjà migrées vers repositories

**Actions:**
1. [ ] Supprimer méthodes User migrées (7 méthodes)
2. [ ] Supprimer méthodes Offer migrées (6 méthodes)
3. [ ] Supprimer méthodes AO migrées (6 méthodes)
4. [ ] Vérifier que StorageFacade fonctionne toujours
5. [ ] Tests de non-régression

### Phase 3: Migrer Méthodes Restantes

**Objectif:** Migrer les méthodes restantes vers repositories

**Actions:**
1. [ ] Migrer méthodes Project vers ProductionRepository
2. [ ] Migrer méthodes Supplier vers SuppliersRepository
3. [ ] Migrer méthodes Chiffrage vers ChiffrageRepository
4. [ ] Migrer méthodes Contacts vers ContactsRepository
5. [ ] Migrer méthodes Documents vers DocumentsRepository
6. [ ] Migrer méthodes Date Intelligence vers DateIntelligenceRepository

---

## 📋 Checklist Migration

### Avant Suppression
- [ ] Vérifier que toutes les routes utilisent StorageFacade
- [ ] Vérifier qu'aucun code n'utilise directement storage-poc.ts
- [ ] Exécuter tests de non-régression

### Pendant Suppression
- [ ] Supprimer méthode par méthode
- [ ] Tester après chaque suppression
- [ ] Vérifier que StorageFacade fonctionne

### Après Suppression
- [ ] Vérifier que storage-poc.ts < 1000 lignes
- [ ] Vérifier que toutes les routes fonctionnent
- [ ] Exécuter tests de non-régression complets

---

## 🔍 Détection Usages Directs

Pour détecter les usages directs de storage-poc.ts:

```bash
# Chercher les imports directs
grep -r "from.*storage-poc" server/

# Chercher les usages de storage.
grep -r "storage\\.get" server/
grep -r "storage\\.create" server/
grep -r "storage\\.update" server/
grep -r "storage\\.delete" server/
```

---

## 📝 Notes

- Les méthodes dans StorageFacade utilisent un pattern de fallback vers legacyStorage
- Il faut vérifier que le fallback n'est plus nécessaire avant de supprimer les méthodes
- La migration doit être progressive pour éviter les régressions
- Chaque étape doit être testée individuellement

---

## 🎯 Objectifs

- **storage-poc.ts:** 3414 → <1000 lignes (-70%)
- **StorageFacade.ts:** Utilise uniquement repositories (pas de fallback legacy)
- **0 régression fonctionnelle**
- **Couverture tests:** ≥85% pour repositories

