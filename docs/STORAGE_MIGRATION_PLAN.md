# Plan de Migration storage-poc.ts → Repositories

**Date:** 2025-01-29  
**Statut:** En cours  
**Objectif:** Réduire `storage-poc.ts` de 3414 → <1000 lignes (-70%)

---

## 📊 État Actuel

- **storage-poc.ts:** 3414 lignes
- **StorageFacade.ts:** 3992 lignes (délègue encore vers storage-poc.ts)
- **Repositories créés:** 11 repositories modulaires

### Repositories Existants

1. ✅ `UserRepository` - Users
2. ✅ `OfferRepository` - Offers
3. ✅ `AoRepository` - AOs
4. ✅ `ProductionRepository` - Projects, Tasks
5. ✅ `SuppliersRepository` - Suppliers
6. ✅ `ChiffrageRepository` - Chiffrage Elements
7. ✅ `DateIntelligenceRepository` - Date Intelligence
8. ✅ `DocumentsRepository` - Documents
9. ✅ `ConfigurationRepository` - Configuration
10. ✅ `ContactsRepository` - Contacts
11. ✅ `SavRepository` - SAV
12. ✅ `KpiRepository` (analytics) - KPIs

---

## 🎯 Plan de Migration

### Phase 1: Migration Méthodes Simples (Priorité 1)

**Objectif:** Migrer les méthodes CRUD simples vers les repositories existants

#### 1.1 User Operations
- [x] `getUsers()` → `UserRepository.getUsers()` ✅
- [x] `getUser(id)` → `UserRepository.findById(id)` ✅
- [ ] `getUserByEmail()` → `UserRepository.findByEmail()` (à vérifier)
- [ ] `getUserByUsername()` → `UserRepository.findByUsername()` (à vérifier)
- [ ] `upsertUser()` → `UserRepository.upsert()` (à vérifier)

#### 1.2 Offer Operations
- [ ] `getOffers()` → `OfferRepository.findAll()`
- [ ] `getOffersPaginated()` → `OfferRepository.findPaginated()`
- [ ] `getOffer(id)` → `OfferRepository.findById(id)`
- [ ] `createOffer()` → `OfferRepository.create()`
- [ ] `updateOffer()` → `OfferRepository.update()`
- [ ] `deleteOffer()` → `OfferRepository.delete()`

#### 1.3 AO Operations
- [ ] `getAos()` → `AoRepository.findAll()`
- [ ] `getAOsPaginated()` → `AoRepository.findPaginated()`
- [ ] `getAo(id)` → `AoRepository.findById(id)`
- [ ] `createAo()` → `AoRepository.create()`
- [ ] `updateAo()` → `AoRepository.update()`
- [ ] `deleteAo()` → `AoRepository.delete()`

#### 1.4 Project Operations
- [ ] `getProjects()` → `ProductionRepository.findProjects()`
- [ ] `getProjectsPaginated()` → `ProductionRepository.findProjectsPaginated()`
- [ ] `getProject(id)` → `ProductionRepository.findProjectById(id)`
- [ ] `createProject()` → `ProductionRepository.createProject()`
- [ ] `updateProject()` → `ProductionRepository.updateProject()`

#### 1.5 Supplier Operations
- [ ] `getSuppliers()` → `SuppliersRepository.findAll()`
- [ ] `getSupplier(id)` → `SuppliersRepository.findById(id)`
- [ ] `createSupplier()` → `SuppliersRepository.create()`
- [ ] `updateSupplier()` → `SuppliersRepository.update()`
- [ ] `deleteSupplier()` → `SuppliersRepository.delete()`

### Phase 2: Migration Méthodes Complexes (Priorité 2)

#### 2.1 Chiffrage Operations
- [ ] `getChiffrageElementsByOffer()` → `ChiffrageRepository.findByOffer()`
- [ ] `getChiffrageElementsByLot()` → `ChiffrageRepository.findByLot()`
- [ ] `createChiffrageElement()` → `ChiffrageRepository.create()`
- [ ] `updateChiffrageElement()` → `ChiffrageRepository.update()`
- [ ] `deleteChiffrageElement()` → `ChiffrageRepository.delete()`

#### 2.2 Date Intelligence Operations
- [ ] `getDateIntelligenceRules()` → `DateIntelligenceRepository.findRules()`
- [ ] `createDateIntelligenceRule()` → `DateIntelligenceRepository.createRule()`
- [ ] `getDateAlerts()` → `DateIntelligenceRepository.findAlerts()`
- [ ] `createDateAlert()` → `DateIntelligenceRepository.createAlert()`

#### 2.3 Contacts Operations
- [ ] `getMaitresOuvrage()` → `ContactsRepository.findMaitresOuvrage()`
- [ ] `getMaitreOuvrage(id)` → `ContactsRepository.findMaitreOuvrageById(id)`
- [ ] `findOrCreateMaitreOuvrage()` → `ContactsRepository.findOrCreateMaitreOuvrage()`
- [ ] `findOrCreateContact()` → `ContactsRepository.findOrCreateContact()`

### Phase 3: Migration Méthodes Analytics (Priorité 3)

#### 3.1 KPI Operations
- [x] `getConsolidatedKpis()` → `KpiRepository.getConsolidatedKpis()` ✅
- [ ] `getDashboardStats()` → `KpiRepository.getDashboardStats()` (à créer)

### Phase 4: Nettoyage Final (Priorité 4)

#### 4.1 Supprimer Méthodes Migrées
- [ ] Supprimer méthodes migrées de `storage-poc.ts`
- [ ] Mettre à jour `StorageFacade` pour utiliser uniquement repositories
- [ ] Vérifier que toutes les routes utilisent `StorageFacade`

#### 4.2 Tests de Non-Régression
- [ ] Tests unitaires pour chaque repository
- [ ] Tests d'intégration pour StorageFacade
- [ ] Tests E2E pour workflows critiques

---

## 📋 Checklist Migration

### Avant Migration
- [ ] Identifier toutes les méthodes à migrer
- [ ] Vérifier que les repositories existants ont les méthodes nécessaires
- [ ] Créer les méthodes manquantes dans les repositories

### Pendant Migration
- [ ] Migrer méthode par méthode
- [ ] Mettre à jour StorageFacade pour utiliser le repository
- [ ] Tester chaque migration
- [ ] Supprimer méthode de storage-poc.ts après validation

### Après Migration
- [ ] Vérifier que storage-poc.ts < 1000 lignes
- [ ] Vérifier que toutes les routes fonctionnent
- [ ] Exécuter tests de non-régression
- [ ] Documenter changements

---

## 🎯 Objectifs

- **storage-poc.ts:** 3414 → <1000 lignes (-70%)
- **StorageFacade.ts:** Utilise uniquement repositories (pas de délégation vers storage-poc.ts)
- **0 régression fonctionnelle**
- **Couverture tests:** ≥85% pour repositories

---

## 📝 Notes

- La migration doit être progressive pour éviter les régressions
- Chaque méthode migrée doit être testée individuellement
- StorageFacade doit maintenir la compatibilité avec IStorage pendant la migration
- Les méthodes complexes peuvent nécessiter plusieurs itérations

