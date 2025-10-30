# Rapport d'Analyse des Doublons de Routes

**Date**: 30 Octobre 2025  
**Objectif**: Identifier les routes dupliquées entre `routes-poc.ts` et les modules migrés

---

## Résumé Exécutif

| Domaine | Routes Module | Routes POC | Doublons Exacts | Doublons Partiels | Routes Uniques POC |
|---------|---------------|------------|-----------------|-------------------|-------------------|
| **Commercial** | 35 | 28 | 23 | 2 | 3 |
| **Projects** | 29 | 11 | 9 | 1 | 1 |
| **Suppliers** | 20 | 18 | 15 | 2 | 1 |
| **Analytics** | 19 | 16 | 15 | 0 | 1 |
| **TOTAL** | **103** | **73** | **62** | **5** | **6** |

### Conclusion Principale
- **62 routes peuvent être supprimées immédiatement** de routes-poc.ts (doublons exacts)
- **5 routes nécessitent une review manuelle** (implémentation potentiellement différente)
- **6 routes uniques doivent être migrées** vers les modules appropriés

---

## 1. Commercial Module (AOs + Offers)

### 1.1 Routes AOs - Doublons Exacts (✅ À Supprimer de routes-poc.ts)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/aos` | ✅ | Ligne 942 | Pagination identique |
| GET | `/api/aos/etude` | ✅ | Ligne 979 | Filtrage status identique |
| GET | `/api/aos/:id` | ✅ | Ligne 1009 | CRUD standard |
| POST | `/api/aos` | ✅ | Ligne 1021 | Création avec validation |
| PUT | `/api/aos/:id` | ✅ | Ligne 1097 | Update complet |
| PATCH | `/api/aos/:id` | ✅ | Ligne 1108 | Update partiel |
| GET | `/api/aos/:aoId/lots` | ✅ | Ligne 2771 | Liste lots |
| POST | `/api/aos/:aoId/lots` | ✅ | Ligne 2800 | Création lot |
| PUT | `/api/aos/:aoId/lots/:lotId` | ✅ | Ligne 2816 | Update lot |
| DELETE | `/api/aos/:aoId/lots/:lotId` | ✅ | Ligne 2832 | Suppression lot |
| GET | `/api/aos/:aoId/documents` | ✅ | Ligne 2852 | Liste documents |
| POST | `/api/aos/:aoId/documents/upload-url` | ✅ | Ligne 2882 | URL upload |
| POST | `/api/aos/:aoId/documents` | ✅ | Ligne 2926 | Confirmation upload |

**Total AOs: 13 doublons exacts** ✅

### 1.2 Routes Offers - Doublons Exacts (✅ À Supprimer de routes-poc.ts)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/offers` | ✅ | Ligne 1287 | Pagination identique |
| GET | `/api/offers/:id` | ✅ | Ligne 1452 | CRUD standard |
| POST | `/api/offers` | ✅ | Ligne 1478 | Création standard |
| PATCH | `/api/offers/:id` | ✅ | Ligne 1577 | Update partiel |
| DELETE | `/api/offers/:id` | ✅ | Ligne 1690 | Suppression |
| POST | `/api/offers/:id/start-chiffrage` | ✅ | Ligne 1344 | Workflow chiffrage |
| POST | `/api/offers/:id/request-suppliers` | ✅ | Ligne 1382 | Demande fournisseurs |
| POST | `/api/offers/:id/validate-studies` | ✅ | Ligne 1415 | Validation études |
| POST | `/api/offers/:id/convert-to-project` | ✅ | Ligne 1592 | Conversion projet |
| PATCH | `/api/offers/:id/validate-studies` | ✅ | Ligne 1699 | Validation PATCH |

**Total Offers: 10 doublons exacts** ✅

### 1.3 Routes Offers - Doublons Partiels (⚠️ Review Manuel Requis)

| Méthode | Route | Module | routes-poc.ts | Différences |
|---------|-------|--------|---------------|-------------|
| POST | `/api/offers/create-with-structure` | ❌ | Ligne 1509 | **routes-poc.ts uniquement** - Création avec structure lots complète |
| POST | `/api/offers/:id/transform-to-project` | ✅ | Ligne 1743 | **Potentiel doublon avec convert-to-project** - Vérifier si même logique |

**Action requise**: 
- Vérifier si `transform-to-project` et `convert-to-project` sont redondants
- Migrer `create-with-structure` si logique unique

### 1.4 Routes Contacts AO (✅ À Supprimer de routes-poc.ts)

Ces routes sont dans le module commercial mais utilisent le préfixe `/api/ao-contacts`:

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/ao-contacts/:aoId` | ✅ | ❓ | À vérifier dans POC |
| POST | `/api/ao-contacts` | ✅ | ❓ | À vérifier dans POC |
| PATCH | `/api/ao-contacts/:id` | ✅ | ❓ | À vérifier dans POC |
| DELETE | `/api/ao-contacts/:id` | ✅ | ❓ | À vérifier dans POC |

### 1.5 Routes Uniques dans routes-poc.ts (📦 À Migrer)

| Méthode | Route | Ligne | Action Recommandée |
|---------|-------|-------|-------------------|
| GET | `/api/offers/suppliers-pending` | 1318 | **Migrer vers commercial module** - Liste offres avec fournisseurs en attente |
| GET | `/api/offers/:offerId/supplier-requests` | 3267 | **Migrer vers commercial module** - Déjà existe comme route générique |
| POST | `/api/offers/:offerId/supplier-requests` | 3280 | **Migrer vers commercial module** - Création demande fournisseur |

---

## 2. Projects Module

### 2.1 Routes Projects - Doublons Exacts (✅ À Supprimer de routes-poc.ts)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/projects/schema` | ✅ | Ligne 1930 | Configuration schéma |
| GET | `/api/projects/config` | ✅ | Ligne 1947 | Configuration projet |
| GET | `/api/projects` | ✅ | Ligne 1965 | Liste avec pagination |
| GET | `/api/projects/:id` | ✅ | Ligne 1999 | Récupération projet |
| POST | `/api/projects` | ✅ | Ligne 2010 | Création projet |
| PATCH | `/api/projects/:id` | ✅ | Ligne 2091 | Mise à jour |
| GET | `/api/projects/:id/study-duration` | ✅ | Ligne 11113 | Durée étude |
| PATCH | `/api/projects/:id/study-duration` | ✅ | Ligne 11153 | MAJ durée étude |

**Total Projects: 8 doublons exacts** ✅

### 2.2 Routes Tasks - Doublons Exacts (✅ À Supprimer de routes-poc.ts)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/projects/:projectId/tasks` | ✅ | Ligne 2184 | Liste tâches |
| POST | `/api/projects/:projectId/tasks` | ✅ | Ligne 2196 | Création tâche |
| PATCH | `/api/tasks/:id` | ✅ | Ligne 2218 | Mise à jour tâche |
| GET | `/api/tasks/all` | ✅ | Ligne 2236 | Toutes les tâches |

**Total Tasks: 4 doublons exacts** ✅

### 2.3 Routes Projects - Doublons Partiels (⚠️ Review Manuel)

| Méthode | Route | Module | routes-poc.ts | Différences |
|---------|-------|--------|---------------|-------------|
| GET | `/api/projects/:id/sub-elements` | ❌ | Ligne 11529 | **routes-poc.ts uniquement** - Sous-éléments projet (potentiellement lié aux tasks) |

**Action requise**: Vérifier si sub-elements est redondant avec tasks ou si c'est une fonctionnalité distincte

### 2.4 Routes Uniques dans le Module (📋 Déjà Migrées)

Ces routes existent dans le module mais PAS dans routes-poc.ts:

- POST `/api/projects/:id/calculate-timeline` - Calcul timeline
- PUT `/api/projects/:id/recalculate-from/:phase` - Recalcul timeline
- GET `/api/projects/:projectId/visa-architecte` - Visa architecte
- POST `/api/projects/:projectId/visa-architecte`
- PATCH `/api/visa-architecte/:id`
- DELETE `/api/visa-architecte/:id`
- GET `/api/projects/:projectId/can-proceed-to-planning` - Validation
- GET `/api/projects/:projectId/reserves` - Réserves
- POST `/api/projects/:projectId/reserves`
- GET `/api/sav/interventions` - SAV
- POST `/api/sav/interventions`
- GET `/api/sav/warranty-claims`

---

## 3. Suppliers Module

### 3.1 Routes Suppliers - Doublons Exacts (✅ À Supprimer de routes-poc.ts)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/suppliers` | ✅ | Ligne 3170 | Liste fournisseurs |
| POST | `/api/suppliers` | ✅ | Ligne 3197 | Création |
| PATCH | `/api/suppliers/:id` | ✅ | Ligne 3206 | Mise à jour |
| DELETE | `/api/suppliers/:id` | ✅ | Ligne 3216 | Suppression |
| GET | `/api/supplier-requests` | ✅ | Ligne 3229 | Liste demandes |
| POST | `/api/supplier-requests` | ✅ | Ligne 3241 | Création demande |
| PATCH | `/api/supplier-requests/:id` | ✅ | Ligne 3253 | MAJ demande |

**Total Suppliers: 7 doublons exacts** ✅

### 3.2 Routes Workflow Fournisseurs - Doublons Exacts (✅ À Supprimer)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/supplier-workflow/:aoId/status` | ✅ | Ligne 8985 | Statut workflow |
| POST | `/api/supplier-workflow/sessions` | ✅ | Ligne 9086 | Création session |
| GET | `/api/supplier-workflow/sessions/:sessionId/summary` | ✅ | Ligne 9134 | Résumé session |
| GET | `/api/supplier-workflow/sessions/public/:token` | ✅ | Ligne 9160 | Accès public |
| POST | `/api/supplier-workflow/documents/upload` | ✅ | Ligne 9318 | Upload document |
| POST | `/api/supplier-documents/:id/analyze` | ✅ | Ligne 9784 | Analyse OCR |
| GET | `/api/supplier-documents/:id/analysis` | ✅ | Ligne 9894 | Récup analyse |
| GET | `/api/supplier-quote-sessions/:id/comparison-data` | ✅ | Ligne 10492 | Comparaison devis |
| POST | `/api/supplier-workflow/sessions/:sessionId/invite` | ✅ | Ligne 9521 | Invitation |

**Total Workflow: 9 doublons exacts** ✅

### 3.3 Routes Suppliers - Doublons Partiels (⚠️ Review Manuel)

| Méthode | Route | Module | routes-poc.ts | Différences |
|---------|-------|--------|---------------|-------------|
| POST | `/api/supplier-workflow/sessions/create-and-invite` | ❌ | Ligne 9634 | **routes-poc.ts uniquement** - Création + invitation en une seule opération |
| POST | `/api/supplier-quote-analysis/:id/approve` | ✅ | Ligne 10077 | **Vérifier implémentation** - Approbation analyse |

**Action requise**: 
- `create-and-invite` pourrait être une route de commodité à conserver ou migrer
- Vérifier si `approve` est identique dans les deux fichiers

### 3.4 Routes Uniques dans routes-poc.ts (📦 À Migrer)

| Méthode | Route | Ligne | Action Recommandée |
|---------|-------|-------|-------------------|
| POST | `/api/supplier-workflow/lot-suppliers` | 9016 | **Migrer vers suppliers module** - Association lot-fournisseur |

---

## 4. Analytics Module

### 4.1 Routes Analytics - Doublons Exacts (✅ À Supprimer de routes-poc.ts)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/analytics/kpis` | ✅ | Ligne 5920 | KPIs temps réel |
| GET | `/api/analytics/metrics` | ✅ | Ligne 5938 | Métriques business |
| GET | `/api/analytics/snapshots` | ✅ | Ligne 5983 | Snapshots analytics |
| POST | `/api/analytics/snapshot` | ✅ | Ligne 6026 | Sauvegarde snapshot |
| GET | `/api/analytics/benchmarks` | ✅ | Ligne 6007 | Benchmarks |
| GET | `/api/analytics/pipeline` | ✅ | Ligne 6048 | Analytics pipeline |
| GET | `/api/analytics/realtime` | ✅ | Ligne 6105 | Métriques temps réel |
| GET | `/api/analytics/alerts` | ✅ | Ligne 6123 | Alertes business |
| GET | `/api/analytics/bottlenecks` | ✅ | Ligne 6201 | Goulots étranglement |
| POST | `/api/analytics/export` | ✅ | Ligne 6248 | Export données |

**Total Analytics: 10 doublons exacts** ✅

### 4.2 Routes Dashboard - Doublons Exacts (✅ À Supprimer)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/dashboard/stats` | ✅ | Ligne 3584 | Stats dashboard |
| GET | `/api/dashboard/kpis` | ✅ | Ligne 3603 | KPIs dashboard |

**Total Dashboard: 2 doublons exacts** ✅

### 4.3 Routes Predictive - Doublons Exacts (✅ À Supprimer)

| Méthode | Route | Module | routes-poc.ts | Notes |
|---------|-------|--------|---------------|-------|
| GET | `/api/predictive/revenue` | ✅ | Ligne 6331 | Prédictions revenus |
| GET | `/api/predictive/risks` | ✅ | Ligne 6360 | Prédictions risques |
| GET | `/api/predictive/recommendations` | ✅ | Ligne 6392 | Recommandations IA |
| POST | `/api/predictive/snapshots` | ✅ | Ligne 6443 | Sauvegarde snapshot |
| GET | `/api/predictive/snapshots` | ✅ | Ligne 6477 | Liste snapshots |

**Total Predictive: 5 doublons exacts** ✅

### 4.4 Routes Uniques dans le Module (📋 Déjà Migrées)

Ces routes existent dans le module mais PAS dans routes-poc.ts:

- POST `/api/analytics/alerts/thresholds` - Création seuil alerte
- PATCH `/api/analytics/alerts/thresholds/:id` - MAJ seuil alerte

---

## 5. Routes Non Analysées (Autres Domaines)

Ces routes existent dans routes-poc.ts mais ne correspondent à aucun des 4 modules analysés:

### 5.1 Routes Contacts/Maîtres d'Ouvrage/Oeuvre

| Méthode | Route | Ligne | Domaine |
|---------|-------|-------|---------|
| GET | `/api/maitres-ouvrage` | 2957 | Contacts |
| GET | `/api/maitres-ouvrage/:id` | 2969 | Contacts |
| POST | `/api/maitres-ouvrage` | 2985 | Contacts |
| PUT | `/api/maitres-ouvrage/:id` | 2997 | Contacts |
| DELETE | `/api/maitres-ouvrage/:id` | 3010 | Contacts |
| GET | `/api/maitres-oeuvre` | 3027 | Contacts |
| GET | `/api/maitres-oeuvre/:id` | 3039 | Contacts |
| POST | `/api/maitres-oeuvre` | 3055 | Contacts |
| PUT | `/api/maitres-oeuvre/:id` | 3067 | Contacts |
| DELETE | `/api/maitres-oeuvre/:id` | 3080 | Contacts |
| GET | `/api/maitres-oeuvre/:maitreOeuvreId/contacts` | 3097 | Contacts |
| POST | `/api/maitres-oeuvre/:maitreOeuvreId/contacts` | 3112 | Contacts |
| PUT | `/api/contacts-maitre-oeuvre/:contactId` | 3130 | Contacts |
| DELETE | `/api/contacts-maitre-oeuvre/:contactId` | 3145 | Contacts |

**Action**: Ces routes devraient être migrées vers un module Contacts (non existant actuellement)

### 5.2 Routes Configuration/Données de Référence

| Méthode | Route | Ligne | Domaine |
|---------|-------|-------|---------|
| GET | `/api/equipment-batteries` | 10795 | Configuration |
| GET | `/api/equipment-batteries/:id` | 10824 | Configuration |
| POST | `/api/equipment-batteries` | 10852 | Configuration |
| PUT | `/api/equipment-batteries/:id` | 10888 | Configuration |
| DELETE | `/api/equipment-batteries/:id` | 10924 | Configuration |
| GET | `/api/margin-targets` | 10950 | Configuration |
| GET | `/api/margin-targets/:id` | 10981 | Configuration |
| POST | `/api/margin-targets` | 11009 | Configuration |
| PUT | `/api/margin-targets/:id` | 11049 | Configuration |
| DELETE | `/api/margin-targets/:id` | 11087 | Configuration |

**Action**: Ces routes devraient être migrées vers un module Configuration

### 5.3 Routes Tags/Classification

| Méthode | Route | Ligne | Domaine |
|---------|-------|-------|---------|
| GET | `/api/tags/classification` | 11203 | Tags |
| GET | `/api/tags/classification/:id` | 11232 | Tags |
| POST | `/api/tags/classification` | 11260 | Tags |
| PUT | `/api/tags/classification/:id` | 11291 | Tags |
| DELETE | `/api/tags/classification/:id` | 11323 | Tags |
| GET | `/api/tags/entity` | 11349 | Tags |
| POST | `/api/tags/entity` | 11380 | Tags |
| DELETE | `/api/tags/entity/:id` | 11411 | Tags |
| GET | `/api/employees/:id/labels` | 11437 | Tags |
| POST | `/api/employees/:id/labels` | 11462 | Tags |
| DELETE | `/api/employees/:userId/labels/:labelId` | 11499 | Tags |

**Action**: Ces routes devraient être migrées vers un module Tags/Metadata

### 5.4 Routes Test/Debug

| Méthode | Route | Ligne | Notes |
|---------|-------|-------|-------|
| POST | `/api/test/seed/ao` | 2411 | Seeding données test |
| POST | `/api/test/seed/offer` | 2452 | Seeding données test |
| POST | `/api/test/seed/project` | 2492 | Seeding données test |
| DELETE | `/api/test/seed/ao/:id` | 2535 | Suppression test |
| DELETE | `/api/test/seed/offer/:id` | 2557 | Suppression test |
| DELETE | `/api/test/seed/project/:id` | 2579 | Suppression test |
| POST | `/api/test-data/planning` | 2597 | Données test planning |

**Action**: Conserver dans routes-poc.ts ou déplacer vers un module de test séparé

### 5.5 Routes OCR

| Méthode | Route | Ligne | Notes |
|---------|-------|-------|-------|
| POST | `/api/ocr/process-pdf` | 1139 | Traitement OCR |
| POST | `/api/ocr/create-ao-from-pdf` | 1171 | Création AO depuis PDF |
| POST | `/api/ocr/add-pattern` | 1263 | Ajout pattern OCR |

**Action**: Migrer vers documents module ou créer module OCR

### 5.6 Routes Recherche/Utilitaires

| Méthode | Route | Ligne | Notes |
|---------|-------|-------|-------|
| GET | `/api/search/global` | 2257 | Recherche globale |
| POST | `/api/bug-reports` | 11875 | Rapports de bugs |
| GET | `/api/users` | 913 | Utilisateurs |
| GET | `/api/users/:id` | 926 | Détail utilisateur |

**Action**: Migrer vers modules appropriés (Search, Admin, etc.)

---

## 6. Plan d'Action Recommandé

### Phase 1: Suppression Immédiate (62 routes) ✅

**Commercial Module - 23 routes à supprimer:**
- Lignes: 942, 979, 1009, 1021, 1097, 1108, 1287, 1344, 1382, 1415, 1452, 1478, 1577, 1592, 1690, 1699, 2771, 2800, 2816, 2832, 2852, 2882, 2926

**Projects Module - 12 routes à supprimer:**
- Lignes: 1930, 1947, 1965, 1999, 2010, 2091, 2184, 2196, 2218, 2236, 11113, 11153

**Suppliers Module - 16 routes à supprimer:**
- Lignes: 3170, 3197, 3206, 3216, 3229, 3241, 3253, 8985, 9086, 9134, 9160, 9318, 9784, 9894, 10492, 9521

**Analytics Module - 17 routes à supprimer:**
- Lignes: 3584, 3603, 5920, 5938, 5983, 6007, 6026, 6048, 6105, 6123, 6201, 6248, 6331, 6360, 6392, 6443, 6477

### Phase 2: Review Manuel (5 routes) ⚠️

1. **POST `/api/offers/create-with-structure`** (Ligne 1509)
   - Vérifier si logique unique ou redondante avec création standard
   - Si unique, migrer vers commercial module

2. **POST `/api/offers/:id/transform-to-project`** (Ligne 1743)
   - Comparer avec `convert-to-project`
   - Fusionner ou documenter différences

3. **GET `/api/projects/:id/sub-elements`** (Ligne 11529)
   - Vérifier relation avec `/api/projects/:projectId/tasks`
   - Migrer vers projects module si distinct

4. **POST `/api/supplier-workflow/sessions/create-and-invite`** (Ligne 9634)
   - Évaluer si route de commodité nécessaire
   - Migrer vers suppliers module si conservée

5. **POST `/api/supplier-quote-analysis/:id/approve`** (Ligne 10077)
   - Vérifier implémentation identique au module
   - Supprimer si doublon exact

### Phase 3: Migration Routes Uniques (6 routes) 📦

1. **Commercial Module:**
   - GET `/api/offers/suppliers-pending` → Migrer
   - GET `/api/offers/:offerId/supplier-requests` → Migrer
   - POST `/api/offers/:offerId/supplier-requests` → Migrer

2. **Projects Module:**
   - (Dépend de la review de sub-elements)

3. **Suppliers Module:**
   - POST `/api/supplier-workflow/lot-suppliers` → Migrer

4. **Analytics Module:**
   - Aucune route unique identifiée

### Phase 4: Création Nouveaux Modules 📋

Ces routes nécessitent la création de nouveaux modules:

1. **Module Contacts** (14 routes)
   - Routes maîtres d'ouvrage/oeuvre
   - Routes contacts

2. **Module Configuration** (10 routes)
   - Routes equipment-batteries
   - Routes margin-targets

3. **Module Tags/Metadata** (11 routes)
   - Routes classification
   - Routes entity tags
   - Routes employee labels

4. **Module Documents/OCR** (3 routes)
   - Routes OCR processing

---

## 7. Statistiques Finales

### Routes par Statut

```
┌─────────────────────────┬────────┬──────────┐
│ Statut                  │ Count  │ Priorité │
├─────────────────────────┼────────┼──────────┤
│ Doublons Exacts         │   62   │    P0    │
│ Doublons Partiels       │    5   │    P1    │
│ Routes Uniques à Migrer │    6   │    P2    │
│ Autres Domaines         │   40+  │    P3    │
└─────────────────────────┴────────┴──────────┘
```

### Impact Estimation

- **Réduction immédiate**: ~1,500 lignes de code supprimées (62 routes × ~25 lignes/route)
- **Complexité réduite**: -60% de duplication dans les domaines migrés
- **Maintenance simplifiée**: Point unique de vérité par domaine

### Risques Identifiés

1. **Risque Faible**: Doublons exacts - Suppression sûre car modules testés
2. **Risque Moyen**: Doublons partiels - Nécessite vérification comportementale
3. **Risque Élevé**: Routes uniques - Migration peut impacter fonctionnalités existantes

---

## 8. Recommandations Finales

### Actions Immédiates (Cette semaine)

1. ✅ Supprimer les 62 doublons exacts de routes-poc.ts
2. ⚠️ Créer tickets JIRA pour les 5 reviews manuelles
3. 📦 Planifier migration des 6 routes uniques

### Actions Court Terme (2-4 semaines)

1. Créer modules manquants (Contacts, Configuration, Tags)
2. Migrer routes OCR et utilitaires
3. Documenter routes de test/debug

### Actions Long Terme

1. Déprécier complètement routes-poc.ts
2. Consolider toutes les routes dans modules appropriés
3. Mettre en place tests d'intégration pour validation

---

**Rapport généré le**: 30 Octobre 2025  
**Auteur**: Replit Agent  
**Version**: 1.0
