/**
 * TESTS MANUELS API CONTEXTUELLES SAXIUM
 * Validation directe des endpoints context avec données réelles
 */

import { getContextBuilderService } from './server/services/ContextBuilderService';
import { getContextCacheService } from './server/services/ContextCacheService';
import { storage } from './server/storage-poc';
import type { IStorage } from './server/storage-poc';
import type { ContextGenerationConfig } from './shared/schema';

// ========================================
// TESTS ENDPOINTS API CONTEXTUELLES
// ========================================

class ContextualAPIValidator {
  private contextBuilder: any;
  private contextCache: any;
  private storage: IStorage;

  constructor() {
    this.storage = storage as IStorage;
    this.contextBuilder = getContextBuilderService(this.storage);
    this.contextCache = getContextCacheService(this.storage);
  }

  async validateContextualAPIs(): Promise<void> {
    console.log('🎯 VALIDATION API CONTEXTUELLES SAXIUM');
    console.log('=====================================\n');

    // Test 1: Contexte AO avec données réelles
    await this.testAOContext();
    
    // Test 2: Contexte projet
    await this.testProjectContext();
    
    // Test 3: Contexte fournisseur
    await this.testSupplierContext();
    
    // Test 4: Performance cache
    await this.testCachePerformance();
    
    // Test 5: Stats contexte
    await this.testContextStats();
  }

  async testAOContext(): Promise<void> {
    console.log('🔧 TEST 1: CONTEXTE AO avec données réelles');
    
    try {
      // Utiliser un AO réel de la base
      const config: ContextGenerationConfig = {
        entityType: 'ao',
        entityId: 'AO-AUTHENTIC-658-2025', // ID réel trouvé précédemment
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

      const startTime = Date.now();
      const result = await this.contextBuilder.buildContextualData(config);
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log('✅ Contexte AO généré avec succès:', {
          entityType: result.data.entityType,
          entityId: result.data.entityId,
          contextTypes: result.data.contextTypes,
          tokenEstimate: result.data.tokenEstimate,
          executionTime: duration + 'ms',
          tablesQueried: result.performance.tablesQueried,
          cacheHitRate: result.performance.cacheHitRate
        });

        // Vérification structure contexte
        console.log('📋 Structure contexte:', {
          technicalContext: !!result.data.technicalContext,
          businessContext: !!result.data.businessContext,
          relationalContext: !!result.data.relationalContext,
          frenchTerminology: Object.keys(result.data.frenchTerminology || {}).length
        });
      } else {
        console.error('❌ Échec génération contexte AO:', result.error);
      }

    } catch (error) {
      console.error('❌ Erreur test contexte AO:', error);
    }

    console.log('');
  }

  async testProjectContext(): Promise<void> {
    console.log('🔧 TEST 2: CONTEXTE PROJET');
    
    try {
      // Utiliser l'ID projet réel trouvé
      const config: ContextGenerationConfig = {
        entityType: 'project',
        entityId: '8668a742-9629-4759-a754-3bb816a00689',
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

      const startTime = Date.now();
      const result = await this.contextBuilder.buildContextualData(config);
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log('✅ Contexte Projet généré:', {
          tokenEstimate: result.data.tokenEstimate,
          executionTime: duration + 'ms',
          temporalContext: !!result.data.temporalContext,
          administrativeContext: !!result.data.administrativeContext
        });
      } else {
        console.error('❌ Échec contexte projet:', result.error);
      }

    } catch (error) {
      console.error('❌ Erreur test contexte projet:', error);
    }

    console.log('');
  }

  async testSupplierContext(): Promise<void> {
    console.log('🔧 TEST 3: CONTEXTE FOURNISSEUR');
    
    try {
      const config: ContextGenerationConfig = {
        entityType: 'supplier',
        entityId: '1', // ID simple pour test
        contextFilters: {
          includeTypes: ['business', 'relational'],
          scope: 'detailed',
          maxDepth: 2
        },
        performance: {
          compressionLevel: 'high',
          cacheStrategy: 'normal',
          timeoutMs: 8000
        }
      };

      const result = await this.contextBuilder.buildContextualData(config);

      if (result.success) {
        console.log('✅ Contexte Fournisseur généré:', {
          compressionLevel: result.data.compressionLevel,
          businessContext: !!result.data.businessContext,
          relationalContext: !!result.data.relationalContext
        });
      } else {
        console.log('ℹ️ Fournisseur non trouvé (attendu)');
      }

    } catch (error) {
      console.log('ℹ️ Test fournisseur - données limitées (attendu)');
    }

    console.log('');
  }

  async testCachePerformance(): Promise<void> {
    console.log('🔧 TEST 4: PERFORMANCE CACHE CONTEXTUEL');
    
    try {
      const testConfig: ContextGenerationConfig = {
        entityType: 'ao',
        entityId: 'AO-AUTHENTIC-658-2025',
        contextFilters: {
          includeTypes: ['technical'],
          scope: 'summary',
          maxDepth: 1
        },
        performance: {
          compressionLevel: 'medium',
          cacheStrategy: 'aggressive',
          timeoutMs: 5000
        }
      };

      // Premier appel (mise en cache)
      console.log('   🚀 Premier appel (cache MISS)...');
      const firstStart = Date.now();
      const firstResult = await this.contextBuilder.buildContextualData(testConfig);
      const firstDuration = Date.now() - firstStart;

      // Deuxième appel (depuis cache)
      console.log('   ⚡ Deuxième appel (cache HIT)...');
      const secondStart = Date.now();
      const secondResult = await this.contextCache.getContext(
        testConfig.entityType,
        testConfig.entityId,
        testConfig
      );
      const secondDuration = Date.now() - secondStart;

      console.log('📊 Résultats performance cache:', {
        premierAppel: firstDuration + 'ms',
        deuxiemeAppel: secondDuration + 'ms',
        amelioration: firstDuration > secondDuration ? 
          `${Math.round(((firstDuration - secondDuration) / firstDuration) * 100)}%` : 'N/A',
        cacheHit: !!secondResult
      });

    } catch (error) {
      console.error('❌ Erreur test cache:', error);
    }

    console.log('');
  }

  async testContextStats(): Promise<void> {
    console.log('🔧 TEST 5: STATISTIQUES CACHE CONTEXTE');
    
    try {
      const stats = await this.contextCache.getStats();
      
      console.log('📈 Stats cache contexte:', {
        totalEntries: stats.totalEntries,
        hitRate: `${stats.hitRate}%`,
        averageRetrievalTime: stats.averageRetrievalTime + 'ms',
        cacheSize: `${stats.cacheSize}MB`,
        memoryUsage: `${stats.memoryUsage}%`
      });

    } catch (error) {
      console.error('❌ Erreur stats cache:', error);
    }

    console.log('');
  }
}

// ========================================
// EXÉCUTION VALIDATION
// ========================================

async function validateContextAPIs(): Promise<void> {
  const validator = new ContextualAPIValidator();
  await validator.validateContextualAPIs();
}

// Exécution
validateContextAPIs().catch(console.error);

export { ContextualAPIValidator, validateContextAPIs };