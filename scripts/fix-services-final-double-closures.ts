#!/usr/bin/env tsx
// scripts/fix-services-final-double-closures.ts

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

console.log('🔧 Remplacement final de toutes les fermetures } }); par });...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern: } }); sur une ligne seule
  // Remplacer toutes les occurrences de } }); par }); quand elles sont sur une ligne seule
  // et qu'elles suivent un bloc avec metadata: { } });
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Détecter } }); sur une ligne seule (avec ou sans espaces au début, avec ou sans espaces entre })
    // Pattern: } }); ou  } }); ou }  }); etc.
    const trimmedLine = line.trim();
    if (trimmedLine === '} });' || trimmedLine === ' } });' || trimmedLine.match(/^\}\s+\}\)\s*;$/)) {
      // Chercher en arrière dans les 20 lignes précédentes pour trouver metadata: { } });
      let foundMetadata = false;
      
      for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
        const checkLine = lines[j];
        
        if (checkLine.includes('metadata: { } });')) {
          foundMetadata = true;
          break;
        }
      }
      
      // Si on trouve metadata: { } }); dans les lignes précédentes, c'est une fermeture en double
      if (foundMetadata) {
        // Préserver l'indentation (généralement 2 espaces)
        const indent = line.match(/^\s*/)?.[0] || '';
        newLines.push(indent + '});');
        corrections++;
        i++;
        continue;
      }
    }
    
    newLines.push(line);
    i++;
  }

  content = newLines.join('\n');

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${corrections} corrections appliquées dans ${file}`);
  totalCorrections += corrections;
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${files.length} fichiers`);

