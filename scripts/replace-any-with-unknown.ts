#!/usr/bin/env tsx
/**
 * Script pour remplacer automatiquement `any` par `unknown` dans les fichiers TypeScript
 * 
 * Usage: npm run replace:any-to-unknown
 * 
 * Ce script remplace de manière sûre tous les `any` par `unknown` dans server/services/
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

interface Replacement {
  file: string;
  line: number;
  original: string;
  replacement: string;
}

interface FileStats {
  file: string;
  replacements: Replacement[];
  total: number;
}

// Patterns à remplacer (ordre important - du plus spécifique au plus général)
const REPLACEMENT_PATTERNS = [
  // Patterns avec contexte spécifique
  { pattern: /:\s*any\[\]/g, replacement: ': unknown[]' },
  { pattern: /:\s*any\s*>/g, replacement: ': unknown>' }, // Génériques
  { pattern: /:\s*any\s*,/g, replacement: ': unknown,' },
  { pattern: /:\s*any\s*=/g, replacement: ': unknown =' },
  { pattern: /:\s*any\s*\)/g, replacement: ': unknown)' },
  { pattern: /:\s*any\s*;/g, replacement: ': unknown;' },
  { pattern: /:\s*any\s*}/g, replacement: ': unknown}' },
  { pattern: /:\s*any\s*\|/g, replacement: ': unknown |' },
  { pattern: /:\s*any\s*&/g, replacement: ': unknown &' },
  { pattern: /:\s*any\s*$/gm, replacement: ': unknown' }, // Fin de ligne
  
  // Patterns avec `as`
  { pattern: /as\s+any\[\]/g, replacement: 'as unknown[]' },
  { pattern: /as\s+any\s*>/g, replacement: 'as unknown>' },
  { pattern: /as\s+any\s*,/g, replacement: 'as unknown,' },
  { pattern: /as\s+any\s*\)/g, replacement: 'as unknown)' },
  { pattern: /as\s+any\s*;/g, replacement: 'as unknown;' },
  { pattern: /as\s+any\s*}/g, replacement: 'as unknown}' },
  { pattern: /as\s+any\s*$/gm, replacement: 'as unknown' },
  { pattern: /as\s+any\b/g, replacement: 'as unknown' },
  
  // Patterns avec `any` seul (génériques, paramètres)
  { pattern: /<any>/g, replacement: '<unknown>' },
  { pattern: /<any\[\]>/g, replacement: '<unknown[]>' },
  { pattern: /<any,/g, replacement: '<unknown,' },
  { pattern: /,\s*any>/g, replacement: ', unknown>' },
  { pattern: /,\s*any,/g, replacement: ', unknown,' },
  { pattern: /\(any\)/g, replacement: '(unknown)' },
  { pattern: /\(any\[\]\)/g, replacement: '(unknown[])' },
  { pattern: /\(any,/g, replacement: '(unknown,' },
  { pattern: /,\s*any\)/g, replacement: ', unknown)' },
  
  // Patterns génériques dans les interfaces/types
  { pattern: /\bany\s*=/g, replacement: 'unknown =' },
  { pattern: /\bany\s*,/g, replacement: 'unknown,' },
  { pattern: /\bany\s*>/g, replacement: 'unknown>' },
  { pattern: /\bany\s*\)/g, replacement: 'unknown)' },
  { pattern: /\bany\s*;/g, replacement: 'unknown;' },
  { pattern: /\bany\s*}/g, replacement: 'unknown}' },
  { pattern: /\bany\s*\|/g, replacement: 'unknown |' },
  { pattern: /\bany\s*&/g, replacement: 'unknown &' },
  { pattern: /\bany\[\]/g, replacement: 'unknown[]' },
  { pattern: /\bany\s*$/gm, replacement: 'unknown' }, // Fin de ligne
  { pattern: /\bany\b/g, replacement: 'unknown' }, // Mot complet
];

// Patterns à exclure (ne pas remplacer)
const EXCLUDE_PATTERNS = [
  /\/\/.*any/g, // Commentaires
  /\/\*[\s\S]*?\*\//g, // Commentaires multi-lignes
  /['"`].*any.*['"`]/g, // Strings
  /\banyway\b/gi, // Mot "anyway"
  /\bcompany\b/gi, // Contient "any"
  /\banyone\b/gi,
  /\banything\b/gi,
  /\banywhere\b/gi,
];

async function getAllTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      // Ignorer node_modules, .git, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && extname(entry.name) === '.ts') {
        files.push(fullPath);
      }
    }
  }
  
  await walk(dir);
  return files;
}

function shouldExcludeLine(line: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => pattern.test(line));
}

function replaceInFile(content: string, filePath: string): { content: string; replacements: Replacement[] } {
  const lines = content.split('\n');
  const replacements: Replacement[] = [];
  let modifiedContent = content;
  
  // Appliquer les remplacements pattern par pattern
  for (const { pattern, replacement } of REPLACEMENT_PATTERNS) {
    const matches = [...modifiedContent.matchAll(new RegExp(pattern.source, pattern.flags))];
    
    for (const match of matches) {
      if (match.index === undefined) continue;
      
      // Trouver la ligne correspondante
      const beforeMatch = modifiedContent.substring(0, match.index);
      const lineNumber = beforeMatch.split('\n').length;
      const line = lines[lineNumber - 1];
      
      // Vérifier si la ligne doit être exclue
      if (shouldExcludeLine(line)) {
        continue;
      }
      
      // Vérifier que le match n'est pas dans un commentaire ou string
      const lineBeforeMatch = beforeMatch.split('\n').pop() || '';
      if (shouldExcludeLine(lineBeforeMatch + match[0])) {
        continue;
      }
      
      // Effectuer le remplacement
      modifiedContent = modifiedContent.substring(0, match.index) + 
                       replacement + 
                       modifiedContent.substring(match.index + match[0].length);
      
      replacements.push({
        file: filePath,
        line: lineNumber,
        original: match[0],
        replacement: replacement
      });
    }
  }
  
  return { content: modifiedContent, replacements };
}

async function processFile(filePath: string): Promise<FileStats> {
  const content = await readFile(filePath, 'utf-8');
  const { content: newContent, replacements } = replaceInFile(content, filePath);
  
  if (replacements.length > 0) {
    // Créer un backup
    const backupPath = filePath + '.bak';
    await writeFile(backupPath, content, 'utf-8');
    
    // Écrire le nouveau contenu
    await writeFile(filePath, newContent, 'utf-8');
  }
  
  return {
    file: filePath,
    replacements,
    total: replacements.length
  };
}

async function main() {
  const targetDirs = [
    join(process.cwd(), 'server'),
    join(process.cwd(), 'shared')
  ];
  
  console.log(`🔍 Scanning TypeScript files...\n`);
  
  const allFiles: string[] = [];
  for (const targetDir of targetDirs) {
    if (existsSync(targetDir)) {
      const files = await getAllTsFiles(targetDir);
      allFiles.push(...files);
    }
  }
  
  const files = allFiles;
  console.log(`📁 Found ${files.length} TypeScript files\n`);
  
  const stats: FileStats[] = [];
  let totalReplacements = 0;
  
  for (const file of files) {
    try {
      const fileStats = await processFile(file);
      if (fileStats.total > 0) {
        stats.push(fileStats);
        totalReplacements += fileStats.total;
        console.log(`✅ ${fileStats.file}: ${fileStats.total} replacements`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Files modified: ${stats.length}`);
  console.log(`   Total replacements: ${totalReplacements}`);
  
  if (stats.length > 0) {
    console.log(`\n📝 Modified files:`);
    stats.forEach(s => {
      console.log(`   - ${s.file} (${s.total} replacements)`);
    });
    console.log(`\n💾 Backups created with .bak extension`);
    console.log(`\n⚠️  Please review changes and run: npm run check`);
  }
}

main().catch(console.error);

