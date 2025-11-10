#!/usr/bin/env tsx
/**
 * Script pour détecter les fichiers monolithiques (>500 lignes)
 * 
 * Usage: npm run detect:monolithic
 */

import { readFile, readdir } from 'fs/promises';
import { join, extname, relative } from 'path';
import { existsSync } from 'fs';

interface FileStats {
  file: string;
  lines: number;
  size: number;
  complexity: number; // Estimation basée sur les fonctions/classes
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

function estimateComplexity(content: string): number {
  const patterns = [
    /^\s*(export\s+)?(async\s+)?function\s+\w+/gm,
    /^\s*(export\s+)?(async\s+)?\w+\s*\(/gm,
    /^\s*(export\s+)?class\s+\w+/gm,
    /^\s*(export\s+)?interface\s+\w+/gm,
    /^\s*(export\s+)?type\s+\w+/gm,
  ];
  
  let count = 0;
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) count += matches.length;
  });
  
  return count;
}

async function analyzeFile(filePath: string): Promise<FileStats | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n').length;
    const size = Buffer.byteLength(content, 'utf-8');
    const complexity = estimateComplexity(content);
    
    return {
      file: relative(process.cwd(), filePath),
      lines,
      size,
      complexity
    };
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error);
    return null;
  }
}

async function main() {
  const targetDir = join(process.cwd(), 'server');
  const threshold = 500; // Lignes
  
  if (!existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }
  
  console.log(`🔍 Scanning for monolithic files (>${threshold} lines) in ${targetDir}...\n`);
  
  const files = await getAllTsFiles(targetDir);
  console.log(`📁 Found ${files.length} TypeScript files\n`);
  
  const stats: FileStats[] = [];
  
  for (const file of files) {
    const fileStats = await analyzeFile(file);
    if (fileStats) {
      stats.push(fileStats);
    }
  }
  
  // Trier par nombre de lignes
  stats.sort((a, b) => b.lines - a.lines);
  
  // Filtrer les fichiers monolithiques
  const monolithic = stats.filter(s => s.lines > threshold);
  
  console.log(`📊 Summary:\n`);
  console.log(`   Total files: ${stats.length}`);
  console.log(`   Monolithic files (>${threshold} lines): ${monolithic.length}\n`);
  
  if (monolithic.length > 0) {
    console.log(`📝 Monolithic files:\n`);
    monolithic.forEach(s => {
      const sizeKB = (s.size / 1024).toFixed(2);
      console.log(`   ${s.file}`);
      console.log(`      Lines: ${s.lines}`);
      console.log(`      Size: ${sizeKB} KB`);
      console.log(`      Complexity: ~${s.complexity} functions/classes`);
      console.log(``);
    });
    
    // Générer un rapport JSON
    const report = {
      threshold,
      total: stats.length,
      monolithic: monolithic.length,
      files: monolithic
    };
    
    const reportPath = join(process.cwd(), 'docs/optimization/monolithic-files-report.json');
    await import('fs/promises').then(fs => 
      fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8')
    );
    
    console.log(`💾 Report saved to: ${reportPath}`);
  } else {
    console.log(`✅ No monolithic files found!`);
  }
}

main().catch(console.error);

