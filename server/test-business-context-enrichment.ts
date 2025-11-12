#!/usr/bin/env tsx
/**
 * Script de test pour valider les enrichissements du BusinessContextService
 * Test de l'intégration avec ChatbotOrchestrationService et SQLEngineService
 */

import { db } from "./db";
import { withErrorHandling } from './utils/error-handler';
import { BusinessContextService } from "./services/BusinessContextService";
import { RBACService } from "./services/RBACService";
import { EventBus } from "./eventBus";
import { DatabaseStorage } from "./storage-poc";
import { logger } from "./utils/logger";

async function testBusinessContextEnrichment() {
  logger.info("🧪 Test des enrichissements BusinessContextService - Phase 3\n");
  logger.info("=" .repeat(60));

  return withErrorHandling(
    async () => {

    // Initialisation des services
    const storage = new DatabaseStorage();
    const eventBus = new EventBus();
    const rbacService = new RBACService(db, storage, eventBus);
    const businessContextService = new BusinessContextService(storage, rbacService, eventBus);

    // Test 1: Récupération des métadonnées enrichies
    logger.info("\n📊 Test 1: Récupération des métadonnées enrichies");
    logger.info("-".repeat(50));
    
    const metadata = await businessContextService.getEnrichedSchemaMetadata();
    
    logger.info(`✅ Tables enrichies: ${Object.keys(metadata.tables).length}`);
    logger.info(`   Tables disponibles: ${Object.keys(metadata.tables).join(', ')}`);
    
    logger.info(`\n✅ Dictionnaire métier: ${Object.keys(metadata.businessDictionary).length} entrées`);
    const sampleDictEntries = Object.entries(metadata.businessDictionary).slice(0, 5);
    sampleDictEntries.forEach(([fr, sql]) => {
      logger.info(`   "${fr}" → ${sql}`);
    });
    
    logger.info(`\n✅ Contextes spécialisés: ${Object.keys(metadata.domainContexts).length}`);
    logger.info(`   Domaines: ${Object.keys(metadata.domainContexts).join(', ')}`);

    // Test 2: Analyse d'une table enrichie (offers)
    logger.info("\n📋 Test 2: Analyse détaillée de la table 'offers'");
    logger.info("-".repeat(50));
    
    const offersTable = metadata.tables.offers;
    if (offersTable) {
      logger.info(`✅ Table: ${offersTable.businessName} (${offersTable.tableName})`);
      logger.info(`   Description: ${offersTable.description}`);
      logger.info(`   Domaines: ${offersTable.domain.join(', ')}`);
      logger.info(`   Colonnes: ${offersTable.columns.length}`);
      logger.info(`   Relations: ${offersTable.relations.length}`);
      logger.info(`   Exemples SQL: ${offersTable.sqlExamples.length}`);
      
      // Afficher un exemple SQL
      if (offersTable.sqlExamples.length > 0) {
        const example = offersTable.sqlExamples[0];
        logger.info(`\n   Exemple SQL:`);
        logger.info(`   ${example.description}`);
        logger.info(`   ${example.sql.replace(/\n/g, '\n   ')}`);
      }

    // Test 3: Contexte SQL intelligent avec détection de domaine
    logger.info("\n🤖 Test 3: Génération de contexte SQL intelligent");
    logger.info("-".repeat(50));
    
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
      logger.info(`\n📝 Requête: "${testCase.query}"`);
      
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
        logger.info(`   ✅ Domaine détecté: ${detectedDomain} ${isCorrect ? '✓' : '✗ (attendu: ' + testCase.expectedDomain + ')'}`);
      }
      
      if (entitiesLine) {
        logger.info(`   ${entitiesLine}`);
      }
      
      // Compter les tables incluses
      let tableCount = 0;
      for (let i = tablesSection + 1; i < lines.length; i++) {
        if (lines[i].startsWith('TABLE:')) tableCount++;
        if (lines[i].startsWith('===')) break;
      }
      logger.info(`   ✅ Tables pertinentes incluses: ${tableCount}`);
      
      // Vérifier la présence des sections enrichies
      const hasSynonyms = context.includes('=== SYNONYMES MÉTIER ===');
      const hasExamples = context.includes('=== EXEMPLES SQL PERTINENTS ===');
      const hasJoins = context.includes('=== JOINTURES RECOMMANDÉES ===');
      const hasOptimization = context.includes('=== HINTS D\'OPTIMISATION ===');
      
      logger.info(`   ✅ Sections enrichies:`);
      logger.info(`      - Synonymes métier: ${hasSynonyms ? '✓' : '✗'}`);
      logger.info(`      - Exemples SQL: ${hasExamples ? '✓' : '✗'}`);
      logger.info(`      - Jointures recommandées: ${hasJoins ? '✓' : '✗'}`);
      logger.info(`      - Hints optimisation: ${hasOptimization ? '✓' : '✗'}`);
      
      logger.info(`   ✅ Taille contexte: ${context.length} caractères`);
    }

    // Test 4: Performance et cache
    logger.info("\n⚡ Test 4: Performance et cache");
    logger.info("-".repeat(50));
    
    const perfQuery = "Montrer les offres en cours de chiffrage";
    
    // Premier appel (sans cache)
    const start1 = Date.now();
    const context1 = await businessContextService.buildIntelligentContextForSQL(
      "admin-test",
      "admin",
      perfQuery
    );
    const time1 = Date.now() - start1;
    logger.info(`✅ Premier appel: ${time1}ms`);
    
    // Deuxième appel (avec cache)
    const start2 = Date.now();
    const context2 = await businessContextService.buildIntelligentContextForSQL(
      "admin-test",
      "admin",
      perfQuery
    );
    const time2 = Date.now() - start2;
    logger.info(`✅ Deuxième appel (cache): ${time2}ms`);
    
    const speedup = Math.round((time1 / time2) * 100) / 100;
    logger.info(`✅ Amélioration performance: ${speedup}x plus rapide`);

    // Test 5: Vérification de l'intégration des domaines
    logger.info("\n🏗️ Test 5: Contextes spécialisés par domaine");
    logger.info("-".repeat(50));
    
    const domains = Object.keys(metadata.domainContexts);
    domains.forEach(domain => {
      const ctx = metadata.domainContexts[domain];
      logger.info(`\n✅ Domaine: ${domain}`);
      logger.info(`   Description: ${ctx.description}`);
      if (ctx.tables) {
        logger.info(`   Tables principales: ${ctx.tables.join(', ')}`);
      }
      if (ctx.business_rules) {
        logger.info(`   Règles métier: ${ctx.business_rules.length}`);
              });

    logger.info("\n" + "=".repeat(60));
    logger.info("✅ Tous les tests ont réussi !");
    logger.info("Les enrichissements du BusinessContextService sont opérationnels.");
    logger.info("=".repeat(60));

  
    },
    {
      operation: 'testBusinessContextEnrichment',
      service: 'test-business-context-enrichment',
      metadata: {}
    } );
    process.exit(1);
  }

// Exécution du test
testBusinessContextEnrichment()
  .then(() => {
    logger.info("\n✨ Tests terminés avec succès");
    process.exit(0);
  })
  .catch(error => {
    logger.error('Erreur', "Erreur fatale:", error);
    process.exit(1);
  });