# Journey Tests - E2E Parcours Complets

## Vue d'ensemble

Ce répertoire contient les tests E2E qui valident les parcours utilisateur complets à travers plusieurs workflows de l'application Saxium.

## Tests disponibles

### 1. `ao-to-chantier.spec.ts` - Parcours Offer → Chantier

**Journey testé** : `Offer (Chiffrage) → Validation → Project → Planification → Chantier`

#### Tests inclus

1. **should complete full journey from Offer to Chantier**
   - Test principal du parcours E2E complet
   - Couvre 7 phases de workflow
   - Utilise les seeds E2E avec IDs déterministes

2. **should verify navigation flow between workflow pages**
   - Valide la navigation entre planification et chantier
   - Test rapide de transition de status

3. **should handle offer workflow from chiffrage to validation**
   - Valide le sous-parcours Offer
   - Chiffrage → Validation

## Architecture des tests

### Foundation utilisée

- **Fixtures** : `tests/fixtures/e2e/test-data.ts`
  - IDs déterministes (`e2e-ao-complete-001`, etc.)
  - Générateurs de données (`generateTestAO`, `generateTestOffer`, `generateTestProject`)
  - Seeds pré-configurés (`e2eSeeds`)

- **Helpers API** : `tests/helpers/api.ts`
  - `resetE2EState()` - Nettoyage complet
  - `seedE2EData()` - Création des seeds
  - Routes de test `/api/test/seed/*`

- **Helpers Navigation** : `tests/helpers/navigation.ts`
  - `waitForPageLoad()` - Attente stabilisation page
  - Navigation helpers (à développer si besoin)

- **Helpers Assertions** : `tests/helpers/assertions.ts`
  - Assertions personnalisées (à développer si besoin)

### Pattern de test

```typescript
test.beforeEach(async ({ page }) => {
  await resetE2EState(page);   // Reset DB
  await seedE2EData(page);      // Seed test data
});

test.afterEach(async ({ page }) => {
  await resetE2EState(page);    // Cleanup
});

test('journey test', async ({ page }) => {
  // Phase 1: Action
  // Phase 2: Vérification
  // Phase 3: Transition
  // ...
});
```

## Déviations par rapport au spec initial

### Spec original vs Implémentation réelle

Le spec demandait le parcours :
```
AO (Envoi Devis) → Offer (Chiffrage) → Validation → Project → Planning → Chantier
```

**Implémentation actuelle** :
```
Offer (Chiffrage) → Validation → Project → Planification → Chantier
```

### Raisons des adaptations

1. **Transformation AO → Offer non implémentée**
   - La page `/workflow/envoi-devis` permet de convertir AO directement en Project
   - Pas de bouton "Transform to Offer" dans l'UI actuelle
   - Les Offers sont créées indépendamment ou depuis d'autres sources

2. **Workflow Offer autonome**
   - Les Offers ont leur propre workflow : chiffrage → validation
   - Elles peuvent être transformées en Projects (à implémenter)
   - Le test commence avec une Offer pré-seeded

3. **Status et transitions**
   - Status Offer : `en_attente_fournisseurs` → `en_cours_chiffrage` → `en_attente_validation` → `fin_etudes_validee`
   - Status Project : `planification` → `chantier` → `sav`
   - Les transitions via API quand les boutons UI ne sont pas disponibles

## Data-testid utilisés

### Page: `/offers/chiffrage-list`
- `card-offer-{offerId}` - Carte d'offre
- `button-start-chiffrage-{offerId}` - Démarrer chiffrage
- `button-view-offer-{offerId}` - Voir détails

### Page: `/offers/validation-list`
- `card-offer-{offerId}` - Carte d'offre
- `button-validate-{offerId}` - Valider l'offre
- `button-view-offer-{offerId}` - Voir détails

### Page: `/workflow/planification`
- `card-project-{projectId}` - Carte de projet
- `project-reference-{projectId}` - Référence du projet
- `button-start-chantier-{projectId}` - Démarrer chantier
- `button-validate-planning-{projectId}` - Valider planning
- `indicator-tasks-{projectId}` - Indicateur tâches
- `indicator-teams-{projectId}` - Indicateur équipes
- `indicator-dates-{projectId}` - Indicateur dates

### Page: `/workflow/chantier`
- `card-chantier-{projectId}` - Carte de chantier
- `chantier-reference-{projectId}` - Référence
- `chantier-client-{projectId}` - Client
- `status-badge-{projectId}` - Badge status
- `progress-bar-{projectId}` - Barre progression
- `progress-percentage-{projectId}` - Pourcentage
- `button-photos-{projectId}` - Suivi photo
- `button-progress-report-{projectId}` - Rapport
- `button-pause-{projectId}` - Suspendre
- `indicator-teams-present-{projectId}` - Équipes présentes
- `indicator-photos-{projectId}` - Photos
- `indicator-report-{projectId}` - Rapport

## Exécution des tests

### Tous les tests du journey
```bash
npx playwright test tests/e2e/journeys/ao-to-chantier.spec.ts
```

### Test principal uniquement
```bash
npx playwright test tests/e2e/journeys/ao-to-chantier.spec.ts -g "should complete full journey"
```

### Mode debug
```bash
npx playwright test tests/e2e/journeys/ao-to-chantier.spec.ts --debug
```

### Avec UI
```bash
npx playwright test tests/e2e/journeys/ao-to-chantier.spec.ts --ui
```

## Maintenance et évolution

### Ajouter une nouvelle phase au journey

1. Identifier les data-testid nécessaires dans la page
2. Ajouter les steps dans le test principal
3. Utiliser des assertions claires avec timeout explicites
4. Logger chaque phase avec `console.log()` pour faciliter debug

### Exemple d'ajout de phase

```typescript
// ==========================================
// Phase X: Nouvelle fonctionnalité
// ==========================================
console.log('Phase X: Description de la phase');

await page.goto('/nouvelle-page');
await waitForPageLoad(page);

const element = page.locator('[data-testid="element-id"]');
await expect(element).toBeVisible({ timeout: 10000 });

console.log('✅ Phase X terminée');
```

### Bonnes pratiques

1. **Toujours utiliser `beforeEach` et `afterEach`** pour reset/cleanup
2. **Timeouts explicites** sur toutes les assertions critiques
3. **Console logs** pour tracer le parcours pendant exécution
4. **Vérifications graduelles** : d'abord visibilité, puis contenu, puis actions
5. **Fallback API** quand l'UI ne permet pas l'action
6. **Cleanup après tests** même en cas d'erreur (via `afterEach`)

## Troubleshooting

### Test échoue sur seed
- Vérifier que les routes `/api/test/seed/*` sont actives
- Vérifier la structure des données dans `test-data.ts`
- Check les logs serveur pour erreurs de validation

### Element non trouvé
- Vérifier le data-testid dans la page source
- Augmenter le timeout si chargement lent
- Vérifier que le seed a bien créé les données

### Transition de status ne fonctionne pas
- Vérifier les routes API de transition (`/validate-planning`, `/start-chantier`)
- Utiliser l'API directement en fallback
- Vérifier les conditions requises (flags `tasksCreated`, etc.)

### Cleanup incomplet
- Vérifier que `resetE2EState()` appelle bien les routes de suppression
- Vérifier que les IDs des seeds sont corrects
- Check les erreurs 404 (normales si déjà supprimé)

## Améliorations futures

- [ ] Ajouter assertions sur les toasts/notifications
- [ ] Tester les cas d'erreur (validation échoue, etc.)
- [ ] Ajouter tests de régression sur workflows modifiés
- [ ] Implémenter la transformation Offer → Project si développée
- [ ] Ajouter le parcours AO → Offer si implémenté
- [ ] Tests de performance sur journeys longs
- [ ] Screenshots automatiques à chaque phase
- [ ] Rapport HTML personnalisé du journey

## Références

- [Playwright Documentation](https://playwright.dev)
- [Spec initiale](../../../replit.md) - Section E2E Testing
- [Test data fixtures](../../fixtures/e2e/test-data.ts)
- [API helpers](../../helpers/api.ts)
- [Navigation helpers](../../helpers/navigation.ts)
