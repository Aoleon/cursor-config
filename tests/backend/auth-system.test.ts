import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { registerRoutes } from '../../server/routes'
import { setupTestAuth } from './auth-test-helper'

describe('Authentication System Tests', () => {
  let app: express.Express
  let server: any

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

  describe('Test Authentication Bypass', () => {
    it('should bypass authentication for test routes', async () => {
      const response = await request(app)
        .get('/api/test/auth-status')
        .expect(200)

      expect(response.body).toHaveProperty('authenticated', true)
      expect(response.body).toHaveProperty('isTest', true)
      expect(response.body.user).toHaveProperty('id', 'test-user-e2e')
      expect(response.body.user).toHaveProperty('email', 'test@e2e.local')
      expect(response.body.user).toHaveProperty('role', 'admin')
      expect(response.body.user).toHaveProperty('isTestUser', true)
    })

    it('should allow access to protected auth/user endpoint', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(200)

      expect(response.body).toHaveProperty('id', 'test-user-e2e')
      expect(response.body).toHaveProperty('email', 'test@e2e.local')
      expect(response.body).toHaveProperty('firstName', 'Test')
      expect(response.body).toHaveProperty('lastName', 'E2E User')
      expect(response.body).toHaveProperty('role', 'admin')
    })

    it('should allow access to protected dashboard routes', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(200)

      expect(response.body).toHaveProperty('totalOffers')
      expect(response.body).toHaveProperty('offersInPricing')
    })

    it('should allow access to protected offers routes', async () => {
      const response = await request(app)
        .get('/api/offers')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should allow access to protected AOs routes', async () => {
      const response = await request(app)
        .get('/api/aos')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should allow POST requests to protected endpoints', async () => {
      const aoData = {
        reference: 'AO-AUTH-TEST-001',
        client: 'Auth Test Client',
        location: 'Test Location',
        department: '75',
        estimatedAmount: '50000',
        menuiserieType: 'fenetre',
        marketType: 'prive',
        source: 'mail'
      }

      const response = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body.reference).toBe(aoData.reference)
    })
  })

  describe('Authentication Middleware Integration', () => {
    it('should provide correct user context in all protected routes', async () => {
      // Test multiple protected routes to ensure consistent auth context
      const endpoints = [
        '/api/auth/user',
        '/api/dashboard/stats',
        '/api/offers',
        '/api/aos',
        '/api/users'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect((res) => {
            // Should not get 401 Unauthorized
            expect(res.status).not.toBe(401);
          });
      }
    })

    it('should handle session data correctly', async () => {
      const response = await request(app)
        .get('/api/auth/user')
        .expect(200)

      // Check that the response includes session-related fields
      expect(response.body).toHaveProperty('isAuthenticated', true)
    })
  })
})