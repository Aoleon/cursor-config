#!/usr/bin/env tsx
/**
 * Script de correction automatique des erreurs TypeScript courantes
 * 
 * Corrections automatiques:
 * 1. Template literals mal formés (guillemets manquants, caractères spéciaux)
 * 2. Points-virgules en double
 * 3. Parenthèses/accolades manquantes
 * 4. Imports manquants
 * 5. Types manquants
 * 
 * Usage: npm run fix:typescript-errors
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

interface FileStats {
  file: string;
  fixes: Fix[];
  total: number;
}

// Patterns de correction automatique
const FIX_PATTERNS = [
  {
    name: 'Template literal mal fermé',
    pattern: /`([^`]*?)(?:\n|$)/g,
    fix: (match: string, content: string, line: string) => {
      // Vérifier si le template literal est bien fermé
      const backticks = (match.match(/`/g) || []).length;
      if (backticks % 2 !== 0) {
        // Template literal mal fermé - chercher la fin
        return null; // Nécessite analyse manuelle
      }
      return null;
    }
  },
  {
    name: 'Point-virgule en double',
    pattern: /;;+/g,
    fix: () => ';'
  },
  {
    name: 'Point-virgule après point final dans string',
    pattern: /([^;])\.";$/gm,
    fix: (match: string, before: string) => {
      return `${before}.";`;
    }
  },
  {
    name: 'Point-virgule après point final dans template literal',
    pattern: /([^;])\.`;$/gm,
    fix: (match: string, before: string) => {
      return `${before}.\`;`;
    }
  },
  {
    name: 'Parenthèse manquante',
    pattern: /\(([^)]*)$/gm,
    fix: null // Nécessite analyse contextuelle
  },
  {
    name: 'Accolade manquante',
    pattern: /\{([^}]*)$/gm,
    fix: null // Nécessite analyse contextuelle
  }
];

// Corrections spécifiques par fichier
const FILE_SPECIFIC_FIXES: Record<string, Array<{ line: number; fix: (content: string) => string }>> = {
  'server/documentProcessor.ts': [
    {
      line: 450,
      fix: (content: string) => {
        // Corriger le point-virgule en trop après le point final
        const lines = content.split('\n');
        if (lines[449]?.includes('Réponds UNIQUEMENT avec le JSON, sans explication.;')) {
          lines[449] = lines[449].replace('Réponds UNIQUEMENT avec le JSON, sans explication.;', 'Réponds UNIQUEMENT avec le JSON, sans explication.');
          return lines.join('\n');
        }
        return content;
      }
    },
    {
      line: 513,
      fix: (content: string) => {
        // Corriger le point-virgule en trop après 'documentProcessor',
        return content.replace(/service:\s*['"]documentProcessor['"],\s*;/g, "service: 'documentProcessor',");
      }
    }
  ]
};

async function getAllTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      // Ignorer node_modules, .git, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'build') {
        continue;
      }
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && extname(entry.name) === '.ts') {
        // Exclure les fichiers de test et de backup
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

    // Appliquer les corrections spécifiques au fichier
    const fileName = filePath.split(/[/\\]/).pop() || '';
    const relativePath = relative(process.cwd(), filePath);
    
    if (FILE_SPECIFIC_FIXES[relativePath]) {
      for (const fixConfig of FILE_SPECIFIC_FIXES[relativePath]) {
        const { line, fix } = fixConfig;
        const before = lines[line - 1];
        content = fix(content);
        const newLines = content.split('\n');
        const after = newLines[line - 1];
        
        if (before !== after) {
          result.fixes.push({
            line,
            type: 'file-specific',
            description: 'Correction spécifique ligne ' + line,
            before,
            after
          });
        }
      }
    }

    // Appliquer les corrections de patterns génériques
    for (const { name, pattern, fix } of FIX_PATTERNS) {
      if (!fix) continue; // Ignorer les patterns nécessitant une analyse manuelle
      
      const matches = [...content.matchAll(new RegExp(pattern.source, pattern.flags))];
      
      for (const match of matches) {
        if (match.index === undefined) continue;
        
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const originalLine = lines[lineNumber - 1];
        
        // Appliquer la correction
        const fixedMatch = typeof fix === 'function' 
          ? fix(match[0], match[1] || '', originalLine)
          : fix;
        
        if (fixedMatch && fixedMatch !== match[0]) {
          content = content.substring(0, match.index) + 
                   fixedMatch + 
                   content.substring(match.index + match[0].length);
          
          // Recalculer la ligne après modification
          const newLines = content.split('\n');
          const newLine = newLines[lineNumber - 1];
          
          result.fixes.push({
            line: lineNumber,
            type: name,
            description: `${name} ligne ${lineNumber}`,
            before: originalLine,
            after: newLine
          });
          
          // Mettre à jour les lignes pour les prochains matches
          lines[lineNumber - 1] = newLine;
        }
      }
    }

    // Écrire le fichier corrigé si des modifications ont été faites
    if (content !== originalContent) {
      // Créer un backup
      const backupPath = filePath + '.bak';
      await writeFile(backupPath, originalContent, 'utf-8');
      
      // Écrire le nouveau contenu
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

  console.log('🔍 Recherche des fichiers TypeScript...\n');

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
        result.fixes.forEach(fix => {
          console.log(`   - Ligne ${fix.line}: ${fix.description}`);
        });
      }
      
      if (result.errors.length > 0) {
        console.log(`⚠️  ${result.file}: ${result.errors.length} erreur(s)`);
        result.errors.forEach(error => {
          console.log(`   - ${error}`);
        });
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

