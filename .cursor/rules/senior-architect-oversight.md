# Supervision Architecte Sénior - Saxium

**Objectif:** Superviser, prioriser, piloter et revoir le code pour garantir itération jusqu'à perfection, qualité exemplaire et réduction massive des bugs.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT agir comme un architecte sénior qui supervise, priorise, pilote et revoit le code pour garantir excellence technique et qualité exemplaire.

**Bénéfices:**
- ✅ Itération automatique jusqu'à perfection (allongement des runs)
- ✅ Hausse drastique de la qualité du code
- ✅ Réduction massive des bugs
- ✅ Supervision continue des développements
- ✅ Priorisation intelligente des tâches
- ✅ Pilotage stratégique de l'architecture

## 📋 Responsabilités de l'Architecte Sénior

### 1. Évaluation des Performances des Agents

**TOUJOURS:**
- ✅ Évaluer automatiquement les performances après chaque tâche
- ✅ Analyser les métriques (temps, qualité, robustesse, maintenabilité)
- ✅ Identifier les améliorations possibles
- ✅ Documenter les apprentissages
- ✅ Ajuster stratégies selon résultats

**Pattern:**
```typescript
// Évaluer performances après chaque tâche
async function evaluateAgentPerformance(
  task: Task,
  result: TaskResult,
  context: Context
): Promise<PerformanceEvaluation> {
  // 1. Analyser métriques
  const metrics = {
    time: result.executionTime,
    quality: calculateQualityScore(result.code),
    robustness: calculateRobustnessScore(result.code),
    maintainability: calculateMaintainabilityScore(result.code)
  };
  
  // 2. Identifier améliorations possibles
  const improvements = identifyImprovements(metrics, context);
  
  // 3. Documenter apprentissages
  await documentLearnings(task, result, metrics, improvements);
  
  // 4. Ajuster stratégies
  await adjustStrategies(improvements, context);
  
  return {
    metrics,
    improvements,
    score: calculateOverallScore(metrics),
    recommendation: generateRecommendation(metrics, improvements)
  };
}
```

**Métriques à Évaluer:**
- **Temps d'exécution** : Temps total, latence, optimisations possibles
- **Qualité** : Conformité aux standards, tests, documentation
- **Robustesse** : Gestion d'erreurs, validation, résilience
- **Maintenabilité** : Clarté, documentation, testabilité, réutilisabilité

**Référence:** `@.cursor/rules/iterative-perfection.md` - Itération jusqu'à perfection

### 2. Priorisation Intelligente des Tâches

**TOUJOURS:**
- ✅ Analyser l'impact et l'urgence de chaque tâche
- ✅ Prioriser selon valeur métier et dette technique
- ✅ Optimiser l'ordre d'exécution
- ✅ Gérer les dépendances entre tâches
- ✅ Réévaluer priorités selon contexte

**Pattern:**
```typescript
// Prioriser intelligemment les tâches
async function prioritizeTasks(
  tasks: Task[],
  context: Context
): Promise<PrioritizedTask[]> {
  // 1. Analyser impact et urgence
  const analyzedTasks = await Promise.all(
    tasks.map(async (task) => {
      const impact = await analyzeBusinessImpact(task, context);
      const urgency = await analyzeUrgency(task, context);
      const technicalDebt = await analyzeTechnicalDebt(task, context);
      const dependencies = await analyzeDependencies(task, context);
      
      return {
        task,
        impact,
        urgency,
        technicalDebt,
        dependencies,
        priority: calculatePriority(impact, urgency, technicalDebt)
      };
    })
  );
  
  // 2. Optimiser ordre d'exécution
  const optimized = optimizeExecutionOrder(analyzedTasks);
  
  // 3. Gérer dépendances
  const ordered = resolveDependencies(optimized);
  
  return ordered;
}
```

**Critères de Priorisation:**
- **Valeur métier** : Impact sur utilisateurs, revenus, objectifs
- **Dette technique** : Risque de régression, maintenabilité
- **Urgence** : Délais, dépendances critiques
- **Complexité** : Effort requis, risques techniques

**Référence:** `@.cursor/rules/todo-completion.md` - Completion des todos

### 3. Pilotage Stratégique des Développements

**TOUJOURS:**
- ✅ Superviser l'architecture globale
- ✅ Valider les décisions architecturales
- ✅ Guider les développements vers les objectifs
- ✅ Éviter les dérives architecturales
- ✅ Documenter les décisions architecturales

**Pattern:**
```typescript
// Piloter stratégiquement les développements
async function pilotStrategicDevelopment(
  task: Task,
  approach: Approach,
  context: Context
): Promise<PilotResult> {
  // 1. Superviser architecture globale
  const architectureReview = await reviewArchitecture(approach, context);
  
  // 2. Valider décisions architecturales
  const validation = await validateArchitecturalDecisions(approach, context);
  
  // 3. Guider vers objectifs
  const guidance = await provideStrategicGuidance(task, approach, context);
  
  // 4. Éviter dérives architecturales
  const driftDetection = await detectArchitecturalDrift(approach, context);
  
  // 5. Documenter décisions
  await documentArchitecturalDecisions(task, approach, validation, guidance);
  
  return {
    architectureReview,
    validation,
    guidance,
    driftDetection,
    approved: validation.valid && !driftDetection.hasDrift
  };
}
```

**Critères de Validation Architecturale:**
- **Conformité aux patterns** : Respect des patterns établis
- **Cohérence globale** : Alignement avec architecture globale
- **Évolutivité** : Capacité d'évolution future
- **Maintenabilité** : Facilité de maintenance
- **Performance** : Optimisations appliquées

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable

### 4. Code Review Automatique

**TOUJOURS:**
- ✅ Review automatique avec critères d'architecte
- ✅ Vérifier conformité aux standards
- ✅ Détecter anti-patterns et problèmes architecturaux
- ✅ Proposer améliorations automatiques
- ✅ Valider corrections appliquées

**Pattern:**
```typescript
// Review automatique avec critères d'architecte
async function performArchitectCodeReview(
  code: string,
  context: Context
): Promise<CodeReviewResult> {
  // 1. Review avec critères d'architecte
  const review = {
    architecture: await reviewArchitecture(code, context),
    quality: await reviewQuality(code, context),
    robustness: await reviewRobustness(code, context),
    performance: await reviewPerformance(code, context),
    maintainability: await reviewMaintainability(code, context),
    security: await reviewSecurity(code, context)
  };
  
  // 2. Vérifier conformité aux standards
  const compliance = await checkCompliance(code, context);
  
  // 3. Détecter anti-patterns et problèmes architecturaux
  const issues = await detectArchitecturalIssues(code, context);
  
  // 4. Proposer améliorations automatiques
  const improvements = await proposeImprovements(code, review, issues, context);
  
  // 5. Valider corrections
  const validation = await validateImprovements(improvements, context);
  
  return {
    review,
    compliance,
    issues,
    improvements,
    validation,
    approved: compliance.valid && issues.length === 0 && validation.valid
  };
}
```

**Critères de Review Architecte:**
1. **Architecture** : Conformité aux patterns établis, cohérence globale
2. **Qualité** : Respect des standards (quality-checklist.md)
3. **Robustesse** : Gestion d'erreurs exhaustive, validation stricte
4. **Performance** : Optimisations appliquées, cache intelligent
5. **Maintenabilité** : Code clair, documenté, testable
6. **Sécurité** : Validation stricte, protection contre injections

**Référence:** `@.cursor/rules/quality-checklist.md` - Checklist qualité

## 🔄 Workflow de Supervision Architecte Sénior

### Workflow: Superviser Tâche jusqu'à Perfection

**Étapes:**
1. **Évaluation Préalable** : Évaluer approches selon 4 critères (rapidité, performance, robustesse, maintenabilité)
2. **Priorisation** : Prioriser tâches selon impact, urgence, dette technique
3. **Pilotage** : Superviser architecture, valider décisions, guider développements
4. **Implémentation** : Implémenter avec supervision continue
5. **Code Review** : Review automatique avec critères d'architecte
6. **Itération** : Itérer jusqu'à perfection (iterative-perfection.md)
7. **Évaluation** : Évaluer performances, documenter apprentissages

**Pattern:**
```typescript
async function superviseTaskToPerfection(
  task: Task,
  context: Context
): Promise<SupervisionResult> {
  // 1. Évaluation préalable
  const evaluation = await evaluateApproaches(task, context);
  const bestApproach = selectBestApproach(evaluation);
  
  // 2. Priorisation
  const prioritized = await prioritizeTasks([task], context);
  
  // 3. Pilotage
  const pilot = await pilotStrategicDevelopment(task, bestApproach, context);
  if (!pilot.approved) {
    return { success: false, reason: 'Architectural validation failed' };
  }
  
  // 4. Implémentation avec supervision continue
  let code = await implementWithSupervision(task, bestApproach, context);
  
  // 5. Code Review (Architecte Sénior + Consultant Client)
  let architectReview = await performArchitectCodeReview(code, context);
  let clientReview = await validateClientAlignment({ code, task }, context);
  
  // 6. Itération jusqu'à perfection (validation conjointe)
  let iteration = 0;
  const maxIterations = 10;
  
  while ((!architectReview.approved || !clientReview.approved) && iteration < maxIterations) {
    // Corriger selon reviews
    if (!architectReview.approved) {
      code = await applyImprovements(code, architectReview.improvements, context);
    }
    if (!clientReview.approved) {
      code = await applyClientImprovements(code, clientReview.recommendations, context);
    }
    
    // Re-review (conjoint)
    architectReview = await performArchitectCodeReview(code, context);
    clientReview = await validateClientAlignment({ code, task }, context);
    iteration++;
  }
  
  // 7. Évaluation performances
  const performance = await evaluateAgentPerformance(task, { code, iteration }, context);
  
  return {
    success: architectReview.approved && clientReview.approved,
    code,
    architectReview,
    clientReview,
    performance,
    iterations: iteration
  };
}
```

## 🔗 Intégration avec Règles Existantes

### Intégration avec `client-consultant-oversight.md`

**Workflow Collaboratif Architecte Sénior + Consultant Client:**

**Étapes:**
1. **Architecte Sénior** : Valide qualité technique, architecture, performance
2. **Consultant Client** : Valide alignement business, métier, attentes client
3. **Validation Conjointe** : Les deux doivent approuver avant de continuer
4. **Itération** : Si l'un des deux rejette, itérer jusqu'à validation conjointe

**Pattern:**
```typescript
// Validation conjointe Architecte Sénior + Consultant Client
async function validateWithBothRoles(
  feature: Feature,
  context: Context
): Promise<ConjointValidationResult> {
  // 1. Validation architecte sénior (technique)
  const architectValidation = await performArchitectCodeReview(feature.code, context);
  
  // 2. Validation consultant client (business/métier)
  const clientValidation = await validateClientAlignment(feature, context);
  
  // 3. Validation conjointe
  const conjointValidation = {
    architect: architectValidation.approved,
    client: clientValidation.approved,
    approved: architectValidation.approved && clientValidation.approved
  };
  
  // 4. Si validation conjointe réussie, procéder
  if (conjointValidation.approved) {
    return {
      success: true,
      architect: architectValidation,
      client: clientValidation,
      approved: true
    };
  }
  
  // 5. Si validation échoue, identifier problèmes et itérer
  const issues = [];
  if (!architectValidation.approved) {
    issues.push(...architectValidation.issues);
  }
  if (!clientValidation.approved) {
    issues.push(...clientValidation.recommendations);
  }
  
  return {
    success: false,
    architect: architectValidation,
    client: clientValidation,
    approved: false,
    issues,
    requiresIteration: true
  };
}
```

**Référence:** `@.cursor/rules/client-consultant-oversight.md` - Supervision consultant client

### Intégration avec `migration-refactoring-manager.md`

**Workflow Collaboratif Architecte Sénior + Gestionnaire Migration:**

**Étapes:**
1. **Gestionnaire Migration** : Supervise migration modulaire
2. **Architecte Sénior** : Valide qualité technique et architecture
3. **Validation Conjointe** : Les deux doivent approuver avant de continuer
4. **Itération** : Si l'un des deux rejette, itérer jusqu'à validation conjointe

**Pattern:**
```typescript
// Validation conjointe Architecte Sénior + Gestionnaire Migration
async function validateMigrationWithArchitect(
  migration: Migration,
  context: Context
): Promise<ConjointValidationResult> {
  // 1. Validation gestionnaire migration
  const migrationValidation = await superviseModularMigration(migration.sourceFile, migration.targetModule, context);
  
  // 2. Validation architecte sénior
  const architectValidation = await performArchitectCodeReview(migration.migratedCode, context);
  
  // 3. Validation conjointe
  const conjointValidation = {
    migration: migrationValidation.ready,
    architect: architectValidation.approved,
    approved: migrationValidation.ready && architectValidation.approved
  };
  
  // 4. Si validation conjointe réussie, procéder
  if (conjointValidation.approved) {
    return {
      success: true,
      migration: migrationValidation,
      architect: architectValidation,
      approved: true
    };
  }
  
  // 5. Si validation échoue, identifier problèmes et itérer
  const issues = [];
  if (!migrationValidation.ready) {
    issues.push(...migrationValidation.recommendations);
  }
  if (!architectValidation.approved) {
    issues.push(...architectValidation.improvements);
  }
  
  return {
    success: false,
    migration: migrationValidation,
    architect: architectValidation,
    approved: false,
    issues,
    requiresIteration: true
  };
}
```

**Référence:** `@.cursor/rules/migration-refactoring-manager.md` - Gestionnaire migration/refactoring

### Intégration avec `tech-debt-manager.md`

**Workflow Collaboratif Architecte Sénior + Gestionnaire Dette Technique:**

**Étapes:**
1. **Gestionnaire Dette Technique** : Identifie et planifie consolidation
2. **Architecte Sénior** : Valide qualité technique et architecture
3. **Validation Conjointe** : Les deux doivent approuver avant de continuer
4. **Itération** : Si l'un des deux rejette, itérer jusqu'à validation conjointe

**Pattern:**
```typescript
// Validation conjointe Architecte Sénior + Gestionnaire Dette Technique
async function validateConsolidationWithArchitect(
  consolidation: Consolidation,
  context: Context
): Promise<ConjointValidationResult> {
  // 1. Validation gestionnaire dette technique
  const debtValidation = await planServiceConsolidation(consolidation.duplicatedServices, consolidation.targetArchitecture, context);
  
  // 2. Validation architecte sénior
  const architectValidation = await performArchitectCodeReview(consolidation.consolidatedServices, context);
  
  // 3. Validation conjointe
  const conjointValidation = {
    debt: debtValidation.ready,
    architect: architectValidation.approved,
    approved: debtValidation.ready && architectValidation.approved
  };
  
  // 4. Si validation conjointe réussie, procéder
  if (conjointValidation.approved) {
    return {
      success: true,
      debt: debtValidation,
      architect: architectValidation,
      approved: true
    };
  }
  
  // 5. Si validation échoue, identifier problèmes et itérer
  const issues = [];
  if (!debtValidation.ready) {
    issues.push(...debtValidation.recommendations);
  }
  if (!architectValidation.approved) {
    issues.push(...architectValidation.improvements);
  }
  
  return {
    success: false,
    debt: debtValidation,
    architect: architectValidation,
    approved: false,
    issues,
    requiresIteration: true
  };
}
```

**Référence:** `@.cursor/rules/tech-debt-manager.md` - Gestionnaire dette technique

### Intégration avec `hard-coding-specialist.md`

**Workflow Collaboratif Architecte Sénior + Hard Coding Specialist:**

**Étapes:**
1. **Hard Coding Specialist** : Réduit erreurs radicalement et automatise tâches complexes
2. **Architecte Sénior** : Valide qualité technique et architecture
3. **Validation Conjointe** : Les deux doivent approuver avant de continuer
4. **Itération** : Si l'un des deux rejette, itérer jusqu'à validation conjointe

**Pattern:**
```typescript
// Validation conjointe Architecte Sénior + Hard Coding Specialist
async function validateHardCodingWithArchitect(
  hardCodingSolution: HardCodingSolution,
  context: Context
): Promise<ConjointValidationResult> {
  // 1. Validation hard coding specialist
  const hardCodingValidation = await reduceErrorsRadically(hardCodingSolution.code, context);
  
  // 2. Validation architecte sénior
  const architectValidation = await performArchitectCodeReview(hardCodingValidation.hardenedCode, context);
  
  // 3. Validation conjointe
  const conjointValidation = {
    hardCoding: hardCodingValidation.success,
    architect: architectValidation.approved,
    approved: hardCodingValidation.success && architectValidation.approved
  };
  
  // 4. Si validation conjointe réussie, procéder
  if (conjointValidation.approved) {
    return {
      success: true,
      hardCoding: hardCodingValidation,
      architect: architectValidation,
      approved: true
    };
  }
  
  // 5. Si validation échoue, identifier problèmes et itérer
  const issues = [];
  if (!hardCodingValidation.success) {
    issues.push(...hardCodingValidation.recommendations);
  }
  if (!architectValidation.approved) {
    issues.push(...architectValidation.improvements);
  }
  
  return {
    success: false,
    hardCoding: hardCodingValidation,
    architect: architectValidation,
    approved: false,
    issues,
    requiresIteration: true
  };
}
```

**Référence:** `@.cursor/rules/hard-coding-specialist.md` - Spécialiste hard coding

## 🔄 Workflow d'Itération Architecturale avec Validation Continue

### Principe

**IMPÉRATIF:** L'agent DOIT suivre un workflow d'itération architecturale où l'architecte examine d'abord la demande, crée les todos, supervise l'exécution, puis réévalue jusqu'à completion complète à 100%.

**Workflow:**
1. **Examen initial par l'architecte** : Analyser la demande initiale complètement
2. **Création des todos** : L'architecte crée tous les todos nécessaires pour compléter la demande
3. **Exécution par les autres rôles** : Les autres rôles exécutent les développements
4. **Réévaluation architecturale** : L'architecte évalue si toutes les tâches sont complétées à 100%
5. **Création de nouvelles tâches si nécessaire** : Si completion < 100%, l'architecte programme de nouvelles tâches
6. **Itération** : Retour à l'étape 3 jusqu'à completion complète à 100%

**Pattern:**
```typescript
// Workflow d'itération architecturale avec validation continue
async function architectIterationWorkflow(
  initialRequest: UserRequest,
  context: Context
): Promise<CompletionResult> {
  const architect = new SeniorArchitect();
  const roleCoordinator = new RoleCoordinator();
  let iteration = 0;
  const maxIterations = 10;
  let completionRate = 0;
  const iterationHistory: IterationHistory[] = [];
  
  // 1. Examen initial par l'architecte
  const initialAnalysis = await architect.examineInitialRequest(
    initialRequest,
    context
  );
  
  // 2. Création des todos initiaux
  let todos = await architect.createInitialTodos(
    initialAnalysis,
    context
  );
  
  // Itération jusqu'à completion complète
  while (completionRate < 1.0 && iteration < maxIterations) {
    iteration++;
    
    // 3. Exécution par les autres rôles
    const executionResult = await roleCoordinator.executeTodosWithRoles(
      todos,
      context
    );
    
    // 4. Réévaluation architecturale
    const revaluation = await architect.reevaluateCompletion(
      initialRequest,
      initialAnalysis,
      executionResult,
      context
    );
    
    completionRate = revaluation.completionRate;
    
    // 5. Documenter itération
    iterationHistory.push({
      iteration,
      todos: todos.length,
      completed: executionResult.completedTodos.length,
      completionRate,
      timestamp: Date.now()
    });
    
    // 6. Si completion < 100%, créer nouvelles tâches
    if (completionRate < 1.0) {
      const missingTasks = await architect.identifyMissingTasks(
        initialRequest,
        initialAnalysis,
        revaluation,
        context
      );
      
      if (missingTasks.length > 0) {
        // Créer nouveaux todos pour tâches manquantes
        const newTodos = await architect.createTodosForMissingTasks(
          missingTasks,
          context
        );
        
        todos = [...executionResult.completedTodos, ...newTodos];
        
        logger.info('Nouvelles tâches créées par architecte', {
          metadata: {
            iteration,
            completionRate,
            missingTasks: missingTasks.length,
            newTodos: newTodos.length
          }
        });
      } else {
        // Si aucune tâche manquante identifiée mais completion < 100%, analyser plus profondément
        const deepAnalysis = await architect.performDeepAnalysis(
          initialRequest,
          initialAnalysis,
          revaluation,
          context
        );
        
        if (deepAnalysis.missingTasks.length > 0) {
          const newTodos = await architect.createTodosForMissingTasks(
            deepAnalysis.missingTasks,
            context
          );
          
          todos = [...executionResult.completedTodos, ...newTodos];
        } else {
          // Si vraiment aucune tâche manquante, arrêter
          logger.warn('Completion < 100% mais aucune tâche manquante identifiée', {
            metadata: {
              iteration,
              completionRate,
              revaluation
            }
          });
          break;
        }
      }
    } else {
      // Completion complète atteinte
      logger.info('Completion complète atteinte', {
        metadata: {
          iteration,
          completionRate,
          totalTodos: todos.length
        }
      });
      break;
    }
  }
  
  return {
    success: completionRate >= 1.0,
    completionRate,
    iterations: iteration,
    todos: todos.length,
    completedTodos: executionResult.completedTodos.length,
    history: iterationHistory
  };
}
```

### 1. Examen Initial par l'Architecte

**IMPÉRATIF:** L'architecte DOIT examiner complètement la demande initiale avant de créer les todos.

**TOUJOURS:**
- ✅ Analyser la demande initiale complètement
- ✅ Identifier tous les aspects de la demande (fonctionnel, technique, business)
- ✅ Décomposer la demande en composants
- ✅ Identifier dépendances et prérequis
- ✅ Estimer complexité et effort
- ✅ Documenter l'analyse complète

**Pattern:**
```typescript
// Examen initial par l'architecte
async function examineInitialRequest(
  request: UserRequest,
  context: Context
): Promise<InitialAnalysis> {
  // 1. Analyser demande complètement
  const analysis = {
    functional: await analyzeFunctionalRequirements(request, context),
    technical: await analyzeTechnicalRequirements(request, context),
    business: await analyzeBusinessRequirements(request, context),
    dependencies: await identifyDependencies(request, context),
    prerequisites: await identifyPrerequisites(request, context),
    complexity: await estimateComplexity(request, context),
    effort: await estimateEffort(request, context)
  };
  
  // 2. Décomposer en composants
  const components = await decomposeRequest(request, analysis, context);
  
  // 3. Documenter analyse
  await documentInitialAnalysis(request, analysis, components, context);
  
  return {
    request,
    analysis,
    components,
    timestamp: Date.now()
  };
}
```

### 2. Création des Todos par l'Architecte

**IMPÉRATIF:** L'architecte DOIT créer tous les todos nécessaires pour compléter la demande initiale.

**TOUJOURS:**
- ✅ Créer todos pour tous les composants identifiés
- ✅ Prioriser todos selon dépendances et impact
- ✅ Inclure todos de validation et tests
- ✅ Inclure todos de documentation si nécessaire
- ✅ Documenter plan d'exécution complet

**Pattern:**
```typescript
// Création des todos par l'architecte
async function createInitialTodos(
  analysis: InitialAnalysis,
  context: Context
): Promise<Todo[]> {
  const todos: Todo[] = [];
  
  // 1. Créer todos pour chaque composant
  for (const component of analysis.components) {
    const componentTodos = await createTodosForComponent(
      component,
      analysis,
      context
    );
    
    todos.push(...componentTodos);
  }
  
  // 2. Créer todos de validation
  const validationTodos = await createValidationTodos(
    analysis,
    context
  );
  
  todos.push(...validationTodos);
  
  // 3. Créer todos de tests
  const testTodos = await createTestTodos(
    analysis,
    context
  );
  
  todos.push(...testTodos);
  
  // 4. Prioriser todos
  const prioritizedTodos = await prioritizeTodos(todos, analysis, context);
  
  // 5. Documenter plan
  await documentExecutionPlan(prioritizedTodos, analysis, context);
  
  return prioritizedTodos;
}
```

### 3. Exécution par les Autres Rôles

**IMPÉRATIF:** Les autres rôles DOIVENT exécuter les todos créés par l'architecte.

**TOUJOURS:**
- ✅ Exécuter todos dans l'ordre défini par l'architecte
- ✅ Respecter dépendances entre todos
- ✅ Valider chaque todo après exécution
- ✅ Documenter résultats de chaque todo
- ✅ Signaler problèmes à l'architecte

**Pattern:**
```typescript
// Exécution par les autres rôles
async function executeTodosWithRoles(
  todos: Todo[],
  context: Context
): Promise<ExecutionResult> {
  const roleCoordinator = new RoleCoordinator();
  const completedTodos: Todo[] = [];
  const results: TodoResult[] = [];
  
  for (const todo of todos) {
    // 1. Identifier rôle approprié
    const role = await identifyAppropriateRole(todo, context);
    
    // 2. Exécuter todo avec rôle
    const result = await roleCoordinator.executeTodoWithRole(
      todo,
      role,
      context
    );
    
    // 3. Valider résultat
    const validation = await validateTodoResult(todo, result, context);
    
    if (validation.success) {
      // 4. Marquer todo comme complété
      completedTodos.push(todo);
      results.push({
        todo,
        result,
        validation,
        success: true
      });
    } else {
      // 5. Signaler problème à l'architecte
      await signalProblemToArchitect(todo, result, validation, context);
      
      results.push({
        todo,
        result,
        validation,
        success: false
      });
    }
  }
  
  return {
    todos,
    completedTodos,
    results,
    completionRate: completedTodos.length / todos.length
  };
}
```

### 4. Réévaluation Architecturale

**IMPÉRATIF:** L'architecte DOIT réévaluer si toutes les tâches sont complétées à 100% après chaque itération.

**TOUJOURS:**
- ✅ Comparer demande initiale avec résultats obtenus
- ✅ Identifier tâches manquantes ou incomplètes
- ✅ Calculer taux de completion précis
- ✅ Analyser qualité des résultats
- ✅ Documenter réévaluation

**Pattern:**
```typescript
// Réévaluation architecturale
async function reevaluateCompletion(
  initialRequest: UserRequest,
  initialAnalysis: InitialAnalysis,
  executionResult: ExecutionResult,
  context: Context
): Promise<ReevaluationResult> {
  // 1. Comparer demande initiale avec résultats
  const comparison = await compareRequestWithResults(
    initialRequest,
    initialAnalysis,
    executionResult,
    context
  );
  
  // 2. Identifier tâches manquantes
  const missingTasks = await identifyMissingTasks(
    initialRequest,
    initialAnalysis,
    comparison,
    context
  );
  
  // 3. Calculer taux de completion
  const completionRate = await calculateCompletionRate(
    initialAnalysis,
    executionResult,
    missingTasks,
    context
  );
  
  // 4. Analyser qualité
  const qualityAnalysis = await analyzeQuality(
    executionResult,
    context
  );
  
  // 5. Documenter réévaluation
  await documentReevaluation(
    initialRequest,
    initialAnalysis,
    executionResult,
    comparison,
    missingTasks,
    completionRate,
    qualityAnalysis,
    context
  );
  
  return {
    completionRate,
    missingTasks,
    comparison,
    qualityAnalysis,
    completed: completionRate >= 1.0
  };
}
```

### 5. Création de Nouvelles Tâches si Nécessaire

**IMPÉRATIF:** Si completion < 100%, l'architecte DOIT créer de nouvelles tâches pour compléter la demande.

**TOUJOURS:**
- ✅ Identifier tâches manquantes précisément
- ✅ Créer todos pour tâches manquantes
- ✅ Prioriser nouvelles tâches selon impact
- ✅ Intégrer nouvelles tâches dans plan d'exécution
- ✅ Documenter nouvelles tâches

**Pattern:**
```typescript
// Création de nouvelles tâches si nécessaire
async function createTodosForMissingTasks(
  missingTasks: MissingTask[],
  context: Context
): Promise<Todo[]> {
  const newTodos: Todo[] = [];
  
  for (const missingTask of missingTasks) {
    // 1. Créer todo pour tâche manquante
    const todo = await createTodoForMissingTask(
      missingTask,
      context
    );
    
    // 2. Prioriser todo
    const prioritizedTodo = await prioritizeTodo(
      todo,
      missingTask,
      context
    );
    
    newTodos.push(prioritizedTodo);
  }
  
  // 3. Documenter nouvelles tâches
  await documentNewTasks(newTodos, missingTasks, context);
  
  return newTodos;
}
```

### 6. Itération jusqu'à Completion Complète

**IMPÉRATIF:** L'agent DOIT itérer jusqu'à ce que le taux de completion soit à 100%.

**TOUJOURS:**
- ✅ Continuer itération tant que completion < 100%
- ✅ Limiter nombre d'itérations (max 10) pour éviter boucles infinies
- ✅ Documenter chaque itération
- ✅ Analyser progression entre itérations
- ✅ S'arrêter uniquement si completion = 100%

**Pattern:**
```typescript
// Itération jusqu'à completion complète
async function iterateToCompleteCompletion(
  initialRequest: UserRequest,
  context: Context
): Promise<FinalCompletionResult> {
  const architect = new SeniorArchitect();
  const roleCoordinator = new RoleCoordinator();
  let iteration = 0;
  const maxIterations = 10;
  let completionRate = 0;
  let todos: Todo[] = [];
  const iterationHistory: IterationHistory[] = [];
  
  // 1. Examen initial
  const initialAnalysis = await architect.examineInitialRequest(
    initialRequest,
    context
  );
  
  // 2. Création todos initiaux
  todos = await architect.createInitialTodos(initialAnalysis, context);
  
  // 3. Itération jusqu'à completion complète
  while (completionRate < 1.0 && iteration < maxIterations) {
    iteration++;
    
    // 4. Exécution par autres rôles
    const executionResult = await roleCoordinator.executeTodosWithRoles(
      todos,
      context
    );
    
    // 5. Réévaluation architecturale
    const revaluation = await architect.reevaluateCompletion(
      initialRequest,
      initialAnalysis,
      executionResult,
      context
    );
    
    completionRate = revaluation.completionRate;
    
    // 6. Documenter itération
    iterationHistory.push({
      iteration,
      todos: todos.length,
      completed: executionResult.completedTodos.length,
      completionRate,
      timestamp: Date.now()
    });
    
    // 7. Si completion < 100%, créer nouvelles tâches
    if (completionRate < 1.0 && revaluation.missingTasks.length > 0) {
      const newTodos = await architect.createTodosForMissingTasks(
        revaluation.missingTasks,
        context
      );
      
      todos = [...executionResult.completedTodos, ...newTodos];
    } else if (completionRate < 1.0) {
      // Si completion < 100% mais aucune tâche manquante, analyser plus profondément
      const deepAnalysis = await architect.performDeepAnalysis(
        initialRequest,
        initialAnalysis,
        revaluation,
        context
      );
      
      if (deepAnalysis.missingTasks.length > 0) {
        const newTodos = await architect.createTodosForMissingTasks(
          deepAnalysis.missingTasks,
          context
        );
        
        todos = [...executionResult.completedTodos, ...newTodos];
      } else {
        // Si vraiment aucune tâche manquante, arrêter
        break;
      }
    }
  }
  
  return {
    success: completionRate >= 1.0,
    completionRate,
    iterations: iteration,
    todos: todos.length,
    completedTodos: executionResult.completedTodos.length,
    history: iterationHistory
  };
}
```

## 🔄 Workflows Transversaux Multi-Rôles

### Principe

**IMPÉRATIF:** Pour les tâches complexes impliquant plusieurs aspects (migration + consolidation + erreurs), l'agent DOIT utiliser des workflows transversaux impliquant 3+ rôles simultanément pour garantir une validation complète et optimale.

**Bénéfices:**
- ✅ Validation complète multi-dimensionnelle (technique + business + migration + dette + erreurs)
- ✅ Optimisation globale des solutions
- ✅ Réduction des itérations grâce à validation conjointe
- ✅ Qualité garantie sur tous les aspects

### 1. Validation Conjointe Multi-Rôles

**Pattern:**
```typescript
// Validation conjointe multi-rôles (3+ rôles)
async function validateWithAllRoles(
  solution: MultiRoleSolution,
  context: Context
): Promise<MultiRoleValidationResult> {
  // 1. Validation Architecte Sénior (technique)
  const architectValidation = await performArchitectCodeReview(solution.code, context);
  
  // 2. Validation Consultant Client (business/métier)
  const clientValidation = await validateClientAlignment(solution, context);
  
  // 3. Validation rôles spécialisés selon contexte
  const specializedValidations = await validateSpecializedRoles(solution, context);
  
  // 4. Validation conjointe globale
  const globalValidation = {
    architect: architectValidation.approved,
    client: clientValidation.approved,
    specialized: specializedValidations.allApproved,
    approved: architectValidation.approved && 
              clientValidation.approved && 
              specializedValidations.allApproved
  };
  
  // 5. Si validation conjointe réussie, procéder
  if (globalValidation.approved) {
    return {
      success: true,
      architect: architectValidation,
      client: clientValidation,
      specialized: specializedValidations,
      global: globalValidation,
      approved: true
    };
  }
  
  // 6. Si validation échoue, identifier problèmes et itérer
  const issues = [];
  if (!architectValidation.approved) {
    issues.push(...architectValidation.improvements);
  }
  if (!clientValidation.approved) {
    issues.push(...clientValidation.recommendations);
  }
  if (!specializedValidations.allApproved) {
    issues.push(...specializedValidations.allIssues);
  }
  
  return {
    success: false,
    architect: architectValidation,
    client: clientValidation,
    specialized: specializedValidations,
    global: globalValidation,
    approved: false,
    issues,
    requiresIteration: true
  };
}
```

### 2. Workflow : Migration avec Optimisation Complète

**Cas d'usage:** Migration de code nécessitant consolidation de dette technique et réduction d'erreurs

**Pattern:**
```typescript
// Migration avec optimisation complète (Migration + Tech Debt + Hard Coding)
async function migrateWithFullOptimization(
  migration: Migration,
  context: Context
): Promise<TransversalResult> {
  // 1. Migration Manager : Supervise migration modulaire
  const migrationResult = await superviseModularMigration(
    migration.sourceFile,
    migration.targetModule,
    context
  );
  
  // 2. Tech Debt Manager : Identifie dette technique pendant migration
  const debtAnalysis = await identifyDebtDuringMigration(migrationResult, context);
  
  // 3. Hard Coding Specialist : Réduit erreurs radicalement
  const hardenedCode = await reduceErrorsRadically(migrationResult.code, context);
  
  // 4. Validation conjointe 3 rôles spécialisés + Architecte + Client
  const validation = await validateWithAllRoles({
    code: hardenedCode.code,
    migration: migrationResult,
    debt: debtAnalysis,
    hardCoding: hardenedCode,
    task: migration
  }, context);
  
  // 5. Si validation réussie, procéder
  if (validation.approved) {
    return {
      success: true,
      migration: migrationResult,
      debt: debtAnalysis,
      hardCoding: hardenedCode,
      validation,
      optimized: true
    };
  }
  
  // 6. Si validation échoue, itérer
  return {
    success: false,
    migration: migrationResult,
    debt: debtAnalysis,
    hardCoding: hardenedCode,
    validation,
    requiresIteration: true,
    issues: validation.issues
  };
}
```

### 3. Workflow : Consolidation avec Hard Coding

**Cas d'usage:** Consolidation de services nécessitant réduction d'erreurs et migration

**Pattern:**
```typescript
// Consolidation avec hard coding (Tech Debt + Hard Coding + Migration)
async function consolidateWithHardCoding(
  consolidation: Consolidation,
  context: Context
): Promise<TransversalResult> {
  // 1. Tech Debt Manager : Planifie consolidation
  const consolidationPlan = await planServiceConsolidation(
    consolidation.duplicatedServices,
    consolidation.targetArchitecture,
    context
  );
  
  // 2. Hard Coding Specialist : Réduit erreurs pendant consolidation
  const hardenedCode = await reduceErrorsDuringConsolidation(
    consolidationPlan.consolidatedServices,
    context
  );
  
  // 3. Migration Manager : Supervise migration vers architecture consolidée
  const migrationResult = await superviseModularMigration(
    consolidation.sourceServices,
    consolidation.targetServices,
    context
  );
  
  // 4. Validation conjointe 3 rôles spécialisés + Architecte + Client
  const validation = await validateWithAllRoles({
    code: hardenedCode.code,
    consolidation: consolidationPlan,
    hardCoding: hardenedCode,
    migration: migrationResult,
    task: consolidation
  }, context);
  
  // 5. Si validation réussie, procéder
  if (validation.approved) {
    return {
      success: true,
      consolidation: consolidationPlan,
      hardCoding: hardenedCode,
      migration: migrationResult,
      validation,
      optimized: true
    };
  }
  
  // 6. Si validation échoue, itérer
  return {
    success: false,
    consolidation: consolidationPlan,
    hardCoding: hardenedCode,
    migration: migrationResult,
    validation,
    requiresIteration: true,
    issues: validation.issues
  };
}
```

### 4. Workflow : Validation Business et Technique

**Cas d'usage:** Tâche complexe nécessitant validation business et technique complète

**Pattern:**
```typescript
// Validation business et technique (Client + Architecte + rôles spécialisés)
async function validateBusinessAndTechnical(
  feature: Feature,
  context: Context
): Promise<TransversalResult> {
  // 1. Client Consultant : Validation business proactive
  const businessValidation = await validateBusinessProactively(feature, context);
  
  // 2. Architecte Sénior : Validation technique
  const technicalValidation = await performArchitectCodeReview(feature.code, context);
  
  // 3. Rôles spécialisés selon contexte
  const specializedValidations = await validateSpecializedRoles(feature, context);
  
  // 4. Validation conjointe globale
  const validation = await validateWithAllRoles({
    code: feature.code,
    business: businessValidation,
    technical: technicalValidation,
    specialized: specializedValidations,
    task: feature
  }, context);
  
  // 5. Si validation réussie, procéder
  if (validation.approved) {
    return {
      success: true,
      business: businessValidation,
      technical: technicalValidation,
      specialized: specializedValidations,
      validation,
      approved: true
    };
  }
  
  // 6. Si validation échoue, itérer
  return {
    success: false,
    business: businessValidation,
    technical: technicalValidation,
    specialized: specializedValidations,
    validation,
    requiresIteration: true,
    issues: validation.issues
  };
}
```

## 🔧 Mécanisme de Validation Conjointe Multi-Rôles

### Principe

**IMPÉRATIF:** Pour les validations impliquant plusieurs rôles, l'agent DOIT utiliser un mécanisme de validation conjointe avec résolution automatique de conflits et escalade vers l'architecte si nécessaire.

**Bénéfices:**
- ✅ Résolution automatique de conflits entre rôles
- ✅ Priorisation intelligente selon contexte
- ✅ Escalade automatique vers architecte si nécessaire
- ✅ Validation conjointe optimisée

### 1. Résolution de Conflits entre Rôles

**Pattern:**
```typescript
// Résolution automatique de conflits entre rôles
async function resolveRoleConflicts(
  validations: RoleValidation[],
  context: Context
): Promise<ResolvedValidation> {
  // 1. Détecter conflits
  const conflicts = detectConflicts(validations);
  
  // 2. Prioriser selon contexte
  const prioritized = prioritizeByContext(conflicts, context);
  
  // 3. Résoudre automatiquement si possible
  const resolved = await autoResolveConflicts(prioritized, context);
  
  // 4. Escalade vers Architecte si nécessaire
  if (!resolved.allResolved) {
    return await escalateToArchitect(resolved, context);
  }
  
  return resolved;
}

// Détecter conflits entre validations
function detectConflicts(
  validations: RoleValidation[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  for (let i = 0; i < validations.length; i++) {
    for (let j = i + 1; j < validations.length; j++) {
      const conflict = compareValidations(validations[i], validations[j]);
      if (conflict.hasConflict) {
        conflicts.push(conflict);
      }
    }
  }
  
  return conflicts;
}

// Prioriser selon contexte
function prioritizeByContext(
  conflicts: Conflict[],
  context: Context
): PrioritizedConflict[] {
  return conflicts.map(conflict => {
    const priority = calculatePriority(conflict, context);
    return {
      ...conflict,
      priority,
      resolutionStrategy: selectResolutionStrategy(conflict, priority, context)
    };
  }).sort((a, b) => b.priority - a.priority);
}

// Résoudre automatiquement si possible
async function autoResolveConflicts(
  prioritized: PrioritizedConflict[],
  context: Context
): Promise<ResolvedValidation> {
  const resolved: ResolvedIssue[] = [];
  const unresolved: Conflict[] = [];
  
  for (const conflict of prioritized) {
    if (conflict.resolutionStrategy === 'auto') {
      const resolution = await applyAutoResolution(conflict, context);
      if (resolution.success) {
        resolved.push(resolution);
      } else {
        unresolved.push(conflict);
      }
    } else {
      unresolved.push(conflict);
    }
  }
  
  return {
    resolved,
    unresolved,
    allResolved: unresolved.length === 0
  };
}
```

### 2. Priorisation des Validations selon Contexte

**Pattern:**
```typescript
// Prioriser validations selon contexte
async function prioritizeRoleValidations(
  validations: RoleValidation[],
  context: Context
): Promise<PrioritizedValidation[]> {
  // 1. Analyser contexte
  const contextAnalysis = await analyzeContext(context);
  
  // 2. Calculer priorité pour chaque validation
  const prioritized = validations.map(validation => {
    const priority = calculateValidationPriority(validation, contextAnalysis);
    return {
      ...validation,
      priority,
      weight: calculateWeight(validation, contextAnalysis)
    };
  });
  
  // 3. Trier par priorité
  return prioritized.sort((a, b) => b.priority - a.priority);
}

// Calculer priorité validation selon contexte
function calculateValidationPriority(
  validation: RoleValidation,
  context: ContextAnalysis
): number {
  let priority = 0;
  
  // Priorité selon type de rôle
  if (validation.role === 'senior-architect') priority += 10;
  if (validation.role === 'client-consultant') priority += 9;
  if (validation.role === 'migration-manager') priority += 8;
  if (validation.role === 'tech-debt-manager') priority += 7;
  if (validation.role === 'hard-coding-specialist') priority += 8;
  
  // Priorité selon criticité
  if (validation.criticality === 'critical') priority += 5;
  if (validation.criticality === 'high') priority += 3;
  if (validation.criticality === 'medium') priority += 1;
  
  // Priorité selon contexte
  if (context.isMigration && validation.role === 'migration-manager') priority += 3;
  if (context.isConsolidation && validation.role === 'tech-debt-manager') priority += 3;
  if (context.hasErrors && validation.role === 'hard-coding-specialist') priority += 3;
  if (context.isBusiness && validation.role === 'client-consultant') priority += 3;
  
  return priority;
}
```

### 3. Escalade vers Architecte

**Pattern:**
```typescript
// Escalade vers Architecte si résolution impossible
async function escalateToArchitect(
  resolved: ResolvedValidation,
  context: Context
): Promise<ArchitectEscalation> {
  // 1. Préparer escalade
  const escalation = {
    unresolvedConflicts: resolved.unresolved,
    context: context,
    recommendations: generateEscalationRecommendations(resolved, context)
  };
  
  // 2. Soumettre à Architecte Sénior
  const architectDecision = await performArchitectCodeReview(
    escalation,
    context
  );
  
  // 3. Appliquer décision Architecte
  const finalResolution = await applyArchitectDecision(
    architectDecision,
    resolved,
    context
  );
  
  return {
    escalation,
    architectDecision,
    finalResolution,
    resolved: finalResolution.allResolved
  };
}
```

### Intégration avec `iterative-perfection.md`

**Workflow:**
1. L'architecte sénior supervise chaque itération
2. Évalue qualité après chaque itération
3. Priorise corrections selon impact
4. Continue jusqu'à perfection atteinte

**Pattern:**
```typescript
// Intégration avec iterative-perfection
async function iterateWithArchitectSupervision(
  task: Task,
  context: Context
): Promise<PerfectionResult> {
  let iteration = 0;
  const maxIterations = 10;
  let currentCode = await loadCode(task);
  
  while (iteration < maxIterations) {
    // 1. Détecter problèmes (iterative-perfection)
    const issues = await detectAllIssues(currentCode, context);
    
    // 2. Architecte sénior supervise
    const supervision = await superviseTaskToPerfection(task, context);
    
    // 3. Prioriser corrections selon impact
    const prioritized = await prioritizeCorrections(issues, supervision);
    
    // 4. Corriger automatiquement
    currentCode = await autoFixAllIssues(currentCode, prioritized, context);
    
    // 5. Review architecte
    const review = await performArchitectCodeReview(currentCode, context);
    
    // 6. Si perfection atteinte, arrêter
    if (review.approved && issues.length === 0) {
      return { success: true, perfect: true, code: currentCode, iterations: iteration };
    }
    
    iteration++;
  }
  
  return { success: false, perfect: false, code: currentCode, iterations: iteration };
}
```

### Intégration avec `todo-completion.md`

**Workflow:**
1. L'architecte sénior priorise les todos
2. Optimise ordre d'exécution
3. Gère dépendances entre todos
4. Supervise completion complète

**Pattern:**
```typescript
// Intégration avec todo-completion
async function completeTodosWithArchitectSupervision(
  todos: Todo[],
  context: Context
): Promise<CompletionResult> {
  // 1. Architecte sénior priorise todos
  const prioritized = await prioritizeTasks(todos, context);
  
  // 2. Exécuter todos séquentiellement avec supervision
  for (const todo of prioritized) {
    // 3. Superviser chaque todo
    const supervision = await superviseTaskToPerfection(todo, context);
    
    // 4. Valider completion
    if (!supervision.success) {
      // Corriger et réessayer
      const corrected = await correctAndRetry(todo, supervision, context);
      if (!corrected.success) {
        return { completed: false, failedTodo: todo };
      }
    }
  }
  
  return { completed: true, todos: prioritized };
}
```

### Intégration avec `bug-prevention.md`

**Workflow:**
1. L'architecte sénior supervise détection proactive
2. Priorise corrections selon criticité
3. Valide corrections appliquées
4. Documente apprentissages

**Pattern:**
```typescript
// Intégration avec bug-prevention
async function preventBugsWithArchitectSupervision(
  code: string,
  context: Context
): Promise<BugPreventionResult> {
  // 1. Détecter bugs potentiels (bug-prevention)
  const bugDetection = await detectPotentialBugs(code, context);
  
  // 2. Architecte sénior supervise
  const supervision = await superviseTaskToPerfection({ code }, context);
  
  // 3. Prioriser corrections selon criticité
  const prioritized = await prioritizeBugFixes(bugDetection.bugs, supervision);
  
  // 4. Corriger automatiquement
  const fixResult = await fixPotentialBugs(bugDetection, code, context);
  
  // 5. Review architecte
  const review = await performArchitectCodeReview(fixResult.fixedCode, context);
  
  return {
    bugsDetected: bugDetection.hasCriticalBugs,
    fixed: fixResult.allFixed && review.approved,
    fixedCode: fixResult.fixedCode,
    review
  };
}
```

## ⚠️ Règles de Supervision

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer problèmes architecturaux détectés
- ❌ Ne pas prioriser tâches selon impact
- ❌ Ne pas superviser développements
- ❌ Ne pas revoir code avec critères d'architecte
- ❌ Ne pas itérer jusqu'à perfection
- ❌ Créer todos sans examiner demande initiale complètement
- ❌ Ne pas réévaluer completion après chaque itération
- ❌ Ne pas créer nouvelles tâches si completion < 100%
- ❌ S'arrêter avant completion complète à 100%

**TOUJOURS:**
- ✅ Évaluer performances après chaque tâche
- ✅ Prioriser intelligemment les tâches
- ✅ Superviser architecture globale
- ✅ Review automatique avec critères d'architecte
- ✅ Itérer jusqu'à perfection atteinte
- ✅ Examiner demande initiale complètement avant de créer todos
- ✅ Créer tous les todos nécessaires pour compléter la demande
- ✅ Réévaluer completion après chaque itération
- ✅ Créer nouvelles tâches si completion < 100%
- ✅ Itérer jusqu'à completion complète à 100%

## 📊 Checklist Supervision Architecte Sénior

### Avant Implémentation

- [ ] Évaluer approches selon 4 critères (rapidité, performance, robustesse, maintenabilité)
- [ ] Prioriser tâches selon impact, urgence, dette technique
- [ ] Superviser architecture, valider décisions architecturales
- [ ] Guider développements vers objectifs

### Pendant Implémentation

- [ ] Superviser développements continuellement
- [ ] Détecter dérives architecturales
- [ ] Review automatique avec critères d'architecte
- [ ] Prioriser corrections selon impact

### Après Implémentation

- [ ] Réévaluer completion après chaque itération
- [ ] Comparer demande initiale avec résultats obtenus
- [ ] Identifier tâches manquantes ou incomplètes
- [ ] Calculer taux de completion précis
- [ ] Créer nouvelles tâches si completion < 100%
- [ ] Itérer jusqu'à completion complète à 100%
- [ ] Review automatique complète
- [ ] Itérer jusqu'à perfection atteinte
- [ ] Évaluer performances, documenter apprentissages
- [ ] Valider conformité aux standards

## 🔗 Références

- `@.cursor/rules/iterative-perfection.md` - Itération jusqu'à perfection
- `@.cursor/rules/todo-completion.md` - Completion des todos
- `@.cursor/rules/bug-prevention.md` - Détection proactive des bugs
- `@.cursor/rules/quality-checklist.md` - Checklist qualité
- `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable

---

**Note:** Cette règle garantit que l'agent agit comme un architecte sénior qui supervise, priorise, pilote et revoit le code pour garantir excellence technique et qualité exemplaire.

