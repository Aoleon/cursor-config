import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

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
    try {
      logger.info('Exécution requête Monday.com GraphQL', {
        service: 'MondayService',
        metadata: {
          operation: 'executeQuery',
          queryLength: query.length,
          hasVariables: !!variables
        }
      });

      const response = await this.client.post('', {
        query,
        variables
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
  }

  async getBoards(limit: number = 50): Promise<MondayBoard[]> {
    const query = `
      query {
        boards(limit: ${limit}) {
          id
          name
          description
          state
          board_kind
          workspace_id
        }
      }
    `;

    const result = await this.executeQuery<{ boards: MondayBoard[] }>(query);
    
    logger.info('Boards Monday.com récupérés', {
      service: 'MondayService',
      metadata: {
        operation: 'getBoards',
        count: result.boards?.length || 0
      }
    });

    return result.boards || [];
  }

  async getBoardColumns(boardId: string): Promise<MondayColumn[]> {
    const query = `
      query {
        boards(ids: [${boardId}]) {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;

    const result = await this.executeQuery<{ boards: { columns: MondayColumn[] }[] }>(query);
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
      query {
        boards(ids: [${boardId}]) {
          items_page(limit: ${limit}) {
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
    }>(query);

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

  async getBoardData(boardId: string): Promise<MondayBoardData> {
    const query = `
      query {
        boards(ids: [${boardId}]) {
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
          items_page(limit: 500) {
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

    const result = await this.executeQuery<{ boards: any[] }>(query);
    const boardData = result.boards?.[0];

    if (!boardData) {
      throw new Error(`Board ${boardId} not found`);
    }

    logger.info('Données complètes board récupérées', {
      service: 'MondayService',
      metadata: {
        operation: 'getBoardData',
        boardId,
        columnCount: boardData.columns?.length || 0,
        itemCount: boardData.items_page?.items?.length || 0
      }
    });

    return {
      board: {
        id: boardData.id,
        name: boardData.name,
        description: boardData.description,
        state: boardData.state,
        board_kind: boardData.board_kind,
        workspace_id: boardData.workspace_id
      },
      columns: boardData.columns || [],
      items: boardData.items_page?.items || []
    };
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

// Singleton instance
export const mondayService = new MondayService();
