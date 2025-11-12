import { storage } from '../storage-poc';
import { withErrorHandling } from './utils/error-handler';
import type { 
  Ao, Project, 
  AOFieldsExtracted, 
  SupplierQuoteFields,
  MaterialSpec, 
  ColorSpec 
} from '@shared/schema';
import { eventBus } from '../eventBus';
import { logger } from '../utils/logger';

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
// INTERFACES POUR MÉTRIQUES DE PERFORMANCE OCR
// ========================================

export interface OCRPerformanceMetrics {
  documentType: 'ao' | 'supplier_quote';
  timestamp: Date;
  extractionAccuracy: number;
  fieldCompleteness: number;
  contextualRelevance: number;
  autoCompletionEfficiency: number;
  globalScore: number;
  jlmSpecificMetrics: {
    departmentRecognitionAccuracy: number;
    materialExtractionScore: number;
    specialCriteriaDetection: number;
    contactAutoCompletionRate: number;
  };
  processingMetrics: {
    processingTime: number;
    mappingsCount: number;
    errorsCount: number;
    autoCompletedFieldsCount: number;
    suggestionsCount: number;
  };
  qualityIndicators: {
    hasHighConfidenceFields: boolean;
    hasCriticalErrors: boolean;
    needsManualReview: boolean;
    isJLMOptimized: boolean;
  };
}

export interface JLMScoreComponents {
  extractionAccuracy: number;
  fieldCompleteness: number;
  contextualRelevance: number;
  autoCompletionEfficiency: number;
  jlmSpecificScore: number;
  departmentRecognitionAccuracy: number;
  materialExtractionScore: number;
}

// ========================================
// MOTEUR DE CONTEXTE INTELLIGENT OCR
// ========================================

export class ContextualOCREngine {
  private context: ContextualContext | null = null;
  private readonly fuzzyThreshold = 0.7; // Seuil pour correspondance floue
  private readonly contextualThreshold = 0.8; // Seuil pour validation contextuelle

  constructor() {
    logger.info('Initializing Contextual OCR Engine', { metadata: {
        service: 'ContextualOCREngine',
        operation: 'constructor' 
              
              }
 
              
            });
  }
  /**
   * Initialise le contexte en chargeant les données existantes
   */
  async initializeContext(): Promise<void> {
    return withErrorHandling(
    async () => {

      logger.info('Loading contextual data', { metadata: {
          service: 'ContextualOCREngine',
          operation: 'initializeContext'
      });
      // Charger les données existantes
      const [aos, projects] = await Promise.all([
        storage.getAos(),
        storage.getProjects()
      ]);
      // Extraire les valeurs uniques pour mapping
      const knownClients = Array.from(new Set(aos.map(ao => ao.client).filter(Boolean)));
      const knownLocations = Array.from(new Set([
        ...aos.map(ao => ao.location).filter(Boolean),
        ...projects.map(p => p.location).filter(Boolean)
      ]));
      const knownDepartements = Array.from(new Set(aos.map(ao => ao.departement).filter(Boolean)));
      const menuiserieTypes = Array.from(new Set(aos.map(ao => ao.menuiserieType).filter(Boolean)));
      const bureauEtudesOptions = Array.from(new Set(aos.map(ao => ao.bureauEtudes).filter(Boolean))) as string[];
      const bureauControleOptions = Array.from(new Set(aos.map(ao => ao.bureauControle).filter(Boolean))) as string[];
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
      logger.info('Context initialized', { metadata: {
          service: 'ContextualOCREngine',
          operation: 'initializeContext',
          aosCount: aos.length,
          projectsCount: projects.length,
          clientsCount: knownClients.length,
          locationsCount: knownLocations.length 
              
              }
 
              
            });
    },
    {
      operation: 'constructor',
      service: 'ContextualOCREngine',
      metadata: {}
    } );
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

    logger.info('Enhancing fields with contextual data', { metadata: {
        service: 'ContextualOCREngine',
        operation: 'enhanceOCRFields',
        documentType 
              
              }
 
              
            });
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
    
    const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
    const union = new Set([...Array.from(set1), ...Array.from(set2)]);
    
    return intersection.size / union.size;
  }

  /**
   * Infère le département depuis la localisation - VERSION ENRICHIE JLM
   */
  private inferDepartementFromLocation(location: string): string | null {
    const locationLower = location.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Mapping étendu des noms de villes/départements connus JLM (50 et 62) + zones limitrophes
    const departementMappings: Record<string, string> = {
      // Département 50 - Manche
      'manche': '50',
      'saint-lo': '50', 'saint lo': '50', 'st-lo': '50',
      'cherbourg': '50', 'cherbourg-en-cotentin': '50', 'cherbourg octeville': '50',
      'avranches': '50',
      'coutances': '50',
      'granville': '50',
      'valognes': '50',
      'carentan': '50',
      'barneville': '50',
      'mortain': '50',
      'villedieu': '50',
      
      // Département 62 - Pas-de-Calais  
      'pas-de-calais': '62', 'pas de calais': '62',
      'arras': '62',
      'calais': '62',
      'boulogne': '62', 'boulogne-sur-mer': '62',
      'bethune': '62',
      'lens': '62',
      'lievin': '62',
      'henin': '62', 'henin-beaumont': '62',
      'saint-omer': '62', 'st-omer': '62',
      'bruay': '62', 'bruay-la-buissiere': '62',
      'carvin': '62',
      'billy-montigny': '62',
      'wingles': '62',
      'noyelles': '62',
      
      // Zones limitrophes pertinentes pour JLM
      'dunkerque': '59', // Nord - proche zone d'activité
      'lille': '59',
      'valenciennes': '59',
      'cambrai': '59',
      'douai': '59',
      
      // Normandie proche
      'caen': '14',
      'bayeux': '14',
      'lisieux': '14'
    };

    // Recherche par mot-clé avec priorité aux correspondances exactes
    for (const [keyword, dept] of Object.entries(departementMappings)) {
      if (locationLower === keyword || locationLower.includes(' ' + keyword + ' ') || locationLower.startsWith(keyword + ' ') || locationLower.endsWith(' ' + keyword)) {
        logger.info('Département inféré', { metadata: {
            service: 'ContextualOCREngine',
            operation: 'inferDepartmentFromLocation',
            department: dept,
            keyword,
            location 
              
              }
 
              
            });
        return dept;
      }
    }
    
    // Recherche par inclusion partielle (moins prioritaire)
    for (const [keyword, dept] of Object.entries(departementMappings)) {
      if (locationLower.includes(keyword)) {
        logger.info('Département inféré (partiel)', { metadata: {
            service: 'ContextualOCREngine',
            operation: 'inferDepartmentFromLocation',
            department: dept,
            keyword,
            location 
              
              }
 
              
            });
        return dept;
      }
    }

    return null;
  }

  /**
   * Auto-complète les contacts depuis les données maître - VERSION OPTIMISÉE JLM
   */
  private async autoCompleteContactsFromMaster(
    fields: AOFieldsExtracted,
    autoCompletedFields: string[],
    mappingResults: FieldMappingResult[]
  ): Promise<void> {
    logger.info('Auto-complétion intelligente des contacts pour JLM', { metadata: {
        service: 'ContextualOCREngine',
        operation: 'autoCompleteContactsFromMaster' 
              
              }
 
              
            });
    // Stratégie multi-niveau pour trouver des AOs similaires
    const similarityStrategies = [
      // Niveau 1: Client + localisation exacte (priorité max)
      (ao: unknown) => ao.client === fields.client && ao.location === fields.location,
      // Niveau 2: Même client + même département
     : unknown) => ao.client === fields.client && ao.departement === fields.departement,
      // Niveau 3: Même département + même type de menuiserie 
 : unknown) => ao.departement === fields.departement && ao.menuiserieType === fields.menuiserieType,
      // Niveau 4: Client connu avec localisation proche (correspondance floue)
   unknown)unknown unknown) => ao.client === fields.client && this.isLocationProximate(ao.location, fields.location),
      // Niveau 5: Type de menuiserie similaire même région
   unknown(ao: unknown) => ao.menuiserieType === fields.menuiserieType && this.isSameRegion(ao.departement, fields.departement)
    ];
    let bestMatch: unknown = null;
    let matchStrategy = -1;
    // Appliquer les stratégies par ordre de priorité
    for (let i = 0; i < similarityStrategies.length && !bestMatch; i++) {
      bestMatch = this.context!.existingAos.find(similarityStrategies[i]);
      if (bestMatch) {
        matchStrategy = i;
        logger.info('Correspondance trouvée', { metadata: {
            service: 'ContextualOCREngine',
            operation: 'autoCompleteContactsFromMaster',
            strategyLevel: i + 1 
              
              }
 
              
            });
      }
    }

    if (bestMatch) {
      const confidence = this.calculateAutoCompletionConfidence(matchStrategy);
      
      // Auto-compléter Bureau d'Études avec validation
      if (!fields.bureauEtudes && bestMatch.bureauEtudes) {
        fields.bureauEtudes = bestMatch.bureauEtudes;
        autoCompletedFields.push('bureauEtudes');
        mappingResults.push({
          fieldName: 'bureauEtudes',
          mappedValue: bestMatch.bureauEtudes,
          confidence,
          source: 'auto_completed',
          contextualEvidence: [
            `Niveau ${matchStrategy + 1}: ${this.getStrategyDescription(matchStrategy)}`,
            `Référence source: ${bestMatch.reference}`,
            `Client: ${bestMatch.client}`,
            `Localisation: ${bestMatch.location}`
          ]
        });
        logger.info('Bureau d\'Études auto-complété', { metadata: {
            service: 'ContextualOCREngine',
            operation: 'autoCompleteContactsFromMaster',
            bureauEtudes: bestMatch.bureauEtudes,
            confidence 
              
              }
 
              
            });
      }
      // Auto-compléter Bureau de Contrôle avec validation
      if (!fields.bureauControle && bestMatch.bureauControle) {
        fields.bureauControle = bestMatch.bureauControle;
        autoCompletedFields.push('bureauControle');
        mappingResults.push({
          fieldName: 'bureauControle',
          mappedValue: bestMatch.bureauControle,
          confidence,
          source: 'auto_completed',
          contextualEvidence: [
            `Niveau ${matchStrategy + 1}: ${this.getStrategyDescription(matchStrategy)}`,
            `Référence source: ${bestMatch.reference}`,
            `Similarité client/projet détectée`
          ]
        });
        logger.info('Bureau de Contrôle auto-complété', { metadata: {
            service: 'ContextualOCREngine',
            operation: 'autoCompleteContactsFromMaster',
            bureauControle: bestMatch.bureauControle,
            confidence 
              
              }
 
              
            });
      }
      // Auto-compléter département si manquant
      if (!fields.departement && bestMatch.departement && matchStrategy <= 2) {
        fields.departement = bestMatch.departement;
        autoCompletedFields.push('departement');
        mappingResults.push({
          fieldName: 'departement',
          mappedValue: bestMatch.departement,
          confidence: confidence * 0.9, // Légèrement moins sûr pour département
          source: 'auto_completed',
          contextualEvidence: [`Inféré depuis AO similaire: ${bestMatch.reference}`]
        });
        logger.info('Département auto-complété', { metadata: {
            service: 'ContextualOCREngine',
            operation: 'autoCompleteContactsFromMaster',
            departement: bestMatch.departement 
              
              }
 
              
            });
      }
    } else {
      logger.info('Aucune correspondance trouvée pour auto-complétion', { metadata: {
          service: 'ContextualOCREngine',
          operation: 'autoCompleteContactsFromMaster' 
              
              }
 
              
            });
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
case 'fenetre':;
        this.enhanceMenuiserieExterieure(fields, mappingResults);
        break;
case 'porte':;
        this.enhanceMenuiseriePortes(fields, mappingResults);
        break;
case 'volet':;
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

    // Recherche dans intitulé pour critères spéciaux (description n'est pas dans AOFieldsExtracted)
    const searchText = `${fields.intituleOperation || ''}`.toLowerCase();
    
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
   * Calcule la confiance d'auto-complétion selon la stratégie utilisée
   */
  private calculateAutoCompletionConfidence(strategyLevel: number): number {
    const confidenceByLevel = [0.95, 0.85, 0.75, 0.65, 0.55]; // Niveaux de confiance décroissants
    return confidenceByLevel[strategyLevel] || 0.5;
  }

  /**
   * Retourne la description de la stratégie utilisée
   */
  private getStrategyDescription(strategyLevel: number): string {
    const descriptions = [
      'Client + localisation exacte',
      'Même client + même département', 
      'Même département + type menuiserie',
      'Client connu + localisation proche',
      'Type menuiserie + même région'
    ];
    return descriptions[strategyLevel] || 'Stratégie inconnue';
  }

  /**
   * Vérifie si deux localisations sont proximales (analyse contextuelle)
   */
  private isLocationProximate(location1?: string, location2?: string): boolean {
    if (!location1 || !location2) return false;
    
    const loc1 = location1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const loc2 = location2.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Distance de Levenshtein pour similarité de noms
    const similarity = this.calculateSimilarity(loc1, loc2);
    return similarity > 0.6; // 60% de similarité minimum
  }

  /**
   * Vérifie si deux départements sont dans la même région métier JLM
   */
  private isSameRegion(dept1?: string, dept2?: string): boolean {
    if (!dept1 || !dept2) return false;
    
    // Régions métier JLM
    const regionNormandie = ['14', '50', '61', '76', '27'];
    const regionHautsDeFrance = ['59', '62', '80', '02', '60'];
    
    const isInSameRegion = (
      (regionNormandie.includes(dept1) && regionNormandie.includes(dept2)) ||
      (regionHautsDeFrance.includes(dept1) && regionHautsDeFrance.includes(dept2))
    );
    
    return isInSameRegion;
  }

  /**
   * MÉTRIQUES DE PERFORMANCE OCR - Système de monitoring avancé
   */
  generatePerformanceMetrics(
    ocrResult: unknown, 
    contextualResult: ContextualOCRResult,
    documentType: 'ao' | 'supplier_quote'
  ): OCRPerformanceMetrics {
    logger.info('Génération des métriques de performance', { metadata: {
        service: 'ContextualOCREngine',
        operation: 'generatePerformanceMetrics',
        documentType 
              
              }
 
              
            });
    const startTime = Date.now();
    // Métriques de base
    const extractionAccuracy = this.calculateExtractionAccuracy(contextualResult.mappingResults);
    const fieldCompleteness = this.calculateFieldCompleteness(contextualResult.extractedFields, documentType);
    const contextualRelevance = contextualResult.contextualScore;
    const autoCompletionEfficiency = contextualResult.autoCompletedFields.length / this.getTotalExpectedFields(documentType);
    // Métriques spécialisées menuiserie JLM
    const jlmSpecificScore = this.calculateJLMSpecificScore(contextualResult.extractedFields, contextualResult.mappingResults);
    const departmentRecognitionAccuracy = this.calculateDepartmentAccuracy(contextualResult.extractedFields);
    const materialExtractionScore = this.calculateMaterialExtractionScore(contextualResult.extractedFields);
    // Score global pondéré pour JLM
    const globalScore = this.calculateGlobalJLMScore({
      extractionAccuracy,
      fieldCompleteness, 
      contextualRelevance,
      autoCompletionEfficiency,
      jlmSpecificScore,
      departmentRecognitionAccuracy,
      materialExtractionScore
    });
    
    const processingTime = Date.now() - startTime;
    
    const metrics: OCRPerformanceMetrics = {
      documentType,
      timestamp: new Date(),
      extractionAccuracy,
      fieldCompleteness,
      contextualRelevance,
      autoCompletionEfficiency,
      globalScore,
      jlmSpecificMetrics: {
        departmentRecognitionAccuracy,
        materialExtractionScore,
        specialCriteriaDetection: this.calculateSpecialCriteriaScore(contextualResult.extractedFields),
        contactAutoCompletionRate: contextualResult.autoCompletedFields.filter(f => f.includes('bureau')).length > 0 ? 1 : 0
      },
      processingMetrics: {
        processingTime,
        mappingsCount: contextualResult.mappingResults.length,
        errorsCount: contextualResult.validationErrors.length,
        autoCompletedFieldsCount: contextualResult.autoCompletedFields.length,
        suggestionsCount: contextualResult.suggestedCorrections.length
      },
      qualityIndicators: {
        hasHighConfidenceFields: contextualResult.mappingResults.some(r => r.confidence > 0.8),
        hasCriticalErrors: contextualResult.validationErrors.some(e => e.severity === 'critical'),
        needsManualReview: globalScore < 0.6 || contextualResult.validationErrors.length > 3,
        isJLMOptimized: jlmSpecificScore > 0.7
      }
    };
    
    logger.info('Métriques générées', { metadata: {
        service: 'ContextualOCREngine',
        operation: 'generatePerformanceMetrics',
        globalScore: globalScore.toFixed(2),
        jlmScore: jlmSpecificScore.toFixed(2) 
              
              }
 
              
            });
    return metrics;
  }
  /**
   * Génère des patterns adaptatifs basés sur le contexte
   */
  generateAdaptivePatterns(documentType: 'ao' | 'supplier_quot: unknunknown)nt: unknunknown)unknown): Record<string, RegExp[]> {
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

  // ========================================
  // FONCTIONS DE CALCUL DES MÉTRIQUES JLM
  // ========================================

  /**
   * Calcule la précision d'extraction basée sur les mappings
   */
  private calculateExtractionAccuracy(mappingResults: FieldMappingResult[]): number {
    if (mappingResults.length === 0) return 0;
    
    const totalConfidence = mappingResults.reduce((sum, result) => sum + result.confidence, 0);
    return totalConfidence / mappingResults.length;
  }

  /**
   * Calcule la complétude des champs selon le type de document
   */
  private calculateFieldCompleteness(extractedFields: AOFieldsExtracted | SupplierQuoteFields, documentType: string): number {
    const totalExpected = this.getTotalExpectedFields(documentType);
    const extractedCount = Object.keys(extractedFields).filter(key => (extractedFields as unknown)[key] != null).length;
    
    return Math.min(1, extractedCount / totalExpected);
  }

  /**
   * Retourne le nombre de champs attendus selon le type de document
   */
  private getTotalExpectedFields(documentType: string): number {
    return documentType === 'ao' ? 15 : 12; // Nombre de champs critiques par type
  }

  /**
   * Calcule le score spécifique JLM basé sur les critères métier
   */
  private calculateJLMSpecificScore(extractedFields: AOFieldsExtracted | SupplierQuoteFields, mappingResults: FieldMappingResult[]): number {
    let score = 0;
    let maxScore = 0;
    
    const fields = extractedFields as unknown;
    
    // Reconnaissance départements prioritaires JLM (50, 62)
    if (fields.departement) {
      maxScore += 0.3;
      if (['50', '62'].includes(fields.departement)) {
        score += 0.3; // Bonus pour départements cibles JLM
      } else if (['14', '59', '76'].includes(fields.departement)) {
        score += 0.15; // Demi-bonus pour départements proches
      }
    }
    
    // Type de menuiserie spécialisé
    if (fields.menuiserieType) {
      maxScore += 0.2;
      if (['fenetre', 'porte', 'volet'].includes(fields.menuiserieType)) {
        score += 0.2;
      }
    }
    
    // Critères spéciaux détectés
    if (fields.specialCriteria) {
      maxScore += 0.2;
      const criteriaCount = Object.values(fields.specialCriteria).filter(Boolean).length;
      score += Math.min(0.2, criteriaCount * 0.05);
    }
    
    // Matériaux et couleurs extraits
    if (fields.materials && fields.materials.length > 0) {
      maxScore += 0.15;
      score += Math.min(0.15, fields.materials.length * 0.05);
    }
    
    // Auto-complétion des contacts
    const hasAutoCompletedContacts = mappingResults.some(r => 
      r.source === 'auto_completed' && (r.fieldName.includes('bureau') || r.fieldName.includes('contact'))
    );
    if (hasAutoCompletedContacts) {
      maxScore += 0.15;
      score += 0.15;
    }
    
    return maxScore > 0 ? score / maxScore : 0;
  }

  /**
   * Calcule la précision de reconnaissance des départements
   */
  private calculateDepartmentAccuracy(extractedFields: AOFieldsExtracted | SupplierQuoteFields): number {
    const fields = extractedFieas unknown;unknown;
    if (!fields.departement) return 0;
    
    // Vérification format département français (01-95)
    const deptRegex = /^(0[1-9]|[1-8][0-9]|9[0-5])$/;
    if (!deptRegex.test(fields.departement)) return 0;
    
    // Bonus pour départements JLM prioritaires
    if (['50', '62'].includes(fields.departement)) return 1.0;
    if (['14', '59', '76', '80'].includes(fields.departement)) return 0.8; // Zones proches
    
    return 0.6; // Départements français valides
  }

  /**
   * Calcule le score d'extraction des matériaux
   */
  private calculateMaterialExtractionScore(extractedFields: AOFieldsExtracted | SupplierQuoteFields): number {
    const fields = extracteas unknown; as unknown;
    if (!fields.materials || fields.materials.length === 0) return 0;
    
    let score = 0;
    const maxMaterials = 5; // Score plafonné à 5 matériaux
    
    for (const material of fields.materials.slice(0, maxMaterials)) {
      let materialScore = 0.1; // Score de base
      
      // Bonus pour matériaux pertinents menuiserie
      if (['pvc', 'aluminium', 'bois'].includes(material.material)) {
        materialScore += 0.1;
      }
      
      // Bonus pour couleur associée
      if (material.color) {
        materialScore += 0.05;
      }
      
      // Bonus pour confiance élevée
      if (material.confidence && material.confidence > 0.8) {
        materialScore += 0.05;
      }
      
      score += materialScore;
    }
    
    return Math.min(1, score);
  }

  /**
   * Calcule le score de détection des critères spéciaux
   */
  private calculateSpecialCriteriaScore(extractedFields: AOFieldsExtracted | SupplierQuoteFields): number {
    const fields = extras unknown;unknown unknown;unknown;
    if (!fields.specialCriteria) return 0;
    
    const criteria = fields.specialCriteria;
    let detectedCount = 0;
    const totalCriteria = 5; // batimentPassif, isolationRenforcee, precadres, voletsExterieurs, coupeFeu
    
    if (criteria.batimentPassif) detectedCount++;
    if (criteria.isolationRenforcee) detectedCount++;
    if (criteria.precadres) detectedCount++;
    if (criteria.voletsExterieurs) detectedCount++;
    if (criteria.coupeFeu) detectedCount++;
    
    return detectedCount / totalCriteria;
  }

  /**
   * Calcule le score global pondéré pour JLM
   */
  private calculateGlobalJLMScore(components: JLMScoreComponents): number {
    // Pondération optimisée pour les enjeux métier JLM
    const weights = {
      extractionAccuracy: 0.20,      // 20% - Précision base
      fieldCompleteness: 0.15,       // 15% - Complétude
      contextualRelevance: 0.15,     // 15% - Pertinence contextuelle  
      autoCompletionEfficiency: 0.10, // 10% - Efficacité auto-complétion
      jlmSpecificScore: 0.25,        // 25% - Spécificités JLM (prioritaire)
      departmentRecognitionAccuracy: 0.10, // 10% - Reconnaissance département
      materialExtractionScore: 0.05   // 5% - Extraction matériaux
    };
    
    return (
      components.extractionAccuracy * weights.extractionAccuracy +
      components.fieldCompleteness * weights.fieldCompleteness +
      components.contextualRelevance * weights.contextualRelevance +
      components.autoCompletionEfficiency * weights.autoCompletionEfficiency +
      components.jlmSpecificScore * weights.jlmSpecificScore +
      components.departmentRecognitionAccuracy * weights.departmentRecognitionAccuracy +
      components.materialExtractionScore * weights.materialExtractionScore
    );
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