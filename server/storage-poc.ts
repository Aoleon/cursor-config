import { eq, desc, and, sql, gte, lte, count, sum, avg, ne, ilike } from "drizzle-orm";
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
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
      return withErrorHandling(
        async () => {
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
        },
        {
          operation: 'upsertUser',
          service: 'storage-poc',
          metadata: {}
        }
      );
    }, {
      retries: 2,
      service: 'StoragePOC',
      operation: 'upsertUser',
      logQuery: true
    });
  }

      const offerResults = await db
        .select({
          id: offers.id,
          reference: offers.reference,
          client: offers.client,
          location: offers.location,
          intitule_operation: offers.intituleOperation,
          montant_estime: offers.montantEstime,
          menuiserie_type: offers.menuiserieType,
          status: offers.status,
          created_at: offers.createdAt,
          updated_at: offers.updatedAt,
          departement: offers.departement,
          date_limite_remise: offers.dateLimiteRemise,
          source_type: sql<string>`'offer'`.as('source_type'),
          responsible_user_id: offers.responsibleUserId,
          montant_final: offers.montantFinal,
          taux_marge: offers.tauxMarge,
          ao_id: offers.aoId
        })
        .from(offers)
        .where(
          and(
            statusValue ? eq(offers.status, statusValue as typeof offerStatusEnum.enumValues[number]) : undefined,
            searchTerm
              ? sql`(
                ${offers.intituleOperation} ILIKE ${searchTerm} OR
                ${offers.client} ILIKE ${searchTerm} OR
                ${offers.reference} ILIKE ${searchTerm}
              )`
              : undefined
          )
        );

      // Defensive check - ensure offerResults is an array
      if (!Array.isArray(offerResults)) {
        logger.error('[Offers] offerResults is not an array', {
          metadata: {
            service: 'StoragePOC',
            operation: 'getCombinedOffersPaginated',
            offerResultsType: typeof offerResults,
            offerResults
          }
        });
        throw new AppError('Offer query did not return an array', 500);
      }

      logger.info('[Offers] Query results fetched', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getCombinedOffersPaginated',
          aoCount: aoResults.length,
          offerCount: offerResults.length
        }
      });

      const combined = [...aoResults, ...offerResults]
        .sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        })
        .slice(actualOffset, actualOffset + actualLimit);

      const total = aoResults.length + offerResults.length;

      logger.info('[Offers] Combined and sorted results', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getCombinedOffersPaginated',
          combinedCount: combined.length,
          total
        }
      });

      const items = await Promise.all(
        combined.map(async (row: { id: string; reference: string | null; client: string | null; location: string | null; intitule_operation: string | null; montant_estime: number | null; menuiserie_type: string | null; status: string | null; created_at: Date | null; updated_at: Date | null; departement: string | null; date_limite_remise: Date | null; source_type: string }) => {
          return withErrorHandling(
            async () => {
              const item: {
                id: string;
                reference: string | null;
                client: string | null;
                location: string | null;
                intituleOperation: string | null;
                montantEstime: number | null;
                menuiserieType: string | null;
                status: string | null;
                createdAt: Date | null;
                updatedAt: Date | null;
                departement: string | null;
                dateLimiteRemise: Date | null;
                sourceType: string;
              } = {
              id: row.id,
              reference: row.reference,
              client: row.client,
              location: row.location,
              intituleOperation: row.intitule_operation,
              montantEstime: row.montant_estime,
              menuiserieType: row.menuiserie_type,
              status: row.status,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              departement: row.departement,
              dateLimiteRemise: row.date_limite_remise,
              deadline: row.date_limite_remise,
              montantFinal: row.montant_final,
              tauxMarge: row.taux_marge,
              aoId: row.ao_id,
              responsibleUserId: row.responsible_user_id,
              sourceType: row.source_type
            };

            if (row.responsible_user_id) {
              item.responsibleUser = await this.getUser(row.responsible_user_id);
            }

            if (row.ao_id) {
              item.ao = await this.getAo(row.ao_id);
            }

            return item;
          
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
            });
            // Return a minimal item to prevent Promise.all from failing
            return {
              id: row?.id || 'unknown',
              reference: row?.reference || 'N/A',
              client: row?.client || 'N/A',
              location: row?.location || '',
              intituleOperation: row?.intitule_operation || '',
              montantEstime: row?.montant_estime || null,
              menuiserieType: row?.menuiserie_type || null,
              status: row?.status || 'unknown',
              createdAt: row?.created_at || new Date(),
              updatedAt: row?.updated_at || new Date(),
              departement: row?.departement || null,
              dateLimiteRemise: row?.date_limite_remise || null,
              deadline: row?.date_limite_remise || null,
              montantFinal: row?.montant_final || null,
              tauxMarge: row?.taux_marge || null,
              aoId: row?.ao_id || null,
              responsibleUserId: row?.responsible_user_id || null,
              sourceType: row?.source_type || 'offer'
            };
          }
        })
      );

      logger.info('[Offers] AOs et Offres combinés retournés', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getCombinedOffersPaginated',
          count: items.length,
          total,
          limit: actualLimit,
          offset: actualOffset,
          search,
          status
        }
      });

      return { items, total };
    } catch (error) {
      logger.error('[Offers] Critical error in getCombinedOffersPaginated', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getCombinedOffersPaginated',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          search,
          status,
          limit,
          offset
        }
      });
      // Return empty result instead of throwing to prevent 500 errors
      return { items: [], total: 0 };
    }
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
        return withErrorHandling(
    async () => {

          // Importer le service Batigest de façon dynamique pour éviter les imports circulaires
          const { batigestService } = await import('./batigestService');
          
          // OPTIMISATION: Use SQL query to find project by offerId instead of loading 375 projects
          const relatedProjects = await db
            .select()
            .from(projects)
            .where(eq(projects.offerId, id))
            .limit(1);
          const relatedProject = relatedProjects[0];
          
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
        
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    let query = db.select().from(projects);
    
    // Filtrage par statut si fourni (DOIT être AVANT orderBy en Drizzle)
    if (status) {
      query = query.where(eq(projects.status, status as typeof projectStatusEnum.enumValues[number]));
    }
    
    // Tri par date de création (DOIT être APRÈS where en Drizzle)
    query = query.orderBy(desc(projects.createdAt));
    
    const baseProjects = await query;
    
    logger.info('[Projects] Base projects récupérés', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getProjects',
        count: baseProjects.length,
        search,
        status
      }
    });

    let filteredProjects = baseProjects;
    
    // Filtrage par recherche si fournie
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredProjects = baseProjects.filter(project =>
        project.name?.toLowerCase().includes(searchLower) ||
        project.client?.toLowerCase().includes(searchLower) ||
        project.location?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower)
      );
      
      logger.info('[Projects] Projets filtrés par recherche', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getProjects',
          count: filteredProjects.length,
          search
        }
      });
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
    
    logger.info('[Projects] Projets enrichis retournés', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getProjects',
        count: result.length
      }
    });

    return result;
  }

  async getProjectsPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ projects: Array<Project & { responsibleUser?: User; offer?: Offer }>, total: number }> {
    const actualLimit = Number(limit) || 20;
    const actualOffset = Number(offset) || 0;

    // Construire les conditions de filtrage
    const conditions = [];
    
    if (status) {
        conditions.push(eq(projects.status, status as typeof projectStatusEnum.enumValues[number]));
    }
    
    if (search && typeof search === 'string') {
      const searchConditions = [
        ilike(projects.name, `%${search}%`),
        ilike(projects.client, `%${search}%`),
        ilike(projects.location, `%${search}%`),
        ilike(projects.description, `%${search}%`)
      ];
      conditions.push(sql`(${sql.join(searchConditions, sql` OR `)})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Query COUNT pour le total (avec les mêmes filtres)
    const [countResult] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(projects)
      .where(whereClause);
    
    const total = countResult?.count || 0;

    // Query principale avec JOINs optimisés
    const projectsWithRelations = await db
      .select({
        project: projects,
        responsibleUser: users,
        offer: offers
      })
      .from(projects)
      .leftJoin(users, eq(projects.responsibleUserId, users.id))
      .leftJoin(offers, eq(projects.offerId, offers.id))
      .where(whereClause)
      .orderBy(desc(projects.createdAt))
      .limit(actualLimit)
      .offset(actualOffset);

    // Mapper les résultats
    const result = projectsWithRelations.map(row => ({
      ...row.project,
      responsibleUser: row.responsibleUser || undefined,
      offer: row.offer || undefined
    }));

    logger.info('[Projects] Projets paginés retournés', {
      metadata: {
        service: 'StoragePOC',
        operation: 'getProjectsPaginated',
        count: result.length,
        total,
        limit: actualLimit,
        offset: actualOffset,
        search,
        status
      }
    });

    return { projects: result, total };
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

  async getProjectByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Project | undefined> {
    const dbInstance = tx || db;
    const [project] = await dbInstance
      .select()
      .from(projects)
      .where(eq(projects.mondayItemId, mondayItemId));
    return project;
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

  // Monday.com Export Tracking
  async updateProjectMondayId(projectId: string, mondayId: string): Promise<void> {
    await safeUpdate('projects', async () => {
      await db
        .update(projects)
        .set({ 
          mondayId: mondayId,
          lastExportedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));
    }, 1, {
      retries: 3,
      service: 'StoragePOC',
      operation: 'updateProjectMondayId'
    });
  }

  async updateAOMondayId(aoId: string, mondayId: string): Promise<void> {
    await safeUpdate('aos', async () => {
      await db
        .update(aos)
        .set({ 
          mondayId: mondayId,
          lastExportedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(aos.id, aoId));
    }, 1, {
      retries: 3,
      service: 'StoragePOC',
      operation: 'updateAOMondayId'
    });
  }

  async getProjectsToExport(limit: number = 100): Promise<Project[]> {
    return safeQuery('projects', async () => {
      const projectsToExport = await db
        .select()
        .from(projects)
        .where(sql`${projects.mondayId} IS NULL`)
        .limit(limit);
      return projectsToExport;
    }, {
      service: 'StoragePOC',
      operation: 'getProjectsToExport'
    });
  }

  async getAOsToExport(limit: number = 100): Promise<Ao[]> {
    return safeQuery('aos', async () => {
      const aosToExport = await db
        .select()
        .from(aos)
        .where(sql`${aos.mondayId} IS NULL`)
        .limit(limit);
      return aosToExport;
    }, {
      service: 'StoragePOC',
      operation: 'getAOsToExport'
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
        conditions.push(eq(suppliers.status, status as string));
      }
      
      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
      }
    }
    
    return await query.orderBy(desc(suppliers.createdAt));
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return result[0];
  }

  async getSupplierByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Supplier | undefined> {
    const dbInstance = tx || db;
    const [supplier] = await dbInstance
      .select()
      .from(suppliers)
      .where(eq(suppliers.mondayItemId, mondayItemId));
    return supplier;
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
  // OPTIMIZED: Delegated to KpiRepository with single-query CTE approach (1 query vs 132)
  // OLD IMPLEMENTATION (N+1 problem - 132 queries) removed, available in Git history
  async getConsolidatedKpis(params: {
    from: string;
    to: string;
    granularity: 'day' | 'week';
    segment?: string;
  }): Promise<ConsolidatedKpis> {
    // Delegate to optimized KpiRepository with single-query CTE approach
    // Performance: 132 queries → 1 query (90%+ improvement expected with real data)
    return await this.kpiRepository.getConsolidatedKpis(params);
  }

  /**
   * Get KPI query performance statistics for monitoring
   * Exposes metrics for health endpoint integration
   */
  getKpiPerformanceStats() {
    return this.kpiRepository.getPerformanceStats();
  }

  // Chiffrage Elements operations - Module de chiffrage POC
  async getChiffrageElementsByOffer(offerId: string): Promise<ChiffrageElement[]> {
    return await db.select().from(chiffrageElements)
      .where(eq(chiffrageElements.offerId, offerId))
      .orderBy(chiffrageElements.position, chiffrageElements.createdAt);
  }

  async getChiffrageElementsByLot(lotId: string): Promise<ChiffrageElement[]> {
    return await db.select().from(chiffrageElements)
      .where(eq(chiffrageElements.lotId, lotId))
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
  async getAoLots(aoId: string, tx?: DrizzleTransaction): Promise<AoLot[]> {
    const dbInstance = tx || db;
    return await dbInstance.select().from(aoLots)
      .where(eq(aoLots.aoId, aoId))
      .orderBy(aoLots.numero);
  }

  async createAoLot(lot: InsertAoLot, tx?: DrizzleTransaction): Promise<AoLot> {
    const dbInstance = tx || db;
    const [newLot] = await dbInstance.insert(aoLots).values(lot).returning();
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

  // Contact deduplication methods
  async findOrCreateMaitreOuvrage(
    data: ExtractedContactData,
    tx?: DrizzleTransaction
  ): Promise<ContactLinkResult> {
    return contactService.findOrCreateContact(
      { ...data, role: 'maitre_ouvrage' },
      tx
    );
  }

  async findOrCreateMaitreOeuvre(
    data: ExtractedContactData,
    tx?: DrizzleTransaction
  ): Promise<ContactLinkResult> {
    return contactService.findOrCreateContact(
      { ...data, role: 'maitre_oeuvre' },
      tx
    );
  }

  // Individual contacts deduplication
  async findOrCreateContact(
    data: IndividualContactData,
    tx?: DrizzleTransaction
  ): Promise<IndividualContactResult> {
    return contactService.findOrCreateIndividualContact(data, tx);
  }

  /**
   * Lie un contact à un AO via aoContacts
   * Utilise l'index unique (ao_id, contact_id, link_type) pour idempotence
   */
  async linkAoContact(
    params: { aoId: string; contactId: string; linkType: string },
    tx?: DrizzleTransaction
  ): Promise<AoContacts | null> {
    const dbInstance = tx || db;
    
    return withErrorHandling(
    async () => {

      // Vérifier si le lien existe déjà (idempotence via unique index)
      const existing = await dbInstance
        .select()
        .from(aoContacts)
        .where(
          and(
            eq(aoContacts.ao_id, params.aoId),
            eq(aoContacts.contact_id, params.contactId),
            eq(aoContacts.link_type, params.linkType as typeof contactLinkTypeEnum.enumValues[number])
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        logger.debug('Lien AO-Contact déjà existant', {
          service: 'Storage',
          metadata: {
            aoId: params.aoId,
            contactId: params.contactId,
            linkType: params.linkType
          }
        });
        return existing[0];
      }
      
      // Créer nouveau lien
      const [newLink] = await dbInstance
        .insert(aoContacts)
        .values({
          ao_id: params.aoId,
          contact_id: params.contactId,
          link_type: params.linkType as any
        })
        .returning();
      
      logger.info('Lien AO-Contact créé', {
        service: 'Storage',
        metadata: {
          aoId: params.aoId,
          contactId: params.contactId,
          linkType: params.linkType,
          linkId: newLink.id
        }
      });
      
      return newLink;
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
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
      throw new AppError('Le seuil doit être entre 0 et 50', 500);
    }
    
    for (const [critere, poids] of Object.entries(config.weights)) {
      if (poids < 0 || poids > 10) {
        throw new AppError(`Le poids pour ${critere} doit être entre 0 et 10`, 500);
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
      throw new AppError(`Alerte technique ${id} introuvable`, 500);
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
      throw new AppError(`Alerte technique ${id} introuvable`, 500);
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
      throw new AppError(`Timeline ${id} non trouvée`, 500);
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
      throw new AppError(`Timeline ${id} non trouvée`, 500);
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
      throw new AppError(`Règle ${id} non trouvée`, 500);
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
      throw new AppError(`Règle ${id} non trouvée`, 500);
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
      throw new AppError(`Alerte ${id} non trouvée`, 500);
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
      throw new AppError(`Alerte ${id} non trouvée`, 500);
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
          eq(businessMetrics.metricType, metricType as 'conversion' | 'delay' | 'revenue' | 'team_load' | 'margin'),
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async saveForecastSnapshot(forecast: {
    forecast_data: Record<string, unknown>;
    generated_at: string;
    params: Record<string, unknown>;
  }): Promise<string> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getAnalyticsSnapshots(params?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    return withErrorHandling(
    async () => {

      logger.info('Récupération snapshots analytics', {
        metadata: {
          service: 'DatabaseStorage',
          operation: 'getAnalyticsSnapshots',
          params
        }
      });
      return [];
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createAnalyticsSnapshot(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER QUOTE SESSIONS OPERATIONS - WORKFLOW FOURNISSEURS
  // ========================================

  async getSupplierQuoteSessions(aoId?: string, aoLotId?: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot })[]> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getSupplierQuoteSession(id: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot }) | undefined> {
    return withErrorHandling(
    async () => {

      const [session] = await db.select().from(supplierQuoteSessions).where(eq(supplierQuoteSessions.id, id));
      return session;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getSupplierQuoteSessionByToken(token: string): Promise<(SupplierQuoteSession & { supplier?: Supplier; aoLot?: AoLot }) | undefined> {
    return withErrorHandling(
    async () => {

      const [session] = await db.select().from(supplierQuoteSessions).where(eq(supplierQuoteSessions.accessToken, token));
      return session;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createSupplierQuoteSession(session: InsertSupplierQuoteSession): Promise<SupplierQuoteSession> {
    return withErrorHandling(
    async () => {

      const [newSession] = await db.insert(supplierQuoteSessions).values(session).returning();
      logger.info(`Session fournisseur créée: ${newSession.id}`);
      return newSession;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateSupplierQuoteSession(id: string, session: Partial<InsertSupplierQuoteSession>): Promise<SupplierQuoteSession> {
    return withErrorHandling(
    async () => {

      const [updatedSession] = await db.update(supplierQuoteSessions)
        .set({ ...session, updatedAt: new Date() })
        .where(eq(supplierQuoteSessions.id, id))
        .returning();
      logger.info(`Session fournisseur mise à jour: ${id}`);
      return updatedSession;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteSupplierQuoteSession(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(supplierQuoteSessions).where(eq(supplierQuoteSessions.id, id));
      logger.info(`Session fournisseur supprimée: ${id}`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

      const lotSuppliers = await db.select().from(aoLotSuppliers).where(eq(aoLotSuppliers.aoLotId, aoLotId));
      logger.info(`Récupération de ${lotSuppliers.length} fournisseurs pour le lot ${aoLotId}`);
      return lotSuppliers;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getAoLotSupplier(id: string): Promise<(AoLotSupplier & { supplier?: Supplier; selectedByUser?: User }) | undefined> {
    return withErrorHandling(
    async () => {

      const [lotSupplier] = await db.select().from(aoLotSuppliers).where(eq(aoLotSuppliers.id, id));
      return lotSupplier;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createAoLotSupplier(lotSupplier: InsertAoLotSupplier): Promise<AoLotSupplier> {
    return withErrorHandling(
    async () => {

      const [newLotSupplier] = await db.insert(aoLotSuppliers).values(lotSupplier).returning();
      logger.info(`Association lot-fournisseur créée: ${newLotSupplier.id}`);
      return newLotSupplier;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateAoLotSupplier(id: string, lotSupplier: Partial<InsertAoLotSupplier>): Promise<AoLotSupplier> {
    return withErrorHandling(
    async () => {

      const [updatedLotSupplier] = await db.update(aoLotSuppliers)
        .set({ ...lotSupplier, updatedAt: new Date() })
        .where(eq(aoLotSuppliers.id, id))
        .returning();
      logger.info(`Association lot-fournisseur mise à jour: ${id}`);
      return updatedLotSupplier;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteAoLotSupplier(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(aoLotSuppliers).where(eq(aoLotSuppliers.id, id));
      logger.info(`Association lot-fournisseur supprimée: ${id}`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getSuppliersByLot(aoLotId: string): Promise<Supplier[]> {
    return withErrorHandling(
    async () => {

      // Cette méthode devrait faire une jointure pour récupérer les détails des fournisseurs
      // Pour l'instant, on retourne les associations basiques
      const associations = await this.getAoLotSuppliers(aoLotId);
      return associations;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER DOCUMENTS OPERATIONS - GESTION DOCUMENTS FOURNISSEURS
  // ========================================

  async getSupplierDocuments(sessionId?: string, supplierId?: string): Promise<(SupplierDocument & { session?: SupplierQuoteSession; validatedByUser?: User })[]> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getSupplierDocument(id: string): Promise<(SupplierDocument & { session?: SupplierQuoteSession; validatedByUser?: User }) | undefined> {
    return withErrorHandling(
    async () => {

      const [document] = await db.select().from(supplierDocuments).where(eq(supplierDocuments.id, id));
      return document;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createSupplierDocument(document: InsertSupplierDocument): Promise<SupplierDocument> {
    return withErrorHandling(
    async () => {

      const [newDocument] = await db.insert(supplierDocuments).values(document).returning();
      logger.info(`Document fournisseur créé: ${newDocument.id}`);
      return newDocument;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateSupplierDocument(id: string, document: Partial<InsertSupplierDocument>): Promise<SupplierDocument> {
    return withErrorHandling(
    async () => {

      const [updatedDocument] = await db.update(supplierDocuments)
        .set({ ...document, updatedAt: new Date() })
        .where(eq(supplierDocuments.id, id))
        .returning();
      logger.info(`Document fournisseur mis à jour: ${id}`);
      return updatedDocument;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteSupplierDocument(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(supplierDocuments).where(eq(supplierDocuments.id, id));
      logger.info(`Document fournisseur supprimé: ${id}`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getDocumentsBySession(sessionId: string): Promise<SupplierDocument[]> {
    return withErrorHandling(
    async () => {

      const documents = await db.select().from(supplierDocuments).where(eq(supplierDocuments.sessionId, sessionId));
      logger.info(`Récupération de ${documents.length} documents pour la session ${sessionId}`);
      return documents;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // DOCUMENTS OPERATIONS - Gestion centralisée des documents (OneDrive sync)
  // ========================================

  async createDocument(document: InsertDocument): Promise<Document> {
    return withErrorHandling(
    async () => {

      const [newDocument] = await db.insert(documents).values(document).returning();
      logger.info('Document créé', {
        metadata: {
          service: 'StoragePOC',
          operation: 'createDocument',
          documentId: newDocument.id,
          fileName: document.name,
          oneDriveId: document.oneDriveId
        }
      });
      return newDocument;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return withErrorHandling(
    async () => {

      const [document] = await db.select().from(documents).where(eq(documents.id, id));
      return document;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getDocumentsByEntity(entityType: string, entityId: string): Promise<Document[]> {
    return withErrorHandling(
    async () => {

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
      logger.info('Documents récupérés par entité', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getDocumentsByEntity',
          entityType,
          entityId,
          count: docs.length
        }
      });
      return docs;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document> {
    return withErrorHandling(
    async () => {

      const [updatedDocument] = await db.update(documents)
        .set(document)
        .where(eq(documents.id, id))
        .returning();
      
      if (!updatedDocument) {
        throw new AppError(`Document ${id} non trouvé`, 500);
      }
      
      logger.info('Document mis à jour', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateDocument',
          documentId: id
        }
      });
      
      return updatedDocument;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteDocument(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(documents).where(eq(documents.id, id));
      logger.info('Document supprimé', {
        metadata: {
          service: 'StoragePOC',
          operation: 'deleteDocument',
          documentId: id
        }
      });
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // SYNC CONFIG OPERATIONS - CONFIGURATION SYNCHRONISATION ONEDRIVE
  // ========================================

  async getSyncConfig(): Promise<SyncConfig | undefined> {
    return withErrorHandling(
    async () => {

      const [config] = await db.select().from(syncConfig).limit(1);
      return config;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateSyncConfig(config: Partial<InsertSyncConfig>): Promise<SyncConfig> {
    return withErrorHandling(
    async () => {

      const existing = await this.getSyncConfig();
      
      if (!existing) {
        // Créer une nouvelle config si elle n'existe pas
        const [newConfig] = await db.insert(syncConfig).values(config as InsertSyncConfig).returning();
        logger.info('Sync config créée', {
          metadata: {
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

      logger.info('Sync config mise à jour', {
        metadata: {
          service: 'StoragePOC',
          operation: 'updateSyncConfig',
          configId: existing.id
        }
      });

      return updatedConfig;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // SUPPLIER QUOTE ANALYSIS OPERATIONS - ANALYSE OCR DES DEVIS
  // ========================================

  async getSupplierQuoteAnalyses(documentId?: string, sessionId?: string): Promise<(SupplierQuoteAnalysis & { document?: SupplierDocument; reviewedByUser?: User })[]> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getSupplierQuoteAnalysis(id: string): Promise<(SupplierQuoteAnalysis & { document?: SupplierDocument; reviewedByUser?: User }) | undefined> {
    return withErrorHandling(
    async () => {

      const [analysis] = await db.select().from(supplierQuoteAnalysis).where(eq(supplierQuoteAnalysis.id, id));
      return analysis;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createSupplierQuoteAnalysis(analysis: InsertSupplierQuoteAnalysis): Promise<SupplierQuoteAnalysis> {
    return withErrorHandling(
    async () => {

      const [newAnalysis] = await db.insert(supplierQuoteAnalysis).values(analysis).returning();
      logger.info(`Analyse OCR créée: ${newAnalysis.id}`);
      return newAnalysis;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateSupplierQuoteAnalysis(id: string, analysis: Partial<InsertSupplierQuoteAnalysis>): Promise<SupplierQuoteAnalysis> {
    return withErrorHandling(
    async () => {

      const [updatedAnalysis] = await db.update(supplierQuoteAnalysis)
        .set({ ...analysis, updatedAt: new Date() })
        .where(eq(supplierQuoteAnalysis.id, id))
        .returning();
      logger.info(`Analyse OCR mise à jour: ${id}`);
      return updatedAnalysis;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteSupplierQuoteAnalysis(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(supplierQuoteAnalysis).where(eq(supplierQuoteAnalysis.id, id));
      logger.info(`Analyse OCR supprimée: ${id}`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getAnalysisByDocument(documentId: string): Promise<SupplierQuoteAnalysis | undefined> {
    return withErrorHandling(
    async () => {

      const [analysis] = await db.select().from(supplierQuoteAnalysis).where(eq(supplierQuoteAnalysis.documentId, documentId));
      return analysis;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    logger.warn('[Storage] getSupplierQuoteAnalysesBySession not yet fully implemented', {
      metadata: { sessionId, filters }
    });
    
    return withErrorHandling(
    async () => {

      // Basic implementation - get analyses by session
      const analyses = await db.select()
        .from(supplierQuoteAnalysis)
        .where(eq(supplierQuoteAnalysis.sessionId, sessionId));
      
      // TODO: Phase 6+ - Add proper filtering by status
      // TODO: Phase 6+ - Add raw text inclusion control
      // TODO: Phase 6+ - Add proper ordering support
      
      return analyses || [];
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return []; // Safe default - empty array
    }
  }

  /**
   * Get all documents for a specific quote session
   * TODO: Phase 6+ implementation - enhance with document metadata and relationships
   */
  async getSupplierDocumentsBySession(sessionId: string): Promise<SupplierDocument[]> {
    logger.warn('[Storage] getSupplierDocumentsBySession stub called - using getDocumentsBySession', {
      metadata: { sessionId }
    });
    
    return withErrorHandling(
    async () => {

      // Delegate to existing method
      return await this.getDocumentsBySession(sessionId);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return []; // Safe default - empty array
    }
  }

  /**
   * Create analysis note history entry
   * TODO: Phase 6+ implementation - add proper note history table and tracking
   */
  async createAnalysisNoteHistory(data: {
    analysisId: string;
    notes: string;
    timestamp: Date;
    isInternal?: boolean;
    createdBy?: string;
  }): Promise<Record<string, unknown>> {
    logger.warn('[Storage] createAnalysisNoteHistory not yet implemented - returning stub', {
      metadata: { analysisId: data.analysisId, notesLength: data.notes.length }
    });
    
    // TODO: Phase 6+ - Create proper analysis_note_history table
    // TODO: Phase 6+ - Store note history with proper relationships
    
    // Return safe stub - simulate created record
    const stubRecord = {
      id: `note-stub-${Date.now()}`,
      ...data,
      createdAt: new Date()
    };
    
    logger.info('[Storage] Analysis note history stub created', {
      metadata: { stubId: stubRecord.id, analysisId: data.analysisId }
    });
    
    return stubRecord;
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
// CLASSE MEMSTORAGE AVEC DONNÉES MOCK RÉALISTES - PHASE 3.1.6.2
// ========================================

export class MemStorage implements IStorage {
  // Propriétés requises pour interface IStorage
  private db: unknown = null; // Mock database reference
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
  // TOUTES LES AUTRES MÉTHODES ISTORAGE - MOCK BASIQUE
  // ========================================
  
  // Note: Pour les besoins de ce POC, les autres méthodes retournent des données mock basiques
  // ou délèguent vers DatabaseStorage selon les besoins

  // User methods implemented in DatabaseStorage class

  async getAos(): Promise<Ao[]> {
    return [];
  }

  async getAOsPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ aos: Array<Ao>, total: number }> {
    return { aos: [], total: 0 };
  }

  async getAo(id: string, tx?: DrizzleTransaction): Promise<Ao | undefined> {
    return undefined;
  }

  async getAOByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Ao | undefined> {
    return undefined;
  }

  async createAo(ao: InsertAo, tx?: DrizzleTransaction): Promise<Ao> {
    throw new AppError("MemStorage: createAo not implemented for POC", 500);
  }

  async updateAo(id: string, ao: Partial<InsertAo>, tx?: DrizzleTransaction): Promise<Ao> {
    throw new AppError("MemStorage: updateAo not implemented for POC", 500);
  }

  async deleteAo(id: string, tx?: DrizzleTransaction): Promise<void> {
    throw new AppError("MemStorage: deleteAo not implemented for POC", 500);
  }

  async getOffers(search?: string, status?: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao })[]> {
    return [];
  }

  async getOffersPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ offers: Array<Offer & { responsibleUser?: User; ao?: Ao }>, total: number }> {
    return { offers: [], total: 0 };
  }

  async getCombinedOffersPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ items: Array<(Ao | Offer) & { responsibleUser?: User; ao?: Ao; sourceType: 'ao' | 'offer' }>, total: number }> {
    return { items: [], total: 0 };
  }

  async getOffer(id: string): Promise<(Offer & { responsibleUser?: User; ao?: Ao }) | undefined> {
    return undefined;
  }

  async createOffer(offer: InsertOffer): Promise<Offer> {
    throw new AppError("MemStorage: createOffer not implemented for POC", 500);
  }

  async updateOffer(id: string, offer: Partial<InsertOffer>): Promise<Offer> {
    throw new AppError("MemStorage: updateOffer not implemented for POC", 500);
  }

  async deleteOffer(id: string): Promise<void> {
    throw new AppError("MemStorage: deleteOffer not implemented for POC", 500);
  }

  async getProjects(search?: string, status?: string): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]> {
    return [];
  }

  async getProjectsPaginated(search?: string, status?: string, limit?: number, offset?: number): Promise<{ projects: Array<Project & { responsibleUser?: User; offer?: Offer }>, total: number }> {
    return { projects: [], total: 0 };
  }

  async getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined> {
    return undefined;
  }

  async getProjectByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Project | undefined> {
    return undefined;
  }

  async createProject(project: InsertProject): Promise<Project> {
    throw new AppError("MemStorage: createProject not implemented for POC", 500);
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    throw new AppError("MemStorage: updateProject not implemented for POC", 500);
  }

  async getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]> {
    return [];
  }

  async getAllTasks(): Promise<(ProjectTask & { assignedUser?: User })[]> {
    return [];
  }

  async createProjectTask(task: InsertProjectTask): Promise<ProjectTask> {
    throw new AppError("MemStorage: createProjectTask not implemented for POC", 500);
  }

  async updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask> {
    throw new AppError("MemStorage: updateProjectTask not implemented for POC", 500);
  }

  // MemStorage pour Suppliers - Implémentation complète pour tests/dev
  private suppliers: Map<string, Supplier> = new Map();
  private supplierIdCounter = 1;

  async getSuppliers(search?: string, status?: string): Promise<Supplier[]> {
    let suppliers = Array.from(this.suppliers.values());
    
    // Filtrage par recherche (nom)
    if (search && typeof search === 'string') {
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

  async getSupplierByMondayItemId(mondayItemId: string, tx?: DrizzleTransaction): Promise<Supplier | undefined> {
    return Array.from(this.suppliers.values()).find(s => s.mondayItemId === mondayItemId);
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
      throw new AppError(`Supplier avec ID ${id} introuvable`, 500);
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
      throw new AppError(`Supplier avec ID ${id} introuvable`, 500);
    }
    
    this.suppliers.delete(id);
    logger.info(`MemStorage: Supplier supprimé avec succès`, { id, name: existing.name });
  }

  async getSupplierRequests(offerId?: string): Promise<SupplierRequest[]> {
    return [];
  }

  async createSupplierRequest(request: InsertSupplierRequest): Promise<SupplierRequest> {
    throw new AppError("MemStorage: createSupplierRequest not implemented for POC", 500);
  }

  async updateSupplierRequest(id: string, request: Partial<InsertSupplierRequest>): Promise<SupplierRequest> {
    throw new AppError("MemStorage: updateSupplierRequest not implemented for POC", 500);
  }

  async getTeamResources(projectId?: string): Promise<(TeamResource & { user?: User })[]> {
    return [];
  }

  async createTeamResource(resource: InsertTeamResource): Promise<TeamResource> {
    throw new AppError("MemStorage: createTeamResource not implemented for POC", 500);
  }

  async updateTeamResource(id: string, resource: Partial<InsertTeamResource>): Promise<TeamResource> {
    throw new AppError("MemStorage: updateTeamResource not implemented for POC", 500);
  }

  async getBeWorkload(weekNumber?: number, year?: number): Promise<(BeWorkload & { user?: User })[]> {
    return [];
  }

  async createOrUpdateBeWorkload(workload: InsertBeWorkload): Promise<BeWorkload> {
    throw new AppError("MemStorage: createOrUpdateBeWorkload not implemented for POC", 500);
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
    throw new AppError("MemStorage: getConsolidatedKpis not implemented for POC", 500);
  }

  async getChiffrageElementsByOffer(offerId: string): Promise<ChiffrageElement[]> {
    return [];
  }

  async getChiffrageElementsByLot(lotId: string): Promise<ChiffrageElement[]> {
    return [];
  }

  async createChiffrageElement(element: InsertChiffrageElement): Promise<ChiffrageElement> {
    throw new AppError("MemStorage: createChiffrageElement not implemented for POC", 500);
  }

  async updateChiffrageElement(id: string, element: Partial<InsertChiffrageElement>): Promise<ChiffrageElement> {
    throw new AppError("MemStorage: updateChiffrageElement not implemented for POC", 500);
  }

  async deleteChiffrageElement(id: string): Promise<void> {
    throw new AppError("MemStorage: deleteChiffrageElement not implemented for POC", 500);
  }

  async getDpgfDocumentByOffer(offerId: string): Promise<DpgfDocument | null> {
    return null;
  }

  async createDpgfDocument(dpgf: InsertDpgfDocument): Promise<DpgfDocument> {
    throw new AppError("MemStorage: createDpgfDocument not implemented for POC", 500);
  }

  async updateDpgfDocument(id: string, dpgf: Partial<InsertDpgfDocument>): Promise<DpgfDocument> {
    throw new AppError("MemStorage: updateDpgfDocument not implemented for POC", 500);
  }

  async deleteDpgfDocument(id: string): Promise<void> {
    throw new AppError("MemStorage: deleteDpgfDocument not implemented for POC", 500);
  }

  async getAoLots(aoId: string, tx?: DrizzleTransaction): Promise<AoLot[]> {
    return [];
  }

  async createAoLot(lot: InsertAoLot, tx?: DrizzleTransaction): Promise<AoLot> {
    throw new AppError("MemStorage: createAoLot not implemented for POC", 500);
  }

  async updateAoLot(id: string, lot: Partial<InsertAoLot>): Promise<AoLot> {
    throw new AppError("MemStorage: updateAoLot not implemented for POC", 500);
  }

  async deleteAoLot(id: string): Promise<void> {
    throw new AppError("MemStorage: deleteAoLot not implemented for POC", 500);
  }

  async getMaitresOuvrage(): Promise<MaitreOuvrage[]> {
    return [];
  }

  async getMaitreOuvrage(id: string): Promise<MaitreOuvrage | undefined> {
    return undefined;
  }

  async createMaitreOuvrage(maitreOuvrage: InsertMaitreOuvrage): Promise<MaitreOuvrage> {
    throw new AppError("MemStorage: createMaitreOuvrage not implemented for POC", 500);
  }

  async updateMaitreOuvrage(id: string, maitreOuvrage: Partial<InsertMaitreOuvrage>): Promise<MaitreOuvrage> {
    throw new AppError("MemStorage: updateMaitreOuvrage not implemented for POC", 500);
  }

  async deleteMaitreOuvrage(id: string): Promise<void> {
    throw new AppError("MemStorage: deleteMaitreOuvrage not implemented for POC", 500);
  }

  async getMaitresOeuvre(): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] })[]> {
    return [];
  }

  async getMaitreOeuvre(id: string): Promise<(MaitreOeuvre & { contacts?: ContactMaitreOeuvre[] }) | undefined> {
    return undefined;
  }

  async createMaitreOeuvre(maitreOeuvre: InsertMaitreOeuvre): Promise<MaitreOeuvre> {
    throw new AppError("MemStorage: createMaitreOeuvre not implemented for POC", 500);
  }

  async updateMaitreOeuvre(id: string, maitreOeuvre: Partial<InsertMaitreOeuvre>): Promise<MaitreOeuvre> {
    throw new AppError("MemStorage: updateMaitreOeuvre not implemented for POC", 500);
  }

  async deleteMaitreOeuvre(id: string): Promise<void> {
    throw new AppError("MemStorage: deleteMaitreOeuvre not implemented for POC", 500);
  }

  // Contact deduplication methods
  async findOrCreateMaitreOuvrage(
    data: ExtractedContactData,
    tx?: DrizzleTransaction
  ): Promise<ContactLinkResult> {
    logger.info('MemStorage findOrCreateMaitreOuvrage stub', {
      service: 'MemStorage',
      metadata: { nom: data.nom }
    });
    
    // Stub simple pour POC - toujours créer
    const mockEntity: MaitreOuvrage = {
      id: `mo_${Date.now()}`,
      nom: data.nom,
      typeOrganisation: data.typeOrganisation || null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      departement: data.departement as typeof departementEnum.enumValues[number] | null || null,
      telephone: data.telephone || null,
      email: data.email || null,
      siteWeb: data.siteWeb || null,
      siret: data.siret || null,
      contactPrincipalNom: data.contactPrincipalNom || null,
      contactPrincipalPoste: data.contactPrincipalPoste || null,
      contactPrincipalTelephone: data.contactPrincipalTelephone || null,
      contactPrincipalEmail: data.contactPrincipalEmail || null,
      notes: 'MemStorage stub',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      mondayItemId: null,
      totalProjets: 0,
      budgetTotal: null,
      budgetMoyen: null,
      dernierProjet: null
    };
    
    return {
      found: false,
      created: true,
      contact: mockEntity,
      confidence: 1.0,
      reason: 'MemStorage stub - always creates'
    };
  }

  async findOrCreateMaitreOeuvre(
    data: ExtractedContactData,
    tx?: DrizzleTransaction
  ): Promise<ContactLinkResult> {
    logger.info('MemStorage findOrCreateMaitreOeuvre stub', {
      service: 'MemStorage',
      metadata: { nom: data.nom }
    });
    
    // Stub similaire pour maître d'œuvre
    const mockEntity: MaitreOeuvre = {
      id: `moe_${Date.now()}`,
      nom: data.nom,
      typeOrganisation: data.typeOrganisation || null,
      adresse: data.adresse || null,
      codePostal: data.codePostal || null,
      ville: data.ville || null,
      departement: data.departement as typeof departementEnum.enumValues[number] | null || null,
      telephone: data.telephone || null,
      email: data.email || null,
      siteWeb: data.siteWeb || null,
      siret: data.siret || null,
      specialites: data.specialites || null,
      notes: 'MemStorage stub',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      mondayItemId: null,
      totalProjets: 0,
      budgetTotal: null,
      budgetMoyen: null,
      dernierProjet: null
    };
    
    return {
      found: false,
      created: true,
      contact: mockEntity,
      confidence: 1.0,
      reason: 'MemStorage stub - always creates'
    };
  }

  // Individual contacts deduplication stubs
  async findOrCreateContact(
    data: IndividualContactData,
    tx?: DrizzleTransaction
  ): Promise<IndividualContactResult> {
    logger.info('MemStorage findOrCreateContact stub', {
      service: 'MemStorage',
      metadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email
      }
    });
    
    // Stub simple - toujours créer
    const mockContact: Contact = {
      id: `contact_${Date.now()}`,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      company: data.company || null,
      poste: data.poste as string | null || null,
      address: data.address || null,
      notes: 'MemStorage stub',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return {
      found: false,
      created: true,
      contact: mockContact,
      confidence: 1.0,
      reason: 'MemStorage stub - always creates'
    };
  }

  async linkAoContact(
    params: { aoId: string; contactId: string; linkType: string },
    tx?: DrizzleTransaction
  ): Promise<AoContacts | null> {
    logger.info('MemStorage linkAoContact stub', {
      service: 'MemStorage',
      metadata: params
    });
    
    // Stub simple
    const mockLink: AoContacts = {
      id: `aocontact_${Date.now()}`,
      ao_id: params.aoId,
      contact_id: params.contactId,
          link_type: params.linkType as typeof contactLinkTypeEnum.enumValues[number],
      createdAt: new Date()
    };
    
    return mockLink;
  }

  async getContactsMaitreOeuvre(maitreOeuvreId: string): Promise<ContactMaitreOeuvre[]> {
    return [];
  }

  async createContactMaitreOeuvre(contact: InsertContactMaitreOeuvre): Promise<ContactMaitreOeuvre> {
    throw new AppError("MemStorage: createContactMaitreOeuvre not implemented for POC", 500);
  }

  async updateContactMaitreOeuvre(id: string, contact: Partial<InsertContactMaitreOeuvre>): Promise<ContactMaitreOeuvre> {
    throw new AppError("MemStorage: updateContactMaitreOeuvre not implemented for POC", 500);
  }

  async deleteContactMaitreOeuvre(id: string): Promise<void> {
    throw new AppError("MemStorage: deleteContactMaitreOeuvre not implemented for POC", 500);
  }

  async getValidationMilestones(offerId: string): Promise<ValidationMilestone[]> {
    return [];
  }

  async createValidationMilestone(milestone: InsertValidationMilestone): Promise<ValidationMilestone> {
    throw new ValidationError('MemStorage: createValidationMilestone not implemented for POC');
  }

  async updateValidationMilestone(id: string, milestone: Partial<InsertValidationMilestone>): Promise<ValidationMilestone> {
    throw new ValidationError('MemStorage: updateValidationMilestone not implemented for POC');
  }

  async deleteValidationMilestone(id: string): Promise<void> {
    throw new ValidationError('MemStorage: deleteValidationMilestone not implemented for POC');
  }

  async getVisaArchitecte(projectId: string): Promise<VisaArchitecte[]> {
    return [];
  }

  async createVisaArchitecte(visa: InsertVisaArchitecte): Promise<VisaArchitecte> {
    throw new AppError("MemStorage: createVisaArchitecte not implemented for POC", 500);
  }

  async updateVisaArchitecte(id: string, visa: Partial<InsertVisaArchitecte>): Promise<VisaArchitecte> {
    throw new AppError("MemStorage: updateVisaArchitecte not implemented for POC", 500);
  }

  async deleteVisaArchitecte(id: string): Promise<void> {
    throw new AppError("MemStorage: deleteVisaArchitecte not implemented for POC", 500);
  }

  async getOfferById(id: string): Promise<Offer | undefined> {
    return undefined;
  }

  async getProjectsByOffer(offerId: string): Promise<Project[]> {
    return [];
  }

  async getScoringConfig(): Promise<TechnicalScoringConfig> {
    throw new AppError("MemStorage: getScoringConfig not implemented for POC", 500);
  }

  async updateScoringConfig(config: TechnicalScoringConfig): Promise<void> {
    throw new AppError("MemStorage: updateScoringConfig not implemented for POC", 500);
  }

  // ========================================
  // KPI AND ANALYTICS METHODS
  // ========================================

  // ========================================
  // ALERT THRESHOLDS IMPLEMENTATION - PHASE 3.1.7.2
  // ========================================

  async getActiveThresholds(filters?: {
    threshold_key?: ThresholdKey;
    scope_type?: 'global' | 'project' | 'team' | 'period';
    scope_entity_id?: string;
  }): Promise<AlertThreshold[]> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getThresholdById(id: string): Promise<AlertThreshold | null> {
    return withErrorHandling(
    async () => {

      const [result] = await this.db
        .select()
        .from(alertThresholds)
        .where(eq(alertThresholds.id, id));
      
      return result || null;
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createThreshold(data: InsertAlertThreshold): Promise<string> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateThreshold(id: string, data: UpdateAlertThreshold): Promise<boolean> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deactivateThreshold(id: string): Promise<boolean> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // BUSINESS ALERTS STUBS - MemStorage (NOT IMPLEMENTED)
  // ========================================

  async createBusinessAlert(data: InsertBusinessAlert): Promise<string> {
    return `mock-alert-${Date.now()}`;
  }

  async getBusinessAlertById(id: string): Promise<BusinessAlert | null> {
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
  ): Promise<BusinessAlert> {
    throw new AppError("MemStorage: updateBusinessAlertStatus not implemented", 500);
  }

  async findSimilarAlerts(params: {
    entity_type: string;
    entity_id: string;
    alert_type: AlertType;
    hours_window?: number;
  }): Promise<BusinessAlert[]> {
    return [];
  }

  // ========================================
  // IMPLÉMENTATION PHASE 4 - Système de gestion des réserves et SAV
  // ========================================

  // Project Reserves operations - Gestion des réserves projet
  async getProjectReserves(projectId: string): Promise<ProjectReserve[]> {
    return withErrorHandling(
    async () => {

      const results = await this.db
        .select()
        .from(projectReserves)
        .where(eq(projectReserves.projectId, projectId))
        .orderBy(desc(projectReserves.detectedDate));
      
      logger.info(`Récupération de ${results.length} réserves pour le projet ${projectId}`);
      return results;
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getProjectReserve(id: string): Promise<ProjectReserve | undefined> {
    return withErrorHandling(
    async () => {

      const [result] = await this.db
        .select()
        .from(projectReserves)
        .where(eq(projectReserves.id, id));
      
      return result;
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createProjectReserve(reserve: InsertProjectReserve): Promise<ProjectReserve> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateProjectReserve(id: string, reserve: Partial<InsertProjectReserve>): Promise<ProjectReserve> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteProjectReserve(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.db
        .delete(projectReserves)
        .where(eq(projectReserves.id, id));
      
      logger.info(`Réserve ${id} supprimée`);
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // SAV Interventions operations - Gestion des interventions SAV
  async getSavInterventions(projectId: string): Promise<SavIntervention[]> {
    return withErrorHandling(
    async () => {

      const results = await this.db
        .select()
        .from(savInterventions)
        .where(eq(savInterventions.projectId, projectId))
        .orderBy(desc(savInterventions.requestDate));
      
      logger.info(`Récupération de ${results.length} interventions SAV pour le projet ${projectId}`);
      return results;
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getSavIntervention(id: string): Promise<SavIntervention | undefined> {
    return withErrorHandling(
    async () => {

      const [result] = await this.db
        .select()
        .from(savInterventions)
        .where(eq(savInterventions.id, id));
      
      return result;
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createSavIntervention(intervention: InsertSavIntervention): Promise<SavIntervention> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateSavIntervention(id: string, intervention: Partial<InsertSavIntervention>): Promise<SavIntervention> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteSavIntervention(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.db
        .delete(savInterventions)
        .where(eq(savInterventions.id, id));
      
      logger.info(`Intervention SAV ${id} supprimée`);
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // SAV Warranty Claims operations - Gestion des réclamations garantie
  async getSavWarrantyClaims(interventionId: string): Promise<SavWarrantyClaim[]> {
    return withErrorHandling(
    async () => {

      const results = await this.db
        .select()
        .from(savWarrantyClaims)
        .where(eq(savWarrantyClaims.interventionId, interventionId))
        .orderBy(desc(savWarrantyClaims.claimDate));
      
      logger.info(`Récupération de ${results.length} réclamations garantie pour l'intervention ${interventionId}`);
      return results;
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getSavWarrantyClaim(id: string): Promise<SavWarrantyClaim | undefined> {
    return withErrorHandling(
    async () => {

      const [result] = await this.db
        .select()
        .from(savWarrantyClaims)
        .where(eq(savWarrantyClaims.id, id));
      
      return result;
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createSavWarrantyClaim(claim: InsertSavWarrantyClaim): Promise<SavWarrantyClaim> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateSavWarrantyClaim(id: string, claim: Partial<InsertSavWarrantyClaim>): Promise<SavWarrantyClaim> {
    return withErrorHandling(
    async () => {

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
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteSavWarrantyClaim(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.db
        .delete(savWarrantyClaims)
        .where(eq(savWarrantyClaims.id, id));
      
      logger.info(`Réclamation garantie ${id} supprimée`);
      
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // IMPLÉMENTATION MÉTHODES CRUD TABLES MONDAY.COM (CRITIQUE)
  // ========================================

  // Métriques Business operations
  async getMetricsBusiness(entityType?: string, entityId?: string): Promise<MetricsBusiness[]> {
    return withErrorHandling(
    async () => {

      let query = this.db.select().from(metricsBusiness).orderBy(desc(metricsBusiness.createdAt));
      
      if (entityType) {
        query = query.where(eq(metricsBusiness.entity_type, entityType as string));
      }
      if (entityId) {
        query = query.where(eq(metricsBusiness.entity_id, entityId));
      }
      
      const results = await query;
      logger.info(`Récupération de ${results.length} métriques business`);
      return results;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getMetricsBusinessById(id: string): Promise<MetricsBusiness | undefined> {
    return withErrorHandling(
    async () => {

      const [result] = await this.db
        .select()
        .from(metricsBusiness)
        .where(eq(metricsBusiness.id, id));
      
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createMetricsBusiness(metric: InsertMetricsBusiness): Promise<MetricsBusiness> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateMetricsBusiness(id: string, metric: Partial<InsertMetricsBusiness>): Promise<MetricsBusiness> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteMetricsBusiness(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.db.delete(metricsBusiness).where(eq(metricsBusiness.id, id));
      logger.info(`Métrique business ${id} supprimée`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Temps Pose operations
  async getTempsPose(workScope?: string, componentType?: string): Promise<TempsPose[]> {
    return withErrorHandling(
    async () => {

      let query = this.db.select().from(tempsPose).where(eq(tempsPose.is_active, true));
      
      if (workScope) {
        query = query.where(eq(tempsPose.work_scope, workScope as string));
      }
      if (componentType) {
        query = query.where(eq(tempsPose.component_type, componentType as string));
      }
      
      const results = await query;
      logger.info(`Récupération de ${results.length} temps de pose`);
      return results;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getTempsPoseById(id: string): Promise<TempsPose | undefined> {
    return withErrorHandling(
    async () => {

      const [result] = await this.db
        .select()
        .from(tempsPose)
        .where(eq(tempsPose.id, id));
      
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createTempsPose(temps: InsertTempsPose): Promise<TempsPose> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateTempsPose(id: string, temps: Partial<InsertTempsPose>): Promise<TempsPose> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteTempsPose(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.db.delete(tempsPose).where(eq(tempsPose.id, id));
      logger.info(`Temps de pose ${id} supprimé`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // AO-Contacts liaison operations
  async getAoContacts(aoId: string, tx?: DrizzleTransaction): Promise<AoContacts[]> {
    return withErrorHandling(
    async () => {

      const dbInstance = tx || this.db;
      const results = await dbInstance
        .select()
        .from(aoContacts)
        .where(eq(aoContacts.ao_id, aoId));
      
      logger.info(`Récupération de ${results.length} contacts pour AO ${aoId}`);
      return results;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createAoContact(contact: InsertAoContacts, tx?: DrizzleTransaction): Promise<AoContacts> {
    return withErrorHandling(
    async () => {

      const dbInstance = tx || this.db;
      const [result] = await dbInstance
        .insert(aoContacts)
        .values({
          ...contact,
          createdAt: new Date()
        })
        .returning();
      
      logger.info(`Contact AO créé avec ID: ${result.id}`);
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteAoContact(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.db.delete(aoContacts).where(eq(aoContacts.id, id));
      logger.info(`Contact AO ${id} supprimé`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Project-Contacts liaison operations
  async getProjectContacts(projectId: string): Promise<ProjectContacts[]> {
    return withErrorHandling(
    async () => {

      const results = await this.db
        .select()
        .from(projectContacts)
        .where(eq(projectContacts.project_id, projectId));
      
      logger.info(`Récupération de ${results.length} contacts pour projet ${projectId}`);
      return results;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createProjectContact(contact: InsertProjectContacts): Promise<ProjectContacts> {
    return withErrorHandling(
    async () => {

      const [result] = await this.db
        .insert(projectContacts)
        .values({
          ...contact,
          createdAt: new Date()
        })
        .returning();
      
      logger.info(`Contact projet créé avec ID: ${result.id}`);
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteProjectContact(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await this.db.delete(projectContacts).where(eq(projectContacts.id, id));
      logger.info(`Contact projet ${id} supprimé`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Supplier Specializations operations
  async getSupplierSpecializations(supplierId?: string): Promise<SupplierSpecializations[]> {
    return withErrorHandling(
    async () => {

      let query = this.db.select().from(supplierSpecializations);
      
      if (supplierId) {
        query = query.where(eq(supplierSpecializations.supplier_id, supplierId));
      }
      
      const results = await query;
      logger.info(`Récupération de ${results.length} spécialisations fournisseurs`);
      return results;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createSupplierSpecialization(spec: InsertSupplierSpecializations): Promise<SupplierSpecializations> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateSupplierSpecialization(id: string, spec: Partial<InsertSupplierSpecializations>): Promise<SupplierSpecializations> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteSupplierSpecialization(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(supplierSpecializations).where(eq(supplierSpecializations.id, id));
      logger.info(`Spécialisation fournisseur ${id} supprimée`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

      const [newAlert] = await db.insert(technicalAlerts).values(alert).returning();
      logger.info(`Alerte technique créée avec ID: ${newAlert.id}`);
      return newAlert;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async listTechnicalAlerts(filter?: TechnicalAlertsFilter): Promise<TechnicalAlert[]> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getTechnicalAlert(id: string): Promise<TechnicalAlert | null> {
    return withErrorHandling(
    async () => {

      const [alert] = await db.select().from(technicalAlerts).where(eq(technicalAlerts.id, id));
      return alert || null;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async acknowledgeTechnicalAlert(id: string, userId: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.update(technicalAlerts)
        .set({ status: 'acknowledged', acknowledgedBy: userId, acknowledgedAt: new Date() })
        .where(eq(technicalAlerts.id, id));
      logger.info(`Alerte technique ${id} acquittée par ${userId}`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async validateTechnicalAlert(id: string, userId: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.update(technicalAlerts)
        .set({ status: 'resolved', resolvedBy: userId, resolvedAt: new Date() })
        .where(eq(technicalAlerts.id, id));
      logger.info(`Alerte technique ${id} validée par ${userId}`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async bypassTechnicalAlert(id: string, userId: string, until: Date, reason: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.update(technicalAlerts)
        .set({ status: 'bypassed', resolvedBy: userId, resolvedAt: new Date() })
        .where(eq(technicalAlerts.id, id));
      
      // Ajouter entrée historique
      await this.addTechnicalAlertHistory(id, 'bypassed', userId, reason, { until: until.toISOString() });
      logger.info(`Alerte technique ${id} bypassée par ${userId} jusqu'à ${until}`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getActiveBypassForAo(aoId: string): Promise<{ until: Date; reason: string } | null> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return null;
    }
  }

  async listTechnicalAlertHistory(alertId: string): Promise<TechnicalAlertHistory[]> {
    return withErrorHandling(
    async () => {

      const history = await db.select()
        .from(technicalAlertHistory)
        .where(eq(technicalAlertHistory.alertId, alertId))
        .orderBy(desc(technicalAlertHistory.createdAt));
      return history;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async addTechnicalAlertHistory(alertId: string | null, action: string, actorUserId: string | null, note?: string, metadata?: Record<string, any>): Promise<TechnicalAlertHistory> {
    return withErrorHandling(
    async () => {

      const [entry] = await db.insert(technicalAlertHistory).values({
        alertId,
        action,
        actorUserId,
        note,
        metadata
      }).returning();
      return entry;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async listAoSuppressionHistory(aoId: string): Promise<TechnicalAlertHistory[]> {
    return withErrorHandling(
    async () => {

      const history = await db.select()
        .from(technicalAlertHistory)
        .where(and(
          eq(technicalAlertHistory.action, 'suppressed'),
          eq(technicalAlertHistory.note, aoId)
        ))
        .orderBy(desc(technicalAlertHistory.createdAt));
      return history;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

      const timelines = await db.select()
        .from(projectTimelines)
        .where(eq(projectTimelines.projectId, projectId))
        .orderBy(projectTimelines.plannedStartDate);
      return timelines;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getAllProjectTimelines(): Promise<ProjectTimeline[]> {
    return withErrorHandling(
    async () => {

      const timelines = await db.select()
        .from(projectTimelines)
        .orderBy(desc(projectTimelines.createdAt));
      return timelines;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createProjectTimeline(data: InsertProjectTimeline): Promise<ProjectTimeline> {
    return withErrorHandling(
    async () => {

      const [timeline] = await db.insert(projectTimelines).values(data).returning();
      logger.info(`Timeline projet créée avec ID: ${timeline.id}`);
      return timeline;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateProjectTimeline(id: string, data: Partial<InsertProjectTimeline>): Promise<ProjectTimeline> {
    return withErrorHandling(
    async () => {

      const [timeline] = await db.update(projectTimelines)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(projectTimelines.id, id))
        .returning();
      logger.info(`Timeline projet ${id} mise à jour`);
      return timeline;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteProjectTimeline(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(projectTimelines).where(eq(projectTimelines.id, id));
      logger.info(`Timeline projet ${id} supprimée`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // DATE INTELLIGENCE RULES
  // ========================================

  async getActiveRules(filters?: { phase?: typeof projectStatusEnum.enumValues[number], projectType?: string }): Promise<DateIntelligenceRule[]> {
    return withErrorHandling(
    async () => {

      let query = db.select().from(dateIntelligenceRules).where(eq(dateIntelligenceRules.isActive, true));
      
      if (filters?.phase) {
        query = query.where(eq(dateIntelligenceRules.phase, filters.phase));
      }
      if (filters?.projectType) {
        query = query.where(eq(dateIntelligenceRules.projectType, filters.projectType));
      }
      
      const rules = await query.orderBy(desc(dateIntelligenceRules.priority));
      return rules;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getAllRules(): Promise<DateIntelligenceRule[]> {
    return withErrorHandling(
    async () => {

      const rules = await db.select()
        .from(dateIntelligenceRules)
        .orderBy(desc(dateIntelligenceRules.createdAt));
      return rules;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getRule(id: string): Promise<DateIntelligenceRule | undefined> {
    return withErrorHandling(
    async () => {

      const [rule] = await db.select().from(dateIntelligenceRules).where(eq(dateIntelligenceRules.id, id));
      return rule;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createRule(data: InsertDateIntelligenceRule): Promise<DateIntelligenceRule> {
    return withErrorHandling(
    async () => {

      const [rule] = await db.insert(dateIntelligenceRules).values(data).returning();
      logger.info(`Règle d'intelligence temporelle créée avec ID: ${rule.id}`);
      return rule;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateRule(id: string, data: Partial<InsertDateIntelligenceRule>): Promise<DateIntelligenceRule> {
    return withErrorHandling(
    async () => {

      const [rule] = await db.update(dateIntelligenceRules)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dateIntelligenceRules.id, id))
        .returning();
      logger.info(`Règle d'intelligence temporelle ${id} mise à jour`);
      return rule;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteRule(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(dateIntelligenceRules).where(eq(dateIntelligenceRules.id, id));
      logger.info(`Règle d'intelligence temporelle ${id} supprimée`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // DATE ALERTS - ALERTES DATES ET ÉCHÉANCES
  // ========================================

  async getDateAlerts(filters?: { entityType?: string, entityId?: string, status?: string }): Promise<DateAlert[]> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getDateAlert(id: string): Promise<DateAlert | undefined> {
    return withErrorHandling(
    async () => {

      const [alert] = await db.select().from(dateAlerts).where(eq(dateAlerts.id, id));
      return alert;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createDateAlert(data: InsertDateAlert): Promise<DateAlert> {
    return withErrorHandling(
    async () => {

      const [alert] = await db.insert(dateAlerts).values(data).returning();
      logger.info(`Alerte de date créée avec ID: ${alert.id}`);
      return alert;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateDateAlert(id: string, data: Partial<InsertDateAlert>): Promise<DateAlert> {
    return withErrorHandling(
    async () => {

      const [alert] = await db.update(dateAlerts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dateAlerts.id, id))
        .returning();
      logger.info(`Alerte de date ${id} mise à jour`);
      return alert;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteDateAlert(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(dateAlerts).where(eq(dateAlerts.id, id));
      logger.info(`Alerte de date ${id} supprimée`);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // ANALYTICS KPI OPERATIONS
  // ========================================

  async createKPISnapshot(data: InsertKpiSnapshot): Promise<KpiSnapshot> {
    return withErrorHandling(
    async () => {

      const [snapshot] = await db.insert(kpiSnapshots).values(data).returning();
      logger.info(`Snapshot KPI créé avec ID: ${snapshot.id}`);
      return snapshot;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getKPISnapshots(period: DateRange, limit?: number): Promise<KpiSnapshot[]> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getLatestKPISnapshot(): Promise<KpiSnapshot | null> {
    return withErrorHandling(
    async () => {

      const [snapshot] = await db.select()
        .from(kpiSnapshots)
        .orderBy(desc(kpiSnapshots.snapshotDate))
        .limit(1);
      return snapshot || null;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createBusinessMetric(data: InsertBusinessMetric): Promise<BusinessMetric> {
    return withErrorHandling(
    async () => {

      const [metric] = await db.insert(businessMetrics).values(data).returning();
      logger.info(`Métrique business créée avec ID: ${metric.id}`);
      return metric;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getBusinessMetrics(filters: MetricFilters): Promise<BusinessMetric[]> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getMetricTimeSeries(metricType: string, period: DateRange): Promise<BusinessMetric[]> {
    return withErrorHandling(
    async () => {

      const metrics = await db.select()
        .from(businessMetrics)
        .where(and(
          eq(businessMetrics.metricType, metricType),
          gte(businessMetrics.periodStart, period.from),
          lte(businessMetrics.periodEnd, period.to)
        ))
        .orderBy(businessMetrics.periodStart);
      return metrics;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createPerformanceBenchmark(data: InsertPerformanceBenchmark): Promise<PerformanceBenchmark> {
    return withErrorHandling(
    async () => {

      const [benchmark] = await db.insert(performanceBenchmarks).values(data).returning();
      logger.info(`Benchmark performance créé avec ID: ${benchmark.id}`);
      return benchmark;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getTopPerformers(metricType: string, limit?: number): Promise<PerformanceBenchmark[]> {
    return withErrorHandling(
    async () => {

      let query = db.select()
        .from(performanceBenchmarks)
        .where(eq(performanceBenchmarks.metricType, metricType))
        .orderBy(desc(performanceBenchmarks.value));
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const topPerformers = await query;
      return topPerformers;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async saveForecastSnapshot(forecast: { forecast_data: any; generated_at: string; params: any }): Promise<string> {
    return withErrorHandling(
    async () => {

      // Pour le POC, utilisation d'une table générique ou storage en mémoire
      const snapshotId = `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      logger.info(`Snapshot forecast sauvegardé avec ID: ${snapshotId}`);
      return snapshotId;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async getAnalyticsSnapshots(params?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
    return withErrorHandling(
    async () => {

      logger.info('Récupération snapshots analytics', {
        metadata: {
          service: 'StoragePOC',
          operation: 'getAnalyticsSnapshots',
          params
        }
      });
      return [];
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async createAnalyticsSnapshot(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return withErrorHandling(
    async () => {

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
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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
    return withErrorHandling(
    async () => {

      // Benchmarks secteur menuiserie (données POC)
      return {
        industry_avg_conversion: 0.35, // 35% taux conversion moyen
        avg_duration_benchmark: 75, // 75 jours durée moyenne
        margin_benchmark: 0.18, // 18% marge moyenne
        quality_benchmark: 4.2, // 4.2/5 qualité moyenne
        efficiency_benchmark: 0.82 // 82% efficacité moyenne
      };
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // IMPLÉMENTATIONS CRUD TABLES MONDAY.COM (CRITIQUE)
  // ========================================

  // Equipment Batteries operations (Nb Batterie)
  async getEquipmentBatteries(projectId?: string): Promise<EquipmentBattery[]> {
    return withErrorHandling(
    async () => {

      if (projectId) {
        return await db.select().from(equipmentBatteries).where(eq(equipmentBatteries.projectId, projectId));
      }
      return await db.select().from(equipmentBatteries);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return [];
    }
  }

  async getEquipmentBattery(id: string): Promise<EquipmentBattery | undefined> {
    return withErrorHandling(
    async () => {

      const [battery] = await db.select().from(equipmentBatteries).where(eq(equipmentBatteries.id, id));
      return battery;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return undefined;
    }
  }

  async createEquipmentBattery(battery: EquipmentBatteryInsert): Promise<EquipmentBattery> {
    return withErrorHandling(
    async () => {

      const [newBattery] = await db.insert(equipmentBatteries).values(battery).returning();
      logger.info('Equipment Battery créée:', newBattery.id);
      return newBattery;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateEquipmentBattery(id: string, battery: Partial<EquipmentBatteryInsert>): Promise<EquipmentBattery> {
    return withErrorHandling(
    async () => {

      const [updated] = await db.update(equipmentBatteries).set(battery).where(eq(equipmentBatteries.id, id)).returning();
      logger.info('Equipment Battery mise à jour:', id);
      return updated;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteEquipmentBattery(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(equipmentBatteries).where(eq(equipmentBatteries.id, id));
      logger.info('Equipment Battery supprimée:', id);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Margin Targets operations (Objectif Marge H)
  async getMarginTargets(projectId?: string): Promise<MarginTarget[]> {
    return withErrorHandling(
    async () => {

      if (projectId) {
        return await db.select().from(marginTargets).where(eq(marginTargets.projectId, projectId));
      }
      return await db.select().from(marginTargets);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return [];
    }
  }

  async getMarginTarget(id: string): Promise<MarginTarget | undefined> {
    return withErrorHandling(
    async () => {

      const [target] = await db.select().from(marginTargets).where(eq(marginTargets.id, id));
      return target;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return undefined;
    }
  }

  async createMarginTarget(target: MarginTargetInsert): Promise<MarginTarget> {
    return withErrorHandling(
    async () => {

      const [newTarget] = await db.insert(marginTargets).values(target).returning();
      logger.info('Margin Target créé:', newTarget.id);
      return newTarget;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateMarginTarget(id: string, target: Partial<MarginTargetInsert>): Promise<MarginTarget> {
    return withErrorHandling(
    async () => {

      const [updated] = await db.update(marginTargets).set(target).where(eq(marginTargets.id, id)).returning();
      logger.info('Margin Target mis à jour:', id);
      return updated;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteMarginTarget(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(marginTargets).where(eq(marginTargets.id, id));
      logger.info('Margin Target supprimé:', id);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Project Sub Elements operations (Sous-éléments)
  async getProjectSubElements(projectId?: string): Promise<ProjectSubElement[]> {
    return withErrorHandling(
    async () => {

      if (projectId) {
        return await db.select().from(projectSubElements).where(eq(projectSubElements.projectId, projectId));
      }
      return await db.select().from(projectSubElements);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return [];
    }
  }

  async getProjectSubElement(id: string): Promise<ProjectSubElement | undefined> {
    return withErrorHandling(
    async () => {

      const [element] = await db.select().from(projectSubElements).where(eq(projectSubElements.id, id));
      return element;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return undefined;
    }
  }

  async createProjectSubElement(element: ProjectSubElementInsert): Promise<ProjectSubElement> {
    return withErrorHandling(
    async () => {

      const [newElement] = await db.insert(projectSubElements).values(element).returning();
      logger.info('Project Sub Element créé:', newElement.id);
      return newElement;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateProjectSubElement(id: string, element: Partial<ProjectSubElementInsert>): Promise<ProjectSubElement> {
    return withErrorHandling(
    async () => {

      const [updated] = await db.update(projectSubElements).set(element).where(eq(projectSubElements.id, id)).returning();
      logger.info('Project Sub Element mis à jour:', id);
      return updated;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteProjectSubElement(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(projectSubElements).where(eq(projectSubElements.id, id));
      logger.info('Project Sub Element supprimé:', id);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Classification Tags operations (Hashtags)
  async getClassificationTags(category?: string): Promise<ClassificationTag[]> {
    return withErrorHandling(
    async () => {

      if (category) {
        return await db.select().from(classificationTags).where(eq(classificationTags.category, category));
      }
      return await db.select().from(classificationTags);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return [];
    }
  }

  async getClassificationTag(id: string): Promise<ClassificationTag | undefined> {
    return withErrorHandling(
    async () => {

      const [tag] = await db.select().from(classificationTags).where(eq(classificationTags.id, id));
      return tag;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return undefined;
    }
  }

  async createClassificationTag(tag: ClassificationTagInsert): Promise<ClassificationTag> {
    return withErrorHandling(
    async () => {

      const [newTag] = await db.insert(classificationTags).values(tag).returning();
      logger.info('Classification Tag créé:', newTag.id);
      return newTag;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateClassificationTag(id: string, tag: Partial<ClassificationTagInsert>): Promise<ClassificationTag> {
    return withErrorHandling(
    async () => {

      const [updated] = await db.update(classificationTags).set(tag).where(eq(classificationTags.id, id)).returning();
      logger.info('Classification Tag mis à jour:', id);
      return updated;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteClassificationTag(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(classificationTags).where(eq(classificationTags.id, id));
      logger.info('Classification Tag supprimé:', id);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Entity Tags operations (Liaison Hashtags)
  async getEntityTags(entityType?: string, entityId?: string): Promise<EntityTag[]> {
    return withErrorHandling(
    async () => {

      let query = db.select().from(entityTags);
      if (entityType && entityId) {
        query = query.where(and(eq(entityTags.entityType, entityType), eq(entityTags.entityId, entityId)));
      } else if (entityType) {
        query = query.where(eq(entityTags.entityType, entityType));
      }
      return await query;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return [];
    }
  }

  async createEntityTag(entityTag: EntityTagInsert): Promise<EntityTag> {
    return withErrorHandling(
    async () => {

      const [newEntityTag] = await db.insert(entityTags).values(entityTag).returning();
      logger.info('Entity Tag créé:', newEntityTag.id);
      return newEntityTag;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteEntityTag(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(entityTags).where(eq(entityTags.id, id));
      logger.info('Entity Tag supprimé:', id);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Employee Labels operations (Label/Label 1)
  async getEmployeeLabels(category?: string): Promise<EmployeeLabel[]> {
    return withErrorHandling(
    async () => {

      if (category) {
        return await db.select().from(employeeLabels).where(eq(employeeLabels.category, category));
      }
      return await db.select().from(employeeLabels);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return [];
    }
  }

  async getEmployeeLabel(id: string): Promise<EmployeeLabel | undefined> {
    return withErrorHandling(
    async () => {

      const [label] = await db.select().from(employeeLabels).where(eq(employeeLabels.id, id));
      return label;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return undefined;
    }
  }

  async createEmployeeLabel(label: EmployeeLabelInsert): Promise<EmployeeLabel> {
    return withErrorHandling(
    async () => {

      const [newLabel] = await db.insert(employeeLabels).values(label).returning();
      logger.info('Employee Label créé:', newLabel.id);
      return newLabel;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async updateEmployeeLabel(id: string, label: Partial<EmployeeLabelInsert>): Promise<EmployeeLabel> {
    return withErrorHandling(
    async () => {

      const [updated] = await db.update(employeeLabels).set(label).where(eq(employeeLabels.id, id)).returning();
      logger.info('Employee Label mis à jour:', id);
      return updated;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteEmployeeLabel(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(employeeLabels).where(eq(employeeLabels.id, id));
      logger.info('Employee Label supprimé:', id);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Employee Label Assignments operations (Liaison Label/Label 1)
  async getEmployeeLabelAssignments(userId?: string): Promise<EmployeeLabelAssignment[]> {
    return withErrorHandling(
    async () => {

      if (userId) {
        return await db.select().from(employeeLabelAssignments).where(eq(employeeLabelAssignments.userId, userId));
      }
      return await db.select().from(employeeLabelAssignments);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      return [];
    }
  }

  async createEmployeeLabelAssignment(assignment: EmployeeLabelAssignmentInsert): Promise<EmployeeLabelAssignment> {
    return withErrorHandling(
    async () => {

      const [newAssignment] = await db.insert(employeeLabelAssignments).values(assignment).returning();
      logger.info('Employee Label Assignment créé:', newAssignment.id);
      return newAssignment;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  async deleteEmployeeLabelAssignment(id: string): Promise<void> {
    return withErrorHandling(
    async () => {

      await db.delete(employeeLabelAssignments).where(eq(employeeLabelAssignments.id, id));
      logger.info('Employee Label Assignment supprimé:', id);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // Bug Reports operations - Système de rapport de bugs
  async createBugReport(bugReport: InsertBugReport): Promise<BugReport> {
    return withErrorHandling(
    async () => {

      const [result] = await db.insert(bugReports).values(bugReport).returning();
      logger.info(`Rapport de bug créé avec ID: ${result.id}`);
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  // ========================================
  // BATIGEST INTEGRATION OPERATIONS
  // ========================================

  // Purchase Orders operations
  async getPurchaseOrders(filters?: { supplierId?: string; status?: string }): Promise<PurchaseOrder[]> {
    return withErrorHandling(
    async () => {

      let query = db.select().from(purchaseOrders);
      const conditions = [];
      
      if (filters?.supplierId) {
        conditions.push(eq(purchaseOrders.supplierId, filters.supplierId));
      }
      if (filters?.status) {
        conditions.push(eq(purchaseOrders.status, filters.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return await query;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrder | undefined> {
    return withErrorHandling(
    async () => {

      const [result] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async createPurchaseOrder(order: InsertPurchaseOrder): Promise<PurchaseOrder> {
    return withErrorHandling(
    async () => {

      const [result] = await db.insert(purchaseOrders).values(order).returning();
      logger.info(`Bon de commande créé: ${result.reference}`);
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async updatePurchaseOrder(id: string, order: Partial<InsertPurchaseOrder>): Promise<PurchaseOrder> {
    return withErrorHandling(
    async () => {

      const [result] = await db
        .update(purchaseOrders)
        .set({ ...order, updatedAt: new Date() })
        .where(eq(purchaseOrders.id, id))
        .returning();
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  // Client Quotes operations
  async getClientQuotes(filters?: { clientName?: string; status?: string }): Promise<ClientQuote[]> {
    return withErrorHandling(
    async () => {

      let query = db.select().from(clientQuotes);
      const conditions = [];
      
      if (filters?.clientName) {
        conditions.push(ilike(clientQuotes.clientName, `%${filters.clientName}%`));
      }
      if (filters?.status) {
        conditions.push(eq(clientQuotes.status, filters.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return await query;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getClientQuote(id: string): Promise<ClientQuote | undefined> {
    return withErrorHandling(
    async () => {

      const [result] = await db.select().from(clientQuotes).where(eq(clientQuotes.id, id));
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async createClientQuote(quote: InsertClientQuote): Promise<ClientQuote> {
    return withErrorHandling(
    async () => {

      const [result] = await db.insert(clientQuotes).values(quote).returning();
      logger.info(`Devis client créé: ${result.reference}`);
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async updateClientQuote(id: string, quote: Partial<InsertClientQuote>): Promise<ClientQuote> {
    return withErrorHandling(
    async () => {

      const [result] = await db
        .update(clientQuotes)
        .set({ ...quote, updatedAt: new Date() })
        .where(eq(clientQuotes.id, id))
        .returning();
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  // Batigest Export Queue operations
  async getBatigestExportsByStatus(status: string, limit = 50): Promise<BatigestExportQueue[]> {
    return withErrorHandling(
    async () => {

      const results = await db
        .select()
        .from(batigestExportQueue)
        .where(eq(batigestExportQueue.status, status))
        .orderBy(desc(batigestExportQueue.generatedAt))
        .limit(limit);
      return results;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getBatigestExportById(id: string): Promise<BatigestExportQueue | undefined> {
    return withErrorHandling(
    async () => {

      const [result] = await db.select().from(batigestExportQueue).where(eq(batigestExportQueue.id, id));
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async createBatigestExport(exportData: InsertBatigestExportQueue): Promise<BatigestExportQueue> {
    return withErrorHandling(
    async () => {

      const [result] = await db.insert(batigestExportQueue).values(exportData).returning();
      logger.info(`Export Batigest créé: ${result.documentReference} (${result.documentType})`);
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async updateBatigestExport(id: string, data: Partial<InsertBatigestExportQueue>): Promise<BatigestExportQueue> {
    return withErrorHandling(
    async () => {

      const [result] = await db
        .update(batigestExportQueue)
        .set(data)
        .where(eq(batigestExportQueue.id, id))
        .returning();
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getBatigestExportsAll(filters?: {
    status?: string;
    documentType?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: BatigestExportQueue[];
    total: number;
    page: number;
    limit: number;
  }> {
    return withErrorHandling(
    async () => {

      const page = filters?.page || 1;
      const limit = filters?.limit || 20;
      const offset = (page - 1) * limit;

      let query = db.select().from(batigestExportQueue).$dynamic();
      let countQuery = db.select({ count: count() }).from(batigestExportQueue).$dynamic();

      const conditions = [];

      if (filters?.status) {
        conditions.push(eq(batigestExportQueue.status, filters.status));
      }

      if (filters?.documentType) {
        conditions.push(eq(batigestExportQueue.documentType, filters.documentType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
        countQuery = countQuery.where(and(...conditions)) as any;
      }

      const [data, totalResult] = await Promise.all([
        query.orderBy(desc(batigestExportQueue.generatedAt)).limit(limit).offset(offset),
        countQuery
      ]);

      const total = totalResult[0]?.count || 0;

      return {
        data,
        total: Number(total),
        page,
        limit
      };
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getBatigestStats(): Promise<{
    totalExports: number;
    successRate7days: number;
    lastSyncDate: Date | null;
    pendingCount: number;
    errorRate: number;
  }> {
    return withErrorHandling(
    async () => {

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [totalResult] = await db.select({ count: count() }).from(batigestExportQueue);
      const totalExports = Number(totalResult?.count || 0);

      const [recentExports] = await db
        .select({ count: count() })
        .from(batigestExportQueue)
        .where(gte(batigestExportQueue.generatedAt, sevenDaysAgo));
      const recentCount = Number(recentExports?.count || 0);

      const [successExports] = await db
        .select({ count: count() })
        .from(batigestExportQueue)
        .where(
          and(
            eq(batigestExportQueue.status, 'imported'),
            gte(batigestExportQueue.generatedAt, sevenDaysAgo)
          )
        );
      const successCount = Number(successExports?.count || 0);

      const successRate7days = recentCount > 0 ? (successCount / recentCount) * 100 : 0;

      const [lastSync] = await db
        .select({ importedAt: batigestExportQueue.importedAt })
        .from(batigestExportQueue)
        .where(eq(batigestExportQueue.status, 'imported'))
        .orderBy(desc(batigestExportQueue.importedAt))
        .limit(1);

      const [pendingResult] = await db
        .select({ count: count() })
        .from(batigestExportQueue)
        .where(eq(batigestExportQueue.status, 'pending'));
      const pendingCount = Number(pendingResult?.count || 0);

      const [errorResult] = await db
        .select({ count: count() })
        .from(batigestExportQueue)
        .where(eq(batigestExportQueue.status, 'error'));
      const errorCount = Number(errorResult?.count || 0);

      const errorRate = totalExports > 0 ? (errorCount / totalExports) * 100 : 0;

      return {
        totalExports,
        successRate7days,
        lastSyncDate: lastSync?.importedAt || null,
        pendingCount,
        errorRate
      };
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  // ========================================
  // ANALYTICS AGGREGATION METHODS - PERFORMANCE OPTIMIZED
  // ========================================

  async getProjectStats(filters?: {
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
  }> {
    return withErrorHandling(
    async () => {

      logger.debug('[Storage] getProjectStats - SQL aggregation', { metadata: { filters } });

      // Build WHERE conditions
      const conditions: any[] = [];
      if (filters?.dateFrom) {
        conditions.push(gte(projects.createdAt, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(projects.createdAt, new Date(filters.dateTo)));
      }
      if (filters?.status) {
        conditions.push(eq(projects.status, filters.status as any));
      }
      if (filters?.responsibleUserId) {
        conditions.push(eq(projects.responsibleUserId, filters.responsibleUserId));
      }
      if (filters?.departement) {
        conditions.push(eq(projects.departement, filters.departement));
      }

      // Query 1: Overall stats
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [overallStats] = await db
        .select({
          totalCount: count(),
          totalBudget: sum(projects.budget),
          avgBudget: avg(projects.budget)
        })
        .from(projects)
        .where(whereClause);

      // Query 2: Stats by status
      const statusStats = await db
        .select({
          status: projects.status,
          count: count(),
          totalBudget: sum(projects.budget),
          avgBudget: avg(projects.budget)
        })
        .from(projects)
        .where(whereClause)
        .groupBy(projects.status);

      // Build result
      const byStatus: Record<string, { count: number; totalBudget: number; avgBudget: number }> = {};
      for (const stat of statusStats) {
        byStatus[stat.status] = {
          count: Number(stat.count),
          totalBudget: Number(stat.totalBudget || 0),
          avgBudget: Number(stat.avgBudget || 0)
        };
      }

      return {
        totalCount: Number(overallStats?.totalCount || 0),
        byStatus,
        totalBudget: Number(overallStats?.totalBudget || 0),
        avgBudget: Number(overallStats?.avgBudget || 0)
      };
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getOfferStats(filters?: {
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
  }> {
    return withErrorHandling(
    async () => {

      logger.debug('[Storage] getOfferStats - SQL aggregation', { metadata: { filters } });

      // Build WHERE conditions
      const conditions: any[] = [];
      if (filters?.dateFrom) {
        conditions.push(gte(offers.createdAt, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(offers.createdAt, new Date(filters.dateTo)));
      }
      if (filters?.status) {
        conditions.push(eq(offers.status, filters.status as any));
      }
      if (filters?.responsibleUserId) {
        conditions.push(eq(offers.responsibleUserId, filters.responsibleUserId));
      }
      if (filters?.departement) {
        conditions.push(eq(offers.departement, filters.departement));
      }

      // Query 1: Overall stats
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [overallStats] = await db
        .select({
          totalCount: count(),
          totalAmount: sum(offers.montantFinalHT),
          avgAmount: avg(offers.montantFinalHT)
        })
        .from(offers)
        .where(whereClause);

      // Query 2: Stats by status
      const statusStats = await db
        .select({
          status: offers.status,
          count: count(),
          totalAmount: sum(offers.montantFinalHT),
          avgAmount: avg(offers.montantFinalHT)
        })
        .from(offers)
        .where(whereClause)
        .groupBy(offers.status);

      // Build result
      const byStatus: Record<string, { count: number; totalAmount: number; avgAmount: number }> = {};
      for (const stat of statusStats) {
        byStatus[stat.status] = {
          count: Number(stat.count),
          totalAmount: Number(stat.totalAmount || 0),
          avgAmount: Number(stat.avgAmount || 0)
        };
      }

      return {
        totalCount: Number(overallStats?.totalCount || 0),
        byStatus,
        totalAmount: Number(overallStats?.totalAmount || 0),
        avgAmount: Number(overallStats?.avgAmount || 0)
      };
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getAOStats(filters?: {
    dateFrom?: string;
    dateTo?: string;
    departement?: string;
  }): Promise<{
    totalCount: number;
    byDepartement: Record<string, number>;
  }> {
    return withErrorHandling(
    async () => {

      logger.debug('[Storage] getAOStats - SQL aggregation', { metadata: { filters } });

      // Build WHERE conditions
      const conditions: any[] = [];
      if (filters?.dateFrom) {
        conditions.push(gte(aos.createdAt, new Date(filters.dateFrom)));
      }
      if (filters?.dateTo) {
        conditions.push(lte(aos.createdAt, new Date(filters.dateTo)));
      }
      if (filters?.departement) {
        conditions.push(eq(aos.departement, filters.departement));
      }

      // Query 1: Overall stats
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const [overallStats] = await db
        .select({
          totalCount: count()
        })
        .from(aos)
        .where(whereClause);

      // Query 2: Stats by departement
      const deptStats = await db
        .select({
          departement: aos.departement,
          count: count()
        })
        .from(aos)
        .where(whereClause)
        .groupBy(aos.departement);

      // Build result
      const byDepartement: Record<string, number> = {};
      for (const stat of deptStats) {
        if (stat.departement) {
          byDepartement[stat.departement] = Number(stat.count);
        }
      }

      return {
        totalCount: Number(overallStats?.totalCount || 0),
        byDepartement
      };
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getConversionStats(period: {
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
  }> {
    return withErrorHandling(
    async () => {

      logger.debug('[Storage] getConversionStats - SQL aggregation', { metadata: { period, filters } });

      const fromDate = new Date(period.from);
      const toDate = new Date(period.to);

      // Build WHERE conditions for AOs
      const aoConditions: any[] = [
        gte(aos.createdAt, fromDate),
        lte(aos.createdAt, toDate)
      ];
      if (filters?.departement) {
        aoConditions.push(eq(aos.departement, filters.departement));
      }

      // Build WHERE conditions for Offers
      const offerConditions: any[] = [
        gte(offers.createdAt, fromDate),
        lte(offers.createdAt, toDate)
      ];
      if (filters?.userId) {
        offerConditions.push(eq(offers.responsibleUserId, filters.userId));
      }
      if (filters?.departement) {
        offerConditions.push(eq(offers.departement, filters.departement));
      }

      // Query 1: AO to Offer conversion
      const [aoStats] = await db
        .select({
          totalAOs: count()
        })
        .from(aos)
        .where(and(...aoConditions));

      const [offerStats] = await db
        .select({
          totalOffers: count()
        })
        .from(offers)
        .where(and(...offerConditions));

      const totalAOs = Number(aoStats?.totalAOs || 0);
      const totalOffersCreated = Number(offerStats?.totalOffers || 0);
      const aoToOfferRate = totalAOs > 0 ? (totalOffersCreated / totalAOs) * 100 : 0;

      // Query 2: Offer to Project conversion
      const [signedOfferStats] = await db
        .select({
          totalSigned: count()
        })
        .from(offers)
        .where(and(...offerConditions, eq(offers.status, 'signe')));

      const totalSignedOffers = Number(signedOfferStats?.totalSigned || 0);
      const offerToProjectRate = totalOffersCreated > 0 ? (totalSignedOffers / totalOffersCreated) * 100 : 0;

      // Query 3: By user stats (if needed)
      let aoToOfferByUser: Record<string, { aos: number; offers: number; rate: number }> = {};
      let offerToProjectByUser: Record<string, { offers: number; signed: number; rate: number }> = {};

      if (filters?.userId || !filters) {
        // Offer stats by user
        const offersByUser = await db
          .select({
            userId: offers.responsibleUserId,
            totalOffers: count(),
            totalSigned: sum(sql`CASE WHEN ${offers.status} = 'signe' THEN 1 ELSE 0 END`)
          })
          .from(offers)
          .where(and(...offerConditions))
          .groupBy(offers.responsibleUserId);

        for (const stat of offersByUser) {
          if (stat.userId) {
            const offersCount = Number(stat.totalOffers);
            const signedCount = Number(stat.totalSigned || 0);
            offerToProjectByUser[stat.userId] = {
              offers: offersCount,
              signed: signedCount,
              rate: offersCount > 0 ? (signedCount / offersCount) * 100 : 0
            };
          }
        }
      }

      return {
        aoToOffer: {
          totalAOs,
          totalOffersCreated,
          conversionRate: aoToOfferRate,
          byUser: Object.keys(aoToOfferByUser).length > 0 ? aoToOfferByUser : undefined
        },
        offerToProject: {
          totalOffers: totalOffersCreated,
          totalSignedOffers,
          conversionRate: offerToProjectRate,
          byUser: Object.keys(offerToProjectByUser).length > 0 ? offerToProjectByUser : undefined
        }
      };
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getProjectDelayStats(period: {
    from: string;
    to: string;
  }): Promise<{
    avgDelayDays: number;
    medianDelayDays: number;
    totalDelayed: number;
    criticalDelayed: number;
    byPhase: Record<string, { count: number; avgDelay: number }>;
  }> {
    return withErrorHandling(
    async () => {

      logger.debug('[Storage] getProjectDelayStats - SQL aggregation', { metadata: { period } });

      const fromDate = new Date(period.from);
      const toDate = new Date(period.to);

      // Query timelines with delay calculations
      const timelinesWithDelays = await db
        .select({
          phase: projectTimelines.phase,
          delayDays: sql<number>`CAST(EXTRACT(EPOCH FROM (${projectTimelines.actualEndDate} - ${projectTimelines.plannedEndDate})) / 86400 AS INTEGER)`
        })
        .from(projectTimelines)
        .where(
          and(
            gte(projectTimelines.plannedStartDate, fromDate),
            lte(projectTimelines.plannedStartDate, toDate),
            sql`${projectTimelines.plannedEndDate} IS NOT NULL`,
            sql`${projectTimelines.actualEndDate} IS NOT NULL`
          )
        );

      if (timelinesWithDelays.length === 0) {
        return {
          avgDelayDays: 0,
          medianDelayDays: 0,
          totalDelayed: 0,
          criticalDelayed: 0,
          byPhase: {}
        };
      }

      // Calculate stats
      const delays = timelinesWithDelays.map(t => Math.max(0, Number(t.delayDays) || 0));
      const totalDelayed = delays.filter(d => d > 0).length;
      const criticalDelayed = delays.filter(d => d > 7).length;
      const avgDelayDays = delays.reduce((a, b) => a + b, 0) / delays.length;
      
      // Median calculation
      const sortedDelays = [...delays].sort((a, b) => a - b);
      const medianDelayDays = sortedDelays[Math.floor(sortedDelays.length / 2)];

      // By phase
      const byPhase: Record<string, { count: number; avgDelay: number }> = {};
      const phaseGroups: Record<string, number[]> = {};
      
      for (const timeline of timelinesWithDelays) {
        const delay = Math.max(0, Number(timeline.delayDays) || 0);
        if (!phaseGroups[timeline.phase]) {
          phaseGroups[timeline.phase] = [];
        }
        phaseGroups[timeline.phase].push(delay);
      }

      for (const [phase, phaseDelays] of Object.entries(phaseGroups)) {
        byPhase[phase] = {
          count: phaseDelays.length,
          avgDelay: phaseDelays.reduce((a, b) => a + b, 0) / phaseDelays.length
        };
      }

      return {
        avgDelayDays,
        medianDelayDays,
        totalDelayed,
        criticalDelayed,
        byPhase
      };
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async getTeamPerformanceStats(period: {
    from: string;
    to: string;
  }): Promise<Array<{
    userId: string;
    userName: string;
    projectCount: number;
    avgDelayDays: number;
    onTimeCount: number;
    onTimeRate: number;
  }>> {
    return withErrorHandling(
    async () => {

      logger.debug('[Storage] getTeamPerformanceStats - SQL aggregation', { metadata: { period } });

      const fromDate = new Date(period.from);
      const toDate = new Date(period.to);

      // Query projects with their delays and users
      const projectsWithDelays = await db
        .select({
          userId: projects.responsibleUserId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          delayDays: sql<number>`CAST(COALESCE(EXTRACT(EPOCH FROM (${projectTimelines.actualEndDate} - ${projectTimelines.plannedEndDate})) / 86400, 0) AS INTEGER)`
        })
        .from(projects)
        .leftJoin(users, eq(projects.responsibleUserId, users.id))
        .leftJoin(projectTimelines, eq(projects.id, projectTimelines.projectId))
        .where(
          and(
            gte(projects.createdAt, fromDate),
            lte(projects.createdAt, toDate),
            sql`${projects.responsibleUserId} IS NOT NULL`
          )
        );

      // Group by user
      const userStats: Record<string, {
        userName: string;
        delays: number[];
        onTimeCount: number;
      }> = {};

      for (const project of projectsWithDelays) {
        if (!project.userId) continue;
        
        if (!userStats[project.userId]) {
          const userName = project.firstName && project.lastName 
            ? `${project.firstName} ${project.lastName}`
            : project.email || 'Unknown';
          
          userStats[project.userId] = {
            userName,
            delays: [],
            onTimeCount: 0
          };
        }

        const delay = Math.max(0, Number(project.delayDays) || 0);
        userStats[project.userId].delays.push(delay);
        
        if (delay <= 1) { // <= 1 day = on time
          userStats[project.userId].onTimeCount++;
        }
      }

      // Build result
      const results = Object.entries(userStats).map(([userId, stats]) => {
        const avgDelayDays = stats.delays.length > 0 
          ? stats.delays.reduce((a, b) => a + b, 0) / stats.delays.length 
          : 0;
        const onTimeRate = stats.delays.length > 0 
          ? (stats.onTimeCount / stats.delays.length) * 100 
          : 0;

        return {
          userId,
          userName: stats.userName,
          projectCount: stats.delays.length,
          avgDelayDays,
          onTimeCount: stats.onTimeCount,
          onTimeRate
        };
      });

      return results.sort((a, b) => b.onTimeRate - a.onTimeRate);
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
  }

  async transaction<T>(
    callback: (tx: DrizzleTransaction) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    logger.warn('MemStorage ne supporte pas les transactions réelles - exécution directe', {
      service: 'MemStorage',
      metadata: { operation: 'transaction' }
    });
    return callback(db as DrizzleTransaction);
  }

  // Sync Config operations - Not implemented in MemStorage
  async getSyncConfig(): Promise<SyncConfig | undefined> {
    throw new AppError("MemStorage: getSyncConfig not implemented", 500);
  }

  async updateSyncConfig(config: Partial<InsertSyncConfig>): Promise<SyncConfig> {
    throw new AppError("MemStorage: updateSyncConfig not implemented", 500);
  }

}

// Export default instance
export const storage = new DatabaseStorage();

// NUCLEAR FIX: Directly attach SQL aggregation methods to storage instance
// This bypasses any TypeScript transpilation issues
logger.info('[STORAGE-POC] Checking prototype methods:', {
  hasGetProjectStats: typeof DatabaseStorage.prototype.getProjectStats,
  hasGetOfferStats: typeof DatabaseStorage.prototype.getOfferStats,
  hasGetConversionStats: typeof DatabaseStorage.prototype.getConversionStats,
  hasGetAOStats: typeof DatabaseStorage.prototype.getAOStats,
  hasGetProjectDelayStats: typeof DatabaseStorage.prototype.getProjectDelayStats,
  hasGetTeamPerformanceStats: typeof DatabaseStorage.prototype.getTeamPerformanceStats
});
(storage as any).getProjectStats = DatabaseStorage.prototype.getProjectStats;
(storage as any).getOfferStats = DatabaseStorage.prototype.getOfferStats;
(storage as any).getConversionStats = DatabaseStorage.prototype.getConversionStats;
(storage as any).getAOStats = DatabaseStorage.prototype.getAOStats;
(storage as any).getProjectDelayStats = DatabaseStorage.prototype.getProjectDelayStats;
(storage as any).getTeamPerformanceStats = DatabaseStorage.prototype.getTeamPerformanceStats;
logger.info('[STORAGE-POC] Methods attached. Checking storage instance:', {
  hasGetProjectStats: typeof (storage as any).getProjectStats,
  hasGetOfferStats: typeof (storage as any).getOfferStats,
  hasGetConversionStats: typeof (storage as any).getConversionStats,
  hasGetAOStats: typeof (storage as any).getAOStats,
  hasGetProjectDelayStats: typeof (storage as any).getProjectDelayStats,
  hasGetTeamPerformanceStats: typeof (storage as any).getTeamPerformanceStats
});

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
    return withErrorHandling(
    async () => {

      const [result] = await db.insert(bugReports).values(bugReport).returning();
      logger.info(`Rapport de bug créé avec ID: ${result.id}`);
      return result;
    
    },
    {
      operation: 'getUsers',
      service: 'storage-poc',
      metadata: {}
    }
  );
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

// FORCE: Assurer que les méthodes SQL d'agrégation sont disponibles sur l'instance
logger.info('[STORAGE-POC] Module-level code executing - checking SQL aggregation methods...');
const dbStorage = storage as any;
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
  const proto = DatabaseStorage.prototype as any;
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