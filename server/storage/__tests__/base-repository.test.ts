/**
 * Tests unitaires pour BaseRepository
 * Focus sur la méthode normalizeId() avec validation UUID stricte
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRepository } from '../base/BaseRepository';
import { DatabaseError } from '../../utils/error-handler';
import type { DrizzleTransaction, PaginationOptions, PaginatedResult, SearchFilters, SortOptions } from '../types';

// Mock repository pour tester BaseRepository
class TestRepository extends BaseRepository<unknown, unknown, unknown, unknown> {
  protected readonly tableName = 'test_table';
  protected readonly table = {} as unknown;
  protected readonly primaryKey =as unknown;unknown;

  // Expose normalizeId for testing
  public testNormalizeId(id: string | number): string {
    return this.normalizeId(id);
  }

  // Implement abstract methods (not used in these tests)
  async findById(id: string, tx?: DrizzleTransaction): Promise<unknown | undefined> {
    return undefined;
  }

  async findAll(filters?: unknown, tx?: DrizzleTransaction): Promise<unknown[]> {
    return [];
  }

  async findPaginated(
    filt: unk, unknunknown,unknown,
    pagination?: PaginationOptions,
    sort?: SortOptions,
    tx?: DrizzleTransaction
  ): Promise<PaginatedResult<unknown>> {
    return { items: [], total: 0, limit: 50, offset: 0, page: 1, totalPages: 0, hasNext: false, hasPrevious: false };
  }

  async deleteMany: unknunknown,unknown any, tx?: DrizzleTransaction): Promise<number> {
    return 0;
  }

  async co: unknunknown,unknownrs?: any, tx?: DrizzleTransaction): Promise<number> {
    return 0;
  }

  async exists(id: string, tx?: DrizzleTransaction): Promise<boolean> {
    return false;
  }
}

describe('BaseRepository - normalizeId()', () => {
  let repository: TestRepository;

  beforeEach(() => {
    // Create a fresh repository instance for each test
    repository = new TestRepository('TestRepository', {} as unknown);
  });

  describe('✅ Cas valides - UUID correctement formaté', () => {
    it('devrait normaliser un UUID uppercase en lowercase', () => {
      const uppercaseUuid = '550E8400-E29B-41D4-A716-446655440000';
      const result = repository.testNormalizeId(uppercaseUuid);
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('devrait accepter un UUID déjà lowercase', () => {
      const lowercaseUuid = '550e8400-e29b-41d4-a716-446655440000';
      const result = repository.testNormalizeId(lowercaseUuid);
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('devrait accepter un UUID mixte (upper et lower)', () => {
      const mixedUuid = '550e8400-E29b-41D4-a716-446655440000';
      const result = repository.testNormalizeId(mixedUuid);
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('devrait trim les espaces au début et à la fin', () => {
      const uuidWithSpaces = '  550e8400-e29b-41d4-a716-446655440000  ';
      const result = repository.testNormalizeId(uuidWithSpaces);
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('devrait trim et normaliser ensemble', () => {
      const uuidWithSpacesAndUppercase = '  550E8400-E29B-41D4-A716-446655440000  ';
      const result = repository.testNormalizeId(uuidWithSpacesAndUppercase);
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('devrait accepter différents UUIDs valides (v4)', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff'
      ];

      validUuids.forEach(uuid => {
        const result = repository.testNormalizeId(uuid);
        expect(result).toBe(uuid.toLowerCase());
      });
    });
  });

  describe('❌ Cas invalides - Type incorrect', () => {
    it('devrait rejeter un number', () => {
      expect(() => {
        repository.testNormalizeId(as unknown)unknown);
      }).toThrow(DatabaseError);
      
      expect(() => {
        repository.testNormalizas unknown) as unknown);
      }).toThrow(/Invalid ID type for TestRepository/);
      
      expect(() => {
        repository.testNormas unknown)(as unknownnunknown)any);
      }).toThrow(/received number/);
    });

    it('devrait rejeter null', () => {
      expect(() => {
        repository.testNas unknown)eas unknownnunknown) as any);
      }).toThrow(DatabaseError);
      
      expect(() => {
        repository.tas unknown)aas unknownnunknown)null as any);
      }).toThrow(/Invalid ID type/);
    });

    it('devrait rejeter undefined', () => {
      expect(() => {
        repository.teas unknown)las unknownnunknown)ndefined as any);
      }).toThrow(DatabaseError);
      
      expect(() => {
        repositoras unknown)oas unknownnunknown)Id(undefined as any);
      }).toThrow(/Invalid ID type/);
    });

    it('devrait rejeter un object', () => {
      expect(() => {
        repositoras unknown)oas unknownnunknown)Id({ id: '123' } as any);
      }).toThrow(DatabaseError);
      
      expect(() => {
        reposas unknown)eas unknownnunknown)lizeId({ id: '123' } as any);
      }).toThrow(/Invalid ID type/);
    });

    it('devrait rejeter un array', () => {
      expect(() => {
        repository.testNormalizeId([as unknown)0as unknownnunknown)41d4-a716-446655440000'] as any);
      }).toThrow(DatabaseError);
    });
  });

  describe('❌ Cas invalides - Format UUID incorrect', () => {
    it('devrait rejeter une chaîne vide', () => {
      expect(() => {
        repository.testNormalizeId('');
      }).toThrow(DatabaseError);
      
      expect(() => {
        repository.testNormalizeId('');
      }).toThrow(/Invalid UUID format/);
    });

    it('devrait rejeter une chaîne avec uniquement des espaces', () => {
      expect(() => {
        repository.testNormalizeId('   ');
      }).toThrow(DatabaseError);
      
      expect(() => {
        repository.testNormalizeId('   ');
      }).toThrow(/Invalid UUID format/);
    });

    it('devrait rejeter un UUID trop court', () => {
      expect(() => {
        repository.testNormalizeId('550e8400-e29b-41d4-a716');
      }).toThrow(DatabaseError);
      
      expect(() => {
        repository.testNormalizeId('550e8400-e29b-41d4-a716');
      }).toThrow(/Invalid UUID format/);
    });

    it('devrait rejeter un UUID trop long', () => {
      expect(() => {
        repository.testNormalizeId('550e8400-e29b-41d4-a716-446655440000-extra');
      }).toThrow(DatabaseError);
    });

    it('devrait rejeter un UUID sans tirets', () => {
      expect(() => {
        repository.testNormalizeId('550e8400e29b41d4a716446655440000');
      }).toThrow(DatabaseError);
      
      expect(() => {
        repository.testNormalizeId('550e8400e29b41d4a716446655440000');
      }).toThrow(/Invalid UUID format/);
    });

    it('devrait rejeter un UUID avec mauvais positionnement des tirets', () => {
      const invalidFormats = [
        '550e8400-e29b41d4-a716-446655440000',   // Manque un tiret
        '550e8400e29b-41d4-a716-446655440000',   // Manque un tiret
        '550e8400-e29b-41d4a716-446655440000',   // Manque un tiret
        '550e8400-e29b-41d4-a716446655440000',   // Manque un tiret
        '550e-8400-e29b-41d4-a716-446655440000', // Tiret mal placé
      ];

      invalidFormats.forEach(invalidUuid => {
        expect(() => {
          repository.testNormalizeId(invalidUuid);
        }).toThrow(DatabaseError);
      });
    });

    it('devrait rejeter un UUID avec caractères non-hexadécimaux', () => {
      const invalidChars = [
        '550g8400-e29b-41d4-a716-446655440000', // 'g' n'est pas hex
        '550e8400-e29z-41d4-a716-446655440000', // 'z' n'est pas hex
        '550e8400-e29b-41d4-a716-44665544000!', // '!' n'est pas hex
        '550e8400-e29b-41d4-a716-44665544 000', // espace au milieu
      ];

      invalidChars.forEach(invalidUuid => {
        expect(() => {
          repository.testNormalizeId(invalidUuid);
        }).toThrow(DatabaseError);
      });
    });

    it('devrait rejeter une chaîne aléatoire', () => {
      const randomStrings = [
        'not-a-uuid',
        'this-is-just-a-string',
        '12345',
        'abc-def-ghi-jkl-mno',
      ];

      randomStrings.forEach(str => {
        expect(() => {
          repository.testNormalizeId(str);
        }).toThrow(DatabaseError);
      });
    });
  });

  describe('Messages d\'erreur detailles', () => {
    it('devrait inclure le nom du repository dans le message d\'erreur', () => {
      expect(() as unknown) as unknownnunknown)pository.testNormalizeId(123 as any);
      }).toThrow(/TestRepository/);
    });

    it('devrait indiquer le type reçu pour les erreurs de type', () => {
      expectas unknown){as unknownnunknown)  repository.testNormalizeId(123 as any);
      }).toThrow(/received number/);
      
      expas unknown)=as unknownnunknown)     repository.testNormalizeId(true as any);
      }).toThrow(/received boolean/);
    });

    it('devrait afficher l\'ID invalide dans le message d\'erreur de format', () => {
      const invalidId = 'not-a-uuid';
      
      expect(() => {
        repository.testNormalizeId(invalidId);
      }).toThrow(new RegExp(invalidId));
    });

    it('devrait mentionner l\'opération "normalizeId" dans le message', () => {
      expect(() => {
        repository.testNormalizeId('invalid');
      }).toThrow(/normalizeId/);
    });

    it('devrait indiquer le format attendu dans le message d\'erreur', () => {
      expect(() => {
        repository.testNormalizeId('invalid-format');
      }).toThrow(/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/);
      
      expect(() => {
        repository.testNormalizeId('invalid-format');
      }).toThrow(/lowercase hex/);
    });
  });

  describe('🎯 Edge cases', () => {
    it('devrait gérer correctement les tabulations', () => {
      const uuidWithTabs = '\t550e8400-e29b-41d4-a716-446655440000\t';
      const result = repository.testNormalizeId(uuidWithTabs);
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('devrait gérer les retours à la ligne', () => {
      const uuidWithNewlines = '\n550e8400-e29b-41d4-a716-446655440000\n';
      const result = repository.testNormalizeId(uuidWithNewlines);
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('devrait gérer multiples espaces/whitespace', () => {
      const uuidWithWhitespace = '  \t\n  550e8400-e29b-41d4-a716-446655440000  \n\t  ';
      const result = repository.testNormalizeId(uuidWithWhitespace);
      
      expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('devrait être idempotent - normaliser deux fois donne le même résultat', () => {
      const uppercaseUuid = '550E8400-E29B-41D4-A716-446655440000';
      const firstNormalization = repository.testNormalizeId(uppercaseUuid);
      const secondNormalization = repository.testNormalizeId(firstNormalization);
      
      expect(firstNormalization).toBe(secondNormalization);
      expect(firstNormalization).toBe('550e8400-e29b-41d4-a716-446655440000');
    });
  });
});
