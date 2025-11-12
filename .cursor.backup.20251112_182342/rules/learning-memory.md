# Mémoire Persistante des Apprentissages - Saxium

**Objectif:** Sauvegarder et réutiliser les apprentissages de l'agent entre sessions pour améliorer l'efficacité et éviter de répéter les mêmes erreurs.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT sauvegarder ses apprentissages (patterns réussis, solutions efficaces, workflows validés) et les réutiliser pour améliorer ses performances futures.

**Bénéfices:**
- ✅ Réutilise les solutions efficaces
- ✅ Évite de répéter les mêmes erreurs
- ✅ Améliore les performances au fil du temps
- ✅ Consolide les connaissances acquises
- ✅ Accélère le développement

## 📋 Règles de Mémoire Persistante

### 1. Sauvegarde des Patterns Réussis

**TOUJOURS:**
- ✅ Sauvegarder les patterns qui ont fonctionné
- ✅ Documenter les solutions efficaces
- ✅ Conserver les workflows validés
- ✅ Enregistrer les apprentissages importants
- ✅ Mettre à jour la mémoire régulièrement

**Pattern:**
```typescript
// Sauvegarder pattern réussi
async function saveSuccessfulPattern(
  action: Action,
  result: Result,
  context: Context
): Promise<void> {
  // 1. Analyser le succès
  const analysis = analyzeSuccess(action, result);
  
  // 2. Extraire pattern
  const pattern = extractPattern(action, result, analysis);
  
  // 3. Sauvegarder dans mémoire persistante
  await saveToMemory({
    type: 'successful-pattern',
    pattern: pattern,
    context: context,
    timestamp: Date.now(),
    metadata: {
      action: action.type,
      result: result.type,
      performance: analysis.performance
    }
  });
  
  // 4. Logger sauvegarde
  logger.info('Pattern réussi sauvegardé', {
    metadata: {
      patternId: pattern.id,
      actionType: action.type,
      performance: analysis.performance
    }
  });
}
```

### 2. Sauvegarde des Solutions Efficaces

**TOUJOURS:**
- ✅ Sauvegarder les solutions qui ont résolu des problèmes
- ✅ Documenter les corrections efficaces
- ✅ Conserver les approches qui ont fonctionné
- ✅ Enregistrer les optimisations réussies

**Pattern:**
```typescript
// Sauvegarder solution efficace
async function saveEffectiveSolution(
  problem: Problem,
  solution: Solution,
  result: Result
): Promise<void> {
  // 1. Analyser efficacité
  const effectiveness = analyzeEffectiveness(solution, result);
  
  // 2. Extraire solution
  const solutionPattern = extractSolutionPattern(problem, solution, effectiveness);
  
  // 3. Sauvegarder dans mémoire persistante
  await saveToMemory({
    type: 'effective-solution',
    problem: problem,
    solution: solutionPattern,
    effectiveness: effectiveness,
    timestamp: Date.now(),
    metadata: {
      problemType: problem.type,
      solutionType: solution.type,
      effectiveness: effectiveness.score
    }
  });
  
  // 4. Logger sauvegarde
  logger.info('Solution efficace sauvegardée', {
    metadata: {
      solutionId: solutionPattern.id,
      problemType: problem.type,
      effectiveness: effectiveness.score
    }
  });
}
```

### 3. Réutilisation des Apprentissages

**TOUJOURS:**
- ✅ Chercher dans la mémoire avant d'agir
- ✅ Réutiliser les patterns réussis pour tâches similaires
- ✅ Appliquer les solutions efficaces pour problèmes similaires
- ✅ Utiliser les workflows validés
- ✅ Adapter les apprentissages au contexte actuel

**Pattern:**
```typescript
// Réutiliser apprentissages
async function reuseLearning(
  task: Task,
  context: Context
): Promise<ReuseResult> {
  // 1. Chercher dans mémoire
  const memory = await loadMemory();
  
  // 2. Chercher patterns similaires
  const similarPatterns = findSimilarPatterns(task, memory.patterns);
  
  // 3. Chercher solutions similaires
  const similarSolutions = findSimilarSolutions(task, memory.solutions);
  
  // 4. Chercher workflows similaires
  const similarWorkflows = findSimilarWorkflows(task, memory.workflows);
  
  // 5. Sélectionner meilleur match
  const bestMatch = selectBestMatch({
    patterns: similarPatterns,
    solutions: similarSolutions,
    workflows: similarWorkflows
  });
  
  // 6. Si match trouvé, réutiliser
  if (bestMatch && bestMatch.score > 0.7) {
    // 7. Adapter au contexte actuel
    const adapted = await adaptLearning(bestMatch, task, context);
    
    return {
      reused: true,
      learning: adapted,
      original: bestMatch,
      score: bestMatch.score
    };
  }
  
  return {
    reused: false,
    recommendation: 'no-similar-learning-found'
  };
}
```

### 4. Consolidation des Connaissances

**TOUJOURS:**
- ✅ Consolider les apprentissages similaires
- ✅ Créer workflows réutilisables à partir de patterns
- ✅ Mettre à jour la mémoire avec nouveaux apprentissages
- ✅ Nettoyer la mémoire obsolète
- ✅ Optimiser la structure de la mémoire

**Pattern:**
```typescript
// Consolider connaissances
async function consolidateKnowledge(
  learnings: Learning[],
  context: Context
): Promise<ConsolidatedKnowledge> {
  // 1. Grouper apprentissages similaires
  const groups = groupSimilarLearnings(learnings);
  
  // 2. Pour chaque groupe
  const consolidated: ConsolidatedLearning[] = [];
  for (const group of groups) {
    // 3. Extraire patterns communs
    const commonPatterns = extractCommonPatterns(group);
    
    // 4. Créer workflow consolidé
    const workflow = createConsolidatedWorkflow(commonPatterns);
    
    // 5. Valider workflow
    const validation = await validateWorkflow(workflow);
    if (validation.success) {
      consolidated.push({
        workflow: workflow,
        patterns: commonPatterns,
        successRate: calculateSuccessRate(group),
        usageCount: group.length
      });
    }
  }
  
  // 6. Sauvegarder connaissances consolidées
  await saveConsolidatedKnowledge(consolidated);
  
  return {
    consolidated: consolidated,
    count: consolidated.length
  };
}
```

### 5. Éviter de Répéter les Erreurs

**TOUJOURS:**
- ✅ Sauvegarder les erreurs et leurs solutions
- ✅ Vérifier la mémoire avant d'agir
- ✅ Éviter les approches qui ont échoué
- ✅ Appliquer les corrections qui ont fonctionné
- ✅ Documenter les erreurs pour référence future

**Pattern:**
```typescript
// Éviter de répéter erreurs
async function avoidRepeatingErrors(
  task: Task,
  context: Context
): Promise<ErrorAvoidanceResult> {
  // 1. Charger mémoire des erreurs
  const errorMemory = await loadErrorMemory();
  
  // 2. Chercher erreurs similaires
  const similarErrors = findSimilarErrors(task, errorMemory.errors);
  
  // 3. Si erreur similaire trouvée
  if (similarErrors.length > 0) {
    const bestMatch = similarErrors[0];
    
    // 4. Vérifier si solution existe
    if (bestMatch.solution) {
      return {
        errorFound: true,
        error: bestMatch.error,
        solution: bestMatch.solution,
        recommendation: 'apply-known-solution'
      };
    } else {
      return {
        errorFound: true,
        error: bestMatch.error,
        solution: null,
        recommendation: 'avoid-known-error'
      };
    }
  }
  
  return {
    errorFound: false,
    recommendation: 'proceed-with-caution'
  };
}
```

## 🔄 Workflow de Mémoire Persistante

### Workflow: Utiliser Mémoire Avant Action

**Étapes:**
1. Charger mémoire persistante
2. Chercher patterns similaires
3. Chercher solutions similaires
4. Chercher workflows similaires
5. Chercher erreurs similaires à éviter
6. Sélectionner meilleur match
7. Adapter au contexte actuel
8. Appliquer apprentissage
9. Sauvegarder nouveau résultat

**Pattern:**
```typescript
async function useMemoryBeforeAction(
  task: Task,
  context: Context
): Promise<ActionResult> {
  // 1. Charger mémoire
  const memory = await loadMemory();
  
  // 2. Chercher apprentissages similaires
  const reuseResult = await reuseLearning(task, context);
  
  // 3. Chercher erreurs à éviter
  const errorResult = await avoidRepeatingErrors(task, context);
  
  // 4. Si apprentissage réutilisable trouvé
  if (reuseResult.reused) {
    // 5. Appliquer apprentissage
    const result = await applyLearning(reuseResult.learning, task, context);
    
    // 6. Sauvegarder résultat
    await saveResult(task, result, context);
    
    return {
      action: 'reuse-learning',
      result: result,
      learning: reuseResult.learning
    };
  }
  
  // 7. Si erreur à éviter trouvée
  if (errorResult.errorFound && errorResult.solution) {
    // 8. Appliquer solution connue
    const result = await applyKnownSolution(errorResult.solution, task, context);
    
    return {
      action: 'apply-known-solution',
      result: result,
      solution: errorResult.solution
    };
  }
  
  // 9. Agir normalement
  const result = await executeTask(task, context);
  
  // 10. Sauvegarder apprentissage
  if (result.success) {
    await saveSuccessfulPattern(task, result, context);
  } else {
    await saveError(task, result, context);
  }
  
  return {
    action: 'execute-new',
    result: result
  };
}
```

## 📊 Structure de la Mémoire

### Format de Sauvegarde

```typescript
interface LearningMemory {
  patterns: SuccessfulPattern[];
  solutions: EffectiveSolution[];
  workflows: ValidatedWorkflow[];
  errors: KnownError[];
  metadata: {
    lastUpdated: number;
    version: string;
    totalLearnings: number;
  };
}

interface SuccessfulPattern {
  id: string;
  type: string;
  pattern: Pattern;
  context: Context;
  successRate: number;
  usageCount: number;
  lastUsed: number;
  metadata: Record<string, any>;
}

interface EffectiveSolution {
  id: string;
  problem: Problem;
  solution: Solution;
  effectiveness: number;
  usageCount: number;
  lastUsed: number;
  metadata: Record<string, any>;
}
```

## ⚠️ Règles de Mémoire

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer la mémoire avant d'agir
- ❌ Répéter les mêmes erreurs
- ❌ Ignorer les solutions efficaces
- ❌ Ne pas sauvegarder les apprentissages

**TOUJOURS:**
- ✅ Chercher dans la mémoire avant d'agir
- ✅ Réutiliser les apprentissages similaires
- ✅ Sauvegarder les nouveaux apprentissages
- ✅ Mettre à jour la mémoire régulièrement

## 📊 Checklist Mémoire Persistante

### Avant d'Agir

- [ ] Charger mémoire persistante
- [ ] Chercher patterns similaires
- [ ] Chercher solutions similaires
- [ ] Chercher workflows similaires
- [ ] Chercher erreurs à éviter
- [ ] Réutiliser apprentissages si trouvés
- [ ] Adapter au contexte actuel

### Après Action

- [ ] Analyser résultat de l'action
- [ ] Sauvegarder pattern si réussi
- [ ] Sauvegarder solution si efficace
- [ ] Sauvegarder erreur si échec
- [ ] Mettre à jour mémoire
- [ ] Consolider si plusieurs succès similaires

### Maintenance Mémoire

- [ ] Nettoyer mémoire obsolète
- [ ] Consolider apprentissages similaires
- [ ] Optimiser structure de la mémoire
- [ ] Valider intégrité de la mémoire

## 🔗 Références

- `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage avancées
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes
- `@.cursor/rules/long-term-autonomy.md` - Autonomie longue durée
- `@.cursor/rules/core.md` - Règles fondamentales

---

**Note:** Cette règle garantit que l'agent sauvegarde et réutilise ses apprentissages entre sessions, améliorant ses performances au fil du temps.

