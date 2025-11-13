# Script de Détection de Conflits Multi-Chats

**Fichier:** `scripts/detect-chat-conflicts.ts`  
**Objectif:** Détecter automatiquement les conflits potentiels entre différents chats Cursor

## 🚀 Utilisation

### Vérifier un Fichier Avant Modification

```bash
# Vérifier fichier spécifique
tsx scripts/detect-chat-conflicts.ts --file server/services/CacheService.ts

# Sortie JSON pour intégration
tsx scripts/detect-chat-conflicts.ts --file server/services/CacheService.ts --json
```

### Vérifier Tous les Fichiers Modifiés

```bash
# Analyser tous les fichiers modifiés dans git
tsx scripts/detect-chat-conflicts.ts --check-all

# Sortie JSON
tsx scripts/detect-chat-conflicts.ts --check-all --json
```

### Mode Par Défaut

```bash
# Analyser automatiquement tous les fichiers modifiés
tsx scripts/detect-chat-conflicts.ts
```

## 📊 Types de Conflits Détectés

### 1. Conflits de Modification de Fichier
- Fichier déjà modifié dans git
- Fichier dans zone de travail assignée à un autre chat

### 2. Conflits de Dépendances
- Dépendances modifiées récemment
- Impact des modifications sur les dépendances

### 3. Conflits de Zone de Travail
- Fichier dans zone critique assignée
- Chevauchement de zones de travail

### 4. Erreurs de Syntaxe
- Erreurs TypeScript bloquantes
- Erreurs de compilation

## 🎯 Zones de Travail Surveillées

Le script surveille automatiquement les zones de travail définies dans `docs/COORDINATION_CHATS_CURSOR.md`:

- **cache-services** (🔴 CRITIQUE): CacheService.ts, RedisCacheAdapter.ts
- **chatbot-service** (🔴 CRITIQUE): ChatbotOrchestrationService.ts
- **suppliers-routes** (🟡 HAUTE): suppliers/routes.ts
- **monday-service** (🟡 MOYENNE): MondayService.ts
- **batigest-routes** (🟢 BASSE): batigest/routes.ts
- **database-utils** (🟡 MOYENNE): database-helpers.ts, safe-query.ts, validation.ts

## 📋 Format de Sortie

### Sortie Texte (Par Défaut)

```
╔══════════════════════════════════════════════════════════════╗
║  DÉTECTION DE CONFLITS ENTRE CHATS CURSOR                   ║
╚══════════════════════════════════════════════════════════════╝

📊 Résumé:
   - Fichiers modifiés: 9
   - Conflits détectés: 3
   - Zones de travail: 6
   - Statut: 🔴 CONFLITS DÉTECTÉS

🔴 Conflits CRITIQUES (1):
   - server/services/RedisCacheAdapter.ts:54
     Fichier dans zone "cache-services" assignée à un autre chat
     💡 Contacter le chat assigné avant modification

📋 Zones de Travail:
   🔄 🔴 cache-services
      Fichiers: server/services/CacheService.ts, server/services/RedisCacheAdapter.ts
      Assigné à: chat-principal
      Conflits: 1

💡 Recommandations:
   🔴 CRITIQUE: Résoudre les conflits critiques avant de continuer
   ⚠️ Vérifier les zones de travail assignées avant modification
```

### Sortie JSON

```json
{
  "hasConflicts": true,
  "conflicts": [
    {
      "type": "zone_overlap",
      "severity": "critical",
      "filepath": "server/services/RedisCacheAdapter.ts",
      "description": "Fichier dans zone \"cache-services\" assignée à un autre chat",
      "suggestion": "Contacter le chat assigné avant modification"
    }
  ],
  "zones": [
    {
      "zone": "cache-services",
      "priority": "critical",
      "files": ["server/services/CacheService.ts", "server/services/RedisCacheAdapter.ts"],
      "status": "in_progress",
      "assignedChat": "chat-principal",
      "conflicts": [...]
    }
  ],
  "modifiedFiles": [...],
  "recommendations": [...],
  "timestamp": "2025-01-29T10:30:00.000Z"
}
```

## 🔧 Intégration dans Workflow Agent

### Avant Modification de Fichier

```typescript
import { execSync } from 'child_process';

async function checkConflictsBeforeModification(filepath: string): Promise<boolean> {
  try {
    const output = execSync(
      `tsx scripts/detect-chat-conflicts.ts --file ${filepath} --json`,
      { encoding: 'utf-8' }
    );
    
    const result = JSON.parse(output);
    
    // Bloquer si conflits critiques
    if (result.conflicts.some((c: any) => c.severity === 'critical')) {
      throw new Error('Conflits critiques détectés - modification bloquée');
    }
    
    // Avertir si conflits haute priorité
    if (result.conflicts.some((c: any) => c.severity === 'high')) {
      logger.warn('Conflits haute priorité détectés', {
        metadata: { filepath, conflicts: result.conflicts }
      });
    }
    
    return true;
  } catch (error) {
    logger.error('Erreur lors de la vérification des conflits', {
      metadata: { filepath, error: error.message }
    });
    throw error;
  }
}
```

### Dans les Règles Cursor

Référencer dans les règles:
- `@.cursor/rules/multi-chat-coordination.md` - Règle complète
- `@.cursor/rules/pre-task-quick.md` - Checklist rapide (point 0)
- `@.cursor/rules/core.md` - Règles fondamentales

## 🚨 Codes de Sortie

- `0`: Aucun conflit détecté ou conflits non-bloquants
- `1`: Conflits critiques ou haute priorité détectés

## 📝 Exemples d'Utilisation

### Exemple 1: Vérification Avant Modification

```bash
# Avant de modifier RedisCacheAdapter.ts
tsx scripts/detect-chat-conflicts.ts --file server/services/RedisCacheAdapter.ts

# Si conflits critiques, le script retourne code 1
# L'agent doit bloquer la modification
```

### Exemple 2: Analyse Complète

```bash
# Analyser tous les fichiers modifiés
tsx scripts/detect-chat-conflicts.ts --check-all

# Identifier tous les conflits potentiels
# Mettre à jour document de coordination si nécessaire
```

### Exemple 3: Intégration CI/CD

```bash
# Dans pipeline CI/CD, vérifier avant merge
tsx scripts/detect-chat-conflicts.ts --check-all

# Si conflits, bloquer merge
# Notifier équipe de coordination
```

## 🔗 Références

- `docs/COORDINATION_CHATS_CURSOR.md` - Document de coordination complet
- `.cursor/rules/multi-chat-coordination.md` - Règle de coordination
- `.cursor/rules/conflict-detection.md` - Détection proactive des conflits

---

**Note:** Ce script doit être exécuté avant toute modification de fichier pour éviter les conflits entre chats Cursor.

