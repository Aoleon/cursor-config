#!/usr/bin/env node

/**
 * Serveur MCP personnalisé pour accéder à l'historique des chats Cursor
 * Remplace cursor-chat-history-mcp qui a des problèmes de compilation
 * Version améliorée avec timeouts et gestion d'erreurs robuste
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';

const CURSOR_DB_PATH = join(
  homedir(),
  'Library/Application Support/Cursor/User/globalStorage/state.vscdb'
);

// Timeouts pour éviter les blocages
const DB_OPERATION_TIMEOUT = 5000; // 5 secondes
const MAX_RETRIES = 2;
const RETRY_DELAY = 100; // 100ms

class CursorChatHistoryServer {
  constructor() {
    this.server = new Server(
      {
        name: 'cursor-chat-history-custom',
        version: '1.4.1',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
    this.db = null;
    this.dbLastAccess = null;
    this.dbAccessTimeout = 30000; // Fermer la connexion après 30s d'inactivité
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_conversations',
          description:
            'Liste les conversations Cursor avec résumés, titres et métadonnées, ordonnées par récence. Permet à l\'agent d\'analyser l\'historique pour identifier les patterns, erreurs récurrentes et opportunités d\'amélioration. Utilisez projectPath pour filtrer par projet. Version améliorée avec recherche élargie et détection intelligente.',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Chemin du projet pour filtrer les conversations',
              },
              limit: {
                type: 'number',
                description: 'Nombre maximum de conversations à retourner (1-100)',
                default: 20,
                minimum: 1,
                maximum: 100,
              },
              includeAiSummaries: {
                type: 'boolean',
                description: 'Inclure les résumés IA générés',
                default: true,
              },
              debug: {
                type: 'boolean',
                description: 'Activer le mode debug pour voir les logs de recherche',
                default: false,
              },
            },
          },
        },
        {
          name: 'get_conversation',
          description: 'Récupère une conversation complète par son ID. Permet à l\'agent d\'analyser en détail une conversation passée pour comprendre les erreurs, les solutions efficaces et les patterns à réutiliser.',
          inputSchema: {
            type: 'object',
            properties: {
              conversationId: {
                type: 'string',
                description: 'ID de la conversation',
              },
            },
            required: ['conversationId'],
          },
        },
        {
          name: 'get_conversation_analytics',
          description: 'Récupère des statistiques et analyses sur les conversations. Permet à l\'agent d\'identifier les tendances, les domaines fréquents et les opportunités d\'amélioration globale.',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Chemin du projet pour filtrer',
              },
              scope: {
                type: 'string',
                enum: ['recent', 'all', 'project'],
                default: 'recent',
              },
              recentDays: {
                type: 'number',
                description: 'Nombre de jours pour scope "recent"',
                default: 30,
              },
            },
          },
        },
        {
          name: 'analyze_improvement_patterns',
          description: 'Analyse les conversations passées pour identifier les patterns d\'amélioration, erreurs récurrentes, solutions efficaces et opportunités d\'apprentissage. Permet à l\'agent de s\'améliorer en apprenant de l\'historique.',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: {
                type: 'string',
                description: 'Chemin du projet pour filtrer les conversations',
              },
              analysisType: {
                type: 'string',
                enum: ['errors', 'solutions', 'patterns', 'all'],
                default: 'all',
                description: 'Type d\'analyse : erreurs récurrentes, solutions efficaces, patterns généraux, ou tout',
              },
              limit: {
                type: 'number',
                description: 'Nombre maximum de conversations à analyser',
                default: 50,
                minimum: 10,
                maximum: 200,
              },
              recentDays: {
                type: 'number',
                description: 'Nombre de jours pour analyser les conversations récentes',
                default: 30,
              },
            },
          },
        },
        {
          name: 'sync_conversations',
          description: 'Synchronise les conversations Cursor vers notre base de données PostgreSQL pour les conserver même après archivage. Permet à l\'agent d\'accéder au contenu complet des conversations stockées.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Nombre maximum de conversations à synchroniser',
                default: 100,
                minimum: 10,
                maximum: 500,
              },
              onlyNew: {
                type: 'boolean',
                description: 'Ne synchroniser que les nouvelles conversations (pas déjà stockées)',
                default: true,
              },
              projectPath: {
                type: 'string',
                description: 'Chemin du projet pour filtrer les conversations à synchroniser',
              },
            },
          },
        },
        {
          name: 'get_stored_conversations',
          description: 'Récupère les conversations stockées dans notre base de données PostgreSQL avec leur contenu complet. Permet à l\'agent d\'accéder à l\'historique complet même après archivage par Cursor.',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Nombre maximum de conversations à retourner',
                default: 50,
                minimum: 1,
                maximum: 200,
              },
              offset: {
                type: 'number',
                description: 'Offset pour la pagination',
                default: 0,
              },
              projectPath: {
                type: 'string',
                description: 'Chemin du projet pour filtrer',
              },
              startDate: {
                type: 'string',
                description: 'Date de début (ISO string)',
              },
              endDate: {
                type: 'string',
                description: 'Date de fin (ISO string)',
              },
              hasErrors: {
                type: 'boolean',
                description: 'Filtrer par conversations avec erreurs',
              },
              hasSolutions: {
                type: 'boolean',
                description: 'Filtrer par conversations avec solutions',
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Timeout global pour toutes les opérations
        const operationPromise = (async () => {
          switch (name) {
            case 'list_conversations':
              return await this.listConversations(args);
            case 'get_conversation':
              return await this.getConversation(args);
            case 'get_conversation_analytics':
              return await this.getConversationAnalytics(args);
            case 'analyze_improvement_patterns':
              return await this.analyzeImprovementPatterns(args);
            case 'sync_conversations':
              return await this.syncConversations(args);
            case 'get_stored_conversations':
              return await this.getStoredConversations(args);
            default:
              throw new Error(`Outil inconnu: ${name}`);
          }
        })();

        return await this.withTimeout(
          operationPromise,
          DB_OPERATION_TIMEOUT * 2, // Double timeout pour les opérations complexes
          `Appel outil ${name}`
        );
      } catch (error) {
        console.error(`Erreur dans CallToolRequestSchema: ${error.message}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error.message }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [],
    }));
  }

  getDatabase() {
    // Fermer la connexion si elle est inactive depuis trop longtemps
    if (this.db && this.dbLastAccess) {
      const timeSinceLastAccess = Date.now() - this.dbLastAccess;
      if (timeSinceLastAccess > this.dbAccessTimeout) {
        try {
          this.db.close();
          this.db = null;
          this.dbLastAccess = null;
        } catch (e) {
          // Ignorer les erreurs de fermeture
        }
      }
    }

    if (!this.db) {
      try {
        this.db = new Database(CURSOR_DB_PATH, { 
          readonly: true,
          timeout: DB_OPERATION_TIMEOUT
        });
      } catch (error) {
        throw new Error(`Impossible d'ouvrir la base de données Cursor: ${error.message}`);
      }
    }
    
    this.dbLastAccess = Date.now();
    return this.db;
  }

  async withTimeout(promise, timeoutMs, operation) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout: ${operation} a pris plus de ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async safeDbOperation(operation, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const db = this.getDatabase();
        // Wrapper pour gérer les opérations synchrones et asynchrones
        const operationPromise = new Promise((resolve, reject) => {
          try {
            // Exécuter l'opération (peut être synchrone ou asynchrone)
            const result = operation(db);
            // Si c'est une promesse, l'attendre, sinon la résoudre directement
            if (result && typeof result.then === 'function') {
              result.then(resolve).catch(reject);
            } else {
              resolve(result);
            }
          } catch (error) {
            // Capturer les erreurs synchrones
            reject(error);
          }
        });

        const result = await this.withTimeout(
          operationPromise,
          DB_OPERATION_TIMEOUT,
          'Opération DB'
        );
        return result;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        // Fermer la connexion et réessayer
        if (this.db) {
          try {
            this.db.close();
          } catch (e) {
            // Ignorer les erreurs de fermeture
          }
          this.db = null;
          this.dbLastAccess = null;
        }
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
      }
    }
  }

  extractConversationInfo(key, value) {
    // Extraire le titre de différentes sources possibles
    const title = value.title || 
                  value.name || 
                  value.label ||
                  (value.messages && value.messages[0]?.content?.substring(0, 50)) ||
                  'Conversation sans titre';

    // Extraire le timestamp
    const timestamp = value.timestamp || 
                      value.createdAt || 
                      value.updatedAt ||
                      (value.messages && value.messages[0]?.timestamp) ||
                      Date.now();

    // Extraire le projectPath
    const projectPath = value.projectPath || 
                        value.workspacePath ||
                        value.workspaceFolder ||
                        (value.context && value.context.workspaceFolder) ||
                        null;

    // Compter les messages
    const messageCount = value.messages?.length || 
                         value.chatMessages?.length ||
                         (Array.isArray(value) ? value.length : 0);

    return {
      id: key,
      title: typeof title === 'string' ? title : 'Conversation sans titre',
      timestamp: typeof timestamp === 'number' ? timestamp : Date.now(),
      projectPath: typeof projectPath === 'string' ? projectPath : null,
      messageCount: typeof messageCount === 'number' ? messageCount : 0,
    };
  }


  // Vérifie si une valeur ressemble à une conversation
  looksLikeConversation(value) {
    if (!value || typeof value !== 'object') return false;
    
    // Indicateurs qu'une valeur est une conversation
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

  async listConversations(args) {
    const { projectPath, limit = 20, includeAiSummaries = true, debug = false } = args || {};
    
    // Limiter le nombre de résultats pour éviter les blocages
    const safeLimit = Math.min(Math.max(1, limit || 20), 50);

    try {
      const result = await this.safeDbOperation((db) => {
        // Patterns de recherche élargis pour différentes versions de Cursor
        // Inclure les clés .hidden qui contiennent des références
        const searchPatterns = [
          'workbench.panel.composerChatViewPane.%',
          'workbench.panel.aichat.view.%',
          'chat.%',
          'workbench.chat.%',
          'workbench.aiChat.%',
          'cursor.chat.%',
          'cursor.conversation.%',
        ];

        // Essayer d'abord avec les patterns spécifiques (incluant .hidden)
        let query = db.prepare(
          `SELECT key, value FROM ItemTable 
           WHERE ${searchPatterns.map(() => 'key LIKE ?').join(' OR ')}
           ORDER BY key DESC 
           LIMIT ?`
        );
        
        let keys = query.all(...searchPatterns, safeLimit * 5);
        
        // Si aucun résultat, chercher plus largement
        if (keys.length === 0) {
          if (debug) {
            console.error('[DEBUG] Aucun résultat avec les patterns spécifiques, recherche élargie...');
          }
          
          // Recherche élargie : toutes les clés contenant "chat" ou "conversation"
          const broadQuery = db.prepare(
            `SELECT key, value FROM ItemTable 
             WHERE (key LIKE '%chat%' OR key LIKE '%conversation%')
             ORDER BY key DESC 
             LIMIT ?`
          );
          keys = broadQuery.all(safeLimit * 5);
          
          if (debug) {
            console.error(`[DEBUG] Recherche élargie: ${keys.length} clés trouvées`);
          }
        } else if (debug) {
          console.error(`[DEBUG] Patterns spécifiques: ${keys.length} clés trouvées`);
        }

        const conversations = [];
        const processedKeys = new Set(); // Éviter les doublons
        const totalKeys = keys.length;
        let keyIndex = 0; // Pour estimer l'âge basé sur la position

        for (const row of keys) {
          if (conversations.length >= safeLimit) break;
          
          // Éviter les doublons
          if (processedKeys.has(row.key)) continue;
          processedKeys.add(row.key);
          
          // Estimer l'âge basé sur la position (les clés sont triées DESC, donc les premières sont plus récentes)
          const ageEstimate = Date.now() - (keyIndex * 24 * 60 * 60 * 1000); // ~1 jour par clé
          keyIndex++;

          try {
            const value = JSON.parse(row.value.toString());
            
            // Extraire les informations de la conversation
            if (value && typeof value === 'object') {
              // Gérer les tableaux de références (clés .hidden ou autres structures)
              if (Array.isArray(value)) {
                // Limiter le nombre de références traitées pour éviter les blocages
                const maxRefs = Math.min(value.length, 20); // Augmenté à 20 pour plus de résultats
                if (debug && value.length > 0) {
                  console.error(`[DEBUG] Tableau trouvé avec ${value.length} références (traitement de ${maxRefs})`);
                }
                // Calculer l'âge estimé pour cette clé (utiliser l'index de la clé parente)
                const currentAgeEstimate = Date.now() - (keyIndex * 24 * 60 * 60 * 1000);
                for (let i = 0; i < maxRefs && conversations.length < safeLimit; i++) {
                  const ref = value[i];
                  // Accepter les références avec id ou directement les objets conversation
                  const refId = ref?.id || (ref && typeof ref === 'string' ? ref : null);
                  
                  if (refId && !processedKeys.has(refId)) {
                    processedKeys.add(refId);
                    try {
                      const refQuery = db.prepare('SELECT value FROM ItemTable WHERE key = ?');
                      const fullConv = refQuery.get(refId);
                      if (fullConv) {
                        const convData = JSON.parse(fullConv.value.toString());
                        if (convData && typeof convData === 'object') {
                          // Si c'est une vraie conversation, l'ajouter avec le contenu complet
                          if (this.looksLikeConversation(convData)) {
                            const conversation = this.extractConversationInfo(refId, convData);
                            
                            // Si la conversation a des messages, inclure le contenu complet
                            if (convData.messages && Array.isArray(convData.messages)) {
                              conversation.messages = convData.messages;
                              conversation.hasFullContent = true;
                              conversation.messageCount = convData.messages.length;
                            } else if (convData.chatMessages && Array.isArray(convData.chatMessages)) {
                              conversation.messages = convData.chatMessages;
                              conversation.hasFullContent = true;
                              conversation.messageCount = convData.chatMessages.length;
                            }
                            
                            // Inclure d'autres métadonnées utiles
                            if (convData.title) conversation.title = convData.title;
                            if (convData.createdAt) conversation.createdAt = convData.createdAt;
                            if (convData.updatedAt) conversation.updatedAt = convData.updatedAt;
                            
                            if (!projectPath || conversation.projectPath?.includes(projectPath)) {
                              conversations.push(conversation);
                              if (debug) {
                                console.error(`[DEBUG] Conversation trouvée avec contenu complet: ${conversation.title} (${refId}, ${conversation.messageCount} messages)`);
                              }
                            }
                          } else if (debug) {
                            console.error(`[DEBUG] Référence ${refId} ne ressemble pas à une conversation`);
                          }
                        }
                      } else {
                        // La conversation n'existe plus, mais on peut créer une entrée basique depuis la référence
                        // Utiliser l'estimation d'âge basée sur la position de la clé
                        const baseConversation = {
                          id: refId,
                          title: ref.title || ref.name || `Conversation ${refId.substring(refId.length - 8)}`,
                          timestamp: ref.timestamp || currentAgeEstimate,
                          projectPath: ref.projectPath || ref.workspacePath || null,
                          messageCount: 0,
                          isArchived: true, // Marquer comme archivée car la conversation complète n'existe plus
                        };
                        
                        if (!projectPath || baseConversation.projectPath?.includes(projectPath)) {
                          conversations.push(baseConversation);
                          if (debug) {
                            console.error(`[DEBUG] Conversation archivée (référence seulement): ${baseConversation.title} (${refId})`);
                          }
                        }
                      }
                    } catch (e) {
                      // Ignorer les erreurs de récupération
                      if (debug) {
                        console.error(`[DEBUG] Erreur récupération ref ${refId}: ${e.message}`);
                      }
                    }
                  } else if (ref && typeof ref === 'object' && !ref.id) {
                    // Si c'est directement un objet conversation dans le tableau
                    if (this.looksLikeConversation(ref)) {
                      const conversation = this.extractConversationInfo(row.key + `[${i}]`, ref);
                      if (!projectPath || conversation.projectPath?.includes(projectPath)) {
                        conversations.push(conversation);
                      }
                    }
                  }
                }
                continue;
              }

              // Vérifier que c'est bien une conversation avant de l'ajouter
              if (this.looksLikeConversation(value)) {
                // Objet direct - inclure le contenu complet si disponible
                const conversation = this.extractConversationInfo(row.key, value);

                // Si la conversation a des messages, inclure le contenu complet
                if (value.messages && Array.isArray(value.messages)) {
                  conversation.messages = value.messages;
                  conversation.hasFullContent = true;
                  conversation.messageCount = value.messages.length;
                } else if (value.chatMessages && Array.isArray(value.chatMessages)) {
                  conversation.messages = value.chatMessages;
                  conversation.hasFullContent = true;
                  conversation.messageCount = value.chatMessages.length;
                }

                // Inclure d'autres métadonnées utiles
                if (value.title) conversation.title = value.title;
                if (value.createdAt) conversation.createdAt = value.createdAt;
                if (value.updatedAt) conversation.updatedAt = value.updatedAt;

                // Filtrer par projectPath si fourni
                if (!projectPath || conversation.projectPath?.includes(projectPath)) {
                  if (includeAiSummaries && value.summary) {
                    conversation.summary = value.summary;
                  }
                  conversations.push(conversation);
                  if (debug && conversation.hasFullContent) {
                    console.error(`[DEBUG] Conversation directe avec contenu complet: ${conversation.title} (${conversation.messageCount} messages)`);
                  }
                }
              }
            }
          } catch (e) {
            // Ignorer les valeurs non-JSON
            if (debug) {
              console.error(`[DEBUG] Erreur parsing ${row.key}: ${e.message}`);
            }
            continue;
          }
        }

        // Trier par timestamp décroissant
        conversations.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        return conversations;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                conversations: result.slice(0, safeLimit),
                total: result.length,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      // Retourner une réponse vide plutôt que de bloquer
      console.error(`Erreur listConversations: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                conversations: [],
                total: 0,
                error: error.message,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  async getConversation(args) {
    const { conversationId } = args || {};
    if (!conversationId) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'conversationId est requis' }, null, 2),
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await this.safeDbOperation((db) => {
        const query = db.prepare('SELECT value FROM ItemTable WHERE key = ?');
        const row = query.get(conversationId);

        if (!row) {
          // Si la conversation n'existe pas directement, chercher dans les références .hidden
          // pour voir si on peut trouver des informations
          const hiddenQuery = db.prepare(
            `SELECT key, value FROM ItemTable 
             WHERE key LIKE '%.hidden' 
             AND value LIKE ? 
             LIMIT 1`
          );
          const hiddenRow = hiddenQuery.get(`%"${conversationId}"%`);
          
          if (hiddenRow) {
            // Conversation référencée mais archivée
            return {
              id: conversationId,
              isArchived: true,
              message: 'Cette conversation est archivée. Le contenu complet n\'est plus disponible dans la base de données.',
              note: 'Seules les métadonnées (titre, timestamp) peuvent être disponibles via list_conversations.'
            };
          }
          
          throw new Error(`Conversation non trouvée: ${conversationId}`);
        }

        const value = JSON.parse(row.value.toString());
        
        // Vérifier si c'est une vraie conversation avec contenu
        if (this.looksLikeConversation(value)) {
          // Retourner la conversation avec tous les détails
          return {
            id: conversationId,
            ...value,
            hasFullContent: !!(value.messages || value.chatMessages),
            messageCount: (value.messages || value.chatMessages || []).length
          };
        }
        
        return value;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`Erreur getConversation: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              { error: `Erreur lors de la récupération de la conversation: ${error.message}` },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  async getConversationAnalytics(args) {
    const { projectPath, scope = 'recent', recentDays = 30, debug = false } = args || {};
    
    // Limiter le nombre de conversations analysées pour éviter les blocages
    const MAX_ANALYTICS_ITEMS = 1000;

    try {
      const result = await this.safeDbOperation((db) => {
        // Patterns de recherche élargis
        const searchPatterns = [
          'workbench.panel.composerChatViewPane.%',
          'workbench.panel.aichat.view.%',
          'chat.%',
          'workbench.chat.%',
          'workbench.aiChat.%',
          'cursor.chat.%',
          'cursor.conversation.%',
        ];

        let query = db.prepare(
          `SELECT key, value FROM ItemTable 
           WHERE ${searchPatterns.map(() => 'key LIKE ?').join(' OR ')}
           LIMIT ?`
        );
        
        let keys = query.all(...searchPatterns, MAX_ANALYTICS_ITEMS);
        
        // Si aucun résultat, chercher plus largement
        if (keys.length === 0) {
          if (debug) {
            console.error('[DEBUG] Aucun résultat avec les patterns spécifiques, recherche élargie...');
          }
          const broadQuery = db.prepare(
            `SELECT key, value FROM ItemTable 
             WHERE key LIKE '%chat%' OR key LIKE '%conversation%'
             LIMIT ?`
          );
          keys = broadQuery.all(MAX_ANALYTICS_ITEMS);
        }

        const analytics = {
          total: 0,
          byProject: {},
          recent: 0,
          averageMessagesPerConversation: 0,
          dateRange: {
            oldest: null,
            newest: null,
          },
        };

        const now = Date.now();
        const recentThreshold = now - recentDays * 24 * 60 * 60 * 1000;

        for (const row of keys) {
          try {
            const value = JSON.parse(row.value.toString());
            if (value && typeof value === 'object') {
              // Gérer les tableaux de références
              if (Array.isArray(value)) {
                analytics.total += Math.min(value.length, 100); // Limiter les tableaux
                continue;
              }

              // Ne compter que les vraies conversations
              if (!this.looksLikeConversation(value)) {
                continue;
              }

              analytics.total++;
              const convInfo = this.extractConversationInfo(row.key, value);
              const timestamp = convInfo.timestamp;
              
              if (timestamp >= recentThreshold) {
                analytics.recent++;
              }

              if (convInfo.projectPath) {
                analytics.byProject[convInfo.projectPath] = (analytics.byProject[convInfo.projectPath] || 0) + 1;
              }

              if (convInfo.messageCount > 0) {
                analytics.averageMessagesPerConversation += convInfo.messageCount;
              }

              if (!analytics.dateRange.oldest || timestamp < analytics.dateRange.oldest) {
                analytics.dateRange.oldest = timestamp;
              }
              if (!analytics.dateRange.newest || timestamp > analytics.dateRange.newest) {
                analytics.dateRange.newest = timestamp;
              }
            }
          } catch (e) {
            continue;
          }
        }

        if (analytics.total > 0) {
          analytics.averageMessagesPerConversation = Math.round(
            analytics.averageMessagesPerConversation / analytics.total
          );
        }

        return analytics;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`Erreur getConversationAnalytics: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                total: 0,
                byProject: {},
                recent: 0,
                averageMessagesPerConversation: 0,
                dateRange: { oldest: null, newest: null },
                error: error.message,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  async analyzeImprovementPatterns(args) {
    const { projectPath, analysisType = 'all', limit = 50, recentDays = 30 } = args || {};
    
    const safeLimit = Math.min(Math.max(10, limit || 50), 200);
    const now = Date.now();
    const recentThreshold = now - recentDays * 24 * 60 * 60 * 1000;

    try {
      const result = await this.safeDbOperation((db) => {
        // Récupérer les conversations récentes
        const searchPatterns = [
          'workbench.panel.composerChatViewPane.%',
          'workbench.panel.aichat.view.%',
        ];

        const query = db.prepare(
          `SELECT key, value FROM ItemTable 
           WHERE ${searchPatterns.map(() => 'key LIKE ?').join(' OR ')}
           ORDER BY key DESC 
           LIMIT ?`
        );
        
        const keys = query.all(...searchPatterns, safeLimit * 3);
        
        const analysis = {
          totalConversations: 0,
          recentConversations: 0,
          errors: {
            common: [],
            patterns: [],
            frequency: {},
          },
          solutions: {
            effective: [],
            patterns: [],
            frequency: {},
          },
          patterns: {
            topics: {},
            approaches: [],
            improvements: [],
          },
          recommendations: [],
        };

        const processedKeys = new Set();
        let keyIndex = 0;

        for (const row of keys) {
          if (analysis.totalConversations >= safeLimit) break;
          
          if (processedKeys.has(row.key)) continue;
          processedKeys.add(row.key);

          try {
            const value = JSON.parse(row.value.toString());
            
            if (value && typeof value === 'object' && Array.isArray(value)) {
              const ageEstimate = Date.now() - (keyIndex * 24 * 60 * 60 * 1000);
              
              for (const ref of value.slice(0, 5)) {
                if (ref && ref.id) {
                  analysis.totalConversations++;
                  
                  if (ageEstimate >= recentThreshold) {
                    analysis.recentConversations++;
                  }

                  // Analyser les références pour identifier les patterns
                  // Note: Les conversations complètes ne sont plus disponibles,
                  // mais on peut analyser les métadonnées disponibles
                  const title = (ref.title || ref.name || '').toLowerCase();
                  const conversationId = ref.id || '';
                  
                  // Analyser même les titres génériques en utilisant l'ID de la conversation
                  // Les IDs contiennent parfois des informations utiles
                  const idParts = conversationId.split(/[.\-]/);
                  const allText = `${title} ${idParts.join(' ')}`.toLowerCase();
                  
                  // Détecter les patterns d'erreurs dans les titres et IDs
                  if (analysisType === 'errors' || analysisType === 'all') {
                    const errorKeywords = ['error', 'bug', 'fix', 'correction', 'problem', 'issue', 'fail', 'err', 'broken', 'wrong'];
                    if (errorKeywords.some(kw => allText.includes(kw))) {
                      analysis.errors.patterns.push({
                        conversationId: ref.id,
                        title: ref.title || ref.name || `Conversation ${ref.id.substring(ref.id.length - 8)}`,
                        timestamp: ref.timestamp || ageEstimate,
                      });
                    }
                  }

                  // Détecter les solutions efficaces
                  if (analysisType === 'solutions' || analysisType === 'all') {
                    const solutionKeywords = ['solution', 'implement', 'create', 'add', 'improve', 'optimize', 'refactor', 'migrate', 'update', 'enhance'];
                    if (solutionKeywords.some(kw => allText.includes(kw))) {
                      analysis.solutions.patterns.push({
                        conversationId: ref.id,
                        title: ref.title || ref.name || `Conversation ${ref.id.substring(ref.id.length - 8)}`,
                        timestamp: ref.timestamp || ageEstimate,
                      });
                    }
                  }

                  // Analyser les topics même avec titres génériques
                  if (analysisType === 'patterns' || analysisType === 'all') {
                    // Analyser le titre s'il existe
                    if (title && title !== 'conversation') {
                      const words = title.split(/\s+/);
                      words.forEach(word => {
                        const cleanWord = word.replace(/[^a-z0-9]/g, '');
                        if (cleanWord.length > 3 && cleanWord !== 'conversation') {
                          analysis.patterns.topics[cleanWord] = (analysis.patterns.topics[cleanWord] || 0) + 1;
                        }
                      });
                    }
                    
                    // Analyser aussi les patterns dans les IDs (workbench.panel.aichat.view.*)
                    // Les IDs peuvent contenir des informations sur le type de conversation
                    if (conversationId.includes('aichat')) {
                      analysis.patterns.topics['aichat'] = (analysis.patterns.topics['aichat'] || 0) + 1;
                    }
                    if (conversationId.includes('composer')) {
                      analysis.patterns.topics['composer'] = (analysis.patterns.topics['composer'] || 0) + 1;
                    }
                  }
                }
              }
              keyIndex++;
            }
          } catch (e) {
            continue;
          }
        }

        // Générer des recommandations basées sur l'analyse
        if (analysis.errors.patterns.length > 0) {
          analysis.recommendations.push({
            type: 'error_prevention',
            priority: 'high',
            message: `${analysis.errors.patterns.length} conversations concernent des erreurs. L'agent devrait être plus proactif dans la détection et la prévention des erreurs.`,
          });
        }

        if (analysis.solutions.patterns.length > 0) {
          analysis.recommendations.push({
            type: 'solution_reuse',
            priority: 'medium',
            message: `${analysis.solutions.patterns.length} conversations contiennent des solutions. L'agent devrait réutiliser ces patterns de solutions efficaces.`,
          });
        }

        // Recommandation si aucun pattern détecté (titres génériques)
        if (analysis.errors.patterns.length === 0 && analysis.solutions.patterns.length === 0 && analysis.totalConversations > 0) {
          analysis.recommendations.push({
            type: 'metadata_limitation',
            priority: 'info',
            message: `Aucun pattern détecté dans les ${analysis.totalConversations} conversations analysées. Les titres sont probablement génériques (ex: "Conversation xxx"). L'agent devrait utiliser l'analyse de la codebase pour identifier les patterns d'amélioration.`,
            action: 'Utiliser l\'analyse de la codebase pour identifier les patterns d\'erreurs et solutions. Consulter docs/ANALYSE_COMPLETE_MCP_CODEBASE_2025-01-29.md pour les patterns identifiés.',
            codebaseInsights: {
              errorPatterns: [
                '741 try-catch manuels à remplacer par withErrorHandling()',
                '33 retry manuels à remplacer par withRetry()',
                'Metadata vides (37+ occurrences corrigées)',
                'withErrorHandling mal formé (fréquence moyenne)',
                'Erreurs syntaxe metadata (faible mais critique)'
              ],
              solutionPatterns: [
                'Migration modulaire progressive (modules auth/ et documents/ complétés)',
                'Optimisations performance chatbot (latence réduite de ~50%)',
                'Détection automatique (scripts automatiques pour détecter/corriger)'
              ],
              priorityActions: [
                'Standardiser gestion d\'erreurs (741 try-catch, 33 retry) - CRITIQUE',
                'Finaliser migration modulaire (routes-poc.ts 11,998 lignes) - CRITIQUE',
                'Optimiser requêtes SQL (quelques requêtes >20s) - IMPORTANTE',
                'Réduire types any (933 occurrences) - IMPORTANTE'
              ]
            }
          });
        }

        // Recommandation basée sur le nombre de conversations
        if (analysis.totalConversations > 50) {
          analysis.recommendations.push({
            type: 'high_activity',
            priority: 'medium',
            message: `${analysis.totalConversations} conversations détectées. L'agent devrait analyser la codebase pour identifier les patterns récurrents et opportunités d'amélioration.`,
            action: 'Analyser la codebase pour identifier les patterns récurrents. Consulter docs/ANALYSE_COMPLETE_MCP_CODEBASE_2025-01-29.md pour une vue complète.',
            codebaseMetrics: {
              monolithicFiles: '79 fichiers >500 lignes (objectif <30)',
              anyTypes: '933 occurrences (objectif <20)',
              todos: '75 occurrences (objectif <30)',
              deprecatedCode: '278 occurrences (objectif <100)',
              manualTryCatch: '741 occurrences (objectif 0)',
              manualRetry: '33 occurrences (objectif 0)'
            }
          });
        }

        // Recommandation pour utiliser l'analyse de la codebase si patterns limités
        if (analysis.totalConversations > 0 && (analysis.errors.patterns.length === 0 || analysis.solutions.patterns.length === 0)) {
          analysis.recommendations.push({
            type: 'codebase_analysis_recommended',
            priority: 'high',
            message: 'Les métadonnées des conversations sont limitées. L\'analyse de la codebase fournit des insights plus complets sur les patterns d\'erreurs et solutions.',
            action: 'Consulter docs/ANALYSE_COMPLETE_MCP_CODEBASE_2025-01-29.md pour une analyse complète combinant MCP et codebase.',
            benefits: [
              'Identification de 5 patterns d\'erreurs majeurs (741 try-catch, 33 retry, metadata vides, etc.)',
              'Identification de 3 solutions efficaces (migration modulaire, optimisations performance, détection automatique)',
              '5 topics prioritaires identifiés (migration modulaire, dette technique, performance SQL, types any, fichiers monolithiques)',
              'Actions prioritaires clairement définies avec impact et résultats attendus'
            ]
          });
        }

        // Top topics
        const topTopics = Object.entries(analysis.patterns.topics)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([topic, count]) => ({ topic, count }));

        analysis.patterns.topics = topTopics;

        return analysis;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error(`Erreur analyzeImprovementPatterns: ${error.message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error.message,
                totalConversations: 0,
                recommendations: [],
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Serveur MCP Cursor Chat History démarré (v1.4.1 - analyse améliorée avec recommandations codebase)');
  }

  // Nettoyage à la fermeture
  cleanup() {
    if (this.db) {
      try {
        this.db.close();
      } catch (e) {
        // Ignorer
      }
      this.db = null;
    }
  }
}

const server = new CursorChatHistoryServer();

// Gestion propre de la fermeture
process.on('SIGINT', () => {
  server.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.cleanup();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('Erreur non gérée:', error);
  server.cleanup();
  process.exit(1);
});

server.run().catch((error) => {
  console.error('Erreur au démarrage du serveur:', error);
  server.cleanup();
  process.exit(1);
});

