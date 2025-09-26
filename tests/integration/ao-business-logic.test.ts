/**
 * Tests d'intégration pour la logique métier des AO
 * Test sans dépendances externes complexes
 */

import { describe, it, expect } from 'vitest'

describe('AO Business Logic Tests', () => {
  describe('Validation métier AO', () => {
    it('should validate AO reference format', () => {
      const validReferences = [
        'AO-2503-E001',
        'AO-BOULOGNE-001', 
        'AO-TEST-12345'
      ]

      const invalidReferences = [
        'ao-test-001', // minuscules
        'AO_TEST_001', // underscores
        'AO-TEST',     // pas de numéro
        '',            // vide
        'TEST-001'     // pas de préfixe AO-
      ]

      // Test références valides
      validReferences.forEach(ref => {
        const isValid = validateAoReference(ref)
        expect(isValid).toBe(true)
      })

      // Test références invalides
      invalidReferences.forEach(ref => {
        const isValid = validateAoReference(ref)
        expect(isValid).toBe(false)
      })
    })

    it('should validate French departments', () => {
      const validDepartments = ['01', '62', '75', '13', '69', '33', '59', '2A', '2B']
      const invalidDepartments = ['00', '999', 'AB', '', '101']

      validDepartments.forEach(dept => {
        expect(isValidFrenchDepartment(dept)).toBe(true)
      })

      invalidDepartments.forEach(dept => {
        expect(isValidFrenchDepartment(dept)).toBe(false)
      })
    })

    it('should validate menuiserie types', () => {
      const validTypes = [
        'fenetre',
        'porte', 
        'portail',
        'volet',
        'cloison',
        'verriere',
        'exterieure',
        'interieure',
        'exterieure_et_interieure'
      ]

      const invalidTypes = [
        'invalid_type',
        '',
        'FENETRE', // majuscules
        'fenêtre'  // accents
      ]

      validTypes.forEach(type => {
        expect(isValidMenuiserieType(type)).toBe(true)
      })

      invalidTypes.forEach(type => {
        expect(isValidMenuiserieType(type)).toBe(false)
      })
    })

    it('should validate AO status transitions', () => {
      // Transitions valides
      const validTransitions = [
        { from: 'brouillon', to: 'etude' },
        { from: 'etude', to: 'chiffrage' },
        { from: 'chiffrage', to: 'validation_be' },
        { from: 'validation_be', to: 'devis_envoye' },
        { from: 'devis_envoye', to: 'signe' },
        { from: 'signe', to: 'transforme_en_projet' }
      ]

      // Transitions invalides
      const invalidTransitions = [
        { from: 'brouillon', to: 'signe' },        // saut d'étapes
        { from: 'transforme_en_projet', to: 'etude' }, // retour impossible
        { from: 'signe', to: 'brouillon' },        // retour impossible
        { from: 'invalid', to: 'etude' }           // statut inexistant
      ]

      validTransitions.forEach(({ from, to }) => {
        expect(isValidStatusTransition(from, to)).toBe(true)
      })

      invalidTransitions.forEach(({ from, to }) => {
        expect(isValidStatusTransition(from, to)).toBe(false)
      })
    })

    it('should calculate AO deadlines correctly', () => {
      // Test calcul avec 15 jours ouvrés
      const creationDate = new Date('2025-01-15T10:00:00Z') // Mercredi
      const deadline = calculateBusinessDeadline(creationDate, 15)
      
      // 15 jours ouvrés à partir du 15/01 (mercredi)
      // Devrait arriver vers début février
      expect(deadline).toBeInstanceOf(Date)
      expect(deadline.getTime()).toBeGreaterThan(creationDate.getTime())
      
      // Vérifier que c'est bien environ 3 semaines plus tard
      const diffInDays = Math.ceil((deadline.getTime() - creationDate.getTime()) / (1000 * 60 * 60 * 24))
      expect(diffInDays).toBeGreaterThanOrEqual(19) // Minimum avec weekends
      expect(diffInDays).toBeLessThanOrEqual(25)     // Maximum raisonnable
    })

    it('should validate lot structure for menuiserie', () => {
      const validLots = [
        {
          code: '07.1',
          description: 'Menuiseries extérieures PVC',
          estimatedAmount: 185000,
          menuiserieType: 'exterieure'
        },
        {
          code: '08.1', 
          description: 'Menuiseries intérieures',
          estimatedAmount: 95000,
          menuiserieType: 'interieure'
        }
      ]

      const validation = validateLotsStructure(validLots)
      
      expect(validation.isValid).toBe(true)
      expect(validation.totalAmount).toBe(280000)
      expect(validation.lotCount).toBe(2)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid lot configurations', () => {
      const invalidLots = [
        {
          code: '', // code vide
          description: 'Menuiseries extérieures PVC',
          estimatedAmount: -1000, // montant négatif
          menuiserieType: 'invalid_type' // type invalide
        }
      ]

      const validation = validateLotsStructure(invalidLots)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
      expect(validation.errors.some(e => e.includes('Code lot obligatoire'))).toBe(true)
      expect(validation.errors.some(e => e.includes('Montant doit être positif'))).toBe(true)
      expect(validation.errors.some(e => e.includes('Type menuiserie invalide'))).toBe(true)
    })
  })

  describe('Calculations and Analytics', () => {
    it('should calculate project profitability correctly', () => {
      const projectData = {
        estimatedAmount: 280000,
        costBreakdown: {
          materials: 140000,
          labor: 84000,
          overhead: 28000,
          margin: 28000
        }
      }

      const profitability = calculateProjectProfitability(projectData)
      
      expect(profitability.marginPercentage).toBe(10) // 28000/280000 = 10%
      expect(profitability.isViable).toBe(true) // >5% margin
      expect(profitability.riskLevel).toBe('medium') // 10% est considéré comme medium risk
    })

    it('should identify high-risk projects', () => {
      const riskProjectData = {
        estimatedAmount: 100000,
        costBreakdown: {
          materials: 75000,
          labor: 20000,
          overhead: 10000,
          margin: -5000 // perte
        }
      }

      const profitability = calculateProjectProfitability(riskProjectData)
      
      expect(profitability.marginPercentage).toBe(-5)
      expect(profitability.isViable).toBe(false)
      expect(profitability.riskLevel).toBe('high')
    })
  })
})

// Fonctions utilitaires pour les tests métier
function validateAoReference(ref: string): boolean {
  const pattern = /^AO-[A-Z0-9]+-[A-Z0-9]+$/
  return pattern.test(ref) && ref.length >= 8
}

function isValidFrenchDepartment(dept: string): boolean {
  // Inclut les départements corses 2A et 2B
  if (dept === '2A' || dept === '2B') return true
  
  const deptNum = parseInt(dept)
  return dept.length === 2 && deptNum >= 1 && deptNum <= 95
}

function isValidMenuiserieType(type: string): boolean {
  const validTypes = [
    'fenetre', 'porte', 'portail', 'volet', 'cloison', 'verriere',
    'exterieure', 'interieure', 'exterieure_et_interieure'
  ]
  return validTypes.includes(type)
}

function isValidStatusTransition(from: string, to: string): boolean {
  const transitions: Record<string, string[]> = {
    'brouillon': ['etude', 'archive'],
    'etude': ['chiffrage', 'brouillon'],
    'chiffrage': ['validation_be', 'etude'],
    'validation_be': ['devis_envoye', 'chiffrage'],
    'devis_envoye': ['signe', 'relance'],
    'signe': ['transforme_en_projet'],
    'transforme_en_projet': []
  }
  
  return transitions[from]?.includes(to) || false
}

function calculateBusinessDeadline(startDate: Date, businessDays: number): Date {
  const result = new Date(startDate)
  let addedDays = 0
  
  while (addedDays < businessDays) {
    result.setDate(result.getDate() + 1)
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++
    }
  }
  
  return result
}

function validateLotsStructure(lots: any[]): {
  isValid: boolean
  totalAmount: number
  lotCount: number
  errors: string[]
} {
  const errors: string[] = []
  let totalAmount = 0
  
  lots.forEach((lot, index) => {
    if (!lot.code || lot.code.trim() === '') {
      errors.push(`Lot ${index + 1}: Code lot obligatoire`)
    }
    
    if (!lot.description || lot.description.trim() === '') {
      errors.push(`Lot ${index + 1}: Description obligatoire`)
    }
    
    if (typeof lot.estimatedAmount !== 'number' || lot.estimatedAmount <= 0) {
      errors.push(`Lot ${index + 1}: Montant doit être positif`)
    } else {
      totalAmount += lot.estimatedAmount
    }
    
    if (!isValidMenuiserieType(lot.menuiserieType)) {
      errors.push(`Lot ${index + 1}: Type menuiserie invalide`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    totalAmount,
    lotCount: lots.length,
    errors
  }
}

function calculateProjectProfitability(projectData: any): {
  marginPercentage: number
  isViable: boolean
  riskLevel: 'low' | 'medium' | 'high'
} {
  const { estimatedAmount, costBreakdown } = projectData
  const totalCosts = costBreakdown.materials + costBreakdown.labor + costBreakdown.overhead
  const margin = estimatedAmount - totalCosts
  const marginPercentage = (margin / estimatedAmount) * 100
  
  return {
    marginPercentage: Math.round(marginPercentage),
    isViable: marginPercentage > 5,
    riskLevel: marginPercentage < 5 ? 'high' : marginPercentage < 15 ? 'medium' : 'low'
  }
}