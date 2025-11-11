# Règles Cursor - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)

Ce répertoire contient les règles de projet pour Cursor AI, organisées par domaine pour une meilleure maintenabilité et pertinence.

## 📁 Structure des Règles

```
.cursor/rules/
├── README.md              # Ce fichier - Vue d'ensemble
├── priority.md           # Priorités des règles (P0, P1, P2)
├── quick-start.md        # Guide de démarrage rapide
├── core.md               # Règles fondamentales (P0 - toujours appliquées)
├── quality-principles.md # Principes de qualité (P0 - toujours appliquées)
├── code-quality.md       # Standards qualité code (P0 - toujours appliquées)
├── backend.md            # Règles spécifiques backend (P1)
├── frontend.md           # Règles spécifiques frontend (P1)
├── ai-services.md        # Règles services IA (P1)
├── database.md           # Règles base de données (P1)
├── testing.md            # Règles tests (P1)
├── performance.md        # Optimisations performance (P1)
├── workflows.md          # Workflows courants (P2)
├── anti-patterns.md      # Anti-patterns consolidés
├── examples.md           # Exemples concrets par type de tâche
├── pre-task-evaluation.md # Évaluation préalable complète (P2)
├── pre-task-quick.md     # Évaluation préalable rapide (P2)
├── senior-architect-oversight.md # Supervision architecte sénior (P1 - IMPÉRATIF)
├── client-consultant-oversight.md # Supervision consultant client (P1 - IMPÉRATIF)
├── migration-refactoring-manager.md # Gestionnaire migration/refactoring (P1 - IMPÉRATIF)
├── tech-debt-manager.md # Gestionnaire dette technique (P1 - IMPÉRATIF)
├── hard-coding-specialist.md # Spécialiste hard coding (P1 - IMPÉRATIF)
├── todo-completion.md    # Completion des todos (P1 - IMPÉRATIF)
├── iterative-perfection.md # Itération automatique jusqu'à perfection (P1 - IMPÉRATIF)
├── persistent-execution.md # Exécution persistante (P1 - IMPÉRATIF)
├── advanced-iteration-and-role-coordination.md # Itérations avancées et coordination des rôles (P1 - IMPÉRATIF)
├── task-decomposition.md # Décomposition des tâches conforme documentation Cursor (P1 - IMPÉRATIF)
├── similar-code-detection.md # Détection proactive de code similaire (P1)
├── learning-memory.md # Mémoire persistante des apprentissages (P1)
├── preventive-validation.md # Validation préventive (P1)
├── auto-performance-detection.md # Détection et correction automatique des problèmes de performance (P1)
├── context-optimization.md # Gestion intelligente du contexte (P1)
├── workflow-consolidation.md # Consolidation automatique des workflows réussis (P1)
├── dependency-intelligence.md # Intelligence des dépendances (P1)
├── intelligent-model-selection.md # Sélection intelligente du modèle IA (P1)
├── search-cache.md # Cache intelligent des recherches (P1)
├── parallel-execution.md # Exécution parallèle (P1)
├── batch-processing.md # Traitement par lots (P1)
├── error-recovery.md # Récupération automatique après erreurs (P1)
├── conflict-detection.md # Détection proactive des conflits (P1)
├── bug-prevention.md # Détection proactive des bugs (P1)
├── task-decomposition.md # Décomposition des tâches conforme documentation Cursor (P1 - IMPÉRATIF)
├── intelligent-task-detection.md # Détection intelligente des tâches (P1)
├── rule-cache.md # Cache intelligent des règles (P1)
├── rule-feedback-loop.md # Boucle de feedback pour règles (P1)
├── metadata-standard.md # Standardisation des métadonnées (P1)
├── auto-documentation.md # Auto-documentation intelligente du code (P1)
├── cost-optimization.md # Optimisation des coûts IA (P1)
├── timeout-management.md # Gestion intelligente des timeouts (P1)
├── intelligent-preloading.md # Préchargement intelligent (P1)
├── context-compression.md # Compression intelligente du contexte (P1)
├── validation-pipeline.md # Pipeline de validation en cascade (P1)
├── predictive-problem-detection.md # Prédiction proactive des problèmes (P1)
├── auto-refactoring.md # Auto-refactoring intelligent (P1)
├── code-sentiment-analysis.md # Analyse de sentiment du code (P1)
├── auto-test-generation.md # Génération automatique de tests (P1)
├── multi-agent-coordination.md # Coordination multi-agents (P2)
└── reinforcement-learning.md # Apprentissage par renforcement (P2)
├── context-detection.md  # Détection automatique du contexte
├── load-strategy.md      # Stratégie de chargement optimisée
└── context-usage.md      # Utilisation contexte @
```

## 🎯 Organisation des Règles

### Priorités des Règles (priority.md)
**Nouveau** - Système de priorisation pour optimiser le chargement

**Niveaux de priorité:**
- **P0** - Règles critiques toujours appliquées (core.md, quality-principles.md, code-quality.md)
- **P1** - Règles importantes selon contexte (backend.md, frontend.md, ai-services.md, etc.)
- **P2** - Règles d'optimisation optionnelles (pre-task-evaluation.md, agent-optimization.md, etc.)

**Référence:** `@.cursor/rules/priority.md` - Priorités détaillées et matrice de chargement

### Quick Start (quick-start.md)
**Nouveau** - Guide de démarrage rapide avec checklist 5 règles essentielles

**Contenu:**
- Checklist rapide (5 règles essentielles)
- Workflow simplifié (3 étapes)
- Exemples par type de tâche

**Référence:** `@.cursor/rules/quick-start.md` - Guide de démarrage rapide

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
- **senior-architect-oversight.md** : Supervision architecte sénior (IMPÉRATIF - supervision, priorisation, pilotage, code review)
- **client-consultant-oversight.md** : Supervision consultant client (IMPÉRATIF - validation cahier des charges, audit, objectifs business, problématiques de base)
- **migration-refactoring-manager.md** : Gestionnaire migration/refactoring (IMPÉRATIF - supervision migration modulaire, détection régressions, validation cohérence)
- **tech-debt-manager.md** : Gestionnaire dette technique (IMPÉRATIF - identification services dupliqués, planification consolidation, réduction monolithiques)
- **hard-coding-specialist.md** : Spécialiste hard coding (IMPÉRATIF - réduction radicale erreurs, automatisation tâches complexes, approche créative innovante)
- **todo-completion.md** : Completion des todos (IMPÉRATIF - éviter interruptions)
- **iterative-perfection.md** : Itération automatique jusqu'à perfection (IMPÉRATIF - éviter arrêt prématuré)
- **persistent-execution.md** : Exécution persistante (IMPÉRATIF - éviter arrêts prématurés, runs longs)
- **advanced-iteration-and-role-coordination.md** : Itérations avancées et coordination des rôles (IMPÉRATIF - maximiser autonomie, durée, qualité)
- **task-decomposition.md** : Décomposition des tâches conforme documentation Cursor (IMPÉRATIF - critères de taille optimale, pensée séquentielle, Background Agent, listes structurées)
- **similar-code-detection.md** : Détection proactive de code similaire (éviter duplication)
- **learning-memory.md** : Mémoire persistante des apprentissages (réutiliser solutions)
- **preventive-validation.md** : Validation préventive (prévenir erreurs)
- **auto-performance-detection.md** : Détection et correction automatique des problèmes de performance
- **context-optimization.md** : Gestion intelligente du contexte (éviter saturation)
- **workflow-consolidation.md** : Consolidation automatique des workflows réussis
- **dependency-intelligence.md** : Intelligence des dépendances (éviter régressions)
- **intelligent-model-selection.md** : Sélection intelligente du modèle IA (optimiser performances/coûts)
- **search-cache.md** : Cache intelligent des recherches (réduire latence)
- **parallel-execution.md** : Exécution parallèle (améliorer performances)
- **batch-processing.md** : Traitement par lots (optimiser efficacité)
- **error-recovery.md** : Récupération automatique après erreurs (améliorer robustesse)
- **conflict-detection.md** : Détection proactive des conflits (éviter problèmes)
- **bug-prevention.md** : Détection proactive des bugs (améliorer qualité)
- **task-decomposition.md** : Décomposition des tâches conforme documentation Cursor (IMPÉRATIF - critères de taille optimale, pensée séquentielle, Background Agent, listes structurées)
- **intelligent-task-detection.md** : Détection intelligente des tâches (détection automatique complexité, chargement optimisé)
- **rule-cache.md** : Cache intelligent des règles (éviter rechargement, optimiser performances)
- **rule-feedback-loop.md** : Boucle de feedback pour règles (ajustement automatique selon résultats)
- **metadata-standard.md** : Standardisation des métadonnées (format standardisé pour détection automatique)
- **auto-documentation.md** : Auto-documentation intelligente du code (documentation automatique JSDoc/TSDoc, README)
- **cost-optimization.md** : Optimisation des coûts IA (sélection modèle, cache, batching, détection redondances)
- **timeout-management.md** : Gestion intelligente des timeouts (décomposition, checkpoints, retry avec backoff)
- **intelligent-preloading.md** : Préchargement intelligent (prédiction fichiers, cache prédictif, chargement parallèle)
- **context-compression.md** : Compression intelligente du contexte (résumé fichiers longs, compression sémantique)
- **validation-pipeline.md** : Pipeline de validation en cascade (validation progressive, arrêt précoce, cache)
- **predictive-problem-detection.md** : Prédiction proactive des problèmes (analyse risques, patterns d'échec, alertes)
- **auto-refactoring.md** : Auto-refactoring intelligent (élimination duplication, application patterns, simplification)
- **code-sentiment-analysis.md** : Analyse de sentiment du code (score qualité, détection code smells, recommandations)
- **auto-test-generation.md** : Génération automatique de tests (tests unitaires, régression, performance, couverture)
- **multi-agent-coordination.md** : Coordination multi-agents (orchestration, communication, collaboration)
- **reinforcement-learning.md** : Apprentissage par renforcement (récompenses/pénalités, ajustement stratégies)

## 📊 Matrice de Responsabilités des Rôles

### Principe

Cette matrice clarifie les responsabilités principales et secondaires de chaque rôle pour éviter les chevauchements et garantir une collaboration optimale.

### Matrice de Responsabilités

| Responsabilité | Architecte Sénior | Consultant Client | Migration Manager | Tech Debt Manager | Hard Coding Specialist |
|----------------|-------------------|-------------------|-------------------|-------------------|------------------------|
| **Validation qualité technique** | ✅ Principal | ❌ | ✅ Secondaire | ✅ Secondaire | ✅ Secondaire |
| **Validation business/métier** | ❌ | ✅ Principal | ❌ | ❌ | ❌ |
| **Supervision migration** | ✅ Secondaire | ❌ | ✅ Principal | ✅ Secondaire | ✅ Secondaire |
| **Élimination dette technique** | ✅ Secondaire | ❌ | ✅ Secondaire | ✅ Principal | ✅ Secondaire |
| **Réduction erreurs** | ✅ Secondaire | ❌ | ✅ Secondaire | ✅ Secondaire | ✅ Principal |
| **Priorisation tâches** | ✅ Principal | ❌ | ❌ | ❌ | ❌ |
| **Pilotage stratégique** | ✅ Principal | ❌ | ❌ | ❌ | ❌ |
| **Code review** | ✅ Principal | ❌ | ✅ Secondaire | ✅ Secondaire | ✅ Secondaire |
| **Détection régressions** | ✅ Secondaire | ❌ | ✅ Principal | ✅ Secondaire | ✅ Secondaire |
| **Détection anti-patterns** | ✅ Secondaire | ❌ | ✅ Secondaire | ✅ Principal | ✅ Secondaire |
| **Automatisation tâches complexes** | ✅ Secondaire | ❌ | ❌ | ❌ | ✅ Principal |
| **Validation alignement business** | ❌ | ✅ Principal | ❌ | ❌ | ❌ |
| **Détection hors périmètre** | ❌ | ✅ Principal | ❌ | ❌ | ❌ |

### Légende

- **✅ Principal** : Responsabilité principale du rôle
- **✅ Secondaire** : Responsabilité secondaire (support)
- **❌** : Pas de responsabilité pour ce rôle

### Références Croisées

**Architecte Sénior:**
- Supervision technique globale
- Priorisation et pilotage stratégique
- Code review avec critères d'architecte
- Validation conjointe avec tous les autres rôles

**Consultant Client:**
- Validation business/métier exclusive
- Détection fonctionnalités hors périmètre
- Validation alignement avec cahier des charges et audit
- Validation proactive avant développement

**Migration Manager:**
- Supervision migration modulaire exclusive
- Détection régressions pendant migration
- Validation cohérence modules migrés
- Collaboration avec Tech Debt Manager et Hard Coding Specialist

**Tech Debt Manager:**
- Élimination dette technique exclusive
- Détection anti-patterns et code smells
- Planification consolidation services
- Collaboration avec Migration Manager et Hard Coding Specialist

**Hard Coding Specialist:**
- Réduction radicale erreurs exclusive
- Automatisation tâches complexes
- Approche créative et innovante
- Collaboration avec tous les rôles pour hard coding

## 📚 Cas d'Usage par Rôle

### Quand Utiliser Chaque Rôle

**Architecte Sénior:**
- ✅ Tâche complexe (> 3 todos) ou run autonome
- ✅ Décisions architecturales importantes
- ✅ Code review avec critères d'architecte
- ✅ Priorisation et pilotage stratégique
- ✅ Validation conjointe avec autres rôles

**Consultant Client:**
- ✅ Tâche complexe (> 3 todos) ou run autonome
- ✅ Développement nouvelle fonctionnalité
- ✅ Validation alignement business/métier
- ✅ Détection fonctionnalités hors périmètre
- ✅ Validation avec cahier des charges et audit

**Migration Manager:**
- ✅ Tâche de migration/refactoring
- ✅ Migration de `routes-poc.ts` ou `storage-poc.ts`
- ✅ Migration vers architecture modulaire
- ✅ Détection régressions pendant migration
- ✅ Validation cohérence modules migrés

**Tech Debt Manager:**
- ✅ Tâche de consolidation/dette technique
- ✅ Identification services dupliqués
- ✅ Planification consolidation services
- ✅ Réduction fichiers monolithiques
- ✅ Détection anti-patterns et code smells

**Hard Coding Specialist:**
- ✅ Tâche complexe nécessitant hard coding
- ✅ Réduction radicale erreurs
- ✅ Automatisation tâches très complexes
- ✅ Approche créative et innovante
- ✅ Robustesse extrême requise

### Combinaisons de Rôles Recommandées

**Migration + Consolidation:**
- Migration Manager + Tech Debt Manager
- Cas d'usage : Migration de code avec consolidation de services dupliqués

**Migration + Hard Coding:**
- Migration Manager + Hard Coding Specialist
- Cas d'usage : Migration avec réduction radicale erreurs

**Consolidation + Hard Coding:**
- Tech Debt Manager + Hard Coding Specialist
- Cas d'usage : Consolidation avec réduction erreurs

**Migration + Consolidation + Hard Coding:**
- Migration Manager + Tech Debt Manager + Hard Coding Specialist
- Cas d'usage : Migration complète avec optimisation totale

**Tâche Complexe Complète:**
- Architecte Sénior + Consultant Client + Rôles spécialisés selon contexte
- Cas d'usage : Tâche complexe nécessitant validation technique + business + spécialisée

### Exemples Concrets

**Exemple 1 : Migration de routes-poc.ts**
- Rôles : Migration Manager + Hard Coding Specialist + Architecte Sénior + Consultant Client
- Workflow : Migration modulaire + Hard coding + Validation technique + Validation business

**Exemple 2 : Consolidation services Monday.com**
- Rôles : Tech Debt Manager + Hard Coding Specialist + Architecte Sénior + Consultant Client
- Workflow : Consolidation + Hard coding + Validation technique + Validation business

**Exemple 3 : Nouvelle fonctionnalité complexe**
- Rôles : Architecte Sénior + Consultant Client + Hard Coding Specialist
- Workflow : Validation business proactive + Validation technique + Hard coding

**Exemple 4 : Migration + Consolidation complète**
- Rôles : Migration Manager + Tech Debt Manager + Hard Coding Specialist + Architecte Sénior + Consultant Client
- Workflow : Migration + Consolidation + Hard coding + Validation complète

## 🔄 Workflows Transversaux Multi-Rôles

### Principe

**IMPÉRATIF:** Pour les tâches complexes impliquant plusieurs aspects (migration + consolidation + erreurs), l'agent DOIT utiliser des workflows transversaux impliquant 3+ rôles simultanément pour garantir une validation complète et optimale.

**Bénéfices:**
- ✅ Validation complète multi-dimensionnelle (technique + business + migration + dette + erreurs)
- ✅ Optimisation globale des solutions
- ✅ Réduction des itérations grâce à validation conjointe
- ✅ Qualité garantie sur tous les aspects

### Workflows Disponibles

**1. Validation Conjointe Multi-Rôles**
- Fonction : `validateWithAllRoles()`
- Cas d'usage : Validation complète avec 3+ rôles simultanément
- Rôles : Architecte Sénior + Consultant Client + Rôles spécialisés selon contexte

**2. Migration avec Optimisation Complète**
- Fonction : `migrateWithFullOptimization()`
- Cas d'usage : Migration de code nécessitant consolidation de dette technique et réduction d'erreurs
- Rôles : Migration Manager + Tech Debt Manager + Hard Coding Specialist + Architecte Sénior + Consultant Client

**3. Consolidation avec Hard Coding**
- Fonction : `consolidateWithHardCoding()`
- Cas d'usage : Consolidation de services nécessitant réduction d'erreurs et migration
- Rôles : Tech Debt Manager + Hard Coding Specialist + Migration Manager + Architecte Sénior + Consultant Client

**4. Validation Business et Technique**
- Fonction : `validateBusinessAndTechnical()`
- Cas d'usage : Tâche complexe nécessitant validation business et technique complète
- Rôles : Client Consultant + Architecte Sénior + Rôles spécialisés selon contexte

### Mécanisme de Résolution de Conflits

**Fonctionnalités:**
- `resolveRoleConflicts()` : Résolution automatique de conflits entre rôles
- `prioritizeRoleValidations()` : Priorisation intelligente des validations selon contexte
- `escalateToArchitect()` : Escalade vers Architecte Sénior si résolution impossible

**Référence:** `@.cursor/rules/senior-architect-oversight.md` - Section "Mécanisme de Validation Conjointe Multi-Rôles"

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
- **transversal-performance.md** : Performance transversale et autonomie
- **pre-task-evaluation.md** : Évaluation préalable impérative (rapidité, performance, robustesse, maintenabilité)
- **script-automation.md** : **NOUVEAU** Automatisation par script (détection, création, exécution)
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

### Guide d'Utilisation Optimale

**Pour optimiser la prise en compte des paramétrages:**

1. **Commencer par Quick Start**
   - Consulter `@.cursor/rules/quick-start.md` - Checklist rapide 5 règles essentielles
   - Suivre workflow simplifié en 3 étapes

2. **Comprendre les Priorités**
   - Consulter `@.cursor/rules/priority.md` - Système de priorisation (P0, P1, P2)
   - Charger uniquement règles nécessaires (max 5-7 fichiers)

3. **Utiliser la Détection Automatique**
   - Consulter `@.cursor/rules/context-detection.md` - Détection automatique du contexte
   - Les règles P1 sont chargées automatiquement selon le contexte

4. **Optimiser le Chargement**
   - Consulter `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
   - Éviter saturation du contexte (max 5-7 fichiers)

### Pour Cursor AI

Les règles sont automatiquement chargées par Cursor selon le contexte et la priorité. Vous pouvez aussi référencer explicitement :

```
@.cursor/rules/core.md - Pour règles fondamentales
@.cursor/rules/quality-principles.md - Pour principes de qualité
@.cursor/rules/code-quality.md - Pour standards qualité code
@.cursor/rules/backend.md - Pour modifications backend
@.cursor/rules/frontend.md - Pour modifications frontend
@.cursor/rules/performance.md - Pour optimisations performance
@.cursor/rules/examples.md - Pour exemples concrets
```

**Référence:** `@.cursor/rules/priority.md` - Priorités et matrice de chargement

### Pour les Développeurs

1. **Lire `quick-start.md`** pour démarrage rapide
2. **Lire `core.md`** pour comprendre les règles fondamentales
3. **Lire le fichier de domaine** pertinent (backend.md, frontend.md, etc.)
4. **Consulter `workflows.md`** pour workflows courants
5. **Utiliser `context-usage.md`** pour optimiser l'utilisation de @
6. **Consulter `priority.md`** pour comprendre le système de priorisation

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
4. Valider avec `npm run validate:cursor-rules`
5. Tester que la règle fonctionne avec Cursor

### Validation des Règles

**Valider la structure et les références:**
```bash
npm run validate:cursor-rules
```

Ce script valide:
- Structure des fichiers de règles
- Références croisées entre fichiers
- Exemples à jour
- Duplications entre fichiers

**Référence:** `scripts/validate-cursor-rules.ts` - Script de validation

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
- `@.cursor/rules/transversal-performance.md` - Performance transversale et autonomie
- `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable impérative
- `@.cursor/rules/script-automation.md` - **NOUVEAU** Automatisation par script
- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte
- `@AGENTS.md` - Instructions complètes pour l'agent

**Modifier le schéma DB:**
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/database.md` - Règles base de données
- `@.cursor/rules/workflows.md` - Workflow modification schéma

## 📝 Notes

- Les règles sont versionnées avec le projet (dans `.cursor/rules/`)
- Les règles sont appliquées automatiquement par Cursor selon le contexte et la priorité
- Utiliser `AGENTS.md` pour instructions simples (alternative)
- Mettre à jour les règles régulièrement pour refléter l'évolution du projet
- Valider les règles avec `npm run validate:cursor-rules` avant commit

## 🔗 Références Essentielles

### Priorités et Chargement
- `@.cursor/rules/priority.md` - Priorités et matrice de chargement
- `@.cursor/rules/load-strategy.md` - Stratégie de chargement optimisée
- `@.cursor/rules/context-detection.md` - Détection automatique du contexte

### Guides Rapides
- `@.cursor/rules/quick-start.md` - Guide de démarrage rapide (checklist 5 règles)
- `@.cursor/rules/pre-task-quick.md` - Évaluation préalable rapide (checklist 5 points)
- `@AGENTS.md` - Index simplifié des règles

### Exemples et Anti-Patterns
- `@.cursor/rules/examples.md` - Exemples concrets par type de tâche
- `@.cursor/rules/anti-patterns.md` - Anti-patterns consolidés par domaine

### Validation
- `scripts/validate-cursor-rules.ts` - Script de validation des règles
- `npm run validate:cursor-rules` - Commande de validation

---

**Dernière mise à jour:** 2025-01-29

