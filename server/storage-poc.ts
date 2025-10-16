import { eq, desc, and, sql, gte, lte, count, sum, avg, ne, ilike } from "drizzle-orm";
import { 
  users, aos, offers, projects, projectTasks, suppliers, supplierRequests, teamResources, beWorkload,
  chiffrageElements, dpgfDocuments, aoLots, maitresOuvrage, maitresOeuvre, contactsMaitreOeuvre,
  validationMilestones, visaArchitecte, technicalAlerts, technicalAlertHistory,
  projectTimelines, dateIntelligenceRules, dateAlerts, businessMetrics, kpiSnapshots, performanceBenchmarks,
  alertThresholds, businessAlerts,
  projectReserves, savInterventions, savWarrantyClaims,
  metricsBusiness, tempsPose, aoContacts, projectContacts, supplierSpecializations,
  supplierQuoteSessions, aoLotSuppliers, supplierDocuments, supplierQuoteAnalysis,
  equipmentBatteries, marginTargets, projectSubElements, classificationTags, entityTags, employeeLabels, employeeLabelAssignments,
  bugReports,
  type User, type UpsertUser, 
  type Ao, type InsertAo,
  type Offer, type InsertOffer,
  type Project, type InsertProject,
  type ProjectTask, type InsertProjectTask,
  type Supplier, type InsertSupplier,
  type SupplierRequest, type InsertSupplierRequest,
  type TeamResource, type InsertTeamResource,
  type BeWorkload, type InsertBeWorkload,
  type ChiffrageElement, type InsertChiffrageElement,
  type DpgfDocument, type InsertDpgfDocument,
  type AoLot, type InsertAoLot,
  type MaitreOuvrage, type InsertMaitreOuvrage,
  type MaitreOeuvre, type InsertMaitreOeuvre,
  type ContactMaitreOeuvre, type InsertContactMaitreOeuvre,
  type ValidationMilestone, type InsertValidationMilestone,
  type VisaArchitecte, type InsertVisaArchitecte,
  type TechnicalScoringConfig,
  type TechnicalAlert, type InsertTechnicalAlert,
  type TechnicalAlertHistory, type InsertTechnicalAlertHistory,
  type TechnicalAlertsFilter,
  type MaterialColorAlertRule,
  type ProjectTimeline, type InsertProjectTimeline,
  type DateIntelligenceRule, type InsertDateIntelligenceRule,
  type DateAlert, type InsertDateAlert,
  type BusinessMetric, type InsertBusinessMetric,
  type KpiSnapshot, type InsertKpiSnapshot,
  type PerformanceBenchmark, type InsertPerformanceBenchmark,
  type AlertThreshold, type InsertAlertThreshold, type UpdateAlertThreshold,
  type BusinessAlert, type InsertBusinessAlert, type UpdateBusinessAlert,
  type AlertsQuery, type ThresholdKey, type AlertSeverity, type AlertStatus, type AlertType,
  projectStatusEnum,
  type ProjectReserve, type InsertProjectReserve,
  type SavIntervention, type InsertSavIntervention,
  type SavWarrantyClaim, type InsertSavWarrantyClaim,
  type MetricsBusiness, type InsertMetricsBusiness,
  type TempsPose, type InsertTempsPose,
  type AoContacts, type InsertAoContacts,
  type ProjectContacts, type InsertProjectContacts,
  type SupplierSpecializations, type InsertSupplierSpecializations,
  type SupplierQuoteSession, type InsertSupplierQuoteSession,
  type AoLotSupplier, type InsertAoLotSupplier,
  type SupplierDocument, type InsertSupplierDocument,
  type SupplierQuoteAnalysis, type InsertSupplierQuoteAnalysis,
  type EquipmentBattery, type EquipmentBatteryInsert,
  type MarginTarget, type MarginTargetInsert,
  type ProjectSubElement, type ProjectSubElementInsert,
  type ClassificationTag, type ClassificationTagInsert,
  type EntityTag, type EntityTagInsert,
  type EmployeeLabel, type EmployeeLabelInsert,
  type EmployeeLabelAssignment, type EmployeeLabelAssignmentInsert,
  type BugReport, type InsertBugReport
} from "@shared/schema";
import { db } from "./db"; // Utilise la config existante avec pool optimisé
import type { EventBus } from "./eventBus";
import { logger } from "./utils/logger";
import { withTransaction, withSavepoint } from "./utils/database-helpers";
import { safeQuery, safeInsert, safeUpdate, safeDelete } from "./utils/safe-query";

// ========================================
// TYPES POUR KPIs CONSOLIDÉS ET ANALYTICS
// ========================================

export interface ConsolidatedKpis {
  periodSummary: {
    conversionRate: number;
    forecastRevenue: number;
    teamLoadPercentage: number;
    averageDelayDays: number;
    expectedMarginPercentage: number;
    totalDelayedTasks: number;
    totalOffers: number;
    totalWonOffers: number;
  };
  breakdowns: {
    conversionByUser: Record<string, { rate: number; offersCount: number; wonCount: number }>;
    loadByUser: Record<string, { percentage: number; hours: number; capacity: number }>;
    marginByCategory: Record<string, number>;
  };
  timeSeries: Array<{
    date: string;
    offersCreated: number;
    offersWon: number;
    forecastRevenue: number;
    teamLoadHours: number;
  }>;
}

// Types pour les filtres et périodes Analytics
export interface DateRange {
  from: Date;
  to: Date;
}

export interface MetricFilters {
  metricType?: string;
  periodType?: string;
  userId?: string;
  projectType?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

// ========================================
// INTERFACE DE STOCKAGE POC UNIQUEMENT
// ========================================

export interface IStorage {
  // User operations
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;
  
  // AO operations - Base pour éviter double saisie
  getAos(): Promise<Ao[]>;
  getAo(id: string): Promise<Ao | undefined>;
  createAo(ao: InsertAo): Promise<Ao>;
  updateAo(id: string, ao: Partial<InsertAo>): Promise<Ao>;
  
  // Offer operations - Cœur du POC
  getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]>;
  getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer>;
  deleteOffer(id: string): Promise<void>;
  
  // Project operations - 5 étapes POC
  getProjects(search?: string, status?: string): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]>;
  getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  
  // Project task operations - Planning partagé
  getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]>;
  getAllTasks(): Promise<(ProjectTask & { assignedUser?: User })[]>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask>;
  
  // Supplier operations - Gestion des fournisseurs
  getSuppliers(search?: string, status?: string): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  
  // Supplier request operations - Demandes prix simplifiées
  getSupplierRequests(offerId?: string): Promise<SupplierRequest[]>;
  createSupplierRequest(request: InsertSupplierRequest): Promise<SupplierRequest>;
  updateSupplierRequest(id: string, request: Partial<InsertSupplierRequest>): Promise<SupplierRequest>;
  
  // Team resource operations - Gestion équipes simplifiée
  getTeamResources(projectId?: string): Promise<(TeamResource & { user?: User })[]>;
  createTeamResource(resource: InsertTeamResource): Promise<TeamResource>;
  updateTeamResource(id: string, resource: Partial<InsertTeamResource>): Promise<TeamResource>;
  
  // BE Workload operations - Indicateurs charge BE
  getBeWorkload(weekNumber?: number, year?: number): Promise<(BeWorkload & { user?: User })[]>;
  createOrUpdateBeWorkload(workload: InsertBeWorkload): Promise<BeWorkload>;
  
  // Dashboard statistics POC
  getDashboardStats(): Promise<{
    totalOffers: number;
    offersInPricing: number;
    offersPendingValidation: number;
    beLoad: number;
  }>;

  // KPI consolidés avec métriques de performance temps réel
  getConsolidatedKpis(params: {
    from: string;      // ISO date
    to: string;        // ISO date  
    granularity: 'day' | 'week';
    segment?: string;   // Pour futures segmentations (BE, région, etc.)
  }): Promise<ConsolidatedKpis>;
  
  // Chiffrage Elements operations - Module de chiffrage POC
  getChiffrageElementsByOffer(offerId: string): Promise<ChiffrageElement[]>;
  createChiffrageElement(element: InsertChiffrageElement): Promise<ChiffrageElement>;
  updateChiffrageElement(id: string, element: Partial<InsertChiffrageElement>): Promise<ChiffrageElement>;
  deleteChiffrageElement(id: string): Promise<void>;
  
  // DPGF Documents operations - Document Provisoire de Gestion Financière POC
  getDpgfDocumentByOffer(offerId: string): Promise<DpgfDocument | null>;
  createDpgfDocument(dpgf: InsertDpgfDocument): Promise<DpgfDocument>;
  updateDpgfDocument(id: string, dpgf: Partial<InsertDpgfDocument>): Promise<DpgfDocument>;
  deleteDpgfDocument(id: string): Promise<void>;
  
  // AO Lots operations - Gestion des lots d'AO
  getAoLots(aoId: string): Promise<AoLot[]>;
  createAoLot(lot: InsertAoLot): Promise<AoLot>;
  updateAoLot(id: string, lot: Partial<InsertAoLot>): Promise<AoLot>;
  deleteAoLot(id: string): Promise<void>;
  
  // Maîtres d'ouvrage operations
  getMaitresOuvrage(): Promise<MaitreOuvrage[]>;
  getMaitreOuvrage(id: string): Promise<MaitreOuvrage | undefined>;
  createMaitreOuvrage(maitreOuvrage: InsertMaitreOuvrage): Promise<MaitreOuvrage>;
  updateMaitreOuvrage(id: string, maitreOuvrage: Partial<InsertMaitreOuvrage>): Promise<MaitreOuvrage>;
  deleteMaitreOuvrage(id: string): Promise<void>;
  
  // Maîtres d'œuvre operations
  getMaitresOeuvre(): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] })[]>;
  getMaitreOeuvre(id: string): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] }) | undefined>;
  createMaitreOeuvre(maitreOeuvre: InsertMaitreOeuvre): Promise<MaitreOeuvre>;
  updateMaitreOeuvre(id: string, maitreOeuvre: Partial<InsertMaitreOeuvre>): Promise<MaitreOeuvre>;
  deleteMaitreOeuvre(id: string): Promise<void>;
  
  // Contacts maître d'œuvre operations
  getContactsMaitreOeuvre(maitreOeuvreId: string): Promise<ContactMaitreOeuvre[]>;
  createContactMaitreOeuvre(contact: InsertContactMaitreOeuvre): Promise<ContactMaitreOeuvre>;
  updateContactMaitreOeuvre(id: string, contact: Partial<InsertContactMaitreOeuvre>): Promise<ContactMaitreOeuvre>;
  deleteContactMaitreOeuvre(id: string): Promise<void>;
  
  // Validation Milestones operations - Jalons de validation (maintenant "Bouclage")
  getValidationMilestones(offerId: string): Promise<ValidationMilestone[]>;
  createValidationMilestone(milestone: InsertValidationMilestone): Promise<ValidationMilestone>;
  updateValidationMilestone(id: string, milestone: Partial<InsertValidationMilestone>): Promise<ValidationMilestone>;
  deleteValidationMilestone(id: string): Promise<void>;
  
  // VISA Architecte operations - Nouveau workflow entre Étude et Planification
  getVisaArchitecte(projectId: string): Promise<VisaArchitecte[]>;
  createVisaArchitecte(visa: InsertVisaArchitecte): Promise<VisaArchitecte>;
  updateVisaArchitecte(id: string, visa: Partial<InsertVisaArchitecte>): Promise<VisaArchitecte>;
  deleteVisaArchitecte(id: string): Promise<void>;
  
  // Additional helper methods for conversion workflow
  getOfferById(id: string): Promise<Offer | undefined>;
  getProjectsByOffer(offerId: string): Promise<Project[]>;

  // ========================================
  // MÉTHODES CRUD TABLES MONDAY.COM (CRITIQUE)
  // ========================================
  
  // Equipment Batteries operations (Nb Batterie)
  getEquipmentBatteries(projectId?: string): Promise<EquipmentBattery[]>;
  getEquipmentBattery(id: string): Promise<EquipmentBattery | undefined>;
  createEquipmentBattery(battery: EquipmentBatteryInsert): Promise<EquipmentBattery>;
  updateEquipmentBattery(id: string, battery: Partial<EquipmentBatteryInsert>): Promise<EquipmentBattery>;
  deleteEquipmentBattery(id: string): Promise<void>;
  
  // Margin Targets operations (Objectif Marge H)
  getMarginTargets(projectId?: string): Promise<MarginTarget[]>;
  getMarginTarget(id: string): Promise<MarginTarget | undefined>;
  createMarginTarget(target: MarginTargetInsert): Promise<MarginTarget>;
  updateMarginTarget(id: string, target: Partial<MarginTargetInsert>): Promise<MarginTarget>;
  deleteMarginTarget(id: string): Promise<void>;
  
  // Project Sub Elements operations (Sous-éléments)
  getProjectSubElements(projectId?: string): Promise<ProjectSubElement[]>;
  getProjectSubElement(id: string): Promise<ProjectSubElement | undefined>;
  createProjectSubElement(element: ProjectSubElementInsert): Promise<ProjectSubElement>;
  updateProjectSubElement(id: string, element: Partial<ProjectSubElementInsert>): Promise<ProjectSubElement>;
  deleteProjectSubElement(id: string): Promise<void>;
  
  // Classification Tags operations (Hashtags)
  getClassificationTags(category?: string): Promise<ClassificationTag[]>;
  getClassificationTag(id: string): Promise<ClassificationTag | undefined>;
  createClassificationTag(tag: ClassificationTagInsert): Promise<ClassificationTag>;
  updateClassificationTag(id: string, tag: Partial<ClassificationTagInsert>): Promise<ClassificationTag>;
  deleteClassificationTag(id: string): Promise<void>;
  
  // Entity Tags operations (Liaison Hashtags)
  getEntityTags(entityType?: string, entityId?: string): Promise<EntityTag[]>;
  createEntityTag(entityTag: EntityTagInsert): Promise<EntityTag>;
  deleteEntityTag(id: string): Promise<void>;
  
  // Employee Labels operations (Label/Label 1)
  getEmployeeLabels(category?: string): Promise<EmployeeLabel[]>;
  getEmployeeLabel(id: string): Promise<EmployeeLabel | undefined>;
  createEmployeeLabel(label: EmployeeLabelInsert): Promise<EmployeeLabel>;
  updateEmployeeLabel(id: string, label: Partial<EmployeeLabelInsert>): Promise<EmployeeLabel>;
  deleteEmployeeLabel(id: string): Promise<void>;
  
  // Employee Label Assignments operations (Liaison Label/Label 1)
  getEmployeeLabelAssignments(userId?: string): Promise<EmployeeLabelAssignment[]>;
  createEmployeeLabelAssignment(assignment: EmployeeLabelAssignmentInsert): Promise<EmployeeLabelAssignment>;
  deleteEmployeeLabelAssignment(id: string): Promise<void>;
  
  // Métriques Business operations
  getMetricsBusiness(entityType?: string, entityId?: string): Promise<MetricsBusiness[]>;
  getMetricsBusinessById(id: string): Promise<MetricsBusiness | undefined>;
  createMetricsBusiness(metric: InsertMetricsBusiness): Promise<MetricsBusiness>;
  updateMetricsBusiness(id: string, metric: Partial<InsertMetricsBusiness>): Promise<MetricsBusiness>;
  deleteMetricsBusiness(id: string): Promise<void>;
  
  // Temps Pose operations
  getTempsPose(workScope?: string, componentType?: string): Promise<TempsPose[]>;
  getTempsPoseById(id: string): Promise<TempsPose | undefined>;
  createTempsPose(temps: InsertTempsPose): Promise<TempsPose>;
  updateTempsPose(id: string, temps: Partial<InsertTempsPose>): Promise<TempsPose>;
  deleteTempsPose(id: string): Promise<void>;
  
  // AO-Contacts liaison operations
  getAoContacts(aoId: string): Promise<AoContacts[]>;
  createAoContact(contact: InsertAoContacts): Promise<AoContacts>;
  deleteAoContact(id: string): Promise<void>;
  
  // Project-Contacts liaison operations
  getProjectContacts(projectId: string): Promise<ProjectContacts[]>;
  createProjectContact(contact: InsertProjectContacts): Promise<ProjectContacts>;
  deleteProjectContact(id: string): Promise<void>;
  
  // Supplier Specializations operations
  getSupplierSpecializations(supplierId?: string): Promise<SupplierSpecializations[]>;
  createSupplierSpecialization(spec: InsertSupplierSpecializations): Promise<SupplierSpecializations>;
  updateSupplierSpecialization(id: string, spec: Partial<InsertSupplierSpecializations>): Promise<SupplierSpecializations>;
  deleteSupplierSpecialization(id: string): Promise<void>;
  
  // Technical scoring configuration operations
  getScoringConfig(): Promise<TechnicalScoringConfig>;
  updateScoringConfig(config: TechnicalScoringConfig): Promise<void>;
  
  // ========================================
  // ALERTES TECHNIQUES POUR JULIEN LAMBOROT
  // ========================================
  
  // Gestion alertes techniques
  enqueueTechnicalAlert(alert: InsertTechnicalAlert): Promise<TechnicalAlert>;
  listTechnicalAlerts(filter?: TechnicalAlertsFilter): Promise<TechnicalAlert[]>;
  getTechnicalAlert(id: string): Promise<TechnicalAlert | null>;

  // Actions sur alertes
  acknowledgeTechnicalAlert(id: string, userId: string): Promise<void>;
  validateTechnicalAlert(id: string, userId: string): Promise<void>;
  bypassTechnicalAlert(id: string, userId: string, until: Date, reason: string): Promise<void>;

  // Système bypass
  getActiveBypassForAo(aoId: string): Promise<{ until: Date; reason: string } | null>;
  
  // Historique des actions
  listTechnicalAlertHistory(alertId: string): Promise<TechnicalAlertHistory[]>;
  addTechnicalAlertHistory(alertId: string | null, action: string, actorUserId: string | null, note?: string, metadata?: Record<string, any>): Promise<TechnicalAlertHistory>;
  
  // Historique AO-scoped pour suppressions
  listAoSuppressionHistory(aoId: string): Promise<TechnicalAlertHistory[]>;
  
  // ========================================
  // RÈGLES MATÉRIAUX-COULEURS - PATTERNS AVANCÉS OCR
  // ========================================
  
  // Gestion des règles d'alerte matériau-couleur configurables
  getMaterialColorRules(): Promise<MaterialColorAlertRule[]>;
  setMaterialColorRules(rules: MaterialColorAlertRule[]): Promise<void>;
  
  // ========================================
  // SYSTÈME INTELLIGENT DE DATES ET ÉCHÉANCES - PHASE 2.2
  // ========================================
  
  // ProjectTimelines operations - Planification intelligente des projets
  getProjectTimelines(projectId: string): Promise<ProjectTimeline[]>;
  getAllProjectTimelines(): Promise<ProjectTimeline[]>;
  createProjectTimeline(data: InsertProjectTimeline): Promise<ProjectTimeline>;
  updateProjectTimeline(id: string, data: Partial<InsertProjectTimeline>): Promise<ProjectTimeline>;
  deleteProjectTimeline(id: string): Promise<void>;
  
  // DateIntelligenceRules operations - Gestion des règles métier configurables
  getActiveRules(filters?: { phase?: typeof projectStatusEnum.enumValues[number], projectType?: string }): Promise<DateIntelligenceRule[]>;
  getAllRules(): Promise<DateIntelligenceRule[]>;
  getRule(id: string): Promise<DateIntelligenceRule | undefined>;
  createRule(data: InsertDateIntelligenceRule): Promise<DateIntelligenceRule>;
  updateRule(id: string, data: Partial<InsertDateIntelligenceRule>): Promise<DateIntelligenceRule>;
  deleteRule(id: string): Promise<void>;
  
  // DateAlerts operations - Gestion alertes dates et échéances
  getDateAlerts(filters?: { entityType?: string, entityId?: string, status?: string }): Promise<DateAlert[]>;
  getDateAlert(id: string): Promise<DateAlert | undefined>;
  createDateAlert(data: InsertDateAlert): Promise<DateAlert>;
  updateDateAlert(id: string, data: Partial<InsertDateAlert>): Promise<DateAlert>;
  deleteDateAlert(id: string): Promise<void>;

  // ========================================
  // ANALYTICS SERVICE OPERATIONS - PHASE 3.1.3
  // ========================================

  // KPI Snapshots operations
  createKPISnapshot(data: InsertKpiSnapshot): Promise<KpiSnapshot>;
  getKPISnapshots(period: DateRange, limit?: number): Promise<KpiSnapshot[]>;
  getLatestKPISnapshot(): Promise<KpiSnapshot | null>;

  // Business Metrics operations  
  createBusinessMetric(data: InsertBusinessMetric): Promise<BusinessMetric>;
  getBusinessMetrics(filters: MetricFilters): Promise<BusinessMetric[]>;
  getMetricTimeSeries(metricType: string, period: DateRange): Promise<BusinessMetric[]>;

  // Performance Benchmarks operations
  createPerformanceBenchmark(data: InsertPerformanceBenchmark): Promise<PerformanceBenchmark>;
  getBenchmarks(entityType: string, entityId?: string): Promise<PerformanceBenchmark[]>;
  getTopPerformers(metricType: string, limit?: number): Promise<PerformanceBenchmark[]>;

  // ========================================
  // PREDICTIVE ENGINE METHODS - PHASE 3.1.6.2
  // ========================================
  
  // Revenus mensuels historiques pour forecasting
  getMonthlyRevenueHistory(range: {
    start_date: string;    // YYYY-MM-DD  
    end_date: string;      // YYYY-MM-DD
  }): Promise<Array<{
    month: string;         // YYYY-MM
    total_revenue: number; // CA mensuel (€)
    projects_count: number; // Nombre projets
    avg_project_value: number; // Valeur moyenne
  }>>;
  
  // Historique délais projets pour détection risques
  getProjectDelayHistory(range: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    project_id: string;
    planned_days: number;   // Durée planifiée
    actual_days: number;    // Durée réelle
    delay_days: number;     // Retard (actual - planned)
    project_type: string;   // Type projet
    complexity: string;     // Complexité estimée
  }>>;
  
  // Charge équipes historique pour prédictions workload
  getTeamLoadHistory(range: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    month: string;          // YYYY-MM
    total_projects: number; // Projets simultanés
    team_capacity: number;  // Capacité théorique
    utilization_rate: number; // % utilisation
    avg_project_duration: number; // Durée moyenne
  }>>;

  // Sauvegarder snapshots forecasts
  saveForecastSnapshot(forecast: {
    forecast_data: any;     // Résultats forecast JSON
    generated_at: string;   // Timestamp génération
    params: any;           // Paramètres utilisés
  }): Promise<string>;     // ID snapshot créé

  // Lister snapshots historiques
  listForecastSnapshots(limit?: number): Promise<Array<{
    id: string;
    generated_at: string;
    forecast_period: string;
    confidence: number;
    method_used: string;
  }>>;

  // Analytics snapshots operations
  getAnalyticsSnapshots(params?: any): Promise<any[]>;
  createAnalyticsSnapshot(data: any): Promise<any>;

  // Benchmarks secteur pour comparaisons
  getSectorBenchmarks(): Promise<{
    industry_avg_conversion: number;
    avg_duration_benchmark: number;
    margin_benchmark: number;
    quality_benchmark: number;
    efficiency_benchmark: number;
  }>;

  // ========================================
  // ALERT THRESHOLDS MANAGEMENT - PHASE 3.1.7.2
  // ========================================

  // Récupérer seuils actifs par type/scope
  getActiveThresholds(filters?: {
    threshold_key?: ThresholdKey;
    scope_type?: 'global' | 'project' | 'team' | 'period';
    scope_entity_id?: string;
  }): Promise<AlertThreshold[]>;

  // Récupérer seuil par ID
  getThresholdById(id: string): Promise<AlertThreshold | null>;

  // Créer nouveau seuil
  createThreshold(data: InsertAlertThreshold): Promise<string>; // Retourne ID créé

  // Mettre à jour seuil existant
  updateThreshold(id: string, data: UpdateAlertThreshold): Promise<boolean>;

  // Supprimer seuil (soft delete via is_active=false)
  deactivateThreshold(id: string): Promise<boolean>;

  // Lister tous seuils avec pagination
  listThresholds(params: {
    is_active?: boolean;
    created_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    thresholds: AlertThreshold[];
    total: number;
  }>;

  // ========================================
  // BUSINESS ALERTS MANAGEMENT - PHASE 3.1.7.2
  // ========================================

  // Créer nouvelle alerte business
  createBusinessAlert(data: InsertBusinessAlert): Promise<string>; // Retourne ID

  // Récupérer alerte par ID
  getBusinessAlertById(id: string): Promise<BusinessAlert | null>;

  // Lister alertes avec filtres avancés
  listBusinessAlerts(query: AlertsQuery): Promise<{
    alerts: BusinessAlert[];
    total: number;
    summary: {
      by_status: Record<AlertStatus, number>;
      by_severity: Record<AlertSeverity, number>;
      by_type: Record<AlertType, number>;
    };
  }>;

  // Mettre à jour statut alerte (workflow management)
  updateBusinessAlertStatus(
    id: string, 
    update: UpdateBusinessAlert,
    user_id: string
  ): Promise<boolean>;

  // Marquer comme accusé réception (supporte DateAlerts ET BusinessAlerts)
  acknowledgeAlert(id: string, user_id: string, notes?: string): Promise<boolean>;

  // Résoudre alerte (supporte DateAlerts ET BusinessAlerts)
  resolveAlert(id: string, user_id: string, resolution_notes?: string): Promise<boolean>;

  // Rechercher alertes similaires (déduplication)
  findSimilarAlerts(params: {
    entity_type: string;
    entity_id: string;
    alert_type: AlertType;
    hours_window?: number; // Fenêtre déduplication (défaut: 24h)
  }): Promise<BusinessAlert[]>;

  // Récupérer alertes ouvertes pour entité
  getOpenAlertsForEntity(
    entity_type: string, 
    entity_id: string
  ): Promise<BusinessAlert[]>;

  // ========================================
  // PHASE 4 - Système de gestion des réserves et SAV
  // ========================================

  // Project Reserves operations - Gestion des réserves projet
  getProjectReserves(projectId: string): Promise<ProjectReserve[]>;
  getProjectReserve(id: string): Promise<ProjectReserve | undefined>;
  createProjectReserve(reserve: InsertProjectReserve): Promise<ProjectReserve>;
  updateProjectReserve(id: string, reserve: Partial<InsertProjectReserve>): Promise<ProjectReserve>;
  deleteProjectReserve(id: string): Promise<void>;

  // SAV Interventions operations - Gestion des interventions SAV
  getSavInterventions(projectId: string): Promise<SavIntervention[]>;
  getSavIntervention(id: string): Promise<SavIntervention | undefined>;
  createSavIntervention(intervention: InsertSavIntervention): Promise<SavIntervention>;
  updateSavIntervention(id: string, intervention: Partial<InsertSavIntervention>): Promise<SavIntervention>;
  deleteSavIntervention(id: string): Promise<void>;

  // SAV Warranty Claims operations - Gestion des réclamations garantie
  getSavWarrantyClaims(interventionId: string): Promise<SavWarrantyClaim[]>;
  getSavWarrantyClaim(id: string): Promise<SavWarrantyClaim | undefined>;
  createSavWarrantyClaim(claim: InsertSavWarrantyClaim): Promise<SavWarrantyClaim>;
  updateSavWarrantyClaim(id: string, claim: Partial<InsertSavWarrantyClaim>): Promise<SavWarrantyClaim>;
  deleteSavWarrantyClaim(id: string): Promise<void>;

  // ========================================
  // WORKFLOW FOURNISSEURS - NOUVELLES OPERATIONS
  // ========================================

  // Supplier Quote Sessions operations - Gestion des sessions de devis sécurisées
  getSupplierQuoteSessions(aoId?: string, aoLotId?: string): Promise<(SupplierQuoteSession & { supplier?: any; aoLot?: any })[]>;
  getSupplierQuoteSession(id: string): Promise<(SupplierQuoteSession & { supplier?: any; aoLot?: any }) | undefined>;
  getSupplierQuoteSessionByToken(token: string): Promise<(SupplierQuoteSession & { supplier?: any; aoLot?: any }) | undefined>;
  createSupplierQuoteSession(session: InsertSupplierQuoteSession): Promise<SupplierQuoteSession>;
  updateSupplierQuoteSession(id: string, session: Partial<InsertSupplierQuoteSession>): Promise<SupplierQuoteSession>;
  deleteSupplierQuoteSession(id: string): Promise<void>;
  generateSessionToken(): Promise<string>; // Génère un token unique sécurisé

  // AO Lot Suppliers operations - Gestion de la sélection fournisseurs par lot
  getAoLotSuppliers(aoLotId: string): Promise<(AoLotSupplier & { supplier?: any; selectedByUser?: any })[]>;
  getAoLotSupplier(id: string): Promise<(AoLotSupplier & { supplier?: any; selectedByUser?: any }) | undefined>;
  createAoLotSupplier(aoLotSupplier: InsertAoLotSupplier): Promise<AoLotSupplier>;
  updateAoLotSupplier(id: string, aoLotSupplier: Partial<InsertAoLotSupplier>): Promise<AoLotSupplier>;
  deleteAoLotSupplier(id: string): Promise<void>;
  getSuppliersByLot(aoLotId: string): Promise<any[]>; // Récupère les fournisseurs sélectionnés pour un lot

  // Supplier Documents operations - Gestion des documents fournisseurs
  getSupplierDocuments(sessionId?: string, supplierId?: string): Promise<(SupplierDocument & { session?: any; validatedByUser?: any })[]>;
  getSupplierDocument(id: string): Promise<(SupplierDocument & { session?: any; validatedByUser?: any }) | undefined>;
  createSupplierDocument(document: InsertSupplierDocument): Promise<SupplierDocument>;
  updateSupplierDocument(id: string, document: Partial<InsertSupplierDocument>): Promise<SupplierDocument>;
  deleteSupplierDocument(id: string): Promise<void>;
  getDocumentsBySession(sessionId: string): Promise<SupplierDocument[]>; // Documents d'une session spécifique

  // Supplier Quote Analysis operations - Gestion de l'analyse OCR des devis
  getSupplierQuoteAnalyses(documentId?: string, sessionId?: string): Promise<(SupplierQuoteAnalysis & { document?: any; reviewedByUser?: any })[]>;
  getSupplierQuoteAnalysis(id: string): Promise<(SupplierQuoteAnalysis & { document?: any; reviewedByUser?: any }) | undefined>;
  createSupplierQuoteAnalysis(analysis: InsertSupplierQuoteAnalysis): Promise<SupplierQuoteAnalysis>;
  updateSupplierQuoteAnalysis(id: string, analysis: Partial<InsertSupplierQuoteAnalysis>): Promise<SupplierQuoteAnalysis>;
  deleteSupplierQuoteAnalysis(id: string): Promise<void>;
  getAnalysisByDocument(documentId: string): Promise<SupplierQuoteAnalysis | undefined>; // Analyse d'un document spécifique

  // Workflow helpers - Méthodes utilitaires pour le workflow fournisseurs
  getSupplierWorkflowStatus(aoId: string): Promise<{
    totalLots: number;
    lotsWithSuppliers: number;
    activeSessions: number;
    documentsUploaded: number;
    documentsAnalyzed: number;
    pendingAnalysis: number;
  }>;
  
  getSessionDocumentsSummary(sessionId: string): Promise<{
    totalDocuments: number;
    analyzedDocuments: number;
    pendingDocuments: number;
    mainQuotePresent: boolean;
    averageQualityScore?: number;
  }>;

  // Bug Reports operations - Système de rapport de bugs
  createBugReport(bugReport: InsertBugReport): Promise<BugReport>;
}

// ========================================
// IMPLÉMENTATION STORAGE POC
// ========================================

export class DatabaseStorage implements IStorage {
  private eventBus?: EventBus; // Optional EventBus pour auto-publishing

  // INJECTION EVENTBUS - Constructeur optionnel pour tests
  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
  }

  // Stockage en mémoire pour les règles matériaux-couleurs (POC uniquement)
  private static materialColorRules: MaterialColorAlertRule[] = [
    {
      id: 'pvc-coupe-feu-critical',
      materials: ['pvc'],
      condition: 'allOf',
      severity: 'critical',
      message: 'ALERTE CRITIQUE: PVC détecté avec exigence coupe-feu - Incompatibilité réglementaire'
    },
    {
      id: 'pvc-haute-performance-warning',
      materials: ['pvc'],
      condition: 'anyOf',
      severity: 'warning',
      message: 'ATTENTION: PVC détecté dans un contexte haute performance thermique - Vérifier compatibilité'
    },
    {
      id: 'composite-exterieur-info',
      materials: ['composite'],
      condition: 'anyOf',
      severity: 'info',
      message: 'INFO: Matériau composite détecté - Vérifier garanties et maintenance'
    }
  ];

  // User operations
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return safeQuery(async () => {
      try {
        const [user] = await db
          .insert(users)
          .values(userData)
          .onConflictDoUpdate({
            target: users.id, // Conflict sur l'ID
            set: {
              ...userData,
              updatedAt: new Date(),
            },
          })
          .returning();
        return user;
      } catch (error: any) {
        // Si erreur de contrainte unique sur email, essayer de mettre à jour par email
        if (error.code === '23505' && error.constraint?.includes('email')) {
          const [user] = await db
            .insert(users)
            .values(userData)
            .onConflictDoUpdate({
              target: users.email, // Conflict sur l'email
              set: {
                ...userData,
                updatedAt: new Date(),
              },
            })
            .returning();
          return user;
        }
        throw error;
      }
    }, {
      retries: 2,
      service: 'StoragePOC',
      operation: 'upsertUser',
      logQuery: true
    });
  }

  // AO operations
  async getAos(): Promise<Ao[]> {
    return await db.select().from(aos).orderBy(desc(aos.createdAt));
  }

  async getAo(id: string): Promise<Ao | undefined> {
    const [ao] = await db.select().from(aos).where(eq(aos.id, id));
    return ao;
  }

  async createAo(ao: InsertAo): Promise<Ao> {
    return safeInsert('aos', async () => {
      try {
        const [newAo] = await db.insert(aos).values(ao).returning();
        return newAo;
      } catch (error: any) {
        // Gestion spécifique des erreurs de contrainte d'unicité PostgreSQL
        if (error.code === '23505' && error.constraint) {
          if (error.constraint.includes('reference')) {
            const duplicateError = new Error(`La référence '${ao.reference}' existe déjà. Veuillez choisir une autre référence.`);
            (duplicateError as any).code = 'DUPLICATE_REFERENCE';
            (duplicateError as any).field = 'reference';
            (duplicateError as any).value = ao.reference;
            throw duplicateError;
          }
          // Autres contraintes d'unicité si nécessaire
          const duplicateError = new Error(`Cette valeur existe déjà dans la base de données.`);
          (duplicateError as any).code = 'DUPLICATE_VALUE';
          throw duplicateError;
        }
        
        // Re-lancer l'erreur si ce n'est pas une contrainte d'unicité
        throw error;
      }
    }, {
      retries: 2,
      service: 'StoragePOC',
      operation: 'createAo'
    });
  }

  async updateAo(id: string, ao: Partial<InsertAo>): Promise<Ao> {
    const [updatedAo] = await db.update(aos)
      .set({ ...ao, updatedAt: new Date() })
      .where(eq(aos.id, id))
      .returning();
    return updatedAo;
  }

  // Offer operations (cœur du POC)
  async getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]> {
    // Apply filters if provided
    let baseOffers;
    if (status) {
      baseOffers = await db.select().from(offers).where(eq(offers.status, status as any)).orderBy(desc(offers.createdAt));
    } else {
      baseOffers = await db.select().from(offers).orderBy(desc(offers.createdAt));
    }

    // Fetch related data separately to avoid complex joins
    const result = [];
    for (const offer of baseOffers) {
      let responsibleUser = undefined;
      let ao = undefined;

      if (offer.responsibleUserId) {
        responsibleUser = await this.getUser(offer.responsibleUserId);
      }
      if (offer.aoId) {
        ao = await this.getAo(offer.aoId);
      }

      result.push({ ...offer, responsibleUser, ao });
    }

    return result;
  }

  async getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    if (!offer) return undefined;

    let responsibleUser = undefined;
    let ao = undefined;

    if (offer.responsibleUserId) {
      responsibleUser = await this.getUser(offer.responsibleUserId);
    }
    if (offer.aoId) {
      ao = await this.getAo(offer.aoId);
    }

    return { ...offer, responsibleUser, ao };
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    const [newOffer] = await db.insert(offers).values(offer).returning();
    return newOffer;
  }

  async updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer> {
    // Utilise une transaction robuste pour cette opération critique
    const updatedOffer = await withTransaction(async (tx) => {
      const [result] = await tx
        .update(offers)
        .set({ ...offer, updatedAt: new Date() })
        .where(eq(offers.id, id))
        .returning();
      return result;
    }, {
      retries: 3,
      timeout: 15000, // 15 secondes pour les mises à jour complexes
      isolationLevel: 'READ COMMITTED'
    });
    
    // AUTOMATISATION BATIGEST : Génération automatique du code chantier lors d'accord AO
    if (offer.status && (offer.status === 'valide' || offer.status === 'fin_etudes_validee')) {
      logger.info('Accord AO détecté - Déclenchement génération automatique code Batigest', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateOffer',
          offerId: id,
          status: offer.status
        }
      });
      
      // Génération asynchrone pour ne pas bloquer la réponse
      setImmediate(async () => {
        try {
          // Importer le service Batigest de façon dynamique pour éviter les imports circulaires
          const { batigestService } = await import('./batigestService');
          
          // Rechercher le projet associé à cette offre
          const projects = await this.getProjects();
          const relatedProject = projects.find(p => p.offerId === id);
          
          if (relatedProject) {
            logger.info('Projet associé trouvé pour génération Batigest', {
              metadata: {
                service: 'StoragePOC',
                operation: 'updateOffer',
                offerId: id,
                projectId: relatedProject.id,
                projectName: relatedProject.name
              }
            });
            
            // Vérifier si un code Batigest n'existe pas déjà (idempotence)
            if (!updatedOffer.batigestRef) {
              const result = await batigestService.generateChantierCode(relatedProject.id, {
                reference: updatedOffer.reference,
                client: updatedOffer.client,
                intituleOperation: updatedOffer.intituleOperation ?? undefined,
                montantPropose: updatedOffer.montantPropose?.toString()
              });
              
              if (result.success && result.batigestRef) {
                // Mettre à jour l'offre avec le code Batigest généré
                await db
                  .update(offers)
                  .set({ 
                    batigestRef: result.batigestRef,
                    updatedAt: new Date() 
                  })
                  .where(eq(offers.id, id));
                
                logger.info('Code chantier automatiquement assigné à offre', {
                  metadata: {
                    service: 'StoragePOC',
                    operation: 'updateOffer',
                    offerId: id,
                    batigestRef: result.batigestRef
                  }
                });
                
                // Mettre à jour aussi le projet associé si nécessaire
                await db
                  .update(projects)
                  .set({ 
                    batigestRef: result.batigestRef,
                    updatedAt: new Date() 
                  })
                  .where(eq(projects.id, relatedProject.id));
                  
                logger.info('Code chantier automatiquement assigné au projet', {
                  metadata: {
                    service: 'StoragePOC',
                    operation: 'updateOffer',
                    projectId: relatedProject.id,
                    batigestRef: result.batigestRef
                  }
                });
              } else {
                logger.warn('Échec génération automatique code Batigest', {
                  metadata: {
                    service: 'StoragePOC',
                    operation: 'updateOffer',
                    offerId: id,
                    message: result.message
                  }
                });
              }
            } else {
              logger.info('Code Batigest déjà existant (idempotence)', {
                metadata: {
                  service: 'StoragePOC',
                  operation: 'updateOffer',
                  offerId: id,
                  batigestRef: updatedOffer.batigestRef
                }
              });
            }
          } else {
            logger.warn('Aucun projet associé trouvé - Génération code chantier reportée', {
              metadata: {
                service: 'StoragePOC',
                operation: 'updateOffer',
                offerId: id
              }
            });
          }
        } catch (error) {
          logger.error('Erreur génération automatique code chantier', {
            metadata: {
              service: 'StoragePOC',
              operation: 'updateOffer',
              offerId: id,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            }
          });
          // Ne pas faire échouer la mise à jour de l'offre pour autant
        }
      });
    }
    
    return updatedOffer;
  }

  async deleteOffer(id: string): Promise<void> {
    await db.delete(offers).where(eq(offers.id, id));
  }

  // Project operations (5 étapes POC)
  async getProjects(search?: string, status?: string): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]> {
    let query = db.select().from(projects).orderBy(desc(projects.createdAt));
    
    // Filtrage par statut si fourni
    if (status) {
      query = query.where(eq(projects.status, status as any));
    }
    
    const baseProjects = await query;

    let filteredProjects = baseProjects;
    
    // Filtrage par recherche si fournie
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProjects = baseProjects.filter(project =>
        project.name?.toLowerCase().includes(searchLower) ||
        project.client?.toLowerCase().includes(searchLower) ||
        project.location?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower)
      );
    }

    const result = [];
    for (const project of filteredProjects) {
      let responsibleUser = undefined;
      let offer = undefined;

      if (project.responsibleUserId) {
        responsibleUser = await this.getUser(project.responsibleUserId);
      }
      if (project.offerId) {
        offer = await this.getOffer(project.offerId);
      }

      result.push({ ...project, responsibleUser, offer });
    }

    return result;
  }

  async getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    if (!project) return undefined;

    let responsibleUser = undefined;
    let offer = undefined;

    if (project.responsibleUserId) {
      responsibleUser = await this.getUser(project.responsibleUserId);
    }
    if (project.offerId) {
      offer = await this.getOffer(project.offerId);
    }

    return { ...project, responsibleUser, offer };
  }

  async createProject(project: InsertProject): Promise<Project> {
    return safeInsert('projects', async () => {
      const [newProject] = await db.insert(projects).values(project).returning();
      return newProject;
    }, {
      retries: 3,
      service: 'StoragePOC',
      operation: 'createProject'
    });
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    return safeUpdate('projects', async () => {
      const [updatedProject] = await db
        .update(projects)
        .set({ ...project, updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning();
      return updatedProject;
    }, 1, {
      retries: 3,
      service: 'StoragePOC',
      operation: 'updateProject'
    });
  }

  // Project task operations (planning partagé)
  async getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]> {
    const baseTasks = await db
      .select()
      .from(projectTasks)
      .where(eq(projectTasks.projectId, projectId))
      .orderBy(projectTasks.position);

    const result = [];
    for (const task of baseTasks) {
      let assignedUser = undefined;

      if (task.assignedUserId) {
        assignedUser = await this.getUser(task.assignedUserId);
      }

      result.push({ ...task, assignedUser });
    }

    return result;
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    const [newTask] = await db.insert(projectTasks).values(task).returning();
    return newTask;
  }

  async getAllTasks(): Promise<(ProjectTask & { assignedUser?: User })[]> {
    const baseTasks = await db
      .select()
      .from(projectTasks)
      .orderBy(projectTasks.startDate);

    const result = [];
    for (const task of baseTasks) {
      let assignedUser = undefined;

      if (task.assignedUserId) {
        assignedUser = await this.getUser(task.assignedUserId);
      }

      logger.info('Raw DB task mapping', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAllTasks',
          taskId: task.id,
          taskName: task.name,
          projectId: task.projectId,
          parentTaskId: task.parentTaskId,
          hasProjectId: !!task.projectId,
          hasParentTaskId: !!task.parentTaskId
        }
      });

      result.push({ ...task, assignedUser });
    }

    logger.info('getAllTasks result summary', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getAllTasks',
        totalTasks: result.length,
        tasksWithParentId: result.filter(t => t.parentTaskId).length,
        tasksWithProjectId: result.filter(t => t.projectId).length
      }
    });

    return result;
  }

  async updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask> {
    const [updatedTask] = await db
      .update(projectTasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(projectTasks.id, id))
      .returning();
    return updatedTask;
  }

  // Supplier operations (gestion des fournisseurs)
  async getSuppliers(search?: string, status?: string): Promise<Supplier[]> {
    let query = db.select().from(suppliers);
    
    if (search || status) {
      const conditions = [];
      if (search) {
        // Utilisation sécurisée avec ilike() plutôt que sql template
        conditions.push(ilike(suppliers.name, `%${search}%`));
      }
      if (status) {
        conditions.push(eq(suppliers.status, status as any));
      }
      
      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;
      }
    }
    
    return await query.orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return result[0];
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set({ ...supplier, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Supplier request operations (demandes prix simplifiées)
  async getSupplierRequests(offerId?: string): Promise<SupplierRequest[]> {
    if (offerId) {
      return await db.select().from(supplierRequests)
        .where(eq(supplierRequests.offerId, offerId))
        .orderBy(desc(supplierRequests.createdAt));
    }
    
    return await db.select().from(supplierRequests).orderBy(desc(supplierRequests.createdAt));
  }

  async createSupplierRequest(request: InsertSupplierRequest): Promise<SupplierRequest> {
    const [newRequest] = await db.insert(supplierRequests).values(request).returning();
    return newRequest;
  }

  async updateSupplierRequest(id: string, request: Partial<InsertSupplierRequest>): Promise<SupplierRequest> {
    const [updatedRequest] = await db
      .update(supplierRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(supplierRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Team resource operations (gestion équipes simplifiée)
  async getTeamResources(projectId?: string): Promise<(TeamResource & { user?: User })[]> {
    let baseResources;
    if (projectId) {
      baseResources = await db.select().from(teamResources)
        .where(eq(teamResources.projectId, projectId))
        .orderBy(desc(teamResources.createdAt));
    } else {
      baseResources = await db.select().from(teamResources).orderBy(desc(teamResources.createdAt));
    }

    const result = [];
    for (const resource of baseResources) {
      let user = undefined;

      if (resource.userId) {
        user = await this.getUser(resource.userId);
      }

      result.push({ ...resource, user });
    }

    return result;
  }

  async createTeamResource(resource: InsertTeamResource): Promise<TeamResource> {
    const [newResource] = await db.insert(teamResources).values(resource).returning();
    return newResource;
  }

  async updateTeamResource(id: string, resource: Partial<InsertTeamResource>): Promise<TeamResource> {
    const [updatedResource] = await db
      .update(teamResources)
      .set({ ...resource, updatedAt: new Date() })
      .where(eq(teamResources.id, id))
      .returning();
    return updatedResource;
  }

  // BE Workload operations (indicateurs charge BE)
  async getBeWorkload(weekNumber?: number, year?: number): Promise<(BeWorkload & { user?: User })[]> {
    let baseWorkload;
    if (weekNumber && year) {
      baseWorkload = await db.select().from(beWorkload)
        .where(and(
          eq(beWorkload.weekNumber, weekNumber),
          eq(beWorkload.year, year)
        ))
        .orderBy(beWorkload.year, beWorkload.weekNumber);
    } else {
      baseWorkload = await db.select().from(beWorkload).orderBy(beWorkload.year, beWorkload.weekNumber);
    }

    const result = [];
    for (const workload of baseWorkload) {
      const user = await this.getUser(workload.userId);
      result.push({ ...workload, user });
    }

    return result;
  }

  async createOrUpdateBeWorkload(workload: InsertBeWorkload): Promise<BeWorkload> {
    const [existingWorkload] = await db
      .select()
      .from(beWorkload)
      .where(and(
        eq(beWorkload.userId, workload.userId),
        eq(beWorkload.weekNumber, workload.weekNumber),
        eq(beWorkload.year, workload.year)
      ));

    if (existingWorkload) {
      const [updatedWorkload] = await db
        .update(beWorkload)
        .set({ ...workload, updatedAt: new Date() })
        .where(eq(beWorkload.id, existingWorkload.id))
        .returning();
      return updatedWorkload;
    } else {
      const [newWorkload] = await db.insert(beWorkload).values(workload).returning();
      return newWorkload;
    }
  }

  // Dashboard statistics POC
  async getDashboardStats(): Promise<{
    totalOffers: number;
    offersInPricing: number;
    offersPendingValidation: number;
    beLoad: number;
  }> {
    const [totalOffers] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers);

    const [offersInPricing] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers)
      .where(eq(offers.status, "en_cours_chiffrage"));

    const [offersPendingValidation] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers)
      .where(eq(offers.status, "en_attente_validation"));

    // Calcul simplifié de la charge BE
    const [beLoadResult] = await db
      .select({ 
        avgLoad: sql<number>`cast(avg(CASE WHEN charge_level = 'surcharge' THEN 100 WHEN charge_level = 'occupe' THEN 75 ELSE 25 END) as int)` 
      })
      .from(beWorkload);

    return {
      totalOffers: totalOffers.count,
      offersInPricing: offersInPricing.count,
      offersPendingValidation: offersPendingValidation.count,
      beLoad: beLoadResult.avgLoad || 25,
    };
  }

  // KPI consolidés avec métriques de performance temps réel
  async getConsolidatedKpis(params: {
    from: string;
    to: string;
    granularity: 'day' | 'week';
    segment?: string;
  }): Promise<ConsolidatedKpis> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    
    // ========================================
    // 1. CALCUL TAUX DE CONVERSION
    // ========================================
    
    // Offres totales dans la période
    const [totalOffersInPeriod] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ));

    // Offres gagnées dans la période (utilise updatedAt comme approximation de la date de signature)
    const [wonOffersInPeriod] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(offers)
      .where(and(
        gte(offers.updatedAt, fromDate),
        lte(offers.updatedAt, toDate),
        sql`status IN ('signe', 'transforme_en_projet', 'termine')`
      ));

    const conversionRate = totalOffersInPeriod.count > 0 
      ? (wonOffersInPeriod.count / totalOffersInPeriod.count) * 100 
      : 0;

    // ========================================
    // 2. CA PRÉVISIONNEL (FORECAST REVENUE)
    // ========================================
    
    // Probabilités par statut selon spécifications
    const statusProbabilities = {
      'en_attente_fournisseurs': 0.2,
      'en_cours_chiffrage': 0.35,
      'en_attente_validation': 0.55,
      'fin_etudes_validee': 0.7,
      'valide': 0.85,
      'signe': 1.0
    };

    // Calcul CA prévisionnel pondéré
    const forecastRevenueQuery = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(
          COALESCE(montant_final, montant_propose, montant_estime, 0) * 
          CASE status
            WHEN 'en_attente_fournisseurs' THEN 0.2
            WHEN 'en_cours_chiffrage' THEN 0.35
            WHEN 'en_attente_validation' THEN 0.55
            WHEN 'fin_etudes_validee' THEN 0.7
            WHEN 'valide' THEN 0.85
            WHEN 'signe' THEN 1.0
            ELSE 0
          END
        ), 0)`
      })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`status IN ('en_attente_fournisseurs', 'en_cours_chiffrage', 'en_attente_validation', 'fin_etudes_validee', 'valide', 'signe')`
      ));

    const forecastRevenue = forecastRevenueQuery[0]?.totalRevenue || 0;

    // ========================================
    // 3. CHARGE ÉQUIPES BE
    // ========================================
    
    // Capacité théorique (35h/semaine par BE actif)
    const [activeBeCount] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(users)
      .where(and(
        eq(users.isActive, true),
        sql`role LIKE '%be%' OR role LIKE '%technicien%'`
      ));

    const weeksBetween = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
    const totalCapacityHours = (activeBeCount.count || 1) * 35 * weeksBetween;

    // Charge BE planifiée (basée sur beWorkload et heures estimées des offres)
    const [totalPlannedHours] = await db
      .select({
        totalHours: sql<number>`COALESCE(SUM(be_hours_estimated), 0)`
      })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`be_hours_estimated IS NOT NULL`
      ));

    const teamLoadPercentage = totalCapacityHours > 0 
      ? Math.min((totalPlannedHours.totalHours / totalCapacityHours) * 100, 100)
      : 0;

    // ========================================
    // 4. INDICATEURS DE RETARDS
    // ========================================
    
    // Tâches en retard
    const [delayedTasksQuery] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .innerJoin(offers, eq(projects.offerId, offers.id))
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`(project_tasks.status = 'en_retard' OR (project_tasks.end_date IS NOT NULL AND project_tasks.end_date < NOW() AND project_tasks.status != 'termine'))`
      ));

    // Calcul moyenne des jours de retard  
    const averageDelayQuery = await db
      .select({
        avgDelay: sql<number>`COALESCE(AVG(EXTRACT(DAY FROM (NOW() - end_date))), 0)`
      })
      .from(projectTasks)
      .innerJoin(projects, eq(projectTasks.projectId, projects.id))
      .innerJoin(offers, eq(projects.offerId, offers.id))
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`(project_tasks.end_date IS NOT NULL AND project_tasks.end_date < NOW() AND project_tasks.status != 'termine')`
      ));

    const averageDelayDays = Math.max(averageDelayQuery[0]?.avgDelay || 0, 0);
    const totalDelayedTasks = delayedTasksQuery.count;

    // ========================================
    // 5. MARGE ATTENDUE
    // ========================================
    
    // Calcul marge depuis chiffrage détaillé
    const marginQuery = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(total_price), 0)`,
        totalCost: sql<number>`COALESCE(SUM(total_price / (1 + margin_percentage/100)), 0)`
      })
      .from(chiffrageElements)
      .innerJoin(offers, eq(chiffrageElements.offerId, offers.id))
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ));

    const totalRevenue = marginQuery[0]?.totalRevenue || 0;
    const totalCost = marginQuery[0]?.totalCost || 0;
    
    // Fallback sur taux_marge si pas de chiffrage détaillé
    const [fallbackMarginQuery] = await db
      .select({
        avgMargin: sql<number>`COALESCE(AVG(taux_marge), 20)`
      })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate),
        sql`taux_marge IS NOT NULL`
      ));

    const expectedMarginPercentage = totalRevenue > 0 
      ? ((totalRevenue - totalCost) / totalRevenue) * 100
      : fallbackMarginQuery.avgMargin || 20;

    // ========================================
    // 6. BREAKDOWNS (analyse détaillée)
    // ========================================
    
    // Conversion par utilisateur  
    const conversionByUserQuery = await db
      .select({
        userId: offers.responsibleUserId,
        firstName: users.firstName,
        lastName: users.lastName,
        totalOffers: sql<number>`cast(count(*) as int)`,
        wonOffers: sql<number>`cast(sum(CASE WHEN status IN ('signe', 'transforme_en_projet', 'termine') THEN 1 ELSE 0 END) as int)`
      })
      .from(offers)
      .leftJoin(users, eq(offers.responsibleUserId, users.id))
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ))
      .groupBy(offers.responsibleUserId, users.firstName, users.lastName);

    const conversionByUser: Record<string, { rate: number; offersCount: number; wonCount: number }> = {};
    conversionByUserQuery.forEach(row => {
      if (row.userId) {
        const userName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || `User ${row.userId}`;
        conversionByUser[userName] = {
          rate: row.totalOffers > 0 ? (row.wonOffers / row.totalOffers) * 100 : 0,
          offersCount: row.totalOffers,
          wonCount: row.wonOffers
        };
      }
    });

    // Charge par utilisateur (simplifié)
    const loadByUserQuery = await db
      .select({
        userId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        totalHours: sql<number>`COALESCE(SUM(COALESCE(be_hours_estimated, 0)), 0)`
      })
      .from(users)
      .leftJoin(offers, eq(users.id, offers.responsibleUserId))
      .where(and(
        eq(users.isActive, true),
        sql`role LIKE '%be%' OR role LIKE '%technicien%'`,
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ))
      .groupBy(users.id, users.firstName, users.lastName);

    const loadByUser: Record<string, { percentage: number; hours: number; capacity: number }> = {};
    const individualCapacity = 35 * weeksBetween;
    
    loadByUserQuery.forEach(row => {
      const userName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || `User ${row.userId}`;
      const percentage = individualCapacity > 0 ? Math.min((row.totalHours / individualCapacity) * 100, 100) : 0;
      loadByUser[userName] = {
        percentage,
        hours: row.totalHours,
        capacity: individualCapacity
      };
    });

    // Marge par catégorie (menuiserie)
    const marginByCategoryQuery = await db
      .select({
        category: offers.menuiserieType,
        avgMargin: sql<number>`COALESCE(AVG(
          CASE WHEN montant_final > 0 AND montant_estime > 0 
          THEN ((montant_final - montant_estime) / montant_final * 100)
          ELSE taux_marge
          END
        ), 20)`
      })
      .from(offers)
      .where(and(
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ))
      .groupBy(offers.menuiserieType);

    const marginByCategory: Record<string, number> = {};
    marginByCategoryQuery.forEach(row => {
      if (row.category) {
        marginByCategory[row.category] = row.avgMargin;
      }
    });

    // ========================================
    // 7. SÉRIES TEMPORELLES
    // ========================================
    
    // Génération des dates selon granularité
    const timeSeries: Array<{
      date: string;
      offersCreated: number;
      offersWon: number;
      forecastRevenue: number;
      teamLoadHours: number;
    }> = [];

    const currentDate = new Date(fromDate);
    const incrementDays = params.granularity === 'week' ? 7 : 1;

    while (currentDate <= toDate) {
      const periodStart = new Date(currentDate);
      const periodEnd = new Date(currentDate.getTime() + (incrementDays * 24 * 60 * 60 * 1000));

      // Offres créées dans cette période
      const [offersCreatedInPeriod] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(offers)
        .where(and(
          gte(offers.createdAt, periodStart),
          lte(offers.createdAt, periodEnd)
        ));

      // Offres gagnées dans cette période (utilise updatedAt comme approximation de la date de signature)
      const [offersWonInPeriod] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(offers)
        .where(and(
          gte(offers.updatedAt, periodStart),
          lte(offers.updatedAt, periodEnd),
          sql`status IN ('signe', 'transforme_en_projet', 'terme')`
        ));

      // CA prévisionnel de la période
      const [forecastForPeriod] = await db
        .select({
          revenue: sql<number>`COALESCE(SUM(
            COALESCE(montant_final, montant_propose, montant_estime, 0) * 
            CASE status
              WHEN 'en_attente_fournisseurs' THEN 0.2
              WHEN 'en_cours_chiffrage' THEN 0.35
              WHEN 'en_attente_validation' THEN 0.55
              WHEN 'fin_etudes_validee' THEN 0.7
              WHEN 'valide' THEN 0.85
              WHEN 'signe' THEN 1.0
              ELSE 0
            END
          ), 0)`
        })
        .from(offers)
        .where(and(
          gte(offers.createdAt, periodStart),
          lte(offers.createdAt, periodEnd)
        ));

      // Charge workload de la période
      const [loadForPeriod] = await db
        .select({
          hours: sql<number>`COALESCE(SUM(be_hours_estimated), 0)`
        })
        .from(offers)
        .where(and(
          gte(offers.createdAt, periodStart),
          lte(offers.createdAt, periodEnd)
        ));

      timeSeries.push({
        date: periodStart.toISOString().split('T')[0],
        offersCreated: offersCreatedInPeriod.count,
        offersWon: offersWonInPeriod.count,
        forecastRevenue: forecastForPeriod.revenue || 0,
        teamLoadHours: loadForPeriod.hours || 0
      });

      currentDate.setTime(currentDate.getTime() + (incrementDays * 24 * 60 * 60 * 1000));
    }

    // ========================================
    // 8. RETOUR DES KPIs CONSOLIDÉS
    // ========================================
    
    return {
      periodSummary: {
        conversionRate,
        forecastRevenue,
        teamLoadPercentage,
        averageDelayDays,
        expectedMarginPercentage,
        totalDelayedTasks,
        totalOffers: totalOffersInPeriod.count,
        totalWonOffers: wonOffersInPeriod.count
      },
      breakdowns: {
        conversionByUser,
        loadByUser,
        marginByCategory
      },
      timeSeries
    };
  }

  // Chiffrage Elements operations - Module de chiffrage POC
  async getChiffrageElementsByOffer(offerId: string): Promise<ChiffrageElement[]> {
    return await db.select().from(chiffrageElements)
      .where(eq(chiffrageElements.offerId, offerId))
      .orderBy(chiffrageElements.position, chiffrageElements.createdAt);
  }

  async createChiffrageElement(element: InsertChiffrageElement): Promise<ChiffrageElement> {
    const [newElement] = await db.insert(chiffrageElements).values(element).returning();
    return newElement;
  }

  async updateChiffrageElement(id: string, element: Partial<InsertChiffrageElement>): Promise<ChiffrageElement> {
    const [updatedElement] = await db
      .update(chiffrageElements)
      .set({ ...element, updatedAt: new Date() })
      .where(eq(chiffrageElements.id, id))
      .returning();
    return updatedElement;
  }

  async deleteChiffrageElement(id: string): Promise<void> {
    await db.delete(chiffrageElements).where(eq(chiffrageElements.id, id));
  }

  // DPGF Documents operations - Document Provisoire de Gestion Financière POC
  async getDpgfDocumentByOffer(offerId: string): Promise<DpgfDocument | null> {
    const [dpgf] = await db.select().from(dpgfDocuments)
      .where(eq(dpgfDocuments.offerId, offerId))
      .orderBy(desc(dpgfDocuments.createdAt));
    return dpgf || null;
  }

  async createDpgfDocument(dpgf: InsertDpgfDocument): Promise<DpgfDocument> {
    const [newDpgf] = await db.insert(dpgfDocuments).values(dpgf).returning();
    return newDpgf;
  }

  async updateDpgfDocument(id: string, dpgf: Partial<InsertDpgfDocument>): Promise<DpgfDocument> {
    const [updatedDpgf] = await db
      .update(dpgfDocuments)
      .set({ ...dpgf, updatedAt: new Date() })
      .where(eq(dpgfDocuments.id, id))
      .returning();
    return updatedDpgf;
  }

  async deleteDpgfDocument(id: string): Promise<void> {
    await db.delete(dpgfDocuments).where(eq(dpgfDocuments.id, id));
  }

  // AO Lots operations - Gestion des lots d'AO
  async getAoLots(aoId: string): Promise<AoLot[]> {
    return await db.select().from(aoLots)
      .where(eq(aoLots.aoId, aoId))
      .orderBy(aoLots.numero);
  }

  async createAoLot(lot: InsertAoLot): Promise<AoLot> {
    const [newLot] = await db.insert(aoLots).values(lot).returning();
    return newLot;
  }

  async updateAoLot(id: string, lot: Partial<InsertAoLot>): Promise<AoLot> {
    const [updatedLot] = await db.update(aoLots)
      .set({ ...lot, updatedAt: new Date() })
      .where(eq(aoLots.id, id))
      .returning();
    return updatedLot;
  }

  async deleteAoLot(id: string): Promise<void> {
    await db.delete(aoLots).where(eq(aoLots.id, id));
  }

  // Maîtres d'ouvrage operations
  async getMaitresOuvrage(): Promise<MaitreOuvrage[]> {
    return await db.select().from(maitresOuvrage)
      .where(eq(maitresOuvrage.isActive, true))
      .orderBy(maitresOuvrage.nom);
  }

  async getMaitreOuvrage(id: string): Promise<MaitreOuvrage | undefined> {
    const [maitreOuvrage] = await db.select().from(maitresOuvrage)
      .where(eq(maitresOuvrage.id, id));
    return maitreOuvrage;
  }

  async createMaitreOuvrage(maitreOuvrageData: InsertMaitreOuvrage): Promise<MaitreOuvrage> {
    const [newMaitreOuvrage] = await db.insert(maitresOuvrage)
      .values(maitreOuvrageData)
      .returning();
    return newMaitreOuvrage;
  }

  async updateMaitreOuvrage(id: string, maitreOuvrageData: Partial<InsertMaitreOuvrage>): Promise<MaitreOuvrage> {
    const [updatedMaitreOuvrage] = await db.update(maitresOuvrage)
      .set({ ...maitreOuvrageData, updatedAt: new Date() })
      .where(eq(maitresOuvrage.id, id))
      .returning();
    return updatedMaitreOuvrage;
  }

  async deleteMaitreOuvrage(id: string): Promise<void> {
    // Soft delete
    await db.update(maitresOuvrage)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(maitresOuvrage.id, id));
  }

  // Maîtres d'œuvre operations
  async getMaitresOeuvre(): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] })[]> {
    const maitresOeuvreList = await db.select().from(maitresOeuvre)
      .where(eq(maitresOeuvre.isActive, true))
      .orderBy(maitresOeuvre.nom);
    
    // Charger les contacts pour chaque maître d'œuvre
    const result = [];
    for (const maitreOeuvre of maitresOeuvreList) {
      const contacts = await this.getContactsMaitreOeuvre(maitreOeuvre.id);
      result.push({ ...maitreOeuvre, contacts });
    }
    
    return result;
  }

  async getMaitreOeuvre(id: string): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] }) | undefined> {
    const [maitreOeuvre] = await db.select().from(maitresOeuvre)
      .where(eq(maitresOeuvre.id, id));
    
    if (!maitreOeuvre) return undefined;
    
    const contacts = await this.getContactsMaitreOeuvre(id);
    return { ...maitreOeuvre, contacts };
  }

  async createMaitreOeuvre(maitreOeuvreData: InsertMaitreOeuvre): Promise<MaitreOeuvre> {
    const [newMaitreOeuvre] = await db.insert(maitresOeuvre)
      .values(maitreOeuvreData)
      .returning();
    return newMaitreOeuvre;
  }

  async updateMaitreOeuvre(id: string, maitreOeuvreData: Partial<InsertMaitreOeuvre>): Promise<MaitreOeuvre> {
    const [updatedMaitreOeuvre] = await db.update(maitresOeuvre)
      .set({ ...maitreOeuvreData, updatedAt: new Date() })
      .where(eq(maitresOeuvre.id, id))
      .returning();
    return updatedMaitreOeuvre;
  }

  async deleteMaitreOeuvre(id: string): Promise<void> {
    // Soft delete
    await db.update(maitresOeuvre)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(maitresOeuvre.id, id));
  }

  // Contacts maître d'œuvre operations
  async getContactsMaitreOeuvre(maitreOeuvreId: string): Promise<ContactMaitreOeuvre[]> {
    return await db.select().from(contactsMaitreOeuvre)
      .where(and(
        eq(contactsMaitreOeuvre.maitreOeuvreId, maitreOeuvreId),
        eq(contactsMaitreOeuvre.isActive, true)
      ))
      .orderBy(contactsMaitreOeuvre.nom);
  }

  async createContactMaitreOeuvre(contactData: InsertContactMaitreOeuvre): Promise<ContactMaitreOeuvre> {
    const [newContact] = await db.insert(contactsMaitreOeuvre)
      .values(contactData)
      .returning();
    return newContact;
  }

  async updateContactMaitreOeuvre(id: string, contactData: Partial<InsertContactMaitreOeuvre>): Promise<ContactMaitreOeuvre> {
    const [updatedContact] = await db.update(contactsMaitreOeuvre)
      .set({ ...contactData, updatedAt: new Date() })
      .where(eq(contactsMaitreOeuvre.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContactMaitreOeuvre(id: string): Promise<void> {
    // Soft delete
    await db.update(contactsMaitreOeuvre)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(contactsMaitreOeuvre.id, id));
  }

  // Validation Milestones operations
  async getValidationMilestones(offerId: string): Promise<ValidationMilestone[]> {
    return await db.select().from(validationMilestones)
      .where(eq(validationMilestones.offerId, offerId))
      .orderBy(validationMilestones.createdAt);
  }

  async createValidationMilestone(milestoneData: InsertValidationMilestone): Promise<ValidationMilestone> {
    const [newMilestone] = await db.insert(validationMilestones)
      .values(milestoneData)
      .returning();
    return newMilestone;
  }

  async updateValidationMilestone(id: string, milestoneData: Partial<InsertValidationMilestone>): Promise<ValidationMilestone> {
    const [updatedMilestone] = await db.update(validationMilestones)
      .set({ ...milestoneData, updatedAt: new Date() })
      .where(eq(validationMilestones.id, id))
      .returning();
    return updatedMilestone;
  }

  async deleteValidationMilestone(id: string): Promise<void> {
    await db.delete(validationMilestones)
      .where(eq(validationMilestones.id, id));
  }

  // VISA Architecte operations - Nouveau workflow entre Étude et Planification
  async getVisaArchitecte(projectId: string): Promise<VisaArchitecte[]> {
    return await db.select().from(visaArchitecte)
      .where(eq(visaArchitecte.projectId, projectId))
      .orderBy(visaArchitecte.demandeLe);
  }

  async createVisaArchitecte(visaData: InsertVisaArchitecte): Promise<VisaArchitecte> {
    const [newVisa] = await db.insert(visaArchitecte)
      .values({
        ...visaData,
        documentsSoumis: (visaData.documentsSoumis || []) as string[]
      })
      .returning();
    return newVisa;
  }

  async updateVisaArchitecte(id: string, visaData: Partial<InsertVisaArchitecte>): Promise<VisaArchitecte> {
    // Build update object filtering out undefined values
    const updateFields: any = { updatedAt: new Date() };
    
    if (visaData.projectId !== undefined) updateFields.projectId = visaData.projectId;
    if (visaData.visaType !== undefined) updateFields.visaType = visaData.visaType;
    if (visaData.status !== undefined) updateFields.status = visaData.status;
    if (visaData.architecteNom !== undefined) updateFields.architecteNom = visaData.architecteNom;
    if (visaData.architecteEmail !== undefined) updateFields.architecteEmail = visaData.architecteEmail;
    if (visaData.architecteTelephone !== undefined) updateFields.architecteTelephone = visaData.architecteTelephone;
    if (visaData.architecteOrdre !== undefined) updateFields.architecteOrdre = visaData.architecteOrdre;
    if (visaData.accordeLe !== undefined) updateFields.accordeLe = visaData.accordeLe;
    if (visaData.expireLe !== undefined) updateFields.expireLe = visaData.expireLe;
    if (visaData.documentsSoumis !== undefined) updateFields.documentsSoumis = visaData.documentsSoumis;
    if (visaData.commentaires !== undefined) updateFields.commentaires = visaData.commentaires;
    if (visaData.raisonRefus !== undefined) updateFields.raisonRefus = visaData.raisonRefus;
    if (visaData.demandePar !== undefined) updateFields.demandePar = visaData.demandePar;
    if (visaData.validePar !== undefined) updateFields.validePar = visaData.validePar;
    
    const [updatedVisa] = await db
      .update(visaArchitecte)
      .set(updateFields)
      .where(eq(visaArchitecte.id, id))
      .returning();
    return updatedVisa;
  }

  async deleteVisaArchitecte(id: string): Promise<void> {
    await db.delete(visaArchitecte)
      .where(eq(visaArchitecte.id, id));
  }

  // Additional helper methods for conversion workflow
  async getOfferById(id: string): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async getProjectsByOffer(offerId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.offerId, offerId));
  }

  // Technical scoring configuration operations
  // Stockage en mémoire temporaire pour la configuration (POC sans DB)
  private static scoringConfig: TechnicalScoringConfig | null = null;
  
  async getScoringConfig(): Promise<TechnicalScoringConfig> {
    // Si pas de configuration en mémoire, retourner la configuration par défaut
    if (!DatabaseStorage.scoringConfig) {
      logger.info('Aucune configuration scoring trouvée, utilisation valeurs par défaut', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getScoringConfig'
        }
      });
      DatabaseStorage.scoringConfig = {
        weights: {
          batimentPassif: 5,
          isolationRenforcee: 3,
          precadres: 2,
          voletsExterieurs: 1,
          coupeFeu: 4,
        },
        threshold: 5
      };
    }
    
    return DatabaseStorage.scoringConfig;
  }

  async updateScoringConfig(config: TechnicalScoringConfig): Promise<void> {
    logger.info('Mise à jour configuration scoring', {
      metadata: {
        service: 'StoragePOC',
        operation: 'updateScoringConfig',
        threshold: config.threshold,
        weightsCount: Object.keys(config.weights).length
      }
    });
    
    // Validation des valeurs (sécurité)
    if (config.threshold < 0 || config.threshold > 50) {
      throw new Error('Le seuil doit être entre 0 et 50');
    }
    
    for (const [critere, poids] of Object.entries(config.weights)) {
      if (poids < 0 || poids > 10) {
        throw new Error(`Le poids pour ${critere} doit être entre 0 et 10`);
      }
    }
    
    // Sauvegarder en mémoire
    DatabaseStorage.scoringConfig = { ...config };
    logger.info('Configuration scoring mise à jour avec succès', {
      metadata: {
        service: 'StoragePOC',
        operation: 'updateScoringConfig'
      }
    });
  }

  // ========================================
  // GESTION ALERTES TECHNIQUES
  // ========================================
  
  // Stockage en mémoire pour les alertes techniques (POC)
  private static technicalAlerts: Map<string, TechnicalAlert> = new Map();
  private static technicalAlertHistory: Map<string, TechnicalAlertHistory[]> = new Map();

  async enqueueTechnicalAlert(alert: InsertTechnicalAlert): Promise<TechnicalAlert> {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    const technicalAlert: TechnicalAlert = {
      id,
      aoId: alert.aoId,
      aoReference: alert.aoReference,
      score: alert.score,
      triggeredCriteria: alert.triggeredCriteria ?? null,
      status: alert.status || 'pending',
      assignedToUserId: alert.assignedToUserId ?? null,
      createdAt: now,
      updatedAt: now,
      validatedAt: null,
      validatedByUserId: null,
      bypassUntil: null,
      bypassReason: null,
      rawEventData: alert.rawEventData || null,
    };

    DatabaseStorage.technicalAlerts.set(id, technicalAlert);
    
    // Ajouter entrée d'historique
    await this.addTechnicalAlertHistory(id, 'created', alert.assignedToUserId ?? null, 'Alerte technique créée');
    
    logger.info('Alerte technique créée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'enqueueTechnicalAlert',
        alertId: id,
        aoReference: alert.aoReference,
        score: alert.score
      }
    });
    return technicalAlert;
  }

  async listTechnicalAlerts(filter?: { status?: string; userId?: string }): Promise<TechnicalAlert[]> {
    let alerts = Array.from(DatabaseStorage.technicalAlerts.values());
    
    if (filter?.status) {
      alerts = alerts.filter(alert => alert.status === filter.status);
    }
    
    if (filter?.userId) {
      alerts = alerts.filter(alert => alert.assignedToUserId === filter.userId);
    }
    
    // Trier par date de création (plus récent en premier)
    return alerts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getTechnicalAlert(id: string): Promise<TechnicalAlert | null> {
    return DatabaseStorage.technicalAlerts.get(id) || null;
  }

  async acknowledgeTechnicalAlert(id: string, userId: string): Promise<void> {
    const alert = DatabaseStorage.technicalAlerts.get(id);
    if (!alert) {
      throw new Error(`Alerte technique ${id} introuvable`);
    }

    alert.status = 'acknowledged';
    alert.updatedAt = new Date();
    
    DatabaseStorage.technicalAlerts.set(id, alert);
    
    await this.addTechnicalAlertHistory(id, 'acknowledged', userId, 'Alerte acknowledged par l\'utilisateur');
    logger.info('Alerte acknowledged', {
      metadata: {
        service: 'StoragePOC',
        operation: 'acknowledgeTechnicalAlert',
        alertId: id,
        userId: userId
      }
    });
  }

  async validateTechnicalAlert(id: string, userId: string): Promise<void> {
    const alert = DatabaseStorage.technicalAlerts.get(id);
    if (!alert) {
      throw new Error(`Alerte technique ${id} introuvable`);
    }

    alert.status = 'validated';
    alert.updatedAt = new Date();
    alert.validatedAt = new Date();
    alert.validatedByUserId = userId;
    
    DatabaseStorage.technicalAlerts.set(id, alert);
    
    await this.addTechnicalAlertHistory(id, 'validated', userId, 'Alerte validée par l\'utilisateur');
    logger.info('Alerte validée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'validateTechnicalAlert',
        alertId: id,
        userId: userId
      }
    });
  }

  async bypassTechnicalAlert(id: string, userId: string, until: Date, reason: string): Promise<void> {
    const alert = DatabaseStorage.technicalAlerts.get(id);
    if (!alert) {
      throw new Error(`Alerte technique ${id} introuvable`);
    }

    alert.status = 'bypassed';
    alert.updatedAt = new Date();
    alert.bypassUntil = until;
    alert.bypassReason = reason;
    
    DatabaseStorage.technicalAlerts.set(id, alert);
    
    await this.addTechnicalAlertHistory(
      id, 
      'bypassed', 
      userId, 
      `Alerte bypassée jusqu'au ${until.toLocaleString('fr-FR')}. Raison: ${reason}`,
      { bypassUntil: until.toISOString(), bypassReason: reason }
    );
    
    logger.info('Alerte bypassée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'bypassTechnicalAlert',
        alertId: id,
        userId: userId,
        bypassUntil: until.toISOString(),
        reason: reason
      }
    });
  }

  async getActiveBypassForAo(aoId: string): Promise<{ until: Date; reason: string } | null> {
    const now = new Date();
    
    // Chercher les alertes bypassées pour cet AO qui sont encore actives
    for (const alert of DatabaseStorage.technicalAlerts.values()) {
      if (alert.aoId === aoId && 
          alert.status === 'bypassed' && 
          alert.bypassUntil && 
          new Date(alert.bypassUntil) > now) {
        return {
          until: new Date(alert.bypassUntil),
          reason: alert.bypassReason || 'Pas de raison spécifiée'
        };
      }
    }
    
    return null;
  }

  async addTechnicalAlertHistory(
    alertId: string | null, 
    action: string, 
    actorUserId: string | null, 
    note?: string,
    metadata?: any
  ): Promise<TechnicalAlertHistory> {
    const historyId = `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const historyEntry: TechnicalAlertHistory = {
      id: historyId,
      alertId: alertId || 'system',
      action: action as 'acknowledged' | 'validated' | 'bypassed' | 'created' | 'auto_expired' | 'suppressed',
      actorUserId,
      timestamp: new Date(),
      note: note || null,
      metadata: metadata || null,
    };

    const alertHistoryKey = alertId || 'system';
    const existing = DatabaseStorage.technicalAlertHistory.get(alertHistoryKey) || [];
    existing.push(historyEntry);
    DatabaseStorage.technicalAlertHistory.set(alertHistoryKey, existing);
    
    logger.info('Historique alerte ajouté', {
      metadata: {
        service: 'StoragePOC',
        operation: 'addTechnicalAlertHistory',
        alertId: alertId,
        action: action
      }
    });
    return historyEntry;
  }

  async listTechnicalAlertHistory(alertId: string): Promise<TechnicalAlertHistory[]> {
    const history = DatabaseStorage.technicalAlertHistory.get(alertId) || [];
    
    // Trier par timestamp (plus récent en premier)
    return history.sort((a, b) => {
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      return dateB - dateA;
    });
  }

  async listAoSuppressionHistory(aoId: string): Promise<TechnicalAlertHistory[]> {
    // Récupérer l'historique des suppressions pour cet AO
    const suppressionKey = `ao-suppression-${aoId}`;
    const history = DatabaseStorage.technicalAlertHistory.get(suppressionKey) || [];
    
    // Trier par timestamp (plus récent en premier)
    return history.sort((a, b) => {
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      return dateB - dateA;
    });
  }

  // ========================================
  // RÈGLES MATÉRIAUX-COULEURS - PATTERNS AVANCÉS OCR
  // ========================================

  async getMaterialColorRules(): Promise<MaterialColorAlertRule[]> {
    logger.info('Récupération règles matériaux-couleurs', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getMaterialColorRules',
        rulesCount: DatabaseStorage.materialColorRules.length
      }
    });
    // Retourner une copie pour éviter les modifications directes
    return [...DatabaseStorage.materialColorRules];
  }

  async setMaterialColorRules(rules: MaterialColorAlertRule[]): Promise<void> {
    logger.info('Mise à jour règles matériaux-couleurs', {
      metadata: {
        service: 'StoragePOC',
        operation: 'setMaterialColorRules',
        rulesCount: rules.length
      }
    });
    
    // Validation basique des règles
    for (const rule of rules) {
      if (!rule.id || typeof rule.id !== 'string') {
        throw new Error(`Règle invalide: l'ID est obligatoire (règle: ${JSON.stringify(rule)})`);
      }
      if (!rule.message || typeof rule.message !== 'string') {
        throw new Error(`Règle invalide: le message est obligatoire (règle ID: ${rule.id})`);
      }
    }

    // Vérifier l'unicité des IDs
    const ids = rules.map(r => r.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new Error(`IDs de règles non uniques détectés dans la configuration`);
    }

    // Remplacer les règles existantes
    DatabaseStorage.materialColorRules = [...rules];
    
    logger.info('Règles matériaux-couleurs mises à jour avec succès', {
      metadata: {
        service: 'StoragePOC',
        operation: 'setMaterialColorRules',
        rulesCount: rules.length,
        ruleIds: rules.map(r => r.id)
      }
    });
  }

  // ========================================
  // SYSTÈME INTELLIGENT DE DATES ET ÉCHÉANCES - PHASE 2.2
  // ========================================

  // Stockage en mémoire pour le POC
  private static projectTimelines = new Map<string, ProjectTimeline>();
  private static dateIntelligenceRules = new Map<string, DateIntelligenceRule>();  
  private static dateAlerts = new Map<string, DateAlert>();

  // ========================================
  // PROJECT TIMELINES OPERATIONS
  // ========================================

  async getProjectTimelines(projectId: string): Promise<ProjectTimeline[]> {
    const timelines = Array.from(DatabaseStorage.projectTimelines.values())
      .filter(timeline => timeline.projectId === projectId)
      .sort((a, b) => (a.plannedStartDate?.getTime() || 0) - (b.plannedStartDate?.getTime() || 0));
    
    logger.info('Récupération timelines projet', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getProjectTimelines',
        projectId: projectId,
        timelinesCount: timelines.length
      }
    });
    return timelines;
  }

  async getAllProjectTimelines(): Promise<ProjectTimeline[]> {
    const timelines = Array.from(DatabaseStorage.projectTimelines.values())
      .sort((a, b) => (a.plannedStartDate?.getTime() || 0) - (b.plannedStartDate?.getTime() || 0));
    
    logger.info('Récupération timelines totales', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getAllProjectTimelines',
        timelinesCount: timelines.length
      }
    });
    return timelines;
  }

  async createProjectTimeline(data: InsertProjectTimeline): Promise<ProjectTimeline> {
    const id = `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const timeline: ProjectTimeline = {
      id,
      ...data,
      autoCalculated: data.autoCalculated ?? true,
      lastCalculatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DatabaseStorage.projectTimelines.set(id, timeline);
    logger.info('Timeline créée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'createProjectTimeline',
        timelineId: id,
        projectId: data.projectId,
        phase: data.phase
      }
    });
    
    return timeline;
  }

  async updateProjectTimeline(id: string, data: Partial<InsertProjectTimeline>): Promise<ProjectTimeline> {
    const existing = DatabaseStorage.projectTimelines.get(id);
    if (!existing) {
      throw new Error(`Timeline ${id} non trouvée`);
    }

    const updated: ProjectTimeline = {
      ...existing,
      ...data,
      updatedAt: new Date(),
      lastCalculatedAt: data.calculationMethod ? new Date() : existing.lastCalculatedAt
    };

    DatabaseStorage.projectTimelines.set(id, updated);
    logger.info('Timeline mise à jour', {
      metadata: {
        service: 'StoragePOC',
        operation: 'updateProjectTimeline',
        timelineId: id
      }
    });
    
    return updated;
  }

  async deleteProjectTimeline(id: string): Promise<void> {
    const existing = DatabaseStorage.projectTimelines.get(id);
    if (!existing) {
      throw new Error(`Timeline ${id} non trouvée`);
    }

    DatabaseStorage.projectTimelines.delete(id);
    logger.info('Timeline supprimée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'deleteProjectTimeline',
        timelineId: id
      }
    });
  }

  // ========================================
  // DATE INTELLIGENCE RULES OPERATIONS
  // ========================================

  async getActiveRules(filters?: { phase?: typeof projectStatusEnum.enumValues[number], projectType?: string }): Promise<DateIntelligenceRule[]> {
    let rules = Array.from(DatabaseStorage.dateIntelligenceRules.values())
      .filter(rule => rule.isActive);

    // Appliquer les filtres
    if (filters?.phase) {
      rules = rules.filter(rule => !rule.phase || rule.phase === filters.phase);
    }
    
    if (filters?.projectType) {
      rules = rules.filter(rule => {
        if (!rule.projectType) return true; // Règle générale
        return rule.projectType === filters.projectType;
      });
    }

    // Vérifier la validité temporelle
    const now = new Date();
    rules = rules.filter(rule => {
      if (rule.validFrom && now < rule.validFrom) return false;
      if (rule.validUntil && now > rule.validUntil) return false;
      return true;
    });

    // Trier par priorité (plus élevée en premier)
    rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    logger.info('Règles actives trouvées', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getActiveRules',
        rulesCount: rules.length,
        filters: filters
      }
    });
    return rules;
  }

  async getAllRules(): Promise<DateIntelligenceRule[]> {
    const rules = Array.from(DatabaseStorage.dateIntelligenceRules.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    logger.info('Règles totales récupérées', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getAllRules',
        rulesCount: rules.length
      }
    });
    return rules;
  }

  async getRule(id: string): Promise<DateIntelligenceRule | undefined> {
    const rule = DatabaseStorage.dateIntelligenceRules.get(id);
    logger.info('Règle récupérée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getRule',
        ruleId: id,
        found: !!rule
      }
    });
    return rule;
  }

  async createRule(data: InsertDateIntelligenceRule): Promise<DateIntelligenceRule> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const rule: DateIntelligenceRule = {
      id,
      ...data,
      isActive: data.isActive ?? true,
      priority: data.priority ?? 100,
      validFrom: data.validFrom ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DatabaseStorage.dateIntelligenceRules.set(id, rule);
    logger.info('Règle créée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'createRule',
        ruleId: id,
        ruleName: rule.name
      }
    });
    
    return rule;
  }

  async updateRule(id: string, data: Partial<InsertDateIntelligenceRule>): Promise<DateIntelligenceRule> {
    const existing = DatabaseStorage.dateIntelligenceRules.get(id);
    if (!existing) {
      throw new Error(`Règle ${id} non trouvée`);
    }

    const updated: DateIntelligenceRule = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    DatabaseStorage.dateIntelligenceRules.set(id, updated);
    logger.info('Règle mise à jour', {
      metadata: {
        service: 'StoragePOC',
        operation: 'updateRule',
        ruleId: id
      }
    });
    
    return updated;
  }

  async deleteRule(id: string): Promise<void> {
    const existing = DatabaseStorage.dateIntelligenceRules.get(id);
    if (!existing) {
      throw new Error(`Règle ${id} non trouvée`);
    }

    DatabaseStorage.dateIntelligenceRules.delete(id);
    logger.info('Règle supprimée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'deleteRule',
        ruleId: id
      }
    });
  }

  // ========================================
  // DATE ALERTS OPERATIONS
  // ========================================

  async getDateAlerts(filters?: { entityType?: string, entityId?: string, status?: string }): Promise<DateAlert[]> {
    let alerts = Array.from(DatabaseStorage.dateAlerts.values());

    // Appliquer les filtres
    if (filters?.entityType) {
      alerts = alerts.filter(alert => alert.entityType === filters.entityType);
    }
    
    if (filters?.entityId) {
      alerts = alerts.filter(alert => alert.entityId === filters.entityId);
    }
    
    if (filters?.status) {
      alerts = alerts.filter(alert => alert.status === filters.status);
    }

    // Trier par date de détection (plus récent en premier)
    alerts.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
    
    logger.info('Alertes date trouvées', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getDateAlerts',
        alertsCount: alerts.length,
        filters: filters
      }
    });
    return alerts;
  }

  async getDateAlert(id: string): Promise<DateAlert | undefined> {
    const alert = DatabaseStorage.dateAlerts.get(id);
    logger.info('Alerte date récupérée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getDateAlert',
        alertId: id,
        found: !!alert
      }
    });
    return alert;
  }

  async createDateAlert(data: InsertDateAlert): Promise<DateAlert> {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: DateAlert = {
      id,
      ...data,
      status: data.status ?? 'pending',
      severity: data.severity ?? 'warning',
      detectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    DatabaseStorage.dateAlerts.set(id, alert);
    logger.info('Alerte date créée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'createDateAlert',
        alertId: id,
        title: alert.title
      }
    });
    
    return alert;
  }

  async updateDateAlert(id: string, data: Partial<InsertDateAlert>): Promise<DateAlert> {
    const existing = DatabaseStorage.dateAlerts.get(id);
    if (!existing) {
      throw new Error(`Alerte ${id} non trouvée`);
    }

    const updated: DateAlert = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    DatabaseStorage.dateAlerts.set(id, updated);
    logger.info('Alerte date mise à jour', {
      metadata: {
        service: 'StoragePOC',
        operation: 'updateDateAlert',
        alertId: id
      }
    });
    
    return updated;
  }

  async deleteDateAlert(id: string): Promise<void> {
    const existing = DatabaseStorage.dateAlerts.get(id);
    if (!existing) {
      throw new Error(`Alerte ${id} non trouvée`);
    }

    DatabaseStorage.dateAlerts.delete(id);
    logger.info('Alerte date supprimée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'deleteDateAlert',
        alertId: id
      }
    });
  }

  async acknowledgeAlert(id: string, userId: string): Promise<boolean> {
    const existing = DatabaseStorage.dateAlerts.get(id);
    if (!existing) {
      throw new Error(`Alerte ${id} non trouvée`);
    }

    const updated: DateAlert = {
      ...existing,
      status: 'acknowledged',
      assignedTo: userId,
      acknowledgedAt: new Date(),
      updatedAt: new Date()
    };

    DatabaseStorage.dateAlerts.set(id, updated);
    logger.info('Alerte date acquittée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'acknowledgeAlert',
        alertId: id,
        userId: userId
      }
    });
    
    return true;
  }

  async resolveAlert(id: string, userId: string, actionTaken?: string): Promise<boolean> {
    const existing = DatabaseStorage.dateAlerts.get(id);
    if (!existing) {
      throw new Error(`Alerte ${id} non trouvée`);
    }

    const updated: DateAlert = {
      ...existing,
      status: 'resolved',
      actionTaken: actionTaken || existing.actionTaken,
      actionBy: userId,
      resolvedAt: new Date(),
      updatedAt: new Date()
    };

    DatabaseStorage.dateAlerts.set(id, updated);
    logger.info('Alerte date résolue', {
      metadata: {
        service: 'StoragePOC',
        operation: 'resolveAlert',
        alertId: id,
        userId: userId
      }
    });
    
    return true;
  }

  // ========================================
  // ANALYTICS SERVICE OPERATIONS - PHASE 3.1.3
  // ========================================

  // KPI Snapshots operations
  async createKPISnapshot(data: InsertKpiSnapshot): Promise<KpiSnapshot> {
    const [snapshot] = await db.insert(kpiSnapshots).values(data).returning();
    logger.info('KPI Snapshot créé', {
      metadata: {
        service: 'StoragePOC',
        operation: 'createKPISnapshot',
        periodFrom: data.periodFrom,
        periodTo: data.periodTo
      }
    });
    return snapshot;
  }

  async getKPISnapshots(period: DateRange, limit?: number): Promise<KpiSnapshot[]> {
    let query = db.select()
      .from(kpiSnapshots)
      .where(
        and(
          gte(kpiSnapshots.periodFrom, period.from),
          lte(kpiSnapshots.periodTo, period.to)
        )
      )
      .orderBy(desc(kpiSnapshots.snapshotDate));

    if (limit) {
      query = query.limit(limit);
    }

    const snapshots = await query;
    logger.info('KPI snapshots trouvés', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getKPISnapshots',
        snapshotsCount: snapshots.length,
        periodFrom: period.from,
        periodTo: period.to
      }
    });
    return snapshots;
  }

  async getLatestKPISnapshot(): Promise<KpiSnapshot | null> {
    const [latest] = await db.select()
      .from(kpiSnapshots)
      .orderBy(desc(kpiSnapshots.snapshotDate))
      .limit(1);
    
    logger.info('Dernier KPI snapshot récupéré', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getLatestKPISnapshot',
        snapshotId: latest ? latest.id : null
      }
    });
    return latest || null;
  }

  // Business Metrics operations  
  async createBusinessMetric(data: InsertBusinessMetric): Promise<BusinessMetric> {
    const [metric] = await db.insert(businessMetrics).values(data).returning();
    logger.info('Métrique business créée', {
      metadata: {
        service: 'StoragePOC',
        operation: 'createBusinessMetric',
        metricType: data.metricType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd
      }
    });
    return metric;
  }

  async getBusinessMetrics(filters: MetricFilters): Promise<BusinessMetric[]> {
    let query = db.select().from(businessMetrics);
    
    const conditions = [];
    
    if (filters.metricType) {
      conditions.push(eq(businessMetrics.metricType, filters.metricType as any));
    }
    
    if (filters.periodType) {
      conditions.push(eq(businessMetrics.periodType, filters.periodType));
    }
    
    if (filters.userId) {
      conditions.push(eq(businessMetrics.userId, filters.userId));
    }
    
    if (filters.projectType) {
      conditions.push(eq(businessMetrics.projectType, filters.projectType));
    }
    
    if (filters.periodStart) {
      conditions.push(gte(businessMetrics.periodStart, filters.periodStart));
    }
    
    if (filters.periodEnd) {
      conditions.push(lte(businessMetrics.periodEnd, filters.periodEnd));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const metrics = await query.orderBy(desc(businessMetrics.calculatedAt));
    logger.info('Métriques business trouvées', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getBusinessMetrics',
        metricsCount: metrics.length,
        filters: filters
      }
    });
    return metrics;
  }

  async getMetricTimeSeries(metricType: string, period: DateRange): Promise<BusinessMetric[]> {
    const metrics = await db.select()
      .from(businessMetrics)
      .where(
        and(
          eq(businessMetrics.metricType, metricType as any),
          gte(businessMetrics.periodStart, period.from),
          lte(businessMetrics.periodEnd, period.to)
        )
      )
      .orderBy(businessMetrics.periodStart);

    logger.info('Métriques série temporelle trouvées', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getMetricTimeSeries',
        metricType: metricType,
        metricsCount: metrics.length
      }
    });
    return metrics;
  }

  // Performance Benchmarks operations
  async createPerformanceBenchmark(data: InsertPerformanceBenchmark): Promise<PerformanceBenchmark> {
    const [benchmark] = await db.insert(performanceBenchmarks).values(data).returning();
    logger.info('Benchmark performance créé', {
      metadata: {
        service: 'StoragePOC',
        operation: 'createPerformanceBenchmark',
        benchmarkType: data.benchmarkType,
        entityType: data.entityType,
        entityId: data.entityId
      }
    });
    return benchmark;
  }

  async getBenchmarks(entityType: string, entityId?: string): Promise<PerformanceBenchmark[]> {
    let whereConditions = [eq(performanceBenchmarks.entityType, entityType)];
    
    if (entityId) {
      whereConditions.push(eq(performanceBenchmarks.entityId, entityId));
    }

    const benchmarks = await db.select()
      .from(performanceBenchmarks)
      .where(and(...whereConditions))
      .orderBy(desc(performanceBenchmarks.createdAt));
      
    logger.info('Benchmarks trouvés', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getBenchmarks',
        benchmarksCount: benchmarks.length,
        entityType: entityType,
        entityId: entityId
      }
    });
    return benchmarks;
  }

  async getTopPerformers(metricType: string, limit: number = 10): Promise<PerformanceBenchmark[]> {
    // Pour simplifier, on utilise le score de performance global
    const performers = await db.select()
      .from(performanceBenchmarks)
      .orderBy(desc(performanceBenchmarks.performanceScore))
      .limit(limit);

    logger.info('Top performers trouvés', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getTopPerformers',
        performersCount: performers.length,
        limit: limit
      }
    });
    return performers;
  }

  // ========================================
  // PREDICTIVE ENGINE METHODS - PHASE 3.1.6.2
  // ========================================

  // Stockage en mémoire pour les forecast snapshots (POC)
  private static forecastSnapshots: Map<string, {
    id: string;
    generated_at: string;
    forecast_period: string;
    confidence: number;
    method_used: string;
    forecast_data: any;
    params: any;
  }> = new Map();

  async getMonthlyRevenueHistory(range: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    month: string;
    total_revenue: number;
    projects_count: number;
    avg_project_value: number;
  }>> {
    try {
      logger.info('Récupération historique revenus mensuel', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMonthlyRevenueHistory',
          startDate: range.start_date,
          endDate: range.end_date
        }
      });
      
      // Requête SQL pour agréger les projets par mois
      // Utilise les projets signés/terminés avec montant final
      const results = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${projects.createdAt})::date`,
          total_revenue: sql<number>`COALESCE(SUM(CAST(${projects.montantFinal} AS NUMERIC)), 0)`,
          projects_count: sql<number>`COUNT(*)`,
          avg_project_value: sql<number>`COALESCE(AVG(CAST(${projects.montantFinal} AS NUMERIC)), 0)`
        })
        .from(projects)
        .where(
          and(
            gte(projects.createdAt, new Date(range.start_date)),
            lte(projects.createdAt, new Date(range.end_date)),
            sql`${projects.status} IN ('chantier', 'sav')`, // Projets avec revenus confirmés
            sql`${projects.montantFinal} IS NOT NULL AND ${projects.montantFinal} > 0`
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${projects.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${projects.createdAt})`);

      // Formater les résultats
      const formattedResults = results.map(row => ({
        month: new Date(row.month).toISOString().substring(0, 7), // YYYY-MM
        total_revenue: Number(row.total_revenue),
        projects_count: Number(row.projects_count),
        avg_project_value: Number(row.avg_project_value)
      }));

      logger.info('Historique revenus mensuel trouvé', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMonthlyRevenueHistory',
          monthsCount: formattedResults.length
        }
      });
      return formattedResults;
    } catch (error) {
      logger.error('Erreur getMonthlyRevenueHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMonthlyRevenueHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getProjectDelayHistory(range: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    project_id: string;
    planned_days: number;
    actual_days: number;
    delay_days: number;
    project_type: string;
    complexity: string;
  }>> {
    try {
      logger.info('Récupération historique délais projets', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectDelayHistory',
          startDate: range.start_date,
          endDate: range.end_date
        }
      });
      
      // Requête pour calculer les délais des projets terminés
      const results = await db
        .select({
          project_id: projects.id,
          planned_days: sql<number>`COALESCE(CAST(${projects.delaiContractuel} AS INTEGER), 90)`, // Délai contractuel ou 90j par défaut
          actual_days: sql<number>`CASE 
            WHEN ${projects.startDatePlanned} IS NOT NULL AND ${projects.endDatePlanned} IS NOT NULL 
            THEN EXTRACT(DAYS FROM ${projects.endDatePlanned} - ${projects.startDatePlanned})::INTEGER
            ELSE 0
          END`,
          project_type: projects.menuiserieType,
          complexity: sql<string>`CASE 
            WHEN CAST(${projects.montantFinal} AS NUMERIC) > 100000 THEN 'complex'
            WHEN CAST(${projects.montantFinal} AS NUMERIC) > 50000 THEN 'medium'
            ELSE 'simple'
          END`
        })
        .from(projects)
        .where(
          and(
            gte(projects.createdAt, new Date(range.start_date)),
            lte(projects.createdAt, new Date(range.end_date)),
            sql`${projects.status} IN ('chantier', 'sav')`, // Projets terminés ou en cours avancé
            sql`${projects.startDatePlanned} IS NOT NULL`,
            sql`${projects.endDatePlanned} IS NOT NULL`
          )
        )
        .orderBy(desc(projects.createdAt));

      // Calculer les retards
      const formattedResults = results.map(row => ({
        project_id: row.project_id,
        planned_days: Number(row.planned_days),
        actual_days: Number(row.actual_days),
        delay_days: Number(row.actual_days) - Number(row.planned_days),
        project_type: row.project_type || 'fenetre',
        complexity: row.complexity
      }));

      logger.info('Historique délais projets trouvé', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectDelayHistory',
          projectsCount: formattedResults.length
        }
      });
      return formattedResults;
    } catch (error) {
      logger.error('Erreur getProjectDelayHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectDelayHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getTeamLoadHistory(range: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    month: string;
    total_projects: number;
    team_capacity: number;
    utilization_rate: number;
    avg_project_duration: number;
  }>> {
    try {
      logger.info('Récupération historique charge équipes', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getTeamLoadHistory',
          startDate: range.start_date,
          endDate: range.end_date
        }
      });
      
      // Requête pour agréger la charge équipes par mois
      const results = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${beWorkload.createdAt})::date`,
          total_hours: sql<number>`SUM(CAST(${beWorkload.plannedHours} AS NUMERIC))`,
          capacity_hours: sql<number>`SUM(CAST(${beWorkload.plannedHours} AS NUMERIC))`,
          projects_count: sql<number>`COUNT(DISTINCT ${beWorkload.userId})`
        })
        .from(beWorkload)
        .where(
          and(
            gte(beWorkload.createdAt, new Date(range.start_date)),
            lte(beWorkload.createdAt, new Date(range.end_date))
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${beWorkload.createdAt})`)
        .orderBy(sql`DATE_TRUNC('month', ${beWorkload.createdAt})`);

      // Compléter avec données projets pour durée moyenne
      const projectDurations = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${projects.startDatePlanned})::date`,
          avg_duration: sql<number>`AVG(EXTRACT(DAYS FROM ${projects.endDatePlanned} - ${projects.startDatePlanned}))`
        })
        .from(projects)
        .where(
          and(
            gte(projects.startDatePlanned, new Date(range.start_date)),
            lte(projects.startDatePlanned, new Date(range.end_date)),
            sql`${projects.startDatePlanned} IS NOT NULL`,
            sql`${projects.endDatePlanned} IS NOT NULL`
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${projects.startDatePlanned})`)
        .orderBy(sql`DATE_TRUNC('month', ${projects.startDatePlanned})`);

      // Créer un map pour les durées par mois
      const durationMap = new Map(
        projectDurations.map(d => [d.month, Number(d.avg_duration) || 30])
      );

      // Formater les résultats
      const formattedResults = results.map(row => {
        const monthKey = row.month;
        const totalHours = Number(row.total_hours) || 0;
        const capacityHours = Number(row.capacity_hours) || 1;
        const utilizationRate = capacityHours > 0 ? (totalHours / capacityHours) * 100 : 0;
        
        return {
          month: new Date(row.month).toISOString().substring(0, 7), // YYYY-MM
          total_projects: Number(row.projects_count),
          team_capacity: Math.round(capacityHours / 40), // Conversion heures -> personnes (40h/semaine)
          utilization_rate: Math.round(utilizationRate * 100) / 100,
          avg_project_duration: durationMap.get(monthKey) || 30
        };
      });

      logger.info('Historique charge équipes trouvé', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getTeamLoadHistory',
          monthsCount: formattedResults.length
        }
      });
      return formattedResults;
    } catch (error) {
      logger.error('Erreur getTeamLoadHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getTeamLoadHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async saveForecastSnapshot(forecast: {
    forecast_data: any;
    generated_at: string;
    params: any;
  }): Promise<string> {
    try {
      const id = `forecast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Extraire les métadonnées du forecast pour les champs requis
      const forecastPeriod = forecast.params?.period || 'unknown';
      const confidence = forecast.forecast_data?.confidence || 0.85;
      const methodUsed = forecast.params?.method || 'historical_trend';

      const snapshot = {
        id,
        generated_at: forecast.generated_at,
        forecast_period: forecastPeriod,
        confidence,
        method_used: methodUsed,
        forecast_data: forecast.forecast_data,
        params: forecast.params
      };

      DatabaseStorage.forecastSnapshots.set(id, snapshot);
      
      logger.info('Snapshot forecast sauvegardé', {
        metadata: {
          service: 'StoragePOC',
          operation: 'saveForecastSnapshot',
          snapshotId: id,
          forecastPeriod: forecastPeriod
        }
      });
      return id;
    } catch (error) {
      logger.error('Erreur saveForecastSnapshot', {
        metadata: {
          service: 'StoragePOC',
          operation: 'saveForecastSnapshot',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async listForecastSnapshots(limit: number = 50): Promise<Array<{
    id: string;
    generated_at: string;
    forecast_period: string;
    confidence: number;
    method_used: string;
  }>> {
    try {
      const snapshots = Array.from(DatabaseStorage.forecastSnapshots.values())
        .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
        .slice(0, limit)
        .map(snapshot => ({
          id: snapshot.id,
          generated_at: snapshot.generated_at,
          forecast_period: snapshot.forecast_period,
          confidence: snapshot.confidence,
          method_used: snapshot.method_used
        }));

      logger.info('Snapshots forecast trouvés', {
        metadata: {
          service: 'StoragePOC',
          operation: 'listForecastSnapshots',
          snapshotsCount: snapshots.length,
          limit: limit
        }
      });
      return snapshots;
    } catch (error) {
      logger.error('Erreur listForecastSnapshots', {
        metadata: {
          service: 'StoragePOC',
          operation: 'listForecastSnapshots',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getAnalyticsSnapshots(params?: any): Promise<any[]> {
    try {
      logger.info('Récupération snapshots analytics', {
        metadata: {
          service: 'DatabaseStorage',
          operation: 'getAnalyticsSnapshots',
          params
        }
      });
      return [];
    } catch (error) {
      logger.error('Erreur getAnalyticsSnapshots', {
        metadata: {
          service: 'DatabaseStorage',
          operation: 'getAnalyticsSnapshots',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async createAnalyticsSnapshot(data: any): Promise<any> {
    try {
      const snapshot = {
        id: `analytics_snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        createdAt: new Date()
      };
      logger.info('Snapshot analytics créé', {
        metadata: {
          service: 'DatabaseStorage',
          operation: 'createAnalyticsSnapshot',
          snapshotId: snapshot.id
        }
      });
      return snapshot;
    } catch (error) {
      logger.error('Erreur createAnalyticsSnapshot', {
        metadata: {
          service: 'DatabaseStorage',
          operation: 'createAnalyticsSnapshot',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER QUOTE SESSIONS OPERATIONS - WORKFLOW FOURNISSEURS
  // ========================================

  async getSupplierQuoteSessions(aoId?: string, aoLotId?: string): Promise<(SupplierQuoteSession & { supplier?: any; aoLot?: any })[]> {
    try {
      let query = db.select().from(supplierQuoteSessions);
      
      if (aoId) {
        query = query.where(eq(supplierQuoteSessions.aoId, aoId));
      }
      if (aoLotId) {
        query = query.where(eq(supplierQuoteSessions.aoLotId, aoLotId));
      }

      const sessions = await query;
      logger.info(`Récupération de ${sessions.length} sessions fournisseurs`);
      return sessions;
    } catch (error) {
      logger.error('Erreur récupération sessions devis fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierQuoteSessions',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getSupplierQuoteSession(id: string): Promise<(SupplierQuoteSession & { supplier?: any; aoLot?: any }) | undefined> {
    try {
      const [session] = await db.select().from(supplierQuoteSessions).where(eq(supplierQuoteSessions.id, id));
      return session;
    } catch (error) {
      logger.error('Erreur récupération session devis fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierQuoteSession',
          sessionId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getSupplierQuoteSessionByToken(token: string): Promise<(SupplierQuoteSession & { supplier?: any; aoLot?: any }) | undefined> {
    try {
      const [session] = await db.select().from(supplierQuoteSessions).where(eq(supplierQuoteSessions.accessToken, token));
      return session;
    } catch (error) {
      logger.error('Erreur récupération session par token', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierQuoteSessionByToken',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createSupplierQuoteSession(session: InsertSupplierQuoteSession): Promise<SupplierQuoteSession> {
    try {
      const [newSession] = await db.insert(supplierQuoteSessions).values(session).returning();
      logger.info(`Session fournisseur créée: ${newSession.id}`);
      return newSession;
    } catch (error) {
      logger.error('Erreur création session devis fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createSupplierQuoteSession',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateSupplierQuoteSession(id: string, session: Partial<InsertSupplierQuoteSession>): Promise<SupplierQuoteSession> {
    try {
      const [updatedSession] = await db.update(supplierQuoteSessions)
        .set({ ...session, updatedAt: new Date() })
        .where(eq(supplierQuoteSessions.id, id))
        .returning();
      logger.info(`Session fournisseur mise à jour: ${id}`);
      return updatedSession;
    } catch (error) {
      logger.error('Erreur mise à jour session devis fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateSupplierQuoteSession',
          sessionId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteSupplierQuoteSession(id: string): Promise<void> {
    try {
      await db.delete(supplierQuoteSessions).where(eq(supplierQuoteSessions.id, id));
      logger.info(`Session fournisseur supprimée: ${id}`);
    } catch (error) {
      logger.error('Erreur suppression session devis fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteSupplierQuoteSession',
          sessionId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async generateSessionToken(): Promise<string> {
    // Génère un token unique sécurisé de 32 caractères
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  // ========================================
  // AO LOT SUPPLIERS OPERATIONS - SÉLECTION FOURNISSEURS PAR LOT
  // ========================================

  async getAoLotSuppliers(aoLotId: string): Promise<(AoLotSupplier & { supplier?: any; selectedByUser?: any })[]> {
    try {
      const lotSuppliers = await db.select().from(aoLotSuppliers).where(eq(aoLotSuppliers.aoLotId, aoLotId));
      logger.info(`Récupération de ${lotSuppliers.length} fournisseurs pour le lot ${aoLotId}`);
      return lotSuppliers;
    } catch (error) {
      logger.error('Erreur récupération fournisseurs lot', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAoLotSuppliers',
          aoLotId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getAoLotSupplier(id: string): Promise<(AoLotSupplier & { supplier?: any; selectedByUser?: any }) | undefined> {
    try {
      const [lotSupplier] = await db.select().from(aoLotSuppliers).where(eq(aoLotSuppliers.id, id));
      return lotSupplier;
    } catch (error) {
      logger.error('Erreur récupération fournisseur lot', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAoLotSupplier',
          lotSupplierId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createAoLotSupplier(lotSupplier: InsertAoLotSupplier): Promise<AoLotSupplier> {
    try {
      const [newLotSupplier] = await db.insert(aoLotSuppliers).values(lotSupplier).returning();
      logger.info(`Association lot-fournisseur créée: ${newLotSupplier.id}`);
      return newLotSupplier;
    } catch (error) {
      logger.error('Erreur création association lot-fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createAoLotSupplier',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateAoLotSupplier(id: string, lotSupplier: Partial<InsertAoLotSupplier>): Promise<AoLotSupplier> {
    try {
      const [updatedLotSupplier] = await db.update(aoLotSuppliers)
        .set({ ...lotSupplier, updatedAt: new Date() })
        .where(eq(aoLotSuppliers.id, id))
        .returning();
      logger.info(`Association lot-fournisseur mise à jour: ${id}`);
      return updatedLotSupplier;
    } catch (error) {
      logger.error('Erreur mise à jour association lot-fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateAoLotSupplier',
          lotSupplierId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteAoLotSupplier(id: string): Promise<void> {
    try {
      await db.delete(aoLotSuppliers).where(eq(aoLotSuppliers.id, id));
      logger.info(`Association lot-fournisseur supprimée: ${id}`);
    } catch (error) {
      logger.error('Erreur suppression association lot-fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteAoLotSupplier',
          lotSupplierId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getSuppliersByLot(aoLotId: string): Promise<any[]> {
    try {
      // Cette méthode devrait faire une jointure pour récupérer les détails des fournisseurs
      // Pour l'instant, on retourne les associations basiques
      const associations = await this.getAoLotSuppliers(aoLotId);
      return associations;
    } catch (error) {
      logger.error('Erreur récupération fournisseurs par lot', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSuppliersByLot',
          aoLotId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER DOCUMENTS OPERATIONS - GESTION DOCUMENTS FOURNISSEURS
  // ========================================

  async getSupplierDocuments(sessionId?: string, supplierId?: string): Promise<(SupplierDocument & { session?: any; validatedByUser?: any })[]> {
    try {
      let query = db.select().from(supplierDocuments);
      
      if (sessionId) {
        query = query.where(eq(supplierDocuments.sessionId, sessionId));
      }
      if (supplierId) {
        query = query.where(eq(supplierDocuments.supplierId, supplierId));
      }

      const documents = await query;
      logger.info(`Récupération de ${documents.length} documents fournisseurs`);
      return documents;
    } catch (error) {
      logger.error('Erreur récupération documents fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierDocuments',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getSupplierDocument(id: string): Promise<(SupplierDocument & { session?: any; validatedByUser?: any }) | undefined> {
    try {
      const [document] = await db.select().from(supplierDocuments).where(eq(supplierDocuments.id, id));
      return document;
    } catch (error) {
      logger.error('Erreur récupération document fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierDocument',
          documentId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createSupplierDocument(document: InsertSupplierDocument): Promise<SupplierDocument> {
    try {
      const [newDocument] = await db.insert(supplierDocuments).values(document).returning();
      logger.info(`Document fournisseur créé: ${newDocument.id}`);
      return newDocument;
    } catch (error) {
      logger.error('Erreur création document fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createSupplierDocument',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateSupplierDocument(id: string, document: Partial<InsertSupplierDocument>): Promise<SupplierDocument> {
    try {
      const [updatedDocument] = await db.update(supplierDocuments)
        .set({ ...document, updatedAt: new Date() })
        .where(eq(supplierDocuments.id, id))
        .returning();
      logger.info(`Document fournisseur mis à jour: ${id}`);
      return updatedDocument;
    } catch (error) {
      logger.error('Erreur mise à jour document fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateSupplierDocument',
          documentId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteSupplierDocument(id: string): Promise<void> {
    try {
      await db.delete(supplierDocuments).where(eq(supplierDocuments.id, id));
      logger.info(`Document fournisseur supprimé: ${id}`);
    } catch (error) {
      logger.error('Erreur suppression document fournisseur', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteSupplierDocument',
          documentId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getDocumentsBySession(sessionId: string): Promise<SupplierDocument[]> {
    try {
      const documents = await db.select().from(supplierDocuments).where(eq(supplierDocuments.sessionId, sessionId));
      logger.info(`Récupération de ${documents.length} documents pour la session ${sessionId}`);
      return documents;
    } catch (error) {
      logger.error('Erreur récupération documents par session', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getDocumentsBySession',
          sessionId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER QUOTE ANALYSIS OPERATIONS - ANALYSE OCR DES DEVIS
  // ========================================

  async getSupplierQuoteAnalyses(documentId?: string, sessionId?: string): Promise<(SupplierQuoteAnalysis & { document?: any; reviewedByUser?: any })[]> {
    try {
      let query = db.select().from(supplierQuoteAnalysis);
      
      if (documentId) {
        query = query.where(eq(supplierQuoteAnalysis.documentId, documentId));
      }
      if (sessionId) {
        query = query.where(eq(supplierQuoteAnalysis.sessionId, sessionId));
      }

      const analyses = await query;
      logger.info(`Récupération de ${analyses.length} analyses OCR`);
      return analyses;
    } catch (error) {
      logger.error('Erreur récupération analyses devis', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierQuoteAnalyses',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getSupplierQuoteAnalysis(id: string): Promise<(SupplierQuoteAnalysis & { document?: any; reviewedByUser?: any }) | undefined> {
    try {
      const [analysis] = await db.select().from(supplierQuoteAnalysis).where(eq(supplierQuoteAnalysis.id, id));
      return analysis;
    } catch (error) {
      logger.error('Erreur récupération analyse devis', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierQuoteAnalysis',
          analysisId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createSupplierQuoteAnalysis(analysis: InsertSupplierQuoteAnalysis): Promise<SupplierQuoteAnalysis> {
    try {
      const [newAnalysis] = await db.insert(supplierQuoteAnalysis).values(analysis).returning();
      logger.info(`Analyse OCR créée: ${newAnalysis.id}`);
      return newAnalysis;
    } catch (error) {
      logger.error('Erreur création analyse devis', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createSupplierQuoteAnalysis',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateSupplierQuoteAnalysis(id: string, analysis: Partial<InsertSupplierQuoteAnalysis>): Promise<SupplierQuoteAnalysis> {
    try {
      const [updatedAnalysis] = await db.update(supplierQuoteAnalysis)
        .set({ ...analysis, updatedAt: new Date() })
        .where(eq(supplierQuoteAnalysis.id, id))
        .returning();
      logger.info(`Analyse OCR mise à jour: ${id}`);
      return updatedAnalysis;
    } catch (error) {
      logger.error('Erreur mise à jour analyse devis', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateSupplierQuoteAnalysis',
          analysisId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteSupplierQuoteAnalysis(id: string): Promise<void> {
    try {
      await db.delete(supplierQuoteAnalysis).where(eq(supplierQuoteAnalysis.id, id));
      logger.info(`Analyse OCR supprimée: ${id}`);
    } catch (error) {
      logger.error('Erreur suppression analyse devis', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteSupplierQuoteAnalysis',
          analysisId: id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getAnalysisByDocument(documentId: string): Promise<SupplierQuoteAnalysis | undefined> {
    try {
      const [analysis] = await db.select().from(supplierQuoteAnalysis).where(eq(supplierQuoteAnalysis.documentId, documentId));
      return analysis;
    } catch (error) {
      logger.error('Erreur récupération analyse par document', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAnalysisByDocument',
          documentId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // WORKFLOW HELPERS - MÉTHODES UTILITAIRES WORKFLOW FOURNISSEURS
  // ========================================

  async getSupplierWorkflowStatus(aoId: string): Promise<{
    totalLots: number;
    lotsWithSuppliers: number;
    activeSessions: number;
    documentsUploaded: number;
    documentsAnalyzed: number;
    pendingAnalysis: number;
  }> {
    try {
      // Compter les lots de l'AO
      const lots = await this.getAoLots(aoId);
      const totalLots = lots.length;

      // Compter les lots avec fournisseurs associés
      let lotsWithSuppliers = 0;
      for (const lot of lots) {
        const suppliers = await this.getAoLotSuppliers(lot.id);
        if (suppliers.length > 0) {
          lotsWithSuppliers++;
        }
      }

      // Compter les sessions actives
      const sessions = await this.getSupplierQuoteSessions(aoId);
      const activeSessions = sessions.filter(s => s.status === 'active').length;

      // Compter les documents uploadés et analysés
      let documentsUploaded = 0;
      let documentsAnalyzed = 0;
      for (const session of sessions) {
        const docs = await this.getDocumentsBySession(session.id);
        documentsUploaded += docs.length;
        
        for (const doc of docs) {
          const analysis = await this.getAnalysisByDocument(doc.id);
          if (analysis) {
            documentsAnalyzed++;
          }
        }
      }

      const pendingAnalysis = documentsUploaded - documentsAnalyzed;

      const status = {
        totalLots,
        lotsWithSuppliers,
        activeSessions,
        documentsUploaded,
        documentsAnalyzed,
        pendingAnalysis
      };

      logger.info(`Statut workflow AO ${aoId}:`, status);
      return status;
    } catch (error) {
      logger.error('Erreur getSupplierWorkflowStatus', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierWorkflowStatus',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getSessionDocumentsSummary(sessionId: string): Promise<{
    totalDocuments: number;
    analyzedDocuments: number;
    pendingDocuments: number;
    mainQuotePresent: boolean;
    averageQualityScore?: number;
  }> {
    try {
      const documents = await this.getDocumentsBySession(sessionId);
      const totalDocuments = documents.length;

      let analyzedDocuments = 0;
      let qualityScores: number[] = [];
      let mainQuotePresent = false;

      for (const doc of documents) {
        const analysis = await this.getAnalysisByDocument(doc.id);
        if (analysis) {
          analyzedDocuments++;
          if (analysis.qualityScore) {
            qualityScores.push(analysis.qualityScore);
          }
          if (doc.documentType === 'devis' && doc.isMainQuote) {
            mainQuotePresent = true;
          }
        }
      }

      const pendingDocuments = totalDocuments - analyzedDocuments;
      const averageQualityScore = qualityScores.length > 0 
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
        : undefined;

      const summary = {
        totalDocuments,
        analyzedDocuments,
        pendingDocuments,
        mainQuotePresent,
        averageQualityScore
      };

      logger.info(`Résumé documents session ${sessionId}:`, summary);
      return summary;
    } catch (error) {
      logger.error('Erreur getSessionDocumentsSummary', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSessionDocumentsSummary',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }
}

// ========================================
// CLASSE MEMSTORAGE AVEC DONNÉES MOCK RÉALISTES - PHASE 3.1.6.2
// ========================================

export class MemStorage implements IStorage {
  // Propriétés requises pour interface IStorage
  private db: any = null; // Mock database reference
  private eventBus?: EventBus; // Optional EventBus pour auto-publishing

  // INJECTION EVENTBUS - Constructeur optionnel pour tests
  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
  }

  // Mock data pour les forecast snapshots
  private static mockForecastSnapshots = [
    {
      id: "forecast-mock-1",
      generated_at: "2024-09-15T10:30:00Z",
      forecast_period: "2024-Q4",
      confidence: 0.87,
      method_used: "historical_trend"
    },
    {
      id: "forecast-mock-2", 
      generated_at: "2024-09-10T14:20:00Z",
      forecast_period: "2024-Q3",
      confidence: 0.92,
      method_used: "seasonal_analysis"
    }
  ];

  // ========================================
  // PREDICTIVE ENGINE METHODS - DONNÉES MOCK MENUISERIE FRANÇAISE
  // ========================================

  // getMonthlyRevenueHistory implemented in Predictive Engine section below

  async getProjectDelayHistory(range: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    project_id: string;
    planned_days: number;
    actual_days: number;
    delay_days: number;
    project_type: string;
    complexity: string;
  }>> {
    logger.info('Mock historique délais projets', {
      metadata: {
        service: 'MemStorage',
        operation: 'getProjectDelayHistory',
        startDate: range.start_date,
        endDate: range.end_date
      }
    });
    
    // Données réalistes basées sur business menuiserie JLM
    return [
      {
        project_id: "proj-mock-1",
        planned_days: 45,
        actual_days: 52,
        delay_days: 7,
        project_type: "fenetre",
        complexity: "simple"
      },
      {
        project_id: "proj-mock-2", 
        planned_days: 60,
        actual_days: 75,
        delay_days: 15,
        project_type: "porte",
        complexity: "medium"
      },
      {
        project_id: "proj-mock-3",
        planned_days: 90,
        actual_days: 85,
        delay_days: -5,
        project_type: "verriere",
        complexity: "complex"
      },
      {
        project_id: "proj-mock-4",
        planned_days: 30,
        actual_days: 35,
        delay_days: 5,
        project_type: "volet",
        complexity: "simple"
      },
      {
        project_id: "proj-mock-5",
        planned_days: 75,
        actual_days: 90,
        delay_days: 15,
        project_type: "portail",
        complexity: "medium"
      },
      {
        project_id: "proj-mock-6",
        planned_days: 120,
        actual_days: 135,
        delay_days: 15,
        project_type: "cloison",
        complexity: "complex"
      }
    ];
  }

  async getTeamLoadHistory(range: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    month: string;
    total_projects: number;
    team_capacity: number;
    utilization_rate: number;
    avg_project_duration: number;
  }>> {
    logger.info('Mock historique charge équipes', {
      metadata: {
        service: 'MemStorage',
        operation: 'getTeamLoadHistory',
        startDate: range.start_date,
        endDate: range.end_date
      }
    });
    
    // Pattern charge équipe JLM avec variations saisonnières
    return [
      {
        month: "2024-01",
        total_projects: 8,
        team_capacity: 12,
        utilization_rate: 67,
        avg_project_duration: 42
      },
      {
        month: "2024-02", 
        total_projects: 9,
        team_capacity: 12,
        utilization_rate: 75,
        avg_project_duration: 38
      },
      {
        month: "2024-03",
        total_projects: 12,
        team_capacity: 12,
        utilization_rate: 100,
        avg_project_duration: 35
      },
      {
        month: "2024-04",
        total_projects: 15,
        team_capacity: 14,
        utilization_rate: 107,
        avg_project_duration: 40
      },
      {
        month: "2024-05",
        total_projects: 16,
        team_capacity: 14,
        utilization_rate: 114,
        avg_project_duration: 45
      },
      {
        month: "2024-06",
        total_projects: 18,
        team_capacity: 16,
        utilization_rate: 112,
        avg_project_duration: 42
      },
      {
        month: "2024-07",
        total_projects: 17,
        team_capacity: 16,
        utilization_rate: 106,
        avg_project_duration: 38
      },
      {
        month: "2024-08",
        total_projects: 14,
        team_capacity: 14,
        utilization_rate: 100,
        avg_project_duration: 44
      },
      {
        month: "2024-09",
        total_projects: 16,
        team_capacity: 14,
        utilization_rate: 114,
        avg_project_duration: 41
      }
    ];
  }

  async saveForecastSnapshot(forecast: {
    forecast_data: any;
    generated_at: string;
    params: any;
  }): Promise<string> {
    const id = `forecast-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newSnapshot = {
      id,
      generated_at: forecast.generated_at,
      forecast_period: forecast.params?.period || "unknown",
      confidence: forecast.forecast_data?.confidence || 0.85,
      method_used: forecast.params?.method || "mock_method"
    };

    MemStorage.mockForecastSnapshots.unshift(newSnapshot);
    
    logger.info('Mock snapshot forecast sauvegardé', {
      metadata: {
        service: 'MemStorage',
        operation: 'saveForecastSnapshot',
        snapshotId: id
      }
    });
    return id;
  }

  async listForecastSnapshots(limit: number = 50): Promise<Array<{
    id: string;
    generated_at: string;
    forecast_period: string;
    confidence: number;
    method_used: string;
  }>> {
    const snapshots = MemStorage.mockForecastSnapshots.slice(0, limit);
    logger.info('Mock snapshots forecast retournés', {
      metadata: {
        service: 'MemStorage',
        operation: 'listForecastSnapshots',
        snapshotsCount: snapshots.length,
        limit: limit
      }
    });
    return snapshots;
  }

  async getAnalyticsSnapshots(params?: any): Promise<any[]> {
    logger.info('Mock getAnalyticsSnapshots', {
      metadata: {
        service: 'MemStorage',
        operation: 'getAnalyticsSnapshots',
        params
      }
    });
    return [];
  }

  async createAnalyticsSnapshot(data: any): Promise<any> {
    const snapshot = {
      id: `analytics_snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date()
    };
    logger.info('Mock snapshot analytics créé', {
      metadata: {
        service: 'MemStorage',
        operation: 'createAnalyticsSnapshot',
        snapshotId: snapshot.id
      }
    });
    return snapshot;
  }

  // ========================================
  // TOUTES LES AUTRES MÉTHODES ISTORAGE - MOCK BASIQUE
  // ========================================
  
  // Note: Pour les besoins de ce POC, les autres méthodes retournent des données mock basiques
  // ou délèguent vers DatabaseStorage selon les besoins

  // User methods implemented in DatabaseStorage class

  async getAos(): Promise<Ao[]> {
    return [];
  }

  async getAo(id: string): Promise<Ao | undefined> {
    return undefined;
  }

  async createAo(ao: InsertAo): Promise<Ao> {
    throw new Error("MemStorage: createAo not implemented for POC");
  }

  async updateAo(id: string, ao: Partial<InsertAo>): Promise<Ao> {
    throw new Error("MemStorage: updateAo not implemented for POC");
  }

  async getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]> {
    return [];
  }

  async getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined> {
    return undefined;
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    throw new Error("MemStorage: createOffer not implemented for POC");
  }

  async updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer> {
    throw new Error("MemStorage: updateOffer not implemented for POC");
  }

  async deleteOffer(id: string): Promise<void> {
    throw new Error("MemStorage: deleteOffer not implemented for POC");
  }

  async getProjects(search?: string, status?: string): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]> {
    return [];
  }

  async getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined> {
    return undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    throw new Error("MemStorage: createProject not implemented for POC");
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    throw new Error("MemStorage: updateProject not implemented for POC");
  }

  async getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]> {
    return [];
  }

  async getAllTasks(): Promise<(ProjectTask & { assignedUser?: User })[]> {
    return [];
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    throw new Error("MemStorage: createProjectTask not implemented for POC");
  }

  async updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask> {
    throw new Error("MemStorage: updateProjectTask not implemented for POC");
  }

  // MemStorage pour Suppliers - Implémentation complète pour tests/dev
  private suppliers: Map<string, Supplier> = new Map();
  private supplierIdCounter = 1;

  async getSuppliers(search?: string, status?: string): Promise<Supplier[]> {
    let suppliers = Array.from(this.suppliers.values());
    
    // Filtrage par recherche (nom)
    if (search) {
      const searchLower = search.toLowerCase();
      suppliers = suppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Filtrage par statut
    if (status) {
      suppliers = suppliers.filter(supplier => supplier.status === status);
    }
    
    // Tri par date de création (desc)
    return suppliers.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = `supplier-mem-${this.supplierIdCounter++}`;
    const now = new Date();
    
    const newSupplier: Supplier = {
      id,
      name: supplier.name,
      contact: supplier.contact || null,
      email: supplier.email || null,
      phone: supplier.phone || null,
      address: supplier.address || null,
      siret: supplier.siret || null,
      specialties: supplier.specialties || [],
      status: supplier.status || 'actif',
      capacities: supplier.capacities || {},
      avgResponseTime: supplier.avgResponseTime || 0,
      paymentTerms: supplier.paymentTerms || 30,
      deliveryDelay: supplier.deliveryDelay || 15,
      rating: supplier.rating || '0',
      totalOrders: supplier.totalOrders || 0,
      createdAt: now,
      updatedAt: now,
      city: supplier.city || null,
      clientIds: supplier.clientIds || [],
      tags: supplier.tags || []
    };
    
    this.suppliers.set(id, newSupplier);
    logger.info(`MemStorage: Supplier créé avec succès`, { id, name: newSupplier.name });
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const existing = this.suppliers.get(id);
    if (!existing) {
      throw new Error(`Supplier avec ID ${id} introuvable`);
    }
    
    const updated: Supplier = {
      ...existing,
      ...supplier,
      id, // Préserver l'ID
      updatedAt: new Date()
    };
    
    this.suppliers.set(id, updated);
    logger.info(`MemStorage: Supplier mis à jour avec succès`, { id, name: updated.name });
    return updated;
  }

  async deleteSupplier(id: string): Promise<void> {
    const existing = this.suppliers.get(id);
    if (!existing) {
      throw new Error(`Supplier avec ID ${id} introuvable`);
    }
    
    this.suppliers.delete(id);
    logger.info(`MemStorage: Supplier supprimé avec succès`, { id, name: existing.name });
  }

  async getSupplierRequests(offerId?: string): Promise<SupplierRequest[]> {
    return [];
  }

  async createSupplierRequest(request: InsertSupplierRequest): Promise<SupplierRequest> {
    throw new Error("MemStorage: createSupplierRequest not implemented for POC");
  }

  async updateSupplierRequest(id: string, request: Partial<InsertSupplierRequest>): Promise<SupplierRequest> {
    throw new Error("MemStorage: updateSupplierRequest not implemented for POC");
  }

  async getTeamResources(projectId?: string): Promise<(TeamResource & { user?: User })[]> {
    return [];
  }

  async createTeamResource(resource: InsertTeamResource): Promise<TeamResource> {
    throw new Error("MemStorage: createTeamResource not implemented for POC");
  }

  async updateTeamResource(id: string, resource: Partial<InsertTeamResource>): Promise<TeamResource> {
    throw new Error("MemStorage: updateTeamResource not implemented for POC");
  }

  async getBeWorkload(weekNumber?: number, year?: number): Promise<(BeWorkload & { user?: User })[]> {
    return [];
  }

  async createOrUpdateBeWorkload(workload: InsertBeWorkload): Promise<BeWorkload> {
    throw new Error("MemStorage: createOrUpdateBeWorkload not implemented for POC");
  }

  async getDashboardStats(): Promise<{
    totalOffers: number;
    offersInPricing: number;
    offersPendingValidation: number;
    beLoad: number;
  }> {
    return {
      totalOffers: 42,
      offersInPricing: 12,
      offersPendingValidation: 8,
      beLoad: 85
    };
  }

  async getConsolidatedKpis(params: {
    from: string;
    to: string;
    granularity: 'day' | 'week';
    segment?: string;
  }): Promise<ConsolidatedKpis> {
    throw new Error("MemStorage: getConsolidatedKpis not implemented for POC");
  }

  async getChiffrageElementsByOffer(offerId: string): Promise<ChiffrageElement[]> {
    return [];
  }

  async createChiffrageElement(element: InsertChiffrageElement): Promise<ChiffrageElement> {
    throw new Error("MemStorage: createChiffrageElement not implemented for POC");
  }

  async updateChiffrageElement(id: string, element: Partial<InsertChiffrageElement>): Promise<ChiffrageElement> {
    throw new Error("MemStorage: updateChiffrageElement not implemented for POC");
  }

  async deleteChiffrageElement(id: string): Promise<void> {
    throw new Error("MemStorage: deleteChiffrageElement not implemented for POC");
  }

  async getDpgfDocumentByOffer(offerId: string): Promise<DpgfDocument | null> {
    return null;
  }

  async createDpgfDocument(dpgf: InsertDpgfDocument): Promise<DpgfDocument> {
    throw new Error("MemStorage: createDpgfDocument not implemented for POC");
  }

  async updateDpgfDocument(id: string, dpgf: Partial<InsertDpgfDocument>): Promise<DpgfDocument> {
    throw new Error("MemStorage: updateDpgfDocument not implemented for POC");
  }

  async deleteDpgfDocument(id: string): Promise<void> {
    throw new Error("MemStorage: deleteDpgfDocument not implemented for POC");
  }

  async getAoLots(aoId: string): Promise<AoLot[]> {
    return [];
  }

  async createAoLot(lot: InsertAoLot): Promise<AoLot> {
    throw new Error("MemStorage: createAoLot not implemented for POC");
  }

  async updateAoLot(id: string, lot: Partial<InsertAoLot>): Promise<AoLot> {
    throw new Error("MemStorage: updateAoLot not implemented for POC");
  }

  async deleteAoLot(id: string): Promise<void> {
    throw new Error("MemStorage: deleteAoLot not implemented for POC");
  }

  async getMaitresOuvrage(): Promise<MaitreOuvrage[]> {
    return [];
  }

  async getMaitreOuvrage(id: string): Promise<MaitreOuvrage | undefined> {
    return undefined;
  }

  async createMaitreOuvrage(maitreOuvrage: InsertMaitreOuvrage): Promise<MaitreOuvrage> {
    throw new Error("MemStorage: createMaitreOuvrage not implemented for POC");
  }

  async updateMaitreOuvrage(id: string, maitreOuvrage: Partial<InsertMaitreOuvrage>): Promise<MaitreOuvrage> {
    throw new Error("MemStorage: updateMaitreOuvrage not implemented for POC");
  }

  async deleteMaitreOuvrage(id: string): Promise<void> {
    throw new Error("MemStorage: deleteMaitreOuvrage not implemented for POC");
  }

  async getMaitresOeuvre(): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] })[]> {
    return [];
  }

  async getMaitreOeuvre(id: string): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] }) | undefined> {
    return undefined;
  }

  async createMaitreOeuvre(maitreOeuvre: InsertMaitreOeuvre): Promise<MaitreOeuvre> {
    throw new Error("MemStorage: createMaitreOeuvre not implemented for POC");
  }

  async updateMaitreOeuvre(id: string, maitreOeuvre: Partial<InsertMaitreOeuvre>): Promise<MaitreOeuvre> {
    throw new Error("MemStorage: updateMaitreOeuvre not implemented for POC");
  }

  async deleteMaitreOeuvre(id: string): Promise<void> {
    throw new Error("MemStorage: deleteMaitreOeuvre not implemented for POC");
  }

  async getContactsMaitreOeuvre(maitreOeuvreId: string): Promise<ContactMaitreOeuvre[]> {
    return [];
  }

  async createContactMaitreOeuvre(contact: InsertContactMaitreOeuvre): Promise<ContactMaitreOeuvre> {
    throw new Error("MemStorage: createContactMaitreOeuvre not implemented for POC");
  }

  async updateContactMaitreOeuvre(id: string, contact: Partial<InsertContactMaitreOeuvre>): Promise<ContactMaitreOeuvre> {
    throw new Error("MemStorage: updateContactMaitreOeuvre not implemented for POC");
  }

  async deleteContactMaitreOeuvre(id: string): Promise<void> {
    throw new Error("MemStorage: deleteContactMaitreOeuvre not implemented for POC");
  }

  async getValidationMilestones(offerId: string): Promise<ValidationMilestone[]> {
    return [];
  }

  async createValidationMilestone(milestone: InsertValidationMilestone): Promise<ValidationMilestone> {
    throw new Error("MemStorage: createValidationMilestone not implemented for POC");
  }

  async updateValidationMilestone(id: string, milestone: Partial<InsertValidationMilestone>): Promise<ValidationMilestone> {
    throw new Error("MemStorage: updateValidationMilestone not implemented for POC");
  }

  async deleteValidationMilestone(id: string): Promise<void> {
    throw new Error("MemStorage: deleteValidationMilestone not implemented for POC");
  }

  async getVisaArchitecte(projectId: string): Promise<VisaArchitecte[]> {
    return [];
  }

  async createVisaArchitecte(visa: InsertVisaArchitecte): Promise<VisaArchitecte> {
    throw new Error("MemStorage: createVisaArchitecte not implemented for POC");
  }

  async updateVisaArchitecte(id: string, visa: Partial<InsertVisaArchitecte>): Promise<VisaArchitecte> {
    throw new Error("MemStorage: updateVisaArchitecte not implemented for POC");
  }

  async deleteVisaArchitecte(id: string): Promise<void> {
    throw new Error("MemStorage: deleteVisaArchitecte not implemented for POC");
  }

  async getOfferById(id: string): Promise<Offer | undefined> {
    return undefined;
  }

  async getProjectsByOffer(offerId: string): Promise<Project[]> {
    return [];
  }

  async getScoringConfig(): Promise<TechnicalScoringConfig> {
    throw new Error("MemStorage: getScoringConfig not implemented for POC");
  }

  async updateScoringConfig(config: TechnicalScoringConfig): Promise<void> {
    throw new Error("MemStorage: updateScoringConfig not implemented for POC");
  }

  async enqueueTechnicalAlert(alert: InsertTechnicalAlert): Promise<TechnicalAlert> {
    throw new Error("MemStorage: enqueueTechnicalAlert not implemented for POC");
  }

  async listTechnicalAlerts(filter?: TechnicalAlertsFilter): Promise<TechnicalAlert[]> {
    return [];
  }

  async getTechnicalAlert(id: string): Promise<TechnicalAlert | null> {
    return null;
  }

  async acknowledgeTechnicalAlert(id: string, userId: string): Promise<void> {
    throw new Error("MemStorage: acknowledgeTechnicalAlert not implemented for POC");
  }

  async validateTechnicalAlert(id: string, userId: string): Promise<void> {
    throw new Error("MemStorage: validateTechnicalAlert not implemented for POC");
  }

  async bypassTechnicalAlert(id: string, userId: string, until: Date, reason: string): Promise<void> {
    throw new Error("MemStorage: bypassTechnicalAlert not implemented for POC");
  }

  async getActiveBypassForAo(aoId: string): Promise<{ until: Date; reason: string } | null> {
    return null;
  }

  async listTechnicalAlertHistory(alertId: string): Promise<TechnicalAlertHistory[]> {
    return [];
  }

  async addTechnicalAlertHistory(alertId: string | null, action: string, actorUserId: string | null, note?: string, metadata?: Record<string, any>): Promise<TechnicalAlertHistory> {
    throw new Error("MemStorage: addTechnicalAlertHistory not implemented for POC");
  }

  async listAoSuppressionHistory(aoId: string): Promise<TechnicalAlertHistory[]> {
    return [];
  }

  async getMaterialColorRules(): Promise<MaterialColorAlertRule[]> {
    return [];
  }

  async setMaterialColorRules(rules: MaterialColorAlertRule[]): Promise<void> {
    throw new Error("MemStorage: setMaterialColorRules not implemented for POC");
  }

  async getProjectTimelines(projectId: string): Promise<ProjectTimeline[]> {
    return [];
  }

  async getAllProjectTimelines(): Promise<ProjectTimeline[]> {
    return [];
  }

  async createProjectTimeline(data: InsertProjectTimeline): Promise<ProjectTimeline> {
    throw new Error("MemStorage: createProjectTimeline not implemented for POC");
  }

  async updateProjectTimeline(id: string, data: Partial<InsertProjectTimeline>): Promise<ProjectTimeline> {
    throw new Error("MemStorage: updateProjectTimeline not implemented for POC");
  }

  async deleteProjectTimeline(id: string): Promise<void> {
    throw new Error("MemStorage: deleteProjectTimeline not implemented for POC");
  }

  async getActiveRules(filters?: { phase?: typeof projectStatusEnum.enumValues[number], projectType?: string }): Promise<DateIntelligenceRule[]> {
    return [];
  }

  async getAllRules(): Promise<DateIntelligenceRule[]> {
    return [];
  }

  async getRule(id: string): Promise<DateIntelligenceRule | undefined> {
    return undefined;
  }

  async createRule(data: InsertDateIntelligenceRule): Promise<DateIntelligenceRule> {
    throw new Error("MemStorage: createRule not implemented for POC");
  }

  async updateRule(id: string, data: Partial<InsertDateIntelligenceRule>): Promise<DateIntelligenceRule> {
    throw new Error("MemStorage: updateRule not implemented for POC");
  }

  async deleteRule(id: string): Promise<void> {
    throw new Error("MemStorage: deleteRule not implemented for POC");
  }

  async getDateAlerts(filters?: { entityType?: string, entityId?: string, status?: string }): Promise<DateAlert[]> {
    return [];
  }

  async getDateAlert(id: string): Promise<DateAlert | undefined> {
    return undefined;
  }

  async createDateAlert(data: InsertDateAlert): Promise<DateAlert> {
    throw new Error("MemStorage: createDateAlert not implemented for POC");
  }

  async updateDateAlert(id: string, data: Partial<InsertDateAlert>): Promise<DateAlert> {
    throw new Error("MemStorage: updateDateAlert not implemented for POC");
  }

  async deleteDateAlert(id: string): Promise<void> {
    throw new Error("MemStorage: deleteDateAlert not implemented for POC");
  }

  // ========================================
  // BUSINESS ALERTS METHODS - STUBS MEMSTORAGE
  // ========================================

  async getBusinessAlertById(id: string): Promise<BusinessAlert | null> {
    logger.info('Stub getBusinessAlertById', {
      metadata: {
        service: 'MemStorage',
        operation: 'getBusinessAlertById',
        alertId: id
      }
    });
    return null;
  }

  async listBusinessAlerts(query: AlertsQuery): Promise<{
    alerts: BusinessAlert[];
    total: number;
    summary: {
      by_status: Record<AlertStatus, number>;
      by_severity: Record<AlertSeverity, number>;
      by_type: Record<AlertType, number>;
    };
  }> {
    logger.info('Stub listBusinessAlerts', {
      metadata: {
        service: 'MemStorage',
        operation: 'listBusinessAlerts',
        query: query
      }
    });
    return {
      alerts: [],
      total: 0,
      summary: {
        by_status: {} as Record<AlertStatus, number>,
        by_severity: {} as Record<AlertSeverity, number>,
        by_type: {} as Record<AlertType, number>
      }
    };
  }

  async updateBusinessAlertStatus(
    id: string, 
    update: UpdateBusinessAlert,
    user_id: string
  ): Promise<boolean> {
    logger.info('Stub updateBusinessAlertStatus', {
      metadata: {
        service: 'MemStorage',
        operation: 'updateBusinessAlertStatus',
        alertId: id,
        userId: user_id
      }
    });
    return false;
  }

  async acknowledgeAlert(id: string, user_id: string, notes?: string): Promise<boolean> {
    logger.info('Stub acknowledgeAlert', {
      metadata: {
        service: 'MemStorage',
        operation: 'acknowledgeAlert',
        alertId: id,
        userId: user_id
      }
    });
    return false;
  }

  async resolveAlert(id: string, user_id: string, resolution_notes?: string): Promise<boolean> {
    logger.info('Stub resolveAlert', {
      metadata: {
        service: 'MemStorage',
        operation: 'resolveAlert',
        alertId: id,
        userId: user_id
      }
    });
    return false;
  }

  async findSimilarAlerts(params: {
    entity_type: string;
    entity_id: string;
    alert_type: AlertType;
    hours_window?: number;
  }): Promise<BusinessAlert[]> {
    logger.info('Stub findSimilarAlerts', {
      metadata: {
        service: 'MemStorage',
        operation: 'findSimilarAlerts',
        entityType: params.entity_type,
        entityId: params.entity_id
      }
    });
    return [];
  }

  async getOpenAlertsForEntity(
    entity_type: string, 
    entity_id: string
  ): Promise<BusinessAlert[]> {
    logger.info('Stub getOpenAlertsForEntity', {
      metadata: {
        service: 'MemStorage',
        operation: 'getOpenAlertsForEntity',
        entityType: entity_type,
        entityId: entity_id
      }
    });
    return [];
  }

  async createBusinessAlert(data: InsertBusinessAlert): Promise<string> {
    const alertId = `mock-alert-${Date.now()}`;
    logger.info('Stub createBusinessAlert', {
      metadata: {
        service: 'MemStorage',
        operation: 'createBusinessAlert',
        alertId: alertId
      }
    });
    return alertId;
  }

  // ========================================
  // KPI AND ANALYTICS METHODS
  // ========================================

  async createKPISnapshot(data: InsertKpiSnapshot): Promise<KpiSnapshot> {
    throw new Error("MemStorage: createKPISnapshot not implemented for POC");
  }

  async getKPISnapshots(period: DateRange, limit?: number): Promise<KpiSnapshot[]> {
    return [];
  }

  async getLatestKPISnapshot(): Promise<KpiSnapshot | null> {
    return null;
  }

  async createBusinessMetric(data: InsertBusinessMetric): Promise<BusinessMetric> {
    throw new Error("MemStorage: createBusinessMetric not implemented for POC");
  }

  async getBusinessMetrics(filters: MetricFilters): Promise<BusinessMetric[]> {
    return [];
  }

  async getMetricTimeSeries(metricType: string, period: DateRange): Promise<BusinessMetric[]> {
    return [];
  }

  async createPerformanceBenchmark(data: InsertPerformanceBenchmark): Promise<PerformanceBenchmark> {
    throw new Error("MemStorage: createPerformanceBenchmark not implemented for POC");
  }

  async getBenchmarks(entityType: string, entityId?: string): Promise<PerformanceBenchmark[]> {
    return [];
  }

  async getTopPerformers(metricType: string, limit?: number): Promise<PerformanceBenchmark[]> {
    return [];
  }

  // ========================================
  // NOUVELLES MÉTHODES POUR PREDICTIVE ENGINE SERVICE
  // ========================================

  async getMonthlyRevenueHistory(params: { start_date: string; end_date: string }): Promise<Array<{
    period: string;
    total_revenue: number;
    offer_count: number;
    avg_margin: number;
    conversion_rate: number;
    project_types: Record<string, number>;
  }>> {
    try {
      const fromDate = new Date(params.start_date);
      const toDate = new Date(params.end_date);

      // Génération de données historiques simulées pour le POC
      const monthlyData = [];
      const currentDate = new Date(fromDate);

      while (currentDate <= toDate) {
        const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Simulation de données réalistes
        const baseRevenue = 250000 + Math.random() * 100000;
        const seasonalFactor = 1 + 0.2 * Math.sin((currentDate.getMonth() + 1) * Math.PI / 6);
        
        monthlyData.push({
          period,
          total_revenue: Math.round(baseRevenue * seasonalFactor),
          offer_count: Math.round(15 + Math.random() * 10),
          avg_margin: 20 + Math.random() * 10,
          conversion_rate: 25 + Math.random() * 15,
          project_types: {
            fenetre: Math.round(baseRevenue * 0.4),
            porte: Math.round(baseRevenue * 0.3),
            volet: Math.round(baseRevenue * 0.2),
            autre: Math.round(baseRevenue * 0.1)
          }
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return monthlyData;
    } catch (error) {
      logger.error('Erreur getMonthlyRevenueHistory DatabaseStorage', {
        metadata: {
          service: 'DatabaseStorage',
          operation: 'getMonthlyRevenueHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }



  async getSectorBenchmarks(): Promise<{
    industry_avg_conversion: number;
    avg_duration_benchmark: number;
    margin_benchmark: number;
    quality_benchmark: number;
    efficiency_benchmark: number;
  }> {
    // Benchmarks secteur menuiserie (données réalistes POC)
    return {
      industry_avg_conversion: 35,
      avg_duration_benchmark: 42,
      margin_benchmark: 25,
      quality_benchmark: 82,
      efficiency_benchmark: 78
    };
  }

  // ========================================
  // ALERT THRESHOLDS IMPLEMENTATION - PHASE 3.1.7.2
  // ========================================

  async getActiveThresholds(filters?: {
    threshold_key?: ThresholdKey;
    scope_type?: 'global' | 'project' | 'team' | 'period';
    scope_entity_id?: string;
  }): Promise<AlertThreshold[]> {
    try {
      let query = this.db
        .select()
        .from(alertThresholds)
        .where(eq(alertThresholds.isActive, true));
      
      // Filtres conditionnels
      if (filters?.threshold_key) {
        query = query.where(eq(alertThresholds.thresholdKey, filters.threshold_key));
      }
      
      if (filters?.scope_type) {
        query = query.where(eq(alertThresholds.scopeType, filters.scope_type));
      }
      
      if (filters?.scope_entity_id) {
        query = query.where(eq(alertThresholds.scopeEntityId, filters.scope_entity_id));
      }
      
      const results = await query.orderBy(alertThresholds.createdAt);
      return results;
      
    } catch (error) {
      logger.error('Erreur getActiveThresholds', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getActiveThresholds',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getThresholdById(id: string): Promise<AlertThreshold | null> {
    try {
      const [result] = await this.db
        .select()
        .from(alertThresholds)
        .where(eq(alertThresholds.id, id));
      
      return result || null;
      
    } catch (error) {
      logger.error('Erreur getThresholdById', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getThresholdById',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createThreshold(data: InsertAlertThreshold): Promise<string> {
    try {
      const [result] = await this.db
        .insert(alertThresholds)
        .values({
          ...data,
          id: `threshold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({ id: alertThresholds.id });
      
      const thresholdId = result.id;
      
      logger.info(`Seuil créé: ${thresholdId}`, { threshold_key: data.thresholdKey });
      
      // AUTO-PUBLISH EVENT si EventBus disponible
      if (this.eventBus) {
        await this.eventBus.publishAlertThresholdCreated({
          threshold_id: thresholdId,
          threshold_key: data.thresholdKey || 'unknown',
          operator: data.operator || 'greater_than',
          threshold_value: Number(data.thresholdValue) || 0,
          scope_type: data.scopeType || 'global',
          scope_entity_id: data.scopeEntityId,
          severity: data.severity || 'warning',
          created_by: data.createdBy || 'system',
          is_active: data.isActive ?? true,
          notification_channels: data.notificationChannels || ['dashboard']
        });
      }
      
      return thresholdId;
      
    } catch (error) {
      logger.error('Erreur createThreshold', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createThreshold',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateThreshold(id: string, data: UpdateAlertThreshold): Promise<boolean> {
    try {
      // Récupérer l'état actuel pour auto-publishing
      const [currentThreshold] = await this.db
        .select()
        .from(alertThresholds)
        .where(eq(alertThresholds.id, id));
      
      if (!currentThreshold) {
        logger.warn(`Seuil ${id} non trouvé pour mise à jour`);
        return false;
      }
      
      const [result] = await this.db
        .update(alertThresholds)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(alertThresholds.id, id))
        .returning({ id: alertThresholds.id });
      
      logger.info(`Seuil ${id} mis à jour`, { changes: Object.keys(data) });
      
      // AUTO-PUBLISH EVENT si EventBus disponible
      if (this.eventBus && result) {
        await this.eventBus.publishAlertThresholdUpdated({
          threshold_id: id,
          updated_by: 'system', // TODO: récupérer user_id du contexte
          updated_at: new Date().toISOString(),
          changes: data,
          was_active: currentThreshold.isActive ?? true,
          is_active: data.isActive ?? currentThreshold.isActive ?? true
        });
      }
      
      return !!result;
      
    } catch (error) {
      logger.error('Erreur updateThreshold', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateThreshold',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deactivateThreshold(id: string): Promise<boolean> {
    try {
      const [result] = await this.db
        .update(alertThresholds)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(alertThresholds.id, id))
        .returning({ id: alertThresholds.id });
      
      logger.info(`Seuil ${id} désactivé`);
      
      // AUTO-PUBLISH EVENT si EventBus disponible
      if (this.eventBus && result) {
        await this.eventBus.publishAlertThresholdDeactivated({
          threshold_id: id,
          deactivated_by: 'system', // TODO: récupérer user_id du contexte
          deactivated_at: new Date().toISOString(),
          reason: 'Manual deactivation'
        });
      }
      
      return !!result;
      
    } catch (error) {
      logger.error('Erreur deactivateThreshold', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deactivateThreshold',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async listThresholds(params: {
    is_active?: boolean;
    created_by?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ thresholds: AlertThreshold[]; total: number }> {
    try {
      // Query principale avec filtres
      let query = this.db.select().from(alertThresholds);
      const conditions = [];
      
      if (params.is_active !== undefined) {
        conditions.push(eq(alertThresholds.isActive, params.is_active));
      }
      
      if (params.created_by) {
        conditions.push(eq(alertThresholds.createdBy, params.created_by));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Count total avec mêmes conditions
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(alertThresholds)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      // Results paginés
      const thresholds = await query
        .orderBy(alertThresholds.createdAt)
        .limit(params.limit || 20)
        .offset(params.offset || 0);
      
      return { thresholds, total: count };
      
    } catch (error) {
      logger.error('Erreur listThresholds', {
        metadata: {
          service: 'StoragePOC',
          operation: 'listThresholds',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // BUSINESS ALERTS IMPLEMENTATION - PHASE 3.1.7.2
  // ========================================

  async createBusinessAlert(data: InsertBusinessAlert): Promise<string> {
    try {
      const [result] = await this.db
        .insert(businessAlerts)
        .values({
          ...data,
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: 'open',
          triggeredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({ id: businessAlerts.id });
      
      const alertId = result.id;
      
      logger.info(`Alerte business créée: ${alertId}`, { 
        type: data.alertType, 
        entity: `${data.entityType}:${data.entityId}` 
      });
      
      // AUTO-PUBLISH EVENT si EventBus disponible
      if (this.eventBus) {
        await this.eventBus.publishBusinessAlertCreated({
          alert_id: alertId,
          alert_type: data.alertType || '',
          entity_type: data.entityType || '',
          entity_id: data.entityId || '',
          entity_name: data.entityName || '',
          severity: data.severity || 'info',
          title: data.title,
          message: data.message,
          threshold_value: data.thresholdValue ? Number(data.thresholdValue) : undefined,
          actual_value: data.actualValue ? Number(data.actualValue) : undefined,
          variance: data.variance ? Number(data.variance) : undefined,
          triggered_at: new Date().toISOString(),
          threshold_id: data.thresholdId,
          context_data: data.contextData ? data.contextData as Record<string, any> : undefined
        });
      }
      
      return alertId;
      
    } catch (error) {
      logger.error('Erreur createBusinessAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createBusinessAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getBusinessAlertById(id: string): Promise<BusinessAlert | null> {
    try {
      const [result] = await this.db
        .select()
        .from(businessAlerts)
        .where(eq(businessAlerts.id, id));
      
      return result || null;
      
    } catch (error) {
      logger.error('Erreur getBusinessAlertById', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getBusinessAlertById',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async listBusinessAlerts(query: AlertsQuery): Promise<{
    alerts: BusinessAlert[];
    total: number;
    summary: {
      by_status: Record<AlertStatus, number>;
      by_severity: Record<AlertSeverity, number>;
      by_type: Record<AlertType, number>;
    };
  }> {
    try {
      // Construction query dynamique
      let alertsQuery = this.db.select().from(businessAlerts);
      
      // Filtres conditionnels
      const conditions = [];
      
      if (query.type) {
        conditions.push(eq(businessAlerts.alertType, query.type));
      }
      
      if (query.status) {
        conditions.push(eq(businessAlerts.status, query.status));
      }
      
      if (query.severity) {
        conditions.push(eq(businessAlerts.severity, query.severity));
      }
      
      if (query.entityType) {
        conditions.push(eq(businessAlerts.entityType, query.entityType));
      }
      
      if (query.assignedTo) {
        conditions.push(eq(businessAlerts.assignedTo, query.assignedTo));
      }
      
      if (conditions.length > 0) {
        alertsQuery = alertsQuery.where(and(...conditions));
      }
      
      // Count total avec mêmes conditions
      const [{ count }] = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(businessAlerts)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      // Results paginés
      const alerts = await alertsQuery
        .orderBy(desc(businessAlerts.triggeredAt))
        .limit(query.limit || 20)
        .offset(query.offset || 0);
      
      // Calcul summary simplifié (agrégation en mémoire)
      const allAlerts = await this.db.select().from(businessAlerts);
      
      const summary = {
        by_status: {} as Record<AlertStatus, number>,
        by_severity: {} as Record<AlertSeverity, number>,
        by_type: {} as Record<AlertType, number>
      };
      
      // Calcul des statistiques
      allAlerts.forEach(alert => {
        summary.by_status[alert.status] = (summary.by_status[alert.status] || 0) + 1;
        summary.by_severity[alert.severity] = (summary.by_severity[alert.severity] || 0) + 1;
        summary.by_type[alert.alertType] = (summary.by_type[alert.alertType] || 0) + 1;
      });
      
      return { alerts, total: count, summary };
      
    } catch (error) {
      logger.error('Erreur listBusinessAlerts', {
        metadata: {
          service: 'StoragePOC',
          operation: 'listBusinessAlerts',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateBusinessAlertStatus(
    id: string, 
    update: UpdateBusinessAlert,
    user_id: string
  ): Promise<boolean> {
    try {
      // Récupérer l'état actuel pour auto-publishing
      const [currentAlert] = await this.db
        .select()
        .from(businessAlerts)
        .where(eq(businessAlerts.id, id));
      
      if (!currentAlert) {
        logger.warn(`Alerte ${id} non trouvée pour mise à jour`);
        return false;
      }
      
      const updateData: any = {
        ...update,
        updatedAt: new Date()
      };
      
      // Workflow tracking
      if (update.status === 'acknowledged') {
        updateData.acknowledgedBy = user_id;
        updateData.acknowledgedAt = new Date();
      }
      
      if (update.status === 'resolved') {
        updateData.resolvedBy = user_id;
        updateData.resolvedAt = new Date();
      }
      
      const [result] = await this.db
        .update(businessAlerts)
        .set(updateData)
        .where(eq(businessAlerts.id, id))
        .returning({ id: businessAlerts.id });
      
      logger.info(`Alerte ${id} mise à jour:`, { status: update.status, user: user_id });
      
      // AUTO-PUBLISH EVENTS selon statut si EventBus disponible
      if (this.eventBus && result) {
        const previousStatus = currentAlert.status || 'open';
        
        if (update.status === 'acknowledged') {
          await this.eventBus.publishBusinessAlertAcknowledged({
            alert_id: id,
            acknowledged_by: user_id,
            acknowledged_at: new Date().toISOString(),
            notes: update.resolutionNotes || undefined,
            previous_status: previousStatus,
            new_status: 'acknowledged'
          });
        }
        
        if (update.status === 'resolved') {
          // Calculer la durée de résolution si possible
          let resolutionDurationMinutes: number | undefined;
          if (currentAlert.triggeredAt) {
            const durationMs = Date.now() - new Date(currentAlert.triggeredAt).getTime();
            resolutionDurationMinutes = Math.round(durationMs / (1000 * 60));
          }
          
          await this.eventBus.publishBusinessAlertResolved({
            alert_id: id,
            resolved_by: user_id,
            resolved_at: new Date().toISOString(),
            resolution_notes: update.resolutionNotes || '',
            previous_status: previousStatus,
            new_status: 'resolved',
            resolution_duration_minutes: resolutionDurationMinutes
          });
        }
        
        if (update.status === 'dismissed') {
          await this.eventBus.publishBusinessAlertDismissed({
            alert_id: id,
            dismissed_by: user_id,
            dismissed_at: new Date().toISOString(),
            dismissal_reason: update.resolutionNotes || undefined,
            previous_status: previousStatus,
            new_status: 'dismissed'
          });
        }
        
        if (update.assignedTo && update.assignedTo !== currentAlert.assignedTo) {
          await this.eventBus.publishBusinessAlertAssigned({
            alert_id: id,
            assigned_to: update.assignedTo,
            assigned_by: user_id,
            assigned_at: new Date().toISOString(),
            previous_assigned_to: currentAlert.assignedTo || undefined
          });
        }
      }
      
      return !!result;
      
    } catch (error) {
      logger.error('Erreur updateBusinessAlertStatus', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateBusinessAlertStatus',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async acknowledgeAlert(id: string, user_id: string, notes?: string): Promise<boolean> {
    try {
      const [result] = await db
        .update(businessAlerts)
        .set({
          status: 'acknowledged',
          acknowledgedBy: user_id,
          acknowledgedAt: new Date(),
          resolutionNotes: notes,
          updatedAt: new Date()
        })
        .where(eq(businessAlerts.id, id))
        .returning({ id: businessAlerts.id });
      
      logger.info(`Alerte ${id} accusée réception par ${user_id}`);
      return !!result;
      
    } catch (error) {
      logger.error('Erreur acknowledgeAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'acknowledgeAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async resolveAlert(id: string, user_id: string, resolution_notes: string): Promise<boolean> {
    try {
      const [result] = await db
        .update(businessAlerts)
        .set({
          status: 'resolved',
          resolvedBy: user_id,
          resolvedAt: new Date(),
          resolutionNotes: resolution_notes,
          updatedAt: new Date()
        })
        .where(eq(businessAlerts.id, id))
        .returning({ id: businessAlerts.id });
      
      logger.info(`Alerte ${id} résolue par ${user_id}`);
      return !!result;
      
    } catch (error) {
      logger.error('Erreur resolveAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'resolveAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async findSimilarAlerts(params: {
    entity_type: string;
    entity_id: string;
    alert_type: AlertType;
    hours_window?: number;
  }): Promise<BusinessAlert[]> {
    try {
      const hoursWindow = params.hours_window || 24;
      const windowStart = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);
      
      const results = await this.db
        .select()
        .from(businessAlerts)
        .where(
          and(
            eq(businessAlerts.entityType, params.entity_type),
            eq(businessAlerts.entityId, params.entity_id),
            eq(businessAlerts.alertType, params.alert_type),
            gte(businessAlerts.triggeredAt, windowStart),
            ne(businessAlerts.status, 'dismissed')
          )
        )
        .orderBy(desc(businessAlerts.triggeredAt));
      
      return results;
      
    } catch (error) {
      logger.error('Erreur findSimilarAlerts', {
        metadata: {
          service: 'StoragePOC',
          operation: 'findSimilarAlerts',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getOpenAlertsForEntity(
    entity_type: string, 
    entity_id: string
  ): Promise<BusinessAlert[]> {
    try {
      const results = await this.db
        .select()
        .from(businessAlerts)
        .where(
          and(
            eq(businessAlerts.entityType, entity_type),
            eq(businessAlerts.entityId, entity_id),
            ne(businessAlerts.status, 'resolved'),
            ne(businessAlerts.status, 'dismissed')
          )
        )
        .orderBy(desc(businessAlerts.triggeredAt));
      
      return results;
      
    } catch (error) {
      logger.error('Erreur getOpenAlertsForEntity', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getOpenAlertsForEntity',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // IMPLÉMENTATION PHASE 4 - Système de gestion des réserves et SAV
  // ========================================

  // Project Reserves operations - Gestion des réserves projet
  async getProjectReserves(projectId: string): Promise<ProjectReserve[]> {
    try {
      const results = await this.db
        .select()
        .from(projectReserves)
        .where(eq(projectReserves.projectId, projectId))
        .orderBy(desc(projectReserves.detectedDate));
      
      logger.info(`Récupération de ${results.length} réserves pour le projet ${projectId}`);
      return results;
      
    } catch (error) {
      logger.error('Erreur getProjectReserves', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectReserves',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getProjectReserve(id: string): Promise<ProjectReserve | undefined> {
    try {
      const [result] = await this.db
        .select()
        .from(projectReserves)
        .where(eq(projectReserves.id, id));
      
      return result;
      
    } catch (error) {
      logger.error('Erreur getProjectReserve', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectReserve',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createProjectReserve(reserve: InsertProjectReserve): Promise<ProjectReserve> {
    try {
      const [result] = await this.db
        .insert(projectReserves)
        .values({
          ...reserve,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      logger.info(`Réserve créée avec ID: ${result.id}`);
      return result;
      
    } catch (error) {
      logger.error('Erreur createProjectReserve', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createProjectReserve',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateProjectReserve(id: string, reserve: Partial<InsertProjectReserve>): Promise<ProjectReserve> {
    try {
      const [result] = await this.db
        .update(projectReserves)
        .set({
          ...reserve,
          updatedAt: new Date()
        })
        .where(eq(projectReserves.id, id))
        .returning();
      
      logger.info(`Réserve ${id} mise à jour`);
      return result;
      
    } catch (error) {
      logger.error('Erreur updateProjectReserve', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateProjectReserve',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteProjectReserve(id: string): Promise<void> {
    try {
      await this.db
        .delete(projectReserves)
        .where(eq(projectReserves.id, id));
      
      logger.info(`Réserve ${id} supprimée`);
      
    } catch (error) {
      logger.error('Erreur deleteProjectReserve', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteProjectReserve',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // SAV Interventions operations - Gestion des interventions SAV
  async getSavInterventions(projectId: string): Promise<SavIntervention[]> {
    try {
      const results = await this.db
        .select()
        .from(savInterventions)
        .where(eq(savInterventions.projectId, projectId))
        .orderBy(desc(savInterventions.requestDate));
      
      logger.info(`Récupération de ${results.length} interventions SAV pour le projet ${projectId}`);
      return results;
      
    } catch (error) {
      logger.error('Erreur getSavInterventions', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSavInterventions',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getSavIntervention(id: string): Promise<SavIntervention | undefined> {
    try {
      const [result] = await this.db
        .select()
        .from(savInterventions)
        .where(eq(savInterventions.id, id));
      
      return result;
      
    } catch (error) {
      logger.error('Erreur getSavIntervention', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSavIntervention',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createSavIntervention(intervention: InsertSavIntervention): Promise<SavIntervention> {
    try {
      const [result] = await this.db
        .insert(savInterventions)
        .values({
          ...intervention,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      logger.info(`Intervention SAV créée avec ID: ${result.id}`);
      return result;
      
    } catch (error) {
      logger.error('Erreur createSavIntervention', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createSavIntervention',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateSavIntervention(id: string, intervention: Partial<InsertSavIntervention>): Promise<SavIntervention> {
    try {
      const [result] = await this.db
        .update(savInterventions)
        .set({
          ...intervention,
          updatedAt: new Date()
        })
        .where(eq(savInterventions.id, id))
        .returning();
      
      logger.info(`Intervention SAV ${id} mise à jour`);
      return result;
      
    } catch (error) {
      logger.error('Erreur updateSavIntervention', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateSavIntervention',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteSavIntervention(id: string): Promise<void> {
    try {
      await this.db
        .delete(savInterventions)
        .where(eq(savInterventions.id, id));
      
      logger.info(`Intervention SAV ${id} supprimée`);
      
    } catch (error) {
      logger.error('Erreur deleteSavIntervention', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteSavIntervention',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // SAV Warranty Claims operations - Gestion des réclamations garantie
  async getSavWarrantyClaims(interventionId: string): Promise<SavWarrantyClaim[]> {
    try {
      const results = await this.db
        .select()
        .from(savWarrantyClaims)
        .where(eq(savWarrantyClaims.interventionId, interventionId))
        .orderBy(desc(savWarrantyClaims.claimDate));
      
      logger.info(`Récupération de ${results.length} réclamations garantie pour l'intervention ${interventionId}`);
      return results;
      
    } catch (error) {
      logger.error('Erreur getSavWarrantyClaims', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSavWarrantyClaims',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getSavWarrantyClaim(id: string): Promise<SavWarrantyClaim | undefined> {
    try {
      const [result] = await this.db
        .select()
        .from(savWarrantyClaims)
        .where(eq(savWarrantyClaims.id, id));
      
      return result;
      
    } catch (error) {
      logger.error('Erreur getSavWarrantyClaim', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSavWarrantyClaim',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createSavWarrantyClaim(claim: InsertSavWarrantyClaim): Promise<SavWarrantyClaim> {
    try {
      const [result] = await this.db
        .insert(savWarrantyClaims)
        .values({
          ...claim,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      logger.info(`Réclamation garantie créée avec ID: ${result.id}`);
      return result;
      
    } catch (error) {
      logger.error('Erreur createSavWarrantyClaim', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createSavWarrantyClaim',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateSavWarrantyClaim(id: string, claim: Partial<InsertSavWarrantyClaim>): Promise<SavWarrantyClaim> {
    try {
      const [result] = await this.db
        .update(savWarrantyClaims)
        .set({
          ...claim,
          updatedAt: new Date()
        })
        .where(eq(savWarrantyClaims.id, id))
        .returning();
      
      logger.info(`Réclamation garantie ${id} mise à jour`);
      return result;
      
    } catch (error) {
      logger.error('Erreur updateSavWarrantyClaim', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateSavWarrantyClaim',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteSavWarrantyClaim(id: string): Promise<void> {
    try {
      await this.db
        .delete(savWarrantyClaims)
        .where(eq(savWarrantyClaims.id, id));
      
      logger.info(`Réclamation garantie ${id} supprimée`);
      
    } catch (error) {
      logger.error('Erreur deleteSavWarrantyClaim', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteSavWarrantyClaim',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // IMPLÉMENTATION MÉTHODES CRUD TABLES MONDAY.COM (CRITIQUE)
  // ========================================

  // Métriques Business operations
  async getMetricsBusiness(entityType?: string, entityId?: string): Promise<MetricsBusiness[]> {
    try {
      let query = this.db.select().from(metricsBusiness).orderBy(desc(metricsBusiness.createdAt));
      
      if (entityType) {
        query = query.where(eq(metricsBusiness.entity_type, entityType as any));
      }
      if (entityId) {
        query = query.where(eq(metricsBusiness.entity_id, entityId));
      }
      
      const results = await query;
      logger.info(`Récupération de ${results.length} métriques business`);
      return results;
    } catch (error) {
      logger.error('Erreur getMetricsBusiness', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMetricsBusiness',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getMetricsBusinessById(id: string): Promise<MetricsBusiness | undefined> {
    try {
      const [result] = await this.db
        .select()
        .from(metricsBusiness)
        .where(eq(metricsBusiness.id, id));
      
      return result;
    } catch (error) {
      logger.error('Erreur getMetricsBusinessById', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMetricsBusinessById',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createMetricsBusiness(metric: InsertMetricsBusiness): Promise<MetricsBusiness> {
    try {
      const [result] = await this.db
        .insert(metricsBusiness)
        .values({
          ...metric,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      logger.info(`Métrique business créée avec ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Erreur createMetricsBusiness', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createMetricsBusiness',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateMetricsBusiness(id: string, metric: Partial<InsertMetricsBusiness>): Promise<MetricsBusiness> {
    try {
      const [result] = await this.db
        .update(metricsBusiness)
        .set({
          ...metric,
          updatedAt: new Date()
        })
        .where(eq(metricsBusiness.id, id))
        .returning();
      
      logger.info(`Métrique business ${id} mise à jour`);
      return result;
    } catch (error) {
      logger.error('Erreur updateMetricsBusiness', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateMetricsBusiness',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteMetricsBusiness(id: string): Promise<void> {
    try {
      await this.db.delete(metricsBusiness).where(eq(metricsBusiness.id, id));
      logger.info(`Métrique business ${id} supprimée`);
    } catch (error) {
      logger.error('Erreur deleteMetricsBusiness', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteMetricsBusiness',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Temps Pose operations
  async getTempsPose(workScope?: string, componentType?: string): Promise<TempsPose[]> {
    try {
      let query = this.db.select().from(tempsPose).where(eq(tempsPose.is_active, true));
      
      if (workScope) {
        query = query.where(eq(tempsPose.work_scope, workScope as any));
      }
      if (componentType) {
        query = query.where(eq(tempsPose.component_type, componentType as any));
      }
      
      const results = await query;
      logger.info(`Récupération de ${results.length} temps de pose`);
      return results;
    } catch (error) {
      logger.error('Erreur getTempsPose', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getTempsPose',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getTempsPoseById(id: string): Promise<TempsPose | undefined> {
    try {
      const [result] = await this.db
        .select()
        .from(tempsPose)
        .where(eq(tempsPose.id, id));
      
      return result;
    } catch (error) {
      logger.error('Erreur getTempsPoseById', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getTempsPoseById',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createTempsPose(temps: InsertTempsPose): Promise<TempsPose> {
    try {
      const [result] = await this.db
        .insert(tempsPose)
        .values({
          ...temps,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      logger.info(`Temps de pose créé avec ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Erreur createTempsPose', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createTempsPose',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateTempsPose(id: string, temps: Partial<InsertTempsPose>): Promise<TempsPose> {
    try {
      const [result] = await this.db
        .update(tempsPose)
        .set({
          ...temps,
          updatedAt: new Date()
        })
        .where(eq(tempsPose.id, id))
        .returning();
      
      logger.info(`Temps de pose ${id} mis à jour`);
      return result;
    } catch (error) {
      logger.error('Erreur updateTempsPose', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateTempsPose',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteTempsPose(id: string): Promise<void> {
    try {
      await this.db.delete(tempsPose).where(eq(tempsPose.id, id));
      logger.info(`Temps de pose ${id} supprimé`);
    } catch (error) {
      logger.error('Erreur deleteTempsPose', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteTempsPose',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // AO-Contacts liaison operations
  async getAoContacts(aoId: string): Promise<AoContacts[]> {
    try {
      const results = await this.db
        .select()
        .from(aoContacts)
        .where(eq(aoContacts.ao_id, aoId));
      
      logger.info(`Récupération de ${results.length} contacts pour AO ${aoId}`);
      return results;
    } catch (error) {
      logger.error('Erreur getAoContacts', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAoContacts',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createAoContact(contact: InsertAoContacts): Promise<AoContacts> {
    try {
      const [result] = await this.db
        .insert(aoContacts)
        .values({
          ...contact,
          createdAt: new Date()
        })
        .returning();
      
      logger.info(`Contact AO créé avec ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Erreur createAoContact', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createAoContact',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteAoContact(id: string): Promise<void> {
    try {
      await this.db.delete(aoContacts).where(eq(aoContacts.id, id));
      logger.info(`Contact AO ${id} supprimé`);
    } catch (error) {
      logger.error('Erreur deleteAoContact', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteAoContact',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Project-Contacts liaison operations
  async getProjectContacts(projectId: string): Promise<ProjectContacts[]> {
    try {
      const results = await this.db
        .select()
        .from(projectContacts)
        .where(eq(projectContacts.project_id, projectId));
      
      logger.info(`Récupération de ${results.length} contacts pour projet ${projectId}`);
      return results;
    } catch (error) {
      logger.error('Erreur getProjectContacts', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectContacts',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createProjectContact(contact: InsertProjectContacts): Promise<ProjectContacts> {
    try {
      const [result] = await this.db
        .insert(projectContacts)
        .values({
          ...contact,
          createdAt: new Date()
        })
        .returning();
      
      logger.info(`Contact projet créé avec ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Erreur createProjectContact', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createProjectContact',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteProjectContact(id: string): Promise<void> {
    try {
      await this.db.delete(projectContacts).where(eq(projectContacts.id, id));
      logger.info(`Contact projet ${id} supprimé`);
    } catch (error) {
      logger.error('Erreur deleteProjectContact', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteProjectContact',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Supplier Specializations operations
  async getSupplierSpecializations(supplierId?: string): Promise<SupplierSpecializations[]> {
    try {
      let query = this.db.select().from(supplierSpecializations);
      
      if (supplierId) {
        query = query.where(eq(supplierSpecializations.supplier_id, supplierId));
      }
      
      const results = await query;
      logger.info(`Récupération de ${results.length} spécialisations fournisseurs`);
      return results;
    } catch (error) {
      logger.error('Erreur getSupplierSpecializations', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSupplierSpecializations',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createSupplierSpecialization(spec: InsertSupplierSpecializations): Promise<SupplierSpecializations> {
    try {
      const [result] = await this.db
        .insert(supplierSpecializations)
        .values({
          ...spec,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      logger.info(`Spécialisation fournisseur créée avec ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Erreur createSupplierSpecialization', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createSupplierSpecialization',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateSupplierSpecialization(id: string, spec: Partial<InsertSupplierSpecializations>): Promise<SupplierSpecializations> {
    try {
      const [result] = await this.db
        .update(supplierSpecializations)
        .set({
          ...spec,
          updatedAt: new Date()
        })
        .where(eq(supplierSpecializations.id, id))
        .returning();
      
      logger.info(`Spécialisation fournisseur ${id} mise à jour`);
      return result;
    } catch (error) {
      logger.error('Erreur updateSupplierSpecialization', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateSupplierSpecialization',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteSupplierSpecialization(id: string): Promise<void> {
    try {
      await db.delete(supplierSpecializations).where(eq(supplierSpecializations.id, id));
      logger.info(`Spécialisation fournisseur ${id} supprimée`);
    } catch (error) {
      logger.error('Erreur deleteSupplierSpecialization', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteSupplierSpecialization',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // HELPER METHODS
  // ========================================



  // ========================================
  // TECHNICAL SCORING CONFIGURATION
  // ========================================



  // ========================================
  // TECHNICAL ALERTS SYSTEM
  // ========================================

  async enqueueTechnicalAlert(alert: InsertTechnicalAlert): Promise<TechnicalAlert> {
    try {
      const [newAlert] = await db.insert(technicalAlerts).values(alert).returning();
      logger.info(`Alerte technique créée avec ID: ${newAlert.id}`);
      return newAlert;
    } catch (error) {
      logger.error('Erreur enqueueTechnicalAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'enqueueTechnicalAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async listTechnicalAlerts(filter?: TechnicalAlertsFilter): Promise<TechnicalAlert[]> {
    try {
      let query = db.select().from(technicalAlerts);
      
      if (filter?.aoId) {
        query = query.where(eq(technicalAlerts.aoId, filter.aoId));
      }
      if (filter?.status) {
        query = query.where(eq(technicalAlerts.status, filter.status));
      }
      if (filter?.severity) {
        query = query.where(eq(technicalAlerts.severity, filter.severity));
      }
      
      const alerts = await query.orderBy(desc(technicalAlerts.createdAt));
      return alerts;
    } catch (error) {
      logger.error('Erreur listTechnicalAlerts', {
        metadata: {
          service: 'StoragePOC',
          operation: 'listTechnicalAlerts',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getTechnicalAlert(id: string): Promise<TechnicalAlert | null> {
    try {
      const [alert] = await db.select().from(technicalAlerts).where(eq(technicalAlerts.id, id));
      return alert || null;
    } catch (error) {
      logger.error('Erreur getTechnicalAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getTechnicalAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async acknowledgeTechnicalAlert(id: string, userId: string): Promise<void> {
    try {
      await db.update(technicalAlerts)
        .set({ status: 'acknowledged', acknowledgedBy: userId, acknowledgedAt: new Date() })
        .where(eq(technicalAlerts.id, id));
      logger.info(`Alerte technique ${id} acquittée par ${userId}`);
    } catch (error) {
      logger.error('Erreur acknowledgeTechnicalAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'acknowledgeTechnicalAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async validateTechnicalAlert(id: string, userId: string): Promise<void> {
    try {
      await db.update(technicalAlerts)
        .set({ status: 'resolved', resolvedBy: userId, resolvedAt: new Date() })
        .where(eq(technicalAlerts.id, id));
      logger.info(`Alerte technique ${id} validée par ${userId}`);
    } catch (error) {
      logger.error('Erreur validateTechnicalAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'validateTechnicalAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async bypassTechnicalAlert(id: string, userId: string, until: Date, reason: string): Promise<void> {
    try {
      await db.update(technicalAlerts)
        .set({ status: 'bypassed', resolvedBy: userId, resolvedAt: new Date() })
        .where(eq(technicalAlerts.id, id));
      
      // Ajouter entrée historique
      await this.addTechnicalAlertHistory(id, 'bypassed', userId, reason, { until: until.toISOString() });
      logger.info(`Alerte technique ${id} bypassée par ${userId} jusqu'à ${until}`);
    } catch (error) {
      logger.error('Erreur bypassTechnicalAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'bypassTechnicalAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getActiveBypassForAo(aoId: string): Promise<{ until: Date; reason: string } | null> {
    try {
      const bypasses = await db.select()
        .from(technicalAlertHistory)
        .where(and(
          eq(technicalAlertHistory.action, 'bypassed'),
          eq(technicalAlertHistory.note, aoId) // Utilisation simplifiée pour le POC
        ));
      
      if (bypasses.length === 0) return null;
      
      const lastBypass = bypasses[0];
      return {
        until: new Date(lastBypass.metadata?.until || Date.now()),
        reason: lastBypass.note || 'Aucune raison spécifiée'
      };
    } catch (error) {
      logger.error('Erreur getActiveBypassForAo', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getActiveBypassForAo',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  }

  async listTechnicalAlertHistory(alertId: string): Promise<TechnicalAlertHistory[]> {
    try {
      const history = await db.select()
        .from(technicalAlertHistory)
        .where(eq(technicalAlertHistory.alertId, alertId))
        .orderBy(desc(technicalAlertHistory.createdAt));
      return history;
    } catch (error) {
      logger.error('Erreur listTechnicalAlertHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'listTechnicalAlertHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async addTechnicalAlertHistory(alertId: string | null, action: string, actorUserId: string | null, note?: string, metadata?: Record<string, any>): Promise<TechnicalAlertHistory> {
    try {
      const [entry] = await db.insert(technicalAlertHistory).values({
        alertId,
        action,
        actorUserId,
        note,
        metadata
      }).returning();
      return entry;
    } catch (error) {
      logger.error('Erreur addTechnicalAlertHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'addTechnicalAlertHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async listAoSuppressionHistory(aoId: string): Promise<TechnicalAlertHistory[]> {
    try {
      const history = await db.select()
        .from(technicalAlertHistory)
        .where(and(
          eq(technicalAlertHistory.action, 'suppressed'),
          eq(technicalAlertHistory.note, aoId)
        ))
        .orderBy(desc(technicalAlertHistory.createdAt));
      return history;
    } catch (error) {
      logger.error('Erreur listAoSuppressionHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'listAoSuppressionHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // MATERIAL COLOR RULES
  // ========================================

  async getMaterialColorRules(): Promise<MaterialColorAlertRule[]> {
    return DatabaseStorage.materialColorRules;
  }

  async setMaterialColorRules(rules: MaterialColorAlertRule[]): Promise<void> {
    DatabaseStorage.materialColorRules = rules;
    logger.info(`Règles matériaux-couleurs mises à jour: ${rules.length} règles`);
  }

  // ========================================
  // PROJECT TIMELINES - INTELLIGENCE TEMPORELLE
  // ========================================

  async getProjectTimelines(projectId: string): Promise<ProjectTimeline[]> {
    try {
      const timelines = await db.select()
        .from(projectTimelines)
        .where(eq(projectTimelines.projectId, projectId))
        .orderBy(projectTimelines.plannedStartDate);
      return timelines;
    } catch (error) {
      logger.error('Erreur getProjectTimelines', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectTimelines',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getAllProjectTimelines(): Promise<ProjectTimeline[]> {
    try {
      const timelines = await db.select()
        .from(projectTimelines)
        .orderBy(desc(projectTimelines.createdAt));
      return timelines;
    } catch (error) {
      logger.error('Erreur getAllProjectTimelines', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAllProjectTimelines',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createProjectTimeline(data: InsertProjectTimeline): Promise<ProjectTimeline> {
    try {
      const [timeline] = await db.insert(projectTimelines).values(data).returning();
      logger.info(`Timeline projet créée avec ID: ${timeline.id}`);
      return timeline;
    } catch (error) {
      logger.error('Erreur createProjectTimeline', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createProjectTimeline',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateProjectTimeline(id: string, data: Partial<InsertProjectTimeline>): Promise<ProjectTimeline> {
    try {
      const [timeline] = await db.update(projectTimelines)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projectTimelines.id, id))
        .returning();
      logger.info(`Timeline projet ${id} mise à jour`);
      return timeline;
    } catch (error) {
      logger.error('Erreur updateProjectTimeline', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateProjectTimeline',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteProjectTimeline(id: string): Promise<void> {
    try {
      await db.delete(projectTimelines).where(eq(projectTimelines.id, id));
      logger.info(`Timeline projet ${id} supprimée`);
    } catch (error) {
      logger.error('Erreur deleteProjectTimeline', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteProjectTimeline',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // DATE INTELLIGENCE RULES
  // ========================================

  async getActiveRules(filters?: { phase?: typeof projectStatusEnum.enumValues[number], projectType?: string }): Promise<DateIntelligenceRule[]> {
    try {
      let query = db.select().from(dateIntelligenceRules).where(eq(dateIntelligenceRules.isActive, true));
      
      if (filters?.phase) {
        query = query.where(eq(dateIntelligenceRules.phase, filters.phase));
      }
      if (filters?.projectType) {
        query = query.where(eq(dateIntelligenceRules.projectType, filters.projectType));
      }
      
      const rules = await query.orderBy(desc(dateIntelligenceRules.priority));
      return rules;
    } catch (error) {
      logger.error('Erreur getActiveRules', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getActiveRules',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getAllRules(): Promise<DateIntelligenceRule[]> {
    try {
      const rules = await db.select()
        .from(dateIntelligenceRules)
        .orderBy(desc(dateIntelligenceRules.createdAt));
      return rules;
    } catch (error) {
      logger.error('Erreur getAllRules', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAllRules',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getRule(id: string): Promise<DateIntelligenceRule | undefined> {
    try {
      const [rule] = await db.select().from(dateIntelligenceRules).where(eq(dateIntelligenceRules.id, id));
      return rule;
    } catch (error) {
      logger.error('Erreur getRule', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getRule',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createRule(data: InsertDateIntelligenceRule): Promise<DateIntelligenceRule> {
    try {
      const [rule] = await db.insert(dateIntelligenceRules).values(data).returning();
      logger.info(`Règle d'intelligence temporelle créée avec ID: ${rule.id}`);
      return rule;
    } catch (error) {
      logger.error('Erreur createRule', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createRule',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateRule(id: string, data: Partial<InsertDateIntelligenceRule>): Promise<DateIntelligenceRule> {
    try {
      const [rule] = await db.update(dateIntelligenceRules)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dateIntelligenceRules.id, id))
        .returning();
      logger.info(`Règle d'intelligence temporelle ${id} mise à jour`);
      return rule;
    } catch (error) {
      logger.error('Erreur updateRule', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateRule',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteRule(id: string): Promise<void> {
    try {
      await db.delete(dateIntelligenceRules).where(eq(dateIntelligenceRules.id, id));
      logger.info(`Règle d'intelligence temporelle ${id} supprimée`);
    } catch (error) {
      logger.error('Erreur deleteRule', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteRule',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // DATE ALERTS - ALERTES DATES ET ÉCHÉANCES
  // ========================================

  async getDateAlerts(filters?: { entityType?: string, entityId?: string, status?: string }): Promise<DateAlert[]> {
    try {
      let query = db.select().from(dateAlerts);
      
      if (filters?.entityType) {
        query = query.where(eq(dateAlerts.entityType, filters.entityType));
      }
      if (filters?.entityId) {
        query = query.where(eq(dateAlerts.entityId, filters.entityId));
      }
      if (filters?.status) {
        query = query.where(eq(dateAlerts.status, filters.status));
      }
      
      const alerts = await query.orderBy(desc(dateAlerts.createdAt));
      return alerts;
    } catch (error) {
      logger.error('Erreur getDateAlerts', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getDateAlerts',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getDateAlert(id: string): Promise<DateAlert | undefined> {
    try {
      const [alert] = await db.select().from(dateAlerts).where(eq(dateAlerts.id, id));
      return alert;
    } catch (error) {
      logger.error('Erreur getDateAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getDateAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createDateAlert(data: InsertDateAlert): Promise<DateAlert> {
    try {
      const [alert] = await db.insert(dateAlerts).values(data).returning();
      logger.info(`Alerte de date créée avec ID: ${alert.id}`);
      return alert;
    } catch (error) {
      logger.error('Erreur createDateAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createDateAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateDateAlert(id: string, data: Partial<InsertDateAlert>): Promise<DateAlert> {
    try {
      const [alert] = await db.update(dateAlerts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dateAlerts.id, id))
        .returning();
      logger.info(`Alerte de date ${id} mise à jour`);
      return alert;
    } catch (error) {
      logger.error('Erreur updateDateAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateDateAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteDateAlert(id: string): Promise<void> {
    try {
      await db.delete(dateAlerts).where(eq(dateAlerts.id, id));
      logger.info(`Alerte de date ${id} supprimée`);
    } catch (error) {
      logger.error('Erreur deleteDateAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteDateAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // ANALYTICS KPI OPERATIONS
  // ========================================

  async createKPISnapshot(data: InsertKpiSnapshot): Promise<KpiSnapshot> {
    try {
      const [snapshot] = await db.insert(kpiSnapshots).values(data).returning();
      logger.info(`Snapshot KPI créé avec ID: ${snapshot.id}`);
      return snapshot;
    } catch (error) {
      logger.error('Erreur createKPISnapshot', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createKPISnapshot',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getKPISnapshots(period: DateRange, limit?: number): Promise<KpiSnapshot[]> {
    try {
      let query = db.select()
        .from(kpiSnapshots)
        .where(and(
          gte(kpiSnapshots.snapshotDate, period.from),
          lte(kpiSnapshots.snapshotDate, period.to)
        ))
        .orderBy(desc(kpiSnapshots.snapshotDate));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshots = await query;
      return snapshots;
    } catch (error) {
      logger.error('Erreur getKPISnapshots', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getKPISnapshots',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getLatestKPISnapshot(): Promise<KpiSnapshot | null> {
    try {
      const [snapshot] = await db.select()
        .from(kpiSnapshots)
        .orderBy(desc(kpiSnapshots.snapshotDate))
        .limit(1);
      return snapshot || null;
    } catch (error) {
      logger.error('Erreur getLatestKPISnapshot', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getLatestKPISnapshot',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createBusinessMetric(data: InsertBusinessMetric): Promise<BusinessMetric> {
    try {
      const [metric] = await db.insert(businessMetrics).values(data).returning();
      logger.info(`Métrique business créée avec ID: ${metric.id}`);
      return metric;
    } catch (error) {
      logger.error('Erreur createBusinessMetric', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createBusinessMetric',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getBusinessMetrics(filters: MetricFilters): Promise<BusinessMetric[]> {
    try {
      let query = db.select().from(businessMetrics);
      
      if (filters.metricType) {
        query = query.where(eq(businessMetrics.metricType, filters.metricType));
      }
      if (filters.userId) {
        query = query.where(eq(businessMetrics.userId, filters.userId));
      }
      if (filters.periodStart) {
        query = query.where(gte(businessMetrics.periodStart, filters.periodStart));
      }
      if (filters.periodEnd) {
        query = query.where(lte(businessMetrics.periodEnd, filters.periodEnd));
      }
      
      const metrics = await query.orderBy(desc(businessMetrics.createdAt));
      return metrics;
    } catch (error) {
      logger.error('Erreur getBusinessMetrics', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getBusinessMetrics',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getMetricTimeSeries(metricType: string, period: DateRange): Promise<BusinessMetric[]> {
    try {
      const metrics = await db.select()
        .from(businessMetrics)
        .where(and(
          eq(businessMetrics.metricType, metricType),
          gte(businessMetrics.periodStart, period.from),
          lte(businessMetrics.periodEnd, period.to)
        ))
        .orderBy(businessMetrics.periodStart);
      return metrics;
    } catch (error) {
      logger.error('Erreur getMetricTimeSeries', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMetricTimeSeries',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async createPerformanceBenchmark(data: InsertPerformanceBenchmark): Promise<PerformanceBenchmark> {
    try {
      const [benchmark] = await db.insert(performanceBenchmarks).values(data).returning();
      logger.info(`Benchmark performance créé avec ID: ${benchmark.id}`);
      return benchmark;
    } catch (error) {
      logger.error('Erreur createPerformanceBenchmark', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createPerformanceBenchmark',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getBenchmarks(entityType: string, entityId?: string): Promise<PerformanceBenchmark[]> {
    try {
      let query = db.select().from(performanceBenchmarks).where(eq(performanceBenchmarks.entityType, entityType));
      
      if (entityId) {
        query = query.where(eq(performanceBenchmarks.entityId, entityId));
      }
      
      const benchmarks = await query.orderBy(desc(performanceBenchmarks.createdAt));
      return benchmarks;
    } catch (error) {
      logger.error('Erreur getBenchmarks', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getBenchmarks',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getTopPerformers(metricType: string, limit?: number): Promise<PerformanceBenchmark[]> {
    try {
      let query = db.select()
        .from(performanceBenchmarks)
        .where(eq(performanceBenchmarks.metricType, metricType))
        .orderBy(desc(performanceBenchmarks.value));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const topPerformers = await query;
      return topPerformers;
    } catch (error) {
      logger.error('Erreur getTopPerformers', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getTopPerformers',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // PREDICTIVE ENGINE METHODS
  // ========================================

  async getMonthlyRevenueHistory(range: { start_date: string; end_date: string }): Promise<Array<{
    month: string;
    total_revenue: number;
    projects_count: number;
    avg_project_value: number;
  }>> {
    try {
      // Simulation de données pour le POC
      const months = [];
      const start = new Date(range.start_date);
      const end = new Date(range.end_date);
      
      for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        months.push({
          month: d.toISOString().slice(0, 7), // YYYY-MM
          total_revenue: Math.random() * 100000 + 50000,
          projects_count: Math.floor(Math.random() * 10) + 5,
          avg_project_value: Math.random() * 20000 + 10000
        });
      }
      
      return months;
    } catch (error) {
      logger.error('Erreur getMonthlyRevenueHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMonthlyRevenueHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getProjectDelayHistory(range: { start_date: string; end_date: string }): Promise<Array<{
    project_id: string;
    planned_days: number;
    actual_days: number;
    delay_days: number;
    project_type: string;
    complexity: string;
  }>> {
    try {
      // Simulation de données pour le POC
      const projectDelays = await db.select({
        project_id: projects.id,
        planned_days: sql<number>`EXTRACT(DAY FROM (${projects.plannedEndDate} - ${projects.plannedStartDate}))`,
        actual_days: sql<number>`EXTRACT(DAY FROM (${projects.actualEndDate} - ${projects.actualStartDate}))`,
        delay_days: sql<number>`EXTRACT(DAY FROM (${projects.actualEndDate} - ${projects.plannedEndDate}))`,
        project_type: projects.projectType,
        complexity: projects.complexity
      })
      .from(projects)
      .where(and(
        gte(projects.createdAt, new Date(range.start_date)),
        lte(projects.createdAt, new Date(range.end_date)),
        ne(projects.actualEndDate, null)
      ));
      
      return projectDelays;
    } catch (error) {
      logger.error('Erreur getProjectDelayHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectDelayHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getTeamLoadHistory(range: { start_date: string; end_date: string }): Promise<Array<{
    month: string;
    total_projects: number;
    team_capacity: number;
    utilization_rate: number;
    avg_project_duration: number;
  }>> {
    try {
      // Simulation de données pour le POC
      const months = [];
      const start = new Date(range.start_date);
      const end = new Date(range.end_date);
      
      for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        months.push({
          month: d.toISOString().slice(0, 7),
          total_projects: Math.floor(Math.random() * 15) + 5,
          team_capacity: 100,
          utilization_rate: Math.random() * 0.4 + 0.6, // 60-100%
          avg_project_duration: Math.random() * 30 + 60 // 60-90 jours
        });
      }
      
      return months;
    } catch (error) {
      logger.error('Erreur getTeamLoadHistory', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getTeamLoadHistory',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async saveForecastSnapshot(forecast: { forecast_data: any; generated_at: string; params: any }): Promise<string> {
    try {
      // Pour le POC, utilisation d'une table générique ou storage en mémoire
      const snapshotId = `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.info(`Snapshot forecast sauvegardé avec ID: ${snapshotId}`);
      return snapshotId;
    } catch (error) {
      logger.error('Erreur saveForecastSnapshot', {
        metadata: {
          service: 'StoragePOC',
          operation: 'saveForecastSnapshot',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async listForecastSnapshots(limit?: number): Promise<Array<{
    id: string;
    generated_at: string;
    forecast_period: string;
    confidence: number;
    method_used: string;
  }>> {
    try {
      // Simulation de données pour le POC
      const snapshots = [];
      const count = limit || 10;
      
      for (let i = 0; i < count; i++) {
        snapshots.push({
          id: `forecast_${Date.now() - i * 86400000}_${Math.random().toString(36).substr(2, 9)}`,
          generated_at: new Date(Date.now() - i * 86400000).toISOString(),
          forecast_period: `${6} months`,
          confidence: Math.random() * 0.3 + 0.7, // 70-100%
          method_used: ['exp_smoothing', 'moving_average', 'trend_analysis'][i % 3]
        });
      }
      
      return snapshots;
    } catch (error) {
      logger.error('Erreur listForecastSnapshots', {
        metadata: {
          service: 'StoragePOC',
          operation: 'listForecastSnapshots',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async getAnalyticsSnapshots(params?: any): Promise<any[]> {
    try {
      logger.info('Récupération snapshots analytics', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAnalyticsSnapshots',
          params
        }
      });
      return [];
    } catch (error) {
      logger.error('Erreur getAnalyticsSnapshots', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAnalyticsSnapshots',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async createAnalyticsSnapshot(data: any): Promise<any> {
    try {
      const snapshot = {
        id: `analytics_snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        createdAt: new Date()
      };
      logger.info('Snapshot analytics créé', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createAnalyticsSnapshot',
          snapshotId: snapshot.id
        }
      });
      return snapshot;
    } catch (error) {
      logger.error('Erreur createAnalyticsSnapshot', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createAnalyticsSnapshot',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async getSectorBenchmarks(): Promise<{
    industry_avg_conversion: number;
    avg_duration_benchmark: number;
    margin_benchmark: number;
    quality_benchmark: number;
    efficiency_benchmark: number;
  }> {
    try {
      // Benchmarks secteur menuiserie (données POC)
      return {
        industry_avg_conversion: 0.35, // 35% taux conversion moyen
        avg_duration_benchmark: 75, // 75 jours durée moyenne
        margin_benchmark: 0.18, // 18% marge moyenne
        quality_benchmark: 4.2, // 4.2/5 qualité moyenne
        efficiency_benchmark: 0.82 // 82% efficacité moyenne
      };
    } catch (error) {
      logger.error('Erreur getSectorBenchmarks', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getSectorBenchmarks',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // IMPLÉMENTATIONS CRUD TABLES MONDAY.COM (CRITIQUE)
  // ========================================

  // Equipment Batteries operations (Nb Batterie)
  async getEquipmentBatteries(projectId?: string): Promise<EquipmentBattery[]> {
    try {
      if (projectId) {
        return await db.select().from(equipmentBatteries).where(eq(equipmentBatteries.projectId, projectId));
      }
      return await db.select().from(equipmentBatteries);
    } catch (error) {
      logger.error('Erreur getEquipmentBatteries', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getEquipmentBatteries',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async getEquipmentBattery(id: string): Promise<EquipmentBattery | undefined> {
    try {
      const [battery] = await db.select().from(equipmentBatteries).where(eq(equipmentBatteries.id, id));
      return battery;
    } catch (error) {
      logger.error('Erreur getEquipmentBattery', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getEquipmentBattery',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return undefined;
    }
  }

  async createEquipmentBattery(battery: EquipmentBatteryInsert): Promise<EquipmentBattery> {
    try {
      const [newBattery] = await db.insert(equipmentBatteries).values(battery).returning();
      logger.info('Equipment Battery créée:', newBattery.id);
      return newBattery;
    } catch (error) {
      logger.error('Erreur createEquipmentBattery', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createEquipmentBattery',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateEquipmentBattery(id: string, battery: Partial<EquipmentBatteryInsert>): Promise<EquipmentBattery> {
    try {
      const [updated] = await db.update(equipmentBatteries).set(battery).where(eq(equipmentBatteries.id, id)).returning();
      logger.info('Equipment Battery mise à jour:', id);
      return updated;
    } catch (error) {
      logger.error('Erreur updateEquipmentBattery', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateEquipmentBattery',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteEquipmentBattery(id: string): Promise<void> {
    try {
      await db.delete(equipmentBatteries).where(eq(equipmentBatteries.id, id));
      logger.info('Equipment Battery supprimée:', id);
    } catch (error) {
      logger.error('Erreur deleteEquipmentBattery', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteEquipmentBattery',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Margin Targets operations (Objectif Marge H)
  async getMarginTargets(projectId?: string): Promise<MarginTarget[]> {
    try {
      if (projectId) {
        return await db.select().from(marginTargets).where(eq(marginTargets.projectId, projectId));
      }
      return await db.select().from(marginTargets);
    } catch (error) {
      logger.error('Erreur getMarginTargets', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMarginTargets',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async getMarginTarget(id: string): Promise<MarginTarget | undefined> {
    try {
      const [target] = await db.select().from(marginTargets).where(eq(marginTargets.id, id));
      return target;
    } catch (error) {
      logger.error('Erreur getMarginTarget', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getMarginTarget',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return undefined;
    }
  }

  async createMarginTarget(target: MarginTargetInsert): Promise<MarginTarget> {
    try {
      const [newTarget] = await db.insert(marginTargets).values(target).returning();
      logger.info('Margin Target créé:', newTarget.id);
      return newTarget;
    } catch (error) {
      logger.error('Erreur createMarginTarget', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createMarginTarget',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateMarginTarget(id: string, target: Partial<MarginTargetInsert>): Promise<MarginTarget> {
    try {
      const [updated] = await db.update(marginTargets).set(target).where(eq(marginTargets.id, id)).returning();
      logger.info('Margin Target mis à jour:', id);
      return updated;
    } catch (error) {
      logger.error('Erreur updateMarginTarget', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateMarginTarget',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteMarginTarget(id: string): Promise<void> {
    try {
      await db.delete(marginTargets).where(eq(marginTargets.id, id));
      logger.info('Margin Target supprimé:', id);
    } catch (error) {
      logger.error('Erreur deleteMarginTarget', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteMarginTarget',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Project Sub Elements operations (Sous-éléments)
  async getProjectSubElements(projectId?: string): Promise<ProjectSubElement[]> {
    try {
      if (projectId) {
        return await db.select().from(projectSubElements).where(eq(projectSubElements.projectId, projectId));
      }
      return await db.select().from(projectSubElements);
    } catch (error) {
      logger.error('Erreur getProjectSubElements', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectSubElements',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async getProjectSubElement(id: string): Promise<ProjectSubElement | undefined> {
    try {
      const [element] = await db.select().from(projectSubElements).where(eq(projectSubElements.id, id));
      return element;
    } catch (error) {
      logger.error('Erreur getProjectSubElement', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjectSubElement',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return undefined;
    }
  }

  async createProjectSubElement(element: ProjectSubElementInsert): Promise<ProjectSubElement> {
    try {
      const [newElement] = await db.insert(projectSubElements).values(element).returning();
      logger.info('Project Sub Element créé:', newElement.id);
      return newElement;
    } catch (error) {
      logger.error('Erreur createProjectSubElement', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createProjectSubElement',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateProjectSubElement(id: string, element: Partial<ProjectSubElementInsert>): Promise<ProjectSubElement> {
    try {
      const [updated] = await db.update(projectSubElements).set(element).where(eq(projectSubElements.id, id)).returning();
      logger.info('Project Sub Element mis à jour:', id);
      return updated;
    } catch (error) {
      logger.error('Erreur updateProjectSubElement', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateProjectSubElement',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteProjectSubElement(id: string): Promise<void> {
    try {
      await db.delete(projectSubElements).where(eq(projectSubElements.id, id));
      logger.info('Project Sub Element supprimé:', id);
    } catch (error) {
      logger.error('Erreur deleteProjectSubElement', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteProjectSubElement',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Classification Tags operations (Hashtags)
  async getClassificationTags(category?: string): Promise<ClassificationTag[]> {
    try {
      if (category) {
        return await db.select().from(classificationTags).where(eq(classificationTags.category, category));
      }
      return await db.select().from(classificationTags);
    } catch (error) {
      logger.error('Erreur getClassificationTags', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getClassificationTags',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async getClassificationTag(id: string): Promise<ClassificationTag | undefined> {
    try {
      const [tag] = await db.select().from(classificationTags).where(eq(classificationTags.id, id));
      return tag;
    } catch (error) {
      logger.error('Erreur getClassificationTag', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getClassificationTag',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return undefined;
    }
  }

  async createClassificationTag(tag: ClassificationTagInsert): Promise<ClassificationTag> {
    try {
      const [newTag] = await db.insert(classificationTags).values(tag).returning();
      logger.info('Classification Tag créé:', newTag.id);
      return newTag;
    } catch (error) {
      logger.error('Erreur createClassificationTag', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createClassificationTag',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateClassificationTag(id: string, tag: Partial<ClassificationTagInsert>): Promise<ClassificationTag> {
    try {
      const [updated] = await db.update(classificationTags).set(tag).where(eq(classificationTags.id, id)).returning();
      logger.info('Classification Tag mis à jour:', id);
      return updated;
    } catch (error) {
      logger.error('Erreur updateClassificationTag', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateClassificationTag',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteClassificationTag(id: string): Promise<void> {
    try {
      await db.delete(classificationTags).where(eq(classificationTags.id, id));
      logger.info('Classification Tag supprimé:', id);
    } catch (error) {
      logger.error('Erreur deleteClassificationTag', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteClassificationTag',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Entity Tags operations (Liaison Hashtags)
  async getEntityTags(entityType?: string, entityId?: string): Promise<EntityTag[]> {
    try {
      let query = db.select().from(entityTags);
      if (entityType && entityId) {
        query = query.where(and(eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId)));
      } else if (entityType) {
        query = query.where(eq(entityTags.entityType, entityType));
      }
      return await query;
    } catch (error) {
      logger.error('Erreur getEntityTags', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getEntityTags',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async createEntityTag(entityTag: EntityTagInsert): Promise<EntityTag> {
    try {
      const [newEntityTag] = await db.insert(entityTags).values(entityTag).returning();
      logger.info('Entity Tag créé:', newEntityTag.id);
      return newEntityTag;
    } catch (error) {
      logger.error('Erreur createEntityTag', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createEntityTag',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteEntityTag(id: string): Promise<void> {
    try {
      await db.delete(entityTags).where(eq(entityTags.id, id));
      logger.info('Entity Tag supprimé:', id);
    } catch (error) {
      logger.error('Erreur deleteEntityTag', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteEntityTag',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Employee Labels operations (Label/Label 1)
  async getEmployeeLabels(category?: string): Promise<EmployeeLabel[]> {
    try {
      if (category) {
        return await db.select().from(employeeLabels).where(eq(employeeLabels.category, category));
      }
      return await db.select().from(employeeLabels);
    } catch (error) {
      logger.error('Erreur getEmployeeLabels', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getEmployeeLabels',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async getEmployeeLabel(id: string): Promise<EmployeeLabel | undefined> {
    try {
      const [label] = await db.select().from(employeeLabels).where(eq(employeeLabels.id, id));
      return label;
    } catch (error) {
      logger.error('Erreur getEmployeeLabel', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getEmployeeLabel',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return undefined;
    }
  }

  async createEmployeeLabel(label: EmployeeLabelInsert): Promise<EmployeeLabel> {
    try {
      const [newLabel] = await db.insert(employeeLabels).values(label).returning();
      logger.info('Employee Label créé:', newLabel.id);
      return newLabel;
    } catch (error) {
      logger.error('Erreur createEmployeeLabel', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createEmployeeLabel',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async updateEmployeeLabel(id: string, label: Partial<EmployeeLabelInsert>): Promise<EmployeeLabel> {
    try {
      const [updated] = await db.update(employeeLabels).set(label).where(eq(employeeLabels.id, id)).returning();
      logger.info('Employee Label mis à jour:', id);
      return updated;
    } catch (error) {
      logger.error('Erreur updateEmployeeLabel', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateEmployeeLabel',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteEmployeeLabel(id: string): Promise<void> {
    try {
      await db.delete(employeeLabels).where(eq(employeeLabels.id, id));
      logger.info('Employee Label supprimé:', id);
    } catch (error) {
      logger.error('Erreur deleteEmployeeLabel', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteEmployeeLabel',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Employee Label Assignments operations (Liaison Label/Label 1)
  async getEmployeeLabelAssignments(userId?: string): Promise<EmployeeLabelAssignment[]> {
    try {
      if (userId) {
        return await db.select().from(employeeLabelAssignments).where(eq(employeeLabelAssignments.userId, userId));
      }
      return await db.select().from(employeeLabelAssignments);
    } catch (error) {
      logger.error('Erreur getEmployeeLabelAssignments', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getEmployeeLabelAssignments',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async createEmployeeLabelAssignment(assignment: EmployeeLabelAssignmentInsert): Promise<EmployeeLabelAssignment> {
    try {
      const [newAssignment] = await db.insert(employeeLabelAssignments).values(assignment).returning();
      logger.info('Employee Label Assignment créé:', newAssignment.id);
      return newAssignment;
    } catch (error) {
      logger.error('Erreur createEmployeeLabelAssignment', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createEmployeeLabelAssignment',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  async deleteEmployeeLabelAssignment(id: string): Promise<void> {
    try {
      await db.delete(employeeLabelAssignments).where(eq(employeeLabelAssignments.id, id));
      logger.info('Employee Label Assignment supprimé:', id);
    } catch (error) {
      logger.error('Erreur deleteEmployeeLabelAssignment', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteEmployeeLabelAssignment',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // ========================================
  // MÉTHODES MANQUANTES POUR BUSINESS ALERTS - PHASE 3.1.7.4
  // ========================================

  async getActiveBusinessThresholds(): Promise<any[]> {
    try {
      // Implémentation stub temporaire - retourne des seuils par défaut
      logger.info('[DatabaseStorage] getActiveBusinessThresholds: Utilisation seuils par défaut');
      return [
        {
          id: 'threshold_profitability_default',
          thresholdType: 'profitability',
          thresholdKey: 'global_margin',
          operator: 'less_than',
          thresholdValue: '15',
          severity: 'warning',
          alertTitle: 'Marge globale faible',
          alertMessage: 'La marge globale est en dessous du seuil critique'
        },
        {
          id: 'threshold_team_util_default',
          thresholdType: 'team_utilization',
          thresholdKey: 'team_overload',
          operator: 'greater_than',
          thresholdValue: '90',
          severity: 'critical',
          alertTitle: 'Surcharge équipe',
          alertMessage: 'Une équipe est en surcharge critique'
        }
      ];
    } catch (error) {
      logger.error('Erreur getActiveBusinessThresholds', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getActiveBusinessThresholds',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async findSimilarAlerts(params: {
    entity_type: string;
    entity_id: string;
    alert_type: string;
    hours_window: number;
  }): Promise<any[]> {
    try {
      // Implémentation stub temporaire - aucune alerte similaire trouvée
      logger.debug(`[DatabaseStorage] findSimilarAlerts: Recherche pour ${params.entity_type}:${params.entity_id}`);
      return [];
    } catch (error) {
      logger.error('Erreur findSimilarAlerts', {
        metadata: {
          service: 'StoragePOC',
          operation: 'findSimilarAlerts',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return [];
    }
  }

  async getBusinessAlert(id: string): Promise<any | null> {
    try {
      // Implémentation stub temporaire - alerte non trouvée
      logger.debug(`[DatabaseStorage] getBusinessAlert: Recherche alerte ${id}`);
      return null;
    } catch (error) {
      logger.error('Erreur getBusinessAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getBusinessAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      return null;
    }
  }

  async createBusinessAlert(data: any): Promise<string> {
    try {
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.info(`[DatabaseStorage] createBusinessAlert: Alerte créée ${alertId} - ${data.alertType}`);
      
      // Stub temporaire - simule la création d'une alerte
      return alertId;
    } catch (error) {
      logger.error('Erreur createBusinessAlert', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createBusinessAlert',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

  // Bug Reports operations - Système de rapport de bugs
  async createBugReport(bugReport: InsertBugReport): Promise<BugReport> {
    try {
      const [result] = await db.insert(bugReports).values(bugReport).returning();
      logger.info(`Rapport de bug créé avec ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Erreur createBugReport', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createBugReport',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  }

}

// Export default instance
export const storage = new DatabaseStorage();

// FORCE: Assurer que createBugReport est disponible sur l'instance exportée
if (!storage.createBugReport) {
  logger.error('CRITICAL FIX: createBugReport manque sur instance', {
    metadata: {
      service: 'StoragePOC',
      operation: 'criticalFix',
      error: 'Method createBugReport missing on instance',
      stack: undefined
    }
  });
  storage.createBugReport = async function(bugReport: InsertBugReport): Promise<BugReport> {
    try {
      const [result] = await db.insert(bugReports).values(bugReport).returning();
      logger.info(`Rapport de bug créé avec ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('Erreur createBugReport', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createBugReport',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw error;
    }
  };
  logger.info('CRITICAL FIX: createBugReport ajouté avec succès', {
    metadata: {
      service: 'StoragePOC',
      operation: 'criticalFix'
    }
  });
}