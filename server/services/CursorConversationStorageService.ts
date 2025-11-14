/**
 * Service pour stocker les conversations Cursor dans une base SQLite locale
 * Permet à l'agent d'accéder à l'historique complet même après archivage par Cursor
 */

// @ts-ignore - better-sqlite3 n'a pas de default export dans les types
import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../utils/logger';
import { withErrorHandling } from '../utils/error-handler';

const CURSOR_DB_PATH = join(
  homedir(),
  'Library/Application Support/Cursor/User/globalStorage/state.vscdb'
);

// Base de données locale pour stocker les conversations
const LOCAL_STORAGE_DIR = join(process.cwd(), 'data', 'cursor-conversations');
const LOCAL_DB_PATH = join(LOCAL_STORAGE_DIR, 'conversations.db');

interface CursorConversationData {
  id: string;
  cursorConversationId: string;
  title?: string;
  projectPath?: string;
  messages: any[];
  metadata?: any;
  workspaceFolder?: string;
  contextFiles?: string[];
  contextRules?: string[];
  createdAt: Date;
  updatedAt?: Date;
  messageCount: number;
  hasCodeChanges?: boolean;
  hasErrors?: boolean;
  hasSolutions?: boolean;
  topics?: string[];
  searchText?: string;
}

export class CursorConversationStorageService {
  private cursorDb: Database.Database | null = null;
  private localDb: Database.Database | null = null;

  /**
   * Initialise la base de données locale
   */
  private initializeLocalDatabase(): void {
    try {
      // Créer le répertoire si nécessaire
      if (!existsSync(LOCAL_STORAGE_DIR)) {
        mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
      }

      if (!this.localDb) {
        // @ts-ignore
        this.localDb = new Database(LOCAL_DB_PATH, { 
          timeout: 5000
        });
        
        // Créer la table si elle n'existe pas
        this.localDb.exec(`
          CREATE TABLE IF NOT EXISTS cursor_conversations (
            id TEXT PRIMARY KEY,
            cursor_conversation_id TEXT NOT NULL UNIQUE,
            title TEXT,
            project_path TEXT,
            messages TEXT NOT NULL,
            metadata TEXT,
            workspace_folder TEXT,
            context_files TEXT,
            context_rules TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER,
            archived_at INTEGER,
            stored_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            message_count INTEGER NOT NULL,
            has_code_changes INTEGER DEFAULT 0,
            has_errors INTEGER DEFAULT 0,
            has_solutions INTEGER DEFAULT 0,
            topics TEXT,
            search_text TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_created_at ON cursor_conversations(created_at);
          CREATE INDEX IF NOT EXISTS idx_project_path ON cursor_conversations(project_path);
          CREATE INDEX IF NOT EXISTS idx_stored_at ON cursor_conversations(stored_at);
          CREATE INDEX IF NOT EXISTS idx_cursor_id ON cursor_conversations(cursor_conversation_id);
        `);
      }
    } catch (error) {
      logger.error('Impossible d\'initialiser la base de données locale', error as Error, { metadata: { error: String(error) } });
      throw error;
    }
  }

  /**
   * Obtient la connexion à la base de données locale
   */
  private getLocalDatabase(): Database.Database {
    if (!this.localDb) {
      this.initializeLocalDatabase();
    }
    return this.localDb!;
  }

  /**
   * Obtient la connexion à la base de données Cursor
   */
  private getCursorDatabase(): Database.Database | null {
    try {
      if (!this.cursorDb) {
        // @ts-ignore
        this.cursorDb = new Database(CURSOR_DB_PATH, { 
          readonly: true,
          timeout: 5000
        });
      }
      return this.cursorDb;
    } catch (error) {
      logger.error('Impossible d\'ouvrir la base de données Cursor', error as Error, { metadata: { error: String(error) } });
      return null;
    }
  }

  /**
   * Analyse une conversation pour extraire les métadonnées
   */
  private analyzeConversation(convData: any): {
    hasCodeChanges: boolean;
    hasErrors: boolean;
    hasSolutions: boolean;
    topics: string[];
    searchText: string;
  } {
    const messages = convData.messages || convData.chatMessages || [];
    const allText = JSON.stringify(convData).toLowerCase();
    
    // Détecter les changements de code
    const hasCodeChanges = messages.some((msg: any) => 
      msg.content?.includes('```') || 
      msg.content?.includes('function') ||
      msg.content?.includes('const ') ||
      msg.content?.includes('import ')
    );

    // Détecter les erreurs
    const errorKeywords = ['error', 'bug', 'fix', 'correction', 'problem', 'issue', 'fail', 'err'];
    const hasErrors = errorKeywords.some(kw => allText.includes(kw));

    // Détecter les solutions
    const solutionKeywords = ['solution', 'implement', 'create', 'add', 'improve', 'optimize', 'refactor'];
    const hasSolutions = solutionKeywords.some(kw => allText.includes(kw));

    // Extraire les topics (mots fréquents)
    const words = allText.split(/\s+/);
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      const cleanWord = word.replace(/[^a-z0-9]/g, '');
      if (cleanWord.length > 4) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    const topics = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Créer le texte de recherche
    const title = convData.title || '';
    const firstMessages = messages.slice(0, 3).map((m: any) => m.content || '').join(' ');
    const searchText = `${title} ${firstMessages}`.substring(0, 1000);

    return {
      hasCodeChanges,
      hasErrors,
      hasSolutions,
      topics,
      searchText,
    };
  }

  /**
   * Extrait les informations d'une conversation depuis la base Cursor
   */
  private extractConversationFromCursor(cursorId: string, convData: any): CursorConversationData | null {
    try {
      const messages = convData.messages || convData.chatMessages || [];
      // Accepter même sans messages si c'est une conversation archivée (on stocke au moins les métadonnées)
      const isArchived = messages.length === 0 && !convData.title && !convData.name;
      if (messages.length === 0 && !isArchived) {
        return null; // Pas de messages et pas archivée, ignorer
      }

      const analysis = this.analyzeConversation(convData);
      const title = convData.title || convData.name || `Conversation ${cursorId.substring(cursorId.length - 8)}`;
      const projectPath = convData.projectPath || convData.workspacePath || convData.workspaceFolder || null;
      const workspaceFolder = convData.workspaceFolder || convData.workspacePath || null;

      return {
        id: `cursor_${cursorId.replace(/[^a-zA-Z0-9]/g, '_')}`,
        cursorConversationId: cursorId,
        title,
        projectPath,
        messages,
        metadata: {
          originalData: {
            ...convData,
            messages: undefined, // Ne pas dupliquer
            chatMessages: undefined,
          },
        },
        workspaceFolder,
        contextFiles: convData.contextFiles || convData.files || [],
        contextRules: convData.contextRules || [],
        createdAt: new Date(convData.createdAt || convData.timestamp || Date.now()),
        updatedAt: convData.updatedAt ? new Date(convData.updatedAt) : undefined,
        messageCount: messages.length,
        ...analysis,
      };
    } catch (error) {
      logger.error('Erreur extraction conversation', error as Error, { metadata: { cursorId } });
      return null;
    }
  }

  /**
   * Synchronise les conversations depuis la base Cursor vers notre base de données
   */
  async syncConversations(options: {
    limit?: number;
    onlyNew?: boolean;
    projectPath?: string;
  } = {}): Promise<{ stored: number; skipped: number; errors: number }> {
    return withErrorHandling(
      async () => {
        const { limit = 100, onlyNew = true, projectPath } = options;
        const cursorDb = this.getCursorDatabase();
        
        if (!cursorDb) {
          throw new Error('Impossible d\'accéder à la base de données Cursor');
        }

        // Initialiser la base locale
        this.getLocalDatabase();

        // Récupérer les conversations depuis Cursor
        // 1. Chercher les conversations directes (non archivées)
        // 2. Chercher aussi les références .hidden pour les conversations archivées
        const searchPatterns = [
          'workbench.panel.composerChatViewPane.%',
          'workbench.panel.aichat.view.%',
        ];

        // Chercher d'abord les conversations directes (sans .hidden)
        const directQuery = cursorDb.prepare(
          `SELECT key, value FROM ItemTable 
           WHERE (key LIKE ? OR key LIKE ?)
           AND key NOT LIKE '%.hidden'
           ORDER BY key DESC 
           LIMIT ?`
        );

        const directKeys = directQuery.all(searchPatterns[0], searchPatterns[1], limit * 2) as Array<{ key: string; value: Buffer }>;
        
        // Chercher aussi les références .hidden pour les conversations archivées
        const hiddenQuery = cursorDb.prepare(
          `SELECT key, value FROM ItemTable 
           WHERE (key LIKE ? OR key LIKE ?)
           AND key LIKE '%.hidden'
           ORDER BY key DESC 
           LIMIT ?`
        );

        const hiddenKeys = hiddenQuery.all(searchPatterns[0], searchPatterns[1], limit * 3) as Array<{ key: string; value: Buffer }>;
        
        // Combiner les deux listes
        const keys = [...directKeys, ...hiddenKeys];
        
        let stored = 0;
        let skipped = 0;
        let errors = 0;

        // Récupérer les IDs déjà stockés si onlyNew
        let existingIds = new Set<string>();
        if (onlyNew) {
          const localDb = this.getLocalDatabase();
          const existing = localDb.prepare('SELECT cursor_conversation_id FROM cursor_conversations').all() as Array<{ cursor_conversation_id: string }>;
          existingIds = new Set(existing.map(e => e.cursor_conversation_id));
        }

        const processedKeys = new Set<string>();

        for (const row of keys) {
          try {
            const value = JSON.parse(row.value.toString());
            
            if (value && typeof value === 'object') {
              // Gérer les tableaux de références (.hidden)
              if (Array.isArray(value)) {
                for (const ref of value.slice(0, 10)) {
                  if (ref && ref.id) {
                    const refId = ref.id;
                    
                    // Vérifier si déjà stocké
                    if (onlyNew && existingIds.has(refId)) {
                      skipped++;
                      logger.debug('Conversation déjà stockée', { metadata: { refId } });
                      continue;
                    }

                    if (processedKeys.has(refId)) {
                      skipped++;
                      continue;
                    }
                    processedKeys.add(refId);

                    // Récupérer la conversation complète
                    const convQuery = cursorDb.prepare('SELECT value FROM ItemTable WHERE key = ?');
                    const fullConv = convQuery.get(refId) as { value: Buffer } | undefined;
                    
                    if (fullConv) {
                      const convData = JSON.parse(fullConv.value.toString());
                      if (this.looksLikeConversation(convData)) {
                        const extracted = this.extractConversationFromCursor(refId, convData);
                        if (extracted) {
                          // Filtrer par projectPath si fourni
                          if (projectPath && extracted.projectPath && !extracted.projectPath.includes(projectPath)) {
                            skipped++;
                            logger.debug('Conversation filtrée par projectPath', { metadata: { refId, projectPath: extracted.projectPath } });
                            continue;
                          }

                          // Stocker dans notre base
                          await this.storeConversation(extracted);
                          stored++;
                          logger.debug('Conversation stockée', { metadata: { refId, title: extracted.title } });
                        } else {
                          skipped++;
                          logger.debug('Extraction conversation échouée', { metadata: { refId } });
                        }
                      } else {
                        skipped++;
                        logger.debug('Ne ressemble pas à une conversation', { metadata: { refId, keys: Object.keys(convData) } });
                      }
                    } else {
                      // Conversation archivée - stocker directement avec métadonnées minimales
                      if (ref && ref.id) {
                        const shortId = refId.substring(refId.length - 8);
                        const archivedData: CursorConversationData = {
                          id: `cursor_${refId.replace(/[^a-zA-Z0-9]/g, '_')}`,
                          cursorConversationId: refId,
                          title: ref.title || ref.name || `Conversation ${shortId}`,
                          messages: [],
                          createdAt: ref.createdAt ? new Date(ref.createdAt) : new Date(),
                          messageCount: 0,
                          hasCodeChanges: false,
                          hasErrors: false,
                          hasSolutions: false,
                          topics: [],
                          searchText: `Conversation ${shortId}`,
                        };
                        
                        if (!projectPath || !archivedData.projectPath || archivedData.projectPath.includes(projectPath)) {
                          await this.storeConversation(archivedData);
                          stored++;
                          logger.debug('Conversation archivée stockée', { metadata: { refId } });
                        } else {
                          skipped++;
                        }
                      } else {
                        skipped++;
                      }
                    }
                  }
                }
              } else if (this.looksLikeConversation(value)) {
                // Conversation directe
                const cursorId = row.key;
                if (onlyNew && existingIds.has(cursorId)) {
                  skipped++;
                  logger.debug('Conversation déjà stockée', { metadata: { cursorId } });
                  continue;
                }

                if (processedKeys.has(cursorId)) {
                  skipped++;
                  continue;
                }
                processedKeys.add(cursorId);

                const extracted = this.extractConversationFromCursor(cursorId, value);
                if (extracted) {
                  if (projectPath && extracted.projectPath && !extracted.projectPath.includes(projectPath)) {
                    skipped++;
                    logger.debug('Conversation filtrée par projectPath', { metadata: { cursorId, projectPath: extracted.projectPath } });
                    continue;
                  }

                  await this.storeConversation(extracted);
                  stored++;
                  logger.debug('Conversation stockée', { metadata: { cursorId, title: extracted.title } });
                } else {
                  skipped++;
                  logger.debug('Extraction conversation échouée', { metadata: { cursorId } });
                }
              } else {
                skipped++;
                logger.debug('Clé ignorée (pas une conversation)', { metadata: { key: row.key, type: Array.isArray(value) ? 'array' : typeof value, keys: typeof value === 'object' ? Object.keys(value) : [] } });
              }
            }
          } catch (error) {
            errors++;
            logger.error('Erreur traitement conversation', error as Error, { metadata: { key: row.key } });
          }
        }

        return { stored, skipped, errors };
      },
      {
        operation: 'syncConversations',
        service: 'CursorConversationStorageService',
      }
    );
  }

  /**
   * Stocke une conversation dans notre base de données locale
   */
  async storeConversation(data: CursorConversationData): Promise<void> {
    return withErrorHandling(
      async () => {
        const localDb = this.getLocalDatabase();
        
        const insert = localDb.prepare(`
          INSERT INTO cursor_conversations (
            id, cursor_conversation_id, title, project_path, messages, metadata,
            workspace_folder, context_files, context_rules,
            created_at, updated_at, archived_at, stored_at,
            message_count, has_code_changes, has_errors, has_solutions,
            topics, search_text
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(cursor_conversation_id) DO UPDATE SET
            title = excluded.title,
            messages = excluded.messages,
            metadata = excluded.metadata,
            updated_at = excluded.updated_at,
            message_count = excluded.message_count,
            has_code_changes = excluded.has_code_changes,
            has_errors = excluded.has_errors,
            has_solutions = excluded.has_solutions,
            topics = excluded.topics,
            search_text = excluded.search_text
        `);

        insert.run(
          data.id,
          data.cursorConversationId,
          data.title || null,
          data.projectPath || null,
          JSON.stringify(data.messages),
          data.metadata ? JSON.stringify(data.metadata) : null,
          data.workspaceFolder || null,
          data.contextFiles ? JSON.stringify(data.contextFiles) : null,
          data.contextRules ? JSON.stringify(data.contextRules) : null,
          Math.floor(data.createdAt.getTime() / 1000),
          data.updatedAt ? Math.floor(data.updatedAt.getTime() / 1000) : null,
          null, // archivedAt
          Math.floor(Date.now() / 1000),
          data.messageCount,
          data.hasCodeChanges ? 1 : 0,
          data.hasErrors ? 1 : 0,
          data.hasSolutions ? 1 : 0,
          data.topics ? JSON.stringify(data.topics) : null,
          data.searchText || null
        );
      },
      {
        operation: 'storeConversation',
        service: 'CursorConversationStorageService',
      }
    );
  }

  /**
   * Récupère les conversations stockées
   */
  async getStoredConversations(options: {
    limit?: number;
    offset?: number;
    projectPath?: string;
    startDate?: Date;
    endDate?: Date;
    hasErrors?: boolean;
    hasSolutions?: boolean;
  } = {}): Promise<{
    conversations: any[];
    total: number;
  }> {
    return withErrorHandling(
      async () => {
        const {
          limit = 50,
          offset = 0,
          projectPath,
          startDate,
          endDate,
          hasErrors,
          hasSolutions,
        } = options;

        const localDb = this.getLocalDatabase();
        
        // Construire la clause WHERE
        const conditions: string[] = [];
        const params: any[] = [];

        if (projectPath) {
          conditions.push('project_path LIKE ?');
          params.push(`%${projectPath}%`);
        }
        if (startDate) {
          conditions.push('created_at >= ?');
          params.push(Math.floor(startDate.getTime() / 1000));
        }
        if (endDate) {
          conditions.push('created_at <= ?');
          params.push(Math.floor(endDate.getTime() / 1000));
        }
        if (hasErrors !== undefined) {
          conditions.push('has_errors = ?');
          params.push(hasErrors ? 1 : 0);
        }
        if (hasSolutions !== undefined) {
          conditions.push('has_solutions = ?');
          params.push(hasSolutions ? 1 : 0);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Récupérer les conversations
        const conversationsQuery = localDb.prepare(`
          SELECT * FROM cursor_conversations
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `);

        const conversations = conversationsQuery.all(...params, limit, offset) as any[];

        // Compter le total
        const countQuery = localDb.prepare(`
          SELECT COUNT(*) as count FROM cursor_conversations
          ${whereClause}
        `);
        const totalResult = countQuery.get(...params) as { count: number };
        const total = totalResult?.count || 0;

        // Parser les JSON
        const parsedConversations = conversations.map(conv => ({
          ...conv,
          messages: JSON.parse(conv.messages),
          metadata: conv.metadata ? JSON.parse(conv.metadata) : null,
          contextFiles: conv.context_files ? JSON.parse(conv.context_files) : null,
          contextRules: conv.context_rules ? JSON.parse(conv.context_rules) : null,
          topics: conv.topics ? JSON.parse(conv.topics) : null,
          createdAt: new Date(conv.created_at * 1000),
          updatedAt: conv.updated_at ? new Date(conv.updated_at * 1000) : null,
          archivedAt: conv.archived_at ? new Date(conv.archived_at * 1000) : null,
          storedAt: new Date(conv.stored_at * 1000),
          hasCodeChanges: conv.has_code_changes === 1,
          hasErrors: conv.has_errors === 1,
          hasSolutions: conv.has_solutions === 1,
        }));

        return { conversations: parsedConversations, total };
      },
      {
        operation: 'getStoredConversations',
        service: 'CursorConversationStorageService',
      }
    );
  }

  /**
   * Vérifie si une valeur ressemble à une conversation
   */
  private looksLikeConversation(value: any): boolean {
    if (!value || typeof value !== 'object') return false;
    
    const indicators = [
      value.messages && Array.isArray(value.messages),
      value.chatMessages && Array.isArray(value.chatMessages),
      value.conversationId,
      value.title && (value.messages || value.chatMessages),
      value.messages && value.messages.length > 0 && value.messages[0].role,
      value.chatMessages && value.chatMessages.length > 0 && value.chatMessages[0].role,
    ];
    
    return indicators.some(Boolean);
  }

  /**
   * Nettoie les connexions aux bases de données
   */
  cleanup(): void {
    if (this.cursorDb) {
      try {
        this.cursorDb.close();
      } catch (e) {
        // Ignorer
      }
      this.cursorDb = null;
    }
    if (this.localDb) {
      try {
        this.localDb.close();
      } catch (e) {
        // Ignorer
      }
      this.localDb = null;
    }
  }
}

// Instance singleton
export const cursorConversationStorageService = new CursorConversationStorageService();

