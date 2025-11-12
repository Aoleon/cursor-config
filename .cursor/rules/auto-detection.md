# Détection Automatique - Saxium

**Objectif:** Détecter et corriger automatiquement les problèmes courants pour améliorer les performances de l'agent

## 🎯 Anti-Patterns à Détecter Automatiquement

### 1. console.log/console.error

**Détection:**
```typescript
// Pattern à détecter
console.log('Message');
console.error('Erreur', error);
console.warn('Warning');
console.info('Info');
console.debug('Debug');
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
import { logger } from '../utils/logger';

// console.log → logger.info
logger.info('Message', { metadata: { context: 'value' } });

// console.error → logger.error
logger.error('Erreur', error, { metadata: { operation: 'op' } });

// console.warn → logger.warn
logger.warn('Warning', { metadata: { context: 'value' } });

// console.info → logger.info
logger.info('Info', { metadata: { context: 'value' } });

// console.debug → logger.debug
logger.debug('Debug', { metadata: { context: 'value' } });
```

**Règles de Correction:**
- ✅ Ajouter import `logger` si absent
- ✅ Convertir en logger avec métadonnées structurées
- ✅ Préserver contexte (variables, objets)
- ✅ Utiliser niveau approprié (info, warn, error, debug)

### 2. throw new Error()

**Détection:**
```typescript
// Pattern à détecter
throw new Error('Message');
throw new Error(`Erreur: ${variable}`);
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
import { ValidationError, NotFoundError, DatabaseError } from '../utils/error-handler';

// Contexte: Validation → ValidationError
throw new ValidationError('Message');

// Contexte: Not found → NotFoundError
throw new NotFoundError('Ressource');

// Contexte: Database → DatabaseError
throw new DatabaseError('Erreur base de données', originalError);

// Contexte: Générique → AppError
import { AppError } from '../utils/error-handler';
throw new AppError('Message', 500);
```

**Règles de Correction:**
- ✅ Analyser contexte pour déterminer type d'erreur approprié
- ✅ Utiliser erreurs typées du projet
- ✅ Préserver message d'erreur original
- ✅ Ajouter import si absent

### 3. Types `any`

**Détection:**
```typescript
// Pattern à détecter
function process(data: any): any { }
const variable: any = value;
interface MyInterface {
  field: any;
}
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
import type { User, InsertUser } from '@shared/schema';

// Analyser contexte pour déterminer type approprié
function process(data: InsertUser): User { }
const variable: User = value;

interface MyInterface {
  field: User; // ou type approprié selon contexte
}
```

**Règles de Correction:**
- ✅ Analyser contexte pour déterminer type approprié
- ✅ Utiliser types depuis `@shared/schema` si possible
- ✅ Créer types explicites si nécessaire
- ✅ Utiliser `unknown` si type vraiment inconnu (meilleur que `any`)

### 4. Routes sans asyncHandler

**Détection:**
```typescript
// Pattern à détecter
router.post('/api/route', async (req, res) => {
  try {
    // ...
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
import { asyncHandler } from '../utils/error-handler';
import { ValidationError, NotFoundError } from '../utils/error-handler';

router.post('/api/route', asyncHandler(async (req, res) => {
  // Pas besoin de try-catch
  // Erreurs capturées automatiquement par asyncHandler
  const result = await operation();
  res.json({ success: true, data: result });
}));
```

**Règles de Correction:**
- ✅ Remplacer try-catch par asyncHandler
- ✅ Supprimer gestion d'erreurs manuelle
- ✅ Utiliser erreurs typées dans le handler
- ✅ Ajouter import asyncHandler si absent

### 5. Try-catch avec logging manuel

**Détection:**
```typescript
// Pattern à détecter
try {
  const result = await operation();
  console.log('Succès');
  return result;
} catch (error) {
  console.error('Erreur', error);
  throw error;
}
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
import { withErrorHandling } from '../utils/error-handler';
import { logger } from '../utils/logger';

return withErrorHandling(
  async () => {
    const result = await operation();
    logger.info('Succès', { 
      metadata: { 
        operation: 'operation',
        resultId: result.id 
      } 
    });
    return result;
  },
  {
    operation: 'operation',
    service: 'ServiceName',
    metadata: { context: 'value' }
  }
);
```

**Règles de Correction:**
- ✅ Remplacer try-catch par withErrorHandling
- ✅ Convertir console.log en logger.info avec métadonnées
- ✅ Convertir console.error en logger.error dans withErrorHandling
- ✅ Ajouter imports nécessaires

### 6. Retry manuel

**Détection:**
```typescript
// Pattern à détecter
let attempts = 0;
while (attempts < 3) {
  try {
    return await operation();
  } catch (error) {
    attempts++;
    if (attempts >= 3) throw error;
    await sleep(1000 * attempts);
  }
}
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
import { retryOperation } from '../utils/error-handler';

return await retryOperation(
  () => operation(),
  {
    maxRetries: 3,
    delayMs: 1000,
    shouldRetry: (error) => error.code !== 'FATAL_ERROR',
    onRetry: (attempt, error) => {
      logger.warn(`Retry ${attempt}/3`, { error: error.message });
    }
  }
);
```

**Règles de Correction:**
- ✅ Remplacer retry manuel par retryOperation
- ✅ Configurer backoff exponentiel automatique
- ✅ Ajouter logique shouldRetry appropriée
- ✅ Ajouter imports nécessaires

### 7. Vérifications null/undefined manuelles

**Détection:**
```typescript
// Pattern à détecter
if (!entity) {
  throw new Error('Entity not found');
}
if (entity === null || entity === undefined) {
  throw new Error('Entity is null');
}
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
import { assertExists } from '../utils/error-handler';

// assertExists lance NotFoundError si null/undefined
assertExists(entity, 'Entity');
```

**Règles de Correction:**
- ✅ Remplacer vérifications manuelles par assertExists
- ✅ Utiliser NotFoundError automatiquement
- ✅ Préserver message d'erreur
- ✅ Ajouter import si absent

### 8. Code dupliqué

**Détection:**
```typescript
// Pattern à détecter
function method1() {
  // logique A (dupliquée)
  // logique B
}
function method2() {
  // logique A (dupliquée)
  // logique C
}
```

**Correction Automatique:**
```typescript
// ✅ Corrigé automatiquement
function sharedLogicA() {
  // logique A (réutilisable)
}
function method1() {
  sharedLogicA();
  // logique B
}
function method2() {
  sharedLogicA();
  // logique C
}
```

**Règles de Correction:**
- ✅ Identifier logique commune
- ✅ Extraire en fonction/service réutilisable
- ✅ Préserver fonctionnalité originale
- ✅ Documenter extraction

## 🔄 Workflow de Détection et Correction

### 1. Détection Proactive

**Avant Modification:**
```typescript
async function detectBeforeModification(filePath: string): Promise<DetectionResult> {
  const code = await read_file(filePath);
  
  // Détecter tous les anti-patterns
  const antiPatterns = await detectAllAntiPatterns(code);
  
  // Détecter problèmes formatage (nouveau)
  const formattingIssues = await detectFormattingIssues(code);
  
  // Trier par priorité
  const sorted = sortByPriority([...antiPatterns, ...formattingIssues]);
  
  return {
    filePath,
    antiPatterns: sorted,
    canAutoFix: sorted.every(p => p.canAutoFix),
    estimatedTime: calculateFixTime(sorted)
  };
}
```

### 1.1 Détection Formatage (Nouveau)

**Patterns à Détecter:**
- ✅ Indentation excessive (14+ espaces)
- ✅ Metadata logger mal fermé
- ✅ Duplications dans context
- ✅ withErrorHandling mal fermé
- ✅ Lignes vides excessives

**Référence:** `@.cursor/rules/code-formatting-detection.md` - Détection formatage détaillée

### 2. Correction Automatique

**Pattern:**
```typescript
async function autoFixAntiPatterns(
  code: string,
  antiPatterns: AntiPattern[]
): Promise<string> {
  let fixedCode = code;
  const fixes: Fix[] = [];
  
  for (const pattern of antiPatterns) {
    if (pattern.canAutoFix) {
      const before = fixedCode;
      fixedCode = await applyFix(fixedCode, pattern);
      
      fixes.push({
        pattern: pattern.type,
        location: pattern.location,
        before: before.substring(pattern.start, pattern.end),
        after: fixedCode.substring(pattern.start, pattern.end)
      });
    }
  }
  
  // Valider corrections
  const validation = await validateCode(fixedCode);
  if (!validation.success) {
    // Re-corriger si nécessaire
    return await autoFixAntiPatterns(fixedCode, antiPatterns);
  }
  
  return fixedCode;
}
```

### 3. Validation Post-Correction

**Pattern:**
```typescript
async function validateAfterFix(
  code: string,
  originalCode: string
): Promise<ValidationResult> {
  // 1. Vérifier syntaxe TypeScript
  const syntaxCheck = await checkTypeScript(code);
  if (!syntaxCheck.success) {
    return { success: false, errors: syntaxCheck.errors };
  }
  
  // 2. Vérifier tests passent
  const testCheck = await runTests(code);
  if (!testCheck.success) {
    return { success: false, errors: testCheck.errors };
  }
  
  // 3. Vérifier pas de régression
  const regressionCheck = await checkRegression(code, originalCode);
  if (!regressionCheck.success) {
    return { success: false, errors: regressionCheck.errors };
  }
  
  return { success: true };
}
```

## 📊 Priorisation des Corrections

### Ordre de Priorité

1. **Critique** (Corriger immédiatement)
   - `console.log`/`console.error` (581 occurrences)
   - `throw new Error()` (262 occurrences)
   - Routes sans `asyncHandler` (~200 routes)

2. **Important** (Corriger rapidement)
   - Types `any` (936 occurrences)
   - Try-catch avec logging manuel (741 occurrences)
   - Retry manuel (33 occurrences)

3. **Moyen** (Corriger progressivement)
   - Code dupliqué
   - Vérifications null/undefined manuelles
   - Imports non optimisés

4. **Faible** (Corriger si opportunité)
   - Commentaires TODO
   - Code mort
   - Magic numbers

## 🎯 Checklist Détection Automatique

### Avant Modification
- [ ] Détecter anti-patterns dans fichiers cibles
- [ ] Trier par priorité
- [ ] Corriger anti-patterns critiques automatiquement
- [ ] Valider corrections

### Pendant Modification
- [ ] Détecter anti-patterns en temps réel
- [ ] Corriger automatiquement si possible
- [ ] Documenter corrections effectuées

### Après Modification
- [ ] Détecter anti-patterns dans code modifié
- [ ] Corriger automatiquement
- [ ] Valider toutes les corrections
- [ ] Vérifier pas de régression

## 🔗 Références

### Documentation
- `@.cursor/rules/agent-optimization.md` - Stratégies d'optimisation
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes
- `@docs/MAINTAINABILITY_OPTIMIZATION.md` - Optimisation maintenabilité
- `@docs/ROBUSTNESS_OPTIMIZATION.md` - Optimisation robustesse

### Scripts Utiles
- `scripts/optimize-maintainability.ts` - Optimisation maintenabilité
- `scripts/optimize-robustness.ts` - Optimisation robustesse
- `scripts/quality-audit.ts` - Audit qualité

---

**Note:** La détection automatique améliore significativement la qualité du code et réduit les interventions nécessaires.

