#!/usr/bin/env tsx
/**
 * Script pour corriger les erreurs de syntaxe dans ContextBuilderService.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'server/services/ContextBuilderService.ts');

function fixSyntaxErrors(content: string): { fixed: number; content: string } {
  let fixed = 0;
  
  // Pattern 1: case 'xxx':; -> case 'xxx':
  content = content.replace(/case\s+['"]([^'"]+)['"]:\s*;/g, (match, caseValue) => {
    fixed++;
    return `case '${caseValue}':`;
  });
  
  // Pattern 2: async sans nom de fonction (ligne 383)
  // async\n    logger.info -> async buildClassicContext(config: ContextGenerationConfig): Promise<ContextGenerationResult> {
  content = content.replace(/async\s*\n\s*logger\.info\('Mode CLASSIQUE'/g, (match) => {
    fixed++;
    return `async buildClassicContext(config: ContextGenerationConfig): Promise<ContextGenerationResult> {\n    logger.info('Mode CLASSIQUE'`;
  });
  
  // Pattern 3: throw new NotFoundError(...); }); -> throw new NotFoundError(...);
  content = content.replace(/throw new NotFoundError\([^)]+\)\s*\}\);/g, (match) => {
    fixed++;
    return match.replace(/\}\);/g, ');');
  });
  
  // Pattern 4: logger mal formaté avec accolades mal fermées (lignes 532-539)
  // logger.info('...', { metadata: { ... } } }); -> logger.info('...', { metadata: { ... } });
  content = content.replace(/logger\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{([^}]+)\}\s*\}\s*\}\s*\}\);/g, (match, level, message, metadataContent) => {
    fixed++;
    return `logger.${level}('${message}', { metadata: {${metadataContent}} });`;
  });
  
  // Pattern 5: as unknown)unknowne as unknown) -> as unknown as any
  content = content.replace(/as\s+unknown\)unknowne\s+as\s+unknown\)/g, (match) => {
    fixed++;
    return 'as unknown as any';
  });
  
  // Pattern 6: (metricsas unknownany) -> (metrics as unknown as any)
  content = content.replace(/\(metricsas\s+unknownany\)/g, (match) => {
    fixed++;
    return '(metrics as unknown as any)';
  });
  
  // Pattern 7: (metas unknownown any) -> (metrics as unknown as any)
  content = content.replace(/\(metas\s+unknownown\s+any\)/g, (match) => {
    fixed++;
    return '(metrics as unknown as any)';
  });
  
  // Pattern 8: (metricsas unknown) as unknown) -> (metrics as unknown as any)
  content = content.replace(/\(metricsas\s+unknown\)\s+as\s+unknown\)/g, (match) => {
    fixed++;
    return '(metrics as unknown as any)';
  });
  
  // Pattern 9: unknownegory -> category
  content = content.replace(/unknownegory/g, (match) => {
    fixed++;
    return 'category';
  });
  
  // Pattern 10: unknown, -> category: 'context_generation',
  content = content.replace(/unknown,\s*category:\s*'context_generation'/g, (match) => {
    fixed++;
    return "category: 'context_generation'";
  });
  
  // Pattern 11: logger mal formaté avec fermetures incorrectes
  // logger.debug('...', { metadata: { ... } } }); -> logger.debug('...', { metadata: { ... } });
  content = content.replace(/logger\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{([^}]+)\}\s*\}\s*\}\s*\}\);/g, (match, level, message, metadataContent) => {
    fixed++;
    return `logger.${level}('${message}', { metadata: {${metadataContent}} });`;
  });
  
  return { fixed, content };
}

async function main() {
  console.log('🔧 Correction des erreurs de syntaxe dans ContextBuilderService.ts...\n');

  try {
    const originalContent = readFileSync(filePath, 'utf-8');
    const result = fixSyntaxErrors(originalContent);

    if (result.fixed > 0) {
      writeFileSync(filePath, result.content, 'utf-8');
      console.log(`✅ ${result.fixed} correction(s) appliquée(s)`);
      console.log(`📝 Fichier modifié: ${filePath.replace(process.cwd() + '/', '')}`);
    } else {
      console.log(`ℹ️  Aucune correction nécessaire`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la correction:`, error);
    process.exit(1);
  }
}

main().catch(console.error);


