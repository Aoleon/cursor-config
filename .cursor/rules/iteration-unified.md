# Itération Unifiée avec Coordination des Rôles - Saxium

**Objectif:** Garantir que l'agent itère automatiquement jusqu'à perfection avec apprentissage intelligent et coordination avancée des rôles pour maximiser l'autonomie, la durée des runs et la qualité du code.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser des itérations intelligentes avec apprentissage et une coordination avancée des rôles pour itérer automatiquement jusqu'à ce que la tâche soit parfaitement complétée.

**Critères de Perfection:**
- ✅ Aucune erreur TypeScript
- ✅ Tous les tests passent (unitaires + E2E)
- ✅ Fonctionnalité complète (tous les éléments requis implémentés)
- ✅ Aucun anti-pattern détecté
- ✅ Validation complète réussie
- ✅ Aucune régression détectée
- ✅ Validation conjointe multi-rôles réussie

**Bénéfices:**
- ✅ Itérations plus efficaces grâce à l'apprentissage des patterns d'erreurs
- ✅ Coordination optimale des rôles avec validation croisée améliorée
- ✅ Auto-amélioration continue des stratégies et workflows
- ✅ Réduction du nombre d'itérations nécessaires
- ✅ Amélioration continue de la qualité

## 📋 Règles d'Itération Unifiée

### 1. Détection Automatique des Problèmes

**IMPÉRATIF:** Détecter automatiquement tous les types de problèmes après chaque modification.

**TOUJOURS:**
- ✅ Détecter tous les types de problèmes après chaque modification
- ✅ Analyser les erreurs TypeScript
- ✅ Analyser les échecs de tests
- ✅ Détecter les fonctionnalités incomplètes
- ✅ Détecter les erreurs parallèles (découvertes par tests)
- ✅ Détecter les anti-patterns
- ✅ Documenter tous les problèmes détectés

**Pattern:**
```typescript
// Détecter tous les types de problèmes
async function detectAllIssues(code: string, context: Context): Promise<Issue[]> {
  const issues: Issue[] = [];
  
  // 1. Erreurs TypeScript
  const tsErrors = await detectTypeScriptErrors(code);
  issues.push(...tsErrors.map(e => ({
    type: 'typescript',
    severity: 'error',
    error: e,
    canAutoFix: e.canAutoFix
  })));
  
  // 2. Erreurs de tests
  const testFailures = await detectTestFailures(code, context);
  issues.push(...testFailures.map(f => ({
    type: 'test',
    severity: 'error',
    failure: f,
    canAutoFix: f.canAutoFix
  })));
  
  // 3. Fonctionnalités incomplètes
  const incompleteFeatures = await detectIncompleteFeatures(code, context);
  issues.push(...incompleteFeatures.map(f => ({
    type: 'incomplete',
    severity: 'warning',
    feature: f,
    canAutoFix: f.canAutoFix
  })));
  
  // 4. Erreurs parallèles (découvertes par tests)
  const parallelErrors = await detectParallelErrors(code, context);
  issues.push(...parallelErrors.map(e => ({
    type: 'parallel',
    severity: 'error',
    error: e,
    canAutoFix: e.canAutoFix
  })));
  
  // 5. Anti-patterns
  const antiPatterns = await detectAntiPatterns(code);
  issues.push(...antiPatterns.map(p => ({
    type: 'anti-pattern',
    severity: 'warning',
    pattern: p,
    canAutoFix: p.canAutoFix
  })));
  
  return issues;
}
```

### 2. Itérations Intelligentes avec Apprentissage

**IMPÉRATIF:** Utiliser l'apprentissage des patterns d'erreurs pour optimiser les itérations.

**TOUJOURS:**
- ✅ Apprendre des patterns d'erreurs précédents
- ✅ Prioriser corrections selon fréquence et impact des erreurs
- ✅ Adapter stratégies de correction selon apprentissages
- ✅ Réutiliser solutions efficaces pour erreurs similaires
- ✅ Éviter corrections répétées des mêmes erreurs
- ✅ Optimiser ordre des corrections selon dépendances

**Pattern:**
```typescript
// Itérations intelligentes avec apprentissage
class IntelligentIterationManager {
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private successfulCorrections: Map<string, Correction> = new Map();
  
  async iterateIntelligently(
    issues: Issue[],
    context: Context
  ): Promise<IterationResult> {
    // 1. Analyser patterns d'erreurs
    const errorPatterns = await this.analyzeErrorPatterns(issues, context);
    
    // 2. Apprendre des patterns précédents
    const learnedPatterns = await this.learnFromPreviousPatterns(
      errorPatterns,
      context
    );
    
    // 3. Prioriser corrections selon apprentissages
    const prioritizedIssues = await this.prioritizeByLearning(
      issues,
      learnedPatterns,
      context
    );
    
    // 4. Adapter stratégies selon apprentissages
    const adaptedStrategies = await this.adaptStrategiesByLearning(
      prioritizedIssues,
      learnedPatterns,
      context
    );
    
    // 5. Corriger avec stratégies adaptées
    const correctedCode = await this.correctWithAdaptedStrategies(
      prioritizedIssues,
      adaptedStrategies,
      context
    );
    
    // 6. Apprendre des corrections
    await this.learnFromCorrections(
      prioritizedIssues,
      correctedCode,
      context
    );
    
    return {
      success: true,
      correctedCode,
      iterations: 1,
      learnedPatterns: learnedPatterns.length,
      reusedSolutions: this.countReusedSolutions(adaptedStrategies)
    };
  }
  
  async prioritizeByLearning(
    issues: Issue[],
    learnedPatterns: ErrorPattern[],
    context: Context
  ): Promise<PrioritizedIssue[]> {
    // Priorité basée sur :
    // - Fréquence de l'erreur (plus fréquent = plus prioritaire)
    // - Impact (plus impactant = plus prioritaire)
    // - Taux de succès des corrections précédentes (plus élevé = plus prioritaire)
    // - Dépendances (corriger dépendances d'abord)
    const prioritized = issues.map(issue => {
      const pattern = learnedPatterns.find(p => p.issueType === issue.type);
      const priority = this.calculatePriority(issue, pattern, context);
      
      return {
        issue,
        priority,
        pattern,
        estimatedTime: this.estimateCorrectionTime(issue, pattern),
        dependencies: this.identifyDependencies(issue, issues)
      };
    });
    
    return prioritized.sort((a, b) => b.priority - a.priority);
  }
}
```

### 3. Coordination Avancée des Rôles avec Apprentissage Collectif

**IMPÉRATIF:** Utiliser l'apprentissage collectif pour améliorer la coordination des rôles.

**TOUJOURS:**
- ✅ Apprendre des validations conjointes précédentes
- ✅ Optimiser ordre de validation selon apprentissages
- ✅ Réutiliser workflows de validation réussis
- ✅ Adapter coordination selon contexte et apprentissages
- ✅ Améliorer détection de conflits entre rôles
- ✅ Optimiser résolution de conflits selon apprentissages

**Pattern:**
```typescript
// Coordination avancée des rôles avec apprentissage collectif
class AdvancedRoleCoordinator {
  private validationHistory: Map<string, ValidationHistory> = new Map();
  private successfulWorkflows: Map<string, Workflow> = new Map();
  
  async coordinateWithLearning(
    solution: MultiRoleSolution,
    roles: Role[],
    context: Context
  ): Promise<CoordinatedResult> {
    // 1. Chercher workflow de validation similaire
    const similarWorkflow = await this.findSimilarWorkflow(
      solution,
      roles,
      context
    );
    
    if (similarWorkflow && similarWorkflow.successRate > 0.8) {
      // 2. Réutiliser workflow réussi
      return await this.reuseSuccessfulWorkflow(
        solution,
        similarWorkflow,
        context
      );
    }
    
    // 3. Adapter workflow selon apprentissages
    const adaptedWorkflow = await this.adaptWorkflowByLearning(
      solution,
      roles,
      similarWorkflow,
      context
    );
    
    // 4. Exécuter workflow adapté
    const result = await this.executeAdaptedWorkflow(
      solution,
      adaptedWorkflow,
      context
    );
    
    // 5. Apprendre du résultat
    await this.learnFromCoordination(
      solution,
      adaptedWorkflow,
      result,
      context
    );
    
    return result;
  }
}
```

### 4. Validation Complète Avant Arrêt

**IMPÉRATIF:** Valider complètement avant de s'arrêter, incluant validation multi-rôles.

**TOUJOURS:**
- ✅ Valider TypeScript complètement
- ✅ Exécuter tous les tests (unitaires + E2E)
- ✅ Valider fonctionnalité complète
- ✅ Détecter anti-patterns
- ✅ Vérifier absence de régressions
- ✅ Valider avec coordination multi-rôles
- ✅ Ne s'arrêter que si validation complète réussie

**Pattern:**
```typescript
// Valider complètement avant de s'arrêter
async function validateCompletely(
  code: string,
  task: Task,
  context: Context
): Promise<CompleteValidation> {
  const validation: CompleteValidation = {
    perfect: true,
    issues: []
  };
  
  // 1. Validation TypeScript
  const tsValidation = await validateTypeScript(code);
  if (!tsValidation.success) {
    validation.perfect = false;
    validation.issues.push(...tsValidation.errors.map(e => ({
      type: 'typescript',
      severity: 'error',
      error: e
    })));
  }
  
  // 2. Validation tests unitaires
  const unitTests = await runAllUnitTests(code);
  if (!unitTests.success) {
    validation.perfect = false;
    validation.issues.push(...unitTests.failures.map(f => ({
      type: 'test-unit',
      severity: 'error',
      failure: f
    })));
  }
  
  // 3. Validation tests E2E
  const e2eTests = await runAllE2ETests(code);
  if (!e2eTests.success) {
    validation.perfect = false;
    validation.issues.push(...e2eTests.failures.map(f => ({
      type: 'test-e2e',
      severity: 'error',
      failure: f
    })));
  }
  
  // 4. Validation fonctionnalité complète
  const featureValidation = await validateFeatureCompleteness(code, task);
  if (!featureValidation.complete) {
    validation.perfect = false;
    validation.issues.push(...featureValidation.missingElements.map(e => ({
      type: 'incomplete',
      severity: 'warning',
      element: e
    })));
  }
  
  // 5. Validation anti-patterns
  const antiPatterns = await detectAntiPatterns(code);
  if (antiPatterns.length > 0) {
    validation.perfect = false;
    validation.issues.push(...antiPatterns.map(p => ({
      type: 'anti-pattern',
      severity: 'warning',
      pattern: p
    })));
  }
  
  // 6. Vérification régressions
  const regressions = await detectRegressions(code, task);
  if (regressions.length > 0) {
    validation.perfect = false;
    validation.issues.push(...regressions.map(r => ({
      type: 'regression',
      severity: 'error',
      regression: r
    })));
  }
  
  // 7. Validation multi-rôles
  const roles = identifyRequiredRoles(task, context);
  const multiRoleValidation = await coordinateRolesWithLearning(
    { code, task },
    roles,
    context
  );
  
  if (!multiRoleValidation.approved) {
    validation.perfect = false;
    validation.issues.push(...multiRoleValidation.issues.map(i => ({
      type: 'multi-role',
      severity: 'error',
      issue: i
    })));
  }
  
  return validation;
}
```

### 5. Itération Automatique jusqu'à Perfection

**IMPÉRATIF:** Itérer automatiquement jusqu'à ce que tous les problèmes soient résolus et validation complète réussie.

**TOUJOURS:**
- ✅ Itérer automatiquement jusqu'à ce que tous les problèmes soient résolus
- ✅ Corriger automatiquement tous les problèmes auto-corrigeables
- ✅ Valider après chaque itération
- ✅ Coordonner rôles à chaque itération si nécessaire
- ✅ Documenter les problèmes non auto-corrigeables
- ✅ Ne pas s'arrêter tant qu'il reste des problèmes
- ✅ Limiter le nombre d'itérations (max 10) pour éviter boucles infinies

**Pattern:**
```typescript
// Itérer jusqu'à ce que tout soit parfait
async function iterateToPerfection(
  task: Task,
  context: Context
): Promise<PerfectionResult> {
  let iteration = 0;
  const maxIterations = 10;
  let currentCode = await loadCode(task);
  const iterationHistory: IterationHistory[] = [];
  const iterationManager = new IntelligentIterationManager();
  const roleCoordinator = new AdvancedRoleCoordinator();
  
  while (iteration < maxIterations) {
    // 1. Détecter tous les problèmes
    const issues = await detectAllIssues(currentCode, context);
    
    // 2. Si aucun problème, valider complètement
    if (issues.length === 0) {
      const fullValidation = await validateCompletely(currentCode, task, context);
      if (fullValidation.perfect) {
        return {
          success: true,
          perfect: true,
          iterations: iteration,
          code: currentCode,
          history: iterationHistory
        };
      }
      // Si validation échoue, continuer à itérer
      issues.push(...fullValidation.issues);
    }
    
    // 3. Documenter itération
    iterationHistory.push({
      iteration,
      issues: issues.length,
      code: currentCode,
      timestamp: Date.now()
    });
    
    // 4. Itérer intelligemment avec apprentissage
    const iterationResult = await iterationManager.iterateIntelligently(
      issues,
      context
    );
    
    // 5. Coordonner rôles si nécessaire
    const roles = identifyRequiredRoles(task, context);
    if (roles.length > 1) {
      const coordinationResult = await roleCoordinator.coordinateWithLearning(
        {
          code: iterationResult.correctedCode,
          task,
          issues
        },
        roles,
        context
      );
      
      if (!coordinationResult.approved) {
        // Si coordination échoue, corriger et continuer
        issues.push(...coordinationResult.issues);
        continue;
      }
    }
    
    // 6. Mettre à jour code et itérer
    currentCode = iterationResult.correctedCode;
    iteration++;
    
    // 7. Sauvegarder état à chaque itération
    await saveIterationState(task, iteration, currentCode, issues);
  }
  
  // Si max iterations atteint, documenter état final
  const remainingIssues = await detectAllIssues(currentCode, context);
  return {
    success: false,
    perfect: false,
    iterations: iteration,
    code: currentCode,
    remainingIssues,
    history: iterationHistory
  };
}
```

### 6. Auto-Amélioration Continue des Itérations

**IMPÉRATIF:** Améliorer continuellement les stratégies d'itération basées sur les succès et échecs.

**TOUJOURS:**
- ✅ Analyser efficacité des itérations précédentes
- ✅ Identifier patterns de succès et d'échec
- ✅ Adapter stratégies selon analyses
- ✅ Améliorer détection de problèmes
- ✅ Optimiser ordre des corrections
- ✅ Réduire nombre d'itérations nécessaires

**Pattern:**
```typescript
// Auto-amélioration continue des itérations
class IterationSelfImprovement {
  async improveIterations(
    task: Task,
    iterationHistory: IterationHistory[],
    context: Context
  ): Promise<ImprovedIterationStrategy> {
    // 1. Analyser métriques d'itérations
    const metrics = await this.analyzeIterationMetrics(
      iterationHistory,
      context
    );
    
    // 2. Identifier patterns de succès
    const successPatterns = await this.identifySuccessPatterns(
      iterationHistory,
      metrics,
      context
    );
    
    // 3. Identifier patterns d'échec
    const failurePatterns = await this.identifyFailurePatterns(
      iterationHistory,
      metrics,
      context
    );
    
    // 4. Adapter stratégies selon analyses
    const improvedStrategy = await this.adaptStrategyByAnalysis(
      task,
      successPatterns,
      failurePatterns,
      metrics,
      context
    );
    
    return {
      strategy: improvedStrategy,
      expectedIterations: this.estimateIterations(improvedStrategy, metrics),
      confidence: this.calculateImprovementConfidence(
        successPatterns,
        failurePatterns,
        metrics
      )
    };
  }
}
```

## 🔄 Workflow d'Itération Unifiée

### Workflow: Itérer jusqu'à Perfection avec Coordination des Rôles

**Étapes:**
1. Détecter tous les problèmes (TypeScript, tests, fonctionnalités, anti-patterns)
2. Si aucun problème, valider complètement (incluant multi-rôles)
3. Si validation complète réussie, arrêter (perfection atteinte)
4. Sinon, itérer intelligemment avec apprentissage
5. Coordonner rôles si nécessaire avec apprentissage collectif
6. Valider corrections et coordination
7. Itérer jusqu'à perfection ou max iterations
8. Documenter état final et améliorer stratégies

## ⚠️ Règles Anti-Interruption

### Ne Jamais S'Arrêter Si:

**BLOQUANT:**
- ❌ Il reste des erreurs TypeScript
- ❌ Il reste des tests qui échouent
- ❌ Il reste des fonctionnalités incomplètes
- ❌ Il reste des anti-patterns
- ❌ La validation complète échoue
- ❌ Il y a des régressions détectées
- ❌ La validation multi-rôles échoue

**TOUJOURS:**
- ✅ Détecter tous les problèmes avant de s'arrêter
- ✅ Itérer intelligemment avec apprentissage
- ✅ Coordonner rôles si nécessaire
- ✅ Valider complètement (incluant multi-rôles) avant de s'arrêter
- ✅ Documenter problèmes non résolus si max iterations atteint
- ✅ Sauvegarder état pour reprise
- ✅ Améliorer stratégies d'itération après chaque run

## 📊 Checklist Itération Unifiée

### Avant de S'Arrêter

- [ ] Détecter tous les problèmes (TypeScript, tests, fonctionnalités, anti-patterns)
- [ ] S'assurer qu'il n'y a pas d'erreurs TypeScript
- [ ] S'assurer que tous les tests passent (unitaires + E2E)
- [ ] S'assurer que la fonctionnalité est complète
- [ ] S'assurer qu'il n'y a pas d'anti-patterns
- [ ] Valider complètement (validation complète réussie)
- [ ] Valider avec coordination multi-rôles
- [ ] Vérifier absence de régressions
- [ ] Sauvegarder état final
- [ ] Générer rapport de perfection

### Pendant l'Itération

- [ ] Détecter tous les problèmes à chaque itération
- [ ] Itérer intelligemment avec apprentissage
- [ ] Prioriser corrections selon apprentissages
- [ ] Réutiliser solutions efficaces
- [ ] Coordonner rôles si nécessaire avec apprentissage collectif
- [ ] Valider chaque correction
- [ ] Documenter corrections appliquées
- [ ] Documenter problèmes non auto-corrigeables
- [ ] Sauvegarder état à chaque itération
- [ ] Continuer jusqu'à perfection ou max iterations

### Après l'Itération

- [ ] Analyser efficacité des itérations
- [ ] Identifier patterns de succès et d'échec
- [ ] Améliorer stratégies d'itération
- [ ] Enregistrer apprentissages
- [ ] Mettre à jour workflows de validation

## 🔗 Références

- `@.cursor/rules/todo-completion.md` - Completion des todos
- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior
- `@.cursor/rules/client-consultant-oversight.md` - Supervision consultant client
- `@.cursor/rules/automated-testing-debugging.md` - Tests E2E et débogage automatisé
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Cette règle unifie `iterative-perfection.md` et `advanced-iteration-and-role-coordination.md` pour combiner détection de problèmes, itération intelligente avec apprentissage, coordination des rôles, validation complète et auto-amélioration continue.


