# AGENTS.md - Index des Règles Cursor

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 3.0.0  
**Dernière mise à jour:** 2025-01-29

Ce fichier est un **index simplifié** pointant vers les règles détaillées dans `.cursor/rules/`. Pour les règles complètes, consultez les fichiers référencés.

## 🚀 Quick Start

**Nouveau sur le projet ?** Commencez par :
1. `@.cursor/rules/quick-start.md` - Checklist rapide des 5 règles essentielles
2. `@.cursor/rules/priority.md` - Comprendre les priorités des règles
3. `@.cursor/rules/core.md` - Règles fondamentales

## 🎯 Contexte du Projet

Saxium est une application full-stack de gestion de projets pour **JLM Menuiserie** (BTP/Menuiserie française). Stack: React 19 + TypeScript, Express 5, PostgreSQL (Drizzle ORM), IA multi-modèles (Claude Sonnet 4 + GPT-5).

**Architecture:** Migration progressive vers modules (`server/modules/*`), services métier (`server/services/*`), types partagés (`shared/schema.ts`)

## 🏆 Philosophie de Qualité

**Priorités (dans l'ordre):**
1. **Robustesse** - Résistance aux erreurs, gestion d'erreurs complète
2. **Maintenabilité** - Code clair, documenté, testé, évolutif
3. **Performance** - Optimisation continue, latence minimale

**Référence:** `@.cursor/rules/quality-principles.md` - Principes de qualité complets

## 📋 Règles par Priorité

### P0 - Règles Critiques (Toujours Appliquées)

**Chargement:** Automatique dans tous les contextes

- `@.cursor/rules/core.md` - Règles fondamentales du projet
- `@.cursor/rules/quality-principles.md` - Philosophie de qualité
- `@.cursor/rules/code-quality.md` - Standards stricts de qualité code

**Référence:** `@.cursor/rules/priority.md` - Priorités détaillées

### P1 - Règles Importantes (Selon Contexte)

**Chargement:** Automatique selon le type de modification

**Backend:**
- `@.cursor/rules/backend.md` - Patterns Express, services, middleware
- `@.cursor/rules/database.md` - Drizzle ORM, migrations, requêtes

**Frontend:**
- `@.cursor/rules/frontend.md` - Patterns React, composants, hooks

**Services IA:**
- `@.cursor/rules/ai-services.md` - Services IA, chatbot, SQL sécurisé

**Tests:**
- `@.cursor/rules/testing.md` - Patterns tests, couverture, E2E

**Performance:**
- `@.cursor/rules/performance.md` - Optimisations performance, cache, requêtes

**Autonomie:**
- `@.cursor/rules/senior-architect-oversight.md` - Supervision architecte sénior (IMPÉRATIF - supervision, priorisation, pilotage, code review)
- `@.cursor/rules/client-consultant-oversight.md` - Supervision consultant client (IMPÉRATIF - validation cahier des charges, audit, objectifs business, problématiques de base)
- `@.cursor/rules/migration-refactoring-manager.md` - Gestionnaire migration/refactoring (IMPÉRATIF - supervision migration modulaire, détection régressions, validation cohérence)
- `@.cursor/rules/tech-debt-manager.md` - Gestionnaire dette technique (IMPÉRATIF - identification services dupliqués, planification consolidation, réduction monolithiques)
- `@.cursor/rules/hard-coding-specialist.md` - Spécialiste hard coding (IMPÉRATIF - réduction radicale erreurs, automatisation tâches complexes, approche créative innovante)
- `@.cursor/rules/todo-completion.md` - Completion des todos (IMPÉRATIF - éviter interruptions)
- `@.cursor/rules/iterative-perfection.md` - Itération automatique jusqu'à perfection (IMPÉRATIF - éviter arrêt prématuré)
- `@.cursor/rules/persistent-execution.md` - Exécution persistante (IMPÉRATIF - éviter arrêts prématurés, runs longs)
- `@.cursor/rules/advanced-iteration-and-role-coordination.md` - Itérations avancées et coordination des rôles (IMPÉRATIF - maximiser autonomie, durée, qualité)
- `@.cursor/rules/similar-code-detection.md` - Détection proactive de code similaire (éviter duplication)
- `@.cursor/rules/learning-memory.md` - Mémoire persistante des apprentissages (réutiliser solutions)
- `@.cursor/rules/preventive-validation.md` - Validation préventive (prévenir erreurs)
- `@.cursor/rules/auto-performance-detection.md` - Détection et correction automatique des problèmes de performance
- `@.cursor/rules/context-optimization.md` - Gestion intelligente du contexte (éviter saturation)
- `@.cursor/rules/workflow-consolidation.md` - Consolidation automatique des workflows réussis
- `@.cursor/rules/dependency-intelligence.md` - Intelligence des dépendances (éviter régressions)
- `@.cursor/rules/intelligent-model-selection.md` - Sélection intelligente du modèle IA (optimiser performances/coûts)
- `@.cursor/rules/search-cache.md` - Cache intelligent des recherches (réduire latence)
- `@.cursor/rules/parallel-execution.md` - Exécution parallèle (améliorer performances)
- `@.cursor/rules/batch-processing.md` - Traitement par lots (optimiser efficacité)
- `@.cursor/rules/error-recovery.md` - Récupération automatique après erreurs (améliorer robustesse)
- `@.cursor/rules/conflict-detection.md` - Détection proactive des conflits (éviter problèmes)
- `@.cursor/rules/bug-prevention.md` - Détection proactive des bugs (améliorer qualité)

### P2 - Règles d'Optimisation (Optionnelles)

**Chargement:** Sur demande ou pour tâches complexes

- `@.cursor/rules/agent-optimization.md` - Stratégies d'optimisation de l'agent
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes pour runs plus longs
- `@.cursor/rules/auto-detection.md` - Détection automatique des anti-patterns
- `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable complète
- `@.cursor/rules/pre-task-quick.md` - Évaluation préalable rapide (checklist 5 points)
- `@.cursor/rules/script-automation.md` - Automatisation par script

**Référence:** `@.cursor/rules/priority.md` - Matrice de chargement complète

## 🔗 Guides et Références

### Workflows Courants

- `@.cursor/rules/workflows.md` - 7 workflows détaillés avec patterns
- `@.cursor/rules/common-tasks.md` - 10 tâches courantes avec guide rapide
- `@.cursor/rules/examples.md` - Exemples concrets par type de tâche

### Utilisation du Contexte

- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte @
- `@.cursor/rules/context-detection.md` - Détection automatique du contexte
- `@.cursor/rules/context-search.md` - Recherche contextuelle avancée

### Qualité et Standards

- `@.cursor/rules/quality-checklist.md` - Checklist exhaustive pour qualité exemplaire
- `@.cursor/rules/anti-patterns.md` - Anti-patterns consolidés par domaine
- `@.cursor/rules/quick-reference.md` - Référence rapide patterns

### Optimisation Agent

- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
- `@.cursor/rules/transversal-performance.md` - Performance transversale et autonomie
- `@.cursor/rules/long-term-autonomy.md` - Autonomie longue durée (heures/jours)
- `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage avancées (Reflexion, ICE)
- `@.cursor/rules/automated-testing-debugging.md` - Tests E2E et débogage automatisé

## 📚 Fichiers de Contexte du Projet

**Toujours référencer pour contexte complet:**
- `@projectbrief.md` - Objectifs et périmètre
- `@productContext.md` - Expérience utilisateur
- `@activeContext.md` - Focus actuel et prochaines étapes
- `@systemPatterns.md` - Patterns architecturaux
- `@techContext.md` - Stack technique
- `@progress.md` - État du projet

**Documentation technique:**
- `server/utils/README-UTILS.md` - Utilitaires backend
- `server/modules/README.md` - Architecture modulaire
- `docs/` - Documentation technique détaillée

## 🎯 Quick Reference par Tâche

### Créer une Route API

**Règles à charger:**
1. `@.cursor/rules/core.md` - Règles fondamentales
2. `@.cursor/rules/backend.md` - Patterns backend
3. `@.cursor/rules/workflows.md` - Workflow création route
4. `@.cursor/rules/examples.md` - Exemples concrets

**Référence:** `@server/modules/auth/routes.ts` - Exemple de route modulaire

### Créer un Composant React

**Règles à charger:**
1. `@.cursor/rules/core.md` - Règles fondamentales
2. `@.cursor/rules/frontend.md` - Patterns frontend
3. `@.cursor/rules/workflows.md` - Workflow création composant
4. `@.cursor/rules/examples.md` - Exemples concrets

**Référence:** `@client/src/components/ui/button.tsx` - Exemple composant UI

### Modifier un Service IA

**Règles à charger:**
1. `@.cursor/rules/core.md` - Règles fondamentales
2. `@.cursor/rules/ai-services.md` - Règles services IA
3. `@.cursor/rules/performance.md` - Optimisations performance
4. `@.cursor/rules/workflows.md` - Workflow modification service

**Référence:** `@server/services/AIService.ts` - Service IA principal

### Modifier le Schéma DB

**Règles à charger:**
1. `@.cursor/rules/core.md` - Règles fondamentales
2. `@.cursor/rules/database.md` - Règles base de données
3. `@.cursor/rules/workflows.md` - Workflow modification schéma

**Référence:** `@shared/schema.ts` - Schéma base de données

## ⚠️ Points d'Attention Actuels

### Migration Modulaire
- Migration progressive de `routes-poc.ts` vers modules
- Ne pas modifier `routes-poc.ts` sauf nécessité
- Préférer créer/modifier dans `server/modules/`

**Référence:** `@activeContext.md` - État actuel du projet

## 🔗 Références Rapides

### Documentation Projet
- **Règles détaillées:** `.cursor/rules/`
- **Documentation projet:** Fichiers `*.md` à la racine
- **Documentation technique:** `docs/`
- **Utilitaires:** `server/utils/README-UTILS.md`

### Déploiement
- **Guide déploiement:** `@docs/NHOST_DEPLOYMENT.md`
- **CI/CD:** `.github/workflows/ci.yml`
- **Docker:** `docker-compose.yml`, `docker-compose.production.yml`

### Monitoring
- **Logging:** `server/utils/logger.ts`
- **Métriques:** Services avec logging structuré
- **Alertes:** Circuit breakers, rate limiting

### Sécurité
- **Auth:** `server/modules/auth/`
- **RBAC:** `server/services/RBACService.ts`
- **Validation:** `server/middleware/validation.ts`

---

**Note:** Ce fichier est un index simplifié. Pour les règles complètes, consultez `.cursor/rules/`.

**Version:** 3.0.0  
**Dernière mise à jour:** 2025-01-29
