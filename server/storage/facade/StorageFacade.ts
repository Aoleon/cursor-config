/**
 * Facade unifiée pour le système de storage
 * 
 * Cette facade expose l'interface IStorage existante et délègue toutes les opérations
 * au DatabaseStorage (storage-poc.ts) pour l'instant.
 * 
 * Au fur et à mesure de la migration, les méthodes seront progressivement redirigées
 * vers les nouveaux repositories modulaires tout en maintenant la compatibilité.
 */

import type { IStorage, DatabaseStorage as DatabaseStorageType } from '../../storage-poc';
import { DatabaseStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { logger } from '../../utils/logger';
import { db } from '../../db';

/**
 * Facade de storage qui unifie l'accès aux données
 * 
 * Pour l'instant, cette classe délègue simplement toutes les opérations
 * au DatabaseStorage existant via un Proxy transparent. Au fur et à mesure 
 * de la refactorisation, nous remplacerons progressivement les implémentations 
 * par les nouveaux repositories modulaires.
 * 
 * Pattern de migration progressive:
 * 1. Toutes les routes utilisent storageFacade au lieu de storage
 * 2. On implémente un nouveau repository (ex: OfferRepository)
 * 3. On remplace l'implémentation dans la facade pour ce domaine
 * 4. Les routes continuent de fonctionner sans changement
 * 
 * @example
 * ```typescript
 * // Avant (ancien code)
 * import { storage } from './storage-poc';
 * const offer = await storage.getOffer(id);
 * 
 * // Après (nouveau code)
 * import { storageFacade } from './storage/facade/StorageFacade';
 * const offer = await storageFacade.getOffer(id);
 * ```
 */
export class StorageFacade {
  /**
   * Instance du storage legacy (storage-poc.ts)
   * Toutes les méthodes délèguent à cette instance pour l'instant
   */
  private readonly legacyStorage: IStorage;

  /**
   * Instance de la base de données
   * Utilisée pour instancier les nouveaux repositories modulaires
   */
  private readonly db: any;

  /**
   * Event bus pour les notifications
   */
  private readonly eventBus: EventBus;

  /**
   * Logger contextualisé pour la facade
   */
  private readonly facadeLogger = logger.child('StorageFacade');

  /**
   * Nouveaux repositories modulaires (seront ajoutés progressivement)
   * 
   * @example
   * ```typescript
   * private offerRepository?: OfferRepository;
   * private aoRepository?: AoRepository;
   * ```
   */
  // TODO: Ajouter les repositories au fur et à mesure de leur implémentation

  /**
   * Constructeur
   * 
   * @param dbInstance - Instance de la base de données (par défaut : db global)
   * @param eventBus - Event bus pour les notifications
   */
  constructor(eventBus: EventBus, dbInstance: any = db) {
    this.db = dbInstance;
    this.eventBus = eventBus;
    this.legacyStorage = new DatabaseStorage(eventBus);
    
    this.facadeLogger.info('StorageFacade initialisée', {
      metadata: {
        module: 'StorageFacade',
        operation: 'constructor',
        status: 'delegating_to_legacy',
        hasDb: !!this.db,
        hasEventBus: !!this.eventBus
      }
    });

    // TODO: Initialiser les nouveaux repositories ici au fur et à mesure
    // this.offerRepository = new OfferRepository(this.db, this.eventBus);
    // this.aoRepository = new AoRepository(this.db, this.eventBus);
  }

  /**
   * Retourne l'instance legacy storage
   * Utilisé pour délégation transparente de toutes les méthodes
   */
  private getStorage(): IStorage {
    return this.legacyStorage;
  }

  // ========================================
  // PATTERN DE DÉLÉGATION TRANSPARENT
  // ========================================
  //
  // Au lieu d'implémenter manuellement chaque méthode de IStorage (100+ méthodes),
  // nous utilisons un système de délégation transparent via des getters.
  // 
  // Cela nous permet de :
  // 1. Avoir une façade fonctionnelle immédiatement
  // 2. Migrer progressivement les méthodes vers les nouveaux repositories
  // 3. Maintenir la compatibilité avec l'interface IStorage
  //
  // Pour migrer une méthode spécifique vers un nouveau repository:
  // 1. Déclarer une méthode explicite qui overrides le getter
  // 2. Utiliser le nouveau repository dans cette méthode
  //
  // Exemple:
  // ```typescript
  // async getOffer(id: string) {
  //   // Migration vers nouveau repository
  //   return this.offerRepository!.findById(id);
  // }
  // ```
  
  // User operations
  get getUsers() { return this.legacyStorage.getUsers.bind(this.legacyStorage); }
  get getUser() { return this.legacyStorage.getUser.bind(this.legacyStorage); }
  get upsertUser() { return this.legacyStorage.upsertUser.bind(this.legacyStorage); }

  // AO operations
  get getAos() { return this.legacyStorage.getAos.bind(this.legacyStorage); }
  get getAOsPaginated() { return this.legacyStorage.getAOsPaginated.bind(this.legacyStorage); }
  get getAo() { return this.legacyStorage.getAo.bind(this.legacyStorage); }
  get getAOByMondayItemId() { return this.legacyStorage.getAOByMondayItemId.bind(this.legacyStorage); }
  get createAo() { return this.legacyStorage.createAo.bind(this.legacyStorage); }
  get updateAo() { return this.legacyStorage.updateAo.bind(this.legacyStorage); }
  get deleteAo() { return this.legacyStorage.deleteAo.bind(this.legacyStorage); }

  // Offer operations  
  get getOffers() { return this.legacyStorage.getOffers.bind(this.legacyStorage); }
  get getOffersPaginated() { return this.legacyStorage.getOffersPaginated.bind(this.legacyStorage); }
  get getCombinedOffersPaginated() { return this.legacyStorage.getCombinedOffersPaginated.bind(this.legacyStorage); }
  get getOffer() { return this.legacyStorage.getOffer.bind(this.legacyStorage); }
  get getOfferById() { return this.legacyStorage.getOfferById.bind(this.legacyStorage); }
  get createOffer() { return this.legacyStorage.createOffer.bind(this.legacyStorage); }
  get updateOffer() { return this.legacyStorage.updateOffer.bind(this.legacyStorage); }
  get deleteOffer() { return this.legacyStorage.deleteOffer.bind(this.legacyStorage); }

  // Project operations
  get getProjects() { return this.legacyStorage.getProjects.bind(this.legacyStorage); }
  get getProjectsPaginated() { return this.legacyStorage.getProjectsPaginated.bind(this.legacyStorage); }
  get getProject() { return this.legacyStorage.getProject.bind(this.legacyStorage); }
  get getProjectsByOffer() { return this.legacyStorage.getProjectsByOffer.bind(this.legacyStorage); }
  get createProject() { return this.legacyStorage.createProject.bind(this.legacyStorage); }
  get updateProject() { return this.legacyStorage.updateProject.bind(this.legacyStorage); }
  get updateProjectMondayId() { return this.legacyStorage.updateProjectMondayId.bind(this.legacyStorage); }
  get updateAOMondayId() { return this.legacyStorage.updateAOMondayId.bind(this.legacyStorage); }
  get getProjectsToExport() { return this.legacyStorage.getProjectsToExport.bind(this.legacyStorage); }
  get getAOsToExport() { return this.legacyStorage.getAOsToExport.bind(this.legacyStorage); }

  // Project task operations
  get getProjectTasks() { return this.legacyStorage.getProjectTasks.bind(this.legacyStorage); }
  get getAllTasks() { return this.legacyStorage.getAllTasks.bind(this.legacyStorage); }
  get createProjectTask() { return this.legacyStorage.createProjectTask.bind(this.legacyStorage); }
  get updateProjectTask() { return this.legacyStorage.updateProjectTask.bind(this.legacyStorage); }

  // Supplier operations
  get getSuppliers() { return this.legacyStorage.getSuppliers.bind(this.legacyStorage); }
  get getSupplier() { return this.legacyStorage.getSupplier.bind(this.legacyStorage); }
  get createSupplier() { return this.legacyStorage.createSupplier.bind(this.legacyStorage); }
  get updateSupplier() { return this.legacyStorage.updateSupplier.bind(this.legacyStorage); }
  get deleteSupplier() { return this.legacyStorage.deleteSupplier.bind(this.legacyStorage); }

  // Supplier request operations
  get getSupplierRequests() { return this.legacyStorage.getSupplierRequests.bind(this.legacyStorage); }
  get createSupplierRequest() { return this.legacyStorage.createSupplierRequest.bind(this.legacyStorage); }
  get updateSupplierRequest() { return this.legacyStorage.updateSupplierRequest.bind(this.legacyStorage); }

  // Team resource operations
  get getTeamResources() { return this.legacyStorage.getTeamResources.bind(this.legacyStorage); }
  get createTeamResource() { return this.legacyStorage.createTeamResource.bind(this.legacyStorage); }
  get updateTeamResource() { return this.legacyStorage.updateTeamResource.bind(this.legacyStorage); }

  // BE Workload operations
  get getBeWorkload() { return this.legacyStorage.getBeWorkload.bind(this.legacyStorage); }
  get createOrUpdateBeWorkload() { return this.legacyStorage.createOrUpdateBeWorkload.bind(this.legacyStorage); }

  // Dashboard statistics
  get getDashboardStats() { return this.legacyStorage.getDashboardStats.bind(this.legacyStorage); }
  get getConsolidatedKpis() { return this.legacyStorage.getConsolidatedKpis.bind(this.legacyStorage); }

  // Chiffrage Elements operations
  get getChiffrageElementsByOffer() { return this.legacyStorage.getChiffrageElementsByOffer.bind(this.legacyStorage); }
  get getChiffrageElementsByLot() { return this.legacyStorage.getChiffrageElementsByLot.bind(this.legacyStorage); }
  get createChiffrageElement() { return this.legacyStorage.createChiffrageElement.bind(this.legacyStorage); }
  get updateChiffrageElement() { return this.legacyStorage.updateChiffrageElement.bind(this.legacyStorage); }
  get deleteChiffrageElement() { return this.legacyStorage.deleteChiffrageElement.bind(this.legacyStorage); }

  // DPGF Documents operations
  get getDpgfDocumentByOffer() { return this.legacyStorage.getDpgfDocumentByOffer.bind(this.legacyStorage); }
  get createDpgfDocument() { return this.legacyStorage.createDpgfDocument.bind(this.legacyStorage); }
  get updateDpgfDocument() { return this.legacyStorage.updateDpgfDocument.bind(this.legacyStorage); }
  get deleteDpgfDocument() { return this.legacyStorage.deleteDpgfDocument.bind(this.legacyStorage); }

  // AO Lots operations
  get getAoLots() { return this.legacyStorage.getAoLots.bind(this.legacyStorage); }
  get createAoLot() { return this.legacyStorage.createAoLot.bind(this.legacyStorage); }
  get updateAoLot() { return this.legacyStorage.updateAoLot.bind(this.legacyStorage); }
  get deleteAoLot() { return this.legacyStorage.deleteAoLot.bind(this.legacyStorage); }

  // Maîtres d'ouvrage operations
  get getMaitresOuvrage() { return this.legacyStorage.getMaitresOuvrage.bind(this.legacyStorage); }
  get getMaitreOuvrage() { return this.legacyStorage.getMaitreOuvrage.bind(this.legacyStorage); }
  get createMaitreOuvrage() { return this.legacyStorage.createMaitreOuvrage.bind(this.legacyStorage); }
  get updateMaitreOuvrage() { return this.legacyStorage.updateMaitreOuvrage.bind(this.legacyStorage); }
  get deleteMaitreOuvrage() { return this.legacyStorage.deleteMaitreOuvrage.bind(this.legacyStorage); }

  // Maîtres d'œuvre operations
  get getMaitresOeuvre() { return this.legacyStorage.getMaitresOeuvre.bind(this.legacyStorage); }
  get getMaitreOeuvre() { return this.legacyStorage.getMaitreOeuvre.bind(this.legacyStorage); }
  get createMaitreOeuvre() { return this.legacyStorage.createMaitreOeuvre.bind(this.legacyStorage); }
  get updateMaitreOeuvre() { return this.legacyStorage.updateMaitreOeuvre.bind(this.legacyStorage); }
  get deleteMaitreOeuvre() { return this.legacyStorage.deleteMaitreOeuvre.bind(this.legacyStorage); }

  // Contact deduplication methods
  get findOrCreateMaitreOuvrage() { return this.legacyStorage.findOrCreateMaitreOuvrage.bind(this.legacyStorage); }
  get findOrCreateMaitreOeuvre() { return this.legacyStorage.findOrCreateMaitreOeuvre.bind(this.legacyStorage); }
  get findOrCreateContact() { return this.legacyStorage.findOrCreateContact.bind(this.legacyStorage); }
  get linkAoContact() { return this.legacyStorage.linkAoContact.bind(this.legacyStorage); }

  // Contacts Maître d'Œuvre operations
  get getContactsMaitreOeuvre() { return this.legacyStorage.getContactsMaitreOeuvre.bind(this.legacyStorage); }
  get createContactMaitreOeuvre() { return this.legacyStorage.createContactMaitreOeuvre.bind(this.legacyStorage); }
  get updateContactMaitreOeuvre() { return this.legacyStorage.updateContactMaitreOeuvre.bind(this.legacyStorage); }
  get deleteContactMaitreOeuvre() { return this.legacyStorage.deleteContactMaitreOeuvre.bind(this.legacyStorage); }

  // AO-Contacts liaison operations
  get getAoContacts() { return this.legacyStorage.getAoContacts.bind(this.legacyStorage); }
  get createAoContact() { return this.legacyStorage.createAoContact.bind(this.legacyStorage); }
  get deleteAoContact() { return this.legacyStorage.deleteAoContact.bind(this.legacyStorage); }

  // Project-Contacts liaison operations
  get getProjectContacts() { return this.legacyStorage.getProjectContacts.bind(this.legacyStorage); }
  get createProjectContact() { return this.legacyStorage.createProjectContact.bind(this.legacyStorage); }
  get deleteProjectContact() { return this.legacyStorage.deleteProjectContact.bind(this.legacyStorage); }

  // Validation Milestones operations
  get getValidationMilestones() { return this.legacyStorage.getValidationMilestones.bind(this.legacyStorage); }
  get createValidationMilestone() { return this.legacyStorage.createValidationMilestone.bind(this.legacyStorage); }
  get updateValidationMilestone() { return this.legacyStorage.updateValidationMilestone.bind(this.legacyStorage); }
  get deleteValidationMilestone() { return this.legacyStorage.deleteValidationMilestone.bind(this.legacyStorage); }

  // Visa Architecte operations
  get getVisaArchitecte() { return this.legacyStorage.getVisaArchitecte.bind(this.legacyStorage); }
  get createVisaArchitecte() { return this.legacyStorage.createVisaArchitecte.bind(this.legacyStorage); }
  get updateVisaArchitecte() { return this.legacyStorage.updateVisaArchitecte.bind(this.legacyStorage); }
  get deleteVisaArchitecte() { return this.legacyStorage.deleteVisaArchitecte.bind(this.legacyStorage); }

  // Technical Alerts operations (toutes les méthodes IStorage)
  get enqueueTechnicalAlert() { return this.legacyStorage.enqueueTechnicalAlert.bind(this.legacyStorage); }
  get listTechnicalAlerts() { return this.legacyStorage.listTechnicalAlerts.bind(this.legacyStorage); }
  get getTechnicalAlert() { return this.legacyStorage.getTechnicalAlert.bind(this.legacyStorage); }
  get acknowledgeTechnicalAlert() { return this.legacyStorage.acknowledgeTechnicalAlert.bind(this.legacyStorage); }
  get validateTechnicalAlert() { return this.legacyStorage.validateTechnicalAlert.bind(this.legacyStorage); }
  get bypassTechnicalAlert() { return this.legacyStorage.bypassTechnicalAlert.bind(this.legacyStorage); }
  get getActiveBypassForAo() { return this.legacyStorage.getActiveBypassForAo.bind(this.legacyStorage); }
  get listTechnicalAlertHistory() { return this.legacyStorage.listTechnicalAlertHistory.bind(this.legacyStorage); }
  get addTechnicalAlertHistory() { return this.legacyStorage.addTechnicalAlertHistory.bind(this.legacyStorage); }
  get listAoSuppressionHistory() { return this.legacyStorage.listAoSuppressionHistory.bind(this.legacyStorage); }

  // Technical Scoring operations
  get getScoringConfig() { return this.legacyStorage.getScoringConfig.bind(this.legacyStorage); }
  get updateScoringConfig() { return this.legacyStorage.updateScoringConfig.bind(this.legacyStorage); }

  // Material Color Alert Rules operations
  get getMaterialColorRules() { return this.legacyStorage.getMaterialColorRules.bind(this.legacyStorage); }
  get setMaterialColorRules() { return this.legacyStorage.setMaterialColorRules.bind(this.legacyStorage); }

  // Project Timeline operations
  get getProjectTimelines() { return this.legacyStorage.getProjectTimelines.bind(this.legacyStorage); }
  get getAllProjectTimelines() { return this.legacyStorage.getAllProjectTimelines.bind(this.legacyStorage); }
  get createProjectTimeline() { return this.legacyStorage.createProjectTimeline.bind(this.legacyStorage); }
  get updateProjectTimeline() { return this.legacyStorage.updateProjectTimeline.bind(this.legacyStorage); }
  get deleteProjectTimeline() { return this.legacyStorage.deleteProjectTimeline.bind(this.legacyStorage); }

  // Date Intelligence operations
  get getActiveRules() { return this.legacyStorage.getActiveRules.bind(this.legacyStorage); }
  get getAllRules() { return this.legacyStorage.getAllRules.bind(this.legacyStorage); }
  get getRule() { return this.legacyStorage.getRule.bind(this.legacyStorage); }
  get createRule() { return this.legacyStorage.createRule.bind(this.legacyStorage); }
  get updateRule() { return this.legacyStorage.updateRule.bind(this.legacyStorage); }
  get deleteRule() { return this.legacyStorage.deleteRule.bind(this.legacyStorage); }

  // Date Alerts operations
  get getDateAlerts() { return this.legacyStorage.getDateAlerts.bind(this.legacyStorage); }
  get getDateAlert() { return this.legacyStorage.getDateAlert.bind(this.legacyStorage); }
  get createDateAlert() { return this.legacyStorage.createDateAlert.bind(this.legacyStorage); }
  get updateDateAlert() { return this.legacyStorage.updateDateAlert.bind(this.legacyStorage); }
  get deleteDateAlert() { return this.legacyStorage.deleteDateAlert.bind(this.legacyStorage); }

  // Analytics operations
  get createKPISnapshot() { return this.legacyStorage.createKPISnapshot.bind(this.legacyStorage); }
  get getKPISnapshots() { return this.legacyStorage.getKPISnapshots.bind(this.legacyStorage); }
  get getLatestKPISnapshot() { return this.legacyStorage.getLatestKPISnapshot.bind(this.legacyStorage); }
  get createBusinessMetric() { return this.legacyStorage.createBusinessMetric.bind(this.legacyStorage); }
  get getBusinessMetrics() { return this.legacyStorage.getBusinessMetrics.bind(this.legacyStorage); }
  get getMetricTimeSeries() { return this.legacyStorage.getMetricTimeSeries.bind(this.legacyStorage); }
  get createPerformanceBenchmark() { return this.legacyStorage.createPerformanceBenchmark.bind(this.legacyStorage); }
  get getBenchmarks() { return this.legacyStorage.getBenchmarks.bind(this.legacyStorage); }
  get getTopPerformers() { return this.legacyStorage.getTopPerformers.bind(this.legacyStorage); }
  get getAnalyticsSnapshots() { return this.legacyStorage.getAnalyticsSnapshots.bind(this.legacyStorage); }
  get createAnalyticsSnapshot() { return this.legacyStorage.createAnalyticsSnapshot.bind(this.legacyStorage); }
  get getMonthlyRevenueHistory() { return this.legacyStorage.getMonthlyRevenueHistory.bind(this.legacyStorage); }
  get getProjectDelayHistory() { return this.legacyStorage.getProjectDelayHistory.bind(this.legacyStorage); }
  get getTeamLoadHistory() { return this.legacyStorage.getTeamLoadHistory.bind(this.legacyStorage); }
  get saveForecastSnapshot() { return this.legacyStorage.saveForecastSnapshot.bind(this.legacyStorage); }
  get listForecastSnapshots() { return this.legacyStorage.listForecastSnapshots.bind(this.legacyStorage); }
  get getSectorBenchmarks() { return this.legacyStorage.getSectorBenchmarks.bind(this.legacyStorage); }

  // Business Alerts operations (méthodes correctes de IStorage)
  get createBusinessAlert() { return this.legacyStorage.createBusinessAlert.bind(this.legacyStorage); }
  get getBusinessAlertById() { return this.legacyStorage.getBusinessAlertById.bind(this.legacyStorage); }
  get listBusinessAlerts() { return this.legacyStorage.listBusinessAlerts.bind(this.legacyStorage); }
  get updateBusinessAlertStatus() { return this.legacyStorage.updateBusinessAlertStatus.bind(this.legacyStorage); }
  get dismissBusinessAlert() { return this.legacyStorage.dismissBusinessAlert.bind(this.legacyStorage); }

  // Alert Thresholds operations (méthodes correctes de IStorage)
  get getActiveThresholds() { return this.legacyStorage.getActiveThresholds.bind(this.legacyStorage); }
  get getThresholdById() { return this.legacyStorage.getThresholdById.bind(this.legacyStorage); }
  get createThreshold() { return this.legacyStorage.createThreshold.bind(this.legacyStorage); }
  get updateThreshold() { return this.legacyStorage.updateThreshold.bind(this.legacyStorage); }
  get deactivateThreshold() { return this.legacyStorage.deactivateThreshold.bind(this.legacyStorage); }
  get listThresholds() { return this.legacyStorage.listThresholds.bind(this.legacyStorage); }

  // SAV operations  
  get getProjectReserves() { return this.legacyStorage.getProjectReserves.bind(this.legacyStorage); }
  get createProjectReserve() { return this.legacyStorage.createProjectReserve.bind(this.legacyStorage); }
  get updateProjectReserve() { return this.legacyStorage.updateProjectReserve.bind(this.legacyStorage); }
  get getSavInterventions() { return this.legacyStorage.getSavInterventions.bind(this.legacyStorage); }
  get createSavIntervention() { return this.legacyStorage.createSavIntervention.bind(this.legacyStorage); }
  get updateSavIntervention() { return this.legacyStorage.updateSavIntervention.bind(this.legacyStorage); }
  get getSavWarrantyClaims() { return this.legacyStorage.getSavWarrantyClaims.bind(this.legacyStorage); }
  get createSavWarrantyClaim() { return this.legacyStorage.createSavWarrantyClaim.bind(this.legacyStorage); }
  get updateSavWarrantyClaim() { return this.legacyStorage.updateSavWarrantyClaim.bind(this.legacyStorage); }

  // Metrics Business operations
  get getMetricsBusiness() { return this.legacyStorage.getMetricsBusiness.bind(this.legacyStorage); }
  get getMetricsBusinessById() { return this.legacyStorage.getMetricsBusinessById.bind(this.legacyStorage); }
  get createMetricsBusiness() { return this.legacyStorage.createMetricsBusiness.bind(this.legacyStorage); }
  get updateMetricsBusiness() { return this.legacyStorage.updateMetricsBusiness.bind(this.legacyStorage); }
  get deleteMetricsBusiness() { return this.legacyStorage.deleteMetricsBusiness.bind(this.legacyStorage); }

  // Temps Pose operations
  get getTempsPose() { return this.legacyStorage.getTempsPose.bind(this.legacyStorage); }
  get getTempsPoseById() { return this.legacyStorage.getTempsPoseById.bind(this.legacyStorage); }
  get createTempsPose() { return this.legacyStorage.createTempsPose.bind(this.legacyStorage); }
  get updateTempsPose() { return this.legacyStorage.updateTempsPose.bind(this.legacyStorage); }
  get deleteTempsPose() { return this.legacyStorage.deleteTempsPose.bind(this.legacyStorage); }

  // Supplier specializations
  get getSupplierSpecializations() { return this.legacyStorage.getSupplierSpecializations.bind(this.legacyStorage); }
  get createSupplierSpecialization() { return this.legacyStorage.createSupplierSpecialization.bind(this.legacyStorage); }
  get updateSupplierSpecialization() { return this.legacyStorage.updateSupplierSpecialization.bind(this.legacyStorage); }
  get deleteSupplierSpecialization() { return this.legacyStorage.deleteSupplierSpecialization.bind(this.legacyStorage); }

  // Supplier quote sessions
  get getSupplierQuoteSessions() { return this.legacyStorage.getSupplierQuoteSessions.bind(this.legacyStorage); }
  get getSupplierQuoteSession() { return this.legacyStorage.getSupplierQuoteSession.bind(this.legacyStorage); }
  get createSupplierQuoteSession() { return this.legacyStorage.createSupplierQuoteSession.bind(this.legacyStorage); }
  get updateSupplierQuoteSession() { return this.legacyStorage.updateSupplierQuoteSession.bind(this.legacyStorage); }

  // AO Lot Suppliers
  get getAoLotSuppliers() { return this.legacyStorage.getAoLotSuppliers.bind(this.legacyStorage); }
  get createAoLotSupplier() { return this.legacyStorage.createAoLotSupplier.bind(this.legacyStorage); }
  get updateAoLotSupplier() { return this.legacyStorage.updateAoLotSupplier.bind(this.legacyStorage); }
  get deleteAoLotSupplier() { return this.legacyStorage.deleteAoLotSupplier.bind(this.legacyStorage); }

  // Supplier Documents
  get getSupplierDocuments() { return this.legacyStorage.getSupplierDocuments.bind(this.legacyStorage); }
  get createSupplierDocument() { return this.legacyStorage.createSupplierDocument.bind(this.legacyStorage); }
  get updateSupplierDocument() { return this.legacyStorage.updateSupplierDocument.bind(this.legacyStorage); }

  // Supplier Quote Analysis
  get getSupplierQuoteAnalyses() { return this.legacyStorage.getSupplierQuoteAnalyses.bind(this.legacyStorage); }
  get createSupplierQuoteAnalysis() { return this.legacyStorage.createSupplierQuoteAnalysis.bind(this.legacyStorage); }
  get updateSupplierQuoteAnalysis() { return this.legacyStorage.updateSupplierQuoteAnalysis.bind(this.legacyStorage); }

  // Equipment Batteries
  get getEquipmentBatteries() { return this.legacyStorage.getEquipmentBatteries.bind(this.legacyStorage); }
  get getEquipmentBattery() { return this.legacyStorage.getEquipmentBattery.bind(this.legacyStorage); }
  get createEquipmentBattery() { return this.legacyStorage.createEquipmentBattery.bind(this.legacyStorage); }
  get updateEquipmentBattery() { return this.legacyStorage.updateEquipmentBattery.bind(this.legacyStorage); }
  get deleteEquipmentBattery() { return this.legacyStorage.deleteEquipmentBattery.bind(this.legacyStorage); }

  // Margin Targets
  get getMarginTargets() { return this.legacyStorage.getMarginTargets.bind(this.legacyStorage); }
  get getMarginTarget() { return this.legacyStorage.getMarginTarget.bind(this.legacyStorage); }
  get createMarginTarget() { return this.legacyStorage.createMarginTarget.bind(this.legacyStorage); }
  get updateMarginTarget() { return this.legacyStorage.updateMarginTarget.bind(this.legacyStorage); }
  get deleteMarginTarget() { return this.legacyStorage.deleteMarginTarget.bind(this.legacyStorage); }

  // Project Sub-Elements
  get getProjectSubElements() { return this.legacyStorage.getProjectSubElements.bind(this.legacyStorage); }
  get getProjectSubElement() { return this.legacyStorage.getProjectSubElement.bind(this.legacyStorage); }
  get createProjectSubElement() { return this.legacyStorage.createProjectSubElement.bind(this.legacyStorage); }
  get updateProjectSubElement() { return this.legacyStorage.updateProjectSubElement.bind(this.legacyStorage); }
  get deleteProjectSubElement() { return this.legacyStorage.deleteProjectSubElement.bind(this.legacyStorage); }

  // Classification Tags
  get getClassificationTags() { return this.legacyStorage.getClassificationTags.bind(this.legacyStorage); }
  get getClassificationTag() { return this.legacyStorage.getClassificationTag.bind(this.legacyStorage); }
  get createClassificationTag() { return this.legacyStorage.createClassificationTag.bind(this.legacyStorage); }
  get updateClassificationTag() { return this.legacyStorage.updateClassificationTag.bind(this.legacyStorage); }
  get deleteClassificationTag() { return this.legacyStorage.deleteClassificationTag.bind(this.legacyStorage); }

  // Entity Tags
  get getEntityTags() { return this.legacyStorage.getEntityTags.bind(this.legacyStorage); }
  get createEntityTag() { return this.legacyStorage.createEntityTag.bind(this.legacyStorage); }
  get deleteEntityTag() { return this.legacyStorage.deleteEntityTag.bind(this.legacyStorage); }

  // Employee Labels
  get getEmployeeLabels() { return this.legacyStorage.getEmployeeLabels.bind(this.legacyStorage); }
  get getEmployeeLabel() { return this.legacyStorage.getEmployeeLabel.bind(this.legacyStorage); }
  get createEmployeeLabel() { return this.legacyStorage.createEmployeeLabel.bind(this.legacyStorage); }
  get updateEmployeeLabel() { return this.legacyStorage.updateEmployeeLabel.bind(this.legacyStorage); }
  get deleteEmployeeLabel() { return this.legacyStorage.deleteEmployeeLabel.bind(this.legacyStorage); }

  // Employee Label Assignments
  get getEmployeeLabelAssignments() { return this.legacyStorage.getEmployeeLabelAssignments.bind(this.legacyStorage); }
  get createEmployeeLabelAssignment() { return this.legacyStorage.createEmployeeLabelAssignment.bind(this.legacyStorage); }
  get deleteEmployeeLabelAssignment() { return this.legacyStorage.deleteEmployeeLabelAssignment.bind(this.legacyStorage); }

  // Bug Reports (si implémenté dans IStorage)
  get createBugReport() { return this.legacyStorage.createBugReport.bind(this.legacyStorage); }

  // Batigest operations (si implémenté dans IStorage)
  get getPurchaseOrders() { return this.legacyStorage.getPurchaseOrders.bind(this.legacyStorage); }
  get getPurchaseOrder() { return this.legacyStorage.getPurchaseOrder.bind(this.legacyStorage); }
  get createPurchaseOrder() { return this.legacyStorage.createPurchaseOrder.bind(this.legacyStorage); }
  get updatePurchaseOrder() { return this.legacyStorage.updatePurchaseOrder.bind(this.legacyStorage); }
  get getClientQuotes() { return this.legacyStorage.getClientQuotes.bind(this.legacyStorage); }
  get getClientQuote() { return this.legacyStorage.getClientQuote.bind(this.legacyStorage); }
  get createClientQuote() { return this.legacyStorage.createClientQuote.bind(this.legacyStorage); }
  get updateClientQuote() { return this.legacyStorage.updateClientQuote.bind(this.legacyStorage); }
  get listBatigestExports() { return this.legacyStorage.listBatigestExports.bind(this.legacyStorage); }
  get createBatigestExport() { return this.legacyStorage.createBatigestExport.bind(this.legacyStorage); }
  get updateBatigestExport() { return this.legacyStorage.updateBatigestExport.bind(this.legacyStorage); }
}

/**
 * Instance singleton de la facade de storage
 * À utiliser dans toutes les routes à la place de l'ancien `storage`
 * 
 * @example
 * ```typescript
 * import { storageFacade } from './storage/facade/StorageFacade';
 * 
 * // Utilisation dans les routes
 * router.get('/api/offers/:id', async (req, res) => {
 *   const offer = await storageFacade.getOffer(req.params.id);
 *   res.json(offer);
 * });
 * ```
 */
let storageFacadeInstance: StorageFacade | null = null;

/**
 * Initialise et retourne le singleton de la facade de storage
 * 
 * @param eventBus - Event bus pour les notifications
 * @returns Instance du StorageFacade
 */
export function initStorageFacade(eventBus: EventBus): StorageFacade {
  if (!storageFacadeInstance) {
    storageFacadeInstance = new StorageFacade(eventBus);
  }
  return storageFacadeInstance;
}

/**
 * Retourne l'instance du StorageFacade
 * @throws {Error} Si la facade n'a pas été initialisée
 */
export function getStorageFacade(): StorageFacade {
  if (!storageFacadeInstance) {
    throw new Error('StorageFacade not initialized. Call initStorageFacade first.');
  }
  return storageFacadeInstance;
}
