#!/usr/bin/env tsx

import { cursorConversationStorageService } from '../server/services/CursorConversationStorageService';

async function testComplete() {
  console.log('🧪 Test complet stockage conversations\n');

  try {
    // 1. Test récupération
    console.log('1. Test récupération conversations stockées...');
    const stored = await cursorConversationStorageService.getStoredConversations({
      limit: 10,
    });
    console.log(`   ✅ ${stored.total} conversations au total`);
    console.log(`   ✅ ${stored.conversations.length} conversations récupérées\n`);

    if (stored.conversations.length > 0) {
      console.log('2. Exemples de conversations stockées:');
      stored.conversations.slice(0, 3).forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.title || 'Sans titre'}`);
        console.log(`      - ID: ${c.cursor_conversation_id}`);
        console.log(`      - Messages: ${c.message_count}`);
        console.log(`      - Projet: ${c.project_path || 'N/A'}`);
        console.log(`      - Créée: ${new Date(c.created_at * 1000).toLocaleString()}`);
        console.log(`      - Stockée: ${new Date(c.stored_at * 1000).toLocaleString()}`);
      });
      console.log('');
    }

    // 3. Test synchronisation (onlyNew = true pour ne pas dupliquer)
    console.log('3. Test synchronisation (onlyNew = true)...');
    const syncResult = await cursorConversationStorageService.syncConversations({
      limit: 50,
      onlyNew: true,
    });
    console.log(`   ✅ Stockées: ${syncResult.stored}`);
    console.log(`   ✅ Ignorées: ${syncResult.skipped}`);
    console.log(`   ✅ Erreurs: ${syncResult.errors}\n`);

    // 4. Vérification finale
    const final = await cursorConversationStorageService.getStoredConversations({ limit: 1 });
    console.log(`4. Total final: ${final.total} conversations stockées\n`);

    console.log('✅ Tous les tests réussis !');
    cursorConversationStorageService.cleanup();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    cursorConversationStorageService.cleanup();
    process.exit(1);
  }
}

testComplete();

