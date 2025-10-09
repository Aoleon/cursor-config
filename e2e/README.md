# Infrastructure de Tests E2E Playwright - Saxium

Cette documentation explique l'architecture complète des tests End-to-End (E2E) pour l'application Saxium, organisée par workflow.

## 📁 Structure du Projet

```
e2e/
├── fixtures/
│   ├── test-data.ts          # Générateurs de données de test uniques
│   ├── auth.setup.ts          # Configuration authentification tests
│   └── database.setup.ts      # Helpers gestion base de données
├── helpers/
│   ├── navigation.ts          # Helpers de navigation
│   ├── forms.ts               # Helpers de formulaires
│   ├── assertions.ts          # Assertions personnalisées
│   └── api.ts                 # Helpers d'appels API
├── workflows/
│   ├── chiffrage.spec.ts      # Tests workflow Chiffrage
│   ├── envoi-devis.spec.ts    # Tests workflow Envoi Devis
│   ├── planification.spec.ts  # Tests workflow Planification
│   ├── chantier.spec.ts       # Tests workflow Chantier
│   └── chatbot.spec.ts        # Tests Chatbot IA
└── e2e/
    └── user-journeys.spec.ts  # Tests parcours utilisateur complets
```

## 🚀 Installation et Configuration

### Prérequis

- Node.js >= 18
- Playwright installé (`@playwright/test` déjà dans les dépendances)
- Base de données PostgreSQL configurée
- Application Saxium fonctionnelle

### Installation de Playwright (si nécessaire)

```bash
npx playwright install
```

## 📋 Scripts NPM à Ajouter

**Important**: Ajoutez ces scripts dans votre `package.json` :

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report",
    "test:e2e:workflow": "playwright test e2e/workflows",
    "test:e2e:journeys": "playwright test e2e/e2e"
  }
}
```

## 🏃 Lancement des Tests

### Tous les tests
```bash
npm run test:e2e
```

### Mode interface utilisateur (recommandé pour le développement)
```bash
npm run test:e2e:ui
```

### Avec navigateur visible
```bash
npm run test:e2e:headed
```

### Mode debug
```bash
npm run test:e2e:debug
```

### Tests par catégorie
```bash
# Tests des workflows uniquement
npm run test:e2e:workflow

# Tests des parcours utilisateur uniquement
npm run test:e2e:journeys

# Test d'un workflow spécifique
npx playwright test e2e/workflows/chiffrage.spec.ts

# Test d'un fichier spécifique
npx playwright test e2e/workflows/planification.spec.ts
```

## 🔧 Configuration

La configuration Playwright se trouve dans `playwright.config.ts` :

- **Base URL**: `http://localhost:5000`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Retry**: 1 fois en local, 2 fois en CI
- **Timeout global**: 30 secondes
- **Timeout actions**: 10 secondes
- **Screenshots**: Uniquement en cas d'échec
- **Vidéos**: Uniquement au premier retry

## 📝 Écrire de Nouveaux Tests

### 1. Tests de Workflow

Créer un nouveau fichier dans `e2e/workflows/`:

```typescript
import { test, expect } from '@playwright/test';
import { goToWorkflow, waitForPageLoad } from '../helpers/navigation';
import { assertWorkflowLoaded, assertNoLoadingState } from '../helpers/assertions';
import { cleanupTestData, generateTestData } from '../fixtures/test-data';

test.describe('Mon Nouveau Workflow', () => {
  const createdIds: { projects?: string[] } = {};

  test.afterEach(async ({ page }) => {
    await cleanupTestData(page, createdIds);
  });

  test('Navigation et chargement', async ({ page }) => {
    await goToWorkflow(page, 'mon-workflow');
    await assertWorkflowLoaded(page, 'Mon Workflow');
    await assertNoLoadingState(page);
  });
});
```

### 2. Tests de Parcours Utilisateur

Ajouter dans `e2e/e2e/user-journeys.spec.ts` :

```typescript
test('Parcours: Mon nouveau scénario', async ({ page }) => {
  // 1. Démarrage
  await goToDashboard(page);

  // 2. Actions utilisateur
  await goToWorkflow(page, 'chiffrage');
  
  // 3. Vérifications
  await assertWorkflowLoaded(page, 'Chiffrage');
});
```

## 🛠️ Helpers Disponibles

### Navigation (`helpers/navigation.ts`)

```typescript
// Navigation vers un workflow
await goToWorkflow(page, 'chiffrage');
await goToWorkflow(page, 'envoi-devis');
await goToWorkflow(page, 'planification');
await goToWorkflow(page, 'chantier');
await goToWorkflow(page, 'chatbot');

// Navigation générale
await goToDashboard(page);
await goToAOs(page);
await goToProjects(page);
await goToOffers(page);

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

// Sélectionner une option
await selectOption(page, 'select-departement', '75');

// Soumettre un formulaire
await submitForm(page, 'button-submit');
```

### Assertions (`helpers/assertions.ts`)

```typescript
// Vérifier le chargement d'un workflow
await assertWorkflowLoaded(page, 'Chiffrage');

// Vérifier un état vide
await assertEmptyState(page);

// Vérifier un toast de succès
await assertSuccessToast(page, 'Opération réussie');

// Vérifier l'absence d'erreurs console
await assertNoConsoleErrors(page);

// Vérifier qu'un élément est visible
await assertElementVisible(page, 'card-projet-123');
```

### API (`helpers/api.ts`)

```typescript
// Appels GET
const data = await apiGet(page, '/api/projects');

// Appels POST
const result = await apiPost(page, '/api/projects', { nom: 'Test' });

// Créer une ressource
const id = await createResource(page, '/api/aos', aoData);

// Supprimer une ressource
await deleteResource(page, '/api/projects', projectId);
```

### Données de Test (`fixtures/test-data.ts`)

```typescript
// Générer des données uniques
const ao = generateTestAO({ 
  montantEstime: 150000,
  departement: '75'
});

const project = generateTestProject({
  status: 'planification',
  montant: 200000
});

const offer = generateTestOffer({
  status: 'en_cours_chiffrage'
});

// Créer via API
const aoId = await createAOViaAPI(page, ao);
const projectId = await createProjectViaAPI(page, project);

// Nettoyer après les tests
await cleanupTestData(page, {
  aos: [aoId],
  projects: [projectId]
});
```

## 🔐 Authentification

En mode test (`NODE_ENV=test`), l'authentification est automatique :

- Un middleware de bypass crée automatiquement une session de test
- L'utilisateur test a le rôle `admin`
- Pas besoin de login manuel dans les tests

## 🗄️ Gestion de la Base de Données

### Isolation des Tests

Chaque test doit :
1. Créer ses propres données avec `nanoid` pour l'unicité
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

### Helpers de Base de Données

```typescript
// Nettoyer la DB
await cleanupDatabase(page, {
  aos: true,
  projects: true,
  offers: true
});

// Vérifier la connexion
const isConnected = await checkDatabaseConnection(page);

// Compter les enregistrements
const count = await countRecords(page, 'projects');
```

## 📊 Bonnes Pratiques

### 1. Isolation des Tests
- ✅ Chaque test est indépendant
- ✅ Créer ses propres données avec `nanoid`
- ✅ Nettoyer après chaque test

### 2. Utilisation des data-testid
- ✅ Utiliser les data-testid existants dans l'app
- ✅ Pattern: `{action}-{target}` (ex: `button-submit`, `input-email`)
- ✅ Pour les listes: `{type}-{description}-{id}` (ex: `card-project-123`)

### 3. Gestion des Erreurs
- ✅ Vérifier l'absence d'erreurs console critiques
- ✅ Utiliser des timeouts appropriés
- ✅ Gérer les états de chargement

### 4. Structure des Tests
```typescript
test.describe('Fonctionnalité X', () => {
  // Setup global
  const createdIds = {};

  test.beforeEach(async ({ page }) => {
    // Préparation commune
  });

  test.afterEach(async ({ page }) => {
    // Nettoyage
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
npm run test:e2e:headed
```

### Mode debug interactif
```bash
npm run test:e2e:debug
```

### Voir le rapport HTML
```bash
npm run test:e2e:report
```

### Inspecteur Playwright
Le mode `--debug` ouvre l'inspecteur avec :
- Pause sur chaque action
- Console du navigateur
- Sélecteur d'éléments

## 📈 Rapports

Après exécution, un rapport HTML est généré :
```bash
npx playwright show-report
```

Le rapport contient :
- Résultats détaillés de chaque test
- Screenshots des échecs
- Vidéos des retries
- Traces complètes

## 🚨 Dépannage

### Les tests ne trouvent pas d'éléments
- Vérifier que les `data-testid` sont présents dans l'app
- Augmenter les timeouts si nécessaire
- Utiliser `page.pause()` pour inspecter

### Erreurs d'authentification
- Vérifier que `NODE_ENV=test` est défini
- Vérifier que le serveur est démarré en mode test

### Base de données non nettoyée
- Vérifier l'appel à `cleanupTestData()` dans `afterEach`
- Utiliser des IDs uniques avec `nanoid`

### Timeouts
- Tests lents : augmenter `timeout` dans `playwright.config.ts`
- Actions spécifiques : utiliser `{ timeout: 15000 }` sur l'action

## 📚 Ressources

- [Documentation Playwright](https://playwright.dev)
- [Best Practices Playwright](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

## 🤝 Contribuer

1. Créer une branche pour vos tests
2. Suivre les conventions de nommage
3. Ajouter la documentation nécessaire
4. Vérifier que tous les tests passent
5. Faire une PR

## ⚙️ CI/CD

En environnement CI (GitHub Actions, etc.) :
- Les tests s'exécutent en mode headless
- 2 retries automatiques en cas d'échec
- 1 worker pour éviter les conflits
- Screenshots et vidéos conservés en cas d'échec

Configuration suggérée :
```yaml
- name: Run E2E tests
  run: npm run test:e2e
  env:
    NODE_ENV: test
    CI: true
```

---

**Maintenance**: Cette infrastructure de tests doit être maintenue et enrichie au fur et à mesure de l'évolution de l'application Saxium.
