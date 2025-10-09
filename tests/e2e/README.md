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
└── helpers/                           # Helpers partagés
    ├── navigation.ts                  # Helpers de navigation
    ├── forms.ts                       # Helpers de formulaires
    ├── assertions.ts                  # Assertions personnalisées
    └── api.ts                         # Helpers d'appels API
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

### ⚠️ Note sur les Scripts NPM
Les scripts NPM ne peuvent pas être ajoutés automatiquement au package.json.
Utilisez directement les commandes `npx` ci-dessous :

### Tous les tests (645 tests)
```bash
npx playwright test
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
  timeout: 30000,                   // 30s timeout global
  actionTimeout: 10000,             // 10s timeout actions
  
  // Mode test avec authentification automatique
  webServer: {
    command: 'NODE_ENV=test tsx server/index.ts',
    url: 'http://localhost:5000',
    env: {
      NODE_ENV: 'test',
      DISABLE_SCHEDULER: '1'
    }
  },
  
  // Multi-navigateurs
  projects: [
    { name: 'chromium' },
    { name: 'firefox' },
    { name: 'webkit' },
    { name: 'Mobile Chrome' },
    { name: 'Mobile Safari' }
  ],
  
  // Gestion des échecs
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  
  // Captures
  screenshot: 'only-on-failure',
  video: 'on-first-retry',
  trace: 'on-first-retry'
}
```

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

## 📈 Rapports et Métriques

### Rapport HTML
Après exécution :
```bash
npx playwright show-report
```

Le rapport contient :
- Résultats de tous les tests (645 tests)
- Screenshots des échecs
- Vidéos des retries
- Traces complètes avec timeline

### Métriques Actuelles
- **Total tests**: 645
- **Fichiers**: 16
- **Coverage**: 433 data-testid dans l'application
- **Browsers**: 5 (Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari)

## ⚙️ CI/CD

En environnement CI (GitHub Actions, etc.) :
```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test
  env:
    NODE_ENV: test
    CI: true

- name: Upload test results
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

Configuration en CI :
- 2 retries automatiques
- 1 worker pour éviter les conflits
- Screenshots/vidéos conservés en cas d'échec

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
**Dernière mise à jour**: 2025-10-09
