/**
 * DateIntelligenceEventPublisher - Publisher pour événements intelligence temporelle
 * 
 * Responsabilités:
 * - Publier événements calcul timeline
 * - Publier événements recalcul cascade
 * - Publier événements application règles
 * - Publier événements alertes intelligence temporelle
 * - Publier événements problèmes planification
 * 
 * Target LOC: ~300-400
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';

export class DateIntelligenceEventPublisher {
  private publish: (event: RealtimeEvent) => void;

  constructor(publishFn: (event: RealtimeEvent) => void) {
    this.publish = publishFn;
  }

  /**
   * Publie un événement de timeline calculée intelligemment
   */
  publishDateIntelligenceTimelineCalculated(params: {
    projectId: string;
    timelineId: string;
    phasesCount: number;
    totalDuration: number;
    constraintsApplied: number;
    calculationMethod: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_TIMELINE_CALCULATED,
      entity: 'date_intelligence',
      entityId: params.timelineId,
      severity: 'success',
      title: '🧮 Timeline Intelligence Calculée',
      message: `Timeline intelligente générée: ${params.phasesCount} phases, ${params.totalDuration} jours (${params.constraintsApplied} contraintes appliquées)`,
      affectedQueryKeys: [
        ['/api/projects', params.projectId, 'calculate-timeline'],
        ['/api/projects', params.projectId],
        ['/api/intelligence-rules'],
        ['/api/dashboard/kpis']
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        phasesCount: params.phasesCount,
        totalDuration: params.totalDuration,
        constraintsApplied: params.constraintsApplied,
        calculationMethod: params.calculationMethod,
        action: 'timeline_calculated'
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement de recalcul cascade effectué
   */
  publishDateIntelligenceCascadeRecalculated(params: {
    projectId: string;
    triggeredByPhase: string;
    newDate: Date;
    affectedPhasesCount: number;
    totalImpactDays: number;
    recalculationType: string;
    userId?: string;
  }): void {
    const severity = params.totalImpactDays > 0 ? 'warning' : 'success';
    const impactIcon = params.totalImpactDays > 0 ? '⚠️' : '✅';
    
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_CASCADE_RECALCULATED,
      entity: 'date_intelligence',
      entityId: `cascade_${params.projectId}_${Date.now()}`,
      severity,
      title: `${impactIcon} Recalcul Cascade Effectué`,
      message: `${params.affectedPhasesCount} phases recalculées depuis ${params.triggeredByPhase} (impact: ${params.totalImpactDays > 0 ? '+' : ''}${params.totalImpactDays} jours)`,
      affectedQueryKeys: [
        ['/api/projects', params.projectId, 'recalculate-from', params.triggeredByPhase],
        ['/api/projects', params.projectId],
        ['/api/date-alerts']
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        triggeredByPhase: params.triggeredByPhase,
        newDate: params.newDate.toISOString(),
        affectedPhasesCount: params.affectedPhasesCount,
        totalImpactDays: params.totalImpactDays,
        recalculationType: params.recalculationType,
        action: 'cascade_recalculated'
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement de règle métier appliquée
   */
  publishDateIntelligenceRuleApplied(params: {
    ruleId: string;
    ruleName: string;
    phase: string;
    projectId: string;
    confidence: number;
    impact: number;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_RULE_APPLIED,
      entity: 'date_intelligence',
      entityId: params.ruleId,
      severity: 'info',
      title: '📝 Règle Métier Appliquée',
      message: `Règle "${params.ruleName}" appliquée sur phase ${params.phase} (confiance: ${Math.round(params.confidence * 100)}%)`,
      affectedQueryKeys: [
        ['/api/intelligence-rules'],
        ['/api/projects', params.projectId],
        ['/api/intelligence-rules', params.ruleId]
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        ruleId: params.ruleId,
        ruleName: params.ruleName,
        phase: params.phase,
        confidence: params.confidence,
        impact: params.impact,
        action: 'rule_applied'
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement d'alerte d'intelligence temporelle créée
   */
  publishDateIntelligenceAlertCreated(params: {
    alertId: string;
    alertTitle: string;
    entityType: string;
    entityId: string;
    severity: 'info' | 'warning' | 'error';
    projectId?: string;
    userId?: string;
  }): void {
    const severityIcon = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨'
    };
    
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: 'date_intelligence',
      entityId: params.alertId,
      severity: params.severity === 'error' ? 'error' : params.severity === 'warning' ? 'warning' : 'info',
      title: `${severityIcon[params.severity]} Alerte Intelligence Temporelle`,
      message: `Nouvelle alerte: ${params.alertTitle}`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/date-alerts', params.alertId],
        ['/api/dashboard/alerts'],
        ...(params.projectId ? [['/api/projects', params.projectId]] : [])
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        alertId: params.alertId,
        alertTitle: params.alertTitle,
        entityType: params.entityType,
        entityId: params.entityId,
        action: 'alert_created'
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement de problème de planification détecté
   */
  publishDateIntelligencePlanningIssueDetected(params: {
    projectId: string;
    issueType: string;
    severity: 'info' | 'warning' | 'error';
    description: string;
    affectedPhases: string[];
    recommendations: string[];
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_PLANNING_ISSUE_DETECTED,
      entity: 'date_intelligence',
      entityId: `issue_${params.projectId}_${Date.now()}`,
      severity: params.severity === 'error' ? 'error' : params.severity === 'warning' ? 'warning' : 'info',
      title: '🛠️ Problème de Planification',
      message: `${params.issueType}: ${params.description} (${params.affectedPhases.length} phases affectées)`,
      affectedQueryKeys: [
        ['/api/projects', params.projectId],
        ['/api/date-alerts'],
        ['/api/dashboard/planning-issues']
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        issueType: params.issueType,
        severity: params.severity,
        description: params.description,
        affectedPhases: params.affectedPhases,
        recommendations: params.recommendations,
        action: 'planning_issue_detected'
      }
    });

    this.publish(event);
  }
}

