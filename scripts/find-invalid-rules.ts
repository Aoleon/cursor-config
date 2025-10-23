#!/usr/bin/env tsx
/**
 * Script pour trouver les règles DateIntelligence avec durée base invalide
 */

import { getDefaultRules } from '../server/seeders/dateIntelligenceRulesSeeder';

async function findInvalidRules() {
  console.log('🔍 Recherche des règles DateIntelligence invalides...\n');
  
  const allRules = getDefaultRules();
  
  // Règles avec durée base invalide (≤ 0)
  const invalidDurationRules = allRules.filter(rule => 
    rule.baseDuration !== null && rule.baseDuration !== undefined && rule.baseDuration <= 0
  );
  
  if (invalidDurationRules.length === 0) {
    console.log('✅ Aucune règle avec durée base invalide trouvée');
    return;
  }
  
  console.log(`❌ ${invalidDurationRules.length} règles avec durée base invalide (≤ 0):\n`);
  
  invalidDurationRules.forEach((rule, index) => {
    console.log(`${index + 1}. ${rule.name}`);
    console.log(`   baseDuration: ${rule.baseDuration}`);
    console.log(`   phase: ${rule.phase}`);
    console.log(`   priority: ${rule.priority}`);
    console.log();
  });
}

// Exécution
findInvalidRules()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
