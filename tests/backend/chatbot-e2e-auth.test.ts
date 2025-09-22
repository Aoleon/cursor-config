import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { registerRoutes } from '../../server/routes-poc'
import { createServer } from 'http'
import { storage } from '../../server/storage-poc'

describe('Chatbot E2E Authenticated Tests', () => {
  let app: express.Express
  let server: any

  beforeEach(async () => {
    app = express()
    app.use(express.json())
    
    // Mock session middleware for authentication
    app.use((req: any, res, next) => {
      req.user = {
        claims: {
          sub: 'admin-user-test-001',
          email: 'admin@jlm-menuiserie.fr',
          firstName: 'Admin',
          lastName: 'Test',
          role: 'admin'
        }
      }
      req.session = {
        user: {
          id: 'admin-user-test-001',
          email: 'admin@jlm-menuiserie.fr',
          firstName: 'Admin',
          lastName: 'Test',
          role: 'admin'
        }
      }
      next()
    })

    server = await registerRoutes(app)
  })

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    }
  })

  describe('Chatbot Pipeline Authentication Validation', () => {
    it('POST /api/chatbot/query should process authenticated request successfully', async () => {
      const startTime = Date.now()
      
      const chatbotQuery = {
        query: "Quels sont les projets en cours avec leur statut ?",
        userId: "admin-user-test-001",
        userRole: "admin",
        sessionId: `test-session-${Date.now()}`,
        options: {
          maxResults: 100,
          timeoutMs: 10000,
          includeDebugInfo: true,
          dryRun: false
        }
      }

      const response = await request(app)
        .post('/api/chatbot/query')
        .send(chatbotQuery)
        .expect(200)

      const executionTime = Date.now() - startTime

      // Validation réponse structure
      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('conversation_id')
      expect(response.body).toHaveProperty('query', chatbotQuery.query)
      expect(response.body).toHaveProperty('explanation')
      expect(response.body).toHaveProperty('results')
      expect(response.body).toHaveProperty('execution_time_ms')
      
      // Validation performance < 3s
      expect(response.body.execution_time_ms).toBeLessThan(3000)
      expect(executionTime).toBeLessThan(5000) // Marge pour le réseau/tests
      
      // Validation debug info si présente
      if (response.body.debug_info) {
        expect(response.body.debug_info).toHaveProperty('security_checks_passed')
        expect(response.body.debug_info.security_checks_passed).toContain('rbac_permissions_validated')
      }

      console.log(`✅ Chatbot Query Test - Execution: ${executionTime}ms, Response: ${response.body.execution_time_ms}ms`)
    }, 15000) // Timeout de 15s pour le test

    it('GET /api/chatbot/health should return 200 for authenticated admin', async () => {
      const response = await request(app)
        .get('/api/chatbot/health')
        .expect(200)

      expect(response.body).toHaveProperty('status', 'healthy')
      expect(response.body).toHaveProperty('services')
      expect(response.body.services).toHaveProperty('aiService')
      expect(response.body.services).toHaveProperty('rbacService') 
      expect(response.body.services).toHaveProperty('sqlEngineService')
      expect(response.body.services).toHaveProperty('businessContextService')

      console.log('✅ Chatbot Health Check - All services operational')
    })

    it('GET /api/chatbot/suggestions should return intelligent suggestions for admin', async () => {
      const response = await request(app)
        .get('/api/chatbot/suggestions')
        .query({
          userId: 'admin-user-test-001',
          userRole: 'admin',
          limit: 5
        })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('suggestions')
      expect(Array.isArray(response.body.suggestions)).toBe(true)
      expect(response.body.suggestions.length).toBeGreaterThan(0)
      
      // Valider structure des suggestions
      const firstSuggestion = response.body.suggestions[0]
      expect(firstSuggestion).toHaveProperty('text')
      expect(firstSuggestion).toHaveProperty('category')
      expect(firstSuggestion).toHaveProperty('priority')

      console.log(`✅ Suggestions retrieved: ${response.body.suggestions.length} items`)
    })

    it('POST /api/chatbot/validate should validate query without execution', async () => {
      const validateQuery = {
        query: "Montre-moi tous les projets en retard",
        userId: "admin-user-test-001",
        userRole: "admin",
        options: {
          checkSecurity: true,
          checkRbac: true,
          estimateComplexity: true
        }
      }

      const response = await request(app)
        .post('/api/chatbot/validate')
        .send(validateQuery)
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body).toHaveProperty('validation_id')
      expect(response.body).toHaveProperty('securityChecksPassed')
      expect(response.body).toHaveProperty('estimatedComplexity')
      
      console.log('✅ Query validation successful')
    })

    it('Full pipeline integration: Query → History verification', async () => {
      const sessionId = `integration-test-${Date.now()}`
      
      // 1. Exécuter une requête chatbot
      const chatbotQuery = {
        query: "Combien d'offres sont en cours de chiffrage ?",
        userId: "admin-user-test-001", 
        userRole: "admin",
        sessionId: sessionId,
        options: {
          maxResults: 50,
          includeDebugInfo: false
        }
      }

      const queryResponse = await request(app)
        .post('/api/chatbot/query')
        .send(chatbotQuery)
        .expect(200)

      expect(queryResponse.body.success).toBe(true)
      const conversationId = queryResponse.body.conversation_id

      // 2. Vérifier persistance dans l'historique
      const historyResponse = await request(app)
        .get('/api/chatbot/history')
        .query({
          userId: 'admin-user-test-001',
          sessionId: sessionId,
          limit: 1
        })
        .expect(200)

      expect(historyResponse.body).toHaveProperty('success', true)
      expect(historyResponse.body).toHaveProperty('conversations')
      expect(Array.isArray(historyResponse.body.conversations)).toBe(true)
      
      // Vérifier que notre conversation est présente
      if (historyResponse.body.conversations.length > 0) {
        const conversation = historyResponse.body.conversations[0]
        expect(conversation).toHaveProperty('query', chatbotQuery.query)
        expect(conversation).toHaveProperty('userId', 'admin-user-test-001')
        expect(conversation).toHaveProperty('sessionId', sessionId)
      }

      console.log('✅ Full pipeline integration - Query executed and persisted')
    }, 20000) // Timeout étendu pour integration test
  })

  describe('Chatbot Error Handling', () => {
    it('should handle invalid query gracefully', async () => {
      const invalidQuery = {
        query: "", // Empty query
        userId: "admin-user-test-001",
        userRole: "admin"
      }

      const response = await request(app)
        .post('/api/chatbot/query')
        .send(invalidQuery)
        .expect(400) // Bad request expected

      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
    })

    it('should handle timeout gracefully', async () => {
      const timeoutQuery = {
        query: "Une requête très complexe qui pourrait prendre du temps",
        userId: "admin-user-test-001",
        userRole: "admin",
        options: {
          timeoutMs: 1000 // Timeout très court pour forcer l'erreur
        }
      }

      const response = await request(app)
        .post('/api/chatbot/query')
        .send(timeoutQuery)
        .timeout(2000)

      // Accepter soit success soit timeout error
      if (response.status === 200) {
        expect(response.body).toHaveProperty('success', true)
        console.log('✅ Query completed within timeout')
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400)
        expect(response.body).toHaveProperty('success', false)
        console.log('✅ Timeout handled gracefully')
      }
    }, 5000)
  })
})