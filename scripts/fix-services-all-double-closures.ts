#!/usr/bin/env tsx
// scripts/fix-services-all-double-closures.ts

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

console.log('🔧 Correction de toutes les fermetures doubles } }); incorrectes...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern: } }); sur une ligne seule qui suit metadata: { } });
  // Cela devrait être }); pour fermer withErrorHandling(
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';
    const prevPrevLine = i > 1 ? lines[i - 2] : '';
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Détecter } }); sur une ligne seule qui suit metadata: { } });
    if (line.trim() === '} });' && prevLine.trim().includes('metadata: { } });')) {
      // C'est une fermeture en double, remplacer par });
      newLines.push('  });');
      corrections++;
      i++;
      continue;
    }
    
    // Détecter } }); sur une ligne seule qui suit un bloc avec return/throw
    if (line.trim() === '} });' && (prevLine.trim().startsWith('return ') || prevLine.trim().startsWith('throw ') || prevLine.trim() === '}' || prevLine.trim().endsWith('}'))) {
      // Chercher en arrière pour voir si on est dans un bloc withErrorHandling
      let foundWithErrorHandling = false;
      let foundAsync = false;
      let foundErrorHandler = false;
      
      for (let j = i - 1; j >= 0 && j >= i - 100; j--) {
        const checkLine = lines[j];
        
        if (checkLine.includes('withErrorHandling(')) {
          foundWithErrorHandling = true;
          break;
        }
        
        if (checkLine.includes('async () =>')) {
          foundAsync = true;
        }
        
        // Si on trouve le handler d'erreur (le deuxième paramètre de withErrorHandling)
        if (checkLine.trim().startsWith('},') && foundAsync) {
          foundErrorHandler = true;
        }
        
        // Si on trouve metadata: { } }); après le handler d'erreur, on est dans le bon contexte
        if (checkLine.includes('metadata: { } });') && foundErrorHandler) {
          foundWithErrorHandling = true;
          break;
        }
      }
      
      if (foundWithErrorHandling) {
        // C'est une fermeture en double, remplacer par });
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

