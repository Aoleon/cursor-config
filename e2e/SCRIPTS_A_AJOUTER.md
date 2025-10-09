# Scripts NPM à Ajouter pour les Tests E2E

⚠️ **IMPORTANT** : Ajoutez ces scripts dans votre `package.json` pour pouvoir lancer les tests E2E.

## Scripts à Ajouter

Dans la section `"scripts"` de votre `package.json`, ajoutez :

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

## Description des Scripts

- **`test:e2e`** : Lance tous les tests E2E en mode headless
- **`test:e2e:ui`** : Lance Playwright UI Mode (interface graphique interactive)
- **`test:e2e:headed`** : Lance les tests avec le navigateur visible
- **`test:e2e:debug`** : Lance en mode debug avec l'inspecteur Playwright
- **`test:e2e:report`** : Affiche le rapport HTML des derniers tests
- **`test:e2e:workflow`** : Lance uniquement les tests des workflows
- **`test:e2e:journeys`** : Lance uniquement les tests de parcours utilisateur

## Vérification

Après avoir ajouté les scripts, vous pouvez vérifier qu'ils fonctionnent :

```bash
npm run test:e2e -- --help
```

## Lancement Initial

Pour lancer les tests la première fois :

1. Vérifiez que Playwright est installé :
   ```bash
   npx playwright install
   ```

2. Lancez les tests en mode UI (recommandé pour le développement) :
   ```bash
   npm run test:e2e:ui
   ```

3. Ou lancez tous les tests :
   ```bash
   npm run test:e2e
   ```

## Note Technique

⚠️ Le fichier `package.json` ne peut pas être modifié automatiquement par l'agent selon les règles du projet. Ces scripts doivent être ajoutés manuellement.

---

Voir `e2e/README.md` pour la documentation complète de l'infrastructure de tests.
