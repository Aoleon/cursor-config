# Chargement Intelligent des Règles - Saxium

**Objectif:** Charger uniquement les règles réellement nécessaires selon le contexte et l'usage réel pour réduire la saturation du contexte et améliorer les performances.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT charger les règles de manière adaptative basée sur l'usage réel et le contexte de la tâche pour optimiser l'efficacité.

**Bénéfices:**
- ✅ Réduction saturation contexte (30-40%)
- ✅ Amélioration performance agent
- ✅ Chargement uniquement règles nécessaires
- ✅ Adaptation automatique selon usage

## 📊 Stratégie de Chargement Adaptatif

### 1. Analyse Usage Réel

**TOUJOURS:**
- ✅ Consulter `rule-usage.json` pour usage réel
- ✅ Identifier règles avec usageRate < 0.3 (peu utilisées)
- ✅ Identifier règles avec usageRate > 0.9 (très utilisées)
- ✅ Adapter priorité selon usage réel

**Pattern:**
```typescript
// Analyser usage réel
const ruleUsage = loadRuleUsage();
const adaptiveStrategy = {
  // Règles très utilisées → charger plus tôt
  highUsageRules: ruleUsage.filter(r => r.usageRate > 0.9),
  // Règles peu utilisées → charger seulement si nécessaire
  lowUsageRules: ruleUsage.filter(r => r.usageRate < 0.3),
  // Règles jamais utilisées → ne pas charger automatiquement
  unusedRules: ruleUsage.filter(r => r.usageRate === 0)
};
```

### 2. Chargement Contextuel Intelligent

**TOUJOURS:**
- ✅ Charger règles P0 (toujours nécessaires)
- ✅ Charger règles P1 selon domaine détecté
- ✅ Charger règles P2 seulement si usage réel > 0.5
- ✅ Éviter charger règles inutilisées

**Pattern:**
```typescript
// Chargement adaptatif
function loadRulesAdaptively(context: TaskContext, ruleUsage: RuleUsage) {
  const rulesToLoad = [];
  
  // P0: Toujours charger
  rulesToLoad.push(...P0_RULES);
  
  // P1: Charger selon domaine + usage
  const domainRules = getDomainRules(context.domain);
  for (const rule of domainRules) {
    const usage = ruleUsage[rule.name];
    if (!usage || usage.usageRate > 0.3) {
      rulesToLoad.push(rule);
    }
  }
  
  // P2: Charger seulement si usage élevé
  const p2Rules = getP2Rules(context);
  for (const rule of p2Rules) {
    const usage = ruleUsage[rule.name];
    if (usage && usage.usageRate > 0.5) {
      rulesToLoad.push(rule);
    }
  }
  
  return rulesToLoad;
}
```

### 3. Détection Contexte Améliorée

**TOUJOURS:**
- ✅ Analyser fichiers modifiés pour détecter domaine
- ✅ Analyser type de tâche (création, modification, refactoring)
- ✅ Analyser complexité (nombre todos, fichiers affectés)
- ✅ Utiliser historique pour prédire règles nécessaires

**Pattern:**
```typescript
// Détection contexte améliorée
function detectContext(files: string[], todos: Todo[]) {
  const context = {
    domain: detectDomain(files), // backend, frontend, database
    taskType: detectTaskType(todos), // create, modify, refactor
    complexity: detectComplexity(todos), // simple, medium, complex
    predictedRules: predictRules(files, todos) // Basé sur historique
  };
  
  return context;
}
```

### 4. Préchargement Intelligent

**TOUJOURS:**
- ✅ Précharger règles fréquemment utilisées ensemble
- ✅ Précharger règles selon patterns de tâches similaires
- ✅ Éviter préchargement règles inutilisées

**Pattern:**
```typescript
// Préchargement basé sur patterns
function preloadRules(context: TaskContext, ruleUsage: RuleUsage) {
  const patterns = analyzePatterns(ruleUsage);
  const similarTasks = findSimilarTasks(context, patterns);
  
  // Règles souvent utilisées ensemble
  const coOccurringRules = findCoOccurringRules(similarTasks);
  
  // Précharger règles avec usage élevé dans tâches similaires
  return coOccurringRules.filter(rule => {
    const usage = ruleUsage[rule.name];
    return usage && usage.usageRate > 0.7;
  });
}
```

## 🔄 Adaptation Dynamique

### 1. Ajustement Priorité

**TOUJOURS:**
- ✅ Promouvoir règles P2 → P1 si usageRate > 0.9
- ✅ Rétrograder règles P1 → P2 si usageRate < 0.3
- ✅ Considérer suppression règles jamais utilisées

**Pattern:**
```typescript
// Ajuster priorité selon usage
function adjustPriority(ruleUsage: RuleUsage) {
  const adjustments = [];
  
  for (const [ruleName, usage] of Object.entries(ruleUsage)) {
    if (usage.priority === 'P2' && usage.usageRate > 0.9) {
      adjustments.push({
        ruleName,
        action: 'promote',
        from: 'P2',
        to: 'P1',
        reason: 'Usage élevé détecté'
      });
    } else if (usage.priority === 'P1' && usage.usageRate < 0.3) {
      adjustments.push({
        ruleName,
        action: 'demote',
        from: 'P1',
        to: 'P2',
        reason: 'Usage faible détecté'
      });
    }
  }
  
  return adjustments;
}
```

### 2. Éviction Intelligente

**TOUJOURS:**
- ✅ Éviter saturation contexte (> 80%)
- ✅ Évincer règles moins prioritaires si saturation
- ✅ Conserver règles P0 même si saturation

**Pattern:**
```typescript
// Éviction intelligente
function evictRulesIfNeeded(loadedRules: Rule[], contextUsage: number) {
  if (contextUsage < 0.8) {
    return loadedRules; // Pas besoin d'éviction
  }
  
  // Évincer règles P2 d'abord, puis P1 (jamais P0)
  const rulesToKeep = loadedRules.filter(r => r.priority === 'P0');
  const p1Rules = loadedRules.filter(r => r.priority === 'P1');
  const p2Rules = loadedRules.filter(r => r.priority === 'P2');
  
  // Garder P1 avec usage élevé
  const highUsageP1 = p1Rules.filter(r => getUsageRate(r) > 0.7);
  
  return [...rulesToKeep, ...highUsageP1];
}
```

## 📈 Optimisations Spécifiques

### 1. Réduction Règles P1 Chargées

**TOUJOURS:**
- ✅ Charger maximum 2-3 règles P1 selon domaine
- ✅ Prioriser règles avec usageRate élevé
- ✅ Éviter charger toutes règles P1 d'un domaine

**Pattern:**
```typescript
// Charger seulement règles P1 nécessaires
function loadP1Rules(domain: string, ruleUsage: RuleUsage, maxRules: number = 3) {
  const domainRules = getP1RulesForDomain(domain);
  
  // Trier par usageRate décroissant
  const sortedRules = domainRules.sort((a, b) => {
    const usageA = ruleUsage[a.name]?.usageRate || 0;
    const usageB = ruleUsage[b.name]?.usageRate || 0;
    return usageB - usageA;
  });
  
  // Charger seulement les maxRules plus utilisées
  return sortedRules.slice(0, maxRules);
}
```

### 2. Chargement Lazy P2

**TOUJOURS:**
- ✅ Ne pas charger règles P2 automatiquement
- ✅ Charger seulement si explicitement référencées
- ✅ Charger seulement si usageRate > 0.5

**Pattern:**
```typescript
// Chargement lazy P2
function loadP2RulesLazy(context: TaskContext, ruleUsage: RuleUsage) {
  // Ne charger que si:
  // 1. Explicitement référencée dans message
  // 2. UsageRate > 0.5 dans tâches similaires
  // 3. Nécessaire pour tâche complexe
  
  if (context.complexity === 'complex') {
    return getP2RulesForComplexTask(context, ruleUsage);
  }
  
  return []; // Ne pas charger par défaut
}
```

### 3. Cache Règles Fréquentes

**TOUJOURS:**
- ✅ Mettre en cache règles fréquemment chargées
- ✅ Réutiliser cache si contexte similaire
- ✅ Invalider cache si règles modifiées

**Pattern:**
```typescript
// Cache règles fréquentes
const ruleCache = new Map<string, RuleContent>();

function getCachedRule(ruleName: string, ruleUsage: RuleUsage) {
  const usage = ruleUsage[ruleName];
  
  // Mettre en cache si usageRate > 0.7
  if (usage && usage.usageRate > 0.7) {
    if (!ruleCache.has(ruleName)) {
      ruleCache.set(ruleName, loadRule(ruleName));
    }
    return ruleCache.get(ruleName);
  }
  
  return loadRule(ruleName);
}
```

## 🎯 Matrice de Chargement Optimisée

### Tâches Simples (< 3 todos)

**Règles chargées:**
- P0: 3 règles (toujours)
- P1: 1-2 règles selon domaine
- P2: 0 règles (lazy loading)

**Total:** 4-5 règles (vs 7-8 avant)

### Tâches Moyennes (3-10 todos)

**Règles chargées:**
- P0: 3 règles (toujours)
- P1: 2-3 règles selon domaine
- P2: 0-1 règles si nécessaire

**Total:** 5-7 règles (vs 10-12 avant)

### Tâches Complexes (> 10 todos)

**Règles chargées:**
- P0: 3 règles (toujours)
- P1: 3-4 règles selon domaine
- P2: 1-2 règles si usageRate > 0.5

**Total:** 7-9 règles (vs 15-17 avant)

## 🔗 Intégration

### Règles Associées

- `rule-usage-tracker.md` - Tracking usage règles
- `load-strategy.md` - Stratégie de chargement (mise à jour)
- `agent-metrics.md` - Métriques générales

### Documentation

- `docs/AGENT-RULE-OPTIMIZATION.md` - Optimisation règles
- `docs/AGENT-METRICS.md` - Métriques complètes

## ✅ Checklist

**Avant chargement règles:**
- [ ] Consulter `rule-usage.json` pour usage réel
- [ ] Détecter contexte (domaine, type, complexité)
- [ ] Identifier règles nécessaires selon contexte
- [ ] Filtrer règles inutilisées (usageRate < 0.3)

**Pendant chargement:**
- [ ] Charger P0 (toujours)
- [ ] Charger P1 selon domaine + usage
- [ ] Charger P2 seulement si nécessaire
- [ ] Vérifier saturation contexte (< 80%)

**Après chargement:**
- [ ] Tracker règles chargées
- [ ] Vérifier utilisation réelle
- [ ] Ajuster priorité si nécessaire
- [ ] Mettre à jour `rule-usage.json`

---

**Référence:** `@docs/AGENT-RULE-OPTIMIZATION.md` - Documentation complète optimisation règles

