import { storage } from '../storage-poc';
import type { 
  Ao, Project, 
  AOFieldsExtracted, 
  SupplierQuoteFields,
  MaterialSpec, 
  ColorSpec 
} from '@shared/schema';
import { eventBus } from '../eventBus';

// ========================================
// TYPES POUR LE MOTEUR CONTEXTUEL OCR
// ========================================

export interface ContextualOCRResult {
  extractedFields: AOFieldsExtracted | SupplierQuoteFields;
  confidence: number;
  contextualScore: number; // Score basé sur cohérence contextuelle
  mappingResults: FieldMappingResult[];
  validationErrors: ValidationError[];
  autoCompletedFields: string[];
  suggestedCorrections: FieldCorrection[];
}

export interface FieldMappingResult {
  fieldName: string;
  originalValue?: string;
  mappedValue?: string;
  confidence: number;
  source: 'exact_match' | 'fuzzy_match' | 'context_inferred' | 'auto_completed';
  contextualEvidence?: string[];
}

export interface ValidationError {
  fieldName: string;
  error: string;
  severity: 'warning' | 'error' | 'critical';
  suggestedFix?: string;
}

export interface FieldCorrection {
  fieldName: string;
  currentValue: string;
  suggestedValue: string;
  reason: string;
  confidence: number;
}

export interface ContextualContext {
  existingAos: Ao[];
  existingProjects: Project[];
  knownClients: string[];
  knownLocations: string[];
  knownDepartements: string[];
  menuiserieTypes: string[];
  bureauEtudesOptions: string[];
  bureauControleOptions: string[];
}

// ========================================
// MOTEUR DE CONTEXTE INTELLIGENT OCR
// ========================================

export class ContextualOCREngine {
  private context: ContextualContext | null = null;
  private readonly fuzzyThreshold = 0.7; // Seuil pour correspondance floue
  private readonly contextualThreshold = 0.8; // Seuil pour validation contextuelle

  constructor() {
    console.log('[ContextualOCR] Initializing Contextual OCR Engine...');
  }

  /**
   * Initialise le contexte en chargeant les données existantes
   */
  async initializeContext(): Promise<void> {
    try {
      console.log('[ContextualOCR] Loading contextual data...');

      // Charger les données existantes
      const [aos, projects] = await Promise.all([
        storage.getAos(),
        storage.getProjects()
      ]);

      // Extraire les valeurs uniques pour mapping
      const knownClients = [...new Set(aos.map(ao => ao.client).filter(Boolean))];
      const knownLocations = [...new Set([
        ...aos.map(ao => ao.location).filter(Boolean),
        ...projects.map(p => p.location).filter(Boolean)
      ])];
      const knownDepartements = [...new Set(aos.map(ao => ao.departement).filter(Boolean))];
      const menuiserieTypes = [...new Set(aos.map(ao => ao.menuiserieType).filter(Boolean))];
      const bureauEtudesOptions = [...new Set(aos.map(ao => ao.bureauEtudes).filter(Boolean))];
      const bureauControleOptions = [...new Set(aos.map(ao => ao.bureauControle).filter(Boolean))];

      this.context = {
        existingAos: aos,
        existingProjects: projects,
        knownClients,
        knownLocations,
        knownDepartements,
        menuiserieTypes,
        bureauEtudesOptions,
        bureauControleOptions
      };

      console.log(`[ContextualOCR] Context initialized with ${aos.length} AOs, ${projects.length} projects`);
      console.log(`[ContextualOCR] Known entities: ${knownClients.length} clients, ${knownLocations.length} locations`);

    } catch (error) {
      console.error('[ContextualOCR] Failed to initialize context:', error);
      throw error;
    }
  }

  /**
   * Améliore les champs extraits par OCR avec le contexte
   */
  async enhanceOCRFields(
    extractedFields: AOFieldsExtracted | SupplierQuoteFields,
    documentType: 'ao' | 'supplier_quote'
  ): Promise<ContextualOCRResult> {
    if (!this.context) {
      await this.initializeContext();
    }

    console.log(`[ContextualOCR] Enhancing ${documentType} fields with contextual data...`);

    const mappingResults: FieldMappingResult[] = [];
    const validationErrors: ValidationError[] = [];
    const autoCompletedFields: string[] = [];
    const suggestedCorrections: FieldCorrection[] = [];

    let enhancedFields = { ...extractedFields };

    if (documentType === 'ao') {
      enhancedFields = await this.enhanceAOFields(
        extractedFields as AOFieldsExtracted,
        mappingResults,
        validationErrors,
        autoCompletedFields,
        suggestedCorrections
      );
    } else {
      enhancedFields = await this.enhanceSupplierFields(
        extractedFields as SupplierQuoteFields,
        mappingResults,
        validationErrors,
        autoCompletedFields,
        suggestedCorrections
      );
    }

    // Calculer les scores de confiance
    const confidence = this.calculateConfidenceScore(mappingResults);
    const contextualScore = this.calculateContextualScore(mappingResults, validationErrors);

    // Émettre des métriques pour analytics
    eventBus.emit('ocr:contextual_enhancement', {
      documentType,
      confidence,
      contextualScore,
      mappingsCount: mappingResults.length,
      errorsCount: validationErrors.length,
      autoCompletedCount: autoCompletedFields.length
    });

    return {
      extractedFields: enhancedFields,
      confidence,
      contextualScore,
      mappingResults,
      validationErrors,
      autoCompletedFields,
      suggestedCorrections
    };
  }

  /**
   * Améliore spécifiquement les champs d'AO
   */
  private async enhanceAOFields(
    fields: AOFieldsExtracted,
    mappingResults: FieldMappingResult[],
    validationErrors: ValidationError[],
    autoCompletedFields: string[],
    suggestedCorrections: FieldCorrection[]
  ): Promise<AOFieldsExtracted> {
    const enhanced = { ...fields };

    // 1. MAPPING INTELLIGENT DES CLIENTS
    if (enhanced.client) {
      const clientMapping = this.findBestMatch(enhanced.client, this.context!.knownClients);
      if (clientMapping.confidence > this.fuzzyThreshold) {
        mappingResults.push({
          fieldName: 'client',
          originalValue: enhanced.client,
          mappedValue: clientMapping.match,
          confidence: clientMapping.confidence,
          source: clientMapping.confidence === 1.0 ? 'exact_match' : 'fuzzy_match'
        });
        enhanced.client = clientMapping.match;
      }
    }

    // 2. MAPPING INTELLIGENT DES LOCALISATIONS
    if (enhanced.location) {
      const locationMapping = this.findBestMatch(enhanced.location, this.context!.knownLocations);
      if (locationMapping.confidence > this.fuzzyThreshold) {
        mappingResults.push({
          fieldName: 'location',
          originalValue: enhanced.location,
          mappedValue: locationMapping.match,
          confidence: locationMapping.confidence,
          source: locationMapping.confidence === 1.0 ? 'exact_match' : 'fuzzy_match'
        });
        enhanced.location = locationMapping.match;
      }
    }

    // 3. INFÉRENCE DU DÉPARTEMENT DEPUIS LA LOCALISATION
    if (!enhanced.departement && enhanced.location) {
      const inferredDepartement = this.inferDepartementFromLocation(enhanced.location);
      if (inferredDepartement) {
        enhanced.departement = inferredDepartement;
        autoCompletedFields.push('departement');
        mappingResults.push({
          fieldName: 'departement',
          mappedValue: inferredDepartement,
          confidence: 0.8,
          source: 'context_inferred',
          contextualEvidence: [`Inferred from location: ${enhanced.location}`]
        });
      }
    }

    // 4. AUTO-COMPLÉTION DES CONTACTS DEPUIS DONNÉES MAÎTRE
    await this.autoCompleteContactsFromMaster(enhanced, autoCompletedFields, mappingResults);

    // 5. VALIDATION DES MONTANTS AVEC ESTIMATIONS CONNUES
    this.validateAmountConsistency(enhanced, validationErrors, suggestedCorrections);

    // 6. PATTERNS SPÉCIALISÉS PAR TYPE DE MENUISERIE
    this.enhanceMenuiserieSpecificFields(enhanced, mappingResults);

    // 7. VALIDATION INTER-CHAMPS
    this.validateFieldConsistency(enhanced, validationErrors);

    return enhanced;
  }

  /**
   * Améliore spécifiquement les champs de devis fournisseurs
   */
  private async enhanceSupplierFields(
    fields: SupplierQuoteFields,
    mappingResults: FieldMappingResult[],
    validationErrors: ValidationError[],
    autoCompletedFields: string[],
    suggestedCorrections: FieldCorrection[]
  ): Promise<SupplierQuoteFields> {
    const enhanced = { ...fields };

    // 1. Validation des montants HT/TTC
    this.validateSupplierAmounts(enhanced, validationErrors, suggestedCorrections);

    // 2. Normalisation des délais
    this.normalizeSupplierDelays(enhanced, mappingResults);

    // 3. Extraction améliorée des matériaux et couleurs
    this.enhanceMaterialsAndColors(enhanced, mappingResults);

    return enhanced;
  }

  /**
   * Trouve la meilleure correspondance floue dans une liste
   */
  private findBestMatch(value: string, candidates: string[]): { match: string; confidence: number } {
    if (!value || candidates.length === 0) {
      return { match: value, confidence: 0 };
    }

    const normalizedValue = this.normalizeString(value);
    let bestMatch = value;
    let bestScore = 0;

    for (const candidate of candidates) {
      const normalizedCandidate = this.normalizeString(candidate);
      
      // Correspondance exacte
      if (normalizedValue === normalizedCandidate) {
        return { match: candidate, confidence: 1.0 };
      }

      // Correspondance floue utilisant distance de Levenshtein
      const similarity = this.calculateSimilarity(normalizedValue, normalizedCandidate);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = candidate;
      }
    }

    return { match: bestMatch, confidence: bestScore };
  }

  /**
   * Normalise une chaîne pour comparaison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^\w\s]/g, '') // Supprimer la ponctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calcule la similarité entre deux chaînes (algorithme de Jaccard)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  /**
   * Infère le département depuis la localisation
   */
  private inferDepartementFromLocation(location: string): string | null {
    const locationLower = location.toLowerCase();
    
    // Mapping des noms de villes/départements connus JLM (50 et 62)
    const departementMappings: Record<string, string> = {
      'manche': '50',
      'saint-lô': '50',
      'cherbourg': '50',
      'avranches': '50',
      'coutances': '50',
      'pas-de-calais': '62',
      'arras': '62',
      'calais': '62',
      'boulogne': '62',
      'béthune': '62',
      'lens': '62',
      'liévin': '62',
      'henin': '62'
    };

    for (const [keyword, dept] of Object.entries(departementMappings)) {
      if (locationLower.includes(keyword)) {
        return dept;
      }
    }

    return null;
  }

  /**
   * Auto-complète les contacts depuis les données maître
   */
  private async autoCompleteContactsFromMaster(
    fields: AOFieldsExtracted,
    autoCompletedFields: string[],
    mappingResults: FieldMappingResult[]
  ): Promise<void> {
    // Chercher un AO similaire pour le même client/location
    const similarAO = this.context!.existingAos.find(ao => 
      ao.client === fields.client && ao.location === fields.location
    );

    if (similarAO) {
      // Auto-compléter les contacts manquants
      if (!fields.bureauEtudes && similarAO.bureauEtudes) {
        fields.bureauEtudes = similarAO.bureauEtudes;
        autoCompletedFields.push('bureauEtudes');
        mappingResults.push({
          fieldName: 'bureauEtudes',
          mappedValue: similarAO.bureauEtudes,
          confidence: 0.9,
          source: 'auto_completed',
          contextualEvidence: [`Found in similar AO: ${similarAO.reference}`]
        });
      }

      if (!fields.bureauControle && similarAO.bureauControle) {
        fields.bureauControle = similarAO.bureauControle;
        autoCompletedFields.push('bureauControle');
        mappingResults.push({
          fieldName: 'bureauControle',
          mappedValue: similarAO.bureauControle,
          confidence: 0.9,
          source: 'auto_completed',
          contextualEvidence: [`Found in similar AO: ${similarAO.reference}`]
        });
      }
    }
  }

  /**
   * Valide la cohérence des montants avec les estimations connues
   */
  private validateAmountConsistency(
    fields: AOFieldsExtracted,
    validationErrors: ValidationError[],
    suggestedCorrections: FieldCorrection[]
  ): void {
    if (!fields.montantEstime) return;

    const montant = parseFloat(fields.montantEstime.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(montant)) return;

    // Chercher des AOs similaires pour comparer les montants
    const similarAOs = this.context!.existingAos.filter(ao => 
      ao.client === fields.client && 
      ao.menuiserieType === fields.menuiserieType
    );

    if (similarAOs.length > 0) {
      const avgAmount = similarAOs.reduce((sum, ao) => {
        const amount = ao.montantEstime ? parseFloat(ao.montantEstime.toString()) : 0;
        return sum + amount;
      }, 0) / similarAOs.length;

      const deviation = Math.abs(montant - avgAmount) / avgAmount;
      
      if (deviation > 0.5) { // Écart de plus de 50%
        validationErrors.push({
          fieldName: 'montantEstime',
          error: `Montant inhabituel pour ce type de projet (écart de ${Math.round(deviation * 100)}% vs moyenne)`,
          severity: 'warning',
          suggestedFix: `Vérifier le montant. Moyenne similaire: ${avgAmount.toFixed(0)}€`
        });
      }
    }
  }

  /**
   * Améliore les champs spécifiques au type de menuiserie
   */
  private enhanceMenuiserieSpecificFields(
    fields: AOFieldsExtracted,
    mappingResults: FieldMappingResult[]
  ): void {
    if (!fields.menuiserieType) return;

    // Patterns spécialisés selon le type
    switch (fields.menuiserieType) {
      case 'fenetre':
        this.enhanceMenuiserieExterieure(fields, mappingResults);
        break;
      case 'porte':
        this.enhanceMenuiseriePortes(fields, mappingResults);
        break;
      case 'volet':
        this.enhanceMenuiserieVolets(fields, mappingResults);
        break;
    }
  }

  /**
   * Améliore les champs pour menuiserie extérieure
   */
  private enhanceMenuiserieExterieure(fields: AOFieldsExtracted, mappingResults: FieldMappingResult[]): void {
    // Détection des critères spéciaux
    if (!fields.specialCriteria) {
      fields.specialCriteria = {
        batimentPassif: false,
        isolationRenforcee: false,
        precadres: false,
        voletsExterieurs: false,
        coupeFeu: false
      };
    }

    // Recherche dans intitulé ou description pour critères spéciaux
    const searchText = `${fields.intituleOperation || ''} ${fields.description || ''}`.toLowerCase();
    
    if (searchText.includes('passif') || searchText.includes('passive')) {
      fields.specialCriteria.batimentPassif = true;
      mappingResults.push({
        fieldName: 'specialCriteria.batimentPassif',
        mappedValue: 'true',
        confidence: 0.8,
        source: 'context_inferred',
        contextualEvidence: ['Detected "passif" in project description']
      });
    }
  }

  /**
   * Améliore les champs pour menuiserie portes
   */
  private enhanceMenuiseriePortes(fields: AOFieldsExtracted, mappingResults: FieldMappingResult[]): void {
    const searchText = `${fields.intituleOperation || ''}`.toLowerCase();
    
    if (searchText.includes('coupe-feu') || searchText.includes('ei ')) {
      if (!fields.specialCriteria) {
        fields.specialCriteria = {
          batimentPassif: false,
          isolationRenforcee: false,
          precadres: false,
          voletsExterieurs: false,
          coupeFeu: false
        };
      }
      fields.specialCriteria.coupeFeu = true;
      
      mappingResults.push({
        fieldName: 'specialCriteria.coupeFeu',
        mappedValue: 'true',
        confidence: 0.9,
        source: 'context_inferred',
        contextualEvidence: ['Detected fire resistance criteria']
      });
    }
  }

  /**
   * Améliore les champs pour volets
   */
  private enhanceMenuiserieVolets(fields: AOFieldsExtracted, mappingResults: FieldMappingResult[]): void {
    // Spécifique aux volets - pas d'améliorations particulières pour l'instant
  }

  /**
   * Valide la cohérence entre les champs
   */
  private validateFieldConsistency(fields: AOFieldsExtracted, validationErrors: ValidationError[]): void {
    // Validation des dates
    if (fields.dateLimiteRemise && fields.dateRenduAO) {
      const limiteRemise = new Date(fields.dateLimiteRemise);
      const renduAO = new Date(fields.dateRenduAO);
      
      if (renduAO > limiteRemise) {
        validationErrors.push({
          fieldName: 'dateRenduAO',
          error: 'Date de rendu postérieure à la date limite de remise',
          severity: 'error'
        });
      }
    }

    // Validation département vs localisation
    if (fields.departement && fields.location) {
      const expectedDept = this.inferDepartementFromLocation(fields.location);
      if (expectedDept && expectedDept !== fields.departement) {
        validationErrors.push({
          fieldName: 'departement',
          error: `Département incohérent avec la localisation (attendu: ${expectedDept})`,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Valide les montants des devis fournisseurs
   */
  private validateSupplierAmounts(
    fields: SupplierQuoteFields,
    validationErrors: ValidationError[],
    suggestedCorrections: FieldCorrection[]
  ): void {
    if (fields.totalAmountHT && fields.totalAmountTTC && fields.vatRate) {
      const expectedTTC = fields.totalAmountHT * (1 + fields.vatRate / 100);
      const deviation = Math.abs(fields.totalAmountTTC - expectedTTC) / expectedTTC;
      
      if (deviation > 0.01) { // Écart de plus de 1%
        validationErrors.push({
          fieldName: 'totalAmountTTC',
          error: 'Incohérence entre montants HT, TTC et taux de TVA',
          severity: 'error'
        });
        
        suggestedCorrections.push({
          fieldName: 'totalAmountTTC',
          currentValue: fields.totalAmountTTC.toString(),
          suggestedValue: expectedTTC.toFixed(2),
          reason: 'Recalcul basé sur HT + TVA',
          confidence: 0.95
        });
      }
    }
  }

  /**
   * Normalise les délais des fournisseurs
   */
  private normalizeSupplierDelays(fields: SupplierQuoteFields, mappingResults: FieldMappingResult[]): void {
    // Convertir les délais texte en jours
    if (fields.deliveryTerms && !fields.deliveryDelay) {
      const delayInDays = this.extractDelayFromText(fields.deliveryTerms);
      if (delayInDays > 0) {
        fields.deliveryDelay = delayInDays;
        mappingResults.push({
          fieldName: 'deliveryDelay',
          originalValue: fields.deliveryTerms,
          mappedValue: delayInDays.toString(),
          confidence: 0.8,
          source: 'context_inferred'
        });
      }
    }
  }

  /**
   * Extrait un délai en jours depuis un texte
   */
  private extractDelayFromText(text: string): number {
    const patterns = [
      /(\d+)\s*(?:jours?|j)/i,
      /(\d+)\s*(?:semaines?|sem)/i,
      /(\d+)\s*(?:mois)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        if (text.toLowerCase().includes('semaine')) {
          return value * 7;
        } else if (text.toLowerCase().includes('mois')) {
          return value * 30;
        }
        return value;
      }
    }

    return 0;
  }

  /**
   * Améliore l'extraction des matériaux et couleurs
   */
  private enhanceMaterialsAndColors(fields: SupplierQuoteFields, mappingResults: FieldMappingResult[]): void {
    // Cette fonction peut être étendue pour améliorer la détection des matériaux et couleurs
    // en utilisant les données contextuelles des projets similaires
  }

  /**
   * Calcule le score de confiance global
   */
  private calculateConfidenceScore(mappingResults: FieldMappingResult[]): number {
    if (mappingResults.length === 0) return 0.5;
    
    const totalConfidence = mappingResults.reduce((sum, result) => sum + result.confidence, 0);
    return totalConfidence / mappingResults.length;
  }

  /**
   * Calcule le score de cohérence contextuelle
   */
  private calculateContextualScore(mappingResults: FieldMappingResult[], validationErrors: ValidationError[]): number {
    const baseScore = 0.7;
    
    // Bonus pour mappings de haute qualité
    const highQualityMappings = mappingResults.filter(r => r.confidence > 0.8).length;
    const mappingBonus = (highQualityMappings / Math.max(mappingResults.length, 1)) * 0.2;
    
    // Pénalité pour erreurs de validation
    const errorPenalty = validationErrors.length * 0.05;
    
    return Math.max(0, Math.min(1, baseScore + mappingBonus - errorPenalty));
  }

  /**
   * Génère des patterns adaptatifs basés sur le contexte
   */
  generateAdaptivePatterns(documentType: 'ao' | 'supplier_quote', context?: any): Record<string, RegExp[]> {
    if (!this.context) return {};

    const adaptivePatterns: Record<string, RegExp[]> = {};

    if (documentType === 'ao') {
      // Patterns pour clients connus
      if (this.context.knownClients.length > 0) {
        const clientsPattern = this.context.knownClients
          .map(client => this.escapeRegExp(client))
          .join('|');
        adaptivePatterns.clients_known = [new RegExp(`(${clientsPattern})`, 'i')];
      }

      // Patterns pour localisations connues
      if (this.context.knownLocations.length > 0) {
        const locationsPattern = this.context.knownLocations
          .map(location => this.escapeRegExp(location))
          .join('|');
        adaptivePatterns.locations_known = [new RegExp(`(${locationsPattern})`, 'i')];
      }
    }

    return adaptivePatterns;
  }

  /**
   * Échappe les caractères spéciaux RegExp
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Instance singleton
export const contextualOCREngine = new ContextualOCREngine();