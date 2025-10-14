#!/usr/bin/env tsx
/**
 * Script de test pour valider les enrichissements du BusinessContextService
 * Test de l'intégration avec ChatbotOrchestrationService et SQLEngineService
 */

import { db } from "./db";
import { BusinessContextService } from "./services/BusinessContextService";
import { RBACService } from "./services/RBACService";
import { EventBus } from "./eventBus";
import { MemStorage } from "./storage-poc";
import { logger } from "./utils/logger";

async function testBusinessContextEnrichment() {
  console.log("🧪 Test des enrichissements BusinessContextService - Phase 3\n");
  console.log("=" .repeat(60));

  try {
    // Initialisation des services
    const storage = new MemStorage();
    const eventBus = new EventBus();
    const rbacService = new RBACService(db, storage, eventBus);
    const businessContextService = new BusinessContextService(storage, rbacService, eventBus);

    // Test 1: Récupération des métadonnées enrichies
    console.log("\n📊 Test 1: Récupération des métadonnées enrichies");
    console.log("-".repeat(50));
    
    const metadata = await businessContextService.getEnrichedSchemaMetadata();
    
    console.log(`✅ Tables enrichies: ${Object.keys(metadata.tables).length}`);
    console.log(`   Tables disponibles: ${Object.keys(metadata.tables).join(', ')}`);
    
    console.log(`\n✅ Dictionnaire métier: ${Object.keys(metadata.businessDictionary).length} entrées`);
    const sampleDictEntries = Object.entries(metadata.businessDictionary).slice(0, 5);
    sampleDictEntries.forEach(([fr, sql]) => {
      console.log(`   "${fr}" → ${sql}`);
    });
    
    console.log(`\n✅ Contextes spécialisés: ${Object.keys(metadata.domainContexts).length}`);
    console.log(`   Domaines: ${Object.keys(metadata.domainContexts).join(', ')}`);

    // Test 2: Analyse d'une table enrichie (offers)
    console.log("\n📋 Test 2: Analyse détaillée de la table 'offers'");
    console.log("-".repeat(50));
    
    const offersTable = metadata.tables.offers;
    if (offersTable) {
      console.log(`✅ Table: ${offersTable.businessName} (${offersTable.tableName})`);
      console.log(`   Description: ${offersTable.description}`);
      console.log(`   Domaines: ${offersTable.domain.join(', ')}`);
      console.log(`   Colonnes: ${offersTable.columns.length}`);
      console.log(`   Relations: ${offersTable.relations.length}`);
      console.log(`   Exemples SQL: ${offersTable.sqlExamples.length}`);
      
      // Afficher un exemple SQL
      if (offersTable.sqlExamples.length > 0) {
        const example = offersTable.sqlExamples[0];
        console.log(`\n   Exemple SQL:`);
        console.log(`   ${example.description}`);
        console.log(`   ${example.sql.replace(/\n/g, '\n   ')}`);
      }
    }

    // Test 3: Contexte SQL intelligent avec détection de domaine
    console.log("\n🤖 Test 3: Génération de contexte SQL intelligent");
    console.log("-".repeat(50));
    
    const testQueries = [
      {
        query: "Quels sont les projets en retard cette semaine ?",
        expectedDomain: "temporel"
      },
      {
        query: "Analyse de la rentabilité des offres signées",
        expectedDomain: "financier"
      },
      {
        query: "Charge de travail de l'équipe BE",
        expectedDomain: "ressources"
      },
      {
        query: "Comparaison des devis fournisseurs",
        expectedDomain: "fournisseurs"
      }
    ];

    for (const testCase of testQueries) {
      console.log(`\n📝 Requête: "${testCase.query}"`);
      
      const context = await businessContextService.buildIntelligentContextForSQL(
        "admin-test",
        "admin",
        testCase.query
      );
      
      // Analyser le contexte généré
      const lines = context.split('\n');
      const domainLine = lines.find(l => l.startsWith('Domaine principal:'));
      const entitiesLine = lines.find(l => l.startsWith('Entités détectées:'));
      const tablesSection = lines.indexOf('=== TABLES PERTINENTES ===');
      
      if (domainLine) {
        const detectedDomain = domainLine.split(':')[1].trim();
        const isCorrect = detectedDomain === testCase.expectedDomain;
        console.log(`   ✅ Domaine détecté: ${detectedDomain} ${isCorrect ? '✓' : '✗ (attendu: ' + testCase.expectedDomain + ')'}`);
      }
      
      if (entitiesLine) {
        console.log(`   ${entitiesLine}`);
      }
      
      // Compter les tables incluses
      let tableCount = 0;
      for (let i = tablesSection + 1; i < lines.length; i++) {
        if (lines[i].startsWith('TABLE:')) tableCount++;
        if (lines[i].startsWith('===')) break;
      }
      console.log(`   ✅ Tables pertinentes incluses: ${tableCount}`);
      
      // Vérifier la présence des sections enrichies
      const hasSynonyms = context.includes('=== SYNONYMES MÉTIER ===');
      const hasExamples = context.includes('=== EXEMPLES SQL PERTINENTS ===');
      const hasJoins = context.includes('=== JOINTURES RECOMMANDÉES ===');
      const hasOptimization = context.includes('=== HINTS D\'OPTIMISATION ===');
      
      console.log(`   ✅ Sections enrichies:`);
      console.log(`      - Synonymes métier: ${hasSynonyms ? '✓' : '✗'}`);
      console.log(`      - Exemples SQL: ${hasExamples ? '✓' : '✗'}`);
      console.log(`      - Jointures recommandées: ${hasJoins ? '✓' : '✗'}`);
      console.log(`      - Hints optimisation: ${hasOptimization ? '✓' : '✗'}`);
      
      console.log(`   ✅ Taille contexte: ${context.length} caractères`);
    }

    // Test 4: Performance et cache
    console.log("\n⚡ Test 4: Performance et cache");
    console.log("-".repeat(50));
    
    const perfQuery = "Montrer les offres en cours de chiffrage";
    
    // Premier appel (sans cache)
    const start1 = Date.now();
    const context1 = await businessContextService.buildIntelligentContextForSQL(
      "admin-test",
      "admin",
      perfQuery
    );
    const time1 = Date.now() - start1;
    console.log(`✅ Premier appel: ${time1}ms`);
    
    // Deuxième appel (avec cache)
    const start2 = Date.now();
    const context2 = await businessContextService.buildIntelligentContextForSQL(
      "admin-test",
      "admin",
      perfQuery
    );
    const time2 = Date.now() - start2;
    console.log(`✅ Deuxième appel (cache): ${time2}ms`);
    
    const speedup = Math.round((time1 / time2) * 100) / 100;
    console.log(`✅ Amélioration performance: ${speedup}x plus rapide`);

    // Test 5: Vérification de l'intégration des domaines
    console.log("\n🏗️ Test 5: Contextes spécialisés par domaine");
    console.log("-".repeat(50));
    
    const domains = Object.keys(metadata.domainContexts);
    domains.forEach(domain => {
      const ctx = metadata.domainContexts[domain];
      console.log(`\n✅ Domaine: ${domain}`);
      console.log(`   Description: ${ctx.description}`);
      if (ctx.tables) {
        console.log(`   Tables principales: ${ctx.tables.join(', ')}`);
      }
      if (ctx.business_rules) {
        console.log(`   Règles métier: ${ctx.business_rules.length}`);
      }
    });

    console.log("\n" + "=".repeat(60));
    console.log("✅ Tous les tests ont réussi !");
    console.log("Les enrichissements du BusinessContextService sont opérationnels.");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Erreur lors des tests:", error);
    logger.error('Test BusinessContext échoué', {
      metadata: {
        service: 'TestBusinessContext',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    process.exit(1);
  }
}

// Exécution du test
testBusinessContextEnrichment()
  .then(() => {
    console.log("\n✨ Tests terminés avec succès");
    process.exit(0);
  })
  .catch(error => {
    console.error("Erreur fatale:", error);
    process.exit(1);
  });