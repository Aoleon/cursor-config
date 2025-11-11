#!/usr/bin/env tsx

/**
 * Script pour corriger automatiquement les patterns metadata malformés dans StorageFacade.ts
 */

import * as fs from 'fs';
import * as path from 'path';

function fixStorageFacadeMetadata(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let fixCount = 0;
    const originalContent = content;
    
    // Fix: metadata: { ... } }; -> metadata: { ... } });
    const metadataPattern = /metadata:\s*\{[^}]*\}\s*\;/g;
    const matches = content.match(metadataPattern);
    if (matches) {
      content = content.replace(metadataPattern, (match) => {
        return match.replace(/\}\s*\;/, '} });');
      });
      fixCount += matches.length;
    }
    
    // Fix: logger.info/warn/error/debug avec metadata malformé
    const loggerPattern = /(this\.facadeLogger|logger)\.(info|warn|error|debug)\([^,]+,\s*\{\s*metadata:\s*\{[^}]*\}\s*\;/g;
    const loggerMatches = content.match(loggerPattern);
    if (loggerMatches) {
      content = content.replace(loggerPattern, (match) => {
        return match.replace(/\}\s*\;/, '} });');
      });
      fixCount += loggerMatches.length;
    }
    
    if (fixCount > 0 && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return { fixed: fixCount, errors: [] };
    }
    
    return { fixed: 0, errors: [] };
  } catch (error) {
    return { 
      fixed: 0, 
      errors: [`Erreur: ${error instanceof Error ? error.message : String(error)}`] 
    };
  }
}

function main() {
  console.log('🔧 Correction automatique des patterns metadata dans StorageFacade.ts\n');
  
  const filePath = path.resolve(process.cwd(), 'server/storage/facade/StorageFacade.ts');
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier non trouvé: ${filePath}`);
    process.exit(1);
  }
  
  const result = fixStorageFacadeMetadata(filePath);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Résumé des corrections');
  console.log('='.repeat(60));
  console.log(`✅ Corrections appliquées: ${result.fixed}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Erreurs: ${result.errors.length}`);
    result.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('\n💡 Prochaine étape: Exécuter "npm run check" pour vérifier les erreurs restantes');
}

main();


