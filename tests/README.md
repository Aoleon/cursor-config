# Tests Phase 2.5 - Système Intelligent de Dates et Échéances

Suite de tests exhaustive pour valider le bon fonctionnement du système Phase 2 avec non-régression Phase 1, ground truth projets menuiserie française, et validation performance.

## 📋 Vue d'Ensemble

Cette suite de tests couvre :

- **✅ Non-régression Phase 1** : Validation que toutes les fonctionnalités existantes continuent de fonctionner
- **✅ Backend exhaustif** : Services intelligence temporelle, détection alertes, storage
- **✅ Frontend complet** : Hooks, composants, interfaces utilisateur
- **✅ End-to-End** : Scénarios complets ground truth menuiserie française
- **✅ Performance** : Tests de charge avec 100+ projets et 500+ timelines
- **✅ Ground Truth** : Données de référence menuiserie française validées

## 🚀 Exécution Rapide

```bash
# Tests complets avec couverture
vitest --coverage

# Tests backend (>85% couverture)
vitest --config vitest.backend.config.ts --coverage

# Tests frontend (>80% couverture) 
vitest --config vitest.frontend.config.ts --coverage

# Tests E2E Playwright
playwright test

# Validation complète Phase 2.5
vitest --coverage && playwright test
```

## 📁 Structure des Tests

```
tests/
├── fixtures/
│   ├── menuiserie-ground-truth.json     # Données référence menuiserie française
│   └── test-scenarios.json              # Scénarios complets validés
├── utils/
│   ├── menuiserie-test-helpers.ts       # Helpers spécialisés menuiserie
│   ├── msw-handlers-intelligence.ts     # Mocks APIs intelligence temporelle
│   └── test-helpers.ts                  # Helpers génériques
├── backend/
│   ├── services/
│   │   ├── DateIntelligenceService.test.ts      # Tests calculs timelines
│   │   └── DateAlertDetectionService.test.ts    # Tests détection alertes
│   └── routes/                          # Tests APIs REST
├── frontend/
│   ├── hooks/
│   │   └── date-intelligence.test.ts    # Tests hooks React
│   ├── components/
│   │   └── DateIntelligenceDashboard.test.tsx   # Tests composants UI
│   └── regression/
│       └── phase1-core.test.tsx         # Tests non-régression Phase 1
├── performance/
│   └── scalability-intelligence.test.ts # Tests performance 100+ projets
├── e2e/
│   └── menuiserie-scenarios.spec.ts     # Tests Playwright scénarios métier
└── setup.ts                            # Configuration globale tests
```

## 🎯 Objectifs de Couverture

### Backend (Cible: >85%)
- **DateIntelligenceService**: 90%+ (calculs critiques)
- **DateAlertDetectionService**: 90%+ (détection proactive)
- **Routes API**: 85%+ (intégration)
- **Storage**: 80%+ (persistance)

### Frontend (Cible: >80%)
- **Hooks intelligence**: 85%+ (logique métier)
- **Composants UI**: 80%+ (interactions)
- **Pages principales**: 85%+ (workflows)

### End-to-End (100% scénarios critiques)
- **Fenêtres PVC standard**: ✅ Complet
- **Bâtiment historique ABF**: ✅ Complet
- **Projets complexes hiver**: ✅ Complet
- **Conflits ressources**: ✅ Complet
- **Performance charge élevée**: ✅ Complet

## 🧪 Tests par Catégorie

### 1. Non-Régression Phase 1

Validation que toutes les fonctionnalités existantes continuent de fonctionner :

```bash
# Tests non-régression (frontend avec thresholds >81%)
vitest --config vitest.frontend.config.ts --coverage
```

**Couverture** :
- ✅ Dashboard principal
- ✅ Workflow AO (création, gestion)
- ✅ Fonctionnalité OCR (upload, parsing)
- ✅ Workflow offres (statuts, transitions)
- ✅ Navigation et authentification

### 2. Backend Intelligence Temporelle

Tests exhaustifs des services backend :

```bash
# Tests backend strict (>86% couverture)
vitest --config vitest.backend.config.ts --coverage
```

**DateIntelligenceService** :
- ✅ Calculs délais projets menuiserie standard
- ✅ Application contraintes météo hiver/été
- ✅ Gestion projets sur-mesure et bâtiments historiques
- ✅ Optimisation planning avec phases parallèles
- ✅ Validation 19+ règles métier menuiserie française

**DateAlertDetectionService** :
- ✅ Détection risques retard avec progression lente
- ✅ Détection conflits équipes/ressources
- ✅ Échéances critiques (ABF, fournisseurs)
- ✅ Intégration EventBus temps réel
- ✅ Suggestions optimisation automatiques

### 3. Frontend Interface Intelligente

Tests complets interface utilisateur :

```bash
# Tests frontend strict (>81% couverture)
vitest --config vitest.frontend.config.ts --coverage
```

**Hooks React** :
- ✅ `useDateAlerts` : gestion alertes temps réel
- ✅ `useProjectTimelines` : calculs et mise à jour
- ✅ `useBusinessRules` : CRUD règles métier
- ✅ `usePerformanceMetrics` : métriques performance

**Composants UI** :
- ✅ `DateIntelligenceDashboard` : métriques et navigation
- ✅ `InteractiveGanttChart` : drag & drop, contraintes
- ✅ `BusinessRulesManager` : gestion règles métier
- ✅ `AlertsManagementPanel` : actions sur alertes

### 4. Performance et Scalabilité

Tests de charge critique :

```bash
# Tests performance (compris dans backend config)
vitest --config vitest.backend.config.ts --coverage
```

**Objectifs Performance** :
- ✅ **100 projets** : Calcul timelines < 5 secondes
- ✅ **500 timelines** : Détection alertes < 10 secondes  
- ✅ **Batch processing** : Optimisation parallèle
- ✅ **Cache intelligent** : Règles métier optimisées
- ✅ **Mémoire stable** : Pas de fuites sur charge prolongée

### 5. End-to-End Ground Truth

Scénarios complets menuiserie française :

```bash
# Tests E2E déterministes
NODE_ENV=test playwright test
```

**Scénarios Validés** :

#### Fenêtres PVC Standard
- Création AO → Calcul automatique → Délais validés
- **Attendu** : Étude 5j, Appro 14j, Chantier 3j, Total 52j
- **Règles** : PVC standard, été, normale complexité

#### Bâtiment Historique ABF  
- Contraintes patrimoniales → VISA ABF → Délais étendus
- **Attendu** : VISA ABF 45j, Étude patrimoine 21j, Total 171j
- **Règles** : Monuments historiques, matériaux spécialisés

#### Projet Complexe Hiver
- Multi-matériaux → Contraintes météo → Majorations
- **Attendu** : Chantier 7j (vs 3j), Contraintes montagne
- **Règles** : Hiver, extérieur, accès difficile

## 🧰 Ground Truth Données Menuiserie

### Scénarios de Référence

Les tests utilisent des données de référence validées par l'industrie menuiserie française :

```json
{
  "fenetre_pvc_standard": {
    "project": {
      "type": "fenetre_pvc",
      "surface": 25,
      "complexity": "normale",
      "season": "summer"
    },
    "expectedTimeline": {
      "passation": { "durationDays": 30 },
      "etude": { "durationDays": 5 },
      "approvisionnement": { "durationDays": 14 },
      "chantier": { "durationDays": 3 },
      "total": 52
    },
    "businessRules": [
      "passation_standard",
      "etude_pvc_standard", 
      "appro_pvc_standard",
      "pose_chantier_ete"
    ]
  }
}
```

### Matériaux et Contraintes

- **PVC** : Approvisionnement 14j, Pose standard 3j
- **Aluminium** : Approvisionnement 21j, Pose technique 5j  
- **Bois** : Approvisionnement 30j, Pose artisanale 7j
- **Contraintes hiver** : Majoration 40% travaux extérieurs
- **Bâtiments historiques** : VISA ABF 45j + matériaux spécialisés

## 🔧 Configuration et Setup

### Prérequis

```bash
# Installation des dépendances de test
npm install

# Vérification de la configuration
npm run check
```

### Variables d'Environnement

```bash
# tests/.env.test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/saxium_test
VITE_API_URL=http://localhost:3000
TEST_TIMEOUT=30000
```

### Mocks et Stubs

Les tests utilisent MSW (Mock Service Worker) pour simuler les APIs :

- **APIs intelligence temporelle** : Calculs, alertes, optimisations
- **APIs métier** : AOs, offres, projets
- **APIs externes** : Météo, géolocalisation
- **WebSocket** : Événements temps réel

## 📊 Rapports et Métriques

### Couverture de Code

```bash
# Génération rapport couverture HTML
npm run test:coverage

# Fichiers générés :
# - coverage/index.html (rapport détaillé)
# - coverage/lcov.info (intégration CI/CD)
```

### Rapports Performance

```bash
# Tests performance avec métriques
npm run test:performance

# Métriques générées :
# - Temps d'exécution par test
# - Consommation mémoire
# - Détection fuites mémoire
# - Comparaison avec seuils critiques
```

### Rapports E2E

```bash
# Tests Playwright avec artefacts
npm run test:e2e

# Artefacts générés :
# - Screenshots sur échec
# - Vidéos des scénarios
# - Traces d'exécution
# - Rapport HTML interactif
```

## 🐛 Debugging et Dépannage

### Tests en Mode Debug

```bash
# Backend avec debug
npm run test:backend -- --reporter=verbose

# Frontend avec React DevTools
npm run test:frontend -- --reporter=verbose

# E2E avec interface Playwright
npm run test:e2e:ui
```

### Logs et Traces

```bash
# Logs détaillés MSW
DEBUG=msw npm run test

# Traces performance
PERF_LOGS=true npm run test:performance

# Debug Playwright
DEBUG=pw:api npm run test:e2e
```

### Problèmes Courants

#### Tests Backend Lents
- Vérifier connexion base de données test
- Optimiser mocks MSW
- Réduire timeout si nécessaire

#### Tests Frontend Flaky  
- Vérifier `waitFor` avec timeout approprié
- S'assurer que les mocks sont bien configurés
- Utiliser `act()` pour les mises à jour React

#### Tests E2E Instables
- Augmenter les timeouts Playwright
- Vérifier que le serveur de dev démarre correctement
- Utiliser `waitForLoadState('networkidle')`

## 🚀 Intégration CI/CD

### GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests Phase 2.5
on: [push, pull_request]

jobs:
  tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

### Seuils de Qualité

Les tests doivent respecter les seuils suivants pour passer en CI :

- **Couverture Backend** : ≥ 85%
- **Couverture Frontend** : ≥ 80% 
- **Performance 100 projets** : < 5 secondes
- **Performance 500 timelines** : < 10 secondes
- **Tests E2E** : 100% des scénarios critiques passent
- **Tests régression** : 100% des fonctionnalités Phase 1 OK

## 📚 Documentation Technique

### Architecture Tests

Les tests suivent une architecture en couches :

1. **Fixtures** : Données de référence menuiserie française
2. **Helpers** : Utilitaires spécialisés création mocks
3. **Mocks** : MSW handlers pour APIs intelligence
4. **Tests unitaires** : Services et composants isolés
5. **Tests intégration** : Workflows complets
6. **Tests E2E** : Scénarios utilisateur finaux

### Patterns de Test

- **AAA Pattern** : Arrange, Act, Assert
- **Ground Truth** : Validation contre données référence
- **Performance First** : Métriques temps critiques
- **Mock Realistic** : Comportements proches production
- **Regression Safe** : Protection fonctionnalités existantes

## ✅ Critères d'Acceptance

- [x] **Non-régression Phase 1** : Tous workflows existants fonctionnent
- [x] **Backend exhaustif** : Services testés avec >85% couverture  
- [x] **Frontend complet** : Hooks/composants testés avec >80% couverture
- [x] **E2E menuiserie** : 5+ scénarios ground truth validés
- [x] **Performance validée** : <5s pour 100 projets, <10s pour 500 timelines
- [x] **Suite complète** : `npm test` exécute sans erreur
- [x] **Documentation** : Instructions complètes exécution et couverture

## 🎯 Résultat

Suite de tests exhaustive garantissant la **qualité**, **performance** et **non-régression** du Système Intelligent de Dates et Échéances complet pour l'industrie de la menuiserie française.

---

*Implémenté dans le cadre de la Phase 2.5 - Tests et Validation - Saxium*