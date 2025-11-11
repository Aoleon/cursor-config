#!/usr/bin/env tsx
/**
 * Script d'analyse des erreurs TypeScript
 * Catégorise les erreurs par type et priorité pour planifier les corrections
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

interface ErrorInfo {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}

interface ErrorStats {
  code: string;
  count: number;
  description: string;
  priority: 'P0' | 'P1' | 'P2';
  examples: ErrorInfo[];
}

const errorDescriptions: Record<string, { description: string; priority: 'P0' | 'P1' | 'P2' }> = {
  'TS1005': { description: "Syntax error: ',' expected", priority: 'P0' },
  'TS1128': { description: "Declaration or statement expected", priority: 'P0' },
  'TS1434': { description: "Unexpected keyword or identifier", priority: 'P0' },
  'TS1435': { description: "Unknown keyword or identifier", priority: 'P0' },
  'TS1011': { description: "Cannot find name", priority: 'P1' },
  'TS1109': { description: "Expression expected", priority: 'P0' },
  'TS1002': { description: "Unterminated string literal", priority: 'P0' },
  'TS1003': { description: "Identifier expected", priority: 'P0' },
  'TS2304': { description: "Cannot find name", priority: 'P1' },
  'TS2307': { description: "Cannot find module", priority: 'P1' },
  'TS2339': { description: "Property does not exist", priority: 'P1' },
  'TS2345': { description: "Argument of type is not assignable", priority: 'P2' },
  'TS2554': { description: "Expected X arguments, but got Y", priority: 'P2' },
};

function parseErrors(output: string): ErrorInfo[] {
  const errors: ErrorInfo[] = [];
  const lines = output.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    if (match) {
      const [, file, lineNum, colNum, code, message] = match;
      errors.push({
        file: file.trim(),
        line: parseInt(lineNum, 10),
        column: parseInt(colNum, 10),
        code,
        message: message.trim(),
      });
    }
  }
  
  return errors;
}

function categorizeErrors(errors: ErrorInfo[]): Map<string, ErrorStats> {
  const stats = new Map<string, ErrorStats>();
  
  for (const error of errors) {
    if (!stats.has(error.code)) {
      const desc = errorDescriptions[error.code] || {
        description: `Unknown error: ${error.code}`,
        priority: 'P2' as const,
      };
      
      stats.set(error.code, {
        code: error.code,
        count: 0,
        description: desc.description,
        priority: desc.priority,
        examples: [],
      });
    }
    
    const stat = stats.get(error.code)!;
    stat.count++;
    if (stat.examples.length < 5) {
      stat.examples.push(error);
    }
  }
  
  return stats;
}

function getFilesByErrorType(errors: ErrorInfo[]): Map<string, Set<string>> {
  const filesByType = new Map<string, Set<string>>();
  
  for (const error of errors) {
    if (!filesByType.has(error.code)) {
      filesByType.set(error.code, new Set());
    }
    filesByType.get(error.code)!.add(error.file);
  }
  
  return filesByType;
}

function getTopFiles(errors: ErrorInfo[], limit: number = 20): Array<{ file: string; count: number }> {
  const fileCounts = new Map<string, number>();
  
  for (const error of errors) {
    fileCounts.set(error.file, (fileCounts.get(error.file) || 0) + 1);
  }
  
  return Array.from(fileCounts.entries())
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function main() {
  console.log('🔍 Analyse des erreurs TypeScript...\n');
  
  try {
    const output = execSync('npm run check 2>&1', { 
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 60000,
    });
    
    const errors = parseErrors(output);
    const stats = categorizeErrors(errors);
    const filesByType = getFilesByErrorType(errors);
    const topFiles = getTopFiles(errors);
    
    console.log(`📊 Total d'erreurs: ${errors.length}\n`);
    
    // Afficher les statistiques par type d'erreur
    console.log('📋 Erreurs par type (triées par priorité):\n');
    const sortedStats = Array.from(stats.values()).sort((a, b) => {
      const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.count - a.count;
    });
    
    for (const stat of sortedStats) {
      const files = filesByType.get(stat.code) || new Set();
      console.log(`  ${stat.priority} ${stat.code}: ${stat.count} erreur(s) - ${stat.description}`);
      console.log(`    Fichiers affectés: ${files.size}`);
      if (stat.examples.length > 0) {
        console.log(`    Exemples:`);
        for (const ex of stat.examples.slice(0, 3)) {
          console.log(`      - ${ex.file}:${ex.line}:${ex.column} - ${ex.message}`);
        }
      }
      console.log('');
    }
    
    // Afficher les fichiers les plus problématiques
    console.log('📁 Fichiers avec le plus d\'erreurs:\n');
    for (const { file, count } of topFiles) {
      console.log(`  ${file}: ${count} erreur(s)`);
    }
    
    // Générer un plan de correction
    console.log('\n🎯 Plan de correction recommandé:\n');
    
    const p0Errors = sortedStats.filter(s => s.priority === 'P0');
    const p1Errors = sortedStats.filter(s => s.priority === 'P1');
    const p2Errors = sortedStats.filter(s => s.priority === 'P2');
    
    console.log('Phase 1 - Corrections critiques (P0):');
    for (const stat of p0Errors) {
      console.log(`  ✓ Corriger ${stat.count} erreur(s) ${stat.code} - ${stat.description}`);
    }
    
    console.log('\nPhase 2 - Corrections importantes (P1):');
    for (const stat of p1Errors) {
      console.log(`  ✓ Corriger ${stat.count} erreur(s) ${stat.code} - ${stat.description}`);
    }
    
    console.log('\nPhase 3 - Corrections mineures (P2):');
    for (const stat of p2Errors) {
      console.log(`  ✓ Corriger ${stat.count} erreur(s) ${stat.code} - ${stat.description}`);
    }
    
    // Sauvegarder le rapport
    const report = {
      totalErrors: errors.length,
      stats: Array.from(stats.values()),
      topFiles,
      timestamp: new Date().toISOString(),
    };
    
    writeFileSync('typescript-errors-report.json', JSON.stringify(report, null, 2));
    console.log('\n✅ Rapport sauvegardé dans typescript-errors-report.json');
    
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'analyse:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

