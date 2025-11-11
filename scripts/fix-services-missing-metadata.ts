#!/usr/bin/env tsx
// scripts/fix-services-missing-metadata.ts

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

console.log('🔧 Correction des metadata manquants dans withErrorHandling...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern: }, { operation: 'constructor', service: '...', }); → }, { operation: 'constructor', service: '...', metadata: { } });
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Détecter }, { operation: 'constructor', service: '...', }); sans metadata
    if (line.includes("operation: 'constructor'") && line.includes("service:") && line.trim().endsWith('});')) {
      // Vérifier si metadata est présent
      if (!line.includes('metadata:')) {
        // Ajouter metadata: { } avant });
        const newLine = line.replace(/\}\)\s*;/, ', metadata: { } });');
        newLines.push(newLine);
        corrections++;
        i++;
        continue;
      }
    }
    
    // Détecter service: '...', }); sans metadata sur la ligne suivante
    if (line.includes("service:") && nextLine.trim() === '});') {
      // Vérifier si c'est dans un contexte withErrorHandling
      let foundConstructor = false;
      for (let j = i - 1; j >= 0 && j >= i - 5; j--) {
        if (lines[j].includes("operation: 'constructor'")) {
          foundConstructor = true;
          break;
        }
      }
      
      if (foundConstructor && !line.includes('metadata:')) {
        newLines.push(line);
        newLines.push('      metadata: { } });');
        corrections++;
        i += 2;
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

