import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { ScoringService } from '../../server/services/scoringService';
import type { SpecialCriteria, TechnicalScoringConfig } from '@shared/schema';

describe('ScoringService - Tests unitaires', () => {
  const defaultConfig: TechnicalScoringConfig = {
    weights: {
      batimentPassif: 5,
      isolationRenforcee: 3,
      precadres: 2,
      voletsExterieurs: 1,
      coupeFeu: 4,
    },
    threshold: 5
  };

  describe('compute() - Calcul du scoring technique', () => {
    it('should return zero score for no criteria', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: false,
        isolationRenforcee: false,
        precadres: false,
        voletsExterieurs: false,
        coupeFeu: false
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(0);
      expect(result.triggeredCriteria).toEqual([]);
      expect(result.shouldAlert).toBe(false);
      expect(result.details).toEqual({
        batimentPassif: 0,
        isolationRenforcee: 0,
        precadres: 0,
        voletsExterieurs: 0,
        coupeFeu: 0
      });
    });

    it('should calculate correct score for single criterion', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: true,
        isolationRenforcee: false,
        precadres: false,
        voletsExterieurs: false,
        coupeFeu: false
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(5); // Poids du bâtiment passif
      expect(result.triggeredCriteria).toEqual(['batimentPassif']);
      expect(result.shouldAlert).toBe(true); // Score >= seuil (5)
      expect(result.details).toEqual({
        batimentPassif: 5,
        isolationRenforcee: 0,
        precadres: 0,
        voletsExterieurs: 0,
        coupeFeu: 0
      });
    });

    it('should calculate correct score for multiple criteria', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: true,
        isolationRenforcee: true,
        precadres: true,
        voletsExterieurs: false,
        coupeFeu: false
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(10); // 5 + 3 + 2
      expect(result.triggeredCriteria).toEqual(['batimentPassif', 'isolationRenforcee', 'precadres']);
      expect(result.shouldAlert).toBe(true);
      expect(result.details).toEqual({
        batimentPassif: 5,
        isolationRenforcee: 3,
        precadres: 2,
        voletsExterieurs: 0,
        coupeFeu: 0
      });
    });

    it('should calculate correct score for all criteria', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: true,
        isolationRenforcee: true,
        precadres: true,
        voletsExterieurs: true,
        coupeFeu: true
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(15); // 5 + 3 + 2 + 1 + 4
      expect(result.triggeredCriteria).toEqual([
        'batimentPassif', 
        'isolationRenforcee', 
        'precadres', 
        'voletsExterieurs', 
        'coupeFeu'
      ]);
      expect(result.shouldAlert).toBe(true);
      expect(result.details).toEqual({
        batimentPassif: 5,
        isolationRenforcee: 3,
        precadres: 2,
        voletsExterieurs: 1,
        coupeFeu: 4
      });
    });

    it('should respect custom threshold configuration', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: false,
        isolationRenforcee: true,
        precadres: true,
        voletsExterieurs: false,
        coupeFeu: false
      };

      const customConfig: TechnicalScoringConfig = {
        ...defaultConfig,
        threshold: 10 // Seuil plus élevé
      };

      const result = ScoringService.compute(criteria, customConfig);

      expect(result.totalScore).toBe(5); // 3 + 2
      expect(result.shouldAlert).toBe(false); // Score < seuil (10)
    });

    it('should respect custom weights configuration', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: true,
        isolationRenforcee: false,
        precadres: false,
        voletsExterieurs: false,
        coupeFeu: false
      };

      const customConfig: TechnicalScoringConfig = {
        weights: {
          batimentPassif: 8, // Poids augmenté
          isolationRenforcee: 1,
          precadres: 1,
          voletsExterieurs: 1,
          coupeFeu: 1
        },
        threshold: 5
      };

      const result = ScoringService.compute(criteria, customConfig);

      expect(result.totalScore).toBe(8);
      expect(result.shouldAlert).toBe(true);
      expect(result.details.batimentPassif).toBe(8);
    });

    it('should handle edge case with zero weights', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: true,
        isolationRenforcee: true,
        precadres: true,
        voletsExterieurs: true,
        coupeFeu: true
      };

      const zeroWeightsConfig: TechnicalScoringConfig = {
        weights: {
          batimentPassif: 0,
          isolationRenforcee: 0,
          precadres: 0,
          voletsExterieurs: 0,
          coupeFeu: 0
        },
        threshold: 1
      };

      const result = ScoringService.compute(criteria, zeroWeightsConfig);

      expect(result.totalScore).toBe(0);
      expect(result.shouldAlert).toBe(false);
    });

    it('should handle edge case with zero threshold', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: false,
        isolationRenforcee: false,
        precadres: true, // Seul critère activé
        voletsExterieurs: false,
        coupeFeu: false
      };

      const zeroThresholdConfig: TechnicalScoringConfig = {
        ...defaultConfig,
        threshold: 0
      };

      const result = ScoringService.compute(criteria, zeroThresholdConfig);

      expect(result.totalScore).toBe(2);
      expect(result.shouldAlert).toBe(true); // Score >= 0
    });

    it('should include evidences in triggered criteria', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: true,
        isolationRenforcee: false,
        precadres: false,
        voletsExterieurs: false,
        coupeFeu: false,
        evidences: {
          batimentPassif: ['bâtiment passif détecté', 'haute performance énergétique']
        }
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(5);
      expect(result.triggeredCriteria).toEqual(['batimentPassif']);
      // Les evidences sont passées mais ne changent pas le calcul
      expect(result.shouldAlert).toBe(true);
    });
  });

  describe('getDefaultConfig() - Configuration par défaut', () => {
    it('should return valid default configuration', () => {
      const config = ScoringService.getDefaultConfig();

      expect(config).toEqual({
        weights: {
          batimentPassif: 5,
          isolationRenforcee: 3,
          precadres: 2,
          voletsExterieurs: 1,
          coupeFeu: 4,
        },
        threshold: 5
      });
    });

    it('should return configuration that passes schema validation', () => {
      const config = ScoringService.getDefaultConfig();
      
      // Vérifier que tous les poids sont dans la bonne plage
      Object.values(config.weights).forEach(weight => {
        expect(weight).toBeGreaterThanOrEqual(0);
        expect(weight).toBeLessThanOrEqual(10);
      });

      // Vérifier que le seuil est dans la bonne plage
      expect(config.threshold).toBeGreaterThanOrEqual(0);
      expect(config.threshold).toBeLessThanOrEqual(50);
    });
  });

  describe('Scénarios métier réalistes', () => {
    it('should handle standard project (score below threshold)', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: false,
        isolationRenforcee: false,
        precadres: true,
        voletsExterieurs: true,
        coupeFeu: false
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(3); // 2 + 1
      expect(result.triggeredCriteria).toEqual(['precadres', 'voletsExterieurs']);
      expect(result.shouldAlert).toBe(false); // Score < seuil (5)
    });

    it('should handle high-performance building (score above threshold)', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: true,
        isolationRenforcee: true,
        precadres: true,
        voletsExterieurs: false,
        coupeFeu: false
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(10); // 5 + 3 + 2
      expect(result.triggeredCriteria).toEqual(['batimentPassif', 'isolationRenforcee', 'precadres']);
      expect(result.shouldAlert).toBe(true); // Score >= seuil (5)
    });

    it('should handle ERP with fire safety requirements', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: false,
        isolationRenforcee: true,
        precadres: false,
        voletsExterieurs: false,
        coupeFeu: true
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(7); // 3 + 4
      expect(result.triggeredCriteria).toEqual(['isolationRenforcee', 'coupeFeu']);
      expect(result.shouldAlert).toBe(true); // Score >= seuil (5)
    });

    it('should handle complex project with all criteria', () => {
      const criteria: SpecialCriteria = {
        batimentPassif: true,
        isolationRenforcee: true,
        precadres: true,
        voletsExterieurs: true,
        coupeFeu: true,
        evidences: {
          batimentPassif: ['construction passive', 'norme passivhaus'],
          isolationRenforcee: ['RT 2012', 'RE 2020'],
          precadres: ['précadres menuiserie'],
          voletsExterieurs: ['volets roulants', 'BSO'],
          coupeFeu: ['EI 60', 'coupe-feu']
        }
      };

      const result = ScoringService.compute(criteria, defaultConfig);

      expect(result.totalScore).toBe(15); // 5 + 3 + 2 + 1 + 4
      expect(result.triggeredCriteria).toEqual([
        'batimentPassif',
        'isolationRenforcee', 
        'precadres',
        'voletsExterieurs',
        'coupeFeu'
      ]);
      expect(result.shouldAlert).toBe(true);
    });
  });
});