import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { registerRoutes } from '../../server/routes'
import { setupTestAuth } from './auth-test-helper'

describe('AO API Routes Tests', () => {
  let app: express.Express
  let server: any
  let createdAoId: string

  beforeEach(async () => {
    app = express()
    app.use(express.json())
    
    // Setup test authentication bypass
    setupTestAuth(app)
    
    server = await registerRoutes(app)
  })

  afterEach(async () => {
    if (server) {
      server.close()
    }
  })

  describe('AO CRUD Operations', () => {
    it('POST /api/aos should create a new AO', async () => {
      const aoData = {
        reference: 'AO-TEST-API-001',
        client: 'JLM Menuiserie Test API',
        location: '62200 Boulogne-sur-Mer',
        department: '62',
        estimatedAmount: '280000',
        menuiserieType: 'exterieure_et_interieure',
        marketType: 'public',
        deadlineDate: '2025-10-15',
        status: 'brouillon'
      }

      const response = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.reference).toBe(aoData.reference)
      expect(response.body.client).toBe(aoData.client)
      expect(response.body.status).toBe(aoData.status)
      
      createdAoId = response.body.id
    })

    it('GET /api/aos should return AOs list', async () => {
      const response = await request(app)
        .get('/api/aos')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('GET /api/aos/:id should return specific AO', async () => {
      // First create an AO
      const aoData = {
        reference: 'AO-TEST-GET-001',
        client: 'Test Client',
        location: 'Test Location',
        department: '62',
        estimatedAmount: '50000',
        menuiserieType: 'exterieure',
        marketType: 'prive'
      }

      const createResponse = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      const aoId = createResponse.body.id

      // Then fetch it
      const response = await request(app)
        .get(`/api/aos/${aoId}`)
        .expect(200)

      expect(response.body.id).toBe(aoId)
      expect(response.body.reference).toBe(aoData.reference)
    })

    it('PUT /api/aos/:id should update AO', async () => {
      // First create an AO
      const aoData = {
        reference: 'AO-TEST-UPDATE-001',
        client: 'Original Client',
        location: 'Original Location',
        department: '62',
        estimatedAmount: '50000',
        menuiserieType: 'exterieure',
        marketType: 'prive'
      }

      const createResponse = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      const aoId = createResponse.body.id

      // Then update it
      const updateData = {
        client: 'Updated Client',
        location: 'Updated Location',
        estimatedAmount: '75000'
      }

      const updateResponse = await request(app)
        .put(`/api/aos/${aoId}`)
        .send(updateData)
        .expect(200)

      expect(updateResponse.body.client).toBe(updateData.client)
      expect(updateResponse.body.location).toBe(updateData.location)
      expect(updateResponse.body.estimatedAmount).toBe(updateData.estimatedAmount)
    })

    it('PATCH /api/aos/:id should partially update AO', async () => {
      // First create an AO
      const aoData = {
        reference: 'AO-TEST-PATCH-001',
        client: 'Original Client',
        location: 'Original Location',
        department: '62',
        estimatedAmount: '50000',
        menuiserieType: 'exterieure',
        marketType: 'prive',
        status: 'brouillon'
      }

      const createResponse = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      const aoId = createResponse.body.id

      // Then patch only status
      const patchData = {
        status: 'etude'
      }

      const patchResponse = await request(app)
        .patch(`/api/aos/${aoId}`)
        .send(patchData)
        .expect(200)

      expect(patchResponse.body.status).toBe(patchData.status)
      expect(patchResponse.body.client).toBe(aoData.client) // Should remain unchanged
    })
  })

  describe('AO Workflow Operations', () => {
    let testAoId: string

    beforeEach(async () => {
      // Create a test AO for workflow tests
      const aoData = {
        reference: 'AO-WORKFLOW-TEST',
        client: 'Workflow Test Client',
        location: 'Test Location',
        department: '62',
        estimatedAmount: '100000',
        menuiserieType: 'exterieure_et_interieure',
        marketType: 'public',
        status: 'brouillon'
      }

      const response = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      testAoId = response.body.id
    })

    it('GET /api/aos/etude should return AOs in study phase', async () => {
      const response = await request(app)
        .get('/api/aos/etude')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('POST /api/aos/:id/validate-etude should validate study phase', async () => {
      const validationData = {
        studyNotes: 'Étude technique validée',
        validatedBy: 'test-engineer'
      }

      const response = await request(app)
        .post(`/api/aos/${testAoId}/validate-etude`)
        .send(validationData)
        .expect(200)

      expect(response.body).toHaveProperty('status')
    })

    it('GET /api/aos/chiffrage should return AOs ready for pricing', async () => {
      const response = await request(app)
        .get('/api/aos/chiffrage')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('POST /api/aos/:id/validate-chiffrage should validate pricing phase', async () => {
      const chiffrageData = {
        finalAmount: '150000',
        marginPercent: '15',
        validatedBy: 'test-manager'
      }

      const response = await request(app)
        .post(`/api/aos/${testAoId}/validate-chiffrage`)
        .send(chiffrageData)
        .expect(200)

      expect(response.body).toHaveProperty('status')
    })

    it('GET /api/aos/devis-ready should return AOs ready for quote generation', async () => {
      const response = await request(app)
        .get('/api/aos/devis-ready')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('POST /api/aos/:id/send-devis should send quote to client', async () => {
      const devisData = {
        clientEmail: 'client@example.com',
        message: 'Voici notre devis pour votre projet'
      }

      const response = await request(app)
        .post(`/api/aos/${testAoId}/send-devis`)
        .send(devisData)
        .expect(200)

      expect(response.body).toHaveProperty('message')
    })

    it('POST /api/aos/:id/relance should send reminder to client', async () => {
      const relanceData = {
        message: 'Relance pour validation du devis'
      }

      const response = await request(app)
        .post(`/api/aos/${testAoId}/relance`)
        .send(relanceData)
        .expect(200)

      expect(response.body).toHaveProperty('message')
    })
  })

  describe('AO Lots Management', () => {
    let testAoId: string

    beforeEach(async () => {
      // Create a test AO for lots tests
      const aoData = {
        reference: 'AO-LOTS-TEST',
        client: 'Lots Test Client',
        location: 'Test Location',
        department: '62',
        estimatedAmount: '200000',
        menuiserieType: 'exterieure_et_interieure',
        marketType: 'public'
      }

      const response = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      testAoId = response.body.id
    })

    it('GET /api/aos/:aoId/lots should return lots for an AO', async () => {
      const response = await request(app)
        .get(`/api/aos/${testAoId}/lots`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('POST /api/aos/:aoId/lots should create a lot for an AO', async () => {
      const lotData = {
        code: '07.1',
        description: 'Menuiseries extérieures PVC',
        estimatedAmount: '120000',
        unit: 'm2',
        quantity: '150'
      }

      const response = await request(app)
        .post(`/api/aos/${testAoId}/lots`)
        .send(lotData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.code).toBe(lotData.code)
      expect(response.body.aoId).toBe(testAoId)
    })

    it('PUT /api/aos/:aoId/lots/:lotId should update a lot', async () => {
      // First create a lot
      const lotData = {
        code: '08.1',
        description: 'Menuiseries intérieures',
        estimatedAmount: '80000',
        unit: 'm2',
        quantity: '100'
      }

      const createResponse = await request(app)
        .post(`/api/aos/${testAoId}/lots`)
        .send(lotData)
        .expect(201)

      const lotId = createResponse.body.id

      // Then update it
      const updateData = {
        description: 'Menuiseries intérieures premium',
        estimatedAmount: '95000'
      }

      const updateResponse = await request(app)
        .put(`/api/aos/${testAoId}/lots/${lotId}`)
        .send(updateData)
        .expect(200)

      expect(updateResponse.body.description).toBe(updateData.description)
      expect(updateResponse.body.estimatedAmount).toBe(updateData.estimatedAmount)
    })

    it('DELETE /api/aos/:aoId/lots/:lotId should delete a lot', async () => {
      // First create a lot
      const lotData = {
        code: '09.1',
        description: 'Test lot to delete',
        estimatedAmount: '30000',
        unit: 'unit',
        quantity: '10'
      }

      const createResponse = await request(app)
        .post(`/api/aos/${testAoId}/lots`)
        .send(lotData)
        .expect(201)

      const lotId = createResponse.body.id

      // Then delete it
      await request(app)
        .delete(`/api/aos/${testAoId}/lots/${lotId}`)
        .expect(200)

      // Verify it's deleted
      const lotsResponse = await request(app)
        .get(`/api/aos/${testAoId}/lots`)
        .expect(200)

      const deletedLot = lotsResponse.body.find((lot: any) => lot.id === lotId)
      expect(deletedLot).toBeUndefined()
    })
  })

  describe('AO Documents Management', () => {
    let testAoId: string

    beforeEach(async () => {
      // Create a test AO for documents tests
      const aoData = {
        reference: 'AO-DOCS-TEST',
        client: 'Documents Test Client',
        location: 'Test Location',
        department: '62',
        estimatedAmount: '100000',
        menuiserieType: 'exterieure',
        marketType: 'prive'
      }

      const response = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      testAoId = response.body.id
    })

    it('GET /api/aos/:aoId/documents should return documents for an AO', async () => {
      const response = await request(app)
        .get(`/api/aos/${testAoId}/documents`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('POST /api/aos/:aoId/documents/upload-url should return upload URL', async () => {
      const uploadData = {
        fileName: 'test-document.pdf',
        fileType: 'application/pdf',
        category: 'cctp'
      }

      const response = await request(app)
        .post(`/api/aos/${testAoId}/documents/upload-url`)
        .send(uploadData)
        .expect(200)

      expect(response.body).toHaveProperty('uploadUrl')
      expect(response.body).toHaveProperty('fileKey')
    })

    it('POST /api/aos/:aoId/documents should confirm document upload', async () => {
      const documentData = {
        fileName: 'confirmed-document.pdf',
        fileKey: 'test-file-key',
        category: 'plans',
        description: 'Test document upload'
      }

      const response = await request(app)
        .post(`/api/aos/${testAoId}/documents`)
        .send(documentData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.fileName).toBe(documentData.fileName)
      expect(response.body.aoId).toBe(testAoId)
    })
  })

  describe('DPGF and Quote Generation', () => {
    let testAoId: string

    beforeEach(async () => {
      // Create a test AO for DPGF tests
      const aoData = {
        reference: 'AO-DPGF-TEST',
        client: 'DPGF Test Client',
        location: 'Test Location',
        department: '62',
        estimatedAmount: '150000',
        menuiserieType: 'exterieure_et_interieure',
        marketType: 'public'
      }

      const response = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      testAoId = response.body.id
    })

    it('GET /api/aos/:id/dpgf/preview should return DPGF preview', async () => {
      const response = await request(app)
        .get(`/api/aos/${testAoId}/dpgf/preview`)
        .expect(200)

      expect(response.body).toHaveProperty('previewData')
    })

    it('GET /api/aos/:id/dpgf/download should trigger DPGF download', async () => {
      const response = await request(app)
        .get(`/api/aos/${testAoId}/dpgf/download`)
        .expect(200)

      expect(response.headers['content-type']).toContain('application/')
    })

    it('GET /api/aos/:id/devis/preview should return quote preview', async () => {
      const response = await request(app)
        .get(`/api/aos/${testAoId}/devis/preview`)
        .expect(200)

      expect(response.body).toHaveProperty('previewData')
    })

    it('GET /api/aos/:id/devis/download should trigger quote download', async () => {
      const response = await request(app)
        .get(`/api/aos/${testAoId}/devis/download`)
        .expect(200)

      expect(response.headers['content-type']).toContain('application/')
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent AO', async () => {
      await request(app)
        .get('/api/aos/non-existent-id')
        .expect(404)
    })

    it('should return 400 for invalid AO data', async () => {
      const invalidData = {
        // Missing required fields
        reference: '',
        client: ''
      }

      await request(app)
        .post('/api/aos')
        .send(invalidData)
        .expect(400)
    })

    it('should handle validation errors gracefully', async () => {
      const invalidAoData = {
        reference: 'INVALID',
        estimatedAmount: 'not-a-number'
      }

      const response = await request(app)
        .post('/api/aos')
        .send(invalidAoData)
        .expect(400)

      expect(response.body).toHaveProperty('message')
    })
  })
})