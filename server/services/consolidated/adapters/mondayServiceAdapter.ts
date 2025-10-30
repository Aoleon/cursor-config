/**
 * BACKWARD COMPATIBILITY ADAPTER
 * 
 * Re-exports consolidated MondayIntegrationService functions for backward compatibility
 * Allows gradual migration of 23+ dependent files without breaking changes
 * 
 * DEPRECATION NOTICE: This adapter is temporary
 * - All new code should import from MondayIntegrationService directly
 * - Existing imports will continue to work during migration period
 * - Adapter will be removed in Phase 2 after all files migrated
 */

import { logger } from '../../../utils/logger';
import { 
  mondayIntegrationService,
  type MondayBoard,
  type MondayColumn,
  type MondayItem,
  type MondayColumnValue,
  type MondayBoardData,
  type ImportMapping,
  type ImportResult,
  type BoardColumnMetadata,
  type BoardStructure,
  type BoardAnalysisResult
} from '../MondayIntegrationService';

// ========================================
// TYPE RE-EXPORTS (for backward compatibility)
// ========================================

export type {
  MondayBoard,
  MondayColumn,
  MondayItem,
  MondayColumnValue,
  MondayBoardData,
  ImportMapping,
  ImportResult,
  BoardColumnMetadata,
  BoardStructure,
  BoardAnalysisResult
};

// ========================================
// MONDAYSERVICE ADAPTER
// ========================================

/**
 * @deprecated Use mondayIntegrationService from MondayIntegrationService instead
 */
export class MondayService {
  constructor() {
    logger.warn('DEPRECATION: MondayService is deprecated. Use MondayIntegrationService instead.', {
      service: 'MondayService',
      metadata: {
        operation: 'constructor',
        migration: 'Import from server/services/consolidated/MondayIntegrationService'
      }
    });
  }

  async getBoards(limit: number = 50): Promise<MondayBoard[]> {
    return mondayIntegrationService.getBoards(limit);
  }

  async getBoardColumns(boardId: string): Promise<MondayColumn[]> {
    return mondayIntegrationService.getBoardColumns(boardId);
  }

  async getBoardItems(boardId: string, limit: number = 500): Promise<MondayItem[]> {
    return mondayIntegrationService.getBoardItems(boardId, limit);
  }

  async getBoardItemsPaginated(boardId: string, limit: number = 500): Promise<MondayItem[]> {
    return mondayIntegrationService.getBoardItemsPaginated(boardId, limit);
  }

  async getBoardData(boardId: string): Promise<MondayBoardData> {
    return mondayIntegrationService.getBoardData(boardId);
  }

  async testConnection(): Promise<boolean> {
    return mondayIntegrationService.testConnection();
  }

  async getItem(itemId: string): Promise<MondayItem> {
    return mondayIntegrationService.getItem(itemId);
  }

  extractColumnValue(columnValue: MondayColumnValue): any {
    return mondayIntegrationService.extractColumnValue(columnValue);
  }
}

/**
 * @deprecated Use mondayIntegrationService singleton instead
 */
export const mondayService = mondayIntegrationService;

// ========================================
// MONDAYWEBHOOKSERVICE ADAPTER
// ========================================

/**
 * @deprecated Use mondayIntegrationService.handleWebhook() instead
 */
export class MondayWebhookService {
  constructor() {
    logger.warn('DEPRECATION: MondayWebhookService is deprecated. Use MondayIntegrationService instead.', {
      service: 'MondayWebhookService',
      metadata: {
        operation: 'constructor',
        migration: 'Use mondayIntegrationService.handleWebhook()'
      }
    });
  }

  async processWebhook(payload: any): Promise<void> {
    return mondayIntegrationService.handleWebhook(payload);
  }
}

/**
 * @deprecated Use mondayIntegrationService singleton instead
 */
export const mondayWebhookService = {
  processWebhook: (payload: any) => mondayIntegrationService.handleWebhook(payload)
};

// ========================================
// MONDAYSCHEMAANALYZER ADAPTER
// ========================================

/**
 * @deprecated Use mondayIntegrationService for board analysis instead
 */
export class MondaySchemaAnalyzer {
  constructor() {
    logger.warn('DEPRECATION: MondaySchemaAnalyzer is deprecated. Use MondayIntegrationService instead.', {
      service: 'MondaySchemaAnalyzer',
      metadata: {
        operation: 'constructor',
        migration: 'Import from server/services/consolidated/MondayIntegrationService'
      }
    });
  }

  async analyzeBoards(boardIds?: string[]): Promise<BoardAnalysisResult> {
    return mondayIntegrationService.analyzeBoards(boardIds);
  }

  async analyzeBoardStructure(boardId: string, boardName?: string): Promise<BoardStructure> {
    return mondayIntegrationService.getBoardStructure(boardId, boardName);
  }

  async suggestMappings(
    boardStructure: BoardStructure,
    saxiumFields: string[]
  ): Promise<Map<string, { saxiumField: string; confidence: number; reason: string }>> {
    return mondayIntegrationService.suggestMappings(boardStructure, saxiumFields);
  }

  async invalidateBoardCache(boardId: string): Promise<void> {
    return mondayIntegrationService.invalidateBoardCache(boardId);
  }
}

/**
 * @deprecated Use mondayIntegrationService singleton instead
 */
export function getMondaySchemaAnalyzer(): MondaySchemaAnalyzer {
  logger.warn('DEPRECATION: getMondaySchemaAnalyzer() is deprecated. Use mondayIntegrationService instead.', {
    service: 'MondaySchemaAnalyzer',
    metadata: {
      operation: 'getMondaySchemaAnalyzer',
      migration: 'Use mondayIntegrationService directly'
    }
  });
  return new MondaySchemaAnalyzer();
}

// ========================================
// MIGRATION GUIDE
// ========================================

/**
 * MIGRATION GUIDE
 * 
 * Old imports:
 * ```typescript
 * import { mondayService } from './services/MondayService';
 * import { mondayWebhookService } from './services/MondayWebhookService';
 * import { getMondaySchemaAnalyzer } from './services/MondaySchemaAnalyzer';
 * ```
 * 
 * New imports:
 * ```typescript
 * import { mondayIntegrationService } from './services/consolidated/MondayIntegrationService';
 * ```
 * 
 * Method mapping:
 * - mondayService.getBoards() → mondayIntegrationService.getBoards()
 * - mondayService.getBoardData() → mondayIntegrationService.getBoardData()
 * - mondayService.extractColumnValue() → mondayIntegrationService.extractColumnValue()
 * - mondayWebhookService.processWebhook() → mondayIntegrationService.handleWebhook()
 * - schemaAnalyzer.analyzeBoardStructure() → mondayIntegrationService.getBoardStructure()
 * - schemaAnalyzer.analyzeBoards() → mondayIntegrationService.analyzeBoards()
 * - schemaAnalyzer.suggestMappings() → mondayIntegrationService.suggestMappings()
 */
