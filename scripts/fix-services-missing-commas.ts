#!/usr/bin/env tsx
// scripts/fix-services-missing-commas.ts

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

console.log('🔧 Correction des virgules manquantes dans withErrorHandling...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern: } \n { operation: ... → }, \n { operation: ...
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Détecter } suivi de { operation: 'constructor'
    if (line.trim() === '}' && nextLine.trim().startsWith('{') && nextLine.includes("operation: 'constructor'")) {
      // Ajouter une virgule après }
      newLines.push(line + ',');
      corrections++;
      i++;
      continue;
    }
    
    // Détecter } suivi de { operation: ... (autre pattern)
    if (line.trim().endsWith('}') && !line.trim().endsWith('},') && !line.trim().endsWith('});') && nextLine.trim().startsWith('{') && nextLine.includes('operation:')) {
      // Ajouter une virgule après }
      newLines.push(line.replace(/\}\s*$/, '},'));
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

