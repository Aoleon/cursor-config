/**
 * MONDAY SCHEMA ANALYZER SERVICE
 * 
 * Analyse la structure des boards Monday.com pour faciliter la migration vers Saxium
 * - Fetch colonnes et metadata des boards
 * - Cache structures pour optimisation (10min TTL)
 * - Support AI-assisted field mapping
 */

import { MondayIntegrationService } from './consolidated/MondayIntegrationService';
import { withErrorHandling } from './utils/error-handler';
import { getCacheService, TTL_CONFIG } from './CacheService';
import { logger } from '../utils/logger';

export interface BoardColumnMetadata {
  id: string;
  title: string;
  type: string;
  settings?: Record<string, unknown>;
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

export class MondaySchemaAnalyzer {
  private mondayService: MondayService;
  private cacheService = getCacheService();
  private readonly CACHE_TTL = TTL_CONFIG.MONDAY_BOARDS_LIST; // 10 minutes

  constructor() {
    this.mondayService = mondayintegrationService();
  }

  /**
   * Analyse la structure d'un ou plusieurs boards Monday.com
   * @param boardIds IDs des boards à analyser (tous si non spécifié)
   * @returns Structures des boards avec colonnes et metadata
   */
  async analyzeBoards(boardIds?: string[]): Promise<BoardAnalysisResult> {
    logger.info('Analyse structure boards Monday.com', { metadata: {
        service: 'MondaySchemaAnalyzer',
        operation: 'analyzeBoards',
        boardIds: boardIds || 'all',
        boardCount: boardIds?.length || 'all' 
              
              }
 
              
            });
    return withErrorHandling(
    async () => {
      // Récupérer les boards à analyser
      const boards = await this.getBoardsToAnalyze(boardIds);
      // Analyser chaque board en parallèle avec cache
      const structures = await Promise.all(
        boards.map(board => this.analyzeBoardStructure(board.id, board.name))
      );
      const result: BoardAnalysisResult = {
        boards: structures,
        totalBoards: structures.length,
        totalColumns: structures.reduce((sum, s) => sum + s.columns.length, 0),
        analyzedAt: new Date()
      };
      logger.info('Analyse boards terminée', { metadata: {
          service: 'MondaySchemaAnalyzer',
          operation: 'analyzeBoards',
          totalBoards: result.totalBoards,
          totalColumns: result.totalColumns 
              
              }
 
              
            });

      return result;

    
    },
    {
      operation: 'optimisation',
      service: 'MondaySchemaAnalyzer',
      metadata: {}
    } );
      throw error;
    }
  }

  /**
   * Analyse la structure d'un board spécifique avec cache
   * @param boardId ID du board Monday.com
   * @param boardName Nom du board (optionnel)
   * @returns Structure du board avec colonnes
   */
  async analyzeBoardStructure(boardId: string, boardName?: string): Promise<BoardStructure> {
    // Vérifier cache
    const cacheKey = this.cacheService.buildKey('monday', 'board_structure', { boardId });
    const cached = await this.cacheService.get<BoardStructure>(cacheKey);
    
    if (cached) {
      logger.debug('Structure board récupérée depuis cache', { metadata: {
          service: 'MondaySchemaAnalyzer',
          operation: 'analyzeBoardStructure',
          boardId,
          cacheHit: true 
              
              }
 
              
            });
      return cached;
    }
    logger.info('Analyse structure board', { metadata: {
        service: 'MondaySchemaAnalyzer',
        operation: 'analyzeBoardStructure',
        boardId,
        boardName 
              
              }
 
              
            });
    return withErrorHandling(
    async () => {
      // Récupérer colonnes via MondayService
      const columns = await this.mondayService.getBoardColumns(boardId);
      // Enrichir metadata des colonnes
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

      // Mettre en cache
      await this.cacheService.set(cacheKey, structure, this.CACHE_TTL);

      logger.info('Structure board analysée et mise en cache', { metadata: {
          service: 'MondaySchemaAnalyzer',
          operation: 'analyzeBoardStructure',
          boardId,
          columnCount: enrichedColumns.length,
          cacheTTL: this.CACHE_TTL 
              
              }
 
              
            });
      return structure;
    },
    {
      operation: 'optimisation',
      service: 'MondaySchemaAnalyzer',
      metadata: {}
    } );
      throw error;
    }
  }

  /**
   * Compare colonnes Monday.com avec champs Saxium entity
   * @param boardStructure Structure du board Monday
   * @param saxiumFields Champs Saxium disponibles
   * @returns Suggestions de mapping
   */
  async suggestMappings(
    boardStructure: BoardStructure,
    saxiumFields: string[]
  ): Promise<Map<string, { saxiumField: string; confidence: number; reason: string }>> {
    logger.info('Génération suggestions mapping', { metadata: {
        service: 'MondaySchemaAnalyzer',
        operation: 'suggestMappings',
        boardId: boardStructure.boardId,
        mondayColumns: boardStructure.columns.length,
        saxiumFields: saxiumFields.length 
              
              }
 
              
            });
    const suggestions = new Map<string, { saxiumField: string; confidence: number; reason: string }>();
    for (const column of boardStructure.columns) {
      const match = this.findBestMatch(column, saxiumFields);
      if (match.confidence > 0.5) {
        suggestions.set(column.id, match);
        logger.debug('Mapping suggéré', { metadata: {
            service: 'MondaySchemaAnalyzer',
            operation: 'suggestMappings',
            mondayColumn: column.title,
            saxiumField: match.saxiumField,
            confidence: match.confidence 
              
              }
 
              
            });
      }
    }

    logger.info('Suggestions mapping générées', { metadata: {
        service: 'MondaySchemaAnalyzer',
        operation: 'suggestMappings',
        totalSuggestions: suggestions.size,
        highConfidence: Array.from(suggestions.values()).filter(s => s.confidence > 0.8).length 
              
              }
 
              
            });
    return suggestions;
  }
  /**
   * Récupère les boards à analyser (tous ou filtrés)
   */
  private async getBoardsToAnalyze(boardIds?: string[]) {
    if (boardIds && boardIds.length > 0) {
      return boardIds.map(id  => ({ id, name: undefined       }
                 }

                           }


                         }));
    }

    // Récupérer tous les boards disponibles
    const allBoards = await this.mondayService.getBoards();
    return allBoards.map(board  => ({ id: board.id, name: board.name       }
                 }

                           }


                         }));
  }

  /**
   * Parse settings JSON des colonnes Monday
   */
  private parseSettings(settingsStr: string): Record<string, unknown> {
    try {
      return JSON.parse(settingsStr);
    } catch {
      logger.warn('Impossible de parser settings JSON', { metadata: {
          service: 'MondaySchemaAnalyzer',
          operation: 'parseSettings' 
              
              }
 
              
            });
      return {};
    }
  }

  /**
   * Génère description de la colonne basée sur type et settings
   */
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

  /**
   * Trouve le meilleur match entre colonne Monday et champ Saxium
   * Utilise similarité de strings + type inference
   */
  private findBestMatch(
    column: BoardColumnMetadata,
    saxiumFields: string[]
  ): { saxiumField: string; confidence: number; reason: string } {
    let bestMatch = { saxiumField: '', confidence: 0, reason: '' };

    // Normaliser le titre de la colonne Monday
    const normalizedTitle = column.title.toLowerCase().trim();

    for (const saxiumField of saxiumFields) {
      const normalizedField = saxiumField.toLowerCase().trim();
      
      // Exact match
      if (normalizedTitle === normalizedField) {
        return {
          saxiumField,
          confidence: 1.0,
          reason: 'Exact match'
        };
      }

      // Partial match ou similarité
      const similarity = this.calculateStringSimilarity(normalizedTitle, normalizedField);
      
      if (similarity > bestMatch.confidence) {
        bestMatch = {
          saxiumField,
          confidence: similarity,
          reason: similarity > 0.8 ? 'High similarity' : 'Partial match'
        };
      }

      // Mappings communs Monday → Saxium
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

  /**
   * Calcule similarité entre deux strings (algorithme simple)
   * Retourne 0-1 (1 = identique)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance simplifiée
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    // Vérifier si l'un contient l'autre
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Compter caractères communs
    const commonChars = new Set([...shorter]).size;
    const totalChars = new Set([...longer]).size;

    return commonChars / totalChars;
  }

  /**
   * Invalide le cache d'un board spécifique
   */
  async invalidateBoardCache(boardId: string): Promise<void> {
    const cacheKey = this.cacheService.buildKey('monday', 'board_structure', { boardId });
    await this.cacheService.delete(cacheKey);
    
    logger.info('Cache board invalidé', { metadata: {
        service: 'MondaySchemaAnalyzer',
        operation: 'invalidateBoardCache',
        boardId 
              
              }
 
              
            });
  }
}

// Export singleton
let schemaAnalyzer: MondaySchemaAnalyzer | null = null;

export function getMondaySchemaAnalyzer(): MondaySchemaAnalyzer {
  if (!schemaAnalyzer) {
    schemaAnalyzer = mondayintegrationService();
  }
  return schemaAnalyzer;
}
