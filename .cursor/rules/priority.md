# Priorités des Règles - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Ce fichier définit les niveaux de priorité des règles Cursor pour optimiser le chargement et l'application des règles selon le contexte.

## 🎯 Niveaux de Priorité

### P0 - Règles Critiques (Toujours Appliquées)

**Chargement:** Automatique dans tous les contextes

Ces règles sont fondamentales et doivent toujours être appliquées, quel que soit le type de tâche.

**Fichiers:**
- `core.md` - Règles fondamentales du projet
- `quality-principles.md` - Philosophie de qualité (robustesse, performance, maintenabilité)
- `code-quality.md` - Standards stricts de qualité code
- `request-timeout-prevention.md` - Prévention des abandons de requêtes (IMPÉRATIF - éviter "User aborted request")
- `response-validation-hook.md` - Hook de validation de réponse avant arrêt (IMPÉRATIF - éliminer arrêts prématurés)
- `context-management-hierarchical.md` - Gestion contexte hiérarchique (IMPÉRATIF - runs 6+ heures sans saturation)

**Contenu:**
- Contexte du projet
- Philosophie de qualité
- Règles essentielles (TOUJOURS / NE JAMAIS)
- Standards de code (types, validation, gestion d'erreurs)
- Principes de robustesse, performance, maintenabilité

**Quand charger:**
- Toujours, automatiquement
- Base pour toutes les autres règles

### P1 - Règles Importantes (Selon Contexte)

**Chargement:** Automatique selon le type de modification

Ces règles sont importantes mais spécifiques à un domaine. Elles sont chargées automatiquement selon le contexte de la tâche.

**Fichiers par domaine:**

**Backend:**
- `backend.md` - Patterns Express, services, middleware
- `database.md` - Drizzle ORM, migrations, requêtes

**Frontend:**
- `frontend.md` - Patterns React, composants, hooks

**Services IA:**
- `ai-services.md` - Services IA, chatbot, SQL sécurisé

**Tests:**
- `testing.md` - Patterns tests, couverture, E2E

**Performance:**
- `performance.md` - Optimisations performance, cache, requêtes

**Autonomie:**
- `senior-architect-oversight.md` - Supervision architecte sénior (IMPÉRATIF - supervision, priorisation, pilotage, code review)
- `client-consultant-oversight.md` - Supervision consultant client (IMPÉRATIF - validation cahier des charges, audit, objectifs business, problématiques de base)
- `migration-refactoring-manager.md` - Gestionnaire migration/refactoring (IMPÉRATIF - supervision migration modulaire, détection régressions, validation cohérence)
- `tech-debt-manager.md` - Gestionnaire dette technique (IMPÉRATIF - identification services dupliqués, planification consolidation, réduction monolithiques)
- `update-manager.md` - Gestionnaire de mises à jour (IMPÉRATIF - détection automatique mises à jour, analyse risques, planification structurée, validation sécurisée)
- `hard-coding-specialist.md` - Spécialiste hard coding (IMPÉRATIF - réduction radicale erreurs, automatisation tâches complexes, approche créative innovante)
- `todo-completion.md` - Completion des todos (IMPÉRATIF - éviter interruptions)
- `iterative-perfection.md` - Itération automatique jusqu'à perfection (IMPÉRATIF - éviter arrêt prématuré)
- `persistent-execution.md` - Exécution persistante (IMPÉRATIF - éviter arrêts prématurés, runs longs)
- `advanced-iteration-and-role-coordination.md` - Itérations avancées et coordination des rôles (IMPÉRATIF - maximiser autonomie, durée, qualité)
- `task-decomposition.md` - Décomposition des tâches conforme documentation Cursor (IMPÉRATIF - critères de taille optimale, pensée séquentielle, Background Agent, listes structurées)
- `similar-code-detection.md` - Détection proactive de code similaire (éviter duplication)
- `learning-memory.md` - Mémoire persistante des apprentissages (réutiliser solutions)
- `preventive-validation.md` - Validation préventive (prévenir erreurs)
- `auto-performance-detection.md` - Détection et correction automatique des problèmes de performance
- `context-optimization.md` - Gestion intelligente du contexte (éviter saturation)
- `workflow-consolidation.md` - Consolidation automatique des workflows réussis
- `dependency-intelligence.md` - Intelligence des dépendances (éviter régressions)
- `intelligent-model-selection.md` - Sélection intelligente du modèle IA (optimiser performances/coûts)
- `search-cache.md` - Cache intelligent des recherches (réduire latence)
- `parallel-execution.md` - Exécution parallèle (améliorer performances)
- `batch-processing.md` - Traitement par lots (optimiser efficacité)
- `error-recovery.md` - Récupération automatique après erreurs (améliorer robustesse)
- `conflict-detection.md` - Détection proactive des conflits (éviter problèmes)
- `bug-prevention.md` - Détection proactive des bugs (améliorer qualité)
- `intelligent-task-detection.md` - Détection intelligente des tâches (détection automatique complexité)
- `rule-cache.md` - Cache intelligent des règles (éviter rechargement)
- `rule-feedback-loop.md` - Boucle de feedback pour règles (ajustement automatique)
- `metadata-standard.md` - Standardisation des métadonnées (format standardisé)
- `auto-documentation.md` - Auto-documentation intelligente du code (documentation automatique)
- `cost-optimization.md` - Optimisation des coûts IA (sélection modèle, cache, batching)
- `timeout-management.md` - Gestion intelligente des timeouts (décomposition, checkpoints, retry)
- `intelligent-preloading.md` - Préchargement intelligent (prédiction fichiers, cache prédictif)
- `context-compression.md` - Compression intelligente du contexte (résumé, compression sémantique)
- `validation-pipeline.md` - Pipeline de validation en cascade (validation progressive, arrêt précoce)
- `predictive-problem-detection.md` - Prédiction proactive des problèmes (analyse risques, alertes)
- `auto-refactoring.md` - Auto-refactoring intelligent (élimination duplication, patterns)
- `code-sentiment-analysis.md` - Analyse de sentiment du code (score qualité, code smells)
- `auto-test-generation.md` - Génération automatique de tests (tests unitaires, régression, performance)
- `tool-call-limit-workaround.md` - Contournement limite 1000 tool calls (checkpointing, continuation)
- `cursor-limits-workaround.md` - Système unifié de contournement toutes limites Cursor (tool calls, contexte, MCP, fichiers, quotas) (IMPÉRATIF)

**Quand charger:**
- Automatiquement si modification dans le domaine correspondant
- Exemple: `backend.md` si modification dans `server/**/*.ts`
- Exemple: `frontend.md` si modification dans `client/src/**/*.tsx`

### P2 - Règles d'Optimisation (Optionnelles)

**Chargement:** Sur demande ou pour tâches complexes

Ces règles optimisent le comportement de l'agent mais ne sont pas essentielles pour les tâches courantes.

**Fichiers:**
- `agent-optimization.md` - Stratégies d'optimisation de l'agent
- `autonomous-workflows.md` - Workflows autonomes pour runs plus longs
- `auto-detection.md` - Détection automatique des anti-patterns
- `advanced-learning.md` - Stratégies d'apprentissage avancées (Reflexion, ICE)
- `context-search.md` - Recherche contextuelle avancée
- `long-term-autonomy.md` - Autonomie longue durée (heures/jours)
- `automated-testing-debugging.md` - Tests E2E et débogage automatisé
- `transversal-performance.md` - Performance transversale et autonomie
- `pre-task-evaluation.md` - Évaluation préalable complète (rapidité, performance, robustesse, maintenabilité)
- `script-automation.md` - Automatisation par script (détection, création, exécution)

**Quand charger:**
- Pour tâches complexes nécessitant optimisation
- Pour runs autonomes plus longs
- Sur demande explicite avec `@.cursor/rules/[fichier].md`

## 📋 Matrice de Chargement

### Par Type de Tâche

**Créer/Modifier Route API:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md`
- P1: `backend.md`, `database.md` (si DB), `testing.md` (si tests)
- P2: `pre-task-evaluation.md` (si complexe), `workflows.md` (référence)

**Créer/Modifier Composant React:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md`
- P1: `frontend.md`, `testing.md` (si tests)
- P2: `pre-task-evaluation.md` (si complexe), `workflows.md` (référence)

**Modifier Service IA:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md`
- P1: `ai-services.md`, `backend.md`, `performance.md`
- P2: `pre-task-evaluation.md` (si complexe), `agent-optimization.md`

**Modifier Schéma DB:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md`
- P1: `database.md`, `backend.md`
- P2: `pre-task-evaluation.md` (si complexe)

**Tâche Complexe / Run Autonome:**
- P0: `core.md`, `quality-principles.md`, `code-quality.md`
- P1: Selon domaine (backend/frontend/IA) + `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `migration-refactoring-manager.md` (IMPÉRATIF si migration/refactoring) + `tech-debt-manager.md` (IMPÉRATIF si dette technique) + `update-manager.md` (IMPÉRATIF si modification package.json ou dépendances) + `hard-coding-specialist.md` (IMPÉRATIF si tâche complexe nécessitant hard coding) + `todo-completion.md` (IMPÉRATIF) + `iterative-perfection.md` (IMPÉRATIF) + `persistent-execution.md` (IMPÉRATIF - éviter arrêts prématurés, runs longs) + `advanced-iteration-and-role-coordination.md` (IMPÉRATIF - maximiser autonomie, durée, qualité) + `task-decomposition.md` (IMPÉRATIF - décomposition avec critères de taille, pensée séquentielle, Background Agent, listes structurées) + `similar-code-detection.md` + `learning-memory.md` + `preventive-validation.md` + `auto-performance-detection.md` + `context-optimization.md` + `workflow-consolidation.md` + `dependency-intelligence.md` + `intelligent-model-selection.md` + `search-cache.md` + `parallel-execution.md` + `batch-processing.md` + `error-recovery.md` + `conflict-detection.md` + `bug-prevention.md`
- P2: `pre-task-evaluation.md`, `autonomous-workflows.md`, `agent-optimization.md`

## 🔄 Stratégie de Chargement Optimisée

### Principe

**Objectif:** Charger uniquement les règles nécessaires pour éviter saturation du contexte.

**Règle d'or:** 
- P0: Toujours chargé (3 fichiers)
- P1: Chargé selon contexte (1-2 fichiers)
- P2: Chargé sur demande (0-2 fichiers)

**Maximum recommandé:** 5-7 fichiers de règles simultanément

### Détection Automatique du Contexte

**Backend:**
- Fichiers dans `server/**/*.ts` → Charger `backend.md`
- Fichiers dans `server/storage/**` → Charger `database.md`
- Fichiers dans `server/services/**` → Charger `backend.md` + `performance.md` (si optimisation)

**Frontend:**
- Fichiers dans `client/src/**/*.tsx` → Charger `frontend.md`
- Fichiers dans `client/src/components/**` → Charger `frontend.md`

**Services IA:**
- Fichiers dans `server/services/**AIService*.ts` → Charger `ai-services.md`
- Fichiers dans `server/services/**SQL*.ts` → Charger `ai-services.md` + `database.md`

**Tests:**
- Fichiers dans `**/*.test.ts` ou `**/*.spec.ts` → Charger `testing.md`

**Tâches Complexes / Runs Autonomes:**
- Tâche complexe ou run autonome → Charger `senior-architect-oversight.md` (IMPÉRATIF) + `client-consultant-oversight.md` (IMPÉRATIF) + `hard-coding-specialist.md` (IMPÉRATIF si tâche complexe nécessitant hard coding) + `task-decomposition.md` (IMPÉRATIF - décomposition avec critères de taille, pensée séquentielle, Background Agent, listes structurées) + `intelligent-task-detection.md` (détection automatique complexité)
- Tâche de migration/refactoring → Charger `migration-refactoring-manager.md` (IMPÉRATIF)
- Tâche de consolidation/dette technique → Charger `tech-debt-manager.md` (IMPÉRATIF)
- Modification de package.json ou tâche liée aux dépendances → Charger `update-manager.md` (IMPÉRATIF - détection automatique mises à jour, analyse risques)
- Demande explicite de vérification de mises à jour → Charger `update-manager.md` (IMPÉRATIF)
- Tâche avec plusieurs todos → Charger `todo-completion.md` (IMPÉRATIF) + `task-decomposition.md` (IMPÉRATIF - génération listes structurées avec dépendances)
- Tâche nécessitant itération → Charger `iterative-perfection.md` (IMPÉRATIF)
- Tâche de création/modification → Charger `similar-code-detection.md` + `preventive-validation.md` + `dependency-intelligence.md` + `auto-documentation.md` (si documentation nécessaire)
- Tâche utilisant IA → Charger `cost-optimization.md` (optimisation coûts) + `intelligent-model-selection.md`
- Tâche avec opérations longues → Charger `timeout-management.md` (gestion timeouts) + `task-decomposition.md`
- Tâche avec contexte large → Charger `context-compression.md` (compression contexte) + `intelligent-preloading.md` (préchargement)
- Tâche nécessitant validation stricte → Charger `validation-pipeline.md` (pipeline validation)
- Tâche avec risques potentiels → Charger `predictive-problem-detection.md` (prédiction problèmes)
- Tâche avec code dupliqué → Charger `auto-refactoring.md` (auto-refactoring)
- Tâche nécessitant tests → Charger `auto-test-generation.md` (génération tests)
- Tool calls > 800 → Charger `cursor-limits-workaround.md` (système unifié) (IMPÉRATIF)
- Contexte > 80% → Charger `cursor-limits-workaround.md` (système unifié) (IMPÉRATIF)
- MCP Tools > 32 → Charger `cursor-limits-workaround.md` (système unifié) (IMPÉRATIF)
- Fichiers > 50KB → Charger `cursor-limits-workaround.md` (système unifié) (IMPÉRATIF)
- Quotas mensuels < 50 → Charger `cursor-limits-workaround.md` (système unifié) (IMPÉRATIF)
- Tâche récurrente → Charger `learning-memory.md` + `workflow-consolidation.md`
- Tâche avec problèmes de performance → Charger `auto-performance-detection.md`
- Contexte saturé → Charger `context-optimization.md` (IMPÉRATIF)
- Tâche nécessitant IA → Charger `intelligent-model-selection.md` (IMPÉRATIF)
- Recherches répétitives → Charger `search-cache.md` (IMPÉRATIF) + `rule-cache.md` (cache règles)
- Opérations indépendantes → Charger `parallel-execution.md` (IMPÉRATIF) + `task-decomposition.md` (si décomposition nécessaire avec Background Agent)
- Tâches similaires multiples → Charger `batch-processing.md` (IMPÉRATIF)
- Erreur détectée → Charger `error-recovery.md` (IMPÉRATIF)
- Conflit potentiel → Charger `conflict-detection.md` (IMPÉRATIF)
- Bug potentiel → Charger `bug-prevention.md` (IMPÉRATIF)
- Optimisation paramétrage → Charger `rule-feedback-loop.md` (ajustement automatique) + `rule-cache.md` (cache intelligent)

### Chargement Explicite avec @

Pour charger des règles P2 explicitement:

```
@.cursor/rules/pre-task-evaluation.md - Pour évaluation préalable complète
@.cursor/rules/autonomous-workflows.md - Pour workflows autonomes
@.cursor/rules/agent-optimization.md - Pour optimisations agent
```

## 📊 Exemples de Chargement

### Exemple 1: Créer une Route API Simple

**Règles chargées:**
1. P0: `core.md` (automatique)
2. P0: `quality-principles.md` (automatique)
3. P0: `code-quality.md` (automatique)
4. P1: `backend.md` (auto: fichier dans `server/`)
5. P1: `workflows.md` (référence pour pattern route)

**Total:** 5 fichiers

### Exemple 2: Créer Composant React Complexe

**Règles chargées:**
1. P0: `core.md` (automatique)
2. P0: `quality-principles.md` (automatique)
3. P0: `code-quality.md` (automatique)
4. P1: `frontend.md` (auto: fichier dans `client/src/`)
5. P2: `pre-task-evaluation.md` (explicite: `@.cursor/rules/pre-task-evaluation.md`)

**Total:** 5 fichiers

### Exemple 3: Optimiser Service IA

**Règles chargées:**
1. P0: `core.md` (automatique)
2. P0: `quality-principles.md` (automatique)
3. P0: `code-quality.md` (automatique)
4. P1: `ai-services.md` (auto: fichier dans `server/services/**AIService*.ts`)
5. P1: `performance.md` (auto: optimisation)
6. P2: `pre-task-evaluation.md` (explicite)
7. P2: `agent-optimization.md` (explicite)

**Total:** 7 fichiers

## 🎯 Recommandations

### Pour Tâches Simples

**Charger uniquement:**
- P0 (3 fichiers)
- P1 selon domaine (1 fichier)

**Total:** 4 fichiers maximum

### Pour Tâches Complexes

**Charger:**
- P0 (3 fichiers)
- P1 selon domaine (1-2 fichiers)
- P2 si nécessaire (1-2 fichiers)

**Total:** 5-7 fichiers

### Pour Runs Autonomes Longs

**Charger:**
- P0 (3 fichiers)
- P1 selon domaine (1-2 fichiers)
- P2: `autonomous-workflows.md`, `agent-optimization.md`, `pre-task-evaluation.md`

**Total:** 6-8 fichiers

## 🔗 Références

### Documentation Essentielle
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/code-quality.md` - Standards qualité code

### Guides de Chargement
- `@.cursor/rules/context-detection.md` - Détection automatique du contexte
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée

### Quick Reference
- `@.cursor/rules/quick-start.md` - Guide de démarrage rapide
- `@.cursor/rules/README.md` - Vue d'ensemble des règles

---

**Note:** Cette priorisation permet d'optimiser le chargement des règles et d'améliorer la prise en compte des paramétrages par Cursor AI.

