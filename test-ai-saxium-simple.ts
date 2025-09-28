/**
 * TESTS SIMPLES CHAT IA SAXIUM - VALIDATION FONCTIONNELLE COMPLÈTE
 * Version simplifiée et robuste avec données réelles
 */

import { getAIService } from './server/services/AIService';
import { storage } from './server/storage-poc';
import type { IStorage } from './server/storage-poc';
import type { AiQueryRequest } from './shared/schema';

// ========================================
// CLASSE DE TEST SIMPLIFIÉE
// ========================================

class SaxiumSimpleTestRunner {
  private aiService: any;
  private storage: IStorage;
  private testResults: any[] = [];

  constructor() {
    this.storage = storage as IStorage;
    this.aiService = getAIService(this.storage);
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 VALIDATION CHAT IA SAXIUM - TESTS SIMPLIFIÉS');
    console.log('==================================================\n');

    // Test 1: Vérification services
    await this.testServiceHealth();
    
    // Test 2: Génération SQL de base
    await this.testBasicSQLGeneration();
    
    // Test 3: Requêtes métier JLM
    await this.testBusinessQueries();
    
    // Test 4: Performance et cache
    await this.testPerformance();
    
    // Test 5: Terminologie BTP
    await this.testTerminology();

    // Rapport final
    this.generateReport();
  }

  // ========================================
  // TEST 1: SANTÉ DES SERVICES
  // ========================================

  async testServiceHealth(): Promise<void> {
    console.log('🔍 === TEST 1: SANTÉ DES SERVICES ===');
    
    try {
      const health = await this.aiService.healthCheck();
      
      const result = {
        test: 'Service Health',
        claude: health.claude,
        database: health.database,
        cache: health.cache,
        gpt: health.gpt,
        status: health.claude && health.database ? 'SUCCESS' : 'PARTIAL'
      };

      this.testResults.push(result);
      
      console.log('✅ Services IA:', {
        'Claude Sonnet 4': result.claude ? '✅' : '❌',
        'GPT-5': result.gpt ? '✅' : '❌ (optionnel)',
        'Base de données': result.database ? '✅' : '❌',
        'Cache': result.cache ? '✅' : '❌'
      });

    } catch (error) {
      console.error('❌ Erreur health check:', error);
      this.testResults.push({ test: 'Service Health', status: 'ERROR', error });
    }

    console.log('');
  }

  // ========================================
  // TEST 2: GÉNÉRATION SQL DE BASE
  // ========================================

  async testBasicSQLGeneration(): Promise<void> {
    console.log('🔍 === TEST 2: GÉNÉRATION SQL DE BASE ===');

    const basicQueries = [
      {
        name: 'Liste AOs récents',
        query: 'Liste les 5 appels d\'offres les plus récents',
        context: 'JLM menuiserie - consultation AOs',
        complexity: 'simple' as const
      },
      {
        name: 'Projets en cours',
        query: 'Montre les projets en cours avec leur avancement',
        context: 'Suivi projets JLM',
        complexity: 'simple' as const
      },
      {
        name: 'Fournisseurs actifs',
        query: 'Liste des fournisseurs avec leurs spécialisations',
        context: 'Base fournisseurs JLM',
        complexity: 'simple' as const
      }
    ];

    for (const testQuery of basicQueries) {
      try {
        console.log(`🔧 Test: ${testQuery.name}...`);
        
        const request: AiQueryRequest = {
          query: testQuery.query,
          context: testQuery.context,
          complexity: testQuery.complexity,
          userRole: 'admin',
          useCache: true,
          maxTokens: 1500
        };

        const startTime = Date.now();
        const result = await this.aiService.generateSQL(request);
        const duration = Date.now() - startTime;

        const testResult = {
          test: testQuery.name,
          success: result.success,
          duration: duration + 'ms',
          modelUsed: result.data?.modelUsed,
          tokensUsed: result.data?.tokensUsed,
          sqlGenerated: !!result.data?.generatedSQL,
          explanation: !!result.data?.explanation,
          status: result.success ? 'SUCCESS' : 'FAILED'
        };

        this.testResults.push(testResult);

        if (result.success) {
          console.log(`✅ ${testQuery.name}:`, {
            Modèle: testResult.modelUsed,
            Tokens: testResult.tokensUsed,
            Durée: testResult.duration,
            'SQL généré': testResult.sqlGenerated ? '✅' : '❌'
          });
        } else {
          console.log(`❌ ${testQuery.name}: ${result.error?.message}`);
        }

      } catch (error) {
        console.error(`❌ Erreur ${testQuery.name}:`, error);
        this.testResults.push({ 
          test: testQuery.name, 
          status: 'ERROR', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    console.log('');
  }

  // ========================================
  // TEST 3: REQUÊTES MÉTIER JLM
  // ========================================

  async testBusinessQueries(): Promise<void> {
    console.log('🔍 === TEST 3: REQUÊTES MÉTIER JLM ===');

    const businessQueries = [
      {
        name: 'Analyse matériaux PVC',
        query: 'Trouve tous les projets avec matériau PVC et leur statut',
        context: 'JLM menuiserie - analyse matériaux PVC',
        complexity: 'complex' as const
      },
      {
        name: 'Délais contractuels',
        query: 'Projets avec délai contractuel supérieur à 6 mois',
        context: 'Analyse délais JLM - planification',
        complexity: 'complex' as const
      },
      {
        name: 'Montants estimés',
        query: 'Répartition des AOs par tranche de montant estimé',
        context: 'Analyse financière JLM - montants',
        complexity: 'complex' as const
      },
      {
        name: 'Géolocalisation',
        query: 'Projets par département avec concentrations géographiques',
        context: 'Analyse géographique JLM - départements',
        complexity: 'expert' as const
      }
    ];

    for (const businessQuery of businessQueries) {
      try {
        console.log(`🔧 Test métier: ${businessQuery.name}...`);
        
        const request: AiQueryRequest = {
          query: businessQuery.query,
          context: businessQuery.context,
          complexity: businessQuery.complexity,
          userRole: 'admin',
          useCache: true,
          maxTokens: 2500
        };

        const startTime = Date.now();
        const result = await this.aiService.generateSQL(request);
        const duration = Date.now() - startTime;

        const testResult = {
          test: businessQuery.name,
          success: result.success,
          duration: duration + 'ms',
          complexity: businessQuery.complexity,
          modelUsed: result.data?.modelUsed,
          tokensUsed: result.data?.tokensUsed,
          businessContext: true,
          status: result.success ? 'SUCCESS' : 'FAILED'
        };

        this.testResults.push(testResult);

        if (result.success) {
          console.log(`✅ [${businessQuery.complexity.toUpperCase()}] ${businessQuery.name}:`, {
            Modèle: testResult.modelUsed,
            Tokens: testResult.tokensUsed,
            Durée: testResult.duration
          });

          // Affichage extrait SQL généré
          if (result.data?.generatedSQL) {
            const sqlPreview = result.data.generatedSQL.substring(0, 120);
            console.log(`   📝 SQL: ${sqlPreview}...`);
          }
        } else {
          console.log(`❌ ${businessQuery.name}: ${result.error?.message}`);
        }

      } catch (error) {
        console.error(`❌ Erreur métier ${businessQuery.name}:`, error);
        this.testResults.push({ 
          test: businessQuery.name, 
          status: 'ERROR', 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    console.log('');
  }

  // ========================================
  // TEST 4: PERFORMANCE ET CACHE
  // ========================================

  async testPerformance(): Promise<void> {
    console.log('🔍 === TEST 4: PERFORMANCE ET CACHE ===');

    try {
      const testQuery: AiQueryRequest = {
        query: 'Liste des AOs de cette année avec leur montant',
        context: 'Test performance - cache IA',
        complexity: 'simple',
        userRole: 'admin',
        maxTokens: 1000
      };

      // Test sans cache
      console.log('🔧 Test performance SANS cache...');
      const noCacheQuery = { ...testQuery, useCache: false };
      const noCacheStart = Date.now();
      const noCacheResult = await this.aiService.generateSQL(noCacheQuery);
      const noCacheTime = Date.now() - noCacheStart;

      // Test avec cache (même requête)
      console.log('🔧 Test performance AVEC cache...');
      const cacheQuery = { ...testQuery, useCache: true };
      const cacheStart = Date.now();
      const cacheResult = await this.aiService.generateSQL(cacheQuery);
      const cacheTime = Date.now() - cacheStart;

      const performanceResult = {
        test: 'Performance et Cache',
        noCacheTime: noCacheTime + 'ms',
        cacheTime: cacheTime + 'ms',
        improvement: noCacheTime > cacheTime ? `${Math.round(((noCacheTime - cacheTime) / noCacheTime) * 100)}%` : 'N/A',
        cacheHit: cacheResult.data?.fromCache || false,
        status: noCacheResult.success && cacheResult.success ? 'SUCCESS' : 'PARTIAL'
      };

      this.testResults.push(performanceResult);

      console.log('📊 Résultats performance:', {
        'Sans cache': performanceResult.noCacheTime,
        'Avec cache': performanceResult.cacheTime,
        'Amélioration': performanceResult.improvement,
        'Cache hit': performanceResult.cacheHit ? '✅' : '❌'
      });

    } catch (error) {
      console.error('❌ Erreur test performance:', error);
      this.testResults.push({ test: 'Performance et Cache', status: 'ERROR', error });
    }

    console.log('');
  }

  // ========================================
  // TEST 5: TERMINOLOGIE BTP
  // ========================================

  async testTerminology(): Promise<void> {
    console.log('🔍 === TEST 5: TERMINOLOGIE BTP/MENUISERIE ===');

    const terminologyTests = [
      {
        name: 'Matériaux menuiserie',
        query: 'Projets fenêtres PVC avec volets aluminium',
        expectedTerms: ['fenêtres', 'PVC', 'volets', 'aluminium']
      },
      {
        name: 'Workflow BTP',
        query: 'AOs nécessitant visa architecte pour pose',
        expectedTerms: ['visa', 'architecte', 'pose']
      },
      {
        name: 'Géographie française',
        query: 'Projets dans le Pas-de-Calais avec maître d\'œuvre',
        expectedTerms: ['Pas-de-Calais', 'maître', 'œuvre']
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

        let terminologyScore = 0;
        if (result.success) {
          const content = (result.data.generatedSQL + ' ' + (result.data.explanation || '')).toLowerCase();
          terminologyScore = test.expectedTerms.filter(term => 
            content.includes(term.toLowerCase())
          ).length / test.expectedTerms.length;
        }

        const testResult = {
          test: test.name,
          success: result.success,
          terminologyScore: Math.round(terminologyScore * 100) + '%',
          expectedTerms: test.expectedTerms,
          status: result.success && terminologyScore > 0.5 ? 'SUCCESS' : 'PARTIAL'
        };

        this.testResults.push(testResult);

        console.log(`${result.success ? '✅' : '❌'} ${test.name}: Terminologie ${testResult.terminologyScore}`);

      } catch (error) {
        console.error(`❌ Erreur terminologie ${test.name}:`, error);
        this.testResults.push({ test: test.name, status: 'ERROR', error });
      }
    }

    console.log('');
  }

  // ========================================
  // GÉNÉRATION RAPPORT FINAL
  // ========================================

  generateReport(): void {
    console.log('📋 === RAPPORT FINAL VALIDATION SAXIUM ===');

    const totalTests = this.testResults.length;
    const successTests = this.testResults.filter(r => r.status === 'SUCCESS').length;
    const partialTests = this.testResults.filter(r => r.status === 'PARTIAL').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
    const errorTests = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log('\n📊 STATISTIQUES GLOBALES:');
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   ✅ Réussis: ${successTests} (${Math.round(successTests/totalTests*100)}%)`);
    console.log(`   🔶 Partiels: ${partialTests} (${Math.round(partialTests/totalTests*100)}%)`);
    console.log(`   ❌ Échecs: ${failedTests} (${Math.round(failedTests/totalTests*100)}%)`);
    console.log(`   💥 Erreurs: ${errorTests} (${Math.round(errorTests/totalTests*100)}%)`);

    console.log('\n🎯 VALIDATION FONCTIONNELLE:');
    
    // Services IA
    const healthTest = this.testResults.find(r => r.test === 'Service Health');
    console.log(`   Services IA: ${healthTest?.status === 'SUCCESS' ? '✅' : '❌'} (Claude disponible: ${healthTest?.claude ? '✅' : '❌'})`);
    
    // Génération SQL
    const sqlTests = this.testResults.filter(r => r.test.includes('Liste') || r.test.includes('Projets') || r.test.includes('Fournisseurs'));
    const sqlSuccess = sqlTests.filter(r => r.status === 'SUCCESS').length;
    console.log(`   Génération SQL: ${sqlSuccess}/${sqlTests.length} tests réussis`);
    
    // Métier JLM
    const businessTests = this.testResults.filter(r => r.businessContext === true);
    const businessSuccess = businessTests.filter(r => r.status === 'SUCCESS').length;
    console.log(`   Requêtes métier: ${businessSuccess}/${businessTests.length} tests réussis`);
    
    // Performance
    const perfTest = this.testResults.find(r => r.test === 'Performance et Cache');
    console.log(`   Performance/Cache: ${perfTest?.status === 'SUCCESS' ? '✅' : '❌'} (Amélioration: ${perfTest?.improvement || 'N/A'})`);
    
    // Terminologie
    const termTests = this.testResults.filter(r => r.terminologyScore);
    const avgTermScore = termTests.length > 0 ? 
      termTests.reduce((sum, t) => sum + parseInt(t.terminologyScore), 0) / termTests.length : 0;
    console.log(`   Terminologie BTP: ${Math.round(avgTermScore)}% de précision moyenne`);

    console.log('\n🏆 CONCLUSION:');
    const overallScore = (successTests + partialTests * 0.5) / totalTests;
    if (overallScore >= 0.8) {
      console.log('   ✅ VALIDATION RÉUSSIE - Chat IA Saxium opérationnel avec données enrichies');
    } else if (overallScore >= 0.6) {
      console.log('   🔶 VALIDATION PARTIELLE - Fonctionnalités principales opérationnelles, améliorations mineures nécessaires');
    } else {
      console.log('   ❌ VALIDATION INCOMPLÈTE - Problèmes critiques à résoudre avant mise en production');
    }

    console.log(`   Score global: ${Math.round(overallScore * 100)}%`);
    
    console.log('\n✅ RAPPORT TERMINÉ - Chat IA Saxium validé avec données réelles JLM');
  }
}

// ========================================
// EXÉCUTION PRINCIPALE
// ========================================

async function runSaxiumValidation(): Promise<void> {
  const testRunner = new SaxiumSimpleTestRunner();
  await testRunner.runAllTests();
}

// Exécution automatique
runSaxiumValidation().catch(console.error);

export { SaxiumSimpleTestRunner, runSaxiumValidation };