/**
 * Normalizer pour critères techniques - Snake_case ↔ camelCase
 * Résout le problème critique de mismatch entre ground-truth (snake_case) et code (camelCase)
 */

// Mapping bi-directionnel des clés de critères techniques
const CRITERIA_KEY_MAP = {
  // snake_case → camelCase
  'coupe_feu': 'coupeFeu',
  'batiment_passif': 'batimentPassif', 
  'isolation_renforcee': 'isolationRenforcee',
  'precadres': 'precadres', // Identique dans les deux formats
  'volets_exterieurs': 'voletsExterieurs'
} as const;

// Reverse mapping camelCase → snake_case  
const REVERSE_CRITERIA_KEY_MAP = Object.fromEntries(
  Object.entries(CRITERIA_KEY_MAP).map(([snake, camel]) => [camel, snake])
) as Record<string, string>;

/**
 * Convertit les clés snake_case vers camelCase pour ground-truth
 * @param groundTruth - Données ground-truth avec clés snake_case
 * @returns Objet avec clés normalisées en camelCase
 */
export function normalizeGroundTruthKeys(groundTruth: any): any {
  if (!groundTruth || typeof groundTruth !== 'object') {
    return groundTruth;
  }

  // Cloner l'objet pour éviter mutations
  const normalized = { ...groundTruth };

  // Normaliser specialCriteria si présent
  if (normalized.specialCriteria && typeof normalized.specialCriteria === 'object') {
    const normalizedCriteria: Record<string, any> = {};
    
    for (const [snakeKey, criteriaData] of Object.entries(normalized.specialCriteria)) {
      const camelKey = CRITERIA_KEY_MAP[snakeKey as keyof typeof CRITERIA_KEY_MAP] || snakeKey;
      normalizedCriteria[camelKey] = criteriaData;
    }
    
    normalized.specialCriteria = normalizedCriteria;
  }

  return normalized;
}

/**
 * Convertit les clés camelCase vers snake_case pour comparaison avec ground-truth
 * @param ocrResult - Résultat OCR avec clés camelCase
 * @returns Objet avec clés normalisées en snake_case
 */
export function normalizeOcrResultKeys(ocrResult: any): any {
  if (!ocrResult || typeof ocrResult !== 'object') {
    return ocrResult;
  }

  // Cloner l'objet pour éviter mutations
  const normalized = { ...ocrResult };

  // Normaliser specialCriteria si présent
  if (normalized.specialCriteria && typeof normalized.specialCriteria === 'object') {
    const normalizedCriteria: Record<string, any> = {};
    
    for (const [camelKey, value] of Object.entries(normalized.specialCriteria)) {
      const snakeKey = REVERSE_CRITERIA_KEY_MAP[camelKey] || camelKey;
      normalizedCriteria[snakeKey] = value;
    }
    
    normalized.specialCriteria = normalizedCriteria;
  }

  return normalized;
}

/**
 * Normalise les deux objets pour comparaison directe
 * Convertit tout vers camelCase comme format standard
 * @param groundTruth - Données ground-truth (snake_case)
 * @param ocrResult - Résultat OCR (camelCase)
 * @returns Tuple [groundTruthNormalized, ocrResultNormalized] en camelCase
 */
export function normalizeForComparison(
  groundTruth: any, 
  ocrResult: any
): [any, any] {
  const normalizedGroundTruth = normalizeGroundTruthKeys(groundTruth);
  // ocrResult est déjà en camelCase, pas besoin de conversion
  return [normalizedGroundTruth, ocrResult];
}

/**
 * Extract les critères attendus depuis ground-truth normalisé
 * @param normalizedGroundTruth - Ground-truth avec clés camelCase
 * @returns Array des critères techniques attendus (camelCase)
 */
export function extractExpectedCriteria(normalizedGroundTruth: any): string[] {
  if (!normalizedGroundTruth?.specialCriteria) {
    return [];
  }

  return Object.entries(normalizedGroundTruth.specialCriteria)
    .filter(([_, data]: [string, any]) => data?.expected === true)
    .map(([criterion]) => criterion);
}

/**
 * Extract les critères détectés depuis résultat OCR
 * @param ocrResult - Résultat OCR avec clés camelCase
 * @returns Array des critères techniques détectés (camelCase)
 */
export function extractDetectedCriteria(ocrResult: any): string[] {
  if (!ocrResult?.specialCriteria) {
    return [];
  }

  return Object.entries(ocrResult.specialCriteria)
    .filter(([_, value]) => value === true)
    .map(([criterion]) => criterion);
}

/**
 * Utilitaires pour validation et debugging
 */
export const CriteriaNormalizer = {
  CRITERIA_KEY_MAP,
  REVERSE_CRITERIA_KEY_MAP,
  
  /**
   * Valide qu'une clé existe dans le mapping
   */
  isValidCriteriaKey(key: string, format: 'snake' | 'camel' = 'snake'): boolean {
    if (format === 'snake') {
      return key in CRITERIA_KEY_MAP;
    } else {
      return key in REVERSE_CRITERIA_KEY_MAP;
    }
  },
  
  /**
   * Obtient toutes les clés supportées
   */
  getAllKeys(): { snake: string[], camel: string[] } {
    return {
      snake: Object.keys(CRITERIA_KEY_MAP),
      camel: Object.values(CRITERIA_KEY_MAP)
    };
  },
  
  /**
   * Debug helper pour afficher les mappings
   */
  debugMapping(): void {
    console.log('🔧 Criteria Key Mappings:');
    console.table(CRITERIA_KEY_MAP);
  }
};