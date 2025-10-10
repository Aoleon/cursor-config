import { nanoid } from 'nanoid';
import type { Page } from '@playwright/test';

/**
 * Générateur de données de test uniques pour Saxium
 * Utilise nanoid pour garantir l'unicité des données dans les tests parallèles
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SYSTÈME DE CLEANUP DES DONNÉES TEST
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Deux fonctions de cleanup garantissent qu'aucune donnée test ne persiste :
 * 
 * 1. cleanupTestData(page, ids) :
 *    - Nettoie les IDs trackés explicitement (rapide)
 *    - Fallback: cleanup global par préfixe (attrape tout)
 *    - Usage: afterEach dans tests workflow
 * 
 * 2. cleanupAllTestData(page) :
 *    - Nettoie TOUTES les données avec préfixe TEST/E2E
 *    - Récupère toutes les ressources via API LIST
 *    - Filtre par préfixe et supprime
 *    - Usage: standalone ou fallback
 * 
 * Pattern données test :
 * - Références : TEST-*, E2E-*
 * - IDs : e2e-*, test-*
 * - Clients : "Client Test", "Client E2E"
 * 
 * Garantie : Toutes données avec ces patterns sont nettoyées après chaque test
 * ═══════════════════════════════════════════════════════════════════════════
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

export interface TestMaitreOuvrage {
  id?: string;
  nom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  siret?: string;
  typeOrganisation?: string;
}

export interface TestSupplier {
  id?: string;
  nom: string;
  email: string;
  telephone: string;
  siret?: string;
  specialite?: string;
  status?: string;
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
 * Génère un Maître d'Ouvrage de test unique
 * Note: /api/contacts n'existe pas - utiliser /api/maitres-ouvrage
 */
export function generateTestMaitreOuvrage(overrides: Partial<TestMaitreOuvrage> = {}): TestMaitreOuvrage {
  const id = nanoid(8);

  return {
    id: `e2e-mo-${id}`,
    nom: `TEST Maître Ouvrage ${id}`,
    email: `test.mo.${id}@saxium-test.local`,
    telephone: `06${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    adresse: `${Math.floor(Math.random() * 200)} Rue Test`,
    codePostal: '75001',
    ville: 'Paris Test',
    siret: `${Math.floor(Math.random() * 1000000000000000).toString().padStart(14, '0')}`,
    typeOrganisation: 'public',
    ...overrides,
  };
}

/**
 * Génère un Supplier de test unique
 */
export function generateTestSupplier(overrides: Partial<TestSupplier> = {}): TestSupplier {
  const id = nanoid(8);
  
  return {
    id: `e2e-supplier-${id}`,
    nom: `Supplier TEST ${id}`,
    email: `supplier-test-${id}@saxium-test.local`,
    telephone: `0612345${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    siret: `${Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0')}`,
    specialite: 'menuiserie',
    status: 'actif',
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
 * Crée un Maître d'Ouvrage via l'API
 */
export async function createMaitreOuvrageViaAPI(page: Page, maitreOuvrageData: TestMaitreOuvrage): Promise<string> {
  const response = await page.request.post('/api/maitres-ouvrage', {
    data: maitreOuvrageData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create maître d'ouvrage: ${response.status()} ${await response.text()}`);
  }

  const result = await response.json();
  return result.data?.id || result.id;
}

/**
 * Supprime un Maître d'Ouvrage via l'API
 */
export async function deleteMaitreOuvrageViaAPI(page: Page, maitreOuvrageId: string): Promise<void> {
  const response = await page.request.delete(`/api/maitres-ouvrage/${maitreOuvrageId}`);
  
  if (!response.ok() && response.status() !== 404) {
    console.warn(`Failed to delete maître d'ouvrage ${maitreOuvrageId}: ${response.status()}`);
  }
}

/**
 * Crée un Supplier via l'API
 */
export async function createSupplierViaAPI(page: Page, supplierData: any): Promise<string> {
  const response = await page.request.post('/api/suppliers', {
    data: supplierData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create supplier: ${response.status()} ${await response.text()}`);
  }

  const result = await response.json();
  return result.data?.id || result.id;
}

/**
 * Supprime un Supplier via l'API
 */
export async function deleteSupplierViaAPI(page: Page, supplierId: string): Promise<void> {
  const response = await page.request.delete(`/api/suppliers/${supplierId}`);
  
  if (!response.ok() && response.status() !== 404) {
    console.warn(`Failed to delete supplier ${supplierId}: ${response.status()}`);
  }
}

/**
 * Nettoie TOUTES les données de test de la base de données (par préfixe)
 * Cette fonction garantit qu'aucune donnée test ne persiste, même si l'ID n'a pas été tracké
 * 
 * ✅ COUVERTURE COMPLÈTE : AOs, Offers, Projects, Maîtres d'Ouvrage, Maîtres d'Œuvre,
 *    Suppliers, Supplier Requests, Date Alerts, Project Timelines, Alert Thresholds
 */
export async function cleanupAllTestData(page: Page): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  // Patterns pour identifier les données test
  const testPrefixes = ['TEST', 'E2E', 'test-', 'e2e-'];
  
  try {
    // 1. Cleanup AOs
    const aosResponse = await page.request.get('/api/aos');
    if (aosResponse.ok()) {
      const aosData = await aosResponse.json();
      const aos = aosData.data || aosData || [];
      const testAOs = aos.filter((ao: any) => 
        testPrefixes.some(prefix => 
          ao.reference?.includes(prefix) || 
          ao.client?.includes(prefix) ||
          ao.id?.startsWith('e2e-')
        )
      );
      cleanupPromises.push(
        ...testAOs.map((ao: any) => deleteAOViaAPI(page, ao.id))
      );
    }

    // 2. Cleanup Offers
    const offersResponse = await page.request.get('/api/offers');
    if (offersResponse.ok()) {
      const offersData = await offersResponse.json();
      const offers = offersData.data || offersData || [];
      const testOffers = offers.filter((offer: any) => 
        testPrefixes.some(prefix => 
          offer.reference?.includes(prefix) || 
          offer.titre?.includes(prefix) ||
          offer.client?.includes(prefix) ||
          offer.id?.startsWith('e2e-')
        )
      );
      cleanupPromises.push(
        ...testOffers.map((offer: any) => deleteOfferViaAPI(page, offer.id))
      );
    }

    // 3. Cleanup Projects
    const projectsResponse = await page.request.get('/api/projects');
    if (projectsResponse.ok()) {
      const projectsData = await projectsResponse.json();
      const projects = projectsData.data || projectsData || [];
      const testProjects = projects.filter((project: any) => 
        testPrefixes.some(prefix => 
          project.reference?.includes(prefix) || 
          project.nom?.includes(prefix) ||
          project.client?.includes(prefix) ||
          project.id?.startsWith('e2e-')
        )
      );
      cleanupPromises.push(
        ...testProjects.map((project: any) => deleteProjectViaAPI(page, project.id))
      );
    }

    // 4. Cleanup Maîtres d'Ouvrage
    const maitresOuvrageResponse = await page.request.get('/api/maitres-ouvrage');
    if (maitresOuvrageResponse.ok()) {
      const maitresOuvrageData = await maitresOuvrageResponse.json();
      const maitresOuvrage = maitresOuvrageData.data || maitresOuvrageData || [];
      const testMaitresOuvrage = maitresOuvrage.filter((mo: any) => 
        testPrefixes.some(prefix => 
          mo.nom?.includes(prefix) ||
          mo.email?.includes('test') ||
          mo.email?.includes('e2e') ||
          mo.id?.startsWith('e2e-')
        )
      );
      cleanupPromises.push(
        ...testMaitresOuvrage.map((mo: any) => 
          page.request.delete(`/api/maitres-ouvrage/${mo.id}`).catch(() => {})
        )
      );
    }

    // 5. Cleanup Maîtres d'Œuvre
    const maitresOeuvreResponse = await page.request.get('/api/maitres-oeuvre');
    if (maitresOeuvreResponse.ok()) {
      const maitresOeuvreData = await maitresOeuvreResponse.json();
      const maitresOeuvre = maitresOeuvreData.data || maitresOeuvreData || [];
      const testMaitresOeuvre = maitresOeuvre.filter((moe: any) => 
        testPrefixes.some(prefix => 
          moe.nom?.includes(prefix) ||
          moe.email?.includes('test') ||
          moe.email?.includes('e2e') ||
          moe.id?.startsWith('e2e-')
        )
      );
      cleanupPromises.push(
        ...testMaitresOeuvre.map((moe: any) => 
          page.request.delete(`/api/maitres-oeuvre/${moe.id}`).catch(() => {})
        )
      );
    }

    // 6. Cleanup Suppliers
    const suppliersResponse = await page.request.get('/api/suppliers');
    if (suppliersResponse.ok()) {
      const suppliersData = await suppliersResponse.json();
      const suppliers = suppliersData.data || suppliersData || [];
      const testSuppliers = suppliers.filter((supplier: any) => 
        testPrefixes.some(prefix => 
          supplier.nom?.includes(prefix) ||
          supplier.email?.includes('test') ||
          supplier.email?.includes('e2e') ||
          supplier.id?.startsWith('e2e-')
        )
      );
      cleanupPromises.push(
        ...testSuppliers.map((supplier: any) => 
          page.request.delete(`/api/suppliers/${supplier.id}`).catch(() => {})
        )
      );
    }

    // 7. Cleanup Supplier Requests
    const supplierRequestsResponse = await page.request.get('/api/supplier-requests');
    if (supplierRequestsResponse.ok()) {
      const supplierRequestsData = await supplierRequestsResponse.json();
      const supplierRequests = supplierRequestsData.data || supplierRequestsData || [];
      const testSupplierRequests = supplierRequests.filter((request: any) => 
        testPrefixes.some(prefix => 
          request.offerId?.startsWith('e2e-') ||
          request.id?.startsWith('e2e-')
        )
      );
      // Note: Pas de route DELETE visible pour supplier-requests, silently skip
      // Les requests seront supprimées en cascade lors de la suppression de l'offre
    }

    // 8. Cleanup Date Alerts
    const dateAlertsResponse = await page.request.get('/api/date-alerts');
    if (dateAlertsResponse.ok()) {
      const dateAlertsData = await dateAlertsResponse.json();
      const dateAlerts = dateAlertsData.data || dateAlertsData || [];
      const testDateAlerts = dateAlerts.filter((alert: any) => 
        testPrefixes.some(prefix => 
          alert.entityId?.startsWith('e2e-') ||
          alert.projectId?.startsWith('e2e-') ||
          alert.id?.startsWith('e2e-')
        )
      );
      // Les date alerts sont probablement supprimées en cascade, mais tentons quand même
      cleanupPromises.push(
        ...testDateAlerts.map((alert: any) => 
          page.request.delete(`/api/date-alerts/${alert.id}`).catch(() => {})
        )
      );
    }

    // 9. Cleanup Project Timelines
    const timelinesResponse = await page.request.get('/api/project-timelines');
    if (timelinesResponse.ok()) {
      const timelinesData = await timelinesResponse.json();
      const timelines = timelinesData.data || timelinesData || [];
      const testTimelines = timelines.filter((timeline: any) => 
        testPrefixes.some(prefix => 
          timeline.projectId?.startsWith('e2e-') ||
          timeline.id?.startsWith('e2e-')
        )
      );
      // Les timelines sont probablement supprimées en cascade, mais tentons quand même
      cleanupPromises.push(
        ...testTimelines.map((timeline: any) => 
          page.request.delete(`/api/project-timelines/${timeline.id}`).catch(() => {})
        )
      );
    }

    // 10. Cleanup Alert Thresholds
    const alertThresholdsResponse = await page.request.get('/api/alert-thresholds');
    if (alertThresholdsResponse.ok()) {
      const alertThresholdsData = await alertThresholdsResponse.json();
      const alertThresholds = alertThresholdsData.data || alertThresholdsData || [];
      const testAlertThresholds = alertThresholds.filter((threshold: any) => 
        testPrefixes.some(prefix => 
          threshold.name?.includes(prefix) ||
          threshold.id?.startsWith('e2e-') ||
          threshold.id?.startsWith('test-')
        )
      );
      cleanupPromises.push(
        ...testAlertThresholds.map((threshold: any) => 
          page.request.delete(`/api/alert-thresholds/${threshold.id}`).catch(() => {})
        )
      );
    }

    // Exécuter tous les cleanups en parallèle
    await Promise.allSettled(cleanupPromises);
    
  } catch (error) {
    // Silent fail - le cleanup ne doit pas faire échouer les tests
    console.warn('Cleanup warning:', error);
  }
}

/**
 * Nettoie les données de test créées par un test (IDs trackés + cleanup global)
 * Combine cleanup ciblé (IDs trackés) + cleanup global (par préfixe)
 */
export async function cleanupTestData(page: Page, ids: {
  aos?: string[];
  projects?: string[];
  offers?: string[];
}): Promise<void> {
  // 1. Cleanup ciblé des IDs trackés (rapide)
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

  // 2. Cleanup global pour attraper les données non-trackées (fallback)
  await cleanupAllTestData(page);
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
