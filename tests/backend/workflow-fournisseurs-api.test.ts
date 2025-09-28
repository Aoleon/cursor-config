/**
 * TESTS API BACKEND - WORKFLOW FOURNISSEURS SAXIUM
 * 
 * Test complet de toutes les routes API du workflow fournisseurs :
 * - Sessions fournisseurs sécurisées
 * - Upload de documents
 * - Analyse OCR
 * - Comparaison de devis
 * - Sélection fournisseur
 * 
 * Utilise Supertest pour tester les endpoints backend.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { setupTestApp } from './setup';
import { setupAuth } from './auth-test-helper';

// ========================================
// DONNÉES DE TEST POUR API WORKFLOW
// ========================================

const TEST_WORKFLOW_DATA = {
  ao: {
    id: uuidv4(),
    reference: 'AO-API-TEST-2025',
    client: 'JLM Menuiserie',
    maitreOuvrage: 'Test Client API',
    location: '14000 Caen',
    departement: '14',
    intituleOperation: 'Test API Workflow Fournisseurs',
    description: 'Test des APIs du workflow complet',
    dateLimiteRemise: '2025-04-15',
    demarragePrevu: '2025-05-20',
    montantEstime: 150000,
    typeMarche: 'prive'
  },
  lots: [
    {
      id: uuidv4(),
      numero: 'API-LOT-01',
      designation: 'Fenêtres PVC Test API',
      menuiserieType: 'fenetre',
      quantite: 24,
      montantEstime: 75000
    },
    {
      id: uuidv4(),
      numero: 'API-LOT-02', 
      designation: 'Volets Roulants Test API',
      menuiserieType: 'volet',
      quantite: 20,
      montantEstime: 75000
    }
  ],
  suppliers: [
    {
      id: uuidv4(),
      name: 'API Test Supplier 1',
      email: 'test1@supplier-api.fr',
      contactName: 'Contact Test 1',
      phone: '02 31 00 00 01',
      city: 'Caen',
      specializations: ['fenetre']
    },
    {
      id: uuidv4(),
      name: 'API Test Supplier 2', 
      email: 'test2@supplier-api.fr',
      contactName: 'Contact Test 2',
      phone: '02 31 00 00 02',
      city: 'Bayeux',
      specializations: ['volet']
    },
    {
      id: uuidv4(),
      name: 'API Test Supplier 3',
      email: 'test3@supplier-api.fr', 
      contactName: 'Contact Test 3',
      phone: '02 31 00 00 03',
      city: 'Lisieux',
      specializations: ['fenetre', 'volet']
    }
  ],
  documents: [
    {
      fileName: 'devis_api_test_1.pdf',
      documentType: 'quote',
      mockOcrData: {
        totalAmountHT: 72000,
        totalAmountTTC: 86400,
        vatRate: 20,
        deliveryDelay: 45,
        paymentTerms: '30 jours net',
        validityPeriod: 60,
        confidence: 85,
        qualityScore: 90
      }
    },
    {
      fileName: 'devis_api_test_2.pdf',
      documentType: 'quote',
      mockOcrData: {
        totalAmountHT: 74500,
        totalAmountTTC: 89400,
        vatRate: 20,
        deliveryDelay: 30,
        paymentTerms: '45 jours',
        validityPeriod: 45,
        confidence: 92,
        qualityScore: 95
      }
    }
  ]
};

// ========================================
// SETUP ET CONFIGURATION TESTS
// ========================================

describe('API Workflow Fournisseurs - Tests Backend Complets', () => {
  let app: Express;
  let authToken: string;
  let testUserId: string;
  
  // Stockage des IDs créés pendant les tests
  let createdAoId: string;
  let createdLotIds: string[] = [];
  let createdSupplierIds: string[] = [];
  let createdSessionIds: string[] = [];
  let createdDocumentIds: string[] = [];
  let accessTokens: string[] = [];

  beforeAll(async () => {
    const { app: testApp } = await setupTestApp();
    app = testApp;
    
    // Configuration de l'authentification
    const authData = await setupAuth(app);
    authToken = authData.token;
    testUserId = authData.userId;
  });

  afterAll(async () => {
    // Nettoyage des données de test
    console.log('🧹 Nettoyage des données de test...');
  });

  // ========================================
  // TESTS ÉTAPE 1: CRÉATION AO ET LOTS
  // ========================================

  describe('1. Création AO et Lots', () => {
    
    it('POST /api/aos - Doit créer un AO complet', async () => {
      const response = await request(app)
        .post('/api/aos')
        .set('Authorization', `Bearer ${authToken}`)
        .send(TEST_WORKFLOW_DATA.ao)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.reference).toBe(TEST_WORKFLOW_DATA.ao.reference);
      expect(response.body.client).toBe(TEST_WORKFLOW_DATA.ao.client);
      
      createdAoId = response.body.id;
    });

    it('POST /api/ao-lots - Doit créer les lots pour l\'AO', async () => {
      for (const lot of TEST_WORKFLOW_DATA.lots) {
        const lotData = { ...lot, aoId: createdAoId };
        
        const response = await request(app)
          .post('/api/ao-lots')
          .set('Authorization', `Bearer ${authToken}`)
          .send(lotData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.numero).toBe(lot.numero);
        expect(response.body.designation).toBe(lot.designation);
        
        createdLotIds.push(response.body.id);
      }
    });

    it('GET /api/aos/:id - Doit récupérer l\'AO avec ses lots', async () => {
      const response = await request(app)
        .get(`/api/aos/${createdAoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdAoId);
      expect(response.body).toHaveProperty('lots');
      expect(response.body.lots).toHaveLength(2);
    });
  });

  // ========================================
  // TESTS ÉTAPE 2: GESTION FOURNISSEURS
  // ========================================

  describe('2. Gestion des Fournisseurs', () => {
    
    it('POST /api/suppliers - Doit créer les fournisseurs', async () => {
      for (const supplier of TEST_WORKFLOW_DATA.suppliers) {
        const response = await request(app)
          .post('/api/suppliers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(supplier)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(supplier.name);
        expect(response.body.email).toBe(supplier.email);
        
        createdSupplierIds.push(response.body.id);
      }
    });

    it('POST /api/supplier-workflow/lot-suppliers - Doit associer fournisseurs aux lots', async () => {
      // Associer fournisseurs spécialisés fenêtres au lot 1
      const fenetreSuppliers = createdSupplierIds.slice(0, 2); // Premiers 2 fournisseurs
      
      for (const supplierId of fenetreSuppliers) {
        const response = await request(app)
          .post('/api/supplier-workflow/lot-suppliers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            aoId: createdAoId,
            aoLotId: createdLotIds[0],
            supplierId: supplierId,
            priority: 1,
            notes: 'Fournisseur spécialisé fenêtres'
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.supplierId).toBe(supplierId);
      }

      // Associer fournisseurs volets au lot 2
      const voletSuppliers = [createdSupplierIds[1], createdSupplierIds[2]]; // 2ème et 3ème fournisseurs
      
      for (const supplierId of voletSuppliers) {
        const response = await request(app)
          .post('/api/supplier-workflow/lot-suppliers')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            aoId: createdAoId,
            aoLotId: createdLotIds[1],
            supplierId: supplierId,
            priority: 1,
            notes: 'Fournisseur spécialisé volets'
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
      }
    });

    it('GET /api/supplier-workflow/lot/:aoLotId/suppliers - Doit récupérer fournisseurs du lot', async () => {
      const response = await request(app)
        .get(`/api/supplier-workflow/lot/${createdLotIds[0]}/suppliers`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('supplier');
    });
  });

  // ========================================
  // TESTS ÉTAPE 3: SESSIONS SÉCURISÉES
  // ========================================

  describe('3. Sessions Fournisseurs Sécurisées', () => {
    
    it('POST /api/supplier-workflow/sessions - Doit créer des sessions sécurisées', async () => {
      // Créer session pour chaque association lot-fournisseur
      const associations = [
        { lotId: createdLotIds[0], supplierId: createdSupplierIds[0] },
        { lotId: createdLotIds[0], supplierId: createdSupplierIds[1] },
        { lotId: createdLotIds[1], supplierId: createdSupplierIds[1] },
        { lotId: createdLotIds[1], supplierId: createdSupplierIds[2] }
      ];

      for (const assoc of associations) {
        const response = await request(app)
          .post('/api/supplier-workflow/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            aoId: createdAoId,
            aoLotId: assoc.lotId,
            supplierId: assoc.supplierId,
            expiresInHours: 72,
            allowedEmails: [`test@supplier-${assoc.supplierId}.fr`]
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body.accessToken).toHaveLength(32);
        expect(response.body.status).toBe('active');

        createdSessionIds.push(response.body.id);
        accessTokens.push(response.body.accessToken);
      }
    });

    it('GET /api/supplier-workflow/sessions/public/:token - Doit valider l\'accès public', async () => {
      const token = accessTokens[0];
      
      const response = await request(app)
        .get(`/api/supplier-workflow/sessions/public/${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('ao');
      expect(response.body).toHaveProperty('lot');
      expect(response.body).toHaveProperty('supplier');
      expect(response.body.session.status).toBe('active');
    });

    it('GET /api/supplier-workflow/sessions/public/invalid - Doit rejeter token invalide', async () => {
      await request(app)
        .get('/api/supplier-workflow/sessions/public/invalid-token-12345')
        .expect(401);
    });

    it('GET /api/supplier-workflow/:aoId/status - Doit récupérer statut workflow', async () => {
      const response = await request(app)
        .get(`/api/supplier-workflow/${createdAoId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('aoId');
      expect(response.body).toHaveProperty('totalLots');
      expect(response.body).toHaveProperty('activeSessions');
      expect(response.body.totalLots).toBe(2);
      expect(response.body.activeSessions).toBeGreaterThan(0);
    });
  });

  // ========================================
  // TESTS ÉTAPE 4: UPLOAD DOCUMENTS
  // ========================================

  describe('4. Upload et Gestion Documents', () => {
    
    it('POST /api/supplier-workflow/documents/upload - Doit uploader documents', async () => {
      const token = accessTokens[0]; // Token du premier fournisseur
      
      for (const docData of TEST_WORKFLOW_DATA.documents) {
        // Simuler un fichier PDF
        const pdfBuffer = Buffer.from('Mock PDF content for API testing');
        
        const response = await request(app)
          .post('/api/supplier-workflow/documents/upload')
          .field('sessionToken', token)
          .field('documentType', docData.documentType)
          .field('description', 'Document de test API')
          .attach('document', pdfBuffer, docData.fileName)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('fileName');
        expect(response.body.fileName).toBe(docData.fileName);
        expect(response.body.status).toBe('uploaded');

        createdDocumentIds.push(response.body.id);
      }
    });

    it('GET /api/supplier-workflow/sessions/:sessionId/summary - Doit récupérer résumé documents', async () => {
      const sessionId = createdSessionIds[0];
      
      const response = await request(app)
        .get(`/api/supplier-workflow/sessions/${sessionId}/summary`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('totalDocuments');
      expect(response.body).toHaveProperty('documentsStatus');
      expect(response.body.totalDocuments).toBeGreaterThan(0);
    });

    it('POST /api/supplier-workflow/documents/upload - Doit rejeter fichier invalide', async () => {
      const token = accessTokens[0];
      const txtBuffer = Buffer.from('Not a PDF file');
      
      await request(app)
        .post('/api/supplier-workflow/documents/upload')
        .field('sessionToken', token)
        .field('documentType', 'quote')
        .attach('document', txtBuffer, 'invalid.txt')
        .expect(400);
    });
  });

  // ========================================
  // TESTS ÉTAPE 5: ANALYSE OCR
  // ========================================

  describe('5. Analyse OCR et Traitement', () => {
    
    it('POST /api/supplier-documents/:id/analyze - Doit déclencher analyse OCR', async () => {
      for (let i = 0; i < createdDocumentIds.length; i++) {
        const documentId = createdDocumentIds[i];
        const mockOcrData = TEST_WORKFLOW_DATA.documents[i].mockOcrData;
        
        const response = await request(app)
          .post(`/api/supplier-documents/${documentId}/analyze`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ 
            forceReanalysis: true,
            mockData: mockOcrData // Pour simulation dans les tests
          })
          .expect(200);

        expect(response.body).toHaveProperty('analysisId');
        expect(response.body.status).toBe('processing');
      }
    });

    it('GET /api/supplier-documents/:id/analysis - Doit récupérer résultats OCR', async () => {
      const documentId = createdDocumentIds[0];
      
      // Attendre un peu pour la simulation du traitement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await request(app)
        .get(`/api/supplier-documents/${documentId}/analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      if (response.body.length > 0) {
        const analysis = response.body[0];
        expect(analysis).toHaveProperty('totalAmountHT');
        expect(analysis).toHaveProperty('qualityScore');
        expect(analysis).toHaveProperty('confidence');
      }
    });

    it('GET /api/ocr/analysis/global-stats - Doit récupérer statistiques globales OCR', async () => {
      const response = await request(app)
        .get('/api/ocr/analysis/global-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalAnalyses');
      expect(response.body).toHaveProperty('averageQuality');
      expect(response.body).toHaveProperty('averageConfidence');
    });
  });

  // ========================================
  // TESTS ÉTAPE 6: COMPARAISON DEVIS
  // ========================================

  describe('6. Comparaison et Sélection', () => {
    
    it('GET /api/ao-lots/:id/comparison - Doit récupérer données de comparaison', async () => {
      const lotId = createdLotIds[0];
      
      const response = await request(app)
        .get(`/api/ao-lots/${lotId}/comparison`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          sortBy: 'price',
          sortOrder: 'asc',
          includeRawOcr: false
        })
        .expect(200);

      expect(response.body).toHaveProperty('aoLotId');
      expect(response.body).toHaveProperty('suppliers');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.suppliers).toBeInstanceOf(Array);
      
      if (response.body.suppliers.length > 0) {
        const supplier = response.body.suppliers[0];
        expect(supplier).toHaveProperty('supplierId');
        expect(supplier).toHaveProperty('supplierName');
        expect(supplier).toHaveProperty('ocrData');
      }
    });

    it('GET /api/supplier-quote-sessions/:id/comparison-data - Doit récupérer données détaillées', async () => {
      const sessionId = createdSessionIds[0];
      
      const response = await request(app)
        .get(`/api/supplier-quote-sessions/${sessionId}/comparison-data`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ format: 'detailed' })
        .expect(200);

      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('supplier');
      expect(response.body).toHaveProperty('analysisData');
    });

    it('PUT /api/supplier-quote-analysis/:id/notes - Doit ajouter notes à l\'analyse', async () => {
      // Trouver une analyse existante
      const documentId = createdDocumentIds[0];
      const analysisResponse = await request(app)
        .get(`/api/supplier-documents/${documentId}/analysis`)
        .set('Authorization', `Bearer ${authToken}`);

      if (analysisResponse.body.length > 0) {
        const analysisId = analysisResponse.body[0].id;
        
        const response = await request(app)
          .put(`/api/supplier-quote-analysis/${analysisId}/notes`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            notes: 'Offre intéressante avec bon rapport qualité/prix. Délais compatibles.',
            isInternal: true
          })
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body.notes).toContain('Offre intéressante');
      }
    });

    it('POST /api/ao-lots/:id/select-supplier - Doit sélectionner fournisseur', async () => {
      const lotId = createdLotIds[0];
      const supplierId = createdSupplierIds[0];
      
      const response = await request(app)
        .post(`/api/ao-lots/${lotId}/select-supplier`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: supplierId,
          selectionReason: 'Meilleure offre technique et commerciale après analyse comparative',
          notes: 'Fournisseur sélectionné pour ses compétences et sa réactivité'
        })
        .expect(200);

      expect(response.body).toHaveProperty('selectedSupplierId');
      expect(response.body.selectedSupplierId).toBe(supplierId);
    });
  });

  // ========================================
  // TESTS VALIDATION ET SÉCURITÉ
  // ========================================

  describe('7. Validation et Sécurité', () => {
    
    it('Doit valider l\'intégrité des données workflow', async () => {
      // Vérifier que l'AO existe et est lié aux lots
      const aoResponse = await request(app)
        .get(`/api/aos/${createdAoId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(aoResponse.body.lots).toHaveLength(2);
      
      // Vérifier que les fournisseurs sont bien associés
      for (const lotId of createdLotIds) {
        const suppliersResponse = await request(app)
          .get(`/api/supplier-workflow/lot/${lotId}/suppliers`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(suppliersResponse.body.length).toBeGreaterThan(0);
      }
    });

    it('Doit respecter l\'isolation des sessions', async () => {
      const token1 = accessTokens[0];
      const token2 = accessTokens[1];
      
      // Essayer d'accéder aux données d'une session avec le token d'une autre
      const response1 = await request(app)
        .get(`/api/supplier-workflow/sessions/public/${token1}`)
        .expect(200);

      const response2 = await request(app)
        .get(`/api/supplier-workflow/sessions/public/${token2}`)
        .expect(200);

      // Vérifier que chaque token donne accès à des données différentes
      expect(response1.body.session.id).not.toBe(response2.body.session.id);
      expect(response1.body.supplier.id).not.toBe(response2.body.supplier.id);
    });

    it('Doit valider les permissions d\'accès', async () => {
      // Test sans token d'authentification
      await request(app)
        .get(`/api/aos/${createdAoId}`)
        .expect(401);

      // Test avec token invalide
      await request(app)
        .get(`/api/aos/${createdAoId}`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('Doit valider la performance des requêtes', async () => {
      const startTime = Date.now();
      
      // Test de performance sur la comparaison avec plusieurs fournisseurs
      await request(app)
        .get(`/api/ao-lots/${createdLotIds[0]}/comparison`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // La requête doit répondre en moins de 1 seconde
      expect(responseTime).toBeLessThan(1000);
    });
  });

  // ========================================
  // TESTS DE RÉGRESSION
  // ========================================

  describe('8. Tests de Régression', () => {
    
    it('Doit gérer les erreurs de validation de données', async () => {
      // Test avec données AO invalides
      await request(app)
        .post('/api/aos')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reference: '', // Référence vide
          client: 'Test',
          location: 'Test'
        })
        .expect(400);
    });

    it('Doit gérer les sessions expirées', async () => {
      // Créer une session avec expiration immédiate
      const response = await request(app)
        .post('/api/supplier-workflow/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          aoId: createdAoId,
          aoLotId: createdLotIds[0],
          supplierId: createdSupplierIds[0],
          expiresInHours: -1 // Expirée
        })
        .expect(201);

      // Essayer d'accéder avec le token expiré
      await request(app)
        .get(`/api/supplier-workflow/sessions/public/${response.body.accessToken}`)
        .expect(401);
    });

    it('Doit gérer les conflits de sélection', async () => {
      const lotId = createdLotIds[1];
      const supplier1 = createdSupplierIds[1];
      const supplier2 = createdSupplierIds[2];
      
      // Sélectionner un premier fournisseur
      await request(app)
        .post(`/api/ao-lots/${lotId}/select-supplier`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: supplier1,
          selectionReason: 'Premier choix'
        })
        .expect(200);

      // Essayer de sélectionner un autre fournisseur (doit remplacer)
      await request(app)
        .post(`/api/ao-lots/${lotId}/select-supplier`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          supplierId: supplier2,
          selectionReason: 'Changement de choix'
        })
        .expect(200);
    });
  });
});

// ========================================
// TESTS DE PERFORMANCE ET CHARGE
// ========================================

describe('Performance et Charge - Workflow Fournisseurs', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    const { app: testApp } = await setupTestApp();
    app = testApp;
    const authData = await setupAuth(app);
    authToken = authData.token;
  });

  it('Doit gérer plusieurs sessions simultanées', async () => {
    const concurrentRequests = 10;
    const promises = [];

    for (let i = 0; i < concurrentRequests; i++) {
      const promise = request(app)
        .get('/api/supplier-workflow/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    
    // Toutes les requêtes doivent réussir
    expect(results).toHaveLength(concurrentRequests);
    results.forEach(result => {
      expect(result.status).toBe(200);
    });
  });

  it('Doit maintenir des performances avec volume important', async () => {
    const startTime = Date.now();
    
    // Simuler 50 requêtes de comparaison
    const volumeRequests = Array.from({ length: 50 }, (_, i) => 
      request(app)
        .get('/api/suppliers')
        .set('Authorization', `Bearer ${authToken}`)
    );

    await Promise.all(volumeRequests);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Le traitement de 50 requêtes doit prendre moins de 5 secondes
    expect(totalTime).toBeLessThan(5000);
  });
});