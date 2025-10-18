/**
 * MONDAY.COM → SAXIUM MIGRATION MAPPING CONFIGURATION
 * 
 * Configuration centralisée pour le mapping des champs Monday.com vers Saxium
 * Basée sur l'analyse du schéma et les patterns identifiés
 */

/**
 * Configuration de mapping pour une entité
 */
export interface EntityMappingConfig {
  boardId?: string; // ID du board Monday.com (à configurer)
  columnMappings: Record<string, string>; // monday_column_id → saxium_field
  enumMappings: Record<string, Record<string, any>>; // field → { MondayValue: saxiumValue }
  transformations?: Record<string, (value: any, item?: any) => any>; // Transformations custom
  requiredFields: string[]; // Champs obligatoires Saxium
  mondayFields: string[]; // Champs Monday.com à préserver
}

/**
 * MAPPING AOS (APPELS D'OFFRES)
 */
export const aosMappingConfig: EntityMappingConfig = {
  boardId: '3946257560', // Board AO Monday.com (analysé le 18/10/2025)
  
  columnMappings: {
    // Mappings de base - COLONNES RÉELLES BOARD AO (ID: 3946257560)
    'name': 'reference',              // Monday name → Saxium reference (transformation avec mondayItemId si vide)
    'text7': 'client',                // Monday "MOA" (Maître d'Ouvrage) → Saxium client
    'text9': 'maitreOeuvre',          // Monday "MOE" (Maître d'Œuvre) → extension Saxium
    'location': 'location',           // Monday "Lieu" → Saxium location
    'lot': 'aoCategory',              // Monday "LOT" (status) → Saxium aoCategory
    'color2': 'operationalStatus',    // Monday "Passation" (status) → Saxium operationalStatus
    'priority__1': 'priority',        // Monday "Priority" (status) → Saxium priority
    'numeric': 'amountEstimate',      // Monday "CA HT" → Saxium amountEstimate
    'date24': 'dueDate',              // Monday "Rendu" → Saxium dueDate
    'date': 'dateButoir',             // Monday "Bouclage AO" → extension Saxium
    'date8': 'dateVisite',            // Monday "Visite de site" → extension Saxium
    'text0': 'codeDevis',             // Monday "Code Devis" → extension Saxium
    'texte0': 'codeChantier',         // Monday "Code chantier" → extension Saxium
    'label': 'anneeProduction',       // Monday "Année Prod" → extension Saxium
    'chiffres': 'ds',                 // Monday "DS" → extension Saxium
    'numeric3': 'nombreHeures',       // Monday "Nombre heures" → extension Saxium
    'text_mksnx1hc': 'description',   // Monday "Texte" → Saxium description
    
    // Extensions Monday.com (colonnes réelles)
    'multiple_person': 'personnes',   // Monday "Personnes" (people) - utilisateurs assignés
    'statut_1': 'statutChiffrage',    // Monday "Chiffrage" (status)
    'statut_16': 'statutDevis',       // Monday "Devis" (status)
    'statut_1__1': 'demandePrix',     // Monday "Demande de prix" (status)
    'date__1': 'dateAccord',          // Monday "Date Accord"
    'date_mknxpk8d': 'dateDemarrage', // Monday "Démarrage"
    'monday_item_id': 'mondayItemId'  // ID item Monday (pour sync)
  },

  enumMappings: {
    // Valeurs réelles Monday.com analysées (18/10/2025)
    aoCategory: {
      'Menu Ext': 'MEXT',
      'Menu int': 'MINT',
      'Mext/Bardage': 'BARDAGE',
      'Bardage': 'BARDAGE',
      'Mext/Mint': 'MINT',
      'TCE': 'AUTRE',
      'CAPSO': 'AUTRE',
      'Charpente / Ossature': 'AUTRE',
      'Etanchéité / Couverture': 'AUTRE',
      'Parquet': 'AUTRE'
    },
    
    operationalStatus: {
      'A Faire': 'en_attente',
      'En cours': 'en_cours',
      'Faite': 'gagne',  // Passation faite = gagné
      '5': 'en_cours'    // Fallback nombre
    },

    priority: {
      'Critical ⚠️️': 'critique',
      'High': 'elevee',
      'Medium': 'normale',
      'Low': 'faible',
      'A confirmer': 'normale',
      'Plus Tard': 'faible',
      '5': 'normale'  // Fallback nombre
    }
  },

  transformations: {
    // CRITIQUE: Générer référence unique basée sur Monday item ID
    // Stratégie: name si présent, sinon "AO-{mondayItemId}" pour garantir unicité
    reference: (value: string | undefined, item: any) => {
      if (value && value.trim()) return value.trim();
      
      // Utiliser Monday item ID pour garantir unicité
      const mondayId = item.mondayItemId || item.id;
      if (mondayId) {
        return `AO-${mondayId}`;
      }
      
      // Fallback: timestamp (peu probable)
      const timestamp = Date.now().toString().slice(-6);
      return `AO-${timestamp}`;
    },

    // CRITIQUE: Extraire client depuis text7 (MOA - Maître d'Ouvrage)
    // Si vide, fallback vers "Client inconnu"
    client: (value: string | undefined, item: any) => {
      if (value && value.trim()) return value.trim();
      
      // Fallback vers maitreOeuvre si MOA vide
      if (item.maitreOeuvre && item.maitreOeuvre.trim()) {
        return item.maitreOeuvre.trim();
      }
      
      // Dernier recours: Client inconnu
      return 'Client inconnu';
    },

    // CRITIQUE: Valeur par défaut pour source (required dans schéma)
    source: (value: string | undefined) => {
      if (value) return value;
      return 'website'; // Par défaut: website (AO vient souvent du site)
    },

    // CRITIQUE: Valeur par défaut pour menuiserieType (required dans schéma)
    menuiserieType: (value: string | undefined) => {
      if (value) return value;
      return 'autre'; // Par défaut: autre
    },

    // DATES: Convertir strings ISO Monday → Date objects Saxium
    dueDate: (value: any) => {
      if (!value || value === null) return undefined;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    },

    dateButoir: (value: any) => {
      if (!value || value === null) return undefined;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    },

    dateVisite: (value: any) => {
      if (!value || value === null) return undefined;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    },

    dateAccord: (value: any) => {
      if (!value || value === null) return undefined;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    },

    dateDemarrage: (value: any) => {
      if (!value || value === null) return undefined;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
  },

  requiredFields: ['reference', 'client', 'source', 'menuiserieType'],
  mondayFields: ['mondayItemId', 'mondayId', 'mondaySyncStatus']
};

/**
 * MAPPING PROJECTS (CHANTIERS)
 * Board ID: 5296947311 (368 items)
 * Analysé le 18/10/2025 - Vraies colonnes Monday.com
 */
export const projectsMappingConfig: EntityMappingConfig = {
  boardId: '5296947311', // Board Projects Monday.com (368 items)
  
  columnMappings: {
    // Vraies colonnes Monday identifiées
    'name': 'name',                     // Nom du projet
    'texte': 'client',                  // MOA → client
    'dup__of_moa': 'maitreOeuvre',      // MOE → extension
    'texte1': 'codeChantier',           // Num Chantier
    'text': 'codeDevis',                // Num Devis (peut servir de reference unique)
    'label': 'lot',                     // Lot (status) → category
    'statut3': 'status',                // Etat → status
    'statut6': 'passation',             // Passation (status) → extension
    'chiffres': 'budget',               // CA HT → budget
    'date_mkn1s5d4': 'startDate',       // Date Etude → startDate
    'person': 'personnes',              // Personne (people)
    'dup__of_ca_ht': 'nombreHeures',    // Nb Heures
    'monday_item_id': 'mondayItemId'    // ID item Monday (pour sync)
  },

  enumMappings: {
    // statut3 → status (valeurs réelles analysées)
    // IMPORTANT: Utilise uniquement les valeurs du projectStatusEnum schema
    status: {
      'Nouveau': 'passation',
      'Etude A faire': 'etude',
      'En cours': 'chantier',       // En production → chantier
      'Fait': 'chantier',            // Terminé → chantier (projet fini)
      'Réceptionné': 'sav',          // Livré/Réceptionné → SAV (après livraison)
      '5': 'chantier'                // Fallback nombre
    },

    // label → lot (réutiliser mapping AOs)
    lot: {
      'Menu Ext': 'MEXT',
      'Menu int': 'MINT',
      'Mext/Bardage': 'BARDAGE',
      'Bardage': 'BARDAGE',
      'Mext/Mint': 'MINT',
      'TCE': 'AUTRE',
      'CAPSO': 'AUTRE',
      'Charpente / Ossature': 'AUTRE',
      'Etanchéité / Couverture': 'AUTRE',
      'Parquet': 'AUTRE'
    }
  },

  transformations: {
    // CRITIQUE: Transformation du nom (required)
    name: (value: string | undefined, item: any) => {
      if (value && value.trim()) return value.trim();
      
      // Fallback: utiliser codeDevis ou codeChantier
      if (item.codeDevis && item.codeDevis.trim()) {
        return `Projet-${item.codeDevis.trim()}`;
      }
      if (item.codeChantier && item.codeChantier.trim()) {
        return `Projet-${item.codeChantier.trim()}`;
      }
      
      // Dernier recours: Monday item ID
      const mondayId = item.mondayItemId || item.id;
      if (mondayId) {
        return `Projet-${mondayId}`;
      }
      
      return `Projet-${Date.now().toString().slice(-6)}`;
    },

    // CRITIQUE: Transformation client (required avec fallback)
    client: (value: string | undefined, item: any) => {
      if (value && value.trim()) return value.trim();
      
      // Fallback vers maitreOeuvre si MOA vide
      if (item.maitreOeuvre && item.maitreOeuvre.trim()) {
        return item.maitreOeuvre.trim();
      }
      
      // Dernier recours: Client inconnu
      return 'Client inconnu';
    },

    // CRITIQUE: Transformation location (required avec fallback)
    location: (value: string | undefined, item: any) => {
      if (value && value.trim()) return value.trim();
      
      // Fallback: location par défaut
      return 'Non spécifié';
    },

    // DATES: Convertir strings ISO Monday → Date objects Saxium
    startDate: (value: any) => {
      if (!value || value === null) return undefined;
      if (value instanceof Date) return value;
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
  },

  requiredFields: ['name', 'client', 'location'],
  mondayFields: ['mondayProjectId', 'mondayItemId', 'mondayId', 'mondaySyncStatus']
};

/**
 * MAPPING SUPPLIERS (FOURNISSEURS)
 */
export const suppliersMappingConfig: EntityMappingConfig = {
  boardId: process.env.MONDAY_SUPPLIERS_BOARD_ID || '', // À configurer
  
  columnMappings: {
    'name': 'name',
    'contact': 'contact',
    'email': 'email',
    'phone': 'phone',
    'address': 'address',
    'siret': 'siret',
    'specialties': 'specialties',
    'status': 'status',
    'coverage_departements': 'coverageDepartements',
    'response_time_avg_days': 'responseTimeAvgDays',
    'notes': 'notes',
    'monday_item_id': 'mondayItemId'
  },

  enumMappings: {
    status: {
      'Actif': 'actif',
      'Inactif': 'inactif',
      'Suspendu': 'suspendu',
      'Blacklisté': 'blackliste'
    },

    coverageDepartements: {
      // Départements français (mapping si nécessaire)
      // Format Monday peut être "62, 59, 80" → array ["62", "59", "80"]
    }
  },

  transformations: {
    // Transformer string "62, 59, 80" en array
    coverageDepartements: (value: string) => {
      if (!value) return undefined;
      if (typeof value === 'string') {
        return value.split(',').map(d => d.trim()).filter(Boolean);
      }
      return value;
    },

    // Transformer string spécialités en array
    specialties: (value: string) => {
      if (!value) return [];
      if (typeof value === 'string') {
        return value.split(',').map(s => s.trim()).filter(Boolean);
      }
      return value;
    }
  },

  requiredFields: ['name'],
  mondayFields: ['mondayItemId']
};

/**
 * Mapping consolidé pour toutes les entités
 */
export const mondayMigrationMapping = {
  aos: aosMappingConfig,
  projects: projectsMappingConfig,
  suppliers: suppliersMappingConfig
} as const;

/**
 * Type helper pour entity type
 */
export type EntityType = keyof typeof mondayMigrationMapping;

/**
 * Récupère la configuration de mapping pour une entité
 */
export function getMappingConfig(entityType: EntityType): EntityMappingConfig {
  return mondayMigrationMapping[entityType];
}

/**
 * Vérifie si un board ID est configuré pour une entité
 */
export function isBoardConfigured(entityType: EntityType): boolean {
  const config = getMappingConfig(entityType);
  return !!config.boardId && config.boardId.length > 0;
}

/**
 * Valide que tous les champs requis sont présents
 */
export function validateRequiredFields(
  entityType: EntityType,
  data: Record<string, any>
): { valid: boolean; missingFields: string[] } {
  const config = getMappingConfig(entityType);
  const missingFields = config.requiredFields.filter(field => !data[field]);
  
  return {
    valid: missingFields.length === 0,
    missingFields
  };
}
