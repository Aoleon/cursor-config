# Serveur MCP Cursor Chat History - Personnalisé

## 📋 Description

Serveur MCP personnalisé pour accéder à l'historique des chats Cursor. Remplace `cursor-chat-history-mcp` qui a des problèmes de compilation avec Node.js v22.

**Version 1.4.1** : Analyse améliorée avec recommandations codebase :
- ✅ Analyse améliorée des IDs de conversations (pas seulement les titres)
- ✅ Détection de patterns dans les IDs (aichat, composer, etc.)
- ✅ Recommandations automatiques pour utiliser l'analyse de la codebase
- ✅ Insights codebase intégrés dans les recommandations (patterns d'erreurs, solutions, actions prioritaires)
- ✅ Détection améliorée même avec titres génériques
- ✅ Recommandations avec métriques codebase (741 try-catch, 933 `any`, etc.)

**Version 1.4.0** : Analyse d'amélioration pour l'agent :
- ✅ Nouvel outil `analyze_improvement_patterns` pour identifier les patterns d'amélioration
- ✅ Détection automatique des erreurs récurrentes et solutions efficaces
- ✅ Génération de recommandations pour améliorer les performances de l'agent
- ✅ Analyse des topics et patterns fréquents

**Version 1.3.0** : Support des conversations archivées :
- ✅ Gestion des conversations archivées (références sans données complètes)
- ✅ Création d'entrées basiques pour les conversations supprimées
- ✅ Estimation intelligente des timestamps basée sur l'ordre des clés

**Version 1.2.0** : Améliorations majeures pour la détection des conversations :
- ✅ Recherche élargie avec patterns multiples pour différentes versions de Cursor
- ✅ Détection intelligente des conversations avec validation de structure
- ✅ Gestion améliorée des références `.hidden` et tableaux de conversations
- ✅ Mode debug pour diagnostiquer les problèmes de recherche
- ✅ Tri automatique par timestamp décroissant

**Version 1.1.0** : Améliorations majeures pour éviter les blocages et chargements infinis :
- ✅ Timeouts sur toutes les opérations (5 secondes)
- ✅ Gestion d'erreurs robuste avec retry automatique
- ✅ Fermeture automatique des connexions DB inactives
- ✅ Limites strictes sur le nombre de résultats
- ✅ Réponses d'erreur gracieuses au lieu de blocages

## ✅ Installation

Les dépendances sont déjà installées :
- `@modelcontextprotocol/sdk`
- `better-sqlite3@11.8.0`

## 🔧 Configuration

### Option 1 : Package officiel (recommandé)

Le package officiel `cursor-chat-history-mcp` est disponible et peut être utilisé directement :

```json
{
  "mcpServers": {
    "cursor-chat-history": {
      "command": "npx",
      "args": [
        "-y",
        "--package=cursor-chat-history-mcp",
        "cursor-chat-history-mcp"
      ]
    }
  }
}
```

### Option 2 : Serveur personnalisé (si le package officiel ne fonctionne pas)

Le serveur personnalisé est configuré dans `~/.cursor/mcp.json` :

```json
{
  "mcpServers": {
    "cursor-chat-history-custom": {
      "command": "node",
      "args": [
        "/Users/thibault/Développements /JLM App/jlm-app/scripts/cursor-chat-history-mcp-server.mjs"
      ]
    }
  }
}
```

**Note** : Vous pouvez avoir les deux configurations en même temps avec des noms différents (`cursor-chat-history` et `cursor-chat-history-custom`).

## 🚀 Utilisation

Après redémarrage de Cursor, le serveur MCP sera disponible avec 4 outils pour permettre à l'agent de s'améliorer :

### 1. `list_conversations`
Liste les conversations Cursor avec résumés, titres et métadonnées.

**Paramètres :**
- `projectPath` (optionnel) : Chemin du projet pour filtrer
- `limit` (optionnel, défaut: 20) : Nombre max de conversations (1-100)
- `includeAiSummaries` (optionnel, défaut: true) : Inclure les résumés IA
- `debug` (optionnel, défaut: false) : Activer le mode debug pour voir les logs de recherche

### 2. `get_conversation`
Récupère une conversation complète par son ID.

**Paramètres :**
- `conversationId` (requis) : ID de la conversation

### 3. `get_conversation_analytics`
Récupère des statistiques et analyses sur les conversations.

**Paramètres :**
- `projectPath` (optionnel) : Chemin du projet pour filtrer
- `scope` (optionnel, défaut: 'recent') : 'recent', 'all', ou 'project'
- `recentDays` (optionnel, défaut: 30) : Nombre de jours pour scope "recent"

### 4. `analyze_improvement_patterns` ⭐ NOUVEAU
Analyse les conversations passées pour identifier les patterns d'amélioration, erreurs récurrentes, solutions efficaces et opportunités d'apprentissage. **Permet à l'agent de s'améliorer en apprenant de l'historique.**

**Paramètres :**
- `projectPath` (optionnel) : Chemin du projet pour filtrer
- `analysisType` (optionnel, défaut: 'all') : Type d'analyse - 'errors' (erreurs récurrentes), 'solutions' (solutions efficaces), 'patterns' (patterns généraux), ou 'all'
- `limit` (optionnel, défaut: 50) : Nombre max de conversations à analyser (10-200)
- `recentDays` (optionnel, défaut: 30) : Nombre de jours pour analyser les conversations récentes

**Retourne :**
- `totalConversations` : Nombre total de conversations analysées
- `recentConversations` : Nombre de conversations récentes
- `errors.patterns` : Liste des conversations contenant des erreurs
- `solutions.patterns` : Liste des conversations contenant des solutions efficaces
- `patterns.topics` : Top 10 des topics les plus fréquents
- `recommendations` : Recommandations pour améliorer les performances de l'agent

**Exemple d'utilisation par l'agent :**
```javascript
// L'agent peut appeler cet outil pour apprendre de ses erreurs passées
const analysis = await analyze_improvement_patterns({
  analysisType: 'errors',
  limit: 100,
  recentDays: 30
});

// Puis utiliser les recommandations pour améliorer son comportement
analysis.recommendations.forEach(rec => {
  if (rec.type === 'error_prevention') {
    // L'agent peut ajuster sa stratégie pour éviter ces erreurs
  }
});
```

## 🔍 Emplacement de la Base de Données

La base de données Cursor est située à :
```
~/Library/Application Support/Cursor/User/globalStorage/state.vscdb
```

## 🐛 Dépannage

### Le serveur ne démarre pas
1. Vérifiez que `better-sqlite3` est installé : `npm list better-sqlite3`
2. Vérifiez que le chemin dans `mcp.json` est correct
3. Vérifiez les logs Cursor : `~/Library/Application Support/Cursor/logs/`

### Erreur "Impossible d'ouvrir la base de données"
1. Vérifiez que Cursor est fermé (la base peut être verrouillée)
2. Vérifiez les permissions du fichier `state.vscdb`

### Chargement infini des chats dans Cursor
**Problème résolu en v1.1.0** : Le serveur utilise maintenant des timeouts et une gestion d'erreurs robuste pour éviter les blocages.

Si le problème persiste :
1. **Redémarrez Cursor** pour recharger le serveur MCP avec les nouvelles améliorations
2. Vérifiez les logs du serveur MCP dans la console Cursor
3. Si nécessaire, désactivez temporairement le serveur MCP dans `~/.cursor/mcp.json` :
   ```json
   {
     "mcpServers": {
       "cursor-chat-history-custom": {
         "command": "node",
         "args": ["/path/to/script.mjs"],
         "disabled": true
       }
     }
   }
   ```

### Aucune conversation trouvée
- Les conversations sont stockées avec des clés comme `workbench.panel.composerChatViewPane.*`
- Le format peut varier selon la version de Cursor
- Le serveur limite automatiquement les résultats à 50 conversations pour éviter les blocages
- **Note importante** : Les conversations peuvent être référencées dans des clés `.hidden` mais les conversations référencées peuvent ne plus exister dans la base de données (supprimées après un certain temps ou stockées ailleurs)
- **v1.3.0+** : Le serveur crée maintenant des entrées basiques pour les conversations archivées (marquées avec `isArchived: true`) même si les données complètes n'existent plus
- Utilisez le paramètre `debug: true` pour voir les détails de la recherche dans les logs

## 🎯 Utilisation par l'Agent Cursor pour S'Améliorer

**⚠️ IMPORTANT:** Les conversations complètes ne sont plus disponibles dans la base de données Cursor. Seules les **métadonnées** (titres, IDs, timestamps) sont accessibles. L'outil `analyze_improvement_patterns` est recommandé car il analyse ces métadonnées pour générer des insights exploitables.

**📖 Guide complet:** Voir `docs/GUIDE_UTILISATION_MCP_CHAT_HISTORY.md` pour un guide détaillé d'utilisation par l'agent.

L'objectif principal de ce serveur MCP est de permettre à l'agent Cursor d'accéder à son historique de conversations pour s'améliorer. Voici comment l'agent peut utiliser ces outils :

### 1. Analyser les Erreurs Récurrentes
```javascript
// L'agent peut identifier les erreurs qu'il fait souvent
const errorAnalysis = await analyze_improvement_patterns({
  analysisType: 'errors',
  recentDays: 30
});
// Puis ajuster son comportement pour éviter ces erreurs
```

### 2. Réutiliser les Solutions Efficaces
```javascript
// L'agent peut identifier les solutions qui ont bien fonctionné
const solutionAnalysis = await analyze_improvement_patterns({
  analysisType: 'solutions',
  recentDays: 30
});
// Puis réutiliser ces patterns dans de nouvelles situations
```

### 3. Comprendre les Patterns Fréquents
```javascript
// L'agent peut identifier les topics et patterns les plus fréquents
const patternAnalysis = await analyze_improvement_patterns({
  analysisType: 'patterns',
  limit: 100
});
// Puis optimiser ses réponses pour ces patterns
```

### 4. Suivre les Recommandations
```javascript
// L'agent peut obtenir des recommandations automatiques
const analysis = await analyze_improvement_patterns({ analysisType: 'all' });
analysis.recommendations.forEach(rec => {
  // Adapter le comportement selon les recommandations
  if (rec.priority === 'high') {
    // Prioriser cette amélioration
  }
});
```

## 📝 Notes

- Le serveur utilise `better-sqlite3@11.8.0` qui est compatible avec Node.js v22
- La base de données est ouverte en mode lecture seule
- Les conversations sont parsées depuis JSON stocké dans la base
- **Timeouts** : Toutes les opérations ont un timeout de 5 secondes pour éviter les blocages
- **Limites** : Maximum 50 conversations par requête pour `list_conversations`, 1000 pour `get_conversation_analytics`, 200 pour `analyze_improvement_patterns`
- **Retry automatique** : En cas d'erreur, le serveur réessaye automatiquement jusqu'à 2 fois
- **Fermeture automatique** : Les connexions DB sont fermées après 30 secondes d'inactivité

## 🔄 Mise à Jour

Pour mettre à jour le serveur :
1. Modifiez `scripts/cursor-chat-history-mcp-server.mjs`
2. Redémarrez Cursor pour recharger le serveur MCP

---

**Version:** 1.4.1  
**Dernière mise à jour:** 2025-01-29

## 🔄 Changelog

### v1.4.1 (2025-01-29)
- ✅ **Analyse améliorée avec recommandations codebase** : Analyse des IDs de conversations même avec titres génériques
- ✅ Détection de patterns dans les IDs (aichat, composer, etc.)
- ✅ Recommandations automatiques avec insights codebase intégrés :
  - Patterns d'erreurs identifiés (741 try-catch, 33 retry, metadata vides, etc.)
  - Patterns de solutions (migration modulaire, optimisations performance, etc.)
  - Actions prioritaires (standardisation gestion d'erreurs, migration modulaire, etc.)
- ✅ Recommandation `codebase_analysis_recommended` avec métriques complètes
- ✅ Recommandation `metadata_limitation` avec action et insights codebase
- ✅ Recommandation `high_activity` avec métriques codebase
- ✅ Plus de mots-clés pour détecter les erreurs et solutions (broken, wrong, refactor, migrate, etc.)

### v1.4.0 (2025-01-29)
- ✅ **Nouvel outil `analyze_improvement_patterns`** : Permet à l'agent d'analyser l'historique pour s'améliorer
- ✅ Détection automatique des erreurs récurrentes et solutions efficaces
- ✅ Génération de recommandations pour améliorer les performances
- ✅ Analyse des topics et patterns fréquents dans les conversations
- ✅ Amélioration des descriptions des outils pour clarifier leur utilité pour l'amélioration de l'agent

### v1.3.0 (2025-01-29)
- ✅ Support des conversations archivées : création d'entrées basiques même quand les conversations complètes n'existent plus
- ✅ Estimation intelligente des timestamps basée sur l'ordre des clés dans la base de données
- ✅ Marquage des conversations archivées avec le flag `isArchived: true`
- ✅ Amélioration de la gestion des références `.hidden` avec fallback sur les métadonnées disponibles

### v1.2.0 (2025-01-29)
- ✅ Recherche élargie avec 7 patterns différents pour différentes versions de Cursor
- ✅ Détection intelligente des conversations avec validation de structure (`looksLikeConversation`)
- ✅ Gestion améliorée des références `.hidden` et tableaux de conversations (jusqu'à 20 références par clé)
- ✅ Mode debug pour diagnostiquer les problèmes de recherche
- ✅ Tri automatique par timestamp décroissant
- ✅ Recherche de fallback élargie si les patterns spécifiques ne trouvent rien
- ✅ Meilleure gestion des erreurs avec logs détaillés en mode debug

### v1.1.0 (2025-01-29)
- ✅ Ajout de timeouts sur toutes les opérations (5s)
- ✅ Gestion d'erreurs robuste avec retry automatique
- ✅ Fermeture automatique des connexions DB inactives
- ✅ Limites strictes sur les résultats pour éviter les blocages
- ✅ Réponses d'erreur gracieuses au lieu de blocages
- ✅ Correction du problème de chargement infini dans Cursor

### v1.0.0 (2025-01-29)
- Version initiale

