# Sélection Intelligente du Modèle IA - Saxium

**Objectif:** Sélectionner automatiquement le modèle IA le plus adapté à chaque tâche pour optimiser les performances, les coûts et la qualité.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT sélectionner automatiquement le modèle IA le plus adapté à chaque tâche selon le type de tâche, les performances historiques, les coûts et les contraintes.

**Bénéfices:**
- ✅ Optimise les performances selon le type de tâche
- ✅ Réduit les coûts en utilisant le modèle le plus adapté
- ✅ Améliore la qualité des réponses
- ✅ S'adapte automatiquement selon le contexte
- ✅ Apprend des performances historiques

## 📋 Règles de Sélection Intelligente

### 1. Analyse Automatique du Type de Tâche

**TOUJOURS:**
- ✅ Analyser automatiquement le type de tâche
- ✅ Identifier les caractéristiques de la tâche
- ✅ Déterminer les besoins en termes de modèle
- ✅ Sélectionner le modèle optimal

**Types de Tâches:**
- **Code/Programmation** → Claude Sonnet 4 (meilleur pour code)
- **Documentation** → Claude Sonnet 4 (meilleur pour français)
- **Analyse Complexe** → GPT-5 (meilleur pour analyses)
- **Requêtes Métier Menuiserie** → Claude Sonnet 4 (meilleur contexte français)
- **Analyses Prédictives** → GPT-5 (meilleur pour ML)
- **Requêtes Multi-Entités** → GPT-5 (meilleure corrélation)

**Pattern:**
```typescript
// Analyser type de tâche automatiquement
async function analyzeTaskType(
  task: Task,
  context: Context
): Promise<TaskTypeAnalysis> {
  // 1. Identifier caractéristiques de la tâche
  const characteristics = identifyTaskCharacteristics(task);
  
  // 2. Classifier type de tâche
  const taskType = classifyTaskType(characteristics);
  
  // 3. Déterminer besoins en modèle
  const modelNeeds = determineModelNeeds(taskType, characteristics);
  
  // 4. Analyser complexité
  const complexity = analyzeComplexity(task, context);
  
  // 5. Analyser contraintes
  const constraints = analyzeConstraints(task, context);
  
  return {
    taskType: taskType,
    characteristics: characteristics,
    modelNeeds: modelNeeds,
    complexity: complexity,
    constraints: constraints
  };
}
```

### 2. Sélection Automatique du Modèle Optimal

**TOUJOURS:**
- ✅ Sélectionner automatiquement le modèle optimal
- ✅ Prendre en compte les performances historiques
- ✅ Prendre en compte les coûts
- ✅ Prendre en compte les contraintes de temps
- ✅ Adapter selon le contexte

**Modèles Disponibles:**
- **Claude Sonnet 4** (`claude-sonnet-4-20250514`)
  - Meilleur pour: Code, Documentation, Contexte français, Menuiserie
  - Coût: 3€/1M tokens input, 15€/1M tokens output
  - Performance: Rapide, excellent contexte français
  
- **GPT-5** (`gpt-5`)
  - Meilleur pour: Analyses complexes, ML, Prédictions, Multi-entités
  - Coût: 5€/1M tokens input, 20€/1M tokens output
  - Performance: Plus précis pour analyses complexes

**Pattern:**
```typescript
// Sélectionner modèle optimal automatiquement
async function selectOptimalModel(
  taskAnalysis: TaskTypeAnalysis,
  context: Context
): Promise<ModelSelection> {
  // 1. Charger performances historiques
  const historicalPerformance = await loadHistoricalPerformance(context);
  
  // 2. Calculer scores pour chaque modèle
  const claudeScore = calculateModelScore(
    'claude_sonnet_4',
    taskAnalysis,
    historicalPerformance
  );
  
  const gptScore = calculateModelScore(
    'gpt_5',
    taskAnalysis,
    historicalPerformance
  );
  
  // 3. Sélectionner modèle avec meilleur score
  let selectedModel: 'claude_sonnet_4' | 'gpt_5';
  let reason: string;
  let confidence: number;
  
  if (gptScore.total > claudeScore.total && taskAnalysis.complexity > 0.7) {
    selectedModel = 'gpt_5';
    reason = `GPT-5 sélectionné: ${gptScore.reason}`;
    confidence = gptScore.confidence;
  } else if (taskAnalysis.taskType === 'menuiserie_business' || 
             taskAnalysis.taskType === 'code' ||
             taskAnalysis.taskType === 'documentation') {
    selectedModel = 'claude_sonnet_4';
    reason = `Claude Sonnet 4 sélectionné: ${claudeScore.reason}`;
    confidence = claudeScore.confidence;
  } else {
    // Par défaut: Claude (meilleur rapport qualité/prix)
    selectedModel = 'claude_sonnet_4';
    reason = 'Claude Sonnet 4 par défaut (meilleur rapport qualité/prix)';
    confidence = 0.7;
  }
  
  // 4. Vérifier disponibilité
  const availability = await checkModelAvailability(selectedModel, context);
  if (!availability.available) {
    // Fallback vers autre modèle
    selectedModel = selectedModel === 'claude_sonnet_4' ? 'gpt_5' : 'claude_sonnet_4';
    reason = `Fallback vers ${selectedModel}: ${availability.reason}`;
    confidence = 0.6;
  }
  
  return {
    model: selectedModel,
    reason: reason,
    confidence: confidence,
    scores: {
      claude: claudeScore,
      gpt: gptScore
    },
    availability: availability
  };
}
```

### 3. Calcul Intelligent du Score de Modèle

**TOUJOURS:**
- ✅ Calculer score basé sur plusieurs critères
- ✅ Prendre en compte performances historiques
- ✅ Prendre en compte coûts
- ✅ Prendre en compte contraintes de temps
- ✅ Prendre en compte qualité attendue

**Critères de Score:**
- **Performance** (40%) - Qualité des réponses historiques
- **Coût** (20%) - Coût estimé de la requête
- **Temps** (20%) - Temps de réponse attendu
- **Adaptation** (20%) - Adaptation au type de tâche

**Pattern:**
```typescript
// Calculer score de modèle
function calculateModelScore(
  model: 'claude_sonnet_4' | 'gpt_5',
  taskAnalysis: TaskTypeAnalysis,
  historicalPerformance: HistoricalPerformance
): ModelScore {
  // 1. Score performance (40%)
  const performanceScore = calculatePerformanceScore(
    model,
    taskAnalysis.taskType,
    historicalPerformance
  );
  
  // 2. Score coût (20%)
  const costScore = calculateCostScore(
    model,
    taskAnalysis.estimatedTokens
  );
  
  // 3. Score temps (20%)
  const timeScore = calculateTimeScore(
    model,
    taskAnalysis.constraints.maxTime
  );
  
  // 4. Score adaptation (20%)
  const adaptationScore = calculateAdaptationScore(
    model,
    taskAnalysis.taskType
  );
  
  // 5. Score total pondéré
  const totalScore = (
    performanceScore * 0.4 +
    costScore * 0.2 +
    timeScore * 0.2 +
    adaptationScore * 0.2
  );
  
  return {
    total: totalScore,
    performance: performanceScore,
    cost: costScore,
    time: timeScore,
    adaptation: adaptationScore,
    reason: generateScoreReason(model, {
      performance: performanceScore,
      cost: costScore,
      time: timeScore,
      adaptation: adaptationScore
    }),
    confidence: calculateConfidence(totalScore, taskAnalysis)
  };
}
```

### 4. Apprentissage des Performances Historiques

**TOUJOURS:**
- ✅ Enregistrer performances de chaque modèle
- ✅ Analyser performances historiques
- ✅ Améliorer sélection basée sur apprentissages
- ✅ Adapter sélection selon résultats

**Pattern:**
```typescript
// Apprendre des performances historiques
async function learnFromHistoricalPerformance(
  model: 'claude_sonnet_4' | 'gpt_5',
  taskType: TaskType,
  result: ModelResult,
  context: Context
): Promise<void> {
  // 1. Enregistrer performance
  await recordPerformance({
    model: model,
    taskType: taskType,
    result: result,
    timestamp: Date.now(),
    metadata: {
      quality: result.quality,
      cost: result.cost,
      time: result.time,
      success: result.success
    }
  });
  
  // 2. Analyser performance
  const analysis = analyzePerformance(model, taskType, result);
  
  // 3. Mettre à jour scores historiques
  await updateHistoricalScores(model, taskType, analysis);
  
  // 4. Ajuster sélection future si nécessaire
  if (analysis.shouldAdjustSelection) {
    await adjustModelSelection(model, taskType, analysis);
  }
}
```

### 5. Optimisation des Coûts

**TOUJOURS:**
- ✅ Estimer coûts avant sélection
- ✅ Optimiser coûts tout en maintenant qualité
- ✅ Utiliser modèle moins cher si qualité suffisante
- ✅ Documenter décisions de coût

**Pattern:**
```typescript
// Optimiser coûts
async function optimizeCosts(
  taskAnalysis: TaskTypeAnalysis,
  modelSelection: ModelSelection,
  context: Context
): Promise<CostOptimization> {
  // 1. Estimer coûts pour chaque modèle
  const claudeCost = estimateCost('claude_sonnet_4', taskAnalysis);
  const gptCost = estimateCost('gpt_5', taskAnalysis);
  
  // 2. Analyser différence de coût
  const costDifference = gptCost.total - claudeCost.total;
  
  // 3. Si différence significative et qualité suffisante avec Claude
  if (costDifference > 0.01 && // > 1 centime
      taskAnalysis.complexity < 0.7 &&
      modelSelection.model === 'gpt_5') {
    // 4. Vérifier si Claude peut suffire
    const claudeQuality = await estimateQuality('claude_sonnet_4', taskAnalysis);
    
    if (claudeQuality >= taskAnalysis.requiredQuality * 0.9) {
      // 5. Recommander Claude pour économie
      return {
        optimized: true,
        recommendedModel: 'claude_sonnet_4',
        costSavings: costDifference,
        qualityImpact: claudeQuality - taskAnalysis.requiredQuality,
        reason: `Économie de ${costDifference.toFixed(4)}€ avec Claude (qualité suffisante)`
      };
    }
  }
  
  return {
    optimized: false,
    recommendedModel: modelSelection.model,
    costSavings: 0,
    qualityImpact: 0,
    reason: 'Modèle optimal déjà sélectionné'
  };
}
```

## 🔄 Workflow de Sélection Intelligente

### Workflow: Sélectionner Modèle Optimal

**Étapes:**
1. Analyser type de tâche
2. Charger performances historiques
3. Calculer scores pour chaque modèle
4. Sélectionner modèle optimal
5. Optimiser coûts si possible
6. Vérifier disponibilité
7. Appliquer sélection
8. Enregistrer performance pour apprentissage

**Pattern:**
```typescript
async function selectModelIntelligently(
  task: Task,
  context: Context
): Promise<IntelligentModelSelection> {
  // 1. Analyser type de tâche
  const taskAnalysis = await analyzeTaskType(task, context);
  
  // 2. Charger performances historiques
  const historicalPerformance = await loadHistoricalPerformance(context);
  
  // 3. Sélectionner modèle optimal
  const modelSelection = await selectOptimalModel(taskAnalysis, context);
  
  // 4. Optimiser coûts
  const costOptimization = await optimizeCosts(taskAnalysis, modelSelection, context);
  
  // 5. Appliquer optimisation si recommandée
  if (costOptimization.optimized) {
    modelSelection.model = costOptimization.recommendedModel;
    modelSelection.reason = costOptimization.reason;
  }
  
  // 6. Vérifier disponibilité finale
  const availability = await checkModelAvailability(modelSelection.model, context);
  
  return {
    model: modelSelection.model,
    reason: modelSelection.reason,
    confidence: modelSelection.confidence,
    taskAnalysis: taskAnalysis,
    costOptimization: costOptimization,
    availability: availability,
    historicalPerformance: historicalPerformance
  };
}
```

## ⚠️ Règles de Sélection Intelligente

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer le type de tâche lors de la sélection
- ❌ Ignorer les performances historiques
- ❌ Ignorer les coûts
- ❌ Ne pas apprendre des performances

**TOUJOURS:**
- ✅ Analyser type de tâche avant sélection
- ✅ Prendre en compte performances historiques
- ✅ Optimiser coûts tout en maintenant qualité
- ✅ Enregistrer performances pour apprentissage

## 📊 Checklist Sélection Intelligente

### Avant Sélection

- [ ] Analyser type de tâche
- [ ] Charger performances historiques
- [ ] Calculer scores pour chaque modèle
- [ ] Optimiser coûts si possible

### Pendant Sélection

- [ ] Sélectionner modèle optimal
- [ ] Vérifier disponibilité
- [ ] Appliquer sélection

### Après Sélection

- [ ] Enregistrer performance
- [ ] Analyser résultats
- [ ] Ajuster sélection future si nécessaire

## 🔗 Références

- `@server/services/AIService.ts` - Service IA avec sélection de modèle
- `@.cursor/rules/performance.md` - Optimisations performance
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages

---

**Note:** Cette règle garantit que l'agent sélectionne automatiquement le modèle IA le plus adapté à chaque tâche pour optimiser les performances, les coûts et la qualité.

