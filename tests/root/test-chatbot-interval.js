#!/usr/bin/env node

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
const AUTH_HEADER = 'Basic YWRtaW46cGFzc3dvcmQ='; // admin:password

async function testChatbotQuery(query, description) {
  console.log(`\n${description}`);
  console.log(`Query: "${query}"`);
  console.log('---');
  
  try {
    const response = await fetch(`${BASE_URL}/api/chatbot/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_HEADER
      },
      body: JSON.stringify({
        query,
        userId: 'admin-dev-user',
        userRole: 'admin',
        sessionId: 'test-session-interval',
        options: {
          includeDebugInfo: true
        }
      })
    });
    
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS - Status 200');
      
      if (data.sql_query) {
        console.log('\nSQL généré:');
        console.log(data.sql_query);
      }
      
      if (data.natural_language_response) {
        console.log('\nRéponse:');
        console.log(data.natural_language_response);
      }
      
      if (data.sql_results && data.sql_results.length > 0) {
        console.log(`\n✅ Résultats trouvés: ${data.sql_results.length} ligne(s)`);
        console.log('Premiers résultats:', JSON.stringify(data.sql_results.slice(0, 3), null, 2));
      } else {
        console.log('\n⚠️  Aucun résultat retourné');
      }
      
      // Vérifier que le SQL contient bien INTERVAL
      if (data.sql_query && data.sql_query.includes('INTERVAL')) {
        console.log('✅ Expression INTERVAL correctement utilisée dans le SQL');
      }
      
    } else {
      console.log(`❌ ERREUR - Status ${response.status}`);
      
      if (data.error) {
        console.log('Type d\'erreur:', data.error.type);
        console.log('Message:', data.error.message);
        if (data.error.details) {
          console.log('Détails:', JSON.stringify(data.error.details, null, 2));
        }
      }
      
      if (data.debugInfo) {
        console.log('\nDebug Info:');
        if (data.debugInfo.generatedSQL) {
          console.log('SQL généré (debug):', data.debugInfo.generatedSQL);
        }
        if (data.debugInfo.validationErrors) {
          console.log('Erreurs de validation:', data.debugInfo.validationErrors);
        }
      }
    }
    
    return response.status === 200;
    
  } catch (error) {
    console.log(`❌ ERREUR DE CONNEXION: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('========================================');
  console.log('TESTS CHATBOT AVEC EXPRESSIONS INTERVAL');
  console.log('========================================');
  
  let successCount = 0;
  let totalTests = 0;
  
  // Test 1: Projets créés depuis 15 jours
  totalTests++;
  if (await testChatbotQuery(
    "Combien y a-t-il de projets créés depuis 15 jours ?",
    "TEST 1: Projets créés récemment"
  )) {
    successCount++;
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Pause entre tests
  
  // Test 2: Projets en retard sur livraison
  totalTests++;
  if (await testChatbotQuery(
    "Projets en retard sur livraison",
    "TEST 2: Projets en retard"
  )) {
    successCount++;
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Offres créées ce mois
  totalTests++;
  if (await testChatbotQuery(
    "Combien d'offres ont été créées ce mois-ci ?",
    "TEST 3: Offres du mois"
  )) {
    successCount++;
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Projets commencés il y a plus de 30 jours
  totalTests++;
  if (await testChatbotQuery(
    "Liste des projets commencés il y a plus de 30 jours",
    "TEST 4: Projets anciens"
  )) {
    successCount++;
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 5: Alertes de la semaine dernière
  totalTests++;
  if (await testChatbotQuery(
    "Quelles sont les alertes de la semaine dernière ?",
    "TEST 5: Alertes récentes"
  )) {
    successCount++;
  }
  
  console.log('\n========================================');
  console.log('RÉSUMÉ DES TESTS');
  console.log('========================================');
  console.log(`Tests réussis: ${successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('✅ TOUS LES TESTS SONT PASSÉS !');
    console.log('Le problème INTERVAL est complètement résolu.');
  } else {
    console.log(`❌ ${totalTests - successCount} test(s) ont échoué`);
    console.log('Il reste des problèmes à corriger.');
  }
}

// Lancer les tests
runTests().catch(console.error);