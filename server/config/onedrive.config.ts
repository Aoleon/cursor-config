import { logger } from './utils/logger';
import { withErrorHandling } from './utils/error-handler';
/**
 * ROBUST-2: OneDrive Taxonomy Configuration
 * 
 * Configuration centralisée de la structure de dossiers OneDrive
 * pour la GED (Gestion Électronique de Documents)
 */

export interface OneDriveTaxonomyConfig {
  /** Racine du dossier OneDrive pour tous les projets */
  rootPath: string;
  
  /** Template pour les dossiers AO (utilise {reference} comme placeholder) */
  aoFolderTemplate: string;
  
  /** Catégories de documents pour les AOs */
  aoCategories: string[];
  
  /** Template pour les dossiers Projets (utilise {reference} comme placeholder) */
  projectFolderTemplate?: string;
  
  /** Catégories de documents pour les Projets */
  projectCategories?: string[];
}

/**
 * Configuration par défaut de la taxonomie OneDrive
 * Peut être surchargée par variable d'environnement ONEDRIVE_TAXONOMY_CONFIG
 */
export const DEFAULT_ONEDRIVE_TAXONOMY: OneDriveTaxonomyConfig = {
  rootPath: 'OneDrive-JLM/01 - ETUDES AO',
  aoFolderTemplate: 'AO-{reference}',
  aoCategories: [
    '01-DCE-Cotes-Photos',
    '02-Etudes-fournisseurs',
    '03-Devis-pieces-administratives'
  ],
  // Future: Configuration pour les projets
  projectFolderTemplate: 'PROJET-{reference}',
  projectCategories: [
    '01-Plans-execution',
    '02-Photos-chantier',
    '03-Documents-administratifs',
    '04-Reception-livraison'
  ]
};

/**
 * Récupère la configuration de taxonomie OneDrive
 * Peut être surchargée via JSON dans variable d'environnement
 */
export function getOneDriveTaxonomy(): OneDriveTaxonomyConfig {
  // Check pour configuration custom via env var
  const customConfig = process.env.ONEDRIVE_TAXONOMY_CONFIG;
  
  if (customConfig) {
    return withErrorHandling(
    async () => {

      const parsed = JSON.parse(customConfig);
      return { ...DEFAULT_ONEDRIVE_TAXONOMY, ...parsed };
    
    },
    {
      operation: 'GED',
      service: 'onedrive.config',
      metadata: {}
    });
  }
  
  return DEFAULT_ONEDRIVE_TAXONOMY;
}

/**
 * Helper: Construire le chemin complet d'un dossier AO
 */
export function buildAoPath(aoReference: string): string {
  const config = getOneDriveTaxonomy();
  const folderName = config.aoFolderTemplate.replace('{reference}', aoReference);
  return `${config.rootPath}/${folderName}`;
}

/**
 * Helper: Construire le chemin d'une catégorie pour un AO
 */
export function buildAoCategoryPath(aoReference: string, category: string): string {
  const aoPath = buildAoPath(aoReference);
  return `${aoPath}/${category}`;
}

/**
 * Helper: Valider qu'une catégorie est valide pour les AOs
 */
export function isValidAoCategory(category: string): boolean {
  const config = getOneDriveTaxonomy();
  return config.aoCategories.includes(category);
}

/**
 * Helper: Récupérer toutes les catégories AO configurées
 */
export function getAoCategories(): string[] {
  const config = getOneDriveTaxonomy();
  return [...config.aoCategories]; // Clone pour éviter mutation
}
