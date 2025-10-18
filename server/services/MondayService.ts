import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import { withRetry, isRetryableError } from '../utils/retry-helper';
import { getCacheService, TTL_CONFIG } from './CacheService';
import { getCorrelationId } from '../middleware/correlation';

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

class MondayService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.MONDAY_API_KEY || '';
    
    if (!this.apiKey) {
      logger.warn('MONDAY_API_KEY not configured', { 
        service: 'MondayService',
        metadata: { operation: 'constructor' }
      });
    }

    this.client = axios.create({
      baseURL: 'https://api.monday.com/v2',
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json',
        'API-Version': '2024-01'
      }
    });
  }

  private async executeQuery<T = any>(query: string, variables?: any): Promise<T> {
    // Récupérer correlation ID pour propagation
    const correlationId = getCorrelationId();
    
    return withRetry(
      async () => {
        try {
          logger.info('Exécution requête Monday.com GraphQL', {
            service: 'MondayService',
            metadata: {
              operation: 'executeQuery',
              queryLength: query.length,
              hasVariables: !!variables
            }
          });

          // Ajouter correlation ID dans headers si disponible
          const response = await this.client.post('', {
            query,
            variables
          }, {
            headers: {
              ...(correlationId && { 'X-Correlation-ID': correlationId })
            }
          });

          if (response.data.errors) {
            logger.error('Erreurs GraphQL Monday.com', {
              service: 'MondayService',
              metadata: {
                operation: 'executeQuery',
                errors: response.data.errors
              }
            });
            throw new Error(`Monday.com GraphQL errors: ${JSON.stringify(response.data.errors)}`);
          }

          return response.data.data as T;
        } catch (error: any) {
          logger.error('Erreur requête Monday.com', {
            service: 'MondayService',
            metadata: {
              operation: 'executeQuery',
              error: error.message,
              status: error.response?.status
            }
          });
          throw error;
        }
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        retryCondition: (error: any) => {
          // Retry on network errors, rate limits, and temporary server errors
          if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT') return true;
          if (error?.response?.status === 429) return true; // Rate limit
          if (error?.response?.status >= 500 && error?.response?.status < 600) return true;
          return false;
        }
      }
    );
  }

  async getBoards(limit: number = 50): Promise<MondayBoard[]> {
    const cacheService = getCacheService();
    const cacheKey = cacheService.buildKey('monday', 'boards', { limit });
    
    const cached = await cacheService.get<MondayBoard[]>(cacheKey);
    if (cached) {
      logger.debug('Boards récupérés depuis cache', {
        service: 'MondayService',
        metadata: {
          operation: 'getBoards',
          cacheHit: true,
          count: cached.length
        }
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

    const result = await this.executeQuery<{ boards: MondayBoard[] }>(query, { limit });
    const boards = result.boards || [];
    
    await cacheService.set(cacheKey, boards, TTL_CONFIG.MONDAY_BOARDS_LIST);
    
    logger.info('Boards Monday.com récupérés et mis en cache', {
      service: 'MondayService',
      metadata: {
        operation: 'getBoards',
        count: boards.length,
        cacheTTL: TTL_CONFIG.MONDAY_BOARDS_LIST
      }
    });

    return boards;
  }

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

    const result = await this.executeQuery<{ boards: { columns: MondayColumn[] }[] }>(query, { 
      boardIds: [parseInt(boardId)] 
    });
    const columns = result.boards?.[0]?.columns || [];

    logger.info('Colonnes board récupérées', {
      service: 'MondayService',
      metadata: {
        operation: 'getBoardColumns',
        boardId,
        columnCount: columns.length
      }
    });

    return columns;
  }

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

    const result = await this.executeQuery<{ 
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

    logger.info('Items board récupérés', {
      service: 'MondayService',
      metadata: {
        operation: 'getBoardItems',
        boardId,
        itemCount: items.length
      }
    });

    return items;
  }

  /**
   * NOUVELLE MÉTHODE - Récupère TOUS les items d'un board avec pagination par curseur
   * Gère la pagination Monday.com correctement avec items_page.cursor
   */
  async getBoardItemsPaginated(boardId: string, limit: number = 500): Promise<MondayItem[]> {
    const allItems: MondayItem[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pageCount = 0;

    logger.info('Démarrage pagination Monday.com', {
      service: 'MondayService',
      metadata: {
        operation: 'getBoardItemsPaginated',
        boardId,
        limit
      }
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
      } = await this.executeQuery<{ 
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
        logger.warn('Aucune page items_page trouvée', {
          service: 'MondayService',
          metadata: {
            operation: 'getBoardItemsPaginated',
            boardId,
            pageCount
          }
        });
        break;
      }

      const items = itemsPage.items || [];
      allItems.push(...items);
      pageCount++;

      // Vérifier si il y a une autre page
      cursor = itemsPage.cursor;
      hasMore = cursor !== null && cursor !== undefined && cursor !== '';

      logger.debug('Page récupérée', {
        service: 'MondayService',
        metadata: {
          operation: 'getBoardItemsPaginated',
          pageCount,
          itemsInPage: items.length,
          totalSoFar: allItems.length,
          hasMore,
          nextCursor: cursor ? cursor.substring(0, 20) + '...' : null
        }
      });

      // Sécurité: éviter boucle infinie
      if (pageCount > 100) {
        logger.error('Trop de pages, arrêt de la pagination', {
          service: 'MondayService',
          metadata: {
            operation: 'getBoardItemsPaginated',
            boardId,
            pageCount,
            totalItems: allItems.length
          }
        });
        break;
      }
    }

    logger.info('Pagination terminée', {
      service: 'MondayService',
      metadata: {
        operation: 'getBoardItemsPaginated',
        boardId,
        totalItems: allItems.length,
        totalPages: pageCount
      }
    });

    return allItems;
  }

  async getBoardData(boardId: string): Promise<MondayBoardData> {
    const cacheService = getCacheService();
    const cacheKey = cacheService.buildKey('monday', 'board', { boardId });
    
    const cached = await cacheService.get<MondayBoardData>(cacheKey);
    if (cached) {
      logger.debug('Board data récupérées depuis cache', {
        service: 'MondayService',
        metadata: {
          operation: 'getBoardData',
          boardId,
          cacheHit: true
        }
      });
      return cached;
    }

    // Récupérer les métadonnées du board
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

    const result = await this.executeQuery<{ boards: any[] }>(query, { 
      boardIds: [parseInt(boardId)]
    });
    const boardData = result.boards?.[0];

    if (!boardData) {
      throw new Error(`Board ${boardId} not found`);
    }

    // Récupérer TOUS les items avec pagination
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

    await cacheService.set(cacheKey, response, TTL_CONFIG.MONDAY_BOARD_DETAIL);

    logger.info('Données complètes board récupérées et mises en cache', {
      service: 'MondayService',
      metadata: {
        operation: 'getBoardData',
        boardId,
        columnCount: response.columns.length,
        itemCount: response.items.length,
        cacheTTL: TTL_CONFIG.MONDAY_BOARD_DETAIL
      }
    });

    return response;
  }

  async testConnection(): Promise<boolean> {
    try {
      const query = `
        query {
          me {
            id
            name
            email
          }
        }
      `;

      const result = await this.executeQuery<{ me: any }>(query);
      
      logger.info('Connexion Monday.com testée avec succès', {
        service: 'MondayService',
        metadata: {
          operation: 'testConnection',
          userId: result.me?.id,
          userName: result.me?.name
        }
      });

      return true;
    } catch (error) {
      logger.error('Échec test connexion Monday.com', {
        service: 'MondayService',
        metadata: {
          operation: 'testConnection',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return false;
    }
  }

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

    const result = await this.executeQuery<{ items: MondayItem[] }>(query, { 
      itemId: parseInt(itemId) 
    });

    const item = result.items?.[0];

    if (!item) {
      throw new Error(`Item ${itemId} not found on Monday.com`);
    }

    logger.info('Item Monday.com récupéré', {
      service: 'MondayService',
      metadata: {
        operation: 'getItem',
        itemId,
        itemName: item.name
      }
    });

    return item;
  }

  extractColumnValue(columnValue: MondayColumnValue): any {
    // Extract actual value based on column type
    if (columnValue.text) {
      return columnValue.text;
    }

    if (!columnValue.value) {
      return null;
    }

    try {
      const parsed = JSON.parse(columnValue.value);
      
      // Handle different Monday.com column types
      switch (columnValue.type) {
        case 'date':
          return parsed.date || null;
        case 'status':
          return parsed.label || parsed.index || null;
        case 'dropdown':
          return parsed.labels?.[0] || null;
        case 'people':
          return parsed.personsAndTeams?.map((p: any) => p.id) || [];
        case 'email':
          return parsed.email || parsed.text || null;
        case 'phone':
          return parsed.phone || parsed.text || null;
        case 'link':
          return parsed.url || parsed.text || null;
        case 'numbers':
          return parsed.number || null;
        case 'rating':
          return parsed.rating || null;
        default:
          return parsed;
      }
    } catch {
      return columnValue.value;
    }
  }
}

// Export class and singleton instance
export { MondayService };
export const mondayService = new MondayService();
