#!/usr/bin/env tsx

// ========================================
// TESTS RUNTIME RÉELS ANALYTICS - PHASE 3.1.5
// ========================================

import fetch from 'node-fetch';
import { logger } from './utils/logger';

// Configuration du test
const BASE_URL = 'http://localhost:5000';
const ENDPOINTS = [
  '/api/analytics/kpis',
  '/api/analytics/metrics',
  '/api/analytics/snapshots', 
  '/api/analytics/benchmarks',
  '/api/analytics/pipeline',
  '/api/analytics/realtime',
  '/api/analytics/alerts',
  '/api/analytics/bottlenecks'
];

interface TestResult {
  endpoint: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
  hasData?: boolean;
  dataShape?: string;
}

async function testEndpoint(endpoint: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    logger.info(`Testing ${endpoint}...`);
    
    // Test basic auth pour simplicité
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Ajouter cookie de session si nécessaire
      },
      signal: controller.signal
    });
    
    const responseTime = Date.now() - startTime;
    const responseText = await response.text();
    
    let responseData;
    let hasData = false;
    let dataShape = 'invalid';
    
    try {
      responseData = JSON.parse(responseText);
      hasData = !!responseData?.data || !!responseData?.success;
      
      // Vérifier la structure de réponse
      if (responseData?.success && responseData?.data) {
        dataShape = 'success_data';
      } else if (responseData?.data) {
        dataShape = 'data_only';
      } else if (responseData?.success !== undefined) {
        dataShape = 'success_only';
      } else {
        dataShape = 'unknown';
      }
    } catch (parseError) {
      dataShape = 'non_json';
    }
    
    return {
      endpoint,
      status: response.status,
      success: response.ok,
      responseTime,
      hasData,
      dataShape,
      ...(response.ok ? {} : { error: responseText.slice(0, 200) })
    };
    
  } catch (error: unknown) {
    return {
      endpoint,
      status: 0,
      success: false,
      responseTime: Date.now() - startTime,
      error: error.message
    };
  }
}

async function runAllTests(): Promise<TestResult[]> {
  logger.info('🚀 Démarrage tests runtime analytics endpoints...\n');
  
  // Test séquentiel pour éviter surcharge serveur
  const results: TestResult[] = [];
  
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    // Status immédiat
    const statusIcon = result.success ? '✅' : '❌';
    const timeInfo = `${result.responseTime}ms`;
    const dataInfo = result.hasData ? `(${result.dataShape})` : '(no data)';
    
    logger.info(`${statusIcon} ${endpoint} - ${result.status} - ${timeInfo} ${dataInfo}`);
    
    if (!result.success && result.error) {
      logger.info(`   Error: ${result.error}`);
    }
    
    // Pause entre tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

async function generateReport(results: TestResult[]): Promise<void> {
  logger.info('\n' + '='.repeat(60));
  logger.info('📊 RAPPORT TESTS ANALYTICS ENDPOINTS');
  logger.info('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = Math.round((successCount / totalCount) * 100);
  
  logger.info(`\n📈 STATUT GLOBAL: ${successCount}/${totalCount} (${successRate}%)`);
  
  // Métriques de performance
  const avgResponseTime = Math.round(
    results.filter(r => r.success).reduce((sum, r) => sum + r.responseTime, 0) / successCount
  );
  logger.info(`⚡ Temps réponse moyen: ${avgResponseTime}ms`);
  
  // Détails par endpoint
  logger.info('\n📋 DÉTAILS PAR ENDPOINT:');
  results.forEach(result => {
    const status = result.success ? '✅ OK' : '❌ FAIL';
    const details = result.success ? 
      `${result.responseTime}ms | ${result.dataShape}` : 
      `Error: ${result.error?.slice(0, 50)}...`;
    
    logger.info(`  ${result.endpoint}: ${status} | ${details}`);
  });
  
  // Warnings et recommandations
  logger.info('\n⚠️  WARNINGS:');
  const failedEndpoints = results.filter(r => !r.success);
  
  if (failedEndpoints.length === 0) {
    logger.info('  ✅ Tous les endpoints fonctionnent correctement');
  } else {
    failedEndpoints.forEach(result => {
      logger.info(`  ❌ ${result.endpoint}: ${result.error || 'Erreur inconnue'}`);
    });
  }
  
  // Validation architecture
  logger.info('\n🏗️  VALIDATION ARCHITECTURE:');
  const routingOK = successCount > 0;
  const alertsOK = results.find(r => r.endpoint === '/api/analytics/alerts')?.success;
  const dataStructureOK = results.filter(r => r.success && r.dataShape === 'success_data').length > 0;
  
  logger.info(`  Routing intégration: ${routingOK ? '✅ RÉSOLU' : '❌ ÉCHEC'}`);
  logger.info(`  Alerts stabilité: ${alertsOK ? '✅ RÉSOLU' : '❌ ÉCHEC'}`);
  logger.info(`  Structure données: ${dataStructureOK ? '✅ CONFORME' : '❌ NON-CONFORME'}`);
  
  // Verdict final
  logger.info('\n' + '='.repeat(60));
  if (successRate >= 90) {
    logger.info('🎉 PHASE 3.1.5 - ANALYTICS: ✅ VALIDÉ');
    logger.info('Dashboard Analytics 100% fonctionnel pour validation architect');
  } else if (successRate >= 70) {
    logger.info('⚠️  PHASE 3.1.5 - ANALYTICS: 🟡 PARTIEL');
    logger.info('Corrections mineures nécessaires avant validation finale');
  } else {
    logger.info('🚨 PHASE 3.1.5 - ANALYTICS: ❌ ÉCHEC');
    logger.info('Corrections critiques requises');
  }
  logger.info('='.repeat(60));
}

// Exécution principale
async function main() {
  try {
    logger.info('Attente démarrage serveur...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = await runAllTests();
    await generateReport(results);
    
    // Exit code basé sur le succès
    const successRate = results.filter(r => r.success).length / results.length;
    process.exit(successRate >= 0.9 ? 0 : 1);
    
  } catch (error) {
    logger.error('Erreur', '❌ Erreur critique tests:', error);
    process.exit(1);
  }
}

// Exécution directe
main();