import type { IStorage } from "../storage-poc";
import { withErrorHandling } from './utils/error-handler';
import { EventBus } from "../eventBus";
import { DateIntelligenceService } from "./DateIntelligenceService";
import { logger } from '../utils/logger';
import { getBusinessAnalyticsService, BusinessAnalyticsService } from "./consolidated/BusinessAnalyticsService";
import { PredictiveEngineService } from "./PredictiveEngineService";
import type { 
  ProjectTimeline, DateAlert, InsertDateAlert, 
  Project, projectStatusEnum, DateIntelligenceRule,
  User, Offer, Ao, AlertThreshold, InsertBusinessAlert, ThresholdKey
} from "@shared/schema";

// Type alias for ProjectStatus from enum
type ProjectStatus = typeof projectStatusEnum.enumValues[number];

// ========================================
// TYPES ET INTERFACES POUR DÉTECTION AVANCÉE
// ========================================

export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

export interface DelayRiskDetection {
  type: 'delay_risk';
  projectId: string;
  phase: ProjectStatus;
  currentDate: Date;
  targetDate: Date;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: RiskFactor[];
  suggestedActions: ActionSuggestion[];
  confidence: number;
}

export interface PlanningConflict {
  type: 'resource_conflict' | 'dependency_violation' | 'schedule_overlap';
  affectedProjects: string[];
  conflictDate: Date;
  severity: 'minor' | 'major' | 'critical';
  resolution: ConflictResolution[];
  estimatedImpact: number; // en jours
}

export interface CriticalDeadline {
  type: 'deadline_critical';
  entityType: 'project' | 'offer' | 'ao';
  entityId: string;
  entityReference: string;
  deadline: Date;
  daysRemaining: number;
  bufferDays: number;
  preparationStatus: 'not_started' | 'in_progress' | 'ready';
  requiredActions: string[];
}

export interface OptimizationOpportunity {
  type: 'optimization';
  entityType: 'project' | 'offer';
  entityId: string;
  opportunityType: 'parallel_phases' | 'resource_reallocation' | 'early_start';
  estimatedGainDays: number;
  feasibility: 'high' | 'medium' | 'low';
  requirements: string[];
  risks: string[];
}

export interface RiskFactor {
  name: string;
  weight: number;
  description: string;
  mitigation: string;
}

export interface ActionSuggestion {
  action: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number; // heures
  responsible: string;
  deadline?: Date;
}

export interface ConflictResolution {
  strategy: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  effectiveness: number; // 0-1
  sideEffects: string[];
}

export interface DetectionSummary {
  totalAlertsGenerated: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  criticalIssues: number;
  actionableItems: number;
  detectionRunTime: number; // ms
  nextScheduledRun: Date;
  recommendations: string[];
}

export interface WeatherForecast {
  rainDays: number;
  temperatureRisk: boolean;
  windRisk: boolean;
  confidence: number;
}

export interface TeamBooking {
  date: Date;
  requiredTeams: number;
  availableTeams: number;
  projectIds: string[];
  teamTypes: string[];
}

export interface ResourceConflict {
  date: Date;
  shortfall: number;
  affectedProjects: string[];
  priority: 'high' | 'medium' | 'low';
  resourceType: string;
}

export interface RegulatoryDeadline {
  authority: string; // ABF, Mairie, etc.
  deadline: Date;
  requiredDocs: string[];
  typicalDuration: number; // jours
}

export interface DelayRisk {
  type: string;
  estimatedDelay: number;
  confidence: number;
  mitigation: string[];
}

// ========================================
// TYPES POUR ORCHESTRATION ALERTES MÉTIER - PHASE 3.1.7.4
// ========================================

export interface ProfitabilityViolation {
  entity_type: 'global' | 'project';
  entity_id: string;
  entity_name: string;
  actual_value: number;
  variance: number;
  profitability_type: 'global_margin' | 'project_margin';
}

export interface TeamUtilizationViolation {
  team_id: string;
  team_name: string;
  utilization_rate: number;
  variance: number;
  current_projects: number;
  capacity: number;
  period: string;
}

export interface PredictiveRiskViolation {
  project_id: string;
  risk_score: number;
  variance: number;
  risk_factors: unknown[];
  predicted_delay_days?: number;
  predicted_budget_overrun?: number;
}

// ========================================
// SERVICE PRINCIPAL DE DÉTECTION D'ALERTES
// ========================================

export class DateAlertDetectionService {
  constructor(
    private storage: IStorage,
    private eventBus: EventBus,
    private dateIntelligenceService: DateIntelligenceService,
    private menuiserieRules: MenuiserieDetectionRules,
    private analyticsService: BusinessAnalyticsService,          // MIGRATED TO CONSOLIDATED
    private predictiveEngineService: PredictiveEngineService // NOUVELLE DÉPENDANCE
  ) {
  }

  // ========================================
  // DÉTECTION PROACTIVE RETARDS
  // ========================================
  
  async detectDelayRisks(projectId?: string): Promise<InsertDateAlert[]> {
    const alerts: InsertDateAlert[] = [];
    
    return withErrorHandling(
    async () => {

      // Récupérer les projets actifs
      let projects: (Project & { responsibleUser?: User; offer?: Offer })[];
      
      if (projectId) {
        const project = await this.storage.getProject(projectId);
        projects = project ? [project] : [];
      } else {
        // OPTIMISATION: Use pagination instead of loading 375 projects
        const { projects: paginatedProjects } = await this.storage.getProjectsPaginated(undefined, undefined, 1000, 0);
        projects = paginatedProjects;
      }

      // Analyser chaque projet pour détecter les risques de retard
      for (const project of projects) {
        if (!project || project.status === 'sav') continue;
        
        const timelines = await this.storage.getProjectTimelines(project.id);
        const currentPhaseTimeline = timelines.find(t => t.phase === project.status);
        
        if (!currentPhaseTimeline) continue;
        
        // Détection basée sur le progrès actuel
        const delayRisk = await this.analyzeProjectDelayRisk(project, currentPhaseTimeline, timelines);
        
        if (delayRisk) {
          const alert = await this.createDelayRiskAlert(project, delayRisk);
          if (alert) {
            alerts.push(alert);
          }
        }
        
        // Détection météorologique spécialisée
        if (project.status === 'chantier') {
          const weatherRisk = this.menuiserieRules.detectWeatherRelatedDelays(currentPhaseTimeline);
          if (weatherRisk) {
            const weatherAlert = await this.createWeatherDelayAlert(project, weatherRisk);
            if (weatherAlert) alerts.push(weatherAlert);
          }
        }
      }
      
      logger.info('Détection risques de retard', { metadata: {
          service: 'DateAlertDetectionService',
          operation: 'detectDelayRisks',
          alertsCount: alerts.length
        }
      });
      return alerts;
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return [];
    }
  );
  }

  // ========================================
  // ANALYSE CONFLITS PLANNING
  // ========================================
  
  async detectPlanningConflicts(timeframe: TimeRange): Promise<InsertDateAlert[]> {
    const alerts: InsertDateAlert[] = [];
    
    return withErrorHandling(
    async () => {

      // Récupérer toutes les timelines dans la période
      const allTimelines = await this.storage.getAllProjectTimelines();
      const timelinesInRange = allTimelines.filter(tl  => {
        // Skip timelines without dates
        if (!tl.plannedStartDate || !tl.plannedEndDate) {
          return false;
        }
        return (tl.plannedStartDate >= timeframe.startDate && tl.plannedStartDate <= timeframe.endDate) ||
               (tl.plannedEndDate >= timeframe.startDate && tl.plannedEndDate <= timeframe.endDate);
      });
      
      // 1. Détection conflits de ressources équipes
      const resourceConflicts = this.menuiserieRules.detectTeamResourceConflicts(timelinesInRange);
      for (const conflict of resourceConflicts) {
        const alert = await this.createResourceConflictAlert(conflict);
        if (alert) alerts.push(alert);
      }
      
      // 2. Détection violations de dépendances
      const dependencyViolations = await this.detectDependencyViolations(timelinesInRange);
      for (const violation of dependencyViolations) {
        const alert = await this.createDependencyViolationAlert(violation);
        if (alert) alerts.push(alert);
      }
      
      // 3. Détection superpositions de planning
      const scheduleOverlaps = await this.detectScheduleOverlaps(timelinesInRange);
      for (const overlap of scheduleOverlaps) {
        const alert = await this.createScheduleOverlapAlert(overlap);
        if (alert) alerts.push(alert);
      }
      
      logger.info('Détection conflits de planning', { metadata: {
          service: 'DateAlertDetectionService',
          operation: 'detectPlanningConflicts',
          alertsCount: alerts.length
        }
      });
      return alerts;
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return [];
    }
  );
  }

  // ========================================
  // VÉRIFICATION ÉCHÉANCES CRITIQUES
  // ========================================
  
  async checkCriticalDeadlines(daysAhead: number = 7): Promise<InsertDateAlert[]> {
    const alerts: InsertDateAlert[] = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
    
    return withErrorHandling(
    async () => {

      // 1. Vérification échéances projets
      const projects = await this.storage.getProjects();
      for (const project of projects) {
        const criticalDeadlines = await this.extractCriticalDeadlines(project, cutoffDate);
        for (const deadline of criticalDeadlines) {
          const alert = await this.createCriticalDeadlineAlert(deadline);
          if (alert) alerts.push(alert);
        }
      }
      
      // 2. Vérification échéances offres
      const offers = await this.storage.getOffers();
      for (const offer of offers) {
        if (offer.dateLimiteRemise && new Date(offer.dateLimiteRemise) <= cutoffDate) {
          const deadline: CriticalDeadline = {
            type: 'deadline_critical',
            entityType: 'offer',
            entityId: offer.id,
            entityReference: offer.reference || 'Offre sans référence',
            deadline: new Date(offer.dateLimiteRemise),
            daysRemaining: Math.ceil((new Date(offer.dateLimiteRemise).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
            bufferDays: 2, // 2 jours de buffer par défaut pour offres
            preparationStatus: this.assessOfferPreparationStatus(offer),
            requiredActions: this.getOfferRequiredActions(offer)
          };
          
          const alert = await this.createCriticalDeadlineAlert(deadline);
          if (alert) alerts.push(alert);
        }
      }
      
      // 3. Vérification échéances réglementaires (ABF, etc.)
      const regulatoryAlerts = this.menuiserieRules.detectRegulatoryDeadlines(projects);
      for (const regAlert of regulatoryAlerts) {
        const deadline: CriticalDeadline = {
          type: 'deadline_critical',
          entityType: 'project',
          entityId: regAlert.projectId,
          entityReference: `Projet ${regAlert.projectId}`,
          deadline: regAlert.deadline,
          daysRemaining: Math.ceil((regAlert.deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
          bufferDays: regAlert.preparationTime,
          preparationStatus: 'not_started',
          requiredActions: regAlert.documentsRequired
        };
        
        const alert = await this.createRegulatoryDeadlineAlert(deadline, regAlert.authority);
        if (alert) alerts.push(alert);
      }
      
      logger.info('Détection échéances critiques', { metadata: {
          service: 'DateAlertDetectionService',
          operation: 'detectCriticalDeadlines',
          alertsCount: alerts.length   
              }
             } });
      return alerts;
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return [];
    }
  );
  }

  // ========================================
  // DÉTECTION OPTIMISATIONS POSSIBLES
  // ========================================
  
  async detectOptimizationOpportunities(): Promise<InsertDateAlert[]> {
    const alerts: InsertDateAlert[] = [];
    
    return withErrorHandling(
    async () => {

      const projects = await this.storage.getProjects();
      
      for (const project of projects) {
        if (project.status === 'sav' || project.status === 'chantier') continue;
        
        const timelines = await this.storage.getProjectTimelines(project.id);
        
        // 1. Détection possibilités de parallélisation
        const parallelOpportunities = await this.detectParallelizationOpportunities(project, timelines);
        for (const opp of parallelOpportunities) {
          const alert = await this.createOptimizationAlert(opp);
          if (alert) alerts.push(alert);
        }
        
        // 2. Détection optimisations de ressources
        const resourceOptimizations = await this.detectResourceOptimizations(project, timelines);
        for (const opt of resourceOptimizations) {
          const alert = await this.createOptimizationAlert(opt);
          if (alert) alerts.push(alert);
        }
        
        // 3. Détection possibilités de démarrage anticipé
        const earlyStartOpportunities = await this.detectEarlyStartOpportunities(project, timelines);
        for (const early of earlyStartOpportunities) {
          const alert = await this.createOptimizationAlert(early);
          if (alert) alerts.push(alert);
        }
      }
      
      logger.info('Détection opportunités d\'optimisation', { metadata: {
          service: 'DateAlertDetectionService',
          operation: 'detectOptimizationOpportunities',
          alertsCount: alerts.length   
              }
             } });
      return alerts;
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return [];
    }
  );
  }

  // ========================================
  // TRAITEMENT GLOBAL TOUTES DÉTECTIONS
  // ========================================
  
  async runPeriodicDetection(): Promise<DetectionSummary> {
    const startTime = Date.now();
    const summary: DetectionSummary = {
      totalAlertsGenerated: 0,
      alertsByType: {},
      alertsBySeverity: {},
      criticalIssues: 0,
      actionableItems: 0,
      detectionRunTime: 0,
      nextScheduledRun: new Date(Date.now() + 60 * 60 * 1000), // +1 heure
      recommendations: []
    };
    
    return withErrorHandling(
    async () => {

      logger.info('Démarrage détection globale', { metadata: {
          service: 'DateAlertDetectionService',
          operation: 'runPeriodicDetection',
          context: { detectionType: 'periodic' 
        } });
      // 1. Détection retards
      const delayAlerts = await this.detectDelayRisks();
      // 2. Détection conflits (sur 30 jours)
      const timeframe: TimeRange = {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      const conflictAlerts = await this.detectPlanningConflicts(timeframe);
      // 3. Échéances critiques (7 jours)
      const deadlineAlerts = await this.checkCriticalDeadlines(7);
      // 4. Optimisations
      const optimizationAlerts = await this.detectOptimizationOpportunities();
      // Consolidation des alertes
      const allAlerts = [...delayAlerts, ...conflictAlerts, ...deadlineAlerts, ...optimizationAlerts];
      // Déduplication des alertes similaires
      const uniqueAlerts = await this.deduplicateAlerts(allAlerts);
      // Sauvegarde en base
      for (const alert of uniqueAlerts) {
        const savedAlert = await this.storage.createDateAlert(alert);
        // Notification temps réel
        await this.notifyNewAlert(savedAlert);
        // Mise à jour statistiques
        summary.alertsByType[alert.alertType] = (summary.alertsByType[alert.alertType] || 0) + 1;
        summary.alertsBySeverity[alert.severity] = (summary.alertsBySeverity[alert.severity] || 0) + 1;
        if (alert.severity === 'critical') {
          summary.criticalIssues++;
        }
        if (alert.suggestedActions && Array.isArray(alert.suggestedActions) && alert.suggestedActions.length > 0) {
          summary.actionableItems++;
        }
      }
      summary.totalAlertsGenerated = uniqueAlerts.length;
      summary.detectionRunTime = Date.now() - startTime;
      // Génération recommandations
      summary.recommendations = this.generateRecommendations(summary);
      logger.info('Détection globale terminée', { metadata: {
          service: 'DateAlertDetectionService',
          operation: 'runPeriodicDetection',
          totalAlertsGenerated: summary.totalAlertsGenerated,
          detectionRunTimeMs: summary.detectionRunTime   
              }
            });
      return summary;
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      summary.detectionRunTime = Date.now() - startTime;
      return summary;
    });
  }
  // ========================================
  // GESTION WORKFLOW ALERTES
  // ========================================
  async acknowledgeAlert(alertId: string, userId: string, note?: string): Promise<DateAlert> {
    return withErrorHandling(
    async () => {
      const updatedAlert = await this.storage.updateDateAlert(alertId, {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        assignedTo: userId,
        actionTaken: note || 'Alerte accusée réception'
      });
      
      // Notification accusé réception
      this.eventBus.publishDateAlertAcknowledged({
        id: `alert-ack-${alertId}`,
        entity: 'date_intelligence',
        entityId: alertId,
        message: `Alerte ${alertId} accusée réception`,
        severity: 'info',
        userId,
        metadata: {
          alertId,
          acknowledgedBy: userId,
          acknowledgedAt: new Date().toISOString(),
          note
                });
      logger.info('Alerte accusée réception', { metadata: {
          service: 'DateAlertDetectionService',
          operation: 'acknowledgeAlert',
          alertId,
          userId   
              }
             } });
      return updatedAlert;
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      throw error;
    });
  }
  
  async resolveAlert(alertId: string, userId: string, resolution: string): Promise<DateAlert> {
    return withErrorHandling(
    async () => {

      const updatedAlert = await this.storage.updateDateAlert(alertId, {
        status: 'resolved',
        resolvedAt: new Date(),
        actionBy: userId,
        actionTaken: resolution
      });
      
      // Notification résolution
      this.eventBus.publishDateAlertResolved({
        id: `alert-resolved-${alertId}`,
        entity: 'date_intelligence',
        entityId: alertId,
        message: `Alerte ${alertId} résolue`,
        severity: 'success',
        userId,
        metadata: {
          alertId,
          resolvedBy: userId,
          resolvedAt: new Date().toISOString(),
          resolution
                });
      logger.info('Alerte résolue', { metadata: {
          service: 'DateAlertDetectionService',
          operation: 'resolveAlert',
          alertId,
          userId   
              }
             } });
      return updatedAlert;
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      throw error;
    });
  }

  // ========================================
  // MÉTHODES PRIVÉES UTILITAIRES
  // ========================================

  private async analyzeProjectDelayRisk(
    project: Project & { responsibleUser?: User; offer?: Offer }, 
    currentTimeline: ProjectTimeline, 
    allTimelines: ProjectTimeline[]
  ): Promise<DelayRiskDetection | null> {
    
    const now = new Date();
    const plannedEnd = new Date(currentTimeline.plannedEndDate);
    const daysUntilDeadline = Math.ceil((plannedEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    // Si déjà en retard
    if (daysUntilDeadline < 0) {
      return {
        type: 'delay_risk',
        projectId: project.id,
        phase: project.status,
        currentDate: now,
        targetDate: plannedEnd,
        riskLevel: 'high',
        confidence: 0.95,
        riskFactors: [{
          name: 'Retard confirmé',
          weight: 1.0,
          description: `Échéance dépassée de ${Math.abs(daysUntilDeadline)} jours`,
          mitigation: 'Revoir planning et affecter ressources supplémentaires'
        }],
        suggestedActions: [{
          action: 'Révision urgente du planning',
          priority: 'high',
          estimatedTime: 2,
          responsible: project.responsibleUserId || 'non-assigné'
        }]
      };
    }
    
    // Analyse prédictive du risque
    const riskFactors: RiskFactor[] = [];
    let riskScore = 0;
    
    // Facteur: Temps restant vs progression
    const progressRatio = currentTimeline.progressPercentage || 0;
    const timeRatio = 1 - (daysUntilDeadline / (currentTimeline.estimatedDuration || 1));
    
    if (timeRatio > progressRatio * 1.2) {
      riskFactors.push({
        name: 'Retard de progression',
        weight: 0.4,
        description: `Progression ${progressRatio}% vs temps écoulé ${Math.round(timeRatio * 100)}%`,
        mitigation: 'Accélération des tâches critiques'
      });
      riskScore += 40;
    }
    
    // Facteur: Complexité du projet
    if (project.offer?.complexity === 'elevee') {
      riskFactors.push({
        name: 'Complexité élevée',
        weight: 0.2,
        description: 'Projet de complexité élevée avec risques techniques',
        mitigation: 'Renforcement équipe technique'
      });
      riskScore += 20;
    }
    
    // Facteur: Dépendances critiques
    const futurePhasesCount = allTimelines.filter(tl => 
      tl.plannedStartDate > currentTimeline.plannedEndDate
    ).length;
    
    if (futurePhasesCount > 2) {
      riskFactors.push({
        name: 'Cascade de dépendances',
        weight: 0.3,
        description: `${futurePhasesCount} phases dépendantes en aval`,
        mitigation: 'Parallélisation possible des tâches'
      });
      riskScore += 25;
    }
    
    if (riskScore < 30) return null;
    
    const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';
    
    return {
      type: 'delay_risk',
      projectId: project.id,
      phase: project.status,
      currentDate: now,
      targetDate: plannedEnd,
      riskLevel,
      confidence: Math.min(0.9, riskScore / 100),
      riskFactors,
      suggestedActions: this.generateDelayMitigationActions(riskFactors, project)
    };
  }

  private generateDelayMitigationActions(riskFactors: RiskFactor[], project: Project): ActionSuggestion[] {
    const actions: ActionSuggestion[] = [];
    
    for (const factor of riskFactors) {
      if (factor.name.includes('Retard de progression')) {
        actions.push({
          action: 'Revoir planning et ressources phase actuelle',
          priority: 'high',
          estimatedTime: 3,
          responsible: project.responsibleUserId || 'non-assigné'
        });
      }
      
      if (factor.name.includes('Complexité')) {
        actions.push({
          action: 'Consultation expert technique',
          priority: 'medium',
          estimatedTime: 1,
          responsible: 'chef_equipe'
        });
      }
      
      if (factor.name.includes('Cascade')) {
        actions.push({
          action: 'Analyse possibilités parallélisation',
          priority: 'medium',
          estimatedTime: 2,
          responsible: project.responsibleUserId || 'non-assigné'
        });
      }
    }
    
    return actions;
  }

  private async detectDependencyViolations(timelines: ProjectTimeline[]): Promise<PlanningConflict[]> {
    const violations: PlanningConflict[] = [];
    
    // Grouper par projet
    const projectTimelines = new Map<string, ProjectTimeline[]>();
    for (const timeline of timelines) {
      if (!projectTimelines.has(timeline.projectId)) {
        projectTimelines.set(timeline.projectId, []);
      }
      projectTimelines.get(timeline.projectId)!.push(timeline);
    }
    
    // Vérifier les dépendances pour chaque projet
    for (const [projectId, projectTLs] of projectTimelines.entries()) {
      const sortedTimelines = projectTLs.sort((a, b) => {
        const phaseOrder = ['passation', 'etude', 'visa_architecte', 'planification', 'approvisionnement', 'chantier'];
        return phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase);
      });
      
      for (let i = 1; i < sortedTimelines.length; i++) {
        const currentPhase = sortedTimelines[i];
        const previousPhase = sortedTimelines[i - 1];
        
        if (new Date(currentPhase.plannedStartDate) < new Date(previousPhase.plannedEndDate)) {
          violations.push({
            type: 'dependency_violation',
            affectedProjects: [projectId],
            conflictDate: new Date(currentPhase.plannedStartDate),
            severity: 'major',
            estimatedImpact: Math.ceil(
              (new Date(previousPhase.plannedEndDate).getTime() - new Date(currentPhase.plannedStartDate).getTime()) 
              / (24 * 60 * 60 * 1000)
            ),
            resolution: [{
              strategy: 'Décaler phase suivante',
              description: `Reporter ${currentPhase.phase} après fin de ${previousPhase.phase}`,
              effort: 'medium',
              effectiveness: 0.9,
              sideEffects: ['Impact planning global', 'Possible retard livraison']
            }]
          });
        }
      }
    }
    
    return violations;
  }

  private async detectScheduleOverlaps(timelines: ProjectTimeline[]): Promise<PlanningConflict[]> {
    const overlaps: PlanningConflict[] = [];
    
    // Recherche des superpositions de ressources
    for (let i = 0; i < timelines.length; i++) {
      for (let j = i + 1; j < timelines.length; j++) {
        const tl1 = timelines[i];
        const tl2 = timelines[j];
        
        if (tl1.projectId === tl2.projectId) continue;
        
        // Vérifier superposition temporelle
        const start1 = new Date(tl1.plannedStartDate);
        const end1 = new Date(tl1.plannedEndDate);
        const start2 = new Date(tl2.plannedStartDate);
        const end2 = new Date(tl2.plannedEndDate);
        
        if ((start1 <= end2 && end1 >= start2)) {
          // Vérifier si même type de ressources requis
          if (this.requiresSameResources(tl1, tl2)) {
            const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
            const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
            const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (24 * 60 * 60 * 1000));
            
            overlaps.push({
              type: 'schedule_overlap',
              affectedProjects: [tl1.projectId, tl2.projectId],
              conflictDate: overlapStart,
              severity: overlapDays > 5 ? 'critical' : 'major',
              estimatedImpact: overlapDays,
              resolution: [{
                strategy: 'Décalage temporel',
                description: `Décaler une des phases de ${overlapDays} jours`,
                effort: 'medium',
                effectiveness: 0.8,
                sideEffects: ['Modification planning client']
              }]
            });
          }
        }
      }
    }
    
    return overlaps;
  }

  private requiresSameResources(tl1: ProjectTimeline, tl2: ProjectTimeline): boolean {
    // Phases nécessitant équipes terrain
    const fieldPhases = ['chantier', 'approvisionnement'];
    
    // Phases nécessitant équipe BE
    const bePhases = ['etude', 'visa_architecte', 'planification'];
    
    return (fieldPhases.includes(tl1.phase) && fieldPhases.includes(tl2.phase)) ||
           (bePhases.includes(tl1.phase) && bePhases.includes(tl2.phase));
  }

  private async extractCriticalDeadlines(project: Project & { responsibleUser?: User; offer?: Offer }, cutoffDate: Date): Promise<CriticalDeadline[]> {
    const deadlines: CriticalDeadline[] = [];
    
    const timelines = await this.storage.getProjectTimelines(project.id);
    
    for (const timeline of timelines) {
      const endDate = new Date(timeline.plannedEndDate);
      
      if (endDate <= cutoffDate) {
        const daysRemaining = Math.ceil((endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        
        deadlines.push({
          type: 'deadline_critical',
          entityType: 'project',
          entityId: project.id,
          entityReference: project.reference || `Projet ${project.id}`,
          deadline: endDate,
          daysRemaining,
          bufferDays: this.getPhaseBufferDays(timeline.phase),
          preparationStatus: this.assessPhasePreparationStatus(timeline),
          requiredActions: this.getPhaseRequiredActions(timeline.phase)
        });
      }
    }
    
    return deadlines;
  }

  private getPhaseBufferDays(phase: ProjectStatus): number {
    const buffers: Record<ProjectStatus, number> = {
      'passation': 3,
      'etude': 5,
      'visa_architecte': 7,
      'planification': 3,
      'approvisionnement': 10,
      'chantier': 5,
      'sav': 2
    };
    return buffers[phase] || 3;
  }

  private assessPhasePreparationStatus(timeline: ProjectTimeline): 'not_started' | 'in_progress' | 'ready' {
    if (timeline.progressPercentage >= 90) return 'ready';
    if (timeline.progressPercentage > 0) return 'in_progress';
    return 'not_started';
  }

  private assessOfferPreparationStatus(offer: Offer): 'not_started' | 'in_progress' | 'ready' {
    if (offer.status === 'valide' || offer.status === 'transforme_en_projet') return 'ready';
    if (['en_cours_chiffrage', 'en_attente_validation'].includes(offer.status)) return 'in_progress';
    return 'not_started';
  }

  private getPhaseRequiredActions(phase: ProjectStatus): string[] {
    const actions: Record<ProjectStatus, string[]> = {
      'passation': ['Envoi dossier passation', 'Obtention VIS'],
      'etude': ['Finalisation études techniques', 'Validation plans'],
      'visa_architecte': ['Soumission dossier architecte', 'Corrections éventuelles'],
      'planification': ['Planning détaillé', 'Validation équipes'],
      'approvisionnement': ['Commandes matériaux', 'Coordination livraisons'],
      'chantier': ['Préparation site', 'Mobilisation équipes'],
      'sav': ['Contrôle qualité', 'Corrections finales']
    };
    return actions[phase] || [];
  }

  private getOfferRequiredActions(offer: Offer): string[] {
    const actions: string[] = [];
    
    if (offer.status === 'brouillon') {
      actions.push('Finalisation dossier technique');
    }
    
    if (!offer.finEtudesValidatedAt) {
      actions.push('Validation fin d\'études');
    }
    
    if (offer.status === 'en_cours_chiffrage') {
      actions.push('Finalisation chiffrage');
    }
    
    if (offer.status === 'en_attente_validation') {
      actions.push('Validation BE');
    }
    
    return actions.length > 0 ? actions : ['Finalisation offre'];
  }

  private async detectParallelizationOpportunities(project: Project, timelines: ProjectTimeline[]): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];
    
    // Recherche phases pouvant être parallélisées
    const sortedTimelines = timelines.sort((a, b) => new Date(a.plannedStartDate).getTime() - new Date(b.plannedStartDate).getTime());
    
    for (let i = 0; i < sortedTimelines.length - 1; i++) {
      const current = sortedTimelines[i];
      const next = sortedTimelines[i + 1];
      
      // Possibilité de paralléliser étude et visa architecte
      if (current.phase === 'etude' && next.phase === 'visa_architecte') {
        const potentialGain = Math.ceil(current.estimatedDuration * 0.3); // 30% de gain estimé
        
        opportunities.push({
          type: 'optimization',
          entityType: 'project',
          entityId: project.id,
          opportunityType: 'parallel_phases',
          estimatedGainDays: potentialGain,
          feasibility: 'medium',
          requirements: ['Études préliminaires prêtes', 'Architecte disponible'],
          risks: ['Possibles révisions études', 'Coordination renforcée']
        });
      }
      
      // Possibilité de débuter approvisionnement pendant planification
      if (current.phase === 'planification' && next.phase === 'approvisionnement') {
        const potentialGain = Math.ceil(next.estimatedDuration * 0.4);
        
        opportunities.push({
          type: 'optimization',
          entityType: 'project', 
          entityId: project.id,
          opportunityType: 'parallel_phases',
          estimatedGainDays: potentialGain,
          feasibility: 'high',
          requirements: ['Plans finalisés', 'Fournisseurs identifiés'],
          risks: ['Modifications plans tardives']
        });
      }
    }
    
    return opportunities;
  }

  private async detectResourceOptimizations(project: Project, timelines: ProjectTimeline[]): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];
    
    // Analyser la charge d'équipe sur le projet
    const teamResources = await this.storage.getTeamResources(project.id);
    
    if (teamResources.length === 0) return opportunities;
    
    // Identifier les périodes de sous-utilisation
    for (const timeline of timelines) {
      const resourceUsage = teamResources.filter(tr => 
        tr.plannedStartDate <= timeline.plannedEndDate && 
        tr.plannedEndDate >= timeline.plannedStartDate
      );
      
      const totalAllocatedHours = resourceUsage.reduce((sum, r) => sum + (r.allocatedHours || 0), 0);
      const timelineCapacity = timeline.estimatedDuration * 8 * (teamResources.length || 1); // 8h/jour estimé
      
      if (totalAllocatedHours < timelineCapacity * 0.7) { // Moins de 70% d'utilisation
        const potentialGain = Math.ceil(timeline.estimatedDuration * 0.2);
        
        opportunities.push({
          type: 'optimization',
          entityType: 'project',
          entityId: project.id,
          opportunityType: 'resource_reallocation',
          estimatedGainDays: potentialGain,
          feasibility: 'medium',
          requirements: ['Réorganisation équipe', 'Formation complémentaire'],
          risks: ['Surcharge temporaire', 'Qualité moindre si précipitation']
        });
      }
    }
    
    return opportunities;
  }

  private async detectEarlyStartOpportunities(project: Project, timelines: ProjectTimeline[]): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];
    
    const now = new Date();
    
    for (const timeline of timelines) {
      const plannedStart = new Date(timeline.plannedStartDate);
      const daysDifference = Math.ceil((plannedStart.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      // Si phase programmée dans plus de 7 jours et précédente terminée
      if (daysDifference > 7) {
        const previousPhases = timelines.filter(tl => 
          new Date(tl.plannedEndDate) <= plannedStart
        );
        
        const allPreviousCompleted = previousPhases.every(tl => 
          (tl.progressPercentage || 0) >= 90
        );
        
        if (allPreviousCompleted || previousPhases.length === 0) {
          opportunities.push({
            type: 'optimization',
            entityType: 'project',
            entityId: project.id,
            opportunityType: 'early_start',
            estimatedGainDays: Math.min(daysDifference - 1, 5), // Max 5 jours de gain
            feasibility: timeline.phase === 'etude' ? 'high' : 'medium',
            requirements: ['Ressources disponibles', 'Validation client si nécessaire'],
            risks: ['Précipitation', 'Indisponibilité imprevue ressources']
          });
        }
      }
    }
    
    return opportunities;
  }

  private async deduplicateAlerts(alerts: InsertDateAlert[]): Promise<InsertDateAlert[]> {
    const unique = new Map<string, InsertDateAlert>();
    
    for (const alert of alerts) {
      // Clé de déduplication basée sur entité, type et phase
      const key = `${alert.entityType}-${alert.entityId}-${alert.alertType}-${alert.phase || 'none'}`;
      
      const existing = unique.get(key);
      if (!existing || alert.severity === 'critical' && existing.severity !== 'critical') {
        unique.set(key, alert);
      }
    }
    
    return Array.from(unique.values());
  }

  private generateRecommendations(summary: DetectionSummary): string[] {
    const recommendations: string[] = [];
    
    if (summary.criticalIssues > 0) {
      recommendations.push(`${summary.criticalIssues} problème(s) critique(s) nécessitent une attention immédiate`);
    }
    
    if (summary.alertsByType['delay_risk'] > 3) {
      recommendations.push('Forte concentration de risques de retard - révision planning recommandée');
    }
    
    if (summary.alertsByType['resource_conflict'] > 1) {
      recommendations.push('Conflits de ressources détectés - optimisation allocations nécessaire');
    }
    
    if (summary.alertsByType['optimization'] > 2) {
      recommendations.push('Opportunités d\'optimisation disponibles - gains temps possibles');
    }
    
    if (summary.actionableItems / summary.totalAlertsGenerated > 0.7) {
      recommendations.push('Nombreuses actions correctives disponibles - priorisation conseillée');
    }
    
    return recommendations;
  }

  private async notifyNewAlert(alert: DateAlert): Promise<void> {
    return withErrorHandling(
    async () => {

      // Déterminer les utilisateurs à notifier
      const affectedUsers = await this.getAffectedUsers(alert);
      
      // Notification EventBus
      this.eventBus.publishDateAlertCreated({
        id: `alert-${alert.id}`,
        entity: 'date_intelligence',
        entityId: alert.entityId,
        message: `${alert.title}`,
        severity: alert.severity as unknown,
        metadata: {
          alertId: alert.id,
          alertType: alert.alertType,
          phase: alert.phase,
          targetDate: alert.targetDate?.toISOString(),
          affectedUsers,
          actionRequired: !!(alert.suggestedActions && Array.isArray(alert.suggestedActions) && alert.suggestedActions.length > 0)
                });
      // Escalade automatique si critique
      if (alert.severity === 'critical') {
        this.eventBus.publishSystemAlert({
          id: `escalation-${alert.id}`,
          entity: 'system',
          entityId: 'alert-escalation',
          message: `🚨 ALERTE CRITIQUE : ${alert.title}`,
          severity: 'critical',
          metadata: {
            originalAlert: alert.id,
            escalationLevel: 'manager',
            immediateAction: true
                          });
      }
      
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
    }
  }

  private async getAffectedUsers(alert: DateAlert): Promise<string[]> {
    const users: string[] = [];
    
    return withErrorHandling(
    async () => {

      if (alert.entityType === 'project') {
        const project = await this.storage.getProject(alert.entityId);
        if (project?.responsibleUserId) {
          users.push(project.responsibleUserId);
        }
        if (project?.chefTravauxId && project.chefTravauxId !== project.responsibleUserId) {
          users.push(project.chefTravauxId);
        }
      } else if (alert.entityType === 'offer') {
        const offer = await this.storage.getOffer(alert.entityId);
        if (offer?.responsibleUserId) {
          users.push(offer.responsibleUserId);
        }
      }
      
      return [...new Set(users)]; // Déduplication
      
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: {  
      });
      return [];
    }
  }

  // ========================================
  // MÉTHODES DE CRÉATION D'ALERTES
  // ========================================

  private async createDelayRiskAlert(
    project: Project, 
    delayRisk: DelayRiskDetection
  ): Promise<InsertDateAlert | null> {
    return withErrorHandling(
    async () => {

      const severity = delayRisk.riskLevel === 'high' ? 'critical' : delayRisk.riskLevel === 'medium' ? 'warning' : 'info';
      
      return {
        entityType: 'project',
        entityId: project.id,
        entityReference: project.reference || `Projet ${project.id}`,
        alertType: 'delay_risk',
        severity,
        category: 'planning',
        title: `Risque de retard - Phase ${delayRisk.phase}`,
        message: `Risque de retard ${delayRisk.riskLevel} détecté pour la phase ${delayRisk.phase}. ${delayRisk.riskFactors.length} facteur(s) de risque identifié(s).`,
        phase: delayRisk.phase,
        targetDate: delayRisk.targetDate,
        predictedDate: new Date(delayRisk.targetDate.getTime() + (delayRisk.riskFactors.reduce((sum, f) => sum + f.weight, 0) * 24 * 60 * 60 * 1000)),
        delayDays: Math.ceil(delayRisk.riskFactors.reduce((sum, f) => sum + f.weight, 0)),
        impactLevel: delayRisk.riskLevel === 'high' ? 'elevee' : delayRisk.riskLevel === 'medium' ? 'normale' : 'faible',
        suggestedActions: delayRisk.suggestedActions,
        status: 'pending'
      };
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return null;
    }
  }

  private async createWeatherDelayAlert(
    project: Project,
    weatherRisk: DelayRisk
  ): Promise<InsertDateAlert | null> {
    return withErrorHandling(
    async () => {

      return {
        entityType: 'project',
        entityId: project.id,
        entityReference: project.reference || `Projet ${project.id}`,
        alertType: 'external_constraint',
        severity: weatherRisk.estimatedDelay > 5 ? 'warning' : 'info',
        category: 'planning',
        title: 'Risque météorologique',
        message: `Conditions météorologiques défavorables prévues. Retard estimé: ${weatherRisk.estimatedDelay} jours.`,
        phase: 'chantier',
        delayDays: weatherRisk.estimatedDelay,
        impactLevel: weatherRisk.estimatedDelay > 5 ? 'elevee' : 'normale',
        suggestedActions: weatherRisk.mitigation.map(m  => ({ action: m, priority: 'medium' as const, estimatedTime: 1, responsible: 'chef_equipe' })),
        status: 'pending'
      };
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return null;
    }
  }

  private async createResourceConflictAlert(conflict: ResourceConflict): Promise<InsertDateAlert | null> {
    return withErrorHandling(
    async () => {

      return {
        entityType: 'project',
        entityId: conflict.affectedProjects[0], // Premier projet affecté
        alertType: 'resource_conflict',
        severity: conflict.priority === 'high' ? 'critical' : 'warning',
        category: 'planning',
        title: 'Conflit de ressources',
        message: `Conflit de ressources ${conflict.resourceType} le ${conflict.date.toLocaleDateString()}. Déficit: ${conflict.shortfall} équipe(s).`,
        targetDate: conflict.date,
        impactLevel: conflict.priority === 'high' ? 'critique' : 'elevee',
        suggestedActions: [
          { action: 'Réallocation équipes', priority: 'high', estimatedTime: 2, responsible: 'responsable_planning' },
          { action: 'Décalage temporel', priority: 'medium', estimatedTime: 1, responsible: 'chef_projet' }
        ],
        status: 'pending'
      };
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return null;
    }
  }

  private async createDependencyViolationAlert(violation: PlanningConflict): Promise<InsertDateAlert | null> {
    return withErrorHandling(
    async () => {

      return {
        entityType: 'project',
        entityId: violation.affectedProjects[0],
        alertType: 'phase_dependency',
        severity: violation.severity === 'critical' ? 'critical' : 'warning',
        category: 'planning',
        title: 'Violation de dépendance',
        message: `Violation de dépendance détectée le ${violation.conflictDate.toLocaleDateString()}. Impact estimé: ${violation.estimatedImpact} jours.`,
        targetDate: violation.conflictDate,
        delayDays: violation.estimatedImpact,
        impactLevel: violation.severity === 'critical' ? 'critique' : 'elevee',
        suggestedActions: violation.resolution.map(r  => ({
          action: r.strategy,
          priority: 'high' as const,
          estimatedTime: 2,
          responsible: 'chef_projet'
        })),
        status: 'pending'
      };
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return null;
    }
  }

  private async createScheduleOverlapAlert(overlap: PlanningConflict): Promise<InsertDateAlert | null> {
    return withErrorHandling(
    async () => {

      return {
        entityType: 'project',
        entityId: overlap.affectedProjects[0],
        alertType: 'resource_conflict',
        severity: overlap.severity === 'critical' ? 'critical' : 'warning',
        category: 'planning',
        title: 'Superposition de planning',
        message: `Superposition détectée entre projets le ${overlap.conflictDate.toLocaleDateString()}. Durée: ${overlap.estimatedImpact} jours.`,
        targetDate: overlap.conflictDate,
        delayDays: overlap.estimatedImpact,
        impactLevel: overlap.severity === 'critical' ? 'critique' : 'elevee',
        suggestedActions: overlap.resolution.map(r  => ({
          action: r.strategy,
          priority: 'high' as const,
          estimatedTime: r.effort === 'high' ? 4 : r.effort === 'medium' ? 2 : 1,
          responsible: 'responsable_planning'
        })),
        status: 'pending'
      };
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return null;
    }
  }

  private async createCriticalDeadlineAlert(deadline: CriticalDeadline): Promise<InsertDateAlert | null> {
    return withErrorHandling(
    async () => {

      const severity = deadline.daysRemaining <= deadline.bufferDays ? 'critical' : 
                      deadline.daysRemaining <= deadline.bufferDays * 2 ? 'warning' : 'info';
      
      return {
        entityType: deadline.entityType,
        entityId: deadline.entityId,
        entityReference: deadline.entityReference,
        alertType: 'deadline_critical',
        severity,
        category: 'planning',
        title: `Échéance critique approche`,
        message: `Échéance dans ${deadline.daysRemaining} jour(s). Statut: ${deadline.preparationStatus}. ${deadline.requiredActions.length} action(s) requise(s).`,
        targetDate: deadline.deadline,
        delayDays: deadline.daysRemaining < 0 ? Math.abs(deadline.daysRemaining) : 0,
        impactLevel: severity === 'critical' ? 'critique' : 'elevee',
        suggestedActions: deadline.requiredActions.map(action  => ({
          action,
          priority: deadline.daysRemaining <= deadline.bufferDays ? 'high' as const : 'medium' as const,
          estimatedTime: 2,
          responsible: 'responsable_dossier',
          deadline: new Date(deadline.deadline.getTime() - 24 * 60 * 60 * 1000) // J-1
        })),
        status: 'pending'
      };
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return null;
    }
  }

  private async createRegulatoryDeadlineAlert(
    deadline: CriticalDeadline, 
    authority: string
  ): Promise<InsertDateAlert | null> {
    return withErrorHandling(
    async () => {

      return {
        entityType: deadline.entityType,
        entityId: deadline.entityId,
        entityReference: deadline.entityReference,
        alertType: 'deadline_critical',
        severity: deadline.daysRemaining <= 7 ? 'critical' : 'warning',
        category: 'quality',
        title: `Échéance réglementaire ${authority}`,
        message: `Échéance ${authority} dans ${deadline.daysRemaining} jour(s). Documents requis: ${deadline.requiredActions.join(', ')}.`,
        targetDate: deadline.deadline,
        delayDays: deadline.daysRemaining < 0 ? Math.abs(deadline.daysRemaining) : 0,
        impactLevel: 'critique',
        suggestedActions: [
          { action: 'Préparation dossier réglementaire', priority: 'high', estimatedTime: 4, responsible: 'responsable_qualite' },
          { action: `Soumission ${authority}`, priority: 'high', estimatedTime: 1, responsible: 'responsable_dossier' }
        ],
        status: 'pending'
      };
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return null;
    }
  }

  private async createOptimizationAlert(opportunity: OptimizationOpportunity): Promise<InsertDateAlert | null> {
    return withErrorHandling(
    async () => {

      return {
        entityType: opportunity.entityType,
        entityId: opportunity.entityId,
        alertType: 'optimization',
        severity: 'info',
        category: 'planning',
        title: `Opportunité d'optimisation`,
        message: `${opportunity.opportunityType} possible. Gain estimé: ${opportunity.estimatedGainDays} jour(s). Faisabilité: ${opportunity.feasibility}.`,
        impactLevel: opportunity.estimatedGainDays > 5 ? 'elevee' : 'normale',
        suggestedActions: [
          { action: 'Analyse faisabilité détaillée', priority: 'medium', estimatedTime: 2, responsible: 'chef_projet' },
          { action: 'Mise en œuvre optimisation', priority: 'low', estimatedTime: 4, responsible: 'responsable_planning' }
        ],
        status: 'pending'
      };
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
      return null;
    }
  }
}

// ========================================
// RÈGLES DE DÉTECTION SPÉCIALISÉES MENUISERIE FRANÇAISE
// ========================================

export class MenuiserieDetectionRules {
  
  constructor(private storage: IStorage) {}

  // Détection retards selon contraintes météo
  detectWeatherRelatedDelays(timeline: ProjectTimeline): DelayRisk | null {
    if (timeline.phase === 'chantier' && this.isWeatherSensitive(timeline)) {
      // Simulation prévision météo (à remplacer par vraie API)
      const weatherRisk = this.getWeatherForecast(new Date(timeline.plannedStartDate));
      
      if (weatherRisk.rainDays > 3) {
        return {
          type: 'weather_delay',
          estimatedDelay: weatherRisk.rainDays,
          confidence: weatherRisk.confidence,
          mitigation: [
            'Préparation intérieure avancée', 
            'Ajustement planning livraisons', 
            'Protection matériaux'
          ]
        };
      }
      
      if (weatherRisk.temperatureRisk) {
        return {
          type: 'temperature_risk',
          estimatedDelay: 2,
          confidence: 0.7,
          mitigation: [
            'Adaptation horaires travail',
            'Protection équipes',
            'Report travaux extérieurs'
          ]
        };
      }
    }
    return null;
  }
  
  // Détection conflits ressources équipes
  detectTeamResourceConflicts(timelines: ProjectTimeline[]): ResourceConflict[] {
    const conflicts: ResourceConflict[] = [];
    const teamBookings = this.analyzeTeamAvailability(timelines);
    
    for (const [dateStr, booking] of teamBookings.entries()) {
      if (booking.requiredTeams > booking.availableTeams) {
        const priority = this.calculateConflictPriority(booking);
        
        conflicts.push({
          date: new Date(dateStr),
          shortfall: booking.requiredTeams - booking.availableTeams,
          affectedProjects: booking.projectIds,
          priority,
          resourceType: booking.teamTypes.join(', ')
        });
      }
    }
    
    return conflicts;
  }
  
  // Détection échéances ABF/réglementaires
  detectRegulatoryDeadlines(projects: (Project & { responsibleUser?: User; offer?: Offer }: unknown[]ny[] {
    cons: unknown[]s: unknown[] = [];
    
    for (const project of projects) {
      // Simulation contraintes réglementaires (à adapter selon vraies données)
      if (this.hasRegulatoryConstraints(project)) {
        const deadlines = this.extractRegulatoryDeadlines(project);
        
        for (const deadline of deadlines) {
          const daysUntil = this.daysBetween(new Date(), deadline.deadline);
          
          if (daysUntil <= 14) { // 2 semaines
            alerts.push({
              projectId: project.id,
              type: 'regulatory_approval',
              authority: deadline.authority,
              deadline: deadline.deadline,
              documentsRequired: deadline.requiredDocs,
              preparationTime: deadline.typicalDuration
            });
          }
        }
      }
    }
    
    return alerts;
  }

  private isWeatherSensitive(timeline: ProjectTimeline): boolean {
    // Phases sensibles aux conditions météo
    const weatherSensitivePhases = ['chantier', 'approvisionnement'];
    return weatherSensitivePhases.includes(timeline.phase);
  }

  private getWeatherForecast(date: Date): WeatherForecast {
    // Simulation prévision météo (à remplacer par vraie API météo)
    const month = date.getMonth();
    const isWinter = month >= 10 || month <= 2;
    const isSpring = month >= 3 && month <= 5;
    
    return {
      rainDays: isWinter ? Math.floor(Math.random() * 8) : isSpring ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 3),
      temperatureRisk: isWinter && Math.random() > 0.7,
      windRisk: Math.random() > 0.8,
      confidence: 0.75
    };
  }

  private analyzeTeamAvailability(timelines: ProjectTimeline[]): Map<string, TeamBooking> {
    const bookings = new Map<string, TeamBooking>();
    
    // Capacité équipes disponibles (simulation - à adapter selon vraies données)
    const teamCapacity = {
      'chantier': 3, // 3 équipes terrain disponibles
      'etude': 2,    // 2 équipes BE disponibles
      'planification': 1 // 1 équipe planning
    };
    
    for (const timeline of timelines) {
      const startDate = new Date(timeline.plannedStartDate);
      const endDate = new Date(timeline.plannedEndDate);
      
      // Pour chaque jour de la timeline
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        
        if (!bookings.has(dateStr)) {
          bookings.set(dateStr, {
            date: new Date(d),
            requiredTeams: 0,
            availableTeams: teamCapacity[timeline.phase as keyof typeof teamCapacity] || 1,
            projectIds: [],
            teamTypes: []
          });
        }
        
        const booking = bookings.get(dateStr)!;
        booking.requiredTeams += 1;
        booking.projectIds.push(timeline.projectId);
        if (!booking.teamTypes.includes(timeline.phase)) {
          booking.teamTypes.push(timeline.phase);
        }
      }
    }
    
    return bookings;
  }

  private calculateConflictPriority(booking: TeamBooking): 'high' | 'medium' | 'low' {
    const overallocation = booking.requiredTeams / booking.availableTeams;
    
    if (overallocation >= 2) return 'high';
    if (overallocation >= 1.5) return 'medium';
    return 'low';
  }

  private hasRegulatoryConstraints(project: Project): boolean {
    // Simulation détection contraintes réglementaires
    // En pratique, ce serait basé sur les caractéristiques réelles du projet
    return Math.random() > 0.7; // 30% des projets ont des contraintes
  }

  private extractRegulatoryDeadlines(project: Project): RegulatoryDeadline[] {
    const deadlines: RegulatoryDeadline[] = [];
    const now = new Date();
    
    // Simulation échéances réglementaires
    if (Math.random() > 0.5) {
      deadlines.push({
        authority: 'ABF',
        deadline: new Date(now.getTime() + (10 + Math.random() * 20) * 24 * 60 * 60 * 1000),
        requiredDocs: ['Plans façades', 'Notice architecturale', 'Photos état existant'],
        typicalDuration: 7 // 7 jours de préparation
      });
    }
    
    if (Math.random() > 0.7) {
      deadlines.push({
        authority: 'Mairie',
        deadline: new Date(now.getTime() + (5 + Math.random() * 15) * 24 * 60 * 60 * 1000),
        requiredDocs: ['Déclaration travaux', 'Plan situation'],
        typicalDuration: 3 // 3 jours de préparation
      });
    }
    
    return deadlines;
  }

  private daysBetween(date1: Date, date2: Date): number {
    return Math.ceil((date2.getTime() - date1.getTime()) / (24 * 60 * 60 * 1000));
  }

  // ========================================
  // ORCHESTRATION ALERTES MÉTIER - PHASE 3.1.7.4
  // ========================================

  private groupThresholdsByType(thresholds: AlertThreshold[]): Record<string, AlertThreshold[]> {
    return thresholds.reduce((acc, threshold) => {
      acc[threshold.thresholdKey] = acc[threshold.thresholdKey] || [];
      acc[threshold.thresholdKey].push(threshold);
      return acc;
    }, {} as Record<string, AlertThreshold[]>);
  }

  private async evaluateThresholdType(
    thresholdKey: ThresholdKey, 
    thresholds: AlertThreshold[]
  ): Promise<string[]> {
    const alertsCreated: string[] = [];
    
    this.logger.debug(`Évaluation type: ${thresholdKey} (${thresholds.length} seuils)`);
    
    switch (thresholdKey) {
      case 'profitability_margin':
        alertsCreated.push(...await this.evaluateProfitabilityThresholds(thresholds));
        break;
        
      case 'team_utilization_rate':
        alertsCreated.push(...await this.evaluateTeamUtilizationThresholds(thresholds));
        break;
        
      case 'deadline_days_remaining':
        alertsCreated.push(...await this.evaluateDeadlineThresholds(thresholds));
        break;
        
      case 'predictive_risk_score':
        alertsCreated.push(...await this.evaluatePredictiveRiskThresholds(thresholds));
        break;
        
      case 'revenue_forecast_confidence':
        alertsCreated.push(...await this.evaluateRevenueForecastThresholds(thresholds));
        break;
        
      case 'project_delay_days':
        alertsCreated.push(...await this.evaluateProjectDelayThresholds(thresholds));
        break;
        
      case 'budget_overrun_percentage':
        alertsCreated.push(...await this.evaluateBudgetOverrunThresholds(thresholds));
        break;
        
      default:
        this.logger.warn(`Type seuil non supporté: ${thresholdKey}`);
    }
    
    return alertsCreated;
  }

  // ========================================
  // ÉVALUATEURS SPÉCIALISÉS
  // ========================================

  private async evaluateProfitabilityThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
    const alertsCreated: string[] = [];
    
    return withErrorHandling(
    async () => {

      // 1. RÉCUPÉRER MÉTRIQUES RENTABILITÉ VIA ANALYTICS
      const profitabilityData = await this.analyticsService.calculateProfitabilityMetrics();
      
      // 2. ÉVALUER CHAQUE SEUIL
      for (const threshold of thresholds) {
        const violations = this.findProfitabilityViolations(threshold, profitabilityData);
        
        for (const violation of violations) {
          // 3. DÉDUPLICATION
          const existingAlerts = await this.storage.findSimilarAlerts({
            entity_type: violation.entity_type,
            entity_id: violation.entity_id,
            alert_type: 'profitability',
            hours_window: 24
          });
          
          if (existingAlerts.length === 0) {
            // 4. CRÉER ALERTE
            const alertId = await this.createBusinessAlert({
              thresholdId: threshold.id,
              alertType: 'profitability',
              entityType: violation.entity_type,
              entityId: violation.entity_id,
              entityName: violation.entity_name,
              title: threshold.alertTitle,
              message: this.buildProfitabilityMessage(threshold, violation),
              severity: threshold.severity,
              thresholdValue: Number(threshold.thresholdValue),
              actualValue: violation.actual_value,
              variance: violation.variance,
              contextData: {
                profitability_type: violation.profitability_type,
                calculation_date: new Date().toISOString()
              });
            
            alertsCreated.push(alertId);
            this.logger.info(`Alerte rentabilité créée: ${alertId}`, violation);
          } else {
            this.logger.debug(`Alerte rentabilité dédupliquée pour ${violation.entity_id}`);
          }
        }
      }
      
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
    
    return alertsCreated;
  }

  // ========================================
  // MÉTHODE PUBLIQUE ORCHESTRATRICE - PHASE 3.1.7.4
  // ========================================

  /**
   * Évalue tous les seuils business configurés et génère les alertes correspondantes
   * Méthode publique appelée par PeriodicDetectionScheduler
   */
  async evaluateBusinessThresholds(): Promise<DetectionSummary> {
    const startTime = Date.now();
    const summary: DetectionSummary = {
      totalAlertsGenerated: 0,
      alertsByType: {},
      alertsBySeverity: {},
      criticalIssues: 0,
      actionableItems: 0,
      detectionRunTime: 0,
      nextScheduledRun: new Date(Date.now() + 30 * 60 * 1000), // +30 min
      recommendations: []
    };

    return withErrorHandling(
    async () => {

      this.logger.info('[BusinessThresholds] Démarrage évaluation seuils business');
      
      // 1. RÉCUPÉRER TOUS LES SEUILS ACTIFS
      const allThresholds = await this.storage.getActiveBusinessThresholds();
      
      if (!allThresholds || allThresholds.length === 0) {
        this.logger.info('[BusinessThresholds] Aucun seuil actif configuré');
        summary.detectionRunTime = Date.now() - startTime;
        return summary;
      }

      // 2. GROUPER PAR TYPE DE SEUIL
      const profitabilityThresholds = allThresholds.filter(t => t.thresholdType === 'profitability');
      const teamUtilizationThresholds = allThresholds.filter(t => t.thresholdType === 'team_utilization');
      const predictiveRiskThresholds = allThresholds.filter(t => t.thresholdType === 'predictive_risk');

      // 3. ÉVALUER CHAQUE CATÉGORIE DE SEUILS
      const alertIds: string[] = [];

      // Évaluation rentabilité
      if (profitabilityThresholds.length > 0) {
        const profitabilityAlerts = await this.evaluateProfitabilityThresholds(profitabilityThresholds);
        alertIds.push(...profitabilityAlerts);
        summary.alertsByType['profitability'] = profitabilityAlerts.length;
        this.logger.info(`[BusinessThresholds] ${profitabilityAlerts.length} alertes rentabilité générées`);
      }

      // Évaluation utilisation équipes
      if (teamUtilizationThresholds.length > 0) {
        const teamAlerts = await this.evaluateTeamUtilizationThresholds(teamUtilizationThresholds);
        alertIds.push(...teamAlerts);
        summary.alertsByType['team_utilization'] = teamAlerts.length;
        this.logger.info(`[BusinessThresholds] ${teamAlerts.length} alertes charge équipe générées`);
      }

      // Évaluation risques prédictifs
      if (predictiveRiskThresholds.length > 0) {
        const riskAlerts = await this.evaluatePredictiveRiskThresholds(predictiveRiskThresholds);
        alertIds.push(...riskAlerts);
        summary.alertsByType['predictive_risk'] = riskAlerts.length;
        this.logger.info(`[BusinessThresholds] ${riskAlerts.length} alertes risque prédictif générées`);
      }

      // 4. CALCULER STATISTIQUES RÉSUMÉ
      summary.totalAlertsGenerated = alertIds.length;
      
      // Récupérer les détails des alertes créées pour statistiques
      if (alertIds.length > 0) {
        const createdAlerts = await Promise.all(
          alertIds.map(id => this.storage.getBusinessAlert(id).catch(() => null))
        );
        
        // Compter par sévérité
        for (const alert of createdAlerts.filter(a => a !== null)) {
          if (alert) {
            const severity = alert.severity || 'info';
            summary.alertsBySeverity[severity] = (summary.alertsBySeverity[severity] || 0) + 1;
            
            if (severity === 'critical') {
              summary.criticalIssues++;
            }
            summary.actionableItems++;
          }
        }
      }

      // 5. GÉNÉRER RECOMMANDATIONS
      if (summary.totalAlertsGenerated > 0) {
        summary.recommendations.push(`${summary.totalAlertsGenerated} alertes générées nécessitent attention`);
        if (summary.criticalIssues > 0) {
          summary.recommendations.push(`${summary.criticalIssues} alertes critiques à traiter en priorité`);
        }
      }

      summary.detectionRunTime = Date.now() - startTime;
      this.logger.info(`[BusinessThresholds] Évaluation terminée: ${summary.totalAlertsGenerated} alertes en ${summary.detectionRunTime}ms`);
      
      return summary;

    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: {  
      });
  }

  private async evaluateTeamUtilizationThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
    const alertsCreated: string[] = [];
    
    return withErrorHandling(
    async () => {

      // 1. RÉCUPÉRER CHARGE ÉQUIPES VIA ANALYTICS
      const teamLoadData = await this.analyticsService.calculateTeamWorkloadMetrics();
      
      // 2. ÉVALUER SEUILS UTILISATION
      for (const threshold of thresholds) {
        const violations = this.findTeamUtilizationViolations(threshold, teamLoadData);
        
        for (const violation of violations) {
          // Déduplication + création alerte similaire à profitability
          const existingAlerts = await this.storage.findSimilarAlerts({
            entity_type: 'team',
            entity_id: violation.team_id,
            alert_type: 'team_overload',
            hours_window: 12 // Fenêtre plus courte pour surcharge équipe
          });
          
          if (existingAlerts.length === 0) {
            const alertId = await this.createBusinessAlert({
              thresholdId: threshold.id,
              alertType: 'team_overload',
              entityType: 'team',
              entityId: violation.team_id,
              entityName: violation.team_name,
              title: threshold.alertTitle,
              message: this.buildTeamUtilizationMessage(threshold, violation),
              severity: threshold.severity,
              thresholdValue: Number(threshold.thresholdValue),
              actualValue: violation.utilization_rate,
              variance: violation.variance,
              contextData: {
                current_projects: violation.current_projects,
                capacity: violation.capacity,
                period: violation.period
              });
            
            alertsCreated.push(alertId);
            this.logger.info(`Alerte surcharge équipe créée: ${alertId}`, violation);
          }
        }
      }
      
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
    
    return alertsCreated;
  }

  private async evaluatePredictiveRiskThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
    const alertsCreated: string[] = [];
    
    return withErrorHandling(
    async () => {

      // 1. RÉCUPÉRER RISQUES PRÉDICTIFS
      const predictiveRisks = await this.predictiveEngineService.detectProjectRisks({
        risk_level: 'all',
        limit: 50
      });
      
      // 2. ÉVALUER SEUILS RISQUE
      for (const threshold of thresholds) {
        const violations = this.findPredictiveRiskViolations(threshold, predictiveRisks);
        
        for (const violation of violations) {
          const existingAlerts = await this.storage.findSimilarAlerts({
            entity_type: 'project',
            entity_id: violation.project_id,
            alert_type: 'predictive_risk',
            hours_window: 48 // Fenêtre plus large pour risques prédictifs
          });
          
          if (existingAlerts.length === 0) {
            const alertId = await this.createBusinessAlert({
              thresholdId: threshold.id,
              alertType: 'predictive_risk',
              entityType: 'project',
              entityId: violation.project_id,
              entityName: `Projet ${violation.project_id}`,
              title: threshold.alertTitle,
              message: this.buildPredictiveRiskMessage(threshold, violation),
              severity: threshold.severity,
              thresholdValue: Number(threshold.thresholdValue),
              actualValue: violation.risk_score,
              variance: violation.variance,
              contextData: {
                risk_factors: violation.risk_factors,
                predicted_delay_days: violation.predicted_delay_days,
                predicted_budget_overrun: violation.predicted_budget_overrun
              });
            
            alertsCreated.push(alertId);
            this.logger.info(`Alerte risque prédictif créée: ${alertId}`, violation);
          }
        }
      }
      
    
    },
    {
      operation: 'constructor',
      service: 'DateAlertDetectionService',
      metadata: { } });
    
    return alertsCreated;
  }

  // Stubs pour les autres évaluateurs (pour compilation)
  private async evaluateDeadlineThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
    // TODO: Implémenter évaluation échéances
    return [];
  }

  private async evaluateRevenueForecastThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
    // TODO: Implémenter évaluation prévisions revenus
    return [];
  }

  private async evaluateProjectDelayThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
    // TODO: Implémenter évaluation retards projets
    return [];
  }

  private async evaluateBudgetOverrunThresholds(thresholds: AlertThreshold[]): Promise<string[]> {
    // TODO: Implémenter évaluation dépassements budget
    return [];
  }

  // ========================================
  // HELPERS DÉTECTION VIOLATIONS
  // ========================================

  private findProfitabilityViolations(
    threshold: AlertThreshold, 
    profitabilityData: unknown): ProfitabilityViolation[] {
    const violations: ProfitabilityViolation[] = [];
    
    // Selon scope du seuil
    if (threshold.scopeType === 'global') {
      // Évaluer marge globale
      const globalMargin = profitabilityData.global_margin_percentage;
      if (this.evaluateCondition(globalMargin, threshold.operator, Number(threshold.thresholdValue))) {
        violations.push({
          entity_type: 'global',
          entity_id: 'global',
          entity_name: 'Global',
          actual_value: globalMargin,
          variance: globalMargin - Number(threshold.thresholdValue),
          profitability_type: 'global_margin'
        });
      }
    } else if (threshold.scopeType === 'project') {
      // Évaluer chaque projet
      for (const project of profitabilityData.projects_margins || []) {
        if (this.evaluateCondition(project.margin_percentage, threshold.operator, Number(threshold.thresholdValue))) {
          violations.push({
            entity_type: 'project',
            entity_id: project.project_id,
            entity_name: project.project_name,
            actual_value: project.margin_percentage,
            variance: project.margin_percentage - Number(threshold.thresholdValue),
            profitability_type: 'project_margin'
          });
        }
      }
    }
    
    return violations;
  }

  private findTeamUtilizationViolations(
    threshold: AlertThreshold, 
    teamLoadDat: unknown)): TeamUtilizationViolation[] {
    const violations: TeamUtilizationViolation[] = [];
    
    for (const team of teamLoadData.teams || []) {
      if (this.evaluateCondition(team.utilization_rate, threshold.operator, Number(threshold.thresholdValue))) {
        violations.push({
          team_id: team.team_id,
          team_name: team.team_name,
          utilization_rate: team.utilization_rate,
          variance: team.utilization_rate - Number(threshold.thresholdValue),
          current_projects: team.current_projects,
          capacity: team.capacity,
          period: team.period
        });
      }
    }
    
    return violations;
  }

  private findPredictiveRiskViolations(
    threshold: AlertThreshold, 
    predictiveRis: unknown) ): PredictiveRiskViolation[] {
    const violations: PredictiveRiskViolation[] = [];
    
    for (const risk of predictiveRisks.detected_risks || []) {
      if (this.evaluateCondition(risk.risk_score, threshold.operator, Number(threshold.thresholdValue))) {
        violations.push({
          project_id: risk.project_id,
          risk_score: risk.risk_score,
          variance: risk.risk_score - Number(threshold.thresholdValue),
          risk_factors: risk.risk_factors,
          predicted_delay_days: risk.predicted_delay_days,
          predicted_budget_overrun: risk.predicted_budget_overrun
        });
      }
    }
    
    return violations;
  }

  private evaluateCondition(actualValue: number, operator: string, thresholdValue: number): boolean {
    switch (operator) {
      case 'less_than':
        return actualValue < thresholdValue;
      case 'less_than_equal':
        return actualValue <= thresholdValue;
      case 'greater_than':
        return actualValue > thresholdValue;
      case 'greater_than_equal':
        return actualValue >= thresholdValue;
      case 'equals':
        return Math.abs(actualValue - thresholdValue) < 0.01; // Tolérance float
      case 'not_equals':
        return Math.abs(actualValue - thresholdValue) >= 0.01;
      default:
        this.logger.warn(`Opérateur non supporté: ${operator}`);
        return false;
    }
  }

  private buildProfitabilityMessage(threshold: AlertThreshold, violation: ProfitabilityViolation): string {
    return `${threshold.alertMessage} - Marge actuelle: ${violation.actual_value.toFixed(1)}% (seuil: ${threshold.thresholdValue}%)`;
  }

  private buildTeamUtilizationMessage(threshold: AlertThreshold, violation: TeamUtilizationViolation): string {
    return `${threshold.alertMessage} - Utilisation actuelle: ${violation.utilization_rate.toFixed(1)}% (seuil: ${threshold.thresholdValue}%)`;
  }

  private buildPredictiveRiskMessage(threshold: AlertThreshold, violation: PredictiveRiskViolation): string {
    return `${threshold.alertMessage} - Score risque: ${violation.risk_score}/100 (seuil: ${threshold.thresholdValue})`;
  }

  // Helper création alerte avec EventBus auto-publishing
  private async createBusinessAlert(data: Omit<InsertBusinessAlert, 'id' | 'createdAt' | 'updatedAt' | 'triggeredAt'>): Promise<string> {
    // Utilise storage qui auto-publish via EventBus
    return await this.storage.createBusinessAlert(data);
  }
}