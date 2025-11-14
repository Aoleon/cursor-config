#!/usr/bin/env tsx

/**
 * Script de test pour vérifier la synchronisation des conversations Cursor
 */

import { cursorConversationStorageService } from '../server/services/CursorConversationStorageService';
import { logger } from '../server/utils/logger';
import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const CURSOR_DB_PATH = join(
  homedir(),
  'Library/Application Support/Cursor/User/globalStorage/state.vscdb'
);

async function testSync() {
  console.log('🔍 Test de synchronisation des conversations Cursor\n');

  try {
    // 1. Vérifier l'accès à la base Cursor
    console.log('1. Vérification accès base Cursor...');
    const cursorDb = new Database(CURSOR_DB_PATH, { readonly: true });
    const cursorKeys = cursorDb.prepare(
      `SELECT key FROM ItemTable 
       WHERE key LIKE 'workbench.panel.composerChatViewPane.%' 
          OR key LIKE 'workbench.panel.aichat.view.%'
       LIMIT 10`
    ).all() as Array<{ key: string }>;
    console.log(`   ✅ ${cursorKeys.length} clés trouvées dans Cursor\n`);
    cursorDb.close();

    // 2. Vérifier la base locale
    console.log('2. Vérification base locale...');
    const localDbPath = join(process.cwd(), 'data', 'cursor-conversations', 'conversations.db');
    let localDb: Database.Database | null = null;
    try {
      localDb = new Database(localDbPath, { readonly: true });
      const localCount = localDb.prepare('SELECT COUNT(*) as count FROM cursor_conversations').get() as { count: number };
      console.log(`   ✅ Base locale existe: ${localCount.count} conversations stockées\n`);
      localDb.close();
    } catch (e) {
      console.log(`   ⚠️  Base locale n'existe pas encore (sera créée)\n`);
    }

    // 3. Test synchronisation avec onlyNew = false pour forcer
    console.log('3. Test synchronisation (onlyNew = false)...');
    const result = await cursorConversationStorageService.syncConversations({
      limit: 10,
      onlyNew: false, // Forcer même si déjà stockées
      projectPath: undefined,
    });
    console.log(`   Résultat:`, result);
    console.log(`   - Stockées: ${result.stored}`);
    console.log(`   - Ignorées: ${result.skipped}`);
    console.log(`   - Erreurs: ${result.errors}\n`);

    // 4. Vérifier les conversations stockées
    console.log('4. Vérification conversations stockées...');
    const stored = await cursorConversationStorageService.getStoredConversations({
      limit: 5,
    });
    console.log(`   ✅ ${stored.total} conversations au total`);
    console.log(`   ✅ ${stored.conversations.length} conversations récupérées\n`);

    if (stored.conversations.length > 0) {
      console.log('5. Exemple de conversation stockée:');
      const example = stored.conversations[0];
      console.log(`   - ID: ${example.id}`);
      console.log(`   - Titre: ${example.title || 'N/A'}`);
      console.log(`   - Messages: ${example.messageCount}`);
      console.log(`   - Projet: ${example.project_path || 'N/A'}`);
      console.log(`   - Erreurs: ${example.has_errors ? 'Oui' : 'Non'}`);
      console.log(`   - Solutions: ${example.has_solutions ? 'Oui' : 'Non'}`);
    }

    console.log('\n✅ Test terminé');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  } finally {
    cursorConversationStorageService.cleanup();
  }
}

testSync();

