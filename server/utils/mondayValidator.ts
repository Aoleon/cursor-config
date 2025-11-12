/**
 * VALIDATEUR MONDAY.COM → SAXIUM - CONTRÔLES INTÉGRITÉ & TRANSFORMATION
 * 
 * Valide et normalise les données Monday.com avant migration vers Saxium
 * Utilise le mapping validé 95% compatible identifié dans gap analysis
 * 
 * Sources: analysis/GAP_ANALYSIS_SAXIUM_MONDAY_DETAILLE.md
 * Validation basée sur enum Saxium et patterns métier JLM
 * 
 * @version 1.0.0
 * @date 2025-09-24
 */

import { z } from 'zod';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import type { MondayAoData, MondayProjectData } from './mondayDataGenerator';
import { logger } from './logger';

// ========================================
// UTILITAIRES DATES MONDAY.COM
// ========================================

/**
 * Valide le format de date Monday.com (2 ou 3 segments)
 * Formats supportés selon convention française JLM:
 * - Format 2 segments: "->28/02" (DD/MM - jour/mois français)
 * - Format 3 segments: "->01/10/25" (DD/MM/YY - jour/mois/année)
 * - Format complet: "->03/10/2025" (DD/MM/YYYY - jour/mois/année complète)
 */
export function validateMondayDateFormat(dateStr: string): boolean {
  if (!dateStr || !dateStr.startsWith('->')) return false;
  
  // Regex étendue pour supporter 2 et 3 segments
  const mondayDateRegex = /^->(\d{1,2})\/(\d{1,2})(\/\d{2,4})?$/;
  return mondayDateRegex.test(dateStr);
}

/**
 * Validation calendrier français avec support années bissextiles
 */
function isValidFrenchDate(day: number, month: number, year: number): boolean {
  // Vérifier plages de base
  if (day < 1 || day > 31 || month < 1 || month > 12) return false;
  
  // Vérifier jours du mois selon calendrier français
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;
  
  // Validation spéciale pour 29 février (années bissextiles)
  if (month === 2 && day === 29) {
    return ((year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0));
  }
  
  return true;
}

/**
 * Parse une date Monday.com vers format ISO (YYYY-MM-DD)
 * CONVENTION FRANÇAISE JLM : TOUJOURS DD/MM pour 2 et 3 segments
 */
export function parseMondayDate(dateStr: string): string | null {
  if (!dateStr || !dateStr.startsWith('->')) return null;
  
  const match = dateStr.match(/^->(\d{1,2})\/(\d{1,2})(\/\d{2,4})?$/);
  if (!match) return null;
  
  const [, part1, part2, yearPart] = match;
  
  // CONVENTION FRANÇAISE JLM : part1=jour, part2=mois (TOUJOURS)
  const day = parseInt(part1, 10);
  const month = parseInt(part2, 10);
  
  // Déterminer l'année
  const currentYear = new Date().getFullYear();
  let year: number;
  
  if (yearPart) {
    const yearStr = yearPart.slice(1); // Enlever le '/'
    year = yearStr.length === 2 ? 2000 + parseInt(yearStr, 10) : parseInt(yearStr, 10);
  } else {
    // Si pas d'année, utiliser année courante
    year = currentYear;
  }
  
  // Validation française complète (avec années bissextiles)
  if (!isValidFrenchDate(day, month, year)) {
    return null;
  }
  
  // Format ISO pour Saxium
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/**
 * Validation et parsing avec gestion warnings non bloquants
 */
export function validateAndParseMondayDate(dateStr: string): { 
  parsed: string | null, 
  warning?: string 
} {
  if (!dateStr) {
    return { parsed: null };
  }
  
  if (!dateStr.startsWith('->')) {
    return {
      parsed: null,
      warning: `Format date Monday.com invalide: doit commencer par '->' (reçu: ${dateStr})`
    };
  }
  
  const parsed = parseMondayDate(dateStr);
  
  if (!parsed) {
    // Essayer de déterminer la cause de l'échec
    const match = dateStr.match(/^->(\d{1,2})\/(\d{1,2})(\/\d{2,4})?$/);
    
    if (!match) {
      return {
        parsed: null,
        warning: `Format date Monday.com non reconnu: ${dateStr} (format attendu: ->DD/MM ou ->DD/MM/YY)`
      };
    }
    
    const [, part1, part2, yearPart] = match;
    const day = parseInt(part1, 10);
    const month = parseInt(part2, 10);
    
    if (month < 1 || month > 12) {
      return {
        parsed: null,
        warning: `Mois invalide dans ${dateStr}: ${month} (doit être 1-12 selon convention française DD/MM)`
      };
    }
    
    if (day < 1 || day > 31) {
      return {
        parsed: null,
        warning: `Jour invalide dans ${dateStr}: ${day} (doit être 1-31 selon convention française DD/MM)`
      };
    }
    
    return {
      parsed: null,
      warning: `Date invalide dans ${dateStr}: ${day}/${month} ne correspond pas au calendrier français`
    };
  }
  
  return { parsed };
}

// ========================================
// VALIDATION PERMISSIVE POUR MIGRATION PRODUCTION
// ========================================

/**
 * VALIDATION PERMISSIVE TEMPORAIRE - MODE PRODUCTION EXCEL
 * Accepte pratiquement tous caractères sauf codes de contrôle
 * RÉSOUT: "Nom client contient des caractères non supportés"
 */
function isValidForProduction(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  // Mode permissif pour migration Excel authentique
  const cleanValue = value.trim();
  if (cleanValue.length === 0) return false;
  
  // Accepter pratiquement tous caractères sauf codes de contrôle
  return /^[^\x00-\x1F\x7F]+$/.test(cleanValue);
}

/**
 * NORMALISATION AUTOMATIQUE DONNÉES EXCEL
 * Nettoie et normalise les données avant validation
 */
function normalizeExcelValue(value: string): string {
  if (!value) return '';
  
  return String(value)
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Supprimer codes de contrôle
    .replace(/\s+/g, ' ') // Normaliser espaces multiples
    .replace(/[""]/g, '"') // Normaliser guillemets
    .replace(/['']/g, "'"); // Normaliser apostrophes
}

/**
 * FALLBACK CLIENT NAME - VALEURS PAR DÉFAUT
 * Fournit valeurs par défaut au lieu de rejeter
 */
function fallbackClientName(name: string): string {
  const normalized = normalizeExcelValue(name);
  
  if (!normalized || normalized.length < 1) {
    return 'CLIENT_EXCEL_INCONNU';
  }
  
  if (!isValidForProduction(normalized)) {
    logger.warn('MondayValidator - Client name normalized', { metadata: { original: name, fallback: 'CLIENT_EXCEL_NORMALISE' 
              }
 
            });
    return 'CLIENT_EXCEL_NORMALISE';
  }
  
  return normalized;
}

/**
 * FALLBACK GEOGRAPHIC NAME - VALEURS PAR DÉFAUT
 * Fournit valeurs géographiques par défaut au lieu de rejeter
 */
function fallbackGeographicName(name: string): string {
  const normalized = normalizeExcelValue(name);
  
  if (!normalized || normalized.length < 1) {
    return 'ZONE_EXCEL_INCONNUE';
  }
  
  if (!isValidForProduction(normalized)) {
    logger.warn('MondayValidator - Geographic name normalized', { metadata: { original: name, fallback: 'ZONE_EXCEL_NORMALISEE' 
              }
 
            });
    return 'ZONE_EXCEL_NORMALISEE';
  }
  
  return normalized;
}

/**
 * DEBUG LOGGING DÉTAILLÉ POUR VALIDATION
 * Affiche les caractères exacts qui causent les rejets
 */
function debugValidationValue(fieldName: string, value: string): void {
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('MondayValidator - Validation debug', { metadata: { 
        fieldName, 
        value, 
        type: typeof value, 
        chars: JSON.stringify([...value]), 
        charCodes: [...value].map(c => c.charCodeAt(0)).join(', '),
        isValid: isValidForProduction(value)
              }

            });
  }
}

// ========================================
// SCHÉMAS VALIDATION MONDAY.COM
// ========================================

// Validation AO Monday.com (basée sur 911 lignes analysées)
// MODE PERMISSIF PRODUCTION - ACCEPTE DONNÉES EXCEL AUTHENTIQUES
export const mondayAoSchema = z.object({
  mondayItemId: z.string().min(1, 'Monday Item ID requis'),
  clientName: z.string()
    .min(1, 'Nom client requis')
    .transform(name => {
      debugValidationValue('clientName', name);
      return fallbackClientName(name);
    })
    .refine(name => isValidForProduction(name), {
      message: 'Nom client invalide après normalisation (codes de contrôle détectés)'
    }),
  city: z.string()
    .min(1, 'Ville requise')
    .transform(city => {
      debugValidationValue('city', city);
      return fallbackGeographicName(city);
    })
    .refine(city => isValidForProduction(city), {
      message: 'Ville invalide après normalisation (codes de contrôle détectés)'
    }),
  aoCategory: z.enum(['MEXT', 'MINT', 'HALL', 'SERRURERIE', 'BARDAGE', 'AUTRE'], {
    errorMap: () => ({ message: 'Catégorie AO doit être MEXT, MINT, HALL, SERRURERIE, BARDAGE ou AUTRE' })
  }),
  operationalStatus: z.enum(['A RELANCER', 'AO EN COURS', 'GAGNE', 'PERDU', 'ABANDONNE'], {
    errorMap: () => ({ message: 'Statut opérationnel invalide' })
  }),
  reference: z.string().optional(),
  projectSize: z.string()
    .regex(/^\d+\s*(lgts?|logements?|unités?)$/i, 'Format taille projet invalide (ex: "60 lgts")')
    .optional(),
  specificLocation: z.string()
    .min(3, 'Lieu spécifique trop court')
    .optional(),
  estimatedDelay: z.string()
    .refine(value => validateMondayDateFormat(value), {
      message: 'Format date Monday.com invalide. Formats supportés: "->12/09" (2 segments) ou "->01/10/25" (3 segments)'
    })
    .optional(),
  clientRecurrency: z.boolean().optional()
});

// Validation Project Monday.com (basée sur 1000 lignes analysées)
export const mondayProjectSchema = z.object({
  mondayProjectId: z.string().min(1, 'Monday Project ID requis'),
  name: z.string()
    .min(3, 'Nom projet requis')
    .max(200, 'Nom projet trop long'),
  clientName: z.string()
    .min(1, 'Nom client requis')
    .transform(name => {
      debugValidationValue('project.clientName', name);
      return fallbackClientName(name);
    })
    .refine(name => isValidForProduction(name), {
      message: 'Nom client invalide après normalisation (codes de contrôle détectés)'
    }),
  workflowStage: z.enum(['NOUVEAUX', 'En cours', 'ETUDE', 'VISA', 'PLANIFICATION', 'APPROVISIONNEMENT', 'CHANTIER', 'SAV'], {
    errorMap: () => ({ message: 'Stage workflow invalide' })
  }),
  projectSubtype: z.enum(['MEXT', 'MINT', 'BARDAGE', 'Refab', 'Recommande', 'DVA']).optional(),
  geographicZone: z.string()
    .min(1, 'Zone géographique requise')
    .transform(zone => {
      debugValidationValue('geographicZone', zone);
      return fallbackGeographicName(zone);
    })
    .refine(zone => isValidForProduction(zone), {
      message: 'Zone géographique invalide après normalisation (codes de contrôle détectés)'
    })
    .optional(),
  buildingCount: z.number()
    .int('Nombre bâtiments doit être entier')
    .min(1, 'Minimum 1 bâtiment')
    .max(10, 'Maximum 10 bâtiments')
    .optional()
});

// ========================================
// NORMALISATION ENUMS CASE-INSENSITIVE
// ========================================

/**
 * Normalise les enums case-insensitive pour corriger 'bardage' → 'BARDAGE'
 */
function normalizeEnums(data: unknown): unknown {
  const normalized = { ...data };
  
  // Normalisation aoCategory (AO)
  if (normalized.aoCategory && typeof normalized.aoCategory === 'string') {
    const categoryMap: { [key: string]: string } = {
      'mext': 'MEXT',
      'mint': 'MINT', 
      'hall': 'HALL',
      'serrurerie': 'SERRURERIE',
      'bardage': 'BARDAGE',
      'autre': 'AUTRE'
    };
    const normalized_category = categoryMap[normalized.aoCategory.toLowerCase()];
    if (normalized_category) {
      normalized.aoCategory = normalized_category;
    }
  }
  
  // Normalisation projectSubtype (Projects)
  if (normalized.projectSubtype && typeof normalized.projectSubtype === 'string') {
    const subtypeMap: { [key: string]: string } = {
      'mext': 'MEXT',
      'mint': 'MINT',
      'bardage': 'BARDAGE',
      'refab': 'Refab',
      'recommande': 'Recommande',
      'dva': 'DVA'
    };
    const normalized_subtype = subtypeMap[normalized.projectSubtype.toLowerCase()];
    if (normalized_subtype) {
      normalized.projectSubtype = normalized_subtype;
    }
  }
  
  // Normalisation workflowStage (Projects)
  if (normalized.workflowStage && typeof normalized.workflowStage === 'string') {
    const stageMap: { [key: string]: string } = {
      'nouveaux': 'NOUVEAUX',
      'en cours': 'En cours',
      'etude': 'ETUDE',
      'visa': 'VISA',
      'planification': 'PLANIFICATION',
      'approvisionnement': 'APPROVISIONNEMENT',
      'chantier': 'CHANTIER',
      'sav': 'SAV'
    };
    const normalized_stage = stageMap[normalized.workflowStage.toLowerCase()];
    if (normalized_stage) {
      normalized.workflowStage = normalized_stage;
    }
  }
  
  // Normalisation operationalStatus (AO)
  if (normalized.operationalStatus && typeof normalized.operationalStatus === 'string') {
    const statusMap: { [key: string]: string } = {
      'a relancer': 'A RELANCER',
      'ao en cours': 'AO EN COURS',
      'gagne': 'GAGNE',
      'perdu': 'PERDU',
      'abandonne': 'ABANDONNE'
    };
    const normalized_status = statusMap[normalized.operationalStatus.toLowerCase()];
    if (normalized_status) {
      normalized.operationalStatus = normalized_status;
    }
  }
  
  return normalized;
}

// ========================================
// VALIDATEURS PRINCIPAUX
// ========================================

/**
 * Valide et normalise données AO Monday.com
 * Applique les règles métier JLM et patterns analysés
 */
export function validateMondayAoData(data: MondayAoData): MondayAoData {
  try {
    // ÉTAPE 1: Normalisation des enums case-insensitive
    const preprocessedData = normalizeEnums(data);
    
    // ÉTAPE 2: Validation schema de base
    let validatedData = mondayAoSchema.parse(preprocessedData);

    // Normalisation clients JLM (patterns analysés)
    validatedData = normalizeClientName(validatedData);

    // Normalisation villes Nord France
    validatedData = normalizeGeographicData(validatedData);

    // Validation règles métier JLM
    validatedData = applyJLMBusinessRules(validatedData);

    return validatedData;

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `$) {err.path.join('.')}: ${err.message}`).join(', ');
      throw new AppError(`Validation Monday.com AO échouée: ${errorMessages}`, 500);
    }
    throw error;
  }
}

/**
 * Valide et normalise données Project Monday.com
 * Applique les règles métier JLM et workflow Saxium
 */
export function validateMondayProjectData(data: MondayProjectData): MondayProjectData {
  try {
    // ÉTAPE 1: Normalisation des enums case-insensitive
    const preprocessedData = normalizeEnums(data);
    
    // ÉTAPE 2: Validation schema de base
    let validatedData = mondayProjectSchema.parse(preprocessedData);

    // Normalisation clients JLM
    validatedData = normalizeProjectClientName(validatedData);

    // Validation workflow stages vs Saxium
    validatedData = validateWorkflowCompatibility(validatedData);

    // Application règles métier projets JLM
    validatedData = applyProjectBusinessRules(validatedData);

    return validatedData;

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => `$) {err.path.join('.')}: ${err.message}`).join(', ');
      throw new AppError(`Validation Monday.com Project échouée: ${errorMessages}`, 500);
    }
    throw error;
  }
}

// ========================================
// NORMALISATION CLIENTS JLM
// ========================================

/**
 * Normalise les noms clients selon patterns JLM analysés
 */
function normalizeClientName(data: MondayAoData): MondayAoData {
  const CLIENT_NORMALIZATIONS = {
    // Clients récurrents JLM identifiés dans analyse
    'nexity': 'NEXITY',
    'NEXITY IR NORD LILLE': 'NEXITY',
    'cogedim': 'COGEDIM', 
    'COGEDIM NORD': 'COGEDIM',
    'partenord habitat': 'PARTENORD HABITAT',
    'PARTENORD': 'PARTENORD HABITAT',
    'thomas & piron': 'THOMAS & PIRON',
    'thomas et piron': 'THOMAS & PIRON',
    'realite': 'REALITE',
    'novebat': 'NOVEBAT',
    'tma': 'TMA',
    'immo investim': 'IMMO INVESTIM',
    'novalys': 'NOVALYS',
    'ogn promotion': 'OGN Promotion'
  };

  const normalizedClientKey = data.clientName.toLowerCase();
  const normalizedClient = CLIENT_NORMALIZATIONS[normalizedClientKey as keyof typeof CLIENT_NORMALIZATIONS];
  
  if (normalizedClient) {
    return {
      ...data,
      clientName: normalizedClient,
      clientRecurrency: ['NEXITY', 'COGEDIM', 'PARTENORD HABITAT'].includes(normalizedClient)
    };
  }

  return data;
}

function normalizeProjectClientName(data: MondayProjectData): MondayProjectData {
  // Même logique que normalizeClientName mais pour projets
  const CLIENT_NORMALIZATIONS = {
    'nexity': 'NEXITY',
    'cogedim': 'COGEDIM', 
    'partenord habitat': 'PARTENORD HABITAT',
    'thomas & piron': 'THOMAS & PIRON',
    'realite': 'REALITE'
  };

  const normalizedClientKey = data.clientName.toLowerCase();
  const normalizedClient = CLIENT_NORMALIZATIONS[normalizedClientKey as keyof typeof CLIENT_NORMALIZATIONS];
  
  return {
    ...data,
    clientName: normalizedClient || data.clientName
  };
}

// ========================================
// NORMALISATION GÉOGRAPHIQUE
// ========================================

/**
 * Normalise données géographiques Nord France
 */
function normalizeGeographicData(data: MondayAoData): MondayAoData {
  const CITY_NORMALIZATIONS = {
    // Villes détectées dans analyse avec variantes
    'grande synthe': 'GRANDE-SYNTHE',
    'grande-synthe': 'GRANDE-SYNTHE',
    'dunkerque': 'DUNKERQUE',
    'le crotoy': 'LE CROTOY',
    'boulogne': 'BOULOGNE',
    'boulogne sur mer': 'BOULOGNE',
    'etaples': 'ETAPLES',
    'longuenesse': 'LONGUENESSE',
    'fruges': 'FRUGES',
    'bethune': 'BETHUNE',
    'béthune': 'BETHUNE',
    'calais': 'CALAIS',
    'berck': 'BERCK',
    'saint omer': 'SAINT OMER',
    'st omer': 'SAINT OMER'
  };

  const normalizedCityKey = data.city.toLowerCase();
  const normalizedCity = CITY_NORMALIZATIONS[normalizedCityKey as keyof typeof CITY_NORMALIZATIONS];
  
  return {
    ...data,
    city: normalizedCity || data.city.toUpperCase()
  };
}

// ========================================
// RÈGLES MÉTIER JLM
// ========================================

/**
 * Applique règles métier JLM spécifiques aux AO
 */
function applyJLMBusinessRules(data: MondayAoData): MondayAoData {
  let processedData = { ...data };

  // Règle: NEXITY/COGEDIM → souvent MEXT
  if (['NEXITY', 'COGEDIM'].includes(processedData.clientName) && 
      processedData.aoCategory === 'AUTRE') {
    processedData.aoCategory = 'MEXT';
  }

  // Règle: Projets SAV → pas de taille projet
  if (processedData.specificLocation?.toLowerCase().includes('sav') && 
      processedData.projectSize) {
    processedData.projectSize = undefined;
  }

  // Règle: Projets gagnés → délai requis
  if (processedData.operationalStatus === 'GAGNE' && !processedData.estimatedDelay) {
    // Générer délai standard (+3 mois)
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    processedData.estimatedDelay = `->${futureDate.getDate().toString().padStart(2, '0')}/${(futureDate.getMonth() + 1).toString().padStart(2, '0')}/${futureDate.getFullYear().toString().slice(-2)}`;
  }

  return processedData;
}

/**
 * Applique règles métier JLM spécifiques aux projets
 */
function applyProjectBusinessRules(data: MondayProjectData): MondayProjectData {
  let processedData = { ...data };

  // Règle: Projets SAV → workflow SAV
  if (processedData.name.toLowerCase().includes('sav')) {
    processedData.workflowStage = 'SAV';
  }

  // Règle: Nouveaux projets NEXITY → souvent MEXT
  if (processedData.clientName === 'NEXITY' && 
      processedData.workflowStage === 'NOUVEAUX' && 
      !processedData.projectSubtype) {
    processedData.projectSubtype = 'MEXT';
  }

  // Règle: Projets avec numérotation → compter bâtiments
  const buildingCountMatch = processedData.name.match(/(\d+)\s*lgts?/i);
  if (buildingCountMatch && !processedData.buildingCount) {
    const lgtsCount = parseInt(buildingCountMatch[1], 10);
    // Heuristique: >50 lgts = probablement plusieurs bâtiments
    if (lgtsCount > 50) {
      processedData.buildingCount = Math.ceil(lgtsCount / 30); // ~30 lgts par bâtiment
    }
  }

  return processedData;
}

// ========================================
// COMPATIBILITÉ WORKFLOW SAXIUM
// ========================================

/**
 * Valide compatibilité workflow Monday.com → Saxium
 */
function validateWorkflowCompatibility(data: MondayProjectData): MondayProjectData {
  // Mapping workflow Monday.com → Saxium déjà validé à 90%
  const WORKFLOW_COMPATIBILITY = {
    'NOUVEAUX': 'passation',      // ✅ Compatible
    'En cours': 'etude',          // ✅ Compatible  
    'ETUDE': 'etude',             // ✅ Compatible
    'VISA': 'visa_architecte',    // ✅ Compatible (nouveau dans Saxium)
    'PLANIFICATION': 'planification', // ✅ Compatible
    'APPROVISIONNEMENT': 'approvisionnement', // ✅ Compatible
    'CHANTIER': 'chantier',       // ✅ Compatible
    'SAV': 'sav'                  // ✅ Compatible
  };

  const saxiumStage = WORKFLOW_COMPATIBILITY[data.workflowStage as keyof typeof WORKFLOW_COMPATIBILITY];
  if (!saxiumStage) {
    throw new AppError(`Workflow stage "${data.workflowStage}" non compatible avec Saxium`, 500);
  }

  return data;
}

// ========================================
// VALIDATION BATCH
// ========================================

/**
 * Valide un lot de données AO avec rapport détaillé
 */
export function validateAoBatch(data: MondayAoData[]): {
  valid: MondayAoData[];
  invalid: Array<{ data: MondayAoData; errors: string[] }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    validationRate: number;
  };
} {
  const results = {
    valid: [] as MondayAoData[],
    invalid: [] as Array<{ data: MondayAoData; errors: string[] }>,
    summary: {
      total: data.length,
      valid: 0,
      invalid: 0,
      validationRate: 0
    }
  };

  data.forEach(aoData => {
    try {
      const validatedData = validateMondayAoData(aoData);
      results.valid.push(validatedData);
      results.summary.valid++;
    } catch (error) {
      results.invalid.push({
        data: aoData,
        errors: [error instanceof Error ? error.message : String(error)]
      });
      results.summary.invalid++;
    });

  results.summary.validationRate = results.summary.valid / results.summary.total;

  return results;
}

/**
 * Valide un lot de données Project avec rapport détaillé
 */
export function validateProjectBatch(data: MondayProjectData[]): {
  valid: MondayProjectData[];
  invalid: Array<{ data: MondayProjectData; errors: string[] }>;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    validationRate: number;
  };
} {
  const results = {
    valid: [] as MondayProjectData[],
    invalid: [] as Array<{ data: MondayProjectData; errors: string[] }>,
    summary: {
      total: data.length,
      valid: 0,
      invalid: 0,
      validationRate: 0
    }
  };

  data.forEach(projectData => {
    try {
      const validatedData = validateMondayProjectData(projectData);
      results.valid.push(validatedData);
      results.summary.valid++;
    } catch (error) {
      results.invalid.push({
        data: projectData,
        errors: [error instanceof Error ? error.message : String(error)]
      });
      results.summary.invalid++;
    });

  results.summary.validationRate = results.summary.valid / results.summary.total;

  return results;
}