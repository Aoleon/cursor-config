import { eq, desc, and, sql, gte, lte, count, sum, avg, ne, ilike, type SQL } from "drizzle-orm";
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { 
  users, aos, offers, projects, projectTasks, suppliers, supplierRequests, teamResources, beWorkload,
  chiffrageElements, dpgfDocuments, aoLots, maitresOuvrage, maitresOeuvre, contactsMaitreOeuvre,
  validationMilestones, visaArchitecte, technicalAlerts, technicalAlertHistory,
  projectTimelines, dateIntelligenceRules, dateAlerts, businessMetrics, kpiSnapshots, performanceBenchmarks,
  alertThresholds, businessAlerts,
  projectReserves, savInterventions, savWarrantyClaims,
  projectFeedbackTerrain, savDemandes, beQualityChecklist, timeTracking,
  metricsBusiness, tempsPose, aoContacts, projectContacts, supplierSpecializations,
  supplierQuoteSessions, aoLotSuppliers, supplierDocuments, supplierQuoteAnalysis,
  equipmentBatteries, marginTargets, projectSubElements, classificationTags, entityTags, employeeLabels, employeeLabelAssignments,
  bugReports,
  purchaseOrders, clientQuotes, batigestExportQueue, documents, syncConfig,
  type User, type UpsertUser, type Document, type InsertDocument, type SyncConfig, type InsertSyncConfig, 
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
  contactLinkTypeEnum,
  departementEnum,
  type ProjectReserve, type InsertProjectReserve,
  type SavIntervention, type InsertSavIntervention,
  type SavWarrantyClaim, type InsertSavWarrantyClaim,
  type ProjectFeedbackTerrain, type InsertProjectFeedbackTerrain,
  type SavDemande, type InsertSavDemande,
  type BeQualityChecklistItem, type InsertBeQualityChecklistItem,
  type TimeTracking, type InsertTimeTracking,
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
  type BugReport, type InsertBugReport,
  type PurchaseOrder, type InsertPurchaseOrder,
  type ClientQuote, type InsertClientQuote,
  type BatigestExportQueue, type InsertBatigestExportQueue,
  type Contact
} from "@shared/schema";
import { db } from "./db"; // Utilise la config existante avec pool optimisé
import type { EventBus } from "./eventBus";
import { logger } from "./utils/logger";
import { withTransaction, withSavepoint, type TransactionOptions } from "./utils/database-helpers";
import { safeQuery, safeInsert, safeUpdate, safeDelete } from "./utils/safe-query";
import type { NeonTransaction } from 'drizzle-orm/neon-serverless';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type * as schema from '@shared/schema';
import { contactService } from './contactService';
import type { ExtractedContactData, ContactLinkResult, IndividualContactData, IndividualContactResult } from './contactService';
import { KpiRepository } from './storage/analytics/KpiRepository';
import { analyticsStorage } from './storage/analytics';

// ========================================
// TYPES POUR TRANSACTIONS
// ========================================

export type DrizzleTransaction = NeonTransaction<typeof schema, ExtractTablesWithRelations<typeof schema>>;

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
  // UserRepository methods - MIGRATED TO server/storage/users/UserRepository.ts
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByMicrosoftId(microsoftId: string): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;
  createUser(userData: Partial<InsertUser>): Promise<User>;
  
  // AO operations - Base pour éviter double saisie
  getAos(): Promise<Ao[]>;
  getAOsPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ aos: Array<Ao>, total: number }>;
  getAo(id: string, tx?: DrizzleTransaction): Promise<Ao | undefined>;
  getAOByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Ao | undefined>;
  createAo(ao: InsertAo, tx?: DrizzleTransaction): Promise<Ao>;
  updateAo(id: string, ao: Partial<InsertAo>, tx?: DrizzleTransaction): Promise<Ao>;
  deleteAo(id: string, tx?: DrizzleTransaction): Promise<void>;
  
  // Offer operations - Cœur du POC
  getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]>;
  getOffersPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ offers: Array<Offer & { responsibleUser?: User; ao?: Ao }>, total: number }>;
  getCombinedOffersPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ items: Array<(Ao | Offer) & { responsibleUser?: User; ao?: Ao; sourceType: 'ao' | 'offer' }>, total: number }>;
  getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer>;
  deleteOffer(id: string): Promise<void>;
  
  // Project operations - 5 étapes POC
  getProjects(search?: string, status?: string): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]>;
  getProjectsPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ projects: Array<Project & { responsibleUser?: User; offer?: Offer }>, total: number }>;
  getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined>;
  getProjectByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  
  // Monday.com Export Tracking
  updateProjectMondayId(projectId: string, mondayId: string): Promise<void>;
  updateAOMondayId(aoId: string, mondayId: string): Promise<void>;
  getProjectsToExport(limit?: number): Promise<Project[]>; // mondayId = null
  getAOsToExport(limit?: number): Promise<Ao[]>; // mondayId = null
  
  // Project task operations - Planning partagé
  getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]>;
  getAllTasks(): Promise<(ProjectTask & { assignedUser?: User })[]>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask>;
  
  // Supplier operations - Gestion des fournisseurs
  getSuppliers(search?: string, status?: string): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  getSupplierByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Supplier | undefined>;
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
  getChiffrageElementsByLot(lotId: string): Promise<ChiffrageElement[]>;
  createChiffrageElement(element: InsertChiffrageElement): Promise<ChiffrageElement>;
  updateChiffrageElement(id: string, element: Partial<InsertChiffrageElement>): Promise<ChiffrageElement>;
  deleteChiffrageElement(id: string): Promise<void>;
  
  // DPGF Documents operations - Document Provisoire de Gestion Financière POC
  getDpgfDocumentByOffer(offerId: string): Promise<DpgfDocument | null>;
  createDpgfDocument(dpgf: InsertDpgfDocument): Promise<DpgfDocument>;
  updateDpgfDocument(id: string, dpgf: Partial<InsertDpgfDocument>): Promise<DpgfDocument>;
  deleteDpgfDocument(id: string): Promise<void>;
  
  // AO Lots operations - Gestion des lots d'AO
  getAoLots(aoId: string, tx?: DrizzleTransaction): Promise<AoLot[]>;
  createAoLot(lot: InsertAoLot, tx?: DrizzleTransaction): Promise<AoLot>;
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
  
  // Contact deduplication methods
  findOrCreateMaitreOuvrage(
    data: ExtractedContactData,
    tx?: DrizzleTransaction
  ): Promise<ContactLinkResult>;
  
  findOrCreateMaitreOeuvre(
    data: ExtractedContactData,
    tx?: DrizzleTransaction
  ): Promise<ContactLinkResult>;
  
  // Individual contacts deduplication
  findOrCreateContact(
    data: IndividualContactData,
    tx?: DrizzleTransaction
  ): Promise<IndividualContactResult>;
  
  // Link contact to AO
  linkAoContact(
    params: { aoId: string; contactId: string; linkType: string },
    tx?: DrizzleTransaction
  ): Promise<AoContacts | null>;
  
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
  getAoContacts(aoId: string, tx?: DrizzleTransaction): Promise<AoContacts[]>;
  createAoContact(contact: InsertAoContacts, tx?: DrizzleTransaction): Promise<AoContacts>;
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
  addTechnicalAlertHistory(alertId: string | null, action: string, actorUserId: string | null, note?: string, metadata?: Record<string, unknown>): Promise<TechnicalAlertHistory>;
  
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
    forecast_data: Record<string, unknown>;     // Résultats forecast JSON
    generated_at: string;   // Timestamp génération
    params: Record<string, unknown>;           // Paramètres utilisés
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
  getAnalyticsSnapshots(params?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  createAnalyticsSnapshot(data: Record<string, unknown>): Promise<Record<string, unknown>>;

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
  // MÉTHODES FONCTIONNALITÉS 3-4-5-6-7-8
  // ========================================
  
  // Project Feedback Terrain operations
  getProjectFeedbackTerrain(projectId: string, filters?: { status?: string; feedbackType?: string; severity?: string }): Promise<ProjectFeedbackTerrain[]>;
  getProjectFeedbackTerrainById(id: string): Promise<ProjectFeedbackTerrain | undefined>;
  createProjectFeedbackTerrain(data: InsertProjectFeedbackTerrain): Promise<ProjectFeedbackTerrain>;
  updateProjectFeedbackTerrain(id: string, data: Partial<InsertProjectFeedbackTerrain>): Promise<ProjectFeedbackTerrain>;
  
  // SAV Demandes operations
  getSavDemandes(filters?: { projectId?: string; status?: string; demandeType?: string; dateFrom?: Date; dateTo?: Date }): Promise<SavDemande[]>;
  getSavDemande(id: string): Promise<SavDemande | undefined>;
  createSavDemande(data: InsertSavDemande): Promise<SavDemande>;
  updateSavDemande(id: string, data: Partial<InsertSavDemande>): Promise<SavDemande>;
  
  // BE Quality Checklist operations
  getBeQualityChecklist(offerId: string): Promise<BeQualityChecklistItem[]>;
  createBeQualityChecklistItem(data: InsertBeQualityChecklistItem): Promise<BeQualityChecklistItem>;
  updateBeQualityChecklistItem(id: string, data: Partial<InsertBeQualityChecklistItem>): Promise<BeQualityChecklistItem>;
  validateBeQualityChecklist(offerId: string): Promise<{ isValid: boolean; missingItems: string[] }>;
  
  // Time Tracking operations
  getTimeTracking(filters?: { projectId?: string; offerId?: string; userId?: string; taskType?: string; dateFrom?: Date; dateTo?: Date }): Promise<TimeTracking[]>;
  getProjectTimeTracking(projectId: string): Promise<TimeTracking[]>;
  createTimeTracking(data: InsertTimeTracking): Promise<TimeTracking>;

  // ========================================
  // WORKFLOW FOURNISSEURS - NOUVELLES OPERATIONS
  // ========================================

  // Supplier Quote Sessions operations - Gestion des sessions de devis sécurisées
  getSupplierQuoteSessions(aoId?: string, aoLotId?: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot })[]>;
  getSupplierQuoteSession(id: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot }) | undefined>;
  getSupplierQuoteSessionByToken(token: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot }) | undefined>;
  createSupplierQuoteSession(session: InsertSupplierQuoteSession): Promise<SupplierQuoteSession>;
  updateSupplierQuoteSession(id: string, session: Partial<InsertSupplierQuoteSession>): Promise<SupplierQuoteSession>;
  deleteSupplierQuoteSession(id: string): Promise<void>;
  generateSessionToken(): Promise<string>; // Génère un token unique sécurisé

  // AO Lot Suppliers operations - Gestion de la sélection fournisseurs par lot
  getAoLotSuppliers(aoLotId: string): Promise<(AoLotSupplier & { supplier?: Supplier; selectedByUser?: User })[]>;
  getAoLotSupplier(id: string): Promise<(AoLotSupplier & { supplier?: Supplier; selectedByUser?: User }) | undefined>;
  createAoLotSupplier(aoLotSupplier: InsertAoLotSupplier): Promise<AoLotSupplier>;
  updateAoLotSupplier(id: string, aoLotSupplier: Partial<InsertAoLotSupplier>): Promise<AoLotSupplier>;
  deleteAoLotSupplier(id: string): Promise<void>;
  getSuppliersByLot(aoLotId: string): Promise<Supplier[]>; // Récupère les fournisseurs sélectionnés pour un lot

  // Supplier Documents operations - Gestion des documents fournisseurs
  getSupplierDocuments(sessionId?: string, supplierId?: string): Promise<(SupplierDocument & { session?: SupplierQuoteSession; validatedByUser?: User })[]>;
  getSupplierDocument(id: string): Promise<(SupplierDocument & { session?: SupplierQuoteSession; validatedByUser?: User }) | undefined>;
  createSupplierDocument(document: InsertSupplierDocument): Promise<SupplierDocument>;
  updateSupplierDocument(id: string, document: Partial<InsertSupplierDocument>): Promise<SupplierDocument>;
  deleteSupplierDocument(id: string): Promise<void>;
  getDocumentsBySession(sessionId: string): Promise<SupplierDocument[]>; // Documents d'une session spécifique

  // Documents operations - Gestion centralisée des documents (OneDrive sync)
  createDocument(document: InsertDocument): Promise<Document>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByEntity(entityType: string, entityId: string): Promise<Document[]>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Sync Config operations - Configuration synchronisation OneDrive automatique
  getSyncConfig(): Promise<SyncConfig | undefined>;
  updateSyncConfig(config: Partial<InsertSyncConfig>): Promise<SyncConfig>;

  // Supplier Quote Analysis operations - Gestion de l'analyse OCR des devis
  getSupplierQuoteAnalyses(documentId?: string, sessionId?: string): Promise<(SupplierQuoteAnalysis & { document?: SupplierDocument; reviewedByUser?: User })[]>;
  getSupplierQuoteAnalysis(id: string): Promise<(SupplierQuoteAnalysis & { document?: SupplierDocument; reviewedByUser?: User }) | undefined>;
  createSupplierQuoteAnalysis(analysis: InsertSupplierQuoteAnalysis): Promise<SupplierQuoteAnalysis>;
  updateSupplierQuoteAnalysis(id: string, analysis: Partial<InsertSupplierQuoteAnalysis>): Promise<SupplierQuoteAnalysis>;
  deleteSupplierQuoteAnalysis(id: string): Promise<void>;
  getAnalysisByDocument(documentId: string): Promise<SupplierQuoteAnalysis | undefined>; // Analyse d'un document spécifique

  // Wave 8 - Additional supplier quote analysis methods with filters
  getSupplierQuoteAnalysesBySession(
    sessionId: string, 
    filters: { 
      status?: string; 
      includeRawText?: boolean; 
      orderBy?: string; 
      order?: 'asc' | 'desc' 
    }
  ): Promise<SupplierDocument[]>;
  getSupplierDocumentsBySession(sessionId: string): Promise<SupplierDocument[]>;
  createAnalysisNoteHistory(data: { 
    analysisId: string; 
    notes: string; 
    timestamp: Date;
    isInternal?: boolean;
    createdBy?: string;
  }): Promise<Record<string, unknown>>;

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

  // ========================================
  // BATIGEST INTEGRATION - PHASE 5
  // ========================================

  // Purchase Orders operations - Gestion des bons de commande fournisseurs
  getPurchaseOrders(filters?: { supplierId?: string; status?: string }): Promise<PurchaseOrder[]>;
  getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder>;
  updatePurchaseOrder(id: string, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder>;

  // Client Quotes operations - Gestion des devis clients
  getClientQuotes(filters?: { clientName?: string; status?: string }): Promise<ClientQuote[]>;
  getClientQuote(id: string): Promise<ClientQuote | undefined>;
  createClientQuote(quote: InsertClientQuote): Promise<ClientQuote>;
  updateClientQuote(id: string, quote: Partial<InsertClientQuote>): Promise<ClientQuote>;

  // Batigest Export Queue operations - Queue de synchronisation Batigest
  getBatigestExportsByStatus(status: string, limit?: number): Promise<BatigestExportQueue[]>;
  getBatigestExportById(id: string): Promise<BatigestExportQueue | undefined>;
  createBatigestExport(exportData: InsertBatigestExportQueue): Promise<BatigestExportQueue>;
  updateBatigestExport(id: string, data: Partial<InsertBatigestExportQueue>): Promise<BatigestExportQueue>;
  getBatigestExportsAll(filters?: {
    status?: string;
    documentType?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: BatigestExportQueue[];
    total: number;
    page: number;
    limit: number;
  }>;
  getBatigestStats(): Promise<{
    totalExports: number;
    successRate7days: number;
    lastSyncDate: Date | null;
    pendingCount: number;
    errorRate: number;
  }>;

  // ========================================
  // ANALYTICS AGGREGATION METHODS - PERFORMANCE OPTIMIZED
  // ========================================
  
  /**
   * Get aggregated project statistics without loading full objects
   * Returns SQL-computed aggregates by status
   */
  getProjectStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    responsibleUserId?: string;
    departement?: string;
  }): Promise<{
    totalCount: number;
    byStatus: Record<string, { count: number; totalBudget: number; avgBudget: number }>;
    totalBudget: number;
    avgBudget: number;
  }>;

  /**
   * Get aggregated offer statistics without loading full objects
   * Returns SQL-computed aggregates by status
   */
  getOfferStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    responsibleUserId?: string;
    departement?: string;
  }): Promise<{
    totalCount: number;
    byStatus: Record<string, { count: number; totalAmount: number; avgAmount: number }>;
    totalAmount: number;
    avgAmount: number;
  }>;

  /**
   * Get aggregated AO statistics without loading full objects
   * Returns SQL-computed aggregates
   */
  getAOStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
    departement?: string;
  }): Promise<{
    totalCount: number;
    byDepartement: Record<string, number>;
  }>;

  /**
   * Get conversion statistics with SQL aggregations
   * Returns conversion metrics without loading full objects
   */
  getConversionStats(period: {
    from: string;
    to: string;
  }, filters?: {
    userId?: string;
    departement?: string;
  }): Promise<{
    aoToOffer: {
      totalAOs: number;
      totalOffersCreated: number;
      conversionRate: number;
      byUser?: Record<string, { aos: number; offers: number; rate: number }>;
    };
    offerToProject: {
      totalOffers: number;
      totalSignedOffers: number;
      conversionRate: number;
      byUser?: Record<string, { offers: number; signed: number; rate: number }>;
    };
  }>;

  /**
   * Get project delay statistics with SQL aggregations
   * Returns delay metrics without loading full timelines
   */
  getProjectDelayStats(period: {
    from: string;
    to: string;
  }): Promise<{
    avgDelayDays: number;
    medianDelayDays: number;
    totalDelayed: number;
    criticalDelayed: number; // > 7 days
    byPhase: Record<string, { count: number; avgDelay: number }>;
  }>;

  /**
   * Get team performance statistics with SQL aggregations
   * Returns team metrics without loading full projects
   */
  getTeamPerformanceStats(period: {
    from: string;
    to: string;
  }): Promise<Array<{
    userId: string;
    userName: string;
    projectCount: number;
    avgDelayDays: number;
    onTimeCount: number;
    onTimeRate: number;
  }>>;

  /**
   * Transaction wrapper
   * Expose withTransaction helper via IStorage for services to use transactions
   * without importing database-helpers directly
   */
  transaction<T>(
    callback: (tx: DrizzleTransaction) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T>;
}

// ========================================
// IMPLÉMENTATION STORAGE POC
// ========================================

export class DatabaseStorage implements IStorage {
  private eventBus?: EventBus; // Optional EventBus pour auto-publishing
  private kpiRepository: KpiRepository; // Optimized KPI queries with single-query approach

  // INJECTION EVENTBUS - Constructeur optionnel pour tests
  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus;
    this.kpiRepository = new KpiRepository();
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
  // UserRepository methods - MIGRATED TO server/storage/users/UserRepository.ts
  // These methods are now delegated through StorageFacade
  // Implementation kept for backward compatibility with DatabaseStorage class
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByMicrosoftId(microsoftId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.microsoftId, microsoftId));
    return user;
  }

  async createUser(userData: Partial<InsertUser>): Promise<User> {
    return safeQuery(async () => {
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }, {
      retries: 2,
      service: 'StoragePOC',
      operation: 'createUser',
      logQuery: true
    });
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return safeQuery(async () => {
      try {
        const [user] = await db
            .insert(users)
            .values(userData)
            .onConflictDoUpdate({
              target: users.id,
              set: {
                ...userData,
                updatedAt: new Date(),
              },
            })
            .returning();
        return user;
      } catch (error) {
        logger.error('Erreur upsertUser', { metadata: {
            service: 'storage-poc',
            operation: 'upsertUser',
            error: error instanceof Error ? error.message : String(error)
              }

            });
        throw error;
      }
    }, {
      retries: 2,
      service: 'StoragePOC',
      operation: 'upsertUser',
      logQuery: true
    });
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

  // ========================================
  // IMPLÉMENTATION MÉTHODES FONCTIONNALITÉS 3-4-5-6-7-8
  // ========================================

  // Project Feedback Terrain operations
  async getProjectFeedbackTerrain(projectId: string, filters?: { status?: string; feedbackType?: string; severity?: string }): Promise<ProjectFeedbackTerrain[]> {
    let query = db.select().from(projectFeedbackTerrain)
      .where(eq(projectFeedbackTerrain.projectId, projectId));
    
    if (filters?.status) {
      query = query.where(eq(projectFeedbackTerrain.status, filters.status as unknown));
    }
    if (filters?.feedbackType) {
      query = query.where(eq(projectFeedbackTerrain.feedbackType, filters.feedbackType as unknown));
    }
    if (filters?.severity) {
      query = query.where(eq(projectFeedbackTerrain.severity, filters.severity as unknown));
    }
    
    return await query.orderBy(desc(projectFeedbackTerrain.createdAt));
  }

  async getProjectFeedbackTerrainById(id: string): Promise<ProjectFeedbackTerrain | undefined> {
    const [feedback] = await db.select().from(projectFeedbackTerrain).where(eq(projectFeedbackTerrain.id, id));
    return feedback;
  }

  async createProjectFeedbackTerrain(data: InsertProjectFeedbackTerrain): Promise<ProjectFeedbackTerrain> {
    const [newFeedback] = await db.insert(projectFeedbackTerrain)
      .values(data)
      .returning();
    return newFeedback;
  }

  async updateProjectFeedbackTerrain(id: string, data: Partial<InsertProjectFeedbackTerrain>): Promise<ProjectFeedbackTerrain> {
    const [updatedFeedback] = await db.update(projectFeedbackTerrain)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projectFeedbackTerrain.id, id))
      .returning();
    if (!updatedFeedback) {
      throw new NotFoundError(`Project feedback terrain with id ${id} not found`);
    }
    return updatedFeedback;
  }

  // SAV Demandes operations
  async getSavDemandes(filters?: { projectId?: string; status?: string; demandeType?: string; dateFrom?: Date; dateTo?: Date }): Promise<SavDemande[]> {
    let query = db.select().from(savDemandes);
    
    const conditions = [];
    if (filters?.projectId) {
      conditions.push(eq(savDemandes.projectId, filters.projectId));
    }
    if (filters?.status) {
      conditions.push(eq(savDemandes.status, filters.status as unknown));
    }
    if (filters?.demandeType) {
      conditions.push(eq(savDemandes.demandeType, filters.demandeType as unknown));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(savDemandes.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(savDemandes.createdAt, filters.dateTo));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(savDemandes.createdAt));
  }

  async getSavDemande(id: string): Promise<SavDemande | undefined> {
    const [demande] = await db.select().from(savDemandes).where(eq(savDemandes.id, id));
    return demande;
  }

  async createSavDemande(data: InsertSavDemande): Promise<SavDemande> {
    const [newDemande] = await db.insert(savDemandes)
      .values(data)
      .returning();
    return newDemande;
  }

  async updateSavDemande(id: string, data: Partial<InsertSavDemande>): Promise<SavDemande> {
    const [updatedDemande] = await db.update(savDemandes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(savDemandes.id, id))
      .returning();
    if (!updatedDemande) {
      throw new NotFoundError(`SAV demande with id ${id} not found`);
    }
    return updatedDemande;
  }

  // BE Quality Checklist operations
  async getBeQualityChecklist(offerId: string): Promise<BeQualityChecklistItem[]> {
    return await db.select().from(beQualityChecklist)
      .where(eq(beQualityChecklist.offerId, offerId))
      .orderBy(beQualityChecklist.itemType);
  }

  async createBeQualityChecklistItem(data: InsertBeQualityChecklistItem): Promise<BeQualityChecklistItem> {
    const [newItem] = await db.insert(beQualityChecklist)
      .values(data)
      .returning();
    return newItem;
  }

  async updateBeQualityChecklistItem(id: string, data: Partial<InsertBeQualityChecklistItem>): Promise<BeQualityChecklistItem> {
    const [updatedItem] = await db.update(beQualityChecklist)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(beQualityChecklist.id, id))
      .returning();
    if (!updatedItem) {
      throw new NotFoundError(`BE quality checklist item with id ${id} not found`);
    }
    return updatedItem;
  }

  async validateBeQualityChecklist(offerId: string): Promise<{ isValid: boolean; missingItems: string[] }> {
    const items = await this.getBeQualityChecklist(offerId);
    const criticalItems = items.filter(item => item.isCritical);
    const checkedCriticalItems = criticalItems.filter(item => item.status === 'conforme');
    const missingItems = criticalItems
      .filter(item => item.status !== 'conforme')
      .map(item => item.itemType);
    
    return {
      isValid: checkedCriticalItems.length === criticalItems.length,
      missingItems
    };
  }

  // Time Tracking operations
  async getTimeTracking(filters?: { projectId?: string; offerId?: string; userId?: string; taskType?: string; dateFrom?: Date; dateTo?: Date }): Promise<TimeTracking[]> {
    let query = db.select().from(timeTracking);
    
    const conditions = [];
    if (filters?.projectId) {
      conditions.push(eq(timeTracking.projectId, filters.projectId));
    }
    if (filters?.offerId) {
      conditions.push(eq(timeTracking.offerId, filters.offerId));
    }
    if (filters?.userId) {
      conditions.push(eq(timeTracking.userId, filters.userId));
    }
    if (filters?.taskType) {
      conditions.push(eq(timeTracking.taskType, filters.taskType as unknown));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(timeTracking.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(timeTracking.date, filters.dateTo));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(timeTracking.date));
  }

  async getProjectTimeTracking(projectId: string): Promise<TimeTracking[]> {
    return await this.getTimeTracking({ projectId });
  }

  async createTimeTracking(data: InsertTimeTracking): Promise<TimeTracking> {
    const [newTracking] = await db.insert(timeTracking)
      .values(data)
      .returning();
    return newTracking;
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
    const updateFields: Record<string, unknown> = { updatedAt: new Date() };
    
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
      logger.info('Aucune configuration scoring trouvée, utilisation valeurs par défaut', { metadata: {
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
    logger.info('Mise à jour configuration scoring', { metadata: {
        service: 'StoragePOC',
        operation: 'updateScoringConfig',
        threshold: config.threshold,
        weightsCount: Object.keys(config.weights).length
              }

            });
    
    // Validation des valeurs (sécurité)
    if (config.threshold < 0 || config.threshold > 50) {
      throw new AppError('Le seuil doit être entre 0 et 50', 500);
    }
    
    for (const [critere, poids] of Object.entries(config.weights)) {
      if (poids < 0 || poids > 10) {
        throw new AppError(`Le poids pour ${critere} doit être entre 0 et 10`, 500);
      }
    }
    
    // Sauvegarder en mémoire
    DatabaseStorage.scoringConfig = { ...config };
    logger.info('Configuration scoring mise à jour avec succès', { metadata: {
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
    
    logger.info('Alerte technique créée', { metadata: {
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
      throw new AppError(`Alerte technique ${id} introuvable`, 500);
    }

    alert.status = 'acknowledged';
    alert.updatedAt = new Date();
    
    DatabaseStorage.technicalAlerts.set(id, alert);
    
    await this.addTechnicalAlertHistory(id, 'acknowledged', userId, 'Alerte acknowledged par l\'utilisateur');
    logger.info('Alerte acknowledged', { metadata: {
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
      throw new AppError(`Alerte technique ${id} introuvable`, 500);
    }

    alert.status = 'validated';
    alert.updatedAt = new Date();
    alert.validatedAt = new Date();
    alert.validatedByUserId = userId;
    
    DatabaseStorage.technicalAlerts.set(id, alert);
    
    await this.addTechnicalAlertHistory(id, 'validated', userId, 'Alerte validée par l\'utilisateur');
    logger.info('Alerte validée', { metadata: {
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
      throw new AppError(`Alerte technique ${id} introuvable`, 500);
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
    
    logger.info('Alerte bypassée', { metadata: {
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
    metadata?: Record<string, unknown>
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
    
    logger.info('Historique alerte ajouté', { metadata: {
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
    logger.info('Récupération règles matériaux-couleurs', { metadata: {
        service: 'StoragePOC',
        operation: 'getMaterialColorRules',
        rulesCount: DatabaseStorage.materialColorRules.length
              }

            });
    // Retourner une copie pour éviter les modifications directes
    return [...DatabaseStorage.materialColorRules];
  }

  async setMaterialColorRules(rules: MaterialColorAlertRule[]): Promise<void> {
    logger.info('Mise à jour règles matériaux-couleurs', { metadata: {
        service: 'StoragePOC',
        operation: 'setMaterialColorRules',
        rulesCount: rules.length
              }

            });
    
    // Validation basique des règles
    for (const rule of rules) {
      if (!rule.id || typeof rule.id !== 'string') {
        throw new AppError(`Règle invalide: l'ID est obligatoire (règle: ${JSON.stringify(rule, 500)})`);
      }
      if (!rule.message || typeof rule.message !== 'string') {
        throw new AppError(`Règle invalide: le message est obligatoire (règle ID: ${rule.id}, 500)`);
      }
    }

    // Vérifier l'unicité des IDs
    const ids = rules.map(r => r.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      throw new AppError(`IDs de règles non uniques détectés dans la configuration`, 500);
    }

    // Remplacer les règles existantes
    DatabaseStorage.materialColorRules = [...rules];
    
    logger.info('Règles matériaux-couleurs mises à jour avec succès', { metadata: {
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
    
    logger.info('Récupération timelines projet', { metadata: {
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
    
    logger.info('Récupération timelines totales', { metadata: {
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
    logger.info('Timeline créée', { metadata: {
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
      throw new AppError(`Timeline ${id} non trouvée`, 500);
    }

    const updated: ProjectTimeline = {
      ...existing,
      ...data,
      updatedAt: new Date(),
      lastCalculatedAt: data.calculationMethod ? new Date() : existing.lastCalculatedAt
    };

    DatabaseStorage.projectTimelines.set(id, updated);
    logger.info('Timeline mise à jour', { metadata: {
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
      throw new AppError(`Timeline ${id} non trouvée`, 500);
    }

    DatabaseStorage.projectTimelines.delete(id);
    logger.info('Timeline supprimée', { metadata: {
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
    
    logger.info('Règles actives trouvées', { metadata: {
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
    
    logger.info('Règles totales récupérées', { metadata: {
        service: 'StoragePOC',
        operation: 'getAllRules',
        rulesCount: rules.length
              }

            });
    return rules;
  }

  async getRule(id: string): Promise<DateIntelligenceRule | undefined> {
    const rule = DatabaseStorage.dateIntelligenceRules.get(id);
    logger.info('Règle récupérée', { metadata: {
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
    logger.info('Règle créée', { metadata: {
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
      throw new AppError(`Règle ${id} non trouvée`, 500);
    }

    const updated: DateIntelligenceRule = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    DatabaseStorage.dateIntelligenceRules.set(id, updated);
    logger.info('Règle mise à jour', { metadata: {
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
      throw new AppError(`Règle ${id} non trouvée`, 500);
    }

    DatabaseStorage.dateIntelligenceRules.delete(id);
    logger.info('Règle supprimée', { metadata: {
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
    
    logger.info('Alertes date trouvées', { metadata: {
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
    logger.info('Alerte date récupérée', { metadata: {
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
    logger.info('Alerte date créée', { metadata: {
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
      throw new AppError(`Alerte ${id} non trouvée`, 500);
    }

    const updated: DateAlert = {
      ...existing,
      ...data,
      updatedAt: new Date()
    };

    DatabaseStorage.dateAlerts.set(id, updated);
    logger.info('Alerte date mise à jour', { metadata: {
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
      throw new AppError(`Alerte ${id} non trouvée`, 500);
    }

    DatabaseStorage.dateAlerts.delete(id);
    logger.info('Alerte date supprimée', { metadata: {
        service: 'StoragePOC',
        operation: 'deleteDateAlert',
        alertId: id
              }

            });
  }

  async acknowledgeAlert(id: string, userId: string): Promise<boolean> {
    const existing = DatabaseStorage.dateAlerts.get(id);
    if (!existing) {
      throw new AppError(`Alerte ${id} non trouvée`, 500);
    }

    const updated: DateAlert = {
      ...existing,
      status: 'acknowledged',
      assignedTo: userId,
      acknowledgedAt: new Date(),
      updatedAt: new Date()
    };

    DatabaseStorage.dateAlerts.set(id, updated);
    logger.info('Alerte date acquittée', { metadata: {
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
      throw new AppError(`Alerte ${id} non trouvée`, 500);
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
    logger.info('Alerte date résolue', { metadata: {
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
    logger.info('KPI Snapshot créé', { metadata: {
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
    logger.info('KPI snapshots trouvés', { metadata: {
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
    
    logger.info('Dernier KPI snapshot récupéré', { metadata: {
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
    logger.info('Métrique business créée', { metadata: {
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
      conditions.push(eq(businessMetrics.metricType, filters.metricType as 'conversion' | 'delay' | 'revenue' | 'team_load' | 'margin'));
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
    logger.info('Métriques business trouvées', { metadata: {
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
          eq(businessMetrics.metricType, metricType as 'conversion' | 'delay' | 'revenue' | 'team_load' | 'margin'),
          gte(businessMetrics.periodStart, period.from),
          lte(businessMetrics.periodEnd, period.to)
        )
      )
      .orderBy(businessMetrics.periodStart);

    logger.info('Métriques série temporelle trouvées', { metadata: {
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
    logger.info('Benchmark performance créé', { metadata: {
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
      
    logger.info('Benchmarks trouvés', { metadata: {
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

    logger.info('Top performers trouvés', { metadata: {
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
    forecast_data: Record<string, unknown>;
    params: Record<string, unknown>;
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
      logger.info('Récupération historique revenus mensuel', { metadata: {
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

      logger.info('Historique revenus mensuel trouvé', { metadata: {
          service: 'StoragePOC',
          operation: 'getMonthlyRevenueHistory',
          monthsCount: formattedResults.length
              }

            });
      return formattedResults;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.info('Récupération historique délais projets', { metadata: {
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

      logger.info('Historique délais projets trouvé', { metadata: {
          service: 'StoragePOC',
          operation: 'getProjectDelayHistory',
          projectsCount: formattedResults.length
              }

            });
      return formattedResults;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.info('Récupération historique charge équipes', { metadata: {
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

      logger.info('Historique charge équipes trouvé', { metadata: {
          service: 'StoragePOC',
          operation: 'getTeamLoadHistory',
          monthsCount: formattedResults.length
              }

            });
      return formattedResults;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async saveForecastSnapshot(forecast: {
    forecast_data: Record<string, unknown>;
    generated_at: string;
    params: Record<string, unknown>;
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
      
      logger.info('Snapshot forecast sauvegardé', { metadata: {
          service: 'StoragePOC',
          operation: 'saveForecastSnapshot',
          snapshotId: id,
          forecastPeriod: forecastPeriod
              }

            });
      return id;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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

      logger.info('Snapshots forecast trouvés', { metadata: {
          service: 'StoragePOC',
          operation: 'listForecastSnapshots',
          snapshotsCount: snapshots.length,
          limit: limit
              }

            });
      return snapshots;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getAnalyticsSnapshots(params?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    try {
      logger.info('Récupération snapshots analytics', { metadata: {
          service: 'DatabaseStorage',
          operation: 'getAnalyticsSnapshots',
          params
              }

            });
      return [];
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async createAnalyticsSnapshot(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const snapshot = {
        id: `analytics_snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...data,
        createdAt: new Date()
      };
      logger.info('Snapshot analytics créé', { metadata: {
          service: 'DatabaseStorage',
          operation: 'createAnalyticsSnapshot',
          snapshotId: snapshot.id
              }

            });
      return snapshot;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER QUOTE SESSIONS OPERATIONS - WORKFLOW FOURNISSEURS
  // ========================================

  async getSupplierQuoteSessions(aoId?: string, aoLotId?: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot })[]> {
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getSupplierQuoteSession(id: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot }) | undefined> {
    try {
      const [session] = await db.select().from(supplierQuoteSessions).where(eq(supplierQuoteSessions.id, id));
      return session;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getSupplierQuoteSessionByToken(token: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot }) | undefined> {
    try {
      const [session] = await db.select().from(supplierQuoteSessions).where(eq(supplierQuoteSessions.accessToken, token));
      return session;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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

  async getAoLotSuppliers(aoLotId: string): Promise<(AoLotSupplier & { supplier?: Supplier; selectedByUser?: User })[]> {
    try {
      const lotSuppliers = await db.select().from(aoLotSuppliers).where(eq(aoLotSuppliers.aoLotId, aoLotId));
      logger.info(`Récupération de ${lotSuppliers.length} fournisseurs pour le lot ${aoLotId}`);
      return lotSuppliers;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getAoLotSupplier(id: string): Promise<(AoLotSupplier & { supplier?: Supplier; selectedByUser?: User }) | undefined> {
    try {
      const [lotSupplier] = await db.select().from(aoLotSuppliers).where(eq(aoLotSuppliers.id, id));
      return lotSupplier;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getSuppliersByLot(aoLotId: string): Promise<Supplier[]> {
    try {
      // Cette méthode devrait faire une jointure pour récupérer les détails des fournisseurs
      // Pour l'instant, on retourne les associations basiques
      const associations = await this.getAoLotSuppliers(aoLotId);
      return associations;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER DOCUMENTS OPERATIONS - GESTION DOCUMENTS FOURNISSEURS
  // ========================================

  async getSupplierDocuments(sessionId?: string, supplierId?: string): Promise<(SupplierDocument & { session?: SupplierQuoteSession; validatedByUser?: User })[]> {
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getSupplierDocument(id: string): Promise<(SupplierDocument & { session?: SupplierQuoteSession; validatedByUser?: User }) | undefined> {
    try {
      const [document] = await db.select().from(supplierDocuments).where(eq(supplierDocuments.id, id));
      return document;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  // ========================================
  // DOCUMENTS OPERATIONS - Gestion centralisée des documents (OneDrive sync)
  // ========================================

  async createDocument(document: InsertDocument): Promise<Document> {
    try {
      const [newDocument] = await db.insert(documents).values(document).returning();
      logger.info('Document créé', { metadata: {
          service: 'StoragePOC',
          operation: 'createDocument',
          documentId: newDocument.id,
          fileName: document.name,
          oneDriveId: document.oneDriveId
              }

            });
      return newDocument;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getDocument(id: string): Promise<Document | undefined> {
    try {
      const [document] = await db.select().from(documents).where(eq(documents.id, id));
      return document;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getDocumentsByEntity(entityType: string, entityId: string): Promise<Document[]> {
    try {
      let query = db.select().from(documents);
      
      // Filter by entity type
      if (entityType === 'ao') {
        query = query.where(eq(documents.aoId, entityId));
      } else if (entityType === 'offer') {
        query = query.where(eq(documents.offerId, entityId));
      } else if (entityType === 'project') {
        query = query.where(eq(documents.projectId, entityId));
      }
      
      const docs = await query;
      logger.info('Documents récupérés par entité', { metadata: {
          service: 'StoragePOC',
          operation: 'getDocumentsByEntity',
          entityType,
          entityId,
          count: docs.length
              }

            });
      return docs;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document> {
    try {
      const [updatedDocument] = await db.update(documents)
        .set(document)
        .where(eq(documents.id, id))
        .returning();
      
      if (!updatedDocument) {
        throw new AppError(`Document ${id} non trouvé`, 500);
      }
      
      logger.info('Document mis à jour', { metadata: {
          service: 'StoragePOC',
          operation: 'updateDocument',
          documentId: id
              }

            });
      
      return updatedDocument;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    try {
      await db.delete(documents).where(eq(documents.id, id));
      logger.info('Document supprimé', { metadata: {
          service: 'StoragePOC',
          operation: 'deleteDocument',
          documentId: id
              }

            });
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  // ========================================
  // SYNC CONFIG OPERATIONS - CONFIGURATION SYNCHRONISATION ONEDRIVE
  // ========================================

  async getSyncConfig(): Promise<SyncConfig | undefined> {
    try {
      const [config] = await db.select().from(syncConfig).limit(1);
      return config;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async updateSyncConfig(config: Partial<InsertSyncConfig>): Promise<SyncConfig> {
    try {
      const existing = await this.getSyncConfig();
      
      if (!existing) {
        // Créer une nouvelle config si elle n'existe pas
        const [newConfig] = await db.insert(syncConfig).values(config as InsertSyncConfig).returning();
        logger.info('Sync config créée', { metadata: {
            service: 'StoragePOC',
            operation: 'updateSyncConfig'
              }

            });
        return newConfig;
      }

      const [updatedConfig] = await db
        .update(syncConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(syncConfig.id, existing.id))
        .returning();

      logger.info('Sync config mise à jour', { metadata: {
          service: 'StoragePOC',
          operation: 'updateSyncConfig',
          configId: existing.id
              }

            });

      return updatedConfig;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER QUOTE ANALYSIS OPERATIONS - ANALYSE OCR DES DEVIS
  // ========================================

  async getSupplierQuoteAnalyses(documentId?: string, sessionId?: string): Promise<(SupplierQuoteAnalysis & { document?: SupplierDocument; reviewedByUser?: User })[]> {
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async getSupplierQuoteAnalysis(id: string): Promise<(SupplierQuoteAnalysis & { document?: SupplierDocument; reviewedByUser?: User }) | undefined> {
    try {
      const [analysis] = await db.select().from(supplierQuoteAnalysis).where(eq(supplierQuoteAnalysis.id, id));
      return analysis;
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  // ========================================
  // WAVE 8 - ADDITIONAL SUPPLIER QUOTE ANALYSIS METHODS
  // ========================================

  /**
   * Get supplier quote analyses by session with advanced filters
   * TODO: Phase 6+ implementation - enhance with proper filtering and ordering
   */
  async getSupplierQuoteAnalysesBySession(
    sessionId: string,
    filters: {
      status?: string;
      includeRawText?: boolean;
      orderBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<SupplierQuoteAnalysis[]> {
    logger.warn('[Storage] getSupplierQuoteAnalysesBySession not yet fully implemented', { metadata: { sessionId, filters 
              }
 
            });
    
    try {
      // Basic implementation - get analyses by session
      const analyses = await db.select()
        .from(supplierQuoteAnalysis)
        .where(eq(supplierQuoteAnalysis.sessionId, sessionId));
      
      // TODO: Phase 6+ - Add proper filtering by status
      // TODO: Phase 6+ - Add raw text inclusion control
      // TODO: Phase 6+ - Add proper ordering support
      
      return analyses || [];
    
        } catch (error) {
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
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
      logger.error('Erreur', { metadata: {
          error: error instanceof Error ? error.message : String(error)
              }

            });
      throw error;
    }
  }

  async transaction<T>(
    callback: (tx: DrizzleTransaction) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    return withTransaction(callback, options);
  }
}

// ========================================
// EXPORT STORAGE INSTANCE
// ========================================

// Note: MemStorage class has been commented out as it's not being used
// All storage operations use DatabaseStorage instead

// Export storage instance - use DatabaseStorage
export const storage: IStorage = new DatabaseStorage();

// FORCE: Assurer que les méthodes SQL d'agrégation sont disponibles sur l'instance
logger.info('[STORAGE-POC] Module-level code executing - checking SQL aggregation methods...');
const dbStorage = storage as unknown as Record<string, unknown>;
logger.info('[STORAGE-POC] Methods check:', {
  hasGetProjectStats: !!dbStorage.getProjectStats,
  hasGetOfferStats: !!dbStorage.getOfferStats,
  hasGetConversionStats: !!dbStorage.getConversionStats,
  hasGetAOStats: !!dbStorage.getAOStats,
  hasGetProjectDelayStats: !!dbStorage.getProjectDelayStats,
  hasGetTeamPerformanceStats: !!dbStorage.getTeamPerformanceStats
});
if (!dbStorage.getProjectStats || !dbStorage.getOfferStats || !dbStorage.getConversionStats || 
    !dbStorage.getAOStats || !dbStorage.getProjectDelayStats || !dbStorage.getTeamPerformanceStats) {
  logger.error('CRITICAL FIX: Méthodes SQL d\'agrégation manquantes sur instance', {
    metadata: {
      service: 'StoragePOC',
      operation: 'criticalFixSQLAggregations',
      missing: {
        getProjectStats: !dbStorage.getProjectStats,
        getOfferStats: !dbStorage.getOfferStats,
        getConversionStats: !dbStorage.getConversionStats,
        getAOStats: !dbStorage.getAOStats,
        getProjectDelayStats: !dbStorage.getProjectDelayStats,
        getTeamPerformanceStats: !dbStorage.getTeamPerformanceStats
      }
                                                                            }
                                                                          });
  
  // Bind all SQL aggregation methods from DatabaseStorage prototype
  const proto = DatabaseStorage.prototype as unknown as Record<string, unknown>;
  if (proto.getProjectStats) dbStorage.getProjectStats = proto.getProjectStats.bind(storage);
  if (proto.getOfferStats) dbStorage.getOfferStats = proto.getOfferStats.bind(storage);
  if (proto.getConversionStats) dbStorage.getConversionStats = proto.getConversionStats.bind(storage);
  if (proto.getAOStats) dbStorage.getAOStats = proto.getAOStats.bind(storage);
  if (proto.getProjectDelayStats) dbStorage.getProjectDelayStats = proto.getProjectDelayStats.bind(storage);
  if (proto.getTeamPerformanceStats) dbStorage.getTeamPerformanceStats = proto.getTeamPerformanceStats.bind(storage);
  
  logger.info('CRITICAL FIX: Méthodes SQL d\'agrégation ajoutées avec succès', {
    metadata: {
      service: 'StoragePOC',
      operation: 'criticalFixSQLAggregations',
      added: {
        getProjectStats: !!dbStorage.getProjectStats,
        getOfferStats: !!dbStorage.getOfferStats,
        getConversionStats: !!dbStorage.getConversionStats,
        getAOStats: !!dbStorage.getAOStats,
        getProjectDelayStats: !!dbStorage.getProjectDelayStats,
        getTeamPerformanceStats: !!dbStorage.getTeamPerformanceStats
      }
                                                                            }
                                                                          });
}