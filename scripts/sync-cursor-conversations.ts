#!/usr/bin/env tsx

/**
 * Script pour synchroniser les conversations Cursor vers notre base de données
 * À exécuter périodiquement (cron) pour capturer les conversations avant archivage
 */

import { cursorConversationStorageService } from '../server/services/CursorConversationStorageService';
import { logger } from '../server/utils/logger';

async function main() {
  logger.info('Démarrage synchronisation conversations Cursor');

  try {
    const result = await cursorConversationStorageService.syncConversations({
      limit: 200, // Synchroniser jusqu'à 200 conversations
      onlyNew: true, // Ne synchroniser que les nouvelles
      projectPath: process.env.PROJECT_PATH, // Filtrer par projet si défini
    });

    logger.info('Synchronisation terminée', {
      stored: result.stored,
      skipped: result.skipped,
      errors: result.errors,
    });

    console.log(`
✅ Synchronisation terminée:
   - ${result.stored} conversations stockées
   - ${result.skipped} conversations ignorées (déjà stockées ou archivées)
   - ${result.errors} erreurs
    `);
  } catch (error) {
    logger.error('Erreur lors de la synchronisation', { error });
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    cursorConversationStorageService.cleanup();
  }
}

main();

