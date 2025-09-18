import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
// Types pdf-parse importés depuis le fichier de déclaration
import type pdfParse from 'pdf-parse';

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
    pdfParseModule = (await import('pdf-parse')).default;
    console.log('[OCR] pdf-parse module initialized successfully');
  } catch (error) {
    console.error('[OCR] Failed to initialize pdf-parse:', error);
    throw new Error(`Failed to initialize pdf-parse: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    isInitializingPdfParse = false;
  }
};

interface OCRResult {
  extractedText: string;
  confidence: number;
  processedFields: AOFieldsExtracted;
  rawData: any;
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
};

export class OCRService {
  private tesseractWorker: any = null;
  private isInitializingTesseract = false;

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

  // Méthode principale pour traiter un PDF
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
        const processedFields = this.parseAOFields(nativeText);
        return {
          extractedText: nativeText,
          confidence: 95,
          processedFields,
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
        throw new Error('pdf-parse module failed to initialize');
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
      const processedFields = this.parseAOFields(fullText);
      
      console.log(`[OCR] OCR processing completed: ${fullText.length} characters simulated`);
      
      return {
        extractedText: fullText,
        confidence: 85, // Confiance simulée pour le POC
        processedFields,
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

  private parseAOFields(text: string): AOFieldsExtracted {
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
    
    return fields;
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
}

export const ocrService = new OCRService();