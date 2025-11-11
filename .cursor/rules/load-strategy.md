# Stratégie de Chargement Optimisée - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Documentation de la stratégie de chargement optimisée des règles Cursor pour éviter la saturation du contexte.

## 🎯 Objectif

**Objectif:** Charger uniquement les règles nécessaires pour éviter la saturation du contexte et améliorer la prise en compte des paramétrages par Cursor AI.

**Règle d'or:** Maximum 5-7 fichiers de règles simultanément

## 📊 Stratégie de Chargement

### Principe de Base

**P0 - Toujours chargé (3 fichiers):**
- `core.md` - Règles fondamentales
- `quality-principles.md` - Principes de qualité
- `code-quality.md` - Standards qualité code

**P1 - Chargé selon contexte (1-2 fichiers):**
- `backend.md` - Si modification backend
- `frontend.md` - Si modification frontend
- `database.md` - Si modification DB
- `ai-services.md` - Si modification IA
- `testing.md` - Si modification tests
- `senior-architect-oversight.md` - Si tâche complexe (> 3 todos) ou run autonome (IMPÉRATIF)
- `client-consultant-oversight.md` - Si tâche complexe (> 3 todos) ou run autonome (IMPÉRATIF)
- `migration-refactoring-manager.md` - Si tâche de migration/refactoring (IMPÉRATIF)
- `tech-debt-manager.md` - Si tâche de consolidation/dette technique (IMPÉRATIF)
- `hard-coding-specialist.md` - Si tâche complexe nécessitant hard coding (IMPÉRATIF)
- `todo-completion.md` - Si tâche avec > 3 todos (IMPÉRATIF)
- `iterative-perfection.md` - Si tâche nécessitant itération ou tests qui échouent (IMPÉRATIF)
- `persistent-execution.md` - Si run autonome ou tâche complexe (IMPÉRATIF - éviter arrêts prématurés, runs longs)
- `advanced-iteration-and-role-coordination.md` - Si run autonome ou tâche complexe (IMPÉRATIF - maximiser autonomie, durée, qualité)
- `similar-code-detection.md` - Si création ou modification de code
- `learning-memory.md` - Si tâche récurrente ou similaire
- `preventive-validation.md` - Avant toute modification (IMPÉRATIF)
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

**P2 - Chargé sur demande (0-2 fichiers):**
- `pre-task-evaluation.md` - Évaluation complète
- `pre-task-quick.md` - Évaluation rapide
- `workflows.md` - Workflows détaillés
- `agent-optimization.md` - Optimisations agent

### Matrice de Chargement par Type de Tâche

| Type de Tâche | P0 | P1 | P2 | Total |
|---------------|----|----|----|-------|
| Créer route API | 3 | backend (1) | workflows (1) | 5 |
| Créer composant React | 3 | frontend (1) | workflows (1) | 5 |
| Modifier service | 3 | backend (1) | - | 4 |
| Modifier service IA | 3 | ai-services + backend (2) | - | 5 |
| Modifier schéma DB | 3 | database + backend (2) | - | 5 |
| Tâche complexe | 3 | selon domaine (1-2) + senior-architect-oversight (1) + client-consultant-oversight (1) + hard-coding-specialist (1) + todo-completion (1) + iterative-perfection (1) + persistent-execution (1) + advanced-iteration-and-role-coordination (1) + similar-code-detection (1) + preventive-validation (1) | pre-task-evaluation (1) | 14-15 |
| Run autonome | 3 | selon domaine (1-2) + senior-architect-oversight (1) + client-consultant-oversight (1) + hard-coding-specialist (1) + todo-completion (1) + iterative-perfection (1) + persistent-execution (1) + advanced-iteration-and-role-coordination (1) + learning-memory (1) + similar-code-detection (1) + preventive-validation (1) | autonomous-workflows + agent-optimization (2) | 15-16 |
| Migration/Refactoring | 3 | selon domaine (1-2) + senior-architect-oversight (1) + client-consultant-oversight (1) + migration-refactoring-manager (1) + hard-coding-specialist (1) + preventive-validation (1) + dependency-intelligence (1) | pre-task-evaluation (1) | 10-11 |
| Consolidation/Dette technique | 3 | selon domaine (1-2) + senior-architect-oversight (1) + client-consultant-oversight (1) + tech-debt-manager (1) + migration-refactoring-manager (1) + hard-coding-specialist (1) + similar-code-detection (1) | pre-task-evaluation (1) | 10-11 |
| Tâche avec tests qui échouent | 3 | selon domaine (1-2) + iterative-perfection (1) + preventive-validation (1) | automated-testing-debugging (1) | 7-8 |
| Création/modification code | 3 | selon domaine (1-2) + similar-code-detection (1) + preventive-validation (1) | workflows (1) | 7-8 |
| Tâche récurrente | 3 | selon domaine (1-2) + learning-memory (1) + similar-code-detection (1) | advanced-learning (1) | 7-8 |

## 🔄 Détection Automatique du Contexte

### Backend

**Détection:** Fichiers dans `server/**/*.ts` (sauf tests)

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: `backend.md` (1)
- P1: `database.md` (si `server/storage/**` ou `server/**/*repository*.ts`)
- P1: `performance.md` (si optimisation)

**Total:** 4-6 fichiers

### Frontend

**Détection:** Fichiers dans `client/src/**/*.tsx` ou `client/src/**/*.ts`

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: `frontend.md` (1)
- P1: `testing.md` (si fichier de test)

**Total:** 4-5 fichiers

### Services IA

**Détection:** Fichiers dans `server/services/**AIService*.ts` ou `server/services/**SQL*.ts`

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: `ai-services.md` (1)
- P1: `backend.md` (1)
- P1: `database.md` (si SQL)
- P1: `performance.md` (si optimisation)

**Total:** 5-7 fichiers

### Base de Données

**Détection:** Fichiers dans `shared/schema.ts` ou modifications schéma

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: `database.md` (1)
- P1: `backend.md` (1)

**Total:** 5 fichiers

### Tâches Complexes / Runs Autonomes

**Détection:** Tâche avec plusieurs todos (> 3) ou run autonome

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: Selon domaine (backend/frontend/IA/database) (1-2)
- P1: `senior-architect-oversight.md` (IMPÉRATIF - supervision, priorisation, pilotage, code review) (1)
- P1: `client-consultant-oversight.md` (IMPÉRATIF - validation cahier des charges, audit, objectifs business, problématiques de base) (1)
- P1: `migration-refactoring-manager.md` (IMPÉRATIF si migration/refactoring) (1)
- P1: `tech-debt-manager.md` (IMPÉRATIF si consolidation/dette technique) (1)
- P1: `hard-coding-specialist.md` (IMPÉRATIF - réduction radicale erreurs, automatisation tâches complexes, approche créative innovante) (1)
- P1: `todo-completion.md` (IMPÉRATIF si > 3 todos) (1)
- P1: `iterative-perfection.md` (IMPÉRATIF si itération nécessaire) (1)
- P1: `persistent-execution.md` (IMPÉRATIF - éviter arrêts prématurés, runs longs) (1)
- P1: `advanced-iteration-and-role-coordination.md` (IMPÉRATIF - maximiser autonomie, durée, qualité) (1)
- P1: `similar-code-detection.md` (si création/modification) (1)
- P1: `learning-memory.md` (si tâche récurrente) (1)
- P1: `preventive-validation.md` (IMPÉRATIF avant modification) (1)
- P2: `pre-task-evaluation.md` (si complexe) (1)
- P2: `autonomous-workflows.md` (si run autonome) (1)
- P2: `agent-optimization.md` (si optimisation) (1)

**Total:** 11-14 fichiers (pour runs autonomes complexes)

### Tests

**Détection:** Fichiers avec `.test.ts`, `.spec.ts`, ou dans `tests/**`

**Règles chargées:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md` (3)
- P1: `testing.md` (1)
- P1: `backend.md` (si test backend)
- P1: `frontend.md` (si test frontend)

**Total:** 4-5 fichiers

## 📋 Exemples de Chargement Optimisé

### Exemple 1: Créer Route API Simple

**Contexte détecté:** Backend

**Règles chargées:**
1. P0: `core.md` (automatique)
2. P0: `quality-principles.md` (automatique)
3. P0: `code-quality.md` (automatique)
4. P1: `backend.md` (auto: fichier dans `server/`)
5. P1: `workflows.md` (référence pour pattern route)

**Total:** 5 fichiers

### Exemple 2: Créer Composant React Complexe

**Contexte détecté:** Frontend

**Règles chargées:**
1. P0: `core.md` (automatique)
2. P0: `quality-principles.md` (automatique)
3. P0: `code-quality.md` (automatique)
4. P1: `frontend.md` (auto: fichier dans `client/src/`)
5. P2: `pre-task-evaluation.md` (explicite: `@.cursor/rules/pre-task-evaluation.md`)

**Total:** 5 fichiers

### Exemple 3: Optimiser Service IA

**Contexte détecté:** IA

**Règles chargées:**
1. P0: `core.md` (automatique)
2. P0: `quality-principles.md` (automatique)
3. P0: `code-quality.md` (automatique)
4. P1: `ai-services.md` (auto: fichier dans `server/services/**AIService*.ts`)
5. P1: `backend.md` (auto: fichier dans `server/`)
6. P1: `performance.md` (auto: optimisation)
7. P2: `pre-task-evaluation.md` (explicite)

**Total:** 7 fichiers

## 🎯 Optimisations

### Lazy Loading

**Principe:** Charger les règles P2 uniquement sur demande

**Implémentation:**
- P0: Toujours chargé (3 fichiers)
- P1: Chargé automatiquement selon contexte (1-2 fichiers)
- P2: Chargé explicitement avec `@` ou pour tâches complexes (0-2 fichiers)

### Réduction du Contexte

**Stratégies:**
1. **Priorisation:** Charger uniquement règles prioritaires
2. **Contextualisation:** Charger uniquement règles pertinentes au contexte
3. **Lazy loading:** Charger règles P2 sur demande uniquement
4. **Consolidation:** Éviter duplication entre fichiers

### Maximum Recommandé

**Pour tâches simples:** 4-5 fichiers maximum
**Pour tâches complexes:** 5-7 fichiers maximum
**Pour runs autonomes:** 6-8 fichiers maximum

## 🔗 Références

### Documentation Essentielle

- `@.cursor/rules/priority.md` - Priorités et matrice de chargement
- `@.cursor/rules/context-detection.md` - Détection automatique du contexte
- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte

### Guides

- `@.cursor/rules/quick-start.md` - Guide de démarrage rapide
- `@.cursor/rules/examples.md` - Exemples concrets
- `@AGENTS.md` - Index simplifié des règles

---

**Note:** Cette stratégie de chargement optimisée permet d'améliorer la prise en compte des paramétrages par Cursor AI en évitant la saturation du contexte.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

