# Tests Playwright - Workflow Chiffrage

## 📋 Vue d'ensemble

Ce document décrit les tests E2E complets créés pour le workflow **Chiffrage** de Saxium.

Le fichier de tests est situé à : `tests/e2e/workflows/chiffrage.spec.ts`

## ✅ Tests implémentés

### 🧭 Navigation & Chargement (4 tests)

1. **Devrait naviguer vers le workflow et afficher le titre**
   - Navigation vers `/workflow/chiffrage`
   - Vérification du titre "Chiffrage"
   - Assertions sur le chargement correct

2. **Devrait afficher les breadcrumbs correctement**
   - Vérifie "Tableau de bord" → "Chiffrage"
   - Liens de navigation fonctionnels

3. **Devrait charger la page sans erreurs console**
   - Capture des erreurs JavaScript
   - Filtrage des erreurs non-critiques (favicon, chunks)

4. **Devrait vérifier qu'il n'y a pas d'état de chargement persistant**
   - Vérifie que le spinner disparaît après chargement

### 🎨 États d'affichage (2 tests)

5. **Devrait afficher l'état vide quand aucune offre en chiffrage**
   - Détection de l'état vide avec data-testid="empty-state"
   - Message "Aucune offre en chiffrage actuellement"

6. **Devrait afficher la liste des offres quand des données existent**
   - Création d'offre de test via API
   - Vérification de l'affichage de la carte d'offre
   - État vide non visible quand données présentes

### 📊 Statistiques (5 tests)

7. **Devrait afficher les 4 cartes de statistiques**
   - Card "En cours" (data-testid="stat-en-cours")
   - Card "Volume total" (data-testid="stat-volume-total")
   - Card "Marge moyenne" (data-testid="stat-marge-moyenne")
   - Card "À valider" (data-testid="stat-a-valider")

8. **Devrait afficher le nombre correct d'offres en cours**
   - Création de 2 offres de test
   - Vérification du compteur "En cours" >= 2

9. **Devrait calculer le volume total correctement**
   - Offres avec montants différents
   - Vérification du calcul cumulé

10. **Devrait afficher la marge moyenne fixe**
    - Vérification de la valeur 15.2%

11. **Devrait compter les offres à valider**
    - Offres avec montantEstime ET dpgfDocument
    - Compteur "À valider" >= 1

### 📝 Affichage des offres (3 tests)

12. **Devrait afficher la référence, client et intitulé de l'offre**
    - data-testid="offer-reference-{id}"
    - data-testid="offer-client-{id}"
    - data-testid="offer-operation-{id}"

13. **Devrait afficher les informations financières**
    - data-testid="offer-financials-{id}"
    - data-testid="offer-montant-{id}"
    - data-testid="offer-prorata-{id}"
    - data-testid="offer-be-hours-{id}"

14. **Devrait afficher les indicateurs de progression**
    - data-testid="indicator-montant-{id}"
    - data-testid="indicator-dpgf-{id}"
    - data-testid="indicator-be-hours-{id}"

### 🔘 Actions contextuelles (5 tests)

15. **Devrait toujours afficher le bouton "Module chiffrage"**
    - data-testid="button-module-chiffrage-{id}"
    - Bouton toujours visible et enabled

16. **Devrait rediriger vers le module de chiffrage au clic**
    - Clic sur "Module chiffrage"
    - Redirection vers `/offers/{id}/chiffrage`

17. **Devrait afficher les boutons DPGF si dpgfDocument existe**
    - data-testid="button-view-dpgf-{id}"
    - data-testid="button-download-dpgf-{id}"
    - Visibles uniquement si DPGF généré

18. **Devrait afficher "Chiffrage incomplet" si données manquantes**
    - data-testid="button-chiffrage-incomplet-{id}"
    - Bouton désactivé si pas de montantEstime ou dpgfDocument

19. **Devrait afficher "Valider le chiffrage" si offre complète**
    - data-testid="button-validate-chiffrage-{id}"
    - Bouton enabled si montantEstime ET dpgfDocument

### ✅ Validation & Mutations (2 tests)

20. **Devrait valider un chiffrage complet avec succès**
    - POST vers `/api/offers/{id}/validate-chiffrage`
    - Toast de succès affiché
    - Message "Chiffrage validé"

21. **Devrait invalider le cache après validation**
    - Mutation réussie
    - Invalidation de la query cache
    - Rafraîchissement des données

### ❌ Gestion d'erreurs (4 tests)

22. **Devrait afficher un message d'erreur en cas d'échec API**
    - Simulation d'erreur réseau
    - data-testid="error-state" visible
    - data-testid="error-message" avec texte d'erreur

23. **Devrait afficher le bouton Réessayer en cas d'erreur**
    - data-testid="button-retry" visible et enabled

24. **Devrait recharger les données au clic sur Réessayer**
    - Clic sur Réessayer
    - Nouvelle requête API
    - État d'erreur disparaît

25. **Devrait afficher une erreur si la validation échoue**
    - Simulation d'erreur 500
    - Toast d'erreur affiché

### 🔬 Cas limites (2 tests)

26. **Devrait gérer une offre avec tous les champs remplis**
    - Offre avec deadline, prorata, heures BE
    - Tous les éléments affichés correctement

27. **Devrait gérer plusieurs offres simultanément**
    - Création de 3 offres
    - Toutes visibles dans la liste
    - Statistiques correctes

## 🏷️ Data-testid ajoutés

### Statistiques
- `stat-en-cours` - Card "En cours"
- `stat-value-en-cours` - Valeur nombre d'offres
- `stat-volume-total` - Card "Volume total"
- `stat-value-volume` - Valeur montant total
- `stat-marge-moyenne` - Card "Marge moyenne"
- `stat-value-marge` - Valeur pourcentage marge
- `stat-a-valider` - Card "À valider"
- `stat-value-a-valider` - Valeur nombre à valider

### États
- `loading-state` - Indicateur de chargement
- `empty-state` - État vide (aucune offre)
- `error-state` - État d'erreur
- `error-message` - Message d'erreur
- `button-retry` - Bouton Réessayer

### Offres (pattern: `{type}-{field}-{offerId}`)
- `card-offer-{id}` - Carte d'offre
- `offer-reference-{id}` - Référence
- `offer-client-{id}` - Client
- `offer-operation-{id}` - Intitulé opération
- `offer-deadline-{id}` - Badge échéance
- `offer-status-{id}` - Statut
- `offer-financials-{id}` - Section infos financières
- `offer-montant-{id}` - Montant estimé
- `offer-prorata-{id}` - Prorata éventuel
- `offer-be-hours-{id}` - Heures BE
- `offer-workflow-status-{id}` - Statut workflow

### Indicateurs
- `offer-indicators-{id}` - Section indicateurs
- `indicator-montant-{id}` - Indicateur montant estimé
- `indicator-dpgf-{id}` - Indicateur DPGF généré
- `indicator-be-hours-{id}` - Indicateur heures BE

### Actions
- `offer-actions-{id}` - Section actions
- `button-module-chiffrage-{id}` - Bouton "Module chiffrage"
- `button-view-dpgf-{id}` - Bouton "Voir DPGF"
- `button-download-dpgf-{id}` - Bouton "Télécharger"
- `button-validate-chiffrage-{id}` - Bouton "Valider le chiffrage"
- `button-chiffrage-incomplet-{id}` - Bouton "Chiffrage incomplet"

## 🚀 Exécution des tests

### Tous les tests du workflow Chiffrage
```bash
npx playwright test tests/e2e/workflows/chiffrage.spec.ts
```

### Un test spécifique
```bash
npx playwright test tests/e2e/workflows/chiffrage.spec.ts --grep "devrait naviguer"
```

### En mode debug
```bash
npx playwright test tests/e2e/workflows/chiffrage.spec.ts --debug
```

### Avec interface UI
```bash
npx playwright test tests/e2e/workflows/chiffrage.spec.ts --ui
```

### Un seul navigateur
```bash
npx playwright test tests/e2e/workflows/chiffrage.spec.ts --project=chromium
```

## 📦 Prérequis

### Setup d'authentification

Les tests nécessitent un setup d'authentification. Assurez-vous que :

1. Le serveur tourne en mode test (`NODE_ENV=test`)
2. Le fichier d'authentification existe : `e2e/.auth/user.json`
3. Le setup a été exécuté : `npx playwright test tests/fixtures/e2e/auth.setup.ts`

### Variables d'environnement

```bash
NODE_ENV=test
DISABLE_SCHEDULER=1
```

## 🛠️ Helpers utilisés

- **Navigation** : `goToWorkflow()`, `waitForPageLoad()`, `assertURL()`
- **Assertions** : `assertWorkflowLoaded()`, `assertEmptyState()`, `assertSuccessToast()`, `assertErrorToast()`
- **API** : `createOfferViaAPI()`, `apiPatch()`, `deleteOfferViaAPI()`
- **Fixtures** : `generateTestOffer()`, `cleanupTestData()`

## 📊 Couverture des fonctionnalités

| Fonctionnalité | Tests | Statut |
|---------------|-------|--------|
| Navigation & Chargement | 4 | ✅ Complet |
| États d'affichage | 2 | ✅ Complet |
| Statistiques | 5 | ✅ Complet |
| Affichage offres | 3 | ✅ Complet |
| Actions contextuelles | 5 | ✅ Complet |
| Validation & Mutations | 2 | ✅ Complet |
| Gestion d'erreurs | 4 | ✅ Complet |
| Cas limites | 2 | ✅ Complet |
| **TOTAL** | **27** | **✅ 100%** |

## 🐛 Problèmes connus

### Authentification
- Les tests échouent actuellement à cause de problèmes d'authentification
- Le setup d'authentification doit être exécuté avant les tests
- Fichier manquant : `e2e/.auth/user.json`

**Solution** : Exécuter le setup d'authentification :
```bash
npx playwright test tests/fixtures/e2e/auth.setup.ts
```

### API des offres
- L'endpoint `/api/offers` doit supporter le paramètre `?status=en_cours_chiffrage`
- L'endpoint `/api/offers/{id}/validate-chiffrage` doit exister

## 📝 Améliorations futures

1. **Tests de performance**
   - Temps de chargement des offres
   - Temps de validation du chiffrage

2. **Tests visuels**
   - Screenshots de régression
   - Comparaison visuelle des statistiques

3. **Tests de pagination**
   - Si plus de 10 offres
   - Navigation entre pages

4. **Tests d'accessibilité**
   - ARIA labels
   - Navigation au clavier
   - Contraste des couleurs

5. **Tests mobile**
   - Layout responsive
   - Touch interactions
   - Menu mobile

## 📚 Références

- [Documentation Playwright](https://playwright.dev)
- [Best practices E2E testing](https://playwright.dev/docs/best-practices)
- [Pattern Page Object Model](https://playwright.dev/docs/pom)
