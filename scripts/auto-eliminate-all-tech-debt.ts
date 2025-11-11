#!/usr/bin/env tsx
/**
 * Script Maître - Élimination Complète Automatique de la Dette Technique
 * 
 * Exécute tous les outils automatiques en séquence:
 * 1. Détection complète de la dette technique
 * 2. Corrections automatiques simples
 * 3. Migration vers services consolidés
 * 4. Réduction fichiers monolithiques
 * 5. Rapport final consolidé
 * 
 * Usage: npm run eliminate:all-tech-debt
 */

import { execSync } from 'child_process';
import { join } from 'path';

// Logger simple
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
  success: (msg: string) => console.log(`\n✅ ${msg}\n`)
};

interface StepResult {
  step: string;
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Exécute une commande
 */
function runCommand(command: string, description: string): StepResult {
  logger.info(`🔄 ${description}...`);
  
  try {
    const output = execSync(command, { 
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    logger.success(`${description} - Succès`);
    return {
      step: description,
      success: true,
      output: output.toString()
    };
  } catch (error: any) {
    logger.error(`${description} - Erreur`, { error: error.message });
    return {
      step: description,
      success: false,
      output: error.stdout?.toString() || '',
      error: error.stderr?.toString() || error.message
    };
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 ÉLIMINATION COMPLÈTE AUTOMATIQUE DE LA DETTE TECHNIQUE');
  console.log('='.repeat(80) + '\n');

  const results: StepResult[] = [];

  // Étape 1: Détection complète
  results.push(runCommand(
    'npx tsx scripts/automated-tech-debt-eliminator.ts',
    'Détection complète dette technique'
  ));

  // Étape 2: Migration vers services consolidés
  results.push(runCommand(
    'npx tsx scripts/auto-migrate-to-consolidated-services.ts',
    'Migration vers services consolidés'
  ));

  // Étape 3: Réduction fichiers monolithiques (optionnel, peut être long)
  logger.info('⏭️  Réduction fichiers monolithiques (optionnel - peut être long)');
  logger.info('   Exécutez manuellement: npm run reduce:monolithic:auto');

  // Résumé final
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSUMÉ ÉLIMINATION DETTE TECHNIQUE');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Étapes réussies: ${successful.length}/${results.length}`);
  console.log(`❌ Étapes échouées: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\n✅ Étapes réussies:');
    successful.forEach(r => console.log(`   - ${r.step}`));
  }

  if (failed.length > 0) {
    console.log('\n❌ Étapes échouées:');
    failed.forEach(r => {
      console.log(`   - ${r.step}`);
      if (r.error) {
        console.log(`     Erreur: ${r.error.substring(0, 100)}...`);
      }
    });
  }

  console.log('\n📄 Rapports générés:');
  console.log('   - docs/optimization/AUTO_TECH_DEBT_REPORT.md');
  console.log('   - docs/optimization/AUTO_MIGRATION_CONSOLIDATED_SERVICES.md');
  console.log('   - docs/optimization/AUTO_REDUCTION_MONOLITHIC_REPORT.md (si exécuté)');

  console.log('\n' + '='.repeat(80));
  console.log('🎯 PROCHAINES ÉTAPES MANUELLES:');
  console.log('='.repeat(80));
  console.log('1. Réduire fichiers monolithiques: npm run reduce:monolithic:auto');
  console.log('2. Remplacer types any: npm run replace:any-to-unknown');
  console.log('3. Résoudre TODO/FIXME: npm run fix:todos');
  console.log('4. Vérifier tests: npm run check');
  console.log('='.repeat(80) + '\n');
}

main().catch(error => {
  logger.error('Erreur élimination dette technique', { error });
  process.exit(1);
});

