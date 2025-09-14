import { describe, test, expect } from 'vitest';
import { z } from 'zod';
import {
  insertAoSchema,
  insertOfferSchema,
  insertProjectSchema,
  insertUserSchema,
  insertProjectTaskSchema,
  insertValidationMilestoneSchema,
  insertChiffrageElementSchema
} from '../shared/schema';

/**
 * Tests de validation des schémas pour verrouiller les contrats d'API
 * Ces tests assurent que les structures de données restent cohérentes
 */

describe('Schema Validation Tests', () => {
  describe('AO Schema Validation', () => {
    test('should validate a minimal valid AO', () => {
      const validAO = {
        reference: 'AO-2025-001',
        client: 'Client Test',
        objet: 'Projet de menuiserie',
        source: 'mail' as const,
        marcheType: 'prive' as const,
        localisation: {
          adresse: '123 Rue Test',
          codePostal: '75001',
          ville: 'Paris',
          departement: '75' as const
        }
      };

      expect(() => insertAoSchema.parse(validAO)).not.toThrow();
    });

    test('should reject AO with invalid source', () => {
      const invalidAO = {
        reference: 'AO-2025-001',
        client: 'Client Test',
        objet: 'Projet de menuiserie',
        source: 'invalid_source',
        marcheType: 'prive' as const,
        localisation: {
          adresse: '123 Rue Test',
          codePostal: '75001',
          ville: 'Paris',
          departement: '75' as const
        }
      };

      expect(() => insertAoSchema.parse(invalidAO)).toThrow();
    });
  });

  describe('Project Schema Validation', () => {
    test('should validate a minimal valid project', () => {
      const validProject = {
        name: 'Projet Test',
        status: 'etude' as const,
        description: 'Description du projet'
      };

      expect(() => insertProjectSchema.parse(validProject)).not.toThrow();
    });

    test('should reject project with invalid status', () => {
      const invalidProject = {
        name: 'Projet Test',
        status: 'invalid_status',
        description: 'Description du projet'
      };

      expect(() => insertProjectSchema.parse(invalidProject)).toThrow();
    });
  });

  describe('User Schema Validation', () => {
    test('should validate a minimal valid user', () => {
      const validUser = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user' as const
      };

      expect(() => insertUserSchema.parse(validUser)).not.toThrow();
    });

    test('should reject user with invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user' as const
      };

      expect(() => insertUserSchema.parse(invalidUser)).toThrow();
    });
  });

  describe('Task Schema Validation', () => {
    test('should validate a minimal valid task', () => {
      const validTask = {
        name: 'Tâche Test',
        projectId: 'project-123',
        status: 'a_faire' as const,
        isJalon: false
      };

      expect(() => insertProjectTaskSchema.parse(validTask)).not.toThrow();
    });

    test('should reject task with invalid status', () => {
      const invalidTask = {
        name: 'Tâche Test',
        projectId: 'project-123',
        status: 'invalid_status',
        isJalon: false
      };

      expect(() => insertProjectTaskSchema.parse(invalidTask)).toThrow();
    });
  });

  describe('Validation Milestone Schema Validation', () => {
    test('should validate a minimal valid milestone', () => {
      const validMilestone = {
        offerId: 'offer-123',
        milestoneType: 'fin_etudes' as const,
        isCompleted: false
      };

      expect(() => insertValidationMilestoneSchema.parse(validMilestone)).not.toThrow();
    });

    test('should reject milestone with invalid type', () => {
      const invalidMilestone = {
        offerId: 'offer-123',
        milestoneType: 'invalid_type',
        isCompleted: false
      };

      expect(() => insertValidationMilestoneSchema.parse(invalidMilestone)).toThrow();
    });
  });

  describe('Chiffrage Element Schema Validation', () => {
    test('should validate a minimal valid chiffrage element', () => {
      const validElement = {
        offerId: 'offer-123',
        designation: 'Élément Test',
        quantite: 1,
        prixUnitaire: 100.50,
        lotNumber: 1
      };

      expect(() => insertChiffrageElementSchema.parse(validElement)).not.toThrow();
    });

    test('should reject chiffrage element with negative price', () => {
      const invalidElement = {
        offerId: 'offer-123',
        designation: 'Élément Test',
        quantite: 1,
        prixUnitaire: -100.50,
        lotNumber: 1
      };

      expect(() => insertChiffrageElementSchema.parse(invalidElement)).toThrow();
    });
  });

  describe('Offer Schema Validation', () => {
    test('should validate a minimal valid offer', () => {
      const validOffer = {
        aoId: 'ao-123',
        status: 'brouillon' as const,
        reference: 'OFFER-2025-001'
      };

      expect(() => insertOfferSchema.parse(validOffer)).not.toThrow();
    });

    test('should reject offer with invalid status', () => {
      const invalidOffer = {
        aoId: 'ao-123',
        status: 'invalid_status',
        reference: 'OFFER-2025-001'
      };

      expect(() => insertOfferSchema.parse(invalidOffer)).toThrow();
    });
  });

  describe('Schema Type Safety', () => {
    test('should enforce required fields', () => {
      expect(() => insertAoSchema.parse({})).toThrow();
      expect(() => insertProjectSchema.parse({})).toThrow();
      expect(() => insertUserSchema.parse({})).toThrow();
      expect(() => insertProjectTaskSchema.parse({})).toThrow();
    });

    test('should allow partial schemas for updates', () => {
      const partialProject = { name: 'Updated Name' };
      expect(() => insertProjectSchema.partial().parse(partialProject)).not.toThrow();
    });
  });
});