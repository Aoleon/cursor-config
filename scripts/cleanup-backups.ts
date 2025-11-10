#!/usr/bin/env tsx
/**
 * Script pour supprimer les fichiers de backup (.bak) après validation
 * 
 * Usage: npm run cleanup:backups
 */

import { unlink, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';

async function findBackupFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.bak')) {
        files.push(fullPath);
      }
    }
  }
  
  await walk(dir);
  return files;
}

async function main() {
  const targetDir = join(process.cwd(), 'server');
  
  if (!existsSync(targetDir)) {
    console.error(`❌ Directory not found: ${targetDir}`);
    process.exit(1);
  }
  
  console.log(`🔍 Scanning for backup files in ${targetDir}...\n`);
  
  const backupFiles = await findBackupFiles(targetDir);
  
  if (backupFiles.length === 0) {
    console.log(`✅ No backup files found.`);
    return;
  }
  
  console.log(`📁 Found ${backupFiles.length} backup files:\n`);
  backupFiles.forEach(f => console.log(`   - ${f}`));
  
  console.log(`\n🗑️  Deleting backup files...\n`);
  
  let deleted = 0;
  let errors = 0;
  
  for (const file of backupFiles) {
    try {
      await unlink(file);
      deleted++;
      console.log(`✅ Deleted: ${file}`);
    } catch (error) {
      errors++;
      console.error(`❌ Error deleting ${file}:`, error);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Files found: ${backupFiles.length}`);
  console.log(`   Files deleted: ${deleted}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);

