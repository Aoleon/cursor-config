import type { InsertDateIntelligenceRule } from "@shared/schema";

// ========================================
// RÈGLES MÉTIER MENUISERIE FRANÇAISE
// ========================================

/**
 * Règles métier spécifiques à l'industrie de la menuiserie française
 * Basées sur les normes DTU, pratiques sectorielles et contraintes réglementaires
 */

// Facteurs saisonniers pour travaux extérieurs
export const SEASONAL_FACTORS = {
  spring: { multiplier: 1.0, weatherRisk: 'low', description: 'Conditions favorables' },
  summer: { multiplier: 0.9, weatherRisk: 'low', description: 'Période optimale' },
  autumn: { multiplier: 1.1, weatherRisk: 'medium', description: 'Conditions variables' },
  winter: { multiplier: 1.3, weatherRisk: 'high', description: 'Contraintes météorologiques' }
};

// Zones climatiques françaises
export const WEATHER_ZONES = {
  'H1': { name: 'Nord/Est France', winterFactor: 1.4, description: 'Zone froide' },
  'H2': { name: 'Ouest/Sud-Ouest', winterFactor: 1.2, description: 'Zone tempérée' },
  'H3': { name: 'Méditerranée', winterFactor: 1.0, description: 'Zone chaude' },
  'DOM': { name: 'Outre-mer', winterFactor: 0.9, description: 'Zone tropicale' }
};

// Multiplicateurs selon le matériau (temps de pose et fabrication)
export const MATERIAL_FACTORS = {
  pvc: { 
    fabrication: 0.8, 
    pose: 0.9, 
    description: 'Matériau industriel standardisé',
    constraints: ['weather_resistant', 'fast_installation']
  },
  aluminium: { 
    fabrication: 1.0, 
    pose: 1.0, 
    description: 'Matériau de référence',
    constraints: ['precision_required', 'thermal_bridge_treatment']
  },
  bois: { 
    fabrication: 1.3, 
    pose: 1.2, 
    description: 'Matériau noble nécessitant plus de temps',
    constraints: ['weather_dependent', 'custom_finishing', 'humidity_control']
  },
  mixte_bois_alu: { 
    fabrication: 1.5, 
    pose: 1.3, 
    description: 'Matériau composite complexe',
    constraints: ['specialized_skills', 'precision_assembly', 'weather_dependent']
  },
  acier: { 
    fabrication: 1.1, 
    pose: 1.4, 
    description: 'Matériau industriel lourd',
    constraints: ['heavy_equipment', 'welding_required', 'weather_resistant']
  }
};

// Contraintes d'accessibilité chantier
export const ACCESSIBILITY_FACTORS = {
  facile: { 
    multiplier: 0.8, 
    description: 'Accès direct, plain-pied',
    conditions: ['truck_access', 'ground_floor', 'standard_openings']
  },
  moyenne: { 
    multiplier: 1.0, 
    description: 'Accessibilité standard',
    conditions: ['partial_truck_access', 'stairs_acceptable', 'manual_handling']
  },
  difficile: { 
    multiplier: 1.5, 
    description: 'Accès complexe',
    conditions: ['no_truck_access', 'high_floors', 'crane_required', 'narrow_access']
  }
};

// Jours fériés français à considérer (hors weekends)
export const FRENCH_HOLIDAYS = [
  { name: 'Jour de l\'An', date: '01-01' },
  { name: 'Lundi de Pâques', variable: true },
  { name: 'Fête du Travail', date: '05-01' },
  { name: 'Victoire 1945', date: '05-08' },
  { name: 'Ascension', variable: true },
  { name: 'Lundi de Pentecôte', variable: true },
  { name: 'Fête Nationale', date: '07-14' },
  { name: 'Assomption', date: '08-15' },
  { name: 'Toussaint', date: '11-01' },
  { name: 'Armistice', date: '11-11' },
  { name: 'Noël', date: '12-25' }
];

// Périodes de congés secteur BTP
export const BTP_VACATION_PERIODS = [
  { period: 'summer', start: '2024-07-15', end: '2024-08-15', impact: 'high' },
  { period: 'winter', start: '2024-12-22', end: '2025-01-02', impact: 'medium' },
  { period: 'may_bridges', start: '2024-05-01', end: '2024-05-31', impact: 'low' }
];

// ========================================
// RÈGLES MÉTIER PRÉ-CONFIGURÉES
// ========================================

export const DEFAULT_MENUISERIE_RULES: Omit<InsertDateIntelligenceRule, 'createdBy'>[] = [
  
  // ========================================
  // PHASE PASSATION (1 mois standard)
  // ========================================
  {
    name: "Passation Marché Public",
    description: "Délai standard pour obtention du Visa d'Intervention Ultérieure (VIS) et démarrage contractuel",
    phase: "passation",
    projectType: "neuf",
    complexity: null,
    baseConditions: { 
      marcheType: "public" 
    },
    triggerEvents: ["contract_signed", "notification_attribution"],
    durationFormula: null,
    baseDuration: 30, // 1 mois réglementaire
    multiplierFactor: "1.00",
    bufferPercentage: "0.10", // 10% buffer pour administration
    minDuration: 21,
    maxDuration: 45,
    workingDaysOnly: false, // Délai calendaire
    excludeHolidays: false,
    isActive: true,
    priority: 100,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  {
    name: "Passation Marché Privé",
    description: "Démarrage rapide pour marchés privés",
    phase: "passation",
    projectType: "neuf",
    complexity: null,
    baseConditions: { 
      marcheType: "prive" 
    },
    triggerEvents: ["contract_signed"],
    durationFormula: null,
    baseDuration: 7, // 1 semaine
    multiplierFactor: "1.00",
    bufferPercentage: "0.05",
    minDuration: 3,
    maxDuration: 14,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 95,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  // ========================================
  // PHASE ÉTUDE (Selon complexité et type)
  // ========================================
  {
    name: "Étude Projet Neuf Standard",
    description: "Étude technique projet neuf complexité normale",
    phase: "etude",
    projectType: "neuf",
    complexity: "normale",
    baseConditions: {
      surface_range: "50-200m²"
    },
    triggerEvents: ["project_started", "technical_data_received"],
    durationFormula: "base_duration * complexity_multiplier * surface_factor",
    baseDuration: 8, // jours ouvrés
    multiplierFactor: "1.00",
    bufferPercentage: "0.20", // 20% buffer pour aléas techniques
    minDuration: 5,
    maxDuration: 15,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 90,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  {
    name: "Étude Projet Complexe",
    description: "Étude technique projet haute complexité (bâtiment historique, contraintes spéciales)",
    phase: "etude",
    projectType: "neuf",
    complexity: "elevee",
    baseConditions: {
      constraints: ["historical_building", "special_requirements", "custom_design"]
    },
    triggerEvents: ["project_started", "site_survey_completed"],
    durationFormula: null,
    baseDuration: 15, // jours ouvrés
    multiplierFactor: "1.80", // Facteur élevé pour complexité
    bufferPercentage: "0.30", // 30% buffer complexité élevée
    minDuration: 10,
    maxDuration: 25,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 85,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  {
    name: "Étude Rénovation",
    description: "Étude technique rénovation avec contraintes existant",
    phase: "etude",
    projectType: "renovation",
    complexity: null,
    baseConditions: {
      survey_required: true
    },
    triggerEvents: ["existing_survey_completed", "technical_constraints_identified"],
    durationFormula: null,
    baseDuration: 12, // Plus long pour l'existant
    multiplierFactor: "1.30", // Facteur rénovation
    bufferPercentage: "0.25", // 25% buffer pour imprévus existant
    minDuration: 8,
    maxDuration: 20,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 88,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  // ========================================
  // PHASE VISA ARCHITECTE (Nouveau workflow)
  // ========================================
  {
    name: "VISA Architecte Standard",
    description: "Validation architecte des plans d'exécution menuiserie",
    phase: "visa_architecte",
    projectType: null, // Applicable à tous
    complexity: null,
    baseConditions: {
      architect_required: true
    },
    triggerEvents: ["execution_plans_ready", "architect_notification_sent"],
    durationFormula: null,
    baseDuration: 5, // jours ouvrés
    multiplierFactor: "1.00",
    bufferPercentage: "0.40", // 40% buffer - délai externe
    minDuration: 3,
    maxDuration: 10,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 80,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  // ========================================
  // PHASE PLANIFICATION
  // ========================================
  {
    name: "Planification Standard",
    description: "Organisation chantier et commandes fournisseurs",
    phase: "planification",
    projectType: null,
    complexity: "normale",
    baseConditions: {},
    triggerEvents: ["visa_approved", "plans_finalized"],
    durationFormula: null,
    baseDuration: 5, // jours ouvrés
    multiplierFactor: "1.00",
    bufferPercentage: "0.15",
    minDuration: 3,
    maxDuration: 10,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 75,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  // ========================================
  // PHASE APPROVISIONNEMENT (Selon matériau)
  // ========================================
  {
    name: "Approvisionnement PVC Standard",
    description: "Commande et livraison menuiserie PVC",
    phase: "approvisionnement",
    projectType: null,
    complexity: null,
    baseConditions: {
      materialType: "pvc"
    },
    triggerEvents: ["orders_confirmed", "production_scheduled"],
    durationFormula: null,
    baseDuration: 10, // jours ouvrés
    multiplierFactor: "0.90", // PVC plus rapide
    bufferPercentage: "0.10",
    minDuration: 7,
    maxDuration: 15,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 70,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  {
    name: "Approvisionnement Bois sur-mesure",
    description: "Fabrication et livraison menuiserie bois personnalisée",
    phase: "approvisionnement",
    projectType: null,
    complexity: null,
    baseConditions: {
      materialType: "bois",
      customWork: true
    },
    triggerEvents: ["custom_orders_confirmed", "wood_sourcing_validated"],
    durationFormula: null,
    baseDuration: 21, // 3 semaines
    multiplierFactor: "1.40", // Bois sur-mesure plus long
    bufferPercentage: "0.20",
    minDuration: 15,
    maxDuration: 35,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 72,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  {
    name: "Approvisionnement Aluminium",
    description: "Commande menuiserie aluminium standard",
    phase: "approvisionnement",
    projectType: null,
    complexity: null,
    baseConditions: {
      materialType: "aluminium"
    },
    triggerEvents: ["alu_orders_confirmed"],
    durationFormula: null,
    baseDuration: 14, // 2 semaines
    multiplierFactor: "1.00",
    bufferPercentage: "0.15",
    minDuration: 10,
    maxDuration: 21,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 71,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  // ========================================
  // PHASE CHANTIER (Selon saison et accessibilité)
  // ========================================
  {
    name: "Pose Chantier Été",
    description: "Pose menuiserie période estivale - conditions optimales",
    phase: "chantier",
    projectType: null,
    complexity: null,
    baseConditions: {
      season: "summer",
      weather_dependent: true
    },
    triggerEvents: ["materials_delivered", "site_ready"],
    durationFormula: "base_duration * accessibility_factor * team_efficiency",
    baseDuration: 8, // jours ouvrés
    multiplierFactor: "0.85", // Conditions favorables été
    bufferPercentage: "0.10",
    minDuration: 5,
    maxDuration: 15,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 68,
    validFrom: new Date('2024-06-01'),
    validUntil: new Date('2024-08-31')
  },

  {
    name: "Pose Chantier Hiver",
    description: "Pose menuiserie période hivernale - contraintes météo",
    phase: "chantier",
    projectType: null,
    complexity: null,
    baseConditions: {
      season: "winter",
      weather_dependent: true
    },
    triggerEvents: ["materials_delivered", "weather_window_confirmed"],
    durationFormula: null,
    baseDuration: 8, // jours ouvrés
    multiplierFactor: "1.30", // Contraintes hivernales
    bufferPercentage: "0.25", // 25% buffer météo
    minDuration: 8,
    maxDuration: 20,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 69,
    validFrom: new Date('2024-11-01'),
    validUntil: new Date('2025-03-31')
  },

  {
    name: "Pose Chantier Accès Difficile",
    description: "Pose avec contraintes d'accessibilité (étages, centre-ville, etc.)",
    phase: "chantier",
    projectType: null,
    complexity: null,
    baseConditions: {
      accessibility: "difficile"
    },
    triggerEvents: ["crane_scheduled", "access_permits_obtained"],
    durationFormula: null,
    baseDuration: 8, // jours ouvrés base
    multiplierFactor: "1.60", // Facteur accessibilité difficile
    bufferPercentage: "0.20",
    minDuration: 10,
    maxDuration: 25,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 73,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  // ========================================
  // PHASE SAV (Service Après-Vente)
  // ========================================
  {
    name: "SAV Standard",
    description: "Réception travaux et levée de réserves",
    phase: "sav",
    projectType: null,
    complexity: null,
    baseConditions: {},
    triggerEvents: ["installation_completed", "client_reception"],
    durationFormula: null,
    baseDuration: 2, // jours ouvrés
    multiplierFactor: "1.00",
    bufferPercentage: "0.50", // 50% buffer - dépend du client
    minDuration: 1,
    maxDuration: 5,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 60,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  // ========================================
  // RÈGLES SPÉCIALISÉES SECTORIELLES
  // ========================================
  {
    name: "Projet Bâtiment Historique",
    description: "Contraintes spéciales monuments historiques et ABF",
    phase: null, // Applicable à toutes les phases
    projectType: "renovation",
    complexity: "elevee",
    baseConditions: {
      building_type: "historical",
      abf_approval_required: true
    },
    triggerEvents: ["abf_consultation_required"],
    durationFormula: null,
    baseDuration: 10, // Délai consultation ABF et contraintes patrimoniales
    multiplierFactor: "1.80", // +80% pour contraintes patrimoniales
    bufferPercentage: "0.35",
    minDuration: 5,
    maxDuration: 365,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 95, // Haute priorité pour contraintes réglementaires
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  {
    name: "Période Congés BTP",
    description: "Ajustement pour périodes de congés secteur BTP",
    phase: "chantier",
    projectType: null,
    complexity: null,
    baseConditions: {
      period: "summer_vacation"
    },
    triggerEvents: ["vacation_period_overlap"],
    durationFormula: null,
    baseDuration: 5, // Délai additionnel pendant congés (disponibilité réduite)
    multiplierFactor: "1.50", // +50% pendant congés
    bufferPercentage: "0.30",
    minDuration: 3,
    maxDuration: 365,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 85,
    validFrom: new Date('2024-07-01'),
    validUntil: new Date('2024-08-31')
  },

  // ========================================
  // RÈGLES SUPPLÉMENTAIRES POUR ATTEINDRE 18+ RÈGLES
  // ========================================
  {
    name: "Maintenance Préventive",
    description: "Intervention de maintenance dans la période de garantie",
    phase: "sav",
    projectType: null,
    complexity: null,
    baseConditions: {
      maintenance_type: "preventive",
      warranty_period: true
    },
    triggerEvents: ["warranty_maintenance_scheduled", "periodic_inspection"],
    durationFormula: null,
    baseDuration: 1, // jour ouvré
    multiplierFactor: "1.00",
    bufferPercentage: "0.30", // 30% buffer dépendances client
    minDuration: 1,
    maxDuration: 3,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 50,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  {
    name: "Pose PVC Complexe",
    description: "Pose PVC pour grandes baies, volets intégrés, ou configurations complexes",
    phase: "chantier",
    projectType: null,
    complexity: "elevee",
    baseConditions: {
      materialType: "pvc",
      complexity_factors: ["large_openings", "integrated_shutters", "complex_geometry"]
    },
    triggerEvents: ["complex_pvc_delivered", "specialized_team_available"],
    durationFormula: null,
    baseDuration: 12, // jours ouvrés
    multiplierFactor: "1.40", // Complexité PVC élevée
    bufferPercentage: "0.20",
    minDuration: 8,
    maxDuration: 18,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 74,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  },

  {
    name: "Matériaux Composites Modernes",
    description: "Fabrication et pose matériaux composites, fibre de verre, nouveaux alliages",
    phase: "approvisionnement",
    projectType: null,
    complexity: "elevee",
    baseConditions: {
      materialType: "composite",
      technology: "modern"
    },
    triggerEvents: ["composite_orders_confirmed", "specialized_supplier_validated"],
    durationFormula: null,
    baseDuration: 18, // jours ouvrés (plus long que standard)
    multiplierFactor: "1.60", // Nouveaux matériaux plus complexes
    bufferPercentage: "0.25",
    minDuration: 12,
    maxDuration: 30,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 76,
    validFrom: new Date('2024-01-01'),
    validUntil: null
  }
];

// ========================================
// UTILITAIRES POUR RÈGLES MÉTIER
// ========================================

/**
 * Obtenir les règles applicables à un contexte donné
 */
export function getApplicableRules(
  phase: string | null,
  projectType?: string,
  complexity?: string,
  conditions?: Record<string, unknown>
): typeof DEFAULT_MENUISERIE_RULES {
  
  return DEFAULT_MENUISERIE_RULES.filter(rule  => {
    // Filtrer par phase (null = applicable à toutes)
    if (rule.phase && phase && rule.phase !== phase) return false;
    
    // Filtrer par type de projet
    if (rule.projectType && projectType && rule.projectType !== projectType) return false;
    
    // Filtrer par complexité
    if (rule.complexity && complexity && rule.complexity !== complexity) return false;
    
    // Vérifier les conditions de base
    if (rule.baseConditions && conditions) {
      const ruleConditions = typeof rule.baseConditions === 'string' 
        ? JSON.parse(rule.baseConditions) 
        : rule.baseConditions;
        
      for (const [key, value] of Object.entries(ruleConditions)) {
        if (conditions[key] !== value) return false;
      }
    
    // Vérifier la validité temporelle
    const now = new Date();
    if (rule.validFrom && now < rule.validFrom) return false;
    if (rule.validUntil && now > rule.validUntil) return false;
    
    return rule.isActive;
  });
}

/**
 * Calculer le facteur saisonnier
 */
export function getSeasonalFactor(season?: string): number {
  if (!season || !SEASONAL_FACTORS[season as keyof typeof SEASONAL_FACTORS]) {
    return 1.0;
  }
  return SEASONAL_FACTORS[season as keyof typeof SEASONAL_FACTORS].multiplier;
}

/**
 * Calculer le facteur matériau pour une phase donnée
 */
export function getMaterialFactor(material: string, phase: 'fabrication' | 'pose'): number {
  const materialData = MATERIAL_FACTORS[material as keyof typeof MATERIAL_FACTORS];
  if (!materialData) return 1.0;
  
  return materialData[phase] || 1.0;
}

/**
 * Vérifier si une date tombe dans une période de congés BTP
 */
export function isInVacationPeriod(date: Date): { inVacation: boolean; period?: string; impact?: string } {
  const dateStr = date.toISOString().split('T')[0];
  
  for (const vacation of BTP_VACATION_PERIODS) {
    if (dateStr >= vacation.start && dateStr <= vacation.end) {}
return{
        inVacation: true,
        period: vacation.period,
        impact: vacation.impact
      };
    }
  
  return { inVacation: false };
}

/**
 * Calculer le nombre de jours fériés dans une période
 */
export function countHolidaysInPeriod(startDate: Date, endDate: Date): number {
  const year = startDate.getFullYear();
  let holidays = 0;
  
  // Jours fériés fixes
  const fixedHolidays = FRENCH_HOLIDAYS.filter(h => !h.variable);
  for (const holiday of fixedHolidays) {
    const holidayDate = new Date(year, parseInt(holiday.date!.split('-')[0]) - 1, parseInt(holiday.date!.split('-')[1]));
    if (holidayDate >= startDate && holidayDate <= endDate) {
      holidays++;
    }
  
  // TODO: Ajouter calcul des jours fériés variables (Pâques, etc.)
  
  return holidays;
}