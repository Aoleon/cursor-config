/**
 * Test de Performance Phase 2 - Optimisations DB/Cache Chatbot IA
 * Objectif: Mesurer la réduction de temps de réponse de 25s vers 10s
 */

const API_BASE = 'http://localhost:5000';

// Configuration du test
const TEST_CONFIG = {
  iterations: 5,
  timeout: 30000, // 30s timeout
  complexQueries: [
    "Analysez tous les projets en retard avec leurs impacts financiers et proposez des solutions d'optimisation",
    "Générez un rapport complet sur les performances des fournisseurs avec analyse des délais de livraison",
    "Identifiez tous les risques techniques des AO actifs et proposez des mesures préventives",
    "Analysez la rentabilité de tous les projets menuiserie avec détails des coûts matériaux",
    "Créez un planning optimisé pour tous les projets en cours avec gestion des ressources"
  ],
  simpleQueries: [
    "Quel est le statut du projet P2024-001?",
    "Montrez-moi les AO disponibles",
    "Quels sont les prochains jalons?",
    "Liste des projets actifs",
    "Statut des livraisons en cours"
  ]
};

// Variable globale pour stocker le cookie de session
let sessionCookie = null;

// Fonction d'authentification basic auth
async function authenticateBasicAuth() {
  try {
    console.log('🔐 Authentification basic auth...');
    
    const response = await fetch(`${API_BASE}/api/login/basic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin'
      })
    });

    if (response.ok) {
      // Récupérer le cookie de session
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        sessionCookie = setCookieHeader.split(';')[0];
        console.log('✅ Authentification réussie');
        return true;
      }
    }
    
    console.log(`❌ Échec authentification: HTTP ${response.status}`);
    return false;
  } catch (error) {
    console.log(`💥 Erreur authentification: ${error.message}`);
    return false;
  }
}

// Fonction pour mesurer le temps de réponse
async function measureResponseTime(query, iteration = 1) {
  const startTime = Date.now();
  
  try {
    console.log(`\n🚀 [Iteration ${iteration}] Test: "${query.substring(0, 60)}..."`);
    
    const response = await fetch(`${API_BASE}/api/chatbot/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {})
      },
      credentials: 'include',
      body: JSON.stringify({
        query,
        options: {
          scope: 'comprehensive',
          enableCache: true,
          enablePerformanceTracking: true,
          responseFormat: 'structured'
        }
      })
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`✅ Succès - Temps de réponse: ${responseTime}ms`);
      
      // Extraction des métriques de performance si disponibles
      if (data.performance) {
        console.log(`📊 Métriques détaillées:`);
        console.log(`   - Tables interrogées: ${data.performance.tablesQueried?.length || 'N/A'}`);
        console.log(`   - Utilisation cache: ${data.performance.cacheHitRate ? (data.performance.cacheHitRate * 100).toFixed(1) + '%' : 'N/A'}`);
        console.log(`   - Fraîcheur données: ${data.performance.dataFreshness ? (data.performance.dataFreshness * 100).toFixed(1) + '%' : 'N/A'}`);
        console.log(`   - Temps exécution: ${data.performance.executionTimeMs || responseTime}ms`);
      }
      
      return {
        success: true,
        responseTime,
        query,
        iteration,
        performance: data.performance || null,
        cacheHit: data.performance?.cacheHitRate > 0,
        dataSize: JSON.stringify(data).length
      };
    } else {
      console.log(`❌ Erreur HTTP ${response.status}`);
      return {
        success: false,
        responseTime,
        query,
        iteration,
        error: `HTTP ${response.status}`,
        performance: null
      };
    }
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    console.log(`💥 Erreur: ${error.message}`);
    return {
      success: false,
      responseTime,
      query,
      iteration,
      error: error.message,
      performance: null
    };
  }
}

// Test des métriques de santé du système
async function testSystemHealth() {
  console.log('\n🏥 Test de santé du système...');
  
  try {
    const response = await fetch(`${API_BASE}/api/chatbot/health`, {
      credentials: 'include',
      headers: {
        ...(sessionCookie ? { 'Cookie': sessionCookie } : {})
      }
    });
    
    if (response.ok) {
      const health = await response.json();
      console.log('✅ Système opérationnel');
      console.log('📋 État des services:', JSON.stringify(health, null, 2));
      return health;
    } else {
      console.log(`❌ Santé système: HTTP ${response.status}`);
      return null;
    }
  } catch (error) {
    console.log(`💥 Erreur santé système: ${error.message}`);
    return null;
  }
}

// Calcul des statistiques de performance
function calculateStats(results) {
  const successfulResults = results.filter(r => r.success);
  const failedResults = results.filter(r => !r.success);
  
  if (successfulResults.length === 0) {
    return {
      success: false,
      message: 'Aucun test réussi'
    };
  }
  
  const responseTimes = successfulResults.map(r => r.responseTime);
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const minResponseTime = Math.min(...responseTimes);
  const maxResponseTime = Math.max(...responseTimes);
  
  // Calcul des métriques de cache
  const cacheHits = successfulResults.filter(r => r.cacheHit).length;
  const cacheHitRate = successfulResults.length > 0 ? (cacheHits / successfulResults.length) * 100 : 0;
  
  // Objectif de performance (10s = 10000ms)
  const performanceTarget = 10000;
  const targetAchieved = avgResponseTime <= performanceTarget;
  
  return {
    success: true,
    totalTests: results.length,
    successfulTests: successfulResults.length,
    failedTests: failedResults.length,
    avgResponseTime: Math.round(avgResponseTime),
    minResponseTime,
    maxResponseTime,
    cacheHitRate: Math.round(cacheHitRate * 10) / 10,
    performanceTarget,
    targetAchieved,
    improvementNeeded: targetAchieved ? 0 : Math.round(avgResponseTime - performanceTarget),
    performanceGrade: avgResponseTime <= 5000 ? 'A' : 
                     avgResponseTime <= 10000 ? 'B' : 
                     avgResponseTime <= 15000 ? 'C' : 
                     avgResponseTime <= 25000 ? 'D' : 'F'
  };
}

// Fonction principale de test
async function runPerformanceTest() {
  console.log('🎯 DÉBUT DES TESTS DE PERFORMANCE PHASE 2');
  console.log('=' .repeat(60));
  console.log('Objectif: Réduire temps de réponse de 25s vers 10s');
  console.log('Optimisations testées: DB index + cache intelligent + prewarming');
  console.log('=' .repeat(60));
  
  // Authentification d'abord
  const authSuccess = await authenticateBasicAuth();
  if (!authSuccess) {
    console.log('\n❌ ARRÊT: Échec de l\'authentification');
    return;
  }
  
  // Test de santé du système
  const systemHealth = await testSystemHealth();
  
  if (!systemHealth || !systemHealth.success) {
    console.log('\n❌ ARRÊT: Système non opérationnel');
    return;
  }
  
  // Attendre un peu pour que le système se stabilise
  console.log('\n⏳ Stabilisation du système...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const allResults = [];
  
  // Test des requêtes complexes (objectif principal)
  console.log('\n🔥 PHASE 1: Tests requêtes complexes (objectif 10s)');
  console.log('-' .repeat(50));
  
  for (let i = 0; i < TEST_CONFIG.iterations; i++) {
    for (const query of TEST_CONFIG.complexQueries) {
      const result = await measureResponseTime(query, i + 1);
      allResults.push({ ...result, queryType: 'complex' });
      
      // Délai entre les requêtes pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Test des requêtes simples (performance baseline)
  console.log('\n⚡ PHASE 2: Tests requêtes simples (baseline)');
  console.log('-' .repeat(50));
  
  for (let i = 0; i < Math.min(TEST_CONFIG.iterations, 2); i++) {
    for (const query of TEST_CONFIG.simpleQueries.slice(0, 3)) {
      const result = await measureResponseTime(query, i + 1);
      allResults.push({ ...result, queryType: 'simple' });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Analyse des résultats
  console.log('\n📊 ANALYSE DES RÉSULTATS');
  console.log('=' .repeat(60));
  
  const complexResults = allResults.filter(r => r.queryType === 'complex');
  const simpleResults = allResults.filter(r => r.queryType === 'simple');
  
  const complexStats = calculateStats(complexResults);
  const simpleStats = calculateStats(simpleResults);
  
  console.log('\n🔥 REQUÊTES COMPLEXES (Objectif principal):');
  if (complexStats.success) {
    console.log(`   ⏱️  Temps moyen: ${complexStats.avgResponseTime}ms`);
    console.log(`   🎯 Objectif (10s): ${complexStats.targetAchieved ? '✅ ATTEINT' : '❌ NON ATTEINT'}`);
    console.log(`   📈 Note performance: ${complexStats.performanceGrade}`);
    console.log(`   🏆 Cache hit rate: ${complexStats.cacheHitRate}%`);
    console.log(`   📊 Tests réussis: ${complexStats.successfulTests}/${complexStats.totalTests}`);
    
    if (!complexStats.targetAchieved) {
      console.log(`   ⚠️  Amélioration nécessaire: -${complexStats.improvementNeeded}ms`);
    }
  }
  
  console.log('\n⚡ REQUÊTES SIMPLES (Baseline):');
  if (simpleStats.success) {
    console.log(`   ⏱️  Temps moyen: ${simpleStats.avgResponseTime}ms`);
    console.log(`   📈 Note performance: ${simpleStats.performanceGrade}`);
    console.log(`   🏆 Cache hit rate: ${simpleStats.cacheHitRate}%`);
  }
  
  // Verdict final
  console.log('\n🏁 VERDICT FINAL PHASE 2');
  console.log('=' .repeat(60));
  
  if (complexStats.success && complexStats.targetAchieved) {
    console.log('🎉 SUCCÈS! Objectif de performance ATTEINT');
    console.log(`✅ Temps de réponse réduit à ${complexStats.avgResponseTime}ms (< 10s)`);
    console.log('🚀 Optimisations DB/Cache efficaces');
  } else if (complexStats.success) {
    const reductionPercent = Math.round(((25000 - complexStats.avgResponseTime) / 25000) * 100);
    console.log(`📊 PROGRÈS: ${reductionPercent}% de réduction depuis 25s`);
    console.log(`⏳ Temps actuel: ${complexStats.avgResponseTime}ms`);
    console.log('🔧 Optimisations supplémentaires recommandées');
  } else {
    console.log('❌ ÉCHEC: Tests de performance non concluants');
  }
  
  console.log('\n📋 RECOMMANDATIONS:');
  if (complexStats.cacheHitRate < 70) {
    console.log('🔧 Améliorer le prewarming de cache (objectif: >70%)');
  }
  if (complexStats.avgResponseTime > 10000) {
    console.log('🗄️ Optimiser davantage les requêtes DB avec index additionnels');
  }
  if (complexStats.failedTests > 0) {
    console.log('🐛 Résoudre les erreurs de stabilité du système');
  }
  
  console.log('\n🔗 Pour plus de détails, consultez les métriques PerformanceMetricsService');
  console.log('📊 Dashboards disponibles: /api/chatbot/stats');
  
  return {
    complex: complexStats,
    simple: simpleStats,
    allResults
  };
}

// Exécution du test
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runPerformanceTest, measureResponseTime };
} else {
  // Exécution directe
  runPerformanceTest().then(() => {
    console.log('\n✅ Tests de performance terminés');
  }).catch(error => {
    console.error('\n💥 Erreur lors des tests:', error);
  });
}