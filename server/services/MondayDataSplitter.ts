import { mondayService } from './MondayService';
import { 
  AOBaseExtractor, 
  LotExtractor, 
  ContactExtractor, 
  AddressExtractor,
  MasterEntityExtractor
} from './monday/extractors';
import type { 
  SplitterContext, 
  SplitResult, 
  MondaySplitterConfig 
} from './monday/types';
import { getBoardConfig } from './monday/defaultMappings';
import { logger } from '../utils/logger';
import type { IStorage } from '../storage-poc';

export class MondayDataSplitter {
  private aoBaseExtractor: AOBaseExtractor;
  private lotExtractor: LotExtractor;
  private contactExtractor: ContactExtractor;
  private addressExtractor: AddressExtractor;
  private masterEntityExtractor: MasterEntityExtractor;

  constructor() {
    this.aoBaseExtractor = new AOBaseExtractor();
    this.lotExtractor = new LotExtractor();
    this.contactExtractor = new ContactExtractor();
    this.addressExtractor = new AddressExtractor();
    this.masterEntityExtractor = new MasterEntityExtractor();
  }

  /**
   * Analyse un item Monday pour identifier les opportunités d'éclatement
   * (pour l'endpoint /api/monday/boards/:id/analyze)
   */
  async analyzeItem(
    mondayItemId: string,
    boardId: string,
    config?: MondaySplitterConfig
  ): Promise<{
    opportunites: {
      lots: number;
      contacts: number;
      addresses: boolean;
      maitresOuvrage: number;
      maitresOeuvre: number;
    };
    diagnostics: any[];
  }> {
    logger.info('Analyse Monday item pour opportunités éclatement', {
      service: 'MondayDataSplitter',
      metadata: { mondayItemId, boardId }
    });

    const mondayItem = await mondayService.getItem(mondayItemId);

    const itemConfig = config || getBoardConfig(boardId);
    if (!itemConfig) {
      throw new Error(`No configuration found for board ${boardId}`);
    }

    const context: SplitterContext = {
      mondayItem,
      config: itemConfig,
      extractedData: {},
      diagnostics: []
    };

    const lots = await this.lotExtractor.extract(context);
    const contacts = await this.contactExtractor.extract(context);
    const address = await this.addressExtractor.extract(context);
    const masters = await this.masterEntityExtractor.extract(context);

    return {
      opportunites: {
        lots: lots.length,
        contacts: contacts.length,
        addresses: address !== null,
        maitresOuvrage: masters.maitresOuvrage.length,
        maitresOeuvre: masters.maitresOeuvre.length
      },
      diagnostics: context.diagnostics
    };
  }

  /**
   * Éclate un item Monday vers multiples entités Saxium
   * Séquence : AO base → contacts → lots → adresses
   */
  async splitItem(
    mondayItemId: string,
    boardId: string,
    storage: IStorage,
    config?: MondaySplitterConfig
  ): Promise<SplitResult> {
    logger.info('Démarrage éclatement Monday item', {
      service: 'MondayDataSplitter',
      metadata: { mondayItemId, boardId }
    });

    const mondayItem = await mondayService.getItem(mondayItemId);

    const itemConfig = config || getBoardConfig(boardId);
    if (!itemConfig) {
      throw new Error(`No configuration found for board ${boardId}`);
    }

    const context: SplitterContext = {
      mondayItem,
      config: itemConfig,
      extractedData: {},
      diagnostics: []
    };

    const result: SplitResult = {
      success: false,
      lotsCreated: 0,
      contactsCreated: 0,
      mastersCreated: 0,
      diagnostics: []
    };

    try {
      // NOTE: Rollback atomique via compensating deletes
      // Une vraie transaction sera préférable une fois que storage.transaction() existe (tâche 4)
      let aoCreated = false;
      let createdAO: any = null;

      try {
        // ÉTAPE 1 : Extraire et créer l'AO de base
        logger.info('Étape 1: Extraction AO de base', {
          service: 'MondayDataSplitter',
          metadata: { mondayItemId }
        });

        const aoData = await this.aoBaseExtractor.extract(context);
        context.extractedData.baseAO = aoData;

        const aoDataWithDefaults = {
          reference: aoData.reference || `AO-MONDAY-${mondayItemId}`,
          menuiserieType: aoData.menuiserieType || 'autre' as const,
          source: aoData.source || 'other' as const,
          ...aoData,
        };

        // Créer l'AO dans la DB
        createdAO = await storage.createAo(aoDataWithDefaults);
        aoCreated = true; // Marquer comme créé pour rollback potentiel
        result.aoId = createdAO.id;

        logger.info('AO créé', {
          service: 'MondayDataSplitter',
          metadata: { aoId: createdAO.id, mondayItemId }
        });

      logger.info('Étape 1.5: Extraction maîtres d\'ouvrage/œuvre', {
        service: 'MondayDataSplitter',
        metadata: { aoId: createdAO.id }
      });

      const masters = await this.masterEntityExtractor.extract(context);
      context.extractedData.maitresOuvrage = masters.maitresOuvrage;
      context.extractedData.maitresOeuvre = masters.maitresOeuvre;

      // Extraire les maîtres d'ouvrage (persistance TODO tâche 4)
      for (const moaData of masters.maitresOuvrage) {
        logger.info('Maître d\'ouvrage extrait (persistance en attente - tâche 4)', {
          service: 'MondayDataSplitter',
          metadata: { aoId: createdAO.id, moaData }
        });
        // NOTE: mastersCreated ne sera incrémenté qu'une fois la persistance implémentée (tâche 4)
      }

      // Extraire les maîtres d'œuvre (persistance TODO tâche 4)
      for (const moeData of masters.maitresOeuvre) {
        logger.info('Maître d\'œuvre extrait (persistance en attente - tâche 4)', {
          service: 'MondayDataSplitter',
          metadata: { aoId: createdAO.id, moeData }
        });
        // NOTE: mastersCreated ne sera incrémenté qu'une fois la persistance implémentée (tâche 4)
      }

      logger.info('Étape 2: Extraction contacts', {
        service: 'MondayDataSplitter',
        metadata: { aoId: createdAO.id }
      });

      const contacts = await this.contactExtractor.extract(context);
      context.extractedData.contacts = contacts;

      for (const contactData of contacts) {
        try {
          const contact = await storage.createAoContact({
            ...contactData,
            aoId: createdAO.id
          });
          result.contactsCreated++;

          logger.info('Contact créé', {
            service: 'MondayDataSplitter',
            metadata: { contactId: contact.id, aoId: createdAO.id }
          });
        } catch (error: any) {
          context.diagnostics.push({
            level: 'warning',
            extractor: 'ContactExtractor',
            message: `Failed to create contact: ${error.message}`,
            data: { contactData }
          });
        }
      }

      logger.info('Étape 3: Extraction lots', {
        service: 'MondayDataSplitter',
        metadata: { aoId: createdAO.id }
      });

      const lots = await this.lotExtractor.extract(context);
      context.extractedData.lots = lots;

      for (const lotData of lots) {
        try {
          const lot = await storage.createAoLot({
            ...lotData,
            aoId: createdAO.id
          });
          result.lotsCreated++;

          logger.info('Lot créé', {
            service: 'MondayDataSplitter',
            metadata: { lotId: lot.id, aoId: createdAO.id }
          });
        } catch (error: any) {
          context.diagnostics.push({
            level: 'warning',
            extractor: 'LotExtractor',
            message: `Failed to create lot: ${error.message}`,
            data: { lotData }
          });
        }
      }

      logger.info('Étape 4: Extraction adresse', {
        service: 'MondayDataSplitter',
        metadata: { aoId: createdAO.id }
      });

      const addressData = await this.addressExtractor.extract(context);
      context.extractedData.addresses = addressData ? [addressData] : [];

      if (addressData) {
        logger.info('Adresse extraite (non persistée pour l\'instant)', {
          service: 'MondayDataSplitter',
          metadata: { aoId: createdAO.id, addressData }
        });
      }

        // Succès - commit
        result.success = true;
        result.diagnostics = context.diagnostics;

        logger.info('Éclatement Monday terminé avec succès', {
          service: 'MondayDataSplitter',
          metadata: {
            aoId: createdAO.id,
            lotsCreated: result.lotsCreated,
            contactsCreated: result.contactsCreated,
            mastersCreated: result.mastersCreated
          }
        });

        return result;

      } catch (innerError: any) {
        // ROLLBACK ATOMIQUE via compensating delete
        // Note: La suppression de l'AO déclenche les cascades FK (onDelete: "cascade")
        // définies dans shared/schema.ts qui suppriment automatiquement :
        // - aoContacts (aoContacts.aoId references aos.id, { onDelete: "cascade" })
        // - aoLots (aoLots.aoId references aos.id, { onDelete: "cascade" })
        // - aoDocuments, aoAnalyses, etc.
        // Donc aucun enregistrement orphelin ne subsiste.
        
        if (aoCreated && createdAO?.id) {
          logger.warn('Rollback: suppression AO + enfants (via FK cascade)', {
            service: 'MondayDataSplitter',
            metadata: { 
              aoId: createdAO.id, 
              error: innerError.message,
              cascadeDelete: 'aoContacts, aoLots, aoDocuments auto-supprimés via FK'
            }
          });

          try {
            await storage.deleteAo(createdAO.id);
            logger.info('Rollback AO réussi (enfants supprimés via cascade FK)', {
              service: 'MondayDataSplitter',
              metadata: { aoId: createdAO.id }
            });
          } catch (deleteError: any) {
            logger.error('Erreur rollback AO', {
              service: 'MondayDataSplitter',
              metadata: { aoId: createdAO.id, error: deleteError.message }
            });
          }
        }

        throw innerError; // Re-throw pour propagation
      }

    } catch (error: any) {
      logger.error('Erreur lors de l\'éclatement Monday', {
        service: 'MondayDataSplitter',
        metadata: { mondayItemId, boardId, error: error.message }
      });

      result.success = false;
      result.diagnostics = context.diagnostics;
      result.diagnostics.push({
        level: 'error',
        extractor: 'MondayDataSplitter',
        message: `Échec éclatement: ${error.message}`,
        data: { error: error.stack }
      });

      throw error;
    }
  }
}

export const mondayDataSplitter = new MondayDataSplitter();
