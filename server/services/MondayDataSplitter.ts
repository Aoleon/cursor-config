import { mondayService } from './MondayService';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
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
    masterData: unknown,
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
    contactData: unknown): IndividualContactData {
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
    diagnostics: unknown[];
  }> {
    logger.info('Analyse Monday item pour opportunités éclatement', {
      metadata: {
        module: 'MondayDataSplitter', { mondayItemId, boardId 

          });

    const mondayItem = await mondayService.getItem(mondayItemId);

    const itemConfig = config || getBoardConfig(boardId);
    if (!itemConfig) {
      throw new AppError(`No configuration found for board ${boardId}`, 500);
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
   * @param mondayItemOrId - Monday item déjà fetché OU son ID (string)
   * @param boardId - ID du board Monday
   * @param storage - Storage pour persistence
   * @param config - Config de mapping (optionnel)
   * @param dryRun - Si true, rollback la transaction à la fin (ne sauvegarde pas en base, pour tests)
   */
  async splitItem(
    mondayItemOrId: string | unknown,
    boardId: string,
    storage: IStorage,
    config?: MondaySplitterConfig,
    dryRun: boolean = false
  ): Promise<SplitResult> {
    // Si c'est une string, c'est un ID → fetch l'item
    // Sinon c'est déjà un item Monday fetché → réutiliser
    const isId = typeof mondayItemOrId === 'string';
    const mondayItemId = isId ? mondayItemOrId : mondayItemOrId.id;
    
    logger.info('Démarrage éclatement Monday item', {
      metadata: {
        module: 'MondayDataSplitter', { mondayItemId, boardId, preFetched: !isId 

          });

    const mondayItem = isId 
      ? await mondayService.getItem(mondayItemOrId) 
      : mondayItemOrId;

    const itemConfig = config || getBoardConfig(boardId);
    if (!itemConfig) {
      throw new AppError(`No configuration found for board ${boardId}`, 500);
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

    return withErrorHandling(
    async () => {

      // WRAPPER TRANSACTION pour atomicité complète
      // Le rollback est automatique en cas d'erreur
      await storage.transaction(async (tx) => {
        // ÉTAPE 1 : Extraire et créer/récupérer l'AO de base
        logger.info('Étape 1: Extraction AO de base', {
      metadata: {
        module: 'MondayDataSplitter', { mondayItemId 

              });

        const aoData = await this.aoBaseExtractor.extract(context);
        context.extractedData.baseAO = aoData;

        // VALIDATION STRICTE: Bloquer AOs incomplets
        const requiredFields = {
          intituleOperation: aoData.intituleOperation,
          menuiserieType: aoData.menuiserieType,
          source: aoData.source
        };

        const missingRequiredFields = Object.entries(requiredFields)
          .filter(([_, value]) => !value || (typeof value === 'string' && value.trim() === ''))
          .map(([field]) => field);

        if (missingRequiredFields.length > 0) {
          const errorMsg = `AO incomplet rejeté - champs requis manquants: ${missingRequiredFields.join(', ')}`;
          logger.error(errorMsg, {
            service: 'MondayDataSplitter',
            metadata: {
              mondayItemId,
              missingFields: missingRequiredFields,
              extractedData: aoData

                });

          context.diagnostics.push({
            level: 'error',
            extractor: 'AOBaseExtractor',
            message: errorMsg,
            data: { missingFields: missingRequiredFields });

          result.success = false;
          result.diagnostics = context.diagnostics;
          throw new AppError(errorMsg, 500);
        }

        // Vérifier si un AO avec ce mondayItemId existe déjà
        const existingAO = await storage.getAOByMondayItemId(mondayItemId, tx);
        
        let currentAO: unknown;
        
        if (existingAO) {
          // AO existe déjà, on le met à jour avec les nouvelles données extraites
          // IMPORTANT: Filtrer les valeurs enum invalides (nombres au lieu de strings)
          const cleanedAoData = { ...aoData };
          
          // Supprimer tous les enums invalides (nombres au lieu de strings)
          if (typeof cleanedAoData.operationalStatus === 'number') {
            delete cleanedAoData.operationalStatus;
          }
          if (typeof cleanedAoData.priority === 'number') {
            delete cleanedAoData.priority;
          }
          if (typeof cleanedAoData.typeMarche === 'number') {
            delete cleanedAoData.typeMarche;
          }
          if (typeof cleanedAoData.aoCategory === 'number') {
            delete cleanedAoData.aoCategory;
          }
          
          const aoDataWithDefaults = {
                      reference: cleanedAoData.reference || existingAO.reference || `AO-MONDAY-${mondayItemId}`,
            menuiserieType: cleanedAoData.menuiserieType || existingAO.menuiserieType || 'autre' as const,
            source: cleanedAoData.source || existingAO.source || 'other' as const,
            mondayItemId, // IMPORTANT: Maintenir mondayItemId
            ...cleanedAoData, // Écraser avec les nouvelles données Monday (nettoyées)
            updatedAt: new Date(),
            mondayLastSyncedAt: new Date()
          };
          
          currentAO = await storage.updateAo(existingAO.id, aoDataWithDefaults, tx);
          result.aoId = existingAO.id;
          result.aoCreated = false;
          result.aoUpdated = true;
          
          logger.info('AO existant mis à jour depuis Monday', {
      metadata: {
        module: 'MondayDataSplitter', { 
                aoId: existingAO.id,
              mondayItemId,
                reference: currentAO.reference,
              client: aoDataWithDefaults.client,
              montant: aoDataWithDefaults.montantEstime

                });
          
          context.diagnostics.push({
            level: 'info',
            extractor: 'AOBaseExtractor',
            message: `AO déjà importé (mondayItemId=${mondayItemId}), mise à jour avec données Monday`,
            data: { aoId: existingAO.id, reference: currentAO.reference, updated: true });
        } else {
          // Créer un nouvel AO
          // IMPORTANT: Filtrer les valeurs enum invalides (nombres au lieu de strings)
          const cleanedAoData = { ...aoData };
          
          // Supprimer tous les enums invalides (nombres au lieu de strings)
          if (typeof cleanedAoData.operationalStatus === 'number') {
            delete cleanedAoData.operationalStatus;
          }
          if (typeof cleanedAoData.priority === 'number') {
            delete cleanedAoData.priority;
          }
          if (typeof cleanedAoData.typeMarche === 'number') {
            delete cleanedAoData.typeMarche;
          }
          if (typeof cleanedAoData.aoCategory === 'number') {
            delete cleanedAoData.aoCategory;
          }
          
          const aoDataWithDefaults = {
                reference: cleanedAoData.reference || `AO-MONDAY-${mondayItemId}`,
            menuiserieType: cleanedAoData.menuiserieType || 'autre' as const,
            source: cleanedAoData.source || 'other' as const,
            mondayItemId, // IMPORTANT: Ajouter mondayItemId pour traçabilité
            ...cleanedAoData,
          };

          currentAO = await storage.createAo(aoDataWithDefaults, tx);
          result.aoId = currentAO.id;
          result.aoCreated = true;

          logger.info('AO créé', {
      metadata: {
        module: 'MondayDataSplitter', { 
                aoId: currentAO.id,
              mondayItemId,
                reference: currentAO.reference

                });
              }

        // ÉTAPE 1.5: Extraire et PERSISTER maîtres ouvrage/œuvre avec findOrCreate
        logger.info('Étape 1.5: Extraction maîtres d\'ouvrage/œuvre', {
          service: 'MondayDataSplitter',
          metadata: { aoId: currentAO.id 

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

                  });
            
            if (linkResult.created) {
              result.mastersCreated++;
            }
          
    },
    {
      operation: 'constructor',
service: 'MondayDataSplitter',
      metadata: {       }
     });
        data: { error: error.stack });

      throw error;
    }

export const mondayDataSplitter = mondaydataService();
