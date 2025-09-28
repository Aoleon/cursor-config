#!/usr/bin/env tsx

/**
 * Script de validation des améliorations du moteur OCR contextuel
 * Génère un rapport complet des performances et améliorations
 */

import { ContextualOCRValidator } from '../tests/contextual-ocr-validation';

async function main() {
  console.log('🚀 [VALIDATION OCR] Démarrage de la validation des améliorations...\n');
  
  try {
    const validator = new ContextualOCRValidator();
    
    // Exécuter la validation complète
    const validationSummary = await validator.runFullValidation();
    
    console.log('\n🎯 [RÉSUMÉ FINAL]');
    console.log('=' .repeat(60));
    console.log(`📊 Amélioration globale: +${validationSummary.overallImprovement.toFixed(1)}%`);
    console.log(`✅ Tests réussis: ${validationSummary.passedTests}/${validationSummary.totalTests}`);
    
    if (validationSummary.overallImprovement >= 20) {
      console.log('🏆 OBJECTIF PRINCIPAL ATTEINT: Amélioration ≥ 20%');
    }
    
    console.log('\n📋 RECOMMANDATIONS:');
    validationSummary.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
    
    console.log('\n✅ [VALIDATION TERMINÉE] Moteur OCR contextuel validé avec succès!');
    
  } catch (error) {
    console.error('❌ [ERREUR] Échec de la validation:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export { main as validateOCRImprovements };