<!-- 
Context: reinforcement-learning, Q-learning, rewards, penalties, exploration-exploitation, strategy-optimization
Priority: P1
Auto-load: when optimizing agent behavior with advanced RL techniques, Q-learning, exploration-exploitation
Dependencies: core.md, reinforcement-learning.md, self-evolution-engine.md, learning-memory.md
Score: 70
-->

# Apprentissage par Renforcement Avancé - Saxium

**Objectif:** Implémenter un système d'apprentissage par renforcement avancé avec Q-learning, exploration-exploitation optimisée et convergence vers stratégies optimales basé sur métriques réelles.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser un système d'apprentissage par renforcement avancé avec Q-learning pour optimiser la sélection de techniques, équilibrer exploration vs exploitation et converger vers des stratégies optimales.

**Bénéfices:**
- ✅ Système récompenses/pénalités basé métriques réelles
- ✅ Apprentissage Q-learning pour sélection techniques
- ✅ Exploration vs exploitation optimisée
- ✅ Convergence vers stratégies optimales
- ✅ Adaptation automatique selon contexte

**Référence:** `@.cursor/rules/reinforcement-learning.md` - Apprentissage par renforcement de base  
**Référence:** `@.cursor/rules/self-evolution-engine.md` - Moteur d'auto-évolution  
**Référence:** `@.cursor/rules/learning-memory.md` - Mémoire persistante

## 📋 Système de Récompenses/Pénalités Avancé

### Métriques Réelles

**TOUJOURS:**
- ✅ Baser récompenses sur métriques réelles (temps, erreurs, qualité)
- ✅ Pénaliser stratégies inefficaces
- ✅ Récompenser stratégies efficaces
- ✅ Ajuster poids selon impact réel

**Pattern:**
```typescript
// Système récompenses/pénalités avancé
interface RewardSystem {
  metrics: RealMetrics;
  rewards: Reward[];
  penalties: Penalty[];
  weightAdjustment: WeightAdjustment;
}

class AdvancedRewardSystem {
  async calculateReward(
    action: AgentAction,
    result: ActionResult,
    context: Context
  ): Promise<Reward> {
    // 1. Collecter métriques réelles
    const metrics = await this.collectRealMetrics(action, result, context);
    
    // 2. Calculer récompense basée sur métriques
    let reward = 0;
    
    // Exemple: try-catch → withErrorHandling() réussi
    if (action.type === 'replace-try-catch' && result.success) {
      reward += 10; // Récompense base
      
      // Bonus selon impact
      if (metrics.errorRateReduction > 0.1) {
        reward += 5; // Bonus réduction erreurs
      }
      if (metrics.codeQualityImprovement > 0.2) {
        reward += 3; // Bonus qualité code
      }
      if (metrics.executionTimeReduction > 0.05) {
        reward += 2; // Bonus performance
      }
    }
    
    // Exemple: Migration big-bang échoue
    if (action.type === 'migration-big-bang' && !result.success) {
      reward -= 5; // Pénalité base
      
      // Pénalité selon impact
      if (metrics.errorCount > 10) {
        reward -= 10; // Pénalité erreurs nombreuses
      }
      if (metrics.rollbackRequired) {
        reward -= 5; // Pénalité rollback
      }
    }
    
    // Exemple: Migration progressive réussie
    if (action.type === 'migration-incremental' && result.success) {
      reward += 15; // Récompense base (plus élevée que big-bang)
      
      // Bonus selon progression
      if (metrics.modulesMigrated > 0) {
        reward += metrics.modulesMigrated * 2; // Bonus par module
      }
      if (metrics.testsPassing) {
        reward += 5; // Bonus tests passent
      }
    }
    
    return {
      value: reward,
      metrics,
      action,
      result,
      timestamp: Date.now()
    };
  }
  
  private async collectRealMetrics(
    action: AgentAction,
    result: ActionResult,
    context: Context
  ): Promise<RealMetrics> {
    return {
      executionTime: result.executionTime,
      errorRate: result.errorCount / result.totalOperations,
      codeQuality: await this.measureCodeQuality(result, context),
      testCoverage: await this.measureTestCoverage(result, context),
      maintainability: await this.measureMaintainability(result, context),
      errorRateReduction: this.calculateErrorRateReduction(result, context),
      codeQualityImprovement: this.calculateCodeQualityImprovement(result, context),
      executionTimeReduction: this.calculateExecutionTimeReduction(result, context),
      errorCount: result.errorCount,
      rollbackRequired: result.rollbackRequired,
      modulesMigrated: result.modulesMigrated || 0,
      testsPassing: result.testsPassing || false
    };
  }
}
```

**Exemples Récompenses/Pénalités:**

| Action | Résultat | Récompense/Pénalité | Raison |
|--------|----------|---------------------|--------|
| try-catch → withErrorHandling() | ✅ Succès | +10 à +20 | Standardisation réussie |
| Migration big-bang | ❌ Échec | -5 à -20 | Approche risquée échoue |
| Migration progressive | ✅ Succès | +15 à +30 | Approche sûre réussit |
| Typage any → Type spécifique | ✅ Succès | +8 à +15 | Amélioration qualité |
| Fichier monolithique → Modules | ✅ Succès | +12 à +25 | Réduction dette technique |

## 🧠 Apprentissage Q-Learning

### Q-Table et Q-Function

**TOUJOURS:**
- ✅ Maintenir Q-table pour états/actions
- ✅ Mettre à jour Q-values selon récompenses
- ✅ Sélectionner actions avec meilleure Q-value
- ✅ Explorer nouvelles actions périodiquement

**Pattern:**
```typescript
// Q-Learning pour sélection techniques
interface QLearningSystem {
  qTable: QTable;
  learningRate: number;
  discountFactor: number;
  explorationRate: number;
}

class QLearningEngine {
  private qTable: Map<string, Map<string, number>> = new Map();
  private learningRate = 0.1;
  private discountFactor = 0.9;
  private explorationRate = 0.2; // 20% exploration, 80% exploitation
  
  async selectAction(
    state: AgentState,
    availableActions: AgentAction[],
    context: Context
  ): Promise<AgentAction> {
    // 1. Calculer Q-values pour chaque action
    const qValues = await Promise.all(
      availableActions.map(action => 
        this.getQValue(state, action, context)
      )
    );
    
    // 2. Exploration vs Exploitation
    if (Math.random() < this.explorationRate) {
      // Exploration: Sélectionner action aléatoire
      return availableActions[Math.floor(Math.random() * availableActions.length)];
    } else {
      // Exploitation: Sélectionner action avec meilleure Q-value
      const maxQValue = Math.max(...qValues);
      const bestActionIndex = qValues.indexOf(maxQValue);
      return availableActions[bestActionIndex];
    }
  }
  
  async updateQValue(
    state: AgentState,
    action: AgentAction,
    reward: Reward,
    nextState: AgentState,
    context: Context
  ): Promise<void> {
    // 1. Obtenir Q-value actuelle
    const currentQ = await this.getQValue(state, action, context);
    
    // 2. Calculer Q-value maximale pour état suivant
    const nextStateActions = await this.getAvailableActions(nextState, context);
    const nextQValues = await Promise.all(
      nextStateActions.map(a => this.getQValue(nextState, a, context))
    );
    const maxNextQ = nextQValues.length > 0 ? Math.max(...nextQValues) : 0;
    
    // 3. Mettre à jour Q-value (formule Q-learning)
    const newQ = currentQ + this.learningRate * (
      reward.value + this.discountFactor * maxNextQ - currentQ
    );
    
    // 4. Sauvegarder Q-value
    await this.setQValue(state, action, newQ, context);
  }
  
  private async getQValue(
    state: AgentState,
    action: AgentAction,
    context: Context
  ): Promise<number> {
    const stateKey = this.getStateKey(state);
    const actionKey = this.getActionKey(action);
    
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }
    
    const stateQTable = this.qTable.get(stateKey)!;
    return stateQTable.get(actionKey) || 0; // Q-value initiale: 0
  }
  
  private async setQValue(
    state: AgentState,
    action: AgentAction,
    qValue: number,
    context: Context
  ): Promise<void> {
    const stateKey = this.getStateKey(state);
    const actionKey = this.getActionKey(action);
    
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Map());
    }
    
    const stateQTable = this.qTable.get(stateKey)!;
    stateQTable.set(actionKey, qValue);
    
    // Sauvegarder Q-table
    await this.saveQTable(context);
  }
}
```

**Exemple Q-Table:**

| État | Action | Q-Value | Apprentissage |
|------|--------|---------|---------------|
| "741 try-catch détectés" | "Remplacer par withErrorHandling()" | 15.2 | ✅ Réussi plusieurs fois |
| "Migration nécessaire" | "Migration big-bang" | -3.5 | ❌ Échoué plusieurs fois |
| "Migration nécessaire" | "Migration progressive" | 18.7 | ✅ Réussi plusieurs fois |
| "933 any détectés" | "Typer avec types spécifiques" | 12.1 | ✅ Réussi plusieurs fois |

## ⚖️ Exploration vs Exploitation Optimisée

### Stratégie Epsilon-Greedy Adaptative

**TOUJOURS:**
- ✅ Ajuster taux d'exploration selon contexte
- ✅ Explorer plus en début d'apprentissage
- ✅ Exploiter plus après convergence
- ✅ Réexplorer si performance dégrade

**Pattern:**
```typescript
// Exploration vs Exploitation optimisée
class AdaptiveExplorationExploitation {
  private baseExplorationRate = 0.2;
  private minExplorationRate = 0.05;
  private maxExplorationRate = 0.5;
  private convergenceThreshold = 0.01; // Variation Q-value < 1%
  
  async calculateExplorationRate(
    learningProgress: LearningProgress,
    context: Context
  ): Promise<number> {
    // 1. Calculer progression apprentissage
    const progress = this.calculateLearningProgress(learningProgress, context);
    
    // 2. Ajuster selon convergence
    if (progress.converged) {
      // Convergé: Réduire exploration
      return Math.max(
        this.minExplorationRate,
        this.baseExplorationRate * (1 - progress.convergenceScore)
      );
    } else {
      // Pas convergé: Maintenir exploration
      return this.baseExplorationRate;
    }
    
    // 3. Réexplorer si performance dégrade
    if (progress.performanceDegrading) {
      return Math.min(
        this.maxExplorationRate,
        this.baseExplorationRate * 2
      );
    }
    
    return this.baseExplorationRate;
  }
  
  private calculateLearningProgress(
    progress: LearningProgress,
    context: Context
  ): LearningProgressAnalysis {
    // Analyser variation Q-values
    const qValueVariance = this.calculateQVariance(progress.qTable, context);
    
    // Vérifier convergence
    const converged = qValueVariance < this.convergenceThreshold;
    
    // Vérifier dégradation performance
    const performanceDegrading = progress.recentRewards.length > 10 &&
      this.calculateAverageReward(progress.recentRewards.slice(-10)) <
      this.calculateAverageReward(progress.recentRewards.slice(-20, -10));
    
    return {
      converged,
      convergenceScore: 1 - (qValueVariance / this.convergenceThreshold),
      performanceDegrading,
      qValueVariance
    };
  }
}
```

## 🎯 Convergence vers Stratégies Optimales

### Détection Convergence et Optimisation

**TOUJOURS:**
- ✅ Détecter convergence Q-values
- ✅ Identifier stratégies optimales
- ✅ Appliquer stratégies optimales
- ✅ Continuer apprentissage même après convergence

**Pattern:**
```typescript
// Convergence vers stratégies optimales
class OptimalStrategyConvergence {
  async detectConvergence(
    qTable: QTable,
    context: Context
  ): Promise<ConvergenceResult> {
    // 1. Analyser variation Q-values
    const variance = await this.calculateQVariance(qTable, context);
    
    // 2. Identifier stratégies optimales
    const optimalStrategies = await this.identifyOptimalStrategies(
      qTable,
      context
    );
    
    // 3. Vérifier convergence
    const converged = variance < 0.01; // Variation < 1%
    
    return {
      converged,
      variance,
      optimalStrategies,
      confidence: this.calculateConfidence(optimalStrategies, context)
    };
  }
  
  private async identifyOptimalStrategies(
    qTable: QTable,
    context: Context
  ): Promise<OptimalStrategy[]> {
    const strategies: OptimalStrategy[] = [];
    
    // Pour chaque état, identifier action avec meilleure Q-value
    for (const [stateKey, stateQTable] of qTable.entries()) {
      let maxQ = -Infinity;
      let bestAction: string | null = null;
      
      for (const [actionKey, qValue] of stateQTable.entries()) {
        if (qValue > maxQ) {
          maxQ = qValue;
          bestAction = actionKey;
        }
      }
      
      if (bestAction && maxQ > 10) { // Seuil Q-value > 10
        strategies.push({
          state: this.parseStateKey(stateKey),
          action: this.parseActionKey(bestAction),
          qValue: maxQ,
          confidence: this.calculateStrategyConfidence(maxQ, context)
        });
      }
    }
    
    return strategies.sort((a, b) => b.qValue - a.qValue);
  }
}
```

## 🔄 Workflow Apprentissage Renforcement Avancé

### Workflow Complet

1. **Observer état** → État actuel agent/tâche
2. **Sélectionner action** → Q-learning (exploration/exploitation)
3. **Exécuter action** → Appliquer action sélectionnée
4. **Recevoir récompense** → Calculer récompense/pénalité
5. **Mettre à jour Q-value** → Apprendre de l'expérience
6. **Détecter convergence** → Identifier stratégies optimales
7. **Appliquer stratégies optimales** → Utiliser apprentissages

**Pattern:**
```typescript
// Workflow complet apprentissage renforcement avancé
class AdvancedReinforcementLearning {
  async executeLearningCycle(
    task: Task,
    context: Context
  ): Promise<LearningCycleResult> {
    // 1. Observer état
    const state = await this.observeState(task, context);
    
    // 2. Sélectionner action (Q-learning)
    const action = await this.qLearningEngine.selectAction(
      state,
      await this.getAvailableActions(state, context),
      context
    );
    
    // 3. Exécuter action
    const result = await this.executeAction(action, task, context);
    
    // 4. Recevoir récompense
    const reward = await this.rewardSystem.calculateReward(
      action,
      result,
      context
    );
    
    // 5. Observer nouvel état
    const nextState = await this.observeState(task, context);
    
    // 6. Mettre à jour Q-value
    await this.qLearningEngine.updateQValue(
      state,
      action,
      reward,
      nextState,
      context
    );
    
    // 7. Détecter convergence
    const convergence = await this.convergenceEngine.detectConvergence(
      this.qLearningEngine.qTable,
      context
    );
    
    // 8. Appliquer stratégies optimales si convergé
    if (convergence.converged) {
      await this.applyOptimalStrategies(convergence.optimalStrategies, context);
    }
    
    return {
      state,
      action,
      result,
      reward,
      nextState,
      convergence,
      improvements: this.calculateImprovements(reward, convergence, context)
    };
  }
}
```

## ⚠️ Règles Apprentissage Renforcement Avancé

### TOUJOURS:

- ✅ Baser récompenses sur métriques réelles
- ✅ Utiliser Q-learning pour sélection actions
- ✅ Équilibrer exploration vs exploitation
- ✅ Détecter convergence vers stratégies optimales
- ✅ Appliquer stratégies optimales identifiées
- ✅ Continuer apprentissage même après convergence
- ✅ Sauvegarder Q-table pour réutilisation

### NE JAMAIS:

- ❌ Ignorer métriques réelles pour récompenses
- ❌ Ne pas utiliser Q-learning pour sélection
- ❌ Ignorer équilibre exploration/exploitation
- ❌ Ne pas détecter convergence
- ❌ Oublier d'appliquer stratégies optimales

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/reinforcement-learning.md` - Apprentissage par renforcement de base
- `@.cursor/rules/self-evolution-engine.md` - Moteur d'auto-évolution
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages

### Documentation Externe

- [Q-Learning Algorithm](https://en.wikipedia.org/wiki/Q-learning)
- [Exploration-Exploitation Trade-off](https://en.wikipedia.org/wiki/Multi-armed_bandit)

---

**Note:** Ce fichier définit un système d'apprentissage par renforcement avancé avec Q-learning, exploration-exploitation optimisée et convergence vers stratégies optimales.

**Version:** 2.0.0  
**Dernière mise à jour:** 2025-01-29

