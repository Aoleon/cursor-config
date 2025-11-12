# Métriques Agent Cursor - Saxium

**Date:** 2025-11-12  
**Version:** 1.0.0  
**Statut:** Documentation des Métriques

## 🎯 Objectif

Ce document définit les métriques à suivre pour mesurer l'efficacité de l'agent Cursor et identifier les patterns d'échec/succès.

## 📊 Métriques Principales

### 1. Métriques de Performance

#### Temps de Résolution des Tâches
- **Métrique:** Temps moyen pour compléter une tâche (de la création du todo à la complétion)
- **Objectif:** < 15 minutes pour tâches simples, < 60 minutes pour tâches complexes
- **Mesure:** Timestamp création todo → Timestamp complétion
- **Catégories:**
  - Tâches simples (< 3 todos)
  - Tâches moyennes (3-10 todos)
  - Tâches complexes (> 10 todos)

#### Nombre de Tool Calls
- **Métrique:** Nombre moyen de tool calls par tâche
- **Objectif:** < 50 pour tâches simples, < 200 pour tâches complexes
- **Mesure:** Compteur tool calls par session
- **Catégories:**
  - Tool calls totaux
  - Tool calls par type (read_file, search_replace, grep, etc.)
  - Tool calls redondants (même fichier lu plusieurs fois)

#### Saturation du Contexte
- **Métrique:** Taille du contexte utilisé vs limite
- **Objectif:** < 80% de la limite de contexte
- **Mesure:** Estimation tokens utilisés / tokens disponibles
- **Indicateurs:**
  - Nombre de fichiers chargés
  - Taille totale des fichiers
  - Nombre de règles chargées

### 2. Métriques de Qualité

#### Taux de Succès des Tâches
- **Métrique:** Pourcentage de tâches complétées sans erreurs
- **Objectif:** > 90%
- **Mesure:** (Tâches complétées sans erreurs / Total tâches) × 100
- **Catégories:**
  - Tâches complétées avec succès
  - Tâches complétées avec erreurs mineures
  - Tâches échouées

#### Erreurs TypeScript
- **Métrique:** Nombre d'erreurs TypeScript introduites/corrigées
- **Objectif:** Net négatif (plus d'erreurs corrigées que créées)
- **Mesure:** Différence erreurs avant/après modification
- **Catégories:**
  - Erreurs introduites
  - Erreurs corrigées
  - Erreurs résiduelles

#### Qualité du Code Généré
- **Métrique:** Score de qualité du code (0-100)
- **Objectif:** > 80
- **Mesure:** Analyse statique (complexité, duplication, maintenabilité)
- **Indicateurs:**
  - Complexité cyclomatique
  - Duplication de code
  - Conformité aux règles du projet

### 3. Métriques d'Utilisation

#### Usage des Règles
- **Métrique:** Fréquence d'utilisation de chaque règle
- **Objectif:** Identifier règles utilisées vs inutilisées
- **Mesure:** Compteur par règle chargée
- **Catégories:**
  - Règles P0 (toujours chargées)
  - Règles P1 (chargées selon contexte)
  - Règles P2 (chargées sur demande)

#### Patterns de Recherche
- **Métrique:** Types de recherches les plus fréquents
- **Objectif:** Optimiser cache et préchargement
- **Mesure:** Compteur par type de recherche (codebase_search, grep, etc.)
- **Catégories:**
  - Recherches sémantiques
  - Recherches exactes (grep)
  - Recherches de fichiers

#### Fichiers les Plus Modifiés
- **Métrique:** Fichiers modifiés le plus fréquemment
- **Objectif:** Identifier hotspots et opportunités d'optimisation
- **Mesure:** Compteur par fichier modifié
- **Catégories:**
  - Fichiers backend
  - Fichiers frontend
  - Fichiers de configuration

### 4. Métriques d'Efficacité

#### Taux de Réutilisation du Code
- **Métrique:** Pourcentage de code réutilisé vs nouveau code
- **Objectif:** > 40% de réutilisation
- **Mesure:** (Lignes réutilisées / Total lignes) × 100
- **Indicateurs:**
  - Code similaire détecté
  - Patterns réutilisés
  - Duplication évitée

#### Itérations par Tâche
- **Métrique:** Nombre moyen d'itérations pour compléter une tâche
- **Objectif:** < 3 itérations pour tâches simples
- **Mesure:** Compteur d'itérations (corrections, améliorations)
- **Catégories:**
  - Itérations pour corrections d'erreurs
  - Itérations pour améliorations
  - Itérations pour optimisations

#### Taux de Détection Proactive
- **Métrique:** Pourcentage de problèmes détectés avant qu'ils ne se produisent
- **Objectif:** > 70%
- **Mesure:** (Problèmes détectés proactivement / Total problèmes) × 100
- **Indicateurs:**
  - Bugs prévenus
  - Conflits détectés avant modification
  - Problèmes de performance anticipés

## 📈 Collecte des Métriques

### Système de Logging

Les métriques sont collectées via un système de logging simple basé sur fichiers JSON :

**Fichier:** `.cursor/agent-metrics.json`

**Structure:**
```json
{
  "sessionId": "uuid",
  "timestamp": "ISO 8601",
  "task": {
    "id": "todo-id",
    "description": "Description de la tâche",
    "complexity": "simple|medium|complex",
    "todosCount": 3
  },
  "performance": {
    "durationMs": 45000,
    "toolCallsCount": 67,
    "toolCallsByType": {
      "read_file": 15,
      "search_replace": 12,
      "grep": 8
    },
    "contextUsage": {
      "filesLoaded": 12,
      "rulesLoaded": 7,
      "estimatedTokens": 45000
    }
  },
  "quality": {
    "success": true,
    "typescriptErrorsBefore": 2,
    "typescriptErrorsAfter": 0,
    "codeQualityScore": 85
  },
  "usage": {
    "rulesUsed": ["core.md", "backend.md", "similar-code-detection.md"],
    "searchesPerformed": {
      "codebase_search": 5,
      "grep": 8
    },
    "filesModified": ["server/services/MyService.ts"]
  },
  "efficiency": {
    "codeReused": true,
    "iterationsCount": 2,
    "proactiveDetections": 3
  }
}
```

### Collecte Automatique

Les métriques sont collectées automatiquement via la règle `agent-metrics.md` qui :
1. Enregistre le début de chaque tâche
2. Track les tool calls
3. Enregistre la fin de chaque tâche avec résultats
4. Calcule les métriques agrégées

## 📊 Analyse des Métriques

### Rapports Quotidiens

**Fichier:** `.cursor/agent-metrics-daily.json`

**Métriques agrégées:**
- Tâches complétées
- Temps moyen de résolution
- Taux de succès
- Erreurs introduites/corrigées
- Règles les plus utilisées
- Fichiers les plus modifiés

### Rapports Hebdomadaires

**Fichier:** `.cursor/agent-metrics-weekly.json`

**Tendances:**
- Évolution performance sur 7 jours
- Patterns d'utilisation
- Améliorations/dégradations
- Recommandations d'optimisation

## 🎯 Objectifs et Seuils

### Seuils d'Alerte

- **Performance dégradée:** Temps résolution > 2x objectif
- **Qualité dégradée:** Taux succès < 80%
- **Saturation contexte:** > 90% limite
- **Erreurs introduites:** > 5 par tâche

### Actions Correctives

1. **Performance dégradée:**
   - Analyser tool calls redondants
   - Optimiser chargement règles
   - Réduire saturation contexte

2. **Qualité dégradée:**
   - Analyser patterns d'échec
   - Améliorer règles problématiques
   - Renforcer validation préventive

3. **Saturation contexte:**
   - Optimiser chargement règles
   - Réduire fichiers chargés
   - Améliorer compression contexte

## 🔗 Intégration

### Règles Cursor

Les métriques sont intégrées dans :
- `agent-metrics.md` - Tracking automatique
- `rule-usage-tracker.md` - Usage des règles
- `load-strategy.md` - Optimisation chargement

### Documentation

- Ce document définit les métriques
- `AGENT-OPTIMIZATION-ROADMAP.md` utilise ces métriques
- `AGENT-IMPROVEMENTS-ANALYSIS.md` analyse les résultats

---

**Version:** 1.0.0  
**Dernière mise à jour:** 2025-11-12

