#!/usr/bin/env tsx
// scripts/fix-services-replace-all-double-closures.ts

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

console.log('🔧 Remplacement de toutes les fermetures } }); incorrectes par });...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern: } }); sur une ligne seule qui suit metadata: { } });
  // Remplacer toutes les occurrences de } }); par }); quand elles sont sur une ligne seule
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';
    
    // Détecter } }); sur une ligne seule
    if (line.trim() === '} });') {
      // Vérifier si la ligne précédente contient metadata: { } });
      if (prevLine.includes('metadata: { } });')) {
        // C'est une fermeture en double, remplacer par });
        newLines.push('  });');
        corrections++;
        i++;
        continue;
      }
      
      // Vérifier si on est dans un contexte withErrorHandling
      // Chercher en arrière pour voir si on est dans un bloc withErrorHandling
      let foundWithErrorHandling = false;
      let foundMetadata = false;
      
      for (let j = i - 1; j >= 0 && j >= i - 50; j--) {
        const checkLine = lines[j];
        
        if (checkLine.includes('withErrorHandling(')) {
          foundWithErrorHandling = true;
          break;
        }
        
        if (checkLine.includes('metadata: { } });')) {
          foundMetadata = true;
        }
        
        // Si on trouve une ligne qui commence une nouvelle méthode/fonction, on sort du contexte
        if (checkLine.trim().startsWith('async ') && checkLine.includes('(') && !checkLine.includes('withErrorHandling')) {
          break;
        }
      }
      
      // Si on est dans un contexte withErrorHandling et qu'on a trouvé metadata, c'est une fermeture en double
      if (foundWithErrorHandling && foundMetadata) {
        newLines.push('  });');
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

