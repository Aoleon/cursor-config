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
import type { MondayAoData, MondayProjectData } from './mondayDataGenerator';

// ========================================
// SCHÉMAS VALIDATION MONDAY.COM
// ========================================

// Validation AO Monday.com (basée sur 911 lignes analysées)
export const mondayAoSchema = z.object({
  mondayItemId: z.string().min(1, 'Monday Item ID requis'),
  clientName: z.string()
    .min(1, 'Nom client requis')
    .refine(name => /^[A-Z\s&\-'\.]+$/i.test(name), 'Nom client doit être alphabétique'),
  city: z.string()
    .min(2, 'Ville requise')
    .refine(city => /^[A-Z\s\-']+$/i.test(city), 'Ville doit être alphabétique'),
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
    .regex(/^->\d{2}\/\d{2}\/\d{2}$/, 'Format date Monday.com invalide (ex: "->01/10/25")')
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
    .refine(name => /^[A-Z\s&\-'\.]+$/i.test(name), 'Nom client doit être alphabétique'),
  workflowStage: z.enum(['NOUVEAUX', 'En cours', 'ETUDE', 'VISA', 'PLANIFICATION', 'APPROVISIONNEMENT', 'CHANTIER', 'SAV'], {
    errorMap: () => ({ message: 'Stage workflow invalide' })
  }),
  projectSubtype: z.enum(['MEXT', 'MINT', 'BARDAGE', 'Refab', 'Recommande', 'DVA']).optional(),
  geographicZone: z.string()
    .min(2, 'Zone géographique requise')
    .refine(zone => /^[A-Z\s\-']+$/i.test(zone), 'Zone géographique doit être alphabétique')
    .optional(),
  buildingCount: z.number()
    .int('Nombre bâtiments doit être entier')
    .min(1, 'Minimum 1 bâtiment')
    .max(10, 'Maximum 10 bâtiments')
    .optional()
});

// ========================================
// VALIDATEURS PRINCIPAUX
// ========================================

/**
 * Valide et normalise données AO Monday.com
 * Applique les règles métier JLM et patterns analysés
 */
export function validateMondayAoData(data: MondayAoData): MondayAoData {
  try {
    // Validation schema de base
    let validatedData = mondayAoSchema.parse(data);

    // Normalisation clients JLM (patterns analysés)
    validatedData = normalizeClientName(validatedData);

    // Normalisation villes Nord France
    validatedData = normalizeGeographicData(validatedData);

    // Validation règles métier JLM
    validatedData = applyJLMBusinessRules(validatedData);

    return validatedData;

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Validation Monday.com AO échouée: ${errorMessages}`);
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
    // Validation schema de base
    let validatedData = mondayProjectSchema.parse(data);

    // Normalisation clients JLM
    validatedData = normalizeProjectClientName(validatedData);

    // Validation workflow stages vs Saxium
    validatedData = validateWorkflowCompatibility(validatedData);

    // Application règles métier projets JLM
    validatedData = applyProjectBusinessRules(validatedData);

    return validatedData;

  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Validation Monday.com Project échouée: ${errorMessages}`);
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
    throw new Error(`Workflow stage "${data.workflowStage}" non compatible avec Saxium`);
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
    }
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
    }
  });

  results.summary.validationRate = results.summary.valid / results.summary.total;

  return results;
}