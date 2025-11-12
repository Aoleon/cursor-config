# Consolidation Automatique des Workflows - Saxium

**Objectif:** Consolider automatiquement les workflows réussis en patterns réutilisables pour améliorer l'efficacité future.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT consolider automatiquement les workflows réussis en patterns réutilisables après plusieurs succès similaires.

**Bénéfices:**
- ✅ Réutilise les workflows efficaces
- ✅ Améliore l'efficacité future
- ✅ Évite de répéter les mêmes erreurs
- ✅ Accélère le développement
- ✅ Améliore la cohérence

## 📋 Règles de Consolidation Automatique

### 1. Détection Automatique des Workflows Réussis

**TOUJOURS:**
- ✅ Détecter automatiquement les workflows réussis
- ✅ Identifier les patterns communs dans les succès
- ✅ Grouper les workflows similaires
- ✅ Calculer taux de succès

**Pattern:**
```typescript
// Détecter workflows réussis automatiquement
async function detectSuccessfulWorkflows(
  history: ActionHistory[],
  minSuccessRate: number = 0.8
): Promise<SuccessfulWorkflows> {
  // 1. Grouper actions par type de tâche
  const groupedByTaskType = groupByTaskType(history);
  
  // 2. Analyser chaque groupe
  const successfulWorkflows: SuccessfulWorkflow[] = [];
  
  for (const [taskType, actions] of Object.entries(groupedByTaskType)) {
    // 3. Calculer taux de succès
    const successRate = calculateSuccessRate(actions);
    
    // 4. Si taux de succès > seuil
    if (successRate >= minSuccessRate && actions.length >= 3) {
      // 5. Extraire pattern commun
      const commonPattern = extractCommonPattern(actions);
      
      // 6. Créer workflow consolidé
      const consolidatedWorkflow = createConsolidatedWorkflow(
        taskType,
        commonPattern,
        successRate,
        actions.length
      );
      
      successfulWorkflows.push(consolidatedWorkflow);
    }
  }
  
  return {
    workflows: successfulWorkflows,
    count: successfulWorkflows.length
  };
}
```

### 2. Consolidation Automatique des Patterns

**TOUJOURS:**
- ✅ Consolider automatiquement les patterns similaires
- ✅ Créer workflows réutilisables
- ✅ Documenter workflows consolidés
- ✅ Valider workflows consolidés

**Pattern:**
```typescript
// Consolider patterns automatiquement
async function consolidatePatternsAutomatically(
  successfulWorkflows: SuccessfulWorkflow[],
  context: Context
): Promise<ConsolidatedWorkflows> {
  // 1. Grouper workflows similaires
  const similarGroups = groupSimilarWorkflows(successfulWorkflows);
  
  // 2. Pour chaque groupe
  const consolidated: ConsolidatedWorkflow[] = [];
  
  for (const group of similarGroups) {
    // 3. Extraire patterns communs
    const commonPatterns = extractCommonPatterns(group);
    
    // 4. Créer workflow consolidé
    const consolidatedWorkflow = createConsolidatedWorkflow(
      group,
      commonPatterns
    );
    
    // 5. Valider workflow consolidé
    const validation = await validateConsolidatedWorkflow(consolidatedWorkflow);
    
    if (validation.valid) {
      // 6. Sauvegarder workflow consolidé
      await saveConsolidatedWorkflow(consolidatedWorkflow);
      
      consolidated.push(consolidatedWorkflow);
    }
  }
  
  return {
    workflows: consolidated,
    count: consolidated.length
  };
}
```

### 3. Réutilisation Automatique des Workflows Consolidés

**TOUJOURS:**
- ✅ Chercher workflows consolidés pour tâches similaires
- ✅ Réutiliser workflows consolidés si pertinents
- ✅ Adapter workflows consolidés au contexte actuel
- ✅ Documenter réutilisation

**Pattern:**
```typescript
// Réutiliser workflows consolidés automatiquement
async function reuseConsolidatedWorkflows(
  task: Task,
  context: Context
): Promise<ReuseResult> {
  // 1. Charger workflows consolidés
  const consolidatedWorkflows = await loadConsolidatedWorkflows();
  
  // 2. Chercher workflows pertinents
  const relevantWorkflows = findRelevantWorkflows(
    consolidatedWorkflows,
    task
  );
  
  // 3. Si workflow pertinent trouvé
  if (relevantWorkflows.length > 0) {
    // 4. Sélectionner meilleur workflow
    const bestWorkflow = selectBestWorkflow(relevantWorkflows, task);
    
    // 5. Adapter au contexte actuel
    const adaptedWorkflow = await adaptWorkflow(bestWorkflow, task, context);
    
    // 6. Valider adaptation
    const validation = await validateAdaptedWorkflow(adaptedWorkflow, task);
    
    if (validation.valid) {
      return {
        reused: true,
        workflow: adaptedWorkflow,
        original: bestWorkflow,
        validation: validation
      };
    }
  }
  
  return {
    reused: false,
    recommendation: 'no-relevant-workflow-found'
  };
}
```

### 4. Mise à Jour Automatique des Workflows Consolidés

**TOUJOURS:**
- ✅ Mettre à jour workflows consolidés avec nouveaux succès
- ✅ Améliorer workflows consolidés basés sur apprentissages
- ✅ Désactiver workflows consolidés si taux de succès baisse
- ✅ Documenter mises à jour

**Pattern:**
```typescript
// Mettre à jour workflows consolidés automatiquement
async function updateConsolidatedWorkflows(
  newSuccess: ActionHistory,
  context: Context
): Promise<UpdateResult> {
  // 1. Charger workflows consolidés
  const consolidatedWorkflows = await loadConsolidatedWorkflows();
  
  // 2. Chercher workflows pertinents
  const relevantWorkflows = findRelevantWorkflows(
    consolidatedWorkflows,
    newSuccess.task
  );
  
  // 3. Pour chaque workflow pertinent
  for (const workflow of relevantWorkflows) {
    // 4. Ajouter nouveau succès
    workflow.history.push(newSuccess);
    
    // 5. Recalculer taux de succès
    workflow.successRate = calculateSuccessRate(workflow.history);
    
    // 6. Si taux de succès baisse significativement
    if (workflow.successRate < 0.6) {
      // 7. Désactiver workflow
      workflow.active = false;
      await saveConsolidatedWorkflow(workflow);
    } else {
      // 8. Améliorer workflow basé sur nouveau succès
      const improvedPattern = improveWorkflowPattern(workflow, newSuccess);
      workflow.pattern = improvedPattern;
      
      // 9. Sauvegarder workflow mis à jour
      await saveConsolidatedWorkflow(workflow);
    }
  }
  
  return {
    updated: relevantWorkflows.length,
    deactivated: relevantWorkflows.filter(w => !w.active).length
  };
}
```

## 🔄 Workflow de Consolidation Automatique

### Workflow: Consolider Workflows Réussis

**Étapes:**
1. Détecter workflows réussis (taux de succès > 80%, 3+ succès)
2. Grouper workflows similaires
3. Extraire patterns communs
4. Créer workflows consolidés
5. Valider workflows consolidés
6. Sauvegarder workflows consolidés
7. Réutiliser pour tâches similaires futures

**Pattern:**
```typescript
async function consolidateWorkflowsAutomatically(
  history: ActionHistory[],
  context: Context
): Promise<ConsolidationResult> {
  // 1. Détecter workflows réussis
  const successfulWorkflows = await detectSuccessfulWorkflows(history);
  
  // 2. Consolider patterns
  const consolidated = await consolidatePatternsAutomatically(
    successfulWorkflows.workflows,
    context
  );
  
  // 3. Sauvegarder workflows consolidés
  for (const workflow of consolidated.workflows) {
    await saveConsolidatedWorkflow(workflow);
  }
  
  return {
    detected: successfulWorkflows.count,
    consolidated: consolidated.count,
    workflows: consolidated.workflows
  };
}
```

## ⚠️ Règles de Consolidation Automatique

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer workflows réussis
- ❌ Ne pas consolider patterns similaires
- ❌ Ignorer workflows consolidés pour tâches similaires
- ❌ Ne pas mettre à jour workflows consolidés

**TOUJOURS:**
- ✅ Détecter workflows réussis automatiquement
- ✅ Consolider patterns similaires
- ✅ Réutiliser workflows consolidés
- ✅ Mettre à jour workflows consolidés

## 📊 Checklist Consolidation Automatique

### Après Plusieurs Succès Similaires

- [ ] Détecter workflows réussis (3+ succès, taux > 80%)
- [ ] Grouper workflows similaires
- [ ] Extraire patterns communs
- [ ] Créer workflows consolidés
- [ ] Valider workflows consolidés
- [ ] Sauvegarder workflows consolidés

### Pour Tâches Similaires Futures

- [ ] Chercher workflows consolidés pertinents
- [ ] Réutiliser workflows consolidés si trouvés
- [ ] Adapter au contexte actuel
- [ ] Documenter réutilisation

### Maintenance

- [ ] Mettre à jour workflows consolidés avec nouveaux succès
- [ ] Désactiver workflows si taux de succès baisse
- [ ] Améliorer workflows basés sur apprentissages

## 🔗 Références

- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages
- `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage avancées
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes

---

**Note:** Cette règle garantit que l'agent consolide automatiquement les workflows réussis en patterns réutilisables pour améliorer l'efficacité future.

