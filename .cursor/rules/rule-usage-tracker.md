# Tracking Usage des Règles - Saxium

**Objectif:** Tracker l'utilisation réelle des règles Cursor pour optimiser le chargement et identifier les règles inutilisées.

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT tracker quelles règles sont réellement utilisées pour optimiser le chargement et améliorer l'efficacité.

**Bénéfices:**
- ✅ Identifier règles inutilisées
- ✅ Optimiser chargement dynamique
- ✅ Réduire saturation contexte
- ✅ Améliorer performance agent

## 📊 Tracking Usage

### 1. Enregistrement Règles Chargées

**TOUJOURS:**
- ✅ Enregistrer chaque règle chargée avec timestamp
- ✅ Enregistrer contexte de chargement (type tâche, domaine)
- ✅ Enregistrer priorité règle (P0, P1, P2)

**Pattern:**
```typescript
// Lors du chargement d'une règle
trackRuleLoaded({
  ruleName: 'backend.md',
  priority: 'P1',
  context: {
    taskType: 'create-route',
    domain: 'backend',
    filesModified: ['server/routes/api.ts']
  },
  timestamp: Date.now()
});
```

### 2. Détection Usage Réel

**TOUJOURS:**
- ✅ Détecter si règle est réellement utilisée (référencée dans réponse)
- ✅ Compter nombre de fois règle est utilisée
- ✅ Identifier règles chargées mais jamais utilisées

**Pattern:**
```typescript
// Analyser si règle est utilisée
const ruleUsage = {
  ruleName: 'backend.md',
  loaded: true,
  used: false, // Détecté dans réponse
  usageCount: 0,
  lastUsed: null
};

// Détecter usage dans réponse
if (response.includes('@backend.md') || response.includes('patterns Express')) {
  ruleUsage.used = true;
  ruleUsage.usageCount++;
  ruleUsage.lastUsed = Date.now();
}
```

### 3. Métriques par Règle

**TOUJOURS:**
- ✅ Compter chargements totaux
- ✅ Compter utilisations réelles
- ✅ Calculer taux d'utilisation (utilisations / chargements)
- ✅ Identifier règles avec faible taux d'utilisation

**Pattern:**
```typescript
// Calculer métriques par règle
const ruleMetrics = {
  ruleName: 'backend.md',
  totalLoads: 150,
  totalUses: 120,
  usageRate: 0.8, // 80%
  averageLoadsPerTask: 1.2,
  lastLoaded: '2025-11-12T10:30:00Z',
  lastUsed: '2025-11-12T10:35:00Z'
};
```

## 📝 Enregistrement Usage

### Format JSON

**Fichier:** `.cursor/rule-usage.json`

**Structure:**
```json
{
  "rules": {
    "core.md": {
      "priority": "P0",
      "totalLoads": 500,
      "totalUses": 480,
      "usageRate": 0.96,
      "averageLoadsPerTask": 1.0,
      "lastLoaded": "2025-11-12T10:30:00Z",
      "lastUsed": "2025-11-12T10:35:00Z",
      "contexts": {
        "create-route": 120,
        "modify-service": 200,
        "create-component": 160
      }
    },
    "backend.md": {
      "priority": "P1",
      "totalLoads": 300,
      "totalUses": 240,
      "usageRate": 0.8,
      "averageLoadsPerTask": 1.2,
      "lastLoaded": "2025-11-12T10:30:00Z",
      "lastUsed": "2025-11-12T10:25:00Z",
      "contexts": {
        "create-route": 150,
        "modify-service": 90
      }
    },
    "advanced-learning.md": {
      "priority": "P2",
      "totalLoads": 10,
      "totalUses": 2,
      "usageRate": 0.2,
      "averageLoadsPerTask": 0.1,
      "lastLoaded": "2025-11-10T08:00:00Z",
      "lastUsed": "2025-11-08T14:00:00Z",
      "contexts": {
        "complex-task": 10
      }
    }
  },
  "summary": {
    "totalRules": 63,
    "rulesWithHighUsage": 45,
    "rulesWithLowUsage": 18,
    "averageUsageRate": 0.65
  }
}
```

### Sauvegarde

**TOUJOURS:**
- ✅ Sauvegarder après chaque session
- ✅ Mettre à jour compteurs (pas d'écrasement)
- ✅ Valider format JSON
- ✅ Gérer erreurs gracieusement

## 🔍 Analyse Usage

### Identification Règles Inutilisées

**TOUJOURS:**
- ✅ Identifier règles avec usageRate < 0.3 (30%)
- ✅ Identifier règles non utilisées depuis > 7 jours
- ✅ Analyser contexte où règles sont chargées mais non utilisées

**Pattern:**
```typescript
// Identifier règles inutilisées
const unusedRules = rules.filter(rule => 
  rule.usageRate < 0.3 || 
  (Date.now() - new Date(rule.lastUsed).getTime()) > 7 * 24 * 60 * 60 * 1000
);
```

### Optimisation Chargement

**TOUJOURS:**
- ✅ Recommander déchargement règles inutilisées
- ✅ Optimiser chargement selon usage réel
- ✅ Ajuster priorité selon usage

**Pattern:**
```typescript
// Recommandations d'optimisation
const recommendations = {
  rulesToUnload: unusedRules.map(r => r.ruleName),
  rulesToDemote: rules.filter(r => r.usageRate < 0.5 && r.priority === 'P1'),
  rulesToPromote: rules.filter(r => r.usageRate > 0.9 && r.priority === 'P2')
};
```

## 📈 Rapports

### Rapport Quotidien

**Fichier:** `.cursor/rule-usage-daily.json`

**Métriques:**
- Règles chargées aujourd'hui
- Règles utilisées aujourd'hui
- Taux d'utilisation moyen
- Règles inutilisées détectées

### Rapport Hebdomadaire

**Fichier:** `.cursor/rule-usage-weekly.json`

**Tendances:**
- Évolution usage par règle
- Nouvelles règles inutilisées
- Recommandations d'optimisation
- Impact optimisations précédentes

## 🎯 Actions Recommandées

### Règles avec Usage Faible (< 30%)

**Actions:**
1. Analyser pourquoi règle est chargée mais non utilisée
2. Vérifier si règle est vraiment nécessaire
3. Considérer déplacer vers P2 ou supprimer
4. Documenter décision

### Règles avec Usage Élevé (> 90%)

**Actions:**
1. Vérifier si peut être promue en P1
2. Optimiser contenu règle
3. Considérer préchargement

### Règles Jamais Utilisées

**Actions:**
1. Vérifier si règle est obsolète
2. Analyser si règle devrait être utilisée
3. Considérer suppression ou refonte

## 🔗 Intégration

### Règles Associées

- `agent-metrics.md` - Métriques générales agent
- `intelligent-rule-loading.md` - Chargement adaptatif
- `load-strategy.md` - Stratégie de chargement

### Documentation

- `docs/AGENT-RULE-OPTIMIZATION.md` - Optimisation règles
- `docs/AGENT-METRICS.md` - Métriques complètes

## ✅ Checklist

**Pendant chargement règles:**
- [ ] Enregistrer chaque règle chargée
- [ ] Enregistrer contexte de chargement
- [ ] Incrémenter compteur chargements

**Pendant utilisation:**
- [ ] Détecter usage réel de chaque règle
- [ ] Incrémenter compteur utilisations
- [ ] Enregistrer timestamp dernière utilisation

**Après session:**
- [ ] Calculer taux d'utilisation par règle
- [ ] Identifier règles inutilisées
- [ ] Générer recommandations
- [ ] Sauvegarder métriques

---

**Référence:** `@docs/AGENT-METRICS.md` - Documentation complète des métriques

