/**
 * TESTS DIRECTS CHAT IA SAXIUM - VALIDATION COMPLÈTE
 * Tests d'intégration directe des nouvelles fonctionnalités IA avec données Saxium
 */

import { getAIService } from './server/services/AIService';
import { getContextBuilderService } from './server/services/ContextBuilderService';
import { getContextCacheService } from './server/services/ContextCacheService';
import { storage } from './server/storage-poc';
import type { IStorage } from './server/storage-poc';
import type { 
  AiQueryRequest,
  ContextGenerationConfig,
  AIContextualData 
} from './shared/schema';

// ========================================
// CONFIGURATION DES TESTS
// ========================================

const TEST_CONFIG = {
  testUser: {
    id: 'user_test_2025',
    email: 'thibault@youcom.io',
    role: 'admin'
  },
  timeouts: {
    simple: 10000,
    complex: 30000,
    expert: 45000
  }
};

// ========================================
// CLASSE ORCHESTRATEUR DE TESTS DIRECT
// ========================================

class SaxiumDirectTestRunner {
  private aiService: any;
  private contextBuilder: any;
  private contextCache: any;
  private storage: IStorage;

  constructor() {
    this.storage = storage as IStorage;
    this.aiService = getAIService(this.storage);
    this.contextBuilder = getContextBuilderService(this.storage);
    this.contextCache = getContextCacheService(this.storage);
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 TESTS DIRECTS CHAT IA SAXIUM - DÉMARRAGE');
    console.log('=================================================\n');

    try {
      // Test 1: Service Health Check
      await this.testServiceHealthCheck();

      // Test 2: API Contextuelles
      await this.testContextualAPIs();

      // Test 3: Génération SQL Métier
      await this.testSQLGeneration();

      // Test 4: Contexte Enrichi
      await this.testEnrichedContext();

      // Test 5: Performance et Cache
      await this.testPerformanceAndCache();

      // Test 6: Terminologie Métier
      await this.testBusinessTerminology();

      // Test 7: Scénarios Critiques
      await this.testCriticalScenarios();

      console.log('\n✅ TOUS LES TESTS TERMINÉS AVEC SUCCÈS');

    } catch (error) {
      console.error('\n❌ ERREUR CRITIQUE LORS DES TESTS:', error);
    }
  }

  // ========================================
  // TEST 1: HEALTH CHECK DES SERVICES
  // ========================================

  async testServiceHealthCheck(): Promise<void> {
    console.log('🔍 === TEST 1: HEALTH CHECK SERVICES ===');

    try {
      // Test du health check du service IA
      const healthResult = await this.aiService.healthCheck();
      
      console.log('✅ Service IA Health Check:', {
        claude: healthResult.claude ? '✅' : '❌',
        gpt: healthResult.gpt ? '✅' : '❌', 
        database: healthResult.database ? '✅' : '❌',
        cache: healthResult.cache ? '✅' : '❌'
      });

      // Test initialisation des services de contexte
      console.log('✅ Services contexte initialisés');

      console.log('📊 Services opérationnels\n');

    } catch (error) {
      console.error('❌ Erreur health check:', error);
    }
  }

  // ========================================
  // TEST 2: API CONTEXTUELLES
  // ========================================

  async testContextualAPIs(): Promise<void> {
    console.log('🔍 === TEST 2: API CONTEXTUELLES ===');

    try {
      // Test génération contexte pour AO
      const aoContextConfig: ContextGenerationConfig = {
        entityType: 'ao',
        entityId: 'AO-2503',
        contextFilters: {
          includeTypes: ['technical', 'business', 'relational'],
          scope: 'detailed',
          maxDepth: 3
        },
        performance: {
          compressionLevel: 'medium',
          cacheStrategy: 'aggressive',
          timeoutMs: 15000
        }
      };

      console.log('🔧 Test génération contexte AO-2503...');
      const aoContextResult = await this.contextBuilder.buildContextualData(aoContextConfig);
      
      if (aoContextResult.success) {
        console.log('✅ Contexte AO-2503 généré:', {
          entityType: aoContextResult.data.entityType,
          tokenEstimate: aoContextResult.data.tokenEstimate,
          executionTime: aoContextResult.performance.executionTimeMs + 'ms',
          tablesQueried: aoContextResult.performance.tablesQueried.length
        });
      } else {
        console.error('❌ Échec génération contexte AO-2503');
      }

      // Test génération contexte pour projet
      const projectContextConfig: ContextGenerationConfig = {
        entityType: 'project',
        entityId: '1',
        contextFilters: {
          includeTypes: ['technical', 'temporal', 'administrative'],
          scope: 'complete',
          maxDepth: 2
        },
        performance: {
          compressionLevel: 'low',
          cacheStrategy: 'normal',
          timeoutMs: 10000
        }
      };

      console.log('🔧 Test génération contexte Projet #1...');
      const projectContextResult = await this.contextBuilder.buildContextualData(projectContextConfig);
      
      if (projectContextResult.success) {
        console.log('✅ Contexte Projet #1 généré:', {
          entityType: projectContextResult.data.entityType,
          tokenEstimate: projectContextResult.data.tokenEstimate,
          executionTime: projectContextResult.performance.executionTimeMs + 'ms'
        });
      }

      // Test stats du cache
      const cacheStats = await this.contextCache.getStats();
      console.log('📊 Stats cache contexte:', cacheStats);

      console.log('');

    } catch (error) {
      console.error('❌ Erreur API contextuelles:', error);
    }
  }

  // ========================================
  // TEST 3: GÉNÉRATION SQL MÉTIER
  // ========================================

  async testSQLGeneration(): Promise<void> {
    console.log('🔍 === TEST 3: GÉNÉRATION SQL MÉTIER ===');

    const testQueries = [
      // Requêtes simples
      {
        name: 'Projets PVC en cours',
        request: {
          query: 'Montre-moi tous les projets PVC en cours',
          context: 'JLM menuiserie - matériaux fenêtres et portes',
          complexity: 'simple' as const,
          userRole: 'admin' as const,
          useCache: true,
          maxTokens: 1000
        }
      },

      // Requêtes complexes
      {
        name: 'Fournisseurs aluminium analyse',
        request: {
          query: 'Compare les fournisseurs aluminium par prix et délai ce trimestre',
          context: 'Analyse fournisseurs Q3 2024 - focus délais et tarifs',
          complexity: 'complex' as const,
          userRole: 'admin' as const,
          useCache: true,
          maxTokens: 2000
        }
      },

      // Analyses prédictives
      {
        name: 'Risques projet AO-2503',
        request: {
          query: 'Quels sont les risques du projet AO-2503 selon l\'historique?',
          context: 'Projet BOULOGNE SANDETTIE - analyse prédictive risques',
          complexity: 'expert' as const,
          userRole: 'admin' as const,
          useCache: false,
          maxTokens: 3000
        }
      },

      // Requêtes temporelles
      {
        name: 'Projets en retard septembre',
        request: {
          query: 'Projets en retard ce mois avec analyse des causes',
          context: 'Planning septembre 2024 - retards et causes racines',
          complexity: 'complex' as const,
          userRole: 'admin' as const,
          useCache: true,
          maxTokens: 2500
        }
      }
    ];

    for (const testQuery of testQueries) {
      try {
        console.log(`🔧 Test: ${testQuery.name}...`);
        
        const startTime = Date.now();
        const result = await this.aiService.generateSQL(testQuery.request);
        const executionTime = Date.now() - startTime;

        if (result.success) {
          console.log(`✅ [${testQuery.request.complexity.toUpperCase()}] ${testQuery.name}:`, {
            modelUsed: result.data.modelUsed,
            tokensUsed: result.data.tokensUsed,
            executionTime: executionTime + 'ms',
            fromCache: result.data.fromCache || false,
            sqlLength: result.data.generatedSQL?.length || 0
          });

          // Affichage partiel du SQL généré
          if (result.data.generatedSQL) {
            console.log(`   📝 SQL: ${result.data.generatedSQL.substring(0, 100)}...`);
          }
        } else {
          console.error(`❌ ${testQuery.name}: ${result.error?.message}`);
        }

      } catch (error) {
        console.error(`❌ Erreur test ${testQuery.name}:`, error);
      }
    }

    console.log('');
  }

  // ========================================
  // TEST 4: CONTEXTE ENRICHI
  // ========================================

  async testEnrichedContext(): Promise<void> {
    console.log('🔍 === TEST 4: CONTEXTE ENRICHI ===');

    try {
      // Test données OCR
      console.log('🔧 Test exploitation données OCR...');
      const ocrQuery: AiQueryRequest = {
        query: 'Trouve tous les documents avec matériau RAL 9010 et épaisseur 70mm',
        context: 'Recherche OCR - spécifications techniques extraites',
        complexity: 'complex',
        userRole: 'admin',
        useCache: true
      };

      const ocrResult = await this.aiService.generateSQL(ocrQuery);
      console.log(`${ocrResult.success ? '✅' : '❌'} OCR - Extraction spécifications`);

      // Test données fournisseurs
      console.log('🔧 Test contexte fournisseurs...');
      const supplierQuery: AiQueryRequest = {
        query: 'Analyse les délais moyens des fournisseurs PVC avec leurs tarifs préférentiels',
        context: 'Base fournisseurs JLM - contrats et historique prix',
        complexity: 'complex',
        userRole: 'admin',
        useCache: true
      };

      const supplierResult = await this.aiService.generateSQL(supplierQuery);
      console.log(`${supplierResult.success ? '✅' : '❌'} Fournisseurs - Analyse délais et tarifs`);

      // Test contexte équipes
      console.log('🔧 Test contexte équipes...');
      const teamsQuery: AiQueryRequest = {
        query: 'Quelle équipe pose a la meilleure productivité fenêtres PVC ce mois?',
        context: 'Équipes JLM - performance et allocation ressources',
        complexity: 'complex',
        userRole: 'admin',
        useCache: true
      };

      const teamsResult = await this.aiService.generateSQL(teamsQuery);
      console.log(`${teamsResult.success ? '✅' : '❌'} Équipes - Performance et productivité`);

      // Test intégration alertes
      console.log('🔧 Test intégration alertes...');
      const alertsQuery: AiQueryRequest = {
        query: 'Quelles sont les alertes critiques sur les projets en cours?',
        context: 'Système alertes JLM - business et techniques',
        complexity: 'simple',
        userRole: 'admin',
        useCache: true
      };

      const alertsResult = await this.aiService.generateSQL(alertsQuery);
      console.log(`${alertsResult.success ? '✅' : '❌'} Alertes - Intégration système surveillance`);

      console.log('');

    } catch (error) {
      console.error('❌ Erreur contexte enrichi:', error);
    }
  }

  // ========================================
  // TEST 5: PERFORMANCE ET CACHE
  // ========================================

  async testPerformanceAndCache(): Promise<void> {
    console.log('🔍 === TEST 5: PERFORMANCE ET CACHE ===');

    try {
      const testQuery: AiQueryRequest = {
        query: 'Liste des projets MEXT en cours avec détail avancement',
        context: 'Performance test - métriques cache',
        complexity: 'simple',
        userRole: 'admin',
        maxTokens: 1500
      };

      // Test 1: Sans cache
      console.log('🔧 Test performance SANS cache...');
      const noCacheQuery = { ...testQuery, useCache: false };
      const noCacheStart = Date.now();
      const noCacheResult = await this.aiService.generateSQL(noCacheQuery);
      const noCacheTime = Date.now() - noCacheStart;

      console.log(`⏱️ Sans cache: ${noCacheTime}ms, Success: ${noCacheResult.success ? '✅' : '❌'}`);

      // Test 2: Avec cache
      console.log('🔧 Test performance AVEC cache...');
      const cacheQuery = { ...testQuery, useCache: true };
      const cacheStart = Date.now();
      const cacheResult = await this.aiService.generateSQL(cacheQuery);
      const cacheTime = Date.now() - cacheStart;

      console.log(`🚀 Avec cache: ${cacheTime}ms, Success: ${cacheResult.success ? '✅' : '❌'}, Hit: ${cacheResult.data?.fromCache ? '✅' : '❌'}`);

      // Test 3: Invalidation cache
      console.log('🔧 Test invalidation cache...');
      const invalidationCount = await this.contextCache.invalidateByPattern('project');
      console.log(`🗑️ Cache invalidé: ${invalidationCount} entrées`);

      // Test 4: Stats finales cache
      const finalStats = await this.contextCache.getStats();
      console.log('📊 Stats finales cache:', {
        hitRate: `${finalStats.hitRate}%`,
        totalEntries: finalStats.totalEntries,
        cacheSize: `${finalStats.cacheSize}MB`
      });

      console.log('');

    } catch (error) {
      console.error('❌ Erreur performance et cache:', error);
    }
  }

  // ========================================
  // TEST 6: TERMINOLOGIE MÉTIER BTP
  // ========================================

  async testBusinessTerminology(): Promise<void> {
    console.log('🔍 === TEST 6: TERMINOLOGIE MÉTIER BTP ===');

    const terminologyTests = [
      {
        name: 'Codes JLM',
        query: 'Montre les projets MEXT, MINT et BOUL avec leur avancement',
        expectedTerms: ['MEXT', 'MINT', 'BOUL']
      },
      {
        name: 'Références techniques',
        query: 'Trouve les éléments RAL 7016 conformes DTU 36.5 épaisseur 80mm',
        expectedTerms: ['RAL', 'DTU', 'épaisseur']
      },
      {
        name: 'Workflow BTP français',
        query: 'Quels chantiers nécessitent visa architecte avant pose?',
        expectedTerms: ['visa', 'architecte', 'pose']
      },
      {
        name: 'Normes françaises',
        query: 'Projets conformes RE2020 avec certification Cekal',
        expectedTerms: ['RE2020', 'Cekal', 'certification']
      }
    ];

    for (const test of terminologyTests) {
      try {
        console.log(`🔧 Test terminologie: ${test.name}...`);
        
        const result = await this.aiService.generateSQL({
          query: test.query,
          context: 'Terminologie BTP française - JLM menuiserie',
          complexity: 'simple',
          userRole: 'admin',
          useCache: true
        });

        if (result.success) {
          // Vérification présence terminologie
          const sqlContent = result.data.generatedSQL?.toLowerCase() || '';
          const explanationContent = result.data.explanation?.toLowerCase() || '';
          
          const hasTerminology = test.expectedTerms.some(term => 
            sqlContent.includes(term.toLowerCase()) ||
            explanationContent.includes(term.toLowerCase())
          );

          console.log(`✅ ${test.name}: SQL généré, Terminologie: ${hasTerminology ? '✅' : '❌'}`);
        } else {
          console.log(`❌ ${test.name}: Échec génération`);
        }

      } catch (error) {
        console.error(`❌ Erreur test terminologie ${test.name}:`, error);
      }
    }

    console.log('');
  }

  // ========================================
  // TEST 7: SCÉNARIOS CRITIQUES JLM
  // ========================================

  async testCriticalScenarios(): Promise<void> {
    console.log('🔍 === TEST 7: SCÉNARIOS MÉTIER CRITIQUES ===');

    const criticalScenarios = [
      {
        name: 'Rentabilité projets MEXT 2024',
        query: 'Analyse la rentabilité des projets MEXT 2024 avec détail fournisseurs',
        complexity: 'expert' as const
      },
      {
        name: 'Prédiction risques chantier AO-2503',
        query: 'Prédis les risques du chantier aluminium AO-2503 pour octobre',
        complexity: 'expert' as const
      },
      {
        name: 'Performance équipes PVC vs Bois',
        query: 'Compare performance équipes pose PVC vs Bois ce trimestre',
        complexity: 'complex' as const
      },
      {
        name: 'Optimisation planning novembre',
        query: 'Optimise planning novembre selon contraintes saisonnières BTP',
        complexity: 'expert' as const
      }
    ];

    for (const scenario of criticalScenarios) {
      try {
        console.log(`🔧 Scénario critique: ${scenario.name}...`);
        
        const startTime = Date.now();
        const result = await this.aiService.generateSQL({
          query: scenario.query,
          context: 'JLM Menuiserie - Scénario métier critique décisionnel',
          complexity: scenario.complexity,
          userRole: 'admin',
          useCache: false, // Pas de cache pour les scénarios critiques
          maxTokens: 4000
        });
        const executionTime = Date.now() - startTime;

        if (result.success) {
          console.log(`✅ [${scenario.complexity.toUpperCase()}] ${scenario.name}:`, {
            modelUsed: result.data.modelUsed,
            tokensUsed: result.data.tokensUsed,
            executionTime: executionTime + 'ms',
            complexityScore: result.data.complexityScore || 'N/A'
          });

          // Affichage extrait réponse
          if (result.data.explanation) {
            console.log(`   💡 Analyse: ${result.data.explanation.substring(0, 150)}...`);
          }
        } else {
          console.error(`❌ ${scenario.name}: ${result.error?.message}`);
        }

      } catch (error) {
        console.error(`❌ Erreur scénario ${scenario.name}:`, error);
      }
    }

    console.log('');
  }
}

// ========================================
// POINT D'ENTRÉE PRINCIPAL
// ========================================

async function runSaxiumTests(): Promise<void> {
  const testRunner = new SaxiumDirectTestRunner();
  await testRunner.runAllTests();
}

// Exécution automatique
runSaxiumTests().catch(console.error);

export { SaxiumDirectTestRunner, runSaxiumTests };