/**
 * MONDAY INTEGRATION SERVICE TESTS
 * 
 * Tests for consolidated MondayIntegrationService covering:
 * - GraphQL execution with mocking
 * - Board, column, and item retrieval
 * - Caching behavior
 * - Webhook handling and idempotence
 * - Board structure analysis
 * - Error handling and resilience
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MondayIntegrationService } from '../../services/consolidated/MondayIntegrationService';
import type { 
  MondayBoard,
  MondayColumn,
  MondayItem,
  BoardStructure 
} from '../../services/consolidated/MondayIntegrationService';

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../services/CacheService', () => ({
  getCacheService: vi.fn(() => ({
    buildKey: vi.fn((service, resource, params) => `${service}:${resource}:${JSON.stringify(params || {})}`),
    get: vi.fn(() => Promise.resolve(null)),
    set: vi.fn(() => Promise.resolve()),
    delete: vi.fn(() => Promise.resolve())
  })),
  TTL_CONFIG: {
    MONDAY_BOARDS_LIST: 600,
    MONDAY_BOARD_DETAIL: 300
  }
}));

vi.mock('../../middleware/correlation', () => ({
  getCorrelationId: vi.fn(() => 'test-correlation-id')
}));

vi.mock('../../services/resilience', () => ({
  executeMonday: vi.fn((fn) => fn())
}));

vi.mock('../../eventBus', () => ({
  eventBus: {
    publish: vi.fn()
  }
}));

// Mock axios
const mockAxios = {
  create: vi.fn(() => ({
    post: vi.fn()
  }))
};
vi.mock('axios', () => ({
  default: mockAxios
}));

describe('MondayIntegrationService', () => {
  let service: MondayIntegrationService;
  let mockPost: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup axios mock
    mockPost = vi.fn();
    mockAxios.create.mockReturnValue({
      post: mockPost
    });

    // Create service instance
    service = new MondayIntegrationService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // GRAPHQL EXECUTION TESTS
  // ========================================

  describe('executeGraphQL', () => {
    it('should execute GraphQL query successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            boards: [
              { id: '123', name: 'Test Board' }
            ]
          }
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const query = 'query { boards { id name } }';
      const result = await service.executeGraphQL(query);

      expect(mockPost).toHaveBeenCalledWith(
        '',
        { query, variables: undefined },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Correlation-ID': 'test-correlation-id'
          })
        })
      );
      expect(result).toEqual({ boards: [{ id: '123', name: 'Test Board' }] });
    });

    it('should handle GraphQL errors', async () => {
      const mockResponse = {
        data: {
          errors: [{ message: 'GraphQL error' }]
        }
      };

      mockPost.mockResolvedValue(mockResponse);

      const query = 'query { boards { id } }';
      
      await expect(service.executeGraphQL(query)).rejects.toThrow('Monday.com GraphQL errors');
    });

    it('should handle network errors', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      const query = 'query { boards { id } }';
      
      await expect(service.executeGraphQL(query)).rejects.toThrow('Network error');
    });
  });

  // ========================================
  // BOARDS RETRIEVAL TESTS
  // ========================================

  describe('getBoards', () => {
    it('should fetch boards successfully', async () => {
      const mockBoards: MondayBoard[] = [
        {
          id: '123',
          name: 'Test Board 1',
          description: 'Description 1',
          state: 'active',
          board_kind: 'public',
          workspace_id: 'ws1'
        },
        {
          id: '456',
          name: 'Test Board 2',
          state: 'active',
          board_kind: 'private'
        }
      ];

      mockPost.mockResolvedValue({
        data: {
          data: { boards: mockBoards }
        }
      });

      const result = await service.getBoards();

      expect(result).toEqual(mockBoards);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Test Board 1');
    });

    it('should respect limit parameter', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: { boards: [] }
        }
      });

      await service.getBoards(100);

      expect(mockPost).toHaveBeenCalledWith(
        '',
        expect.objectContaining({
          variables: { limit: 100 }
        }),
        expect.any(Object)
      );
    });
  });

  // ========================================
  // BOARD COLUMNS TESTS
  // ========================================

  describe('getBoardColumns', () => {
    it('should fetch board columns successfully', async () => {
      const mockColumns: MondayColumn[] = [
        {
          id: 'col1',
          title: 'Name',
          type: 'text',
          settings_str: '{}'
        },
        {
          id: 'col2',
          title: 'Status',
          type: 'status'
        }
      ];

      mockPost.mockResolvedValue({
        data: {
          data: {
            boards: [{ columns: mockColumns }]
          }
        }
      });

      const result = await service.getBoardColumns('123');

      expect(result).toEqual(mockColumns);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Name');
    });

    it('should handle board not found', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: { boards: [] }
        }
      });

      const result = await service.getBoardColumns('999');

      expect(result).toEqual([]);
    });
  });

  // ========================================
  // BOARD ITEMS TESTS
  // ========================================

  describe('getBoardItems', () => {
    it('should fetch board items successfully', async () => {
      const mockItems: MondayItem[] = [
        {
          id: 'item1',
          name: 'Test Item 1',
          column_values: [
            {
              id: 'col1',
              type: 'text',
              text: 'Value 1'
            }
          ],
          group: {
            id: 'group1',
            title: 'Group 1'
          }
        }
      ];

      mockPost.mockResolvedValue({
        data: {
          data: {
            boards: [{
              items_page: {
                items: mockItems
              }
            }]
          }
        }
      });

      const result = await service.getBoardItems('123');

      expect(result).toEqual(mockItems);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Item 1');
    });
  });

  // ========================================
  // WEBHOOK HANDLING TESTS
  // ========================================

  describe('handleWebhook', () => {
    it('should process webhook successfully', async () => {
      const { eventBus } = await import('../../eventBus');

      const payload = {
        event: {
          eventId: 'event-123',
          id: 'event-123',
          pulseId: 'item-456',
          boardId: 'board-789',
          type: 'update',
          userId: 'user-1',
          columnValues: { status: 'done' }
        }
      };

      await service.handleWebhook(payload);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'monday:webhook:received',
          entity: 'system',
          entityId: 'item-456',
          severity: 'info'
        })
      );
    });

    it('should handle duplicate webhook events (idempotence)', async () => {
      const { eventBus } = await import('../../eventBus');

      const payload = {
        event: {
          eventId: 'duplicate-event',
          pulseId: 'item-123',
          boardId: 'board-456',
          type: 'create'
        }
      };

      // First call should process
      await service.handleWebhook(payload);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);

      // Second call should be skipped (duplicate)
      await service.handleWebhook(payload);
      expect(eventBus.publish).toHaveBeenCalledTimes(1);
    });

    it('should reject webhook without eventId', async () => {
      const { eventBus } = await import('../../eventBus');

      const payload = {
        event: {
          pulseId: 'item-123',
          boardId: 'board-456'
        }
      };

      await service.handleWebhook(payload);

      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('should reject webhook without itemId or boardId', async () => {
      const { eventBus } = await import('../../eventBus');

      const payload = {
        event: {
          eventId: 'event-123'
        }
      };

      await service.handleWebhook(payload);

      expect(eventBus.publish).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // BOARD STRUCTURE ANALYSIS TESTS
  // ========================================

  describe('getBoardStructure', () => {
    it('should analyze board structure successfully', async () => {
      const mockColumns: MondayColumn[] = [
        {
          id: 'col1',
          title: 'Name',
          type: 'text',
          settings_str: '{"key": "value"}'
        },
        {
          id: 'col2',
          title: 'Status',
          type: 'status'
        }
      ];

      mockPost.mockResolvedValue({
        data: {
          data: {
            boards: [{ columns: mockColumns }]
          }
        }
      });

      const result = await service.getBoardStructure('123', 'Test Board');

      expect(result.boardId).toBe('123');
      expect(result.boardName).toBe('Test Board');
      expect(result.columns).toHaveLength(2);
      expect(result.columns[0].id).toBe('col1');
      expect(result.columns[0].description).toBe('Texte libre');
      expect(result.columns[1].description).toBe('Statut avec labels');
    });
  });

  describe('analyzeBoards', () => {
    it('should analyze multiple boards', async () => {
      const mockBoards: MondayBoard[] = [
        { id: '1', name: 'Board 1', state: 'active', board_kind: 'public' },
        { id: '2', name: 'Board 2', state: 'active', board_kind: 'private' }
      ];

      const mockColumns: MondayColumn[] = [
        { id: 'col1', title: 'Column 1', type: 'text' }
      ];

      mockPost
        .mockResolvedValueOnce({
          data: {
            data: { boards: mockBoards }
          }
        })
        .mockResolvedValue({
          data: {
            data: {
              boards: [{ columns: mockColumns }]
            }
          }
        });

      const result = await service.analyzeBoards();

      expect(result.totalBoards).toBe(2);
      expect(result.totalColumns).toBe(2);
      expect(result.boards).toHaveLength(2);
    });
  });

  // ========================================
  // FIELD MAPPING SUGGESTIONS TESTS
  // ========================================

  describe('suggestMappings', () => {
    it('should suggest exact match mappings', async () => {
      const boardStructure: BoardStructure = {
        boardId: '123',
        boardName: 'Test',
        columns: [
          {
            id: 'col1',
            title: 'client',
            type: 'text'
          }
        ],
        analyzedAt: new Date()
      };

      const saxiumFields = ['client', 'name', 'status'];

      const suggestions = await service.suggestMappings(boardStructure, saxiumFields);

      expect(suggestions.size).toBe(1);
      expect(suggestions.get('col1')).toEqual({
        saxiumField: 'client',
        confidence: 1.0,
        reason: 'Exact match'
      });
    });

    it('should suggest common mapping patterns', async () => {
      const boardStructure: BoardStructure = {
        boardId: '123',
        columns: [
          {
            id: 'col1',
            title: 'nom',
            type: 'text'
          }
        ],
        analyzedAt: new Date()
      };

      const saxiumFields = ['name', 'status'];

      const suggestions = await service.suggestMappings(boardStructure, saxiumFields);

      expect(suggestions.size).toBe(1);
      expect(suggestions.get('col1')).toEqual({
        saxiumField: 'name',
        confidence: 0.95,
        reason: 'Common mapping pattern'
      });
    });

    it('should filter low confidence mappings', async () => {
      const boardStructure: BoardStructure = {
        boardId: '123',
        columns: [
          {
            id: 'col1',
            title: 'xyz',
            type: 'text'
          }
        ],
        analyzedAt: new Date()
      };

      const saxiumFields = ['name', 'status'];

      const suggestions = await service.suggestMappings(boardStructure, saxiumFields);

      // Should not suggest mapping with low confidence
      expect(suggestions.size).toBe(0);
    });
  });

  // ========================================
  // COLUMN VALUE EXTRACTION TESTS
  // ========================================

  describe('extractColumnValue', () => {
    it('should extract status value with label', () => {
      const columnValue = {
        id: 'status1',
        type: 'status',
        text: 'Done',
        value: '{"label": "Done", "index": 2}',
        label: 'Done',
        index: 2
      };

      const result = service.extractColumnValue(columnValue);
      expect(result).toBe('Done');
    });

    it('should extract dropdown value', () => {
      const columnValue = {
        id: 'dropdown1',
        type: 'dropdown',
        text: 'Option 1',
        values: [{ text: 'Option 1', id: '1' }]
      };

      const result = service.extractColumnValue(columnValue);
      expect(result).toBe('Option 1');
    });

    it('should extract date value', () => {
      const columnValue = {
        id: 'date1',
        type: 'date',
        value: '{"date": "2025-01-15"}'
      };

      const result = service.extractColumnValue(columnValue);
      expect(result).toBe('2025-01-15');
    });

    it('should extract people value', () => {
      const columnValue = {
        id: 'people1',
        type: 'people',
        value: '{"personsAndTeams": [{"id": "1", "name": "John Doe", "email": "john@example.com"}]}'
      };

      const result = service.extractColumnValue(columnValue);
      expect(result).toEqual([
        { id: '1', name: 'John Doe', email: 'john@example.com' }
      ]);
    });

    it('should handle invalid JSON gracefully', () => {
      const columnValue = {
        id: 'invalid1',
        type: 'text',
        text: 'Fallback text',
        value: 'invalid json'
      };

      const result = service.extractColumnValue(columnValue);
      expect(result).toBe('Fallback text');
    });
  });

  // ========================================
  // CACHE INVALIDATION TESTS
  // ========================================

  describe('invalidateBoardCache', () => {
    it('should invalidate board structure cache', async () => {
      const { getCacheService } = await import('../../services/CacheService');
      const cacheService = getCacheService();

      await service.invalidateBoardCache('123');

      expect(cacheService.delete).toHaveBeenCalledWith(
        expect.stringContaining('monday:board_structure')
      );
    });
  });

  // ========================================
  // CONNECTION TEST
  // ========================================

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            me: {
              id: 'user1',
              name: 'Test User',
              email: 'test@example.com'
            }
          }
        }
      });

      const result = await service.testConnection();
      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      mockPost.mockRejectedValue(new Error('Connection failed'));

      const result = await service.testConnection();
      expect(result).toBe(false);
    });
  });
});
