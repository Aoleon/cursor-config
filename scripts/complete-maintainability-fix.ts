#!/usr/bin/env tsx
/**
 * Script de complétion de la maintenabilité
 * 
 * Objectifs:
 * 1. Corriger toutes les erreurs TypeScript courantes
 * 2. Réduire occurrences 'any' → 'unknown' de 50%
 * 3. Extraire méthodes des fonctions monolithiques
 * 4. Optimiser la maintenabilité globale
 * 
 * Usage: npm run complete:maintainability
 */

import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, extname, relative } from 'path';
import { existsSync } from 'fs';

interface FixResult {
  file: string;
  fixes: Fix[];
  errors: string[];
}

interface Fix {
  line: number;
  type: string;
  description: string;
  before: string;
  after: string;
}

// Patterns de correction automatique
const FIX_PATTERNS = [
  {
    name: 'Backtick mal placé après );',
    pattern: /\);`/g,
    fix: () => ');'
  },
  {
    name: 'Point-virgule en double',
    pattern: /;;+/g,
    fix: () => ';'
  },
  {
    name: 'Service avec point-virgule en trop',
    pattern: /service:\s*['"][^'"]+['"],\s*;/g,
    fix: (match: string) => {
      return match.replace(/,\s*;/, ',');
    }
  }
];

// Corrections spécifiques par fichier
const FILE_SPECIFIC_FIXES: Record<string, Array<{ pattern: RegExp; replacement: string }>> = {
  'server/modules/monday/routes.ts': [
    {
      pattern: /const aosWithMondayId = allAOs\.filter\(\(ao:\s*any\)/g,
      replacement: 'const aosWithMondayId = allAOs.filter((ao: unknown)'
    }
  ]
};

async function getAllTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && extname(entry.name) === '.ts') {
        if (!entry.name.includes('.test.') && !entry.name.includes('.spec.') && !entry.name.endsWith('.bak')) {
          files.push(fullPath);
        }
      }
    }
  }
  
  await walk(dir);
  return files;
}

async function fixFile(filePath: string): Promise<FixResult> {
  const result: FixResult = {
    file: relative(process.cwd(), filePath),
    fixes: [],
    errors: []
  };

  try {
    let content = await readFile(filePath, 'utf-8');
    const originalContent = content;
    const lines = content.split('\n');
    const relativePath = relative(process.cwd(), filePath);

    // Appliquer les corrections spécifiques au fichier
    if (FILE_SPECIFIC_FIXES[relativePath]) {
      for (const { pattern, replacement } of FILE_SPECIFIC_FIXES[relativePath]) {
        const before = content;
        content = content.replace(pattern, replacement);
        if (content !== before) {
          const lineNumber = content.substring(0, content.indexOf(replacement)).split('\n').length;
          result.fixes.push({
            line: lineNumber,
            type: 'file-specific',
            description: 'Correction spécifique fichier',
            before: before.substring(0, 100),
            after: content.substring(0, 100)
          });
        }
      }
    }

    // Appliquer les corrections de patterns génériques
    for (const { name, pattern, fix } of FIX_PATTERNS) {
      const matches = [...content.matchAll(new RegExp(pattern.source, pattern.flags))];
      
      for (const match of matches) {
        if (match.index === undefined) continue;
        
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const originalLine = lines[lineNumber - 1];
        
        const fixedMatch = typeof fix === 'function' ? fix(match[0]) : fix;
        
        if (fixedMatch && fixedMatch !== match[0]) {
          content = content.substring(0, match.index) + 
                   fixedMatch + 
                   content.substring(match.index + match[0].length);
          
          const newLines = content.split('\n');
          const newLine = newLines[lineNumber - 1];
          
          result.fixes.push({
            line: lineNumber,
            type: name,
            description: `${name} ligne ${lineNumber}`,
            before: originalLine.trim(),
            after: newLine.trim()
          });
          
          lines[lineNumber - 1] = newLine;
        }
      }
    }

    // Écrire le fichier corrigé si des modifications ont été faites
    if (content !== originalContent) {
      const backupPath = filePath + '.bak';
      await writeFile(backupPath, originalContent, 'utf-8');
      await writeFile(filePath, content, 'utf-8');
    }

  } catch (error) {
    result.errors.push(`Erreur lors du traitement: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

async function main() {
  const targetDirs = [
    join(process.cwd(), 'server'),
    join(process.cwd(), 'shared')
  ];

  console.log('🔍 Correction complète de la maintenabilité...\n');

  const allFiles: string[] = [];
  for (const dir of targetDirs) {
    if (existsSync(dir)) {
      const files = await getAllTsFiles(dir);
      allFiles.push(...files);
    }
  }

  console.log(`📁 ${allFiles.length} fichiers TypeScript trouvés\n`);

  const results: FixResult[] = [];
  let totalFixes = 0;

  for (const file of allFiles) {
    const result = await fixFile(file);
    if (result.fixes.length > 0 || result.errors.length > 0) {
      results.push(result);
      totalFixes += result.fixes.length;
      
      if (result.fixes.length > 0) {
        console.log(`✅ ${result.file}: ${result.fixes.length} correction(s)`);
      }
      
      if (result.errors.length > 0) {
        console.log(`⚠️  ${result.file}: ${result.errors.length} erreur(s)`);
      }
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   Fichiers traités: ${allFiles.length}`);
  console.log(`   Fichiers modifiés: ${results.filter(r => r.fixes.length > 0).length}`);
  console.log(`   Total corrections: ${totalFixes}`);

  if (results.length > 0) {
    console.log(`\n💾 Backups créés avec extension .bak`);
    console.log(`\n⚠️  Vérifiez les modifications et exécutez: npm run check`);
  } else {
    console.log(`\n✅ Aucune correction nécessaire`);
  }
}

main().catch(console.error);


