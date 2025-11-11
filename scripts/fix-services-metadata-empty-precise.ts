#!/usr/bin/env tsx

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

console.log('🔧 Correction précise des patterns metadata vides malformés...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Correction ligne par ligne pour les patterns metadata vides
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    
    // Détecter metadata: { vide avec fermeture incorrecte
    if (line.includes('metadata:') && line.includes('{') && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const nextNextLine = i + 2 < lines.length ? lines[i + 2] : '';
      
      // Pattern: metadata: { \n        }\n      );
      if (nextLine.trim() === '}' && nextNextLine.trim() === ');') {
        newLines.push(line.replace(/\{\s*$/, '{ } });'));
        i += 3; // Skip les 2 lignes suivantes
        corrections++;
        continue;
      }
      
      // Pattern: metadata: { \n        }\n      }); avec lignes vides
      if (nextLine.trim() === '}' && i + 2 < lines.length && lines[i + 2].trim() === '});') {
        newLines.push(line.replace(/\{\s*$/, '{ } });'));
        i += 3; // Skip les 2 lignes suivantes
        corrections++;
        continue;
      }
      
      // Pattern: metadata: { \n        }\n      ); avec lignes vides supplémentaires
      if (nextLine.trim() === '}' && i + 3 < lines.length && lines[i + 3].trim() === ');') {
        newLines.push(line.replace(/\{\s*$/, '{ } });'));
        i += 4; // Skip les 3 lignes suivantes
        corrections++;
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

