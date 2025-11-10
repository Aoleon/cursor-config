# Règles Cursor - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)

Ce répertoire contient les règles de projet pour Cursor AI, organisées par domaine pour une meilleure maintenabilité et pertinence.

## 📁 Structure des Règles

```
.cursor/rules/
├── README.md           # Ce fichier - Vue d'ensemble
├── core.md            # Règles fondamentales (toujours appliquées)
├── backend.md         # Règles spécifiques backend
├── frontend.md        # Règles spécifiques frontend
├── ai-services.md    # Règles services IA
├── database.md       # Règles base de données
├── testing.md        # Règles tests
├── context-usage.md  # Utilisation contexte @
└── workflows.md      # Workflows courants
```

## 🎯 Organisation des Règles

### Règles Core (core.md)
**Toujours appliquées** - Règles fondamentales du projet
- Contexte du projet
- Philosophie de qualité
- Règles essentielles
- Utilisation des utilitaires partagés
- Gestion des erreurs
- Architecture modulaire

### Principes de Qualité (quality-principles.md)
**Toujours appliqués** - Philosophie d'excellence
- Vision de qualité (robustesse, performance, maintenabilité)
- Standards d'excellence
- Principes de développement
- Standards de robustesse
- Standards de performance
- Standards de maintenabilité

### Standards Code (code-quality.md)
**Toujours appliqués** - Standards stricts de qualité code
- Types TypeScript stricts
- Validation stricte
- Gestion d'erreurs exhaustive
- Code clair et auto-documenté
- DRY principle
- Séparation des responsabilités
- Tests exhaustifs
- Performance optimale
- Documentation
- Refactoring continu

### Checklist Qualité (quality-checklist.md)
**Toujours appliquée** - Checklist exhaustive pour qualité exemplaire
- Checklist avant commit
- Checklist code review
- Checklist avant merge
- Red flags (bloquants)

### Règles par Domaine
**Appliquées selon le contexte** - Règles spécifiques à chaque domaine

- **backend.md** : Patterns Express, services, middleware
- **frontend.md** : Patterns React, composants, hooks
- **ai-services.md** : Services IA, chatbot, SQL sécurisé
- **database.md** : Drizzle ORM, migrations, requêtes
- **testing.md** : Patterns tests, couverture, E2E
- **performance.md** : Optimisations performance, cache, requêtes

### Guides et Références
**Appliqués selon la tâche** - Guides pour workflows et référence

- **workflows.md** : 7 workflows détaillés avec patterns
- **common-tasks.md** : 10 tâches courantes avec guide rapide
- **context-usage.md** : Utilisation optimale du contexte @
- **agent-optimization.md** : Stratégies d'optimisation de l'agent Cursor
- **autonomous-workflows.md** : Workflows autonomes pour runs plus longs
- **auto-detection.md** : Détection automatique des anti-patterns
- **advanced-learning.md** : Stratégies d'apprentissage avancées (Reflexion, ICE)
- **context-search.md** : Recherche contextuelle avancée
- **long-term-autonomy.md** : Autonomie longue durée (heures/jours)
- **automated-testing-debugging.md** : Tests E2E et débogage automatisé
- **transversal-performance.md** : **NOUVEAU** Performance transversale et autonomie
- **examples.md** : Exemples concrets du projet
- **patterns.md** : Patterns réutilisables documentés
- **quick-reference.md** : Référence rapide patterns
- **decision-log.md** : Journal décisions techniques
- **troubleshooting.md** : Guide résolution problèmes

### Règles de Workflow
**Appliquées selon la tâche** - Guides pour workflows courants

- **workflows.md** : 7 workflows détaillés avec patterns
- **context-usage.md** : Utilisation optimale du contexte @

## 📖 Comment Utiliser les Règles

### Pour Cursor AI

Les règles sont automatiquement chargées par Cursor selon le contexte. Vous pouvez aussi référencer explicitement :

```
@.cursor/rules/core.md - Pour règles fondamentales
@.cursor/rules/quality-principles.md - Pour principes de qualité
@.cursor/rules/code-quality.md - Pour standards qualité code
@.cursor/rules/backend.md - Pour modifications backend
@.cursor/rules/frontend.md - Pour modifications frontend
@.cursor/rules/performance.md - Pour optimisations performance
@.cursor/rules/examples.md - Pour exemples concrets
```

### Pour les Développeurs

1. **Lire `core.md`** pour comprendre les règles fondamentales
2. **Lire le fichier de domaine** pertinent (backend.md, frontend.md, etc.)
3. **Consulter `workflows.md`** pour workflows courants
4. **Utiliser `context-usage.md`** pour optimiser l'utilisation de @

## 🔄 Mise à Jour des Règles

### Quand Mettre à Jour

- ✅ Nouveau pattern architectural adopté
- ✅ Nouvelle convention de code établie
- ✅ Nouveau workflow identifié
- ✅ Changement dans les bonnes pratiques

### Comment Mettre à Jour

1. Identifier le fichier de règles concerné
2. Ajouter/modifier la règle avec exemples
3. Mettre à jour ce README si structure change
4. Tester que la règle fonctionne avec Cursor

## 📋 Bonnes Pratiques

### Rédaction de Règles

**✅ À FAIRE:**
- Règles concises et claires (< 500 lignes par fichier)
- Exemples concrets de code
- Références aux fichiers existants
- Patterns réutilisables

**❌ À ÉVITER:**
- Directives vagues
- Règles trop longues (diviser si nécessaire)
- Duplication entre fichiers
- Règles contradictoires

### Organisation

**Structure recommandée:**
1. Vue d'ensemble du domaine
2. Patterns principaux
3. Exemples de code
4. Anti-patterns à éviter
5. Références aux fichiers existants

## 🔗 Liens Utiles

### Documentation Cursor
- [Règles de Projet](https://docs.cursor.com/context/rules)
- [Utilisation du Contexte](https://docs.cursor.com/guides/working-with-context)
- [Documentation Interne](https://docs.cursor.com/guides/advanced/working-with-documentation)

### Documentation Projet
- `projectbrief.md` - Objectifs et périmètre
- `activeContext.md` - État actuel
- `systemPatterns.md` - Patterns architecturaux
- `AGENTS.md` - Instructions simples

### Fichiers de Référence
- `server/utils/README-UTILS.md` - Utilitaires backend
- `server/modules/README.md` - Architecture modulaire
- `docs/` - Documentation technique

## 🎯 Quick Reference

### Règles par Tâche

**Créer une route API:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/code-quality.md` - Standards qualité code
- `@.cursor/rules/backend.md` - Patterns backend
- `@.cursor/rules/workflows.md` - Workflow création route
- `@.cursor/rules/examples.md` - Exemples concrets

**Créer un composant React:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/code-quality.md` - Standards qualité code
- `@.cursor/rules/frontend.md` - Patterns frontend
- `@.cursor/rules/workflows.md` - Workflow création composant
- `@.cursor/rules/examples.md` - Exemples concrets

**Modifier un service IA:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/ai-services.md` - Règles services IA
- `@.cursor/rules/performance.md` - Optimisations performance
- `@.cursor/rules/workflows.md` - Workflow modification service
- `@.cursor/rules/agent-optimization.md` - Optimisation agent

**Optimiser les performances de l'agent:**
- `@.cursor/rules/agent-optimization.md` - Stratégies d'optimisation
- `@.cursor/rules/autonomous-workflows.md` - Workflows autonomes
- `@.cursor/rules/auto-detection.md` - Détection automatique anti-patterns
- `@.cursor/rules/advanced-learning.md` - Stratégies d'apprentissage avancées
- `@.cursor/rules/context-search.md` - Recherche contextuelle avancée
- `@.cursor/rules/long-term-autonomy.md` - Autonomie longue durée
- `@.cursor/rules/automated-testing-debugging.md` - Tests E2E et débogage automatisé
- `@.cursor/rules/transversal-performance.md` - **NOUVEAU** Performance transversale et autonomie
- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte
- `@AGENTS.md` - Instructions complètes pour l'agent

**Modifier le schéma DB:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/database.md` - Règles base de données
- `@.cursor/rules/workflows.md` - Workflow modification schéma

## 📝 Notes

- Les règles sont versionnées avec le projet (dans `.cursor/rules/`)
- Les règles sont appliquées automatiquement par Cursor
- Utiliser `AGENTS.md` pour instructions simples (alternative)
- Mettre à jour les règles régulièrement pour refléter l'évolution du projet

---

**Dernière mise à jour:** 2025-01-29

