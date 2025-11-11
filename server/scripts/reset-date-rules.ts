import { DateIntelligenceRulesSeeder } from "../seeders/dateIntelligenceRulesSeeder";
import { withErrorHandling } from './utils/error-handler';
import { logger } from './utils/logger';

// Script pour réinitialiser les règles avec les valeurs corrigées
async function resetRules() {
  logger.info("🔄 Réinitialisation des règles métier...");
  
  return withErrorHandling(
    async () => {

    await DateIntelligenceRulesSeeder.resetAllRules();
    
    logger.info("✅ Règles réinitialisées avec succès!");
    
    // Valider après reset
    const validation = await DateIntelligenceRulesSeeder.validateRulesConsistency();
    
    if (validation.isValid) {
      logger.info("✅ VALIDATION RÉUSSIE - Aucune erreur détectée");
    } else {
      logger.info("❌ VALIDATION ÉCHOUÉE:", validation.issues);
    }
    
    process.exit(0);
  
    },
    {
      operation: 'resetRules',
      service: 'reset-date-rules',
      metadata: {

              }

            );
}

resetRules();
