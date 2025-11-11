/**
 * GÉNÉRATEUR DONNÉES RÉALISTES JLM - BASÉ SUR PATTERNS MONDAY.COM ANALYSÉS
 * 
 * Génère des données d'échantillon basées sur les patterns métier réels JLM
 * identifiés lors de l'analyse des exports Monday.com
 * 
 * Sources: analysis/GAP_ANALYSIS_SAXIUM_MONDAY_DETAILLE.md
 * Patterns extraits de 911 lignes AO_Planning + 1000 lignes CHANTIERS
 * 
 * @version 1.0.0
 * @date 2025-09-24
 */

// ========================================
// TYPES DONNÉES MONDAY.COM
// ========================================

export interface MondayAoData {
  mondayItemId: string;
  clientName: string;
  city: string;
  aoCategory: 'MEXT' | 'MINT' | 'HALL' | 'SERRURERIE' | 'BARDAGE' | 'AUTRE';
  operationalStatus: 'A RELANCER' | 'AO EN COURS' | 'GAGNE' | 'PERDU' | 'ABANDONNE';
  reference?: string;
  projectSize?: string;
  specificLocation?: string;
  estimatedDelay?: string;
  clientRecurrency?: boolean;
}

export interface MondayProjectData {
  mondayProjectId: string;
  name: string;
  clientName: string;
  workflowStage: 'NOUVEAUX' | 'En cours' | 'ETUDE' | 'VISA' | 'PLANIFICATION' | 'APPROVISIONNEMENT' | 'CHANTIER' | 'SAV';
  projectSubtype?: 'MEXT' | 'MINT' | 'BARDAGE' | 'Refab' | 'Recommande' | 'DVA';
  geographicZone?: string;
  buildingCount?: number;
}

// ========================================
// PATTERNS MÉTIER JLM (EXTRAITS ANALYSE AUDIT)
// ========================================

// Clients récurrents identifiés dans 911 lignes AO_Planning
const JLM_RECURRING_CLIENTS = [
  'NEXITY', 'COGEDIM', 'PARTENORD HABITAT', 'THOMAS & PIRON', 
  'REALITE', 'NOVEBAT', 'TMA', 'IMMO INVESTIM', 'NOVALYS', 'OGN Promotion'
];

// Zones géographiques Nord France (analyse planning chantier + AO_Planning)  
const JLM_GEOGRAPHIC_ZONES = [
  'BOULOGNE', 'DUNKERQUE', 'ETAPLES', 'LONGUENESSE', 'FRUGES', 
  'CAMPAGNE', 'BETHUNE', 'GRANDE-SYNTHE', 'LE CROTOY', 'CALAIS',
  'CAMIERS', 'RANG DU FLIERS', 'HENIN BEAUMONT', 'WASQUEHAL',
  'BEUVRY', 'SAINS les MARQUIONS', 'BERCK', 'DESVRES', 'THUMERIES',
  'PERENCHIES', 'SAINT OMER', 'BRAY DUNES', 'MARCQ en BAROEUL'
];

// Types menuiserie alignés (analyse gap 95% compatible)
const JLM_MENUISERIE_TYPES: MondayAoData['aoCategory'][] = [
  'MEXT', 'MINT', 'HALL', 'SERRURERIE', 'BARDAGE'
];

// Tailles projets détectées (analyse AO_Planning - patterns récurrents)
const JLM_PROJECT_SIZES = [
  '60 lgts', '85 lgts', '102 lgts', '45 lgts', '28 lgts', '31 lgts',
  '66 lgts', '27 lgts', '17 lgts', '19 lgts', '14 lgts'
];

// Statuts opérationnels Monday.com (fréquences analysées)
const AO_OPERATIONAL_STATUSES: { status: MondayAoData['operationalStatus'], weight: number }[] = [
  { status: 'AO EN COURS', weight: 0.4 },     // 40% des AO en cours
  { status: 'A RELANCER', weight: 0.25 },      // 25% à relancer 
  { status: 'GAGNE', weight: 0.2 },            // 20% gagnés
  { status: 'PERDU', weight: 0.1 },            // 10% perdus
  { status: 'ABANDONNE', weight: 0.05 }        // 5% abandonnés
];

// Stades workflow projets Monday.com (phases identifiées)
const PROJECT_WORKFLOW_STAGES: { stage: MondayProjectData['workflowStage'], weight: number }[] = [
  { stage: 'NOUVEAUX', weight: 0.15 },         // 15% nouveaux
  { stage: 'En cours', weight: 0.3 },          // 30% en cours d'étude
  { stage: 'ETUDE', weight: 0.2 },             // 20% étude technique
  { stage: 'PLANIFICATION', weight: 0.15 },    // 15% planification
  { stage: 'CHANTIER', weight: 0.15 },         // 15% chantier
  { stage: 'SAV', weight: 0.05 }               // 5% SAV
];

// Lieux spécifiques détectés (analyse textuelle descriptions AO)
const SPECIFIC_LOCATIONS = [
  'Quartier des Ilot des Peintres', 'Construction neuf', 'Carré des sonates',
  'TS Micro crèches en Logements', 'Accident kouoh Charlotte', 'Le Rubanier',
  'Reflet d\'Ecume', 'GCC', 'Consultation THOMAS & PIRON', 'Ancienne BANQUE DE FRANCE',
  'Résidence Les Genets', 'Maison Médicale', 'Les Acacias'
];

// Formats dates Monday.com analysés - privilégier 3 segments pour cohérence
const MONDAY_DATE_FORMATS = [
  '->01/10/25', '->03/10/25', '->15/11/25', '->28/02/26', '->12/01/26',
  '->05/03/25', '->18/06/25', '->22/09/25', '->14/12/25', '->08/04/26'
];

// Formats legacy 2 segments (rares, pour compatibilité tests)
const MONDAY_LEGACY_DATE_FORMATS = [
  '->12/09', '->15/11', '->28/02', '->05/03'
];

// ========================================
// GÉNÉRATEUR PRINCIPAL
// ========================================

/**
 * Génère des données réalistes basées sur patterns métier JLM analysés
 * Function overloads pour inférence de type correcte
 */
export function generateRealisticJLMData(count: number, type: 'aos'): MondayAoData[];
export function generateRealisticJLMData(count: number, type: 'projects'): MondayProjectData[];
export function generateRealisticJLMData(count: number, type: 'aos' | 'projects'): (MondayAoData | MondayProjectData)[];
export function generateRealisticJLMData(count: number, type: 'aos' | 'projects'): (MondayAoData | MondayProjectData)[] {
  if (type === 'aos') {
    return generateAoData(count);
  } else {
    return generateProjectData(count);
  }
}

/**
 * Génère données AO basées sur 911 lignes AO_Planning analysées
 */
function generateAoData(count: number): MondayAoData[] {
  const aos: MondayAoData[] = [];
  
  for (let i = 0; i < count; i++) {
    const clientName = weightedRandomChoice(JLM_RECURRING_CLIENTS, [0.3, 0.25, 0.2, 0.1, 0.1, 0.05]); // NEXITY/COGEDIM plus fréquents
    const city = randomChoice(JLM_GEOGRAPHIC_ZONES);
    const aoCategory = weightedRandomChoice(JLM_MENUISERIE_TYPES, [0.4, 0.35, 0.1, 0.1, 0.05]); // MEXT/MINT dominants
    const operationalStatus = weightedRandomFromArray(AO_OPERATIONAL_STATUSES);
    
    const ao: MondayAoData = {
      mondayItemId: `ao_${String(i + 1).padStart(4, '0')}_monday`,
      clientName: clientName || 'NEXITY',
      city,
      aoCategory,
      operationalStatus,
      reference: `AO-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      projectSize: Math.random() > 0.3 ? randomChoice(JLM_PROJECT_SIZES) : undefined, // 70% ont une taille définie
      specificLocation: Math.random() > 0.6 ? randomChoice(SPECIFIC_LOCATIONS) : undefined, // 40% ont lieu spécifique
      estimatedDelay: Math.random() > 0.5 ? generateMondayDate() : undefined, // 50% ont échéance
      clientRecurrency: ['NEXITY', 'COGEDIM', 'PARTENORD HABITAT'].includes(clientName || '') // Clients récurrents
    };

    aos.push(ao);
  }

  return aos;
}

/**
 * Génère données projets basées sur 1000 lignes CHANTIERS analysées
 */
function generateProjectData(count: number): MondayProjectData[] {
  const projects: MondayProjectData[] = [];
  
  for (let i = 0; i < count; i++) {
    const clientName = weightedRandomChoice(JLM_RECURRING_CLIENTS, [0.3, 0.25, 0.2, 0.1, 0.1, 0.05]);
    const geographicZone = randomChoice(JLM_GEOGRAPHIC_ZONES);
    const workflowStage = weightedRandomFromArray(PROJECT_WORKFLOW_STAGES);
    const projectSubtype = weightedRandomChoice(['MEXT', 'MINT', 'BARDAGE', 'Refab', 'Recommande'], [0.4, 0.35, 0.1, 0.1, 0.05]);
    
    // Générer nom projet réaliste basé sur patterns analysés
    const projectName = generateRealisticProjectName(clientName || 'NEXITY', geographicZone, projectSubtype);
    
    const project: MondayProjectData = {
      mondayProjectId: `project_${String(i + 1).padStart(4, '0')}_monday`,
      name: projectName,
      clientName: clientName || 'NEXITY',
      workflowStage,
      projectSubtype,
      geographicZone,
      buildingCount: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : undefined // 30% ont plusieurs bâtiments
    };

    projects.push(project);
  }

  return projects;
}

/**
 * Génère nom projet réaliste basé sur patterns analysés
 */
function generateRealisticProjectName(client: string, zone: string, subtype?: string): string {
  const patterns = [
    `${zone} ${Math.floor(Math.random() * 100 + 10)} - ${client} - ${subtype || 'MEXT'}`,
    `${zone} ${randomChoice(['Reflet d\'Ecume', 'Les Genets', 'Carré des sonates', 'GCC'])} - ${subtype || 'MINT'}`,
    `${zone} - ${client} - ${Math.floor(Math.random() * 150 + 20)} lgts - ${subtype || 'MEXT'}`,
    `${zone} ${randomChoice(['Construction neuf', 'Rénovation', 'Extension'])} - ${client}`,
    `SAV ${zone} ${Math.floor(Math.random() * 50 + 10)} ${randomChoice(['boitiers serrures', 'dormants', 'vitrage'])}`
  ];

  return randomChoice(patterns);
}

// ========================================
// UTILITAIRES
// ========================================

/**
 * Sélection aléatoire simple
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Génère une date Monday.com cohérente
 * Privilégie format 3 segments pour éviter ambiguïtés
 */
function generateMondayDate(): string {
  // 90% format 3 segments, 10% legacy 2 segments
  if (Math.random() > 0.1) {
    return randomChoice(MONDAY_DATE_FORMATS);
  } else {
    return randomChoice(MONDAY_LEGACY_DATE_FORMATS);
  }
}

/**
 * Sélection aléatoire pondérée
 */
function weightedRandomChoice<T>(choices: T[], weights: number[]): T | undefined {
  if (choices.length !== weights.length) return choices[0];
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const randomNum = Math.random() * totalWeight;
  
  let accumulatedWeight = 0;
  for (let i = 0; i < choices.length; i++) {
    accumulatedWeight += weights[i];
    if (randomNum <= accumulatedWeight) {
      return choices[i];
    }
  }
  
  return choices[0];
}

/**
 * Sélection pondérée depuis array avec poids
 */
function weightedRandomFromArray<T extends { weight: number }>(items: (T & { status?: unknown, stage?: unknown})[]): unknown {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const randomNum = Math.random() * totalWeight;
  
  let accumulatedWeight = 0;
  for (const item of items) {
    accumulatedWeight += item.weight;
    if (randomNum <= accumulatedWeight) {
      return item.status || item.stage;
    }
  }
  
  return items[0].status || items[0].stage;
}

/**
 * Échantillon de données pour tests
 */
export function generateSampleDataForTesting() {
  return {
    aos: generateAoData(10),
    projects: generateProjectData(10)
  };
}

/**
 * Statistiques génération pour validation
 */
export function getGenerationStats(data: (MondayAoData | MondayProjectData)[], type: 'aos' | 'projects') {
  if (type === 'aos') {
    const aos = data as MondayAoData[];
    return {
      total: aos.length,
      byClient: countByField(aos, 'clientName'),
      byCategory: countByField(aos, 'aoCategory'),
      byStatus: countByField(aos, 'operationalStatus'),
      withProjectSize: aos.filter(ao => ao.projectSize).length,
      withLocation: aos.filter(ao => ao.specificLocation).length
    };
  } else {
    const projects = data as MondayProjectData[];
    return {
      total: projects.length,
      byClient: countByField(projects, 'clientName'),
      byStage: countByField(projects, 'workflowStage'),
      bySubtype: countByField(projects, 'projectSubtype'),
      withBuildingCount: projects.filter(p => p.buildingCount).length
    };
  }
}

function countByField<T>(array: T[], field: keyof T): Record<string, number> {
  return array.reduce((acc, item) => {
    const value = String(item[field]);
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}