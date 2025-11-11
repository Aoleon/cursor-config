#!/usr/bin/env tsx
/**
 * Script pour exécuter les tests E2E des nouveaux workflows
 * 
 * Usage: npm run test:e2e:new-workflows
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const testFiles = [
  'e2e/workflows/feedback-terrain-workflow.spec.ts',
  'e2e/workflows/sav-workflow.spec.ts',
  'e2e/workflows/be-checklist-workflow.spec.ts',
  'e2e/workflows/time-tracking-workflow.spec.ts',
  'e2e/workflows/workload-simulation-workflow.spec.ts',
  'e2e/workflows/prevu-vs-reel-workflow.spec.ts'
];

console.log('🧪 Exécution des tests E2E des nouveaux workflows...\n');

// Vérifier que les fichiers existent
const missingFiles = testFiles.filter(file => !existsSync(join(process.cwd(), file)));
if (missingFiles.length > 0) {
  console.error('❌ Fichiers de test manquants:');
  missingFiles.forEach(file => console.error(`  - ${file}`));
  process.exit(1);
}

// Exécuter les tests avec Playwright
try {
  // Utiliser le pattern de testMatch au lieu de fichiers individuels
  const command = `npx playwright test --project=new-workflows`;
  
  console.log(`📋 Exécution de ${testFiles.length} fichiers de test...\n`);
  console.log(`Command: ${command}\n`);
  
  execSync(command, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  });
  
  console.log('\n✅ Tous les tests E2E ont réussi !');
} catch (error) {
  console.error('\n❌ Certains tests E2E ont échoué');
  process.exit(1);
}

