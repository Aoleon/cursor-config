import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { registerRoutes } from '../../server/routes'

describe('API Routes Tests', () => {
  let app: express.Express
  let server: any

  beforeEach(async () => {
    app = express()
    app.use(express.json())
    server = await registerRoutes(app)
  })

  afterEach(async () => {
    if (server) {
      server.close()
    }
  })

  describe('Authentication Routes', () => {
    it('GET /api/auth/user should return mock user', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(200)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('email')
      expect(response.body).toHaveProperty('firstName', 'Sylvie')
      expect(response.body).toHaveProperty('role', 'responsable_be')
    })
  })

  describe('Dashboard Routes', () => {
    it('GET /api/dashboard/stats should return statistics', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200)

      expect(response.body).toHaveProperty('totalOffers')
      expect(response.body).toHaveProperty('offersInPricing')
      expect(response.body).toHaveProperty('offersPendingValidation')
      expect(response.body).toHaveProperty('beLoad')
    })
  })

  describe('Offers Routes', () => {
    it('GET /api/offers should return offers list', async () => {
      const response = await request(app)
        .get('/api/offers')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('POST /api/offers should create new offer', async () => {
      const offerData = {
        reference: 'OFF-TEST-001',
        client: 'Test Client',
        location: 'Test Location',
        menuiserieType: 'bardage',
        estimatedAmount: '50000',
        status: 'nouveau',
      }

      const response = await request(app)
        .post('/api/offers')
        .send(offerData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.reference).toBe(offerData.reference)
    })

    it('GET /api/offers with search should filter results', async () => {
      const response = await request(app)
        .get('/api/offers?search=test&status=nouveau')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe('BE Workload Routes', () => {
    it('GET /api/be-workload should return workload data', async () => {
      const response = await request(app)
        .get('/api/be-workload')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('POST /api/be-workload should create workload entry', async () => {
      const workloadData = {
        userId: 'user-1',
        weekNumber: '10',
        year: '2024',
        plannedHours: '40',
        actualHours: '38',
        capacityHours: '40'
      }

      const response = await request(app)
        .post('/api/be-workload')
        .send(workloadData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.userId).toBe(workloadData.userId)
    })
  })

  describe('Users Routes', () => {
    it('GET /api/users should return team members', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0]).toHaveProperty('firstName', 'Sylvie')
      expect(response.body[0]).toHaveProperty('role', 'responsable_be')
    })

    it('GET /api/users with role filter should filter by role', async () => {
      const response = await request(app)
        .get('/api/users?role=responsable_be')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      response.body.forEach((user: any) => {
        expect(user.role).toBe('responsable_be')
      })
    })
  })

  describe('Sample Data Routes', () => {
    it('POST /api/init-sample-data should create sample data', async () => {
      const response = await request(app)
        .post('/api/init-sample-data')
        .expect(200)

      expect(response.body).toHaveProperty('message', 'Sample data created successfully')
      expect(response.body).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('aos')
      expect(response.body.data).toHaveProperty('offers')
      expect(response.body.data).toHaveProperty('workload')
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 for non-existent routes', async () => {
      await request(app)
        .get('/api/non-existent')
        .expect(404)
    })

    it('should handle invalid JSON in POST requests', async () => {
      await request(app)
        .post('/api/offers')
        .send('invalid json')
        .expect(400)
    })
  })
})