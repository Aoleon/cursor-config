<!-- 
Context: test-generation, testing, quality, coverage, automation
Priority: P1
Auto-load: when creating or modifying code, when ensuring quality, when improving coverage
Dependencies: core.md, quality-principles.md, code-quality.md, testing.md
Score: 70
-->

# Génération Automatique de Tests - Saxium

**Objectif:** Générer automatiquement des tests unitaires, de régression et de performance pour garantir la qualité du code.

**Référence:** [Cursor Rules Documentation](https://docs.cursor.com/context/rules)  
**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

## 🎯 Principe Fondamental

**IMPÉRATIF:** L'agent DOIT générer automatiquement des tests pour le code créé ou modifié pour garantir la qualité et la couverture.

**Bénéfices:**
- ✅ Couverture de code automatique
- ✅ Détection précoce des bugs
- ✅ Tests de régression automatiques
- ✅ Amélioration de la qualité

**Référence:** `@.cursor/rules/testing.md` - Patterns tests  
**Référence:** `@.cursor/rules/code-quality.md` - Standards qualité

## 📋 Règles de Génération

### 1. Génération de Tests Unitaires

**TOUJOURS:**
- ✅ Générer tests pour fonctions publiques
- ✅ Couvrir cas normaux et limites
- ✅ Tester erreurs et exceptions
- ✅ Valider couverture minimale (80%+)

### 2. Tests de Régression Automatiques

**TOUJOURS:**
- ✅ Générer tests pour changements récents
- ✅ Détecter régressions automatiquement
- ✅ Valider comportement inchangé
- ✅ Documenter régressions détectées

### 3. Tests de Performance

**TOUJOURS:**
- ✅ Générer tests de performance si nécessaire
- ✅ Valider temps d'exécution
- ✅ Détecter dégradations de performance
- ✅ Alerter si performance insuffisante

## 🔄 Workflow

1. Analyser code à tester
2. Identifier fonctions à tester
3. Générer tests unitaires
4. Générer tests de régression
5. Générer tests de performance si nécessaire
6. Valider couverture
7. Exécuter tests

## ⚠️ Règles

**TOUJOURS:**
- ✅ Générer tests pour code nouveau/modifié
- ✅ Couvrir cas normaux et limites
- ✅ Valider couverture minimale
- ✅ Exécuter tests générés

**NE JAMAIS:**
- ❌ Générer code sans tests
- ❌ Ignorer couverture insuffisante
- ❌ Ne pas exécuter tests générés

## 🔗 Références

- `@.cursor/rules/testing.md` - Patterns tests
- `@.cursor/rules/code-quality.md` - Standards qualité

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-01-29

