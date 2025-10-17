import { nanoid } from 'nanoid';
import type { Page } from '@playwright/test';

/**
 * Générateur de données de test uniques pour Saxium
 * Utilise nanoid pour garantir l'unicité des données dans les tests parallèles
 */

export interface TestAO {
  reference: string;
  client: string;
  maitreOuvrage: string;
  location: string;
  departement: string;
  intituleOperation: string;
  dateLimiteRemise: string;
  montantEstime: number;
  typeMarche: string;
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

export interface TestSupplier {
  name: string;
  email: string;
  phone: string;
  specialization?: string;
  address?: string;
  status?: string;
}

export interface TestLot {
  numero: string;
  designation: string;
  menuiserieType?: string;
  montantEstime?: number;
  aoId?: string;
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
    ...overrides,
  };
}

/**
 * Génère un Fournisseur de test unique
 */
export function generateTestSupplier(overrides: Partial<TestSupplier> = {}): TestSupplier {
  const id = nanoid(8);

  return {
    name: `Supplier-TEST-${id}`,
    email: `supplier.${id}@test-saxium.local`,
    phone: `01${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    specialization: 'Menuiserie',
    address: '1 Rue de Test, 75001 Paris',
    status: 'active',
    ...overrides,
  };
}

/**
 * Génère un Lot de test unique
 */
export function generateTestLot(overrides: Partial<TestLot> = {}): TestLot {
  const id = nanoid(6);

  return {
    numero: `LOT-${id}`,
    designation: `Lot de test ${id}`,
    menuiserieType: 'fenetre',
    montantEstime: 50000,
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
 * Crée un Fournisseur via l'API directement
 */
export async function createSupplierViaAPI(page: Page, supplierData: TestSupplier): Promise<string> {
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
 * Crée un Lot via l'API directement
 */
export async function createLotViaAPI(page: Page, lotData: TestLot): Promise<string> {
  const response = await page.request.post(`/api/aos/${lotData.aoId}/lots`, {
    data: lotData,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create lot: ${response.status()} ${await response.text()}`);
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
 * Supprime un Fournisseur via l'API
 */
export async function deleteSupplierViaAPI(page: Page, supplierId: string): Promise<void> {
  const response = await page.request.delete(`/api/suppliers/${supplierId}`);
  
  if (!response.ok() && response.status() !== 404) {
    console.warn(`Failed to delete supplier ${supplierId}: ${response.status()}`);
  }
}

/**
 * Supprime un Lot via l'API
 */
export async function deleteLotViaAPI(page: Page, lotId: string, aoId: string): Promise<void> {
  const response = await page.request.delete(`/api/aos/${aoId}/lots/${lotId}`);
  
  if (!response.ok() && response.status() !== 404) {
    console.warn(`Failed to delete lot ${lotId}: ${response.status()}`);
  }
}

/**
 * Nettoie toutes les données de test créées par un test
 */
export async function cleanupTestData(page: Page, ids: {
  aos?: string[];
  projects?: string[];
  offers?: string[];
  suppliers?: string[];
  lots?: Array<{ id: string; aoId: string }>;
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
  if (ids.suppliers) {
    cleanupPromises.push(...ids.suppliers.map(id => deleteSupplierViaAPI(page, id)));
  }
  if (ids.lots) {
    cleanupPromises.push(...ids.lots.map(({ id, aoId }) => deleteLotViaAPI(page, id, aoId)));
  }

  await Promise.allSettled(cleanupPromises);
}

/**
 * Upload un fichier PDF pour OCR
 */
export async function uploadPDFForOCR(page: Page, aoId: string, pdfPath: string): Promise<any> {
  const response = await page.request.post('/api/ocr/create-ao-from-pdf', {
    multipart: {
      pdf: {
        name: pdfPath.split('/').pop() || 'test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from(''), // Playwright gère le fichier automatiquement
      },
      aoId,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to upload PDF for OCR: ${response.status()} ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Attend que l'OCR soit terminé
 */
export async function waitForOCRCompletion(page: Page, aoId: string, timeout = 60000): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const response = await page.request.get(`/api/aos/${aoId}`);
    if (response.ok()) {
      const result = await response.json();
      const ao = result.data || result;
      
      if (ao.ocrData && ao.ocrData.confidence) {
        return ao.ocrData;
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`OCR did not complete within ${timeout}ms`);
}

/**
 * Extrait les lots d'un AO via API
 */
export async function extractLotsFromAO(page: Page, aoId: string): Promise<any[]> {
  const response = await page.request.post(`/api/ao-lots/extract`, {
    data: { aoId },
  });

  if (!response.ok()) {
    throw new Error(`Failed to extract lots: ${response.status()} ${await response.text()}`);
  }

  const result = await response.json();
  return result.data || result.lots || [];
}

/**
 * Crée une demande de devis fournisseur
 */
export async function createSupplierRequest(page: Page, data: {
  aoId: string;
  supplierId: string;
  lotIds?: string[];
}): Promise<string> {
  const response = await page.request.post('/api/supplier-requests', {
    data,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create supplier request: ${response.status()} ${await response.text()}`);
  }

  const result = await response.json();
  return result.data?.id || result.id;
}
