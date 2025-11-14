#!/usr/bin/env tsx

/**
 * Script pour appeler les méthodes du service de stockage depuis le wrapper MCP
 */

import { cursorConversationStorageService } from '../server/services/CursorConversationStorageService';

const method = process.argv[2];
const argsJson = process.argv[3];

if (!method) {
  console.error(JSON.stringify({ error: 'Méthode non fournie' }));
  process.exit(1);
}

try {
  const args = argsJson ? JSON.parse(argsJson) : {};

  let result;
  switch (method) {
    case 'syncConversations':
      result = await cursorConversationStorageService.syncConversations({
        limit: args.limit || 100,
        onlyNew: args.onlyNew !== false,
        projectPath: args.projectPath,
      });
      break;
    case 'getStoredConversations':
      result = await cursorConversationStorageService.getStoredConversations({
        limit: args.limit || 50,
        offset: args.offset || 0,
        projectPath: args.projectPath,
        startDate: args.startDate ? new Date(args.startDate) : undefined,
        endDate: args.endDate ? new Date(args.endDate) : undefined,
        hasErrors: args.hasErrors,
        hasSolutions: args.hasSolutions,
      });
      break;
    default:
      throw new Error(`Méthode inconnue: ${method}`);
  }

  console.log(JSON.stringify(result));
  cursorConversationStorageService.cleanup();
  process.exit(0);
} catch (error) {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  cursorConversationStorageService.cleanup();
  process.exit(1);
}

