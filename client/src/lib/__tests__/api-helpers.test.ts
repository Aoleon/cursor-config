import { describe, it, expect } from 'vitest';
import { normalizeApiResponse } from '../api-helpers';

describe('normalizeApiResponse', () => {
  describe('Direct array responses', () => {
    it('should return direct array as-is', () => {
      const input = [{ id: 1 }, { id: 2 }];
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array as-is', () => {
      const input: any[] = [];
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle array with different data types', () => {
      const input = [
        { id: 1, name: 'test' },
        { id: 2, name: 'another', active: true }
      ];
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual(input);
    });
  });

  describe('Wrapped array responses', () => {
    it('should extract data from wrapped array with success flag', () => {
      const input = { success: true, data: [{ id: 1 }] };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1 }]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should extract data from simple wrapped array', () => {
      const input = { data: [{ id: 1 }, { id: 2 }] };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should extract data from wrapped array with additional properties', () => {
      const input = {
        success: true,
        data: [{ id: 1, name: 'test' }],
        meta: { total: 1 }
      };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1, name: 'test' }]);
    });
  });

  describe('Wrapped scalar object responses', () => {
    it('should wrap wrapped scalar object in array', () => {
      const input = { success: true, data: { id: 1 } };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1 }]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('should wrap wrapped scalar with complex object', () => {
      const input = { data: { id: 1, name: 'test' } };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1, name: 'test' }]);
      expect(result.length).toBe(1);
    });

    it('should wrap wrapped scalar with nested properties', () => {
      const input = {
        success: true,
        data: {
          id: 1,
          user: { name: 'John', email: 'john@example.com' }
        }
      };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{
        id: 1,
        user: { name: 'John', email: 'john@example.com' }
      }]);
    });
  });

  describe('Direct object responses', () => {
    it('should wrap direct object in array', () => {
      const input = { id: 1, name: 'test' };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1, name: 'test' }]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('should wrap object without data property', () => {
      const input = { id: 1, title: 'Test', status: 'active' };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1, title: 'Test', status: 'active' }]);
    });

    it('should wrap complex object with nested data', () => {
      const input = {
        id: 1,
        metadata: { created: '2024-01-01' },
        items: [1, 2, 3]
      };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{
        id: 1,
        metadata: { created: '2024-01-01' },
        items: [1, 2, 3]
      }]);
    });
  });

  describe('Null and undefined responses', () => {
    it('should return empty array for null', () => {
      const input = null;
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return empty array for undefined', () => {
      const input = undefined;
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('Empty responses', () => {
    it('should handle wrapped empty array', () => {
      const input = { data: [] };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle direct empty array', () => {
      const input: any[] = [];
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([]);
    });

    it('should handle wrapped empty array with success flag', () => {
      const input = { success: true, data: [] };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle data property with null value', () => {
      const input = { data: null };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([null]);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('should handle data property with undefined value', () => {
      const input = { data: undefined };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ data: undefined }]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle failed response with empty array', () => {
      const input = { success: false, data: [] };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([]);
    });

    it('should handle failed response with data object', () => {
      const input = { success: false, data: { id: 1 }, error: 'Error message' };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{ id: 1 }]);
    });

    it('should handle response with data: 0 (falsy but defined)', () => {
      const input = { data: 0 };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([0]);
    });

    it('should handle response with data: "" (empty string)', () => {
      const input = { data: '' };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual(['']);
    });

    it('should handle response with data: false (boolean)', () => {
      const input = { data: false };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([false]);
    });

    it('should handle primitive values directly', () => {
      const stringInput = 'test';
      const numberInput = 42;
      const booleanInput = true;
      
      expect(normalizeApiResponse(stringInput)).toEqual(['test']);
      expect(normalizeApiResponse(numberInput)).toEqual([42]);
      expect(normalizeApiResponse(booleanInput)).toEqual([true]);
    });
  });

  describe('TypeScript type safety', () => {
    interface TestItem {
      id: number;
      name: string;
    }

    it('should maintain type safety with typed responses', () => {
      const input: TestItem[] = [{ id: 1, name: 'test' }];
      const result = normalizeApiResponse<TestItem>(input);
      
      expect(result).toEqual([{ id: 1, name: 'test' }]);
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe('test');
    });

    it('should handle typed wrapped responses', () => {
      const input = { data: { id: 1, name: 'test' } };
      const result = normalizeApiResponse<TestItem>(input);
      
      expect(result).toEqual([{ id: 1, name: 'test' }]);
      expect(result[0].id).toBe(1);
      expect(result[0].name).toBe('test');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle API response with pagination metadata', () => {
      const input = {
        success: true,
        data: [
          { id: 1, title: 'Item 1' },
          { id: 2, title: 'Item 2' }
        ],
        meta: {
          total: 100,
          page: 1,
          limit: 10
        }
      };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([
        { id: 1, title: 'Item 1' },
        { id: 2, title: 'Item 2' }
      ]);
    });

    it('should handle single item detail response', () => {
      const input = {
        success: true,
        data: {
          id: 1,
          title: 'Project Details',
          description: 'Project description',
          status: 'active'
        }
      };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([{
        id: 1,
        title: 'Project Details',
        description: 'Project description',
        status: 'active'
      }]);
      expect(result.length).toBe(1);
    });

    it('should handle error response with empty data', () => {
      const input = {
        success: false,
        error: 'Not found',
        data: []
      };
      const result = normalizeApiResponse(input);
      
      expect(result).toEqual([]);
    });
  });
});
