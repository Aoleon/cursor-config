import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

// Imports dynamiques pour éviter les erreurs d'initialisation
let pdfParse: any;
let fromBuffer: any;

// Initialisation dynamique des modules
const initializeModules = async () => {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  if (!fromBuffer) {
    const pdf2pic = await import('pdf2pic');
    fromBuffer = pdf2pic.fromBuffer;
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

  async initialize() {
    if (!this.tesseractWorker) {
      this.tesseractWorker = await createWorker(['fra', 'eng']);
      await this.tesseractWorker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ.,!?;:()[]{}/@#€$%&*+-=_" ',
      });
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
      // Étape 1: Essayer d'extraire le texte natif du PDF
      const nativeText = await this.extractNativeText(pdfBuffer);
      
      if (nativeText && nativeText.length > 100) {
        // PDF contient du texte natif
        console.log('PDF with native text detected, using pdf-parse');
        const processedFields = this.parseAOFields(nativeText);
        return {
          extractedText: nativeText,
          confidence: 95,
          processedFields,
          rawData: { method: 'native-text' }
        };
      }
      
      // Étape 2: Fallback vers OCR pour PDFs scannés
      console.log('Scanned PDF detected, using OCR');
      return await this.processWithOCR(pdfBuffer);
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OCR processing failed: ${errorMessage}`);
    }
  }

  // Extraction de texte natif depuis PDF
  private async extractNativeText(pdfBuffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(pdfBuffer);
      return data.text || '';
    } catch (error) {
      console.log('Native text extraction failed, will use OCR');
      return '';
    }
  }

  // OCR pour PDFs scannés
  private async processWithOCR(pdfBuffer: Buffer): Promise<OCRResult> {
    await this.initialize();
    
    try {
      // Convertir PDF en images
      const images = await this.convertPDFToImages(pdfBuffer);
      let fullText = '';
      let totalConfidence = 0;
      
      // OCR sur chaque page
      for (let i = 0; i < Math.min(images.length, 5); i++) { // Limiter à 5 pages max
        const processedImage = await this.preprocessImage(images[i]);
        const result = await this.tesseractWorker.recognize(processedImage);
        
        fullText += result.data.text + '\n\n';
        totalConfidence += result.data.confidence;
      }
      
      const averageConfidence = images.length > 0 ? totalConfidence / images.length : 0;
      const processedFields = this.parseAOFields(fullText);
      
      return {
        extractedText: fullText,
        confidence: averageConfidence,
        processedFields,
        rawData: { method: 'ocr', pages: images.length }
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`OCR processing failed: ${errorMessage}`);
    }
  }

  // Convertir PDF en images pour OCR
  private async convertPDFToImages(pdfBuffer: Buffer): Promise<Buffer[]> {
    const convert = fromBuffer(pdfBuffer, {
      density: 300,           // Haute résolution pour meilleur OCR
      saveFilename: "page",
      savePath: "./temp",
      format: "png",
      width: 2480,           // A4 à 300 DPI
      height: 3508,
    });

    const images: Buffer[] = [];
    
    try {
      // Convertir les 3 premières pages maximum
      for (let pageNum = 1; pageNum <= 3; pageNum++) {
        try {
          const imageBuffer = await convert(pageNum, { responseType: "buffer" });
          images.push(imageBuffer);
        } catch (error) {
          console.log(`Page ${pageNum} not found, stopping conversion`);
          break;
        }
      }
    } catch (error) {
      console.error('PDF to image conversion failed:', error);
      throw new Error('Failed to convert PDF to images');
    }
    
    return images;
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