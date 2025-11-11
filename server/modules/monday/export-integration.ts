import { EventBus } from '../../eventBus';
import { withErrorHandling } from './utils/error-handler';
import { MondayDataService } from './consolidated/MondayDataService';
import { logger } from '../../utils/logger';

/**
 * Configure l'export automatique vers Monday.com via EventBus
 * 
 * Auto-export des projets et AOs dès leur création
 * Émet des événements de succès/échec pour monitoring
 */
export function setupMondayExport(
  eventBus: EventBus,
  exportService: MondayExportService
): void {
  logger.info('[MondayExportIntegration] Configuration export automatique', {
    service: 'MondayExportIntegration',
    metadata: {
      operation: 'setup',
      events: ['project:created', 'ao:created']

        });

  // Auto-export sur création de projet
  eventBus.on('project:created', async (event: unknown) => {
    const projectId = event.entityId || event.id;
    
    if (!projectId) {
      logger.warn('[MondayExportIntegration] Event project:created sans ID', {
        service: 'MondayExportIntegration',
        metadata: {
          operation: 'project:created',
          event

            });
      return;
    }

    return withErrorHandling(
    async () => {

      logger.info('[MondayExportIntegration] Auto-export projet démarré', {
        service: 'MondayExportIntegration',
        metadata: {
          operation: 'autoExportProject',
          projectId

            });

      const mondayId = await exportService.exportProject(projectId);
      
      // Émettre événement de succès
      eventBus.publish({
        type: 'monday:export:success',
        entity: 'project',
        entityId: projectId,
        severity: 'info',
        timestamp: new Date().toISOString(),
        payload: { mondayId });

      logger.info('[MondayExportIntegration] Auto-export projet réussi', {
        service: 'MondayExportIntegration',
        metadata: {
          operation: 'autoExportProject',
          projectId,
          mondayId

            });
    
    },
    {
      operation: 'setupMondayExport',
      service: 'export-integration',
      metadata: {}
    } );
    });

  // Auto-export sur création d'AO
  eventBus.on('ao:created', async (e: unknown)unknown) => {
    const aoId = event.entityId || event.id;
    
    if (!aoId) {
      logger.warn('[MondayExportIntegration] Event ao:created sans ID', {
        service: 'MondayExportIntegration',
        metadata: {
          operation: 'ao:created',
          event

            });
      return;
    }

    return withErrorHandling(
    async () => {

      logger.info('[MondayExportIntegration] Auto-export AO démarré', {
        service: 'MondayExportIntegration',
        metadata: {
          operation: 'autoExportAO',
          aoId

            });

      const mondayId = await exportService.exportAO(aoId);
      
      // Émettre événement de succès
      eventBus.publish({
        type: 'monday:export:success',
        entity: 'ao',
        entityId: aoId,
        severity: 'info',
        timestamp: new Date().toISOString(),
        payload: { mondayId });

      logger.info('[MondayExportIntegration] Auto-export AO réussi', {
        service: 'MondayExportIntegration',
        metadata: {
          operation: 'autoExportAO',
          aoId,
          mondayId

            });
    
    },
    {
      operation: 'setupMondayExport',
      service: 'export-integration',
      metadata: {}
    } );
    });

  logger.info('[MondayExportIntegration] Export automatique configuré avec succès', {
    service: 'MondayExportIntegration',
    metadata: {
      operation: 'setup',
      listenersCount: 2

        });
}
