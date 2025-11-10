# Optimisation Agent Cursor - Saxium

**Objectif:** Maximiser les performances de l'agent Cursor AI pour le projet Saxium

## 🎯 Stratégies d'Optimisation

### 1. Auto-Amélioration Continue

**Principe:** L'agent doit être capable de s'auto-éditer et d'améliorer ses performances de manière autonome.

**TOUJOURS:**
- ✅ Analyser les résultats de ses actions précédentes
- ✅ Identifier les patterns qui fonctionnent bien
- ✅ Améliorer les patterns qui ne fonctionnent pas
- ✅ Documenter les améliorations apportées
- ✅ Réutiliser les solutions efficaces

**Pattern:**
```typescript
// Avant action
// 1. Analyser contexte
// 2. Identifier patterns similaires existants
// 3. Appliquer pattern optimal

// Après action
// 1. Évaluer résultat
// 2. Identifier améliorations possibles
// 3. Documenter apprentissage
// 4. Réutiliser pour actions futures
```

### 2. Utilisation Optimale du Contexte

**Principe:** Utiliser le contexte de manière ciblée et hiérarchisée pour maximiser la pertinence.

**Hiérarchie du Contexte:**
1. **Fichiers directement modifiés** (priorité maximale)
2. **Fichiers de référence** (exemples, patterns)
3. **Documentation projet** (projectbrief.md, activeContext.md)
4. **Règles Cursor** (.cursor/rules/)

**TOUJOURS:**
- ✅ Limiter à 5-10 fichiers pertinents maximum
- ✅ Inclure fichiers de mémoire (projectbrief.md, activeContext.md)
- ✅ Référencer exemples concrets avec @
- ✅ Utiliser @Docs pour documentation externe
- ✅ Utiliser @Web pour informations récentes

**NE JAMAIS:**
- ❌ Inclure 20+ fichiers (surcharge contextuelle)
- ❌ Inclure fichiers non pertinents
- ❌ Ignorer fichiers de mémoire
- ❌ Dupliquer contexte déjà présent

### 3. Recherche et Exploration Proactive

**Principe:** Toujours explorer le codebase avant de modifier pour éviter duplication et comprendre les patterns.

**Workflow de Recherche:**
1. **Recherche sémantique** (`codebase_search`) pour comprendre concepts
2. **Recherche exacte** (`grep`) pour trouver occurrences spécifiques
3. **Recherche fichiers** (`glob_file_search`) pour localiser fichiers
4. **Lecture ciblée** (`read_file`) pour comprendre patterns

**Pattern:**
```typescript
// 1. Recherche sémantique
codebase_search("How does X work?", target_directories)

// 2. Recherche exacte
grep("pattern", path)

// 3. Recherche fichiers
glob_file_search("**/*pattern*.ts")

// 4. Lecture ciblée
read_file("path/to/file.ts")
```

### 4. Refactoring Automatisé Intelligent

**Principe:** Identifier et refactoriser automatiquement le code dupliqué et les anti-patterns.

**TOUJOURS:**
- ✅ Identifier code dupliqué avant modification
- ✅ Extraire logique commune en fonctions/services
- ✅ Appliquer patterns établis du projet
- ✅ Documenter refactoring effectué
- ✅ Vérifier tests après refactoring

**Pattern:**
```typescript
// Avant: Code dupliqué
function method1() {
  // logique A (dupliquée)
  // logique B
}

function method2() {
  // logique A (dupliquée)
  // logique C
}

// Après: Code refactorisé
function sharedLogicA() {
  // logique A (réutilisable)
}

function method1() {
  sharedLogicA();
  // logique B
}

function method2() {
  sharedLogicA();
  // logique C
}
```

### 5. Évaluation Continue des Performances

**Principe:** Évaluer régulièrement les performances et ajuster les stratégies.

**Métriques à Surveiller:**
- ✅ Taux de succès des modifications
- ✅ Nombre de corrections nécessaires
- ✅ Temps de résolution des tâches
- ✅ Qualité du code généré
- ✅ Respect des conventions du projet

**TOUJOURS:**
- ✅ Analyser résultats après chaque modification majeure
- ✅ Identifier patterns de succès
- ✅ Éviter patterns qui échouent
- ✅ Documenter apprentissages

## 🔍 Techniques Avancées

### 1. Analyse Contextuelle Multi-Niveaux

**Niveau 1: Contexte Immédiat**
- Fichiers directement modifiés
- Fichiers de référence (exemples)

**Niveau 2: Contexte Projet**
- Documentation projet (projectbrief.md, activeContext.md)
- Patterns architecturaux (systemPatterns.md)

**Niveau 3: Contexte Règles**
- Règles Cursor (.cursor/rules/)
- Conventions du projet

**Pattern:**
```
@file-to-modify.ts          # Niveau 1
@example-pattern.ts         # Niveau 1
@projectbrief.md            # Niveau 2
@activeContext.md           # Niveau 2
@.cursor/rules/core.md      # Niveau 3
```

### 2. Recherche Sémantique Stratégique

**Quand Utiliser:**
- ✅ Comprendre un concept complexe
- ✅ Trouver code similaire existant
- ✅ Identifier patterns architecturaux
- ✅ Explorer dépendances

**Comment Utiliser:**
```typescript
// Question complète et spécifique
codebase_search("How does authentication work with Microsoft OAuth?", ["server/modules/auth"])

// Question sur patterns
codebase_search("What are the patterns for error handling in routes?", ["server/modules"])

// Question sur architecture
codebase_search("How are services structured and initialized?", ["server/services"])
```

### 3. Validation Proactive

**Avant Modification:**
- ✅ Vérifier si fonctionnalité existe déjà
- ✅ Comprendre dépendances
- ✅ Identifier impacts potentiels
- ✅ Vérifier conventions du projet

**Pendant Modification:**
- ✅ Suivre patterns établis
- ✅ Respecter conventions de code
- ✅ Valider avec tests
- ✅ Logger avec contexte structuré

**Après Modification:**
- ✅ Vérifier tests passent
- ✅ Vérifier couverture de code
- ✅ Vérifier types TypeScript
- ✅ Vérifier pas de régression

## 📊 Optimisation du Comportement

### 1. Stratégie de Résolution de Problèmes

**Étape 1: Comprendre**
- Lire documentation pertinente
- Analyser code existant
- Identifier patterns similaires

**Étape 2: Planifier**
- Décomposer problème en sous-tâches
- Identifier dépendances
- Planifier ordre d'exécution

**Étape 3: Implémenter**
- Appliquer patterns établis
- Suivre conventions du projet
- Tester au fur et à mesure

**Étape 4: Valider**
- Vérifier tests passent
- Vérifier qualité du code
- Vérifier pas de régression

### 2. Gestion des Erreurs et Apprentissage

**Quand une Erreur Survient:**
1. ✅ Lire message d'erreur complet
2. ✅ Analyser contexte de l'erreur
3. ✅ Chercher solutions similaires dans le codebase
4. ✅ Appliquer correction appropriée
5. ✅ Documenter apprentissage

**Pattern:**
```typescript
// Erreur: Type mismatch
// 1. Analyser types attendus
// 2. Chercher usages similaires
codebase_search("How is this type used correctly?", target_directories)
// 3. Appliquer correction
// 4. Documenter apprentissage
```

### 3. Amélioration Continue

**TOUJOURS:**
- ✅ Identifier code qui peut être amélioré
- ✅ Appliquer refactoring progressif
- ✅ Documenter améliorations
- ✅ Réutiliser solutions efficaces

**Pattern:**
```typescript
// Identifier opportunité d'amélioration
// 1. Analyser code existant
// 2. Identifier anti-patterns
// 3. Proposer amélioration
// 4. Implémenter amélioration
// 5. Documenter changement
```

## 🎯 Checklist Optimisation Agent

### Avant de Commencer une Tâche
- [ ] Lire `activeContext.md` pour connaître l'état actuel
- [ ] Lire `projectbrief.md` pour comprendre le périmètre
- [ ] Lire `systemPatterns.md` pour comprendre l'architecture
- [ ] Chercher code similaire existant
- [ ] Identifier patterns établis à suivre

### Pendant le Développement
- [ ] Utiliser patterns établis (ne pas réinventer)
- [ ] Réutiliser code existant (DRY principle)
- [ ] Suivre conventions de code du projet
- [ ] Tester au fur et à mesure
- [ ] Logger avec contexte structuré

### Après le Développement
- [ ] Vérifier tests passent
- [ ] Vérifier couverture de code
- [ ] Vérifier types TypeScript
- [ ] Mettre à jour documentation si nécessaire
- [ ] Vérifier pas de régression
- [ ] Documenter apprentissages

## 🔗 Références

### Documentation Essentielle
- `@AGENTS.md` - Instructions complètes pour l'agent
- `@.cursor/rules/context-usage.md` - Utilisation optimale du contexte
- `@.cursor/rules/common-tasks.md` - Tâches courantes
- `@.cursor/rules/quick-reference.md` - Référence rapide

### Fichiers de Mémoire
- `@projectbrief.md` - Objectifs et périmètre
- `@activeContext.md` - État actuel et focus
- `@systemPatterns.md` - Patterns architecturaux
- `@techContext.md` - Stack technique

### Règles Cursor
- `@.cursor/rules/core.md` - Règles fondamentales
- `@.cursor/rules/quality-principles.md` - Principes de qualité
- `@.cursor/rules/workflows.md` - Workflows détaillés

---

**Note:** Ces stratégies d'optimisation améliorent significativement les performances de l'agent Cursor AI pour le projet Saxium.

