import type { StorageFacade } from "../storage/facade/StorageFacade";
import { withErrorHandling } from './utils/error-handler';
import { EventBus } from "../eventBus";
import { DateAlertDetectionService, MenuiserieDetectionRules } from "./DateAlertDetectionService";
import { DateIntelligenceService } from "./DateIntelligenceService";
import { logger } from "../utils/logger";
import type { 
  Project, projectStatusEnum, DateAlert, InsertDateAlert,
  User, Offer
} from "@shared/schema";

// Type alias for ProjectStatus from enum
type ProjectStatus = typeof projectStatusEnum.enumValues[number];

// ========================================
// SYSTÈME DE SURVEILLANCE CONTINUE ET TÂCHES PÉRIODIQUES
// ========================================

export interface DetectionRunSummary {
  runId: string;
  scheduledAt: Date;
  completedAt: Date;
  runType: 'hourly' | 'daily' | 'event_triggered' | 'manual';
  totalAlertsGenerated: number;
  criticalAlertsCount: number;
  affectedProjects: string[];
  executionTimeMs: number;
  errors: string[];
  recommendations: string[];
}

export interface SchedulerMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageExecutionTimeMs: number;
  lastRunAt: Date;
  nextScheduledRun: Date;
  activeIntervals: string[];
}

export interface ProjectRiskProfile {
  projectId: string;
  lastDetectionRun: Date;
  riskScore: number; // 0-100
  activeAlerts: number;
  criticalAlerts: number;
  trendDirection: 'improving' | 'stable' | 'deteriorating';
  lastSignificantChange: Date;
}

// ========================================
// PLANIFICATEUR DE DÉTECTION PÉRIODIQUE
// ========================================

export class PeriodicDetectionScheduler {
  
  private runHistory: DetectionRunSummary[] = [];
  private activeIntervals: NodeJS.Timeout[] = [];
  private projectRiskProfiles = new Map<string, ProjectRiskProfile>();
  private lastFullDetection: Date | null = null;
  private isRunning = false;
  
  constructor(
    private storage: StorageFacade,
    private eventBus: EventBus,
    private dateAlertDetectionService: DateAlertDetectionService,
    private dateIntelligenceService: DateIntelligenceService
  ) {
    this.initializeEventListeners();
    this.setupBusinessThresholdTriggers(); // NOUVEL AJOUT PHASE 3.1.7.4
  }

  // ========================================
  // DÉMARRAGE ET ARRÊT DU SYSTÈME
  // ========================================

  async start(): Promise<void> {
    // Triple protection pour tests - renforcement critique Phase 2.5
    if (process.env.NODE_ENV === 'test' || 
        process.env.DISABLE_SCHEDULER === '1' ||
        process.env.CI === 'true') {
      logger.info('Désactivé en mode test/CI', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'start',
          mode: process.env.NODE_ENV,
          disableScheduler: process.env.DISABLE_SCHEDULER,
          ci: process.env.CI 

              }
                                          });
      return;
    }
    if (this.isRunning) {
      logger.info('Système déjà démarré', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'start',
          status: 'already_running' 

              }
                                          });
      return;
    }
    logger.info('Démarrage système de surveillance', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'start' 

            }
                                          });
    // Surveillance horaire projets actifs
    this.scheduleHourlyDetection();
    // Vérification quotidienne échéances
    this.scheduleDailyDeadlineCheck();
    // Vérification bi-quotidienne optimisations
    this.scheduleTwiceDailyOptimizationCheck();
    // Nettoyage hebdomadaire historique
    this.scheduleWeeklyCleanup();
    // NOUVEAU - Surveillance seuils business toutes les 30 minutes - PHASE 3.1.7.4
    this.scheduleBusinessThresholdEvaluation();
    // Détection initiale au démarrage
    await this.runImmediateDetection('startup');
    this.isRunning = true;
    logger.info('Système de surveillance démarré avec succès', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'start',
        status: 'started' 

            }
                                          });
  }

  stop(): void {
    logger.info('Arrêt système de surveillance', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'stop',
        activeIntervals: this.activeIntervals.length 

            }
                                          });
    // Arrêter tous les intervalles
    this.activeIntervals.forEach(interval => clearInterval(interval));
    this.activeIntervals = [];
    this.isRunning = false;
    logger.info('Système de surveillance arrêté', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'stop',
        status: 'stopped' 

            }
                                          });
  }

  // ========================================
  // SURVEILLANCE HORAIRE PROJETS ACTIFS
  // ========================================
  
  private scheduleHourlyDetection(): void {
    logger.info('Programmation surveillance horaire', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'scheduleHourlyDetection',
        intervalMs: 60 * 60 * 1000 

            }
                                          });
    const interval = setInterval(async () => {
      return withErrorHandling(
    async () => {
        await this.runHourlyProjectRiskDetection();
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {
      });
      }
}, 60 * 60 * 1000); // 1 heure;
    
    this.activeIntervals.push(interval);
  }

  private async runHourlyProjectRiskDetection(): Promise<DetectionRunSummary> {
    const runId = `hourly-${Date.now()}`;
    const startTime = new Date();
    
    const summary: DetectionRunSummary = {
      runId,
      scheduledAt: startTime,
      completedAt: new Date(),
      runType: 'hourly',
      totalAlertsGenerated: 0,
      criticalAlertsCount: 0,
      affectedProjects: [],
      executionTimeMs: 0,
      errors: [],
      recommendations: []
    };

    return withErrorHandling(
    async () => {

      logger.info('Démarrage détection horaire', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runHourlyProjectRiskDetection',
          runId
            });
      // Récupérer projets actifs (pas en SAV ou archivés)
      const activeProjects = await this.getActiveProjects();
      // Détection des risques pour chaque projet actif
      for (const project of activeProjects) {
        try {
          const projectAlerts = await this.detectAndNotifyProjectRisks(project);
          if (projectAlerts.length > 0) {
            summary.totalAlertsGenerated += projectAlerts.length;
            summary.affectedProjects.push(project.id);
            const criticalCount = projectAlerts.filter(a => a.severity === 'critical').length;
            summary.criticalAlertsCount += criticalCount;
            // Mise à jour profil de risque projet
            await this.updateProjectRiskProfile(project.id, projectAlerts);
          }
    },
    {
      operation: 'constructor',
service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
          summary.errors.push(`Projet ${project.id}: ${projectError}`);
              }
      }
      // Détection conflits inter-projets
      if (activeProjects.length > 1) {
        const conflictAlerts = await this.detectInterProjectConflicts(activeProjects);
        summary.totalAlertsGenerated += conflictAlerts.length;
      }
      summary.completedAt = new Date();
      summary.executionTimeMs = summary.completedAt.getTime() - startTime.getTime();
      
      // Génération recommandations
      summary.recommendations = this.generateHourlyRecommendations(summary, activeProjects.length);
      
      logger.info('Détection horaire terminée', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runHourlyProjectRiskDetection',
          runId,
          totalAlertsGenerated: summary.totalAlertsGenerated,
          executionTimeMs: summary.executionTimeMs 

              }
                                          });
      // Notification si alertes critiques détectées
      if (summary.criticalAlertsCount > 0) {
        await this.notifyCriticalAlertsDetected(summary);
      }
    } catch (error) {
      summary.errors.push(`Erreur globale: ${error}`);
      summary.completedAt = new Date();
      summary.executionTimeMs = summary.completedAt.getTime() - startTime.getTime();
      
      logger.error('Erreur détection horaire', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runHourlyProjectRiskDetection',
          runId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined 

              }
                                          });
    }
    this.runHistory.push(summary);
    this.cleanupRunHistory();
    
    return summary;
  }

  // ========================================
  // VÉRIFICATION QUOTIDIENNE ÉCHÉANCES
  // ========================================
  
  private scheduleDailyDeadlineCheck(): void {
    logger.info('Programmation vérification quotidienne échéances', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'scheduleDailyDeadlineCheck' 

            }
                                          });
    // Programmation à 8h00 chaque jour
    const scheduleDaily = () => {
      const now = new Date();
      const tomorrow8AM = new Date(now);
      tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
      tomorrow8AM.setHours(8, 0, 0, 0);
      const msUntil8AM = tomorrow8AM.getTime() - now.getTime();
      setTimeout(() => {
        this.runDailyDeadlineCheck();
        // Programmer pour répéter chaque 24h
        const dailyInterval = setInterval(() => {
          this.runDailyDeadlineCheck();
        }, 24 * 60 * 60 * 1000);
        this.activeIntervals.push(dailyInterval);
      }, msUntil8AM);
    };
    scheduleDaily();
  }
  private async runDailyDeadlineCheck(): Promise<DetectionRunSummary> {
    const runId = `daily-${Date.now()}`;
    const startTime = new Date();
    
    const summary: DetectionRunSummary = {
      runId,
      scheduledAt: startTime,
      completedAt: new Date(),
      runType: 'daily',
      totalAlertsGenerated: 0,
      criticalAlertsCount: 0,
      affectedProjects: [],
      executionTimeMs: 0,
      errors: [],
      recommendations: []
    };

    return withErrorHandling(
    async () => {

      logger.info('Démarrage vérification quotidienne échéances', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runDailyDeadlineCheck',
          runId
            });
      // Vérification échéances critiques (7 jours)
      const deadlineAlerts = await this.dateAlertDetectionService.checkCriticalDeadlines(7);
      summary.totalAlertsGenerated += deadlineAlerts.length;
      const criticalDeadlines = deadlineAlerts.filter(a => a.severity === 'critical');
      summary.criticalAlertsCount += criticalDeadlines.length;
      // Vérification échéances à moyen terme (30 jours) pour planification
      const mediumTermAlerts = await this.dateAlertDetectionService.checkCriticalDeadlines(30);
      const planningAlerts = mediumTermAlerts.filter(a => a.severity === 'warning');
      summary.totalAlertsGenerated += planningAlerts.length;
      // Extraction projets affectés
      summary.affectedProjects = [
        ...deadlineAlerts.filter(a => a.entityType === 'project').map(a => a.entityId),
        ...planningAlerts.filter(a => a.entityType === 'project').map(a => a.entityId)
      ].filter((id, index, arr) => arr.indexOf(id) === index); // Déduplication
      // Génération rapport quotidien planning
      await this.generateDailyPlanningReport();
      summary.completedAt = new Date();
      summary.executionTimeMs = summary.completedAt.getTime() - startTime.getTime();
      summary.recommendations = this.generateDailyRecommendations(summary);
      logger.info('Vérification quotidienne terminée', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runDailyDeadlineCheck',
          runId,
          totalAlertsGenerated: summary.totalAlertsGenerated,
          executionTimeMs: summary.executionTimeMs 

              }
                                          });
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
    this.runHistory.push(summary);
    return summary;
  }

  // ========================================
  // VÉRIFICATION BI-QUOTIDIENNE OPTIMISATIONS
  // ========================================
  
  private scheduleTwiceDailyOptimizationCheck(): void {
    logger.info('Programmation vérification bi-quotidienne optimisations', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'scheduleTwiceDailyOptimizationCheck' 

            }
                                          });
    // 9h00 et 17h00 chaque jour
    const scheduleOptimizations = () => {
      const scheduleNext = () => {
        const now = new Date();
        const next9AM = new Date(now);
        next9AM.setHours(9, 0, 0, 0);
        if (next9AM <= now) next9AM.setDate(next9AM.getDate() + 1);
        const next5PM = new Date(now);
        next5PM.setHours(17, 0, 0, 0);
        if (next5PM <= now) next5PM.setDate(next5PM.getDate() + 1);
        const nextRun = next9AM < next5PM ? next9AM : next5PM;
        const msUntilNext = nextRun.getTime() - now.getTime();
        setTimeout(() => {
          this.runOptimizationCheck();
          scheduleNext(); // Programmer le suivant
        }, msUntilNext);
      };
      scheduleNext();
    };
    scheduleOptimizations();
  }
  private async runOptimizationCheck(): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Démarrage vérification optimisations', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runOptimizationCheck'
            });
      const optimizationAlerts = await this.dateAlertDetectionService.detectOptimizationOpportunities();
      logger.info('Opportunités d\'optimisation détectées', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runOptimizationCheck',
          opportunitiesCount: optimizationAlerts.length 

              }
                                          });
      // Notification des meilleures opportunités (gain > 3 jours)
      const highValueOpportunities = optimizationAlerts.filter(alert  => {
        const suggestedActions = alert.suggestedActions as unknown;
        return suggestedActions && Array.isArray(suggestedActions) && suggestedActions.some((action: unknown) => 
          action.action && action.action.includes('3') || action.action.includes('gain')
        );
      });
      if (highValueOpportunities.length > 0) {
        await this.notifyHighValueOptimizations(highValueOpportunities);
      }
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  // ========================================
  // DÉTECTION EN TEMPS RÉEL SUR ÉVÉNEMENTS
  // ========================================

  private initializeEventListeners(): void {
    logger.info('Initialisation écoute événements temps réel', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'initializeEventListeners' 

            }
                                          });
    // Écoute modifications projets
    this.eventBus.subscribe((event) => {
      if (event.entity === 'project' && event.type.includes('status_changed')) {
        this.handleProjectStatusChanged(event.entityId, event.metadata);
      });
    
    // Écoute recalculs timeline
    this.eventBus.subscribe((event) => {
      if (event.entity === 'date_intelligence' && event.type.includes('timeline_calculated')) {
        this.handleTimelineRecalculated(event.entityId, event.metadata);
      });
    
    // Écoute nouvelles offres signées (transformation en projet)
    this.eventBus.subscribe((event) => {
      if (event.entity === 'offer' && event.type.includes('signed')) {
        this.handleOfferSigned(event.entityId, event.metadata);
      });
    
    // Écoute alertes techniques critiques (impact planning)
    this.eventBus.subscribe((event) => {
      if (event.entity === 'technical' && event.severity === 'error') {
        this.handleTechnicalAlertImpact(event.entityId, event.metadata);
      });
  }

  // ========================================
  // ORCHESTRATION ALERTES MÉTIER - PHASE 3.1.7.4
  // ========================================

  private setupBusinessThresholdTriggers(): void {
    logger.info('Configuration triggers évaluation seuils business', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'setupBusinessThresholdTriggers' 

            }
                                          });
    // Trigger évaluation sur calculs analytics
    this.eventBus.subscribe((event) => {
      if (event.type.includes('analytics.calculated') && event.metadata?.triggers_evaluation) {
        logger.info('Déclenchement évaluation seuils suite calcul analytics', { metadata: {
            service: 'PeriodicDetectionScheduler',
                  operation: 'setupBusinessThresholdTriggers',
            eventType: event.type 

                }
                                          });
        this.dateAlertDetectionService.evaluateBusinessThresholds().catch((error: unknown) => {
          logger.error('Erreur évaluation seuils (analytics trigger)', { metadata: {
              service: 'PeriodicDetectionScheduler',
                    operation: 'setupBusinessThresholdTriggers',
                    error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined 

                  }
                                          });
        });
      });
    
    // Trigger évaluation sur changements offres/projets critiques
    this.eventBus.subscribe((event) => {
      if ((event.entity === 'offer' || event.entity === 'project') && 
          event.type.includes('status_changed')) {
        logger.info('Déclenchement évaluation seuils suite changement statut', { metadata: {
            service: 'PeriodicDetectionScheduler',
                  operation: 'setupBusinessThresholdTriggers',
            entity: event.entity,
            eventType: event.type 

                }
                                          });
        this.dateAlertDetectionService.evaluateBusinessThresholds().catch((error: unknown) => {
          logger.error('Erreur évaluation seuils (statut trigger)', { metadata: {
              service: 'PeriodicDetectionScheduler',
                    operation: 'setupBusinessThresholdTriggers',
                    error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined 

                  }
                                          });
        });
      });
  }

  private scheduleBusinessThresholdEvaluation(): void {
    logger.info('Programmation évaluation seuils business (30min)', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'scheduleBusinessThresholdEvaluation',
        intervalMs: 30 * 60 * 1000 

            }
                                          });
    // Trigger évaluation périodique (toutes les 30 minutes)
    const interval = setInterval(async () => {
      return withErrorHandling(
    async () => {
        logger.info('Évaluation périodique seuils business (30min)', { metadata: {
            service: 'PeriodicDetectionScheduler',
                  operation: 'scheduleBusinessThresholdEvaluation'
              });
        await this.dateAlertDetectionService.evaluateBusinessThresholds();
      
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
      }
}, 30 * 60 * 1000); // 30 minutes;
    
    this.activeIntervals.push(interval);
  }

  // NOUVELLE MÉTHODE - Détection périodique complète avec évaluation business
  async runPeriodicDetection(): Promise<void> {
    logger.info('Démarrage détection périodique complète', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'runPeriodicDetection' 

            }
                                          });
    const startTime = Date.now();
    return withErrorHandling(
    async () => {
      // 1. Détections existantes (dates, conflits, échéances, optimisations)
      logger.info('Étape 1: Détection risques projets', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runPeriodicDetection',
          step: 1 

              }
                                          });
      const delayAlerts = await this.dateAlertDetectionService.detectDelayRisks();
      
      logger.info('Étape 2: Détection conflits planning', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runPeriodicDetection',
          step: 2 

              }
                                          });
      const conflictAlerts = await this.dateAlertDetectionService.detectPlanningConflicts({
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // +60 jours
      });
      
      logger.info('Étape 3: Vérification échéances critiques', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runPeriodicDetection',
          step: 3 

              }
                                          });
      const deadlineAlerts = await this.dateAlertDetectionService.checkCriticalDeadlines(7);
      logger.info('Étape 4: Détection optimisations', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runPeriodicDetection',
          step: 4 

              }
                                          });
      const optimizationAlerts = await this.dateAlertDetectionService.detectOptimizationOpportunities();
      
      // 2. NOUVELLE ÉTAPE - Évaluation business seuils (PHASE 3.1.7.4)
      logger.info('Étape 5: Évaluation seuils business', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runPeriodicDetection',
          step: 5 

              }
                                          });
      await this.dateAlertDetectionService.evaluateBusinessThresholds();
      // 3. Rapport final
      const duration = Date.now() - startTime;
      const totalAlerts = delayAlerts.length + conflictAlerts.length + deadlineAlerts.length + optimizationAlerts.length;
      logger.info('Détection périodique terminée', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runPeriodicDetection',
          totalAlerts,
          durationMs: duration 

              }
                                          });
      
    
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
      throw error;
    }
  }

  private async handleProjectStatusChanged(projectId: string, meta: unknown): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Changement statut projet', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'handleProjectStatusChanged',
          projectId,
          newStatus: metadata?.newStatus
            });
      // Détection immédiate après changement de statut
      const project = await this.storage.getProject(projectId);
      if (project) {
        const alerts = await this.detectAndNotifyProjectRisks(project);
        if (alerts.length > 0) {
          logger.info('Nouvelles alertes générées pour projet', { metadata: {
              service: 'PeriodicDetectionScheduler',
                    operation: 'handleProjectStatusChanged',
              projectId,
              alertsCount: alerts.length 

                  }
                                          });
        }
        // Mise à jour profil de risque
        await this.updateProjectRiskProfile(projectId, alerts);
      }
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  private async handleTimelineRecalculated(entityId: string, : unknown): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Timeline recalculée', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'handleTimelineRecalculated',
          entityId
            });
      // Vérification impacts cascade
      if (metadata?.affectedProjects && Array.isArray(metadata.affectedProjects)) {
        await this.detectCascadeImpacts(metadata.affectedProjects);
      }
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  private async handleOfferSigned(offerId: stri: unknown)unknown unknown): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Offre signée, préparation surveillance projet', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'handleOfferSigned',
          offerId       }
     });
      // Lorsqu'une offre est signée, on s'attend à ce qu'elle devienne projet
      // Programmer une vérification dans 1 heure pour détecter le nouveau projet
      setTimeout(async () => {
        try {
          // OPTIMISATION: Use pagination with search to find project by offerId
          const { projects } = await this.storage.getProjectsPaginated(undefined, undefined, 100, 0);
          const newProject = projects.find(p => p.offerId === offerId);
          if (newProject) {
            logger.info('Nouveau projet détecté depuis offre', { metadata: {
                service: 'PeriodicDetectionScheduler',
                      operation: 'handleOfferSigned',
                      projectId: newProject.id,
                offerId 
              
                    }
                              });
            // Initialisation profil de risque
            await this.updateProjectRiskProfile(newProject.id, alerts);
          }
          
        
    },
    {
      operation: 'constructor',
service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
              }
}, 60 * 60 * 1000); // 1 heure;
      
    } catch (error) {
      logger.error('Erreur traitement offre signée', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'handleOfferSigned',
          offerId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined 

              }
                                          });
    }
  }

  private async handleTechnicalAlertImpact(alertId: : unknown)unknownata: unknown): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Alerte technique critique, analyse impact planning', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'handleTechnicalAlertImpact',
          alertId       }
     });
      // Si alerte technique liée à un projet, vérifier impact planning
      if (metadata?.projectId) {
        const project = await this.storage.getProject(metadata.projectId);
        if (project) {
          const alerts = await this.detectAndNotifyProjectRisks(project);
          // Log des alertes détectées suite à l'alerte technique
          logger.info(`${alerts.length} alertes détectées suite à alerte technique ${alertId}`, { metadata: {
              service: 'PeriodicDetectionScheduler',
                    operation: 'handleTechnicalAlertImpact',
              technicalAlertId: alertId,
              projectAlertsCount: alerts.length 

                  }
                                          });
        }
      }
      
    
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  // ========================================
  // NETTOYAGE ET MAINTENANCE
  // ========================================
  
  private scheduleWeeklyCleanup(): void {
    logger.info('Programmation nettoyage hebdomadaire', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'scheduleWeeklyCleanup' 

            }
                                          });
    // Dimanche à 2h00
    const scheduleWeekly = () => {
      const now = new Date();
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()));
      nextSunday.setHours(2, 0, 0, 0);
      if (nextSunday <= now) {
        nextSunday.setDate(nextSunday.getDate() + 7);
      }
      const msUntilSunday = nextSunday.getTime() - now.getTime();
      
      setTimeout(() => {
        this.runWeeklyCleanup();
        
        // Programmer pour répéter chaque semaine
        const weeklyInterval = setInterval(() => {
          this.runWeeklyCleanup();
        }, 7 * 24 * 60 * 60 * 1000);
        
        this.activeIntervals.push(weeklyInterval);
      }, msUntilSunday);
    };

    scheduleWeekly();
  }

  private async runWeeklyCleanup(): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Démarrage nettoyage hebdomadaire', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runWeeklyCleanup'
            });
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      // Nettoyage historique des runs (garder 30 derniers)
      this.runHistory = this.runHistory.slice(-30);
      // Nettoyage profils de risque projets inactifs
      const activeProjects = await this.getActiveProjects();
      const activeProjectIds = activeProjects.map(p => p.id);
      for (const [projectId, profile] of Array.from(this.projectRiskProfiles.entries())) {
        if (!activeProjectIds.includes(projectId) && profile.lastDetectionRun < oneWeekAgo) {
          this.projectRiskProfiles.delete(projectId);
          logger.info('Suppression profil de risque projet inactif', { metadata: {
              service: 'PeriodicDetectionScheduler',
                    operation: 'runWeeklyCleanup',
              projectId 
              
                  }
                              });
      logger.info('Nettoyage hebdomadaire terminé', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'runWeeklyCleanup' 

              }
                                          });
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  private async getActiveProjects(): Promise<(Project & { responsibleUser?: User; offer?: Offer })[]> {
    // OPTIMISATION: Use pagination to get active projects instead of loading 375 projects
    // We fetch all active projects but with pagination API which is more efficient
    const { projects } = await this.storage.getProjectsPaginated(undefined, undefined, 1000, 0);
    return projects.filter(project => 
      project.status !== 'sav' && 
      project.status !== undefined // Projets actifs
    );
  }

  private async detectAndNotifyProjectRisks(
    project: Project & { responsibleUser?: User; offer?: Offer }
  ): Promise<InsertDateAlert[]> {
    return withErrorHandling(
    async () => {

      // Détection risques de retard
      const delayAlerts = await this.dateAlertDetectionService.detectDelayRisks(project.id);
      
      // Détection conflits pour ce projet spécifique
      const timeframe = {
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 jours
      };
      
      const conflictAlerts = await this.dateAlertDetectionService.detectPlanningConflicts(timeframe);
      const projectConflictAlerts = conflictAlerts.filter(alert => 
        alert.entityId === project.id || (alert as unknown).affectedProjects?.includes(project.id)
      );
      
      const allAlerts = [...delayAlerts, ...projectConflictAlerts];
      
      // Notification immédiate des alertes critiques
      const criticalAlerts = allAlerts.filter(alert => alert.severity === 'critical');
      for (const alert of criticalAlerts) {
        await this.eventBus.publishDateAlertCreated({
          id: crypto.randomUUID(),
          entity: 'date_intelligence',
          entityId: alert.entityId,
          message: alert.message,
          severity: 'critical',
          metadata: {
            alertType: alert.alertType,
            phase: alert.phase || undefined,
            targetDate: alert.targetDate?.toISOString(),
            affectedUsers: project.responsibleUserId ? [project.responsibleUserId] : [],
            actionRequired: !!(alert.suggestedActions && Array.isArray(alert.suggestedActions) && alert.suggestedActions.length > 0)
                  }
                );
      }
      
      return allAlerts;
      
    
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
      return [];
    }
  }

  private async detectInterProjectConflicts(
    projects: (Project & { responsibleUser?: User; offer?: Offer })[]
  ): Promise<InsertDateAlert[]> {
    return withErrorHandling(
    async () => {

      // Détection conflits entre projets (ressources partagées)
      const timeframe = {
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 jours
      };
      
      const conflictAlerts = await this.dateAlertDetectionService.detectPlanningConflicts(timeframe);
      
      // Filtrer conflits affectant plusieurs projets
      const interProjectConflicts = conflictAlerts.filter(alert  => {
        const metadata = alas unknown;unknown;
        return metadata.affectedProjects && metadata.affectedProjects.length > 1;
      });
      
      return interProjectConflicts;
      
    
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
      return [];
    }
  }

  private async detectCascadeImpacts(affectedProjectIds: string[]): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Analyse impacts cascade', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'detectCascadeImpacts',
          affectedProjectsCount: affectedProjectIds.length
            });
      for (const projectId of affectedProjectIds) {
        const project = await this.storage.getProject(projectId);
        if (project) {
          const alerts = await this.detectAndNotifyProjectRisks(project);
          if (alerts.length > 0) {
            logger.info('Alertes cascade pour projet', { metadata: {
                service: 'PeriodicDetectionScheduler',
                      operation: 'detectCascadeImpacts',
                projectId,
                alertsCount: alerts.length 

                    }
                                          });
          }
        }
      }
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  private async updateProjectRiskProfile(projectId: string, alerts: DateAlert[]): Promise<void> {
    return withErrorHandling(
    async () => {

      const criticalAlertsCount = alerts.filter(a => a.severity === 'critical').length;
      const totalActiveAlerts = alerts.filter(a => a.status === 'pending').length;
      
      // Calcul score de risque (0-100)
      const riskScore = Math.min(100, (criticalAlertsCount * 30) + (totalActiveAlerts * 10));
      
      const existingProfile = this.projectRiskProfiles.get(projectId);
      const previousRiskScore = existingProfile?.riskScore || 0;
      
      // Détermination tendance
      let trendDirection: 'improving' | 'stable' | 'deteriorating' = 'stable';
      if (riskScore > previousRiskScore + 10) trendDirection = 'deteriorating';
      else if (riskScore < previousRiskScore - 10) trendDirection = 'improving';
      
      const profile: ProjectRiskProfile = {
        projectId,
        lastDetectionRun: new Date(),
        riskScore,
        activeAlerts: totalActiveAlerts,
        criticalAlerts: criticalAlertsCount,
        trendDirection,
        lastSignificantChange: trendDirection !== 'stable' ? new Date() : (existingProfile?.lastSignificantChange || new Date())
      };
      
      this.projectRiskProfiles.set(projectId, profile);
      
      // Notification si détérioration significative
      if (trendDirection === 'deteriorating' && riskScore > 50) {
        await this.notifyRiskProfileDeteriorating(profile);
      }
      
    
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  private async generateDailyPlanningReport(): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Génération rapport planning quotidien', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'generateDailyPlanningReport'
            });
      const activeProjects = await this.getActiveProjects();
      const totalActiveProjects = activeProjects.length;
      // Statistiques profils de risque
      const riskProfiles = Array.from(this.projectRiskProfiles.values());
      const highRiskProjects = riskProfiles.filter(p => p.riskScore >= 70).length;
      const mediumRiskProjects = riskProfiles.filter(p => p.riskScore >= 40 && p.riskScore < 70).length;
      const deterioratingProjects = riskProfiles.filter(p => p.trendDirection === 'deteriorating').length;
      // Métriques alertes récentes (24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentRuns = this.runHistory.filter(run => run.scheduledAt > yesterday);
      const totalRecentAlerts = recentRuns.reduce((sum, run) => sum + run.totalAlertsGenerated, 0);
      const criticalRecentAlerts = recentRuns.reduce((sum, run) => sum + run.criticalAlertsCount, 0);
      // Notification rapport quotidien
      const reportMessage = `
📊 Rapport Planning Quotidien - ${new Date().toLocaleDateString()}
Projets: ${totalActiveProjects} actifs
Risques: ${highRiskProjects} 🔴 | ${mediumRiskProjects} 🟠 | ${deterioratingProjects} 📉
Alertes 24h: ${totalRecentAlerts} total (${criticalRecentAlerts} critiques)
      `.trim();
      this.eventBus.publish({
        id: `daily-report-${Date.now()}`,
        type: 'analytics.calculated' as unknown,
        entity: 'system',
        entityId: 'daily-planning-report',
        title: '📊 Rapport Planning Quotidien',
        message: reportMessage,
        severity: 'info',
        timestamp: new Date().toISOString(),
        userId: 'system',
        metadata: {
          totalActiveProjects,
          highRiskProjects,
          mediumRiskProjects,
          deterioratingProjects,
          totalRecentAlerts,
          criticalRecentAlerts,
          reportDate: new Date().toISOString(),
          action: 'daily_report_generated'
        });
      logger.info('Rapport planning quotidien généré et notifié', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'generateDailyPlanningReport' 

              }
                                          });
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }
  private async runImmediateDetection(trigger: string): Promise<DetectionRunSummary> {
    const runId = `immediate-${trigger}-${Date.now()}`;
    const startTime = new Date();
    
    logger.info('Démarrage détection immédiate', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'runImmediateDetection',
        trigger,
        runId 
              
            }
      });
    const detectionSummary = await this.dateAlertDetectionService.runPeriodicDetection();
    const summary: DetectionRunSummary = {
      runId,
      scheduledAt: startTime,
      completedAt: new Date(),
      runType: 'manual',
      totalAlertsGenerated: detectionSummary.totalAlertsGenerated,
      criticalAlertsCount: detectionSummary.criticalIssues,
      affectedProjects: [], // À extraire du detectionSummary si nécessaire
      executionTimeMs: detectionSummary.detectionRunTime,
      errors: [],
      recommendations: detectionSummary.recommendations
    };
    this.runHistory.push(summary);
    this.lastFullDetection = new Date();
    logger.info('Détection immédiate terminée', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'runImmediateDetection',
        runId,
        totalAlertsGenerated: summary.totalAlertsGenerated 

            }
                                          });
    
    return summary;
  }

  // ========================================
  // NOTIFICATIONS ET RECOMMANDATIONS
  // ========================================

  private async notifyCriticalAlertsDetected(summary: DetectionRunSummary): Promise<void> {
    return withErrorHandling(
    async () => {

      this.eventBus.publish({
        id: `critical-batch-${Date.now()}`,
        type: 'date_intelligence.planning_issue_detectas unknown, unknown,
        entity: 'date_intelligence',
        entityId: 'critical-alerts-batch',
        title: '🚨 Alertes Critiques Détectées',
        message: `${summary.criticalAlertsCount} alerte(s) critique(s) détectée(s) lors de la surveillance ${summary.runType}`,
        severity: 'error',
        timestamp: new Date().toISOString(),
        userId: 'system',
        metadata: {
          runId: summary.runId,
          runType: summary.runType,
          criticalAlertsCount: summary.criticalAlertsCount,
          totalAlerts: summary.totalAlertsGenerated,
          affectedProjects: summary.affectedProjects,
          action: 'critical_alerts_batch_detected'
        });
    
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  private async notifyHighValueOptimizations(opportunities: InsertDateAlert[]): Promise<void> {
    return withErrorHandling(
    async () => {

      const totalOpportunities = opportunities.length;
      const message = `💡 ${totalOpportunities} opportunité(s) d'optimisation à forte valeur ajoutée détectée(s)`;
      
      this.eventBus.publish({
        id: `optimizations-${Date.now()}`,
        type: 'analytics.calcas unknown, as unknown,
        entity: 'date_intelligence',
        entityId: 'optimization-opportunities',
        title: '💡 Opportunités d\'Optimisation',
        message,
        severity: 'info',
        timestamp: new Date().toISOString(),
        userId: 'system',
        metadata: {
          opportunitiesCount: totalOpportunities,
          opportunities: opportunities.map(opp  => ({
            entityId: opp.entityId,
            entityType: opp.entityType,
            message: opp.message
          })),
          action: 'high_value_optimizations_detected'
        });
    
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  private async notifyRiskProfileDeteriorating(profile: ProjectRiskProfile): Promise<void> {
    return withErrorHandling(
    async () => {

      this.eventBus.publish({
        id: `risk-deterioration-${profile.projectId}-${Date.now()}`,
        type: 'date_intelligence.planning_issuas unknown,tas unknown unknown,
        entity: 'project',
        entityId: profile.projectId,
        title: '📉 Détérioration Profil de Risque',
        message: `Le profil de risque du projet a évolué négativement (score: ${profile.riskScore}/100)`,
        severity: profile.riskScore > 70 ? 'error' : 'warning',
        timestamp: new Date().toISOString(),
        userId: 'system',
        projectId: profile.projectId,
        metadata: {
          riskScore: profile.riskScore,
          criticalAlerts: profile.criticalAlerts,
          activeAlerts: profile.activeAlerts,
          trendDirection: profile.trendDirection,
          action: 'risk_profile_deterioration'
        });
    
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  private generateHourlyRecommendations(summary: DetectionRunSummary, activeProjectsCount: number): string[] {
    const recommendations: string[] = [];
    
    if (summary.criticalAlertsCount > 0) {
      recommendations.push(`${summary.criticalAlertsCount} alerte(s) critique(s) nécessitent une action immédiate`);
    }
    
    if (summary.totalAlertsGenerated > activeProjectsCount * 0.5) {
      recommendations.push('Forte concentration d\'alertes - révision planning globale recommandée');
    }
    
    if (summary.executionTimeMs > 30000) {
      recommendations.push('Temps d\'exécution élevé - optimisation système recommandée');
    }
    
    if (summary.errors.length > 0) {
      recommendations.push(`${summary.errors.length} erreur(s) détectée(s) - vérification système nécessaire`);
    }
    
    return recommendations;
  }

  private generateDailyRecommendations(summary: DetectionRunSummary): string[] {
    const recommendations: string[] = [];
    
    if (summary.criticalAlertsCount > 0) {
      recommendations.push('Échéances critiques détectées - priorisation des actions requises');
    }
    
    if (summary.totalAlertsGenerated > 10) {
      recommendations.push('Nombreuses échéances approchent - planification anticipée conseillée');
    }
    
    recommendations.push('Vérification quotidienne terminée - surveillance continue active');
    
    return recommendations;
  }

  private cleanupRunHistory(): void {
    // Garder seulement les 100 derniers runs
    if (this.runHistory.length > 100) {
      this.runHistory = this.runHistory.slice(-100);
    }
  }

  private async cleanupExpiredAlerts(): Promise<void> {
    return withErrorHandling(
    async () => {

      // Marquer comme expirées les alertes anciennes non traitées (> 30 jours)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const alerts = await this.storage.getDateAlerts({ status: 'pending' });
      
      for (const alert of alerts) {
        if (alert.createdAt && new Date(alert.createdAt) < thirtyDaysAgo) {
          await this.storage.updateDateAlert(alert.id, { 
                status: 'expired',
                actionTaken: 'Auto-expirée après 30 jours'
          });
        }
      }
      
      logger.info('Nettoyage alertes expirées terminé', { metadata: {
          service: 'PeriodicDetectionScheduler',
          operation: 'cleanupExpiredAlerts' 

              }
                                          });
    },
    {
      operation: 'constructor',
      service: 'PeriodicDetectionScheduler',
      metadata: {}
    } );
    }
  }

  // ========================================
  // API PUBLIQUE ET MÉTRIQUES
  // ========================================

  async triggerManualDetection(): Promise<DetectionRunSummary> {
    logger.info('Détection manuelle déclenchée', { metadata: {
        service: 'PeriodicDetectionScheduler',
        operation: 'triggerManualDetection' 

            }
                                          });
    return await this.runImmediateDetection('manual');
  }
  getMetrics(): SchedulerMetrics {
    const totalRuns = this.runHistory.length;
    const successfulRuns = this.runHistory.filter(run => run.errors.length === 0).length;
    const failedRuns = totalRuns - successfulRuns;
    
    const averageExecutionTimeMs = totalRuns > 0 ? 
      this.runHistory.reduce((sum, run) => sum + run.executionTimeMs, 0) / totalRuns : 0;
    
    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      averageExecutionTimeMs,
      lastRunAt: this.runHistory.length > 0 ? this.runHistory[this.runHistory.length - 1].completedAt : new Date(0),
      nextScheduledRun: new Date(Date.now() + 60 * 60 * 1000), // +1 heure (estimation)
      activeIntervals: this.activeIntervals.map((_, index) => `interval_${index}`)
    };
  }

  getProjectRiskProfiles(): ProjectRiskProfile[] {
    return Array.from(this.projectRiskProfiles.values());
  }

  getRunHistory(limit = 20): DetectionRunSummary[] {
    return this.runHistory.slice(-limit);
  }

  isSystemRunning(): boolean {
    return this.isRunning;
  }
}