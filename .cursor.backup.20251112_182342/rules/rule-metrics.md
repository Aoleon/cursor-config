# Métriques des Règles - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Système de collecte et analyse des métriques des règles pour mesurer l'efficacité et identifier les règles inefficaces.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT collecter automatiquement des métriques sur l'utilisation et l'efficacité des règles pour améliorer continuellement le système.

**Objectif:** Mesurer l'efficacité des règles, identifier les règles inefficaces, et optimiser le système basé sur les données.

**Bénéfices:**
- ✅ Mesure objective de l'efficacité des règles
- ✅ Identification des règles inefficaces
- ✅ Optimisation basée sur données réelles
- ✅ Amélioration continue du système

## 📊 Métriques Collectées

### Métriques par Règle

**Pour chaque règle P1, collecter:**
- **Utilisation:** Nombre de fois que la règle est chargée
- **Taux de succès:** Pourcentage de fois où la règle a contribué au succès
- **Temps moyen:** Temps moyen d'exécution avec cette règle
- **Itérations nécessaires:** Nombre moyen d'itérations nécessaires
- **Problèmes résolus:** Nombre de problèmes résolus grâce à la règle
- **Problèmes non résolus:** Nombre de problèmes non résolus malgré la règle

**Pattern:**
```typescript
// Métriques par règle
interface RuleMetrics {
  rule: string;
  totalUses: number;
  successCount: number;
  failureCount: number;
  successRate: number; // successCount / totalUses
  averageExecutionTime: number; // en millisecondes
  averageIterations: number;
  problemsResolved: number;
  problemsUnresolved: number;
  lastUsed: Date;
  effectiveness: 'high' | 'medium' | 'low';
}

// Collecte de métriques
class RuleMetricsCollector {
  private metrics: Map<string, RuleMetrics> = new Map();
  
  async collectRuleMetrics(
    rule: string,
    context: Context,
    result: RuleExecutionResult
  ): Promise<void> {
    const existing = this.metrics.get(rule) || this.initializeMetrics(rule);
    
    // Mettre à jour métriques
    existing.totalUses++;
    existing.lastUsed = new Date();
    
    if (result.success) {
      existing.successCount++;
      existing.problemsResolved += result.problemsResolved || 0;
    } else {
      existing.failureCount++;
      existing.problemsUnresolved += result.problemsUnresolved || 0;
    }
    
    existing.averageExecutionTime = this.calculateAverageTime(
      existing.averageExecutionTime,
      result.executionTime,
      existing.totalUses
    );
    
    existing.averageIterations = this.calculateAverageIterations(
      existing.averageIterations,
      result.iterations,
      existing.totalUses
    );
    
    existing.successRate = existing.successCount / existing.totalUses;
    existing.effectiveness = this.calculateEffectiveness(existing);
    
    // Sauvegarder métriques
    this.metrics.set(rule, existing);
    await this.saveMetrics(existing, context);
  }
  
  calculateEffectiveness(metrics: RuleMetrics): 'high' | 'medium' | 'low' {
    // Efficacité basée sur :
    // - Taux de succès (poids 0.5)
    // - Problèmes résolus vs non résolus (poids 0.3)
    // - Temps d'exécution (poids 0.2)
    
    const successScore = metrics.successRate * 0.5;
    const problemScore = metrics.problemsResolved > 0 
      ? (metrics.problemsResolved / (metrics.problemsResolved + metrics.problemsUnresolved)) * 0.3
      : 0;
    const timeScore = metrics.averageExecutionTime < 5000 ? 0.2 : 
                      metrics.averageExecutionTime < 10000 ? 0.1 : 0;
    
    const totalScore = successScore + problemScore + timeScore;
    
    if (totalScore >= 0.7) return 'high';
    if (totalScore >= 0.4) return 'medium';
    return 'low';
  }
}
```

### Métriques Globales

**Métriques système:**
- **Taux de succès global:** Pourcentage de tâches complétées avec succès
- **Temps moyen d'exécution:** Temps moyen pour compléter une tâche
- **Itérations moyennes:** Nombre moyen d'itérations par tâche
- **Règles les plus efficaces:** Top 5 règles par efficacité
- **Règles les moins efficaces:** Bottom 5 règles par efficacité

**Pattern:**
```typescript
// Métriques globales
interface GlobalMetrics {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  globalSuccessRate: number;
  averageExecutionTime: number;
  averageIterations: number;
  mostEffectiveRules: RuleMetrics[];
  leastEffectiveRules: RuleMetrics[];
  lastUpdated: Date;
}

async function collectGlobalMetrics(
  context: Context
): Promise<GlobalMetrics> {
  const allMetrics = await context.getAllRuleMetrics();
  
  return {
    totalTasks: allMetrics.reduce((sum, m) => sum + m.totalUses, 0),
    successfulTasks: allMetrics.reduce((sum, m) => sum + m.successCount, 0),
    failedTasks: allMetrics.reduce((sum, m) => sum + m.failureCount, 0),
    globalSuccessRate: calculateGlobalSuccessRate(allMetrics),
    averageExecutionTime: calculateAverageExecutionTime(allMetrics),
    averageIterations: calculateAverageIterations(allMetrics),
    mostEffectiveRules: allMetrics
      .filter(m => m.effectiveness === 'high')
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5),
    leastEffectiveRules: allMetrics
      .filter(m => m.effectiveness === 'low')
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 5),
    lastUpdated: new Date()
  };
}
```

## 📈 Analyse des Métriques

### Identification des Règles Inefficaces

**Critères d'inefficacité:**
- Taux de succès < 50%
- Problèmes non résolus > problèmes résolus
- Temps d'exécution > 2x moyenne
- Itérations nécessaires > 2x moyenne

**Pattern:**
```typescript
// Identifier règles inefficaces
async function identifyIneffectiveRules(
  context: Context
): Promise<IneffectiveRule[]> {
  const allMetrics = await context.getAllRuleMetrics();
  const globalMetrics = await collectGlobalMetrics(context);
  
  const ineffective: IneffectiveRule[] = [];
  
  for (const metrics of allMetrics) {
    // 1. Vérifier taux de succès
    if (metrics.successRate < 0.5) {
      ineffective.push({
        rule: metrics.rule,
        reason: 'low-success-rate',
        metrics,
        recommendation: 'review-rule-logic'
      });
      continue;
    }
    
    // 2. Vérifier problèmes résolus vs non résolus
    if (metrics.problemsUnresolved > metrics.problemsResolved) {
      ineffective.push({
        rule: metrics.rule,
        reason: 'more-problems-unresolved',
        metrics,
        recommendation: 'improve-rule-effectiveness'
      });
      continue;
    }
    
    // 3. Vérifier temps d'exécution
    if (metrics.averageExecutionTime > globalMetrics.averageExecutionTime * 2) {
      ineffective.push({
        rule: metrics.rule,
        reason: 'slow-execution',
        metrics,
        recommendation: 'optimize-rule-performance'
      });
      continue;
    }
    
    // 4. Vérifier itérations nécessaires
    if (metrics.averageIterations > globalMetrics.averageIterations * 2) {
      ineffective.push({
        rule: metrics.rule,
        reason: 'too-many-iterations',
        metrics,
        recommendation: 'improve-rule-efficiency'
      });
    }
  }
  
  return ineffective;
}
```

### Recommandations d'Optimisation

**Basées sur métriques:**
- Règles inefficaces → Améliorer ou remplacer
- Règles lentes → Optimiser performance
- Règles peu utilisées → Évaluer pertinence
- Règles très efficaces → Réutiliser patterns

**Pattern:**
```typescript
// Générer recommandations d'optimisation
async function generateOptimizationRecommendations(
  context: Context
): Promise<OptimizationRecommendation[]> {
  const recommendations: OptimizationRecommendation[] = [];
  const ineffectiveRules = await identifyIneffectiveRules(context);
  const globalMetrics = await collectGlobalMetrics(context);
  
  // 1. Recommandations pour règles inefficaces
  for (const rule of ineffectiveRules) {
    recommendations.push({
      type: 'improve-rule',
      rule: rule.rule,
      reason: rule.reason,
      priority: 'high',
      action: rule.recommendation,
      expectedImprovement: 'increase-success-rate'
    });
  }
  
  // 2. Recommandations pour règles lentes
  const slowRules = globalMetrics.leastEffectiveRules.filter(
    r => r.averageExecutionTime > globalMetrics.averageExecutionTime * 1.5
  );
  
  for (const rule of slowRules) {
    recommendations.push({
      type: 'optimize-performance',
      rule: rule.rule,
      reason: 'slow-execution',
      priority: 'medium',
      action: 'optimize-rule-performance',
      expectedImprovement: 'reduce-execution-time'
    });
  }
  
  // 3. Recommandations pour réutiliser patterns efficaces
  const effectiveRules = globalMetrics.mostEffectiveRules;
  
  for (const rule of effectiveRules) {
    recommendations.push({
      type: 'reuse-pattern',
      rule: rule.rule,
      reason: 'high-effectiveness',
      priority: 'low',
      action: 'reuse-pattern-in-other-rules',
      expectedImprovement: 'improve-other-rules'
    });
  }
  
  return recommendations;
}
```

## 🔄 Workflow de Collecte de Métriques

### Workflow: Collecter Métriques Après Exécution

**Étapes:**
1. Identifier règles utilisées pendant exécution
2. Collecter métriques pour chaque règle
3. Analyser efficacité de chaque règle
4. Identifier règles inefficaces
5. Générer recommandations d'optimisation
6. Sauvegarder métriques pour historique

## ⚠️ Règles de Collecte de Métriques

### TOUJOURS:
- ✅ Collecter métriques après chaque exécution de règle
- ✅ Analyser efficacité régulièrement
- ✅ Identifier règles inefficaces
- ✅ Générer recommandations d'optimisation
- ✅ Sauvegarder métriques pour historique

### NE JAMAIS:
- ❌ Ignorer métriques collectées
- ❌ Ne pas analyser efficacité
- ❌ Ignorer règles inefficaces
- ❌ Ne pas générer recommandations

## 🔗 Références

- `@.cursor/rules/metrics-dashboard.md` - Dashboard de monitoring
- `@.cursor/rules/rule-feedback-loop.md` - Feedback loop et auto-amélioration
- `@.cursor/rules/rule-self-improvement.md` - Auto-amélioration des règles

