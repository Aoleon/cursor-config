import { createWorker } from 'tesseract.js';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import sharp from 'sharp';
// Types pdf-parse importés depuis le fichier de déclaration
import type pdfParse from 'pdf-parse';
// Import du service de scoring technique
import { ScoringService } from './services/scoringService';
import type { TechnicalScoringResult, SpecialCriteria, ColorSpec, MaterialSpec, MaterialColorAlertRule } from '@shared/schema';
// Import EventBus pour les alertes techniques
import { eventBus } from './eventBus';
// Import storage pour charger la configuration utilisateur
import { storage } from './storage-poc';
// Import du moteur OCR contextuel pour amélioration intelligente
import { contextualOCREngine, type ContextualOCRResult } from './services/ContextualOCREngine';
// Import de la base de connaissance métier centralisée
import { 
  MATERIAL_PATTERNS, 
  COLOR_PATTERNS, 
  AO_PATTERNS, 
  LINE_ITEM_PATTERNS 
} from './services/MenuiserieKnowledgeBase';
// Import du logger structuré
import { logger } from './utils/logger';
// Imports des types pour le contexte OCR
import type { 
  AOFieldsExtracted, 
  SupplierQuoteFields, 
  SupplierQuoteLineItem,
  AOLot,
  FieldMappingResult, 
  ValidationError, 
  FieldCorrection 
} from '@shared/schema';

// Imports dynamiques pour éviter les erreurs d'initialisation
let pdfParseModule: typeof pdfParse | null = null;
let isInitializingPdfParse = false;

// Initialisation dynamique des modules avec protection contre les race conditions
const initializeModules = async (): Promise<void> => {
  if (pdfParseModule) {
    return; // Déjà initialisé
  }
  
  if (isInitializingPdfParse) {
    // Attendre que l'initialisation en cours se termine
    while (isInitializingPdfParse && !pdfParseModule) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return;
  }
  
  try {
    isInitializingPdfParse = true;
    logger.info('Initialisation module pdf-parse', {
      metadata: {
        service: 'OCRService',
        operation: 'initializeModules'
      }
    });
    
    // Import spécial pour éviter les problèmes de fichiers de test
    const pdfParseImport = await import('pdf-parse');
    pdfParseModule = pdfParseImport.default || pdfParseImport;
    
    // Test simple pour vérifier que le module fonctionne
    if (typeof pdfParseModule !== 'function') {
      throw new AppError('pdf-parse module not properly imported', 500);
    }
    
    logger.info('Module pdf-parse initialisé avec succès', {
      metadata: {
        service: 'OCRService',
        operation: 'initializeModules'
      }
    });
    isInitializingPdfParse = false;
  } catch (error) {
    isInitializingPdfParse = false;
    logger.info('Tentative initialisation fallback pdf-parse', {
      metadata: {
        service: 'OCRService',
        operation: 'initializeModules'
      }
    });
    
    try {
      // Fallback: essayer d'importer différemment
      const { default: pdfParse } = await import('pdf-parse');
      pdfParseModule = pdfParse;
      logger.info('Initialisation fallback pdf-parse réussie', {
        metadata: {
          service: 'OCRService',
          operation: 'initializeModules'
        }
      });
    } catch (fallbackError) {
      // Ne pas lever d'erreur ici, continuer avec OCR uniquement
      pdfParseModule = null;
      logger.info('Continuation avec traitement OCR uniquement', {
        metadata: {
          service: 'OCRService',
          operation: 'initializeModules',
          error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        }
      });
    }
  }
};

interface OCRResult {
  extractedText: string;
  confidence: number;
  processedFields: AOFieldsExtracted;
  technicalScoring?: TechnicalScoringResult; // Résultat du scoring technique
  contextualResult?: ContextualOCRResult; // Résultat du moteur contextuel
  rawData: any;
}

// ========================================
// INTERFACE POUR ANALYSE DEVIS FOURNISSEURS
// ========================================

export interface SupplierQuoteOCRResult {
  extractedText: string;
  confidence: number;
  processedFields: SupplierQuoteFields;
  qualityScore: number;
  completenessScore: number;
  contextualResult?: ContextualOCRResult; // Résultat du moteur contextuel
  rawData: any;
}





// REMARQUE: Les patterns d'extraction (AO_PATTERNS, MATERIAL_PATTERNS, COLOR_PATTERNS, LINE_ITEM_PATTERNS)
// sont maintenant centralisés dans server/services/MenuiserieKnowledgeBase.ts
// Ils sont importés en haut de ce fichier pour une source unique de vérité

// Patterns additionnels pour extraction AO étendus (non couverts par la base centralisée)
const AO_EXTENDED_PATTERNS: Record<string, RegExp[]> = {
  // Localisation
  location: [
    /(?:lieu|localisation|adresse|site)\s*:?\s*([^\n]+)/i,
    /(?:travaux à|réalisation à|sis)\s*([^\n]+)/i,
  ],
  
  // Type de marché
  typeMarche: [
    /(?:marché public|procédure publique|ao public)/i,
    /(?:marché privé|procédure privée|ao privé)/i,
    /(?:procédure adaptée|mapa)/i,
    /(?:marché négocié)/i,
  ],
  
  // Menuiserie spécifique
  menuiserie: [
    /(?:fenêtres?|menuiseries? extérieures?)/i,
    /(?:portes?|menuiseries? intérieures?)/i,
    /(?:volets?|fermetures?)/i,
    /(?:portails?|clôtures?)/i,
    /(?:cloisons?|aménagements?)/i,
    /(?:verrières?|baies? vitrées?)/i,
  ],
  
  // Départements prioritaires JLM (50 et 62)
  departement: [
    /(?:50|manche|saint-lô|cherbourg)/i,
    /(?:62|pas-de-calais|arras|calais|boulogne)/i,
  ],
  
  // Bureaux d'études
  bureauEtudes: [
    /(?:bureau d'études?|be|maître d'œuvre|moe)\s*:?\s*([^\n]+)/i,
  ],
  
  // Lots (détection des sections de lots)
  lots: [
    /(?:lots?\s+concernés?|lots?\s*:)/i,
    /(?:lot\s+n?°?\s*\d+[\.\s:])/i,
    /(?:\d{1,2}[a-z]?\s*[:\-])/i,
  ],
  
  // Critères techniques spéciaux JLM
  batiment_passif: [
    /(b[âa]timent|maison|construction|logement)\s+(passif\w*|à\s+énergie\s+positive)/i,
    /passiv.?haus/i,
    /(?:norme|standard|label)\s+passif/i,
    /(?:bbc|bepos|effinergie)\s*\+?/i,
    /consommation\s+énergétique\s+très\s+faible/i,
    /performance\s+énergétique\s+exceptionnelle/i,
  ],

  isolation_renforcee: [
    /isolation\s+(thermiq\w*\s+)?(renforc\w*|performante|haute\s+performance)/i,
    /performances?\s+thermiq\w*\s+(renforc\w*|élevées?|optimisées?)/i,
    /haute\s+performance\s+(thermique|énergétique)/i,
    /(?:rt|re)\s*20(1[0-9]|2[0-9])/i,
    /coefficient\s+de\s+transmission\s+thermique\s*[<≤]?\s*[0-9.,]+/i,
    /(?:uw|up)\s*[≤<]?\s*[0-9.,]+\s*w\/(m[²2]\.k)/i,
    /triple\s+vitrage/i,
    /isolation\s+(extérieure|par\s+l'extérieur)/i,
  ],

  precadres: [
    /pr[ée][-\s]?cadres?/i,
    /pré[-\s]?cadre/i,
    /cadres?\s+(d['']attente|de\s+réservation)/i,
    /réservations?\s+maçonnerie/i,
    /cadres?\s+dormants?\s+d['']attente/i,
  ],

  volets_exterieurs: [
    /volets?\s+(ext[ée]rieurs?|roulants?|battants?)/i,
    /fermetures?\s+(extérieures?|de\s+sécurité)/i,
    /brise[-\s]?soleil\s+(orientables?|\bBSO\b)/i,
    /persiennes?\s+(orientables?|roulantes?)/i,
    /stores?\s+(ext[ée]rieurs?|bannes?)/i,
    /protection\s+solaire\s+extérieure/i,
  ],

  coupe_feu: [
    /coupe[-\s]?feu/i,
    /\b(EI|EW)\s*\d{2,3}\b/i,
    /pare[-\s]?flammes?/i,
    /résistance?\s+au\s+feu\s*:?\s*\d+\s*(min|minutes?|h|heures?)/i,
    /classement\s+feu\s*:?\s*\w+/i,
    /ignifugé/i,
    /protection\s+incendie/i,
  ],

  criteres_aev: [
    /\bAEV\s*:?\s*\w*\d+/i,
    /perméabilité\s+à\s+l['']air\s*:?\s*\w*[0-9]/i,
    /étanchéité\s+(à\s+l['']air|à\s+l['']eau|au\s+vent)/i,
    /classe\s*AEV\s*:?\s*\w*\d+/i,
    /test\s+d['']étanchéité/i,
  ],

  menuiserie_specifique: [
    /menuiseries?\s+(aluminium|alu|PVC|bois|mixte)/i,
    /châssis\s+(fixes?|ouvrants?|oscillants?|coulissants?)/i,
    /ouvertures?\s+(à\s+la\s+française|oscillo[-\s]?battantes?|coulissantes?)/i,
    /quincaillerie\s+(de\s+sécurité|anti[-\s]?effraction)/i,
    /double\s+ou\s+triple\s+vitrage/i,
    /gaz\s+argon/i,
  ],

  accessibilite: [
    /accessibilité\s+PMR/i,
    /personnes?\s+à\s+mobilité\s+réduite/i,
    /largeur\s+de\s+passage\s*[≥>]?\s*[0-9]+\s*cm/i,
    /seuil\s+(encastré|affleurant)/i,
    /poignées?\s+ergonomiques?/i,
  ],
};

// Patterns pour devis fournisseurs (spécifiques, non couverts par la base centralisée)
const SUPPLIER_QUOTE_PATTERNS: Record<string, RegExp[]> = {
  // Informations fournisseur
  supplierName: [
    /(?:raison sociale|société|entreprise)\s*:?\s*([^\n]+)/i,
    /^([A-Z][A-Z\s&-]+(?:SA|SARL|SAS|EURL)?)/m,
  ],
  
  supplierAddress: [
    /(?:adresse|siège social)\s*:?\s*([^\n]+(?:\n[^:\n]*)*)/i,
    /\d+[,\s]+(?:rue|avenue|boulevard|place)[^\n]+\n?\d{5}\s+[^\n]+/i,
  ],
  
  supplierContact: [
    /(?:contact|interlocuteur|responsable)\s*:?\s*([^\n]+)/i,
    /(?:M\.|Mme|Monsieur|Madame)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/i,
  ],
  
  supplierEmail: [
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
  ],
  
  supplierPhone: [
    /(?:tél|téléphone|portable|mobile)\s*:?\s*([0-9\s\.\-\+]{10,})/i,
    /((?:0[1-9]|(?:\+33\s?)?[1-9])(?:[\s\-\.]?\d{2}){4})/g,
  ],
  
  supplierSiret: [
    /(?:siret|siren)\s*:?\s*(\d{14}|\d{9})/i,
  ],
  
  // Référence et dates
  quoteReference: [
    /(?:devis|référence|n°|numéro)\s*:?\s*([A-Z0-9\-_\/]+)/i,
    /(?:quote|ref)\s*:?\s*([A-Z0-9\-_\/]+)/i,
  ],
  
  quoteDate: [
    /(?:date du devis|établi le|le)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
  ],
  
  validityDate: [
    /(?:valable jusqu'au|validité|expire le)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ],
  
  validityPeriod: [
    /(?:valable|validité)\s+(\d+)\s*(?:jours?|mois?)/i,
  ],
  
  // Montants financiers
  totalAmountHT: [
    /(?:total ht|sous-total|montant ht)\s*:?\s*([\d\s,\.]+)\s*€?/i,
    /(\d+(?:[\s,]\d{3})*(?:[,\.]\d{2})?)\s*€\s*(?:ht|hors)/i,
  ],
  
  totalAmountTTC: [
    /(?:total ttc|montant ttc|total)\s*:?\s*([\d\s,\.]+)\s*€?/i,
    /(\d+(?:[\s,]\d{3})*(?:[,\.]\d{2})?)\s*€\s*(?:ttc|toutes)/i,
  ],
  
  vatRate: [
    /(?:tva|taxe)\s*:?\s*(\d+(?:[,\.]\d+)?)\s*%/i,
    /(\d+(?:[,\.]\d+)?)\s*%\s*(?:tva|taxe)/i,
  ],
  
  // Délais
  deliveryDelay: [
    /(?:délai|livraison|fourniture)\s*:?\s*(\d+)\s*(?:jours?|semaines?|mois?)/i,
    /(?:sous|dans)\s+(\d+)\s*(?:jours?|semaines?|mois?)/i,
  ],
  
  productionDelay: [
    /(?:fabrication|production)\s*:?\s*(\d+)\s*(?:jours?|semaines?)/i,
  ],
  
  // Conditions commerciales
  paymentTerms: [
    /(?:paiement|règlement)\s*:?\s*([^\n]+)/i,
    /(\d+)\s*(?:jours?|%)\s*(?:net|comptant|à réception)/i,
  ],
  
  paymentDelay: [
    /(\d+)\s*jours?\s*(?:net|fin de mois)/i,
  ],
  
  warranty: [
    /(?:garantie|garanties)\s*:?\s*([^\n]+)/i,
  ],
  
  warrantyPeriod: [
    /garantie\s+(\d+)\s*(?:ans?|mois?)/i,
  ],
  
  // Performance énergétique
  thermalUw: [
    /(?:uw|coefficient thermique)\s*[<=]?\s*(\d+[,\.]\d+)/i,
  ],
};

export class OCRService {
  private tesseractWorker: any = null;
  private isInitializingTesseract = false;

  /**
   * Clone une regex pour éviter la persistance du lastIndex
   * CORRECTION CRITIQUE: Les regex globales gardent lastIndex entre exécutions
   * Ce qui cause des échecs sur documents multiples
   */
  private cloneRegex(regex: RegExp): RegExp {
    return new RegExp(regex.source, regex.flags);
  }

  /**
   * Méthode sécurisée pour exécuter des regex globales sans persistance de lastIndex
   * Garantit que chaque exécution repart de zéro
   */
  private safeMatch(text: string, regex: RegExp): RegExpMatchArray | null {
    const clonedRegex = this.cloneRegex(regex);
    return text.match(clonedRegex);
  }

  /**
   * Méthode sécurisée pour exécuter matchAll avec des regex globales
   * Utilise un clone pour éviter la contamination entre documents
   * CORRECTION: Assure que la regex est globale avant d'utiliser matchAll
   */
  private safeMatchAll(text: string, regex: RegExp): RegExpMatchArray[] {
    const clonedRegex = this.cloneRegex(regex);
    
    // Vérifier si la regex a le flag global, sinon l'ajouter
    if (!clonedRegex.global) {
      const globalRegex = new RegExp(clonedRegex.source, clonedRegex.flags + 'g');
      return Array.from(text.matchAll(globalRegex));
    }
    
    return Array.from(text.matchAll(clonedRegex));
  }

  /**
   * Exécute de manière sécurisée tous les patterns d'un groupe
   * Retourne le premier match valide trouvé
   */
  private safePatternMatch(text: string, patterns: RegExp[]): RegExpMatchArray | null {
    for (const pattern of patterns) {
      const match = this.safeMatch(text, pattern);
      if (match) {
        return match;
      }
    }
    return null;
  }

  /**
   * Exécute de manière sécurisée tous les patterns pour collecter tous les matches
   * Utilise pour patterns comme emails/téléphones qui peuvent avoir plusieurs occurrences
   */
  private safePatternMatchAll(text: string, patterns: RegExp[]): RegExpMatchArray[] {
    const allMatches: RegExpMatchArray[] = [];
    for (const pattern of patterns) {
      const matches = this.safeMatchAll(text, pattern);
      allMatches.push(...matches);
    }
    return allMatches;
  }

  async initialize(): Promise<void> {
    if (this.tesseractWorker) {
      return; // Déjà initialisé
    }
    
    if (this.isInitializingTesseract) {
      // Protection contre les race conditions - attendre l'initialisation en cours
      while (this.isInitializingTesseract && !this.tesseractWorker) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return;
    }
    
    try {
      this.isInitializingTesseract = true;
      logger.info('Initialisation Tesseract worker', {
        metadata: {
          service: 'OCRService',
          operation: 'initialize'
        }
      });
      
      this.tesseractWorker = await createWorker(['fra', 'eng']);
      await this.tesseractWorker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ.,!?;:()[]{}/@#€$%&*+-=_" ',
      });
      
      logger.info('Tesseract worker initialisé avec succès', {
        metadata: {
          service: 'OCRService',
          operation: 'initialize'
        }
      });
    } catch (error) {
      this.tesseractWorker = null;
      logger.error('[OCRService] Erreur lors de l\'initialisation de Tesseract', {
        metadata: {
          service: 'OCRService',
          operation: 'initialize',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw new AppError(`Failed to initialize Tesseract: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    } finally {
      this.isInitializingTesseract = false;
    }
  }

  async cleanup() {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  // ========================================
  // MÉTHODES DE VALIDATION ET AUTO-COMPLÉTION AVANCÉES
  // ========================================

  /**
   * Génère des patterns adaptatifs basés sur les données contextuelles
   */
  async generateAdaptivePatterns(documentType: 'ao' | 'supplier_quote'): Promise<Record<string, RegExp[]>> {
    try {
      logger.info('Génération patterns adaptatifs', {
        metadata: {
          service: 'OCRService',
          operation: 'generateAdaptivePatterns',
          documentType: documentType
        }
      });
      
      // Utiliser le moteur contextuel pour générer des patterns adaptatifs
      const adaptivePatterns = contextualOCREngine.generateAdaptivePatterns(documentType);
      
      // Combiner avec les patterns de base existants
      const combinedPatterns = { ...AO_PATTERNS, ...adaptivePatterns };
      
      logger.info('Patterns adaptatifs générés', {
        metadata: {
          service: 'OCRService',
          operation: 'generateAdaptivePatterns',
          documentType: documentType,
          patternsCount: Object.keys(adaptivePatterns).length
        }
      });
      return combinedPatterns;
    } catch (error) {
      logger.error('[OCRService] Erreur lors de la génération des patterns adaptatifs', {
        metadata: {
          service: 'OCRService',
          operation: 'generateAdaptivePatterns',
          documentType,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return AO_PATTERNS; // Fallback vers patterns de base
    }
  }

  /**
   * Valide et corrige automatiquement les champs extraits
   */
  async validateAndCorrectFields(fields: AOFieldsExtracted | SupplierQuoteFields, documentType: 'ao' | 'supplier_quote'): Promise<{
    correctedFields: AOFieldsExtracted | SupplierQuoteFields;
    corrections: FieldCorrection[];
    validationScore: number;
  }> {
    try {
      logger.info('Validation et correction champs', {
        metadata: {
          service: 'OCRService',
          operation: 'validateAndCorrectFields',
          documentType: documentType
        }
      });
      
      // Utiliser le moteur contextuel pour validation et correction
      const contextualResult = await contextualOCREngine.enhanceOCRFields(fields, documentType);
      
      const validationScore = this.calculateValidationScore(contextualResult.validationErrors);
      
      logger.info('Validation terminée', {
        metadata: {
          service: 'OCRService',
          operation: 'validateAndCorrectFields',
          documentType: documentType,
          validationScore: validationScore,
          correctionsCount: contextualResult.suggestedCorrections.length
        }
      });
      
      return {
        correctedFields: contextualResult.extractedFields,
        corrections: contextualResult.suggestedCorrections,
        validationScore
      };
    } catch (error) {
      logger.error('[OCRService] Erreur lors de la validation et correction des champs', {
        metadata: {
          service: 'OCRService',
          operation: 'validateAndCorrectFields',
          documentType,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        correctedFields: fields,
        corrections: [],
        validationScore: 0.5
      };
    }
  }

  /**
   * Auto-complète les champs manquants depuis les données maître
   */
  async autoCompleteFromMasterData(fields: AOFieldsExtracted): Promise<{
    completedFields: AOFieldsExtracted;
    completedFieldNames: string[];
    completionScore: number;
  }> {
    try {
      logger.info('Auto-complétion depuis données maître', {
        metadata: {
          service: 'OCRService',
          operation: 'autoCompleteFromMasterData'
        }
      });
      
      const completedFields = { ...fields };
      const completedFieldNames: string[] = [];
      
      // Auto-complétion basée sur client/location
      if (completedFields.client && completedFields.location) {
        const similarAOs = await storage.getAos();
        const matchingAO = similarAOs.find(ao => 
          ao.client === completedFields.client && 
          ao.location === completedFields.location
        );
        
        if (matchingAO) {
          // Auto-compléter les champs manquants
          if (!completedFields.departement && matchingAO.departement) {
            completedFields.departement = matchingAO.departement;
            completedFieldNames.push('departement');
          }
          
          if (!completedFields.bureauEtudes && matchingAO.bureauEtudes) {
            completedFields.bureauEtudes = matchingAO.bureauEtudes;
            completedFieldNames.push('bureauEtudes');
          }
          
          if (!completedFields.bureauControle && matchingAO.bureauControle) {
            completedFields.bureauControle = matchingAO.bureauControle;
            completedFieldNames.push('bureauControle');
          }
          
          if (!completedFields.menuiserieType && matchingAO.menuiserieType) {
            completedFields.menuiserieType = matchingAO.menuiserieType;
            completedFieldNames.push('menuiserieType');
          }
        }
      }
      
      // Auto-complétion des maîtres d'ouvrage/d'œuvre depuis base de contacts
      await this.autoCompleteMasterContacts(completedFields, completedFieldNames);
      
      const completionScore = completedFieldNames.length / Object.keys(completedFields).length;
      
      logger.info('Auto-complétion terminée', {
        metadata: {
          service: 'OCRService',
          operation: 'autoCompleteFromMasterData',
          completedFieldsCount: completedFieldNames.length,
          completionScore: parseFloat(completionScore.toFixed(2))
        }
      });
      
      return {
        completedFields,
        completedFieldNames,
        completionScore
      };
    } catch (error) {
      logger.error('[OCRService] Erreur lors de l\'auto-complétion depuis les données maître', {
        metadata: {
          service: 'OCRService',
          operation: 'autoCompleteFromMasterData',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return {
        completedFields: fields,
        completedFieldNames: [],
        completionScore: 0
      };
    }
  }

  /**
   * Auto-complète les contacts maître depuis la base de données
   */
  private async autoCompleteMasterContacts(fields: AOFieldsExtracted, completedFieldNames: string[]): Promise<void> {
    try {
      // Chercher les maîtres d'ouvrage existants
      if (fields.maitreOuvrageNom && !fields.maitreOuvrageEmail) {
        const maitresOuvrage = await storage.getMaitresOuvrage();
        const matchingMO = maitresOuvrage.find(mo => 
          mo.nom.toLowerCase().includes(fields.maitreOuvrageNom!.toLowerCase())
        );
        
        if (matchingMO) {
          if (!fields.maitreOuvrageEmail && matchingMO.email) {
            fields.maitreOuvrageEmail = matchingMO.email;
            completedFieldNames.push('maitreOuvrageEmail');
          }
          
          if (!fields.maitreOuvragePhone && matchingMO.telephone) {
            fields.maitreOuvragePhone = matchingMO.telephone;
            completedFieldNames.push('maitreOuvragePhone');
          }
          
          if (!fields.maitreOuvrageAdresse && matchingMO.adresse) {
            fields.maitreOuvrageAdresse = matchingMO.adresse;
            completedFieldNames.push('maitreOuvrageAdresse');
          }
        }
      }
      
      // Chercher les maîtres d'œuvre existants
      if (fields.maitreOeuvreNom) {
        const maitresOeuvre = await storage.getMaitresOeuvre();
        const matchingMOE = maitresOeuvre.find(moe => 
          moe.nom.toLowerCase().includes(fields.maitreOeuvreNom!.toLowerCase())
        );
        
        if (matchingMOE && !fields.maitreOeuvreContact) {
          const contacts = await storage.getContactsMaitreOeuvre(matchingMOE.id);
          const contactMOE = contacts.find(c => c.maitreOeuvreId === matchingMOE.id);
          
          if (contactMOE) {
            fields.maitreOeuvreContact = `${contactMOE.nom} - ${contactMOE.email}`;
            completedFieldNames.push('maitreOeuvreContact');
          }
        }
      }
    } catch (error) {
      logger.error('[OCRService] Erreur lors de l\'auto-complétion des contacts maître', {
        metadata: {
          service: 'OCRService',
          operation: 'autoCompleteMasterContacts',
          error: error instanceof Error ? error.message : String(error)
        }
      });
      // Ne pas lever d'erreur, juste logger
    }
  }

  /**
   * Calcule un score de validation basé sur les erreurs détectées
   */
  private calculateValidationScore(validationErrors: ValidationError[]): number {
    if (validationErrors.length === 0) return 1.0;
    
    let score = 1.0;
    for (const error of validationErrors) {
      switch (error.severity) {
        case 'critical':
          score -= 0.3;
          break;
        case 'error':
          score -= 0.2;
          break;
        case 'warning':
          score -= 0.1;
          break;
      }
    }
    
    return Math.max(0, score);
  }

  /**
   * Mappe une finition bois vers l'enum approprié
   */
  private mapWoodFinishToEnum(finish: string): any {
    const finishLower = finish.toLowerCase();
    // Retourner la finition bois appropriée
    return finishLower;
  }

  /**
   * Mappe une finition spéciale vers l'enum approprié
   */
  private mapSpecialFinishToEnum(finish: string): any {
    const finishLower = finish.toLowerCase();
    // Retourner la finition spéciale appropriée
    return finishLower;
  }

  /**
   * Calcule la confiance d'un matériau détecté - VERSION AMÉLIORÉE
   */
  private calculateMaterialConfidence(line: string, match: RegExpMatchArray): number {
    let confidence = 0.5; // Base score

    // Boost pour contexte technique
    if (/(?:spécifications?|caractéristiques?|technique|matériau|composition)/i.test(line)) {
      confidence += 0.2;
    }

    // Boost pour contexte menuiserie
    if (/(?:menuiserie|fenêtre|porte|châssis|dormant|ouvrant)/i.test(line)) {
      confidence += 0.2;
    }

    // Boost pour correspondance exacte vs partielle
    if (match[0].length > 3) { // Correspondance significative
      confidence += 0.1;
    }

    // Pénalité pour contexte générique
    if (/(?:divers|autre|général|standard)/i.test(line)) {
      confidence -= 0.1;
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Génère un rapport d'amélioration contextuelle
   */
  async generateImprovementReport(
    originalFields: AOFieldsExtracted | SupplierQuoteFields,
    enhancedFields: AOFieldsExtracted | SupplierQuoteFields,
    contextualResult: ContextualOCRResult,
    documentType: 'ao' | 'supplier_quote'
  ): Promise<{
    improvementPercentage: number;
    fieldsImproved: string[];
    autoCompletedFields: string[];
    confidenceBoost: number;
    recommendations: string[];
  }> {
    const fieldsImproved = contextualResult.mappingResults
      .filter(r => r.originalValue !== r.mappedValue)
      .map(r => r.fieldName);
    
    const improvementPercentage = (contextualResult.contextualScore - 0.5) * 100;
    const confidenceBoost = contextualResult.confidence - 0.7; // Base de comparaison 70%
    
    const recommendations: string[] = [];
    
    // Générer des recommandations basées sur les résultats
    if (contextualResult.validationErrors.length > 0) {
      recommendations.push(`${contextualResult.validationErrors.length} erreurs de validation détectées - Vérification manuelle recommandée`);
    }
    
    if (contextualResult.autoCompletedFields.length > 0) {
      recommendations.push(`${contextualResult.autoCompletedFields.length} champs auto-complétés depuis les données maître`);
    }
    
    if (contextualResult.contextualScore < 0.7) {
      recommendations.push('Score contextuel faible - Enrichir les données de référence pour améliorer la précision');
    }
    
    logger.info('Rapport amélioration généré', {
      metadata: {
        service: 'OCRService',
        operation: 'generateImprovementReport',
        documentType: documentType,
        improvementPercentage: parseFloat(improvementPercentage.toFixed(1)),
        fieldsImprovedCount: fieldsImproved.length
      }
    });
    
    return {
      improvementPercentage,
      fieldsImproved,
      autoCompletedFields: contextualResult.autoCompletedFields,
      confidenceBoost,
      recommendations
    };
  }

  // ========================================
  // MÉTHODE PRINCIPALE POUR DEVIS FOURNISSEURS
  // ========================================
  
  /**
   * Méthode principale pour analyser un devis fournisseur
   * Intègre avec la table supplier_quote_analysis
   */
  async processSupplierQuote(
    pdfBuffer: Buffer, 
    documentId: string,
    sessionId: string,
    aoLotId: string
  ): Promise<SupplierQuoteOCRResult> {
    try {
      logger.info('Début analyse devis fournisseur', {
        metadata: {
          service: 'OCRService',
          operation: 'processSupplierQuote',
          documentId: documentId,
          sessionId: sessionId,
          aoLotId: aoLotId
        }
      });
      
      // Initialiser les modules nécessaires
      await initializeModules();
      
      // Étape 1: Essayer d'extraire le texte natif du PDF
      logger.info('Tentative extraction texte natif', {
        metadata: {
          service: 'OCRService',
          operation: 'processSupplierQuote',
          documentId: documentId
        }
      });
      const nativeText = await this.extractNativeText(pdfBuffer);
      
      let extractedText: string;
      let extractionMethod: 'native-text' | 'ocr';
      let confidence: number;
      
      if (nativeText && nativeText.length > 100) {
        // PDF contient du texte natif
        logger.info('PDF avec texte natif détecté', {
          metadata: {
            service: 'OCRService',
            operation: 'processSupplierQuote',
            documentId: documentId,
            textLength: nativeText.length
          }
        });
        extractedText = nativeText;
        extractionMethod = 'native-text';
        confidence = 95;
      } else {
        // Fallback vers OCR pour PDFs scannés
        logger.info('Fallback vers OCR pour PDF scanné', {
          metadata: {
            service: 'OCRService',
            operation: 'processSupplierQuote',
            documentId: documentId
          }
        });
        const ocrResult = await this.processSupplierQuoteWithOCR(pdfBuffer);
        extractedText = ocrResult.extractedText;
        extractionMethod = 'ocr';
        confidence = ocrResult.confidence;
      }
      
      // Étape 2: Parser les champs spécifiques du devis
      logger.info('Analyse champs du devis', {
        metadata: {
          service: 'OCRService',
          operation: 'processSupplierQuote',
          documentId: documentId,
          extractionMethod: extractionMethod
        }
      });
      const processedFields = await this.parseSupplierQuoteFields(extractedText);
      processedFields.extractionMethod = extractionMethod;
      
      // Étape 3: AMÉLIORATION CONTEXTUELLE - Nouveau moteur intelligent
      logger.info('Application moteur contextuel', {
        metadata: {
          service: 'OCRService',
          operation: 'processSupplierQuote',
          documentId: documentId
        }
      });
      let contextualResult: ContextualOCRResult | undefined;
      try {
        contextualResult = await contextualOCREngine.enhanceOCRFields(processedFields, 'supplier_quote');
        
        // Utiliser les champs améliorés par le moteur contextuel
        const enhancedFields = contextualResult.extractedFields as SupplierQuoteFields;
        Object.assign(processedFields, enhancedFields);
        
        // Ajout des métadonnées contextuelles
        processedFields.contextualMetadata = {
          processingMethod: 'contextual_enhanced',
          validationScore: contextualResult.contextualScore,
          amountConsistencyCheck: contextualResult.validationErrors.some(e => e.fieldName.includes('Amount')),
          delayNormalizationApplied: contextualResult.autoCompletedFields.includes('deliveryDelay'),
          materialEnhancementApplied: contextualResult.mappingResults.some(m => m.fieldName.includes('material'))
        };
        
        logger.info('Amélioration contextuelle terminée', {
          metadata: {
            service: 'OCRService',
            operation: 'processSupplierQuote',
            documentId: documentId,
            contextualScore: contextualResult.contextualScore,
            fieldsImprovedCount: contextualResult.mappingResults.length
          }
        });
        
        // Émettre des alertes pour erreurs critiques
        const criticalErrors = contextualResult.validationErrors.filter(e => e.severity === 'critical');
        if (criticalErrors.length > 0) {
          eventBus.emit('ocr:validation_errors', {
            documentId,
            errors: criticalErrors,
            documentType: 'supplier_quote'
          });
        }
      } catch (error) {
        // Continuer avec les champs de base si le moteur contextuel échoue
        logger.warn('[OCRService] Le moteur contextuel a échoué, utilisation des champs de base', {
          metadata: {
            service: 'OCRService',
            operation: 'processSupplierQuote',
            documentId: documentId,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
      
      // Étape 4: Calculer les scores de qualité (avec bonus contextuel)
      const baseQualityScore = this.calculateQuoteQualityScore(processedFields, extractedText);
      const qualityScore = contextualResult ? 
        Math.min(100, baseQualityScore + (contextualResult.contextualScore * 10)) : 
        baseQualityScore;
      const completenessScore = this.calculateCompletenessScore(processedFields);
      
      // Étape 5: Sauvegarder dans la base de données
      await this.saveSupplierQuoteAnalysis({
        documentId,
        sessionId,
        aoLotId,
        extractedText,
        processedFields,
        confidence,
        qualityScore,
        completenessScore,
        extractionMethod
      });
      
      const statusMessage = contextualResult ? 
        `Analyse devis terminée (contextuel) - Qualité: ${qualityScore}%, Complétude: ${completenessScore}%, Score contextuel: ${contextualResult.contextualScore}` :
        `Analyse devis terminée (standard) - Qualité: ${qualityScore}%, Complétude: ${completenessScore}%`;
      logger.info(statusMessage, {
        metadata: {
          service: 'OCRService',
          operation: 'processSupplierQuote',
          documentId: documentId,
          qualityScore: qualityScore,
          completenessScore: completenessScore,
          contextualEnhanced: !!contextualResult
        }
      });
      
      return {
        extractedText,
        confidence,
        processedFields,
        qualityScore,
        completenessScore,
        contextualResult, // Inclure le résultat contextuel
        rawData: { 
          method: extractionMethod,
          documentId,
          sessionId,
          aoLotId,
          contextualEnhanced: !!contextualResult
        }
      };
    } catch (error) {
      logger.error('[OCRService] Erreur analyse devis fournisseur', {
        metadata: {
          service: 'OCRService',
          operation: 'processSupplierQuote',
          documentId: documentId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      // Sauvegarder l'erreur dans la base
      await this.saveSupplierQuoteAnalysisError(documentId, sessionId, aoLotId, error);
      
      throw error;
    }
  }

  // Méthode principale pour traiter un PDF (AO - existante)
  async processPDF(pdfBuffer: Buffer): Promise<OCRResult> {
    return withErrorHandling(
    async () => {

      logger.info('Démarrage traitement PDF', {
        metadata: {
          service: 'OCRService',
          operation: 'processPDF'
        }
      });
      
      // Initialiser les modules nécessaires en premier
      await initializeModules();
      
      // Étape 1: Essayer d'extraire le texte natif du PDF
      logger.info('Tentative extraction texte natif PDF', {
        metadata: {
          service: 'OCRService',
          operation: 'processPDF'
        }
      });
      const nativeText = await this.extractNativeText(pdfBuffer);
      
      if (nativeText && nativeText.length > 100) {
        // PDF contient du texte natif
        logger.info('PDF avec texte natif détecté', {
          metadata: {
            service: 'OCRService',
            operation: 'processPDF',
            textLength: nativeText.length
          }
        });
        let processedFields = await this.parseAOFields(nativeText);
        
        // AMÉLIORATION CONTEXTUELLE - Moteur intelligent pour AO
        logger.info('Application moteur contextuel pour AO', {
          metadata: {
            service: 'OCRService',
            operation: 'processPDF'
          }
        });
        let contextualResult: ContextualOCRResult | undefined;
        let finalConfidence = 95;
        
        try {
          contextualResult = await contextualOCREngine.enhanceOCRFields(processedFields, 'ao');
          
          // Utiliser les champs améliorés par le moteur contextuel
          const enhancedFields = contextualResult.extractedFields as AOFieldsExtracted;
          processedFields = { ...processedFields, ...enhancedFields };
          
          // Ajout des métadonnées contextuelles
          processedFields.contextualMetadata = {
            processingMethod: 'contextual_enhanced',
            similarAOsFound: contextualResult.mappingResults.filter(m => m.source === 'context_inferred').length,
            confidenceBoost: contextualResult.contextualScore * 10,
            autoCompletedFromContext: contextualResult.autoCompletedFields,
            validationFlags: contextualResult.validationErrors.map(e => e.fieldName)
          };
          
          // Bonus de confiance basé sur la cohérence contextuelle
          finalConfidence = Math.min(100, 95 + (contextualResult.contextualScore * 5));
          
          logger.info('Amélioration contextuelle AO terminée', {
            metadata: {
              service: 'OCRService',
              operation: 'processPDF',
              contextualScore: contextualResult.contextualScore,
              fieldsMappedCount: contextualResult.mappingResults.length
            }
          });
          
        
    },
    {
      operation: 'async',
service: 'ocrService',;
      metadata: {}
    }
  );
          });
        }
        
        // Calculer le scoring technique après détection des critères
        const technicalScoring = await this.computeTechnicalScoring(processedFields.specialCriteria, processedFields.reference);
        
        return {
          extractedText: nativeText,
          confidence: finalConfidence,
          processedFields,
          technicalScoring,
          contextualResult,
          rawData: { 
            method: 'native-text',
            contextualEnhanced: !!contextualResult
          }
        };
      }
      
      // Étape 2: Fallback vers OCR pour PDFs scannés
      logger.info('PDF scanné détecté, fallback OCR', {
        metadata: {
          service: 'OCRService',
          operation: 'processPDF'
        }
      });
      return await this.processWithOCR(pdfBuffer);
      
    } catch (error) {
      logger.error('Erreur traitement PDF', {
        metadata: {
          service: 'OCRService',
          operation: 'processPDF',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      // Gestion d'erreur spécifique selon le type d'erreur
      if (error instanceof Error) {
        if (error.message.includes('pdf-parse')) {
          throw new AppError(`Erreur lors du traitement OCR - Module PDF non initialisé: ${error.message}`, 500);
        } else if (error.message.includes('Tesseract')) {
          throw new AppError(`Erreur lors du traitement OCR - Échec initialisation Tesseract: ${error.message}`, 500);
        } else if (error.message.includes('sharp')) {
          throw new AppError(`Erreur lors du traitement OCR - Échec traitement image: ${error.message}`, 500);
        } else {
          throw new AppError(`Erreur lors du traitement OCR - Erreur générale: ${error.message}`, 500);
        }
      } else {
        throw new AppError(`Erreur lors du traitement OCR - Erreur inconnue: ${String(error, 500)}`);
      }
    }
  }

  // Extraction de texte natif depuis PDF
  private async extractNativeText(pdfBuffer: Buffer): Promise<string> {
    return withErrorHandling(
    async () => {

      if (!pdfParseModule) {
        logger.info('pdf-parse non initialisé, appel initializeModules', {
          metadata: {
            service: 'OCRService',
            operation: 'extractNativeText'
          }
        });
        await initializeModules();
      }
      
      if (!pdfParseModule) {
        logger.info('Module pdf-parse indisponible, skip extraction texte natif', {
          metadata: {
            service: 'OCRService',
            operation: 'extractNativeText'
          }
        });
        return ''; // Retourner chaîne vide pour déclencher le fallback OCR
      }
      
      logger.info('Extraction texte natif depuis PDF', {
        metadata: {
          service: 'OCRService',
          operation: 'extractNativeText'
        }
      });
      const data = await pdfParseModule(pdfBuffer);
      const extractedText = data.text || '';
      
      logger.info('Extraction texte natif terminée', {
        metadata: {
          service: 'OCRService',
          operation: 'extractNativeText',
          charactersExtracted: extractedText.length
        }
      });
      return extractedText;
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
        });
      }
      
      // Calculer le scoring technique après détection des critères
      const technicalScoring = await this.computeTechnicalScoring(processedFields.specialCriteria, processedFields.reference);
      
      logger.info('Traitement OCR terminé', {
        metadata: {
          service: 'OCRService',
          operation: 'processWithOCR',
          charactersSimulated: fullText.length
        }
      });
      
      return {
        extractedText: fullText,
        confidence: finalConfidence,
        processedFields,
        technicalScoring,
        contextualResult,
        rawData: { method: 'ocr-poc', note: 'POC simulation for scanned PDFs' }
      };
      
    } catch (error) {
      logger.error('Échec traitement OCR', {
        metadata: {
          service: 'OCRService',
          operation: 'processWithOCR',
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Tesseract')) {
        throw new AppError(`Échec initialisation Tesseract - OCR indisponible: ${errorMessage}`, 500);
      } else if (errorMessage.includes('sharp')) {
        throw new AppError(`Échec preprocessing image pour OCR: ${errorMessage}`, 500);
      } else {
        throw new AppError(`Erreur OCR non spécifiée: ${errorMessage}`, 500);
      }
    }
  }
  
  // Texte simulé pour le POC basé sur un vrai AO de menuiserie
  private getSimulatedOCRText(): string {
    return `
APPEL D'OFFRES PUBLIC
RÉFÉRENCE : AO-2503-216
DATE : 05/03/2025

MAÎTRE D'OUVRAGE :
BAILLEUR SOCIAL HABITAT 62
12 Rue de la République
62100 CALAIS
Tél : 03 21 34 56 78
Contact : M. MARTIN Pierre
Email : p.martin@habitat62.fr

MAÎTRE D'ŒUVRE :
CABINET D'ARCHITECTURE MODERNE
45 Avenue Jean Jaurès
62000 ARRAS
Architecte : Mme DUBOIS Sophie

OBJET DE LA CONSULTATION :
RÉHABILITATION ÉNERGÉTIQUE - RÉSIDENCE LES TERRASSES
Remplacement menuiseries extérieures et isolation thermique
Localisation : 62100 CALAIS - Quartier Beau Marais
Budget prévisionnel : 1250000

DATE LIMITE DE REMISE DES OFFRES : 28/03/2025 à 12h00
DATE DE DÉMARRAGE PRÉVISIONNELLE : 15/05/2025
DÉLAI D'EXÉCUTION : 6 mois

LOTS CONCERNÉS :

LOT 02A - MENUISERIES EXTÉRIEURES PVC
- Fourniture et pose de menuiseries PVC double vitrage
- 150 fenêtres standard 120x140
- 50 portes-fenêtres 215x140
- Performance thermique Uw < 1.3 W/m².K
- Classement AEV : A*3 E*7B V*A2
Montant estimé : 320000

LOT 03 - MENUISERIES EXTÉRIEURES ALUMINIUM
- Halls d'entrée et parties communes
- Portes automatiques coulissantes
- Châssis fixes grande hauteur
- RAL 7016 Anthracite
Montant estimé : 125000

LOT 06 - MENUISERIES INTÉRIEURES BOIS
- Portes palières coupe-feu EI30
- Blocs-portes isothermes
- Habillages et plinthes
Montant estimé : 85000

LOT 07.1 - SERRURERIE - MÉTALLERIE
- Garde-corps balcons et terrasses
- Grilles de défense RDC
- Portails et clôtures
Montant estimé : 95000

LOT 08 - ISOLATION THERMIQUE EXTÉRIEURE
- ITE polystyrène 140mm
- Finition enduit gratté
- Surface totale : 3200 m²
Montant estimé : 280000

LOT 09 - ÉTANCHÉITÉ TOITURE TERRASSE
- Réfection complète étanchéité
- Isolation thermique renforcée
- Surface : 800 m²
Montant estimé : 120000

LOT 10 - ÉLECTRICITÉ - ÉCLAIRAGE
- Mise aux normes électriques
- Éclairage LED parties communes
- Interphonie et contrôle d'accès
Montant estimé : 75000

LOT 11 - PLOMBERIE - CHAUFFAGE
- Remplacement radiateurs
- Robinets thermostatiques
- Compteurs individuels
Montant estimé : 85000

LOT 12 - PEINTURE - REVÊTEMENTS
- Peinture cages d'escalier
- Revêtements sols parties communes
- Signalétique
Montant estimé : 65000

CONDITIONS DE PARTICIPATION :
- Qualifications professionnelles requises
- Références similaires exigées (3 minimum)
- Visite sur site obligatoire : 15/03/2025 à 10h00
- Garantie décennale à jour
- Certification RGE pour lots concernés

CRITÈRES DE SÉLECTION :
- Prix : 40%
- Valeur technique : 35%
- Délais : 15%
- Références : 10%

REMISE DES OFFRES :
Par voie dématérialisée sur la plateforme
www.marches-publics62.fr

RENSEIGNEMENTS COMPLÉMENTAIRES :
Questions jusqu'au 20/03/2025 via la plateforme
Réponses publiées au plus tard le 22/03/2025
`;
  }

  // Convertir PDF en images pour OCR - Non utilisé dans le POC
  private async convertPDFToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    // Non utilisé dans le POC
    // La méthode processWithOCR utilise maintenant getSimulatedOCRText()
    return [];
  }

  // Préprocessing d'image pour améliorer l'OCR
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    return withErrorHandling(
    async () => {

      return await sharp(imageBuffer)
        .grayscale()                    // Convertir en niveaux de gris
        .normalize()                    // Normaliser le contraste
        .sharpen()                      // Accentuer la netteté
        .threshold(128)                 // Binarisation
        .png({ quality: 100 })          // Compression sans perte
        .toBuffer();
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
      return imageBuffer;
    }
  }

  // Parser intelligent pour extraire les champs spécifiques aux AO
  // Extraction spécifique des lots depuis le texte
  private extractLots(text: string): AOLot[] {
    const lots: AOLot[] = [];
    
    // Patterns pour détecter différents formats de lots
    const lotPatterns = [
      // Format "LOT N°X – Description" ou "LOT NºX : Description" (both ordinal indicators + Unicode dashes + colon)
      /(?:lot\s+)?n[°º]\s*(\d+[a-z]?)\s*[:\-–—]\s*([^\n,]+)/gi,
      // Format "Lot X: Description" ou "Lot X - Description" (avec Unicode dashes)
      /(?:lot\s+)?(\d+[a-z]?)\s*[:\-–—]\s*([^\n,]+)/gi,
      // Format "XX: Description" ou "XXa: Description" (avec Unicode dashes)
      /^(\d{1,3}[a-z]?)\s*[:\-–—]\s*([^\n,]+)/gim,
      // Format avec tirets ou points "07.1: Menuiseries extérieures" (avec Unicode dashes)
      /(\d{1,2}\.?\d?[a-z]?)\s*[:\-–—]\s*([^\n,]+)/gi,
    ];
    
    // Trouver la section des lots
    const lotSectionPatterns = [
      /lots?\s+concernés?\s*:?\s*([\s\S]*?)(?=\n\n|maître|date|contact|délai|€)/i,
      /lots?\s*:\s*([\s\S]*?)(?=\n\n|maître|date|contact|délai|€)/i,
    ];
    
    let lotSection = text;
    
    // Essayer de trouver une section spécifique aux lots
    for (const pattern of lotSectionPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        lotSection = match[1];
        break;
      }
    }
    
    // Chercher les lots dans la section identifiée
    const foundLots = new Map<string, string>();
    
    for (const pattern of lotPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(lotSection)) !== null) {
        const numero = match[1].trim();
        const designation = match[2].trim();
        
        // Filtrer les faux positifs (dates, montants, etc.)
        if (designation.length > 3 && 
            !designation.match(/^\d+/) && 
            !designation.toLowerCase().includes('euros') &&
            !designation.match(/^\d{2}\/\d{2}\/\d{4}/) &&
            designation.length < 100) {
          
          // Éviter les doublons
          if (!foundLots.has(numero)) {
            foundLots.set(numero, designation);
          }
        }
      }
    }
    
    // Convertir en tableau avec détection du type de lot
    foundLots.forEach((designation, numero) => {
      const lot: AOLot = {
        numero,
        designation,
      };
      
      // Déterminer le type de lot (menuiserie, gros œuvre, etc.)
      if (designation.toLowerCase().includes('menuiserie')) {
        lot.type = designation.toLowerCase().includes('extérieure') ? 'menuiserie_exterieure' : 'menuiserie_interieure';
      } else if (designation.toLowerCase().includes('gros') && designation.toLowerCase().includes('œuvre')) {
        lot.type = 'gros_oeuvre';
      } else if (designation.toLowerCase().includes('plâtrerie') || designation.toLowerCase().includes('cloison')) {
        lot.type = 'platrerie';
      } else if (designation.toLowerCase().includes('carrelage') || designation.toLowerCase().includes('faïence')) {
        lot.type = 'carrelage';
      } else if (designation.toLowerCase().includes('peinture')) {
        lot.type = 'peinture';
      } else if (designation.toLowerCase().includes('serrurerie')) {
        lot.type = 'serrurerie';
      } else if (designation.toLowerCase().includes('étanchéité')) {
        lot.type = 'etancheite';
      } else if (designation.toLowerCase().includes('fondation')) {
        lot.type = 'fondations';
      }
      
      lots.push(lot);
    });
    
    // Si aucun lot trouvé, chercher spécifiquement les menuiseries
    if (lots.length === 0) {
      const menuiseriePatterns = [
        /menuiseries?\s+extérieures?/gi,
        /menuiseries?\s+intérieures?/gi,
        /fenêtres?/gi,
        /portes?/gi,
      ];
      
      menuiseriePatterns.forEach((pattern, index) => {
        if (pattern.test(text)) {
          lots.push({
            numero: `AUTO-${index + 1}`,
            designation: pattern.source.replace(/[\\?]/g, ''),
            type: index < 2 ? 'menuiserie' : 'autre',
          });
        }
      });
    }
    
    return lots;
  }

  // Détection des critères techniques spéciaux requis par JLM - VERSION OPTIMISÉE
  private detectSpecialCriteria(text: string): { 
    batimentPassif: boolean; 
    isolationRenforcee: boolean; 
    precadres: boolean; 
    voletsExterieurs: boolean; 
    coupeFeu: boolean;
    criteresAev?: boolean;
    certifications?: boolean;
    menuiserieSpecifique?: boolean;
    accessibilite?: boolean;
    evidences?: Record<string, string[]>; 
  } {
    const criteria = {
      batimentPassif: false,
      isolationRenforcee: false,
      precadres: false,
      voletsExterieurs: false,
      coupeFeu: false,
      criteresAev: false,
      certifications: false,
      menuiserieSpecifique: false,
      accessibilite: false,
    };
    
    const evidences: Record<string, string[]> = {};
    
    // Scanner pour bâtiment passif
    if (AO_EXTENDED_PATTERNS.batiment_passif) {
      for (const pattern of AO_EXTENDED_PATTERNS.batiment_passif) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.batimentPassif = true;
          if (!evidences.batimentPassif) evidences.batimentPassif = [];
          evidences.batimentPassif.push(matches[0]);
        }
      }
    }
    
    // Scanner pour isolation thermique renforcée
    if (AO_EXTENDED_PATTERNS.isolation_renforcee) {
      for (const pattern of AO_EXTENDED_PATTERNS.isolation_renforcee) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.isolationRenforcee = true;
          if (!evidences.isolationRenforcee) evidences.isolationRenforcee = [];
          evidences.isolationRenforcee.push(matches[0]);
        }
      }
    }
    
    // Scanner pour précadres
    if (AO_EXTENDED_PATTERNS.precadres) {
      for (const pattern of AO_EXTENDED_PATTERNS.precadres) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.precadres = true;
          if (!evidences.precadres) evidences.precadres = [];
          evidences.precadres.push(matches[0]);
        }
      }
    }
    
    // Scanner pour volets extérieurs
    if (AO_EXTENDED_PATTERNS.volets_exterieurs) {
      for (const pattern of AO_EXTENDED_PATTERNS.volets_exterieurs) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.voletsExterieurs = true;
          if (!evidences.voletsExterieurs) evidences.voletsExterieurs = [];
          evidences.voletsExterieurs.push(matches[0]);
        }
      }
    }
    
    // Scanner pour coupe-feu
    if (AO_EXTENDED_PATTERNS.coupe_feu) {
      for (const pattern of AO_EXTENDED_PATTERNS.coupe_feu) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.coupeFeu = true;
          if (!evidences.coupeFeu) evidences.coupeFeu = [];
          evidences.coupeFeu.push(matches[0]);
        }
      }
    }
    
    // NOUVEAUX SCANNERS POUR CRITÈRES JLM SPÉCIFIQUES
    
    // Scanner pour critères AEV
    if (AO_EXTENDED_PATTERNS.criteres_aev) {
      for (const pattern of AO_EXTENDED_PATTERNS.criteres_aev) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.criteresAev = true;
          if (!evidences.criteresAev) evidences.criteresAev = [];
          evidences.criteresAev.push(matches[0]);
        }
      }
    }
    
    // Scanner pour certifications
    if (AO_PATTERNS.certifications) {
      for (const pattern of AO_PATTERNS.certifications) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.certifications = true;
          if (!evidences.certifications) evidences.certifications = [];
          evidences.certifications.push(matches[0]);
        }
      }
    }
    
    // Scanner pour spécificités menuiserie
    if (AO_EXTENDED_PATTERNS.menuiserie_specifique) {
      for (const pattern of AO_EXTENDED_PATTERNS.menuiserie_specifique) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.menuiserieSpecifique = true;
          if (!evidences.menuiserieSpecifique) evidences.menuiserieSpecifique = [];
          evidences.menuiserieSpecifique.push(matches[0]);
        }
      }
    }
    
    // Scanner pour accessibilité PMR
    if (AO_EXTENDED_PATTERNS.accessibilite) {
      for (const pattern of AO_EXTENDED_PATTERNS.accessibilite) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.accessibilite = true;
          if (!evidences.accessibilite) evidences.accessibilite = [];
          evidences.accessibilite.push(matches[0]);
        }
      }
    }
    
    logger.info('Critères spéciaux détectés', {
      metadata: {
        service: 'OCRService',
        operation: 'detectSpecialCriteria',
        detectedCriteria: Object.entries(criteria).filter(([,v]) => v === true).map(([k]) => k)
      }
    });
    
    return {
      ...criteria,
      evidences: Object.keys(evidences).length > 0 ? evidences : undefined
    };
  }

  private async parseAOFields(text: string): Promise<AOFieldsExtracted> {
    const fields: AOFieldsExtracted = {};
    const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Extraction de la référence
    for (const pattern of AO_PATTERNS.reference) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.reference = match[1].trim();
        break;
      }
    }
    
    // Extraction des dates
    const dates = [];
    for (const pattern of AO_PATTERNS.dates) {
      const matches = text.match(pattern);
      if (matches) {
        dates.push(...matches);
      }
    }
    if (dates.length > 0) {
      fields.deadline = this.parseDate(dates[0]); // Première date trouvée
    }
    
    // Extraction du maître d'ouvrage
    for (const pattern of AO_PATTERNS.maitreOuvrage) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.maitreOuvrageNom = match[1].trim();
        fields.client = match[1].trim(); // Dupliquer pour compatibilité
        break;
      }
    }
    
    // Extraction de la localisation
    for (const pattern of AO_PATTERNS.location) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.location = match[1].trim();
        break;
      }
    }
    
    // Extraction du montant
    for (const pattern of AO_PATTERNS.montant) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.montantEstime = match[1].replace(/\s/g, '');
        break;
      }
    }
    
    // Détection du type de marché
    if (AO_PATTERNS.typeMarche[0].test(normalizedText)) {
      fields.typeMarche = 'public';
    } else if (AO_PATTERNS.typeMarche[1].test(normalizedText)) {
      fields.typeMarche = 'prive';
    }
    
    // Détection du type de menuiserie
    for (let i = 0; i < AO_PATTERNS.menuiserie.length; i++) {
      if (AO_PATTERNS.menuiserie[i].test(normalizedText)) {
        const types = ['fenetre', 'porte', 'volet', 'portail', 'cloison', 'verriere'];
        fields.menuiserieType = types[i];
        break;
      }
    }
    
    // Détection du département (priorité JLM: 50 et 62)
    if (AO_PATTERNS.departement[0].test(normalizedText)) {
      fields.departement = '50';
    } else if (AO_PATTERNS.departement[1].test(normalizedText)) {
      fields.departement = '62';
    }
    
    // Extraction bureau d'études
    for (const pattern of AO_PATTERNS.bureauEtudes) {
      const match = text.match(pattern);
      if (match && match[1]) {
        fields.bureauEtudes = match[1].trim();
        break;
      }
    }
    
    // Extraction contacts
    const contacts = text.match(AO_PATTERNS.contact[0]);
    if (contacts && contacts.length > 0) {
      fields.maitreOuvrageEmail = contacts[0];
    }
    
    const phones = text.match(AO_PATTERNS.contact[1]);
    if (phones && phones[1]) {
      fields.maitreOuvragePhone = phones[1].trim();
    }
    
    // Détection automatique des documents disponibles
    fields.cctpDisponible = /cctp|cahier.*clauses.*techniques/i.test(text);
    fields.plansDisponibles = /plans?|dessins?/i.test(text);
    fields.dpgfClientDisponible = /dpgf|décomposition.*prix/i.test(text);
    fields.dceDisponible = /dce|dossier.*consultation/i.test(text);
    
    // Extraction des lots détaillés
    fields.lots = this.extractLots(text);
    
    // Si des lots sont trouvés, créer une liste textuelle pour lotConcerne
    if (fields.lots && fields.lots.length > 0) {
      const lotNumbers = fields.lots.map(l => l.numero).join(', ');
      const menuiserieLots = fields.lots.filter(l => l.type?.includes('menuiserie'));
      
      if (menuiserieLots.length > 0) {
        fields.lotConcerne = menuiserieLots.map(l => `${l.numero}: ${l.designation}`).join(', ');
      } else {
        fields.lotConcerne = `Lots: ${lotNumbers}`;
      }
    }
    
    // Détection des critères techniques spéciaux
    fields.specialCriteria = this.detectSpecialCriteria(text);
    
    // NOUVEAUTÉ: Extraction matériaux et couleurs avec patterns avancés OCR
    logger.info('Extraction matériaux et couleurs', {
      metadata: {
        service: 'OCRService',
        operation: 'parseAOFields'
      }
    });
    const { materials, colors } = this.extractMaterialsAndColors(text);
    fields.materials = materials;
    fields.colors = colors;
    
    logger.info('Extraction matériaux/couleurs terminée', {
      metadata: {
        service: 'OCRService',
        operation: 'parseAOFields',
        materialsCount: materials.length,
        colorsCount: colors.length
      }
    });
    
    // Évaluation des règles matériaux-couleurs (après tous les champs extraits)
    return withErrorHandling(
    async () => {

      await this.evaluateMaterialColorRules(fields, text);
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
    }
    
    // CORRECTION BLOCKER 2: Calculer et inclure technicalScoring
    const technicalScoring = await this.computeTechnicalScoring(fields.specialCriteria, fields.reference);
    
    // GAP CRITIQUE 1: Publication EventBus avec métadonnées complètes pour les tests d'intégration
    if (technicalScoring?.shouldAlert) {
      return withErrorHandling(
    async () => {

        const alertData = {
          aoId: fields.reference || 'unknown',
          aoReference: fields.reference || 'unknown',
          score: technicalScoring.totalScore,
          triggeredCriteria: technicalScoring.triggeredCriteria,
          category: 'technical_scoring',
          severity: technicalScoring.totalScore > 80 ? 'critical' : 'warning',
          affectedQueryKeys: ['/api/technical-alerts', '/api/aos'],
          metadata: {
            detectedMaterials: (fields.materials || []).map(m => m.material),
            alertRules: await this.getTriggeredAlertRules(fields.materials, {
              batimentPassif: fields.specialCriteria?.batimentPassif || false,
              isolationRenforcee: fields.specialCriteria?.isolationRenforcee || false,
              precadres: fields.specialCriteria?.precadres || false,
              voletsExterieurs: fields.specialCriteria?.voletsExterieurs || false,
              coupeFeu: fields.specialCriteria?.coupeFeu || false
            }),
            evidences: fields.specialCriteria?.evidences,
            scoreDetails: technicalScoring.details,
            timestamp: new Date().toISOString(),
            source: 'OCR-parseAOFields',
            confidence: 95
          }
        };
        
        logger.info('Publication alerte technique', {
          metadata: {
            service: 'OCRService',
            operation: 'parseAOFields',
            aoReference: alertData.aoReference,
            score: alertData.score
          }
        });
        eventBus.publishTechnicalAlert(alertData);
        
        logger.info('Alerte technique publiée via EventBus', {
          metadata: {
            service: 'OCRService',
            operation: 'parseAOFields',
            aoReference: fields.reference
          }
        });
      
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
        });
      }
    }
    
    // Return fields with technicalScoring in the correct format for AOFieldsExtracted
    return {
      ...fields
    };
  }

  // Méthode async pour obtenir les règles d'alerte déclenchées depuis storage
  private async getTriggeredAlertRules(
    materials: MaterialSpec[] = [],
    specialCriteria: Record<string, boolean> = {}
  ): Promise<string[]> {
    return withErrorHandling(
    async () => {

      const rules = await storage.getMaterialColorRules();
      const triggeredRules: string[] = [];
      
      logger.info('Évaluation règles alerte depuis storage', {
        metadata: {
          service: 'OCRService',
          operation: 'getTriggeredAlertRules',
          rulesCount: rules.length
        }
      });
      
      for (const rule of rules) {
        const isTriggered = await this.evaluateAlertRule(rule, materials, specialCriteria);
        if (isTriggered) {
          triggeredRules.push(rule.id);
          logger.info('Règle alerte déclenchée', {
            metadata: {
              service: 'OCRService',
              operation: 'getTriggeredAlertRules',
              ruleId: rule.id,
              severity: rule.severity
            }
          });
        }
      }
      
      logger.info('Règles alerte évaluées', {
        metadata: {
          service: 'OCRService',
          operation: 'getTriggeredAlertRules',
          triggeredRulesCount: triggeredRules.length,
          triggeredRules: triggeredRules
        }
      });
      return triggeredRules;
      
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
      // Fallback vers règles par défaut
      return this.getDefaultTriggeredRules(materials, specialCriteria);
    }
  }

  // Helper pour évaluer règle individuelle selon conditions
  private async evaluateAlertRule(
    rule: MaterialColorAlertRule,
    materials: MaterialSpec[],
    specialCriteria: Record<string, boolean>
  ): Promise<boolean> {
    return withErrorHandling(
    async () => {

      const materialNames = materials.map(m => m.material);
      let materialMatch = false;
      let specialCriteriaMatch = false;
      
      // Évaluer correspondance matériaux
      if (rule.materials && rule.materials.length > 0) {
        if (rule.condition === 'allOf') {
          materialMatch = rule.materials.every(material => materialNames.includes(material));
        } else { // anyOf
          materialMatch = rule.materials.some(material => materialNames.includes(material));
        }
      } else {
        materialMatch = true; // Pas de contrainte matériau
      }
      
      // Évaluer correspondance critères spéciaux
      if (rule.specialCriteria && rule.specialCriteria.length > 0) {
        const criteriaMatches = rule.specialCriteria.map(criterion => {
          // Mapping des noms de critères
          const criteriaMap: Record<string, string> = {
            'batiment_passif': 'batimentPassif',
            'isolation_renforcee': 'isolationRenforcee',
            'precadres': 'precadres',
            'volets_exterieurs': 'voletsExterieurs',
            'coupe_feu': 'coupeFeu'
          };
          const mappedCriterion = criteriaMap[criterion] || criterion;
          return Boolean(specialCriteria[mappedCriterion]);
        });
        
        if (rule.condition === 'allOf') {
          specialCriteriaMatch = criteriaMatches.every(match => match);
        } else { // anyOf
          specialCriteriaMatch = criteriaMatches.some(match => match);
        }
      } else {
        specialCriteriaMatch = true; // Pas de contrainte critères spéciaux
      }
      
      // Condition globale selon allOf/anyOf de la règle
      let finalMatch = false;
      if (rule.condition === 'allOf') {
        finalMatch = materialMatch && specialCriteriaMatch;
      } else { // anyOf
        finalMatch = materialMatch || specialCriteriaMatch;
      }
      
      if (finalMatch) {
        logger.info('Règle alerte déclenchée', {
          metadata: {
            service: 'OCRService',
            operation: 'evaluateAlertRule',
            ruleId: rule.id,
            materialMatch: materialMatch,
            specialCriteriaMatch: specialCriteriaMatch,
            condition: rule.condition,
            severity: rule.severity
          }
        });
      }
      
      return finalMatch;
      
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
      return false;
    }
  }

  // Méthode fallback pour règles par défaut en cas d'erreur storage
  private getDefaultTriggeredRules(
    materials: MaterialSpec[],
    specialCriteria: Record<string, boolean>
  ): string[] {
    const triggeredRules: string[] = [];
    const materialNames = materials.map(m => m.material);
    
    logger.info('Utilisation règles par défaut (fallback)', {
      metadata: {
        service: 'OCRService',
        operation: 'getDefaultTriggeredRules'
      }
    });
    
    // Règle PVC + coupe-feu = critical
    if (materialNames.includes('pvc') && specialCriteria.coupeFeu) {
      triggeredRules.push('default-pvc-coupe-feu');
    }
    
    // Règle bâtiment haute performance
    if ((materialNames.includes('pvc') || materialNames.includes('aluminium')) && 
        (specialCriteria.batimentPassif || specialCriteria.isolationRenforcee)) {
      triggeredRules.push('default-high-performance-building');
    }
    
    // Règle composite thermique
    if (materialNames.includes('composite')) {
      triggeredRules.push('custom-composite-thermal');
    }
    
    logger.info('Règles par défaut déclenchées', {
      metadata: {
        service: 'OCRService',
        operation: 'getDefaultTriggeredRules',
        triggeredRulesCount: triggeredRules.length,
        triggeredRules: triggeredRules
      }
    });
    return triggeredRules;
  }

  // Convertir les dates en format ISO
  private parseDate(dateStr: string): string {
    return withErrorHandling(
    async () => {

      const cleaned = dateStr.replace(/[^\d\/\-\.]/g, '');
      const parts = cleaned.split(/[\/\-\.]/);
      
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        const fullYear = year < 100 ? 2000 + year : year;
        const date = new Date(fullYear, month - 1, day);
        
        return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
      }
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
    
    return dateStr;
  }

  // Méthode pour personnaliser les patterns selon les besoins JLM
  addCustomPattern(field: string, pattern: RegExp) {
    if (!(field in AO_PATTERNS)) {
      AO_PATTERNS[field] = [];
    }
    AO_PATTERNS[field].push(pattern);
  }

  // Obtenir les statistiques de confiance
  getConfidenceLevel(confidence: number): string {
    if (confidence >= 90) return 'excellent';
    if (confidence >= 75) return 'bon';
    if (confidence >= 60) return 'moyen';
    return 'faible';
  }

  // Calculer le scoring technique à partir des critères spéciaux détectés
  private async computeTechnicalScoring(specialCriteria?: { 
    batimentPassif: boolean;
    isolationRenforcee: boolean;
    precadres: boolean;
    voletsExterieurs: boolean;
    coupeFeu: boolean;
    evidences?: Record<string, string[]>;
  }, aoReference?: string): Promise<TechnicalScoringResult | undefined> {
    // Si aucun critère détecté, pas de scoring
    if (!specialCriteria) {
      logger.info('Aucun critère spécial détecté, pas de scoring technique', {
        metadata: {
          service: 'OCRService',
          operation: 'computeTechnicalScoring'
        }
      });
      return undefined;
    }

    return withErrorHandling(
    async () => {

      // Convertir les critères au format attendu par le ScoringService
      const criteriaForScoring: SpecialCriteria = {
        batimentPassif: specialCriteria.batimentPassif,
        isolationRenforcee: specialCriteria.isolationRenforcee,
        precadres: specialCriteria.precadres,
        voletsExterieurs: specialCriteria.voletsExterieurs,
        coupeFeu: specialCriteria.coupeFeu,
        evidences: specialCriteria.evidences
      };

      // CORRECTION CRITIQUE: Charger la configuration utilisateur depuis storage
      logger.info('Chargement configuration scoring depuis storage', {
        metadata: {
          service: 'OCRService',
          operation: 'computeTechnicalScoring'
        }
      });
      const config = await storage.getScoringConfig();
      logger.info('Configuration scoring chargée', {
        metadata: {
          service: 'OCRService',
          operation: 'computeTechnicalScoring',
          config: config
        }
      });

      // Calculer le scoring avec la configuration utilisateur (au lieu de la config par défaut)
      const result = ScoringService.compute(criteriaForScoring, config);
      
      logger.info('Scoring technique calculé', {
        metadata: {
          service: 'OCRService',
          operation: 'computeTechnicalScoring',
          totalScore: result.totalScore,
          triggeredCriteria: result.triggeredCriteria,
          shouldAlert: result.shouldAlert
        }
      });

      // NOTE: Alerte technique consolidée sera publiée dans parseAOFields
      // Ne pas publier d'alerte individuelle ici pour éviter les doublons
      if (result.shouldAlert && aoReference) {
        logger.info('Alerte technique déclenchée (sera publiée dans parseAOFields)', {
          metadata: {
            service: 'OCRService',
            operation: 'computeTechnicalScoring',
            aoReference: aoReference,
            score: result.totalScore
          }
        });
      }

      return result;
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
      return undefined;
    }
  }

  // ========================================
  // EXTRACTION MATÉRIAUX ET COULEURS - PATTERNS AVANCÉS OCR
  // ========================================

  /**
   * Extrait les matériaux et couleurs avec liaison contextuelle sophistiquée - VERSION OPTIMISÉE MENUISERIE FRANÇAISE
   */
  private extractMaterialsAndColors(text: string): { materials: MaterialSpec[]; colors: ColorSpec[] } {
    logger.info('Début extraction matériaux et couleurs optimisée', {
      metadata: {
        service: 'OCRService',
        operation: 'extractMaterialsAndColors'
      }
    });
    
    const materials: MaterialSpec[] = [];
    const colors: ColorSpec[] = [];
    const lines = text.split('\n');
    
    // Patterns spéciaux pour menuiserie (fenêtres, portes, etc.)
    const menuiserieContextPatterns = [
      /(?:fenêtre|porte|volet|portail|baie vitrée).{0,100}(?:en |matériau |matière )/i,
      /(?:châssis|ouvrant|dormant|cadre).{0,50}(?:en |matériau )/i,
      /(?:menuiserie|serrurerie).{0,50}(?:en |matériau )/i
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const context = [
        lines[i-2] || '',
        lines[i-1] || '',
        line,
        lines[i+1] || '',
        lines[i+2] || ''
      ].join(' ');
      
      // Détecter si c'est un contexte menuiserie
      const isMenuiserieContext = menuiserieContextPatterns.some(pattern => 
        this.safeMatch(context, pattern)
      );
      
      // Détecter matériaux avec contexte couleur et score de pertinence
      for (const [materialKey, pattern] of Object.entries(MATERIAL_PATTERNS)) {
        const matches = this.safeMatchAll(line, pattern);
        if (matches.length > 0) {
          // Fenêtre contextuelle étendue pour menuiserie (±200 chars)
          const contextStart = Math.max(0, context.indexOf(line) - 200);
          const contextEnd = context.indexOf(line) + line.length + 200;
          const windowText = context.substring(contextStart, contextEnd);
          
          const associatedColor = this.extractColorFromWindow(windowText);
          const associatedFinish = this.extractFinishFromContext(windowText);
          
          // Calculer score de confiance amélioré
          let confidence = this.calculateMaterialConfidence(line, matches[0]);
          if (isMenuiserieContext) confidence += 0.2; // Boost pour contexte menuiserie
          
          materials.push({
            material: materialKey as any,
            color: associatedColor,
            evidences: matches.map(m => m[0]),
            confidence: Math.min(1.0, confidence),
            context: isMenuiserieContext ? 'menuiserie' : 'general'
          } as any);
          
          logger.info('Matériau détecté', {
            metadata: {
              service: 'OCRService',
              operation: 'extractMaterialsAndColors',
              material: materialKey,
              context: isMenuiserieContext ? 'menuiserie' : 'general',
              confidence: confidence
            }
          });
        }
      }
      
      // Détecter couleurs RAL avec patterns améliorés
      const ralMatches = this.safeMatchAll(line, COLOR_PATTERNS.ralCodes);
      for (const match of ralMatches) {
        const ralCode = match[1];
        const associatedFinish = this.extractAllFinishesFromContext(context);
        
        colors.push({
          ralCode,
          name: this.getRalColorName(ralCode),
          finish: associatedFinish.standard || associatedFinish.wood || associatedFinish.special,
          evidences: [match[0]],
          confidence: isMenuiserieContext ? 0.9 : 0.7
        } as any);
        
        logger.info('Couleur RAL détectée', {
          metadata: {
            service: 'OCRService',
            operation: 'extractMaterialsAndColors',
            ralCode: ralCode,
            colorName: this.getRalColorName(ralCode)
          }
        });
      }
      
      // Détecter couleurs par nom avec finitions spécialisées
      const colorNameMatches = this.safeMatchAll(line, COLOR_PATTERNS.colorNames);
      for (const match of colorNameMatches) {
        const colorName = match[0];
        const associatedFinishes = this.extractAllFinishesFromContext(context);
        
        colors.push({
          name: colorName,
          finish: associatedFinishes.standard || associatedFinishes.wood || associatedFinishes.special,
          evidences: [match[0]],
          confidence: isMenuiserieContext ? 0.8 : 0.6
        } as any);
        
        logger.info('Couleur nommée détectée', {
          metadata: {
            service: 'OCRService',
            operation: 'extractMaterialsAndColors',
            colorName: colorName
          }
        });
      }
    }
    
    const dedupedMaterials = this.deduplicateMaterials(materials);
    const dedupedColors = this.deduplicateColors(colors);
    
    logger.info('Extraction optimisée terminée', {
      metadata: {
        service: 'OCRService',
        operation: 'extractMaterialsAndColors',
        materialsCount: dedupedMaterials.length,
        colorsCount: dedupedColors.length
      }
    });
    
    return { materials: dedupedMaterials, colors: dedupedColors };
  }

  /**
   * Extrait une couleur potentielle depuis une fenêtre de contexte
   */
  private extractColorFromWindow(windowText: string): ColorSpec | undefined {
    // Chercher RAL dans la fenêtre
    // CORRECTION: Utilise safeMatch pour éviter persistance lastIndex
    const ralMatch = this.safeMatch(windowText, COLOR_PATTERNS.ralCodes);
    if (ralMatch) {
      const ralCode = ralMatch[0].replace(/\D/g, '');
      const finish = this.extractFinishFromContext(windowText);
      return {
        ralCode,
        name: this.getRalColorName(ralCode),
        finish,
        evidences: [ralMatch[0]]
      };
    }
    
    // Chercher nom de couleur dans la fenêtre
    // CORRECTION: Utilise safeMatch pour éviter persistance lastIndex
    const colorMatch = this.safeMatch(windowText, COLOR_PATTERNS.colorNames);
    if (colorMatch) {
      const finish = this.extractFinishFromContext(windowText);
      return {
        name: colorMatch[0],
        finish,
        evidences: [colorMatch[0]]
      };
    }
    
    return undefined;
  }

  /**
   * Extrait toutes les finitions disponibles depuis le contexte - VERSION OPTIMISÉE
   */
  private extractAllFinishesFromContext(context: string): { standard?: any; wood?: any; special?: any } {
    const finishes: { standard?: any; wood?: any; special?: any } = {};
    
    // Finitions standards
    const standardFinishMatch = this.safeMatch(context, COLOR_PATTERNS.finishes);
    if (standardFinishMatch) {
      finishes.standard = this.mapFinishToEnum(standardFinishMatch[0]);
    }
    
    // Finitions bois spécifiques
    const woodFinishMatch = this.safeMatch(context, COLOR_PATTERNS.woodFinishes);
    if (woodFinishMatch) {
      finishes.wood = this.mapWoodFinishToEnum(woodFinishMatch[0]);
    }
    
    // Finitions spéciales (thermolaquage, anodisation, etc.)
    const specialFinishMatch = this.safeMatch(context, COLOR_PATTERNS.specialFinishes);
    if (specialFinishMatch) {
      finishes.special = this.mapSpecialFinishToEnum(specialFinishMatch[0]);
    }
    
    return finishes;
  }

  /**
   * Extrait une finition depuis le contexte - VERSION MAINTENUE POUR COMPATIBILITÉ
   */
  private extractFinishFromContext(context: string): any {
    const allFinishes = this.extractAllFinishesFromContext(context);
    return allFinishes.standard || allFinishes.wood || allFinishes.special;
  }

  /**
   * Mappe une finition standard vers l'enum approprié
   */
  private mapFinishToEnum(finish: string): any {
    const finishLower = finish.toLowerCase();
    // Mapper vers les enums valides
    const finishMapping: Record<string, string> = {
      'mat': 'mat', 'matte': 'mat',
      'satiné': 'satine', 'satine': 'satine',
      'brillant': 'brillant', 'glossy': 'brillant',
      'texturé': 'texture', 'texture': 'texture',
      'sablé': 'sable', 'sable': 'sable',
      'anodisé': 'anodise', 'anodise': 'anodise',
      'thermolaqué': 'thermolaque', 'thermolaque': 'thermolaque',
      'laqué': 'laque', 'laque': 'laque',
      'plaxé': 'plaxe', 'plaxe': 'plaxe',
      'brossé': 'brosse', 'brosse': 'brosse'
    };
    return finishMapping[finishLower] || undefined;
  }

  /**
   * Calcule la confiance de détection d'un matériau - VERSION V2
   */
  private calculateMaterialConfidenceV2(line: string, matches: RegExpMatchArray): number {
    let confidence = 0.8; // Base
    
    // Augmenter si terme technique présent
    if (line.match(/\b(?:menuiseries?|châssis|fenêtres?|portes?)\b/i)) {
      confidence += 0.1;
    }
    
    // Augmenter si spécifications techniques
    if (line.match(/\b(?:Uw|thermique|isolation|performance)\b/i)) {
      confidence += 0.05;
    }
    
    // Diminuer si contexte ambigu
    if (line.match(/\b(?:exemple|à titre|possibilité)\b/i)) {
      confidence -= 0.2;
    }
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  /**
   * Obtient le nom d'une couleur RAL
   */
  private getRalColorName(ralCode: string): string {
    const ralMapping: Record<string, string> = {
      '9016': 'Blanc de circulation',
      '7016': 'Gris anthracite',
      '6005': 'Vert mousse',
      '3009': 'Rouge oxyde',
      '5010': 'Bleu gentiane',
      '8017': 'Brun chocolat',
      '1015': 'Ivoire clair',
      '7035': 'Gris clair'
    };
    return ralMapping[ralCode] || `RAL ${ralCode}`;
  }

  /**
   * Déduplique les matériaux détectés
   */
  private deduplicateMaterials(materials: MaterialSpec[]): MaterialSpec[] {
    const seen = new Set<string>();
    return materials.filter(material => {
      const key = `${material.material}_${material.color?.ralCode || material.color?.name || 'no-color'}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Déduplique les couleurs détectées
   */
  private deduplicateColors(colors: ColorSpec[]): ColorSpec[] {
    const seen = new Set<string>();
    return colors.filter(color => {
      const key = `${color.ralCode || color.name}_${color.finish || 'no-finish'}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Évalue les règles d'alerte matériau-couleur et déclenche les alertes
   */
  private async evaluateMaterialColorRules(
    processedFields: AOFieldsExtracted,
    fullText: string
  ): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Évaluation règles matériaux-couleurs', {
        metadata: {
          service: 'OCRService',
          operation: 'evaluateMaterialColorRules'
        }
      });
      
      const rules = await storage.getMaterialColorRules();
      logger.info('Règles matériaux-couleurs récupérées', {
        metadata: {
          service: 'OCRService',
          operation: 'evaluateMaterialColorRules',
          rulesCount: rules?.length || 0
        }
      });
      
      for (const rule of rules) {
        const triggered = this.evaluateRule(rule, processedFields, fullText);
        
        if (triggered) {
          logger.info('Règle matériau-couleur déclenchée', {
            metadata: {
              service: 'OCRService',
              operation: 'evaluateMaterialColorRules',
              ruleId: rule.id,
              ruleMessage: rule.message
            }
          });
          
          // NOTE: Alerte consolidée sera publiée dans parseAOFields
          // Ne pas publier d'alerte individuelle ici pour éviter les doublons
        }
      }
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
    }
  }

  /**
   * Évalue une règle spécifique avec logique complète (matériaux + specialCriteria + conditions)
   */
  private evaluateRule(
    rule: MaterialColorAlertRule,
    fields: AOFieldsExtracted,
    fullText: string
  ): boolean {
    logger.info('Évaluation règle complète', {
      metadata: {
        service: 'OCRService',
        operation: 'evaluateRule',
        ruleId: rule.id
      }
    });
    
    return withErrorHandling(
    async () => {

      const materials = fields.materials || [];
      const materialNames = materials.map(m => m.material);
      
      // Convertir specialCriteria depuis fields en format compatible
      const specialCriteria: Record<string, boolean> = {
        batimentPassif: fields.specialCriteria?.batimentPassif || false,
        isolationRenforcee: fields.specialCriteria?.isolationRenforcee || false,
        precadres: fields.specialCriteria?.precadres || false,
        voletsExterieurs: fields.specialCriteria?.voletsExterieurs || false,
        coupeFeu: fields.specialCriteria?.coupeFeu || false
      };
      
      let materialMatch = false;
      let specialCriteriaMatch = false;
      
      // Évaluer correspondance matériaux
      if (rule.materials && rule.materials.length > 0) {
        if (rule.condition === 'allOf') {
          materialMatch = rule.materials.every(material => materialNames.includes(material));
        } else { // anyOf
          materialMatch = rule.materials.some(material => materialNames.includes(material));
        }
        logger.info('Évaluation correspondance matériaux', {
          metadata: {
            service: 'OCRService',
            operation: 'evaluateRule',
            ruleId: rule.id,
            requiredMaterials: rule.materials,
            detectedMaterials: materialNames,
            match: materialMatch
          }
        });
      } else {
        materialMatch = true; // Pas de contrainte matériau
      }
      
      // Évaluer correspondance critères spéciaux
      if (rule.specialCriteria && rule.specialCriteria.length > 0) {
        const criteriaMatches = rule.specialCriteria.map(criterion => {
          // Mapping des noms de critères
          const criteriaMap: Record<string, string> = {
            'batiment_passif': 'batimentPassif',
            'isolation_renforcee': 'isolationRenforcee',
            'precadres': 'precadres',
            'volets_exterieurs': 'voletsExterieurs',
            'coupe_feu': 'coupeFeu'
          };
          const mappedCriterion = criteriaMap[criterion] || criterion;
          return Boolean(specialCriteria[mappedCriterion]);
        });
        
        if (rule.condition === 'allOf') {
          specialCriteriaMatch = criteriaMatches.every(match => match);
        } else { // anyOf
          specialCriteriaMatch = criteriaMatches.some(match => match);
        }
        logger.info('Évaluation correspondance critères spéciaux', {
          metadata: {
            service: 'OCRService',
            operation: 'evaluateRule',
            ruleId: rule.id,
            requiredCriteria: rule.specialCriteria,
            match: specialCriteriaMatch
          }
        });
      } else {
        specialCriteriaMatch = true; // Pas de contrainte critères spéciaux
      }
      
      // Condition globale selon allOf/anyOf de la règle
      let finalMatch = false;
      if (rule.condition === 'allOf') {
        finalMatch = materialMatch && specialCriteriaMatch;
      } else { // anyOf
        finalMatch = materialMatch || specialCriteriaMatch;
      }
      
      logger.info('Résultat évaluation règle', {
        metadata: {
          service: 'OCRService',
          operation: 'evaluateRule',
          ruleId: rule.id,
          materialMatch: materialMatch,
          specialCriteriaMatch: specialCriteriaMatch,
          condition: rule.condition,
          finalMatch: finalMatch
        }
      });
      return finalMatch;
      
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
      return false;
    }
  }

  /**
   * Rassemble les preuves pour une règle déclenchée
   */
  private gatherRuleEvidences(rule: MaterialColorAlertRule, fields: AOFieldsExtracted): string[] {
    const evidences: string[] = [];
    
    // Ajouter preuves matériaux
    if (rule.materials && fields.materials) {
      for (const material of fields.materials) {
        if (rule.materials.includes(material.material)) {
          evidences.push(...material.evidences);
        }
      }
    }
    
    // Ajouter preuves couleurs
    if (rule.ralCodes && fields.colors) {
      for (const color of fields.colors) {
        if (color.ralCode && rule.ralCodes.includes(color.ralCode)) {
          evidences.push(...color.evidences);
        }
      }
    }
    
    return evidences;
  }

  // ========================================
  // MÉTHODES UTILITAIRES POUR DEVIS FOURNISSEURS
  // ========================================

  /**
   * Traitement OCR pour devis fournisseurs (PDFs scannés)
   */
  private async processSupplierQuoteWithOCR(pdfBuffer: Buffer): Promise<{ extractedText: string; confidence: number }> {
    return withErrorHandling(
    async () => {

      logger.info('Initialisation Tesseract pour devis fournisseur', {
        metadata: {
          service: 'OCRService',
          operation: 'processSupplierQuoteWithOCR'
        }
      });
      await this.initialize();
      
      if (!this.tesseractWorker) {
        throw new AppError('Tesseract worker failed to initialize', 500);
      }
      
      // Pour le POC, utiliser des données simulées de devis
      logger.info('Mode POC: simulation OCR pour devis fournisseur', {
        metadata: {
          service: 'OCRService',
          operation: 'processSupplierQuoteWithOCR'
        }
      });
      const simulatedText = this.getSimulatedSupplierQuoteText();
      
      return {
        extractedText: simulatedText,
        confidence: 85
      };
      
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
      throw new AppError(`Échec OCR devis fournisseur: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  /**
   * Génère un devis fournisseur simulé pour le POC
   */
  private getSimulatedSupplierQuoteText(): string {
    return `
MENUISERIES MODERNE SARL
45 Rue des Artisans
62100 CALAIS
Tél: 03 21 85 47 52
Email: contact@menuiseries-moderne.fr
SIRET: 89234567891234

DEVIS N° DEV-2025-0342
Date: 15/03/2025
Valable jusqu'au: 15/06/2025

DESTINATAIRE:
BAILLEUR SOCIAL HABITAT 62
12 Rue de la République
62100 CALAIS

OBJET: Menuiseries PVC pour Résidence Les Terrasses

DÉTAIL DU DEVIS:

1. FENÊTRES PVC DOUBLE VITRAGE
   - 150 fenêtres 120x140 cm
   - PVC blanc RAL 9016
   - Double vitrage 4/16/4 argon
   - Coefficient Uw = 1.2 W/m².K
   - Classement AEV: A*4 E*9A V*A2
   Prix unitaire: 320,00 €
   Total: 48 000,00 € HT

2. PORTES-FENÊTRES PVC
   - 50 portes-fenêtres 215x140 cm
   - PVC blanc RAL 9016
   - Double vitrage renforcé
   - Seuil PMR inclus
   Prix unitaire: 580,00 €
   Total: 29 000,00 € HT

3. POSE ET INSTALLATION
   - Dépose ancienne menuiserie
   - Pose avec étanchéité
   - Finitions périphériques
   - Main d'œuvre qualifiée
   Prix forfaitaire: 15 600,00 € HT

RÉCAPITULATIF:
Sous-total HT: 92 600,00 €
TVA 20%: 18 520,00 €
TOTAL TTC: 111 120,00 €

CONDITIONS:
- Délai de livraison: 8 semaines
- Délai de fabrication: 6 semaines
- Installation: 2 semaines
- Garantie: 10 ans pièces et main d'œuvre
- Paiement: 30% à la commande, 40% à la livraison, 30% à la réception
- Validité du devis: 3 mois

CERTIFICATIONS:
- Marquage CE conforme
- Certification ACOTHERM TH11
- Label CEKAL
- Qualification RGE

Contact commercial:
M. BERNARD Laurent
Tél: 06 12 34 56 78
l.bernard@menuiseries-moderne.fr
`;
  }

  /**
   * Parse les champs spécifiques d'un devis fournisseur
   */
  private async parseSupplierQuoteFields(text: string): Promise<SupplierQuoteFields> {
    logger.info('Parsing champs devis fournisseur', {
      metadata: {
        service: 'OCRService',
        operation: 'parseSupplierQuoteFields'
      }
    });
    
    const fields: SupplierQuoteFields = {
      extractionMethod: 'native-text',
      processingErrors: []
    };

    return withErrorHandling(
    async () => {

      // Extraction des informations fournisseur
      fields.supplierName = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.supplierName);
      fields.supplierAddress = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.supplierAddress);
      fields.supplierContact = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.supplierContact);
      fields.supplierEmail = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.supplierEmail);
      fields.supplierPhone = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.supplierPhone);
      fields.supplierSiret = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.supplierSiret);

      // Extraction référence et dates
      fields.quoteReference = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.quoteReference);
      fields.quoteDate = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.quoteDate);
      fields.validityDate = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.validityDate);
      
      const validityPeriodStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.validityPeriod);
      if (validityPeriodStr) {
        fields.validityPeriod = parseInt(validityPeriodStr);
      }

      // Extraction montants financiers
      const totalHTStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.totalAmountHT);
      if (totalHTStr) {
        fields.totalAmountHT = this.parseAmount(totalHTStr);
      }
      
      const totalTTCStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.totalAmountTTC);
      if (totalTTCStr) {
        fields.totalAmountTTC = this.parseAmount(totalTTCStr);
      }
      
      const vatRateStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.vatRate);
      if (vatRateStr) {
        fields.vatRate = parseFloat(vatRateStr.replace(',', '.'));
      }
      
      fields.currency = 'EUR'; // Par défaut pour la France

      // Extraction délais
      const deliveryDelayStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.deliveryDelay);
      if (deliveryDelayStr) {
        fields.deliveryDelay = this.parseDelay(deliveryDelayStr);
      }
      
      const productionDelayStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.productionDelay);
      if (productionDelayStr) {
        fields.productionDelay = this.parseDelay(productionDelayStr);
      }

      // Extraction conditions commerciales
      fields.paymentTerms = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.paymentTerms);
      fields.warranty = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.warranty);
      
      const warrantyPeriodStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.warrantyPeriod);
      if (warrantyPeriodStr) {
        fields.warrantyPeriod = parseInt(warrantyPeriodStr);
      }

      // Extraction performance énergétique
      const uwStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.thermalUw);
      const aevStr = this.extractFieldValue(text, SUPPLIER_QUOTE_PATTERNS.aevClassification);
      
      if (uwStr || aevStr) {
        fields.thermalPerformance = {
          uw: uwStr ? parseFloat(uwStr.replace(',', '.')) : undefined,
          aev: aevStr || undefined,
          other: {}
        };
      }

      // Extraction certifications
      fields.certifications = this.extractMultipleValues(text, SUPPLIER_QUOTE_PATTERNS.certifications);

      // Extraction lignes de devis
      fields.lineItems = this.extractLineItems(text);

      // Extraction matériaux et couleurs (réutilisation des patterns existants)
      const { materials, colors } = this.extractMaterialsAndColors(text);
      fields.materials = materials;
      fields.colors = colors;

      logger.info('Parsing devis terminé', {
        metadata: {
          service: 'OCRService',
          operation: 'parseSupplierQuoteFields',
          fieldsExtractedCount: Object.keys(fields).filter(k => fields[k as keyof SupplierQuoteFields] !== undefined).length
        }
      });
      
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
      fields.processingErrors = fields.processingErrors || [];
      fields.processingErrors.push(`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return fields;
  }

  /**
   * Extrait la valeur d'un champ avec patterns multiples
   * CORRECTION: Utilise safePatternMatch pour éviter persistance lastIndex
   */
  private extractFieldValue(text: string, patterns: RegExp[]): string | undefined {
    const match = this.safePatternMatch(text, patterns);
    if (match && match[1]) {
      return match[1].trim();
    }
    return undefined;
  }

  /**
   * Extrait plusieurs valeurs avec un pattern
   * CORRECTION: Utilise safePatternMatchAll pour éviter persistance lastIndex
   */
  private extractMultipleValues(text: string, patterns: RegExp[]): string[] {
    const values: string[] = [];
    const allMatches = this.safePatternMatchAll(text, patterns);
    
    for (const match of allMatches) {
      if (match[1]) {
        values.push(match[1].trim());
      } else if (match[0]) {
        values.push(match[0].trim());
      }
    }
    return Array.from(new Set(values)); // Déduplique
  }

  /**
   * Parse un montant monétaire
   */
  private parseAmount(amountStr: string): number {
    const cleanAmount = amountStr
      .replace(/[^\d,\.\s]/g, '') // Enlever tout sauf chiffres, virgules, points, espaces
      .replace(/\s/g, '') // Enlever espaces
      .replace(',', '.'); // Virgule -> point pour parsing
    
    return parseFloat(cleanAmount) || 0;
  }

  /**
   * Parse un délai (jours, semaines, mois)
   */
  private parseDelay(delayStr: string): number {
    const match = delayStr.match(/(\d+)\s*(jours?|semaines?|mois?)/i);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.includes('semaine')) {
      return value * 7; // Convertir en jours
    } else if (unit.includes('mois')) {
      return value * 30; // Approximation en jours
    }
    
    return value; // Déjà en jours
  }

  /**
   * Extrait les lignes de devis (produits/services)
   */
  private extractLineItems(text: string): SupplierQuoteLineItem[] {
    const lineItems: SupplierQuoteLineItem[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 10) continue; // Ignorer lignes trop courtes
      
      // Chercher les lignes avec quantité et prix
      // CORRECTION: Utilise safeMatch pour éviter persistance lastIndex
      const fullLineMatch = this.safeMatch(trimmedLine, LINE_ITEM_PATTERNS.fullLine);
      if (fullLineMatch) {
        const [, quantityStr, designation, priceStr] = fullLineMatch;
        
        lineItems.push({
          designation: designation.trim(),
          quantity: parseFloat(quantityStr.replace(',', '.')),
          unitPrice: this.parseAmount(priceStr),
          totalPrice: parseFloat(quantityStr.replace(',', '.')) * this.parseAmount(priceStr)
        });
      }
      
      // Chercher aussi les désignations sans quantité explicite
      // CORRECTION: Utilise safeMatch pour éviter persistance lastIndex
      const designationMatch = this.safeMatch(trimmedLine, LINE_ITEM_PATTERNS.designation);
      const priceMatch = this.safeMatch(trimmedLine, LINE_ITEM_PATTERNS.prices);
      
      if (designationMatch && priceMatch && !fullLineMatch) {
        lineItems.push({
          designation: designationMatch[1].trim(),
          totalPrice: this.parseAmount(priceMatch[0])
        });
      }
    }
    
    logger.info('Extraction lignes devis terminée', {
      metadata: {
        service: 'OCRService',
        operation: 'extractLineItems',
        lineItemsCount: lineItems.length
      }
    });
    return lineItems;
  }

  /**
   * Calcule le score de qualité du devis (0-100)
   */
  private calculateQuoteQualityScore(fields: SupplierQuoteFields, fullText: string): number {
    let score = 0;
    let maxScore = 0;
    
    // Score pour informations fournisseur (20 points)
    maxScore += 20;
    if (fields.supplierName) score += 5;
    if (fields.supplierEmail || fields.supplierPhone) score += 5;
    if (fields.supplierAddress) score += 5;
    if (fields.supplierSiret) score += 5;
    
    // Score pour référence et dates (15 points)
    maxScore += 15;
    if (fields.quoteReference) score += 5;
    if (fields.quoteDate) score += 5;
    if (fields.validityDate || fields.validityPeriod) score += 5;
    
    // Score pour montants (25 points)
    maxScore += 25;
    if (fields.totalAmountHT || fields.totalAmountTTC) score += 10;
    if (fields.vatRate) score += 5;
    if (fields.lineItems && fields.lineItems.length > 0) score += 10;
    
    // Score pour délais (15 points)
    maxScore += 15;
    if (fields.deliveryDelay) score += 8;
    if (fields.productionDelay) score += 7;
    
    // Score pour conditions commerciales (15 points)
    maxScore += 15;
    if (fields.paymentTerms) score += 8;
    if (fields.warranty || fields.warrantyPeriod) score += 7;
    
    // Score pour spécifications techniques (10 points)
    maxScore += 10;
    if (fields.thermalPerformance) score += 5;
    if (fields.certifications && fields.certifications.length > 0) score += 5;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Calcule le score de complétude (0-100)
   */
  private calculateCompletenessScore(fields: SupplierQuoteFields): number {
    const requiredFields = [
      'supplierName', 'quoteReference', 'totalAmountHT', 'totalAmountTTC',
      'deliveryDelay', 'paymentTerms', 'lineItems'
    ];
    
    const presentFields = requiredFields.filter(field => {
      const value = fields[field as keyof SupplierQuoteFields];
      return value !== undefined && value !== null && 
             (Array.isArray(value) ? value.length > 0 : true);
    });
    
    return Math.round((presentFields.length / requiredFields.length) * 100);
  }

  /**
   * Sauvegarde l'analyse du devis dans la base de données
   */
  private async saveSupplierQuoteAnalysis(data: {
    documentId: string;
    sessionId: string;
    aoLotId: string;
    extractedText: string;
    processedFields: SupplierQuoteFields;
    confidence: number;
    qualityScore: number;
    completenessScore: number;
    extractionMethod: string;
  }): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Sauvegarde analyse devis', {
        metadata: {
          service: 'OCRService',
          operation: 'saveSupplierQuoteAnalysis',
          documentId: data.documentId
        }
      });
      
      const analysisData = {
        documentId: data.documentId,
        sessionId: data.sessionId,
        aoLotId: data.aoLotId,
        status: 'completed' as const,
        analyzedAt: new Date(),
        analysisEngine: 'tesseract',
        confidence: data.confidence.toString(),
        
        // Données extraites structurées
        extractedPrices: {
          totalAmountHT: data.processedFields.totalAmountHT,
          totalAmountTTC: data.processedFields.totalAmountTTC,
          vatRate: data.processedFields.vatRate,
          currency: data.processedFields.currency,
          lineItems: data.processedFields.lineItems
        },
        totalAmountHT: data.processedFields.totalAmountHT?.toString() || null,
        totalAmountTTC: data.processedFields.totalAmountTTC?.toString() || null,
        vatRate: data.processedFields.vatRate?.toString() || null,
        currency: data.processedFields.currency || 'EUR',
        
        supplierInfo: {
          name: data.processedFields.supplierName,
          address: data.processedFields.supplierAddress,
          contact: data.processedFields.supplierContact,
          email: data.processedFields.supplierEmail,
          phone: data.processedFields.supplierPhone,
          siret: data.processedFields.supplierSiret
        },
        
        lineItems: data.processedFields.lineItems || [],
        materials: data.processedFields.materials || [],
        
        deliveryDelay: data.processedFields.deliveryDelay,
        paymentTerms: data.processedFields.paymentTerms,
        validityPeriod: data.processedFields.validityPeriod,
        
        rawOcrText: data.extractedText,
        extractedData: data.processedFields,
        
        qualityScore: data.qualityScore.toString(),
        completenessScore: data.completenessScore.toString(),
        requiresManualReview: data.qualityScore < 70 || data.completenessScore < 60
      };
      
      await storage.createSupplierQuoteAnalysis(analysisData);
      
      // Mettre à jour le statut du document
      await storage.updateSupplierDocument(data.documentId, {
        status: 'analyzed',
        validatedAt: new Date()
      });
      
      logger.info('Analyse devis sauvegardée', {
        metadata: {
          service: 'OCRService',
          operation: 'saveSupplierQuoteAnalysis',
          documentId: data.documentId
        }
      });
      
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
      throw error;
    }
  }

  /**
   * Sauvegarde une erreur d'analyse
   */
  private async saveSupplierQuoteAnalysisError(
    documentId: string, 
    sessionId: string, 
    aoLotId: string, 
    error: any
  ): Promise<void> {
    return withErrorHandling(
    async () => {

      const analysisData = {
        documentId,
        sessionId,
        aoLotId,
        status: 'failed' as const,
        analysisEngine: 'tesseract',
        confidence: '0',
        errorDetails: {
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        },
        requiresManualReview: true
      };
      
      await storage.createSupplierQuoteAnalysis(analysisData);
      
      // Mettre à jour le statut du document en erreur
      await storage.updateSupplierDocument(documentId, {
        status: 'rejected'
      });
      
      logger.info('Erreur analyse sauvegardée', {
        metadata: {
          service: 'OCRService',
          operation: 'saveSupplierQuoteAnalysisError',
          documentId: documentId
        }
      });
      
    
    },
    {
      operation: 'async',
      service: 'ocrService',
      metadata: {}
    }
  );
      });
    }
  }
}

export const ocrService = new OCRService();