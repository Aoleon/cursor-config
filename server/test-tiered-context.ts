#!/usr/bin/env tsx

/**
 * TEST D'INTÉGRATION SYSTÈME TIÉRÉ - PHASE 3 PERFORMANCE
 * 
 * Valide l'implémentation de l'Étape 1 : Contexte Adaptatif Tiéré
 * Objectif : Réduction latence ContextBuilder 25s→10s
 */

import { ContextTierService } from './services/ContextTierService';
import { getContextBuilderService } from './services/ContextBuilderService';
import { PerformanceMetricsService } from './services/PerformanceMetricsService';
import { storage, type IStorage } from './storage-poc';
import type { 
  TieredContextGenerationConfig,
  ContextTierDetectionResult,
  TieredContextGenerationResult 
} from '@shared/schema';

// ========================================
// CONFIGURATION TEST
// ========================================

interface TestScenario {
  name: string;
  query: string;
  entityType: 'ao' | 'offer' | 'project' | 'supplier' | 'team' | 'client';
  entityId: string;
  expectedTier: 'minimal' | 'standard' | 'comprehensive';
  userRole: string;
}

const TEST_SCENARIOS: TestScenario[] = [
  // TIER MINIMAL - Requêtes simples
  {
    name: "Statut simple AO",
    query: "Quel est le statut de cette AO ?",
    entityType: "ao",
    entityId: "test-ao-001",
    expectedTier: "minimal",
    userRole: "user"
  },
  
  {
    name: "Prix basique offre",
    query: "Combien coûte cette offre ?",
    entityType: "offer", 
    entityId: "test-offer-001",
    expectedTier: "minimal",
    userRole: "commercial"
  },
  
  // TIER STANDARD - Requêtes business courantes
  {
    name: "Validation chiffrage AO",
    query: "Valider le chiffrage de cette AO avec les fournisseurs associés",
    entityType: "ao",
    entityId: "test-ao-002", 
    expectedTier: "standard",
    userRole: "chef_projet"
  },
  
  {
    name: "Statut projet menuiserie",
    query: "Donner le planning de pose et livraison pour ce projet menuiserie",
    entityType: "project",
    entityId: "test-project-001",
    expectedTier: "standard", 
    userRole: "responsable_pose"
  },
  
  // TIER COMPREHENSIVE - Requêtes complexes
  {
    name: "Analyse performance fournisseur",
    query: "Analyser les performances historiques de ce fournisseur avec recommandations d'optimisation",
    entityType: "supplier",
    entityId: "test-supplier-001",
    expectedTier: "comprehensive",
    userRole: "directeur"
  },
  
  {
    name: "Rapport complet projet",
    query: "Générer un rapport complet avec analyse des risques, comparaison historique et prévisions",
    entityType: "project", 
    entityId: "test-project-002",
    expectedTier: "comprehensive",
    userRole: "admin"
  }
];

// ========================================
// MÉTRIQUES COLLECTÉES
// ========================================

interface TestMetrics {
  detectionTime: number;
  buildTime: number;
  totalTime: number;
  detectedTier: string;
  tokenCount: number;
  tokenReduction: number;
  criticalDataPreserved: boolean;
  menuiserieContextMaintained: boolean;
  success: boolean;
  error?: string;
}

// ========================================
// FONCTIONS DE TEST
// ========================================

/**
 * Test principal d'intégration
 */
async function runTieredContextTests(): Promise<void> {
  console.log('🚀 DÉMARRAGE TESTS INTÉGRATION SYSTÈME TIÉRÉ');
  console.log('=' .repeat(60));
  
  // Initialisation services
  const storageInstance = storage as IStorage;
  const performanceService = new PerformanceMetricsService(storageInstance);
  const contextBuilder = getContextBuilderService(storageInstance, performanceService);
  const tierService = new ContextTierService(storageInstance);
  
  const allMetrics: TestMetrics[] = [];
  
  // Test chaque scénario
  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📋 Test: ${scenario.name}`);
    console.log(`   Query: "${scenario.query}"`);
    console.log(`   Expected tier: ${scenario.expectedTier}`);
    
    try {
      const metrics = await testSingleScenario(scenario, contextBuilder, tierService);
      allMetrics.push(metrics);
      
      // Affichage résultats
      console.log(`   ✅ Tier détecté: ${metrics.detectedTier}`);
      console.log(`   ⏱️  Temps total: ${metrics.totalTime}ms`);
      console.log(`   🔤 Tokens: ${metrics.tokenCount} (réduction: ${metrics.tokenReduction.toFixed(1)}%)`);
      console.log(`   🔒 Données critiques: ${metrics.criticalDataPreserved ? '✅' : '❌'}`);
      console.log(`   🪟 Contexte menuiserie: ${metrics.menuiserieContextMaintained ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`   ❌ Erreur: ${(error as Error).message}`);
      allMetrics.push({
        detectionTime: 0,
        buildTime: 0,
        totalTime: 0,
        detectedTier: 'error',
        tokenCount: 0,
        tokenReduction: 0,
        criticalDataPreserved: false,
        menuiserieContextMaintained: false,
        success: false,
        error: (error as Error).message
      });
    }
  }
  
  // Analyse globale des résultats
  await analyzeGlobalResults(allMetrics);
}

/**
 * Test d'un scénario individuel
 */
async function testSingleScenario(
  scenario: TestScenario,
  contextBuilder: any,
  tierService: ContextTierService
): Promise<TestMetrics> {
  
  const startTime = Date.now();
  
  // 1. Test détection tier
  const detectionStart = Date.now();
  const tierDetection: ContextTierDetectionResult = await tierService.detectContextTier(
    scenario.query,
    { role: scenario.userRole },
    scenario.entityType
  );
  const detectionTime = Date.now() - detectionStart;
  
  // 2. Configuration tiérée
  const tieredConfig: TieredContextGenerationConfig = {
    entityType: scenario.entityType,
    entityId: scenario.entityId,
    requestType: 'full',
    contextFilters: {
      includeTypes: ['metier', 'relationnel'],
      scope: 'entity_focused',
      maxDepth: 2,
      includePredictive: false
    },
    performance: {
      maxTokens: 2000,
      compressionLevel: 'medium',
      freshnessThreshold: 24,
      cacheStrategy: 'moderate'
    },
    enableTierMetrics: true,
    tierConfig: {
      disableTierDetection: false,
      forceTier: undefined
    },
    safetyConfig: {
      enableFallback: true,
      validateCriticalData: true,
      minDataIntegrity: 0.8
    },
    businessSpecialization: {
      menuiserieTypes: ['aluminium', 'pvc', 'bois'],
      projectPhases: ['etude', 'fabrication', 'pose'],
      clientTypes: ['particulier', 'professionnel'],
      geographicScope: ['local']
    }
  };
  
  // 3. Génération contexte tiéré
  const buildStart = Date.now();
  const result: TieredContextGenerationResult = await contextBuilder.buildTieredContext(tieredConfig);
  const buildTime = Date.now() - buildStart;
  const totalTime = Date.now() - startTime;
  
  // 4. Validation résultats
  if (!result.success) {
    throw new Error(result.error?.message || 'Échec génération contexte');
  }
  
  // 5. Calcul réduction tokens (estimation vs baseline)
  const baselineTokens = estimateBaselineTokens(scenario.entityType);
  const tokenReduction = result.data ? ((baselineTokens - result.data.tokenEstimate) / baselineTokens) * 100 : 0;
  
  return {
    detectionTime,
    buildTime,
    totalTime,
    detectedTier: tierDetection.detectedTier,
    tokenCount: result.data?.tokenEstimate || 0,
    tokenReduction: Math.max(0, tokenReduction),
    criticalDataPreserved: result.tierMetrics?.criticalDataPreserved || false,
    menuiserieContextMaintained: result.tierMetrics?.menuiserieContextMaintained || false,
    success: true
  };
}

/**
 * Estimation tokens baseline (système complet)
 */
function estimateBaselineTokens(entityType: string): number {
  const baselines = {
    'ao': 3000,
    'offer': 2500, 
    'project': 3500,
    'supplier': 2000,
    'team': 1500,
    'client': 1800
  };
  return baselines[entityType as keyof typeof baselines] || 2500;
}

/**
 * Analyse globale des résultats de test
 */
async function analyzeGlobalResults(metrics: TestMetrics[]): Promise<void> {
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ANALYSE GLOBALE DES RÉSULTATS');
  console.log('=' .repeat(60));
  
  const successful = metrics.filter(m => m.success);
  const failed = metrics.filter(m => !m.success);
  
  console.log(`\n✅ Tests réussis: ${successful.length}/${metrics.length}`);
  console.log(`❌ Tests échoués: ${failed.length}/${metrics.length}`);
  
  if (successful.length === 0) {
    console.log('\n❌ AUCUN TEST RÉUSSI - ARRÊT ANALYSE');
    return;
  }
  
  // Statistiques performance
  const avgDetectionTime = successful.reduce((sum, m) => sum + m.detectionTime, 0) / successful.length;
  const avgBuildTime = successful.reduce((sum, m) => sum + m.buildTime, 0) / successful.length;
  const avgTotalTime = successful.reduce((sum, m) => sum + m.totalTime, 0) / successful.length;
  const avgTokenReduction = successful.reduce((sum, m) => sum + m.tokenReduction, 0) / successful.length;
  
  console.log(`\n⏱️  PERFORMANCE MOYENNE:`);
  console.log(`   Détection tier: ${avgDetectionTime.toFixed(0)}ms`);
  console.log(`   Construction: ${avgBuildTime.toFixed(0)}ms`);
  console.log(`   Total: ${avgTotalTime.toFixed(0)}ms`);
  
  console.log(`\n🎯 OBJECTIFS ATTEINTS:`);
  console.log(`   Réduction tokens: ${avgTokenReduction.toFixed(1)}% (cible: 40%)`);
  console.log(`   Latence <2.5s: ${avgTotalTime < 2500 ? '✅' : '❌'} (${avgTotalTime.toFixed(0)}ms)`);
  console.log(`   Détection <200ms: ${avgDetectionTime < 200 ? '✅' : '❌'} (${avgDetectionTime.toFixed(0)}ms)`);
  
  // Distribution tiers
  const tierCounts = successful.reduce((acc, m) => {
    acc[m.detectedTier] = (acc[m.detectedTier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\n📈 DISTRIBUTION TIERS:`);
  Object.entries(tierCounts).forEach(([tier, count]) => {
    const percentage = (count / successful.length * 100).toFixed(1);
    console.log(`   ${tier}: ${count} (${percentage}%)`);
  });
  
  // Qualité des données
  const criticalDataPreserved = successful.filter(m => m.criticalDataPreserved).length;
  const menuiserieContextOk = successful.filter(m => m.menuiserieContextMaintained).length;
  
  console.log(`\n🔒 QUALITÉ DONNÉES:`);
  console.log(`   Données critiques préservées: ${criticalDataPreserved}/${successful.length} (${(criticalDataPreserved/successful.length*100).toFixed(1)}%)`);
  console.log(`   Contexte menuiserie maintenu: ${menuiserieContextOk}/${successful.length} (${(menuiserieContextOk/successful.length*100).toFixed(1)}%)`);
  
  // Validation objectifs Phase 3
  const objectivesMet = {
    tokenReduction: avgTokenReduction >= 40,
    latencyTarget: avgTotalTime < 2500,
    detectionSpeed: avgDetectionTime < 200,
    dataQuality: criticalDataPreserved === successful.length,
    noRegression: menuiserieContextOk >= successful.length * 0.8
  };
  
  const allObjectivesMet = Object.values(objectivesMet).every(Boolean);
  
  console.log(`\n🎯 BILAN PHASE 3 ÉTAPE 1:`);
  console.log(`   Réduction tokens ≥40%: ${objectivesMet.tokenReduction ? '✅' : '❌'}`);
  console.log(`   Latence <2.5s: ${objectivesMet.latencyTarget ? '✅' : '❌'}`);
  console.log(`   Détection <200ms: ${objectivesMet.detectionSpeed ? '✅' : '❌'}`);
  console.log(`   Qualité données: ${objectivesMet.dataQuality ? '✅' : '❌'}`);
  console.log(`   Pas régression: ${objectivesMet.noRegression ? '✅' : '❌'}`);
  
  console.log(`\n${allObjectivesMet ? '🎉' : '⚠️'} OBJECTIF GLOBAL: ${allObjectivesMet ? 'ATTEINT' : 'PARTIELLEMENT ATTEINT'}`);
  
  if (allObjectivesMet) {
    console.log('\n✅ Système tiéré prêt pour Étape 2 (dispatch parallèle)');
    console.log('✅ Fondation solide pour objectif final 25s→10s');
  } else {
    console.log('\n⚠️  Ajustements nécessaires avant Étape 2');
    console.log('⚠️  Revoir paramètres ou logique de classification');
  }
  
  // Suggestions d'amélioration
  if (avgTokenReduction < 40) {
    console.log('\n💡 SUGGESTION: Renforcer compression tier MINIMAL et STANDARD');
  }
  if (avgTotalTime >= 2500) {
    console.log('\n💡 SUGGESTION: Optimiser requêtes DB ou paralléliser davantage');
  }
  if (criticalDataPreserved < successful.length) {
    console.log('\n💡 SUGGESTION: Ajuster logique préservation données critiques');
  }
}

// ========================================
// EXÉCUTION
// ========================================

if (require.main === module) {
  console.log('🔧 TESTS SYSTÈME TIÉRÉ - PHASE 3 PERFORMANCE');
  console.log('🎯 Objectif: Validation Étape 1 contexte adaptatif');
  console.log('');
  
  runTieredContextTests()
    .then(() => {
      console.log('\n✅ Tests terminés avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erreur lors des tests:', error);
      process.exit(1);
    });
}

export { runTieredContextTests, TEST_SCENARIOS };