#!/usr/bin/env tsx
// scripts/fix-services-aggressive-all.ts

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

console.log('🔧 Remplacement agressif de toutes les fermetures } }); par });...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Remplacement agressif : remplacer toutes les occurrences de } }); par });
  // Pattern: } suivi d'espaces + }); à la fin d'une ligne
  const lines = content.split('\n');
  const newLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const originalLine = line;
    
    // Pattern 1: ligne qui se termine par } }); (avec ou sans espaces)
    if (line.match(/\}\s+\}\)\s*;?\s*$/)) {
      // Préserver l'indentation et remplacer par });
      const indent = line.match(/^\s*/)?.[0] || '';
      line = indent + '});';
      corrections++;
    }
    
    // Pattern 2: ligne qui contient } }); quelque part (pour les cas avec indentation bizarre)
    if (line.includes('} });') && line !== originalLine) {
      // Déjà corrigé par le pattern 1
    } else if (line.includes('} });')) {
      // Remplacer } }); par });
      line = line.replace(/\}\s+\}\)\s*;?/g, '});');
      corrections++;
    }
    
    newLines.push(line);
  }

  content = newLines.join('\n');

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${corrections} corrections appliquées dans ${file}`);
  totalCorrections += corrections;
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${files.length} fichiers`);

