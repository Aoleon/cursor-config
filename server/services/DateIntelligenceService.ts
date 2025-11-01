import type { IStorage } from "../storage-poc";
import { eventBus } from "../eventBus";
import { logger } from "../utils/logger";
import { NotFoundError, DatabaseError } from "../utils/error-handler";
import type { 
  ProjectTimeline, InsertProjectTimeline,
  DateIntelligenceRule, InsertDateIntelligenceRule,
  DateAlert, InsertDateAlert,
  Project, ProjectStatus
} from "@shared/schema";

// ========================================
// TYPES ET INTERFACES POUR LE SYSTÈME INTELLIGENT
// ========================================

export interface ProjectContext {
  projectType: 'neuf' | 'renovation' | 'maintenance';
  complexity: 'simple' | 'normale' | 'elevee';
  surface: number; // m²
  materialTypes: string[]; // bois, alu, pvc
  customWork: boolean; // sur-mesure vs standard
  location: {
    weatherZone: string;
    accessibility: 'facile' | 'moyenne' | 'difficile';
    departement: string;
  };
  resources: {
    teamSize: number;
    subcontractors: string[];
    equipmentNeeded: string[];
  };
  seasonality?: {
    season: 'spring' | 'summer' | 'autumn' | 'winter';
    weatherDependent: boolean;
  };
}

export interface PhaseDurationResult {
  calculatedDuration: number; // en jours ouvrés
  appliedRule: string;
  confidence: number; // 0-1, niveau de confiance du calcul
  factors: AppliedFactor[];
  recommendedStartDate?: Date;
  recommendedEndDate?: Date;
  warnings?: string[];
}

export interface AppliedFactor {
  name: string;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface CascadeUpdateResult {
  updatedPhases: CascadeEffect[];
  totalDelayDays: number;
  affectedProjects: string[];
  recommendedActions: string[];
  alertsGenerated: DateAlert[];
}

export interface CascadeEffect {
  phase: ProjectStatus;
  oldStartDate: Date;
  oldEndDate: Date;
  newStartDate: Date;
  newEndDate: Date;
  impactDays: number;
  reason: string;
  confidence: number;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  phase: ProjectStatus | null;
  multiplierApplied: number;
  durationImpact: number;
  conditions: Record<string, any>;
}

export interface PlanningIssue {
  id: string;
  type: 'resource_conflict' | 'deadline_risk' | 'dependency_violation' | 'optimization_opportunity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedPhases: ProjectStatus[];
  affectedDates: Date[];
  suggestedActions: string[];
  estimatedImpact: {
    delayDays: number;
    costImpact?: number;
    resourceImpact?: string[];
  };
}

export interface PlanningConstraint {
  type: string;
  phase: ProjectStatus;
  description: string;
  startDate?: Date;
  endDate?: Date;
  resources?: string[];
  priority: number;
}

export interface CalculationContext {
  projectId: string;
  projectContext: ProjectContext;
  currentPhase: ProjectStatus;
  existingTimelines: ProjectTimeline[];
  constraints: PlanningConstraint[];
  historicalData?: any[];
}

// ========================================
// MOTEUR DE CALCUL INTELLIGENT
// ========================================

class CalculationEngine {
  
  constructor(private storage: IStorage) {}

  // Calcul durée avec règles métier appliquées
  async calculateDuration(
    phase: ProjectStatus,
    context: ProjectContext,
    activeRules: DateIntelligenceRule[]
  ): Promise<PhaseDurationResult> {
    try {
      // 1. Trouver la règle applicable
      const applicableRule = this.findApplicableRule(phase, context, activeRules);
      
      if (!applicableRule) {
        // Fallback avec durées par défaut
        return this.getDefaultDuration(phase, context);
      }

      // 2. Calcul base avec multiplicateurs
      let baseDuration = applicableRule.baseDuration || this.getDefaultBaseDuration(phase);
      const multiplierFactor = parseFloat(applicableRule.multiplierFactor?.toString() || "1.0");
      
      // 3. Application des multiplicateurs contextuels
      const appliedFactors: AppliedFactor[] = [];
      let finalDuration = baseDuration * multiplierFactor;
      
      // Multiplicateur complexité
      const complexityMultiplier = this.getComplexityMultiplier(context.complexity);
      finalDuration *= complexityMultiplier;
      appliedFactors.push({
        name: 'Complexité',
        value: complexityMultiplier,
        impact: complexityMultiplier > 1 ? 'negative' : 'positive',
        description: `Projet de complexité ${context.complexity}`
      });

      // Multiplicateur surface (pour phases techniques)
      if (['etude', 'production', 'chantier'].includes(phase)) {
        const surfaceMultiplier = this.getSurfaceMultiplier(context.surface);
        finalDuration *= surfaceMultiplier;
        appliedFactors.push({
          name: 'Surface',
          value: surfaceMultiplier,
          impact: surfaceMultiplier > 1 ? 'negative' : 'positive',
          description: `Surface de ${context.surface}m²`
        });
      }

      // Multiplicateur travail sur-mesure
      if (context.customWork) {
        const customMultiplier = 1.4;
        finalDuration *= customMultiplier;
        appliedFactors.push({
          name: 'Sur-mesure',
          value: customMultiplier,
          impact: 'negative',
          description: 'Travail sur-mesure nécessitant plus de temps'
        });
      }

      // Multiplicateur accessibilité (pour chantier)
      if (phase === 'chantier') {
        const accessibilityMultiplier = this.getAccessibilityMultiplier(context.location.accessibility);
        finalDuration *= accessibilityMultiplier;
        appliedFactors.push({
          name: 'Accessibilité',
          value: accessibilityMultiplier,
          impact: accessibilityMultiplier > 1 ? 'negative' : 'positive',
          description: `Accessibilité ${context.location.accessibility}`
        });
      }

      // 4. Application du buffer configuré
      const bufferPercentage = parseFloat(applicableRule.bufferPercentage?.toString() || "0.15");
      const bufferDays = finalDuration * bufferPercentage;
      finalDuration += bufferDays;
      
      appliedFactors.push({
        name: 'Buffer sécurité',
        value: bufferPercentage,
        impact: 'neutral',
        description: `Buffer de sécurité de ${Math.round(bufferPercentage * 100)}%`
      });

      // 5. Application des contraintes min/max
      const minDuration = applicableRule.minDuration || 1;
      const maxDuration = applicableRule.maxDuration || 365;
      finalDuration = Math.max(minDuration, Math.min(finalDuration, maxDuration));

      // 6. Arrondi et validation
      const calculatedDuration = Math.ceil(finalDuration);
      
      // 7. Calcul de la confiance
      const confidence = this.calculateConfidence(context, applicableRule, appliedFactors);
      
      // 8. Génération des avertissements si nécessaire
      const warnings = this.generateWarnings(context, calculatedDuration, appliedFactors);

      return {
        calculatedDuration,
        appliedRule: applicableRule.name || 'Règle par défaut',
        confidence,
        factors: appliedFactors,
        warnings
      };
      
    } catch (error) {
      logger.error('Erreur calcul durée', {
        metadata: {
          service: 'DateIntelligenceService',
          operation: 'calculateDuration',
          phase,
          projectType: context.projectType,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      // Fallback sécurisé
      return this.getDefaultDuration(phase, context);
    }
  }

  // Trouver la règle applicable selon le contexte
  private findApplicableRule(
    phase: ProjectStatus, 
    context: ProjectContext, 
    rules: DateIntelligenceRule[]
  ): DateIntelligenceRule | null {
    
    // Filtrer les règles actives pour cette phase
    const applicableRules = rules.filter(rule => {
      if (!rule.isActive) return false;
      if (rule.phase && rule.phase !== phase) return false;
      
      // Vérifier les conditions de base si définies
      if (rule.baseConditions) {
        const conditions = typeof rule.baseConditions === 'string' 
          ? JSON.parse(rule.baseConditions) 
          : rule.baseConditions;
          
        if (conditions.projectType && conditions.projectType !== context.projectType) return false;
        if (conditions.materialType && !context.materialTypes.includes(conditions.materialType)) return false;
        if (conditions.complexity && conditions.complexity !== context.complexity) return false;
      }
      
      return true;
    });

    // Retourner la règle avec la priorité la plus élevée
    return applicableRules.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0] || null;
  }

  // Multiplicateurs contextuels
  private getComplexityMultiplier(complexity: string): number {
    switch (complexity) {
      case 'simple': return 0.8;
      case 'normale': return 1.0;
      case 'elevee': return 1.4;
      default: return 1.0;
    }
  }

  private getSurfaceMultiplier(surface: number): number {
    if (surface < 50) return 0.9;
    if (surface < 200) return 1.0;
    if (surface < 500) return 1.2;
    return 1.4;
  }

  private getAccessibilityMultiplier(accessibility: string): number {
    switch (accessibility) {
      case 'facile': return 0.9;
      case 'moyenne': return 1.0;
      case 'difficile': return 1.3;
      default: return 1.0;
    }
  }

  // Durées par défaut si aucune règle applicable
  private getDefaultBaseDuration(phase: ProjectStatus): number {
    switch (phase) {
      case 'passation': return 30;
      case 'etude': return 10;
      case 'visa_architecte': return 5;
      case 'planification': return 7;
      case 'approvisionnement': return 14;
      case 'chantier': return 21;
      case 'sav': return 3;
      default: return 7;
    }
  }

  private getDefaultDuration(phase: ProjectStatus, context: ProjectContext): PhaseDurationResult {
    const baseDuration = this.getDefaultBaseDuration(phase);
    const complexityMultiplier = this.getComplexityMultiplier(context.complexity);
    const calculatedDuration = Math.ceil(baseDuration * complexityMultiplier);
    
    return {
      calculatedDuration,
      appliedRule: 'Règle par défaut système',
      confidence: 0.6,
      factors: [{
        name: 'Calcul par défaut',
        value: complexityMultiplier,
        impact: 'neutral',
        description: 'Aucune règle spécifique trouvée, utilisation des valeurs par défaut'
      }],
      warnings: ['Aucune règle métier spécifique trouvée pour ce contexte']
    };
  }

  // Calcul confiance (0-1)
  private calculateConfidence(
    context: ProjectContext, 
    rule: DateIntelligenceRule, 
    factors: AppliedFactor[]
  ): number {
    let confidence = 0.8; // Base de confiance

    // Réduire si beaucoup de multiplicateurs appliqués
    if (factors.length > 4) confidence -= 0.1;
    
    // Réduire si projet très spécifique
    if (context.customWork) confidence -= 0.1;
    
    // Augmenter si règle récente et spécifique
    if (rule.priority && rule.priority > 90) confidence += 0.1;
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }

  // Génération d'avertissements
  private generateWarnings(
    context: ProjectContext, 
    duration: number, 
    factors: AppliedFactor[]
  ): string[] {
    const warnings: string[] = [];
    
    if (duration > 60) {
      warnings.push('Durée calculée supérieure à 2 mois - vérifier la cohérence');
    }
    
    if (factors.some(f => f.impact === 'negative' && f.value > 1.5)) {
      warnings.push('Plusieurs facteurs défavorables détectés - considérer une révision');
    }
    
    if (context.seasonality?.weatherDependent && ['autumn', 'winter'].includes(context.seasonality.season)) {
      warnings.push('Période hivernale - prévoir des délais supplémentaires pour les travaux extérieurs');
    }
    
    return warnings;
  }

  // Gestion des dépendances entre phases
  async calculateDependentPhases(
    projectId: string,
    changedPhase: ProjectStatus,
    newEndDate: Date
  ): Promise<CascadeEffect[]> {
    
    // Récupérer les timelines existantes
    const timelines = await this.storage.getProjectTimelines(projectId);
    
    // Définir l'ordre des phases et leurs dépendances
    const phaseOrder: ProjectStatus[] = [
      'passation', 'etude', 'visa_architecte', 'planification', 
      'approvisionnement', 'chantier', 'sav'
    ];
    
    const changedPhaseIndex = phaseOrder.indexOf(changedPhase);
    if (changedPhaseIndex === -1) return [];
    
    const cascadeEffects: CascadeEffect[] = [];
    let currentDate = new Date(newEndDate);
    
    // Recalculer les phases suivantes
    for (let i = changedPhaseIndex + 1; i < phaseOrder.length; i++) {
      const phase = phaseOrder[i];
      const existingTimeline = timelines.find(t => t.phase === phase);
      
      if (existingTimeline) {
        const newStartDate = this.addWorkingDays(currentDate, 1);
        const newEndDate = this.addWorkingDays(newStartDate, existingTimeline.duration - 1);
        
        cascadeEffects.push({
          phase,
          oldStartDate: existingTimeline.startDate,
          oldEndDate: existingTimeline.endDate,
          newStartDate,
          newEndDate,
          impactDays: this.calculateDaysDifference(existingTimeline.endDate, newEndDate),
          reason: `Dépendance de ${changedPhase}`,
          confidence: 0.9
        });
        
        currentDate = newEndDate;
      }
    }
    
    return cascadeEffects;
  }

  // Utilitaires dates
  private addWorkingDays(date: Date, days: number): Date {
    const result = new Date(date);
    let addedDays = 0;
    
    while (addedDays < days) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();
      
      // Exclure weekends (0 = dimanche, 6 = samedi)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        addedDays++;
      }
    }
    
    return result;
  }

  private calculateDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// ========================================
// SERVICE PRINCIPAL D'INTELLIGENCE TEMPORELLE
// ========================================

export class DateIntelligenceService {
  private calculationEngine: CalculationEngine;
  private cache: Map<string, any> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 heure en millisecondes

  constructor(private storage: IStorage) {
    this.calculationEngine = new CalculationEngine(storage);
  }

  // ========================================
  // MÉTHODE 1 : CALCUL AUTOMATIQUE DURÉES
  // ========================================
  async calculatePhaseDuration(
    projectId: string, 
    phase: ProjectStatus, 
    context: ProjectContext
  ): Promise<PhaseDurationResult> {
    
    const cacheKey = `duration_${projectId}_${phase}_${JSON.stringify(context)}`;
    
    // Vérifier le cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
    }

    try {
      // Récupérer les règles actives
      const activeRules = await this.storage.getActiveRules({ 
        phase, 
        projectType: context.projectType 
      });

      // Calculer la durée
      const result = await this.calculationEngine.calculateDuration(phase, context, activeRules);

      // Mettre en cache
      this.cache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      return result;
      
    } catch (error) {
      logger.error('Erreur calcul durée phase', {
        metadata: {
          service: 'DateIntelligenceService',
          operation: 'calculatePhaseDuration',
          projectId,
          phase,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new DatabaseError(`Impossible de calculer la durée pour la phase ${phase}`, error as Error);
    }
  }

  // ========================================  
  // MÉTHODE 2 : PLANIFICATION INTELLIGENTE PROJET COMPLET
  // ========================================
  async generateProjectTimeline(
    projectId: string,
    constraints: PlanningConstraint[] = []
  ): Promise<ProjectTimeline[]> {
    
    try {
      // Récupérer le projet
      const project = await this.storage.getProject(projectId);
      if (!project) {
        throw new NotFoundError(`Projet ${projectId}`);
      }

      // Construire le contexte du projet
      const projectContext = await this.buildProjectContext(project);

      // Définir l'ordre des phases
      const phases: ProjectStatus[] = [
        'passation', 'etude', 'visa_architecte', 'planification', 
        'approvisionnement', 'chantier', 'sav'
      ];

      const timelines: ProjectTimeline[] = [];
      let currentDate = project.startDate || new Date();

      // Calculer chaque phase séquentiellement
      for (const phase of phases) {
        const durationResult = await this.calculatePhaseDuration(
          projectId, 
          phase, 
          projectContext
        );

        const startDate = new Date(currentDate);
        const endDate = this.calculationEngine['addWorkingDays'](startDate, durationResult.calculatedDuration - 1);

        const timeline: InsertProjectTimeline = {
          projectId,
          phase,
          startDate,
          endDate,
          duration: durationResult.calculatedDuration,
          calculationMethod: 'automatic',
          appliedRules: [durationResult.appliedRule],
          confidence: durationResult.confidence,
          constraints: constraints.filter(c => c.phase === phase).map(c => c.type),
          createdBy: 'system'
        };

        const createdTimeline = await this.storage.createProjectTimeline(timeline);
        timelines.push(createdTimeline);

        // Date suivante = fin + 1 jour ouvré
        currentDate = this.calculationEngine['addWorkingDays'](endDate, 1);
      }

      // CORRECTION BLOCKER 5: Publier événement d'intelligence temporelle spécifique
      eventBus.publishDateIntelligenceTimelineCalculated({
        projectId,
        timelineId: `timeline_${projectId}_${Date.now()}`,
        phasesCount: timelines.length,
        totalDuration: timelines.reduce((total, timeline) => total + (timeline.duration || 0), 0),
        constraintsApplied: constraints?.length || 0,
        calculationMethod: 'intelligent_rules_based',
        userId: 'system'
      });

      return timelines;
      
    } catch (error) {
      logger.error('Erreur génération timeline projet', {
        metadata: {
          service: 'DateIntelligenceService',
          operation: 'generateProjectTimeline',
          projectId,
          constraintsCount: constraints.length,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new DatabaseError(`Impossible de générer la timeline du projet ${projectId}`, error as Error);
    }
  }

  // ========================================
  // MÉTHODE 3 : RECALCUL EN CASCADE APRÈS CHANGEMENT
  // ========================================
  async recalculateFromPhase(
    projectId: string,
    fromPhase: ProjectStatus,
    newDate: Date
  ): Promise<CascadeUpdateResult> {
    
    try {
      // Calculer les effets cascade
      const cascadeEffects = await this.calculationEngine.calculateDependentPhases(
        projectId, 
        fromPhase, 
        newDate
      );

      // Mettre à jour les timelines affectées
      const updatedTimelines = [];
      for (const effect of cascadeEffects) {
        const existingTimelines = await this.storage.getProjectTimelines(projectId);
        const timeline = existingTimelines.find(t => t.phase === effect.phase);
        
        if (timeline) {
          const updatedTimeline = await this.storage.updateProjectTimeline(timeline.id, {
            startDate: effect.newStartDate,
            endDate: effect.newEndDate,
            calculationMethod: 'automatic',
            lastCalculatedAt: new Date()
          });
          updatedTimelines.push(updatedTimeline);
        }
      }

      // Calculer l'impact total
      const totalDelayDays = cascadeEffects.reduce((sum, effect) => sum + effect.impactDays, 0);

      // Générer des alertes si des retards importants
      const alertsGenerated: DateAlert[] = [];
      if (totalDelayDays > 5) {
        const alert = await this.storage.createDateAlert({
          entityType: 'project',
          entityId: projectId,
          alertType: 'delay_confirmed',
          severity: totalDelayDays > 15 ? 'critical' : 'warning',
          title: `Retard projet détecté`,
          message: `Le changement de la phase ${fromPhase} entraîne un retard de ${totalDelayDays} jours`,
          delayDays: totalDelayDays,
          suggestedActions: [
            'Réviser la planification globale',
            'Évaluer les ressources supplémentaires',
            'Informer le client du nouveau planning'
          ],
          status: 'pending'
        });
        alertsGenerated.push(alert);
      }

      // Actions recommandées
      const recommendedActions = [
        'Valider les nouveaux délais avec le client',
        'Vérifier la disponibilité des équipes',
        'Mettre à jour les commandes fournisseurs si nécessaire'
      ];

      // CORRECTION BLOCKER 5: Publier événement de recalcul cascade spécifique
      eventBus.publishDateIntelligenceCascadeRecalculated({
        projectId,
        triggeredByPhase: fromPhase,
        newDate,
        affectedPhasesCount: cascadeEffects.length,
        totalImpactDays: totalDelayDays,
        recalculationType: 'cascade_automatic',
        userId: 'system'
      });

      return {
        updatedPhases: cascadeEffects,
        totalDelayDays,
        affectedProjects: [projectId],
        recommendedActions,
        alertsGenerated
      };
      
    } catch (error) {
      logger.error('Erreur recalcul cascade depuis phase', {
        metadata: {
          service: 'DateIntelligenceService',
          operation: 'recalculateFromPhase',
          projectId,
          fromPhase,
          newDate: newDate.toISOString(),
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new DatabaseError(`Impossible de recalculer depuis la phase ${fromPhase}`, error as Error);
    }
  }

  // ========================================
  // MÉTHODE 4 : APPLICATION RÈGLES MÉTIER
  // ========================================
  async applyIntelligenceRules(
    context: CalculationContext
  ): Promise<AppliedRule[]> {
    
    try {
      // Récupérer toutes les règles actives pertinentes
      const allRules = await this.storage.getActiveRules();
      
      const appliedRules: AppliedRule[] = [];

      for (const rule of allRules) {
        // Vérifier si la règle s'applique au contexte
        if (this.ruleAppliesTo(rule, context)) {
          const multiplier = parseFloat(rule.multiplierFactor?.toString() || "1.0");
          const durationImpact = (rule.baseDuration || 0) * (multiplier - 1);

          appliedRules.push({
            ruleId: rule.id,
            ruleName: rule.name || 'Règle sans nom',
            phase: rule.phase,
            multiplierApplied: multiplier,
            durationImpact,
            conditions: typeof rule.baseConditions === 'string' 
              ? JSON.parse(rule.baseConditions || '{}') 
              : rule.baseConditions || {}
          });

          // CORRECTION BLOCKER 5: Publier événement pour chaque règle appliquée
          eventBus.publishDateIntelligenceRuleApplied({
            ruleId: rule.id,
            ruleName: rule.name || 'Règle sans nom',
            phase: rule.phase || 'all',
            projectId: context.projectId,
            confidence: Math.min(1.0, Math.abs(durationImpact) / 10), // Confiance basée sur l'impact
            impact: durationImpact,
            userId: 'system'
          });
        }
      }

      return appliedRules.sort((a, b) => Math.abs(b.durationImpact) - Math.abs(a.durationImpact));
      
    } catch (error) {
      logger.error('Erreur application règles intelligence', {
        metadata: {
          service: 'DateIntelligenceService',
          operation: 'applyIntelligenceRules',
          projectId: context.projectId,
          currentPhase: context.currentPhase,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new DatabaseError(`Impossible d'appliquer les règles d'intelligence`, error as Error);
    }
  }

  // ========================================
  // MÉTHODE 5 : DÉTECTION CONFLITS ET OPTIMISATIONS
  // ========================================
  async detectPlanningIssues(
    timeline: ProjectTimeline[]
  ): Promise<PlanningIssue[]> {
    
    try {
      const issues: PlanningIssue[] = [];

      // 1. Détecter les chevauchements de phases
      for (let i = 0; i < timeline.length - 1; i++) {
        const current = timeline[i];
        const next = timeline[i + 1];
        
        if (current.endDate >= next.startDate) {
          issues.push({
            id: `overlap_${current.phase}_${next.phase}`,
            type: 'dependency_violation',
            severity: 'critical',
            title: 'Chevauchement de phases détecté',
            description: `Les phases ${current.phase} et ${next.phase} se chevauchent`,
            affectedPhases: [current.phase, next.phase],
            affectedDates: [current.endDate, next.startDate],
            suggestedActions: [
              'Réviser la durée de la phase ' + current.phase,
              'Reporter le début de la phase ' + next.phase,
              'Vérifier les dépendances entre phases'
            ],
            estimatedImpact: {
              delayDays: Math.ceil((current.endDate.getTime() - next.startDate.getTime()) / (1000 * 60 * 60 * 24))
            }
          });
        }
      }

      // 2. Détecter les phases trop longues
      timeline.forEach(phase => {
        if (phase.duration > 60) { // Plus de 2 mois
          issues.push({
            id: `long_phase_${phase.phase}`,
            type: 'optimization_opportunity',
            severity: 'warning',
            title: 'Phase exceptionnellement longue',
            description: `La phase ${phase.phase} dure ${phase.duration} jours`,
            affectedPhases: [phase.phase],
            affectedDates: [phase.startDate, phase.endDate],
            suggestedActions: [
              'Diviser la phase en sous-étapes',
              'Réviser les ressources allouées',
              'Vérifier la complexité estimée'
            ],
            estimatedImpact: {
              delayDays: Math.floor(phase.duration * 0.2) // Optimisation possible de 20%
            }
          });
        }
      });

      // 3. Détecter les risques de retard (faible confiance)
      timeline.forEach(phase => {
        if (phase.confidence && phase.confidence < 0.6) {
          issues.push({
            id: `low_confidence_${phase.phase}`,
            type: 'deadline_risk',
            severity: 'warning',
            title: 'Risque de retard détecté',
            description: `Faible confiance (${Math.round(phase.confidence * 100)}%) pour la phase ${phase.phase}`,
            affectedPhases: [phase.phase],
            affectedDates: [phase.endDate],
            suggestedActions: [
              'Affiner l\'estimation de durée',
              'Prévoir un buffer supplémentaire',
              'Planifier une révision à mi-parcours'
            ],
            estimatedImpact: {
              delayDays: Math.ceil(phase.duration * 0.3)
            }
          });
        }
      });

      // 4. Opportunités d'optimisation (phases très courtes)
      timeline.forEach(phase => {
        if (phase.duration < 2 && ['etude', 'planification'].includes(phase.phase)) {
          issues.push({
            id: `short_phase_${phase.phase}`,
            type: 'optimization_opportunity',
            severity: 'info',
            title: 'Opportunité de parallélisation',
            description: `La phase ${phase.phase} est très courte (${phase.duration} jours)`,
            affectedPhases: [phase.phase],
            affectedDates: [phase.startDate, phase.endDate],
            suggestedActions: [
              'Envisager de paralléliser avec d\'autres phases',
              'Regrouper avec des activités connexes',
              'Vérifier si l\'estimation est réaliste'
            ],
            estimatedImpact: {
              delayDays: -2 // Gain possible
            }
          });
        }
      });

      return issues.sort((a, b) => {
        const severityOrder = { 'critical': 3, 'warning': 2, 'info': 1 };
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
      });
      
    } catch (error) {
      logger.error('Erreur détection problèmes planification', {
        metadata: {
          service: 'DateIntelligenceService',
          operation: 'detectPlanningIssues',
          timelineLength: timeline.length,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      throw new DatabaseError(`Impossible de détecter les problèmes de planification`, error as Error);
    }
  }

  // ========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================================

  private async buildProjectContext(project: Project): Promise<ProjectContext> {
    // Construction du contexte basé sur les données du projet
    // Cette méthode peut être étendue selon les besoins
    return {
      projectType: 'neuf', // À adapter selon les données projet
      complexity: 'normale',
      surface: 100, // À extraire des données projet
      materialTypes: ['pvc'], // À extraire des données projet
      customWork: false,
      location: {
        weatherZone: 'temperate',
        accessibility: 'moyenne',
        departement: '75'
      },
      resources: {
        teamSize: 3,
        subcontractors: [],
        equipmentNeeded: []
      },
      seasonality: {
        season: this.getCurrentSeason(),
        weatherDependent: true
      }
    };
  }

  private ruleAppliesTo(rule: DateIntelligenceRule, context: CalculationContext): boolean {
    // Si règle pour une phase spécifique
    if (rule.phase && rule.phase !== context.currentPhase) return false;
    
    // Vérifier les conditions de base
    if (rule.baseConditions) {
      const conditions = typeof rule.baseConditions === 'string' 
        ? JSON.parse(rule.baseConditions) 
        : rule.baseConditions;
        
      if (conditions.projectType && conditions.projectType !== context.projectContext.projectType) return false;
      if (conditions.complexity && conditions.complexity !== context.projectContext.complexity) return false;
    }
    
    return true;
  }

  private getCurrentSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  // Nettoyage du cache
  public clearCache(): void {
    this.cache.clear();
  }

  // Statistiques du service
  public getStats() {
    return {
      cacheSize: this.cache.size,
      lastCalculation: Date.now()
    };
  }
}