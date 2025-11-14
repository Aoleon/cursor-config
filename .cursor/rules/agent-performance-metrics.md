<!-- 
Context: agent-metrics, performance-monitoring, dashboard, real-time-metrics, cognitive-metrics, memory-metrics
Priority: P1
Auto-load: when monitoring agent performance, when analyzing metrics, when optimizing agent behavior
Dependencies: core.md, continuous-improvement-loop.md, memory-management-advanced.md
Score: 70
-->

# Métriques Performance Agent - Saxium

**Objectif:** Implémenter un système de métriques performance agent temps réel avec dashboard, export JSON, visualisations et alertes.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT collecter, analyser et exporter des métriques performance temps réel pour monitoring, optimisation et amélioration continue.

**Bénéfices:**
- ✅ Dashboard temps réel métriques
- ✅ Métriques cognitives (charge, efficacité, qualité)
- ✅ Métriques mémoire (utilisation, réutilisation, consolidation)
- ✅ Métriques todos (completion rate, précision estimations, stagnation)
- ✅ Métriques sub-agents (coordination, communication, efficacité)
- ✅ Export JSON pour analyse
- ✅ Visualisations tendances
- ✅ Alertes si métriques dégradent

**Référence:** `@.cursor/rules/continuous-improvement-loop.md` - Boucle d'amélioration continue  
**Référence:** `@.cursor/rules/memory-management-advanced.md` - Gestion mémoire avancée  
**Référence:** `@docs/AGENT_METRICS.json` - Fichier métriques existant

## 📋 Types de Métriques

### 1. Métriques Cognitives

**TOUJOURS:**
- ✅ Charge cognitive (charge mentale agent)
- ✅ Efficacité cognitive (efficacité décisions)
- ✅ Qualité cognitive (qualité raisonnements)
- ✅ Taux erreurs cognitives
- ✅ Précision décisions

**Pattern:**
```typescript
// Métriques cognitives
interface CognitiveMetrics {
  cognitiveLoad: number; // 0-100
  efficiency: number; // 0-1
  quality: number; // 0-1
  errorRate: number; // 0-1
  decisionAccuracy: number; // 0-1
  averageDecisionTime: number; // ms
  reasoningDepth: number; // Niveaux raisonnement
}

class CognitiveMetricsCollector {
  async collectCognitiveMetrics(
    context: Context
  ): Promise<CognitiveMetrics> {
    return {
      cognitiveLoad: await this.measureCognitiveLoad(context),
      efficiency: await this.measureEfficiency(context),
      quality: await this.measureQuality(context),
      errorRate: await this.measureErrorRate(context),
      decisionAccuracy: await this.measureDecisionAccuracy(context),
      averageDecisionTime: await this.measureAverageDecisionTime(context),
      reasoningDepth: await this.measureReasoningDepth(context)
    };
  }
  
  private async measureCognitiveLoad(
    context: Context
  ): Promise<number> {
    // Mesurer charge cognitive basée sur:
    // - Nombre fichiers ouverts
    // - Complexité tâche
    // - Durée session
    const openFiles = context.openFiles?.length || 0;
    const taskComplexity = context.taskComplexity || 0;
    const sessionDuration = context.sessionDuration || 0;
    
    // Calculer charge (0-100)
    const load = Math.min(100, 
      (openFiles * 10) + 
      (taskComplexity * 20) + 
      (sessionDuration / 3600000 * 5) // 5 points par heure
    );
    
    return load;
  }
  
  private async measureEfficiency(
    context: Context
  ): Promise<number> {
    // Mesurer efficacité basée sur:
    // - Taux succès tâches
    // - Temps moyen exécution
    // - Réutilisation solutions
    
    const successRate = context.tasksCompleted / context.tasksTotal || 0;
    const avgExecutionTime = context.avgExecutionTime || 0;
    const solutionReuseRate = context.solutionReuseRate || 0;
    
    // Calculer efficacité (0-1)
    const efficiency = (
      successRate * 0.4 +
      (1 - Math.min(1, avgExecutionTime / 60000)) * 0.3 + // Normalisé à 1min
      solutionReuseRate * 0.3
    );
    
    return Math.max(0, Math.min(1, efficiency));
  }
}
```

### 2. Métriques Mémoire

**TOUJOURS:**
- ✅ Utilisation mémoire working
- ✅ Utilisation mémoire short-term
- ✅ Utilisation mémoire long-term
- ✅ Taux réutilisation mémoire
- ✅ Taux consolidation mémoire

**Pattern:**
```typescript
// Métriques mémoire
interface MemoryMetrics {
  workingMemoryUsage: number; // 0-1
  shortTermMemoryUsage: number; // 0-1
  longTermMemoryUsage: number; // 0-1
  memoryReuseRate: number; // 0-1
  consolidationRate: number; // 0-1
  memoryHitRate: number; // 0-1
  averageMemoryAccessTime: number; // ms
}

class MemoryMetricsCollector {
  async collectMemoryMetrics(
    context: Context
  ): Promise<MemoryMetrics> {
    return {
      workingMemoryUsage: await this.measureWorkingMemoryUsage(context),
      shortTermMemoryUsage: await this.measureShortTermMemoryUsage(context),
      longTermMemoryUsage: await this.measureLongTermMemoryUsage(context),
      memoryReuseRate: await this.measureMemoryReuseRate(context),
      consolidationRate: await this.measureConsolidationRate(context),
      memoryHitRate: await this.measureMemoryHitRate(context),
      averageMemoryAccessTime: await this.measureAverageMemoryAccessTime(context)
    };
  }
}
```

### 3. Métriques Todos

**TOUJOURS:**
- ✅ Taux completion todos
- ✅ Précision estimations
- ✅ Taux stagnation todos
- ✅ Temps moyen completion
- ✅ Détection blocages

**Pattern:**
```typescript
// Métriques todos
interface TodoMetrics {
  completionRate: number; // 0-1
  estimationAccuracy: number; // 0-1
  stagnationRate: number; // 0-1
  averageCompletionTime: number; // ms
  blockingIssues: number; // Count
  overdueTodos: number; // Count
}

class TodoMetricsCollector {
  async collectTodoMetrics(
    context: Context
  ): Promise<TodoMetrics> {
    const todos = await this.loadTodos(context);
    
    return {
      completionRate: this.calculateCompletionRate(todos),
      estimationAccuracy: this.calculateEstimationAccuracy(todos),
      stagnationRate: this.calculateStagnationRate(todos),
      averageCompletionTime: this.calculateAverageCompletionTime(todos),
      blockingIssues: this.countBlockingIssues(todos),
      overdueTodos: this.countOverdueTodos(todos)
    };
  }
}
```

### 4. Métriques Sub-Agents

**TOUJOURS:**
- ✅ Efficacité coordination
- ✅ Qualité communication
- ✅ Distribution tâches
- ✅ Taux résolution conflits
- ✅ Efficacité globale

**Pattern:**
```typescript
// Métriques sub-agents
interface SubAgentMetrics {
  coordinationEfficiency: number; // 0-1
  communicationQuality: number; // 0-1
  taskDistribution: TaskDistribution;
  conflictResolutionRate: number; // 0-1
  overallEfficiency: number; // 0-1
}

class SubAgentMetricsCollector {
  async collectSubAgentMetrics(
    context: Context
  ): Promise<SubAgentMetrics> {
    return {
      coordinationEfficiency: await this.measureCoordinationEfficiency(context),
      communicationQuality: await this.measureCommunicationQuality(context),
      taskDistribution: await this.measureTaskDistribution(context),
      conflictResolutionRate: await this.measureConflictResolutionRate(context),
      overallEfficiency: await this.measureOverallEfficiency(context)
    };
  }
}
```

## 📊 Dashboard Temps Réel

### Structure Dashboard

**TOUJOURS:**
- ✅ Afficher métriques temps réel
- ✅ Visualiser tendances
- ✅ Alertes si dégradation
- ✅ Export JSON

**Pattern:**
```typescript
// Dashboard temps réel
interface AgentDashboard {
  cognitive: CognitiveMetrics;
  memory: MemoryMetrics;
  todos: TodoMetrics;
  subAgents: SubAgentMetrics;
  timestamp: number;
  trends: TrendAnalysis;
  alerts: Alert[];
}

class AgentDashboard {
  async generateDashboard(
    context: Context
  ): Promise<AgentDashboard> {
    // 1. Collecter toutes métriques
    const cognitive = await this.cognitiveCollector.collectCognitiveMetrics(context);
    const memory = await this.memoryCollector.collectMemoryMetrics(context);
    const todos = await this.todoCollector.collectTodoMetrics(context);
    const subAgents = await this.subAgentCollector.collectSubAgentMetrics(context);
    
    // 2. Analyser tendances
    const trends = await this.analyzeTrends(
      { cognitive, memory, todos, subAgents },
      context
    );
    
    // 3. Détecter alertes
    const alerts = await this.detectAlerts(
      { cognitive, memory, todos, subAgents },
      trends,
      context
    );
    
    return {
      cognitive,
      memory,
      todos,
      subAgents,
      timestamp: Date.now(),
      trends,
      alerts
    };
  }
  
  private async detectAlerts(
    metrics: AllMetrics,
    trends: TrendAnalysis,
    context: Context
  ): Promise<Alert[]> {
    const alerts: Alert[] = [];
    
    // Alerte: Charge cognitive élevée
    if (metrics.cognitive.cognitiveLoad > 80) {
      alerts.push({
        type: 'warning',
        severity: 'high',
        message: 'Charge cognitive élevée (>80%)',
        metric: 'cognitive.cognitiveLoad',
        value: metrics.cognitive.cognitiveLoad
      });
    }
    
    // Alerte: Efficacité dégradée
    if (trends.efficiency.trend < -0.1) {
      alerts.push({
        type: 'warning',
        severity: 'medium',
        message: 'Efficacité en dégradation',
        metric: 'efficiency',
        trend: trends.efficiency.trend
      });
    }
    
    // Alerte: Taux completion todos faible
    if (metrics.todos.completionRate < 0.7) {
      alerts.push({
        type: 'error',
        severity: 'high',
        message: 'Taux completion todos faible (<70%)',
        metric: 'todos.completionRate',
        value: metrics.todos.completionRate
      });
    }
    
    return alerts;
  }
}
```

## 📤 Export JSON

### Format Export

**TOUJOURS:**
- ✅ Exporter métriques JSON
- ✅ Sauvegarder dans `docs/AGENT_METRICS.json`
- ✅ Inclure timestamp
- ✅ Inclure tendances

**Pattern:**
```typescript
// Export JSON
class MetricsExporter {
  async exportMetrics(
    dashboard: AgentDashboard,
    context: Context
  ): Promise<void> {
    const exportData = {
      timestamp: dashboard.timestamp,
      metrics: {
        cognitive: dashboard.cognitive,
        memory: dashboard.memory,
        todos: dashboard.todos,
        subAgents: dashboard.subAgents
      },
      trends: dashboard.trends,
      alerts: dashboard.alerts
    };
    
    // Sauvegarder dans docs/AGENT_METRICS.json
    await this.saveToFile(
      'docs/AGENT_METRICS.json',
      JSON.stringify(exportData, null, 2),
      context
    );
  }
}
```

## ⚠️ Règles Métriques Performance

### TOUJOURS:

- ✅ Collecter métriques automatiquement
- ✅ Générer dashboard temps réel
- ✅ Exporter métriques JSON
- ✅ Détecter alertes automatiquement
- ✅ Analyser tendances
- ✅ Sauvegarder métriques historiques

### NE JAMAIS:

- ❌ Ignorer métriques collectées
- ❌ Ne pas générer dashboard
- ❌ Ne pas exporter métriques
- ❌ Ignorer alertes détectées

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/continuous-improvement-loop.md` - Boucle d'amélioration continue
- `@.cursor/rules/memory-management-advanced.md` - Gestion mémoire avancée

### Fichiers Métriques

- `@docs/AGENT_METRICS.json` - Fichier métriques existant

---

**Note:** Ce fichier définit le système de métriques performance agent avec dashboard temps réel, export JSON, visualisations et alertes.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

