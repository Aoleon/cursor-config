#!/usr/bin/env tsx
// scripts/fix-services-simple-replace-all.ts

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const files = [
  'server/services/DateAlertDetectionService.ts',
  'server/services/ChatbotOrchestrationService.ts',
  'server/services/ContextBuilderService.ts',
];

console.log('🔧 Remplacement direct de toutes les fermetures } }); par });...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Remplacement direct : } }); → });
  // Pattern: ligne qui contient uniquement des espaces + } + espaces + }); + fin de ligne
  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Détecter } }); sur une ligne seule
    if (trimmed === '} });' || trimmed === ' } });' || /^\s*\}\s+\}\)\s*;?\s*$/.test(line)) {
      // Préserver l'indentation et remplacer par });
      const indent = line.match(/^\s*/)?.[0] || '';
      newLines.push(indent + '});');
      corrections++;
    } else {
      newLines.push(line);
    }
  }

  content = newLines.join('\n');

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${corrections} corrections appliquées dans ${file}`);
  totalCorrections += corrections;
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${files.length} fichiers`);

