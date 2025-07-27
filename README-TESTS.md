# Guide de Tests JLM ERP Menuiserie

## 🧪 Architecture de Tests Complète

Ce projet implémente une infrastructure de tests robuste avec **détection anti-boucles** et **optimisations de performance** pour garantir la qualité du code et éviter les régressions.

## 📋 Scripts de Test Disponibles

```bash
# Tests complets avec couverture de code
npm run test
npm run test:coverage

# Tests ciblés par environnement
npm run test:backend      # Tests API et logique métier
npm run test:frontend     # Tests composants React et hooks
npm run test:e2e          # Tests End-to-End Playwright

# Développement interactif
npm run test:watch        # Mode surveillance continue
npm run test:e2e:ui       # Interface Playwright
```

## 🔧 Configuration

### Vitest (Tests Unitaires)
- **Backend**: `vitest.backend.config.ts` - Tests Node.js avec mocks DB
- **Frontend**: `vitest.frontend.config.ts` - Tests React avec jsdom
- **Global**: `vitest.config.ts` - Configuration partagée

### Playwright (Tests E2E)
- **Multi-navigateurs**: Chrome, Firefox, Safari
- **Responsive**: Desktop et mobile
- **Capture**: Screenshots et vidéos automatiques

## 🚀 Stratégies Anti-Boucles de Bugs

### 1. Détection de Boucles Infinies
```typescript
// Exemple: tests/utils/test-helpers.ts
const loopDetector = createLoopDetector(100) // Max 100 appels
loopDetector('testName') // Lève une erreur si dépassé
```

### 2. Isolation des Tests
- Cleanup automatique après chaque test
- Mocks indépendants (reset entre tests)
- États globaux nettoyés

### 3. Timeouts Robustes
```typescript
// Attente conditionnelle sécurisée
await waitForCondition(
  () => element.isVisible(),
  timeout: 5000,
  interval: 100
)
```

### 4. Mocks avec Gestion d'Erreur
```typescript
const mockFetch = createMockFetch({
  '/api/offers': { status: 200, data: [...] },
  '/api/error': { status: 500, data: { error: 'Server Error' } }
})
```

## 📊 Objectifs de Couverture

| Zone | Objectif | Status |
|------|----------|--------|
| Backend (`server/`) | 85% | ✅ |
| Frontend (`client/src/`) | 80% | ✅ |
| Composants critiques | 95% | 🎯 |

## 🧩 Structure des Tests

```
tests/
├── setup.ts                    # Configuration globale
├── utils/test-helpers.ts        # Helpers anti-bugs
├── backend/
│   ├── setup.ts                # Config Node.js
│   ├── storage.test.ts         # Tests logique métier
│   └── routes.test.ts          # Tests API
├── frontend/
│   ├── setup.ts                # Config React
│   ├── components/             # Tests composants
│   └── hooks/                  # Tests hooks
├── e2e/
│   ├── dashboard.spec.ts       # Workflows utilisateur
│   └── offers.spec.ts          # Gestion offres
└── integration/
    └── full-workflow.test.ts   # Tests bout-en-bout
```

## 🛡️ Patterns de Sécurité

### Prévention Race Conditions
```typescript
// Test concurrence
const promises = data.map(item => createItem(item))
const results = await Promise.all(promises)
// Vérification intégrité
expect(new Set(results.map(r => r.id)).size).toBe(results.length)
```

### Validation Input/Output
```typescript
// Protection XSS/Injection
const maliciousData = { name: '<script>alert("xss")</script>' }
const result = await request(app).post('/api/endpoint').send(maliciousData)
expect(result.body.name).not.toContain('<script>')
```

## ⚡ Optimisations Performance

### 1. Parallélisation Intelligente
- Tests backend en parallèle (DB isolée)
- Tests frontend groupés par composant
- Tests E2E séquentiels (éviter conflicts)

### 2. Cache Stratégique
- Snapshots composants stables
- Mocks partagés entre tests similaires
- Setup/teardown optimisés

### 3. Monitoring Temps
- Alert si tests > 30 secondes
- Métriques par suite de tests
- Détection régression vitesse

## 🔍 Helpers Utilitaires

### Factory Functions
```typescript
// Données de test consistantes
const user = createMockUser({ role: 'responsable_be' })
const offer = createMockOffer({ status: 'nouveau' })
const workload = createMockBeWorkload({ plannedHours: '40' })
```

### Auto-cleanup
```typescript
const { addMock, cleanup } = createAutoCleanupMock()
const mock = addMock(vi.fn())
// cleanup() appelé automatiquement en afterEach
```

## 🎯 Workflow de Développement

1. **Red**: Écrire le test qui échoue
2. **Green**: Implémenter le code minimum
3. **Refactor**: Optimiser avec tests verts
4. **Coverage**: Vérifier couverture maintenue
5. **E2E**: Tester workflow utilisateur complet

## 🚨 Détection d'Anomalies

### Métriques Surveillées
- Performance API (< 100ms)
- Temps rendu composants (< 16ms)
- Taille bundle (< 500kb gzipped)
- Flaky tests (échecs aléatoires)

### Alertes Automatiques
- Tests lents (> 5 secondes)
- Couverture en baisse (< seuils)
- Erreurs mémoire (fuites)
- Timeouts excessifs

## 🔗 Intégration Continue

### Pipeline Qualité
1. ✅ TypeScript compilation
2. ✅ Tests unitaires backend
3. ✅ Tests unitaires frontend
4. ✅ Tests E2E multi-navigateurs
5. ✅ Validation couverture
6. 🚀 Déploiement si tout vert

Cette infrastructure garantit la robustesse du code JLM ERP et prévient efficacement les boucles de bugs grâce à des patterns éprouvés et des optimisations de performance.