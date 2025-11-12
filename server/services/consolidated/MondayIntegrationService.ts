/**
 * MONDAY INTEGRATION SERVICE - Consolidated Monday.com Integration
 * 
 * Consolidates 3 services into unified API:
 * - MondayService (GraphQL execution, caching, types)
 * - MondayWebhookService (Webhook handlers)
 * - MondaySchemaAnalyzer (Board structure analysis)
 * 
 * Dependencies:
 * - CacheService: Request caching with TTL
 * - resilience.ts: Retry + circuit breaker wrappers
 * - correlation.ts: Correlation ID propagation
 * - eventBus: Event publishing for webhooks
 * 
 * Target LOC: ~1,200 (from 1,242)
 */

import axios, { AxiosInstance } from 'axios';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import { getCacheService, TTL_CONFIG } from '../CacheService';
import { getCorrelationId } from '../../middleware/correlation';
import { executeMonday } from '../resilience.js';
import { eventBus } from '../../eventBus';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  state: string;
  board_kind: string;
  workspace_id?: string;
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
  group?: {
    id: string;
    title: string;
  };
  board?: {
    id: string;
  };
}

export interface MondayColumnValue {
  id: string;
  type: string;
  text?: string;
  value?: string;
  label?: string;
  index?: number;
  values?: Array<{ text: string; id: string }>;
}

export interface MondayBoardData {
  board: MondayBoard;
  columns: MondayColumn[];
  items: MondayItem[];
}

export interface ImportMapping {
  mondayBoardId: string;
  targetEntity: 'project' | 'ao' | 'supplier' | 'task';
  columnMappings: {
    mondayColumnId: string;
    saxiumField: string;
  }[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
  createdIds: string[];
}

export interface BoardColumnMetadata {
  id: string;
  title: string;
  type: string;
  settings?: unknown;
  description?: string;
}

export interface BoardStructure {
  boardId: string;
  boardName?: string;
  columns: BoardColumnMetadata[];
  itemsCount?: number;
  analyzedAt: Date;
}

export interface BoardAnalysisResult {
  boards: BoardStructure[];
  totalBoards: number;
  totalColumns: number;
  analyzedAt: Date;
}

// ========================================
// MONDAY INTEGRATION SERVICE
// ========================================

export class MondayIntegrationService {
  private client: AxiosInstance;
  private apiKey: string;
  private cacheService = getCacheService();
  
  // Webhook event deduplication cache
  private eventIdCache = new Set<string>();

  constructor() {
    this.apiKey = process.env.MONDAY_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('MONDAY_API_KEY not configured', {
      metadata: {
        module: 'MondayIntegrationService', { operation: 'constructor' 

            });
    }

    this.client = axios.create({
      baseURL: 'https://api.monday.com/v2',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        'API-Version': '2024-01'
      });

    logger.info('MondayIntegrationService initialized', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'constructor',
        hasApiKey: !!this.apiKey

          });
  }

  // ========================================
  // CORE GRAPHQL METHODS
  // ========================================

  /**
   * Execute GraphQL query against Monday.com API
   * Includes correlation ID propagation and resilience wrapper
   */
  async executeGraphQL<T = unknown>(query: string, variables?: unknown): Promise<T> {
    const correlationId = getCorrelationId();
    
    return executeMonday(
      async () => {
        return withErrorHandling(
    async () => {

          logger.info('Executing Monday.com GraphQL query', {
      metadata: {
        module: 'MondayIntegrationService', {
                operation: 'executeGraphQL',
              queryLength: query.length,
              hasVariables: !!variables

                });

          const response = await this.client.post('', {
            query,
            variables
          }, {
            headers: {
              ...(correlationId && { 'X-Correlation-ID': correlationId })
            });

          if (response.data.errors) {
            logger.error('Monday.com GraphQL errors', {
      metadata: {
        module: 'MondayIntegrationService', {
                operation: 'executeGraphQL',
                errors: response.data.errors

                  });
            throw new AppError(`Monday.com GraphQL errors: ${JSON.stringify(response.data.errors, 500)}`);
          }

          return response.data.data as T;
        
    },
    {
      operation: 'MondayService',
      service: 'MondayIntegrationService',
      metadata: {       }
     });
      },
      'GraphQL Query'
    );
  }

  /**
   * Get list of all boards with caching
   */
  async getBoards(limit: number = 50): Promise<MondayBoard[]> {
    const cacheKey = this.cacheService.buildKey('monday', 'boards', { limit });
    
    const cached = await this.cacheService.get<MondayBoard[]>(cacheKey);
    if (cached) {
      logger.debug('Boards retrieved from cache', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'getBoards',
          cacheHit: true,
          count: cached.length

            });
      return cached;
    }

    const query = `
      query GetBoards($limit: Int!) {
        boards(limit: $limit) {
          id
          name
          description
          state
          board_kind
          workspace_id
        }
      }
    `;

    const result = await this.executeGraphQL<{ boards: MondayBoard[] }>(query, { limit });
    const boards = result.boards || [];
    
    await this.cacheService.set(cacheKey, boards, TTL_CONFIG.MONDAY_BOARDS_LIST);
    
    logger.info('Boards fetched and cached', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'getBoards',
        count: boards.length,
        cacheTTL: TTL_CONFIG.MONDAY_BOARDS_LIST

          });

    return boards;
  }

  /**
   * Get columns for a specific board
   */
  async getBoardColumns(boardId: string): Promise<MondayColumn[]> {
    const query = `
      query GetBoardColumns($boardIds: [ID!]!) {
        boards(ids: $boardIds) {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;

    const result = await this.executeGraphQL<{ boards: { columns: MondayColumn[] }[] }>(query, { 
      boardIds: [parseInt(boardId)] 
    });
    const columns = result.boards?.[0]?.columns || [];

    logger.info('Board columns retrieved', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'getBoardColumns',
        boardId,
        columnCount: columns.length

          });

    return columns;
  }

  /**
   * Get items from a board (non-paginated, max 500)
   */
  async getBoardItems(boardId: string, limit: number = 500): Promise<MondayItem[]> {
    const query = `
      query GetBoardItems($boardIds: [ID!]!, $limit: Int!) {
        boards(ids: $boardIds) {
          items_page(limit: $limit) {
            items {
              id
              name
              column_values {
                id
                type
                text
                value
              }
              group {
                id
                title
              }
            }
          }
        }
      }
    `;

    const result = await this.executeGraphQL<{ 
      boards: { 
        items_page: { 
          items: MondayItem[] 
        } 
      }[] 
    }>(query, { 
      boardIds: [parseInt(boardId)], 
      limit 
    });

    const items = result.boards?.[0]?.items_page?.items || [];

    logger.info('Board items retrieved', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'getBoardItems',
        boardId,
        itemCount: items.length

          });

    return items;
  }

  /**
   * Get ALL items from a board with cursor pagination
   */
  async getBoardItemsPaginated(boardId: string, limit: number = 500): Promise<MondayItem[]> {
    const allItems: MondayItem[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;

    logger.info('Starting Monday.com pagination', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'getBoardItemsPaginated',
        boardId,
        limit

          });

    while (hasMore) {
      const query = `
        query GetBoardItemsPaginated($boardIds: [ID!]!, $limit: Int!, $cursor: String) {
          boards(ids: $boardIds) {
            items_page(limit: $limit, cursor: $cursor) {
              cursor
              items {
                id
                name
                column_values {
                  id
                  type
                  text
                  value
                }
                group {
                  id
                  title
                }
              }
            }
          }
        }
      `;

      const result: { 
        boards: { 
          items_page: { 
            items: MondayItem[];
            cursor: string | null;
          } 
        }[] 
      } = await this.executeGraphQL<{ 
        boards: { 
          items_page: { 
            items: MondayItem[];
            cursor: string | null;
          } 
        }[] 
      }>(query, { 
        boardIds: [parseInt(boardId)], 
        limit,
        cursor 
      });

      const itemsPage: { items: MondayItem[]; cursor: string | null } | undefined = result.boards?.[0]?.items_page;
      
      if (!itemsPage) {
        logger.warn('No items_page found', {
      metadata: {
        module: 'MondayIntegrationService', {
                operation: 'getBoardItemsPaginated',
            boardId,
            pageCount

              });
        break;
      }

      const items = itemsPage.items || [];
      allItems.push(...items);
      pageCount++;

      cursor = itemsPage.cursor;
      hasMore = cursor !== null && cursor !== undefined && cursor !== '';

      logger.debug('Page retrieved', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'getBoardItemsPaginated',
          pageCount,
          itemsInPage: items.length,
          totalSoFar: allItems.length,
          hasMore,
          nextCursor: cursor ? cursor.substring(0, 20) + '...' : null

            });

      if (pageCount > 100) {
        logger.error('Too many pages, stopping pagination', {
      metadata: {
        module: 'MondayIntegrationService', {
                operation: 'getBoardItemsPaginated',
            boardId,
            pageCount,
            totalItems: allItems.length

              });
        break;
      }
    }

    logger.info('Pagination complete', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'getBoardItemsPaginated',
        boardId,
        totalItems: allItems.length,
        totalPages: pageCount

          });

    return allItems;
  }

  /**
   * Get complete board data (metadata + columns + items) with caching
   */
  async getBoardData(boardId: string): Promise<MondayBoardData> {
    const cacheKey = this.cacheService.buildKey('monday', 'board', { boardId });
    
    const cached = await this.cacheService.get<MondayBoardData>(cacheKey);
    if (cached) {
      logger.debug('Board data retrieved from cache', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'getBoardData',
          boardId,
          cacheHit: true

            });
      return cached;
    }

    const query = `
      query GetBoardMetadata($boardIds: [ID!]!) {
        boards(ids: $boardIds) {
          id
          name
          description
          state
          board_kind
          workspace_id
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;

    const result = await this.executeGraphQL<{ boards: unknown[] }>(query, { 
      boardIds: [parseInt(boardId)]
    });
    const boardData = result.boards?.[0];

    if (!boardData) {
      throw new AppError(`Board ${boardId} not found`, 500);
    }

    const items = await this.getBoardItemsPaginated(boardId);

    const response: MondayBoardData = {
      board: {
        id: boardData.id,
        name: boardData.name,
        description: boardData.description,
        state: boardData.state,
        board_kind: boardData.board_kind,
        workspace_id: boardData.workspace_id
      },
      columns: boardData.columns || [],
      items: items
    };

    await this.cacheService.set(cacheKey, response, TTL_CONFIG.MONDAY_BOARD_DETAIL);

    logger.info('Complete board data retrieved and cached', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'getBoardData',
        boardId,
        columnCount: response.columns.length,
        itemCount: response.items.length,
        cacheTTL: TTL_CONFIG.MONDAY_BOARD_DETAIL

          });

    return response;
  }

  /**
   * Test Monday.com API connection
   */
  async testConnection(): Promise<boolean> {
    return withErrorHandling(
    async () => {

      const query = `
        query {
          me {
            id
            name
            email
          }
        }
      `;

      const result = await this.executeGraphQL<{ me: unknown}>(query);
      
      logger.info('Monday.com connection test successful', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'testConnection',
          userId: result.me?.id,
          userName: result.me?.name

            });

      return true;
    
    },
    {
      operation: 'MondayService',
      service: 'MondayIntegrationService',
      metadata: {       }
     });
  }

  /**
   * Get a single item by ID
   */
  async getItem(itemId: string): Promise<MondayItem> {
    const query = `
      query GetItem($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          column_values {
            id
            type
            text
            value
            ... on StatusValue {
              label
              index
            }
          }
          group {
            id
            title
          }
          board {
            id
          }
        }
      }
    `;

    const result = await this.executeGraphQL<{ items: MondayItem[] }>(query, { 
      itemId: parseInt(itemId) 
    });

    const item = result.items?.[0];

    if (!item) {
      throw new AppError(`Item ${itemId} not found on Monday.com`, 500);
    }

    logger.info('Monday.com item retrieved', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'getItem',
        itemId,
        itemName: item.name

          });

    return item;
  }

  /**
   * Extract typed value from Monday column value
   */
  extractColumnValue(columnValue: MondayColumnValue): unknown {
    return withErrorHandling(
    async () => {

      switch (columnValue.type) {
        case 'status':
          if (columnValue.label) return columnValue.label;
          if (columnValue.value) {
            const parsed = JSON.parse(columnValue.value);
            return parsed.label || parsed.index || null;
          }
          return null;
        
        case 'dropdown':
          if (columnValue.values && columnValue.values.length > 0) {
            return columnValue.values[0].text;
          }
          if (columnValue.value) {
            const parsed = JSON.parse(columnValue.value);
            return parsed.labels?.[0] || null;
          }
          return null;
      }
      
      if (columnValue.value) {
        const parsed = JSON.parse(columnValue.value);
        
        switch (columnValue.type) {
          case 'date':
            return parsed.date || null;
          
          case 'people':
            return parsed.personsAndTeams?.ma: unknown) => ({
                id: p.id,
                name: p.name,
                email: p.email
            })) || [];
          
          case 'email':
            return {
                email: parsed.email || parsed.text,
              text: parsed.text
            };
          
          case 'phone':
            return {
                phone: parsed.phone || parsed.text,
              text: parsed.text
            };
          
          case 'link':
            return {
              url: parsed.url || parsed.text,
              text: parsed.text
            };
          
          case 'location':
            return {
                address: parsed.address,
              city: parsed.city,
              country: parsed.country,
              countryShort: parsed.countryShort,
              lat: parsed.lat,
              lng: parsed.lng,
              placeId: parsed.placeId
            };
          
          case 'board-relation':
            return {
              linkedItems: parsed.linkedPulseIds?.m: unknown) => ({
                id: item.linkedPulseId || item,
                boardId: item.boardId
              })) || []
            };
          
          case 'subtasks':
          case 'subitems':
            return {
              subitemIds: parsed.linkedPulseId: unknown)em: unknown) => 
                item.linkedPulseId || item
              ) || [],
                count: parsed.linkedPulseIds?.length || 0
            };
          
          case 'long-text':
          case 'text':
            return parsed.text || null;
          
          case 'timeline':
            return {
              from: parsed.from,
              to: parsed.to,
              visualization_type: parsed.visualization_type
            };
          
          case 'numbers':
            return parsed.number || null;
          
          case 'rating':
            return parsed.rating || null;
          
          default:
            return parsed;
        }
      }
      
      return columnValue.text || null;
      
    } catch {
      return columnValue.text || columnValue.value || null;
    }
  }

  // ========================================
  // WEBHOOK HANDLING
  // ========================================

  /**
   * Process Monday.com webhook event
   * Includes idempotence check and event deduplication
   */
  async handl: unknown)ay: unknunknown)unknown): Promise<void> {
    const { event } = payload;
    const eventId = event?.eventId || event?.id;
    
    if (!eventId) {
      logger.warn('Webhook event without ID received', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'handleWebhook',
          payload

            });
      return;
    }
    
    // Idempotence check
    if (this.eventIdCache.has(eventId)) {
      logger.info('Webhook event already processed (duplicate)', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'handleWebhook',
          eventId
        });
      return;
    }
    
    this.eventIdCache.add(eventId);
    
    // Cleanup old events (keep last 1000)
    if (this.eventIdCache.size > 1000) {
      const oldest = Array.from(this.eventIdCache)[0];
      this.eventIdCache.delete(oldest);
      logger.debug('Webhook cache cleaned', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'handleWebhook',
          cacheSize: this.eventIdCache.size,
          deletedEventId: oldest

            });
    }
    
    const { pulseId, itemId, boardId, type, columnValues, userId } = event;
    const itemIdentifier = pulseId || itemId;
    
    if (!itemIdentifier || !boardId) {
      logger.error('Incomplete webhook event - missing itemId or boardId', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'handleWebhook',
          eventId,
          event

            });
      return;
    }
    
    logger.info('Processing Monday.com webhook event', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'handleWebhook',
        eventId,
        boardId,
        itemId: itemIdentifier,
        type,
        userId

          });
    
    try {
      // Publish to EventBus for downstream processing
      eventBus.publish({
        id: crypto.randomUUID(),
        type: 'monday:webhook:received' as unknown,
        entity: 'system',
        entityId: itemIdentifier,
        message: `Monday webhook processed for item ${itemIdentifier}`,
        severity: 'info',
        affectedQueryKeys: [
          ['/api/monday/items'],
          ['/api/monday/items', itemIdentifier]
        ],
        userId: userId || 'monday-webhook',
        timestamp: new Date().toISOString(),
        metadata: {
          eventId,
          boardId,
          itemId: itemIdentifier,
          type,
          columnValues
        });
      
      logger.info('Webhook event processed successfully', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'handleWebhook',
          eventId,
          boardId,
          itemId: itemIdentifier

            });
    
    },
    {
      operation: 'MondayService',
service: 'MondayIntegrationService',
      metadata: {}
    } );
      throw error;
    }
  }

  // ========================================
  // BOARD STRUCTURE ANALYSIS
  // ========================================

  /**
   * Analyze structure of one or more boards
   */
  async analyzeBoards(boardIds?: string[]): Promise<BoardAnalysisResult> {
    logger.info('Analyzing Monday.com board structures', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'analyzeBoards',
        boardIds: boardIds || 'all',
        boardCount: boardIds?.length || 'all'

          });

    return withErrorHandling(
    async () => {

      const boards = await this.getBoardsToAnalyze(boardIds);
      
      const structures = await Promise.all(
        boards.map(board => this.getBoardStructure(board.id, board.name))
      );

      const result: BoardAnalysisResult = {
        boards: structures,
        totalBoards: structures.length,
        totalColumns: structures.reduce((sum, s) => sum + s.columns.length, 0),
        analyzedAt: new Date()
      };

      logger.info('Board analysis complete', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'analyzeBoards',
          totalBoards: result.totalBoards,
          totalColumns: result.totalColumns

            });

      return result;

    
    },
    {
      operation: 'MondayService',
      service: 'MondayIntegrationService',
      metadata: {}
    } );
      throw error;
    }
  }

  /**
   * Get structure of a specific board with caching
   */
  async getBoardStructure(boardId: string, boardName?: string): Promise<BoardStructure> {
    const cacheKey = this.cacheService.buildKey('monday', 'board_structure', { boardId });
    const cached = await this.cacheService.get<BoardStructure>(cacheKey);
    
    if (cached) {
      logger.debug('Board structure retrieved from cache', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'getBoardStructure',
          boardId,
          cacheHit: true

            });
      return cached;
    }

    logger.info('Analyzing board structure', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'getBoardStructure',
        boardId,
        boardName

          });

    return withErrorHandling(
    async () => {

      const columns = await this.getBoardColumns(boardId);

      const enrichedColumns: BoardColumnMetadata[] = columns.map(col  => ({
        id: col.id,
        title: col.title,
        type: col.type,
        settings: col.settings_str ? this.parseSettings(col.settings_str) : undefined,
        description: this.getColumnDescription(col)
            }

                      }


                                }


                              }));

      const structure: BoardStructure = {
        boardId,
        boardName,
        columns: enrichedColumns,
        analyzedAt: new Date()
      };

      await this.cacheService.set(cacheKey, structure, TTL_CONFIG.MONDAY_BOARDS_LIST);

      logger.info('Board structure analyzed and cached', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'getBoardStructure',
          boardId,
          columnCount: enrichedColumns.length,
          cacheTTL: TTL_CONFIG.MONDAY_BOARDS_LIST

            });

      return structure;

    
    },
    {
      operation: 'MondayService',
      service: 'MondayIntegrationService',
      metadata: {}
    } );
      throw error;
    }
  }

  /**
   * Suggest field mappings between Monday board and Saxium entity
   */
  async suggestMappings(
    boardStructure: BoardStructure,
    saxiumFields: string[]
  ): Promise<Map<string, { saxiumField: string; confidence: number; reason: string }>> {
    logger.info('Generating mapping suggestions', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'suggestMappings',
        boardId: boardStructure.boardId,
        mondayColumns: boardStructure.columns.length,
        saxiumFields: saxiumFields.length

          });

    const suggestions = new Map<string, { saxiumField: string; confidence: number; reason: string }>();

    for (const column of boardStructure.columns) {
      const match = this.findBestMatch(column, saxiumFields);
      
      if (match.confidence > 0.5) {
        suggestions.set(column.id, match);
        
        logger.debug('Mapping suggested', {
      metadata: {
        module: 'MondayIntegrationService', {
                operation: 'suggestMappings',
            mondayColumn: column.title,
            saxiumField: match.saxiumField,
            confidence: match.confidence

              });
      }
    }

    logger.info('Mapping suggestions generated', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'suggestMappings',
        totalSuggestions: suggestions.size,
        highConfidence: Array.from(suggestions.values()).filter(s => s.confidence > 0.8).length

          });

    return suggestions;
  }

  /**
   * Invalidate board structure cache
   */
  async invalidateBoardCache(boardId: string): Promise<void> {
    const cacheKey = this.cacheService.buildKey('monday', 'board_structure', { boardId });
    await this.cacheService.delete(cacheKey);
    
    logger.info('Board cache invalidated', {
      metadata: {
        module: 'MondayIntegrationService', {
        operation: 'invalidateBoardCache',
        boardId

          });
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  private async getBoardsToAnalyze(boardIds?: string[]) {
    if (boardIds && boardIds.length > 0) {
      return boardIds.map(id  => ({ id, name: undefined       }
                 }

                           }


                         }));
    }

    const allBoards = await this.getBoards();
    return allBoards.map(board  => ({ id: board.id, name: board.name       }
                 }

                           }


                         }));
  }

  private parseSettings(settinunknowntr: strinunknown any {
    try {
      return JSON.parse(settingsStr);
    } catch {
      logger.warn('Failed to parse settings JSON', {
      metadata: {
        module: 'MondayIntegrationService', {
          operation: 'parseSettings'

            });
      return {};
    }
  }

  private getColumnDescription(column: MondayColumn): string | undefined {
    const typeDescriptions: Record<string, string> = {
      'text': 'Texte libre',
      'status': 'Statut avec labels',
      'date': 'Date',
      'numbers': 'Nombre',
      'people': 'Personne assignée',
      'dropdown': 'Liste déroulante',
      'email': 'Email',
      'phone': 'Téléphone',
      'link': 'Lien URL',
      'long-text': 'Texte long',
      'checkbox': 'Case à cocher',
      'timeline': 'Timeline/Période',
      'tags': 'Tags multiples'
    };

    return typeDescriptions[column.type];
  }

  private findBestMatch(
    column: BoardColumnMetadata,
    saxiumFields: string[]
  ): { saxiumField: string; confidence: number; reason: string } {
    let bestMatch = { saxiumField: '', confidence: 0, reason: '' };

    const normalizedTitle = column.title.toLowerCase().trim();

    for (const saxiumField of saxiumFields) {
      const normalizedField = saxiumField.toLowerCase().trim();
      
      if (normalizedTitle === normalizedField) {}
return{
          saxiumField,
          confidence: 1.0,
          reason: 'Exact match'
        };
      }

      const similarity = this.calculateStringSimilarity(normalizedTitle, normalizedField);
      
      if (similarity > bestMatch.confidence) {
        bestMatch = {
          saxiumField,
          confidence: similarity,
          reason: similarity > 0.8 ? 'High similarity' : 'Partial match'
        };
      }

      const commonMappings: Record<string, string> = {
        'client': 'client',
        'nom': 'name',
        'date': 'dueDate',
        'status': 'status',
        'catégorie': 'category',
        'montant': 'amount',
        'description': 'description',
        'localisation': 'location',
        'ville': 'city',
        'département': 'departement'
      };

      if (commonMappings[normalizedTitle] === normalizedField) {
        return {
          saxiumField,
          confidence: 0.95,
          reason: 'Common mapping pattern'
        };
      }
    }

    return bestMatch;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    const commonChars = new Set([...shorter]).size;
    const totalChars = new Set([...longer]).size;

    return commonChars / totalChars;
  }
}

// ========================================
// SINGLETON EXPORT
// ========================================

export const mondayIntegrationService = new MondayIntegrationService();
