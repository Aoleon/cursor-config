#!/usr/bin/env tsx
/**
 * Script spécialisé pour corriger les fermetures mal formées dans .map(), .filter(), etc.
 * Détecte et corrige tous les patterns avec lignes vides entre accolades
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function fixFile(filePath: string): number {
  let content = readFileSync(filePath, 'utf-8');
  const originalContent = content;
  let fixed = 0;

  // Pattern spécifique: .map() avec lignes vides entre accolades
  // Exemple: }\n\n          }\n\n        }));
  const pattern = /\}\s*\n\s*\n\s+\}\s*\n\s*\n\s+\}\)\s*;/g;
  content = content.replace(pattern, () => {
    fixed++;
    return '      }));';
  });

  // Pattern avec plus de lignes vides
  const pattern2 = /\}\s*\n\s*\n\s*\n\s+\}\s*\n\s*\n\s*\n\s+\}\)\s*;/g;
  content = content.replace(pattern2, () => {
    fixed++;
    return '      }));';
  });

  // Pattern avec indentation complexe
  const pattern3 = /\}\s*\n\s+\}\s*\n\s+\}\)\s*;/g;
  content = content.replace(pattern3, () => {
    fixed++;
    return '      }));';
  });

  if (content !== originalContent) {
    writeFileSync(filePath, content, 'utf-8');
  }

  return fixed;
}

function scanDirectory(dir: string): string[] {
  const files: string[] = [];
  
  function scan(currentDir: string) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry)) {
          scan(fullPath);
        }
      } else if (stat.isFile() && entry.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

async function main() {
  console.log('🔧 Correction des fermetures .map() mal formées...\n');
  
  const files = scanDirectory('server');
  let totalFixed = 0;
  
  for (const file of files) {
    const fixed = fixFile(file);
    if (fixed > 0) {
      console.log(`✅ ${file}: ${fixed} correction(s)`);
      totalFixed += fixed;
    }
  }
  
  console.log(`\n✅ Total: ${totalFixed} corrections appliquées`);
}

main().catch(console.error);


