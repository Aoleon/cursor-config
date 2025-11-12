# Itérations Avancées et Coordination des Rôles - Saxium

**Objectif:** Améliorer les itérations automatiques et la coordination des rôles pour maximiser l'autonomie, la durée des runs et la qualité du code.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser des itérations intelligentes avec apprentissage et une coordination avancée des rôles pour maximiser l'autonomie, la durée des runs et la qualité.

**Bénéfices:**
- ✅ Itérations plus efficaces grâce à l'apprentissage des patterns d'erreurs
- ✅ Coordination optimale des rôles avec validation croisée améliorée
- ✅ Auto-amélioration continue des stratégies et workflows
- ✅ Réduction du nombre d'itérations nécessaires
- ✅ Amélioration continue de la qualité

## 📋 Règles d'Itérations Avancées

### 1. Itérations Intelligentes avec Apprentissage

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
  
  async analyzeErrorPatterns(
    issues: Issue[],
    context: Context
  ): Promise<ErrorPattern[]> {
    const patterns: ErrorPattern[] = [];
    
    for (const issue of issues) {
      // 1. Identifier pattern d'erreur
      const pattern = await this.identifyErrorPattern(issue, context);
      
      // 2. Chercher pattern similaire dans mémoire
      const similarPattern = await this.findSimilarPattern(pattern, context);
      
      if (similarPattern) {
        // 3. Enrichir pattern avec apprentissages
        pattern.frequency = similarPattern.frequency + 1;
        pattern.successfulCorrections = similarPattern.successfulCorrections;
        pattern.failedCorrections = similarPattern.failedCorrections;
      }
      
      patterns.push(pattern);
    }
    
    return patterns;
  }
  
  async prioritizeByLearning(
    issues: Issue[],
    learnedPatterns: ErrorPattern[],
    context: Context
  ): Promise<PrioritizedIssue[]> {
    // 1. Calculer priorité basée sur apprentissages
    const prioritized = issues.map(issue => {
      const pattern = learnedPatterns.find(p => p.issueType === issue.type);
      
      // Priorité basée sur :
      // - Fréquence de l'erreur (plus fréquent = plus prioritaire)
      // - Impact (plus impactant = plus prioritaire)
      // - Taux de succès des corrections précédentes (plus élevé = plus prioritaire)
      // - Dépendances (corriger dépendances d'abord)
      const priority = this.calculatePriority(issue, pattern, context);
      
      return {
        issue,
        priority,
        pattern,
        estimatedTime: this.estimateCorrectionTime(issue, pattern),
        dependencies: this.identifyDependencies(issue, issues)
      };
    });
    
    // 2. Trier par priorité décroissante
    return prioritized.sort((a, b) => b.priority - a.priority);
  }
  
  async adaptStrategiesByLearning(
    prioritizedIssues: PrioritizedIssue[],
    learnedPatterns: ErrorPattern[],
    context: Context
  ): Promise<AdaptedStrategy[]> {
    const strategies: AdaptedStrategy[] = [];
    
    for (const prioritizedIssue of prioritizedIssues) {
      const pattern = prioritizedIssue.pattern;
      
      // 1. Chercher correction réussie similaire
      const successfulCorrection = await this.findSuccessfulCorrection(
        pattern,
        context
      );
      
      if (successfulCorrection) {
        // 2. Réutiliser stratégie réussie
        strategies.push({
          issue: prioritizedIssue.issue,
          strategy: successfulCorrection.strategy,
          adapted: true,
          reused: true,
          confidence: successfulCorrection.successRate
        });
      } else {
        // 3. Adapter stratégie selon apprentissages
        const adaptedStrategy = await this.adaptStrategyByLearning(
          prioritizedIssue.issue,
          pattern,
          context
        );
        
        strategies.push({
          issue: prioritizedIssue.issue,
          strategy: adaptedStrategy,
          adapted: true,
          reused: false,
          confidence: this.calculateConfidence(adaptedStrategy, pattern)
        });
      }
    }
    
    return strategies;
  }
  
  async learnFromCorrections(
    issues: Issue[],
    correctedCode: string,
    context: Context
  ): Promise<void> {
    // 1. Valider corrections
    const validation = await this.validateCorrections(
      issues,
      correctedCode,
      context
    );
    
    // 2. Enregistrer apprentissages
    for (const issue of issues) {
      const correction = validation.corrections.find(c => c.issueId === issue.id);
      
      if (correction && correction.success) {
        // 3. Enregistrer correction réussie
        await this.recordSuccessfulCorrection(issue, correction, context);
      } else if (correction && !correction.success) {
        // 4. Enregistrer correction échouée
        await this.recordFailedCorrection(issue, correction, context);
      }
    }
    
    // 5. Mettre à jour patterns d'erreurs
    await this.updateErrorPatterns(issues, validation, context);
  }
}
```

### 2. Coordination Avancée des Rôles avec Apprentissage Collectif

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
  
  async adaptWorkflowByLearning(
    solution: MultiRoleSolution,
    roles: Role[],
    previousWorkflow: Workflow | null,
    context: Context
  ): Promise<AdaptedWorkflow> {
    // 1. Analyser historique de validation
    const validationHistory = await this.analyzeValidationHistory(
      roles,
      context
    );
    
    // 2. Identifier ordre optimal selon apprentissages
    const optimalOrder = await this.identifyOptimalOrder(
      roles,
      validationHistory,
      context
    );
    
    // 3. Adapter stratégies de validation selon apprentissages
    const adaptedStrategies = await this.adaptValidationStrategies(
      roles,
      validationHistory,
      context
    );
    
    // 4. Optimiser détection de conflits
    const conflictDetection = await this.optimizeConflictDetection(
      roles,
      validationHistory,
      context
    );
    
    return {
      roles: optimalOrder,
      strategies: adaptedStrategies,
      conflictDetection,
      adapted: true,
      confidence: this.calculateWorkflowConfidence(
        optimalOrder,
        adaptedStrategies,
        validationHistory
      )
    };
  }
  
  async learnFromCoordination(
    solution: MultiRoleSolution,
    workflow: AdaptedWorkflow,
    result: CoordinatedResult,
    context: Context
  ): Promise<void> {
    // 1. Analyser résultat
    const analysis = await this.analyzeCoordinationResult(
      solution,
      workflow,
      result,
      context
    );
    
    // 2. Enregistrer apprentissages
    if (result.success) {
      // 3. Enregistrer workflow réussi
      await this.recordSuccessfulWorkflow(
        solution,
        workflow,
        result,
        context
      );
      
      // 4. Améliorer workflows existants
      await this.improveExistingWorkflows(
        workflow,
        analysis,
        context
      );
    } else {
      // 5. Enregistrer workflow échoué
      await this.recordFailedWorkflow(
        solution,
        workflow,
        result,
        context
      );
      
      // 6. Identifier améliorations possibles
      await this.identifyWorkflowImprovements(
        workflow,
        analysis,
        context
      );
    }
    
    // 7. Mettre à jour historique de validation
    await this.updateValidationHistory(
      solution,
      workflow,
      result,
      context
    );
  }
}
```

### 3. Auto-Amélioration Continue des Itérations

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
  private iterationMetrics: Map<string, IterationMetrics> = new Map();
  
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
    
    // 5. Optimiser détection de problèmes
    const improvedDetection = await this.optimizeProblemDetection(
      failurePatterns,
      metrics,
      context
    );
    
    // 6. Optimiser ordre des corrections
    const improvedOrder = await this.optimizeCorrectionOrder(
      successPatterns,
      failurePatterns,
      metrics,
      context
    );
    
    return {
      strategy: improvedStrategy,
      detection: improvedDetection,
      order: improvedOrder,
      expectedIterations: this.estimateIterations(
        improvedStrategy,
        improvedDetection,
        improvedOrder,
        metrics
      ),
      confidence: this.calculateImprovementConfidence(
        successPatterns,
        failurePatterns,
        metrics
      )
    };
  }
  
  async analyzeIterationMetrics(
    iterationHistory: IterationHistory[],
    context: Context
  ): Promise<IterationMetrics> {
    return {
      totalIterations: iterationHistory.length,
      averageIterationsPerTask: this.calculateAverage(iterationHistory),
      successRate: this.calculateSuccessRate(iterationHistory),
      averageTimePerIteration: this.calculateAverageTime(iterationHistory),
      mostCommonIssues: this.identifyMostCommonIssues(iterationHistory),
      mostEffectiveCorrections: this.identifyMostEffectiveCorrections(
        iterationHistory
      ),
      leastEffectiveCorrections: this.identifyLeastEffectiveCorrections(
        iterationHistory
      )
    };
  }
  
  async adaptStrategyByAnalysis(
    task: Task,
    successPatterns: SuccessPattern[],
    failurePatterns: FailurePattern[],
    metrics: IterationMetrics,
    context: Context
  ): Promise<ImprovedStrategy> {
    // 1. Adapter selon patterns de succès
    const successBasedStrategy = await this.adaptBySuccessPatterns(
      task,
      successPatterns,
      context
    );
    
    // 2. Éviter patterns d'échec
    const failureAvoidanceStrategy = await this.avoidFailurePatterns(
      task,
      failurePatterns,
      context
    );
    
    // 3. Optimiser selon métriques
    const metricsBasedStrategy = await this.optimizeByMetrics(
      task,
      metrics,
      context
    );
    
    // 4. Combiner stratégies
    return this.combineStrategies(
      successBasedStrategy,
      failureAvoidanceStrategy,
      metricsBasedStrategy,
      context
    );
  }
}
```

### 4. Itérations Adaptatives selon Complexité

**IMPÉRATIF:** Adapter le nombre et la stratégie d'itérations selon la complexité de la tâche.

**TOUJOURS:**
- ✅ Analyser complexité de la tâche
- ✅ Adapter nombre d'itérations selon complexité
- ✅ Prioriser corrections selon impact et complexité
- ✅ Optimiser stratégies selon complexité
- ✅ Ajuster dynamiquement selon progression

**Pattern:**
```typescript
// Itérations adaptatives selon complexité
class AdaptiveIterationManager {
  async adaptIterationsByComplexity(
    task: Task,
    issues: Issue[],
    context: Context
  ): Promise<AdaptiveIterationPlan> {
    // 1. Analyser complexité de la tâche
    const complexity = await this.analyzeTaskComplexity(task, context);
    
    // 2. Analyser complexité des problèmes
    const issueComplexity = await this.analyzeIssueComplexity(issues, context);
    
    // 3. Adapter nombre d'itérations selon complexité
    const maxIterations = this.calculateMaxIterations(
      complexity,
      issueComplexity,
      context
    );
    
    // 4. Prioriser corrections selon complexité et impact
    const prioritizedIssues = await this.prioritizeByComplexityAndImpact(
      issues,
      complexity,
      issueComplexity,
      context
    );
    
    // 5. Adapter stratégies selon complexité
    const adaptedStrategies = await this.adaptStrategiesByComplexity(
      prioritizedIssues,
      complexity,
      issueComplexity,
      context
    );
    
    // 6. Planifier itérations adaptatives
    return {
      maxIterations,
      prioritizedIssues,
      strategies: adaptedStrategies,
      adaptive: true,
      estimatedTime: this.estimateTime(
        maxIterations,
        prioritizedIssues,
        adaptedStrategies
      )
    };
  }
  
  calculateMaxIterations(
    taskComplexity: Complexity,
    issueComplexity: IssueComplexity[],
    context: Context
  ): number {
    // Base : 10 itérations
    let maxIterations = 10;
    
    // Ajuster selon complexité de la tâche
    if (taskComplexity.level === 'high') {
      maxIterations += 5;
    } else if (taskComplexity.level === 'very-high') {
      maxIterations += 10;
    }
    
    // Ajuster selon complexité des problèmes
    const avgIssueComplexity = this.calculateAverageComplexity(issueComplexity);
    if (avgIssueComplexity > 0.7) {
      maxIterations += 5;
    }
    
    // Ajuster selon nombre de problèmes
    if (issueComplexity.length > 10) {
      maxIterations += 5;
    }
    
    return Math.min(maxIterations, 30); // Maximum 30 itérations
  }
  
  async prioritizeByComplexityAndImpact(
    issues: Issue[],
    taskComplexity: Complexity,
    issueComplexity: IssueComplexity[],
    context: Context
  ): Promise<PrioritizedIssue[]> {
    return issues.map(issue => {
      const complexity = issueComplexity.find(c => c.issueId === issue.id);
      
      // Priorité basée sur :
      // - Impact (plus impactant = plus prioritaire)
      // - Complexité (moins complexe = plus prioritaire pour corrections rapides)
      // - Dépendances (corriger dépendances d'abord)
      const priority = this.calculatePriority(
        issue,
        complexity,
        taskComplexity,
        context
      );
      
      return {
        issue,
        priority,
        complexity: complexity?.level || 'medium',
        impact: issue.impact,
        dependencies: this.identifyDependencies(issue, issues)
      };
    }).sort((a, b) => b.priority - a.priority);
  }
}
```

### 5. Validation Croisée Améliorée entre Rôles

**IMPÉRATIF:** Améliorer la validation croisée entre rôles avec apprentissage et optimisation.

**TOUJOURS:**
- ✅ Apprendre des validations croisées précédentes
- ✅ Optimiser ordre de validation selon apprentissages
- ✅ Améliorer détection de conflits
- ✅ Optimiser résolution de conflits
- ✅ Réutiliser workflows de validation réussis
- ✅ Améliorer continuellement la validation croisée

**Pattern:**
```typescript
// Validation croisée améliorée entre rôles
class ImprovedCrossRoleValidation {
  private crossValidationHistory: Map<string, CrossValidationHistory> = new Map();
  
  async validateWithImprovedCrossRole(
    solution: MultiRoleSolution,
    roles: Role[],
    context: Context
  ): Promise<ImprovedCrossValidationResult> {
    // 1. Chercher historique de validation croisée similaire
    const similarHistory = await this.findSimilarCrossValidationHistory(
      solution,
      roles,
      context
    );
    
    // 2. Optimiser ordre de validation selon apprentissages
    const optimalOrder = await this.optimizeValidationOrder(
      roles,
      similarHistory,
      context
    );
    
    // 3. Exécuter validations dans ordre optimal
    const validations: RoleValidation[] = [];
    for (const role of optimalOrder) {
      const validation = await this.executeRoleValidation(
        role,
        solution,
        context
      );
      validations.push(validation);
      
      // 4. Détecter conflits tôt
      const conflicts = await this.detectConflictsEarly(
        validations,
        context
      );
      
      if (conflicts.length > 0) {
        // 5. Résoudre conflits immédiatement
        const resolved = await this.resolveConflictsImmediately(
          conflicts,
          validations,
          context
        );
        
        if (!resolved.success) {
          // 6. Si résolution impossible, itérer
          return {
            success: false,
            validations,
            conflicts: resolved.conflicts,
            requiresIteration: true
          };
        }
      }
    }
    
    // 7. Validation croisée globale
    const crossValidation = await this.performCrossValidation(
      validations,
      context
    );
    
    // 8. Apprendre de la validation croisée
    await this.learnFromCrossValidation(
      solution,
      validations,
      crossValidation,
      context
    );
    
    return {
      success: crossValidation.approved,
      validations,
      crossValidation,
      approved: crossValidation.approved
    };
  }
  
  async optimizeValidationOrder(
    roles: Role[],
    history: CrossValidationHistory | null,
    context: Context
  ): Promise<Role[]> {
    if (!history) {
      // Ordre par défaut : Architecte → Client → Spécialisés
      return this.getDefaultOrder(roles);
    }
    
    // 1. Analyser historique
    const analysis = await this.analyzeValidationHistory(history, context);
    
    // 2. Identifier ordre optimal selon apprentissages
    const optimalOrder = await this.identifyOptimalOrder(
      roles,
      analysis,
      context
    );
    
    return optimalOrder;
  }
  
  async learnFromCrossValidation(
    solution: MultiRoleSolution,
    validations: RoleValidation[],
    crossValidation: CrossValidation,
    context: Context
  ): Promise<void> {
    // 1. Enregistrer validation croisée
    await this.recordCrossValidation(
      solution,
      validations,
      crossValidation,
      context
    );
    
    // 2. Analyser efficacité
    const effectiveness = await this.analyzeCrossValidationEffectiveness(
      validations,
      crossValidation,
      context
    );
    
    // 3. Améliorer workflows si nécessaire
    if (effectiveness.canImprove) {
      await this.improveCrossValidationWorkflows(
        validations,
        crossValidation,
        effectiveness,
        context
      );
    }
  }
}
```

## 🔄 Workflow d'Itérations Avancées avec Coordination des Rôles

### Workflow: Itérer Intelligemment avec Coordination Avancée

**Étapes:**
1. Analyser tâche et problèmes avec apprentissage
2. Prioriser corrections selon apprentissages
3. Adapter stratégies selon apprentissages
4. Coordonner rôles avec apprentissage collectif
5. Exécuter itérations intelligentes
6. Valider avec validation croisée améliorée
7. Apprendre des itérations
8. Améliorer continuellement

**Pattern:**
```typescript
// Workflow complet d'itérations avancées avec coordination des rôles
async function advancedIterationWithRoleCoordination(
  task: Task,
  context: Context
): Promise<AdvancedIterationResult> {
  const iterationManager = new IntelligentIterationManager();
  const roleCoordinator = new AdvancedRoleCoordinator();
  const selfImprovement = new IterationSelfImprovement();
  const adaptiveManager = new AdaptiveIterationManager();
  const crossValidator = new ImprovedCrossRoleValidation();
  
  // 1. Analyser tâche et problèmes
  const issues = await detectAllIssues(task.code, context);
  const complexity = await analyzeTaskComplexity(task, context);
  
  // 2. Adapter itérations selon complexité
  const adaptivePlan = await adaptiveManager.adaptIterationsByComplexity(
    task,
    issues,
    context
  );
  
  // 3. Itérer intelligemment
  let currentCode = task.code;
  let iteration = 0;
  const iterationHistory: IterationHistory[] = [];
  
  while (iteration < adaptivePlan.maxIterations) {
    // 4. Itérer avec apprentissage
    const iterationResult = await iterationManager.iterateIntelligently(
      adaptivePlan.prioritizedIssues,
      context
    );
    
    currentCode = iterationResult.correctedCode;
    iterationHistory.push({
      iteration,
      issues: adaptivePlan.prioritizedIssues.length,
      learnedPatterns: iterationResult.learnedPatterns,
      reusedSolutions: iterationResult.reusedSolutions,
      timestamp: Date.now()
    });
    
    // 5. Coordonner rôles avec apprentissage collectif
    const roles = identifyRequiredRoles(task, context);
    const coordinationResult = await roleCoordinator.coordinateWithLearning(
      {
        code: currentCode,
        task,
        issues: adaptivePlan.prioritizedIssues
      },
      roles,
      context
    );
    
    // 6. Valider avec validation croisée améliorée
    const crossValidation = await crossValidator.validateWithImprovedCrossRole(
      {
        code: currentCode,
        task,
        coordination: coordinationResult
      },
      roles,
      context
    );
    
    // 7. Si validation réussie, vérifier perfection
    if (crossValidation.approved) {
      const fullValidation = await validateCompletely(currentCode, task);
      if (fullValidation.perfect) {
        // 8. Apprendre des itérations réussies
        await selfImprovement.improveIterations(
          task,
          iterationHistory,
          context
        );
        
        return {
          success: true,
          perfect: true,
          iterations: iteration,
          code: currentCode,
          learnedPatterns: iterationResult.learnedPatterns,
          reusedSolutions: iterationResult.reusedSolutions,
          coordination: coordinationResult,
          crossValidation
        };
      }
    }
    
    // 9. Détecter nouveaux problèmes
    const newIssues = await detectAllIssues(currentCode, context);
    adaptivePlan.prioritizedIssues = await adaptiveManager.prioritizeByComplexityAndImpact(
      newIssues,
      complexity,
      await analyzeIssueComplexity(newIssues, context),
      context
    );
    
    iteration++;
  }
  
  // 10. Améliorer stratégies même si max iterations atteint
  await selfImprovement.improveIterations(
    task,
    iterationHistory,
    context
  );
  
  return {
    success: false,
    perfect: false,
    iterations: iteration,
    code: currentCode,
    remainingIssues: adaptivePlan.prioritizedIssues,
    learnedPatterns: iterationHistory.reduce(
      (sum, h) => sum + h.learnedPatterns,
      0
    ),
    requiresImprovement: true
  };
}
```

### 6. Auto-Évaluation Continue et Adaptation Dynamique

**IMPÉRATIF:** Évaluer continuellement les performances et adapter dynamiquement les stratégies pour maximiser l'autonomie, la durée des runs et la qualité.

**TOUJOURS:**
- ✅ Évaluer performances après chaque itération (temps, qualité, progression)
- ✅ Détecter dégradations de performance en temps réel
- ✅ Adapter stratégies dynamiquement selon performances
- ✅ Optimiser ressources (contexte, mémoire, calculs) en temps réel
- ✅ Prévenir problèmes avant qu'ils ne se produisent
- ✅ Maintenir qualité constante même sur runs très longs
- ✅ Améliorer continuellement les métriques de performance

**Pattern:**
```typescript
// Auto-évaluation continue et adaptation dynamique
class ContinuousSelfEvaluation {
  private performanceMetrics: PerformanceMetrics[] = [];
  private adaptationHistory: Adaptation[] = [];
  
  async evaluateAndAdapt(
    iteration: IterationResult,
    context: Context
  ): Promise<AdaptationResult> {
    // 1. Évaluer performances actuelles
    const currentMetrics = await this.evaluatePerformance(
      iteration,
      context
    );
    
    // 2. Détecter dégradations
    const degradations = await this.detectPerformanceDegradations(
      currentMetrics,
      this.performanceMetrics,
      context
    );
    
    // 3. Adapter stratégies si nécessaire
    if (degradations.length > 0 || currentMetrics.quality < threshold) {
      const adaptation = await this.adaptStrategies(
        degradations,
        currentMetrics,
        context
      );
      
      // 4. Appliquer adaptations
      await this.applyAdaptations(adaptation, context);
      
      // 5. Enregistrer adaptation
      this.adaptationHistory.push(adaptation);
      
      return {
        adapted: true,
        adaptations: adaptation,
        metrics: currentMetrics,
        degradations
      };
    }
    
    // 6. Enregistrer métriques
    this.performanceMetrics.push(currentMetrics);
    
    return {
      adapted: false,
      metrics: currentMetrics
    };
  }
  
  async evaluatePerformance(
    iteration: IterationResult,
    context: Context
  ): Promise<PerformanceMetrics> {
    return {
      iteration: iteration.iteration,
      time: iteration.executionTime,
      quality: await this.calculateQualityScore(iteration.code, context),
      progress: await this.calculateProgress(iteration, context),
      efficiency: await this.calculateEfficiency(iteration, context),
      resourceUsage: await this.calculateResourceUsage(context),
      timestamp: Date.now()
    };
  }
  
  async detectPerformanceDegradations(
    current: PerformanceMetrics,
    history: PerformanceMetrics[],
    context: Context
  ): Promise<PerformanceDegradation[]> {
    const degradations: PerformanceDegradation[] = [];
    
    if (history.length > 0) {
      const previous = history[history.length - 1];
      
      // 1. Détecter dégradation qualité
      if (current.quality < previous.quality * 0.9) {
        degradations.push({
          type: 'quality',
          severity: 'high',
          current: current.quality,
          previous: previous.quality,
          degradation: previous.quality - current.quality
        });
      }
      
      // 2. Détecter dégradation efficacité
      if (current.efficiency < previous.efficiency * 0.8) {
        degradations.push({
          type: 'efficiency',
          severity: 'medium',
          current: current.efficiency,
          previous: previous.efficiency,
          degradation: previous.efficiency - current.efficiency
        });
      }
      
      // 3. Détecter augmentation temps
      if (current.time > previous.time * 1.5) {
        degradations.push({
          type: 'time',
          severity: 'medium',
          current: current.time,
          previous: previous.time,
          degradation: current.time - previous.time
        });
      }
      
      // 4. Détecter saturation ressources
      if (current.resourceUsage.context > 0.9 || 
          current.resourceUsage.memory > 0.9) {
        degradations.push({
          type: 'resources',
          severity: 'critical',
          current: current.resourceUsage,
          previous: previous.resourceUsage,
          degradation: {
            context: current.resourceUsage.context - previous.resourceUsage.context,
            memory: current.resourceUsage.memory - previous.resourceUsage.memory
          }
        });
      }
    }
    
    return degradations;
  }
  
  async adaptStrategies(
    degradations: PerformanceDegradation[],
    metrics: PerformanceMetrics,
    context: Context
  ): Promise<Adaptation> {
    const adaptations: StrategyAdaptation[] = [];
    
    for (const degradation of degradations) {
      switch (degradation.type) {
        case 'quality':
          // Adapter stratégies de validation
          adaptations.push({
            type: 'validation',
            action: 'increase-validation-strictness',
            priority: 'high'
          });
          break;
          
        case 'efficiency':
          // Optimiser ordre des corrections
          adaptations.push({
            type: 'iteration',
            action: 'optimize-correction-order',
            priority: 'medium'
          });
          break;
          
        case 'time':
          // Paralléliser opérations
          adaptations.push({
            type: 'execution',
            action: 'parallelize-operations',
            priority: 'medium'
          });
          break;
          
        case 'resources':
          // Optimiser contexte et mémoire
          adaptations.push({
            type: 'resources',
            action: 'optimize-context-and-memory',
            priority: 'critical'
          });
          break;
      }
    }
    
    return {
      adaptations,
      timestamp: Date.now(),
      reason: degradations.map(d => d.type).join(', ')
    };
  }
}
```

### 7. Coordination des Rôles avec Feedback en Temps Réel

**IMPÉRATIF:** Coordonner les rôles avec feedback en temps réel pour optimiser la validation et réduire les itérations.

**TOUJOURS:**
- ✅ Valider avec tous les rôles en parallèle quand possible
- ✅ Partager feedback entre rôles en temps réel
- ✅ Adapter validations selon feedback des autres rôles
- ✅ Résoudre conflits entre rôles automatiquement
- ✅ Optimiser ordre de validation selon feedback
- ✅ Apprendre des patterns de validation réussis

**Pattern:**
```typescript
// Coordination des rôles avec feedback en temps réel
class RealTimeRoleCoordination {
  private feedbackHistory: Map<string, Feedback[]> = new Map();
  
  async coordinateWithRealTimeFeedback(
    solution: MultiRoleSolution,
    roles: Role[],
    context: Context
  ): Promise<CoordinatedResult> {
    // 1. Valider avec tous les rôles en parallèle
    const validations = await Promise.all(
      roles.map(role => this.validateWithRole(solution, role, context))
    );
    
    // 2. Partager feedback en temps réel
    const sharedFeedback = await this.shareFeedbackInRealTime(
      validations,
      roles,
      context
    );
    
    // 3. Adapter validations selon feedback
    const adaptedValidations = await this.adaptValidationsByFeedback(
      validations,
      sharedFeedback,
      context
    );
    
    // 4. Résoudre conflits automatiquement
    const resolvedConflicts = await this.resolveConflictsAutomatically(
      adaptedValidations,
      sharedFeedback,
      context
    );
    
    // 5. Valider avec validations adaptées
    const finalValidation = await this.validateWithAdaptedValidations(
      solution,
      resolvedConflicts,
      context
    );
    
    // 6. Apprendre des patterns de validation
    await this.learnFromValidationPatterns(
      validations,
      sharedFeedback,
      finalValidation,
      context
    );
    
    return {
      success: finalValidation.approved,
      validations: adaptedValidations,
      feedback: sharedFeedback,
      conflicts: resolvedConflicts,
      final: finalValidation
    };
  }
  
  async shareFeedbackInRealTime(
    validations: RoleValidation[],
    roles: Role[],
    context: Context
  ): Promise<SharedFeedback> {
    const feedback: Feedback[] = [];
    
    // 1. Pour chaque validation, extraire feedback
    for (const validation of validations) {
      const roleFeedback: Feedback = {
        role: validation.role,
        approved: validation.approved,
        issues: validation.issues,
        recommendations: validation.recommendations,
        timestamp: Date.now()
      };
      
      feedback.push(roleFeedback);
      
      // 2. Partager feedback avec autres rôles
      for (const otherRole of roles) {
        if (otherRole !== validation.role) {
          await this.shareFeedbackWithRole(
            roleFeedback,
            otherRole,
            context
          );
        }
      }
    }
    
    return {
      feedback,
      shared: true,
      timestamp: Date.now()
    };
  }
  
  async adaptValidationsByFeedback(
    validations: RoleValidation[],
    sharedFeedback: SharedFeedback,
    context: Context
  ): Promise<AdaptedValidation[]> {
    const adapted: AdaptedValidation[] = [];
    
    for (const validation of validations) {
      // 1. Analyser feedback des autres rôles
      const otherFeedback = sharedFeedback.feedback.filter(
        f => f.role !== validation.role
      );
      
      // 2. Adapter validation selon feedback
      const adaptedValidation = await this.adaptValidationByFeedback(
        validation,
        otherFeedback,
        context
      );
      
      adapted.push(adaptedValidation);
    }
    
    return adapted;
  }
  
  async resolveConflictsAutomatically(
    validations: AdaptedValidation[],
    sharedFeedback: SharedFeedback,
    context: Context
  ): Promise<ResolvedConflicts> {
    // 1. Détecter conflits
    const conflicts = await this.detectConflicts(validations, context);
    
    // 2. Résoudre automatiquement si possible
    const resolved: ConflictResolution[] = [];
    for (const conflict of conflicts) {
      const resolution = await this.autoResolveConflict(
        conflict,
        sharedFeedback,
        context
      );
      
      if (resolution.resolved) {
        resolved.push(resolution);
      }
    }
    
    return {
      conflicts,
      resolved,
      allResolved: resolved.length === conflicts.length
    };
  }
}
```

### 8. Gestion Proactive des Ressources pour Runs Longs

**IMPÉRATIF:** Gérer proactivement les ressources (contexte, mémoire, calculs) pour permettre des runs très longs sans dégradation.

**TOUJOURS:**
- ✅ Monitorer utilisation ressources en temps réel
- ✅ Optimiser contexte avant saturation
- ✅ Nettoyer mémoire régulièrement
- ✅ Optimiser calculs pour réduire latence
- ✅ Prévenir saturation avant qu'elle ne se produise
- ✅ Maintenir performances constantes sur runs longs
- ✅ Adapter stratégies selon ressources disponibles

**Pattern:**
```typescript
// Gestion proactive des ressources pour runs longs
class ProactiveResourceManager {
  private resourceMetrics: ResourceMetrics[] = [];
  private readonly CONTEXT_THRESHOLD = 0.8; // 80%
  private readonly MEMORY_THRESHOLD = 0.8; // 80%
  
  async manageResourcesProactively(
    context: Context,
    executionState: ExecutionState
  ): Promise<ResourceManagementResult> {
    // 1. Monitorer ressources
    const currentMetrics = await this.monitorResources(context, executionState);
    
    // 2. Détecter risques de saturation
    const saturationRisks = await this.detectSaturationRisks(
      currentMetrics,
      context
    );
    
    // 3. Optimiser proactivement si nécessaire
    if (saturationRisks.length > 0) {
      const optimizations = await this.optimizeProactively(
        saturationRisks,
        context,
        executionState
      );
      
      // 4. Appliquer optimisations
      await this.applyOptimizations(optimizations, context, executionState);
      
      return {
        optimized: true,
        optimizations,
        metrics: currentMetrics,
        risks: saturationRisks
      };
    }
    
    // 5. Enregistrer métriques
    this.resourceMetrics.push(currentMetrics);
    
    return {
      optimized: false,
      metrics: currentMetrics
    };
  }
  
  async monitorResources(
    context: Context,
    executionState: ExecutionState
  ): Promise<ResourceMetrics> {
    return {
      context: {
        files: context.files.length,
        maxFiles: 50,
        usage: context.files.length / 50,
        saturation: context.files.length / 50 > this.CONTEXT_THRESHOLD
      },
      memory: {
        used: await this.getMemoryUsage(),
        max: await this.getMaxMemory(),
        usage: await this.getMemoryUsage() / await this.getMaxMemory(),
        saturation: (await this.getMemoryUsage() / await this.getMaxMemory()) > this.MEMORY_THRESHOLD
      },
      execution: {
        duration: Date.now() - executionState.startTime,
        iterations: executionState.completedTasks.length,
        averageTimePerTask: this.calculateAverageTimePerTask(executionState)
      },
      timestamp: Date.now()
    };
  }
  
  async detectSaturationRisks(
    metrics: ResourceMetrics,
    context: Context
  ): Promise<SaturationRisk[]> {
    const risks: SaturationRisk[] = [];
    
    // 1. Risque saturation contexte
    if (metrics.context.usage > this.CONTEXT_THRESHOLD) {
      risks.push({
        type: 'context',
        severity: metrics.context.usage > 0.9 ? 'critical' : 'high',
        current: metrics.context.usage,
        threshold: this.CONTEXT_THRESHOLD,
        estimatedTimeToSaturation: this.estimateTimeToSaturation(
          metrics.context.usage,
          this.CONTEXT_THRESHOLD
        )
      });
    }
    
    // 2. Risque saturation mémoire
    if (metrics.memory.usage > this.MEMORY_THRESHOLD) {
      risks.push({
        type: 'memory',
        severity: metrics.memory.usage > 0.9 ? 'critical' : 'high',
        current: metrics.memory.usage,
        threshold: this.MEMORY_THRESHOLD,
        estimatedTimeToSaturation: this.estimateTimeToSaturation(
          metrics.memory.usage,
          this.MEMORY_THRESHOLD
        )
      });
    }
    
    // 3. Risque dégradation performance
    if (metrics.execution.averageTimePerTask > 
        this.calculateExpectedAverageTime(metrics.execution.iterations)) {
      risks.push({
        type: 'performance',
        severity: 'medium',
        current: metrics.execution.averageTimePerTask,
        expected: this.calculateExpectedAverageTime(metrics.execution.iterations),
        degradation: metrics.execution.averageTimePerTask - 
                     this.calculateExpectedAverageTime(metrics.execution.iterations)
      });
    }
    
    return risks;
  }
  
  async optimizeProactively(
    risks: SaturationRisk[],
    context: Context,
    executionState: ExecutionState
  ): Promise<Optimization[]> {
    const optimizations: Optimization[] = [];
    
    for (const risk of risks) {
      switch (risk.type) {
        case 'context':
          // Optimiser contexte
          optimizations.push({
            type: 'context',
            action: 'cleanup-non-essential-files',
            priority: risk.severity === 'critical' ? 'critical' : 'high',
            estimatedImprovement: 0.3 // Réduire de 30%
          });
          break;
          
        case 'memory':
          // Nettoyer mémoire
          optimizations.push({
            type: 'memory',
            action: 'cleanup-memory',
            priority: risk.severity === 'critical' ? 'critical' : 'high',
            estimatedImprovement: 0.4 // Réduire de 40%
          });
          break;
          
        case 'performance':
          // Optimiser calculs
          optimizations.push({
            type: 'performance',
            action: 'optimize-calculations',
            priority: 'medium',
            estimatedImprovement: 0.2 // Améliorer de 20%
          });
          break;
      }
    }
    
    return optimizations;
  }
}
```

### 9. Validation Multi-Niveaux pour Qualité Maximale

**IMPÉRATIF:** Valider à plusieurs niveaux (syntaxe, sémantique, architecture, business) pour garantir qualité maximale.

**TOUJOURS:**
- ✅ Valider syntaxe (TypeScript, linting)
- ✅ Valider sémantique (logique, cohérence)
- ✅ Valider architecture (patterns, structure)
- ✅ Valider business (fonctionnel, métier)
- ✅ Valider performance (latence, ressources)
- ✅ Valider sécurité (vulnérabilités, bonnes pratiques)
- ✅ Valider maintenabilité (clarté, documentation)

**Pattern:**
```typescript
// Validation multi-niveaux pour qualité maximale
class MultiLevelValidation {
  async validateAtAllLevels(
    code: string,
    task: Task,
    context: Context
  ): Promise<MultiLevelValidationResult> {
    // 1. Validation syntaxe
    const syntaxValidation = await this.validateSyntax(code, context);
    
    // 2. Validation sémantique
    const semanticValidation = await this.validateSemantics(code, task, context);
    
    // 3. Validation architecture
    const architectureValidation = await this.validateArchitecture(
      code,
      task,
      context
    );
    
    // 4. Validation business
    const businessValidation = await this.validateBusiness(
      code,
      task,
      context
    );
    
    // 5. Validation performance
    const performanceValidation = await this.validatePerformance(
      code,
      task,
      context
    );
    
    // 6. Validation sécurité
    const securityValidation = await this.validateSecurity(code, context);
    
    // 7. Validation maintenabilité
    const maintainabilityValidation = await this.validateMaintainability(
      code,
      context
    );
    
    // 8. Résultat global
    const allValid = 
      syntaxValidation.valid &&
      semanticValidation.valid &&
      architectureValidation.valid &&
      businessValidation.valid &&
      performanceValidation.valid &&
      securityValidation.valid &&
      maintainabilityValidation.valid;
    
    return {
      valid: allValid,
      syntax: syntaxValidation,
      semantic: semanticValidation,
      architecture: architectureValidation,
      business: businessValidation,
      performance: performanceValidation,
      security: securityValidation,
      maintainability: maintainabilityValidation,
      issues: [
        ...syntaxValidation.issues,
        ...semanticValidation.issues,
        ...architectureValidation.issues,
        ...businessValidation.issues,
        ...performanceValidation.issues,
        ...securityValidation.issues,
        ...maintainabilityValidation.issues
      ]
    };
  }
}
```

## ⚠️ Règles d'Itérations Avancées

### TOUJOURS:

- ✅ Apprendre des patterns d'erreurs précédents
- ✅ Prioriser corrections selon apprentissages
- ✅ Adapter stratégies selon apprentissages
- ✅ Coordonner rôles avec apprentissage collectif
- ✅ Valider avec validation croisée améliorée
- ✅ Améliorer continuellement les stratégies
- ✅ Adapter itérations selon complexité
- ✅ Réutiliser solutions efficaces
- ✅ Optimiser ordre des corrections
- ✅ Évaluer performances après chaque itération
- ✅ Détecter dégradations de performance en temps réel
- ✅ Adapter stratégies dynamiquement selon performances
- ✅ Optimiser ressources (contexte, mémoire, calculs) en temps réel
- ✅ Prévenir problèmes avant qu'ils ne se produisent
- ✅ Maintenir qualité constante même sur runs très longs
- ✅ Coordonner rôles avec feedback en temps réel
- ✅ Valider à plusieurs niveaux (syntaxe, sémantique, architecture, business)
- ✅ Gérer proactivement les ressources pour runs longs

### NE JAMAIS:

- ❌ Ignorer apprentissages des itérations précédentes
- ❌ Ne pas prioriser corrections selon apprentissages
- ❌ Ne pas adapter stratégies selon apprentissages
- ❌ Ne pas coordonner rôles avec apprentissage collectif
- ❌ Ne pas améliorer continuellement les stratégies
- ❌ Ne pas adapter itérations selon complexité
- ❌ Ne pas réutiliser solutions efficaces
- ❌ Ignorer dégradations de performance
- ❌ Ne pas adapter stratégies selon performances
- ❌ Ignorer saturation des ressources
- ❌ Ne pas valider à plusieurs niveaux
- ❌ Ne pas coordonner rôles avec feedback en temps réel

## 📊 Checklist Itérations Avancées

### Avant Itérations

- [ ] Analyser complexité de la tâche
- [ ] Chercher patterns d'erreurs similaires dans mémoire
- [ ] Prioriser corrections selon apprentissages
- [ ] Adapter stratégies selon apprentissages
- [ ] Planifier coordination des rôles

### Pendant Itérations

- [ ] Apprendre des patterns d'erreurs
- [ ] Réutiliser solutions efficaces
- [ ] Adapter stratégies selon progression
- [ ] Coordonner rôles avec apprentissage collectif
- [ ] Valider avec validation croisée améliorée

### Après Itérations

- [ ] Analyser efficacité des itérations
- [ ] Identifier patterns de succès et d'échec
- [ ] Améliorer stratégies selon analyses
- [ ] Enregistrer apprentissages
- [ ] Améliorer workflows de validation
- [ ] Évaluer performances et détecter dégradations
- [ ] Adapter stratégies selon performances
- [ ] Optimiser ressources si nécessaire
- [ ] Valider à tous les niveaux (syntaxe, sémantique, architecture, business)
- [ ] Coordonner rôles avec feedback en temps réel

## 🔗 Références

- `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages
- `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior
- `@.cursor/rules/persistent-execution.md` - Exécution persistante
- `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs

---

**Note:** Ces règles garantissent que l'agent utilise des itérations intelligentes avec apprentissage et une coordination avancée des rôles pour maximiser l'autonomie, la durée des runs et la qualité.

