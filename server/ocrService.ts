import { createWorker } from 'tesseract.js';
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
    console.log('[OCR] Initializing pdf-parse module...');
    
    // Import spécial pour éviter les problèmes de fichiers de test
    const pdfParseImport = await import('pdf-parse');
    pdfParseModule = pdfParseImport.default || pdfParseImport;
    
    // Test simple pour vérifier que le module fonctionne
    if (typeof pdfParseModule !== 'function') {
      throw new Error('pdf-parse module not properly imported');
    }
    
    console.log('[OCR] pdf-parse module initialized successfully');
  } catch (error) {
    console.error('[OCR] Failed to initialize pdf-parse:', error);
    console.log('[OCR] Attempting fallback initialization...');
    
    try {
      // Fallback: essayer d'importer différemment
      const { default: pdfParse } = await import('pdf-parse');
      pdfParseModule = pdfParse;
      console.log('[OCR] pdf-parse fallback initialization successful');
    } catch (fallbackError) {
      console.error('[OCR] Fallback initialization also failed:', fallbackError);
      // Ne pas lever d'erreur ici, continuer avec OCR uniquement
      pdfParseModule = null;
      console.log('[OCR] Will continue with OCR-only processing');
    }
  } finally {
    isInitializingPdfParse = false;
  }
};

interface OCRResult {
  extractedText: string;
  confidence: number;
  processedFields: AOFieldsExtracted;
  technicalScoring?: TechnicalScoringResult; // Résultat du scoring technique
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
  rawData: any;
}

export interface SupplierQuoteFields {
  // Informations fournisseur
  supplierName?: string;
  supplierAddress?: string;
  supplierContact?: string;
  supplierEmail?: string;
  supplierPhone?: string;
  supplierSiret?: string;
  
  // Référence et dates du devis
  quoteReference?: string;
  quoteDate?: string;
  validityDate?: string;
  validityPeriod?: number; // en jours
  
  // Montants financiers
  totalAmountHT?: number;
  totalAmountTTC?: number;
  vatRate?: number;
  currency?: string;
  
  // Détails des lignes de devis
  lineItems?: SupplierQuoteLineItem[];
  
  // Délais et livraison
  deliveryDelay?: number; // en jours
  deliveryTerms?: string;
  productionDelay?: number; // en jours
  
  // Conditions commerciales
  paymentTerms?: string;
  paymentDelay?: number; // en jours
  warranty?: string;
  warrantyPeriod?: number; // en mois
  
  // Matériaux et spécifications techniques
  materials?: MaterialSpec[];
  colors?: ColorSpec[];
  technicalSpecs?: Record<string, any>;
  
  // Certifications et normes
  certifications?: string[];
  standards?: string[];
  
  // Performance énergétique (menuiserie)
  thermalPerformance?: {
    uw?: number; // coefficient thermique
    aev?: string; // classement air-eau-vent
    other?: Record<string, string>;
  };
  
  // Notes et commentaires
  notes?: string;
  specialConditions?: string[];
  
  // Métadonnées extraction
  extractionMethod: 'native-text' | 'ocr';
  processingErrors?: string[];
}

interface SupplierQuoteLineItem {
  designation: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalPrice?: number;
  materialType?: string;
  specifications?: string;
  reference?: string;
}

interface AOLot {
  numero: string;
  designation: string;
  type?: string;
  montantEstime?: string;
}

interface AOFieldsExtracted {
  // Informations générales
  reference?: string;
  intituleOperation?: string;
  client?: string;
  location?: string;
  
  // Dates
  dateRenduAO?: string;
  dateAcceptationAO?: string;
  demarragePrevu?: string;
  deadline?: string;
  dateOS?: string;
  delaiContractuel?: string;
  dateLimiteRemise?: string;
  
  // Maître d'ouvrage
  maitreOuvrage?: {
    nom?: string;
    adresse?: string;
    contact?: string;
    email?: string;
    telephone?: string;
  };
  maitreOuvrageNom?: string;
  maitreOuvrageAdresse?: string;
  maitreOuvrageContact?: string;
  maitreOuvrageEmail?: string;
  maitreOuvragePhone?: string;
  
  // Maître d'œuvre
  maitreOeuvre?: {
    nom?: string;
    contact?: string;
  };
  maitreOeuvreNom?: string;
  maitreOeuvreContact?: string;
  
  // Techniques
  lotConcerne?: string;
  menuiserieType?: string;
  montantEstime?: string;
  typeMarche?: string;
  
  // Lots détaillés
  lots?: AOLot[];
  
  // Source et contexte
  plateformeSource?: string;
  departement?: string;
  
  // Éléments techniques
  bureauEtudes?: string;
  bureauControle?: string;
  sps?: string;
  
  // Détection automatique des documents
  cctpDisponible?: boolean;
  plansDisponibles?: boolean;
  dpgfClientDisponible?: boolean;
  dceDisponible?: boolean;
  
  // Critères techniques spéciaux
  specialCriteria?: {
    batimentPassif: boolean;
    isolationRenforcee: boolean;
    precadres: boolean;
    voletsExterieurs: boolean;
    coupeFeu: boolean;
    evidences?: Record<string, string[]>; // extraits de texte correspondants
  };

  // Nouveaux champs matériaux et couleurs - PATTERNS AVANCÉS OCR
  materials?: MaterialSpec[];
  colors?: ColorSpec[];
}

// Patterns de reconnaissance pour les AO français (paramétrable)
const AO_PATTERNS: Record<string, RegExp[]> = {
  // Références d'AO
  reference: [
    /(?:appel d'offres?|ao|marché)\s*n?°?\s*:?\s*([a-z0-9\-_\/]+)/i,
    /référence\s*:?\s*([a-z0-9\-_\/]+)/i,
    /n°\s*([a-z0-9\-_\/]+)/i,
  ],
  
  // Dates (formats français)
  dates: [
    /(?:date de remise|remise des offres|échéance)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(?:date limite|limite de remise)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
  ],
  
  // Maître d'ouvrage
  maitreOuvrage: [
    /(?:maître d'ouvrage|maitre d'ouvrage|mo)\s*:?\s*([^\n]+)/i,
    /(?:pour le compte de|client)\s*:?\s*([^\n]+)/i,
  ],
  
  // Localisation
  location: [
    /(?:lieu|localisation|adresse|site)\s*:?\s*([^\n]+)/i,
    /(?:travaux à|réalisation à|sis)\s*([^\n]+)/i,
  ],
  
  // Montants
  montant: [
    /(?:montant|budget|estimation)\s*:?\s*([0-9\s]+)(?:€|\beuros?\b)/i,
    /([0-9\s]+)\s*(?:€|\beuros?\b)/g,
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
  
  // Contacts (emails, téléphones)
  contact: [
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    /(?:tél|téléphone|phone)\s*:?\s*([0-9\s\.\-\+]{10,})/i,
  ],
  
  // Lots (détection des sections de lots)
  lots: [
    /(?:lots?\s+concernés?|lots?\s*:)/i,
    /(?:lot\s+n?°?\s*\d+[\.\s:])/i,
    /(?:\d{1,2}[a-z]?\s*[:\-])/i,
  ],
  
  // Critères techniques spéciaux JLM
  batiment_passif: [
    /(b[âa]timent|maison|construction)\s+passif\w*/i,
    /passiv.?haus/i,
    /(?:norme|standard)\s+passif/i,
  ],

  isolation_renforcee: [
    /isolation\s+thermiq\w*\s+renforc\w*/i,
    /performances?\s+thermiq\w*\s+renforc\w*/i,
    /haute\s+performance\s+thermique/i,
    /(?:rt|re)\s*20\d{2}/i,
  ],

  precadres: [
    /pr[ée]-?cadres?/i,
    /pré-?cadre/i,
    /cadres?\s+d['']attente/i,
  ],

  volets_exterieurs: [
    /volets?\s+(ext[ée]rieurs?|roulants?|battants?)/i,
    /fermetures?\s+extérieures?/i,
    /brise-soleil\s+orientable|\bBSO\b/i,
    /persiennes?/i,
  ],

  coupe_feu: [
    /coupe[-\s]?feu/i,
    /\bEI\s?\d{2}\b/i,
    /pare[-\s]?flammes?/i,
    /résistance?\s+au\s+feu/i,
  ],
};

// ========================================
// PATTERNS POUR DEVIS FOURNISSEURS - EXTRACTION MÉTIER
// ========================================

// Patterns de reconnaissance pour les devis fournisseurs français
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
  
  aevClassification: [
    /(?:aev|a\*?\d+\s*e\*?\d+[a-z]?\s*v\*?[a-z]?\d+)/i,
  ],
  
  // Certifications
  certifications: [
    /(?:certifié|certification|norme|conforme)\s+([A-Z0-9\s\-]+)/i,
    /(?:CE|NF|CSTB|ACOTHERM|CEKAL)/g,
  ],
};

// Patterns pour détecter les lignes de devis
const LINE_ITEM_PATTERNS = {
  // Détection des lignes avec quantité et prix
  fullLine: /(\d+(?:[,\.]\d+)?)\s*(?:u|pcs?|m[²²]?|ml?)\s*[xX*]?\s*([^\d\n]+?)\s*((?:\d+(?:[,\.]\d+)?(?:\s*€)?|€\s*\d+(?:[,\.]\d+)?))/gi,
  
  // Détection des désignations de produits
  designation: /^[\s-]*(.+?)(?:\s*\d+[,\.]\d+\s*€|\s*€\s*\d+[,\.]\d+|$)/,
  
  // Détection quantité/unité
  quantityUnit: /(\d+(?:[,\.]\d+)?)\s*(u|pcs?|m[²²]?|ml?|kg|tonnes?)/i,
  
  // Détection prix unitaire et total
  prices: /((?:\d+(?:[,\.]\d+)?(?:\s*€)?|€\s*\d+(?:[,\.]\d+)?))/g,
  
  // Références produits
  reference: /(?:ref|référence|code)\s*:?\s*([A-Z0-9\-_]+)/i,
};

// ========================================
// PATTERNS MATÉRIAUX ET COULEURS - EXTRACTION AVANCÉE OCR
// ========================================

// Patterns matériaux étendus pour détection sophistiquée
const MATERIAL_PATTERNS: Record<string, RegExp> = {
  pvc: /\b(?:PVC|P\.?V\.?C\.?|chlorure de polyvinyle)\b/gi,
  bois: /\b(?:bois|chêne|hêtre|sapin|pin|frêne|érable|noyer|teck|iroko|douglas|mélèze|épicéa|châtaignier|orme|merisier)\b/gi,
  aluminium: /\b(?:aluminium|alu|dural|alliage d'aluminium)\b/gi,
  acier: /\b(?:acier|steel|métal|fer|inox|inoxydable|galvanisé|galva)\b/gi,
  composite: /\b(?:composite|fibre de verre|stratifié|résine|matériau composite|sandwich)\b/gi,
  mixte_bois_alu: /\b(?:mixte|bois.{0,20}alu|alu.{0,20}bois|hybride|bi-matière)\b/gi,
  inox: /\b(?:inox|inoxydable|stainless|acier inoxydable)\b/gi,
  galva: /\b(?:galva|galvanisé|zinc|électro-galvanisé)\b/gi,
};

// Patterns couleurs sophistiqués avec finitions
const COLOR_PATTERNS = {
  ralCodes: /\bRAL[\s-]?(\d{4})\b/gi,
  colorNames: /\b(?:blanc|noir|gris|anthracite|ivoire|beige|taupe|sable|bordeaux|vert|bleu|rouge|jaune|orange|marron|chêne doré|acajou|noyer|wengé|argent|bronze|cuivre|laiton)\b/gi,
  finishes: /\b(?:mat|matte?|satiné?|brillant|glossy|texturé?|sablé|anodisé|thermolaqué|laqué|plaxé|brossé|poli|grainé|martelé|structuré|lisse)\b/gi,
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
      console.log('[OCR] Initializing Tesseract worker...');
      
      this.tesseractWorker = await createWorker(['fra', 'eng']);
      await this.tesseractWorker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ.,!?;:()[]{}/@#€$%&*+-=_" ',
      });
      
      console.log('[OCR] Tesseract worker initialized successfully');
    } catch (error) {
      console.error('[OCR] Failed to initialize Tesseract worker:', error);
      this.tesseractWorker = null;
      throw new Error(`Failed to initialize Tesseract: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.log(`[OCR] Début analyse devis fournisseur - Document: ${documentId}`);
      
      // Initialiser les modules nécessaires
      await initializeModules();
      
      // Étape 1: Essayer d'extraire le texte natif du PDF
      console.log('[OCR] Tentative extraction texte natif...');
      const nativeText = await this.extractNativeText(pdfBuffer);
      
      let extractedText: string;
      let extractionMethod: 'native-text' | 'ocr';
      let confidence: number;
      
      if (nativeText && nativeText.length > 100) {
        // PDF contient du texte natif
        console.log('[OCR] PDF avec texte natif détecté');
        extractedText = nativeText;
        extractionMethod = 'native-text';
        confidence = 95;
      } else {
        // Fallback vers OCR pour PDFs scannés
        console.log('[OCR] Fallback vers OCR pour PDF scanné');
        const ocrResult = await this.processSupplierQuoteWithOCR(pdfBuffer);
        extractedText = ocrResult.extractedText;
        extractionMethod = 'ocr';
        confidence = ocrResult.confidence;
      }
      
      // Étape 2: Parser les champs spécifiques du devis
      console.log('[OCR] Analyse des champs du devis...');
      const processedFields = await this.parseSupplierQuoteFields(extractedText);
      processedFields.extractionMethod = extractionMethod;
      
      // Étape 3: Calculer les scores de qualité
      const qualityScore = this.calculateQuoteQualityScore(processedFields, extractedText);
      const completenessScore = this.calculateCompletenessScore(processedFields);
      
      // Étape 4: Sauvegarder dans la base de données
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
      
      console.log(`[OCR] ✅ Analyse devis terminée - Qualité: ${qualityScore}%, Complétude: ${completenessScore}%`);
      
      return {
        extractedText,
        confidence,
        processedFields,
        qualityScore,
        completenessScore,
        rawData: { 
          method: extractionMethod,
          documentId,
          sessionId,
          aoLotId 
        }
      };
      
    } catch (error) {
      console.error(`[OCR] ❌ Erreur lors de l'analyse du devis ${documentId}:`, error);
      
      // Sauvegarder l'erreur dans la base
      await this.saveSupplierQuoteAnalysisError(documentId, sessionId, aoLotId, error);
      
      throw error;
    }
  }

  // Méthode principale pour traiter un PDF (AO - existante)
  async processPDF(pdfBuffer: Buffer): Promise<OCRResult> {
    try {
      console.log('[OCR] Starting PDF processing...');
      
      // Initialiser les modules nécessaires en premier
      await initializeModules();
      
      // Étape 1: Essayer d'extraire le texte natif du PDF
      console.log('[OCR] Attempting native text extraction...');
      const nativeText = await this.extractNativeText(pdfBuffer);
      
      if (nativeText && nativeText.length > 100) {
        // PDF contient du texte natif
        console.log('[OCR] PDF with native text detected, using pdf-parse');
        const processedFields = await this.parseAOFields(nativeText);
        
        // Calculer le scoring technique après détection des critères
        const technicalScoring = await this.computeTechnicalScoring(processedFields.specialCriteria, processedFields.reference);
        
        return {
          extractedText: nativeText,
          confidence: 95,
          processedFields,
          technicalScoring,
          rawData: { method: 'native-text' }
        };
      }
      
      // Étape 2: Fallback vers OCR pour PDFs scannés
      console.log('[OCR] Scanned PDF detected, using OCR fallback');
      return await this.processWithOCR(pdfBuffer);
      
    } catch (error) {
      console.error('[OCR] Error processing PDF:', error);
      
      // Gestion d'erreur spécifique selon le type d'erreur
      if (error instanceof Error) {
        if (error.message.includes('pdf-parse')) {
          throw new Error(`Erreur lors du traitement OCR - Module PDF non initialisé: ${error.message}`);
        } else if (error.message.includes('Tesseract')) {
          throw new Error(`Erreur lors du traitement OCR - Échec initialisation Tesseract: ${error.message}`);
        } else if (error.message.includes('sharp')) {
          throw new Error(`Erreur lors du traitement OCR - Échec traitement image: ${error.message}`);
        } else {
          throw new Error(`Erreur lors du traitement OCR - Erreur générale: ${error.message}`);
        }
      } else {
        throw new Error(`Erreur lors du traitement OCR - Erreur inconnue: ${String(error)}`);
      }
    }
  }

  // Extraction de texte natif depuis PDF
  private async extractNativeText(pdfBuffer: Buffer): Promise<string> {
    try {
      if (!pdfParseModule) {
        console.log('[OCR] pdf-parse not initialized, calling initializeModules...');
        await initializeModules();
      }
      
      if (!pdfParseModule) {
        console.log('[OCR] pdf-parse module not available, skipping native text extraction');
        return ''; // Retourner chaîne vide pour déclencher le fallback OCR
      }
      
      console.log('[OCR] Extracting native text from PDF...');
      const data = await pdfParseModule(pdfBuffer);
      const extractedText = data.text || '';
      
      console.log(`[OCR] Native text extraction completed: ${extractedText.length} characters extracted`);
      return extractedText;
    } catch (error) {
      console.log('[OCR] Native text extraction failed, will use OCR fallback:', error instanceof Error ? error.message : 'Unknown error');
      return '';
    }
  }

  // OCR pour PDFs scannés - Version POC simplifiée
  private async processWithOCR(pdfBuffer: Buffer): Promise<OCRResult> {
    try {
      console.log('[OCR] Initializing Tesseract for OCR processing...');
      await this.initialize();
      
      if (!this.tesseractWorker) {
        throw new Error('Tesseract worker failed to initialize');
      }
      
      // Pour le POC, on simule l'extraction OCR avec des données de test
      // Dans un environnement de production, on utiliserait une vraie conversion PDF->Image->OCR
      console.log('[OCR] POC Mode: Using simulated OCR data for scanned PDFs');
      
      // Simuler les données extraites depuis le PDF scanné
      const fullText = this.getSimulatedOCRText();
      const processedFields = await this.parseAOFields(fullText);
      
      // Calculer le scoring technique après détection des critères
      const technicalScoring = await this.computeTechnicalScoring(processedFields.specialCriteria, processedFields.reference);
      
      console.log(`[OCR] OCR processing completed: ${fullText.length} characters simulated`);
      
      return {
        extractedText: fullText,
        confidence: 85, // Confiance simulée pour le POC
        processedFields,
        technicalScoring,
        rawData: { method: 'ocr-poc', note: 'POC simulation for scanned PDFs' }
      };
      
    } catch (error) {
      console.error('[OCR] OCR processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Tesseract')) {
        throw new Error(`Échec initialisation Tesseract - OCR indisponible: ${errorMessage}`);
      } else if (errorMessage.includes('sharp')) {
        throw new Error(`Échec preprocessing image pour OCR: ${errorMessage}`);
      } else {
        throw new Error(`Erreur OCR non spécifiée: ${errorMessage}`);
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
    try {
      return await sharp(imageBuffer)
        .grayscale()                    // Convertir en niveaux de gris
        .normalize()                    // Normaliser le contraste
        .sharpen()                      // Accentuer la netteté
        .threshold(128)                 // Binarisation
        .png({ quality: 100 })          // Compression sans perte
        .toBuffer();
    } catch (error) {
      console.warn('Image preprocessing failed, using original:', error);
      return imageBuffer;
    }
  }

  // Parser intelligent pour extraire les champs spécifiques aux AO
  // Extraction spécifique des lots depuis le texte
  private extractLots(text: string): AOLot[] {
    const lots: AOLot[] = [];
    
    // Patterns pour détecter différents formats de lots
    const lotPatterns = [
      // Format "Lot X: Description"
      /(?:lot\s+)?(\d+[a-z]?)\s*[:\-]\s*([^\n,]+)/gi,
      // Format "XX: Description" ou "XXa: Description"  
      /^(\d{1,3}[a-z]?)\s*[:\-]\s*([^\n,]+)/gim,
      // Format avec tirets ou points "07.1: Menuiseries extérieures"
      /(\d{1,2}\.?\d?[a-z]?)\s*[:\-]\s*([^\n,]+)/gi,
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

  // Détection des critères techniques spéciaux requis par JLM
  private detectSpecialCriteria(text: string): { batimentPassif: boolean; isolationRenforcee: boolean; precadres: boolean; voletsExterieurs: boolean; coupeFeu: boolean; evidences?: Record<string, string[]> } {
    const criteria = {
      batimentPassif: false,
      isolationRenforcee: false,
      precadres: false,
      voletsExterieurs: false,
      coupeFeu: false,
    };
    
    const evidences: Record<string, string[]> = {};
    
    // Scanner pour bâtiment passif
    if (AO_PATTERNS.batiment_passif) {
      for (const pattern of AO_PATTERNS.batiment_passif) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.batimentPassif = true;
          if (!evidences.batimentPassif) evidences.batimentPassif = [];
          evidences.batimentPassif.push(matches[0]);
        }
      }
    }
    
    // Scanner pour isolation thermique renforcée
    if (AO_PATTERNS.isolation_renforcee) {
      for (const pattern of AO_PATTERNS.isolation_renforcee) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.isolationRenforcee = true;
          if (!evidences.isolationRenforcee) evidences.isolationRenforcee = [];
          evidences.isolationRenforcee.push(matches[0]);
        }
      }
    }
    
    // Scanner pour précadres
    if (AO_PATTERNS.precadres) {
      for (const pattern of AO_PATTERNS.precadres) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.precadres = true;
          if (!evidences.precadres) evidences.precadres = [];
          evidences.precadres.push(matches[0]);
        }
      }
    }
    
    // Scanner pour volets extérieurs
    if (AO_PATTERNS.volets_exterieurs) {
      for (const pattern of AO_PATTERNS.volets_exterieurs) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.voletsExterieurs = true;
          if (!evidences.voletsExterieurs) evidences.voletsExterieurs = [];
          evidences.voletsExterieurs.push(matches[0]);
        }
      }
    }
    
    // Scanner pour coupe-feu
    if (AO_PATTERNS.coupe_feu) {
      for (const pattern of AO_PATTERNS.coupe_feu) {
        const matches = text.match(pattern);
        if (matches) {
          criteria.coupeFeu = true;
          if (!evidences.coupeFeu) evidences.coupeFeu = [];
          evidences.coupeFeu.push(matches[0]);
        }
      }
    }
    
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
    console.log('[OCR] Extraction matériaux et couleurs...');
    const { materials, colors } = this.extractMaterialsAndColors(text);
    fields.materials = materials;
    fields.colors = colors;
    
    console.log(`[OCR] Extraction terminée: ${materials.length} matériaux, ${colors.length} couleurs détectés`);
    
    // Évaluation des règles matériaux-couleurs (après tous les champs extraits)
    try {
      await this.evaluateMaterialColorRules(fields, text);
    } catch (error) {
      console.error('[OCR] Erreur lors de l\'évaluation des règles matériaux-couleurs:', error);
    }
    
    // CORRECTION BLOCKER 2: Calculer et inclure technicalScoring
    const technicalScoring = await this.computeTechnicalScoring(fields.specialCriteria, fields.reference);
    
    // GAP CRITIQUE 1: Publication EventBus avec métadonnées complètes pour les tests d'intégration
    if (technicalScoring?.shouldAlert) {
      try {
        const alertData = {
          aoId: fields.reference || 'unknown',
          aoReference: fields.reference || 'unknown',
          score: technicalScoring.score,
          triggeredCriteria: technicalScoring.triggeredCriteria,
          category: 'technical_scoring',
          severity: technicalScoring.score > 80 ? 'critical' : 'warning',
          affectedQueryKeys: ['/api/technical-alerts', '/api/aos'],
          metadata: {
            detectedMaterials: (fields.materials || []).map(m => m.material),
            alertRules: await this.getTriggeredAlertRules(fields.materials, fields.specialCriteria),
            evidences: fields.specialCriteria?.evidences,
            scoreDetails: technicalScoring.details,
            timestamp: new Date().toISOString(),
            source: 'OCR-parseAOFields',
            confidence: 95
          }
        };
        
        console.log(`[OCR] Publication alerte technique pour ${alertData.aoReference}, score: ${alertData.score}`);
        eventBus.publishTechnicalAlert(alertData);
        
        console.log(`[OCR] ✅ Alerte technique publiée via EventBus depuis parseAOFields pour AO ${fields.reference}`);
      } catch (error) {
        console.error(`[OCR] ❌ Erreur lors de la publication de l'alerte technique depuis parseAOFields:`, error);
      }
    }
    
    return {
      ...fields,
      technicalScoring
    };
  }

  // Méthode async pour obtenir les règles d'alerte déclenchées depuis storage
  private async getTriggeredAlertRules(
    materials: MaterialSpec[] = [],
    specialCriteria: Record<string, boolean> = {}
  ): Promise<string[]> {
    try {
      const rules = await storage.getMaterialColorRules();
      const triggeredRules: string[] = [];
      
      console.log(`[OCR] Évaluation de ${rules.length} règles d'alerte depuis storage`);
      
      for (const rule of rules) {
        const isTriggered = await this.evaluateAlertRule(rule, materials, specialCriteria);
        if (isTriggered) {
          triggeredRules.push(rule.id);
          console.log(`[OCR] ✅ Règle déclenchée: ${rule.id} (${rule.severity})`);
        }
      }
      
      console.log(`[OCR] Règles d'alerte déclenchées: ${triggeredRules.join(', ') || 'aucune'}`);
      return triggeredRules;
      
    } catch (error) {
      console.warn('[OCR] Error fetching material color rules:', error);
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
    try {
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
        console.log(`[OCR] Règle ${rule.id} déclenchée:`, {
          materialMatch,
          specialCriteriaMatch,
          condition: rule.condition,
          severity: rule.severity
        });
      }
      
      return finalMatch;
      
    } catch (error) {
      console.error(`[OCR] Erreur lors de l'évaluation de la règle ${rule.id}:`, error);
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
    
    console.log('[OCR] Utilisation des règles par défaut (fallback)');
    
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
    
    console.log(`[OCR] Règles par défaut déclenchées: ${triggeredRules.join(', ') || 'aucune'}`);
    return triggeredRules;
  }

  // Convertir les dates en format ISO
  private parseDate(dateStr: string): string {
    try {
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
    } catch (error) {
      console.warn('Date parsing failed:', dateStr);
    }
    
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
      console.log('[OCR] Aucun critère spécial détecté - pas de scoring technique');
      return undefined;
    }

    try {
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
      console.log('[OCR] Chargement de la configuration scoring depuis storage...');
      const config = await storage.getScoringConfig();
      console.log('[OCR] Configuration scoring chargée:', config);

      // Calculer le scoring avec la configuration utilisateur (au lieu de la config par défaut)
      const result = ScoringService.compute(criteriaForScoring, config);
      
      console.log(`[OCR] Scoring technique calculé:
        - Score total: ${result.totalScore}
        - Critères déclenchés: ${result.triggeredCriteria.join(', ') || 'aucun'}
        - Alerte: ${result.shouldAlert ? 'OUI 🚨' : 'NON'}
        - Détails: ${JSON.stringify(result.details)}`);

      // Émettre une alerte technique si le seuil est dépassé
      if (result.shouldAlert && aoReference) {
        console.log(`[OCR] 🚨 ALERTE TECHNIQUE déclenchée pour AO ${aoReference} - Score: ${result.totalScore}`);
        
        try {
          eventBus.publishTechnicalAlert({
            aoReference,
            score: result.totalScore,
            triggeredCriteria: result.triggeredCriteria,
            metadata: {
              evidences: specialCriteria.evidences,
              scoreDetails: result.details,
              timestamp: new Date().toISOString(),
              source: 'OCR',
              confidence: 95 // Confiance OCR
            }
          });
          
          console.log(`[OCR] ✅ Alerte technique publiée via EventBus pour AO ${aoReference}`);
        } catch (error) {
          console.error(`[OCR] ❌ Erreur lors de la publication de l'alerte technique:`, error);
        }
      }

      return result;
    } catch (error) {
      console.error('[OCR] Erreur lors du calcul du scoring technique:', error);
      return undefined;
    }
  }

  // ========================================
  // EXTRACTION MATÉRIAUX ET COULEURS - PATTERNS AVANCÉS OCR
  // ========================================

  /**
   * Extrait les matériaux et couleurs avec liaison contextuelle sophistiquée
   */
  private extractMaterialsAndColors(text: string): { materials: MaterialSpec[]; colors: ColorSpec[] } {
    console.log('[OCR] Début extraction matériaux et couleurs...');
    
    const materials: MaterialSpec[] = [];
    const colors: ColorSpec[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const context = [
        lines[i-1] || '',
        line,
        lines[i+1] || ''
      ].join(' ');
      
      // Détecter matériaux avec contexte couleur
      // CORRECTION: Utilise safeMatch pour éviter persistance lastIndex
      for (const [materialKey, pattern] of Object.entries(MATERIAL_PATTERNS)) {
        const matches = this.safeMatch(line, pattern);
        if (matches) {
          // Chercher couleurs dans fenêtre contextuelle (±150 chars)
          const contextStart = Math.max(0, context.indexOf(line) - 150);
          const contextEnd = context.indexOf(line) + line.length + 150;
          const windowText = context.substring(contextStart, contextEnd);
          
          const associatedColor = this.extractColorFromWindow(windowText);
          
          materials.push({
            material: materialKey as any,
            color: associatedColor,
            evidences: matches,
            confidence: this.calculateMaterialConfidence(line, matches)
          });
          
          console.log(`[OCR] Matériau détecté: ${materialKey}, preuves: ${matches.join(', ')}`);
        }
      }
      
      // Détecter couleurs globales RAL
      // CORRECTION: Utilise safeMatchAll pour éviter persistance lastIndex
      const ralMatches = this.safeMatchAll(line, COLOR_PATTERNS.ralCodes);
      for (const match of ralMatches) {
        const ralCode = match[1];
        const associatedFinish = this.extractFinishFromContext(context);
        
        colors.push({
          ralCode,
          name: this.getRalColorName(ralCode),
          finish: associatedFinish,
          evidences: [match[0]]
        });
        
        console.log(`[OCR] Couleur RAL détectée: ${ralCode}, preuve: ${match[0]}`);
      }
      
      // Détecter couleurs par nom
      // CORRECTION: Utilise safeMatchAll pour éviter persistance lastIndex
      const colorNameMatches = this.safeMatchAll(line, COLOR_PATTERNS.colorNames);
      for (const match of colorNameMatches) {
        const colorName = match[0];
        const associatedFinish = this.extractFinishFromContext(context);
        
        colors.push({
          name: colorName,
          finish: associatedFinish,
          evidences: [match[0]]
        });
        
        console.log(`[OCR] Couleur nommée détectée: ${colorName}, preuve: ${match[0]}`);
      }
    }
    
    const dedupedMaterials = this.deduplicateMaterials(materials);
    const dedupedColors = this.deduplicateColors(colors);
    
    console.log(`[OCR] Extraction terminée: ${dedupedMaterials.length} matériaux, ${dedupedColors.length} couleurs`);
    
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
   * Extrait une finition depuis le contexte
   */
  private extractFinishFromContext(context: string): any {
    // CORRECTION: Utilise safeMatch pour éviter persistance lastIndex
    const finishMatch = this.safeMatch(context, COLOR_PATTERNS.finishes);
    if (finishMatch) {
      const finish = finishMatch[0].toLowerCase();
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
      return finishMapping[finish] || undefined;
    }
    return undefined;
  }

  /**
   * Calcule la confiance de détection d'un matériau
   */
  private calculateMaterialConfidence(line: string, matches: RegExpMatchArray): number {
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
    try {
      console.log('[OCR] Évaluation des règles matériaux-couleurs...');
      console.log('[OCR] DEBUG: storage object type:', typeof storage);
      console.log('[OCR] DEBUG: storage.getMaterialColorRules function exists:', typeof storage.getMaterialColorRules === 'function');
      
      const rules = await storage.getMaterialColorRules();
      console.log(`[OCR] DEBUG: Rules retrieved:`, rules);
      console.log(`[OCR] ${rules?.length || 0} règles à évaluer`);
      
      for (const rule of rules) {
        const triggered = this.evaluateRule(rule, processedFields, fullText);
        
        if (triggered) {
          console.log(`[OCR] 🚨 RÈGLE DÉCLENCHÉE: ${rule.message}`);
          
          // Publier alerte technique via EventBus
          try {
            eventBus.publishTechnicalAlert({
              category: 'material_color',
              severity: rule.severity,
              message: rule.message,
              aoId: processedFields.reference || 'unknown',
              aoReference: processedFields.reference || 'unknown',
              score: rule.severity === 'critical' ? 95 : (rule.severity === 'warning' ? 75 : 50),
              triggeredCriteria: [`Rule: ${rule.id}`],
              evidences: this.gatherRuleEvidences(rule, processedFields),
              affectedQueryKeys: ['/api/aos', '/api/technical-alerts'],
              metadata: {
                detectedMaterials: (processedFields.materials || []).map(m => m.material),
                alertRules: [rule.id],
                evidences: this.gatherRuleEvidences(rule, processedFields),
                timestamp: new Date().toISOString(),
                source: 'OCR-evaluateMaterialColorRules',
                confidence: 95
              }
            });
            
            console.log(`[OCR] ✅ Alerte matériau-couleur publiée: ${rule.id}`);
          } catch (eventError) {
            console.error(`[OCR] ❌ Erreur publication alerte matériau-couleur:`, eventError);
          }
        }
      }
    } catch (error) {
      console.error('[OCR] Erreur lors de l\'évaluation des règles matériaux-couleurs:', error);
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
    console.log(`[OCR] Évaluation règle complète: ${rule.id}`);
    
    try {
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
        console.log(`[OCR] Matériaux - requis: ${rule.materials}, détectés: ${materialNames}, match: ${materialMatch}`);
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
        console.log(`[OCR] Critères spéciaux - requis: ${rule.specialCriteria}, matches: ${criteriaMatches}, result: ${specialCriteriaMatch}`);
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
      
      console.log(`[OCR] Règle ${rule.id}: matériaux=${materialMatch}, critères=${specialCriteriaMatch}, condition=${rule.condition}, résultat=${finalMatch}`);
      return finalMatch;
      
    } catch (error) {
      console.error(`[OCR] Erreur lors de l'évaluation de la règle ${rule.id}:`, error);
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
    try {
      console.log('[OCR] Initialisation Tesseract pour devis fournisseur...');
      await this.initialize();
      
      if (!this.tesseractWorker) {
        throw new Error('Tesseract worker failed to initialize');
      }
      
      // Pour le POC, utiliser des données simulées de devis
      console.log('[OCR] Mode POC: Simulation OCR pour devis fournisseur');
      const simulatedText = this.getSimulatedSupplierQuoteText();
      
      return {
        extractedText: simulatedText,
        confidence: 85
      };
      
    } catch (error) {
      console.error('[OCR] Erreur traitement OCR devis:', error);
      throw new Error(`Échec OCR devis fournisseur: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.log('[OCR] Parsing des champs du devis fournisseur...');
    
    const fields: SupplierQuoteFields = {
      extractionMethod: 'native-text',
      processingErrors: []
    };

    try {
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

      console.log(`[OCR] Parsing terminé - ${Object.keys(fields).filter(k => fields[k as keyof SupplierQuoteFields] !== undefined).length} champs extraits`);
      
    } catch (error) {
      console.error('[OCR] Erreur lors du parsing:', error);
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
    return [...new Set(values)]; // Déduplique
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
    
    console.log(`[OCR] ${lineItems.length} lignes de devis extraites`);
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
    try {
      console.log(`[OCR] Sauvegarde analyse devis ${data.documentId}...`);
      
      const analysisData = {
        documentId: data.documentId,
        sessionId: data.sessionId,
        aoLotId: data.aoLotId,
        status: 'completed' as const,
        analyzedAt: new Date(),
        analysisEngine: 'tesseract',
        confidence: data.confidence,
        
        // Données extraites structurées
        extractedPrices: {
          totalAmountHT: data.processedFields.totalAmountHT,
          totalAmountTTC: data.processedFields.totalAmountTTC,
          vatRate: data.processedFields.vatRate,
          currency: data.processedFields.currency,
          lineItems: data.processedFields.lineItems
        },
        totalAmountHT: data.processedFields.totalAmountHT,
        totalAmountTTC: data.processedFields.totalAmountTTC,
        vatRate: data.processedFields.vatRate,
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
        
        qualityScore: data.qualityScore,
        completenessScore: data.completenessScore,
        requiresManualReview: data.qualityScore < 70 || data.completenessScore < 60
      };
      
      await storage.createSupplierQuoteAnalysis(analysisData);
      
      // Mettre à jour le statut du document
      await storage.updateSupplierDocument(data.documentId, {
        status: 'analyzed',
        validatedAt: new Date()
      });
      
      console.log(`[OCR] ✅ Analyse sauvegardée pour ${data.documentId}`);
      
    } catch (error) {
      console.error(`[OCR] ❌ Erreur sauvegarde analyse ${data.documentId}:`, error);
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
    try {
      const analysisData = {
        documentId,
        sessionId,
        aoLotId,
        status: 'failed' as const,
        analysisEngine: 'tesseract',
        confidence: 0,
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
      
      console.log(`[OCR] Erreur d'analyse sauvegardée pour ${documentId}`);
      
    } catch (saveError) {
      console.error(`[OCR] Erreur lors de la sauvegarde d'erreur pour ${documentId}:`, saveError);
    }
  }
}

export const ocrService = new OCRService();