# Boucle de Feedback pour Règles - Saxium

**Objectif:** Ajuster automatiquement le chargement des règles selon les résultats obtenus pour optimiser continuellement le paramétrage de l'agent.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT ajuster automatiquement le chargement des règles selon les résultats obtenus pour améliorer continuellement le paramétrage.

**Bénéfices:**
- ✅ Ajustement automatique selon résultats
- ✅ Amélioration continue du paramétrage
- ✅ Optimisation basée sur données réelles
- ✅ Réduction des règles inutiles
- ✅ Augmentation des règles efficaces

**Référence:** `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages  
**Référence:** `@.cursor/rules/rule-prioritization.md` - Priorisation dynamique des règles

## 📋 Système de Feedback

### 1. Collecte de Métriques

**TOUJOURS:**
- ✅ Collecter métriques pour chaque règle chargée
- ✅ Mesurer efficacité de chaque règle
- ✅ Tracker utilisation et résultats
- ✅ Documenter succès et échecs

**Pattern:**
```typescript
// Collecte de métriques pour règles
interface RuleMetrics {
  rule: string;
  loaded: number;           // Nombre de fois chargée
  success: number;          // Nombre de succès
  failure: number;          // Nombre d'échecs
  averageScore: number;     // Score moyen d'efficacité
  lastUsed: Date;          // Dernière utilisation
  contexts: string[];      // Contextes où utilisée
}

class RuleMetricsCollector {
  private metrics: Map<string, RuleMetrics> = new Map();
  
  async recordRuleUsage(
    rule: string,
    context: Context,
    result: RuleResult
  ): Promise<void> {
    const existing = this.metrics.get(rule) || {
      rule,
      loaded: 0,
      success: 0,
      failure: 0,
      averageScore: 0,
      lastUsed: new Date(),
      contexts: []
    };
    
    // 1. Mettre à jour métriques
    existing.loaded++;
    existing.lastUsed = new Date();
    
    if (!existing.contexts.includes(context.id)) {
      existing.contexts.push(context.id);
    }
    
    // 2. Enregistrer résultat
    if (result.success) {
      existing.success++;
    } else {
      existing.failure++;
    }
    
    // 3. Calculer score moyen
    const successRate = existing.success / existing.loaded;
    existing.averageScore = successRate * 100;
    
    // 4. Sauvegarder
    this.metrics.set(rule, existing);
    await saveRuleMetrics(existing);
  }
}
```

### 2. Analyse des Résultats

**TOUJOURS:**
- ✅ Analyser efficacité de chaque règle
- ✅ Identifier règles inefficaces
- ✅ Identifier règles très efficaces
- ✅ Détecter patterns de succès/échec

**Pattern:**
```typescript
// Analyser résultats des règles
async function analyzeRuleEffectiveness(
  metrics: RuleMetrics[],
  context: Context
): Promise<RuleAnalysis> {
  const analysis = {
    effective: [] as string[],
    ineffective: [] as string[],
    underused: [] as string[],
    overused: [] as string[],
    recommendations: [] as string[]
  };
  
  for (const metric of metrics) {
    // 1. Identifier règles efficaces (score > 70%)
    if (metric.averageScore > 70 && metric.loaded > 5) {
      analysis.effective.push(metric.rule);
    }
    
    // 2. Identifier règles inefficaces (score < 50%)
    if (metric.averageScore < 50 && metric.loaded > 5) {
      analysis.ineffective.push(metric.rule);
      analysis.recommendations.push(
        `Considérer remplacer ${metric.rule} par alternative plus efficace`
      );
    }
    
    // 3. Identifier règles sous-utilisées (peu chargées mais efficaces)
    if (metric.averageScore > 80 && metric.loaded < 3) {
      analysis.underused.push(metric.rule);
      analysis.recommendations.push(
        `Augmenter priorité de ${metric.rule} (efficace mais peu utilisée)`
      );
    }
    
    // 4. Identifier règles sur-utilisées (beaucoup chargées mais peu efficaces)
    if (metric.averageScore < 60 && metric.loaded > 10) {
      analysis.overused.push(metric.rule);
      analysis.recommendations.push(
        `Réduire priorité de ${metric.rule} (peu efficace mais souvent chargée)`
      );
    }
  }
  
  return analysis;
}
```

### 3. Ajustement Automatique des Priorités

**TOUJOURS:**
- ✅ Ajuster priorités selon métriques
- ✅ Augmenter priorité règles efficaces
- ✅ Réduire priorité règles inefficaces
- ✅ Optimiser chargement selon résultats

**Pattern:**
```typescript
// Ajuster priorités automatiquement
async function adjustRulePriorities(
  analysis: RuleAnalysis,
  currentPriorities: Map<string, number>,
  context: Context
): Promise<Map<string, number>> {
  const adjusted = new Map(currentPriorities);
  
  // 1. Augmenter priorité règles efficaces
  for (const rule of analysis.effective) {
    const current = adjusted.get(rule) || 50;
    adjusted.set(rule, Math.min(100, current + 10));
  }
  
  // 2. Réduire priorité règles inefficaces
  for (const rule of analysis.ineffective) {
    const current = adjusted.get(rule) || 50;
    adjusted.set(rule, Math.max(20, current - 15));
  }
  
  // 3. Augmenter priorité règles sous-utilisées mais efficaces
  for (const rule of analysis.underused) {
    const current = adjusted.get(rule) || 50;
    adjusted.set(rule, Math.min(100, current + 20));
  }
  
  // 4. Réduire priorité règles sur-utilisées mais peu efficaces
  for (const rule of analysis.overused) {
    const current = adjusted.get(rule) || 50;
    adjusted.set(rule, Math.max(20, current - 20));
  }
  
  // 5. Sauvegarder ajustements
  await saveAdjustedPriorities(adjusted, context);
  
  return adjusted;
}
```

### 4. Optimisation Continue

**TOUJOURS:**
- ✅ Optimiser chargement selon résultats
- ✅ Ajuster seuils de priorisation
- ✅ Améliorer détection de contexte
- ✅ Documenter apprentissages

**Pattern:**
```typescript
// Optimisation continue du paramétrage
async function optimizeRuleLoading(
  task: Task,
  context: Context,
  previousResults: RuleResult[]
): Promise<OptimizedRuleSet> {
  // 1. Analyser résultats précédents
  const analysis = await analyzeRuleEffectiveness(
    await getRuleMetrics(context),
    context
  );
  
  // 2. Ajuster priorités
  const adjustedPriorities = await adjustRulePriorities(
    analysis,
    await getCurrentPriorities(context),
    context
  );
  
  // 3. Charger règles avec priorités ajustées
  const ruleSet = await loadRulesWithAdjustedPriorities(
    task,
    context,
    adjustedPriorities
  );
  
  // 4. Documenter optimisation
  await documentOptimization({
    task,
    analysis,
    adjustedPriorities,
    ruleSet,
    timestamp: Date.now()
  });
  
  return ruleSet;
}
```

## 🔄 Workflow de Feedback Loop

### Workflow: Boucle de Feedback Complète

**Étapes:**
1. Charger règles selon contexte
2. Exécuter tâche avec règles chargées
3. Collecter métriques de résultats
4. Analyser efficacité des règles
5. Ajuster priorités selon résultats
6. Optimiser chargement pour prochaine tâche
7. Documenter apprentissages

**Pattern:**
```typescript
async function feedbackLoopWorkflow(
  task: Task,
  context: Context
): Promise<FeedbackLoopResult> {
  // 1. Charger règles initiales
  const initialRules = await loadRulesForTask(task, context);
  
  // 2. Exécuter tâche
  const result = await executeTaskWithRules(task, initialRules, context);
  
  // 3. Collecter métriques
  const metrics = await collectRuleMetrics(initialRules, result, context);
  
  // 4. Analyser efficacité
  const analysis = await analyzeRuleEffectiveness(metrics, context);
  
  // 5. Ajuster priorités
  const adjustedPriorities = await adjustRulePriorities(
    analysis,
    await getCurrentPriorities(context),
    context
  );
  
  // 6. Optimiser pour prochaine tâche
  const optimizedRules = await optimizeRuleLoading(
    task,
    context,
    [result]
  );
  
  // 7. Documenter apprentissages
  await documentLearnings({
    task,
    initialRules,
    result,
    metrics,
    analysis,
    adjustedPriorities,
    optimizedRules
  });
  
  return {
    initialRules,
    result,
    metrics,
    analysis,
    adjustedPriorities,
    optimizedRules
  };
}
```

## ⚠️ Règles de Feedback Loop

### Ne Jamais:

**BLOQUANT:**
- ❌ Ignorer métriques collectées
- ❌ Ne pas ajuster priorités selon résultats
- ❌ Ne pas documenter apprentissages
- ❌ Ignorer règles inefficaces

**TOUJOURS:**
- ✅ Collecter métriques pour chaque règle
- ✅ Analyser efficacité régulièrement
- ✅ Ajuster priorités selon résultats
- ✅ Documenter apprentissages
- ✅ Optimiser chargement continuellement

## 📊 Checklist Feedback Loop

### Avant Exécution

- [ ] Charger règles selon contexte
- [ ] Initialiser collecte de métriques

### Pendant Exécution

- [ ] Tracker utilisation de chaque règle
- [ ] Mesurer efficacité de chaque règle
- [ ] Enregistrer résultats

### Après Exécution

- [ ] Analyser métriques collectées
- [ ] Identifier règles efficaces/inefficaces
- [ ] Ajuster priorités selon résultats
- [ ] Optimiser chargement pour prochaine tâche
- [ ] Documenter apprentissages

## 🔗 Références

- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages
- `@.cursor/rules/rule-prioritization.md` - Priorisation dynamique des règles
- `@.cursor/rules/rule-metrics.md` - Métriques des règles
- `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage avancées

---

**Note:** Cette boucle de feedback permet d'optimiser continuellement le paramétrage de l'agent en ajustant automatiquement le chargement des règles selon les résultats obtenus.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29
