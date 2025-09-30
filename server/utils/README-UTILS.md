# Utilitaires Partagés Saxium

Guide d'utilisation des utilitaires centralisés pour améliorer la maintenabilité.

## 📋 Table des Matières

1. [Logger Structuré](#logger-structuré)
2. [Utilitaires Partagés](#utilitaires-partagés)
3. [Gestion d'Erreurs](#gestion-derreurs)

## 🔍 Logger Structuré

### Import

```typescript
import { logger } from '@/utils/logger';
// OU créer un logger spécifique au service
import { Logger } from '@/utils/logger';
const serviceLogger = new Logger('MonService');
```

### Utilisation de Base

```typescript
// Remplacer console.log par:
logger.info('Message informatif');
logger.debug('Message de debug', { metadata: { userId: '123' } });
logger.warn('Avertissement');
logger.error('Erreur', new Error('détails'), { service: 'API' });
logger.fatal('Erreur critique', error);
```

### Timer de Performance

```typescript
// Remplacer console.time/timeEnd:
const endTimer = logger.time('Operation complexe');
await operationComplexe();
endTimer(); // Log automatique: "Operation complexe completed in 1234ms"
```

### Logger avec Contexte

```typescript
const userLogger = logger.child('UserService');
userLogger.info('Utilisateur créé', { 
  userId: user.id,
  traceId: 'abc-123',
  metadata: { role: user.role }
});
```

## 🛠 Utilitaires Partagés

### Dates

```typescript
import { 
  parseDateSafely, 
  formatDateFR, 
  calculateWorkingDays,
  addWorkingDays 
} from '@/utils/shared-utils';

// Parse sécurisé avec fallback
const date = parseDateSafely(input, new Date());

// Format français
const formatted = formatDateFR(new Date()); // "30/09/2025"

// Jours ouvrés
const days = calculateWorkingDays(startDate, endDate); // 15
const futureDate = addWorkingDays(new Date(), 10);
```

### Montants & Calculs

```typescript
import {
  parseAmountSafely,
  calculateTVA,
  calculateTTC,
  formatMontantEuros
} from '@/utils/shared-utils';

const montant = parseAmountSafely("1 250,50"); // Decimal(1250.50)
const tva = calculateTVA(montant, 20); // Decimal(250.10)
const ttc = calculateTTC(montant, 20); // Decimal(1500.60)
const formatted = formatMontantEuros(ttc); // "1 500,60 €"
```

### Cache Simple

```typescript
import { SimpleCache } from '@/utils/shared-utils';

const cache = new SimpleCache<User>(30); // 30 min TTL

cache.set('user:123', userData);
const user = cache.get('user:123'); // User | null
cache.clear();
```

### Arrays & Collections

```typescript
import { groupBy, chunk, unique } from '@/utils/shared-utils';

// Grouper par clé
const byStatus = groupBy(projects, p => p.status);

// Découper en chunks
const batches = chunk(largeArray, 100); // [[...100], [...100], ...]

// Retirer doublons
const uniqueIds = unique(items, item => item.id);
```

### Performance

```typescript
import { measureExecutionTime, retryWithBackoff } from '@/utils/shared-utils';

// Mesurer temps d'exécution
const { result, duration } = await measureExecutionTime(
  async () => await fetchData(),
  'Fetch data'
);

// Retry avec backoff
const data = await retryWithBackoff(
  () => apiCall(),
  { maxRetries: 3, initialDelayMs: 1000 }
);
```

## ⚠️ Gestion d'Erreurs

### Types d'Erreurs

```typescript
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError
} from '@/utils/error-handler';

// Lancer des erreurs typées
throw new NotFoundError('Projet');
throw new ValidationError('Données invalides', { 
  email: ['Format invalide'] 
});
throw new DatabaseError('Connexion échouée', originalError);
```

### Wrapper Async

```typescript
import { asyncHandler, withErrorHandling } from '@/utils/error-handler';

// Dans les routes Express
router.post('/api/users', asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  res.json({ success: true, data: user });
}));

// Dans les services
async function createProject(data: CreateProjectDto) {
  return withErrorHandling(
    async () => {
      // ... logique métier
      return project;
    },
    {
      operation: 'createProject',
      service: 'ProjectService',
      userId: data.userId,
      metadata: { projectType: data.type }
    }
  );
}
```

### Assertions

```typescript
import { assert, assertExists } from '@/utils/error-handler';

// Assert condition
assert(user.role === 'admin', 'Admin requis', AuthorizationError);

// Assert existence
assertExists(project, 'Projet'); // Lance NotFoundError si null/undefined
```

### Retry Intelligent

```typescript
import { retryOperation } from '@/utils/error-handler';

const result = await retryOperation(
  () => externalApiCall(),
  {
    maxRetries: 3,
    delayMs: 1000,
    shouldRetry: (error) => error.code === 'NETWORK_ERROR',
    onRetry: (attempt, error) => {
      logger.warn(`Retry ${attempt}/3`, { error: error.message });
    }
  }
);
```

### Format Réponse API

```typescript
import { formatErrorResponse } from '@/utils/error-handler';

try {
  const result = await operation();
  res.json({ success: true, data: result });
} catch (error) {
  const errorResponse = formatErrorResponse(error);
  res.status(errorResponse.error.statusCode).json(errorResponse);
}
```

## 📝 Exemples de Migration

### Avant (Console.log dispersé)

```typescript
console.log('[Service] Opération démarrée');
try {
  console.log('[Service] Récupération données...');
  const data = await fetchData();
  console.log('[Service] Données récupérées:', data.length);
  return data;
} catch (error) {
  console.error('[Service] Erreur:', error);
  throw new Error('Échec opération');
}
```

### Après (Logger + Error Handler)

```typescript
import { logger } from '@/utils/logger';
import { withErrorHandling } from '@/utils/error-handler';

const serviceLogger = logger.child('MonService');

return withErrorHandling(
  async () => {
    serviceLogger.debug('Récupération données...');
    const data = await fetchData();
    serviceLogger.info('Données récupérées', { 
      metadata: { count: data.length } 
    });
    return data;
  },
  {
    operation: 'fetchOperation',
    service: 'MonService'
  }
);
```

## 🎯 Bénéfices

✅ **Logging unifié** : Format structuré, niveaux cohérents, contexte enrichi  
✅ **Code DRY** : Réduction duplication date/cache/validation  
✅ **Erreurs typées** : Messages clairs, codes HTTP appropriés  
✅ **Observabilité** : Traces, métriques, debugging facilité  
✅ **Maintenabilité** : Code plus lisible, patterns réutilisables

## ⚠️ Plan de Migration

### Unification Error Handling
Le nouveau `error-handler.ts` est maintenant unifié avec `middleware/errorHandler.ts`. 

**✅ Phase 1 TERMINÉE**: Logger structuré adopté dans errorHandler middleware
**✅ Phase 2 TERMINÉE**: Middleware utilise formatErrorResponse pour erreurs typées
**✅ Phase 3 TERMINÉE**: Routes AI migrées vers asyncHandler + erreurs typées
**🔄 Phase 4 EN COURS**: Migration progressive des autres routes vers nouveaux patterns

### Patterns Appliqués (Exemple: routes AI)

#### Route avec asyncHandler
```typescript
import { asyncHandler } from '../utils/error-handler';
import { logger } from '../utils/logger';

router.post('/api/ai/analyze', asyncHandler(async (req, res) => {
  const { projectId, data } = req.body;
  
  if (!projectId) {
    throw new ValidationError('projectId requis');
  }
  
  logger.info('[AI] Analyse démarrée', { 
    userId: req.user?.id, 
    metadata: { projectId } 
  });
  
  const result = await aiService.analyze(projectId, data);
  res.json({ success: true, data: result });
}));
```

#### Middleware ErrorHandler
Le middleware catch automatiquement:
- **ValidationError** → 400 + formatErrorResponse()
- **NotFoundError** → 404 + formatErrorResponse()  
- **AuthenticationError** → 401 + formatErrorResponse()
- **UtilsAppError** (toutes les autres) → statusCode + formatErrorResponse()
- **ZodError** → 400 + détails validation
- **Erreurs legacy** → backward compatible

### Services Prioritaires à Migrer
1. ✅ **AI Service Routes** (MIGRÉ - 13 routes) - Pattern de référence
2. 🔄 **DateIntelligenceService** - Fonctions >150 lignes, nombreux console.log
3. 🔄 **MondayProductionFinalService** - Duplication parsing/transformation
4. 🔄 **AnalyticsService** - Cache/performance non centralisés
5. 🔄 **Autres routes** - 20+ fichiers restants

### Console.log → Logger
Utiliser ESLint rule pour interdire console.* dans server/:
```json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```
