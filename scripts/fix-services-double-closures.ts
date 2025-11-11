#!/usr/bin/env tsx
// scripts/fix-services-double-closures.ts

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

console.log('🔧 Correction des fermetures doubles et incorrectes...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: });\n}); → } });
  content = content.replace(/\}\)\s*;\s*\n\s*\}\)\s*;/g, (match) => {
    corrections++;
    return ' } });';
  });

  // Pattern 2: } });\n}); → } });
  content = content.replace(/\}\s*\}\)\s*;\s*\n\s*\}\)\s*;/g, (match) => {
    corrections++;
    return ' } });';
  });

  // Pattern 3: Correction ligne par ligne pour les patterns complexes
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Détecter }); suivi de });
    if (line.trim() === '});' && nextLine.trim() === '});') {
      newLines.push(' } });');
      i += 2;
      corrections++;
      continue;
    }
    
    // Détecter } }); suivi de });
    if (line.trim() === '} });' && nextLine.trim() === '});') {
      newLines.push(' } });');
      i += 2;
      corrections++;
      continue;
    }
    
    // Détecter } suivi de }); suivi de });
    if (line.trim() === '}' && nextLine.trim() === '});' && i + 2 < lines.length && lines[i + 2].trim() === '});') {
      newLines.push(' } });');
      i += 3;
      corrections++;
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

