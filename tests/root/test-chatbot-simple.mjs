#!/usr/bin/env node

import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:5000';
const AUTH_HEADER = 'Basic YWRtaW46cGFzc3dvcmQ='; // admin:password

async function testSimpleQuery() {
  console.log('========================================');
  console.log('TEST SIMPLE CHATBOT');
  console.log('========================================\n');
  
  // Test avec une requête très simple d'abord
  const simpleQuery = "Liste tous les projets";
  
  console.log(`Query: "${simpleQuery}"`);
  console.log('---');
  
  try {
    const response = await fetch(`${BASE_URL}/api/chatbot/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTH_HEADER
      },
      body: JSON.stringify({
        query: simpleQuery,
        userId: 'admin-dev-user',
        userRole: 'admin',
        sessionId: 'test-simple-session',
        options: {
          includeDebugInfo: true,
          timeoutMs: 30000 // Augmenter le timeout
        }
      })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ SUCCESS - La requête simple fonctionne');
      
      if (data.sql_query) {
        console.log('\nSQL généré:');
        console.log(data.sql_query);
      }
      
      // Test avec INTERVAL maintenant
      console.log('\n========================================');
      console.log('TEST AVEC INTERVAL');
      console.log('========================================\n');
      
      const intervalQuery = "Combien de projets ont été créés cette semaine ?";
      console.log(`Query: "${intervalQuery}"`);
      
      const intervalResponse = await fetch(`${BASE_URL}/api/chatbot/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': AUTH_HEADER
        },
        body: JSON.stringify({
          query: intervalQuery,
          userId: 'admin-dev-user',
          userRole: 'admin',
          sessionId: 'test-interval-session',
          options: {
            includeDebugInfo: true,
            timeoutMs: 30000
          }
        })
      });
      
      const intervalData = await intervalResponse.json();
      console.log(`Status: ${intervalResponse.status}`);
      
      if (intervalResponse.status === 200) {
        console.log('✅ SUCCESS - La requête INTERVAL fonctionne !');
        
        if (intervalData.sql_query) {
          console.log('\nSQL généré avec INTERVAL:');
          console.log(intervalData.sql_query);
          
          // Vérifier la présence d'INTERVAL
          if (intervalData.sql_query.includes('INTERVAL')) {
            console.log('\n✅ Expression INTERVAL correctement générée');
          } else {
            console.log('\n⚠️  Pas d\'expression INTERVAL trouvée dans le SQL');
          }
        }
        
        if (intervalData.sql_results) {
          console.log(`\nRésultats: ${intervalData.sql_results.length} ligne(s)`);
        }
      } else {
        console.log('❌ ERREUR - La requête INTERVAL a échoué');
        
        if (intervalData.error) {
          console.log('Type d\'erreur:', intervalData.error.type);
          console.log('Message:', intervalData.error.message);
          
          if (intervalData.error.details) {
            console.log('Détails:', JSON.stringify(intervalData.error.details, null, 2));
          }
        }
        
        if (intervalData.debugInfo) {
          console.log('\nDebug Info:');
          if (intervalData.debugInfo.generatedSQL) {
            console.log('SQL généré (debug):', intervalData.debugInfo.generatedSQL);
          }
          if (intervalData.debugInfo.validationErrors) {
            console.log('Erreurs de validation:', intervalData.debugInfo.validationErrors);
          }
        }
      }
      
    } else {
      console.log('❌ ERREUR - Même la requête simple échoue');
      
      if (data.error) {
        console.log('Type d\'erreur:', data.error.type);
        console.log('Message:', data.error.message);
        if (data.error.details) {
          console.log('Détails:', JSON.stringify(data.error.details, null, 2));
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ ERREUR DE CONNEXION: ${error.message}`);
  }
}

// Lancer le test
testSimpleQuery().catch(console.error);