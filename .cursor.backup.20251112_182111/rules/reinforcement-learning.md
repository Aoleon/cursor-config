<!-- 
Context: reinforcement-learning, adaptation, learning, optimization, strategy-adjustment
Priority: P2
Auto-load: when optimizing agent behavior based on results, when improving strategies
Dependencies: core.md, quality-principles.md, learning-memory.md, rule-feedback-loop.md
Score: 55
-->

# Apprentissage par Renforcement - Saxium

**Objectif:** Améliorer continuellement le comportement de l'agent en utilisant l'apprentissage par renforcement basé sur les résultats.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT utiliser l'apprentissage par renforcement pour améliorer continuellement ses stratégies basées sur les résultats obtenus.

**Bénéfices:**
- ✅ Amélioration continue des stratégies
- ✅ Adaptation automatique
- ✅ Optimisation basée sur résultats
- ✅ Apprentissage des patterns de succès

**Référence:** `@.cursor/rules/learning-memory.md` - Mémoire persistante  
**Référence:** `@.cursor/rules/rule-feedback-loop.md` - Boucle de feedback

## 📋 Règles d'Apprentissage

### 1. Système de Récompenses/Pénalités

**TOUJOURS:**
- ✅ Récompenser stratégies réussies
- ✅ Pénaliser stratégies échouées
- ✅ Ajuster poids des stratégies
- ✅ Explorer nouvelles stratégies

### 2. Ajustement Automatique des Stratégies

**TOUJOURS:**
- ✅ Ajuster stratégies selon résultats
- ✅ Augmenter poids stratégies efficaces
- ✅ Réduire poids stratégies inefficaces
- ✅ Explorer vs exploiter

### 3. Apprentissage des Patterns de Succès

**TOUJOURS:**
- ✅ Identifier patterns de succès
- ✅ Réutiliser patterns efficaces
- ✅ Éviter patterns d'échec
- ✅ Documenter apprentissages

## 🔄 Workflow

1. Exécuter stratégie
2. Évaluer résultat (récompense/pénalité)
3. Ajuster poids stratégie
4. Explorer nouvelles stratégies si nécessaire
5. Documenter apprentissage

## ⚠️ Règles

**TOUJOURS:**
- ✅ Récompenser succès
- ✅ Pénaliser échecs
- ✅ Ajuster stratégies
- ✅ Apprendre patterns

**NE JAMAIS:**
- ❌ Ignorer résultats
- ❌ Ne pas ajuster stratégies
- ❌ Ignorer patterns de succès

## 🔗 Références

- `@.cursor/rules/learning-memory.md` - Mémoire persistante
- `@.cursor/rules/rule-feedback-loop.md` - Boucle de feedback

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

