/**
 * TESTS COMPLETS CHAT IA AMÉLIORÉ SAXIUM
 * Validation de l'exploitation des nouvelles données Saxium pour JLM menuiserie
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

// ========================================
// CONFIGURATION DES TESTS
// ========================================

const BASE_URL = 'http://localhost:5000';
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  verbose: true
};

// Utilisateur de test (peut nécessiter création)
const TEST_USER = {
  email: 'test@jlm-menuiserie.fr',
  password: 'test123456',
  firstName: 'Test',
  lastName: 'JLM',
  role: 'admin'
};

// ========================================
// CLIENT DE TEST AVEC AUTHENTIFICATION
// ========================================

class SaxiumTestClient {
  private client: AxiosInstance;
  private authenticated = false;
  private sessionCookie = '';

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: TEST_CONFIG.timeout,
      withCredentials: true
    });
  }

  async authenticate(): Promise<boolean> {
    try {
      // Tentative de connexion avec utilisateur existant
      const loginResponse = await this.client.post('/auth/login', {
        email: TEST_USER.email,
        password: TEST_USER.password
      });

      if (loginResponse.status === 200) {
        this.extractSessionCookie(loginResponse);
        this.authenticated = true;
        console.log('✅ Authentification réussie');
        return true;
      }
    } catch (error: any) {
      console.log('ℹ️ Tentative de création d\'utilisateur de test...');
      
      try {
        // Création d'un utilisateur de test si connexion échoue
        const registerResponse = await this.client.post('/auth/register', TEST_USER);
        
        if (registerResponse.status === 201) {
          console.log('✅ Utilisateur de test créé');
          return await this.authenticate();
        }
      } catch (registerError: any) {
        console.error('❌ Impossible de créer l\'utilisateur de test:', registerError.response?.data || registerError.message);
      }
    }

    return false;
  }

  private extractSessionCookie(response: any): void {
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('connect.sid'));
      if (sessionCookie) {
        this.sessionCookie = sessionCookie.split(';')[0];
        this.client.defaults.headers.common['Cookie'] = this.sessionCookie;
      }
    }
  }

  async testRequest(method: 'GET' | 'POST', path: string, data?: any): Promise<any> {
    if (!this.authenticated) {
      throw new Error('Client non authentifié');
    }

    try {
      const response = method === 'GET' 
        ? await this.client.get(path)
        : await this.client.post(path, data);
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'N/A'
      };
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status || 0,
        error: error.response?.data || error.message,
        responseTime: 'N/A'
      };
    }
  }
}

// ========================================
// TESTS ENDPOINTS API CONTEXTUELLES
// ========================================

class ContextualAPITests {
  constructor(private client: SaxiumTestClient) {}

  async runTests(): Promise<void> {
    console.log('\n🔍 === TESTS ENDPOINTS API CONTEXTUELLES ===');

    // Test 1: Health check du service IA
    const healthResult = await this.client.testRequest('GET', '/api/ai/health-check');
    this.logTestResult('Health Check Service IA', healthResult);

    // Test 2: Stats du cache de contexte
    const cacheStatsResult = await this.client.testRequest('GET', '/api/ai/context-stats');
    this.logTestResult('Stats Cache Contexte', cacheStatsResult);

    // Test 3: Génération de contexte pour AO
    const contextAOResult = await this.client.testRequest('GET', '/api/ai/context/ao/AO-2503');
    this.logTestResult('Contexte AO-2503', contextAOResult);

    // Test 4: Génération de contexte pour projet
    const contextProjectResult = await this.client.testRequest('GET', '/api/ai/context/project/1');
    this.logTestResult('Contexte Projet #1', contextProjectResult);

    // Test 5: Preview de contexte sans cache
    const previewResult = await this.client.testRequest('POST', '/api/ai/context-preview', {
      entityType: 'supplier',
      entityId: '1',
      contextFilters: {
        includeTypes: ['technical', 'business', 'relational'],
        scope: 'detailed'
      },
      performance: {
        compressionLevel: 'medium'
      }
    });
    this.logTestResult('Preview Contexte Fournisseur', previewResult);
  }

  private logTestResult(testName: string, result: any): void {
    const status = result.success ? '✅' : '❌';
    const details = result.success 
      ? `Status: ${result.status}, Time: ${result.responseTime}`
      : `Error: ${result.status} - ${JSON.stringify(result.error).substring(0, 100)}`;
    
    console.log(`${status} ${testName}: ${details}`);
    
    if (result.success && result.data) {
      console.log(`   📊 Données: ${JSON.stringify(result.data).substring(0, 200)}...`);
    }
  }
}

// ========================================
// TESTS GÉNÉRATION SQL MÉTIER
// ========================================

class SQLGenerationTests {
  constructor(private client: SaxiumTestClient) {}

  async runTests(): Promise<void> {
    console.log('\n🚀 === TESTS GÉNÉRATION SQL MÉTIER ===');

    const testQueries = [
      // Requêtes simples
      {
        name: 'Projets PVC en cours',
        query: 'Montre-moi tous les projets PVC en cours',
        context: 'JLM menuiserie - matériaux fenêtres et portes',
        complexity: 'simple'
      },
      
      // Requêtes complexes
      {
        name: 'Comparaison fournisseurs aluminium',
        query: 'Compare les fournisseurs aluminium par prix et délai ce trimestre',
        context: 'Analyse fournisseurs Q3 2024 - focus délais et tarifs',
        complexity: 'complex'
      },
      
      // Analyses prédictives
      {
        name: 'Risques projet #2503',
        query: 'Quels sont les risques du projet #2503 selon l\'historique?',
        context: 'Projet BOULOGNE SANDETTIE - analyse prédictive',
        complexity: 'expert'
      },
      
      // Requêtes temporelles
      {
        name: 'Projets en retard analyse causes',
        query: 'Projets en retard ce mois avec analyse des causes',
        context: 'Planning septembre 2024 - retards et causes racines',
        complexity: 'complex'
      }
    ];

    for (const testQuery of testQueries) {
      const result = await this.client.testRequest('POST', '/api/ai/generate-sql', {
        query: testQuery.query,
        context: testQuery.context,
        complexity: testQuery.complexity,
        userRole: 'admin',
        useCache: true,
        maxTokens: 2000
      });

      this.logSQLTestResult(testQuery.name, result, testQuery.complexity);
    }
  }

  private logSQLTestResult(testName: string, result: any, complexity: string): void {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} [${complexity.toUpperCase()}] ${testName}`);
    
    if (result.success && result.data) {
      console.log(`   🔧 SQL généré: ${result.data.generatedSQL?.substring(0, 150)}...`);
      console.log(`   🧠 Modèle: ${result.data.modelUsed}, Tokens: ${result.data.tokensUsed}`);
      console.log(`   ⚡ Temps: ${result.responseTime}, Cache: ${result.data.fromCache ? 'HIT' : 'MISS'}`);
    } else {
      console.log(`   ❌ Erreur: ${JSON.stringify(result.error).substring(0, 200)}`);
    }
  }
}

// ========================================
// TESTS CONTEXTE ENRICHI
// ========================================

class EnrichedContextTests {
  constructor(private client: SaxiumTestClient) {}

  async runTests(): Promise<void> {
    console.log('\n🔬 === TESTS CONTEXTE ENRICHI ===');

    // Test données OCR
    await this.testOCRDataIntegration();
    
    // Test données fournisseurs
    await this.testSuppliersDataIntegration();
    
    // Test contexte équipes
    await this.testTeamsContextIntegration();
    
    // Test intégration alertes
    await this.testAlertsIntegration();
  }

  private async testOCRDataIntegration(): Promise<void> {
    const result = await this.client.testRequest('POST', '/api/ai/generate-sql', {
      query: 'Trouve tous les documents avec matériau RAL 9010 et épaisseur 70mm',
      context: 'Recherche OCR - spécifications techniques extraites',
      complexity: 'complex',
      userRole: 'admin'
    });

    const status = result.success ? '✅' : '❌';
    console.log(`${status} OCR - Extraction spécifications techniques`);
    
    if (result.success) {
      console.log(`   📄 SQL OCR: ${result.data.generatedSQL?.substring(0, 100)}...`);
    }
  }

  private async testSuppliersDataIntegration(): Promise<void> {
    const result = await this.client.testRequest('POST', '/api/ai/generate-sql', {
      query: 'Analyse les délais moyens des fournisseurs PVC avec leurs tarifs préférentiels',
      context: 'Base fournisseurs JLM - contrats et historique prix',
      complexity: 'complex',
      userRole: 'admin'
    });

    const status = result.success ? '✅' : '❌';
    console.log(`${status} Fournisseurs - Analyse délais et tarifs`);
  }

  private async testTeamsContextIntegration(): Promise<void> {
    const result = await this.client.testRequest('POST', '/api/ai/generate-sql', {
      query: 'Quelle équipe pose a la meilleure productivité fenêtres PVC ce mois?',
      context: 'Équipes JLM - performance et allocation ressources',
      complexity: 'complex',
      userRole: 'admin'
    });

    const status = result.success ? '✅' : '❌';
    console.log(`${status} Équipes - Performance et productivité`);
  }

  private async testAlertsIntegration(): Promise<void> {
    const result = await this.client.testRequest('POST', '/api/ai/generate-sql', {
      query: 'Quelles sont les alertes critiques sur les projets en cours?',
      context: 'Système alertes JLM - business et techniques',
      complexity: 'simple',
      userRole: 'admin'
    });

    const status = result.success ? '✅' : '❌';
    console.log(`${status} Alertes - Intégration système de surveillance`);
  }
}

// ========================================
// TESTS PERFORMANCE ET CACHE
// ========================================

class PerformanceAndCacheTests {
  constructor(private client: SaxiumTestClient) {}

  async runTests(): Promise<void> {
    console.log('\n⚡ === TESTS PERFORMANCE ET CACHE ===');

    // Test performance sans cache
    const withoutCacheResult = await this.client.testRequest('POST', '/api/ai/generate-sql', {
      query: 'Liste des projets MEXT en cours avec détail avancement',
      context: 'Performance test - pas de cache',
      useCache: false,
      userRole: 'admin'
    });

    console.log(`⏱️ Sans cache: ${withoutCacheResult.responseTime}`);

    // Test performance avec cache (même requête)
    const withCacheResult = await this.client.testRequest('POST', '/api/ai/generate-sql', {
      query: 'Liste des projets MEXT en cours avec détail avancement',
      context: 'Performance test - avec cache',
      useCache: true,
      userRole: 'admin'
    });

    console.log(`🚀 Avec cache: ${withCacheResult.responseTime}`);

    // Test invalidation cache
    const invalidationResult = await this.client.testRequest('POST', '/api/ai/context-invalidate', {
      pattern: 'project',
      cascading: true
    });

    const status = invalidationResult.success ? '✅' : '❌';
    console.log(`${status} Invalidation cache: ${invalidationResult.data?.invalidatedCount || 0} entrées`);

    // Test stats cache
    const statsResult = await this.client.testRequest('GET', '/api/ai/context-stats');
    if (statsResult.success) {
      console.log(`📊 Hit rate cache: ${statsResult.data?.hitRate || 0}%`);
      console.log(`💾 Taille cache: ${statsResult.data?.cacheSize || 0} MB`);
    }
  }
}

// ========================================
// TESTS TERMINOLOGIE MÉTIER BTP/MENUISERIE
// ========================================

class BusinessTerminologyTests {
  constructor(private client: SaxiumTestClient) {}

  async runTests(): Promise<void> {
    console.log('\n🏗️ === TESTS TERMINOLOGIE MÉTIER BTP ===');

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
      const result = await this.client.testRequest('POST', '/api/ai/generate-sql', {
        query: test.query,
        context: 'Terminologie BTP française - JLM menuiserie',
        complexity: 'simple',
        userRole: 'admin'
      });

      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${test.name}`);
      
      if (result.success) {
        const hasTerminology = test.expectedTerms.some(term => 
          result.data.generatedSQL?.toLowerCase().includes(term.toLowerCase()) ||
          result.data.explanation?.toLowerCase().includes(term.toLowerCase())
        );
        console.log(`   🎯 Terminologie: ${hasTerminology ? '✅' : '❌'}`);
      }
    }
  }
}

// ========================================
// SCÉNARIOS MÉTIER CRITIQUES JLM
// ========================================

class CriticalBusinessScenariosTests {
  constructor(private client: SaxiumTestClient) {}

  async runTests(): Promise<void> {
    console.log('\n🎯 === SCÉNARIOS MÉTIER CRITIQUES JLM ===');

    const criticalScenarios = [
      {
        name: 'Rentabilité projets MEXT 2024',
        query: 'Analyse la rentabilité des projets MEXT 2024 avec détail fournisseurs',
        complexity: 'expert'
      },
      {
        name: 'Prédiction risques chantier #2503',
        query: 'Prédis les risques du chantier aluminium #2503 pour octobre',
        complexity: 'expert'
      },
      {
        name: 'Performance équipes PVC vs Bois',
        query: 'Compare performance équipes pose PVC vs Bois ce trimestre',
        complexity: 'complex'
      },
      {
        name: 'Optimisation planning novembre',
        query: 'Optimise planning novembre selon contraintes saisonnières BTP',
        complexity: 'expert'
      }
    ];

    for (const scenario of criticalScenarios) {
      const result = await this.client.testRequest('POST', '/api/ai/generate-sql', {
        query: scenario.query,
        context: 'JLM Menuiserie - Scénario métier critique décisionnel',
        complexity: scenario.complexity,
        userRole: 'admin',
        maxTokens: 3000
      });

      const status = result.success ? '✅' : '❌';
      console.log(`${status} [${scenario.complexity.toUpperCase()}] ${scenario.name}`);
      
      if (result.success) {
        console.log(`   🧠 Modèle: ${result.data.modelUsed}`);
        console.log(`   📈 Complexité traitée: ${result.data.complexityScore || 'N/A'}`);
        console.log(`   ⚡ Performance: ${result.responseTime}`);
      } else {
        console.log(`   ❌ Échec: ${result.error?.message || 'Erreur inconnue'}`);
      }
    }
  }
}

// ========================================
// ORCHESTRATEUR PRINCIPAL DE TESTS
// ========================================

class SaxiumTestOrchestrator {
  private client: SaxiumTestClient;
  private results: any[] = [];

  constructor() {
    this.client = new SaxiumTestClient();
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 DÉMARRAGE TESTS CHAT IA AMÉLIORÉ SAXIUM');
    console.log('================================================');

    try {
      // Authentification
      const authenticated = await this.client.authenticate();
      if (!authenticated) {
        console.error('❌ Échec authentification - Tests annulés');
        return;
      }

      // Exécution des batteries de tests
      const testSuites = [
        new ContextualAPITests(this.client),
        new SQLGenerationTests(this.client),
        new EnrichedContextTests(this.client),
        new PerformanceAndCacheTests(this.client),
        new BusinessTerminologyTests(this.client),
        new CriticalBusinessScenariosTests(this.client)
      ];

      for (const suite of testSuites) {
        await suite.runTests();
        console.log(''); // Séparateur
      }

      console.log('✅ TESTS TERMINÉS AVEC SUCCÈS');
      
    } catch (error) {
      console.error('❌ ERREUR CRITIQUE LORS DES TESTS:', error);
    }
  }
}

// ========================================
// POINT D'ENTRÉE
// ========================================

const testOrchestrator = new SaxiumTestOrchestrator();
testOrchestrator.runAllTests().catch(console.error);