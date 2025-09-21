/**
 * WORKFLOW STATUS MAPPINGS - Centralized status constants
 * Based on backend offerStatusEnum from shared/schema.ts
 * 
 * These constants ensure consistency between frontend components
 * and exact alignment with backend status values.
 */

// Backend offer status enum values (canonical source of truth)
export const OFFER_STATUS = {
  BROUILLON: 'brouillon',
  ETUDE_TECHNIQUE: 'etude_technique',
  EN_ATTENTE_FOURNISSEURS: 'en_attente_fournisseurs',
  EN_COURS_CHIFFRAGE: 'en_cours_chiffrage', 
  EN_ATTENTE_VALIDATION: 'en_attente_validation',
  FIN_ETUDES_VALIDEE: 'fin_etudes_validee',
  VALIDE: 'valide',
  SIGNE: 'signe',
  TRANSFORME_EN_PROJET: 'transforme_en_projet',
  TERMINE: 'termine',
  ARCHIVE: 'archive'
} as const;

// Workflow-specific status groupings for list components
export const WORKFLOW_STATUS_FILTERS = {
  // ChiffrageList: Shows offers ready for chiffrage + currently being worked on
  CHIFFRAGE_READY: [
    OFFER_STATUS.EN_ATTENTE_FOURNISSEURS,  // Ready to start chiffrage (prices received)
    OFFER_STATUS.EN_COURS_CHIFFRAGE        // Currently being worked on
  ],
  
  // ValidationList: Shows offers ready for validation (bouclage)
  VALIDATION_READY: [
    OFFER_STATUS.EN_COURS_CHIFFRAGE,       // Chiffrage completed, ready for validation
    OFFER_STATUS.EN_ATTENTE_VALIDATION     // Waiting for validation
  ],
  
  // TransformList: Shows offers ready to transform to projects
  TRANSFORM_READY: [
    OFFER_STATUS.FIN_ETUDES_VALIDEE,       // Technical studies validated
    OFFER_STATUS.VALIDE,                   // Offer validated
    OFFER_STATUS.SIGNE                     // Offer signed by client
  ]
} as const;

// Button visibility conditions
export const BUTTON_CONDITIONS = {
  // ChiffrageList: "Démarrer chiffrage" button should show when ready to start
  SHOW_START_CHIFFRAGE: OFFER_STATUS.EN_ATTENTE_FOURNISSEURS,
  
  // ValidationList: "Valider études" button conditions
  SHOW_VALIDATE_STUDIES: OFFER_STATUS.EN_COURS_CHIFFRAGE,
  
  // TransformList: "Transformer en projet" button conditions  
  SHOW_TRANSFORM_TO_PROJECT: [
    OFFER_STATUS.FIN_ETUDES_VALIDEE,
    OFFER_STATUS.VALIDE,
    OFFER_STATUS.SIGNE
  ]
} as const;

// Status display mappings for badges and UI
export const STATUS_DISPLAY_MAP = {
  [OFFER_STATUS.BROUILLON]: { label: 'Brouillon', variant: 'secondary', color: 'text-gray-600' },
  [OFFER_STATUS.ETUDE_TECHNIQUE]: { label: 'Étude technique', variant: 'default', color: 'text-blue-600' },
  [OFFER_STATUS.EN_ATTENTE_FOURNISSEURS]: { label: 'Prêt à chiffrer', variant: 'default', color: 'text-blue-600' },
  [OFFER_STATUS.EN_COURS_CHIFFRAGE]: { label: 'En cours de chiffrage', variant: 'secondary', color: 'text-orange-600' },
  [OFFER_STATUS.EN_ATTENTE_VALIDATION]: { label: 'En attente bouclage', variant: 'secondary', color: 'text-orange-600' },
  [OFFER_STATUS.FIN_ETUDES_VALIDEE]: { label: 'Validée BE', variant: 'default', color: 'text-primary' },
  [OFFER_STATUS.VALIDE]: { label: 'Prête', variant: 'secondary', color: 'text-success' },
  [OFFER_STATUS.SIGNE]: { label: 'Signée', variant: 'default', color: 'text-success' },
  [OFFER_STATUS.TRANSFORME_EN_PROJET]: { label: 'Transformée', variant: 'default', color: 'text-success' },
  [OFFER_STATUS.TERMINE]: { label: 'Terminée', variant: 'outline', color: 'text-gray-600' },
  [OFFER_STATUS.ARCHIVE]: { label: 'Archivée', variant: 'outline', color: 'text-gray-400' }
} as const;

// Helper function to build query string for API calls
export const buildStatusQuery = (statuses: readonly string[]): string => {
  return statuses.join(',');
};

// Type exports for TypeScript support
export type OfferStatus = typeof OFFER_STATUS[keyof typeof OFFER_STATUS];
export type WorkflowStatusFilter = typeof WORKFLOW_STATUS_FILTERS[keyof typeof WORKFLOW_STATUS_FILTERS][number];