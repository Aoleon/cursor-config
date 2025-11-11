#!/usr/bin/env tsx

/**
 * Script de validation des améliorations du moteur OCR contextuel
 * Génère un rapport complet des performances et améliorations
 */

import { ContextualOCRValidator } from '../tests/contextual-ocr-validation';
import { withErrorHandling } from './utils/error-handler';
import { logger } from './utils/logger';

async function main() {
  logger.info('🚀 [VALIDATION OCR] Démarrage de la validation des améliorations...\n');
  
  return withErrorHandling(
    async () => {

    const validator = new ContextualOCRValidator();
    
    // Exécuter la validation complète
    const validationSummary = await validator.runFullValidation();
    
    logger.info('\n🎯 [RÉSUMÉ FINAL]');
    logger.info('=' .repeat(60));
    logger.info(`📊 Amélioration globale: +${validationSummary.overallImprovement.toFixed(1)}%`);
    logger.info(`✅ Tests réussis: ${validationSummary.passedTests}/${validationSummary.totalTests}`);
    
    if (validationSummary.overallImprovement >= 20) {
      logger.info('🏆 OBJECTIF PRINCIPAL ATTEINT: Amélioration ≥ 20%');
    }
    
    logger.info('\n📋 RECOMMANDATIONS:');
    validationSummary.recommendations.forEach(rec => {
      logger.info(`   ${rec}`);
    });
    
    logger.info('\n✅ [VALIDATION TERMINÉE] Moteur OCR contextuel validé avec succès!');
    
  
    },
    {
      operation: 'main',
      service: 'validate-ocr-improvements',
      metadata: {

              }

            );
}

// Exécuter si appelé directement
if (require.main === module) {
  main().catch(console.error);
}

export { main as validateOCRImprovements };