#!/usr/bin/env tsx

/**
 * Script pour corriger automatiquement les erreurs TypeScript critiques
 * Cible les patterns les plus fréquents identifiés dans l'analyse
 */

import * as fs from 'fs';
import * as path from 'path';

interface Fix {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const criticalFixes: Fix[] = [
  // Fix 1: asyncHandler avec paramètres malformés
  {
    pattern: /asyncHandler\(async\s+:\s+unknown,\s+unknown,\s+res:\s+Response\)/g,
    replacement: 'asyncHandler(async (req: Request, res: Response)',
    description: 'Correction asyncHandler avec paramètres malformés (req manquant)'
  },
  {
    pattern: /asyncHandler\(async\s+:\s+unknown,\s+unknown,\s+res\)/g,
    replacement: 'asyncHandler(async (req: Request, res: Response)',
    description: 'Correction asyncHandler avec paramètres incomplets'
  },
  
  // Fix 2: Type casting malformé avec "as unknown"
  {
    pattern: /as\s+unknown\)\s*unknown\)/g,
    replacement: 'as unknown)',
    description: 'Correction type casting dupliqué "as unknown)unknown)"'
  },
  {
    pattern: /as\s+unknoas\s+unknown/g,
    replacement: 'as unknown',
    description: 'Correction type casting corrompu "as unknoas unknown"'
  },
  {
    pattern: /as\s+uas\s+unknown/g,
    replacement: 'as unknown',
    description: 'Correction type casting corrompu "as uas unknown"'
  },
  {
    pattern: /\(as\s+unknown\)\s*\(as\s+unknown\)/g,
    replacement: '(as unknown)',
    description: 'Correction double cast "(as unknown)(as unknown)"'
  },
  
  // Fix 3: unknunknown patterns
  {
    pattern: /unknunknown/g,
    replacement: 'unknown',
    description: 'Correction "unknunknown" → "unknown"'
  },
  {
    pattern: /unknowntri/g,
    replacement: 'string',
    description: 'Correction "unknowntri" → "string"'
  },
  {
    pattern: /unknownbac/g,
    replacement: 'rbac',
    description: 'Correction "unknownbac" → "rbac"'
  },
  
  // Fix 4: Problèmes de ponctuation
  {
    pattern: /,\s*unknown,\s*unknown,/g,
    replacement: ',',
    description: 'Suppression virgules "unknown" superflues'
  },
  {
    pattern: /:\s+unknown,\s+unknown,/g,
    replacement: ': unknown,',
    description: 'Correction virgules "unknown" après deux-points'
  },
  
  // Fix 5: Problèmes avec metadata objects
  {
    pattern: /metadata:\s*{\s*}\s*}\s*\)\s*;\s*}\);/g,
    replacement: 'metadata: {}\n    }\n  );\n}',
    description: 'Correction fermeture withErrorHandling malformée'
  },
  
  // Fix 6: Parenthèses/accolades dupliquées
  {
    pattern: /\)\s*\)\s*\)/g,
    replacement: '))',
    description: 'Suppression parenthèse fermante excessive'
  },
  {
    pattern: /}\s*}\s*}/g,
    replacement: '}}',
    description: 'Suppression accolade fermante excessive'
  }
];

function fixFile(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const errors: string[] = [];
    
    for (const fix of criticalFixes) {
      const matches = content.match(fix.pattern);
      if (matches) {
        content = content.replace(fix.pattern, fix.replacement);
        fixCount += matches.length;
        console.log(`  ✓ ${fix.description}: ${matches.length} occurrence(s)`);
      }
    }
    
    if (fixCount > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    
    return { fixed: fixCount, errors };
  } catch (error) {
    return { 
      fixed: 0, 
      errors: [`Erreur lecture/écriture: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

function findFilesToFix(directory: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, .git, dist
        if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          scanDir(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  scanDir(directory);
  return files;
}

// Fichiers prioritaires (les plus d'erreurs)
const priorityFiles = [
  'server/services/ContextCacheService.ts',
  'server/storage/facade/StorageFacade.ts',
  'server/services/PredictiveEngineService.ts',
  'server/services/ContextBuilderService.ts',
  'server/services/DateAlertDetectionService.ts',
  'server/services/ChatbotOrchestrationService.ts',
  'server/services/BusinessContextService.ts',
  'server/modules/admin/routes.ts',
  'server/modules/aftersales/routes.ts',
  'server/modules/alerts/routes.ts',
  'server/modules/chatbot/routes.ts',
  'server/modules/commercial/routes.ts',
  'server/replitAuth.ts',
  'server/services/ActionExecutionService.ts'
];

async function main() {
  console.log('🔧 Correction automatique des erreurs TypeScript critiques\n');
  
  let totalFixed = 0;
  let filesFixed = 0;
  const allErrors: string[] = [];
  
  // Corriger d'abord les fichiers prioritaires
  console.log('📋 Correction des fichiers prioritaires...\n');
  for (const file of priorityFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`\n🔍 ${file}`);
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
  
  // Ensuite scanner tous les autres fichiers TypeScript
  console.log('\n\n📋 Correction des autres fichiers TypeScript...\n');
  const allFiles = findFilesToFix('server', ['.ts']);
  const remainingFiles = allFiles.filter(f => !priorityFiles.some(p => f.endsWith(p)));
  
  for (const file of remainingFiles) {
    const result = fixFile(file);
    if (result.fixed > 0) {
      console.log(`\n🔍 ${path.relative(process.cwd(), file)}`);
      console.log(`  ✅ ${result.fixed} correction(s) appliquée(s)`);
      totalFixed += result.fixed;
      filesFixed++;
    }
    allErrors.push(...result.errors);
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


