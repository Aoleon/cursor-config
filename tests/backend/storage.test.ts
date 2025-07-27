import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock de la base de données - doit être défini avant les imports
const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        orderBy: vi.fn(() => Promise.resolve([]))
      })),
      orderBy: vi.fn(() => Promise.resolve([]))
    }))
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([{}]))
    }))
  }))
}

vi.mock('../../server/db', () => ({
  db: mockDb
}))

import { DatabaseStorage } from '../../server/storage'
import type { InsertOffer, InsertBeWorkload } from '../../shared/schema'

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage

  beforeEach(() => {
    storage = new DatabaseStorage()
    vi.clearAllMocks()
  })

  describe('Offer Management', () => {
    it('should create an offer successfully', async () => {
      const mockOffer: InsertOffer = {
        reference: 'OFF-2024-001',
        client: 'Test Client',
        location: 'Test Location',
        menuiserieType: 'bardage',
        estimatedAmount: '50000',
        status: 'nouveau',
      }

      const expectedOffer = { id: '1', ...mockOffer }
      mockDb.insert().values().returning.mockResolvedValue([expectedOffer])

      const result = await storage.createOffer(mockOffer)

      expect(mockDb.insert).toHaveBeenCalled()
      expect(result).toEqual(expectedOffer)
    })

    it('should retrieve offers with filters', async () => {
      const mockOffers = [
        { id: '1', reference: 'OFF-001', status: 'nouveau' },
        { id: '2', reference: 'OFF-002', status: 'en_chiffrage' }
      ]

      mockDb.select().from().where().orderBy.mockResolvedValue(mockOffers as any)

      const result = await storage.getOffers('test', 'nouveau')

      expect(mockDb.select).toHaveBeenCalled()
      expect(result).toEqual(mockOffers)
    })
  })

  describe('BE Workload Management', () => {
    it('should create BE workload entry', async () => {
      const mockWorkload: InsertBeWorkload = {
        userId: 'user-1',
        weekNumber: '10',
        year: '2024',
        plannedHours: '40',
        actualHours: '38',
        capacityHours: '40'
      }

      const expectedWorkload = { id: '1', ...mockWorkload }
      mockDb.insert().values().returning.mockResolvedValue([expectedWorkload])

      const result = await storage.createOrUpdateBeWorkload(mockWorkload)

      expect(mockDb.insert).toHaveBeenCalled()
      expect(result).toEqual(expectedWorkload)
    })
  })

  describe('Dashboard Statistics', () => {
    it('should calculate dashboard stats correctly', async () => {
      // Mock different counts for different offer statuses
      mockDb.select().from().where.mockImplementation(() => ({
        orderBy: vi.fn(() => Promise.resolve([{ count: 5 }]))
      }))

      const result = await storage.getDashboardStats()

      expect(result).toHaveProperty('totalOffers')
      expect(result).toHaveProperty('offersInPricing') 
      expect(result).toHaveProperty('offersPendingValidation')
      expect(result).toHaveProperty('beLoad')
    })
  })
})