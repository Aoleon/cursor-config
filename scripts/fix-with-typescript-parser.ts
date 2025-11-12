#!/usr/bin/env tsx
/**
 * Script de correction utilisant le parser TypeScript
 * Corrige les appels logger mal formatés dans StorageFacade.ts et autres fichiers
 */

import * as ts from 'typescript';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface FixResult {
  file: string;
  fixed: number;
  errors: string[];
}

function fixFileWithParser(filePath: string): FixResult {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fixed = 0;
  const errors: string[] = [];

  try {
    // Créer un SourceFile pour analyser le code en mode tolerant
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true, // setParentNodes
      ts.ScriptKind.TS
    );

    const replacements: Array<{ start: number; end: number; replacement: string }> = [];

    // Approche hybride : chercher les patterns problématiques avec regex d'abord
    // puis utiliser le parser pour valider et corriger
    
    // Pattern: logger.info('...', { metadata: { ... }\n        }\n      );
    // Le pattern exact dans le fichier: metadata: { ... }\n        }\n      );
    const loggerPattern = /(this\.facadeLogger|logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{([^}]+?)\}\s*\n\s+\}\s*\n\s+\);/g;
    
    // Pattern alternatif pour les cas où le metadata se termine par un retour à la ligne
    const loggerPattern2 = /(this\.facadeLogger|logger)\.(info|warn|error|debug)\('([^']+)',\s*\{\s*metadata:\s*\{([^}]+?)\n\s+\}\s*\n\s+\}\s*\n\s+\);/g;
    
    function processMatch(match: RegExpMatchArray, patternIndex: number) {
      const fullMatch = match[0];
      const loggerVar = match[1];
      const level = match[2];
      const message = match[3];
      const metadataContent = match[4];
      
      // Nettoyer et formater le metadata
      const cleanMetadata = metadataContent
        .replace(/\n\s+/g, ' ')
        .trim();
      
      // Parser les propriétés du metadata
      const props = cleanMetadata
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      // Formater chaque propriété
      const formattedProps = props.map(prop => {
        // Si la propriété contient ':', c'est déjà formaté
        if (prop.includes(':')) {
          const [key, ...valueParts] = prop.split(':');
          const value = valueParts.join(':').trim();
          return `          ${key.trim()}: ${value}`;
        }
        return `          ${prop}`;
      }).join(',\n');
      
      // Reconstruire l'appel logger correctement formaté
      const replacement = `${loggerVar}.${level}('${message}', {\n        metadata: {\n${formattedProps}\n        }\n      });`;
      
      if (match.index !== undefined) {
        replacements.push({
          start: match.index,
          end: match.index + fullMatch.length,
          replacement
        });
        fixed++;
      }
    }
    
    // Essayer les deux patterns
    let match;
    loggerPattern.lastIndex = 0;
    while ((match = loggerPattern.exec(content)) !== null) {
      processMatch(match, 1);
    }
    
    loggerPattern2.lastIndex = 0;
    while ((match = loggerPattern2.exec(content)) !== null) {
      processMatch(match, 2);
    }

    // Appliquer les remplacements en ordre inverse (pour préserver les positions)
    replacements.sort((a, b) => b.start - a.start);
    for (const replacement of replacements) {
      content = content.substring(0, replacement.start) + 
                replacement.replacement + 
                content.substring(replacement.end);
    }

    if (content !== originalContent) {
      writeFileSync(filePath, content, 'utf-8');
    }
  } catch (error) {
    errors.push(`Erreur: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { file: filePath, fixed, errors };
}

async function main() {
  console.log('🔧 Correction avec parser TypeScript...\n');

  const filesToFix = [
    'server/storage/facade/StorageFacade.ts',
    'server/services/ContextBuilderService.ts',
    'server/services/PredictiveEngineService.ts',
    'server/services/ChatbotOrchestrationService.ts',
    'server/services/DateAlertDetectionService.ts',
  ];

  let totalFixed = 0;
  let filesModified = 0;

  for (const file of filesToFix) {
    const filePath = join(process.cwd(), file);
    try {
      const result = fixFileWithParser(filePath);
      if (result.fixed > 0) {
        totalFixed += result.fixed;
        filesModified++;
        const relPath = filePath.replace(process.cwd() + '/', '');
        console.log(`✅ ${relPath}: ${result.fixed} correction(s)`);
        if (result.errors.length > 0) {
          console.log(`   ⚠️  Erreurs: ${result.errors.join(', ')}`);
        }
      }
    } catch (error) {
      console.error(`❌ Erreur avec ${file}:`, error);
    }
  }

  console.log(`\n============================================================`);
  console.log(`📊 RÉSUMÉ FINAL`);
  console.log(`============================================================`);
  console.log(`✅ Fichiers modifiés: ${filesModified}`);
  console.log(`✅ Corrections appliquées: ${totalFixed}`);
  console.log(`\n💡 Prochaine étape: Exécutez "npm run check" pour vérifier`);
}

main().catch(console.error);

