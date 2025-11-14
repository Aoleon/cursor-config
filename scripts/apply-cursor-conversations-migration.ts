#!/usr/bin/env tsx

/**
 * Script pour appliquer la migration SQL manuelle de cursor_conversations
 * Utilisez ce script si drizzle-kit push ne fonctionne pas
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { logger } from '../server/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    logger.info('Application de la migration cursor_conversations...');

    const sqlFile = join(__dirname, 'create-cursor-conversations-table.sql');
    const sqlContent = readFileSync(sqlFile, 'utf-8');

    // Exécuter le SQL ligne par ligne pour éviter les erreurs
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        await db.execute(sql.raw(statement));
      }
    }

    logger.info('✅ Migration appliquée avec succès');
    console.log('✅ Table cursor_conversations créée avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'application de la migration', error as Error);
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

applyMigration();

