/**
 * Monday Export Integration
 *
 * Enregistre des listeners sur l'EventBus pour exporter automatiquement les projets
 * et appels d'offres nouvellement créés vers Monday.com via le service dédié.
 */

import type { EventBus } from '../../eventBus';
import type { MondayDataService } from '../../services/consolidated/MondayDataService';
import { logger } from '../../utils/logger';

interface ExportEventPayload {
  entityId?: string;
  id?: string;
  [key: string]: unknown;
}

function extractEntityId(event: ExportEventPayload): string | null {
  return event.entityId ?? event.id ?? null;
}

async function exportEntity(
  exportService: MondayDataService,
  eventBus: EventBus,
  entity: 'project' | 'ao',
  entityId: string
): Promise<void> {
  try {
    logger.info('[MondayExport] démarrage export automatique', { metadata: { entity, entityId } });

    const mondayId = await exportService.exportToMonday(entity, entityId, { updateIfExists: true });

    eventBus.publish({
      type: 'monday:export:success',
      entity,
      entityId,
      severity: 'info',
      timestamp: new Date().toISOString(),
      payload: { mondayId },
    });

    logger.info('[MondayExport] export terminé avec succès', { metadata: { entity, entityId, mondayId } });
  } catch (error) {
    logger.error('[MondayExport] échec export automatique', { metadata: { entity, entityId, error } });
    eventBus.publish({
      type: 'monday:export:failure',
      entity,
      entityId,
      severity: 'error',
      timestamp: new Date().toISOString(),
      payload: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}

export function setupMondayExport(eventBus: EventBus, exportService: MondayDataService): void {
  logger.info('[MondayExport] configuration des listeners', {
    metadata: { listeners: ['project:created', 'ao:created'] },
  });

  eventBus.on('project:created', async (event: unknown) => {
    const projectId = extractEntityId(event as ExportEventPayload);
    if (!projectId) {
      logger.warn('[MondayExport] event project:created sans identifiant', { metadata: { event } });
      return;
    }
    await exportEntity(exportService, eventBus, 'project', projectId);
  });

  eventBus.on('ao:created', async (event: unknown) => {
    const aoId = extractEntityId(event as ExportEventPayload);
    if (!aoId) {
      logger.warn('[MondayExport] event ao:created sans identifiant', { metadata: { event } });
      return;
    }
    await exportEntity(exportService, eventBus, 'ao', aoId);
  });
}
