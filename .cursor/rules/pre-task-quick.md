# Évaluation Préalable Rapide - Saxium

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

Checklist rapide en 5 points pour évaluation préalable des tâches. Version simplifiée de `pre-task-evaluation.md`.

## 🚀 Checklist Rapide (5 Points)

### 0. Vérification Conflits Multi-Chats (NOUVEAU - PRIORITÉ)

**Avant toute modification de fichier:**
- [ ] Exécuter `tsx scripts/detect-chat-conflicts.ts --file <filepath>` si modification fichier
- [ ] Vérifier si fichier dans zone de travail assignée
- [ ] Vérifier conflits critiques/haute priorité
- [ ] S'assigner dans zone si libre
- [ ] Bloquer modification si conflits critiques détectés

**Référence:** `@.cursor/rules/multi-chat-coordination.md` - Coordination multi-chats complète

### 1. Analyser la Tâche

**Avant toute implémentation:**
- [ ] Comprendre l'objectif exact de la tâche
- [ ] Identifier les contraintes (techniques, métier, temps)
- [ ] Identifier les dépendances existantes
- [ ] Identifier les patterns similaires dans le codebase

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable complète

### 2. Évaluer Automatisation par Script

**Pour tâches répétitives ou batch:**
- [ ] Détecter si tâche est automatisable par script
- [ ] Comparer script vs actions manuelles
- [ ] Si script recommandé (score >= 7), créer et exécuter script

**Référence:** `@.cursor/rules/script-automation.md` - Automatisation par script complète

### 3. Identifier Approches Possibles

**Toujours identifier au moins 2-3 approches:**
- [ ] Réutiliser script existant (si applicable)
- [ ] Réutiliser solution existante
- [ ] Appliquer pattern établi
- [ ] Nouvelle implémentation optimisée

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Identification approches

### 4. Évaluer selon 4 Critères

**Évaluer chaque approche selon:**
- [ ] **Rapidité** - Temps d'exécution et latence
- [ ] **Performance** - Efficacité et optimisation
- [ ] **Robustesse** - Résistance aux erreurs et gestion d'erreurs
- [ ] **Maintenabilité** - Clarté, documentation, testabilité

**Critères de sélection:**
- Robustesse >= 6/10 (bloquant)
- Maintenabilité >= 5/10 (important)
- Score global >= 6/10

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Évaluation multi-critères

### 5. Sélectionner Meilleure Approche

**Sélectionner approche avec meilleur score global:**
- [ ] Comparer scores de toutes les approches
- [ ] Sélectionner approche avec meilleur score global
- [ ] Vérifier critères bloquants (robustesse >= 6, maintenabilité >= 5)
- [ ] Documenter sélection avec raisonnement

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Comparaison et sélection

## 📋 Template d'Évaluation Simplifié

### Analyse Rapide

```typescript
interface QuickEvaluation {
  task: {
    objective: string;
    constraints: string[];
    dependencies: string[];
  };
  approaches: {
    id: string;
    description: string;
    scores: {
      speed: number; // 0-10
      performance: number; // 0-10
      robustness: number; // 0-10 (>= 6 requis)
      maintainability: number; // 0-10 (>= 5 requis)
    };
    overallScore: number; // Moyenne pondérée
  }[];
  selected: {
    approach: string;
    reasoning: string;
  };
}
```

### Exemple d'Évaluation

**Tâche:** Créer route API pour créer offre

**Approche 1: Réutiliser pattern existant**
- Rapidité: 9/10 (pattern existant)
- Performance: 8/10 (optimisé)
- Robustesse: 9/10 (pattern testé)
- Maintenabilité: 9/10 (cohérent)
- **Score global: 8.75/10** ✅

**Approche 2: Nouvelle implémentation**
- Rapidité: 6/10 (développement nécessaire)
- Performance: 7/10 (optimisation possible)
- Robustesse: 7/10 (tests nécessaires)
- Maintenabilité: 6/10 (documentation nécessaire)
- **Score global: 6.5/10**

**Sélection:** Approche 1 (réutiliser pattern existant)
**Raisonnement:** Pattern existant testé, robuste, maintenable et plus rapide.

## 🎯 Quand Utiliser cette Checklist

### Tâches Simples

**Checklist rapide suffisante:**
- Modifications mineures
- Corrections de bugs simples
- Ajouts de champs simples

### Tâches Complexes

**Utiliser évaluation complète:**
- Nouvelles fonctionnalités majeures
- Refactorings importants
- Optimisations critiques
- Intégrations complexes

**Référence:** `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable complète

## 🔗 Références

### Documentation Essentielle

- `@.cursor/rules/pre-task-evaluation.md` - Évaluation préalable complète
- `@.cursor/rules/script-automation.md` - Automatisation par script
- `@.cursor/rules/workflows.md` - Workflows détaillés

### Fichiers de Contexte

- `@activeContext.md` - État actuel et focus
- `@systemPatterns.md` - Patterns architecturaux
- `@projectbrief.md` - Objectifs et périmètre

### Guides

- `@.cursor/rules/quick-start.md` - Guide de démarrage rapide
- `@.cursor/rules/examples.md` - Exemples concrets
- `@.cursor/rules/anti-patterns.md` - Anti-patterns consolidés

---

**Note:** Cette checklist rapide couvre les 5 points essentiels. Pour les détails complets, consultez `@.cursor/rules/pre-task-evaluation.md`.

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

