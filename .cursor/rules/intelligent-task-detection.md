# Détection Intelligente des Tâches - Saxium

**Objectif:** Détecter automatiquement la complexité des tâches et charger les règles appropriées pour optimiser le paramétrage de l'agent.

**Référence:** [Cursor Agent Planning Documentation](https://docs.cursor.com/guides/agent-planning)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT détecter automatiquement la complexité des tâches et charger les règles appropriées selon les critères de complexité, sans intervention manuelle.

**Bénéfices:**
- ✅ Chargement automatique optimal des règles
- ✅ Détection intelligente de la complexité
- ✅ Optimisation du contexte (éviter saturation)
- ✅ Amélioration de la prise en compte des paramétrages

**Référence:** `@.cursor/rules/context-detection.md` - Détection automatique du contexte  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

## 📋 Critères de Détection de Complexité

### 1. Seuils de Complexité

**Tâche Simple:**
- ✅ ≤ 3 todos
- ✅ ≤ 5 dépendances
- ✅ ≤ 200 lignes estimées
- ✅ ≤ 5 fichiers à modifier
- ✅ ≤ 3 validations distinctes
- ✅ 1 seul rôle nécessaire

**Tâche Complexe:**
- ✅ > 3 todos OU
- ✅ > 5 dépendances OU
- ✅ > 200 lignes estimées OU
- ✅ > 5 fichiers à modifier OU
- ✅ > 3 validations distinctes OU
- ✅ > 2 rôles nécessaires

**Tâche Très Complexe:**
- ✅ > 10 todos OU
- ✅ > 10 dépendances OU
- ✅ > 500 lignes estimées OU
- ✅ > 10 fichiers à modifier OU
- ✅ > 5 validations distinctes OU
- ✅ > 3 rôles nécessaires OU
- ✅ Migration + Consolidation + Erreurs

### 2. Détection Automatique

**Pattern:**
```typescript
interface TaskComplexity {
  todos: number;
  dependencies: number;
  estimatedLines: number;
  filesToModify: number;
  validations: number;
  roles: number;
  isMigration: boolean;
  isConsolidation: boolean;
  hasErrors: boolean;
  isAutonomousRun: boolean;
}

function detectTaskComplexity(task: Task): TaskComplexity {
  return {
    todos: task.todos.length,
    dependencies: task.dependencies.length,
    estimatedLines: estimateLines(task),
    filesToModify: task.filesToModify.length,
    validations: countValidations(task),
    roles: countRequiredRoles(task),
    isMigration: task.involvesMigration,
    isConsolidation: task.involvesConsolidation,
    hasErrors: task.hasErrors,
    isAutonomousRun: task.isAutonomousRun
  };
}

function classifyTaskComplexity(complexity: TaskComplexity): 'simple' | 'complex' | 'very-complex' {
  const scores = {
    todos: complexity.todos > 10 ? 3 : complexity.todos > 3 ? 2 : 1,
    dependencies: complexity.dependencies > 10 ? 3 : complexity.dependencies > 5 ? 2 : 1,
    estimatedLines: complexity.estimatedLines > 500 ? 3 : complexity.estimatedLines > 200 ? 2 : 1,
    filesToModify: complexity.filesToModify > 10 ? 3 : complexity.filesToModify > 5 ? 2 : 1,
    validations: complexity.validations > 5 ? 3 : complexity.validations > 3 ? 2 : 1,
    roles: complexity.roles > 3 ? 3 : complexity.roles > 2 ? 2 : 1,
    special: (complexity.isMigration && complexity.isConsolidation && complexity.hasErrors) ? 3 : 0
  };
  
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  
  if (totalScore >= 15 || complexity.isAutonomousRun) {
    return 'very-complex';
  }
  
  if (totalScore >= 8) {
    return 'complex';
  }
  
  return 'simple';
}
```

## 🔄 Chargement Automatique des Règles selon Complexité

### 1. Tâche Simple

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: Selon domaine (backend/frontend/IA/database) (1-2)
- P1: `preventive-validation.md` (1)
- P1: `similar-code-detection.md` (si création/modification) (1)

**Total:** 5-7 fichiers

**Pattern:**
```typescript
function loadRulesForSimpleTask(
  task: Task,
  context: Context
): RuleSet {
  const domainRules = detectDomainRules(task, context);
  
  return {
    p0: ['core.md', 'quality-principles.md', 'code-quality.md'],
    p1: [
      ...domainRules,
      'preventive-validation.md',
      ...(task.isCreation || task.isModification ? ['similar-code-detection.md'] : [])
    ],
    p2: []
  };
}
```

### 2. Tâche Complexe

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: Selon domaine (1-2)
- P1: `senior-architect-oversight.md` (IMPÉRATIF) (1)
- P1: `client-consultant-oversight.md` (IMPÉRATIF) (1)
- P1: `todo-completion.md` (IMPÉRATIF) (1)
- P1: `iterative-perfection.md` (IMPÉRATIF) (1)
- P1: `task-decomposition.md` (IMPÉRATIF) (1)
- P1: `similar-code-detection.md` (1)
- P1: `preventive-validation.md` (1)
- P2: `pre-task-evaluation.md` (1)

**Total:** 11-12 fichiers

**Pattern:**
```typescript
function loadRulesForComplexTask(
  task: Task,
  context: Context
): RuleSet {
  const domainRules = detectDomainRules(task, context);
  
  return {
    p0: ['core.md', 'quality-principles.md', 'code-quality.md'],
    p1: [
      ...domainRules,
      'senior-architect-oversight.md',
      'client-consultant-oversight.md',
      'todo-completion.md',
      'iterative-perfection.md',
      'task-decomposition.md',
      'similar-code-detection.md',
      'preventive-validation.md'
    ],
    p2: ['pre-task-evaluation.md']
  };
}
```

### 3. Tâche Très Complexe

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: Selon domaine (1-2)
- P1: `senior-architect-oversight.md` (IMPÉRATIF) (1)
- P1: `client-consultant-oversight.md` (IMPÉRATIF) (1)
- P1: `hard-coding-specialist.md` (IMPÉRATIF) (1)
- P1: `todo-completion.md` (IMPÉRATIF) (1)
- P1: `iterative-perfection.md` (IMPÉRATIF) (1)
- P1: `persistent-execution.md` (IMPÉRATIF) (1)
- P1: `advanced-iteration-and-role-coordination.md` (IMPÉRATIF) (1)
- P1: `task-decomposition.md` (IMPÉRATIF) (1)
- P1: `learning-memory.md` (1)
- P1: `similar-code-detection.md` (1)
- P1: `preventive-validation.md` (1)
- P1: Rôles spécialisés selon contexte (migration/consolidation/erreurs) (0-3)
- P2: `pre-task-evaluation.md` (1)
- P2: `autonomous-workflows.md` (1)
- P2: `agent-optimization.md` (1)

**Total:** 15-18 fichiers

**Pattern:**
```typescript
function loadRulesForVeryComplexTask(
  task: Task,
  context: Context
): RuleSet {
  const domainRules = detectDomainRules(task, context);
  const specializedRoles = detectSpecializedRoles(task, context);
  
  return {
    p0: ['core.md', 'quality-principles.md', 'code-quality.md'],
    p1: [
      ...domainRules,
      'senior-architect-oversight.md',
      'client-consultant-oversight.md',
      'hard-coding-specialist.md',
      'todo-completion.md',
      'iterative-perfection.md',
      'persistent-execution.md',
      'advanced-iteration-and-role-coordination.md',
      'task-decomposition.md',
      'learning-memory.md',
      'similar-code-detection.md',
      'preventive-validation.md',
      ...specializedRoles
    ],
    p2: [
      'pre-task-evaluation.md',
      'autonomous-workflows.md',
      'agent-optimization.md'
    ]
  };
}
```

## 🤖 Détection Intelligente avec Apprentissage

### Principe

**IMPÉRATIF:** Apprendre des patterns de complexité précédents pour améliorer la détection automatique.

**Pattern:**
```typescript
interface ComplexityPattern {
  taskType: string;
  complexity: TaskComplexity;
  actualComplexity: 'simple' | 'complex' | 'very-complex';
  rulesLoaded: string[];
  success: boolean;
}

async function learnFromComplexityPatterns(
  patterns: ComplexityPattern[],
  context: Context
): Promise<void> {
  // 1. Analyser patterns réussis
  const successfulPatterns = patterns.filter(p => p.success);
  
  // 2. Identifier patterns récurrents
  const recurrentPatterns = identifyRecurrentPatterns(successfulPatterns);
  
  // 3. Ajuster seuils selon patterns
  const adjustedThresholds = adjustThresholds(recurrentPatterns);
  
  // 4. Sauvegarder apprentissages
  await saveComplexityLearnings(adjustedThresholds, context);
}

function adjustThresholds(
  patterns: ComplexityPattern[]
): AdjustedThresholds {
  // Analyser écarts entre détection et réalité
  const adjustments = patterns.map(pattern => {
    const detected = classifyTaskComplexity(pattern.complexity);
    const actual = pattern.actualComplexity;
    
    return {
      pattern,
      adjustment: calculateAdjustment(detected, actual, pattern.complexity)
    };
  });
  
  // Calculer ajustements moyens
  return calculateAverageAdjustments(adjustments);
}
```

## 📊 Matrice de Détection Intelligente

### Par Type de Tâche

| Type de Tâche | Complexité | Règles P0 | Règles P1 | Règles P2 | Total |
|---------------|------------|-----------|-----------|-----------|-------|
| Créer route API | Simple | 3 | backend + preventive-validation + similar-code-detection (3) | workflows (1) | 7 |
| Créer composant React | Simple | 3 | frontend + preventive-validation + similar-code-detection (3) | workflows (1) | 7 |
| Modifier service | Simple | 3 | backend + preventive-validation (2) | - | 5 |
| Tâche avec 5 todos | Complexe | 3 | backend + senior-architect + client-consultant + todo-completion + iterative-perfection + task-decomposition + similar-code-detection + preventive-validation (8) | pre-task-evaluation (1) | 12 |
| Run autonome | Très Complexe | 3 | backend + senior-architect + client-consultant + hard-coding + todo-completion + iterative-perfection + persistent-execution + advanced-iteration + task-decomposition + learning-memory + similar-code-detection + preventive-validation (12) | pre-task-evaluation + autonomous-workflows + agent-optimization (3) | 18 |
| Migration + Consolidation | Très Complexe | 3 | backend + senior-architect + client-consultant + migration-manager + tech-debt-manager + hard-coding + task-decomposition + preventive-validation + dependency-intelligence (9) | pre-task-evaluation (1) | 13 |

## ⚠️ Règles de Détection Intelligente

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer complexité détectée
- ❌ Charger règles inutiles
- ❌ Ne pas ajuster seuils selon apprentissages
- ❌ Ne pas apprendre des patterns précédents

**TOUJOURS:**
- ✅ Détecter complexité automatiquement
- ✅ Charger règles appropriées selon complexité
- ✅ Ajuster seuils selon apprentissages
- ✅ Apprendre des patterns précédents
- ✅ Optimiser contexte (max 5-7 fichiers pour simples, 11-15 pour complexes)

## 🔗 Références

### Documentation Essentielle

- `@.cursor/rules/context-detection.md` - Détection automatique du contexte
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages

---

**Note:** Cette détection intelligente permet d'optimiser automatiquement le chargement des règles selon la complexité réelle des tâches, améliorant ainsi le paramétrage de l'agent.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

