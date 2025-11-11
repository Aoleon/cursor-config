# Détection Automatique du Contexte - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Règles de détection automatique du contexte pour optimiser le chargement des règles Cursor selon le type de modification.

## 🎯 Principe Fondamental

**Objectif:** Détecter automatiquement le contexte de la tâche pour charger uniquement les règles pertinentes et éviter la saturation du contexte.

## 📋 Règles de Détection Automatique

### Backend

**Détection:** Fichiers dans `server/**/*.ts` (sauf tests)

**Règles à charger automatiquement:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (toujours)
- P1: `backend.md` (automatique)
- P1: `database.md` (si fichier dans `server/storage/**` ou `server/**/*repository*.ts`)
- P1: `performance.md` (si fichier dans `server/services/**` et optimisation)

**Exemples:**
- `server/modules/auth/routes.ts` → Charger `backend.md`
- `server/storage/ao/AoRepository.ts` → Charger `backend.md` + `database.md`
- `server/services/AIService.ts` → Charger `backend.md` + `ai-services.md`

### Frontend

**Détection:** Fichiers dans `client/src/**/*.tsx` ou `client/src/**/*.ts`

**Règles à charger automatiquement:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (toujours)
- P1: `frontend.md` (automatique)
- P1: `testing.md` (si fichier de test)

**Exemples:**
- `client/src/components/ui/button.tsx` → Charger `frontend.md`
- `client/src/hooks/useOffer.ts` → Charger `frontend.md`
- `client/src/components/offers/CreateOfferModal.test.tsx` → Charger `frontend.md` + `testing.md`

### Services IA

**Détection:** Fichiers dans `server/services/**AIService*.ts` ou `server/services/**SQL*.ts`

**Règles à charger automatiquement:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (toujours)
- P1: `ai-services.md` (automatique)
- P1: `backend.md` (automatique)
- P1: `database.md` (si fichier contient SQL)
- P1: `performance.md` (si optimisation)

**Exemples:**
- `server/services/AIService.ts` → Charger `ai-services.md` + `backend.md`
- `server/services/SQLEngineService.ts` → Charger `ai-services.md` + `backend.md` + `database.md`

### Base de Données

**Détection:** Fichiers dans `shared/schema.ts` ou modifications schéma

**Règles à charger automatiquement:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (toujours)
- P1: `database.md` (automatique)
- P1: `backend.md` (automatique)

**Exemples:**
- `shared/schema.ts` → Charger `database.md` + `backend.md`
- `server/storage/**/*.ts` → Charger `database.md` + `backend.md`

### Tests

**Détection:** Fichiers avec `.test.ts`, `.spec.ts`, ou dans `tests/**`

**Règles à charger automatiquement:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (toujours)
- P1: `testing.md` (automatique)
- P1: `backend.md` (si test backend)
- P1: `frontend.md` (si test frontend)

**Exemples:**
- `server/modules/auth/routes.test.ts` → Charger `testing.md` + `backend.md`
- `client/src/components/ui/button.test.tsx` → Charger `testing.md` + `frontend.md`

### Tâches Complexes / Runs Autonomes

**Détection:** Tâche avec plusieurs todos (> 3) ou run autonome

**Règles à charger automatiquement:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (toujours)
- P1: Selon domaine (backend/frontend/IA/database)
- P1: `senior-architect-oversight.md` (IMPÉRATIF - supervision, priorisation, pilotage, code review)
- P1: `client-consultant-oversight.md` (IMPÉRATIF - validation cahier des charges, audit, objectifs business, problématiques de base)
- P1: `migration-refactoring-manager.md` (IMPÉRATIF si migration/refactoring)
- P1: `tech-debt-manager.md` (IMPÉRATIF si consolidation/dette technique)
- P1: `hard-coding-specialist.md` (IMPÉRATIF si tâche complexe nécessitant hard coding)
- P1: `todo-completion.md` (IMPÉRATIF si > 3 todos)
- P1: `persistent-execution.md` (IMPÉRATIF si run autonome ou tâche complexe - éviter arrêts prématurés, runs longs)
- P1: `advanced-iteration-and-role-coordination.md` (IMPÉRATIF si run autonome ou tâche complexe - maximiser autonomie, durée, qualité)
- P2: `pre-task-evaluation.md` (si complexe)
- P2: `autonomous-workflows.md` (si run autonome)
- P2: `agent-optimization.md` (si optimisation)

**Exemples:**
- Tâche complexe ou run autonome → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `hard-coding-specialist.md` (IMPÉRATIF) + règles domaine
- Tâche de migration/refactoring → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `migration-refactoring-manager.md` (IMPÉRATIF) + `hard-coding-specialist.md` (IMPÉRATIF) + règles domaine
- Tâche de consolidation/dette technique → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `tech-debt-manager.md` (IMPÉRATIF) + `hard-coding-specialist.md` (IMPÉRATIF) + règles domaine
- Tâche avec 5 todos → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `todo-completion.md` (IMPÉRATIF) + règles domaine
- Run autonome long → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `todo-completion.md` + `autonomous-workflows.md` + `agent-optimization.md`
- Tâche nécessitant itération → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `iterative-perfection.md` (IMPÉRATIF) + règles domaine
- Tâche de création/modification → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `similar-code-detection.md` + `preventive-validation.md` + règles domaine
- Tâche récurrente → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `learning-memory.md` + règles domaine

### Détection Automatique Contextes Multi-Rôles

**Détection automatique contextes complexes:**
- Migration + Consolidation → Charger Migration + Tech Debt + Hard Coding + Architecte + Client
- Tâche complexe avec erreurs → Charger Hard Coding + Architecte + Client + Iterative Perfection
- Migration + Consolidation + Erreurs → Charger tous les rôles pertinents

**Pattern:**
```typescript
// Détection automatique contexte multi-rôles
function detectMultiRoleContext(
  task: Task,
  context: Context
): MultiRoleContext {
  const roles: Role[] = [];
  
  // Détection automatique selon caractéristiques tâche
  if (task.involvesMigration && task.involvesConsolidation) {
    roles.push('migration-manager', 'tech-debt-manager', 'hard-coding-specialist');
  }
  
  if (task.isComplex && task.hasErrors) {
    roles.push('hard-coding-specialist', 'senior-architect', 'client-consultant');
  }
  
  if (task.involvesMigration && task.hasErrors) {
    roles.push('migration-manager', 'hard-coding-specialist', 'senior-architect');
  }
  
  if (task.involvesConsolidation && task.hasErrors) {
    roles.push('tech-debt-manager', 'hard-coding-specialist', 'senior-architect');
  }
  
  // Toujours charger Architecte et Client pour tâches complexes
  if (task.isComplex || task.todos.length > 3) {
    roles.push('senior-architect', 'client-consultant');
  }
  
  return {
    roles: [...new Set(roles)], // Éliminer doublons
    requiresMultiRoleValidation: roles.length >= 3
  };
}
```

## 🏷️ Métadonnées dans les Fichiers de Règles

### Format des Métadonnées

**Ajouter en en-tête de chaque fichier de règles:**

```markdown
<!-- 
Context: backend, server, routes, api
Priority: P1
Auto-load: when editing server/**/*.ts
Dependencies: core.md, quality-principles.md
-->
```

### Métadonnées par Fichier

**backend.md:**
```markdown
<!-- 
Context: backend, server, routes, api, middleware
Priority: P1
Auto-load: when editing server/**/*.ts
Dependencies: core.md, quality-principles.md, code-quality.md
-->
```

**frontend.md:**
```markdown
<!-- 
Context: frontend, react, components, hooks
Priority: P1
Auto-load: when editing client/src/**/*.tsx
Dependencies: core.md, quality-principles.md, code-quality.md
-->
```

**database.md:**
```markdown
<!-- 
Context: database, drizzle, schema, migrations
Priority: P1
Auto-load: when editing shared/schema.ts or server/storage/**/*.ts
Dependencies: core.md, quality-principles.md, code-quality.md
-->
```

**ai-services.md:**
```markdown
<!-- 
Context: ai, services, chatbot, sql-engine
Priority: P1
Auto-load: when editing server/services/**AIService*.ts or server/services/**SQL*.ts
Dependencies: core.md, quality-principles.md, code-quality.md, backend.md
-->
```

**testing.md:**
```markdown
<!-- 
Context: tests, testing, e2e
Priority: P1
Auto-load: when editing **/*.test.ts or **/*.spec.ts or tests/**/*.ts
Dependencies: core.md, quality-principles.md, code-quality.md
-->
```

**todo-completion.md:**
```markdown
<!-- 
Context: todos, completion, autonomy, complex-tasks
Priority: P1
Auto-load: when task has > 3 todos or autonomous run
Dependencies: core.md, quality-principles.md, code-quality.md
-->
```

**senior-architect-oversight.md:**
```markdown
<!-- 
Context: supervision, prioritization, piloting, code-review, architecture, complex-tasks, autonomous-runs
Priority: P1
Auto-load: when task is complex (> 3 todos) or autonomous run
Dependencies: core.md, quality-principles.md, code-quality.md, iterative-perfection.md, todo-completion.md, bug-prevention.md, quality-checklist.md, client-consultant-oversight.md
-->
```

**client-consultant-oversight.md:**
```markdown
<!-- 
Context: business-alignment, requirements-validation, audit-validation, client-expectations, complex-tasks, autonomous-runs
Priority: P1
Auto-load: when task is complex (> 3 todos) or autonomous run
Dependencies: core.md, quality-principles.md, code-quality.md, senior-architect-oversight.md, iterative-perfection.md, todo-completion.md, projectbrief.md, productContext.md
-->
```

**migration-refactoring-manager.md:**
```markdown
<!-- 
Context: migration, refactoring, modular-architecture, regression-detection, module-consistency, dependencies-management
Priority: P1
Auto-load: when task involves migration or refactoring
Dependencies: core.md, quality-principles.md, code-quality.md, senior-architect-oversight.md, client-consultant-oversight.md, preventive-validation.md, dependency-intelligence.md
-->
```

**tech-debt-manager.md:**
```markdown
<!-- 
Context: technical-debt, code-duplication, service-consolidation, monolithic-reduction, anti-patterns, code-smells
Priority: P1
Auto-load: when task involves consolidation or technical debt elimination
Dependencies: core.md, quality-principles.md, code-quality.md, senior-architect-oversight.md, migration-refactoring-manager.md, similar-code-detection.md
-->
```

**hard-coding-specialist.md:**
```markdown
<!-- 
Context: hard-coding, error-reduction, complex-automation, creative-innovation, robustness, extreme-quality
Priority: P1
Auto-load: when task is complex and requires hard coding or radical error reduction
Dependencies: core.md, quality-principles.md, code-quality.md, senior-architect-oversight.md, bug-prevention.md, error-recovery.md, script-automation.md, iterative-perfection.md
-->
```

**iterative-perfection.md:**
```markdown
<!-- 
Context: iteration, perfection, auto-fix, testing, debugging
Priority: P1
Auto-load: when task requires iteration or has test failures
Dependencies: core.md, quality-principles.md, code-quality.md, todo-completion.md, automated-testing-debugging.md, senior-architect-oversight.md
-->
```

**similar-code-detection.md:**
```markdown
<!-- 
Context: code-creation, code-modification, duplication, reuse
Priority: P1
Auto-load: when creating or modifying code
Dependencies: core.md, quality-principles.md, code-quality.md, context-search.md
-->
```

**learning-memory.md:**
```markdown
<!-- 
Context: learning, memory, reuse, patterns, solutions
Priority: P1
Auto-load: when task is similar to previous tasks or recurring
Dependencies: core.md, quality-principles.md, code-quality.md, advanced-learning.md
-->
```

**preventive-validation.md:**
```markdown
<!-- 
Context: validation, impact-analysis, dependencies, prevention
Priority: P1
Auto-load: before any code modification
Dependencies: core.md, quality-principles.md, code-quality.md, iterative-perfection.md
-->
```

## 📊 Mapping Contexte → Règles

### Matrice de Chargement

| Contexte | P0 (Toujours) | P1 (Auto) | P2 (Sur demande) |
|----------|---------------|-----------|------------------|
| Backend | core, quality-principles, code-quality | backend | pre-task-evaluation, workflows |
| Frontend | core, quality-principles, code-quality | frontend | pre-task-evaluation, workflows |
| Database | core, quality-principles, code-quality | database, backend | pre-task-evaluation, workflows |
| IA | core, quality-principles, code-quality | ai-services, backend | pre-task-evaluation, agent-optimization |
| Tests | core, quality-principles, code-quality | testing | pre-task-evaluation, workflows |
| Tâche complexe (> 3 todos) | core, quality-principles, code-quality | selon domaine + senior-architect-oversight (IMPÉRATIF) + client-consultant-oversight (IMPÉRATIF) + hard-coding-specialist (IMPÉRATIF) + todo-completion (IMPÉRATIF) + iterative-perfection (IMPÉRATIF) + persistent-execution (IMPÉRATIF) + advanced-iteration-and-role-coordination (IMPÉRATIF) + similar-code-detection + preventive-validation | pre-task-evaluation, autonomous-workflows |
| Run autonome | core, quality-principles, code-quality | selon domaine + senior-architect-oversight (IMPÉRATIF) + client-consultant-oversight (IMPÉRATIF) + hard-coding-specialist (IMPÉRATIF) + todo-completion (IMPÉRATIF) + iterative-perfection (IMPÉRATIF) + persistent-execution (IMPÉRATIF) + advanced-iteration-and-role-coordination (IMPÉRATIF) + learning-memory + similar-code-detection + preventive-validation | autonomous-workflows, agent-optimization |
| Migration + Consolidation | core, quality-principles, code-quality | selon domaine + senior-architect-oversight (IMPÉRATIF) + client-consultant-oversight (IMPÉRATIF) + migration-refactoring-manager (IMPÉRATIF) + tech-debt-manager (IMPÉRATIF) + hard-coding-specialist (IMPÉRATIF) + preventive-validation + dependency-intelligence | pre-task-evaluation |
| Tâche complexe avec erreurs | core, quality-principles, code-quality | selon domaine + senior-architect-oversight (IMPÉRATIF) + client-consultant-oversight (IMPÉRATIF) + hard-coding-specialist (IMPÉRATIF) + iterative-perfection (IMPÉRATIF) + preventive-validation | automated-testing-debugging |
| Tâche avec tests qui échouent | core, quality-principles, code-quality | selon domaine + iterative-perfection (IMPÉRATIF) + preventive-validation | automated-testing-debugging |
| Création/modification code | core, quality-principles, code-quality | selon domaine + similar-code-detection + preventive-validation | context-search, examples |
| Tâche récurrente | core, quality-principles, code-quality | selon domaine + learning-memory + similar-code-detection | advanced-learning |

### Exemples de Chargement

**Exemple 1: Créer route API**
- Contexte détecté: Backend
- Règles chargées: P0 (3) + P1 backend (1) = 4 fichiers

**Exemple 2: Créer composant React**
- Contexte détecté: Frontend
- Règles chargées: P0 (3) + P1 frontend (1) = 4 fichiers

**Exemple 3: Modifier service IA**
- Contexte détecté: IA
- Règles chargées: P0 (3) + P1 ai-services + backend (2) = 5 fichiers

**Exemple 4: Tâche complexe (> 3 todos)**
- Contexte détecté: Backend + Tâche complexe
- Règles chargées: P0 (3) + P1 backend + senior-architect-oversight (1) + client-consultant-oversight (1) + hard-coding-specialist (1) + todo-completion (1) + iterative-perfection (1) + persistent-execution (1) + advanced-iteration-and-role-coordination (1) + similar-code-detection (1) + preventive-validation (1) + P2 pre-task-evaluation (1) = 14 fichiers

**Exemple 5: Run autonome**
- Contexte détecté: Backend + Run autonome
- Règles chargées: P0 (3) + P1 backend + senior-architect-oversight (1) + client-consultant-oversight (1) + hard-coding-specialist (1) + todo-completion (1) + iterative-perfection (1) + persistent-execution (1) + advanced-iteration-and-role-coordination (1) + learning-memory (1) + similar-code-detection (1) + preventive-validation (1) + P2 autonomous-workflows + agent-optimization (2) = 16 fichiers

**Exemple 6: Migration + Consolidation**
- Contexte détecté: Backend + Migration + Consolidation
- Règles chargées: P0 (3) + P1 backend + senior-architect-oversight (1) + client-consultant-oversight (1) + migration-refactoring-manager (1) + tech-debt-manager (1) + hard-coding-specialist (1) + preventive-validation (1) + dependency-intelligence (1) + P2 pre-task-evaluation (1) = 12 fichiers

**Exemple 7: Tâche complexe avec erreurs**
- Contexte détecté: Backend + Tâche complexe + Erreurs
- Règles chargées: P0 (3) + P1 backend + senior-architect-oversight (1) + client-consultant-oversight (1) + hard-coding-specialist (1) + iterative-perfection (1) + preventive-validation (1) + P2 automated-testing-debugging (1) = 10 fichiers

**Exemple 8: Tâche avec tests qui échouent**
- Contexte détecté: Backend + Tests qui échouent
- Règles chargées: P0 (3) + P1 backend + iterative-perfection + preventive-validation (3) + P2 automated-testing-debugging (1) = 7 fichiers

**Exemple 9: Création de nouvelle route API**
- Contexte détecté: Backend + Création code
- Règles chargées: P0 (3) + P1 backend + similar-code-detection + preventive-validation (3) + P2 workflows (1) = 7 fichiers

**Exemple 10: Tâche récurrente**
- Contexte détecté: Backend + Tâche récurrente
- Règles chargées: P0 (3) + P1 backend + learning-memory + similar-code-detection (3) + P2 advanced-learning (1) = 7 fichiers

## 🔄 Détection Automatique

### Algorithme de Détection

**Pattern:**
```typescript
interface ContextDetection {
  filePath: string;
  context: {
    domain: 'backend' | 'frontend' | 'database' | 'ai' | 'tests';
    subdomain?: string;
  };
  rulesToLoad: {
    p0: string[]; // Toujours
    p1: string[]; // Automatique selon contexte
    p2: string[]; // Sur demande
  };
}

function detectContext(filePath: string): ContextDetection {
  // 1. Détecter domaine principal
  if (filePath.includes('server/') && !filePath.includes('.test.')) {
    return {
      filePath,
      context: { domain: 'backend' },
      rulesToLoad: {
        p0: ['core.md', 'quality-principles.md', 'code-quality.md'],
        p1: ['backend.md'],
        p2: []
      }
    };
  }
  
  if (filePath.includes('client/src/')) {
    return {
      filePath,
      context: { domain: 'frontend' },
      rulesToLoad: {
        p0: ['core.md', 'quality-principles.md', 'code-quality.md'],
        p1: ['frontend.md'],
        p2: []
      }
    };
  }
  
  // ... autres détections
}
```

### Détection Avancée

**Sous-domaines:**
- `server/storage/**` → Ajouter `database.md`
- `server/services/**AIService*` → Ajouter `ai-services.md`
- `server/services/**SQL*` → Ajouter `ai-services.md` + `database.md`
- `**/*.test.ts` → Ajouter `testing.md`

## 🎯 Quand Charger Chaque Fichier

### Règles P0 (Toujours)

**Chargement:** Automatique dans tous les contextes

- `core.md` - Règles fondamentales
- `quality-principles.md` - Principes de qualité
- `code-quality.md` - Standards qualité code

### Règles P1 (Selon Contexte)

**Chargement:** Automatique selon détection

- `backend.md` - Si modification backend
- `frontend.md` - Si modification frontend
- `database.md` - Si modification DB ou storage
- `ai-services.md` - Si modification services IA
- `testing.md` - Si modification tests
- `performance.md` - Si optimisation performance
- `senior-architect-oversight.md` - Si tâche complexe (> 3 todos) ou run autonome (IMPÉRATIF)
- `client-consultant-oversight.md` - Si tâche complexe (> 3 todos) ou run autonome (IMPÉRATIF)
- `migration-refactoring-manager.md` - Si tâche de migration/refactoring (IMPÉRATIF)
- `tech-debt-manager.md` - Si tâche de consolidation/dette technique (IMPÉRATIF)
- `hard-coding-specialist.md` - Si tâche complexe nécessitant hard coding (IMPÉRATIF)
- `todo-completion.md` - Si tâche avec > 3 todos (IMPÉRATIF)
- `iterative-perfection.md` - Si tâche nécessitant itération ou tests qui échouent (IMPÉRATIF)
- `similar-code-detection.md` - Si création ou modification de code
- `learning-memory.md` - Si tâche récurrente ou similaire à tâches précédentes
- `preventive-validation.md` - Avant toute modification de code (IMPÉRATIF)
- `auto-performance-detection.md` - Si problèmes de performance potentiels
- `context-optimization.md` - Si contexte saturé (IMPÉRATIF)
- `workflow-consolidation.md` - Si tâche récurrente avec plusieurs succès
- `dependency-intelligence.md` - Si modification avec dépendances
- `intelligent-model-selection.md` - Si tâche nécessitant IA (IMPÉRATIF)
- `search-cache.md` - Si recherches répétitives (IMPÉRATIF)
- `parallel-execution.md` - Si opérations indépendantes (IMPÉRATIF)
- `batch-processing.md` - Si tâches similaires multiples (IMPÉRATIF)
- `error-recovery.md` - Si erreur détectée (IMPÉRATIF)
- `conflict-detection.md` - Si conflit potentiel (IMPÉRATIF)
- `bug-prevention.md` - Si bug potentiel (IMPÉRATIF)

### Règles P2 (Sur Demande)

**Chargement:** Explicite avec `@` ou pour tâches complexes

- `pre-task-evaluation.md` - Évaluation complète
- `pre-task-quick.md` - Évaluation rapide
- `workflows.md` - Workflows détaillés
- `agent-optimization.md` - Optimisations agent
- `autonomous-workflows.md` - Workflows autonomes

## 🔗 Références

### Documentation Essentielle

- `@.cursor/rules/priority.md` - Priorités et matrice de chargement
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte

### Guides

- `@.cursor/rules/quick-start.md` - Guide de démarrage rapide
- `@.cursor/rules/examples.md` - Exemples concrets
- `@AGENTS.md` - Index simplifié des règles

---

**Note:** Cette détection automatique permet d'optimiser le chargement des règles et d'améliorer la prise en compte des paramétrages par Cursor AI.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

