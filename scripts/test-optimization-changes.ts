#!/usr/bin/env tsx

/**
 * Script de test pour valider les changements d'optimisation
 * Teste que withRetry fonctionne correctement dans database-helpers
 */

import { withRetry } from '../server/utils/retry-helper';
import { withTransaction } from '../server/utils/database-helpers';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { logger } from '../server/utils/logger';

async function testWithRetry() {
  logger.info('Test withRetry basique');
  
  let attempts = 0;
  const result = await withRetry(
    async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Test error');
      }
      return 'success';
    },
    {
      maxRetries: 3,
      initialDelay: 10, // Rapide pour les tests
    }
  );
  
  console.log(`✅ withRetry test: ${result} (${attempts} attempts)`);
  return attempts === 2;
}

async function testWithTransaction() {
  logger.info('Test withTransaction avec withRetry');
  
  try {
    const result = await withTransaction(async (tx) => {
      // Simple query pour tester
      await tx.execute(sql`SELECT 1`);
      return 'transaction-success';
    });
    
    console.log(`✅ withTransaction test: ${result}`);
    return true;
  } catch (error) {
    console.error(`❌ withTransaction test failed:`, error);
    return false;
  }
}

async function testErrorHandling() {
  logger.info('Test gestion erreurs avec withRetry');
  
  try {
    await withRetry(
      async () => {
        throw new Error('Non-retryable error');
      },
      {
        maxRetries: 2,
        initialDelay: 10,
        retryCondition: () => false, // Ne jamais retry
      }
    );
    console.log(`❌ Should have thrown error`);
    return false;
  } catch (error) {
    console.log(`✅ Error correctly thrown: ${error instanceof Error ? error.message : String(error)}`);
    return true;
  }
}

async function main() {
  console.log('🧪 Tests de validation des changements d\'optimisation\n');
  
  const results = {
    withRetry: false,
    withTransaction: false,
    errorHandling: false,
  };
  
  try {
    results.withRetry = await testWithRetry();
  } catch (error) {
    console.error('❌ withRetry test error:', error);
  }
  
  try {
    results.withTransaction = await testWithTransaction();
  } catch (error) {
    console.error('❌ withTransaction test error:', error);
  }
  
  try {
    results.errorHandling = await testErrorHandling();
  } catch (error) {
    console.error('❌ errorHandling test error:', error);
  }
  
  console.log('\n📊 Résultats:');
  console.log(`  withRetry: ${results.withRetry ? '✅' : '❌'}`);
  console.log(`  withTransaction: ${results.withTransaction ? '✅' : '❌'}`);
  console.log(`  errorHandling: ${results.errorHandling ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log('\n✅ Tous les tests passent!');
    process.exit(0);
  } else {
    console.log('\n❌ Certains tests ont échoué');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});

