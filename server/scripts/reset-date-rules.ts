import { DateIntelligenceRulesSeeder } from "../seeders/dateIntelligenceRulesSeeder";

// Script pour réinitialiser les règles avec les valeurs corrigées
async function resetRules() {
  console.log("🔄 Réinitialisation des règles métier...");
  
  try {
    await DateIntelligenceRulesSeeder.resetAllRules();
    
    console.log("✅ Règles réinitialisées avec succès!");
    
    // Valider après reset
    const validation = await DateIntelligenceRulesSeeder.validateRulesConsistency();
    
    if (validation.isValid) {
      console.log("✅ VALIDATION RÉUSSIE - Aucune erreur détectée");
    } else {
      console.log("❌ VALIDATION ÉCHOUÉE:", validation.issues);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors du reset:", error);
    process.exit(1);
  }
}

resetRules();
