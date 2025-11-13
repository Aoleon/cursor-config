# Guide d'Utilisation des Outils MCP Chat History pour l'Agent Cursor

**Date:** 2025-01-29  
**Version:** 1.0.0  
**Objectif:** Permettre à l'agent Cursor d'accéder à l'historique des chats pour s'améliorer

---

## 🎯 Objectif

Ce guide explique comment l'agent Cursor peut utiliser les outils MCP `cursor-chat-history-custom` pour accéder à l'historique des conversations et s'améliorer.

## ⚠️ Limitations Actuelles

**IMPORTANT:** Cursor archive rapidement les conversations dans la base de données. **Même les conversations récentes** sont généralement archivées (leur contenu est supprimé).

**Ce qui est disponible:**
- ✅ IDs des conversations
- ✅ Titres des conversations (si disponibles, souvent génériques comme "Conversation xxx")
- ✅ Timestamps estimés
- ✅ Project paths (si disponibles)
- ✅ Flag `isArchived: true` pour indiquer que les données complètes ne sont plus disponibles
- ✅ **Si une conversation récente existe encore** : contenu complet avec tous les messages (flag `hasFullContent: true`)

**Ce qui n'est généralement PAS disponible:**
- ❌ Contenu des messages (pour la plupart des conversations archivées)
- ❌ Détails des conversations (pour les conversations archivées)
- ❌ Historique complet des échanges (pour les conversations archivées)

**Note:** Le serveur MCP (v1.4.2+) inclut automatiquement le contenu complet si une conversation existe encore dans la base de données avec ses messages. Cependant, Cursor archive rapidement les conversations, donc même les conversations récentes peuvent être archivées.

## 🔧 Outils Disponibles

### 1. `list_conversations`

**Description:** Liste les conversations Cursor avec métadonnées disponibles.

**Utilisation:**
```javascript
// Exemple d'appel depuis l'agent
const result = await mcp_cursor-chat-history-custom_list_conversations({
  limit: 50,
  projectPath: "/Users/thibault/Développements /JLM App/jlm-app",
  debug: false
});

// Format de retour
{
  "conversations": [
    {
      "id": "workbench.panel.aichat.view.89029d65-0793-4984-ac00-f62727505b9b",
      "title": "Conversation c554a58a",
      "timestamp": 1736774400000,
      "projectPath": "/Users/thibault/Développements /JLM App/jlm-app",
      "messageCount": 0,
      "isArchived": true  // ⚠️ Les données complètes ne sont plus disponibles
    }
  ],
  "total": 51
}
```

**Cas d'usage pour l'agent:**
- Identifier les conversations récentes pour analyser les patterns
- Filtrer par projet pour analyser un contexte spécifique
- Obtenir une vue d'ensemble de l'historique

### 2. `get_conversation`

**Description:** Tente de récupérer une conversation complète par son ID.

**⚠️ LIMITATION:** La plupart des conversations retourneront une erreur car les données complètes ne sont plus dans la base de données.

**Utilisation:**
```javascript
const result = await mcp_cursor-chat-history-custom_get_conversation({
  conversationId: "workbench.panel.aichat.view.89029d65-0793-4984-ac00-f62727505b9b"
});

// Si la conversation existe encore:
// Retourne les données complètes de la conversation

// Si la conversation n'existe plus (cas le plus fréquent):
{
  "error": "Conversation non trouvée: ..."
}
```

### 3. `get_conversation_analytics`

**Description:** Récupère des statistiques sur les conversations.

**Utilisation:**
```javascript
const analytics = await mcp_cursor-chat-history-custom_get_conversation_analytics({
  scope: "recent",
  recentDays: 30,
  projectPath: "/Users/thibault/Développements /JLM App/jlm-app"
});

// Format de retour
{
  "total": 1048,
  "byProject": {},
  "recent": 0,
  "averageMessagesPerConversation": 0,
  "dateRange": {
    "oldest": null,
    "newest": null
  }
}
```

**Cas d'usage pour l'agent:**
- Obtenir des statistiques globales sur l'historique
- Identifier les tendances (nombre de conversations, répartition par projet)

### 4. `analyze_improvement_patterns` ⭐ RECOMMANDÉ

**Description:** Analyse les métadonnées des conversations pour identifier les patterns d'amélioration.

**Utilisation:**
```javascript
const analysis = await mcp_cursor-chat-history-custom_analyze_improvement_patterns({
  analysisType: "all",  // 'errors', 'solutions', 'patterns', ou 'all'
  limit: 100,
  recentDays: 30,
  projectPath: "/Users/thibault/Développements /JLM App/jlm-app"
});

// Format de retour
{
  "totalConversations": 51,
  "recentConversations": 10,
  "errors": {
    "patterns": [
      {
        "conversationId": "...",
        "title": "Fix error in...",
        "timestamp": 1736774400000
      }
    ]
  },
  "solutions": {
    "patterns": [
      {
        "conversationId": "...",
        "title": "Implement solution for...",
        "timestamp": 1736774400000
      }
    ]
  },
  "patterns": {
    "topics": [
      { "topic": "error", "count": 15 },
      { "topic": "fix", "count": 12 },
      { "topic": "implement", "count": 8 }
    ]
  },
  "recommendations": [
    {
      "type": "error_prevention",
      "priority": "high",
      "message": "15 conversations concernent des erreurs. L'agent devrait être plus proactif dans la détection et la prévention des erreurs."
    }
  ]
}
```

**Cas d'usage pour l'agent:**
- ✅ **Identifier les erreurs récurrentes** : Analyser les titres pour détecter les patterns d'erreurs
- ✅ **Identifier les solutions efficaces** : Trouver les conversations qui contiennent des solutions
- ✅ **Comprendre les topics fréquents** : Analyser les mots-clés les plus utilisés
- ✅ **Suivre les recommandations** : Utiliser les recommandations automatiques pour améliorer le comportement

## 📋 Stratégie Recommandée pour l'Agent

### 1. Analyser les Patterns d'Erreurs

```javascript
// L'agent peut analyser les erreurs récurrentes
const errorAnalysis = await analyze_improvement_patterns({
  analysisType: "errors",
  limit: 100,
  recentDays: 30
});

// Puis adapter son comportement
if (errorAnalysis.errors.patterns.length > 10) {
  // L'agent devrait être plus proactif dans la détection d'erreurs
  // Utiliser plus de validation préventive
  // Ajouter plus de vérifications avant de proposer du code
}
```

### 2. Réutiliser les Solutions Efficaces

```javascript
// L'agent peut identifier les solutions qui ont bien fonctionné
const solutionAnalysis = await analyze_improvement_patterns({
  analysisType: "solutions",
  limit: 100,
  recentDays: 30
});

// Puis réutiliser ces patterns
solutionAnalysis.solutions.patterns.forEach(pattern => {
  // Analyser le titre pour comprendre le type de solution
  // Réutiliser l'approche dans des situations similaires
});
```

### 3. Comprendre les Topics Fréquents

```javascript
// L'agent peut identifier les topics les plus fréquents
const patternAnalysis = await analyze_improvement_patterns({
  analysisType: "patterns",
  limit: 200
});

// Puis optimiser ses réponses pour ces patterns
patternAnalysis.patterns.topics.forEach(({ topic, count }) => {
  if (count > 10) {
    // Ce topic est fréquent, l'agent devrait être plus efficace sur ce sujet
    // Précharger les règles et contextes pertinents
  }
});
```

### 4. Suivre les Recommandations

```javascript
// L'agent peut obtenir des recommandations automatiques
const analysis = await analyze_improvement_patterns({
  analysisType: "all",
  limit: 100
});

// Puis adapter son comportement selon les recommandations
analysis.recommendations.forEach(rec => {
  if (rec.priority === "high") {
    // Prioriser cette amélioration
    // Adapter la stratégie immédiatement
  }
});
```

## 🔍 Exemple d'Analyse Complète

```javascript
// L'agent peut faire une analyse complète pour s'améliorer
async function analyzeAndImprove() {
  // 1. Obtenir les statistiques globales
  const analytics = await get_conversation_analytics({
    scope: "recent",
    recentDays: 30
  });
  
  // 2. Analyser les patterns d'amélioration
  const patterns = await analyze_improvement_patterns({
    analysisType: "all",
    limit: 100,
    recentDays: 30
  });
  
  // 3. Adapter le comportement selon les résultats
  if (patterns.errors.patterns.length > patterns.solutions.patterns.length) {
    // Plus d'erreurs que de solutions = besoin d'être plus proactif
    // Augmenter la validation préventive
    // Ajouter plus de vérifications
  }
  
  // 4. Suivre les recommandations
  patterns.recommendations.forEach(rec => {
    // Implémenter les recommandations prioritaires
  });
  
  return {
    insights: {
      errorRate: patterns.errors.patterns.length / patterns.totalConversations,
      solutionRate: patterns.solutions.patterns.length / patterns.totalConversations,
      topTopics: patterns.patterns.topics.slice(0, 5),
      recommendations: patterns.recommendations
    }
  };
}
```

## ⚠️ Limitations et Alternatives

### Limitations Actuelles

1. **Pas de contenu des messages** : Seules les métadonnées sont disponibles
2. **Conversations archivées** : La plupart des conversations sont marquées `isArchived: true`
3. **Pas d'accès direct au contenu** : Impossible de lire les messages passés

### Alternatives pour l'Agent

1. **Analyser la codebase** : L'agent peut analyser le code et la documentation pour identifier les patterns
2. **Utiliser les règles Cursor** : Les règles dans `.cursor/rules/` contiennent les patterns d'amélioration
3. **Analyser les fichiers de documentation** : Les fichiers `docs/` contiennent des analyses détaillées
4. **Utiliser `analyze_improvement_patterns`** : Même avec des métadonnées limitées, cet outil peut identifier des patterns utiles

## 📊 Exemple de Résultats Attendus

Avec les outils MCP, l'agent peut obtenir :

```json
{
  "totalConversations": 51,
  "recentConversations": 10,
  "errors": {
    "patterns": [
      {
        "conversationId": "...",
        "title": "Fix error in metadata",
        "timestamp": 1736774400000
      }
    ]
  },
  "solutions": {
    "patterns": [
      {
        "conversationId": "...",
        "title": "Implement solution for performance",
        "timestamp": 1736774400000
      }
    ]
  },
  "patterns": {
    "topics": [
      { "topic": "error", "count": 15 },
      { "topic": "fix", "count": 12 },
      { "topic": "implement", "count": 8 }
    ]
  },
  "recommendations": [
    {
      "type": "error_prevention",
      "priority": "high",
      "message": "15 conversations concernent des erreurs. L'agent devrait être plus proactif dans la détection et la prévention des erreurs."
    }
  ]
}
```

L'agent peut alors :
- ✅ Identifier que les erreurs sont fréquentes (15 conversations)
- ✅ Comprendre que "error" et "fix" sont des topics fréquents
- ✅ Suivre la recommandation d'être plus proactif dans la détection d'erreurs

## 🎯 Conclusion

Même si les conversations complètes ne sont plus disponibles, l'agent peut toujours utiliser les outils MCP pour :

1. **Analyser les patterns** via les métadonnées (titres, timestamps)
2. **Identifier les erreurs récurrentes** via l'analyse des titres
3. **Comprendre les topics fréquents** via l'analyse textuelle
4. **Suivre les recommandations** pour améliorer son comportement

L'outil `analyze_improvement_patterns` est particulièrement utile car il analyse les métadonnées disponibles et génère des insights exploitables même sans le contenu complet des conversations.

---

**Note:** Pour accéder aux outils MCP, l'agent doit utiliser les fonctions `mcp_cursor-chat-history-custom_*` disponibles dans l'environnement Cursor.

