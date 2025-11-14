#!/usr/bin/env tsx

import Database from 'better-sqlite3';
import { join } from 'path';
import { homedir } from 'os';

const CURSOR_DB_PATH = join(
  homedir(),
  'Library/Application Support/Cursor/User/globalStorage/state.vscdb'
);

const db = new Database(CURSOR_DB_PATH, { readonly: true });

console.log('🔍 Diagnostic base Cursor\n');

// 1. Compter toutes les clés
const total = db.prepare('SELECT COUNT(*) as count FROM ItemTable').get() as { count: number };
console.log(`Total clés: ${total.count}\n`);

// 2. Chercher les patterns de conversations
const patterns = [
  'workbench.panel.composerChatViewPane.%',
  'workbench.panel.aichat.view.%',
  'chat.%',
  'cursor.chat.%',
];

console.log('Recherche par patterns:');
for (const pattern of patterns) {
  const count = db.prepare('SELECT COUNT(*) as count FROM ItemTable WHERE key LIKE ?').get(pattern) as { count: number };
  console.log(`  ${pattern}: ${count.count} clés`);
}

// 3. Afficher quelques exemples
console.log('\nExemples de clés trouvées:');
const examples = db.prepare(`
  SELECT key FROM ItemTable 
  WHERE key LIKE 'workbench.panel.composerChatViewPane.%' 
     OR key LIKE 'workbench.panel.aichat.view.%'
     OR key LIKE 'chat.%'
     OR key LIKE 'cursor.chat.%'
  LIMIT 10
`).all() as Array<{ key: string }>;

examples.forEach((row, i) => {
  console.log(`  ${i + 1}. ${row.key}`);
  
  // Essayer de lire la valeur
  try {
    const value = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(row.key) as { value: Buffer } | undefined;
    if (value) {
      const parsed = JSON.parse(value.value.toString());
      const keys = typeof parsed === 'object' ? Object.keys(parsed) : [];
      const hasMessages = parsed.messages || parsed.chatMessages;
      console.log(`     → Type: ${typeof parsed}, Clés: ${keys.slice(0, 5).join(', ')}, Messages: ${hasMessages ? 'Oui' : 'Non'}`);
    }
  } catch (e) {
    console.log(`     → Erreur lecture: ${e}`);
  }
});

// 4. Chercher les .hidden
console.log('\nClés .hidden (références):');
const hidden = db.prepare(`
  SELECT key FROM ItemTable 
  WHERE key LIKE 'workbench.panel.composerChatViewPane.%.hidden'
  LIMIT 3
`).all() as Array<{ key: string }>;

hidden.forEach((row, i) => {
  console.log(`  ${i + 1}. ${row.key}`);
  try {
    const value = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(row.key) as { value: Buffer } | undefined;
    if (value) {
      const parsed = JSON.parse(value.value.toString());
      console.log(`     → Type: ${Array.isArray(parsed) ? 'Array' : typeof parsed}`);
      if (Array.isArray(parsed)) {
        console.log(`     → ${parsed.length} références`);
        parsed.slice(0, 2).forEach((ref: any, idx: number) => {
          console.log(`       ${idx + 1}. Référence:`, JSON.stringify(ref, null, 2).substring(0, 200));
          if (ref && ref.id) {
            const refData = db.prepare('SELECT value FROM ItemTable WHERE key = ?').get(ref.id) as { value: Buffer } | undefined;
            console.log(`          → ${ref.id}: ${refData ? 'Trouvé' : 'Archivé'}`);
          }
        });
      } else {
        console.log(`     → Contenu:`, JSON.stringify(parsed, null, 2).substring(0, 300));
      }
    }
  } catch (e) {
    console.log(`     → Erreur: ${e}`);
  }
});

db.close();
console.log('\n✅ Diagnostic terminé');

