# Services Agent - Saxium

**Date:** 2025-11-12  
**Version:** 1.0.0  
**Statut:** Documentation Services Agent

## 🎯 Objectif

Ce document décrit les services Agent TypeScript simplifiés pour supporter le système de règles Cursor.

## 📊 Services Implémentés

### 1. AgentMetricsService

**Fichier:** `server/services/agent/AgentMetricsService.ts`

**Fonctionnalités:**
- Collecte métriques tâches (durée, tool calls, qualité)
- Tracking usage règles (chargements, utilisations)
- Statistiques agrégées
- Persistance JSON simple

**Utilisation:**
```typescript
import { getAgentMetricsService } from './services/agent/AgentMetricsService';

const metricsService = getAgentMetricsService();

// Enregistrer métriques tâche
await metricsService.recordTaskMetrics({
  sessionId: 'uuid',
  timestamp: new Date().toISOString(),
  task: { /* ... */ },
  performance: { /* ... */ },
  quality: { /* ... */ },
  usage: { /* ... */ },
  efficiency: { /* ... */ }
});

// Mettre à jour usage règle
await metricsService.updateRuleUsage('backend.md', 'P1', 'create-route', true);

// Obtenir statistiques
const stats = await metricsService.getStatistics();
```

**Fichiers:**
- `.cursor/agent-metrics.json` - Métriques tâches
- `.cursor/rule-usage.json` - Usage règles

### 2. AgentRuleOptimizer

**Fichier:** `server/services/agent/AgentRuleOptimizer.ts`

**Fonctionnalités:**
- Génération recommandations optimisation
- Filtrage règles selon usage
- Priorisation règles selon usage
- Analyse efficacité règles

**Utilisation:**
```typescript
import { getAgentRuleOptimizer } from './services/agent/AgentRuleOptimizer';

const optimizer = getAgentRuleOptimizer();

// Générer recommandations
const recommendations = await optimizer.generateOptimizationRecommendations();
// { rulesToPromote: [...], rulesToDemote: [...], rulesToRemove: [...] }

// Filtrer règles selon usage
const filteredRules = await optimizer.filterRulesByUsage(candidateRules, 0.3);

// Obtenir règles recommandées pour contexte
const recommended = await optimizer.getRecommendedRulesForContext({
  domain: 'backend',
  complexity: 'medium'
});
```

## 🔗 Intégration avec Règles Cursor

### Collecte Automatique

Les règles Cursor peuvent utiliser ces services pour :
- Enregistrer métriques automatiquement (`agent-metrics.md`)
- Tracker usage règles (`rule-usage-tracker.md`)
- Optimiser chargement (`intelligent-rule-loading.md`)

### Pattern d'Intégration

```typescript
// Dans une règle Cursor, l'agent peut appeler:
const metricsService = getAgentMetricsService();
await metricsService.updateRuleUsage('backend.md', 'P1', 'create-route', true);
```

## 📈 Métriques Collectées

### Métriques Tâches

- Durée résolution
- Nombre tool calls
- Usage contexte
- Qualité code généré
- Erreurs TypeScript
- Règles utilisées

### Métriques Règles

- Nombre chargements
- Nombre utilisations
- Taux d'utilisation
- Contexte d'utilisation
- Dernière utilisation

## 🎯 Utilisation

### Initialisation

Les services s'initialisent automatiquement au premier appel. Les fichiers JSON sont créés dans `.cursor/` si nécessaire.

### Persistance

Les données sont persistées dans des fichiers JSON simples :
- `.cursor/agent-metrics.json` - Métriques tâches
- `.cursor/rule-usage.json` - Usage règles

### Gestion Erreurs

Les services gèrent les erreurs gracieusement (ne bloquent pas si erreur de fichier).

## 🔄 Workflow

### 1. Collecte

**Pendant tâche:**
- Enregistrer métriques début tâche
- Tracker tool calls
- Tracker règles chargées/utilisées
- Enregistrer métriques fin tâche

### 2. Analyse

**Périodiquement:**
- Analyser métriques accumulées
- Générer recommandations
- Identifier règles inefficaces

### 3. Optimisation

**Selon recommandations:**
- Ajuster priorité règles
- Filtrer règles inutilisées
- Promouvoir règles efficaces

## 🔗 Documentation Associée

- `docs/AGENT-METRICS.md` - Métriques complètes
- `docs/AGENT-RULE-OPTIMIZATION.md` - Optimisation règles
- `docs/AGENT-FEEDBACK-LOOP.md` - Système feedback

## ✅ Checklist

**Avant utilisation:**
- [ ] Vérifier services initialisés
- [ ] Vérifier fichiers JSON créés
- [ ] Tester enregistrement métriques

**Pendant utilisation:**
- [ ] Enregistrer métriques tâches
- [ ] Mettre à jour usage règles
- [ ] Générer recommandations périodiquement

**Après utilisation:**
- [ ] Analyser statistiques
- [ ] Appliquer recommandations
- [ ] Documenter améliorations

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-11-12

