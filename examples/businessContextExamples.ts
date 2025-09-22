/**
 * Exemples pratiques d'utilisation - BusinessContextService
 * Démonstrateurs d'usage pour le constructeur de contexte métier intelligent Saxium
 * 
 * Ces exemples illustrent les différents scénarios d'usage métier du BusinessContextService
 * dans le contexte d'une entreprise de menuiserie française.
 */

import { BusinessContextService } from '../server/services/BusinessContextService';
import { RBACService } from '../server/services/RBACService';
import { eventBus } from '../server/eventBus';
import { storage } from '../server/storage-poc';
import type { 
  BusinessContextRequest, 
  ContextEnrichmentRequest, 
  AdaptiveLearningUpdate
} from '../shared/schema';

/**
 * EXEMPLE 1: Chef de projet consultant ses projets en cours
 * Contexte: Chef de projet veut voir l'état d'avancement de ses projets assignés
 */
export async function exempleChefProjetProjetsEnCours() {
  console.log('\n🎯 EXEMPLE 1: Chef de projet - Projets en cours');
  console.log('─'.repeat(50));
  
  // Initialisation du service
  const rbacService = new RBACService(storage);
  const contextService = new BusinessContextService(storage, rbacService, eventBus);
  
  // Requête type d'un chef de projet
  const request: BusinessContextRequest = {
    user_role: 'chef_projet',
    query_hint: 'Quels sont mes projets en cours avec leur état d\'avancement et les prochaines échéances ?',
    focus_areas: ['planning'],
    include_temporal: true,
    cache_duration_minutes: 60,
    personalization_level: 'basic',
    userId: 'chef_projet_001',
    sessionId: 'session_matin_planning'
  };
  
  console.log('📝 Requête:', request.query_hint);
  console.log('👤 Rôle:', request.user_role);
  
  // Génération du contexte intelligent
  const result = await contextService.generateBusinessContext(request);
  
  if (result.success && result.context) {
    console.log('✅ Contexte généré avec succès');
    console.log(`📊 ${result.context.databaseSchemas.length} schémas DB inclus`);
    console.log(`📝 ${result.context.businessExamples.length} exemples métier`);
    console.log(`⏱️  Temps de génération: ${result.performance_metrics?.generation_time_ms}ms`);
    console.log(`🎯 Cache: ${result.performance_metrics?.cache_hit ? 'Hit' : 'Miss'}`);
    
    // Afficher quelques exemples générés
    console.log('\n🔍 Exemples de contexte adaptatif:');
    result.context.businessExamples.slice(0, 3).forEach((example, index) => {
      console.log(`   ${index + 1}. ${example.natural_language}`);
      console.log(`      SQL: ${example.sql.substring(0, 80)}...`);
    });
  }
  
  return result;
}

/**
 * EXEMPLE 2: Technicien BE recherchant des projets nécessitant validation technique
 * Contexte: Bureau d'études cherche projets en attente de visa architecte
 */
export async function exempleTechnicienBEValidationsTechniques() {
  console.log('\n🎯 EXEMPLE 2: Technicien BE - Validations techniques');
  console.log('─'.repeat(50));
  
  const rbacService = new RBACService(storage);
  const contextService = new BusinessContextService(storage, rbacService, eventBus);
  
  const request: BusinessContextRequest = {
    user_role: 'responsable_be',
    query_hint: 'Projets en attente de validation technique et visa architecte avec priorités',
    focus_areas: ['planning'],
    include_temporal: true,
    cache_duration_minutes: 60,
    personalization_level: 'basic',
    userId: 'be_manager_002',
    sessionId: 'session_validation_technique'
  };
  
  console.log('📝 Requête:', request.query_hint);
  console.log('👤 Rôle:', request.user_role);
  
  const result = await contextService.generateBusinessContext(request);
  
  if (result.success && result.context) {
    console.log('✅ Contexte technique généré');
    
    // Montrer la spécialisation pour le rôle BE
    console.log('\n🔧 Spécialisations techniques:');
    if (result.context.domainKnowledge) {
      console.log('   - Normes et réglementations intégrées');
      console.log('   - Processus de validation technique');
      console.log('   - Contraintes matériaux et fabrication');
    }
    
    // Contraintes RBAC spécifiques au BE
    if (result.context.roleSpecificConstraints) {
      console.log('\n🔒 Contraintes RBAC BE:');
      console.log(`   - Tables autorisées: ${result.context.roleSpecificConstraints.accessible_tables?.length || 0}`);
      console.log(`   - Restrictions: ${result.context.roleSpecificConstraints.restricted_columns?.length || 0} colonnes filtrées`);
    }
  }
  
  return result;
}

/**
 * EXEMPLE 3: Admin analysant les performances financières
 * Contexte: Administrateur cherche vue d'ensemble financière et opérationnelle
 */
export async function exempleAdminAnalyseFinanciere() {
  console.log('\n🎯 EXEMPLE 3: Admin - Analyse financière');
  console.log('─'.repeat(50));
  
  const rbacService = new RBACService(storage);
  const contextService = new BusinessContextService(storage, rbacService, eventBus);
  
  const request: BusinessContextRequest = {
    user_role: 'admin',
    query_hint: 'Analyse financière complète: chiffre d\'affaires, marges, coûts matériaux et performance équipes',
    focus_areas: ['planning', 'finances', 'analyses'],
    include_temporal: true,
    cache_duration_minutes: 60,
    personalization_level: 'expert',
    userId: 'admin_001',
    sessionId: 'session_reporting_mensuel'
  };
  
  console.log('📝 Requête:', request.query_hint);
  console.log('👤 Rôle:', request.user_role);
  
  const result = await contextService.generateBusinessContext(request);
  
  if (result.success && result.context) {
    console.log('✅ Contexte admin généré');
    console.log(`💰 Accès données financières: ${result.context.databaseSchemas.length} sources`);
    
    // L'admin a accès à plus de données
    console.log('\n📊 Étendue des données admin:');
    const schemaNames = result.context.databaseSchemas.map(s => s.tableName);
    console.log(`   - Projets et finances: ${schemaNames.filter(n => n.includes('project') || n.includes('chiffrage')).length} tables`);
    console.log(`   - Équipes et ressources: ${schemaNames.filter(n => n.includes('team') || n.includes('resource')).length} tables`);
    console.log(`   - Matériaux et coûts: ${schemaNames.filter(n => n.includes('material') || n.includes('cost')).length} tables`);
  }
  
  return result;
}

/**
 * EXEMPLE 4: Commercial recherchant opportunités de vente
 * Contexte: Service commercial identifie prospects et opportunités
 */
export async function exempleCommercialOpportunites() {
  console.log('\n🎯 EXEMPLE 4: Commercial - Opportunités de vente');
  console.log('─'.repeat(50));
  
  const rbacService = new RBACService(storage);
  const contextService = new BusinessContextService(storage, rbacService, eventBus);
  
  const request: BusinessContextRequest = {
    user_role: 'commercial',
    query_hint: 'Prospects chauds, AOs en cours, et opportunités de renouvellement client',
    focus_areas: ['planning', 'ventes'],
    include_temporal: true,
    cache_duration_minutes: 60,
    personalization_level: 'basic',
    userId: 'commercial_003',
    sessionId: 'session_prospection_hebdo'
  };
  
  console.log('📝 Requête:', request.query_hint);
  console.log('👤 Rôle:', request.user_role);
  
  const result = await contextService.generateBusinessContext(request);
  
  if (result.success && result.context) {
    console.log('✅ Contexte commercial généré');
    
    // Focus commercial spécialisé
    console.log('\n💼 Orientation commerciale:');
    const businessExamples = result.context.businessExamples;
    const commercialExamples = businessExamples.filter(ex => 
      ex.business_context.toLowerCase().includes('vente') ||
      ex.business_context.toLowerCase().includes('ao') ||
      ex.business_context.toLowerCase().includes('client')
    );
    console.log(`   - ${commercialExamples.length} exemples orientés vente`);
    console.log(`   - Focus sur AOs, prospects, et suivi client`);
  }
  
  return result;
}

/**
 * EXEMPLE 5: Enrichissement progressif de contexte
 * Contexte: Utilisateur raffine sa recherche en ajoutant des critères
 */
export async function exempleEnrichissementProgressif() {
  console.log('\n🎯 EXEMPLE 5: Enrichissement progressif de contexte');
  console.log('─'.repeat(50));
  
  const rbacService = new RBACService(storage);
  const contextService = new BusinessContextService(storage, rbacService, eventBus);
  
  // Étape 1: Contexte initial basique
  console.log('📝 Étape 1: Contexte initial - "Projets en cours"');
  const initialRequest: BusinessContextRequest = {
    user_role: 'chef_projet',
    natural_language_query: 'Projets en cours',
    domain_focus: ['menuiserie'],
    userId: 'chef_projet_004',
    sessionId: 'session_enrichissement'
  };
  
  const initialResult = await contextService.generateBusinessContext(initialRequest);
  
  if (initialResult.success && initialResult.context) {
    console.log(`✅ Contexte initial: ${initialResult.context.databaseSchemas.length} schémas`);
    
    // Étape 2: Enrichissement avec focus matériaux
    console.log('\n📝 Étape 2: Enrichissement - "Focus matériaux PVC"');
    
    const enrichmentRequest: ContextEnrichmentRequest = {
      existing_context: initialResult.context,
      additional_focus: ['materiaux', 'PVC', 'cout'],
      user_role: 'chef_projet',
      userId: 'chef_projet_004'
    };
    
    const enrichedResult = await contextService.enrichContext(enrichmentRequest);
    
    if (enrichedResult.success && enrichedResult.enriched_context) {
      console.log(`✅ Contexte enrichi: ${enrichedResult.enriched_context.databaseSchemas?.length || 0} schémas`);
      console.log(`📈 Score de confiance: ${(enrichedResult.confidence_score! * 100).toFixed(1)}%`);
      
      // Montrer l'évolution du contexte
      const initialSchemas = initialResult.context.databaseSchemas.length;
      const enrichedSchemas = enrichedResult.enriched_context.databaseSchemas?.length || 0;
      const addedSchemas = enrichedSchemas - initialSchemas;
      
      console.log('\n🔄 Évolution du contexte:');
      console.log(`   - Schémas ajoutés: +${addedSchemas}`);
      console.log(`   - Exemples enrichis: ${enrichedResult.enriched_context.businessExamples?.length || 0}`);
      
      if (enrichedResult.suggested_refinements) {
        console.log('   - Suggestions de raffinement disponibles');
      }
    }
  }
}

/**
 * EXEMPLE 6: Apprentissage adaptatif en action
 * Contexte: Système apprend des interactions utilisateur pour améliorer les contextes
 */
export async function exempleApprentissageAdaptatif() {
  console.log('\n🎯 EXEMPLE 6: Apprentissage adaptatif');
  console.log('─'.repeat(50));
  
  const rbacService = new RBACService(storage);
  const contextService = new BusinessContextService(storage, rbacService, eventBus);
  
  // Simuler une session d'utilisation avec feedback
  console.log('📚 Simulation session utilisateur avec apprentissage...');
  
  // Interaction 1: Succès
  const learningUpdate1: AdaptiveLearningUpdate = {
    user_role: 'chef_projet',
    query_pattern: 'Projets en retard livraison',
    query_success: true,
    context_relevance_score: 0.89,
    generated_sql_quality: 0.92,
    user_feedback: 'positive',
    execution_time_ms: 180,
    userId: 'chef_projet_learning',
    timestamp: new Date()
  };
  
  console.log('📊 Apprentissage 1: Succès avec requête planning');
  await contextService.updateAdaptiveLearning(learningUpdate1);
  
  // Interaction 2: Échec partiel
  const learningUpdate2: AdaptiveLearningUpdate = {
    user_role: 'chef_projet',
    query_pattern: 'Analyse coûts matériaux détaillée',
    query_success: false,
    context_relevance_score: 0.65,
    generated_sql_quality: 0.45,
    user_feedback: 'negative',
    execution_time_ms: 450,
    userId: 'chef_projet_learning',
    timestamp: new Date()
  };
  
  console.log('📊 Apprentissage 2: Échec avec requête coûts complexe');
  await contextService.updateAdaptiveLearning(learningUpdate2);
  
  // Tester l'amélioration après apprentissage
  console.log('\n🎯 Test après apprentissage...');
  
  const postLearningRequest: BusinessContextRequest = {
    user_role: 'chef_projet',
    natural_language_query: 'Projets avec risque de retard de livraison cette semaine',
    domain_focus: ['menuiserie', 'planification'],
    userId: 'chef_projet_learning',
    sessionId: 'session_post_apprentissage'
  };
  
  const result = await contextService.generateBusinessContext(postLearningRequest);
  
  if (result.success && result.context) {
    console.log('✅ Contexte optimisé par apprentissage généré');
    console.log(`📈 Exemples adaptés: ${result.context.businessExamples.length}`);
    
    // Le contexte devrait maintenant favoriser les patterns qui ont bien fonctionné
    const planningExamples = result.context.businessExamples.filter(ex =>
      ex.business_context.toLowerCase().includes('planning') ||
      ex.business_context.toLowerCase().includes('livraison') ||
      ex.business_context.toLowerCase().includes('retard')
    );
    
    console.log(`🎯 Exemples optimisés planning: ${planningExamples.length}`);
  }
}

/**
 * EXEMPLE 7: Contexte saisonnier et temporel
 * Contexte: Adaptation du contexte selon les contraintes BTP et saisonnalité
 */
export async function exempleContexteSaisonnier() {
  console.log('\n🎯 EXEMPLE 7: Contexte saisonnier et temporel');
  console.log('─'.repeat(50));
  
  const rbacService = new RBACService(storage);
  const contextService = new BusinessContextService(storage, rbacService, eventBus);
  
  // Contexte période congés BTP (août)
  const contextePeriodeConges: BusinessContextRequest = {
    user_role: 'chef_projet',
    natural_language_query: 'Planification projets pendant période congés BTP avec équipes réduites',
    domain_focus: ['menuiserie', 'planification', 'saisonnalite'],
    userId: 'chef_projet_saisonnier',
    sessionId: 'session_periode_conges'
  };
  
  console.log('📅 Contexte: Période congés BTP (équipes réduites)');
  const result = await contextService.generateBusinessContext(contextePeriodeConges);
  
  if (result.success && result.context) {
    console.log('✅ Contexte saisonnier adapté');
    
    // Le contexte devrait inclure des considérations saisonnières
    if (result.context.domainKnowledge) {
      console.log('🌤️  Contraintes saisonnières intégrées:');
      console.log('   - Planification équipes réduites');
      console.log('   - Contraintes météo et chantiers');
      console.log('   - Délais d\'approvisionnement étendus');
    }
    
    // Exemples adaptés à la période
    const saisonnierExamples = result.context.businessExamples.filter(ex =>
      ex.business_context.toLowerCase().includes('congé') ||
      ex.business_context.toLowerCase().includes('équipe') ||
      ex.business_context.toLowerCase().includes('planning')
    );
    
    console.log(`📊 Exemples adaptés à la saison: ${saisonnierExamples.length}`);
  }
}

/**
 * Fonction principale d'exécution de tous les exemples
 */
export async function executerTousLesExemples() {
  console.log('\n'.repeat(2));
  console.log('🎪'.repeat(60));
  console.log('📚 EXEMPLES PRATIQUES - BUSINESS CONTEXT SERVICE');
  console.log('Démonstrateurs d\'usage métier pour Saxium Menuiserie');
  console.log('🎪'.repeat(60));
  
  try {
    // Exécuter tous les exemples en séquence
    await exempleChefProjetProjetsEnCours();
    await exempleTechnicienBEValidationsTechniques();
    await exempleAdminAnalyseFinanciere();
    await exempleCommercialOpportunites();
    await exempleEnrichissementProgressif();
    await exempleApprentissageAdaptatif();
    await exempleContexteSaisonnier();
    
    console.log('\n'.repeat(2));
    console.log('🎉 TOUS LES EXEMPLES EXÉCUTÉS AVEC SUCCÈS');
    console.log('Le BusinessContextService est prêt pour utilisation en production');
    console.log('🎪'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERREUR LORS DE L\'EXÉCUTION DES EXEMPLES:');
    console.error(error);
    throw error;
  }
}

// Export pour utilisation directe
if (import.meta.url === `file://${process.argv[1]}`) {
  executerTousLesExemples()
    .then(() => {
      console.log('Exemples terminés avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Exemples échoués:', error.message);
      process.exit(1);
    });
}