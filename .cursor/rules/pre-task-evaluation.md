# Évaluation Préalable des Tâches - Saxium

**Objectif:** Évaluer impérativement la méthode la plus rapide, performante, robuste et maintenable avant de réaliser une tâche

## 🎯 Principe Fondamental

**IMPÉRATIF:** Avant toute implémentation, l'agent DOIT évaluer systématiquement différentes approches selon 4 critères essentiels :

1. **Rapidité** - Temps d'exécution et latence
2. **Performance** - Efficacité et optimisation
3. **Robustesse** - Résistance aux erreurs et gestion d'erreurs
4. **Maintenabilité** - Clarté, documentation, testabilité

## 📋 Processus d'Évaluation Préalable

### Étape 1: Analyse de la Tâche

**TOUJOURS:**
- ✅ Comprendre l'objectif exact de la tâche
- ✅ Identifier les contraintes (techniques, métier, temps)
- ✅ Identifier les dépendances existantes
- ✅ Identifier les patterns similaires dans le codebase

**Pattern:**
```typescript
interface TaskAnalysis {
  objective: string;
  constraints: {
    technical: string[];
    business: string[];
    time: string;
  };
  dependencies: {
    modules: string[];
    services: string[];
    files: string[];
  };
  similarPatterns: Pattern[];
}
```

### Étape 2: Identification des Approches Possibles

**TOUJOURS:**
- ✅ Identifier au moins 2-3 approches différentes
- ✅ Chercher solutions existantes dans le codebase
- ✅ Consulter patterns établis
- ✅ Consulter documentation externe si nécessaire

**Pattern:**
```typescript
async function identifyApproaches(task: Task): Promise<Approach[]> {
  // 1. Rechercher solutions existantes
  const existingSolutions = await codebase_search(
    `How is ${task.objective} implemented?`,
    []
  );
  
  // 2. Rechercher patterns similaires
  const similarPatterns = await codebase_search(
    `What are the patterns for ${task.objective}?`,
    []
  );
  
  // 3. Identifier approches possibles
  const approaches: Approach[] = [];
  
  // Approche 1: Réutiliser solution existante
  if (existingSolutions.length > 0) {
    approaches.push({
      id: 'reuse-existing',
      description: 'Réutiliser solution existante',
      source: existingSolutions[0]
    });
  }
  
  // Approche 2: Appliquer pattern établi
  if (similarPatterns.length > 0) {
    approaches.push({
      id: 'apply-pattern',
      description: 'Appliquer pattern établi',
      pattern: similarPatterns[0]
    });
  }
  
  // Approche 3: Nouvelle implémentation optimisée
  approaches.push({
    id: 'new-optimized',
    description: 'Nouvelle implémentation optimisée',
    strategy: 'optimized'
  });
  
  return approaches;
}
```

### Étape 3: Évaluation Multi-Critères

**IMPÉRATIF:** Évaluer chaque approche selon les 4 critères essentiels.

**Pattern:**
```typescript
interface ApproachEvaluation {
  approach: Approach;
  criteria: {
    speed: {
      score: number; // 0-10
      reasoning: string;
      metrics: {
        executionTime?: number;
        latency?: number;
        complexity?: 'O(1)' | 'O(n)' | 'O(n²)' | 'O(log n)';
      };
    };
    performance: {
      score: number; // 0-10
      reasoning: string;
      metrics: {
        memoryUsage?: number;
        cpuUsage?: number;
        cacheHitRate?: number;
        optimizationLevel?: 'low' | 'medium' | 'high';
      };
    };
    robustness: {
      score: number; // 0-10
      reasoning: string;
      metrics: {
        errorHandling?: 'none' | 'basic' | 'comprehensive';
        validation?: 'none' | 'basic' | 'strict';
        resilience?: 'none' | 'basic' | 'high';
        testCoverage?: number;
      };
    };
    maintainability: {
      score: number; // 0-10
      reasoning: string;
      metrics: {
        codeClarity?: 'low' | 'medium' | 'high';
        documentation?: 'none' | 'basic' | 'comprehensive';
        testability?: 'low' | 'medium' | 'high';
        reusability?: 'low' | 'medium' | 'high';
        complexity?: 'low' | 'medium' | 'high';
      };
    };
  };
  overallScore: number; // Moyenne pondérée
  recommendation: 'strong' | 'moderate' | 'weak';
}

async function evaluateApproach(
  approach: Approach,
  task: Task
): Promise<ApproachEvaluation> {
  // 1. Évaluer Rapidité
  const speedEvaluation = await evaluateSpeed(approach, task);
  
  // 2. Évaluer Performance
  const performanceEvaluation = await evaluatePerformance(approach, task);
  
  // 3. Évaluer Robustesse
  const robustnessEvaluation = await evaluateRobustness(approach, task);
  
  // 4. Évaluer Maintenabilité
  const maintainabilityEvaluation = await evaluateMaintainability(approach, task);
  
  // 5. Calculer score global (pondération: 25% chaque critère)
  const overallScore = (
    speedEvaluation.score * 0.25 +
    performanceEvaluation.score * 0.25 +
    robustnessEvaluation.score * 0.25 +
    maintainabilityEvaluation.score * 0.25
  );
  
  // 6. Déterminer recommandation
  const recommendation = overallScore >= 8 ? 'strong' :
                         overallScore >= 6 ? 'moderate' : 'weak';
  
  return {
    approach,
    criteria: {
      speed: speedEvaluation,
      performance: performanceEvaluation,
      robustness: robustnessEvaluation,
      maintainability: maintainabilityEvaluation
    },
    overallScore,
    recommendation
  };
}
```

### Étape 4: Critères d'Évaluation Détaillés

#### 4.1 Rapidité (Speed)

**Critères:**
- Temps d'exécution estimé
- Complexité algorithmique
- Latence réseau (si applicable)
- Parallélisation possible

**Évaluation:**
```typescript
async function evaluateSpeed(
  approach: Approach,
  task: Task
): Promise<SpeedEvaluation> {
  // 1. Analyser complexité algorithmique
  const complexity = analyzeComplexity(approach);
  
  // 2. Estimer temps d'exécution
  const estimatedTime = estimateExecutionTime(approach, task);
  
  // 3. Identifier opportunités de parallélisation
  const parallelization = identifyParallelization(approach);
  
  // 4. Calculer score (0-10)
  let score = 10;
  
  // Pénaliser complexité élevée
  if (complexity === 'O(n²)') score -= 3;
  else if (complexity === 'O(n)') score -= 1;
  
  // Pénaliser temps d'exécution élevé
  if (estimatedTime > 1000) score -= 2;
  else if (estimatedTime > 500) score -= 1;
  
  // Bonus parallélisation
  if (parallelization.possible) score += 1;
  
  return {
    score: Math.max(0, Math.min(10, score)),
    reasoning: `Complexité ${complexity}, temps estimé ${estimatedTime}ms, parallélisation ${parallelization.possible ? 'possible' : 'non possible'}`,
    metrics: {
      executionTime: estimatedTime,
      complexity: complexity,
      latency: parallelization.latency
    }
  };
}
```

#### 4.2 Performance

**Critères:**
- Utilisation mémoire
- Utilisation CPU
- Cache hit rate
- Optimisations possibles

**Évaluation:**
```typescript
async function evaluatePerformance(
  approach: Approach,
  task: Task
): Promise<PerformanceEvaluation> {
  // 1. Analyser utilisation mémoire
  const memoryUsage = analyzeMemoryUsage(approach);
  
  // 2. Analyser utilisation CPU
  const cpuUsage = analyzeCPUUsage(approach);
  
  // 3. Identifier opportunités de cache
  const cacheOpportunities = identifyCacheOpportunities(approach);
  
  // 4. Identifier optimisations possibles
  const optimizations = identifyOptimizations(approach);
  
  // 5. Calculer score (0-10)
  let score = 10;
  
  // Pénaliser utilisation mémoire élevée
  if (memoryUsage > 100) score -= 2;
  else if (memoryUsage > 50) score -= 1;
  
  // Pénaliser utilisation CPU élevée
  if (cpuUsage > 80) score -= 2;
  else if (cpuUsage > 50) score -= 1;
  
  // Bonus cache
  if (cacheOpportunities.length > 0) score += 1;
  
  // Bonus optimisations
  if (optimizations.length > 0) score += 1;
  
  return {
    score: Math.max(0, Math.min(10, score)),
    reasoning: `Mémoire ${memoryUsage}MB, CPU ${cpuUsage}%, cache ${cacheOpportunities.length > 0 ? 'possible' : 'non possible'}, optimisations ${optimizations.length}`,
    metrics: {
      memoryUsage,
      cpuUsage,
      cacheHitRate: cacheOpportunities.length > 0 ? 0.8 : 0,
      optimizationLevel: optimizations.length > 2 ? 'high' : optimizations.length > 0 ? 'medium' : 'low'
    }
  };
}
```

#### 4.3 Robustesse

**Critères:**
- Gestion d'erreurs
- Validation des entrées
- Résilience aux erreurs
- Couverture de tests

**Évaluation:**
```typescript
async function evaluateRobustness(
  approach: Approach,
  task: Task
): Promise<RobustnessEvaluation> {
  // 1. Analyser gestion d'erreurs
  const errorHandling = analyzeErrorHandling(approach);
  
  // 2. Analyser validation
  const validation = analyzeValidation(approach);
  
  // 3. Analyser résilience
  const resilience = analyzeResilience(approach);
  
  // 4. Analyser couverture de tests
  const testCoverage = analyzeTestCoverage(approach);
  
  // 5. Calculer score (0-10)
  let score = 0;
  
  // Gestion d'erreurs
  if (errorHandling === 'comprehensive') score += 3;
  else if (errorHandling === 'basic') score += 1;
  
  // Validation
  if (validation === 'strict') score += 3;
  else if (validation === 'basic') score += 1;
  
  // Résilience
  if (resilience === 'high') score += 2;
  else if (resilience === 'basic') score += 1;
  
  // Couverture de tests
  if (testCoverage >= 85) score += 2;
  else if (testCoverage >= 70) score += 1;
  
  return {
    score: Math.max(0, Math.min(10, score)),
    reasoning: `Gestion erreurs ${errorHandling}, validation ${validation}, résilience ${resilience}, tests ${testCoverage}%`,
    metrics: {
      errorHandling,
      validation,
      resilience,
      testCoverage
    }
  };
}
```

#### 4.4 Maintenabilité

**Critères:**
- Clarté du code
- Documentation
- Testabilité
- Réutilisabilité
- Complexité

**Évaluation:**
```typescript
async function evaluateMaintainability(
  approach: Approach,
  task: Task
): Promise<MaintainabilityEvaluation> {
  // 1. Analyser clarté du code
  const codeClarity = analyzeCodeClarity(approach);
  
  // 2. Analyser documentation
  const documentation = analyzeDocumentation(approach);
  
  // 3. Analyser testabilité
  const testability = analyzeTestability(approach);
  
  // 4. Analyser réutilisabilité
  const reusability = analyzeReusability(approach);
  
  // 5. Analyser complexité
  const complexity = analyzeComplexity(approach);
  
  // 6. Calculer score (0-10)
  let score = 0;
  
  // Clarté du code
  if (codeClarity === 'high') score += 2;
  else if (codeClarity === 'medium') score += 1;
  
  // Documentation
  if (documentation === 'comprehensive') score += 2;
  else if (documentation === 'basic') score += 1;
  
  // Testabilité
  if (testability === 'high') score += 2;
  else if (testability === 'medium') score += 1;
  
  // Réutilisabilité
  if (reusability === 'high') score += 2;
  else if (reusability === 'medium') score += 1;
  
  // Complexité (inverse)
  if (complexity === 'low') score += 2;
  else if (complexity === 'medium') score += 1;
  
  return {
    score: Math.max(0, Math.min(10, score)),
    reasoning: `Clarté ${codeClarity}, documentation ${documentation}, testabilité ${testability}, réutilisabilité ${reusability}, complexité ${complexity}`,
    metrics: {
      codeClarity,
      documentation,
      testability,
      reusability,
      complexity
    }
  };
}
```

### Étape 5: Comparaison et Sélection

**IMPÉRATIF:** Comparer toutes les approches et sélectionner la meilleure.

**Pattern:**
```typescript
async function compareAndSelectApproach(
  evaluations: ApproachEvaluation[]
): Promise<SelectedApproach> {
  // 1. Trier par score global (décroissant)
  const sorted = evaluations.sort((a, b) => b.overallScore - a.overallScore);
  
  // 2. Sélectionner meilleure approche
  const best = sorted[0];
  
  // 3. Vérifier si score minimum requis (6/10)
  if (best.overallScore < 6) {
    // Améliorer approche ou chercher alternatives
    const improved = await improveApproach(best.approach);
    return {
      approach: improved,
      evaluation: await evaluateApproach(improved, task),
      alternatives: sorted.slice(1, 3)
    };
  }
  
  // 4. Documenter sélection
  await documentSelection({
    selected: best,
    alternatives: sorted.slice(1, 3),
    reasoning: `Sélectionnée car score global ${best.overallScore}/10 (rapidité ${best.criteria.speed.score}, performance ${best.criteria.performance.score}, robustesse ${best.criteria.robustness.score}, maintenabilité ${best.criteria.maintainability.score})`
  });
  
  return {
    approach: best.approach,
    evaluation: best,
    alternatives: sorted.slice(1, 3)
  };
}
```

## 🔄 Workflow Complet d'Évaluation Préalable

### Workflow: Évaluer Avant d'Implémenter

**IMPÉRATIF:** Suivre ce workflow avant toute implémentation.

**Étapes:**
1. **Analyser la tâche** - Comprendre objectif, contraintes, dépendances
2. **Identifier approches** - Trouver au moins 2-3 approches différentes
3. **Évaluer chaque approche** - Évaluer selon 4 critères (rapidité, performance, robustesse, maintenabilité)
4. **Comparer approches** - Comparer scores et métriques
5. **Sélectionner meilleure approche** - Choisir approche avec meilleur score global
6. **Documenter sélection** - Documenter raisonnement et alternatives
7. **Implémenter** - Implémenter approche sélectionnée

**Pattern:**
```typescript
async function evaluateBeforeImplement(task: Task): Promise<ImplementationPlan> {
  // 1. Analyser tâche
  const analysis = await analyzeTask(task);
  
  // 2. Identifier approches
  const approaches = await identifyApproaches(task);
  
  if (approaches.length < 2) {
    // Chercher plus d'approches
    const additional = await searchMoreApproaches(task);
    approaches.push(...additional);
  }
  
  // 3. Évaluer chaque approche
  const evaluations = await Promise.all(
    approaches.map(approach => evaluateApproach(approach, task))
  );
  
  // 4. Comparer et sélectionner
  const selected = await compareAndSelectApproach(evaluations);
  
  // 5. Documenter sélection
  await documentSelection(selected);
  
  // 6. Créer plan d'implémentation
  const implementationPlan = createImplementationPlan(selected);
  
  return {
    task,
    selectedApproach: selected,
    implementationPlan
  };
}
```

## 📊 Critères de Sélection Priorisés

### Priorité 1: Robustesse (Critère Bloquant)

**IMPÉRATIF:** Une approche avec robustesse < 6/10 ne peut PAS être sélectionnée.

**Raison:** La robustesse est fondamentale pour la qualité du code.

### Priorité 2: Maintenabilité (Critère Important)

**IMPÉRATIF:** Une approche avec maintenabilité < 5/10 doit être améliorée avant sélection.

**Raison:** La maintenabilité est essentielle pour l'évolution du code.

### Priorité 3: Performance et Rapidité (Critères d'Optimisation)

**RECOMMANDÉ:** Privilégier approches avec performance et rapidité élevées.

**Raison:** Performance et rapidité améliorent l'expérience utilisateur.

## 🎯 Checklist Évaluation Préalable

### Avant Toute Implémentation

- [ ] Tâche analysée (objectif, contraintes, dépendances)
- [ ] Au moins 2-3 approches identifiées
- [ ] Chaque approche évaluée selon 4 critères
- [ ] Scores calculés pour chaque critère
- [ ] Approches comparées
- [ ] Meilleure approche sélectionnée
- [ ] Sélection documentée avec raisonnement
- [ ] Alternatives documentées

### Critères d'Évaluation

- [ ] **Rapidité** évaluée (complexité, temps, parallélisation)
- [ ] **Performance** évaluée (mémoire, CPU, cache, optimisations)
- [ ] **Robustesse** évaluée (erreurs, validation, résilience, tests)
- [ ] **Maintenabilité** évaluée (clarté, documentation, testabilité, réutilisabilité)

### Validation

- [ ] Score global >= 6/10
- [ ] Robustesse >= 6/10 (bloquant)
- [ ] Maintenabilité >= 5/10 (important)
- [ ] Raisonnement documenté
- [ ] Alternatives considérées

## 🔗 Références

### Documentation Essentielle
- `@.cursor/rules/agent-optimization.md` - Stratégies d'optimisation
- `@.cursor/rules/transversal-performance.md` - Performance transversale
- `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage (ICE)
- `@.cursor/rules/workflows.md` - Workflows détaillés
- `@.cursor/rules/quality-principles.md` - Principes de qualité

### Fichiers de Mémoire
- `@activeContext.md` - État actuel et focus
- `@systemPatterns.md` - Patterns architecturaux
- `@projectbrief.md` - Objectifs et périmètre

---

**Note:** Cette évaluation préalable est IMPÉRATIVE avant toute implémentation. Elle garantit le choix de la méthode la plus rapide, performante, robuste et maintenable.

