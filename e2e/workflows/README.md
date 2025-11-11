# Tests E2E - Nouveaux Workflows

Ce dossier contient les tests E2E Playwright pour les nouveaux workflows implémentés.

## Workflows testés

1. **Feedback Terrain** (`feedback-terrain-workflow.spec.ts`)
   - Création de feedback depuis le terrain
   - Assignation à un utilisateur BE
   - Résolution du feedback

2. **SAV Workflow** (`sav-workflow.spec.ts`)
   - Création d'une demande SAV
   - Commande de matériel
   - Planification RDV
   - Validation quitus

3. **BE Checklist** (`be-checklist-workflow.spec.ts`)
   - Initialisation de la checklist
   - Vérification des items
   - Validation pour fin d'études

4. **Time Tracking** (`time-tracking-workflow.spec.ts`)
   - Enregistrement de temps
   - Récupération du résumé par projet
   - Filtrage par type de tâche

5. **Workload Simulation** (`workload-simulation-workflow.spec.ts`)
   - Simulation sur une période
   - Charge actuelle
   - Détection de goulots d'étranglement

6. **Prévu vs Réel** (`prevu-vs-reel-workflow.spec.ts`)
   - Comparaison pour un projet
   - Comparaison globale
   - Filtrage par projets

## Exécution des tests

### Tous les nouveaux workflows

```bash
npm run test:e2e:new-workflows
```

### Un workflow spécifique

```bash
npx playwright test e2e/workflows/feedback-terrain-workflow.spec.ts --project=new-workflows
```

### Tous les tests E2E

```bash
npx playwright test --project=new-workflows
```

### Avec interface UI

```bash
npx playwright test --project=new-workflows --ui
```

## Prérequis

1. Le serveur doit être démarré (Playwright le démarre automatiquement via `webServer`)
2. L'authentification doit être configurée (fichier `e2e/.auth/user.json`)
3. La base de données doit être accessible

## Structure des tests

Chaque test suit cette structure :

```typescript
test.describe('Workflow Name', () => {
  let projectId: string;
  
  test.beforeAll(async ({ page }) => {
    await waitForApiReady(page);
    // Création des données de test
  });
  
  test('should do something', async ({ page }) => {
    // Test spécifique
  });
});
```

## Helpers disponibles

Les tests utilisent les helpers de `e2e/helpers/api.ts` :

- `apiGet(page, endpoint)` - GET request
- `apiPost(page, endpoint, data)` - POST request
- `apiPatch(page, endpoint, data)` - PATCH request
- `apiPut(page, endpoint, data)` - PUT request
- `apiDelete(page, endpoint)` - DELETE request
- `waitForApiReady(page)` - Attend que l'API soit prête

## Notes

- Les tests créent des données de test qui peuvent être nettoyées après les tests
- Les tests sont indépendants et peuvent être exécutés en parallèle
- Les timeouts sont configurés dans `playwright.config.ts`


