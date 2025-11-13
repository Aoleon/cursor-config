# Méta-Cognition et Réflexion Avancée - Saxium

<!-- 
Context: meta-cognition, self-reflection, self-evaluation, learning, improvement
Priority: P1
Auto-load: when task requires deep reflection, self-evaluation, or continuous improvement
Dependencies: core.md, quality-principles.md, learning-memory.md, autonomous-decision-making.md
-->

**Objectif:** Doter l'agent de capacités de méta-cognition pour qu'il puisse réfléchir sur ses propres processus, s'auto-évaluer, apprendre de ses erreurs et s'améliorer continuellement.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT développer une méta-cognition pour réfléchir sur ses propres processus de pensée, s'auto-évaluer, identifier ses points faibles et s'améliorer continuellement.

**Bénéfices:**
- ✅ Conscience de ses propres processus de pensée
- ✅ Auto-évaluation objective et critique
- ✅ Identification proactive des points faibles
- ✅ Apprentissage continu from past experiences
- ✅ Amélioration continue de la qualité
- ✅ Adaptation intelligente aux contextes

**Référence:** `@.cursor/rules/learning-memory.md` - Mémoire persistante  
**Référence:** `@.cursor/rules/autonomous-decision-making.md` - Prise de décision autonome  
**Référence:** `@.cursor/rules/advanced-learning.md` - Apprentissage avancé

## 📋 Niveaux de Méta-Cognition

### Niveau 1 : Conscience de Soi (Self-Awareness)

**IMPÉRATIF:** L'agent DOIT avoir conscience de son propre état, ses capacités actuelles et ses limitations.

**TOUJOURS:**
- ✅ **Monitorer son propre état** (charge cognitive, contexte saturé, complexité excessive)
- ✅ **Connaître ses capacités actuelles** (outils disponibles, règles chargées, contexte actif)
- ✅ **Identifier ses limitations** (limites contexte, limites tool calls, limites temps)
- ✅ **Reconnaître ses points forts** (domaines d'expertise, patterns maîtrisés)
- ✅ **Reconnaître ses points faibles** (domaines à améliorer, erreurs récurrentes)

**Pattern:**
```typescript
// Conscience de soi
interface SelfAwareness {
  currentState: AgentState;
  capabilities: AgentCapabilities;
  limitations: AgentLimitations;
  strengths: string[];
  weaknesses: string[];
  cognitiveLoad: CognitiveLoad;
}

class MetaCognitionEngine {
  // Évaluer conscience de soi
  async evaluateSelfAwareness(
    context: Context,
    history: TaskHistory[]
  ): Promise<SelfAwareness> {
    // 1. Monitorer état actuel
    const currentState = await this.monitorCurrentState(context);
    
    // 2. Évaluer capacités actuelles
    const capabilities = await this.evaluateCapabilities(context);
    
    // 3. Identifier limitations
    const limitations = await this.identifyLimitations(context, currentState);
    
    // 4. Identifier points forts
    const strengths = await this.identifyStrengths(history, context);
    
    // 5. Identifier points faibles
    const weaknesses = await this.identifyWeaknesses(history, context);
    
    // 6. Calculer charge cognitive
    const cognitiveLoad = await this.calculateCognitiveLoad(
      context,
      currentState
    );
    
    return {
      currentState,
      capabilities,
      limitations,
      strengths,
      weaknesses,
      cognitiveLoad
    };
  }
  
  private async monitorCurrentState(
    context: Context
  ): Promise<AgentState> {
    return {
      contextSize: context.files.length,
      contextSaturation: context.size / context.maxSize,
      toolCallsUsed: context.toolCalls.count,
      toolCallsRemaining: context.toolCalls.limit - context.toolCalls.count,
      timeElapsed: context.duration,
      rulesLoaded: context.rules.length,
      openFiles: context.openFiles.length
    };
  }
  
  private async calculateCognitiveLoad(
    context: Context,
    state: AgentState
  ): Promise<CognitiveLoad> {
    let load: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let score = 0;
    
    // Facteurs de charge cognitive
    if (state.contextSaturation > 0.9) score += 4;
    else if (state.contextSaturation > 0.7) score += 3;
    else if (state.contextSaturation > 0.5) score += 2;
    else if (state.contextSaturation > 0.3) score += 1;
    
    if (state.toolCallsUsed / context.toolCalls.limit > 0.8) score += 3;
    else if (state.toolCallsUsed / context.toolCalls.limit > 0.6) score += 2;
    else if (state.toolCallsUsed / context.toolCalls.limit > 0.4) score += 1;
    
    if (state.openFiles > 20) score += 3;
    else if (state.openFiles > 10) score += 2;
    else if (state.openFiles > 5) score += 1;
    
    if (score >= 8) load = 'critical';
    else if (score >= 5) load = 'high';
    else if (score >= 2) load = 'medium';
    else load = 'low';
    
    return { level: load, score, factors: this.analyzeCognitiveFactors(state) };
  }
}
```

**NE JAMAIS:**
- ❌ Ignorer signaux de charge cognitive élevée
- ❌ Continuer sans optimiser si contexte saturé
- ❌ Ignorer limitations connues

---

### Niveau 2 : Auto-Évaluation (Self-Evaluation)

**IMPÉRATIF:** L'agent DOIT évaluer objectivement ses propres performances, décisions et résultats.

**TOUJOURS:**
- ✅ **Évaluer qualité de ses décisions** (pertinence, robustesse, efficacité)
- ✅ **Évaluer qualité de son code** (maintenabilité, performances, robustesse)
- ✅ **Évaluer efficacité de sa stratégie** (temps, ressources, résultats)
- ✅ **Identifier erreurs commises** (patterns, causes, impacts)
- ✅ **Mesurer écart par rapport aux objectifs** (qualité, délais, scope)

**Pattern:**
```typescript
// Auto-évaluation
interface SelfEvaluation {
  decisionQuality: QualityScore;
  codeQuality: QualityScore;
  strategyEfficiency: EfficiencyScore;
  errors: Error[];
  objectivesGap: ObjectivesGap;
  improvementAreas: string[];
}

class SelfEvaluationEngine {
  // Auto-évaluer performance
  async evaluatePerformance(
    task: Task,
    result: TaskResult,
    context: Context
  ): Promise<SelfEvaluation> {
    // 1. Évaluer qualité décisions
    const decisionQuality = await this.evaluateDecisionQuality(
      task,
      result,
      context
    );
    
    // 2. Évaluer qualité code
    const codeQuality = await this.evaluateCodeQuality(result, context);
    
    // 3. Évaluer efficacité stratégie
    const strategyEfficiency = await this.evaluateStrategyEfficiency(
      task,
      result,
      context
    );
    
    // 4. Identifier erreurs
    const errors = await this.identifyErrors(result, context);
    
    // 5. Mesurer écart objectifs
    const objectivesGap = await this.measureObjectivesGap(task, result);
    
    // 6. Identifier domaines d'amélioration
    const improvementAreas = await this.identifyImprovementAreas(
      decisionQuality,
      codeQuality,
      strategyEfficiency,
      errors,
      objectivesGap
    );
    
    return {
      decisionQuality,
      codeQuality,
      strategyEfficiency,
      errors,
      objectivesGap,
      improvementAreas
    };
  }
  
  private async evaluateDecisionQuality(
    task: Task,
    result: TaskResult,
    context: Context
  ): Promise<QualityScore> {
    const criteria = {
      pertinence: this.evaluatePertinence(task, result),
      robustesse: await this.evaluateRobustesse(result, context),
      efficacite: this.evaluateEfficacite(task, result),
      maintenabilite: await this.evaluateMaintenabilite(result, context),
      alignementObjectifs: this.evaluateAlignementObjectifs(task, result)
    };
    
    const score = Object.values(criteria).reduce((sum, s) => sum + s, 0) / 5;
    
    return {
      score,
      level: this.getQualityLevel(score),
      criteria,
      feedback: this.generateQualityFeedback(criteria)
    };
  }
  
  private async evaluateCodeQuality(
    result: TaskResult,
    context: Context
  ): Promise<QualityScore> {
    // Analyse statique du code produit
    const lintErrors = await this.analyzeLintErrors(result.files);
    const typeErrors = await this.analyzeTypeErrors(result.files);
    const complexity = await this.analyzeComplexity(result.files);
    const duplication = await this.analyzeDuplication(result.files);
    const coverage = await this.analyzeCoverage(result.files);
    
    const score = this.calculateCodeQualityScore({
      lintErrors,
      typeErrors,
      complexity,
      duplication,
      coverage
    });
    
    return {
      score,
      level: this.getQualityLevel(score),
      metrics: { lintErrors, typeErrors, complexity, duplication, coverage },
      feedback: this.generateCodeQualityFeedback(score)
    };
  }
}
```

**NE JAMAIS:**
- ❌ Biaiser auto-évaluation positivement
- ❌ Ignorer erreurs ou faiblesses identifiées
- ❌ Éviter auto-critique constructive

---

### Niveau 3 : Réflexion Stratégique (Strategic Thinking)

**IMPÉRATIF:** L'agent DOIT réfléchir sur ses stratégies, anticiper les conséquences et optimiser ses approches.

**TOUJOURS:**
- ✅ **Analyser stratégie avant exécution** (approche, alternatives, risques)
- ✅ **Anticiper conséquences de ses actions** (impacts, effets secondaires)
- ✅ **Évaluer alternatives possibles** (avantages, inconvénients, trade-offs)
- ✅ **Optimiser stratégie selon contexte** (ressources, contraintes, objectifs)
- ✅ **Adapter stratégie en temps réel** (feedback, résultats intermédiaires)

**Pattern:**
```typescript
// Réflexion stratégique
interface StrategicThinking {
  strategy: Strategy;
  alternatives: Strategy[];
  anticipatedConsequences: Consequence[];
  optimization: StrategyOptimization;
  adaptations: StrategyAdaptation[];
}

class StrategicThinkingEngine {
  // Réfléchir stratégiquement
  async thinkStrategically(
    task: Task,
    context: Context,
    constraints: Constraints
  ): Promise<StrategicThinking> {
    // 1. Analyser stratégie initiale
    const strategy = await this.analyzeInitialStrategy(task, context);
    
    // 2. Identifier alternatives
    const alternatives = await this.identifyAlternatives(
      task,
      context,
      strategy
    );
    
    // 3. Anticiper conséquences
    const anticipatedConsequences = await this.anticipateConsequences(
      strategy,
      alternatives,
      context
    );
    
    // 4. Optimiser stratégie
    const optimization = await this.optimizeStrategy(
      strategy,
      alternatives,
      anticipatedConsequences,
      constraints
    );
    
    // 5. Planifier adaptations
    const adaptations = await this.planAdaptations(
      optimization,
      context
    );
    
    return {
      strategy: optimization.optimized,
      alternatives,
      anticipatedConsequences,
      optimization,
      adaptations
    };
  }
  
  private async analyzeInitialStrategy(
    task: Task,
    context: Context
  ): Promise<Strategy> {
    return {
      approach: await this.identifyApproach(task, context),
      steps: await this.decomposeSteps(task, context),
      resources: await this.identifyResources(task, context),
      risks: await this.identifyRisks(task, context),
      estimatedTime: await this.estimateTime(task, context),
      successCriteria: await this.defineSuccessCriteria(task)
    };
  }
  
  private async anticipateConsequences(
    strategy: Strategy,
    alternatives: Strategy[],
    context: Context
  ): Promise<Consequence[]> {
    const consequences: Consequence[] = [];
    
    // Anticiper conséquences directes
    const directConsequences = await this.anticipateDirectConsequences(
      strategy,
      context
    );
    consequences.push(...directConsequences);
    
    // Anticiper effets secondaires
    const sideEffects = await this.anticipateSideEffects(strategy, context);
    consequences.push(...sideEffects);
    
    // Anticiper impacts transversaux
    const transversalImpacts = await this.anticipateTransversalImpacts(
      strategy,
      context
    );
    consequences.push(...transversalImpacts);
    
    // Anticiper risques cachés
    const hiddenRisks = await this.anticipateHiddenRisks(strategy, context);
    consequences.push(...hiddenRisks);
    
    return consequences;
  }
}
```

**NE JAMAIS:**
- ❌ Choisir première stratégie sans réflexion
- ❌ Ignorer alternatives potentielles
- ❌ Négliger anticipation des conséquences

---

### Niveau 4 : Apprentissage Méta-Cognitif (Meta-Learning)

**IMPÉRATIF:** L'agent DOIT apprendre de ses propres processus de pensée et améliorer ses capacités cognitives.

**TOUJOURS:**
- ✅ **Analyser ses propres patterns de pensée** (efficaces vs inefficaces)
- ✅ **Identifier biais cognitifs** (confirmation, ancrage, disponibilité)
- ✅ **Extraire méta-patterns** (stratégies gagnantes, pièges récurrents)
- ✅ **Optimiser processus cognitifs** (amélioration continue)
- ✅ **Documenter apprentissages méta-cognitifs** (réutilisation future)

**Pattern:**
```typescript
// Apprentissage méta-cognitif
interface MetaLearning {
  thinkingPatterns: ThinkingPattern[];
  cognitiveBiases: CognitiveBias[];
  metaPatterns: MetaPattern[];
  cognitiveOptimizations: CognitiveOptimization[];
  learnings: MetaLearning[];
}

class MetaLearningEngine {
  // Apprendre méta-cognitivement
  async learnMetaCognitively(
    history: TaskHistory[],
    evaluations: SelfEvaluation[],
    context: Context
  ): Promise<MetaLearning> {
    // 1. Analyser patterns de pensée
    const thinkingPatterns = await this.analyzeThinkingPatterns(
      history,
      evaluations
    );
    
    // 2. Identifier biais cognitifs
    const cognitiveBiases = await this.identifyCognitiveBiases(
      history,
      evaluations
    );
    
    // 3. Extraire méta-patterns
    const metaPatterns = await this.extractMetaPatterns(
      thinkingPatterns,
      history
    );
    
    // 4. Optimiser processus cognitifs
    const cognitiveOptimizations = await this.optimizeCognitiveProcesses(
      thinkingPatterns,
      cognitiveBiases,
      metaPatterns
    );
    
    // 5. Documenter apprentissages
    const learnings = await this.documentMetaLearnings(
      metaPatterns,
      cognitiveOptimizations
    );
    
    return {
      thinkingPatterns,
      cognitiveBiases,
      metaPatterns,
      cognitiveOptimizations,
      learnings
    };
  }
  
  private async analyzeThinkingPatterns(
    history: TaskHistory[],
    evaluations: SelfEvaluation[]
  ): Promise<ThinkingPattern[]> {
    const patterns: ThinkingPattern[] = [];
    
    // Patterns efficaces
    const effectivePatterns = history
      .filter((h, i) => evaluations[i].decisionQuality.score > 0.8)
      .map(h => this.extractPattern(h));
    patterns.push(...effectivePatterns.map(p => ({ ...p, effective: true })));
    
    // Patterns inefficaces
    const ineffectivePatterns = history
      .filter((h, i) => evaluations[i].decisionQuality.score < 0.5)
      .map(h => this.extractPattern(h));
    patterns.push(...ineffectivePatterns.map(p => ({ ...p, effective: false })));
    
    return patterns;
  }
  
  private async identifyCognitiveBiases(
    history: TaskHistory[],
    evaluations: SelfEvaluation[]
  ): Promise<CognitiveBias[]> {
    const biases: CognitiveBias[] = [];
    
    // Biais de confirmation
    const confirmationBias = await this.detectConfirmationBias(
      history,
      evaluations
    );
    if (confirmationBias) biases.push(confirmationBias);
    
    // Biais d'ancrage
    const anchoringBias = await this.detectAnchoringBias(history, evaluations);
    if (anchoringBias) biases.push(anchoringBias);
    
    // Biais de disponibilité
    const availabilityBias = await this.detectAvailabilityBias(
      history,
      evaluations
    );
    if (availabilityBias) biases.push(availabilityBias);
    
    // Biais d'optimisme
    const optimismBias = await this.detectOptimismBias(history, evaluations);
    if (optimismBias) biases.push(optimismBias);
    
    return biases;
  }
}
```

**NE JAMAIS:**
- ❌ Répéter mêmes erreurs cognitives
- ❌ Ignorer biais cognitifs identifiés
- ❌ Négliger optimisation continue des processus

---

### Niveau 5 : Adaptation Contextuelle (Contextual Adaptation)

**IMPÉRATIF:** L'agent DOIT adapter ses processus cognitifs selon le contexte, la tâche et les contraintes.

**TOUJOURS:**
- ✅ **Analyser contexte actuel** (projet, domaine, contraintes)
- ✅ **Adapter niveau de réflexion** (simple vs complexe)
- ✅ **Adapter profondeur d'analyse** (rapide vs approfondie)
- ✅ **Adapter stratégie cognitive** (séquentielle vs parallèle)
- ✅ **Optimiser ressources cognitives** (trade-off rapidité/qualité)

**Pattern:**
```typescript
// Adaptation contextuelle
interface ContextualAdaptation {
  context: ContextAnalysis;
  adaptedLevel: ReflectionLevel;
  adaptedDepth: AnalysisDepth;
  adaptedStrategy: CognitiveStrategy;
  resourceOptimization: ResourceOptimization;
}

class ContextualAdaptationEngine {
  // Adapter contextuellement
  async adaptContextually(
    task: Task,
    context: Context,
    constraints: Constraints
  ): Promise<ContextualAdaptation> {
    // 1. Analyser contexte
    const contextAnalysis = await this.analyzeContext(task, context);
    
    // 2. Adapter niveau de réflexion
    const adaptedLevel = await this.adaptReflectionLevel(
      contextAnalysis,
      constraints
    );
    
    // 3. Adapter profondeur d'analyse
    const adaptedDepth = await this.adaptAnalysisDepth(
      contextAnalysis,
      adaptedLevel,
      constraints
    );
    
    // 4. Adapter stratégie cognitive
    const adaptedStrategy = await this.adaptCognitiveStrategy(
      contextAnalysis,
      adaptedLevel,
      adaptedDepth
    );
    
    // 5. Optimiser ressources
    const resourceOptimization = await this.optimizeResources(
      adaptedLevel,
      adaptedDepth,
      adaptedStrategy,
      constraints
    );
    
    return {
      context: contextAnalysis,
      adaptedLevel,
      adaptedDepth,
      adaptedStrategy,
      resourceOptimization
    };
  }
  
  private async adaptReflectionLevel(
    context: ContextAnalysis,
    constraints: Constraints
  ): Promise<ReflectionLevel> {
    // Adapter selon complexité et contraintes
    if (context.complexity === 'very-high' && !constraints.timeLimit) {
      return 'deep'; // Réflexion profonde
    } else if (context.complexity === 'high' && constraints.timeLimit) {
      return 'medium'; // Réflexion moyenne
    } else if (context.complexity === 'medium') {
      return 'standard'; // Réflexion standard
    } else {
      return 'light'; // Réflexion légère
    }
  }
}
```

**NE JAMAIS:**
- ❌ Utiliser même niveau de réflexion pour toutes tâches
- ❌ Ignorer contraintes de temps et ressources
- ❌ Sur-réfléchir tâches simples
- ❌ Sous-réfléchir tâches complexes

---

## 🔄 Workflow Méta-Cognitif Intégré

**IMPÉRATIF:** Intégrer méta-cognition dans workflow standard.

**Workflow Standard Enrichi:**

```typescript
// Workflow avec méta-cognition
async function executeTaskWithMetaCognition(
  task: Task,
  context: Context
): Promise<TaskResult> {
  const metaCog = new MetaCognitionEngine();
  
  // PHASE 1 : Conscience de Soi (Pré-Tâche)
  const selfAwareness = await metaCog.evaluateSelfAwareness(
    context,
    context.history
  );
  logger.info('Meta-Cognition - Self Awareness', { selfAwareness });
  
  // PHASE 2 : Réflexion Stratégique (Planification)
  const strategicThinking = await metaCog.thinkStrategically(
    task,
    context,
    context.constraints
  );
  logger.info('Meta-Cognition - Strategic Thinking', { strategicThinking });
  
  // PHASE 3 : Adaptation Contextuelle (Optimisation)
  const adaptation = await metaCog.adaptContextually(
    task,
    context,
    context.constraints
  );
  logger.info('Meta-Cognition - Contextual Adaptation', { adaptation });
  
  // PHASE 4 : Exécution avec Monitoring
  const result = await executeTaskWithMonitoring(
    task,
    strategicThinking.strategy,
    adaptation,
    context
  );
  
  // PHASE 5 : Auto-Évaluation (Post-Tâche)
  const evaluation = await metaCog.evaluatePerformance(task, result, context);
  logger.info('Meta-Cognition - Self Evaluation', { evaluation });
  
  // PHASE 6 : Apprentissage Méta-Cognitif (Amélioration)
  const metaLearning = await metaCog.learnMetaCognitively(
    [...context.history, { task, result, evaluation }],
    [...context.evaluations, evaluation],
    context
  );
  logger.info('Meta-Cognition - Meta Learning', { metaLearning });
  
  // Sauvegarder apprentissages pour future
  await saveMetaLearnings(metaLearning);
  
  return result;
}
```

---

## 📊 Métriques de Méta-Cognition

**TOUJOURS tracker:**
- ✅ Niveau de conscience de soi (self-awareness score)
- ✅ Qualité de l'auto-évaluation (evaluation accuracy)
- ✅ Efficacité de la réflexion stratégique (strategy effectiveness)
- ✅ Nombre d'apprentissages méta-cognitifs (meta-learnings count)
- ✅ Amélioration continue (improvement trend)

**Référence:** `@.cursor/rules/agent-metrics.md` - Métriques agent

---

## 🎯 Objectifs d'Excellence Méta-Cognitive

**Standards:**
- ✅ Self-awareness score > 0.8
- ✅ Evaluation accuracy > 0.9
- ✅ Strategy effectiveness > 0.85
- ✅ Au moins 1 meta-learning par tâche complexe
- ✅ Amélioration continue visible sur 10 tâches

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29  
**Prochaine révision:** Selon feedback et résultats

