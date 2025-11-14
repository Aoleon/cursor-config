/**
 * RiskEventPublisher - Publisher pour événements risques et optimisations
 * 
 * Responsabilités:
 * - Publier événements conflits ressources
 * - Publier événements opportunités optimisation
 * - Publier événements risques retard
 * 
 * Target LOC: ~200-250
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';

export class RiskEventPublisher {
  private publish: (event: RealtimeEvent) => void;

  constructor(publishFn: (event: RealtimeEvent) => void) {
    this.publish = publishFn;
  }

  /**
   * Publie un événement de conflit de ressources détecté
   */
  publishResourceConflictDetected(params: {
    conflictId: string;
    affectedProjects: string[];
    conflictDate: Date;
    severity: 'minor' | 'major' | 'critical';
    resourceType: string;
    shortfall: number;
  }): void {
    const severityMap = { minor: 'info' as const, major: 'warning' as const, critical: 'error' as const };
    
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_PLANNING_ISSUE_DETECTED,
      entity: 'date_intelligence',
      entityId: params.conflictId,
      severity: severityMap[params.severity],
      title: '⚡ Conflit de Ressources',
      message: `Conflit ${params.resourceType} le ${params.conflictDate.toLocaleDateString()}. Déficit: ${params.shortfall} équipe(s).`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/dashboard/conflicts'],
        ...params.affectedProjects.map(projectId => ['/api/projects', projectId])
      ],
      metadata: {
        conflictType: 'resource_conflict',
        affectedProjects: params.affectedProjects,
        conflictDate: params.conflictDate.toISOString(),
        resourceType: params.resourceType,
        shortfall: params.shortfall,
        action: 'resource_conflict_detected'
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement d'opportunité d'optimisation détectée
   */
  publishOptimizationOpportunityDetected(params: {
    opportunityId: string;
    entityType: 'project' | 'offer';
    entityId: string;
    opportunityType: string;
    estimatedGainDays: number;
    feasibility: 'high' | 'medium' | 'low';
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: 'date_intelligence',
      entityId: params.opportunityId,
      severity: 'info',
      title: '💡 Opportunité d\'Optimisation',
      message: `${params.opportunityType} possible. Gain estimé: ${params.estimatedGainDays} jour(s). Faisabilité: ${params.feasibility}.`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/dashboard/optimizations'],
        [`/api/${params.entityType}s`, params.entityId]
      ],
      metadata: {
        opportunityType: params.opportunityType,
        entityType: params.entityType,
        entityId: params.entityId,
        estimatedGainDays: params.estimatedGainDays,
        feasibility: params.feasibility,
        action: 'optimization_detected'
      }
    });

    this.publish(event);
  }

  /**
   * Publie un événement de risque de retard détecté
   */
  publishDelayRiskDetected(params: {
    riskId: string;
    projectId: string;
    phase: string;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
    suggestedActions: string[];
  }): void {
    const severityMap = { low: 'info' as const, medium: 'warning' as const, high: 'error' as const };
    const riskIcons = { low: '🟡', medium: '🟠', high: '🔴' };
    
    const event = createRealtimeEvent({
      type: EventTypeEnum.DATE_INTELLIGENCE_ALERT_CREATED,
      entity: 'date_intelligence',
      entityId: params.riskId,
      severity: severityMap[params.riskLevel],
      title: `${riskIcons[params.riskLevel]} Risque de Retard - ${params.phase}`,
      message: `Risque ${params.riskLevel} détecté pour la phase ${params.phase}. ${params.riskFactors.length} facteur(s) identifié(s).`,
      affectedQueryKeys: [
        ['/api/date-alerts'],
        ['/api/projects', params.projectId],
        ['/api/dashboard/risks']
      ],
      projectId: params.projectId,
      metadata: {
        riskLevel: params.riskLevel,
        phase: params.phase,
        riskFactors: params.riskFactors,
        suggestedActions: params.suggestedActions,
        action: 'delay_risk_detected'
      }
    });

    this.publish(event);
  }
}

