#!/usr/bin/env tsx

/**
 * Script de correction des patterns restants identifiés dans les erreurs TypeScript
 * Corrige automatiquement les patterns récurrents qui causent des erreurs en cascade
 */

import * as fs from 'fs';
import * as path from 'path';

function findTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', '.next', 'build', 'scripts'].includes(file)) {
        findTsFiles(filePath, fileList);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

function fixRemainingPatterns(filePath: string): { fixed: number; errors: string[] } {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    let fixCount = 0;
    const errors: string[] = [];

    // Fix 1: )unknown) → )
    const unknownPattern1 = /\)unknown\)/g;
    const unknownMatches1 = content.match(unknownPattern1);
    if (unknownMatches1) {
      content = content.replace(/\)unknown\)/g, ')');
      fixCount += unknownMatches1.length;
    }

    // Fix 2: : unknown)unknown) → : unknown)
    const unknownPattern2 = /:\s*unknown\)unknown\)/g;
    const unknownMatches2 = content.match(unknownPattern2);
    if (unknownMatches2) {
      content = content.replace(/:\s*unknown\)unknown\)/g, ': unknown)');
      fixCount += unknownMatches2.length;
    }

    // Fix 3: : unknown)unknown)unknown) → : unknown)
    const unknownPattern3 = /:\s*unknown\)unknown\)unknown\)/g;
    const unknownMatches3 = content.match(unknownPattern3);
    if (unknownMatches3) {
      content = content.replace(/:\s*unknown\)unknown\)unknown\)/g, ': unknown)');
      fixCount += unknownMatches3.length;
    }

    // Fix 4: Record<string, unknown>unknown>unknown> → Record<string, unknown>
    const recordPattern = /Record<string,\s*unknown>unknown>unknown>/g;
    const recordMatches = content.match(recordPattern);
    if (recordMatches) {
      content = content.replace(/Record<string,\s*unknown>unknown>unknown>/g, 'Record<string, unknown>');
      fixCount += recordMatches.length;
    }

    // Fix 5: Record<string, unknown>unknown> → Record<string, unknown>
    const recordPattern2 = /Record<string,\s*unknown>unknown>/g;
    const recordMatches2 = content.match(recordPattern2);
    if (recordMatches2) {
      content = content.replace(/Record<string,\s*unknown>unknown>/g, 'Record<string, unknown>');
      fixCount += recordMatches2.length;
    }

    // Fix 6: as unknown)unknown) → as unknown)
    const asUnknownPattern = /as\s+unknown\)unknown\)/g;
    const asUnknownMatches = content.match(asUnknownPattern);
    if (asUnknownMatches) {
      content = content.replace(/as\s+unknown\)unknown\)/g, 'as unknown)');
      fixCount += asUnknownMatches.length;
    }

    // Fix 7: as unknown)unknown)unknown) → as unknown)
    const asUnknownPattern3 = /as\s+unknown\)unknown\)unknown\)/g;
    const asUnknownPattern3Matches = content.match(asUnknownPattern3);
    if (asUnknownPattern3Matches) {
      content = content.replace(/as\s+unknown\)unknown\)unknown\)/g, 'as unknown)');
      fixCount += asUnknownPattern3Matches.length;
    }

    // Fix 8: coas unknown, as unknown, → (cached.data as unknown).contextData
    const coasPattern = /coas\s+unknown,\s*as\s+unknown,/g;
    const coasMatches = content.match(coasPattern);
    if (coasMatches) {
      content = content.replace(/coas\s+unknown,\s*as\s+unknown,/g, '(cached.data as unknown).contextData');
      fixCount += coasMatches.length;
    }

    // Fix 9: strategy.entityTypes → stra.entityTypes (corriger la variable)
    const strategyPattern = /for\s*\(const\s+entityType\s+of\s+strategy\.entityTypes\)/g;
    const strategyMatches = content.match(strategyPattern);
    if (strategyMatches) {
      // Chercher la variable correcte dans le contexte
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('for (const entityType of strategy.entityTypes)')) {
          // Chercher la variable strategy dans le contexte précédent
          for (let j = i - 1; j >= Math.max(0, i - 30); j--) {
            const strategyMatch = lines[j].match(/(const|let|var)\s+(\w+)\s*[:=].*strategy/i);
            if (strategyMatch) {
              const varName = strategyMatch[2];
              lines[i] = lines[i].replace('strategy.entityTypes', `${varName}.entityTypes`);
              fixCount++;
              break;
            }
            // Chercher directement la déclaration de strategy
            const directMatch = lines[j].match(/(const|let|var)\s+strategy\s*[:=]/);
            if (directMatch) {
              // La variable s'appelle strategy, donc c'est correct
              // Mais peut-être que c'est "stra" qui est utilisé ailleurs
              const straMatch = lines[j].match(/(const|let|var)\s+stra\s*[:=]/);
              if (straMatch) {
                lines[i] = lines[i].replace('strategy.entityTypes', 'stra.entityTypes');
                fixCount++;
              }
              break;
            }
          }
        }
      }
      content = lines.join('\n');
    }

    // Fix 10: strategy.maxContextsPerType → stra.maxContextsPerType
    const strategyMaxPattern = /strategy\.maxContextsPerType/g;
    const strategyMaxMatches = content.match(strategyMaxPattern);
    if (strategyMaxMatches) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('strategy.maxContextsPerType')) {
          // Chercher la variable correcte
          for (let j = i - 1; j >= Math.max(0, i - 30); j--) {
            const straMatch = lines[j].match(/(const|let|var)\s+stra\s*[:=]/);
            if (straMatch) {
              lines[i] = lines[i].replace(/strategy\.maxContextsPerType/g, 'stra.maxContextsPerType');
              lines[i] = lines[i].replace(/strategy\.complexityFocus/g, 'stra.complexityFocus');
              lines[i] = lines[i].replace(/strategy\.priority/g, 'stra.priority');
              fixCount++;
              break;
            }
          }
        }
      }
      content = lines.join('\n');
    }

    // Fix 11: operation: 'sort', → trouver le nom de la méthode
    const sortPattern = /operation:\s*'sort',/g;
    const sortMatches = content.match(sortPattern);
    if (sortMatches) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("operation: 'sort',")) {
          // Chercher la méthode async la plus proche avant
          for (let j = i - 1; j >= Math.max(0, i - 100); j--) {
            const methodMatch = lines[j].match(/(?:async\s+)?(?:private\s+|public\s+|protected\s+)?(\w+)\s*\([^)]*\)\s*[:=]/);
            if (methodMatch) {
              const methodName = methodMatch[1];
              lines[i] = lines[i].replace("operation: 'sort',", `operation: '${methodName}',`);
              fixCount++;
              break;
            }
          }
        }
      }
      content = lines.join('\n');
    }

    // Fix 12: Corriger les patterns avec des variables mal nommées
    // strategy → stra dans executePrewarmingStrategy
    const executeStrategyPattern = /executePrewarmingStrategy\(stra\)/g;
    if (executeStrategyPattern.test(content)) {
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('executePrewarmingStrategy(stra)')) {
          // Chercher la déclaration de stra
          for (let j = i - 1; j >= Math.max(0, i - 30); j--) {
            const straMatch = lines[j].match(/(const|let|var)\s+stra\s*[:=]/);
            if (straMatch) {
              // Vérifier si c'est bien strategy qui devrait être utilisé
              const strategyMatch = lines[j].match(/getPrewarmingStrategy/);
              if (strategyMatch) {
                // Remplacer stra par strategy dans la boucle
                for (let k = i; k < Math.min(lines.length, i + 50); k++) {
                  lines[k] = lines[k].replace(/stra\./g, 'strategy.');
                }
                fixCount++;
              }
              break;
            }
          }
        }
      }
      content = lines.join('\n');
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    return { fixed: fixCount, errors };
  } catch (error) {
    return { fixed: 0, errors: [`Erreur lors du traitement de ${filePath}: ${error}`] };
  }
}

async function main() {
  const projectRoot = process.cwd();
  const serverDir = path.join(projectRoot, 'server');
  
  console.log('🔍 Recherche des fichiers TypeScript...');
  const files = findTsFiles(serverDir);
  console.log(`📁 ${files.length} fichiers trouvés\n`);

  let totalFixed = 0;
  const filesFixed: string[] = [];
  const allErrors: string[] = [];

  console.log('🔧 Correction des patterns restants...\n');

  for (const file of files) {
    const result = fixRemainingPatterns(file);
    if (result.fixed > 0) {
      totalFixed += result.fixed;
      filesFixed.push(file);
      console.log(`✅ ${file}: ${result.fixed} correction(s)`);
    }
    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
    }
  }

  console.log(`\n📊 Résumé:`);
  console.log(`   - Fichiers modifiés: ${filesFixed.length}`);
  console.log(`   - Corrections appliquées: ${totalFixed}`);
  
  if (filesFixed.length > 0) {
    console.log(`\n📝 Fichiers corrigés:`);
    filesFixed.forEach(file => console.log(`   - ${file}`));
  }

  if (allErrors.length > 0) {
    console.log(`\n⚠️  Erreurs rencontrées:`);
    allErrors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n✨ Correction terminée!');
}

main().catch(console.error);

