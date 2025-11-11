#!/usr/bin/env tsx
/**
 * Script de refactoring automatique - Extraction de méthodes
 * 
 * Extrait automatiquement des méthodes depuis des fonctions monolithiques:
 * 1. Détecte les fonctions > 100 lignes
 * 2. Identifie les blocs de code répétitifs
 * 3. Extrait les méthodes candidates
 * 4. Génère un rapport de refactoring
 * 
 * Usage: npm run refactor:extract-methods
 */

import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, extname, relative } from 'path';
import { existsSync } from 'fs';

interface RefactorResult {
  file: string;
  functions: FunctionAnalysis[];
  extracted: number;
  errors: string[];
}

interface FunctionAnalysis {
  name: string;
  line: number;
  length: number;
  candidates: ExtractCandidate[];
}

interface ExtractCandidate {
  line: number;
  type: string;
  description: string;
  code: string;
  suggestedName: string;
}

// Patterns de code répétitif à extraire
const EXTRACT_PATTERNS = [
  {
    name: 'Validation répétitive',
    pattern: /if\s*\([^)]*\)\s*\{[^}]*throw\s+new\s+Error\([^)]*\)/g,
    minLength: 3
  },
  {
    name: 'Logging répétitif',
    pattern: /logger\.(info|error|warn|debug)\([^)]*\)/g,
    minLength: 3
  },
  {
    name: 'Transformation de données',
    pattern: /const\s+\w+\s*=\s*[^;]+\.(map|filter|reduce)\([^)]*\)/g,
    minLength: 2
  }
];

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

function analyzeFunction(content: string, functionStart: number, functionEnd: number): FunctionAnalysis | null {
  const functionCode = content.substring(functionStart, functionEnd);
  const lines = functionCode.split('\n');
  
  if (lines.length <= 100) {
    return null; // Fonction pas assez longue
  }
  
  // Extraire le nom de la fonction
  const functionMatch = functionCode.match(/(?:async\s+)?(?:function\s+)?(\w+)\s*\(/);
  const functionName = functionMatch ? functionMatch[1] : 'anonymous';
  
  // Détecter les candidats à l'extraction
  const candidates: ExtractCandidate[] = [];
  
  for (const { name, pattern, minLength } of EXTRACT_PATTERNS) {
    const matches = [...functionCode.matchAll(new RegExp(pattern.source, pattern.flags))];
    
    if (matches.length >= minLength) {
      matches.forEach((match, index) => {
        if (match.index !== undefined) {
          const lineNumber = functionCode.substring(0, match.index).split('\n').length;
          candidates.push({
            line: lineNumber,
            type: name,
            description: `${name} - occurrence ${index + 1}`,
            code: match[0],
            suggestedName: `${functionName}_${name.toLowerCase().replace(/\s+/g, '_')}_${index + 1}`
          });
        }
      });
    }
  }
  
  return {
    name: functionName,
    line: functionStart,
    length: lines.length,
    candidates
  };
}

async function analyzeFile(filePath: string): Promise<RefactorResult> {
  const result: RefactorResult = {
    file: relative(process.cwd(), filePath),
    functions: [],
    extracted: 0,
    errors: []
  };

  try {
    const content = await readFile(filePath, 'utf-8');
    
    // Détecter les fonctions (async function, function, arrow functions)
    const functionRegex = /(?:async\s+)?(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\([^)]*\)\s*=>|const\s+\w+\s*=\s*(?:async\s+)?function)/g;
    const matches = [...content.matchAll(functionRegex)];
    
    for (const match of matches) {
      if (match.index === undefined) continue;
      
      // Trouver la fin de la fonction (accolade fermante correspondante)
      let braceCount = 0;
      let inFunction = false;
      let functionStart = match.index;
      let functionEnd = match.index;
      
      for (let i = match.index; i < content.length; i++) {
        const char = content[i];
        
        if (char === '{') {
          braceCount++;
          inFunction = true;
        } else if (char === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            functionEnd = i + 1;
            break;
          }
        }
      }
      
      if (functionEnd > functionStart) {
        const analysis = analyzeFunction(content, functionStart, functionEnd);
        if (analysis) {
          result.functions.push(analysis);
        }
      }
    }
    
  } catch (error) {
    result.errors.push(`Erreur lors de l'analyse: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

async function main() {
  const targetDirs = [
    join(process.cwd(), 'server')
  ];

  console.log('🔍 Analyse des fonctions monolithiques...\n');

  const allFiles: string[] = [];
  for (const dir of targetDirs) {
    if (existsSync(dir)) {
      const files = await getAllTsFiles(dir);
      allFiles.push(...files);
    }
  }

  console.log(`📁 ${allFiles.length} fichiers TypeScript trouvés\n`);

  const results: RefactorResult[] = [];
  let totalFunctions = 0;
  let totalCandidates = 0;

  for (const file of allFiles) {
    const result = await analyzeFile(file);
    if (result.functions.length > 0 || result.errors.length > 0) {
      results.push(result);
      totalFunctions += result.functions.length;
      totalCandidates += result.functions.reduce((sum, f) => sum + f.candidates.length, 0);
      
      if (result.functions.length > 0) {
        console.log(`📄 ${result.file}: ${result.functions.length} fonction(s) monolithique(s) détectée(s)`);
        result.functions.forEach(func => {
          console.log(`   - ${func.name} (${func.length} lignes, ${func.candidates.length} candidat(s) à l'extraction)`);
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
  console.log(`   Fichiers analysés: ${allFiles.length}`);
  console.log(`   Fichiers avec fonctions monolithiques: ${results.filter(r => r.functions.length > 0).length}`);
  console.log(`   Total fonctions monolithiques: ${totalFunctions}`);
  console.log(`   Total candidats à l'extraction: ${totalCandidates}`);

  if (results.length > 0) {
    console.log(`\n💡 Suggestions de refactoring:`);
    results.forEach(result => {
      result.functions.forEach(func => {
        if (func.candidates.length > 0) {
          console.log(`\n   ${result.file} - ${func.name}:`);
          func.candidates.forEach(candidate => {
            console.log(`     - Ligne ${candidate.line}: ${candidate.description}`);
            console.log(`       → Extraire en méthode: ${candidate.suggestedName}`);
          });
        }
      });
    });
  } else {
    console.log(`\n✅ Aucune fonction monolithique détectée`);
  }
}

main().catch(console.error);


