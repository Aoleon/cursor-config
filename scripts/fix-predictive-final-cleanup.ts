#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const filePath = join(projectRoot, 'server/services/PredictiveEngineService.ts');

console.log('🔧 Nettoyage final des patterns metadata dans PredictiveEngineService.ts...');

let content = readFileSync(filePath, 'utf-8');
let corrections = 0;

// Pattern: metadata avec lignes vides avant la fermeture
// Exemple: metadata: { ... }\n      \n\n          }
const pattern1 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s*\n\s+\}\s*\}\);/g;
content = content.replace(pattern1, (match) => {
  corrections++;
  return match.replace(/\n\s*\n\s*\n\s+\}\s*\)/g, ' } });');
});

// Pattern: metadata avec lignes vides (variante 2)
const pattern2 = /(\s+metadata:\s*\{[^}]*\})\s*\n\s*\n\s+\}\s*\}\);/g;
content = content.replace(pattern2, (match) => {
  corrections++;
  return match.replace(/\n\s*\n\s+\}\s*\)/g, ' } });');
});

// Pattern: .catch(() => { return []; } } - fermeture incorrecte
const pattern3 = /\)\.catch\(\(\)\s*=>\s*\{\s*return\s*\[\];\s*\}\s*\}\s*\)/g;
content = content.replace(pattern3, (match) => {
  corrections++;
  return ').catch(() => { return []; });';
});

writeFileSync(filePath, content, 'utf-8');

console.log(`✅ ${corrections} corrections appliquées dans PredictiveEngineService.ts`);

