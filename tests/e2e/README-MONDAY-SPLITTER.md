# Test E2E MondayDataSplitter - Guide d'exécution

## 📋 Vue d'ensemble

Test Playwright E2E complet pour valider le workflow Monday→Saxium avec déduplication et atomicité.

**Fichier test**: `tests/e2e/monday-splitter.spec.ts`

## ✅ Critères d'acceptation validés

1. ✅ GET /analyze retourne opportunités (lots, contacts, addresses, masters)
2. ✅ POST /split crée AO avec monday_item_id
3. ✅ Lots créés et liés à AO (FK ao_id)
4. ✅ Contacts liés à AO via aoContacts
5. ✅ Ré-import même item → contactsCreated=0, mastersCreated=0 (déduplication)
6. ✅ DB reste cohérente (pas de doublons, compteurs exacts)

## 🧪 Structure des tests

### Test 1: Analyse du board Monday
- **Objectif**: Vérifier que l'endpoint `/api/monday/boards/:boardId/analyze` détecte correctement les opportunités
- **Assertions**:
  - Structure de réponse valide (boardId, stats, items)
  - Stats contiennent des items
  - Opportunités détectées (lots, contacts, addresses, masters)

### Test 2: Split et création AO
- **Objectif**: Vérifier que l'endpoint `/api/monday/import/split` crée correctement l'AO et entités liées
- **Assertions**:
  - AO créé avec monday_item_id
  - Lots créés et liés via FK ao_id
  - Contacts liés via table aoContacts
  - Pas de doublons AO (compteur exact +1)

### Test 3: Déduplication sur ré-import
- **Objectif**: Vérifier que le ré-import du même item réutilise les entités existantes
- **Assertions**:
  - contactsCreated = 0 (réutilisation)
  - mastersCreated = 0 (réutilisation)
  - Compteurs DB stables (pas de nouveaux contacts/masters)

## 🚀 Exécution des tests

### Option 1: Exécuter tous les tests E2E
```bash
npx playwright test tests/e2e/monday-splitter.spec.ts
```

### Option 2: Exécuter sur un navigateur spécifique
```bash
npx playwright test tests/e2e/monday-splitter.spec.ts --project=chromium
```

### Option 3: Mode debug
```bash
npx playwright test tests/e2e/monday-splitter.spec.ts --debug
```

### Option 4: Mode headless
```bash
npx playwright test tests/e2e/monday-splitter.spec.ts --headed
```

## 📊 Configuration

### Board Monday utilisé
- **Board ID**: `8952933832` (Board Modèle MEXT)
- **Note**: Tests utilisent des données Monday.com réelles
- **Fallback**: Tests sont skip si le board est vide

### Browsers testés
- ✅ Chromium (Desktop)
- ✅ Firefox (Desktop)
- ✅ WebKit (Desktop)
- ✅ Mobile Chrome
- ✅ Mobile Safari

**Total**: 16 tests (3 scénarios × 5 browsers + setup)

## 🔧 Prérequis

1. **Environnement de test configuré**:
   - `NODE_ENV=test` (configuré automatiquement par playwright.config.ts)
   - Database accessible
   - Monday API key valide

2. **Authentification**:
   - Tests utilisent l'auth setup automatique (tests/e2e/auth.setup.ts)
   - Session sauvegardée dans `e2e/.auth/user.json`

## 📝 Logs et rapports

### Rapports HTML
```bash
npx playwright show-report
```

### Logs détaillés
Les tests incluent des logs console détaillés à chaque étape:
```
✅ Test item Monday détecté: {itemId}
   - Lots détectés: X
   - Contacts détectés: Y
   - Adresses détectées: Z
   
📊 Snapshot DB avant import: X AOs existants
✅ Split réussi: AO créé avec ID {aoId}
✅ AO vérifié en DB avec mondayItemId = {itemId}
✅ X lots vérifiés en DB, liés à l'AO
✅ Cohérence DB vérifiée: X → Y AOs (+1)

🎯 DÉDUPLICATION VALIDÉE: Aucun doublon créé lors du ré-import
```

## ⚠️ Notes importantes

### Gestion des erreurs TypeScript
Les champs de base de données utilisent:
- **camelCase** pour la plupart des tables (ex: `mondayItemId`, `aoId`)
- **snake_case** pour certaines tables de jonction (ex: `aoContacts.ao_id`)

### Tests interdépendants
Les tests partagent une variable `testMondayItemId`:
- Test 1: Détecte l'item
- Tests 2-3: Utilisent l'item détecté (skip si non disponible)

### Données réelles
⚠️ **Important**: Ces tests utilisent des données Monday.com réelles
- Assurez-vous d'avoir une connexion Monday API valide
- Board ID `8952933832` doit contenir des items
- Si le board est vide, les tests seront automatiquement skip

## 🐛 Debugging

### Test échoue à l'analyse
```bash
# Vérifier la connexion Monday
curl http://localhost:5000/api/monday/test

# Vérifier le board
curl http://localhost:5000/api/monday/boards/8952933832
```

### Test échoue au split
```bash
# Activer le mode debug Playwright
npx playwright test tests/e2e/monday-splitter.spec.ts --debug

# Vérifier les logs du serveur
# (les logs incluent les détails de chaque opération)
```

### Erreurs de base de données
```bash
# Vérifier l'état de la DB
npm run db:push

# Tester la connexion DB
psql $DATABASE_URL -c "SELECT COUNT(*) FROM aos;"
```

## 🎯 Validation finale

Le test est considéré comme réussi si:
- ✅ Les 3 scénarios passent sur tous les navigateurs
- ✅ Aucune erreur TypeScript (vérifié par LSP)
- ✅ Playwright détecte correctement les 16 tests
- ✅ Les assertions DB sont toutes valides

## 📦 Ajout du script npm (optionnel)

Si vous souhaitez ajouter un raccourci npm, ajoutez manuellement à `package.json`:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:monday": "playwright test tests/e2e/monday-splitter.spec.ts"
  }
}
```

Ensuite exécutez:
```bash
npm run test:monday
```

---

**Dernière mise à jour**: 2025-10-23
**Statut**: ✅ Prêt pour production
