#!/usr/bin/env tsx

/**
 * Script pour corriger automatiquement les erreurs de syntaxe TypeScript critiques
 * Cible les patterns TS1005, TS1128, TS1434 les plus fréquents
 */

import * as fs from 'fs';
import * as path from 'path';

interface Fix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const syntaxFixes: Fix[] = [
  // Fix 1: Parenthèses manquantes dans if/while/for
  {
    pattern: /if\s*\([^)]*\)\s*\{/g,
    replacement: (match: string) => {
      // Vérifier si la parenthèse fermante existe
      const openParen = match.indexOf('(');
      const closeParen = match.indexOf(')', openParen);
      if (closeParen === -1) {
        // Parenthèse fermante manquante
        return match.replace('{', ') {');
      }
      return match;
    } as unknown as string,
    description: 'Correction parenthèses manquantes dans if'
  },
  
  // Fix 2: Accolades fermantes manquantes avant parenthèses
  {
    pattern: /\}\s*\}\s*\)/g,
    replacement: '})',
    description: 'Correction double accolade fermante avant parenthèse'
  },
  {
    pattern: /\}\s*\}\s*\)\s*;/g,
    replacement: '});',
    description: 'Correction double accolade fermante avant parenthèse avec point-virgule'
  },
  
  // Fix 3: Accolades fermantes manquantes dans objets
  {
    pattern: /context:\s*\{\s*[^}]*\}\s*\}\)/g,
    replacement: (match: string) => {
      // Compter les accolades ouvertes et fermées
      const openCount = (match.match(/\{/g) || []).length;
      const closeCount = (match.match(/\}/g) || []).length;
      if (openCount > closeCount) {
        // Ajouter les accolades manquantes
        const missing = openCount - closeCount;
        return match.replace(/\)\}/g, '}' + '}'.repeat(missing) + ')');
      }
      return match;
    } as unknown as string,
    description: 'Correction accolades manquantes dans objets context'
  },
  
  // Fix 4: Parenthèses manquantes dans appels de fonction
  {
    pattern: /\.some\([^)]*\)\s*\{/g,
    replacement: (match: string) => {
      const openParen = match.indexOf('(');
      const closeParen = match.indexOf(')', openParen);
      if (closeParen === -1) {
        return match.replace('{', ') {');
      }
      return match;
    } as unknown as string,
    description: 'Correction parenthèses manquantes dans .some()'
  },
  
  // Fix 5: Virgules manquantes dans objets
  {
    pattern: /(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*\)/g,
    replacement: '$1: $2, $3: $4, $5: $6, $7: $8)',
    description: 'Correction virgules manquantes dans objets'
  },
  
  // Fix 6: Problèmes avec withErrorHandling mal fermé
  {
    pattern: /withErrorHandling\(\s*async\s*\(\)\s*=>\s*\{\s*([^}]*)\s*\}\s*,\s*\{[^}]*\}\s*\)\s*\}\)/g,
    replacement: 'withErrorHandling(\n    async () => {\n      $1\n    },\n    {\n      operation: \'unknown\',\n      service: \'unknown\',\n      metadata: {}\n    }\n  )',
    description: 'Correction withErrorHandling mal fermé'
  },
  
  // Fix 7: Accolades fermantes manquantes dans blocs try/catch
  {
    pattern: /\}\s*catch\s*\([^)]*\)\s*\{\s*([^}]*)\s*\}\s*\}\)/g,
    replacement: '} catch (error) {\n      $1\n    }\n  )',
    description: 'Correction blocs try/catch mal fermés'
  },
  
  // Fix 8: Parenthèses manquantes dans conditions
  {
    pattern: /if\s*\([^)]*\)\s*\{/g,
    replacement: (match: string) => {
      const openParen = match.indexOf('(');
      const closeParen = match.indexOf(')', openParen);
      if (closeParen === -1) {
        // Chercher la parenthèse fermante dans la ligne suivante
        return match.replace('{', ') {');
      }
      return match;
    } as unknown as string,
    description: 'Correction parenthèses manquantes dans conditions if'
  }
];

function fixFile(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const errors: string[] = [];
    const originalContent = content;
    
    // Fix spécifiques pour les patterns identifiés
    const specificFixes: Array<{ pattern: RegExp; replacement: string }> = [
      // Fix parenthèses manquantes dans isNaN
      {
        pattern: /if\s*\(isNaN\(([^)]+)\)\s*\{/g,
        replacement: 'if (isNaN($1)) {'
      },
      // Fix accolades fermantes manquantes dans objets logger
      {
        pattern: /context:\s*\{\s*([^}]+)\s*\}\)/g,
        replacement: 'context: { $1 }})'
      },
      // Fix virgules manquantes dans objets
      {
        pattern: /(\w+):\s*(\w+)\s*(\w+):\s*(\w+)\s*\)/g,
        replacement: '$1: $2, $3: $4)'
      },
      // Fix parenthèses manquantes dans .some()
      {
        pattern: /\.some\(([^)]+)\s*\{/g,
        replacement: '.some($1) {'
      },
      // Fix parenthèses manquantes dans .filter()
      {
        pattern: /\.filter\(([^)]+)\s*\{/g,
        replacement: '.filter($1) {'
      },
      // Fix parenthèses manquantes dans .map()
      {
        pattern: /\.map\(([^)]+)\s*\{/g,
        replacement: '.map($1) {'
      }
    ];
    
    for (const fix of specificFixes) {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        fixCount += matches.length;
      }
    }
    
    // Appliquer les fixes génériques
    for (const fix of syntaxFixes) {
      if (typeof fix.replacement === 'string') {
        const matches = content.match(fix.pattern);
        if (matches) {
          content = content.replace(fix.pattern, fix.replacement);
          fixCount += matches.length;
        }
      }
    }
    
    if (fixCount > 0 && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { fixed: fixCount, errors: [] };
    }
    
    return { fixed: 0, errors: [] };
  } catch (error) {
    return { 
      fixed: 0, 
      errors: [`Erreur lecture/écriture: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

// Fichiers prioritaires avec erreurs de syntaxe
const priorityFiles = [
  'server/dateUtils.ts',
  'server/db.ts',
  'server/db/config.ts',
  'server/documentProcessor.ts',
  'server/contactService.ts',
  'server/eventBus.ts',
  'server/index.ts',
  'server/middleware/db-error-handler.ts',
  'server/middleware/security.ts',
  'server/middleware/validation.ts',
  'server/migration/analyze-monday-complete.ts',
  'server/migration/analyze-monday-export.ts',
  'server/modules/admin/routes.ts'
];

async function main() {
  console.log('🔧 Correction automatique des erreurs de syntaxe TypeScript\n');
  
  let totalFixed = 0;
  let filesFixed = 0;
  const allErrors: string[] = [];
  
  // Corriger d'abord les fichiers prioritaires
  console.log('📋 Correction des fichiers prioritaires...\n');
  for (const file of priorityFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`🔍 ${file}`);
      const result = fixFile(fullPath);
      if (result.fixed > 0) {
        totalFixed += result.fixed;
        filesFixed++;
        console.log(`  ✅ ${result.fixed} correction(s) appliquée(s)`);
      } else {
        console.log(`  ℹ️  Aucune correction applicable`);
      }
      allErrors.push(...result.errors);
    } else {
      console.log(`  ⚠️  Fichier non trouvé: ${file}`);
    }
  }
  
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 Résumé des corrections');
  console.log('='.repeat(60));
  console.log(`✅ Fichiers corrigés: ${filesFixed}`);
  console.log(`✅ Total corrections: ${totalFixed}`);
  
  if (allErrors.length > 0) {
    console.log(`\n⚠️  Erreurs rencontrées: ${allErrors.length}`);
    allErrors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\n💡 Prochaine étape: Exécuter "npm run check" pour vérifier les erreurs restantes');
}

main().catch(console.error);


