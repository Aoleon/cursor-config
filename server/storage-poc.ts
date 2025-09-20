import { eq, desc, and, sql, gte, lte, count, sum, avg, ne } from "drizzle-orm";
import { 
  users, aos, offers, projects, projectTasks, supplierRequests, teamResources, beWorkload,
  chiffrageElements, dpgfDocuments, aoLots, maitresOuvrage, maitresOeuvre, contactsMaitreOeuvre,
  validationMilestones, visaArchitecte, technicalAlerts, technicalAlertHistory,
  projectTimelines, dateIntelligenceRules, dateAlerts, businessMetrics, kpiSnapshots, performanceBenchmarks,
  alertThresholds, businessAlerts,
  type User, type UpsertUser, 
  type Ao, type InsertAo,
  type Offer, type InsertOffer,
  type Project, type InsertProject,
  type ProjectTask, type InsertProjectTask,
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
  type ProjectStatus
} from "@shared/schema";
import { db } from "./db";
import type { EventBus } from "./eventBus";

// Logger simple pour les opérations storage
const logger = {
  info: (message: string, metadata?: any) => console.log(`[Storage] ${message}`, metadata || ''),
  error: (message: string, error?: any) => console.error(`[Storage] ${message}`, error || ''),
  warn: (message: string, metadata?: any) => console.warn(`[Storage] ${message}`, metadata || '')
};

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
  getProjects(): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]>;
  getProject(id: string): Promise<(Project & { responsibleUser?: User; offer?: Offer }) | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  
  // Project task operations - Planning partagé
  getProjectTasks(projectId: string): Promise<(ProjectTask & { assignedUser?: User })[]>;
  getAllTasks(): Promise<(ProjectTask & { assignedUser?: User })[]>;
  createProjectTask(task: InsertProjectTask): Promise<ProjectTask>;
  updateProjectTask(id: string, task: Partial<InsertProjectTask>): Promise<ProjectTask>;
  
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
  getActiveRules(filters?: { phase?: ProjectStatus, projectType?: string }): Promise<DateIntelligenceRule[]>;
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
  acknowledgeAlert(id: string, userId: string): Promise<DateAlert>;
  resolveAlert(id: string, userId: string, actionTaken?: string): Promise<DateAlert>;

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

  // ========================================
  // MÉTHODES POUR PREDICTIVE ENGINE SERVICE
  // ========================================
  
  // Données historiques revenues par mois pour forecasting
  getMonthlyRevenueHistory(params: { start_date: string; end_date: string }): Promise<Array<{
    period: string; // Format YYYY-MM
    total_revenue: number;
    offer_count: number;
    avg_margin: number;
    conversion_rate: number;
    project_types: Record<string, number>;
  }>>;

  // Données historiques délais projets pour détection risques
  getProjectDelayHistory(params: { start_date: string; end_date: string }): Promise<Array<{
    project_id: string;
    project_type: string;
    planned_days: number;
    actual_days: number;
    delay_days: number;
    completion_date: string;
    responsible_user_id?: string;
    complexity_factors: string[];
  }>>;

  // Historique charge équipe pour analyse et recommandations
  getTeamLoadHistory(params: { start_date: string; end_date: string }): Promise<Array<{
    user_id: string;
    period: string; // Format YYYY-MM
    utilization_rate: number;
    hours_assigned: number;
    hours_capacity: number;
    efficiency_score: number;
    project_count: number;
  }>>;

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

  // Marquer comme accusé réception
  acknowledgeAlert(id: string, user_id: string, notes?: string): Promise<boolean>;

  // Résoudre alerte
  resolveAlert(id: string, user_id: string, resolution_notes: string): Promise<boolean>;

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
    const [updatedOffer] = await db
      .update(offers)
      .set({ ...offer, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    
    // AUTOMATISATION BATIGEST : Génération automatique du code chantier lors d'accord AO
    if (offer.status && (offer.status === 'accord_ao' || offer.status === 'fin_etudes_validee')) {
      console.log(`[WORKFLOW] 🤖 Accord AO détecté - Déclenchement génération automatique code Batigest pour offre ${id}`);
      
      // Génération asynchrone pour ne pas bloquer la réponse
      setImmediate(async () => {
        try {
          // Importer le service Batigest de façon dynamique pour éviter les imports circulaires
          const { batigestService } = await import('./batigestService');
          
          // Rechercher le projet associé à cette offre
          const projects = await this.getProjects();
          const relatedProject = projects.find(p => p.offerId === id);
          
          if (relatedProject) {
            console.log(`[BATIGEST] 📋 Projet associé trouvé: ${relatedProject.name} (${relatedProject.id})`);
            
            // Vérifier si un code Batigest n'existe pas déjà (idempotence)
            if (!updatedOffer.batigestRef) {
              const result = await batigestService.generateChantierCode(relatedProject.id, {
                reference: updatedOffer.reference,
                client: updatedOffer.client,
                intituleOperation: updatedOffer.intituleOperation,
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
                
                console.log(`[BATIGEST] ✅ Code chantier automatiquement assigné à l'offre: ${result.batigestRef}`);
                
                // Mettre à jour aussi le projet associé si nécessaire
                await db
                  .update(projects)
                  .set({ 
                    batigestRef: result.batigestRef,
                    updatedAt: new Date() 
                  })
                  .where(eq(projects.id, relatedProject.id));
                  
                console.log(`[BATIGEST] ✅ Code chantier automatiquement assigné au projet: ${result.batigestRef}`);
              } else {
                console.warn(`[BATIGEST] ⚠️ Échec génération automatique: ${result.message}`);
              }
            } else {
              console.log(`[BATIGEST] ℹ️ Code Batigest déjà existant pour cette offre: ${updatedOffer.batigestRef} (idempotence)`);
            }
          } else {
            console.warn(`[BATIGEST] ⚠️ Aucun projet associé trouvé pour l'offre ${id} - Génération de code chantier reportée`);
          }
        } catch (error) {
          console.error('[BATIGEST] ❌ Erreur lors de la génération automatique du code chantier:', error);
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
  async getProjects(): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]> {
    const baseProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

    const result = [];
    for (const project of baseProjects) {
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
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
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

      // 🔍 DEBUG - Vérifier les champs DB bruts avant mapping  
      console.log('🔍 STORAGE getAllTasks - Raw DB task:', {
        id: task.id,
        name: task.name,
        projectId: task.projectId,
        parentTaskId: task.parentTaskId,
        hasProjectId: !!task.projectId,
        hasParentTaskId: !!task.parentTaskId,
        allKeys: Object.keys(task)
      });

      result.push({ ...task, assignedUser });
    }

    console.log('🔍 STORAGE getAllTasks - Final result summary:', {
      totalTasks: result.length,
      tasksWithParentId: result.filter(t => t.parentTaskId).length,
      tasksWithProjectId: result.filter(t => t.projectId).length
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
      console.log('[Storage] Aucune configuration scoring trouvée, utilisation des valeurs par défaut');
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
    console.log('[Storage] Mise à jour configuration scoring:', JSON.stringify(config, null, 2));
    
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
    console.log('[Storage] Configuration scoring mise à jour avec succès');
  }

  // ========================================
  // GESTION ALERTES TECHNIQUES
  // ========================================
  
  // Stockage en mémoire pour les alertes techniques (POC)
  private static technicalAlerts: Map<string, TechnicalAlert> = new Map();
  private static technicalAlertHistory: Map<string, TechnicalAlertHistory[]> = new Map();

  async enqueueTechnicalAlert(alert: InsertTechnicalAlert): Promise<TechnicalAlert> {
    const id = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const technicalAlert: TechnicalAlert = {
      id,
      aoId: alert.aoId,
      aoReference: alert.aoReference,
      score: alert.score,
      triggeredCriteria: alert.triggeredCriteria,
      status: alert.status || 'pending',
      assignedToUserId: alert.assignedToUserId || null,
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
    await this.addTechnicalAlertHistory(id, 'created', alert.assignedToUserId, 'Alerte technique créée');
    
    console.log(`[Storage] Alerte technique créée: ${id} pour AO ${alert.aoReference}`);
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
    return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
    alert.updatedAt = new Date().toISOString();
    
    DatabaseStorage.technicalAlerts.set(id, alert);
    
    await this.addTechnicalAlertHistory(id, 'acknowledged', userId, 'Alerte acknowledged par l\'utilisateur');
    console.log(`[Storage] Alerte ${id} acknowledged par ${userId}`);
  }

  async validateTechnicalAlert(id: string, userId: string): Promise<void> {
    const alert = DatabaseStorage.technicalAlerts.get(id);
    if (!alert) {
      throw new Error(`Alerte technique ${id} introuvable`);
    }

    alert.status = 'validated';
    alert.updatedAt = new Date().toISOString();
    alert.validatedAt = new Date().toISOString();
    alert.validatedByUserId = userId;
    
    DatabaseStorage.technicalAlerts.set(id, alert);
    
    await this.addTechnicalAlertHistory(id, 'validated', userId, 'Alerte validée par l\'utilisateur');
    console.log(`[Storage] Alerte ${id} validée par ${userId}`);
  }

  async bypassTechnicalAlert(id: string, userId: string, until: Date, reason: string): Promise<void> {
    const alert = DatabaseStorage.technicalAlerts.get(id);
    if (!alert) {
      throw new Error(`Alerte technique ${id} introuvable`);
    }

    alert.status = 'bypassed';
    alert.updatedAt = new Date().toISOString();
    alert.bypassUntil = until.toISOString();
    alert.bypassReason = reason;
    
    DatabaseStorage.technicalAlerts.set(id, alert);
    
    await this.addTechnicalAlertHistory(
      id, 
      'bypassed', 
      userId, 
      `Alerte bypassée jusqu'au ${until.toLocaleString('fr-FR')}. Raison: ${reason}`,
      { bypassUntil: until.toISOString(), bypassReason: reason }
    );
    
    console.log(`[Storage] Alerte ${id} bypassée par ${userId} jusqu'au ${until.toISOString()}`);
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
      action,
      actorUserId,
      timestamp: new Date().toISOString(),
      note: note || null,
      metadata: metadata || null,
    };

    const alertHistoryKey = alertId || 'system';
    const existing = DatabaseStorage.technicalAlertHistory.get(alertHistoryKey) || [];
    existing.push(historyEntry);
    DatabaseStorage.technicalAlertHistory.set(alertHistoryKey, existing);
    
    console.log(`[Storage] Historique ajouté pour alerte ${alertId}: ${action}`);
    return historyEntry;
  }

  async listTechnicalAlertHistory(alertId: string): Promise<TechnicalAlertHistory[]> {
    const history = DatabaseStorage.technicalAlertHistory.get(alertId) || [];
    
    // Trier par timestamp (plus récent en premier)
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async listAoSuppressionHistory(aoId: string): Promise<TechnicalAlertHistory[]> {
    // Récupérer l'historique des suppressions pour cet AO
    const suppressionKey = `ao-suppression-${aoId}`;
    const history = DatabaseStorage.technicalAlertHistory.get(suppressionKey) || [];
    
    // Trier par timestamp (plus récent en premier)
    return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ========================================
  // RÈGLES MATÉRIAUX-COULEURS - PATTERNS AVANCÉS OCR
  // ========================================

  async getMaterialColorRules(): Promise<MaterialColorAlertRule[]> {
    console.log(`[Storage] Récupération de ${DatabaseStorage.materialColorRules.length} règles matériaux-couleurs`);
    // Retourner une copie pour éviter les modifications directes
    return [...DatabaseStorage.materialColorRules];
  }

  async setMaterialColorRules(rules: MaterialColorAlertRule[]): Promise<void> {
    console.log(`[Storage] Mise à jour des règles matériaux-couleurs: ${rules.length} règles`);
    
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
    
    console.log(`[Storage] ${rules.length} règles matériaux-couleurs mises à jour avec succès`);
    console.log(`[Storage] IDs des règles: ${rules.map(r => r.id).join(', ')}`);
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
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    console.log(`[Storage] Récupération de ${timelines.length} timelines pour projet ${projectId}`);
    return timelines;
  }

  async getAllProjectTimelines(): Promise<ProjectTimeline[]> {
    const timelines = Array.from(DatabaseStorage.projectTimelines.values())
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    
    console.log(`[Storage] Récupération de ${timelines.length} timelines totales`);
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
    console.log(`[Storage] Timeline créée: ${id} pour projet ${data.projectId}, phase ${data.phase}`);
    
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
    console.log(`[Storage] Timeline mise à jour: ${id}`);
    
    return updated;
  }

  async deleteProjectTimeline(id: string): Promise<void> {
    const existing = DatabaseStorage.projectTimelines.get(id);
    if (!existing) {
      throw new Error(`Timeline ${id} non trouvée`);
    }

    DatabaseStorage.projectTimelines.delete(id);
    console.log(`[Storage] Timeline supprimée: ${id}`);
  }

  // ========================================
  // DATE INTELLIGENCE RULES OPERATIONS
  // ========================================

  async getActiveRules(filters?: { phase?: ProjectStatus, projectType?: string }): Promise<DateIntelligenceRule[]> {
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
    
    console.log(`[Storage] ${rules.length} règles actives trouvées avec filtres:`, filters);
    return rules;
  }

  async getAllRules(): Promise<DateIntelligenceRule[]> {
    const rules = Array.from(DatabaseStorage.dateIntelligenceRules.values())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    console.log(`[Storage] ${rules.length} règles totales récupérées`);
    return rules;
  }

  async getRule(id: string): Promise<DateIntelligenceRule | undefined> {
    const rule = DatabaseStorage.dateIntelligenceRules.get(id);
    console.log(`[Storage] Règle ${id} ${rule ? 'trouvée' : 'non trouvée'}`);
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
    console.log(`[Storage] Règle créée: ${id} - ${rule.name}`);
    
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
    console.log(`[Storage] Règle mise à jour: ${id}`);
    
    return updated;
  }

  async deleteRule(id: string): Promise<void> {
    const existing = DatabaseStorage.dateIntelligenceRules.get(id);
    if (!existing) {
      throw new Error(`Règle ${id} non trouvée`);
    }

    DatabaseStorage.dateIntelligenceRules.delete(id);
    console.log(`[Storage] Règle supprimée: ${id}`);
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
    
    console.log(`[Storage] ${alerts.length} alertes trouvées avec filtres:`, filters);
    return alerts;
  }

  async getDateAlert(id: string): Promise<DateAlert | undefined> {
    const alert = DatabaseStorage.dateAlerts.get(id);
    console.log(`[Storage] Alerte ${id} ${alert ? 'trouvée' : 'non trouvée'}`);
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
    console.log(`[Storage] Alerte créée: ${id} - ${alert.title}`);
    
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
    console.log(`[Storage] Alerte mise à jour: ${id}`);
    
    return updated;
  }

  async deleteDateAlert(id: string): Promise<void> {
    const existing = DatabaseStorage.dateAlerts.get(id);
    if (!existing) {
      throw new Error(`Alerte ${id} non trouvée`);
    }

    DatabaseStorage.dateAlerts.delete(id);
    console.log(`[Storage] Alerte supprimée: ${id}`);
  }

  async acknowledgeAlert(id: string, userId: string): Promise<DateAlert> {
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
    console.log(`[Storage] Alerte acquittée: ${id} par ${userId}`);
    
    return updated;
  }

  async resolveAlert(id: string, userId: string, actionTaken?: string): Promise<DateAlert> {
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
    console.log(`[Storage] Alerte résolue: ${id} par ${userId}`);
    
    return updated;
  }

  // ========================================
  // ANALYTICS SERVICE OPERATIONS - PHASE 3.1.3
  // ========================================

  // KPI Snapshots operations
  async createKPISnapshot(data: InsertKpiSnapshot): Promise<KpiSnapshot> {
    const [snapshot] = await db.insert(kpiSnapshots).values(data).returning();
    console.log(`[Storage] KPI Snapshot créé pour période ${data.periodFrom} → ${data.periodTo}`);
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
    console.log(`[Storage] ${snapshots.length} KPI snapshots trouvés pour la période`);
    return snapshots;
  }

  async getLatestKPISnapshot(): Promise<KpiSnapshot | null> {
    const [latest] = await db.select()
      .from(kpiSnapshots)
      .orderBy(desc(kpiSnapshots.snapshotDate))
      .limit(1);
    
    console.log(`[Storage] Dernier KPI snapshot: ${latest ? latest.id : 'aucun'}`);
    return latest || null;
  }

  // Business Metrics operations  
  async createBusinessMetric(data: InsertBusinessMetric): Promise<BusinessMetric> {
    const [metric] = await db.insert(businessMetrics).values(data).returning();
    console.log(`[Storage] Métrique business créée: ${data.metricType} pour période ${data.periodStart} → ${data.periodEnd}`);
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
    console.log(`[Storage] ${metrics.length} métriques business trouvées avec filtres`);
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

    console.log(`[Storage] ${metrics.length} métriques ${metricType} trouvées en série temporelle`);
    return metrics;
  }

  // Performance Benchmarks operations
  async createPerformanceBenchmark(data: InsertPerformanceBenchmark): Promise<PerformanceBenchmark> {
    const [benchmark] = await db.insert(performanceBenchmarks).values(data).returning();
    console.log(`[Storage] Benchmark performance créé: ${data.benchmarkType} pour ${data.entityType}:${data.entityId}`);
    return benchmark;
  }

  async getBenchmarks(entityType: string, entityId?: string): Promise<PerformanceBenchmark[]> {
    let query = db.select()
      .from(performanceBenchmarks)
      .where(eq(performanceBenchmarks.entityType, entityType));

    if (entityId) {
      query = query.where(
        and(
          eq(performanceBenchmarks.entityType, entityType),
          eq(performanceBenchmarks.entityId, entityId)
        )
      );
    }

    const benchmarks = await query.orderBy(desc(performanceBenchmarks.createdAt));
    console.log(`[Storage] ${benchmarks.length} benchmarks trouvés pour ${entityType}${entityId ? `:${entityId}` : ''}`);
    return benchmarks;
  }

  async getTopPerformers(metricType: string, limit: number = 10): Promise<PerformanceBenchmark[]> {
    // Pour simplifier, on utilise le score de performance global
    const performers = await db.select()
      .from(performanceBenchmarks)
      .orderBy(desc(performanceBenchmarks.performanceScore))
      .limit(limit);

    console.log(`[Storage] Top ${performers.length} performers trouvés`);
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
      console.log(`[Storage] Récupération historique revenus mensuel de ${range.start_date} à ${range.end_date}`);
      
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

      console.log(`[Storage] ${formattedResults.length} mois d'historique revenus trouvés`);
      return formattedResults;
    } catch (error) {
      console.error('[Storage] Erreur getMonthlyRevenueHistory:', error);
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
      console.log(`[Storage] Récupération historique délais projets de ${range.start_date} à ${range.end_date}`);
      
      // Requête pour calculer les délais des projets terminés
      const results = await db
        .select({
          project_id: projects.id,
          planned_days: sql<number>`COALESCE(CAST(${projects.delaiContractuel} AS INTEGER), 90)`, // Délai contractuel ou 90j par défaut
          actual_days: sql<number>`CASE 
            WHEN ${projects.startDate} IS NOT NULL AND ${projects.endDate} IS NOT NULL 
            THEN EXTRACT(DAYS FROM ${projects.endDate} - ${projects.startDate})::INTEGER
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
            sql`${projects.startDate} IS NOT NULL`,
            sql`${projects.endDate} IS NOT NULL`
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

      console.log(`[Storage] ${formattedResults.length} projets avec historique délais trouvés`);
      return formattedResults;
    } catch (error) {
      console.error('[Storage] Erreur getProjectDelayHistory:', error);
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
      console.log(`[Storage] Récupération historique charge équipes de ${range.start_date} à ${range.end_date}`);
      
      // Requête pour agréger la charge équipes par mois
      const results = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${beWorkload.createdAt})::date`,
          total_hours: sql<number>`SUM(CAST(${beWorkload.plannedHours} AS NUMERIC))`,
          capacity_hours: sql<number>`SUM(CAST(${beWorkload.capacityHours} AS NUMERIC))`,
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
          month: sql<string>`DATE_TRUNC('month', ${projects.startDate})::date`,
          avg_duration: sql<number>`AVG(EXTRACT(DAYS FROM ${projects.endDate} - ${projects.startDate}))`
        })
        .from(projects)
        .where(
          and(
            gte(projects.startDate, new Date(range.start_date)),
            lte(projects.startDate, new Date(range.end_date)),
            sql`${projects.startDate} IS NOT NULL`,
            sql`${projects.endDate} IS NOT NULL`
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${projects.startDate})`)
        .orderBy(sql`DATE_TRUNC('month', ${projects.startDate})`);

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

      console.log(`[Storage] ${formattedResults.length} mois d'historique charge équipes trouvés`);
      return formattedResults;
    } catch (error) {
      console.error('[Storage] Erreur getTeamLoadHistory:', error);
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
      
      console.log(`[Storage] Snapshot forecast sauvegardé: ${id} (période: ${forecastPeriod})`);
      return id;
    } catch (error) {
      console.error('[Storage] Erreur saveForecastSnapshot:', error);
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

      console.log(`[Storage] ${snapshots.length} snapshots forecast trouvés`);
      return snapshots;
    } catch (error) {
      console.error('[Storage] Erreur listForecastSnapshots:', error);
      throw error;
    }
  }
}

// ========================================
// CLASSE MEMSTORAGE AVEC DONNÉES MOCK RÉALISTES - PHASE 3.1.6.2
// ========================================

export class MemStorage implements IStorage {
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

  async getMonthlyRevenueHistory(range: {
    start_date: string;
    end_date: string;
  }): Promise<Array<{
    month: string;
    total_revenue: number;
    projects_count: number;
    avg_project_value: number;
  }>> {
    console.log(`[MemStorage] Mock - Historique revenus de ${range.start_date} à ${range.end_date}`);
    
    // Pattern réaliste menuiserie française avec saisonnalité
    // - Pic printemps/été (rénovations)
    // - Ralentissement hiver
    // - Croissance progressive
    return [
      { month: "2024-01", total_revenue: 85000, projects_count: 8, avg_project_value: 10625 },
      { month: "2024-02", total_revenue: 92000, projects_count: 9, avg_project_value: 10222 },
      { month: "2024-03", total_revenue: 120000, projects_count: 12, avg_project_value: 10000 },
      { month: "2024-04", total_revenue: 145000, projects_count: 15, avg_project_value: 9667 },
      { month: "2024-05", total_revenue: 168000, projects_count: 16, avg_project_value: 10500 },
      { month: "2024-06", total_revenue: 185000, projects_count: 18, avg_project_value: 10278 },
      { month: "2024-07", total_revenue: 172000, projects_count: 17, avg_project_value: 10118 },
      { month: "2024-08", total_revenue: 155000, projects_count: 14, avg_project_value: 11071 },
      { month: "2024-09", total_revenue: 165000, projects_count: 16, avg_project_value: 10313 },
      { month: "2024-10", total_revenue: 140000, projects_count: 13, avg_project_value: 10769 },
      { month: "2024-11", total_revenue: 115000, projects_count: 11, avg_project_value: 10455 },
      { month: "2024-12", total_revenue: 95000, projects_count: 9, avg_project_value: 10556 }
    ];
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
    console.log(`[MemStorage] Mock - Historique délais projets de ${range.start_date} à ${range.end_date}`);
    
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
    console.log(`[MemStorage] Mock - Historique charge équipes de ${range.start_date} à ${range.end_date}`);
    
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
    
    console.log(`[MemStorage] Mock - Snapshot forecast sauvegardé: ${id}`);
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
    console.log(`[MemStorage] Mock - ${snapshots.length} snapshots forecast retournés`);
    return snapshots;
  }

  // ========================================
  // TOUTES LES AUTRES MÉTHODES ISTORAGE - MOCK BASIQUE
  // ========================================
  
  // Note: Pour les besoins de ce POC, les autres méthodes retournent des données mock basiques
  // ou délèguent vers DatabaseStorage selon les besoins

  async getUsers(): Promise<User[]> {
    return [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    throw new Error("MemStorage: upsertUser not implemented for POC");
  }

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

  async getProjects(): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]> {
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

  async getActiveRules(filters?: { phase?: ProjectStatus, projectType?: string }): Promise<DateIntelligenceRule[]> {
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

  async acknowledgeAlert(id: string, userId: string): Promise<DateAlert> {
    throw new Error("MemStorage: acknowledgeAlert not implemented for POC");
  }

  async resolveAlert(id: string, userId: string, actionTaken?: string): Promise<DateAlert> {
    throw new Error("MemStorage: resolveAlert not implemented for POC");
  }

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
      console.error('[DatabaseStorage] Erreur getMonthlyRevenueHistory:', error);
      return [];
    }
  }

  async getProjectDelayHistory(params: { start_date: string; end_date: string }): Promise<Array<{
    project_id: string;
    project_type: string;
    planned_days: number;
    actual_days: number;
    delay_days: number;
    completion_date: string;
    responsible_user_id?: string;
    complexity_factors: string[];
  }>> {
    try {
      // Simulation de données historiques de délais pour le POC
      const delayData = [];
      const projectTypes = ['fenetre', 'porte', 'volet', 'portail'];
      
      for (let i = 0; i < 25; i++) {
        const projectType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
        const plannedDays = 30 + Math.random() * 60;
        const actualDays = plannedDays + (Math.random() - 0.7) * 20; // Tendance retards
        const delayDays = Math.max(0, actualDays - plannedDays);
        
        delayData.push({
          project_id: `proj_${i}`,
          project_type: projectType,
          planned_days: Math.round(plannedDays),
          actual_days: Math.round(actualDays),
          delay_days: Math.round(delayDays),
          completion_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          responsible_user_id: `user_${Math.floor(Math.random() * 5)}`,
          complexity_factors: ['standard']
        });
      }

      return delayData;
    } catch (error) {
      console.error('[DatabaseStorage] Erreur getProjectDelayHistory:', error);
      return [];
    }
  }

  async getTeamLoadHistory(params: { start_date: string; end_date: string }): Promise<Array<{
    user_id: string;
    period: string;
    utilization_rate: number;
    hours_assigned: number;
    hours_capacity: number;
    efficiency_score: number;
    project_count: number;
  }>> {
    try {
      // Simulation charge équipe pour le POC
      const teamData = [];
      const userIds = ['user_1', 'user_2', 'user_3', 'user_4'];
      
      const fromDate = new Date(params.start_date);
      const toDate = new Date(params.end_date);
      const currentDate = new Date(fromDate);

      while (currentDate <= toDate) {
        const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        
        for (const userId of userIds) {
          const hoursCapacity = 160; // 4 semaines * 40h
          const utilizationRate = 60 + Math.random() * 35; // 60-95%
          const hoursAssigned = Math.round(hoursCapacity * utilizationRate / 100);
          
          teamData.push({
            user_id: userId,
            period,
            utilization_rate: Math.round(utilizationRate),
            hours_assigned: hoursAssigned,
            hours_capacity: hoursCapacity,
            efficiency_score: Math.round(75 + Math.random() * 20),
            project_count: Math.round(3 + Math.random() * 4)
          });
        }

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return teamData;
    } catch (error) {
      console.error('[DatabaseStorage] Erreur getTeamLoadHistory:', error);
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
      logger.error('Erreur getActiveThresholds:', error);
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
      logger.error('Erreur getThresholdById:', error);
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
      logger.error('Erreur createThreshold:', error);
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
      logger.error('Erreur updateThreshold:', error);
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
      logger.error('Erreur deactivateThreshold:', error);
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
      logger.error('Erreur listThresholds:', error);
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
      logger.error('Erreur createBusinessAlert:', error);
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
      logger.error('Erreur getBusinessAlertById:', error);
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
      logger.error('Erreur listBusinessAlerts:', error);
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
      logger.error('Erreur updateBusinessAlertStatus:', error);
      throw error;
    }
  }

  async acknowledgeAlert(id: string, user_id: string, notes?: string): Promise<boolean> {
    try {
      const [result] = await this.db
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
      logger.error('Erreur acknowledgeAlert:', error);
      throw error;
    }
  }

  async resolveAlert(id: string, user_id: string, resolution_notes: string): Promise<boolean> {
    try {
      const [result] = await this.db
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
      logger.error('Erreur resolveAlert:', error);
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
      logger.error('Erreur findSimilarAlerts:', error);
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
      logger.error('Erreur getOpenAlertsForEntity:', error);
      throw error;
    }
  }
}

// Export default instance
export const storage = new DatabaseStorage();