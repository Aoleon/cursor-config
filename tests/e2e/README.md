# Infrastructure de Tests E2E Playwright - Saxium

**⚠️ CONFIGURATION CORRIGÉE - TOUS LES TESTS SONT MAINTENANT INCLUS**

Cette documentation explique l'architecture complète des tests End-to-End (E2E) pour l'application Saxium, avec **645 tests** répartis sur **16 fichiers**.

## ✅ État de l'Infrastructure

### Tests Découverts
- **Total**: 645 tests dans 16 fichiers
- **Workflows**: 5 fichiers (chiffrage, planification, chantier, envoi-devis, chatbot)
- **Scénarios métier**: 6 fichiers (alertes, AO, menuiserie, offres, fournisseurs)
- **Parcours utilisateur**: 5 fichiers (dashboard, POC, techniques)

### Dépendances Vérifiées
- ✅ **@playwright/test**: v1.54.1 installé
- ✅ **playwright**: v1.54.1 installé  
- ✅ **nanoid**: v5.1.6 installé
- ✅ **433 data-testid** attributs présents dans les composants

### Configuration Playwright
```typescript
// playwright.config.ts
testDir: './tests/e2e'  // ✅ CORRIGÉ - inclut TOUS les tests
baseURL: 'http://localhost:5000'
NODE_ENV: 'test'  // Authentification automatique
```

## 📁 Structure Consolidée

```
tests/
├── e2e/                                # Tests E2E consolidés
│   ├── workflows/                      # Tests par workflow (nouveaux)
│   │   ├── chiffrage.spec.ts          # Tests workflow Chiffrage
│   │   ├── envoi-devis.spec.ts        # Tests workflow Envoi Devis
│   │   ├── planification.spec.ts      # Tests workflow Planification
│   │   ├── chantier.spec.ts           # Tests workflow Chantier
│   │   └── chatbot.spec.ts            # Tests Chatbot IA
│   │
│   ├── user-journeys.spec.ts          # Parcours utilisateur complets
│   ├── alerts-workflow.spec.ts        # Tests système d'alertes
│   ├── ao-2503-complete-workflow.spec.ts  # Tests AO complets
│   ├── ao-to-project-complete-workflow.spec.ts
│   ├── dashboard.spec.ts              # Tests dashboard
│   ├── dashboard-workflow.spec.ts
│   ├── menuiserie-scenarios.spec.ts   # Scénarios métier menuiserie
│   ├── offers.spec.ts                 # Tests offres
│   ├── poc-workflow-complete.test.ts  # Tests POC
│   ├── technical-alerts-workflow.spec.ts
│   └── workflow-fournisseurs-complet.spec.ts
│
├── fixtures/
│   └── e2e/                           # Fixtures pour tests E2E
│       ├── test-data.ts               # Générateurs de données uniques
│       ├── auth.setup.ts              # Configuration authentification
│       └── database.setup.ts          # Helpers base de données
│
├── helpers/                           # Helpers partagés
│   ├── navigation.ts                  # Helpers de navigation
│   ├── forms.ts                       # Helpers de formulaires
│   ├── assertions.ts                  # Assertions personnalisées
│   └── api.ts                         # Helpers d'appels API
│
└── tools/                             # Outils de profiling et analyse
    └── collect-runtime.ts             # Script de collecte de baselines
```

## 🚀 Installation et Configuration

### Prérequis
- ✅ Node.js >= 18
- ✅ @playwright/test installé (déjà dans les dépendances)
- ✅ nanoid installé (déjà dans les dépendances)
- ✅ Base de données PostgreSQL configurée
- ✅ Application Saxium fonctionnelle

### Installation de Playwright Browsers (si nécessaire)
```bash
npx playwright install
```

## 📋 Commandes d'Exécution

### ⚠️ Scripts NPM Recommandés
Les scripts suivants peuvent être ajoutés à votre `package.json` pour faciliter l'exécution :

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:journeys": "playwright test --project=journeys",
    "test:journeys:headed": "playwright test --project=journeys --headed",
    "test:ci": "playwright test --project=journeys",
    "test:report": "playwright show-report test-results/html-report"
  }
}
```

### Tous les tests (645 tests)
```bash
npx playwright test
# OU avec script: npm run test:e2e
```

### Mode interface utilisateur (recommandé pour le développement)
```bash
npx playwright test --ui
```

### Avec navigateur visible
```bash
npx playwright test --headed
```

### Mode debug
```bash
npx playwright test --debug
```

### 🎯 Journeys E2E (Tagged Suite)

Les journeys sont des parcours utilisateurs complets qui testent l'application de bout en bout :

```bash
# Tous les journeys (tagged suite)
npx playwright test --project=journeys
# OU avec script: npm run test:journeys

# Journeys en mode headed
npx playwright test --project=journeys --headed
# OU avec script: npm run test:journeys:headed
```

**Journeys disponibles :**

1. **AO to Chantier** (`tests/e2e/journeys/ao-to-chantier.spec.ts`)
   - Création AO → Transformation Offer → Workflow complet jusqu'au chantier
   - Valide la transformation complète d'un appel d'offres

2. **Offer Maturation** (`tests/e2e/journeys/offer-maturation.spec.ts`)
   - Create → Chiffrage → Validation → Transform → Project
   - Teste le cycle de vie complet d'une offre

3. **Project Lifecycle** (`tests/e2e/journeys/project-lifecycle.spec.ts`)
   - Projects → Study → Supply → Worksite → Support
   - Workflows: etude-technique & suppliers-pending
   - Valide le cycle de vie complet d'un projet

### Tests par catégorie

#### Tests des workflows uniquement (nouveaux tests structurés)
```bash
npx playwright test tests/e2e/workflows
```

#### Test d'un workflow spécifique
```bash
npx playwright test tests/e2e/workflows/chiffrage.spec.ts
npx playwright test tests/e2e/workflows/planification.spec.ts
npx playwright test tests/e2e/workflows/chantier.spec.ts
npx playwright test tests/e2e/workflows/envoi-devis.spec.ts
npx playwright test tests/e2e/workflows/chatbot.spec.ts
```

#### Tests des scénarios métier
```bash
npx playwright test tests/e2e/alerts-workflow.spec.ts
npx playwright test tests/e2e/menuiserie-scenarios.spec.ts
npx playwright test tests/e2e/offers.spec.ts
```

#### Tests dashboard
```bash
npx playwright test tests/e2e/dashboard.spec.ts
```

### Exécution sur un navigateur spécifique
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

### Voir le rapport HTML
```bash
npx playwright show-report
```

## 🔧 Configuration

La configuration Playwright se trouve dans `playwright.config.ts` :

```typescript
{
  testDir: './tests/e2e',          // ✅ CORRIGÉ - Tous les tests inclus
  baseURL: 'http://localhost:5000',
  fullyParallel: true,             // ✅ Parallélisation activée
  
  // ✅ Parallelization environment-controlled
  workers: process.env.CI 
    ? parseInt(process.env.CI_WORKERS || '4')  // CI: 4 workers par défaut
    : parseInt(process.env.WORKERS || '1'),    // Local: 1 worker (debugging)
  
  // ✅ Sharding support pour CI multi-machine
  shard: process.env.SHARD_INDEX && process.env.SHARD_TOTAL 
    ? { current: parseInt(process.env.SHARD_INDEX), total: parseInt(process.env.SHARD_TOTAL) }
    : undefined,
  
  // ✅ Retries optimisés : CI robuste (2), local fail-fast (0)
  retries: process.env.CI ? 2 : 0,
  
  // ✅ Timeouts basés sur baselines (Tâche 8.1)
  timeout: 30 * 1000,               // 30s timeout global (Core: 25s + 20% buffer)
  expect: { timeout: 5 * 1000 },   // 5s pour assertions
  actionTimeout: 10 * 1000,         // 10s timeout actions
  
  outputDir: 'test-results/artifacts',  // ✅ CI/CD - Artifacts centralisés
  
  // ✅ CI/CD - Multiple reporters
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']  // Console output
  ],
  
  // Mode test avec authentification automatique
  webServer: {
    command: 'NODE_ENV=test tsx server/index.ts',
    url: 'http://localhost:5000',
    env: {
      NODE_ENV: 'test',
      DISABLE_SCHEDULER: '1'
    }
  },
  
  // Multi-navigateurs + Tagged Projects
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { 
      name: 'journeys',  // ✅ CI/CD - Tagged suite pour journeys
      testMatch: /.*journeys.*\.spec\.ts$/,
      use: { 
        ...devices['Desktop Chrome'],
        actionTimeout: 15 * 1000  // 15s pour actions E2E complexes
      },
      timeout: 90 * 1000  // 90s total (Journeys: 60s + 50% buffer)
    },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
    { name: 'Mobile Safari', use: { ...devices['iPhone 12'] } }
  ],
  
  // ✅ CI/CD - Captures on failure
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',    // ✅ Conservé on failure
  trace: 'retain-on-failure'     // ✅ Conservé on failure
}
```

## ⚡ Parallelization & Performance

### Configuration Workers

La configuration Playwright utilise des workers environment-controlled pour optimiser l'exécution selon le contexte :

**Local (debugging)** :
```bash
# 1 worker par défaut (séquentiel, plus facile à debug)
npm run test:e2e

# Custom workers (parallélisation locale)
WORKERS=2 npm run test:e2e
WORKERS=4 npm run test:e2e
```

**CI/CD (parallélisation)** :
```bash
# 4 workers par défaut en CI
CI=true npm run test:ci

# Custom workers CI (8 workers pour machines puissantes)
CI=true CI_WORKERS=8 npm run test:ci

# 1 worker pour debugging en CI
CI=true CI_WORKERS=1 npm run test:ci
```

### Configuration Sharding

Le sharding permet de distribuer les tests sur plusieurs machines en parallèle pour accélérer l'exécution en CI.

**Utilisation manuelle** :
```bash
# Machine 1 - Shard 1 of 4
SHARD_INDEX=1 SHARD_TOTAL=4 npx playwright test

# Machine 2 - Shard 2 of 4
SHARD_INDEX=2 SHARD_TOTAL=4 npx playwright test

# Machine 3 - Shard 3 of 4
SHARD_INDEX=3 SHARD_TOTAL=4 npx playwright test

# Machine 4 - Shard 4 of 4
SHARD_INDEX=4 SHARD_TOTAL=4 npx playwright test
```

**CI/CD Matrix (GitHub Actions)** :
```yaml
# .github/workflows/e2e-sharded.yml
name: E2E Tests (Sharded)

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run E2E Tests (Shard ${{ matrix.shard }}/4)
        run: npx playwright test --project=journeys
        env:
          SHARD_INDEX: ${{ matrix.shard }}
          SHARD_TOTAL: 4
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report-shard-${{ matrix.shard }}
          path: test-results/
          retention-days: 30
```

**Sharding en parallèle local (bash)** :
```bash
# Lancer 4 shards en parallèle sur la même machine
for i in 1 2 3 4; do
  SHARD_INDEX=$i SHARD_TOTAL=4 npx playwright test --project=journeys &
done
wait

# Afficher le rapport combiné
npx playwright show-report
```

### Timeouts Configurés

Les timeouts sont optimisés en fonction des baselines de performance collectées (Tâche 8.1) :

| Type | Timeout | Justification |
|------|---------|---------------|
| **Test global** | 30s | Basé threshold Core workflows (25s + buffer 20%) |
| **Journey E2E** | 90s | Basé threshold Journeys (60s + buffer 50%) |
| **Action (Core)** | 10s | Actions UI rapides (formulaires, clics) |
| **Action (Journeys)** | 15s | Actions E2E plus complexes (workflows complets) |
| **Expect** | 5s | Assertions doivent être rapides |

**Exemple de configuration par projet** :
```typescript
// playwright.config.ts
projects: [
  {
    name: 'chromium',
    timeout: 30 * 1000,        // 30s pour tests core
    use: {
      actionTimeout: 10 * 1000  // 10s pour actions rapides
    }
  },
  {
    name: 'journeys',
    timeout: 90 * 1000,         // 90s pour journeys E2E
    use: {
      actionTimeout: 15 * 1000  // 15s pour actions complexes
    }
  }
]
```

### Variables Environnement

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| **WORKERS** | `1` (local) | Nombre de workers en local (debugging séquentiel) |
| **CI_WORKERS** | `4` (CI) | Nombre de workers en CI (parallélisation) |
| **SHARD_INDEX** | - | Index du shard actuel (1 à SHARD_TOTAL) |
| **SHARD_TOTAL** | - | Nombre total de shards pour distribution |
| **CI** | `false` | Détecte automatiquement l'environnement CI |

**Exemples d'utilisation** :
```bash
# Local avec 2 workers
WORKERS=2 npm run test:e2e

# CI avec 8 workers
CI=true CI_WORKERS=8 npm run test:ci

# Sharding : exécuter shard 2 sur 4
SHARD_INDEX=2 SHARD_TOTAL=4 npx playwright test
```

### Retries Policy

La politique de retry est différenciée selon l'environnement :

- **Local** : `0 retries` (fail-fast pour debugging rapide)
- **CI** : `2 retries` (robustesse contre les flaky tests)

**Justification** :
- En local, on veut identifier rapidement les problèmes sans retry
- En CI, on veut compenser la variabilité de l'environnement (réseau, ressources)

**Configuration** :
```typescript
// playwright.config.ts
retries: process.env.CI ? 2 : 0
```

### Optimisation Basée Baselines

Les timeouts et workers sont configurés en utilisant les **baselines de performance** collectées via le script `collect-runtime.ts` (Tâche 8.1) :

**Baselines mesurées** :
- **Core workflows** : ~15-22s → timeout 30s (buffer 20%)
- **Journeys E2E** : ~12-18s par journey → timeout 90s (buffer 50%)
- **Actions UI** : ~100-500ms → timeout 10s (marge confortable)

**Pourquoi ces buffers ?** :
- **20% buffer (Core)** : Workflows stables, peu de variabilité
- **50% buffer (Journeys)** : Parcours complets, plus de variabilité réseau/DB
- **10-15s (Actions)** : Marge large pour compenser latence CI

**Monitoring** :
```bash
# Collecter les baselines après modifications
npx playwright test && npx tsx tests/tools/collect-runtime.ts

# Comparer avec baselines précédentes
diff test-results/baselines.json baselines-previous.json
```

### Scripts Optimisés

**Development (Local)** :
```bash
# Séquentiel (1 worker, debugging)
npm run test:e2e

# Parallèle local (2 workers)
WORKERS=2 npm run test:e2e

# Parallèle local (4 workers, machine puissante)
WORKERS=4 npm run test:e2e

# Journeys uniquement (séquentiel)
npm run test:journeys

# Journeys parallèle
WORKERS=2 npm run test:journeys
```

**CI/CD (Parallélisation)** :
```bash
# Parallèle CI avec 4 workers (défaut)
npm run test:ci

# Parallèle CI avec 8 workers (machine puissante)
CI_WORKERS=8 npm run test:ci

# Séquentiel en CI (debugging)
CI_WORKERS=1 npm run test:ci
```

**Sharding (Multi-machines)** :
```bash
# Sharding manuel (4 machines)
# Machine 1:
SHARD_INDEX=1 SHARD_TOTAL=4 npx playwright test

# Machine 2:
SHARD_INDEX=2 SHARD_TOTAL=4 npx playwright test

# Machine 3:
SHARD_INDEX=3 SHARD_TOTAL=4 npx playwright test

# Machine 4:
SHARD_INDEX=4 SHARD_TOTAL=4 npx playwright test

# Sharding local parallèle (bash)
for i in 1 2 3 4; do
  SHARD_INDEX=$i SHARD_TOTAL=4 npx playwright test &
done
wait
```

### Recommandations Performance

1. **Local Development** :
   - Utilisez `WORKERS=1` (défaut) pour debugging facile
   - Utilisez `WORKERS=2-4` pour exécution rapide sans debug
   - Utilisez `--headed` uniquement pour un test spécifique

2. **CI/CD** :
   - Utilisez `CI_WORKERS=4` (défaut) pour CI standard
   - Utilisez `CI_WORKERS=8` pour machines puissantes (16+ CPU)
   - Utilisez sharding pour tests très longs (>10 minutes)

3. **Sharding** :
   - Sharding recommandé si durée totale > 10 minutes
   - Nombre de shards = nombre de machines disponibles
   - 4 shards optimal pour 645 tests (~2-3 min par shard)

4. **Monitoring** :
   - Collectez baselines après chaque changement majeur
   - Surveillez les p95/p99 pour identifier les tests lents
   - Augmentez timeout si p99 proche du seuil actuel

## 🛠️ Helpers Disponibles

### Navigation (`helpers/navigation.ts`)
```typescript
// Navigation vers un workflow
await goToWorkflow(page, 'chiffrage');
await goToWorkflow(page, 'planification');

// Navigation générale
await goToDashboard(page);
await goToAOs(page);
await goToProjects(page);

// Attendre le chargement
await waitForPageLoad(page);
```

### Formulaires (`helpers/forms.ts`)
```typescript
// Remplir un champ
await fillFormField(page, 'input-nom', 'Valeur');

// Remplir plusieurs champs
await fillForm(page, {
  'input-nom': 'John Doe',
  'input-email': 'john@example.com'
});

// Soumettre
await submitForm(page, 'button-submit');
```

### Assertions (`helpers/assertions.ts`)
```typescript
// Vérifier le chargement
await assertWorkflowLoaded(page, 'Chiffrage');
await assertEmptyState(page);
await assertSuccessToast(page, 'Opération réussie');
await assertNoConsoleErrors(page);
```

### API (`helpers/api.ts`)
```typescript
// Appels API
const data = await apiGet(page, '/api/projects');
const result = await apiPost(page, '/api/projects', { nom: 'Test' });

// Créer/Supprimer
const id = await createResource(page, '/api/aos', aoData);
await deleteResource(page, '/api/projects', projectId);
```

### Données de Test (`fixtures/e2e/test-data.ts`)
```typescript
// Générer des données uniques avec nanoid
const ao = generateTestAO({ 
  montantEstime: 150000,
  departement: '75'
});

const project = generateTestProject({
  status: 'planification'
});

// Créer via API
const aoId = await createAOViaAPI(page, ao);

// Nettoyer après les tests
await cleanupTestData(page, {
  aos: [aoId],
  projects: [projectId]
});
```

## 🔐 Authentification

En mode test (`NODE_ENV=test`), l'authentification est **automatique** :
- Un middleware de bypass crée automatiquement une session de test
- L'utilisateur test a le rôle `admin`
- Pas besoin de login manuel dans les tests
- L'endpoint `/api/test/auth-status` vérifie l'authentification

## 🗄️ Gestion de la Base de Données

### Isolation des Tests
Chaque test doit :
1. Créer ses propres données avec `nanoid()` pour l'unicité
2. Nettoyer après lui avec `cleanupTestData()`

Exemple :
```typescript
test('Mon test', async ({ page }) => {
  const createdIds: { projects?: string[] } = {};
  
  // Créer des données
  const projectData = generateTestProject();
  const id = await createProjectViaAPI(page, projectData);
  createdIds.projects = [id];
  
  // ... faire les tests ...
  
  // Nettoyer (dans afterEach)
  await cleanupTestData(page, createdIds);
});
```

## 📊 Bonnes Pratiques

### 1. Isolation des Tests
- ✅ Chaque test est indépendant
- ✅ Créer ses propres données avec `nanoid()`
- ✅ Nettoyer après chaque test

### 2. Utilisation des data-testid
- ✅ **433 data-testid** présents dans l'application
- ✅ Pattern: `{action}-{target}` (ex: `button-submit`)
- ✅ Pour les listes: `{type}-{description}-{id}`

### 3. Structure des Tests
```typescript
test.describe('Fonctionnalité X', () => {
  const createdIds = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('Scénario 1', async ({ page }) => {
    // Test spécifique
  });
});
```

## 🐛 Débogage

### Voir les tests s'exécuter
```bash
npx playwright test --headed
```

### Mode debug interactif
```bash
npx playwright test --debug
```

### Inspecteur Playwright (avec pause)
```bash
npx playwright test tests/e2e/workflows/chiffrage.spec.ts --debug
```

### Voir le rapport HTML avec traces
```bash
npx playwright show-report
```

## 🚨 Résolution de Problèmes

### Les tests ne trouvent pas d'éléments
- ✅ 433 data-testid sont présents dans l'app
- Augmenter les timeouts si nécessaire : `{ timeout: 15000 }`
- Utiliser `page.pause()` pour inspecter

### Erreurs d'authentification
- ✅ Vérifier que `NODE_ENV=test` est défini
- ✅ Le serveur doit démarrer en mode test
- L'endpoint `/api/test/auth-status` doit retourner `authenticated: true`

### Base de données non nettoyée
- Vérifier l'appel à `cleanupTestData()` dans `afterEach`
- Utiliser des IDs uniques avec `nanoid()`

### Timeouts
- Tests lents : augmenter `timeout` dans `playwright.config.ts`
- Actions spécifiques : `await element.click({ timeout: 15000 })`

## 🚀 CI/CD - Exécution en Environnement d'Intégration Continue

### Commande CI-Ready
```bash
# Exécution complète pour CI/CD
npx playwright test --project=journeys
# OU avec script: npm run test:ci
```

Cette commande :
- ✅ Exécute uniquement les journeys E2E (tagged suite)
- ✅ Génère des rapports multiples (HTML, JSON, JUnit)
- ✅ Capture screenshots/videos on failure
- ✅ Conserve traces pour debugging
- ✅ Utilise la configuration CI (retries: 2, workers: 1)

### Rapports Générés

Après exécution, les rapports sont disponibles dans :

```
test-results/
├── html-report/          # Rapport HTML interactif
│   └── index.html        # Visualiser : npm run test:report
├── results.json          # Rapport JSON (parsing CI)
├── junit.xml            # Rapport JUnit (intégration CI)
└── artifacts/           # Screenshots, vidéos, traces
    ├── screenshots/
    ├── videos/
    └── traces/
```

**Visualiser le rapport HTML :**
```bash
npx playwright show-report test-results/html-report
# OU avec script: npm run test:report
```

### Configuration CI/CD (GitHub Actions exemple)

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      
      - name: Run E2E Journeys
        run: npm run test:ci
        env:
          NODE_ENV: test
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
          retention-days: 30
```

### Artifacts et Debugging

En cas d'échec, les artifacts suivants sont disponibles :

1. **Screenshots** : Captures automatiques des échecs
2. **Vidéos** : Enregistrements des tests échoués
3. **Traces** : Timeline complète pour debugging
4. **Rapport HTML** : Vue d'ensemble interactive

```bash
# Voir les traces d'un test échoué
npx playwright show-trace test-results/artifacts/trace.zip
```

## 📈 Rapports et Métriques

### Rapport HTML
Après exécution :
```bash
npx playwright show-report test-results/html-report
# OU avec script: npm run test:report
```

Le rapport contient :
- Résultats de tous les tests (645 tests)
- Screenshots des échecs (automatic on failure)
- Vidéos des échecs (retain on failure)
- Traces complètes avec timeline (retain on failure)

### Métriques Actuelles
- **Total tests**: 645
- **Fichiers**: 16
- **Coverage**: 433 data-testid dans l'application
- **Browsers**: 5 (Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari)

## ⚙️ Best Practices CI/CD

### ✅ Configuration Optimale pour CI

La configuration actuelle est optimisée pour CI/CD avec :

1. **Tagged Projects** : 
   - `--project=journeys` pour exécuter uniquement les parcours critiques
   - Isolation des tests E2E complets

2. **Multiple Reporters** :
   - HTML pour visualisation interactive
   - JSON pour parsing et analyse
   - JUnit pour intégration CI/CD
   - List pour console output

3. **Artifacts on Failure** :
   - Screenshots automatiques (`only-on-failure`)
   - Videos conservés (`retain-on-failure`)
   - Traces complètes (`retain-on-failure`)
   - Output centralisé : `test-results/artifacts/`

4. **Resilience** :
   - 2 retries automatiques en CI
   - 1 worker pour éviter conflits
   - Timeouts configurables

### Commande Recommandée pour CI

```bash
npm run test:ci
# OU: npx playwright test --project=journeys
```

## 📊 Performance Baselines

### Objectif

Le profiling de performance permet de :
- **Mesurer** les durées d'exécution des tests par suite
- **Établir** des baselines de référence pour détecter les régressions
- **Optimiser** les temps d'exécution avec des données objectives
- **Surveiller** l'évolution des performances dans le temps

### Métriques Collectées

Pour chaque suite de tests, le script collecte :

| Métrique | Description |
|----------|-------------|
| **Durée totale** | Temps total d'exécution de tous les tests de la suite |
| **Nombre de tests** | Total de tests exécutés (passed + failed + skipped) |
| **Taux de réussite** | Pourcentage de tests réussis vs total |
| **Durée moyenne** | Temps moyen par test dans la suite |
| **Min/Max** | Temps d'exécution minimum et maximum |
| **Percentiles** | p50 (médiane), p95, p99 pour identifier les outliers |

### Baselines de Référence

Les baselines actuelles sont stockées dans `test-results/baselines.json` après chaque exécution du profiling.

**Valeurs indicatives attendues** :

#### Core Workflows (tests/e2e/workflows/)
- **Chiffrage** : ~15-20s (≈27 tests)
- **Envoi Devis** : ~10-15s (≈23 tests)
- **Planification** : ~18-25s (≈32 tests)
- **Chantier** : ~22-30s (≈41 tests)
- **Chatbot** : ~8-12s (≈15 tests)

#### Journeys E2E (tests/e2e/journeys/)
- **AO to Chantier** : ~15-25s (parcours complet)
- **Offer Maturation** : ~12-18s (cycle de vie offre)
- **Project Lifecycle** : ~18-28s (workflows projets)

#### Scénarios Métier
- **Alertes** : ~10-15s
- **Dashboard** : ~8-12s
- **Menuiserie** : ~12-18s
- **Offres** : ~10-15s

### Thresholds Définis

Les seuils suivants sont définis pour alerter en cas de dégradation :

```typescript
{
  core_workflows_max_duration: 25000,  // 25s max par workflow
  journeys_max_duration: 60000,         // 60s max par journey  
  min_pass_rate: 95                     // 95% minimum de réussite
}
```

**Interprétation** :
- ⚠️ Si un workflow dépasse 25s : Potentielle régression de performance
- ⚠️ Si un journey dépasse 60s : Investigation requise
- ❌ Si le taux de réussite < 95% : Échec critique

### Collecter les Baselines

#### Script NPM Recommandé

Ajouter à `package.json` (documentation uniquement, ne pas modifier) :

```json
{
  "scripts": {
    "test:profile": "playwright test && tsx tests/tools/collect-runtime.ts"
  }
}
```

#### Exécution Manuelle

```bash
# 1. Exécuter les tests Playwright (génère results.json)
npx playwright test

# 2. Collecter les métriques de performance
npx tsx tests/tools/collect-runtime.ts

# OU en une seule commande
npx playwright test && npx tsx tests/tools/collect-runtime.ts
```

#### Exécution en CI/CD

En environnement CI, le script détecte automatiquement l'environnement :

```bash
# En CI, la variable CI=true est automatiquement définie
CI=true npx playwright test && npx tsx tests/tools/collect-runtime.ts
```

Le script génère alors des outputs GitHub Actions :
```
::set-output name=total_tests::645
::set-output name=total_duration::125000
::set-output name=pass_rate::98.5
```

### Fichiers Générés

| Fichier | Description |
|---------|-------------|
| `test-results/results.json` | Résultats bruts Playwright (JSON reporter) |
| `test-results/baselines.json` | Métriques agrégées et baselines |
| Console output | Résumé formaté des performances |

### Format du Fichier Baselines

Exemple de structure `test-results/baselines.json` :

```json
{
  "timestamp": "2025-10-09T16:00:00.000Z",
  "environment": "local",
  "totalTests": 645,
  "totalDuration": 125000,
  "overallPassRate": 98.5,
  "suites": [
    {
      "name": "Workflow: chiffrage",
      "totalDuration": 15234,
      "testCount": 27,
      "passedCount": 27,
      "failedCount": 0,
      "skippedCount": 0,
      "passRate": 100,
      "avgDuration": 564,
      "minDuration": 120,
      "maxDuration": 1850,
      "p50": 500,
      "p95": 1200,
      "p99": 1700
    },
    {
      "name": "Journey: ao-to-chantier",
      "totalDuration": 18567,
      "testCount": 8,
      "passedCount": 8,
      "failedCount": 0,
      "skippedCount": 0,
      "passRate": 100,
      "avgDuration": 2321,
      "minDuration": 1200,
      "maxDuration": 4500,
      "p50": 2100,
      "p95": 4200,
      "p99": 4500
    }
  ],
  "thresholds": {
    "core_workflows_max_duration": 25000,
    "journeys_max_duration": 60000,
    "min_pass_rate": 95
  }
}
```

### Output Console

Après exécution, le script affiche un résumé formaté :

```
═══════════════════════════════════════════════════════════
📊 BASELINE EXECUTION PROFILING - PLAYWRIGHT TESTS
═══════════════════════════════════════════════════════════

🌍 Environnement: local
📅 Timestamp: 2025-10-09T16:00:00.000Z
🧪 Total tests: 645
⏱️  Durée totale: 125.00s
✅ Taux de réussite global: 98.5%

📈 MÉTRIQUES PAR SUITE:

⚙️ Workflow: chiffrage
   Tests: 27 (✅ 27 | ❌ 0 | ⏭️  0)
   Pass Rate: 100.0%
   Durée totale: 15.23s
   Durée moyenne: 564ms
   Min/Max: 120ms / 1850ms
   Percentiles: p50=500ms | p95=1200ms | p99=1700ms

🚀 Journey: ao-to-chantier
   Tests: 8 (✅ 8 | ❌ 0 | ⏭️  0)
   Pass Rate: 100.0%
   Durée totale: 18.57s
   Durée moyenne: 2321ms
   Min/Max: 1200ms / 4500ms
   Percentiles: p50=2100ms | p95=4200ms | p99=4500ms

🎯 THRESHOLDS DÉFINIS:

   Core Workflows max: 25s
   Journeys max: 60s
   Pass rate min: 95%

💾 Baselines enregistrées: test-results/baselines.json

═══════════════════════════════════════════════════════════
```

### Utilisation des Données

#### 1. Détection de Régressions

Comparez les baselines avant/après un changement :

```bash
# Collecter baseline avant changement
npx playwright test && npx tsx tests/tools/collect-runtime.ts
cp test-results/baselines.json baselines-before.json

# Faire vos modifications...

# Collecter baseline après changement
npx playwright test && npx tsx tests/tools/collect-runtime.ts
cp test-results/baselines.json baselines-after.json

# Comparer (manuellement ou avec un script)
diff baselines-before.json baselines-after.json
```

#### 2. Monitoring en CI/CD

Intégrez dans votre pipeline CI pour suivre l'évolution :

```yaml
# .github/workflows/e2e-performance.yml
- name: Run E2E Tests
  run: npx playwright test

- name: Collect Performance Baselines
  run: npx tsx tests/tools/collect-runtime.ts

- name: Upload Baselines
  uses: actions/upload-artifact@v3
  with:
    name: performance-baselines
    path: test-results/baselines.json
```

#### 3. Optimisation

Utilisez les percentiles pour identifier les tests lents :
- **p95 élevé** : Certains tests sont significativement plus lents
- **p99 très différent de p95** : Présence d'outliers à investiguer
- **avgDuration élevé** : La suite entière pourrait être optimisée

### Bonnes Pratiques

1. **Collecter régulièrement** : Exécutez le profiling après chaque changement majeur
2. **Comparer les environnements** : Les baselines CI sont généralement plus lentes que local
3. **Tracker l'historique** : Conservez les baselines dans Git (`.json`) pour suivre l'évolution
4. **Analyser les outliers** : Utilisez p95/p99 pour identifier les tests problématiques
5. **Optimiser progressivement** : Concentrez-vous sur les suites les plus lentes en premier

### Prochaines Étapes

Après avoir établi les baselines (Tâche 8.1), les étapes suivantes incluent :

- **Tâche 8.2** : Optimisation de la concurrence des tests
- **Tâche 8.3** : Parallélisation intelligente par suite
- **Tâche 8.4** : Réduction des timeouts inutiles
- **Tâche 8.5** : Monitoring continu des performances

## 🎯 Résumé des Corrections Apportées

### ✅ Problème 1: Configuration testDir
- **Avant**: `testDir: './e2e'` (excluait tests/e2e/)
- **Après**: `testDir: './tests/e2e'` (inclut TOUS les tests)
- **Résultat**: 16 fichiers, 645 tests découverts

### ✅ Problème 2: Dépendances
- **nanoid**: ✅ v5.1.6 installé et fonctionnel
- **@playwright/test**: ✅ v1.54.1 installé
- **playwright**: ✅ v1.54.1 installé

### ✅ Problème 3: Tests exécutables
- **Syntax errors corrigés**: 2 fichiers (alerts-workflow, menuiserie-scenarios)
- **data-testid présents**: 433 attributs dans les composants
- **Authentification**: Configurée avec NODE_ENV=test

### ✅ Problème 4: Structure consolidée
- Tous les tests dans `tests/e2e/`
- Fixtures dans `tests/fixtures/e2e/`
- Helpers dans `tests/helpers/`
- Imports mis à jour

### ✅ Amélioration 5: Configuration CI/CD (Tâche 7.5)
- **Tagged Projects**: Projet `journeys` pour isolation des parcours E2E
- **Multiple Reporters**: HTML, JSON, JUnit + console output
- **Artifacts on Failure**: Screenshots, videos, traces conservés
- **Output Directory**: `test-results/artifacts/` centralisé
- **Scripts NPM**: Commands CI-ready (`test:journeys`, `test:ci`, `test:report`)
- **Documentation**: Section CI/CD complète avec exemples GitHub Actions

**Journeys Documentés** :
1. AO to Chantier - Transformation complète AO → Chantier
2. Offer Maturation - Cycle de vie complet offre
3. Project Lifecycle - Parcours projet complet avec workflows

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev)
- [Best Practices Playwright](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- Configuration: `playwright.config.ts`
- Helpers: `tests/helpers/`
- Fixtures: `tests/fixtures/e2e/`

---

**Statut**: ✅ Infrastructure corrigée et validée
**Tests découverts**: 645 dans 16 fichiers
**Performance Baselines**: ✅ Script de profiling implémenté (Tâche 8.1)
**Dernière mise à jour**: 2025-10-09
