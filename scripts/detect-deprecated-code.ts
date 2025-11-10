#!/usr/bin/env tsx
/**
 * Script pour détecter et lister le code deprecated/legacy
 * 
 * Usage: npm run detect:deprecated
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

interface DeprecatedItem {
  file: string;
  line: number;
  content: string;
  type: 'deprecated' | 'legacy' | 'unused' | 'todo' | 'fixme';
}

async function getAllTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
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

function detectDeprecated(content: string, filePath: string): DeprecatedItem[] {
  const items: DeprecatedItem[] = [];
  const lines = content.split('\n');
  
  const patterns = [
    { regex: /@deprecated/gi, type: 'deprecated' as const },
    { regex: /\/\/\s*deprecated/gi, type: 'deprecated' as const },
    { regex: /\/\*\s*deprecated/gi, type: 'deprecated' as const },
    { regex: /\/\/\s*legacy/gi, type: 'legacy' as const },
    { regex: /\/\*\s*legacy/gi, type: 'legacy' as const },
    { regex: /\/\/\s*unused/gi, type: 'unused' as const },
    { regex: /\/\*\s*unused/gi, type: 'unused' as const },
    { regex: /\/\/\s*TODO:/gi, type: 'todo' as const },
    { regex: /\/\/\s*FIXME:/gi, type: 'fixme' as const },
    { regex: /\/\/\s*XXX:/gi, type: 'todo' as const },
    { regex: /\/\/\s*HACK:/gi, type: 'todo' as const },
  ];
  
  lines.forEach((line, index) => {
    patterns.forEach(({ regex, type }) => {
      if (regex.test(line)) {
        items.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          type
        });
      }
    });
  });
  
  return items;
}

async function main() {
  const targetDir = join(process.cwd(), 'server');
  
  if (!existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }
  
  console.log(`🔍 Scanning for deprecated code in ${targetDir}...\n`);
  
  const files = await getAllTsFiles(targetDir);
  console.log(`📁 Found ${files.length} TypeScript files\n`);
  
  const allItems: DeprecatedItem[] = [];
  
  for (const file of files) {
    try {
      const content = await readFile(file, 'utf-8');
      const items = detectDeprecated(content, file);
      allItems.push(...items);
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error);
    }
  }
  
  // Grouper par type
  const byType = allItems.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {} as Record<string, DeprecatedItem[]>);
  
  console.log(`📊 Summary:\n`);
  Object.entries(byType).forEach(([type, items]) => {
    console.log(`   ${type}: ${items.length} occurrences`);
  });
  console.log(`   Total: ${allItems.length} occurrences\n`);
  
  // Afficher les détails
  Object.entries(byType).forEach(([type, items]) => {
    if (items.length > 0) {
      console.log(`\n📝 ${type.toUpperCase()} (${items.length}):`);
      items.slice(0, 20).forEach(item => {
        console.log(`   ${item.file}:${item.line} - ${item.content.substring(0, 80)}`);
      });
      if (items.length > 20) {
        console.log(`   ... and ${items.length - 20} more`);
      }
    }
  });
  
  // Générer un rapport JSON
  const report = {
    total: allItems.length,
    byType: Object.entries(byType).reduce((acc, [type, items]) => {
      acc[type] = items.length;
      return acc;
    }, {} as Record<string, number>),
    items: allItems
  };
  
  const reportPath = join(process.cwd(), 'docs/optimization/deprecated-code-report.json');
  await import('fs/promises').then(fs => 
    fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8')
  );
  
  console.log(`\n💾 Report saved to: ${reportPath}`);
}

main().catch(console.error);

