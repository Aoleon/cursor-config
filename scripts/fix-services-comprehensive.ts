#!/usr/bin/env tsx
// scripts/fix-services-comprehensive.ts

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

console.log('🔧 Correction complète de tous les patterns restants...');

let totalCorrections = 0;

for (const file of files) {
  const filePath = join(projectRoot, file);
  console.log(`\n📝 Traitement de ${file}...`);
  
  let content = readFileSync(filePath, 'utf-8');
  let corrections = 0;

  // Pattern 1: logger.info avec metadata incomplet - fermeture manquante
  // logger.info('...', { metadata: { ... \n\n }); → logger.info('...', { metadata: { ... } });
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*)\s*\n\s*\n\s*\}\)\s*;/g, (match, prefix) => {
    corrections++;
    return prefix + ' } });';
  });

  // Pattern 2: logger.info avec metadata sur plusieurs lignes sans fermeture correcte
  content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*[^}])\s*\}\)\s*;/g, (match, prefix) => {
    if (!match.includes('} });')) {
      corrections++;
      return prefix + ' } });';
    }
    return match;
  });

  // Pattern 3: }, { operation: 'constructor', service: '...', }); sans metadata
  content = content.replace(/(\s+service:\s*'[^']+',\s*)\}\)\s*;/g, (match, prefix) => {
    if (!match.includes('metadata:')) {
      corrections++;
      return prefix + 'metadata: { } });';
    }
    return match;
  });

  // Pattern 4: }, { operation: 'constructor', service: '...',\n }); sans metadata
  content = content.replace(/(\s+service:\s*'[^']+',\s*)\n\s*\}\)\s*;/g, (match, prefix) => {
    if (!match.includes('metadata:')) {
      corrections++;
      return prefix + '\n      metadata: { } });';
    }
    return match;
  });

  // Pattern 5: } suivi de }); sur ligne suivante (fermeture double)
  const lines = content.split('\n');
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    
    // Détecter } suivi de }); sur la ligne suivante
    if (line.trim() === '}' && nextLine.trim() === '});') {
      // Remplacer par });
      const indent = line.match(/^\s*/)?.[0] || '';
      newLines.push(indent + '});');
      corrections++;
      i += 2;
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

