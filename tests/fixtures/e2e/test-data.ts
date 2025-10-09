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
  reference: string;
  nom: string;
  client: string;
  status: string;
  montant: number;
  dateDebut: string;
}

export interface TestOffer {
  reference: string;
  titre: string;
  montantEstime: number;
  status: string;
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

  return {
    reference: `PROJ-TEST-${id}`,
    nom: `Projet Test ${id}`,
    client: `Client Test ${id}`,
    status: 'planification',
    montant: 200000,
    dateDebut: today.toISOString().split('T')[0],
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
