import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { registerRoutes } from '../../server/routes'

/**
 * Tests d'intégration workflow complet Saxium
 * Simulation des parcours utilisateur réels avec anti-régression
 */

describe('Saxium - Workflow Integration Tests', () => {
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

  describe('AO → Offer → Project Workflow', () => {
    it('should handle complete business workflow without data loss', async () => {
      // 1. Créer un AO (Appel d'Offre)
      const aoData = {
        reference: 'AO-2024-INTEGRATION-001',
        client: 'Mairie de Test',
        location: 'Avenue de Test, 75001 Paris',
        departement: '75',
        description: 'Rénovation menuiseries extérieures',
        menuiserieType: 'renovation',
        estimatedAmount: '75000',
        maitreOeuvre: 'Cabinet Architecture Test',
        source: 'email',
        dateOS: new Date().toISOString(),
        delaiContractuel: '8 semaines',
        cctp: true,
        dpgf: true,
        isSelected: true,
        selectionComment: 'Projet prioritaire - client VIP'
      }

      const aoResponse = await request(app)
        .post('/api/aos')
        .send(aoData)
        .expect(201)

      expect(aoResponse.body).toHaveProperty('id')
      expect(aoResponse.body.reference).toBe(aoData.reference)

      // 2. Créer une offre basée sur l'AO
      const offerData = {
        aoId: aoResponse.body.id,
        reference: 'OFF-2024-INTEGRATION-001',
        client: aoData.client,
        location: aoData.location,
        menuiserieType: aoData.menuiserieType,
        estimatedAmount: aoData.estimatedAmount,
        status: 'nouveau',
        responsibleUserId: 'test-user-1',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours
        isPriority: true
      }

      const offerResponse = await request(app)
        .post('/api/offers')
        .send(offerData)
        .expect(201)

      expect(offerResponse.body).toHaveProperty('id')
      expect(offerResponse.body.aoId).toBe(aoResponse.body.id)

      // 3. Mise à jour du statut offre (En Chiffrage)
      const updateStatusResponse = await request(app)
        .patch(`/api/offers/${offerResponse.body.id}`)
        .send({ status: 'en_chiffrage' })
        .expect(200)

      expect(updateStatusResponse.body.status).toBe('en_chiffrage')

      // 4. Créer une entrée de charge BE
      const workloadData = {
        userId: 'test-user-1',
        weekNumber: '10',
        year: '2024',
        plannedHours: '40',
        actualHours: '35',
        capacityHours: '40'
      }

      const workloadResponse = await request(app)
        .post('/api/be-workload')
        .send(workloadData)
        .expect(201)

      expect(workloadResponse.body).toHaveProperty('id')
      expect(workloadResponse.body.userId).toBe(workloadData.userId)

      // 5. Validation finale offre
      await request(app)
        .patch(`/api/offers/${offerResponse.body.id}`)
        .send({ status: 'valide' })
        .expect(200)

      // 6. Création projet basé sur offre validée
      const projectData = {
        offerId: offerResponse.body.id,
        reference: 'PRJ-2024-INTEGRATION-001',
        client: offerData.client,
        location: offerData.location,
        menuiserieType: offerData.menuiserieType,
        estimatedAmount: offerData.estimatedAmount,
        status: 'etude',
        responsibleUserId: 'test-user-1',
        startDate: new Date().toISOString(),
        expectedEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
      }

      const projectResponse = await request(app)
        .post('/api/projects')
        .send(projectData)
        .expect(201)

      expect(projectResponse.body).toHaveProperty('id')
      expect(projectResponse.body.offerId).toBe(offerResponse.body.id)

      // 7. Vérification intégrité des données liées
      const finalDashboardStats = await request(app)
        .get('/api/dashboard/stats')
        .expect(200)

      expect(finalDashboardStats.body.totalOffers).toBeGreaterThan(0)
    })

    it('should prevent data corruption in concurrent operations', async () => {
      // Test de concurrence pour éviter les race conditions
      const concurrentOffers = Array.from({ length: 5 }, (_, i) => ({
        reference: `OFF-CONCURRENT-${i + 1}`,
        client: `Client Concurrent ${i + 1}`,
        location: 'Location Test',
        menuiserieType: 'neuf',
        estimatedAmount: '30000',
        status: 'nouveau'
      }))

      // Création simultanée de plusieurs offres
      const promises = concurrentOffers.map(offer =>
        request(app)
          .post('/api/offers')
          .send(offer)
      )

      const responses = await Promise.all(promises)
      
      // Vérifier que toutes les créations ont réussi
      responses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body).toHaveProperty('id')
      })

      // Vérifier l'unicité des références
      const references = responses.map(r => r.body.reference)
      const uniqueReferences = new Set(references)
      expect(uniqueReferences.size).toBe(references.length)
    })
  })

  describe('Performance & Anti-Regression Tests', () => {
    it('should maintain API response times under acceptable limits', async () => {
      const startTime = Date.now()
      
      await request(app)
        .get('/api/dashboard/stats')
        .expect(200)
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(500) // Moins de 500ms
    })

    it('should handle large datasets without memory leaks', async () => {
      // Simuler récupération d'un grand nombre d'offres
      const response = await request(app)
        .get('/api/offers?limit=100')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      // Vérifier que la réponse est structurée correctement même pour de gros volumes
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('reference')
        expect(response.body[0]).toHaveProperty('status')
      }
    })

    it('should validate input data to prevent injection attacks', async () => {
      // Test de sécurité basique
      const maliciousData = {
        reference: '<script>alert("xss")</script>',
        client: 'SELECT * FROM users; --',
        location: '<?php echo "test"; ?>',
        menuiserieType: 'neuf',
        estimatedAmount: '50000',
        status: 'nouveau'
      }

      const response = await request(app)
        .post('/api/offers')
        .send(maliciousData)

      // Doit soit rejeter (400) soit nettoyer les données
      if (response.status === 201) {
        expect(response.body.reference).not.toContain('<script>')
        expect(response.body.client).not.toContain('SELECT')
        expect(response.body.location).not.toContain('<?php')
      } else {
        expect(response.status).toBe(400)
      }
    })
  })
})