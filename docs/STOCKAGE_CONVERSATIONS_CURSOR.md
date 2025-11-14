# Stockage des Conversations Cursor

## 📋 Vue d'ensemble

Système de stockage des conversations Cursor dans notre base de données PostgreSQL pour permettre à l'agent d'accéder à l'historique complet même après archivage par Cursor.

## 🎯 Objectif

Cursor archive rapidement les conversations dans sa base SQLite locale, ne gardant que les métadonnées. Ce système permet de :
- **Capturer** les conversations avant archivage
- **Stocker** le contenu complet dans PostgreSQL
- **Permettre à l'agent** d'accéder à l'historique complet pour s'améliorer

## 🏗️ Architecture

### 1. Table PostgreSQL : `cursor_conversations`

```typescript
{
  id: string;                    // ID unique dans notre DB
  cursorConversationId: string;   // ID original de Cursor
  title: string;                  // Titre de la conversation
  projectPath: string;            // Chemin du projet
  messages: jsonb;               // Tous les messages (contenu complet)
  metadata: jsonb;                // Métadonnées supplémentaires
  workspaceFolder: string;       // Dossier workspace
  contextFiles: string[];         // Fichiers dans le contexte
  contextRules: string[];         // Règles Cursor utilisées
  createdAt: timestamp;          // Date de création dans Cursor
  updatedAt: timestamp;           // Dernière mise à jour
  storedAt: timestamp;            // Date de stockage dans notre DB
  messageCount: number;          // Nombre de messages
  hasCodeChanges: boolean;        // Contient des changements de code
  hasErrors: boolean;             // Contient des erreurs
  hasSolutions: boolean;          // Contient des solutions
  topics: string[];               // Topics identifiés
  searchText: string;             // Texte de recherche
}
```

### 2. Service : `CursorConversationStorageService`

Service pour :
- **Synchroniser** les conversations depuis la base Cursor vers PostgreSQL
- **Stocker** les conversations avec analyse automatique
- **Récupérer** les conversations stockées avec filtres

### 3. Script de synchronisation : `sync-cursor-conversations.ts`

Script à exécuter périodiquement (cron) pour capturer les conversations avant archivage.

## 🚀 Utilisation

### Synchronisation manuelle

```bash
npm run sync:cursor-conversations
```

### Synchronisation automatique (cron)

Ajouter dans crontab :

```bash
# Synchroniser toutes les heures
0 * * * * cd /path/to/jlm-app && npm run sync:cursor-conversations
```

### Utilisation dans le code

```typescript
import { cursorConversationStorageService } from './server/services/CursorConversationStorageService';

// Synchroniser les conversations
const result = await cursorConversationStorageService.syncConversations({
  limit: 200,
  onlyNew: true,
  projectPath: '/path/to/project',
});

// Récupérer les conversations stockées
const { conversations, total } = await cursorConversationStorageService.getStoredConversations({
  limit: 50,
  projectPath: '/path/to/project',
  hasErrors: true,
  hasSolutions: true,
});
```

## 🔧 Migration

### Option 1 : Migration SQL manuelle (recommandée)

Si `drizzle-kit push` ne fonctionne pas à cause des prompts interactifs :

**⚠️ Prérequis :** `DATABASE_URL` doit être configuré dans votre environnement.

```bash
npm run migrate:cursor-conversations
```

Ce script applique directement le SQL depuis `scripts/create-cursor-conversations-table.sql`.

### Option 2 : Migration Drizzle (si prompts résolus)

```bash
npm run db:push
```

Répondre aux prompts :
- Pour `audit_event_type` : sélectionner "create enum" (première option)
- Pour les autres prompts : sélectionner "create" (première option)
- Pour truncate : sélectionner "No" (première option)

## 📊 Analyse automatique

Le service analyse automatiquement chaque conversation pour :
- **Détecter les erreurs** : keywords (error, bug, fix, etc.)
- **Détecter les solutions** : keywords (solution, implement, create, etc.)
- **Extraire les topics** : mots fréquents dans la conversation
- **Détecter les changements de code** : présence de code dans les messages

## 🔍 Filtres disponibles

Lors de la récupération des conversations stockées :

- `projectPath` : Filtrer par projet
- `startDate` / `endDate` : Filtrer par période
- `hasErrors` : Conversations avec erreurs
- `hasSolutions` : Conversations avec solutions
- `limit` / `offset` : Pagination

## ⚠️ Limitations

1. **Base Cursor** : Nécessite l'accès à la base SQLite de Cursor (`state.vscdb`)
2. **Conversations archivées** : Si une conversation est déjà archivée par Cursor, elle ne peut pas être récupérée
3. **Performance** : La synchronisation peut être lente si beaucoup de conversations

## 🎯 Prochaines étapes

1. ✅ Table créée dans le schéma
2. ✅ Service créé
3. ✅ Script de synchronisation créé
4. ⏳ Migration à créer (`npm run db:push`)
5. ⏳ Tester la synchronisation
6. ⏳ Configurer le cron pour synchronisation automatique
7. ⏳ Intégrer avec le serveur MCP pour accès direct par l'agent

## 📝 Notes

- Les conversations sont stockées avec `onConflictDoUpdate` pour éviter les doublons
- L'analyse automatique permet de filtrer rapidement les conversations pertinentes
- Le texte de recherche permet une recherche full-text rapide

