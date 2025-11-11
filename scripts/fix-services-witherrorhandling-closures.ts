#!/usr/bin/env tsx
// scripts/fix-services-witherrorhandling-closures.ts

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

console.log('🔧 Correction des fermetures withErrorHandling incorrectes...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: } }); suivi de }); → } });
  // Correction des fermetures doubles après withErrorHandling
  content = content.replace(/\}\s*\}\)\s*;\s*\n\s*\}\)\s*;/g, (match) => {
    corrections++;
    return ' } });';
  });

  // Pattern 2: } }); sur une ligne seule après un bloc withErrorHandling
  // Si on trouve } }); suivi d'une accolade fermante, c'est probablement une erreur
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const prevLine = i > 0 ? lines[i - 1] : '';
    
    // Détecter } }); suivi de }
    if (line.trim() === '} });' && nextLine.trim() === '}') {
      // Vérifier si c'est dans un contexte withErrorHandling
      // Chercher en arrière pour voir si on est dans un bloc withErrorHandling
      let foundWithErrorHandling = false;
      for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
        if (lines[j].includes('withErrorHandling(')) {
          foundWithErrorHandling = true;
          break;
        }
        if (lines[j].trim().startsWith('async ') && lines[j].includes('()')) {
          break;
        }
      }
      
      if (foundWithErrorHandling) {
        // C'est probablement une fermeture en double, supprimer la première
        newLines.push('});');
        i += 1; // Skip la ligne suivante aussi
        corrections++;
        continue;
      }
    }
    
    // Détecter } }); sur une ligne seule qui devrait être });
    if (line.trim() === '} });' && prevLine.trim().endsWith('metadata: { } });')) {
      // Si la ligne précédente se termine déjà par } });, cette ligne est en double
      newLines.push('});');
      corrections++;
      i++;
      continue;
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

