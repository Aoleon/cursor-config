#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const filePath = join(projectRoot, 'server/services/PredictiveEngineService.ts');

console.log('🔧 Correction des patterns } } }); dans PredictiveEngineService.ts...');

let content = readFileSync(filePath, 'utf-8');
let corrections = 0;

// Pattern: } } }); → } });
const pattern = /\}\s*\}\s*\}\s*\);/g;
content = content.replace(pattern, (match) => {
  corrections++;
  return ' } });';
});

writeFileSync(filePath, content, 'utf-8');

console.log(`✅ ${corrections} corrections appliquées dans PredictiveEngineService.ts`);
