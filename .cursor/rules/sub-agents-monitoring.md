<!-- 
Context: sub-agents, monitoring, metrics, performance, problem-detection
Priority: P1
Auto-load: when task requires sub-agents monitoring or performance analysis
Dependencies: core.md, sub-agents-orchestration.md, sub-agents-communication.md
-->

# Système de Sub-Agents - Monitoring - Saxium

**Objectif:** Définir le système de monitoring et métriques pour collecter automatiquement les données de performance, analyser les performances et détecter les problèmes.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** Le système de sub-agents DOIT collecter automatiquement les métriques, analyser les performances et détecter les problèmes pour permettre l'amélioration continue.

**Bénéfices:**
- ✅ Collecte automatique des métriques
- ✅ Analyse de performance en temps réel
- ✅ Détection proactive des problèmes
- ✅ Amélioration continue basée sur données

**Référence:** `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale  
**Référence:** `@docs/AGENT_METRICS.json` - Métriques

## 📋 Collecte Automatique des Métriques

### 1. Métriques par Rôle

**IMPÉRATIF:** Collecter automatiquement les métriques pour chaque rôle.

**Métriques Collectées:**
- `totalTasks`: Nombre total de tâches
- `completedTasks`: Tâches complétées
- `failedTasks`: Tâches échouées
- `averageLatency`: Latence moyenne (ms)
- `averageEfficiency`: Efficacité moyenne (%)
- `successRate`: Taux de succès (%)

**Pattern:**
```typescript
// Collecter métriques par rôle
async function collectRoleMetrics(
  role: Role,
  context: Context
): Promise<RoleMetrics> {
  const tasks = await loadRoleTasks(role, context);
  
  return {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'completed').length,
    failedTasks: tasks.filter(t => t.status === 'failed').length,
    averageLatency: calculateAverageLatency(tasks),
    averageEfficiency: calculateAverageEfficiency(tasks),
    successRate: calculateSuccessRate(tasks)
  };
}
```

### 2. Métriques d'Orchestration

**IMPÉRATIF:** Collecter métriques sur l'orchestration globale.

**Métriques Collectées:**
- `totalOrchestrations`: Nombre total d'orchestrations
- `successfulOrchestrations`: Orchestrations réussies
- `failedOrchestrations`: Orchestrations échouées
- `averageCoordinationTime`: Temps de coordination moyen (ms)
- `averageParallelizationRate`: Taux de parallélisation moyen (%)

**Pattern:**
```typescript
// Collecter métriques d'orchestration
async function collectOrchestrationMetrics(
  context: Context
): Promise<OrchestrationMetrics> {
  const orchestrations = await loadOrchestrations(context);
  
  return {
    totalOrchestrations: orchestrations.length,
    successfulOrchestrations: orchestrations.filter(o => o.success).length,
    failedOrchestrations: orchestrations.filter(o => !o.success).length,
    averageCoordinationTime: calculateAverageCoordinationTime(orchestrations),
    averageParallelizationRate: calculateAverageParallelizationRate(orchestrations)
  };
}
```

### 3. Métriques de Communication

**IMPÉRATIF:** Collecter métriques sur la communication inter-agents.

**Métriques Collectées:**
- `totalMessages`: Nombre total de messages
- `averageLatency`: Latence moyenne (ms)
- `timeoutRate`: Taux de timeout (%)
- `errorRate`: Taux d'erreur (%)

**Pattern:**
```typescript
// Collecter métriques de communication
async function collectCommunicationMetrics(
  context: Context
): Promise<CommunicationMetrics> {
  const messages = await loadMessages(context);
  
  return {
    totalMessages: messages.length,
    averageLatency: calculateAverageLatency(messages),
    timeoutRate: calculateTimeoutRate(messages),
    errorRate: calculateErrorRate(messages)
  };
}
```

## 📊 Analyse de Performance

### 1. Analyse par Rôle

**IMPÉRATIF:** Analyser les performances de chaque rôle.

**TOUJOURS:**
- ✅ Analyser latence par rôle
- ✅ Analyser efficacité par rôle
- ✅ Analyser taux de succès par rôle
- ✅ Identifier rôles sous-performants

**Pattern:**
```typescript
// Analyser performance par rôle
async function analyzeRolePerformance(
  metrics: RoleMetrics,
  context: Context
): Promise<PerformanceAnalysis> {
  const analysis: PerformanceAnalysis = {
    role: metrics.role,
    performance: 'good',
    issues: [],
    recommendations: []
  };
  
  // 1. Analyser latence
  if (metrics.averageLatency > 300000) { // > 5 minutes
    analysis.performance = 'poor';
    analysis.issues.push({
      type: 'high-latency',
      severity: 'high',
      message: `Latence moyenne élevée: ${metrics.averageLatency}ms`
    });
    analysis.recommendations.push('Optimiser exécution des tâches');
  }
  
  // 2. Analyser efficacité
  if (metrics.averageEfficiency < 0.7) { // < 70%
    analysis.performance = 'poor';
    analysis.issues.push({
      type: 'low-efficiency',
      severity: 'medium',
      message: `Efficacité moyenne faible: ${(metrics.averageEfficiency * 100).toFixed(1)}%`
    });
    analysis.recommendations.push('Améliorer efficacité des tâches');
  }
  
  // 3. Analyser taux de succès
  if (metrics.successRate < 0.9) { // < 90%
    analysis.performance = 'poor';
    analysis.issues.push({
      type: 'low-success-rate',
      severity: 'high',
      message: `Taux de succès faible: ${(metrics.successRate * 100).toFixed(1)}%`
    });
    analysis.recommendations.push('Améliorer gestion d'erreurs');
  }
  
  return analysis;
}
```

### 2. Analyse d'Orchestration

**IMPÉRATIF:** Analyser les performances de l'orchestration.

**TOUJOURS:**
- ✅ Analyser temps de coordination
- ✅ Analyser taux de parallélisation
- ✅ Identifier goulots d'étranglement
- ✅ Recommander optimisations

**Pattern:**
```typescript
// Analyser performance orchestration
async function analyzeOrchestrationPerformance(
  metrics: OrchestrationMetrics,
  context: Context
): Promise<OrchestrationAnalysis> {
  const analysis: OrchestrationAnalysis = {
    performance: 'good',
    issues: [],
    recommendations: []
  };
  
  // 1. Analyser temps de coordination
  if (metrics.averageCoordinationTime > 60000) { // > 1 minute
    analysis.performance = 'poor';
    analysis.issues.push({
      type: 'high-coordination-time',
      severity: 'medium',
      message: `Temps de coordination élevé: ${metrics.averageCoordinationTime}ms`
    });
    analysis.recommendations.push('Optimiser coordination entre rôles');
  }
  
  // 2. Analyser parallélisation
  if (metrics.averageParallelizationRate < 0.3) { // < 30%
    analysis.performance = 'poor';
    analysis.issues.push({
      type: 'low-parallelization',
      severity: 'medium',
      message: `Taux de parallélisation faible: ${(metrics.averageParallelizationRate * 100).toFixed(1)}%`
    });
    analysis.recommendations.push('Augmenter parallélisation des tâches');
  }
  
  return analysis;
}
```

## 🔍 Détection de Problèmes

### 1. Détection Automatique

**IMPÉRATIF:** Détecter automatiquement les problèmes de performance.

**TOUJOURS:**
- ✅ Détecter dégradations de performance
- ✅ Détecter anomalies dans métriques
- ✅ Détecter patterns d'erreurs
- ✅ Alerter sur problèmes critiques

**Pattern:**
```typescript
// Détecter problèmes automatiquement
async function detectProblems(
  metrics: AgentMetrics,
  context: Context
): Promise<Problem[]> {
  const problems: Problem[] = [];
  
  // 1. Détecter dégradations par rôle
  for (const [role, roleMetrics] of Object.entries(metrics.byRole)) {
    const analysis = await analyzeRolePerformance(roleMetrics, context);
    if (analysis.performance === 'poor') {
      problems.push(...analysis.issues.map(issue => ({
        type: 'role-performance',
        role,
        issue,
        severity: issue.severity,
        recommendation: analysis.recommendations[0]
      })));
    }
  }
  
  // 2. Détecter problèmes d'orchestration
  const orchestrationAnalysis = await analyzeOrchestrationPerformance(
    metrics.orchestration,
    context
  );
  if (orchestrationAnalysis.performance === 'poor') {
    problems.push(...orchestrationAnalysis.issues.map(issue => ({
      type: 'orchestration-performance',
      issue,
      severity: issue.severity,
      recommendation: orchestrationAnalysis.recommendations[0]
    })));
  }
  
  // 3. Détecter problèmes de communication
  if (metrics.communication.timeoutRate > 0.1) { // > 10%
    problems.push({
      type: 'communication-timeout',
      severity: 'high',
      message: `Taux de timeout élevé: ${(metrics.communication.timeoutRate * 100).toFixed(1)}%`,
      recommendation: 'Augmenter timeouts ou optimiser communication'
    });
  }
  
  if (metrics.communication.errorRate > 0.05) { // > 5%
    problems.push({
      type: 'communication-error',
      severity: 'high',
      message: `Taux d'erreur élevé: ${(metrics.communication.errorRate * 100).toFixed(1)}%`,
      recommendation: 'Améliorer gestion d'erreurs de communication'
    });
  }
  
  return problems;
}
```

## ⚠️ Règles de Monitoring

### TOUJOURS:

- ✅ Collecter métriques automatiquement
- ✅ Analyser performances régulièrement
- ✅ Détecter problèmes automatiquement
- ✅ Alerter sur problèmes critiques
- ✅ Documenter métriques et analyses

### NE JAMAIS:

- ❌ Ignorer métriques collectées
- ❌ Ne pas analyser performances
- ❌ Ignorer problèmes détectés
- ❌ Ne pas documenter

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/sub-agents-orchestration.md` - Orchestration principale
- `@.cursor/rules/sub-agents-communication.md` - Communication inter-agents

### Fichiers de Métriques

- `@docs/AGENT_METRICS.json` - Métriques

---

**Note:** Ce fichier définit le système de monitoring et métriques pour collecter automatiquement les données de performance, analyser les performances et détecter les problèmes.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

