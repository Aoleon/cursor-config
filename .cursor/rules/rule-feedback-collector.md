# Collecte Feedback Règles - Saxium

**Objectif:** Collecter automatiquement du feedback sur l'efficacité des règles pour améliorer continuellement le système.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT collecter automatiquement du feedback sur l'efficacité des règles pour permettre l'amélioration continue.

**Bénéfices:**
- ✅ Amélioration continue basée sur données réelles
- ✅ Identification règles inefficaces
- ✅ Adaptation automatique
- ✅ Optimisation continue

## 📊 Collecte Feedback

### 1. Feedback Automatique

**TOUJOURS:**
- ✅ Enregistrer résultat chaque tâche (succès/échec)
- ✅ Enregistrer règles utilisées
- ✅ Enregistrer qualité code généré
- ✅ Enregistrer temps résolution

**Pattern:**
```typescript
// Collecter feedback automatique
function collectAutomaticFeedback(task: Task, result: TaskResult) {
  const feedback = {
    taskId: task.id,
    timestamp: new Date().toISOString(),
    rulesUsed: task.rulesLoaded,
    success: result.success,
    quality: result.codeQualityScore,
    duration: result.duration,
    errors: result.errors,
    iterations: result.iterations
  };
  
  saveFeedback(feedback);
}
```

### 2. Feedback Utilisateur Implicite

**TOUJOURS:**
- ✅ Détecter corrections manuelles (indique problème)
- ✅ Détecter rejets de code (indique inadaptation)
- ✅ Détecter modifications après génération (indique amélioration nécessaire)
- ✅ Analyser patterns de modifications

**Pattern:**
```typescript
// Détecter feedback implicite
function detectImplicitFeedback(generatedCode: string, finalCode: string) {
  const changes = diff(generatedCode, finalCode);
  
  return {
    hasManualCorrections: changes.length > 0,
    correctionCount: changes.length,
    correctionTypes: analyzeCorrectionTypes(changes),
    indicatesIssue: changes.length > 5 // Seuil arbitraire
  };
}
```

### 3. Feedback Métriques

**TOUJOURS:**
- ✅ Enregistrer métriques performance
- ✅ Enregistrer métriques qualité
- ✅ Enregistrer métriques utilisation
- ✅ Corréler avec règles utilisées

**Pattern:**
```typescript
// Collecter feedback métriques
function collectMetricsFeedback(metrics: AgentMetrics) {
  const feedback = {
    performance: {
      duration: metrics.duration,
      toolCalls: metrics.toolCallsCount,
      contextUsage: metrics.contextUsage
    },
    quality: {
      success: metrics.success,
      errorsBefore: metrics.errorsBefore,
      errorsAfter: metrics.errorsAfter,
      qualityScore: metrics.qualityScore
    },
    usage: {
      rulesUsed: metrics.rulesUsed,
      rulesEffective: detectEffectiveRules(metrics)
    }
  };
  
  saveFeedback(feedback);
}
```

## 🔍 Analyse Feedback

### 1. Identification Règles Efficaces

**TOUJOURS:**
- ✅ Analyser corrélation règles → succès
- ✅ Identifier règles avec taux succès élevé
- ✅ Identifier règles avec amélioration qualité
- ✅ Promouvoir règles efficaces

**Pattern:**
```typescript
// Analyser efficacité règles
function analyzeRuleEffectiveness(feedback: Feedback[]) {
  const ruleStats = {};
  
  for (const fb of feedback) {
    for (const rule of fb.rulesUsed) {
      if (!ruleStats[rule]) {
        ruleStats[rule] = {
          uses: 0,
          successes: 0,
          qualityImprovements: 0
        };
      }
      
      ruleStats[rule].uses++;
      if (fb.success) ruleStats[rule].successes++;
      if (fb.quality > 80) ruleStats[rule].qualityImprovements++;
    }
  }
  
  // Calculer taux efficacité
  for (const [rule, stats] of Object.entries(ruleStats)) {
    stats.effectivenessRate = stats.successes / stats.uses;
    stats.qualityRate = stats.qualityImprovements / stats.uses;
  }
  
  return ruleStats;
}
```

### 2. Identification Règles Inefficaces

**TOUJOURS:**
- ✅ Analyser corrélation règles → échecs
- ✅ Identifier règles avec taux succès faible
- ✅ Identifier règles avec dégradation qualité
- ✅ Considérer amélioration ou suppression

**Pattern:**
```typescript
// Identifier règles inefficaces
function identifyIneffectiveRules(ruleStats: RuleStats) {
  const ineffective = [];
  
  for (const [rule, stats] of Object.entries(ruleStats)) {
    if (stats.effectivenessRate < 0.5 || stats.qualityRate < 0.3) {
      ineffective.push({
        rule,
        effectivenessRate: stats.effectivenessRate,
        qualityRate: stats.qualityRate,
        recommendation: stats.effectivenessRate < 0.3 ? 'remove' : 'improve'
      });
    }
  }
  
  return ineffective;
}
```

### 3. Suggestions Amélioration

**TOUJOURS:**
- ✅ Générer suggestions basées sur feedback
- ✅ Prioriser suggestions par impact
- ✅ Proposer modifications règles
- ✅ Documenter recommandations

**Pattern:**
```typescript
// Générer suggestions
function generateSuggestions(feedback: Feedback[], ruleStats: RuleStats) {
  const suggestions = [];
  
  // Suggestions pour règles inefficaces
  const ineffective = identifyIneffectiveRules(ruleStats);
  for (const rule of ineffective) {
    suggestions.push({
      type: 'improve-rule',
      rule: rule.rule,
      reason: `Taux efficacité faible: ${rule.effectivenessRate}`,
      priority: 'high'
    });
  }
  
  // Suggestions pour règles manquantes
  const missingRules = detectMissingRules(feedback);
  for (const missing of missingRules) {
    suggestions.push({
      type: 'create-rule',
      topic: missing.topic,
      reason: `Pattern récurrent non couvert`,
      priority: 'medium'
    });
  }
  
  return suggestions;
}
```

## 📝 Enregistrement Feedback

### Format JSON

**Fichier:** `.cursor/rule-feedback.json`

**Structure:**
```json
{
  "feedback": [
    {
      "taskId": "todo-123",
      "timestamp": "2025-11-12T10:30:00Z",
      "rulesUsed": ["core.md", "backend.md"],
      "success": true,
      "quality": 85,
      "duration": 45000,
      "errors": 0,
      "iterations": 2,
      "manualCorrections": 1,
      "userSatisfaction": "high"
    }
  ],
  "summary": {
    "totalFeedback": 150,
    "averageSuccessRate": 0.92,
    "averageQuality": 82,
    "mostEffectiveRules": ["core.md", "backend.md"],
    "leastEffectiveRules": ["advanced-learning.md"]
  }
}
```

### Sauvegarde

**TOUJOURS:**
- ✅ Sauvegarder après chaque tâche
- ✅ Utiliser append mode
- ✅ Valider format JSON
- ✅ Agréger périodiquement

## 🔄 Utilisation Feedback

### 1. Amélioration Règles

**TOUJOURS:**
- ✅ Utiliser feedback pour améliorer règles
- ✅ Modifier règles inefficaces
- ✅ Enrichir règles efficaces
- ✅ Documenter améliorations

### 2. Ajustement Priorité

**TOUJOURS:**
- ✅ Promouvoir règles efficaces
- ✅ Rétrograder règles inefficaces
- ✅ Ajuster selon feedback
- ✅ Documenter changements

### 3. Création Nouvelles Règles

**TOUJOURS:**
- ✅ Identifier patterns non couverts
- ✅ Créer règles pour patterns récurrents
- ✅ Tester nouvelles règles
- ✅ Documenter création

## 🔗 Intégration

### Règles Associées

- `rule-feedback-loop.md` - Boucle feedback (enrichie)
- `agent-metrics.md` - Métriques générales
- `rule-usage-tracker.md` - Usage règles

### Documentation

- `docs/AGENT-FEEDBACK-LOOP.md` - Documentation feedback
- `docs/AGENT-METRICS.md` - Métriques complètes

## ✅ Checklist

**Pendant collecte:**
- [ ] Enregistrer résultat tâche
- [ ] Enregistrer règles utilisées
- [ ] Enregistrer métriques qualité
- [ ] Détecter feedback implicite

**Après collecte:**
- [ ] Analyser efficacité règles
- [ ] Identifier règles inefficaces
- [ ] Générer suggestions
- [ ] Sauvegarder feedback

**Utilisation feedback:**
- [ ] Améliorer règles inefficaces
- [ ] Ajuster priorité règles
- [ ] Créer nouvelles règles si nécessaire
- [ ] Documenter améliorations

---

**Référence:** `@docs/AGENT-FEEDBACK-LOOP.md` - Documentation complète feedback

