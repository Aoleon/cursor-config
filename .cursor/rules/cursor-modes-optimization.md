<!-- 
Context: cursor-modes, agent-mode, composer-mode, cmd-k, background-agent, mode-selection, optimization
Priority: P1
Auto-load: when agent needs to select optimal Cursor mode, coordinate between modes, optimize mode usage
Dependencies: core.md, sub-agents-background-integration.md, task-decomposition.md
Score: 70
-->

# Optimisation Utilisation Modes Cursor - Saxium

**Objectif:** Optimiser l'utilisation des différents modes Cursor (Agent Mode, Composer Mode, Cmd+K, Background Agent) selon type tâche et contexte.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Référence:** [Cursor Composer Documentation](https://docs.cursor.com/guides/composer)  
**Référence:** [Cursor Background Agent Documentation](https://docs.cursor.com/guides/background-agent)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT sélectionner et utiliser le mode Cursor optimal selon type tâche, complexité et contexte pour maximiser efficacité.

**Bénéfices:**
- ✅ Sélection mode optimal automatique
- ✅ Coordination entre modes
- ✅ Optimisation ressources
- ✅ Efficacité maximale

**Référence:** `@.cursor/rules/sub-agents-background-integration.md` - Intégration Background Agent  
**Référence:** `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

## 📋 Modes Cursor Disponibles

### 1. Agent Mode

**Utilisation:** Analyse, planification, décisions, orchestration.

**Caractéristiques:**
- Analyse approfondie codebase
- Planification stratégique
- Décisions autonomes
- Orchestration sub-agents
- Debugging intelligent

**Cas d'usage:**
- Analyser architecture
- Planifier migration
- Décider approche technique
- Orchestrer sub-agents
- Résoudre problèmes complexes

**Pattern:**
```typescript
// Agent Mode
interface AgentModeUsage {
  taskTypes: TaskType[];
  capabilities: Capability[];
  limitations: Limitation[];
}

const AGENT_MODE_USAGE: AgentModeUsage = {
  taskTypes: [
    'analysis',
    'planning',
    'decision-making',
    'orchestration',
    'debugging',
    'problem-solving'
  ],
  capabilities: [
    'deep-codebase-analysis',
    'strategic-planning',
    'autonomous-decisions',
    'sub-agent-orchestration',
    'intelligent-debugging'
  ],
  limitations: [
    'not-optimal-for-simple-edits',
    'slower-for-single-file-changes'
  ]
};
```

### 2. Composer Mode

**Utilisation:** Éditions multi-fichiers coordonnées, refactoring large.

**Caractéristiques:**
- Éditions multi-fichiers coordonnées
- Refactoring large
- Migration modulaire
- Modifications synchronisées
- Validation cohérence

**Cas d'usage:**
- Éditions >3 fichiers
- Refactoring large
- Migration modulaire
- Modifications coordonnées
- Restructuration architecture

**Pattern:**
```typescript
// Composer Mode
const COMPOSER_MODE_USAGE: ComposerModeUsage = {
  taskTypes: [
    'multi-file-edit',
    'large-refactoring',
    'modular-migration',
    'coordinated-changes',
    'architecture-restructuring'
  ],
  capabilities: [
    'coordinated-multi-file-edits',
    'large-refactoring',
    'modular-migration',
    'synchronized-changes',
    'coherence-validation'
  ],
  limitations: [
    'not-for-single-file-edits',
    'requires-coordination'
  ]
};
```

### 3. Cmd+K

**Utilisation:** Éditions simples fichier unique, corrections mineures.

**Caractéristiques:**
- Éditions simples
- Fichier unique
- Corrections mineures
- Modifications locales
- Rapide et direct

**Cas d'usage:**
- Édition fichier unique
- Correction bug simple
- Modification locale
- Ajout fonction simple
- Refactoring mineur

**Pattern:**
```typescript
// Cmd+K
const CMD_K_USAGE: CmdKUsage = {
  taskTypes: [
    'single-file-edit',
    'simple-correction',
    'local-modification',
    'simple-function-add',
    'minor-refactoring'
  ],
  capabilities: [
    'fast-single-file-edits',
    'simple-corrections',
    'local-modifications',
    'quick-changes'
  ],
  limitations: [
    'not-for-multi-file-edits',
    'not-for-complex-changes'
  ]
};
```

### 4. Background Agent

**Utilisation:** Tâches longues (>30min), exécution asynchrone.

**Caractéristiques:**
- Tâches longues asynchrones
- Exécution non-bloquante
- Surveillance progression
- Reprise après interruption
- Optimisation ressources

**Cas d'usage:**
- Migration 741 try-catch
- Typage 933 any
- Optimisation SQL
- Migration modulaire complète
- Tâches >30min

**Pattern:**
```typescript
// Background Agent
const BACKGROUND_AGENT_USAGE: BackgroundAgentUsage = {
  taskTypes: [
    'long-running-task',
    'async-execution',
    'background-migration',
    'large-optimization',
    'batch-processing'
  ],
  capabilities: [
    'async-execution',
    'non-blocking',
    'progress-monitoring',
    'resume-after-interruption',
    'resource-optimization'
  ],
  limitations: [
    'not-for-interactive-tasks',
    'requires-state-management'
  ]
};
```

## 🎯 Sélection Mode Optimal

### Critères de Sélection

**TOUJOURS:**
- ✅ Analyser type tâche
- ✅ Évaluer complexité
- ✅ Considérer nombre fichiers
- ✅ Estimer durée
- ✅ Sélectionner mode optimal

**Pattern:**
```typescript
// Sélection mode optimal
class ModeOptimizer {
  async selectOptimalMode(
    task: Task,
    context: Context
  ): Promise<CursorMode> {
    // 1. Analyser caractéristiques tâche
    const analysis = await this.analyzeTask(task, context);
    
    // 2. Évaluer critères
    const criteria = await this.evaluateCriteria(analysis, context);
    
    // 3. Sélectionner mode optimal
    const mode = await this.selectMode(criteria, context);
    
    return mode;
  }
  
  private async analyzeTask(
    task: Task,
    context: Context
  ): Promise<TaskAnalysis> {
    return {
      type: this.identifyTaskType(task, context),
      complexity: this.assessComplexity(task, context),
      fileCount: task.files?.length || 0,
      estimatedDuration: task.estimatedDuration || 0,
      requiresCoordination: this.requiresCoordination(task, context),
      isLongRunning: (task.estimatedDuration || 0) > 30 * 60 * 1000
    };
  }
  
  private async selectMode(
    criteria: ModeCriteria,
    context: Context
  ): Promise<CursorMode> {
    // Règle 1: Tâche longue → Background Agent
    if (criteria.isLongRunning) {
      return 'background-agent';
    }
    
    // Règle 2: Édition multi-fichiers (>3) → Composer Mode
    if (criteria.fileCount > 3 && criteria.requiresCoordination) {
      return 'composer';
    }
    
    // Règle 3: Édition simple fichier unique → Cmd+K
    if (criteria.fileCount === 1 && criteria.complexity === 'low') {
      return 'cmd-k';
    }
    
    // Règle 4: Analyse/Planification/Décision → Agent Mode
    if (criteria.type === 'analysis' || 
        criteria.type === 'planning' || 
        criteria.type === 'decision-making') {
      return 'agent';
    }
    
    // Règle 5: Orchestration sub-agents → Agent Mode
    if (criteria.type === 'orchestration') {
      return 'agent';
    }
    
    // Par défaut: Agent Mode
    return 'agent';
  }
}
```

### Matrice de Décision

| Type Tâche | Fichiers | Durée | Mode Optimal |
|------------|----------|-------|--------------|
| Analyse | N/A | <5min | Agent Mode |
| Planification | N/A | <10min | Agent Mode |
| Édition simple | 1 | <2min | Cmd+K |
| Édition multi | >3 | <15min | Composer Mode |
| Refactoring large | >5 | <30min | Composer Mode |
| Migration | >10 | >30min | Background Agent |
| Optimisation batch | >20 | >30min | Background Agent |

## 🔄 Coordination entre Modes

### Handoff entre Modes

**TOUJOURS:**
- ✅ Détecter besoin changement mode
- ✅ Préparer handoff
- ✅ Exécuter handoff
- ✅ Valider handoff

**Pattern:**
```typescript
// Coordination entre modes
class ModeCoordinator {
  async coordinateModes(
    task: Task,
    context: Context
  ): Promise<CoordinationResult> {
    const modeSequence: CursorMode[] = [];
    let currentMode: CursorMode = 'agent';
    
    // 1. Phase analyse/planification → Agent Mode
    if (task.requiresAnalysis || task.requiresPlanning) {
      currentMode = 'agent';
      modeSequence.push(currentMode);
      await this.executeInMode(currentMode, task, context);
    }
    
    // 2. Phase édition → Composer Mode ou Cmd+K
    if (task.requiresEditing) {
      const editMode = await this.selectEditMode(task, context);
      if (editMode !== currentMode) {
        await this.performHandoff(currentMode, editMode, task, context);
        currentMode = editMode;
      }
      modeSequence.push(currentMode);
      await this.executeInMode(currentMode, task, context);
    }
    
    // 3. Phase longue → Background Agent
    if (task.isLongRunning) {
      if (currentMode !== 'background-agent') {
        await this.performHandoff(currentMode, 'background-agent', task, context);
        currentMode = 'background-agent';
      }
      modeSequence.push(currentMode);
      await this.executeInMode(currentMode, task, context);
    }
    
    return {
      modeSequence,
      finalMode: currentMode,
      handoffs: this.getHandoffs(modeSequence, context)
    };
  }
}
```

## ⚠️ Règles Optimisation Modes

### TOUJOURS:

- ✅ Sélectionner mode optimal selon type tâche
- ✅ Utiliser Agent Mode pour analyse/planification
- ✅ Utiliser Composer Mode pour éditions multi-fichiers
- ✅ Utiliser Cmd+K pour éditions simples
- ✅ Utiliser Background Agent pour tâches longues
- ✅ Coordonner handoff entre modes
- ✅ Optimiser utilisation ressources

### NE JAMAIS:

- ❌ Utiliser Agent Mode pour éditions simples
- ❌ Utiliser Cmd+K pour éditions multi-fichiers
- ❌ Utiliser Composer Mode pour analyse
- ❌ Ignorer Background Agent pour tâches longues
- ❌ Ignorer coordination entre modes

## 🔗 Références

### Règles Intégrées

- `@.cursor/rules/sub-agents-background-integration.md` - Intégration Background Agent
- `@.cursor/rules/task-decomposition.md` - Décomposition des tâches

### Documentation Cursor

- [Cursor Composer Documentation](https://docs.cursor.com/guides/composer)
- [Cursor Background Agent Documentation](https://docs.cursor.com/guides/background-agent)

---

**Note:** Ce fichier définit l'optimisation de l'utilisation des différents modes Cursor selon type tâche et contexte.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

