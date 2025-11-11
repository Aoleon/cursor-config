#!/usr/bin/env tsx

/**
 * Script de vérification des mises à jour disponibles
 * Saxium - Update Manager
 * 
 * Usage:
 *   npm run check:updates
 *   ou
 *   tsx scripts/check-updates.ts
 * 
 * Fonctionnalités:
 *   - Exécute npm outdated et parse les résultats
 *   - Compare avec package.json
 *   - Génère rapport structuré
 *   - Catégorise par type (PATCH, MINOR, MAJOR)
 *   - Peut être appelé par l'agent ou manuellement
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface PackageUpdate {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'PATCH' | 'MINOR' | 'MAJOR';
  location: string;
  dependent?: string;
}

interface UpdateReport {
  timestamp: number;
  total: number;
  patch: PackageUpdate[];
  minor: PackageUpdate[];
  major: PackageUpdate[];
  packages: PackageUpdate[];
}

/**
 * Lire package.json pour obtenir les versions actuelles
 */
function readPackageJson(): { dependencies: Record<string, string>; devDependencies: Record<string, string> } {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    
    return {
      dependencies: packageJson.dependencies || {},
      devDependencies: packageJson.devDependencies || {}
    };
  } catch (error) {
    console.error('❌ Erreur lors de la lecture de package.json');
    console.error(error);
    return { dependencies: {}, devDependencies: {} };
  }
}

/**
 * Extraire la version actuelle depuis package.json (enlever préfixes ^, ~, etc.)
 */
function extractCurrentVersion(versionSpec: string): string {
  if (!versionSpec) return 'unknown';
  
  // Enlever préfixes ^, ~, >=, <=, etc.
  const cleanVersion = versionSpec.replace(/^[\^~>=<]/, '');
  
  // Si c'est une plage, prendre la première version
  if (cleanVersion.includes(' ')) {
    return cleanVersion.split(' ')[0];
  }
  
  return cleanVersion;
}

/**
 * Exécuter npm outdated et parser les résultats
 */
function checkNpmUpdates(): PackageUpdate[] {
  try {
    console.log('🔍 Vérification des mises à jour disponibles...\n');
    
    // Lire package.json pour obtenir versions actuelles
    const packageJson = readPackageJson();
    const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const result = execSync('npm outdated --json', { 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const outdated = JSON.parse(result);
    
    if (Object.keys(outdated).length === 0) {
      console.log('✅ Tous les packages sont à jour!\n');
      return [];
    }
    
    const updates: PackageUpdate[] = [];
    
    for (const [name, info] of Object.entries(outdated)) {
      const updateInfo = info as any;
      
      // Obtenir version actuelle depuis package.json
      const currentVersionSpec = allDependencies[name] || updateInfo.current || 'unknown';
      const currentVersion = extractCurrentVersion(currentVersionSpec);
      
      const update: PackageUpdate = {
        name,
        current: currentVersion,
        wanted: updateInfo.wanted || 'unknown',
        latest: updateInfo.latest || 'unknown',
        type: calculateUpdateType(currentVersion, updateInfo.latest || 'unknown'),
        location: updateInfo.location || 'unknown',
        dependent: updateInfo.dependent
      };
      
      updates.push(update);
    }
    
    return updates;
  } catch (error: any) {
    // npm outdated retourne un code de sortie non-zéro s'il y a des packages obsolètes
    if (error.status === 1 && error.stdout) {
      try {
        const outdated = JSON.parse(error.stdout);
        const packageJson = readPackageJson();
        const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const updates: PackageUpdate[] = [];
        
        for (const [name, info] of Object.entries(outdated)) {
          const updateInfo = info as any;
          
          // Obtenir version actuelle depuis package.json
          const currentVersionSpec = allDependencies[name] || updateInfo.current || 'unknown';
          const currentVersion = extractCurrentVersion(currentVersionSpec);
          
          const update: PackageUpdate = {
            name,
            current: currentVersion,
            wanted: updateInfo.wanted || 'unknown',
            latest: updateInfo.latest || 'unknown',
            type: calculateUpdateType(currentVersion, updateInfo.latest || 'unknown'),
            location: updateInfo.location || 'unknown',
            dependent: updateInfo.dependent
          };
          
          updates.push(update);
        }
        
        return updates;
      } catch (parseError) {
        console.error('❌ Erreur lors du parsing des résultats npm outdated');
        console.error(parseError);
        return [];
      }
    }
    
    console.error('❌ Erreur lors de la vérification des mises à jour');
    console.error(error.message);
    return [];
  }
}

/**
 * Calculer le type de mise à jour (PATCH, MINOR, MAJOR)
 */
function calculateUpdateType(current: string, latest: string): 'PATCH' | 'MINOR' | 'MAJOR' {
  if (!current || !latest || current === 'unknown' || latest === 'unknown') {
    return 'PATCH';
  }
  
  const currentVersion = parseVersion(current);
  const latestVersion = parseVersion(latest);
  
  if (latestVersion.major > currentVersion.major) {
    return 'MAJOR';
  } else if (latestVersion.minor > currentVersion.minor) {
    return 'MINOR';
  } else {
    return 'PATCH';
  }
}

/**
 * Parser une version semver
 */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
  // Enlever les préfixes comme ^, ~, etc.
  const cleanVersion = version.replace(/^[\^~>=<]/, '');
  const parts = cleanVersion.split('.');
  
  return {
    major: parseInt(parts[0] || '0', 10),
    minor: parseInt(parts[1] || '0', 10),
    patch: parseInt(parts[2]?.split('-')[0] || '0', 10)
  };
}

/**
 * Catégoriser les mises à jour par type
 */
function categorizeUpdates(updates: PackageUpdate[]): {
  patch: PackageUpdate[];
  minor: PackageUpdate[];
  major: PackageUpdate[];
} {
  const patch: PackageUpdate[] = [];
  const minor: PackageUpdate[] = [];
  const major: PackageUpdate[] = [];
  
  for (const update of updates) {
    if (update.type === 'PATCH') {
      patch.push(update);
    } else if (update.type === 'MINOR') {
      minor.push(update);
    } else if (update.type === 'MAJOR') {
      major.push(update);
    }
  }
  
  return { patch, minor, major };
}

/**
 * Générer rapport structuré
 */
function generateReport(updates: PackageUpdate[]): UpdateReport {
  const categorized = categorizeUpdates(updates);
  
  return {
    timestamp: Date.now(),
    total: updates.length,
    patch: categorized.patch,
    minor: categorized.minor,
    major: categorized.major,
    packages: updates
  };
}

/**
 * Afficher le rapport dans la console
 */
function displayReport(report: UpdateReport): void {
  console.log('📊 RAPPORT DES MISES À JOUR DISPONIBLES\n');
  console.log(`Total: ${report.total} packages obsolètes\n`);
  
  if (report.patch.length > 0) {
    console.log(`🟢 PATCH (${report.patch.length}):`);
    for (const update of report.patch) {
      console.log(`   ${update.name}: ${update.current} → ${update.latest}`);
    }
    console.log('');
  }
  
  if (report.minor.length > 0) {
    console.log(`🟡 MINOR (${report.minor.length}):`);
    for (const update of report.minor) {
      console.log(`   ${update.name}: ${update.current} → ${update.latest}`);
    }
    console.log('');
  }
  
  if (report.major.length > 0) {
    console.log(`🔴 MAJOR (${report.major.length}):`);
    for (const update of report.major) {
      console.log(`   ${update.name}: ${update.current} → ${update.latest}`);
    }
    console.log('');
  }
  
  console.log('💡 Pour plus de détails, consultez:');
  console.log('   - docs/other/DEPENDENCY_UPDATE_STATUS.md');
  console.log('   - docs/other/DEPENDENCY_UPDATE_GUIDE.md');
  console.log('   - docs/other/DEPENDENCY_AUDIT.md\n');
}

/**
 * Sauvegarder le rapport dans un fichier JSON
 */
function saveReport(report: UpdateReport, outputPath: string = 'update-report.json'): void {
  try {
    writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`💾 Rapport sauvegardé dans: ${outputPath}\n`);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde du rapport');
    console.error(error);
  }
}

/**
 * Fonction principale
 */
function main(): void {
  console.log('====================================');
  console.log('  VÉRIFICATION DES MISES À JOUR');
  console.log('====================================\n');
  
  // 1. Vérifier mises à jour npm
  const updates = checkNpmUpdates();
  
  if (updates.length === 0) {
    console.log('✅ Aucune mise à jour disponible.\n');
    return;
  }
  
  // 2. Générer rapport
  const report = generateReport(updates);
  
  // 3. Afficher rapport
  displayReport(report);
  
  // 4. Sauvegarder rapport
  saveReport(report);
  
  console.log('✅ Vérification terminée!\n');
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkNpmUpdates, generateReport, displayReport, saveReport };

