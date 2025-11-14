/**
 * BeQualityChecklistService
 * Service de gestion de la checklist qualité BE
 * 
 * Fonctionnalités :
 * - Initialiser checklist pour une offre
 * - Cocher/décocher items
 * - Valider checklist complète
 * - Vérifier si "Fin d'études" peut être validé
 */

import { withErrorHandling } from '../utils/error-handler';
import { AppError, NotFoundError, ValidationError } from '../utils/error-handler';
import type { IStorage } from '../storage-poc';
import type { EventBus } from '../eventBus';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import type { BeQualityChecklistItem, InsertBeQualityChecklistItem } from '@shared/schema';

// Items critiques par défaut
const CRITICAL_ITEMS = [
  'nuancier',
  'grilles',
  'plans_complets',
  'couleur_produit',
  'quantitatif',
  'prix_fournisseurs',
  'dpgf_genere'
] as const;

export class BeQualityChecklistService {
  constructor(
    private storage: IStorage,
    private eventBus?: EventBus
  ) {}

  /**
   * Initialise la checklist qualité pour une offre
   */
  async initializeChecklist(offerId: string): Promise<BeQualityChecklistItem[]> {
    return withErrorHandling(
      async () => {
        // Vérifier que l'offre existe
        const offer = await this.storage.getOffer(offerId);
        if (!offer) {
          throw new NotFoundError(`Offer with id ${offerId} not found`);
        }

        // Vérifier si checklist existe déjà
        const existing = await this.storage.getBeQualityChecklist(offerId);
        if (existing.length > 0) {
          logger.info('Checklist déjà initialisée', {
            metadata: {
              service: 'BeQualityChecklistService',
              operation: 'initializeChecklist',
              offerId
            }
          });
          return existing;
        }

        // Créer items critiques
        const items: BeQualityChecklistItem[] = [];
        for (const itemType of CRITICAL_ITEMS) {
          const item = await this.storage.createBeQualityChecklistItem({
            offerId,
            itemType: itemType as unknown,
            isCritical: true,
                      status: 'non_controle' as const
          });
          items.push(item);
        }

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
            id: crypto.randomUUID(),
            type: 'be:checklist:initialized',
            entity: 'offer',
            entityId: offerId,
            message: `Checklist qualité BE initialisée pour offre ${offer.reference}`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/offers', offerId, 'be-checklist']
            ],
            userId: undefined,
            timestamp: new Date().toISOString(),
            metadata: {
              offerId,
              itemsCount: items.length
            }
          });
        }

        logger.info('Checklist qualité BE initialisée', {
          metadata: {
            service: 'BeQualityChecklistService',
            operation: 'initializeChecklist',
            offerId,
            itemsCount: items.length
          }
        });

        return items;
      },
      {
        service: 'BeQualityChecklistService',
        operation: 'initializeChecklist'
      }
    );
  }

  /**
   * Met à jour un item de la checklist
   */
  async checkItem(
    itemId: string, 
    status: 'conforme' | 'non_conforme',
    notes?: string,
    checkedBy?: string
  ): Promise<BeQualityChecklistItem> {
    return withErrorHandling(
      async () => {
        // Récupérer l'item (via la liste complète de l'offre)
        // Note: On devrait avoir getBeQualityChecklistItemById, mais pour l'instant on utilise update
        const updated = await this.storage.updateBeQualityChecklistItem(itemId, {
          status,
          notes,
          checkedBy,
          checkedAt: new Date()
        });

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
            id: crypto.randomUUID(),
            type: 'be:checklist:item:checked',
            entity: 'offer',
            entityId: updated.offerId,
            message: `Item checklist ${updated.itemType} marqué comme ${status}`,
            severity: status === 'non_conforme' ? 'warning' : 'info',
            affectedQueryKeys: [
              ['/api/offers', updated.offerId, 'be-checklist']
            ],
            userId: checkedBy,
            timestamp: new Date().toISOString(),
            metadata: {
              itemId,
              itemType: updated.itemType,
              status
            }
          });
        }

        return updated;
      },
      {
        service: 'BeQualityChecklistService',
        operation: 'checkItem'
      }
    );
  }

  /**
   * Valide la checklist complète
   */
  async validateChecklist(offerId: string): Promise<{ isValid: boolean; missingItems: string[] }> {
    return withErrorHandling(
      async () => {
        const result = await this.storage.validateBeQualityChecklist(offerId);
        
        if (result.isValid && this.eventBus) {
          this.eventBus.publish({
            id: crypto.randomUUID(),
            type: 'be:checklist:validated',
            entity: 'offer',
            entityId: offerId,
            message: `Checklist qualité BE validée pour offre`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/offers', offerId, 'be-checklist']
            ],
            userId: undefined,
            timestamp: new Date().toISOString(),
            metadata: {
              offerId
            }
          });
        }

        return result;
      },
      {
        service: 'BeQualityChecklistService',
        operation: 'validateChecklist'
      }
    );
  }

  /**
   * Vérifie si "Fin d'études" peut être validé
   */
  async canValidateFinEtudes(offerId: string): Promise<{ canValidate: boolean; reason?: string }> {
    return withErrorHandling(
      async () => {
        // Vérifier que l'offre existe
        const offer = await this.storage.getOffer(offerId);
        if (!offer) {
          throw new NotFoundError(`Offer with id ${offerId} not found`);
        }

        // Valider checklist
        const validation = await this.validateChecklist(offerId);
        
        if (!validation.isValid) {
          return {
            canValidate: false,
            reason: `Items critiques manquants: ${validation.missingItems.join(', ')}`
          };
        }

        return { canValidate: true };
      },
      {
        service: 'BeQualityChecklistService',
        operation: 'canValidateFinEtudes'
      }
    );
  }
}

// Export singleton instance
import { storage } from '../storage-poc';
import { eventBus } from '../eventBus';

export const beQualityChecklistService = new BeQualityChecklistService(storage, eventBus);

