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
import type { ExtractedContactData, IndividualContactData } from '../contactService';

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
   * Helper pour mapper données master entity vers ExtractedContactData
   */
  private mapMasterToContactData(
    masterData: any,
    role: 'maitre_ouvrage' | 'maitre_oeuvre'
  ): ExtractedContactData {
    return {
      nom: masterData.raisonSociale || masterData.nom,
      typeOrganisation: masterData.typeOrganisation || undefined,
      adresse: masterData.adresse || undefined,
      codePostal: masterData.codePostal || undefined,
      ville: masterData.ville || undefined,
      departement: masterData.departement || undefined,
      telephone: masterData.telephone || undefined,
      email: masterData.email || undefined,
      siteWeb: masterData.siteWeb || undefined,
      siret: masterData.siret || undefined,
      role,
      source: 'ocr_extraction'
    };
  }

  /**
   * Mappe données contact depuis extracteur vers format IndividualContactData
   */
  private mapContactToIndividualData(
    contactData: any
  ): IndividualContactData {
    // Parser le nom complet en prénom/nom
    const fullName = contactData.name || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      firstName,
      lastName,
      email: contactData.email || undefined,
      phone: contactData.telephone || contactData.phone || undefined,
      company: contactData.company || contactData.entreprise || undefined,
      poste: contactData.poste || undefined,
      address: contactData.address || contactData.adresse || undefined,
      notes: contactData.notes || undefined,
      source: 'monday_import'
    };
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
   * Séquence : AO base → maîtres ouvrage/œuvre → contacts → lots → adresses
   * Utilise storage.transaction() pour garantir l'atomicité
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
      aoCreated: false,
      lotsCreated: 0,
      contactsCreated: 0,
      mastersCreated: 0,
      diagnostics: []
    };

    try {
      // WRAPPER TRANSACTION pour atomicité complète
      // Le rollback est automatique en cas d'erreur
      await storage.transaction(async (tx) => {
        // ÉTAPE 1 : Extraire et créer/récupérer l'AO de base
        logger.info('Étape 1: Extraction AO de base', {
          service: 'MondayDataSplitter',
          metadata: { mondayItemId }
        });

        const aoData = await this.aoBaseExtractor.extract(context);
        context.extractedData.baseAO = aoData;

        // Vérifier si un AO avec ce mondayItemId existe déjà
        const existingAO = await storage.getAOByMondayItemId(mondayItemId, tx);
        
        let currentAO: any;
        
        if (existingAO) {
          // AO existe déjà, on le réutilise
          currentAO = existingAO;
          result.aoId = existingAO.id;
          result.aoCreated = false;
          
          logger.info('AO existant réutilisé (import déjà effectué)', {
            service: 'MondayDataSplitter',
            metadata: { 
              aoId: existingAO.id, 
              mondayItemId,
              reference: existingAO.reference
            }
          });
          
          context.diagnostics.push({
            level: 'info',
            extractor: 'AOBaseExtractor',
            message: `AO déjà importé (mondayItemId=${mondayItemId}), réutilisation de l'AO existant`,
            data: { aoId: existingAO.id, reference: existingAO.reference }
          });
        } else {
          // Créer un nouvel AO
          const aoDataWithDefaults = {
            reference: aoData.reference || `AO-MONDAY-${mondayItemId}`,
            menuiserieType: aoData.menuiserieType || 'autre' as const,
            source: aoData.source || 'other' as const,
            mondayItemId, // IMPORTANT: Ajouter mondayItemId pour traçabilité
            ...aoData,
          };

          currentAO = await storage.createAo(aoDataWithDefaults, tx);
          result.aoId = currentAO.id;
          result.aoCreated = true;

          logger.info('AO créé', {
            service: 'MondayDataSplitter',
            metadata: { 
              aoId: currentAO.id, 
              mondayItemId,
              reference: currentAO.reference
            }
          });
        }

        // ÉTAPE 1.5: Extraire et PERSISTER maîtres ouvrage/œuvre avec findOrCreate
        logger.info('Étape 1.5: Extraction maîtres d\'ouvrage/œuvre', {
          service: 'MondayDataSplitter',
          metadata: { aoId: currentAO.id }
        });

        const masters = await this.masterEntityExtractor.extract(context);
        context.extractedData.maitresOuvrage = masters.maitresOuvrage;
        context.extractedData.maitresOeuvre = masters.maitresOeuvre;

        // Persister maîtres d'ouvrage
        for (const moaData of masters.maitresOuvrage) {
          try {
            const moaContactData = this.mapMasterToContactData(moaData, 'maitre_ouvrage');
            const linkResult = await storage.findOrCreateMaitreOuvrage(moaContactData, tx);
            
            logger.info('Maître d\'ouvrage traité', {
              service: 'MondayDataSplitter',
              metadata: {
                aoId: currentAO.id,
                nom: linkResult.contact.nom,
                id: linkResult.contact.id,
                created: linkResult.created,
                found: linkResult.found,
                confidence: linkResult.confidence
              }
            });
            
            if (linkResult.created) {
              result.mastersCreated++;
            }
          } catch (error: any) {
            context.diagnostics.push({
              level: 'error',
              extractor: 'MasterEntityExtractor',
              message: `Échec persistance maître d'ouvrage: ${error.message}`,
              data: { moaData, error: error.stack }
            });
          }
        }

        // Persister maîtres d'œuvre
        for (const moeData of masters.maitresOeuvre) {
          try {
            const moeContactData = this.mapMasterToContactData(moeData, 'maitre_oeuvre');
            const linkResult = await storage.findOrCreateMaitreOeuvre(moeContactData, tx);
            
            logger.info('Maître d\'œuvre traité', {
              service: 'MondayDataSplitter',
              metadata: {
                aoId: currentAO.id,
                nom: linkResult.contact.nom,
                id: linkResult.contact.id,
                created: linkResult.created,
                found: linkResult.found,
                confidence: linkResult.confidence
              }
            });
            
            if (linkResult.created) {
              result.mastersCreated++;
            }
          } catch (error: any) {
            context.diagnostics.push({
              level: 'error',
              extractor: 'MasterEntityExtractor',
              message: `Échec persistance maître d'œuvre: ${error.message}`,
              data: { moeData, error: error.stack }
            });
          }
        }

        // ÉTAPE 2: Extraire et PERSISTER contacts individuels avec déduplication
        const contacts = await this.contactExtractor.extract(context);
        context.extractedData.contacts = contacts;

        logger.info('Extraction contacts', {
          service: 'MondayDataSplitter',
          metadata: {
            aoId: currentAO.id,
            contactsFound: contacts.length
          }
        });

        for (const contactData of contacts) {
          try {
            // Mapper vers IndividualContactData
            const individualData = this.mapContactToIndividualData(contactData);
            
            // Déduplication via storage.findOrCreateContact
            const contactResult = await storage.findOrCreateContact(individualData, tx);
            
            // Linker à l'AO via aoContacts
            const linkType = contactData.linkType || 'contact_general';
            const link = await storage.linkAoContact({
              aoId: currentAO.id,
              contactId: contactResult.contact.id,
              linkType
            }, tx);
            
            logger.info('Contact traité', {
              service: 'MondayDataSplitter',
              metadata: {
                aoId: currentAO.id,
                contactId: contactResult.contact.id,
                firstName: contactResult.contact.firstName,
                lastName: contactResult.contact.lastName,
                email: contactResult.contact.email,
                created: contactResult.created,
                found: contactResult.found,
                confidence: contactResult.confidence,
                linkType,
                linkCreated: link !== null
              }
            });
            
            // Incrémenter compteur seulement si CRÉÉ (pas réutilisé)
            if (contactResult.created) {
              result.contactsCreated++;
            }
            
          } catch (error: any) {
            context.diagnostics.push({
              level: 'error',
              extractor: 'ContactExtractor',
              message: `Échec persistance contact: ${error.message}`,
              data: { contactData, error: error.stack }
            });
          }
        }

        logger.info('Contacts traités', {
          service: 'MondayDataSplitter',
          metadata: {
            aoId: currentAO.id,
            totalContacts: contacts.length,
            contactsCreated: result.contactsCreated
          }
        });

        // ÉTAPE 3: Extraction lots
        logger.info('Étape 3: Extraction lots', {
          service: 'MondayDataSplitter',
          metadata: { aoId: currentAO.id }
        });

        const lots = await this.lotExtractor.extract(context);
        context.extractedData.lots = lots;

        for (const lotData of lots) {
          try {
            const lot = await storage.createAoLot({
              ...lotData,
              aoId: currentAO.id
            }, tx);
            result.lotsCreated++;

            logger.info('Lot créé', {
              service: 'MondayDataSplitter',
              metadata: { lotId: lot.id, aoId: currentAO.id }
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

        // ÉTAPE 4: Extraction adresse
        logger.info('Étape 4: Extraction adresse', {
          service: 'MondayDataSplitter',
          metadata: { aoId: currentAO.id }
        });

        const addressData = await this.addressExtractor.extract(context);
        context.extractedData.addresses = addressData ? [addressData] : [];

        if (addressData) {
          logger.info('Adresse extraite (non persistée pour l\'instant)', {
            service: 'MondayDataSplitter',
            metadata: { aoId: currentAO.id, addressData }
          });
        }
      }, {
        retries: 3,
        timeout: 30000,
        isolationLevel: 'read committed'
      });

      // Succès - transaction committée
      result.success = true;
      result.diagnostics = context.diagnostics;

      logger.info('Éclatement Monday terminé avec succès', {
        service: 'MondayDataSplitter',
        metadata: {
          aoId: result.aoId,
          lotsCreated: result.lotsCreated,
          contactsCreated: result.contactsCreated,
          mastersCreated: result.mastersCreated
        }
      });

      return result;

    } catch (error: any) {
      // Erreur - transaction automatiquement rollbackée par storage.transaction()
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
