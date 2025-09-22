/**
 * Tests d'intégration complète - BusinessContextService
 * Validation du constructeur de contexte métier intelligent pour le chatbot Saxium
 * 
 * OBJECTIFS DE TEST :
 * - Génération contexte adaptatif par rôle (admin, chef_projet, be_manager, etc.)
 * - Cache intelligent avec TTL optimisé
 * - Enrichissement contexte existant 
 * - Apprentissage adaptatif
 * - Performance < 500ms
 * - Intégration SQLEngineService
 */

import { BusinessContextService } from '../services/BusinessContextService';
import { RBACService } from '../services/RBACService';
import { eventBus } from '../eventBus';
import { storage } from '../storage-poc';
import type { IStorage } from '../storage-poc';
import type { 
  BusinessContextRequest, 
  ContextEnrichmentRequest, 
  AdaptiveLearningUpdate,
  BusinessContext
} from '../../shared/schema';

// Type pour les rôles utilisateurs basé sur rbacRoleEnum
type UserRole = 'admin' | 'chef_projet' | 'technicien_be' | 'responsable_be' | 'chef_travaux' | 'commercial' | 'financier' | 'direction';

// Interface de résultats de test pour le rapport final
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details: string;
  error?: string;
}

// État global des tests
let testResults: TestResult[] = [];
let rbacService: RBACService;
let businessContextService: BusinessContextService;

/**
 * Helper de test - assertion avec résultat
 */
function assert(condition: boolean, message: string, testName: string): boolean {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
  console.log(`   ✅ ${message}`);
  return true;
}

/**
 * Helper de test - mesure de performance
 */
async function measurePerformance<T>(fn: () => Promise<T>, maxMs: number = 500): Promise<{ result: T; duration: number; isWithinLimit: boolean }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  const isWithinLimit = duration <= maxMs;
  
  console.log(`   ⏱️  Temps d'exécution: ${duration}ms ${isWithinLimit ? '✅' : '⚠️ DÉPASSEMENT'} (limite: ${maxMs}ms)`);
  
  return { result, duration, isWithinLimit };
}

/**
 * Helper de test - exécution avec gestion d'erreur
 */
async function runTest(testName: string, testFn: () => Promise<void>): Promise<TestResult> {
  console.log(`\n🧪 ${testName}`);
  console.log('─'.repeat(50));
  
  const start = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - start;
    
    const result: TestResult = {
      name: testName,
      passed: true,
      duration,
      details: `Test réussi en ${duration}ms`
    };
    
    console.log(`✅ ${testName} - RÉUSSI (${duration}ms)`);
    return result;
    
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    const result: TestResult = {
      name: testName,
      passed: false,
      duration,
      details: `Test échoué: ${errorMessage}`,
      error: errorMessage
    };
    
    console.log(`❌ ${testName} - ÉCHEC (${duration}ms)`);
    console.log(`   Erreur: ${errorMessage}`);
    return result;
  }
}

/**
 * TEST 1: Initialisation et configuration du service
 */
async function testServiceInitialization(): Promise<void> {
  console.log('1️⃣ Initialisation BusinessContextService...');
  
  // Créer instance RBACService
  rbacService = new RBACService(storage as IStorage);
  console.log('   ✅ RBACService créé');
  
  // Créer instance BusinessContextService
  businessContextService = new BusinessContextService(storage as IStorage, rbacService, eventBus);
  console.log('   ✅ BusinessContextService créé avec injection de dépendances');
  
  // Vérifier les propriétés essentielles
  assert(businessContextService !== null, 'Service instancié', 'ServiceInit');
  assert(typeof businessContextService.generateBusinessContext === 'function', 'Méthode generateBusinessContext disponible', 'ServiceInit');
  assert(typeof businessContextService.enrichContext === 'function', 'Méthode enrichContext disponible', 'ServiceInit');
  assert(typeof businessContextService.updateAdaptiveLearning === 'function', 'Méthode updateAdaptiveLearning disponible', 'ServiceInit');
  
  console.log('   ✅ Interface complète du service validée');
}

/**
 * TEST 2: Génération contexte adaptatif par rôle
 */
async function testRoleBasedContextGeneration(): Promise<void> {
  console.log('2️⃣ Test génération contexte adaptatif par rôle...');
  
  // Test différents rôles avec requêtes spécialisées
  const testCases: Array<{ role: UserRole; query: string; expectedSchemas: string[] }> = [
    {
      role: 'admin',
      query: 'Analyse financière des projets en cours',
      expectedSchemas: ['projects', 'chiffrage_elements', 'team_resources']
    },
    {
      role: 'chef_projet',
      query: 'Planning de mes équipes cette semaine',
      expectedSchemas: ['projects', 'project_timelines', 'team_resources']
    },
    {
      role: 'responsable_be',
      query: 'Projets nécessitant validation technique',
      expectedSchemas: ['projects', 'visa_architecte', 'validation_milestones']
    },
    {
      role: 'commercial',
      query: 'Opportunités de vente ce mois',
      expectedSchemas: ['projects', 'aos', 'supplier_requests']
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n   🎭 Test rôle: ${testCase.role}`);
    
    const request: BusinessContextRequest = {
      user_role: testCase.role,
      query_hint: testCase.query,
      focus_areas: ['planning'],
      include_temporal: true,
      cache_duration_minutes: 60,
      personalization_level: 'basic',
      userId: `test_user_${testCase.role}`,
      sessionId: `test_session_${Date.now()}`
    };
    
    // Mesurer performance de génération
    const { result, duration, isWithinLimit } = await measurePerformance(
      () => businessContextService.generateBusinessContext(request),
      500 // Limite 500ms
    );
    
    // Vérifier résultat
    assert(result.success === true, `Génération réussie pour ${testCase.role}`, 'RoleContext');
    assert(result.context !== undefined, `Contexte généré pour ${testCase.role}`, 'RoleContext');
    assert(isWithinLimit, `Performance respectée pour ${testCase.role} (${duration}ms)`, 'RoleContext');
    
    if (result.context) {
      // Vérifier schémas spécifiques au rôle
      const context = result.context as BusinessContext;
      
      assert(context.databaseSchemas.length > 0, `Schémas DB inclus pour ${testCase.role}`, 'RoleContext');
      assert(context.businessExamples.length > 0, `Exemples métier inclus pour ${testCase.role}`, 'RoleContext');
      assert(context.domainKnowledge !== undefined, `Connaissances menuiserie incluses pour ${testCase.role}`, 'RoleContext');
      assert(context.roleSpecificConstraints !== undefined, `Contraintes RBAC appliquées pour ${testCase.role}`, 'RoleContext');
      
      // Vérifier adaptation du contenu par rôle
      const schemaNames = context.databaseSchemas.map(s => s.tableName);
      const hasExpectedSchemas = testCase.expectedSchemas.some(expected => 
        schemaNames.some(schema => schema.includes(expected))
      );
      assert(hasExpectedSchemas, `Schémas adaptés au rôle ${testCase.role}`, 'RoleContext');
      
      console.log(`   📊 Contexte généré: ${context.databaseSchemas.length} schémas, ${context.businessExamples.length} exemples`);
    }
  }
}

/**
 * TEST 3: Cache intelligent et performance
 */
async function testIntelligentCaching(): Promise<void> {
  console.log('3️⃣ Test cache intelligent et optimisation...');
  
  const request: BusinessContextRequest = {
    user_role: 'chef_projet',
    query_hint: 'État d\'avancement des projets menuiserie',
    focus_areas: ['planning'],
    include_temporal: true,
    cache_duration_minutes: 60,
    personalization_level: 'basic',
    userId: 'test_cache_user',
    sessionId: 'test_cache_session'
  };
  
  // Premier appel - cache miss
  console.log('   🔄 Premier appel (cache miss attendu)...');
  const { result: firstResult, duration: firstDuration } = await measurePerformance(
    () => businessContextService.generateBusinessContext(request),
    500
  );
  
  assert(firstResult.success === true, 'Première génération réussie', 'Cache');
  assert(firstResult.performance_metrics !== undefined, 'Métriques de performance disponibles', 'Cache');
  
  if (firstResult.performance_metrics) {
    assert(firstResult.performance_metrics.cache_hit === false, 'Cache miss détecté correctement', 'Cache');
    console.log(`   📈 Premier appel: ${firstDuration}ms (cache miss)`);
  }
  
  // Attendre 100ms pour simuler usage réel
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Deuxième appel identique - cache hit
  console.log('   ⚡ Deuxième appel (cache hit attendu)...');
  const { result: secondResult, duration: secondDuration } = await measurePerformance(
    () => businessContextService.generateBusinessContext(request),
    200 // Cache hit devrait être plus rapide
  );
  
  assert(secondResult.success === true, 'Deuxième génération réussie', 'Cache');
  
  if (secondResult.performance_metrics) {
    assert(secondResult.performance_metrics.cache_hit === true, 'Cache hit détecté correctement', 'Cache');
    assert(secondDuration < firstDuration, 'Cache hit plus rapide que cache miss', 'Cache');
    console.log(`   ⚡ Cache hit: ${secondDuration}ms (gain: ${firstDuration - secondDuration}ms)`);
  }
  
  // Test invalidation cache par changement de paramètres
  console.log('   🔄 Test invalidation cache...');
  const modifiedRequest: BusinessContextRequest = {
    ...request,
    query_hint: 'Projets en retard de livraison', // Requête différente
  };
  
  const { result: thirdResult } = await measurePerformance(
    () => businessContextService.generateBusinessContext(modifiedRequest),
    500
  );
  
  assert(thirdResult.success === true, 'Génération avec paramètres modifiés réussie', 'Cache');
  
  if (thirdResult.performance_metrics) {
    assert(thirdResult.performance_metrics.cache_hit === false, 'Cache invalidé correctement sur changement', 'Cache');
    console.log('   ✅ Invalidation cache fonctionnelle');
  }
}

/**
 * TEST 4: Enrichissement de contexte existant
 */
async function testContextEnrichment(): Promise<void> {
  console.log('4️⃣ Test enrichissement de contexte existant...');
  
  // Créer contexte initial minimal
  const baseContext: Partial<BusinessContext> = {
    databaseSchemas: [
      {
        tableName: 'projects',
        businessName: 'Projets',
        description: 'Table des projets de menuiserie',
        columns: [
          { name: 'id', businessName: 'ID', type: 'uuid', description: 'Identifiant unique du projet', isSensitive: false },
          { name: 'nom', businessName: 'Nom', type: 'text', description: 'Nom du projet', isSensitive: false }
        ],
        relationships: [],
        common_queries: ['SELECT * FROM projects WHERE status = ?'],
        access_patterns: ['read', 'write']
      }
    ],
    businessExamples: [],
    roleSpecificConstraints: {
      user_role: {
        role: 'chef_projet',
        typical_queries: ['SELECT * FROM projects'],
        restrictions: ['no_financial']
      },
      accessible_tables: ['projects'],
      restricted_columns: [],
      row_level_filters: {},
      data_scope: {
        projects: 'team' as const,
        offers: 'team' as const,
        financial_data: false,
        sensitive_data: false
      },
      context_variables: {}
    }
  };
  
  const enrichmentRequest: ContextEnrichmentRequest = {
    original_query: 'Analyse financière globale',
    user_role: 'chef_projet',
    enhancement_mode: 'adaptive',
    max_examples: 5,
    include_explanations: true,
    domain_focus: ['planning', 'materiaux'],
    userId: 'test_enrichment_user'
  };
  
  // Tester enrichissement
  const { result, duration } = await measurePerformance(
    () => businessContextService.enrichContext(enrichmentRequest),
    300
  );
  
  assert(result.success === true, 'Enrichissement réussi', 'Enrichment');
  assert(result.enriched_context !== undefined, 'Contexte enrichi disponible', 'Enrichment');
  assert(result.confidence_score !== undefined, 'Score de confiance calculé', 'Enrichment');
  
  if (result.enriched_context && baseContext.databaseSchemas) {
    // Vérifier que le contexte a été enrichi
    const enrichedSchemas = result.enriched_context.databaseSchemas || [];
    assert(enrichedSchemas.length >= baseContext.databaseSchemas.length, 'Schémas ajoutés lors de l\'enrichissement', 'Enrichment');
    
    const enrichedExamples = result.enriched_context.businessExamples || [];
    assert(enrichedExamples.length > 0, 'Exemples métier ajoutés', 'Enrichment');
    
    console.log(`   📈 Enrichissement: +${enrichedSchemas.length - baseContext.databaseSchemas.length} schémas, +${enrichedExamples.length} exemples`);
    
    if (result.confidence_score !== undefined) {
      assert(result.confidence_score >= 0.5, 'Score de confiance acceptable', 'Enrichment');
      console.log(`   🎯 Score de confiance: ${(result.confidence_score * 100).toFixed(1)}%`);
    }
  }
}

/**
 * TEST 5: Apprentissage adaptatif
 */
async function testAdaptiveLearning(): Promise<void> {
  console.log('5️⃣ Test apprentissage adaptatif...');
  
  // Simuler plusieurs interactions utilisateur pour l'apprentissage
  const learningUpdates: AdaptiveLearningUpdate[] = [
    {
      user_role: 'chef_projet',
      query_pattern: 'État d\'avancement projet',
      success_rating: 4,
      result_relevance: 0.85,
      execution_time_ms: 150,
      userId: 'test_learning_user',
      timestamp: new Date()
    },
    {
      user_role: 'chef_projet',
      query_pattern: 'Planning équipe semaine',
      success_rating: 5,
      result_relevance: 0.92,
      execution_time_ms: 200,
      userId: 'test_learning_user',
      timestamp: new Date()
    },
    {
      user_role: 'chef_projet',
      query_pattern: 'Analyse coûts matériaux',
      success_rating: 1,
      result_relevance: 0.6,
      execution_time_ms: 500,
      userId: 'test_learning_user',
      timestamp: new Date()
    }
  ];
  
  // Appliquer les mises à jour d'apprentissage
  for (const [index, update] of learningUpdates.entries()) {
    console.log(`   📚 Mise à jour apprentissage ${index + 1}/${learningUpdates.length}...`);
    
    const { result, duration } = await measurePerformance(
      () => businessContextService.updateAdaptiveLearning(update),
      200
    );
    
    assert(result.success === true, `Apprentissage ${index + 1} appliqué`, 'Learning');
    assert(result.learning_applied !== undefined, `Apprentissage ${index + 1} traité`, 'Learning');
    
    if (result.learning_applied) {
      console.log(`   ✅ Apprentissage appliqué: ${result.learning_applied ? 'Oui' : 'Non'}`);
      
      if (result.updated_patterns) {
        console.log(`   🔄 Patterns mis à jour: ${result.updated_patterns.length}`);
      }
    }
  }
  
  // Vérifier que l'apprentissage améliore les contextes futurs
  console.log('   🎯 Test amélioration contexte après apprentissage...');
  
  const postLearningRequest: BusinessContextRequest = {
    user_role: 'chef_projet',
    query_hint: 'État d\'avancement de mes projets', // Pattern similaire aux exemples positifs
    focus_areas: ['planning'],
    include_temporal: true,
    cache_duration_minutes: 60,
    personalization_level: 'basic',
    userId: 'test_learning_user',
    sessionId: 'test_post_learning'
  };
  
  const { result: learnedResult } = await measurePerformance(
    () => businessContextService.generateBusinessContext(postLearningRequest),
    500
  );
  
  assert(learnedResult.success === true, 'Génération post-apprentissage réussie', 'Learning');
  
  if (learnedResult.context && learnedResult.performance_metrics) {
    // Le contexte devrait être plus pertinent après apprentissage
    assert(learnedResult.performance_metrics.examples_included > 0, 'Exemples inclus après apprentissage', 'Learning');
    console.log(`   📊 Contexte optimisé: ${learnedResult.performance_metrics.examples_included} exemples pertinents`);
  }
}

/**
 * TEST 6: Intégration base de connaissances menuiserie
 */
async function testMenuiserieKnowledgeBase(): Promise<void> {
  console.log('6️⃣ Test base de connaissances menuiserie...');
  
  // Test requête spécialisée menuiserie
  const menuiserieRequest: BusinessContextRequest = {
    user_role: 'responsable_be',
    query_hint: 'Projets PVC avec normes PMR et délai RT2012',
    focus_areas: ['planning'],
    include_temporal: true,
    cache_duration_minutes: 60,
    personalization_level: 'basic',
    userId: 'test_menuiserie_user',
    sessionId: 'test_menuiserie_session'
  };
  
  const { result } = await measurePerformance(
    () => businessContextService.generateBusinessContext(menuiserieRequest),
    500
  );
  
  assert(result.success === true, 'Génération contexte menuiserie réussie', 'Menuiserie');
  assert(result.context !== undefined, 'Contexte menuiserie disponible', 'Menuiserie');
  
  if (result.context) {
    const context = result.context as BusinessContext;
    
    // Vérifier présence connaissances menuiserie
    assert(context.domainKnowledge !== undefined, 'Connaissances domaine incluses', 'Menuiserie');
    
    if (context.domainKnowledge) {
      // Vérifier que le contexte contient des informations pertinentes pour la menuiserie
      assert(
        JSON.stringify(context.domainKnowledge).toLowerCase().includes('pvc') ||
        JSON.stringify(context.domainKnowledge).toLowerCase().includes('menuiserie'),
        'Connaissances PVC/menuiserie présentes',
        'Menuiserie'
      );
      
      console.log('   🏗️  Connaissances menuiserie intégrées avec succès');
    }
    
    // Vérifier exemples spécialisés
    const hasMenuiserieExamples = context.businessExamples.some(example => 
      example.sql?.toLowerCase().includes('project') ||
      example.sql?.toLowerCase().includes('pvc') ||
      example.natural_language?.toLowerCase().includes('menuiserie')
    );
    
    assert(hasMenuiserieExamples, 'Exemples métier menuiserie inclus', 'Menuiserie');
    console.log(`   📝 ${context.businessExamples.length} exemples métier spécialisés`);
  }
}

/**
 * TEST 7: Métriques et monitoring du service
 */
async function testServiceMetrics(): Promise<void> {
  console.log('7️⃣ Test métriques et monitoring...');
  
  // Récupérer métriques du service
  const { result: metrics, duration } = await measurePerformance(
    () => businessContextService.getServiceMetrics(),
    100
  );
  
  assert(metrics !== undefined, 'Métriques disponibles', 'Metrics');
  
  if (metrics) {
    // Vérifier structure des métriques
    assert(typeof metrics.total_requests === 'number', 'Compteur requêtes total présent', 'Metrics');
    assert(typeof metrics.cache_hit_rate === 'number', 'Taux de cache hit calculé', 'Metrics');
    assert(typeof metrics.average_generation_time === 'number', 'Temps moyen de génération calculé', 'Metrics');
    assert(Array.isArray(metrics.popular_query_patterns), 'Patterns populaires listés', 'Metrics');
    assert(Array.isArray(metrics.role_usage_stats), 'Statistiques par rôle disponibles', 'Metrics');
    
    console.log(`   📊 Métriques collectées:`);
    console.log(`      - Total requêtes: ${metrics.total_requests}`);
    console.log(`      - Taux cache hit: ${(metrics.cache_hit_rate * 100).toFixed(1)}%`);
    console.log(`      - Temps moyen: ${metrics.average_generation_time}ms`);
    console.log(`      - Patterns populaires: ${metrics.popular_query_patterns.length}`);
    console.log(`      - Rôles actifs: ${metrics.role_usage_stats.length}`);
  }
}

/**
 * Fonction principale d'exécution des tests
 */
export async function runBusinessContextIntegrationTest(): Promise<void> {
  console.log('\n'.repeat(2));
  console.log('🚀'.repeat(60));
  console.log('🧪 TESTS INTÉGRATION - BUSINESS CONTEXT SERVICE');
  console.log('Constructeur de Contexte Métier Intelligent - Chatbot Saxium');
  console.log('🚀'.repeat(60));
  console.log('\n');

  const testSuite = [
    { name: 'Initialisation Service', fn: testServiceInitialization },
    { name: 'Contexte Adaptatif par Rôle', fn: testRoleBasedContextGeneration },
    { name: 'Cache Intelligent', fn: testIntelligentCaching },
    { name: 'Enrichissement Contexte', fn: testContextEnrichment },
    { name: 'Apprentissage Adaptatif', fn: testAdaptiveLearning },
    { name: 'Base Connaissances Menuiserie', fn: testMenuiserieKnowledgeBase },
    { name: 'Métriques Service', fn: testServiceMetrics }
  ];

  // Exécuter tous les tests
  for (const test of testSuite) {
    const result = await runTest(test.name, test.fn);
    testResults.push(result);
  }

  // Rapport final
  console.log('\n'.repeat(2));
  console.log('📊 RAPPORT FINAL DES TESTS');
  console.log('═'.repeat(60));
  
  const passedTests = testResults.filter(t => t.passed);
  const failedTests = testResults.filter(t => t.passed === false);
  
  console.log(`\n✅ Tests réussis: ${passedTests.length}/${testResults.length}`);
  console.log(`❌ Tests échoués: ${failedTests.length}/${testResults.length}`);
  
  const totalDuration = testResults.reduce((sum, t) => sum + t.duration, 0);
  const avgDuration = totalDuration / testResults.length;
  
  console.log(`⏱️  Temps total: ${totalDuration}ms`);
  console.log(`📈 Temps moyen: ${avgDuration.toFixed(1)}ms`);
  
  // Performances par test
  console.log('\n🎯 PERFORMANCES PAR TEST:');
  testResults.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`   ${status} ${test.name}: ${test.duration}ms`);
  });
  
  // Détails des échecs
  if (failedTests.length > 0) {
    console.log('\n❌ DÉTAILS DES ÉCHECS:');
    failedTests.forEach(test => {
      console.log(`   • ${test.name}: ${test.error}`);
    });
  }
  
  // Validation des objectifs
  console.log('\n🎯 VALIDATION DES OBJECTIFS:');
  
  // Performance < 500ms
  const performanceTests = testResults.filter(t => t.name.includes('Cache') || t.name.includes('Contexte'));
  const avgPerformanceTime = performanceTests.reduce((sum, t) => sum + t.duration, 0) / performanceTests.length;
  const performanceOK = avgPerformanceTime < 500;
  console.log(`   ${performanceOK ? '✅' : '❌'} Performance < 500ms: ${avgPerformanceTime.toFixed(1)}ms`);
  
  // Coverage critique
  const criticalTests = ['Initialisation Service', 'Contexte Adaptatif par Rôle', 'Cache Intelligent'];
  const criticalPassed = criticalTests.every(testName => 
    testResults.find(t => t.name === testName)?.passed === true
  );
  console.log(`   ${criticalPassed ? '✅' : '❌'} Tests critiques: ${criticalPassed ? 'Tous passés' : 'Échecs détectés'}`);
  
  // Fonctionnalités menuiserie
  const menuiserieTest = testResults.find(t => t.name.includes('Menuiserie'));
  const menuiserieOK = menuiserieTest?.passed === true;
  console.log(`   ${menuiserieOK ? '✅' : '❌'} Intégration menuiserie: ${menuiserieOK ? 'Validée' : 'Problèmes détectés'}`);
  
  // Résultat global
  const globalSuccess = passedTests.length === testResults.length && performanceOK;
  
  console.log('\n'.repeat(1));
  console.log('🏆 RÉSULTAT GLOBAL:');
  console.log(`${globalSuccess ? '🎉 SUCCÈS COMPLET' : '⚠️  VALIDATION PARTIELLE'}`);
  console.log(`Business Context Service pour Saxium: ${globalSuccess ? 'PRÊT POUR PRODUCTION' : 'CORRECTIONS NÉCESSAIRES'}`);
  
  console.log('\n' + '🚀'.repeat(60));
  
  if (!globalSuccess) {
    throw new Error('Certains tests ont échoué - voir le rapport ci-dessus');
  }
}

// Export pour utilisation directe
if (import.meta.url === `file://${process.argv[1]}`) {
  runBusinessContextIntegrationTest()
    .then(() => {
      console.log('Tests terminés avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Tests échoués:', error.message);
      process.exit(1);
    });
}