import { nanoid } from 'nanoid';
import type { Page } from '@playwright/test';

/**
 * Générateur de données de test uniques pour Saxium
 * Utilise nanoid pour garantir l'unicité des données dans les tests parallèles
 */

export interface TestAO {
  id?: string;
  reference: string;
  client: string;
  maitreOuvrage: string;
  location: string;
  departement: string;
  intituleOperation: string;
  dateLimiteRemise: string;
  montantEstime: number;
  typeMarche: string;
  status?: string;
  // ✅ Champs requis pour insert schema
  menuiserieType?: string;
  source?: string;
  devisSent?: boolean;
  sentAt?: Date | string;
  clientResponse?: boolean;
  clientAccepted?: boolean;
  clientRefused?: boolean;
  montantTotal?: number;
  relanceCount?: number;
  contactEmail?: string;
  contactPhone?: string;
}

export interface TestProject {
  id?: string;
  reference: string;
  nom?: string;
  client: string;
  location?: string;
  status: string;
  montant?: number;
  montantTotal?: number;
  dateDebut?: string;
  priority?: 'urgent' | 'high' | 'normal';
  dateDebutPrevue?: Date | string;
  dateFinPrevue?: Date | string;
  dureeJours?: number;
  teamCount?: number;
  teamRequired?: number;
  tasksCreated?: boolean;
  teamsAssigned?: boolean;
  datesValidated?: boolean;
  suppliesOrdered?: boolean;
  readyToStart?: boolean;
  milestones?: Array<{name: string, date: Date | string}>;
  
  // Champs pour workflow Chantier
  isDelayed?: boolean;
  hasIssues?: boolean;
  hasBlockingIssues?: boolean;
  issueCount?: number;
  progress?: number; // 0-100
  daysRemaining?: number;
  teamsOnSite?: number;
  todayTasks?: Array<{ name: string; completed: boolean }>;
  teamsPresent?: boolean;
  photosTaken?: boolean;
  reportUpdated?: boolean;
}

export interface TestOffer {
  id?: string;
  reference: string;
  titre?: string;
  montantEstime: number;
  status: string;
  // ✅ Champs requis pour insert schema
  menuiserieType?: string;
  client?: string;
  location?: string;
}

export interface TestContact {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste: string;
}

/**
 * Génère un Appel d'Offre de test unique
 */
export function generateTestAO(overrides: Partial<TestAO> = {}): TestAO {
  const id = nanoid(8);
  const today = new Date();
  const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 jours

  return {
    reference: `AO-TEST-${id}`,
    client: `Client Test ${id}`,
    maitreOuvrage: `Maître d'Ouvrage ${id}`,
    location: '75001 Paris',
    departement: '75',
    intituleOperation: `Opération de test ${id}`,
    dateLimiteRemise: futureDate.toISOString().split('T')[0],
    montantEstime: 150000,
    typeMarche: 'public',
    status: 'reception',
    // ✅ Champs requis ajoutés pour validation insert schema
    menuiserieType: 'fenetre',
    source: 'other',
    devisSent: false,
    clientResponse: false,
    clientAccepted: false,
    clientRefused: false,
    montantTotal: 150000,
    relanceCount: 0,
    contactEmail: `client.${id}@test.local`,
    contactPhone: `06${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    ...overrides,
  };
}

/**
 * Génère un Projet de test unique
 */
export function generateTestProject(overrides: Partial<TestProject> = {}): TestProject {
  const id = nanoid(8);
  const today = new Date();
  const futureStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 jours
  const futureEnd = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000); // +120 jours

  return {
    reference: `PROJ-TEST-${id}`,
    nom: `Projet Test ${id}`,
    client: `Client Test ${id}`,
    location: 'Paris, France',
    status: 'planification',
    montant: 200000,
    montantTotal: 250000,
    dateDebut: today.toISOString().split('T')[0],
    priority: 'normal',
    dateDebutPrevue: futureStart.toISOString().split('T')[0],
    dateFinPrevue: futureEnd.toISOString().split('T')[0],
    dureeJours: 90,
    teamCount: 0,
    teamRequired: 2,
    tasksCreated: false,
    teamsAssigned: false,
    datesValidated: false,
    suppliesOrdered: false,
    readyToStart: false,
    // Champs pour workflow Chantier
    isDelayed: false,
    hasIssues: false,
    hasBlockingIssues: false,
    issueCount: 0,
    progress: 0,
    daysRemaining: 30,
    teamsOnSite: 0,
    todayTasks: [],
    teamsPresent: false,
    photosTaken: false,
    reportUpdated: false,
    ...overrides,
  };
}

/**
 * Génère une Offre de test unique
 */
export function generateTestOffer(overrides: Partial<TestOffer> = {}): TestOffer {
  const id = nanoid(8);

  return {
    reference: `OFF-TEST-${id}`,
    titre: `Offre Test ${id}`,
    montantEstime: 100000,
    status: 'en_cours_chiffrage',
    // ✅ Champs requis ajoutés pour validation insert schema
    menuiserieType: 'fenetre',
    client: `Client Test ${id}`,
    location: 'Paris, France',
    ...overrides,
  };
}

/**
 * Génère un Contact de test unique
 */
export function generateTestContact(overrides: Partial<TestContact> = {}): TestContact {
  const id = nanoid(8);

  return {
    nom: `Nom${id}`,
    prenom: `Prenom${id}`,
    email: `test.${id}@saxium-test.local`,
    telephone: `06${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    poste: 'responsable',
    ...overrides,
  };
}

/**
 * Crée un AO via l'API directement
 */
export async function createAOViaAPI(page: Page, aoData: TestAO): Promise<string> {
  const response = await page.request.post('/api/aos', {
    data: aoData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create AO: ${response.status()} ${await response.text()}`);
  }

  const result = await response.json();
  return result.data?.id || result.id;
}

/**
 * Crée un Projet via l'API directement
 */
export async function createProjectViaAPI(page: Page, projectData: TestProject): Promise<string> {
  const response = await page.request.post('/api/projects', {
    data: projectData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create project: ${response.status()} ${await response.text()}`);
  }

  const result = await response.json();
  return result.data?.id || result.id;
}

/**
 * Crée une Offre via l'API directement
 */
export async function createOfferViaAPI(page: Page, offerData: TestOffer): Promise<string> {
  const response = await page.request.post('/api/offers', {
    data: offerData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create offer: ${response.status()} ${await response.text()}`);
  }

  const result = await response.json();
  return result.data?.id || result.id;
}

/**
 * Supprime un AO via l'API
 */
export async function deleteAOViaAPI(page: Page, aoId: string): Promise<void> {
  const response = await page.request.delete(`/api/aos/${aoId}`);
  
  if (!response.ok() && response.status() !== 404) {
    console.warn(`Failed to delete AO ${aoId}: ${response.status()}`);
  }
}

/**
 * Supprime un Projet via l'API
 */
export async function deleteProjectViaAPI(page: Page, projectId: string): Promise<void> {
  const response = await page.request.delete(`/api/projects/${projectId}`);
  
  if (!response.ok() && response.status() !== 404) {
    console.warn(`Failed to delete project ${projectId}: ${response.status()}`);
  }
}

/**
 * Supprime une Offre via l'API
 */
export async function deleteOfferViaAPI(page: Page, offerId: string): Promise<void> {
  const response = await page.request.delete(`/api/offers/${offerId}`);
  
  if (!response.ok() && response.status() !== 404) {
    console.warn(`Failed to delete offer ${offerId}: ${response.status()}`);
  }
}

/**
 * Nettoie toutes les données de test créées par un test
 */
export async function cleanupTestData(page: Page, ids: {
  aos?: string[];
  projects?: string[];
  offers?: string[];
}): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  if (ids.aos) {
    cleanupPromises.push(...ids.aos.map(id => deleteAOViaAPI(page, id)));
  }
  if (ids.projects) {
    cleanupPromises.push(...ids.projects.map(id => deleteProjectViaAPI(page, id)));
  }
  if (ids.offers) {
    cleanupPromises.push(...ids.offers.map(id => deleteOfferViaAPI(page, id)));
  }

  await Promise.allSettled(cleanupPromises);
}

// ========================================
// SEEDS POUR PARCOURS E2E COMPLETS
// ========================================

/**
 * Interface étendue pour les projets avec phases de workflow
 */
export interface TestProjectExtended extends TestProject {
  aoId?: string;
  offerId?: string;
  phases?: {
    study?: { status: 'pending' | 'in_progress' | 'completed', assignedTo?: string };
    supply?: { status: 'pending' | 'in_progress' | 'completed', items?: any[] };
    worksite?: { status: 'pending' | 'in_progress' | 'completed', teams?: any[] };
    support?: { status: 'pending' | 'in_progress' | 'completed', tickets?: any[] };
  };
}

/**
 * Seeds E2E pour Journey 1: AO → Offer → Projet → Chantier
 */
export const testAOComplete = generateTestAO({
  id: 'e2e-ao-complete-001',
  reference: 'AO-E2E-COMPLETE-001',
  client: 'Client E2E Test AO',
  intituleOperation: 'Parcours E2E Complet AO-Projet',
  status: 'etude' as const,
  montantEstime: 50000,
});

export const testOfferFromAO = generateTestOffer({
  id: 'e2e-offer-from-ao-001',
  reference: 'OFF-E2E-FROM-AO-001',
  titre: 'Offre E2E depuis AO',
  montantEstime: 48000,
  status: 'en_attente_fournisseurs' as const,
});

export const testProjectFromAO: TestProjectExtended = {
  ...generateTestProject({
    id: 'e2e-project-from-ao-001',
    reference: 'PROJ-E2E-FROM-AO-001',
    nom: 'Projet E2E depuis AO',
    status: 'planification',
    montant: 48000,
  }),
  aoId: 'e2e-ao-complete-001',
  offerId: 'e2e-offer-from-ao-001',
  phases: {
    study: { status: 'pending' as const },
    supply: { status: 'pending' as const },
    worksite: { status: 'pending' as const },
    support: { status: 'pending' as const },
  },
};

/**
 * Seeds E2E pour Journey 2: Offer maturation → Projet
 */
export const testOfferStandalone = generateTestOffer({
  id: 'e2e-offer-standalone-001',
  reference: 'OFF-E2E-STANDALONE-001',
  titre: 'Offre E2E Standalone',
  montantEstime: 35000,
  status: 'en_cours_chiffrage' as const,
});

export const testProjectFromOffer: TestProjectExtended = {
  ...generateTestProject({
    id: 'e2e-project-from-offer-001',
    reference: 'PROJ-E2E-FROM-OFFER-001',
    nom: 'Projet E2E depuis Offer',
    status: 'planification',
    montant: 35000,
  }),
  offerId: 'e2e-offer-standalone-001',
  phases: {
    study: { status: 'pending' as const },
    supply: { status: 'pending' as const },
    worksite: { status: 'pending' as const },
    support: { status: 'pending' as const },
  },
};

/**
 * Seeds E2E pour Journey 3: Project lifecycle (study → supply → worksite → support)
 */
export const testProjectLifecycle: TestProjectExtended = {
  ...generateTestProject({
    id: 'e2e-project-lifecycle-001',
    reference: 'PROJ-E2E-LIFECYCLE-001',
    nom: 'Projet E2E Lifecycle',
    status: 'etude',
    montant: 75000,
  }),
  phases: {
    study: { status: 'in_progress' as const, assignedTo: 'tech-team-e2e' },
    supply: { status: 'pending' as const },
    worksite: { status: 'pending' as const },
    support: { status: 'pending' as const },
  },
};

/**
 * Regroupement de tous les seeds E2E pour faciliter reset/seed
 */
export const e2eSeeds = {
  aos: [testAOComplete],
  offers: [testOfferFromAO, testOfferStandalone],
  projects: [testProjectFromAO, testProjectFromOffer, testProjectLifecycle],
};
