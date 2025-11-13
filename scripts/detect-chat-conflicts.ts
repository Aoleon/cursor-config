#!/usr/bin/env tsx
/**
 * Script de Détection Automatique des Conflits entre Chats Cursor
 * 
 * Objectif: Détecter automatiquement les conflits potentiels entre différents chats Cursor
 * en analysant les fichiers modifiés, les zones de travail et les dépendances.
 * 
 * Usage:
 *   tsx scripts/detect-chat-conflicts.ts [--file <filepath>] [--check-all] [--json]
 * 
 * Options:
 *   --file <filepath>    Vérifier un fichier spécifique avant modification
 *   --check-all          Vérifier tous les fichiers modifiés
 *   --json               Sortie en format JSON
 *   --coordination-doc   Mettre à jour le document de coordination
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, relative } from 'path';

// ========================================
// TYPES
// ========================================

interface FileModification {
  filepath: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  lastModified: Date;
  linesChanged?: number;
}

interface ConflictZone {
  zone: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  files: string[];
  assignedChat?: string;
  status: 'in_progress' | 'completed' | 'pending';
  conflicts: Conflict[];
}

interface Conflict {
  type: 'file_modification' | 'dependency' | 'zone_overlap' | 'syntax_error';
  severity: 'critical' | 'high' | 'medium' | 'low';
  filepath: string;
  description: string;
  line?: number;
  suggestion?: string;
}

interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: Conflict[];
  zones: ConflictZone[];
  modifiedFiles: FileModification[];
  recommendations: string[];
  timestamp: Date;
}

// ========================================
// ZONES DE TRAVAIL (depuis COORDINATION_CHATS_CURSOR.md)
// ========================================

const WORK_ZONES: Record<string, ConflictZone> = {
  'cache-services': {
    zone: 'cache-services',
    priority: 'critical',
    files: [
      'server/services/CacheService.ts',
      'server/services/RedisCacheAdapter.ts'
    ],
    status: 'pending',
    conflicts: []
  },
  'chatbot-service': {
    zone: 'chatbot-service',
    priority: 'critical',
    files: [
      'server/services/ChatbotOrchestrationService.ts'
    ],
    status: 'pending',
    conflicts: []
  },
  'suppliers-routes': {
    zone: 'suppliers-routes',
    priority: 'high',
    files: [
      'server/modules/suppliers/routes.ts'
    ],
    status: 'pending',
    conflicts: []
  },
  'monday-service': {
    zone: 'monday-service',
    priority: 'medium',
    files: [
      'server/services/MondayService.ts'
    ],
    status: 'pending',
    conflicts: []
  },
  'batigest-routes': {
    zone: 'batigest-routes',
    priority: 'low',
    files: [
      'server/modules/batigest/routes.ts'
    ],
    status: 'pending',
    conflicts: []
  },
  'database-utils': {
    zone: 'database-utils',
    priority: 'medium',
    files: [
      'server/utils/database-helpers.ts',
      'server/utils/safe-query.ts',
      'server/middleware/validation.ts'
    ],
    status: 'pending',
    conflicts: []
  }
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function getGitStatus(): FileModification[] {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf-8' });
    const files: FileModification[] = [];
    
    for (const line of output.split('\n').filter(l => l.trim())) {
      const status = line.substring(0, 2).trim();
      const filepath = line.substring(3).trim();
      
      if (!filepath || filepath.startsWith('docs/COORDINATION_CHATS_CURSOR.md')) {
        continue;
      }
      
      let modificationStatus: FileModification['status'] = 'modified';
      if (status.startsWith('A')) modificationStatus = 'added';
      else if (status.startsWith('D')) modificationStatus = 'deleted';
      else if (status.startsWith('R')) modificationStatus = 'renamed';
      
      const fullPath = join(process.cwd(), filepath);
      let lastModified = new Date();
      if (existsSync(fullPath)) {
        const stats = statSync(fullPath);
        lastModified = stats.mtime;
      }
      
      files.push({
        filepath,
        status: modificationStatus,
        lastModified
      });
    }
    
    return files;
  } catch (error) {
    console.error('Erreur lors de la récupération du statut git:', error);
    return [];
  }
}

function getFileDependencies(filepath: string): string[] {
  const dependencies: string[] = [];
  
  if (!existsSync(filepath)) {
    return dependencies;
  }
  
  try {
    const content = readFileSync(filepath, 'utf-8');
    
    // Détecter imports
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Convertir import relatif en chemin absolu
      if (importPath.startsWith('.')) {
        const dir = filepath.substring(0, filepath.lastIndexOf('/'));
        const resolvedPath = join(dir, importPath);
        dependencies.push(resolvedPath);
      } else if (!importPath.startsWith('@')) {
        // Ignorer imports node_modules et alias
        dependencies.push(importPath);
      }
    }
  } catch (error) {
    console.error(`Erreur lors de l'analyse des dépendances de ${filepath}:`, error);
  }
  
  return dependencies;
}

function findZoneForFile(filepath: string): ConflictZone | null {
  for (const zone of Object.values(WORK_ZONES)) {
    if (zone.files.some(f => filepath.includes(f) || f.includes(filepath))) {
      return zone;
    }
  }
  return null;
}

function detectSyntaxErrors(filepath: string): Conflict[] {
  const conflicts: Conflict[] = [];
  
  if (!existsSync(filepath)) {
    return conflicts;
  }
  
  try {
    // Vérifier erreurs TypeScript via tsc
    const output = execSync(
      `npx tsc --noEmit --pretty false 2>&1 | grep "${filepath}" || true`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    
    if (output.trim()) {
      const lines = output.split('\n').filter(l => l.trim());
      for (const line of lines) {
        const lineMatch = line.match(/\((\d+),(\d+)\)/);
        const lineNumber = lineMatch ? parseInt(lineMatch[1]) : undefined;
        
        conflicts.push({
          type: 'syntax_error',
          severity: 'high',
          filepath,
          description: line.trim(),
          line: lineNumber,
          suggestion: 'Corriger l\'erreur de syntaxe avant de continuer'
        });
      }
    }
  } catch (error) {
    // Ignorer si tsc n'est pas disponible ou si aucune erreur
  }
  
  return conflicts;
}

// ========================================
// DÉTECTION DE CONFLITS
// ========================================

function detectFileModificationConflicts(
  filepath: string,
  modifiedFiles: FileModification[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Vérifier si fichier déjà modifié
  const existingModification = modifiedFiles.find(m => m.filepath === filepath);
  if (existingModification) {
    conflicts.push({
      type: 'file_modification',
      severity: 'high',
      filepath,
      description: `Fichier déjà modifié (${existingModification.status})`,
      suggestion: 'Vérifier les modifications existantes avant de continuer'
    });
  }
  
  // Vérifier zone de travail
  const zone = findZoneForFile(filepath);
  if (zone && zone.status === 'in_progress' && zone.assignedChat) {
    conflicts.push({
      type: 'zone_overlap',
      severity: zone.priority === 'critical' ? 'critical' : 'high',
      filepath,
      description: `Fichier dans zone "${zone.zone}" assignée à un autre chat`,
      suggestion: `Contacter le chat assigné (${zone.assignedChat}) avant modification`
    });
  }
  
  return conflicts;
}

function detectDependencyConflicts(
  filepath: string,
  modifiedFiles: FileModification[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  const dependencies = getFileDependencies(filepath);
  
  for (const dep of dependencies) {
    const dependentModification = modifiedFiles.find(m => 
      m.filepath.includes(dep) || dep.includes(m.filepath)
    );
    
    if (dependentModification) {
      conflicts.push({
        type: 'dependency',
        severity: 'medium',
        filepath,
        description: `Dépendance "${dep}" modifiée récemment`,
        suggestion: 'Vérifier l\'impact des modifications sur les dépendances'
      });
    }
  }
  
  return conflicts;
}

function detectConflictsForFile(
  filepath: string,
  modifiedFiles: FileModification[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // Détecter conflits de modification
  conflicts.push(...detectFileModificationConflicts(filepath, modifiedFiles));
  
  // Détecter conflits de dépendances
  conflicts.push(...detectDependencyConflicts(filepath, modifiedFiles));
  
  // Détecter erreurs de syntaxe
  conflicts.push(...detectSyntaxErrors(filepath));
  
  return conflicts;
}

// ========================================
// ANALYSE COMPLÈTE
// ========================================

function analyzeAllConflicts(): ConflictDetectionResult {
  const modifiedFiles = getGitStatus();
  const allConflicts: Conflict[] = [];
  const zones = { ...WORK_ZONES };
  
  // Analyser chaque fichier modifié
  for (const file of modifiedFiles) {
    const fileConflicts = detectConflictsForFile(file.filepath, modifiedFiles);
    allConflicts.push(...fileConflicts);
    
    // Mettre à jour zone si nécessaire
    const zone = findZoneForFile(file.filepath);
    if (zone) {
      zone.conflicts.push(...fileConflicts);
      if (zone.status === 'pending') {
        zone.status = 'in_progress';
      }
    }
  }
  
  // Générer recommandations
  const recommendations: string[] = [];
  
  if (allConflicts.some(c => c.severity === 'critical')) {
    recommendations.push('🔴 CRITIQUE: Résoudre les conflits critiques avant de continuer');
  }
  
  if (allConflicts.some(c => c.type === 'zone_overlap')) {
    recommendations.push('⚠️ Vérifier les zones de travail assignées avant modification');
  }
  
  if (allConflicts.some(c => c.type === 'syntax_error')) {
    recommendations.push('🔧 Corriger les erreurs de syntaxe détectées');
  }
  
  if (modifiedFiles.length > 10) {
    recommendations.push('📝 Trop de fichiers modifiés - considérer un commit intermédiaire');
  }
  
  return {
    hasConflicts: allConflicts.length > 0,
    conflicts: allConflicts,
    zones: Object.values(zones),
    modifiedFiles,
    recommendations,
    timestamp: new Date()
  };
}

// ========================================
// AFFICHAGE
// ========================================

function formatOutput(result: ConflictDetectionResult, json: boolean = false): string {
  if (json) {
    return JSON.stringify(result, null, 2);
  }
  
  let output = '\n';
  output += '╔══════════════════════════════════════════════════════════════╗\n';
  output += '║  DÉTECTION DE CONFLITS ENTRE CHATS CURSOR                   ║\n';
  output += '╚══════════════════════════════════════════════════════════════╝\n\n';
  
  // Résumé
  output += `📊 Résumé:\n`;
  output += `   - Fichiers modifiés: ${result.modifiedFiles.length}\n`;
  output += `   - Conflits détectés: ${result.conflicts.length}\n`;
  output += `   - Zones de travail: ${result.zones.length}\n`;
  output += `   - Statut: ${result.hasConflicts ? '🔴 CONFLITS DÉTECTÉS' : '✅ Aucun conflit'}\n\n`;
  
  // Conflits par sévérité
  const critical = result.conflicts.filter(c => c.severity === 'critical');
  const high = result.conflicts.filter(c => c.severity === 'high');
  const medium = result.conflicts.filter(c => c.severity === 'medium');
  const low = result.conflicts.filter(c => c.severity === 'low');
  
  if (critical.length > 0) {
    output += `🔴 Conflits CRITIQUES (${critical.length}):\n`;
    for (const conflict of critical) {
      output += `   - ${conflict.filepath}${conflict.line ? `:${conflict.line}` : ''}\n`;
      output += `     ${conflict.description}\n`;
      if (conflict.suggestion) {
        output += `     💡 ${conflict.suggestion}\n`;
      }
      output += '\n';
    }
  }
  
  if (high.length > 0) {
    output += `⚠️ Conflits HAUTE PRIORITÉ (${high.length}):\n`;
    for (const conflict of high) {
      output += `   - ${conflict.filepath}${conflict.line ? `:${conflict.line}` : ''}\n`;
      output += `     ${conflict.description}\n`;
      if (conflict.suggestion) {
        output += `     💡 ${conflict.suggestion}\n`;
      }
      output += '\n';
    }
  }
  
  // Zones de travail
  output += `\n📋 Zones de Travail:\n`;
  for (const zone of result.zones) {
    const statusIcon = zone.status === 'in_progress' ? '🔄' : 
                      zone.status === 'completed' ? '✅' : '⏳';
    const priorityIcon = zone.priority === 'critical' ? '🔴' :
                        zone.priority === 'high' ? '⚠️' :
                        zone.priority === 'medium' ? '🟡' : '🟢';
    
    output += `   ${statusIcon} ${priorityIcon} ${zone.zone}\n`;
    output += `      Fichiers: ${zone.files.join(', ')}\n`;
    if (zone.assignedChat) {
      output += `      Assigné à: ${zone.assignedChat}\n`;
    }
    if (zone.conflicts.length > 0) {
      output += `      Conflits: ${zone.conflicts.length}\n`;
    }
    output += '\n';
  }
  
  // Recommandations
  if (result.recommendations.length > 0) {
    output += `\n💡 Recommandations:\n`;
    for (const rec of result.recommendations) {
      output += `   ${rec}\n`;
    }
    output += '\n';
  }
  
  // Fichiers modifiés
  if (result.modifiedFiles.length > 0) {
    output += `\n📝 Fichiers Modifiés (${result.modifiedFiles.length}):\n`;
    for (const file of result.modifiedFiles.slice(0, 10)) {
      output += `   ${file.status === 'modified' ? 'M' : file.status === 'added' ? 'A' : 'D'} ${file.filepath}\n`;
    }
    if (result.modifiedFiles.length > 10) {
      output += `   ... et ${result.modifiedFiles.length - 10} autres\n`;
    }
    output += '\n';
  }
  
  output += `\n🕐 Analyse effectuée le ${result.timestamp.toLocaleString('fr-FR')}\n`;
  
  return output;
}

// ========================================
// MAIN
// ========================================

function main() {
  const args = process.argv.slice(2);
  const checkFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];
  const checkAll = args.includes('--check-all');
  const json = args.includes('--json');
  const updateDoc = args.includes('--coordination-doc');
  
  if (checkFile) {
    // Vérifier un fichier spécifique
    const modifiedFiles = getGitStatus();
    const conflicts = detectConflictsForFile(checkFile, modifiedFiles);
    const result: ConflictDetectionResult = {
      hasConflicts: conflicts.length > 0,
      conflicts,
      zones: Object.values(WORK_ZONES),
      modifiedFiles,
      recommendations: conflicts.length > 0 ? [
        'Vérifier les conflits avant de modifier ce fichier'
      ] : [],
      timestamp: new Date()
    };
    console.log(formatOutput(result, json));
    
    // Exit code basé sur conflits
    process.exit(conflicts.some(c => c.severity === 'critical' || c.severity === 'high') ? 1 : 0);
  } else if (checkAll) {
    // Analyser tous les fichiers modifiés
    const result = analyzeAllConflicts();
    console.log(formatOutput(result, json));
    
    // Exit code basé sur conflits
    process.exit(result.hasConflicts ? 1 : 0);
  } else {
    // Mode par défaut: analyser tous les fichiers
    const result = analyzeAllConflicts();
    console.log(formatOutput(result, json));
    
    // Exit code basé sur conflits
    process.exit(result.hasConflicts ? 1 : 0);
  }
}

// ES Module check - exécuter main si script appelé directement
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('detect-chat-conflicts.ts');
if (isMainModule) {
  main();
}

export { detectConflictsForFile, analyzeAllConflicts, ConflictDetectionResult };

