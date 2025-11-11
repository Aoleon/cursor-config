#!/usr/bin/env tsx
// scripts/fix-services-iterative-until-zero.ts

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
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

console.log('🔧 Correction itérative jusqu\'à 0 erreur...\n');

let iteration = 0;
const maxIterations = 50;
let previousErrorCount = Infinity;

while (iteration < maxIterations) {
  iteration++;
  console.log(`\n📊 Itération ${iteration}...`);
  
  let totalCorrections = 0;

  for (const file of files) {
    const filePath = join(projectRoot, file);
    let content = readFileSync(filePath, 'utf-8');
    let corrections = 0;

    // Pattern 1: logger.info avec metadata incomplet
    const before1 = content;
    content = content.replace(/(logger\.(info|error|warn|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*[^}])\s*\}\)\s*;/g, (match, prefix) => {
      if (!match.includes('} });')) {
        corrections++;
        return prefix + ' } });';
      }
      return match;
    });

    // Pattern 2: }, { operation: 'constructor', service: '...', }); sans metadata
    const before2 = content;
    content = content.replace(/(\s+service:\s*'[^']+',\s*)\}\)\s*;/g, (match, prefix) => {
      if (!match.includes('metadata:')) {
        corrections++;
        return prefix + 'metadata: { } });';
      }
      return match;
    });

    // Pattern 3: } suivi de }); sur ligne suivante
    const lines = content.split('\n');
    const newLines: string[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
      
      if (line.trim() === '}' && nextLine.trim() === '});') {
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

    if (corrections > 0) {
      writeFileSync(filePath, content, 'utf-8');
      console.log(`  ✅ ${corrections} corrections dans ${file}`);
      totalCorrections += corrections;
    }
  }

  if (totalCorrections === 0) {
    console.log('\n✅ Aucune correction nécessaire. Vérification des erreurs...');
    break;
  }

  console.log(`  📊 Total: ${totalCorrections} corrections appliquées`);

  // Vérifier le nombre d'erreurs
  try {
    const checkOutput = execSync('npm run check 2>&1', { cwd: projectRoot, encoding: 'utf-8' });
    const errorLines = checkOutput.split('\n').filter(line => 
      line.includes('error TS') && 
      (line.includes('DateAlertDetectionService') || 
       line.includes('ChatbotOrchestrationService') || 
       line.includes('ContextBuilderService'))
    );
    const errorCount = errorLines.length;
    
    console.log(`  📈 Erreurs restantes: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 SUCCÈS ! 0 erreur TypeScript dans les 3 fichiers prioritaires !');
      break;
    }
    
    if (errorCount >= previousErrorCount) {
      console.log('\n⚠️  Le nombre d\'erreurs n\'a pas diminué. Arrêt de l\'itération.');
      break;
    }
    
    previousErrorCount = errorCount;
  } catch (error) {
    console.log('  ⚠️  Erreur lors de la vérification, continuation...');
  }
}

console.log(`\n✅ Correction itérative terminée après ${iteration} itérations.`);

