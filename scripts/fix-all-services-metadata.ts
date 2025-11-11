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

console.log('🔧 Correction des patterns metadata dans tous les fichiers prioritaires...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: metadata: { ... }); → metadata: { ... } });
  const pattern1 = /(\s+metadata:\s*\{[^}]*\})\s*\)\s*;/g;
  content = content.replace(pattern1, (match) => {
    corrections++;
    return match.replace(/\)\s*;/g, ' } });');
  });

  // Pattern 2: metadata: { ... }\n      \n\n           } });
  const pattern2 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s+\}\s*\}\);/g;
  content = content.replace(pattern2, (match) => {
    corrections++;
    return match.replace(/\n\s*\n\s*\n\s+\}\s*\)/g, ' } });');
  });

  // Pattern 3: metadata: { ... }\n      \n           } });
  const pattern3 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s+\}\s*\}\);/g;
  content = content.replace(pattern3, (match) => {
    corrections++;
    return match.replace(/\n\s*\n\s+\}\s*\)/g, ' } });');
  });

  // Pattern 4: } } }); → } });
  const pattern4 = /\}\s*\}\s*\}\s*\)\s*;/g;
  content = content.replace(pattern4, (match) => {
    corrections++;
    return ' } });';
  });

  writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${corrections} corrections appliquées dans ${file}`);
  totalCorrections += corrections;
}

console.log(`\n✅ Total: ${totalCorrections} corrections appliquées dans ${files.length} fichiers`);


