#!/usr/bin/env tsx
/**
 * Script de correction automatique des erreurs de syntaxe TypeScript
 * Corrige les patterns d'erreurs les plus courants
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FixResult {
  file: string;
  fixed: number;
  errors: string[];
}

const fixes: FixResult[] = [];

// Patterns de correction
const patterns = [
  // Pattern 1: Accolades fermantes manquantes dans logger.info()
  {
    name: 'Accolades fermantes logger.info()',
    pattern: /logger\.(info|warn|error|debug)\([^)]+,\s*\{[^}]*metadata:\s*\{[^}]*\}\s*\}\);/g,
    fix: (match: string) => {
      // Vérifier si l'accolade fermante est présente
      if (!match.includes('}\n    }')) {
        return match.replace(/\}\);/g, '}\n    }\n  );');
      }
      return match;
    },
  },
  // Pattern 2: Structure withErrorHandling mal formée
  {
    name: 'Structure withErrorHandling',
    pattern: /withErrorHandling\(\s*async\s*\(\)\s*=>\s*\{[^}]*\},\s*\{[^}]*\}\);/g,
    fix: (match: string) => {
      // Vérifier la structure correcte
      if (!match.includes('}\n    }\n  );')) {
        return match.replace(/\},\s*\{[^}]*\}\);/g, '},\n    {\n      operation: \'operation\',\n      service: \'service\',\n      metadata: {}\n    }\n  );');
      }
      return match;
    },
  },
  // Pattern 3: Virgules manquantes dans objets
  {
    name: 'Virgules manquantes',
    pattern: /(\w+):\s*([^,}]+)\s*(\n\s*)(\w+):/g,
    fix: (match: string, p1: string, p2: string, p3: string, p4: string) => {
      if (!p2.trim().endsWith(',') && !p2.trim().endsWith('}')) {
        return `${p1}: ${p2},${p3}${p4}:`;
      }
      return match;
    },
  },
];

function fixFile(filePath: string): FixResult {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  const errors: string[] = [];
  let fixed = 0;

  for (const pattern of patterns) {
    try {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          const fixedMatch = pattern.fix(match);
          if (fixedMatch !== match) {
            content = content.replace(match, fixedMatch);
            fixed++;
          }
        }
      }
    } catch (error: any) {
      errors.push(`Erreur avec pattern ${pattern.name}: ${error.message}`);
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
        // Ignorer node_modules, dist, build, etc.
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
  console.log('🔧 Correction automatique des erreurs de syntaxe...\n');
  
  const serverDir = 'server';
  const files = scanDirectory(serverDir);
  
  console.log(`📁 ${files.length} fichiers à analyser\n`);
  
  // Fichiers prioritaires
  const priorityFiles = [
    'server/documentProcessor.ts',
    'server/storage/base/BaseRepository.ts',
    'server/utils/safe-query.ts',
    'server/utils/shared-utils.ts',
    'server/db/config.ts',
    'server/utils/rate-limit-monitor.ts',
    'server/utils/retry-service.ts',
    'server/utils/mondayValidator.ts',
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
      if (result.errors.length > 0) {
        console.log(`  ⚠️  ${result.errors.length} erreur(s) lors de la correction`);
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
  const totalErrors = fixes.reduce((sum, f) => sum + f.errors.length, 0);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers modifiés: ${fixes.length}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  if (totalErrors > 0) {
    console.log(`⚠️  Erreurs: ${totalErrors}`);
  }
  console.log('\n💡 Exécutez "npm run check" pour vérifier les corrections');
}

main().catch(console.error);
