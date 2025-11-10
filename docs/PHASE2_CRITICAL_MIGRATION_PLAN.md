# Plan de Migration Phase 2: Critique

**Date:** 2025-01-29  
**Statut:** ✅ Analyse terminée, migration en cours  
**Objectif:** Réduire routes-poc.ts et storage-poc.ts de ≥70%, réduire types any de 936 → <100

---

## 📊 État Actuel

### Fichiers Monolithiques

| Fichier | Lignes Actuelles | Cible | Réduction Requise |
|---------|------------------|-------|-------------------|
| `routes-poc.ts` | 1,066 | <350 | **-67%** |
| `storage-poc.ts` | 9,282 | <3,500 | **-62%** |

### Routes Restantes dans routes-poc.ts

**11 routes identifiées:**

1. **Monday.com (4 routes)** → Module `monday`
   - `GET /api/monday/migration-stats` (lignes 349-434)
   - `GET /api/monday/all-data` (lignes 440-599)
   - `GET /api/monday/validation` (lignes 605-670)
   - `GET /api/monday/logs` (lignes 676-714)

2. **Supplier Workflow (3 routes)** → Module `suppliers`
   - `POST /api/supplier-workflow/lot-suppliers` (lignes 724-759)
   - `GET /api/supplier-workflow/lot/:aoLotId/suppliers` (lignes 765-787)
   - `POST /api/supplier-workflow/sessions/create-and-invite` (lignes 793-860)

3. **AO Lots (2 routes)** → Module `commercial`
   - `GET /api/ao-lots/:id/comparison` (lignes 862-920)
   - `POST /api/ao-lots/:id/select-supplier` (lignes 926-980)

4. **Autres (2 routes)** → À analyser
   - Routes d'initialisation/services

### Méthodes Restantes dans storage-poc.ts

**8 méthodes identifiées:**

- **UserRepository (7 méthodes)** - Priorité: LOW
- **AoRepository (1 méthode)** - Priorité: LOW

### Types `any` Restants

- **routes-poc.ts:** 2 occurrences
- **storage-poc.ts:** 44 occurrences
- **Total server/:** 936 occurrences

---

## 🚀 Plan d'Action

### Étape 1: Migrer Routes Monday.com (Priorité: P1)

**Objectif:** Migrer 4 routes vers `server/modules/monday/routes.ts`

**Actions:**
1. Extraire routes de `routes-poc.ts` (lignes 349-714)
2. Ajouter routes dans `server/modules/monday/routes.ts`
3. Utiliser `MondayProductionFinalService` existant
4. Tester routes migrées
5. Supprimer routes de `routes-poc.ts`

**Résultat attendu:**
- `routes-poc.ts` : 1,066 → ~850 lignes (-20%)
- 4 routes migrées vers module monday

### Étape 2: Migrer Routes Supplier Workflow (Priorité: P2)

**Objectif:** Migrer 3 routes vers `server/modules/suppliers/routes.ts`

**Actions:**
1. Extraire routes de `routes-poc.ts` (lignes 724-860)
2. Ajouter routes dans `server/modules/suppliers/routes.ts`
3. Utiliser `storage` existant
4. Tester routes migrées
5. Supprimer routes de `routes-poc.ts`

**Résultat attendu:**
- `routes-poc.ts` : ~850 → ~700 lignes (-18%)
- 3 routes migrées vers module suppliers

### Étape 3: Migrer Routes AO Lots (Priorité: P2)

**Objectif:** Migrer 2 routes vers `server/modules/commercial/routes.ts`

**Actions:**
1. Extraire routes de `routes-poc.ts` (lignes 862-980)
2. Ajouter routes dans `server/modules/commercial/routes.ts`
3. Utiliser `storage` existant
4. Tester routes migrées
5. Supprimer routes de `routes-poc.ts`

**Résultat attendu:**
- `routes-poc.ts` : ~700 → ~600 lignes (-14%)
- 2 routes migrées vers module commercial

### Étape 4: Nettoyer routes-poc.ts (Priorité: P3)

**Objectif:** Réduire `routes-poc.ts` à <350 lignes

**Actions:**
1. Supprimer code mort
2. Extraire initialisation services vers `server/index.ts`
3. Nettoyer imports inutilisés
4. Optimiser structure

**Résultat attendu:**
- `routes-poc.ts` : ~600 → <350 lignes (-42%)
- **Total réduction: -67%** ✅

### Étape 5: Migrer Méthodes Storage (Priorité: P4)

**Objectif:** Migrer 8 méthodes vers repositories

**Actions:**
1. Migrer 7 méthodes UserRepository (priorité: LOW)
2. Migrer 1 méthode AoRepository (priorité: LOW)
3. Utiliser StorageFacade pour délégation
4. Tester méthodes migrées
5. Supprimer méthodes de `storage-poc.ts`

**Résultat attendu:**
- `storage-poc.ts` : 9,282 → ~8,500 lignes (-8%)
- 8 méthodes migrées vers repositories

### Étape 6: Réduire Types `any` (Priorité: P5)

**Objectif:** Réduire types `any` de 936 → <100

**Actions:**
1. Analyser chaque occurrence de `any`
2. Remplacer par types appropriés
3. Documenter cas exceptionnels
4. Prioriser routes-poc.ts et storage-poc.ts

**Résultat attendu:**
- Types `any` : 936 → <100 (-89%)
- Cas exceptionnels documentés

---

## 📋 Checklist

### Routes Monday.com

- [ ] Extraire `GET /api/monday/migration-stats`
- [ ] Extraire `GET /api/monday/all-data`
- [ ] Extraire `GET /api/monday/validation`
- [ ] Extraire `GET /api/monday/logs`
- [ ] Ajouter routes dans `server/modules/monday/routes.ts`
- [ ] Tester routes migrées
- [ ] Supprimer routes de `routes-poc.ts`

### Routes Supplier Workflow

- [ ] Extraire `POST /api/supplier-workflow/lot-suppliers`
- [ ] Extraire `GET /api/supplier-workflow/lot/:aoLotId/suppliers`
- [ ] Extraire `POST /api/supplier-workflow/sessions/create-and-invite`
- [ ] Ajouter routes dans `server/modules/suppliers/routes.ts`
- [ ] Tester routes migrées
- [ ] Supprimer routes de `routes-poc.ts`

### Routes AO Lots

- [ ] Extraire `GET /api/ao-lots/:id/comparison`
- [ ] Extraire `POST /api/ao-lots/:id/select-supplier`
- [ ] Ajouter routes dans `server/modules/commercial/routes.ts`
- [ ] Tester routes migrées
- [ ] Supprimer routes de `routes-poc.ts`

### Nettoyage routes-poc.ts

- [ ] Supprimer code mort
- [ ] Extraire initialisation services
- [ ] Nettoyer imports inutilisés
- [ ] Vérifier `routes-poc.ts` < 350 lignes

### Méthodes Storage

- [ ] Migrer 7 méthodes UserRepository
- [ ] Migrer 1 méthode AoRepository
- [ ] Tester méthodes migrées
- [ ] Supprimer méthodes de `storage-poc.ts`

### Types `any`

- [ ] Analyser occurrences dans routes-poc.ts
- [ ] Analyser occurrences dans storage-poc.ts
- [ ] Remplacer par types appropriés
- [ ] Documenter cas exceptionnels
- [ ] Vérifier types `any` < 100

---

## 📊 Métriques de Succès

### Avant Migration

| Métrique | Valeur |
|----------|--------|
| `routes-poc.ts` | 1,066 lignes |
| `storage-poc.ts` | 9,282 lignes |
| Types `any` | 936 occurrences |
| Routes restantes | 11 routes |
| Méthodes restantes | 8 méthodes |

### Après Migration (Cible)

| Métrique | Cible |
|----------|-------|
| `routes-poc.ts` | <350 lignes (-67%) |
| `storage-poc.ts` | <3,500 lignes (-62%) |
| Types `any` | <100 occurrences (-89%) |
| Routes restantes | 0 routes |
| Méthodes restantes | 0 méthodes |

---

## 🔗 Références

- **Script d'analyse:** `npm run migrate:phase2-critical`
- **Module monday:** `server/modules/monday/routes.ts`
- **Module suppliers:** `server/modules/suppliers/routes.ts`
- **Module commercial:** `server/modules/commercial/routes.ts`
- **StorageFacade:** `server/storage/facade/StorageFacade.ts`

---

## 📝 Commandes Rapides

```bash
# Analyser routes et méthodes restantes
npm run migrate:phase2-critical

# Audit dette technique
npm run audit:technical-debt

# Élimination automatique
npm run eliminate:technical-debt
```

---

**Note:** L'objectif est de réduire drastiquement la taille des fichiers monolithiques tout en garantissant la non-régression via tests exhaustifs.


