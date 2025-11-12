/**
 * SavWorkflowService
 * Service de gestion du workflow SAV complet
 * 
 * Fonctionnalités :
 * - Créer demande SAV avec référence unique
 * - Commander matériel
 * - Planifier RDV
 * - Valider quitus
 */

import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError } from './utils/error-handler';
import type { IStorage } from '../storage-poc';
import type { EventBus } from '../eventBus';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import type { SavDemande, InsertSavDemande } from '@shared/schema';

export class SavWorkflowService {
  constructor(
    private storage: IStorage,
    private eventBus?: EventBus
  ) {}

  /**
   * Génère une référence unique pour une demande SAV
   * Format : SAV-YYYY-MM-XXXX
   */
  private generateReference(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `SAV-${year}-${month}-${random}`;
  }

  /**
   * Crée une nouvelle demande SAV
   */
  async createDemande(data: InsertSavDemande): Promise<SavDemande> {
    return withErrorHandling(
      async () => {
        // Validation métier : vérifier que le projet existe
        const project = await this.storage.getProject(data.projectId);
        if (!project) {
          throw new NotFoundError(`Project with id ${data.projectId} not found`);
        }

        // Générer référence unique
        const reference = this.generateReference();

        // Détecter si matériel nécessaire (analyse description simple)
        const materielNecessaire = this.detectMaterialNecessary(data.description);

        // Créer demande
        const demande = await this.storage.createSavDemande({
          ...data,
          reference,
          status: 'nouvelle' as const,
          materielNecessaire
        });

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
                id: crypto.randomUUID(),
            type: 'sav:demande:created' as unknown,
            entity: 'project',
            entityId: data.projectId,
            message: `Nouvelle demande SAV créée: ${reference}`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/sav/demandes']
            ],
                userId: data.createdBy || undefined,
            timestamp: new Date().toISOString(),
            metadata: {
              demandeId: demande.id,
              reference,
              demandeType: demande.demandeType
                    }
                  );
        }

        logger.info('Demande SAV créée', { metadata: {
            service: 'SavWorkflowService',
                  operation: 'createDemande',
            demandeId: demande.id,
            reference 
              
                }
 
              
            });
        return demande;
      },
      {
        service: 'SavWorkflowService',
        operation: 'createDemande'
      }
    );
  }

  /**
   * Détecte si matériel nécessaire depuis la description
   */
  private detectMaterialNecessary(description: string): boolean {
    const keywords = ['matériel', 'pièce', 'remplacement', 'cassé', 'défectueux', 'panne'];
    const lowerDesc = description.toLowerCase();
    return keywords.some(keyword => lowerDesc.includes(keyword));
  }

  /**
   * Commande matériel pour une demande
   */
  async commandeMateriel(
    demandeId: string, 
    materielId: string, 
    dateLivraisonPrevue: Date
  ): Promise<SavDemande> {
    return withErrorHandling(
      async () => {
        // Vérifier que la demande existe
        const demande = await this.storage.getSavDemande(demandeId);
        if (!demande) {
          throw new NotFoundError(`SAV demande with id ${demandeId} not found`);
        }

        // Mettre à jour demande
        const updated = await this.storage.updateSavDemande(demandeId, {
          materielId,
          dateLivraisonPrevue,
          status: 'materiel_commande' as const
        });

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
                  id: crypto.randomUUID(),
            type: 'sav:materiel:commanas unknown, unknown,
            entity: 'project',
            entityId: demande.projectId,
            message: `Matériel commandé pour ${demande.reference}`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/sav/demandes', demandeId]
            ],
                  userId: undefined,
            timestamp: new Date().toISOString(),
            metadata: {
              demandeId,
              materielId,
              dateLivraisonPrevue: dateLivraisonPrevue.toISOString()
                    }
                  );
        }

        return updated;
      },
      {
        service: 'SavWorkflowService',
        operation: 'commandeMateriel'
      }
    );
  }

  /**
   * Planifie un RDV pour une demande
   */
  async planifierRdv(demandeId: string, rdvDate: Date): Promise<SavDemande> {
    return withErrorHandling(
      async () => {
        // Vérifier que la demande existe
        const demande = await this.storage.getSavDemande(demandeId);
        if (!demande) {
          throw new NotFoundError(`SAV demande with id ${demandeId} not found`);
        }

        // Validation : vérifier matériel livré si nécessaire
        if (demande.materielNecessaire && !demande.dateLivraisonReelle) {
          throw new ValidationError('Matériel must be delivered before scheduling appointment');
        }

        // Mettre à jour demande
        const updated = await this.storage.updateSavDemande(demandeId, {
          rdvPlanifie: rdvDate,
          status: 'rdv_planifie' as const
        });

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
                      id: crypto.randomUUID(),
            type: 'sav:rdv:plas unknown, as unknown,
            entity: 'project',
            entityId: demande.projectId,
            message: `RDV planifié pour ${demande.reference}`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/sav/demandes', demandeId]
            ],
                      userId: undefined,
            timestamp: new Date().toISOString(),
            metadata: {
              demandeId,
              rdvDate: rdvDate.toISOString()
                    }
                  );
        }

        return updated;
      },
      {
        service: 'SavWorkflowService',
        operation: 'planifierRdv'
      }
    );
  }

  /**
   * Valide le quitus pour une demande
   */
  async validerQuitus(demandeId: string, quitusDate: Date): Promise<SavDemande> {
    return withErrorHandling(
      async () => {
        // Vérifier que la demande existe
        const demande = await this.storage.getSavDemande(demandeId);
        if (!demande) {
          throw new NotFoundError(`SAV demande with id ${demandeId} not found`);
        }

        // Validation : vérifier RDV effectué
        if (!demande.rdvEffectue) {
          throw new ValidationError('Appointment must be completed before validating quitus');
        }

        // Déterminer si réserves levées
        const reserveLevee = demande.demandeType === 'reserve';

        // Mettre à jour demande
        const updated = await this.storage.updateSavDemande(demandeId, {
          quitusRecu: true,
          quitusDate,
          reserveLevee,
          status: reserveLevee ? ('reserve_levee' as const) : ('quitus_recu' as const)
        });

        // Publier événement
        if (this.eventBus) {
          this.eventBus.publish({
                      id: crypto.randomUUID(),
            type: 'sav:quias unknown,ias unknown unknown,
            entity: 'project',
            entityId: demande.projectId,
            message: `Quitus validé pour ${demande.reference}`,
            severity: 'info',
            affectedQueryKeys: [
              ['/api/sav/demandes', demandeId]
            ],
                      userId: undefined,
            timestamp: new Date().toISOString(),
            metadata: {
              demandeId,
              quitusDate: quitusDate.toISOString(),
              reserveLevee
                    }
                  );
        }

        return updated;
      },
      {
        service: 'SavWorkflowService',
        operation: 'validerQuitus'
      }
    );
  }

// Export singleton instance
import { storage } from '../storage-poc';
import { eventBus } from '../eventBus';

export const savWorkflowService = new SavWorkflowService(storage, eventBus);

