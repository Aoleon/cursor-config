// Test d'intégration end-to-end simple pour le service IA
// Usage: node server/test-ai-integration.js

const { getAIService } = require('./services/AIService');
const { storage } = require('./storage');

async function testAIServiceIntegration() {
  console.log('🚀 Test d\'intégration du service IA multi-modèles');
  console.log('================================================\n');

  const aiService = getAIService(storage);

  // Test 1: Health Check
  console.log('1️⃣ Test Health Check...');
  try {
    const health = await aiService.healthCheck();
    console.log('✅ Health Check:', JSON.stringify(health, null, 2));
  } catch (error) {
    console.log('❌ Erreur Health Check:', error.message);
  }

  // Test 2: Configuration
  console.log('\n2️⃣ Test Configuration...');
  console.log('✅ Claude disponible:', !!process.env.ANTHROPIC_API_KEY);
  console.log('✅ GPT disponible:', !!process.env.OPENAI_API_KEY);

  // Test 3: Génération SQL simple (devrait choisir Claude)
  console.log('\n3️⃣ Test génération SQL simple...');
  try {
    const simpleRequest = {
      query: "Combien de projets ai-je en cours ?",
      context: "Table projects avec colonnes: id, name, status, user_id, created_at",
      userRole: "chef_projet",
      useCache: false  // Pas de cache pour les tests
    };

    const simpleResult = await aiService.generateSQL(simpleRequest);
    
    if (simpleResult.success) {
      console.log('✅ Requête simple réussie');
      console.log('   Modèle utilisé:', simpleResult.data?.modelUsed);
      console.log('   SQL généré:', simpleResult.data?.sqlGenerated?.substring(0, 100) + '...');
      console.log('   Tokens utilisés:', simpleResult.data?.tokensUsed);
      console.log('   Temps de réponse:', simpleResult.data?.responseTimeMs + 'ms');
    } else {
      console.log('❌ Erreur requête simple:', simpleResult.error?.message);
    }
  } catch (error) {
    console.log('❌ Exception requête simple:', error.message);
  }

  // Test 4: Génération SQL complexe (devrait choisir GPT-5 si disponible)
  console.log('\n4️⃣ Test génération SQL complexe...');
  try {
    const complexRequest = {
      query: "Analyse la rentabilité mensuelle des projets par type avec tendance sur 12 mois et corrélations saisonnières",
      context: `
        Table projects: id, name, type, status, budget, start_date, end_date
        Table revenues: project_id, amount, date, type
        Table costs: project_id, amount, date, category
        Table project_types: id, name, complexity_factor
      `,
      userRole: "admin",
      complexity: "complex",
      useCache: false
    };

    const complexResult = await aiService.generateSQL(complexRequest);
    
    if (complexResult.success) {
      console.log('✅ Requête complexe réussie');
      console.log('   Modèle utilisé:', complexResult.data?.modelUsed);
      console.log('   SQL généré:', complexResult.data?.sqlGenerated?.substring(0, 150) + '...');
      console.log('   Tokens utilisés:', complexResult.data?.tokensUsed);
      console.log('   Confiance:', complexResult.data?.confidence);
      console.log('   Avertissements:', complexResult.data?.warnings?.length || 0);
    } else {
      console.log('❌ Erreur requête complexe:', complexResult.error?.message);
    }
  } catch (error) {
    console.log('❌ Exception requête complexe:', error.message);
  }

  // Test 5: Test métier menuiserie (devrait choisir Claude)
  console.log('\n5️⃣ Test requête métier menuiserie...');
  try {
    const menuiserieRequest = {
      query: "Quelles fenêtres PVC sont en stock avec leurs fournisseurs ?",
      context: `
        Table materials: id, type, material, color, stock_quantity, supplier_id
        Table suppliers: id, name, specialty, delivery_delay
        Types: fenetre, porte, volet
        Matériaux: pvc, bois, aluminium
      `,
      userRole: "technicien_be",
      useCache: false
    };

    const menuiserieResult = await aiService.generateSQL(menuiserieRequest);
    
    if (menuiserieResult.success) {
      console.log('✅ Requête menuiserie réussie');
      console.log('   Modèle utilisé:', menuiserieResult.data?.modelUsed);
      console.log('   SQL généré:', menuiserieResult.data?.sqlGenerated?.substring(0, 120) + '...');
      console.log('   Explication:', menuiserieResult.data?.explanation?.substring(0, 100) + '...');
    } else {
      console.log('❌ Erreur requête menuiserie:', menuiserieResult.error?.message);
    }
  } catch (error) {
    console.log('❌ Exception requête menuiserie:', error.message);
  }

  // Test 6: Test validation sécurité
  console.log('\n6️⃣ Test validation sécurité...');
  try {
    const maliciousRequest = {
      query: "SELECT * FROM users; DROP TABLE users; --",
      context: "Test injection",
      userRole: "test"
    };

    const securityResult = await aiService.generateSQL(maliciousRequest);
    
    if (!securityResult.success && securityResult.error?.type === "validation_error") {
      console.log('✅ Sécurité OK - requête malveillante bloquée');
      console.log('   Raison:', securityResult.error.message);
    } else {
      console.log('❌ PROBLÈME DE SÉCURITÉ - requête malveillante acceptée !');
    }
  } catch (error) {
    console.log('❌ Exception test sécurité:', error.message);
  }

  // Test 7: Statistiques d'usage
  console.log('\n7️⃣ Test statistiques d\'usage...');
  try {
    const stats = await aiService.getUsageStats(1); // Dernière journée
    console.log('✅ Stats récupérées:');
    console.log('   Requêtes totales:', stats.totalRequests);
    console.log('   Taux de succès:', (stats.successRate * 100).toFixed(1) + '%');
    console.log('   Temps réponse moyen:', stats.avgResponseTime + 'ms');
    console.log('   Distribution modèles:', {
      claude: (stats.modelDistribution.claude_sonnet_4 * 100).toFixed(1) + '%',
      gpt: (stats.modelDistribution.gpt_5 * 100).toFixed(1) + '%'
    });
  } catch (error) {
    console.log('❌ Erreur stats:', error.message);
  }

  console.log('\n🎯 Test d\'intégration terminé !');
  console.log('================================================');
  
  // Arrêter le processus
  process.exit(0);
}

// Lancement du test
testAIServiceIntegration().catch(error => {
  console.error('💥 Erreur critique:', error);
  process.exit(1);
});