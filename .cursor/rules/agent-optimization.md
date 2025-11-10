# Optimisation Agent Cursor - Saxium

**Objectif:** Maximiser les performances de l'agent Cursor AI pour le projet Saxium

## 🎯 Stratégies d'Optimisation

### 0. Évaluation Préalable (IMPÉRATIF)

**Principe:** Avant toute implémentation, évaluer systématiquement différentes approches selon 4 critères essentiels.

**IMPÉRATIF:**
- ✅ Analyser la tâche (objectif, contraintes, dépendances)
- ✅ Identifier au moins 2-3 approches différentes
- ✅ Évaluer chaque approche selon 4 critères :
  - **Rapidité** (complexité, temps, parallélisation)
  - **Performance** (mémoire, CPU, cache, optimisations)
  - **Robustesse** (erreurs, validation, résilience, tests)
  - **Maintenabilité** (clarté, documentation, testabilité, réutilisabilité)
- ✅ Comparer approches et sélectionner la meilleure
- ✅ Documenter sélection avec raisonnement
- ✅ Implémenter approche sélectionnée

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable complète

### 1. Auto-Amélioration Continue

**Principe:** L'agent doit être capable de s'auto-éditer et d'améliorer ses performances de manière autonome.

**TOUJOURS:**
- ✅ Analyser les résultats de ses actions précédentes
- ✅ Identifier les patterns qui fonctionnent bien
- ✅ Améliorer les patterns qui ne fonctionnent pas
- ✅ Documenter les améliorations apportées
- ✅ Réutiliser les solutions efficaces

**Pattern:**
```typescript
// Avant action
// 1. Analyser contexte
// 2. Identifier patterns similaires existants
// 3. Appliquer pattern optimal

// Après action
// 1. Évaluer résultat
// 2. Identifier améliorations possibles
// 3. Documenter apprentissage
// 4. Réutiliser pour actions futures
```

### 2. Utilisation Optimale du Contexte avec Performance Transversale

**Principe:** Utiliser le contexte de manière ciblée et hiérarchisée pour maximiser la pertinence et les performances transversales.

**Hiérarchie du Contexte:**
1. **Fichiers directement modifiés** (priorité maximale)
2. **Fichiers de référence** (exemples, patterns)
3. **Documentation projet** (projectbrief.md, activeContext.md)
4. **Règles Cursor** (.cursor/rules/)

**TOUJOURS:**
- ✅ Limiter à 5-10 fichiers pertinents maximum
- ✅ Inclure fichiers de mémoire (projectbrief.md, activeContext.md)
- ✅ Référencer exemples concrets avec @
- ✅ Utiliser @Docs pour documentation externe
- ✅ Utiliser @Web pour informations récentes
- ✅ Comprendre relations transversales entre modules
- ✅ Réutiliser patterns établis entre modules
- ✅ Optimiser performances avec cache intelligent

**NE JAMAIS:**
- ❌ Inclure 20+ fichiers (surcharge contextuelle)
- ❌ Inclure fichiers non pertinents
- ❌ Ignorer fichiers de mémoire
- ❌ Dupliquer contexte déjà présent
- ❌ Ignorer relations transversales
- ❌ Dupliquer patterns existants

**Référence:** `@.cursor/rules/transversal-performance.md` - Performance transversale et autonomie

### 3. Recherche et Exploration Proactive

**Principe:** Toujours explorer le codebase avant de modifier pour éviter duplication et comprendre les patterns.

**Workflow de Recherche:**
1. **Recherche sémantique** (`codebase_search`) pour comprendre concepts
2. **Recherche exacte** (`grep`) pour trouver occurrences spécifiques
3. **Recherche fichiers** (`glob_file_search`) pour localiser fichiers
4. **Lecture ciblée** (`read_file`) pour comprendre patterns

**Pattern:**
```typescript
// 1. Recherche sémantique
codebase_search("How does X work?", target_directories)

// 2. Recherche exacte
grep("pattern", path)

// 3. Recherche fichiers
glob_file_search("**/*pattern*.ts")

// 4. Lecture ciblée
read_file("path/to/file.ts")
```

**Recherche Hiérarchique:**
```typescript
// Recherche hiérarchique du général au spécifique
async function hierarchicalSearch(topic: string) {
  // Niveau 1: Recherche générale
  const general = await codebase_search(`How does ${topic} work?`, ["server"]);
  
  // Niveau 2: Recherche ciblée
  const patterns = await codebase_search(`What are the patterns for ${topic}?`, ["server"]);
  
  // Niveau 3: Recherche exacte
  const exact = await grep(extractPattern(topic), "server");
  
  // Niveau 4: Lecture ciblée
  const files = identifyRelevantFiles(general, patterns, exact);
  const contents = await Promise.all(files.map(f => read_file(f)));
  
  return { general, patterns, exact, contents };
}
```

**Référence:** `@.cursor/rules/context-search.md` - Recherche contextuelle avancée

### 4. Refactoring Automatisé Intelligent

**Principe:** Identifier et refactoriser automatiquement le code dupliqué et les anti-patterns.

**TOUJOURS:**
- ✅ Identifier code dupliqué avant modification
- ✅ Extraire logique commune en fonctions/services
- ✅ Appliquer patterns établis du projet
- ✅ Documenter refactoring effectué
- ✅ Vérifier tests après refactoring

**Pattern:**
```typescript
// Avant: Code dupliqué
function method1() {
  // logique A (dupliquée)
  // logique B
}

function method2() {
  // logique A (dupliquée)
  // logique C
}

// Après: Code refactorisé
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

### 5. Évaluation Continue des Performances

**Principe:** Évaluer régulièrement les performances et ajuster les stratégies.

**Métriques à Surveiller:**
- ✅ Taux de succès des modifications
- ✅ Nombre de corrections nécessaires
- ✅ Temps de résolution des tâches
- ✅ Qualité du code généré
- ✅ Respect des conventions du projet

**TOUJOURS:**
- ✅ Analyser résultats après chaque modification majeure
- ✅ Identifier patterns de succès
- ✅ Éviter patterns qui échouent
- ✅ Documenter apprentissages

### 6. Détection Automatique des Anti-Patterns

**Principe:** Détecter et corriger automatiquement les anti-patterns courants du projet.

**Anti-Patterns à Détecter Automatiquement:**
- ✅ `console.log`/`console.error` → Remplacer par `logger`
- ✅ `throw new Error()` → Remplacer par erreurs typées
- ✅ Types `any` → Remplacer par types stricts
- ✅ Routes sans `asyncHandler` → Ajouter `asyncHandler`
- ✅ Try-catch avec logging manuel → Utiliser `withErrorHandling`
- ✅ Retry manuel → Utiliser `withRetry`
- ✅ Vérifications null/undefined manuelles → Utiliser `assertExists`
- ✅ Code dupliqué → Extraire en fonctions/services

**Pattern de Détection:**
```typescript
// 1. Détecter anti-patterns avant modification
const antiPatterns = await detectAntiPatterns(code);

// 2. Trier par priorité
const sortedPatterns = sortByPriority(antiPatterns);

// 3. Corriger automatiquement
let fixedCode = code;
for (const pattern of sortedPatterns) {
  if (pattern.canAutoFix) {
    fixedCode = await autoFixAntiPattern(fixedCode, pattern);
  } else {
    await documentAntiPattern(pattern);
  }
}

// 4. Valider corrections
const validation = await validateCode(fixedCode);
if (!validation.success) {
  return await detectAndFixIssues(fixedCode);
}
```

**Détection Proactive:**
```typescript
// Avant chaque modification
async function prepareCodeForModification(filePath: string): Promise<string> {
  const code = await read_file(filePath);
  
  // 1. Détecter anti-patterns
  const issues = await detectAntiPatterns(code);
  
  // 2. Corriger automatiquement
  const fixedCode = await autoFixIssues(code, issues);
  
  // 3. Valider
  const validation = await validateCode(fixedCode);
  if (validation.success) {
    return fixedCode;
  }
  
  // 4. Re-corriger si nécessaire
  return await prepareCodeForModification(filePath);
}
```

## 🔍 Techniques Avancées

### 1. Analyse Contextuelle Multi-Niveaux

**Niveau 1: Contexte Immédiat**
- Fichiers directement modifiés
- Fichiers de référence (exemples)

**Niveau 2: Contexte Projet**
- Documentation projet (projectbrief.md, activeContext.md)
- Patterns architecturaux (systemPatterns.md)

**Niveau 3: Contexte Règles**
- Règles Cursor (.cursor/rules/)
- Conventions du projet

**Pattern:**
```
@file-to-modify.ts          # Niveau 1
@example-pattern.ts         # Niveau 1
@projectbrief.md            # Niveau 2
@activeContext.md           # Niveau 2
@.cursor/rules/core.md      # Niveau 3
```

### 2. Recherche Sémantique Stratégique

**Quand Utiliser:**
- ✅ Comprendre un concept complexe
- ✅ Trouver code similaire existant
- ✅ Identifier patterns architecturaux
- ✅ Explorer dépendances

**Comment Utiliser:**
```typescript
// Question complète et spécifique
codebase_search("How does authentication work with Microsoft OAuth?", ["server/modules/auth"])

// Question sur patterns
codebase_search("What are the patterns for error handling in routes?", ["server/modules"])

// Question sur architecture
codebase_search("How are services structured and initialized?", ["server/services"])
```

### 3. Validation Proactive

**Avant Modification:**
- ✅ Vérifier si fonctionnalité existe déjà
- ✅ Comprendre dépendances
- ✅ Identifier impacts potentiels
- ✅ Vérifier conventions du projet

**Pendant Modification:**
- ✅ Suivre patterns établis
- ✅ Respecter conventions de code
- ✅ Valider avec tests
- ✅ Logger avec contexte structuré

**Après Modification:**
- ✅ Vérifier tests passent
- ✅ Vérifier couverture de code
- ✅ Vérifier types TypeScript
- ✅ Vérifier pas de régression

## 📊 Optimisation du Comportement

### 1. Stratégie de Résolution de Problèmes

**Étape 1: Comprendre**
- Lire documentation pertinente
- Analyser code existant
- Identifier patterns similaires

**Étape 2: Planifier**
- Décomposer problème en sous-tâches
- Identifier dépendances
- Planifier ordre d'exécution

**Étape 3: Implémenter**
- Appliquer patterns établis
- Suivre conventions du projet
- Tester au fur et à mesure

**Étape 4: Valider**
- Vérifier tests passent
- Vérifier qualité du code
- Vérifier pas de régression

### 2. Gestion des Erreurs et Apprentissage

**Quand une Erreur Survient:**
1. ✅ Lire message d'erreur complet
2. ✅ Analyser contexte de l'erreur
3. ✅ Chercher solutions similaires dans le codebase
4. ✅ Appliquer correction appropriée
5. ✅ Documenter apprentissage

**Pattern:**
```typescript
// Erreur: Type mismatch
// 1. Analyser types attendus
// 2. Chercher usages similaires
codebase_search("How is this type used correctly?", target_directories)
// 3. Appliquer correction
// 4. Documenter apprentissage
```

### 3. Amélioration Continue

**TOUJOURS:**
- ✅ Identifier code qui peut être amélioré
- ✅ Appliquer refactoring progressif
- ✅ Documenter améliorations
- ✅ Réutiliser solutions efficaces

**Pattern:**
```typescript
// Identifier opportunité d'amélioration
// 1. Analyser code existant
// 2. Identifier anti-patterns
// 3. Proposer amélioration
// 4. Implémenter amélioration
// 5. Documenter changement
```

## 🎯 Checklist Optimisation Agent

### Avant de Commencer une Tâche
- [ ] Lire `activeContext.md` pour connaître l'état actuel
- [ ] Lire `projectbrief.md` pour comprendre le périmètre
- [ ] Lire `systemPatterns.md` pour comprendre l'architecture
- [ ] Chercher code similaire existant (`codebase_search`)
- [ ] Identifier patterns établis à suivre
- [ ] Détecter anti-patterns dans fichiers à modifier
- [ ] Corriger anti-patterns automatiquement

### Pendant le Développement
- [ ] Utiliser patterns établis (ne pas réinventer)
- [ ] Réutiliser code existant (DRY principle)
- [ ] Suivre conventions de code du projet
- [ ] Détecter et corriger anti-patterns en temps réel
- [ ] Tester au fur et à mesure
- [ ] Logger avec contexte structuré
- [ ] Valider modifications après chaque étape

### Après le Développement
- [ ] Détecter anti-patterns dans code modifié
- [ ] Corriger anti-patterns automatiquement
- [ ] Exécuter tests unitaires pertinents
- [ ] Exécuter tests E2E pertinents
- [ ] Déboguer automatiquement les échecs de tests E2E
- [ ] Exécuter suite complète de tests E2E
- [ ] Vérifier tests passent
- [ ] Vérifier couverture de code
- [ ] Vérifier types TypeScript
- [ ] Vérifier pas de régression
- [ ] Mettre à jour documentation si nécessaire
- [ ] Documenter apprentissages

**Référence:** `@.cursor/rules/automated-testing-debugging.md` - Tests E2E et débogage automatisé

## 🔍 Détection Automatique des Problèmes Courants

### Problèmes à Détecter et Corriger Automatiquement

**1. console.log/console.error**
```typescript
// ❌ Détecté
console.log('Message');
console.error('Erreur', error);

// ✅ Auto-corrigé
import { logger } from '../utils/logger';
logger.info('Message', { metadata: { context: 'value' } });
logger.error('Erreur', error, { metadata: { operation: 'op' } });
```

**2. throw new Error()**
```typescript
// ❌ Détecté
throw new Error('Message');

// ✅ Auto-corrigé
import { ValidationError, NotFoundError } from '../utils/error-handler';
throw new ValidationError('Message'); // ou NotFoundError selon contexte
```

**3. Types `any`**
```typescript
// ❌ Détecté
function process(data: any): any { }

// ✅ Auto-corrigé
import type { User, InsertUser } from '@shared/schema';
function process(data: InsertUser): User { }
```

**4. Routes sans asyncHandler**
```typescript
// ❌ Détecté
router.post('/api/route', async (req, res) => {
  try {
    // ...
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

// ✅ Auto-corrigé
import { asyncHandler } from '../utils/error-handler';
router.post('/api/route', asyncHandler(async (req, res) => {
  // Pas besoin de try-catch
}));
```

**5. Try-catch avec logging manuel**
```typescript
// ❌ Détecté
try {
  const result = await operation();
  console.log('Succès');
  return result;
} catch (error) {
  console.error('Erreur', error);
  throw error;
}

// ✅ Auto-corrigé
import { withErrorHandling } from '../utils/error-handler';
return withErrorHandling(
  async () => {
    const result = await operation();
    logger.info('Succès', { metadata: { resultId: result.id } });
    return result;
  },
  { operation: 'operation', service: 'ServiceName' }
);
```

**6. Code dupliqué**
```typescript
// ❌ Détecté
function method1() {
  // logique A (dupliquée)
  // logique B
}
function method2() {
  // logique A (dupliquée)
  // logique C
}

// ✅ Auto-corrigé
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

## 🚀 Autonomie et Runs Longs

### Stratégies pour Runs Autonomes Plus Longs

**Principe:** L'agent doit être capable de travailler de manière autonome sur des runs plus longs sans intervention humaine.

**TOUJOURS:**
- ✅ Planifier les tâches complexes en sous-tâches
- ✅ Valider chaque étape avant de continuer
- ✅ Détecter et corriger les erreurs automatiquement
- ✅ Documenter les actions importantes
- ✅ Adapter les stratégies selon les résultats

### 1. Planification Autonome

**Pattern:**
```typescript
// 1. Analyser tâche complète
const task = analyzeTask(userRequest);

// 2. Décomposer en sous-tâches
const subtasks = decomposeTask(task);

// 3. Planifier exécution
const plan = planExecution(subtasks);

// 4. Exécuter avec validation
for (const subtask of plan) {
  const result = await executeSubtask(subtask);
  validateResult(result);
  if (!result.success) {
    await autoCorrect(result);
  }
}
```

### 2. Validation et Auto-Correction Continue

**Pattern:**
```typescript
// Après chaque modification
const validation = await validateModification(modifiedCode);
if (!validation.success) {
  const correctedCode = await autoCorrect(modifiedCode, validation.errors);
  const revalidation = await validateModification(correctedCode);
  if (!revalidation.success) {
    await documentIssue(correctedCode, revalidation.errors);
  }
}
```

### 3. Gestion d'Erreurs Autonome

**Pattern:**
```typescript
async function executeWithRecovery(operation: () => Promise<Result>): Promise<Result> {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await operation();
      if (validateResult(result)) {
        return result;
      }
      await applyCorrection(result);
      attempts++;
    } catch (error) {
      const correction = analyzeError(error);
      if (correction.canAutoCorrect) {
        await applyCorrection(correction);
        attempts++;
      } else {
        await documentError(error);
        throw error;
      }
    }
  }
  throw new Error('Max attempts reached');
}
```

### 4. Apprentissage Continu

**Pattern:**
```typescript
// Après chaque action
const analysis = analyzeResult(result);
if (analysis.success) {
  await recordSuccessPattern(action, result);
} else {
  await recordFailurePattern(action, result);
}
const adaptedStrategy = adaptStrategy(analysis);
await updateStrategy(adaptedStrategy);
```

### 5. Reflexion (Réflexion Verbale)

**Principe:** Réfléchir verbalement sur les actions et ajuster le comportement.

**Pattern:**
```typescript
// Après chaque action importante
async function reflectOnAction(action: Action, result: Result): Promise<Reflection> {
  // 1. Analyser résultat
  const analysis = analyzeResult(result);
  
  // 2. Identifier succès et échecs
  const successes = identifySuccesses(action, result);
  const failures = identifyFailures(action, result);
  
  // 3. Identifier améliorations
  const improvements = identifyImprovements(action, result, analysis);
  
  // 4. Adapter stratégies
  const adaptedStrategy = adaptStrategy(action, successes, failures, improvements);
  
  // 5. Documenter réflexion
  await documentReflection({ action, result, analysis, adaptedStrategy });
  
  return { analysis, successes, failures, improvements, adaptedStrategy };
}
```

### 6. Stratégie ICE (Investigate-Consolidate-Exploit)

**Principe:** Explorer, consolider et exploiter les workflows efficaces.

**Pattern:**
```typescript
// Phase 1: Investigate - Explorer différentes approches
const approaches = await investigateApproaches(task);

// Phase 2: Consolidate - Consolider connaissances en workflows
const workflow = await consolidateKnowledge(successfulApproaches);

// Phase 3: Exploit - Exploiter workflows consolidés
const result = await exploitWorkflow(workflow, task);
```

**Référence:** `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage avancées complètes

**Référence:** `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes complets  
**Référence:** `@.cursor/rules/advanced-learning.md` - **NOUVEAU** Stratégies d'apprentissage avancées

## 🔗 Références

### Documentation Essentielle
- `@AGENTS.md` - Instructions complètes pour l'agent
- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte
- `@.cursor/rules/autonomous-workflows.md` - **NOUVEAU** Workflows autonomes
- `@.cursor/rules/common-tasks.md` - Tâches courantes
- `@.cursor/rules/quick-reference.md` - Référence rapide

### Fichiers de Mémoire
- `@projectbrief.md` - Objectifs et périmètre
- `@activeContext.md` - État actuel et focus
- `@systemPatterns.md` - Patterns architecturaux
- `@techContext.md` - Stack technique

### Règles Cursor
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/workflows.md` - Workflows détaillés

---

**Note:** Ces stratégies d'optimisation améliorent significativement les performances et l'autonomie de l'agent Cursor AI pour le projet Saxium.

