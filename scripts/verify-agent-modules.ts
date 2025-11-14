#!/usr/bin/env tsx
/**
 * Script de vérification que l'agent utilise bien et accède bien à chaque module développé
 * Vérifie:
 * - Présence des fichiers dans .cursor/rules/
 * - Métadonnées de chargement automatique
 * - Références dans les index (README.md, AGENTS.md)
 * - Dépendances entre modules
 * - Références croisées
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const RULES_DIR = '.cursor/rules';
const INDEX_FILES = [
  '.cursor/rules/README.md',
  'AGENTS.md'
];

// Modules v3.0 à vérifier
const V3_MODULES = [
  'self-evolution-engine.md',
  'reinforcement-learning-advanced.md',
  'continuous-improvement-loop.md',
  'agent-collaboration-protocols.md',
  'cursor-modes-optimization.md',
  'technical-debt-automation.md',
  'migration-automation-engine.md',
  'agent-performance-metrics.md',
  'saxium-specific-intelligence.md'
];

interface ModuleCheck {
  file: string;
  exists: boolean;
  hasMetadata: boolean;
  hasPriority: boolean;
  hasAutoLoad: boolean;
  hasDependencies: boolean;
  inReadme: boolean;
  inAgents: boolean;
  references: string[];
}

const results: ModuleCheck[] = [];

// Vérifier chaque module
for (const module of V3_MODULES) {
  const filePath = join(RULES_DIR, module);
  const exists = existsSync(filePath);
  
  let content = '';
  if (exists) {
    content = readFileSync(filePath, 'utf-8');
  }
  
  const check: ModuleCheck = {
    file: module,
    exists,
    hasMetadata: exists && content.includes('<!--'),
    hasPriority: exists && /Priority:\s*P[0-2]/.test(content),
    hasAutoLoad: exists && /Auto-load:/.test(content),
    hasDependencies: exists && /Dependencies:/.test(content),
    inReadme: false,
    inAgents: false,
    references: []
  };
  
  // Vérifier présence dans index
  for (const indexFile of INDEX_FILES) {
    if (existsSync(indexFile)) {
      const indexContent = readFileSync(indexFile, 'utf-8');
      const moduleName = module.replace('.md', '');
      
      if (indexFile.includes('README.md')) {
        check.inReadme = indexContent.includes(moduleName) || indexContent.includes(module);
      }
      if (indexFile.includes('AGENTS.md')) {
        check.inAgents = indexContent.includes(moduleName) || indexContent.includes(module);
      }
    }
  }
  
  // Extraire références croisées
  if (exists) {
    const refPattern = /@\.cursor\/rules\/([a-z-]+)\.md/g;
    const matches = content.matchAll(refPattern);
    for (const match of matches) {
      if (!check.references.includes(match[1])) {
        check.references.push(match[1]);
      }
    }
  }
  
  results.push(check);
}

// Afficher résultats
console.log('🔍 Vérification Modules Agent Cursor v3.0\n');
console.log('='.repeat(80));

let allValid = true;

for (const check of results) {
  const status = check.exists && 
                 check.hasMetadata && 
                 check.hasPriority && 
                 check.hasAutoLoad && 
                 check.hasDependencies &&
                 check.inReadme &&
                 check.inAgents;
  
  if (!status) {
    allValid = false;
  }
  
  const icon = status ? '✅' : '❌';
  console.log(`\n${icon} ${check.file}`);
  
  if (!check.exists) {
    console.log('   ❌ Fichier manquant');
  } else {
    console.log(`   ${check.hasMetadata ? '✅' : '❌'} Métadonnées présentes`);
    console.log(`   ${check.hasPriority ? '✅' : '❌'} Priorité définie`);
    console.log(`   ${check.hasAutoLoad ? '✅' : '❌'} Auto-load défini`);
    console.log(`   ${check.hasDependencies ? '✅' : '❌'} Dépendances définies`);
    console.log(`   ${check.inReadme ? '✅' : '❌'} Référencé dans README.md`);
    console.log(`   ${check.inAgents ? '✅' : '❌'} Référencé dans AGENTS.md`);
    
    if (check.references.length > 0) {
      console.log(`   📎 Références croisées: ${check.references.length}`);
      check.references.slice(0, 5).forEach(ref => {
        console.log(`      - ${ref}.md`);
      });
      if (check.references.length > 5) {
        console.log(`      ... et ${check.references.length - 5} autres`);
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Résumé:`);
console.log(`   Modules vérifiés: ${results.length}`);
console.log(`   Modules valides: ${results.filter(r => r.exists && r.hasMetadata && r.hasPriority && r.hasAutoLoad && r.hasDependencies && r.inReadme && r.inAgents).length}`);
console.log(`   Modules avec problèmes: ${results.filter(r => !(r.exists && r.hasMetadata && r.hasPriority && r.hasAutoLoad && r.hasDependencies && r.inReadme && r.inAgents)).length}`);

if (allValid) {
  console.log('\n✅ Tous les modules sont correctement configurés et accessibles !');
  process.exit(0);
} else {
  console.log('\n⚠️  Certains modules nécessitent des corrections.');
  process.exit(1);
}

