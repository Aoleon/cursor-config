/**
 * ProjectEventPublisher - Publisher pour événements projets et tâches
 * 
 * Responsabilités:
 * - Publier événements création/modification projets
 * - Publier événements tâches (retard, changement statut)
 * 
 * Target LOC: ~150-200
 */

import type { RealtimeEvent } from '../../../shared/events';
import { createRealtimeEvent, EventType as EventTypeEnum } from '../../../shared/events';

export class ProjectEventPublisher {
  private publish: (event: RealtimeEvent) => void;
  private getStatusChangeSeverity: (status: string) => 'info' | 'warning' | 'error' | 'success';

  constructor(
    publishFn: (event: RealtimeEvent) => void,
    getStatusChangeSeverityFn: (status: string) => 'info' | 'warning' | 'error' | 'success'
  ) {
    this.publish = publishFn;
    this.getStatusChangeSeverity = getStatusChangeSeverityFn;
  }

  /**
   * Publie un événement de création de projet
   */
  publishProjectCreated(params: {
    projectId: string;
    name?: string;
    offerId?: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.PROJECT_CREATED,
      entity: 'project',
      entityId: params.projectId,
      severity: 'success',
      affectedQueryKeys: [
        ['/api/projects'],
        ['/api/projects', params.projectId],
        ['/api/offers', params.offerId || ''],
        ['/api/dashboard/kpis'],
        ['/api/be-workload'],
      ],
      projectId: params.projectId,
      offerId: params.offerId,
      userId: params.userId,
      metadata: {
        name: params.name,
      },
    });

    this.publish(event);
  }

  /**
   * Publie un événement de changement de statut de projet
   */
  publishProjectStatusChanged(params: {
    projectId: string;
    name?: string;
    prevStatus: string;
    newStatus: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.PROJECT_STATUS_CHANGED,
      entity: 'project',
      entityId: params.projectId,
      prevStatus: params.prevStatus,
      newStatus: params.newStatus,
      severity: this.getStatusChangeSeverity(params.newStatus),
      affectedQueryKeys: [
        ['/api/projects'],
        ['/api/projects', params.projectId],
        ['/api/dashboard/kpis'],
        ['/api/be-workload'],
      ],
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        name: params.name,
      },
    });

    this.publish(event);
  }

  /**
   * Publie un événement de tâche en retard
   */
  publishTaskOverdue(params: {
    taskId: string;
    name?: string;
    projectId?: string;
    delayDays?: number;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.TASK_OVERDUE,
      entity: 'task',
      entityId: params.taskId,
      severity: 'warning',
      affectedQueryKeys: [
        ['/api/tasks'],
        ['/api/tasks', params.taskId],
        ['/api/projects', params.projectId || ''],
        ['/api/dashboard/kpis'],
      ],
      taskId: params.taskId,
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        name: params.name,
        delayDays: params.delayDays,
      },
    });

    this.publish(event);
  }

  /**
   * Publie un événement de changement de statut de tâche
   */
  publishTaskStatusChanged(params: {
    taskId: string;
    name?: string;
    projectId?: string;
    prevStatus: string;
    newStatus: string;
    userId?: string;
  }): void {
    const event = createRealtimeEvent({
      type: EventTypeEnum.TASK_STATUS_CHANGED,
      entity: 'task',
      entityId: params.taskId,
      prevStatus: params.prevStatus,
      newStatus: params.newStatus,
      severity: params.newStatus === 'termine' ? 'success' : 'info',
      affectedQueryKeys: [
        ['/api/tasks'],
        ['/api/tasks', params.taskId],
        ['/api/projects', params.projectId || ''],
        ['/api/dashboard/kpis'],
      ],
      taskId: params.taskId,
      projectId: params.projectId,
      userId: params.userId,
      metadata: {
        name: params.name,
      },
    });

    this.publish(event);
  }
}

