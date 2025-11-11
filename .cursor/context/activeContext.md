# Active Context - Saxium

**Dernière mise à jour:** 2025-01-29  
**Statut:** En cours de développement actif

---

## 🎯 Focus de Travail Actuel

### Migration Modulaire (En Cours)
**Objectif:** Refactoriser `server/routes-poc.ts` (11,647 lignes) vers architecture modulaire

**État:**
- ✅ Module `auth/` : Complété
- ✅ Module `documents/` : Complété (routes fonctionnelles)
- 🔄 Module `chiffrage/` : En cours
- ⏳ Module `suppliers/` : À venir
- ⏳ Module `projects/` : À venir
- ⏳ Module `analytics/` : À venir

**Prochaines étapes:**
1. Finaliser migration `chiffrage/`
2. Tester modules migrés
3. Supprimer routes dupliquées dans `routes-poc.ts`
4. Continuer avec `suppliers/`

### Optimisations Performance (En Cours)
**Objectif:** Réduire latence chatbot de ~3-7s → ~2.5s max

**Améliorations récentes:**
- ✅ Dispatch parallèle : Contexte + Modèle simultané
- ✅ Cache intelligent avec invalidation automatique
- ✅ Preloading background pour prédictions
- 🔄 Optimisation SQL queries (objectif < 20s)

**Prochaines optimisations:**
1. Optimiser requêtes SQL complexes
2. Améliorer cache hit rate (objectif 70%)
3. Réduire latence API (objectif < 100ms)

### Infrastructure de Tests (Stable)
**Objectif:** Maintenir couverture 85% backend, 80% frontend

**État actuel:**
- ✅ Tests unitaires backend (Vitest)
- ✅ Tests unitaires frontend (Vitest + React Testing Library)
- ✅ Tests E2E (Playwright)
- ✅ Infrastructure anti-boucles de bugs

**Actions en cours:**
- Surveillance couverture de code
- Correction des tests flaky
- Ajout tests pour nouveaux modules

---

## 📝 Changements Récents

### Janvier 2025

#### Migration Documents Module
- ✅ Extraction routes OCR et documents vers `server/modules/documents/`
- ✅ Création `coreRoutes.ts` avec routes fonctionnelles uniquement
- ✅ Archivage `routes.ts` → `routes.legacy.ts`
- ✅ Réduction erreurs LSP de 30 → 1

#### Optimisations Chatbot
- ✅ Pipeline parallèle pour réduction latence
- ✅ Cache intelligent avec invalidation EventBus
- ✅ Suggestions adaptatives par rôle

#### Sécurité et Robustesse
- ✅ Rate limiting global et par route
- ✅ Circuit breakers pour appels IA
- ✅ Graceful shutdown complet
- ✅ Logging structuré avec correlation IDs

### Décembre 2024

#### Intégration Monday.com
- ✅ Service de migration consolidé
- ✅ Support Excel import + API sync
- ✅ Dashboard de migration

#### Intelligence Temporelle
- ✅ DateIntelligenceService avec règles métier
- ✅ Détection d'alertes automatiques
- ✅ Prise en compte saisonnalité BTP

---

## 🚧 Prochaines Étapes

### Court Terme (1-2 semaines)

1. **Finaliser Migration Modulaire**
   - Compléter module `chiffrage/`
   - Tester intégration complète
   - Documenter patterns de migration

2. **Optimisations Performance**
   - Analyser requêtes SQL lentes
   - Optimiser index base de données
   - Améliorer cache hit rate

3. **Tests et Qualité**
   - Augmenter couverture tests nouveaux modules
   - Corriger tests flaky E2E
   - Valider performance après optimisations

### Moyen Terme (1 mois)

1. **Migration Modules Restants**
   - Module `suppliers/`
   - Module `projects/`
   - Module `analytics/`

2. **Améliorations IA**
   - Enrichir base de connaissances menuiserie
   - Améliorer précision OCR contextuel
   - Optimiser suggestions chatbot

3. **Documentation**
   - Compléter READMEs par module
   - Documenter API endpoints
   - Créer guides utilisateur

### Long Terme (3+ mois)

1. **Nouvelles Fonctionnalités**
   - Notifications push (mobile)
   - Export PDF avancé
   - Intégrations ERP supplémentaires

2. **Scalabilité**
   - Optimisation base de données (N+1 queries)
   - Cache distribué (Redis)
   - Load balancing

3. **Mobile**
   - Application mobile native (optionnel)
   - PWA améliorée

---

## 🤔 Décisions Actives et Considérations

### Décisions Techniques en Cours

#### 1. Architecture Modulaire
**Question:** Faut-il migrer toutes les routes ou garder `routes-poc.ts` pour legacy ?

**Décision actuelle:** Migration progressive, garder `routes-poc.ts` temporairement pour compatibilité

**Considérations:**
- ✅ Pas de breaking changes
- ✅ Tests à chaque étape
- ⚠️ Duplication temporaire acceptable

#### 2. Performance Chatbot
**Question:** Comment réduire latence sans compromettre qualité ?

**Décision actuelle:** Dispatch parallèle + cache intelligent

**Considérations:**
- ✅ Latence réduite de ~50%
- ⚠️ Cache invalidation complexe
- 🔄 Monitoring continu nécessaire

#### 3. Base de Données
**Question:** Optimiser requêtes N+1 ou accepter performance actuelle ?

**Décision actuelle:** Optimiser requêtes critiques uniquement

**Considérations:**
- ✅ Performance acceptable pour la plupart des cas
- ⚠️ Quelques requêtes lentes identifiées
- 🔄 Analyse continue nécessaire

### Décisions Métier en Cours

#### 1. Workflow Validation
**Question:** Faut-il rendre tous les jalons obligatoires ?

**Décision actuelle:** Jalons critiques obligatoires, autres optionnels

**Considérations:**
- ✅ Flexibilité pour équipes
- ⚠️ Risque de contournement
- 🔄 Ajustement selon retours utilisateurs

#### 2. Intégrations
**Question:** Prioriser quelles intégrations supplémentaires ?

**Décision actuelle:** Focus sur Monday.com et OneDrive (stables)

**Considérations:**
- ✅ Intégrations actuelles fonctionnelles
- ⚠️ Demande ERP supplémentaire
- 🔄 Évaluer ROI nouvelles intégrations

---

## 🐛 Problèmes Connus

### Techniques

1. **Requêtes SQL Lentes**
   - **Impact:** Quelques requêtes > 20s
   - **Priorité:** Moyenne
   - **Action:** Analyse et optimisation en cours

2. **Tests Flaky E2E**
   - **Impact:** Échecs aléatoires dans CI
   - **Priorité:** Basse
   - **Action:** Investigation et correction progressive

3. **Cache Invalidation**
   - **Impact:** Parfois données obsolètes
   - **Priorité:** Moyenne
   - **Action:** Amélioration logique invalidation

### Métier

1. **Double Saisie Résiduelle**
   - **Impact:** Certains champs encore ressaisis
   - **Priorité:** Basse
   - **Action:** Améliorer import Monday.com

2. **Alertes Trop Nombreuses**
   - **Impact:** Fatigue utilisateurs
   - **Priorité:** Basse
   - **Action:** Ajuster seuils et filtres

---

## 📊 Métriques Actuelles

### Performance
- **Latence chatbot moyenne:** ~2.5s (objectif atteint ✅)
- **Temps chargement pages:** ~1.5s (objectif < 2s ✅)
- **Requêtes API moyennes:** ~150ms (objectif < 100ms 🔄)

### Qualité
- **Couverture tests backend:** ~82% (objectif 85% 🔄)
- **Couverture tests frontend:** ~78% (objectif 80% 🔄)
- **Tests E2E:** 95% passent (objectif 100% 🔄)

### Utilisation
- **Utilisateurs actifs:** En croissance
- **Requêtes chatbot/jour:** En augmentation
- **Documents traités/jour:** Stable

---

## 🔗 Liens Utiles

- **Documentation technique:** `/docs/`
- **Rapports d'audit:** Fichiers `RAPPORT_*.md`
- **Guides d'intégration:** `BATIGEST_INTEGRATION.md`, `MONDAY_*.md`
- **Tests:** `README-TESTS.md`, `TESTING.md`

---

**Note:** Ce document est mis à jour régulièrement pour refléter l'état actuel du projet et les priorités.




