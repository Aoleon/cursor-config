#!/usr/bin/env tsx
/**
 * Script de correction automatique des erreurs de syntaxe dans logger.info/warn/error/debug
 * Corrige les patterns: logger.info(..., { metadata: { ... } } );
 * En: logger.info(..., { metadata: { ... } }); ou logger.info(..., { metadata: { ... }\n    });
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FixResult {
  file: string;
  fixed: number;
  errors: string[];
}

const fixes: FixResult[] = [];

function fixFile(filePath: string): FixResult {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const errors: string[] = [];
  let fixed = 0;

  // Pattern 1: logger.info(..., { metadata: { ... } } );
  // Corriger en: logger.info(..., { metadata: { ... }\n    });
  const pattern1 = /logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*\}\s*\}\)\s*;/g;
  const matches1 = content.match(pattern1);
  if (matches1) {
    for (const match of matches1) {
      // Vérifier si c'est déjà correct
      if (!match.includes('\n    }')) {
        const fixedMatch = match.replace(/\}\)\s*;/, '\n    }\n  );');
        content = content.replace(match, fixedMatch);
        fixed++;
      }
    }
  }

  // Pattern 2: logger.info(..., { metadata: { ... } } );
  // Corriger en: logger.info(..., { metadata: { ... }\n    });
  const pattern2 = /logger\.(info|warn|error|debug)\([^)]+,\s*\{\s*metadata:\s*\{[^}]*context:\s*\{[^}]*\}\s*\}\s*\}\)\s*;/g;
  const matches2 = content.match(pattern2);
  if (matches2) {
    for (const match of matches2) {
      // Vérifier si c'est déjà correct
      if (!match.includes('\n    }\n  );')) {
        const fixedMatch = match.replace(/\}\)\s*;/, '\n    }\n  );');
        content = content.replace(match, fixedMatch);
        fixed++;
      }
    }
  }

  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return { file: filePath, fixed, errors };
}

function scanDirectory(dir: string, extensions: string[] = ['.ts', '.tsx']): string[] {
  const files: string[] = [];
  
  function scan(currentDir: string) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry)) {
          scan(fullPath);
        }
      } else if (stat.isFile()) {
        const ext = entry.substring(entry.lastIndexOf('.'));
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scan(dir);
  return files;
}

async function main() {
  console.log('🔧 Correction automatique des erreurs de syntaxe logger...\n');
  
  const serverDir = 'server';
  const files = scanDirectory(serverDir);
  
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  // Fichiers prioritaires
  const priorityFiles = [
    'server/eventBus.ts',
    'server/index.ts',
  ];
  
  // Traiter d'abord les fichiers prioritaires
  for (const file of priorityFiles) {
    if (files.includes(file)) {
      console.log(`🔍 Analyse de ${file}...`);
      const result = fixFile(file);
      fixes.push(result);
      if (result.fixed > 0) {
        console.log(`  ✅ ${result.fixed} correction(s) appliquée(s)`);
      }
    }
  }
  
  // Traiter les autres fichiers
  for (const file of files) {
    if (!priorityFiles.includes(file)) {
      const result = fixFile(file);
      if (result.fixed > 0) {
        fixes.push(result);
        console.log(`✅ ${file}: ${result.fixed} correction(s)`);
      }
    }
  }
  
  // Résumé
  const totalFixed = fixes.reduce((sum, f) => sum + f.fixed, 0);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers modifiés: ${fixes.length}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  console.log('\n💡 Exécutez "npm run dev" pour tester le serveur');
}

main().catch(console.error);

