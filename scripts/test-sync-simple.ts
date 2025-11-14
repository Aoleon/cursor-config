#!/usr/bin/env tsx

import { cursorConversationStorageService } from '../server/services/CursorConversationStorageService';

async function main() {
  console.log('Test synchronisation...\n');
  
  try {
    const result = await cursorConversationStorageService.syncConversations({
      limit: 50,
      onlyNew: false,
    });
    
    console.log(`✅ Résultat:`);
    console.log(`   - Stockées: ${result.stored}`);
    console.log(`   - Ignorées: ${result.skipped}`);
    console.log(`   - Erreurs: ${result.errors}`);
    
    if (result.stored > 0) {
      const stored = await cursorConversationStorageService.getStoredConversations({ limit: 3 });
      console.log(`\n📝 Exemples stockées:`);
      stored.conversations.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.title || 'Sans titre'} (${c.message_count} messages)`);
      });
    }
    
    cursorConversationStorageService.cleanup();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    cursorConversationStorageService.cleanup();
    process.exit(1);
  }
}

main();

