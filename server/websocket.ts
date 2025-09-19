import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { parse as parseCookie } from 'cookie';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import type { EventBus } from './eventBus.js';
import type { RealtimeEvent, WsMessage, EventFilter } from '../shared/events';
import { wsMessageSchema, eventFilterSchema } from '../shared/events';
import { log } from './vite';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAuthenticated: boolean;
  lastPong: number;
  eventFilter?: EventFilter;
}

interface SessionData {
  passport?: {
    user?: {
      claims?: {
        sub?: string;
        email?: string;
      };
    };
  };
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients = new Set<AuthenticatedWebSocket>();
  private eventBus: EventBus;
  private sessionStore: any;
  private heartbeatInterval: NodeJS.Timeout | undefined;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.setupSessionStore();
    this.wss = new WebSocketServer({
      noServer: true,
      path: '/ws'
    });

    this.setupWebSocketHandlers();
    this.setupHeartbeat();
    this.subscribeToEvents();
  }

  private setupSessionStore() {
    const pgStore = connectPg(session);
    this.sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      tableName: "sessions",
    });
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
      log('WebSocket connection established');
      
      ws.isAuthenticated = false;
      ws.lastPong = Date.now();
      this.clients.add(ws);

      // Demander l'authentification immédiatement
      this.sendMessage(ws, {
        type: 'auth',
        token: undefined
      });

      ws.on('message', async (rawData: Buffer) => {
        try {
          const data = JSON.parse(rawData.toString());
          const message = wsMessageSchema.parse(data);
          await this.handleMessage(ws, message);
        } catch (error) {
          log(`WebSocket message parsing error: ${error}`);
          this.sendMessage(ws, {
            type: 'error',
            message: 'Invalid message format',
            code: 'PARSE_ERROR'
          });
        }
      });

      ws.on('pong', () => {
        ws.lastPong = Date.now();
      });

      ws.on('close', () => {
        log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        log(`WebSocket error: ${error}`);
        this.clients.delete(ws);
      });

      // Authentifier avec les cookies de session existants
      this.authenticateFromCookies(ws, request);
    });
  }

  private async authenticateFromCookies(ws: AuthenticatedWebSocket, request: IncomingMessage) {
    try {
      const cookies = request.headers.cookie;
      if (!cookies) {
        log('WebSocket: No cookies found in request');
        this.sendMessage(ws, {
          type: 'auth_error',
          message: 'No session cookie found'
        });
        return;
      }

      const parsedCookies = parseCookie(cookies);
      const sessionCookie = parsedCookies['connect.sid'];
      
      if (!sessionCookie) {
        log('WebSocket: No connect.sid cookie found');
        this.sendMessage(ws, {
          type: 'auth_error',
          message: 'No session ID found'
        });
        return;
      }

      // Déchiffrer l'ID de session (format s:sessionId.signature)
      let sessionId = sessionCookie;
      
      // Si le cookie commence par 's:', c'est un cookie signé
      if (sessionId.startsWith('s:')) {
        sessionId = sessionId.slice(2); // Remove 's:'
        sessionId = sessionId.split('.')[0]; // Remove signature
      }
      
      if (!sessionId) {
        log('WebSocket: Invalid session format after parsing');
        this.sendMessage(ws, {
          type: 'auth_error',
          message: 'Invalid session format'
        });
        return;
      }

      log(`WebSocket: Looking up session: ${sessionId.substring(0, 8)}...`);

      // Récupérer la session depuis le store
      this.sessionStore.get(sessionId, (err: any, sessionData: SessionData) => {
        if (err) {
          log(`WebSocket: Session lookup error: ${err}`);
          this.sendMessage(ws, {
            type: 'auth_error',
            message: 'Session lookup failed'
          });
          return;
        }

        if (!sessionData) {
          log('WebSocket: Session not found in store');
          this.sendMessage(ws, {
            type: 'auth_error',
            message: 'Session not found or expired'
          });
          return;
        }

        log(`WebSocket: Session found, passport data: ${JSON.stringify(sessionData.passport || {})}`);

        const userId = sessionData.passport?.user?.claims?.sub;
        if (!userId) {
          log('WebSocket: No user ID found in session');
          this.sendMessage(ws, {
            type: 'auth_error',
            message: 'User not authenticated'
          });
          return;
        }

        // Authentification réussie
        ws.isAuthenticated = true;
        ws.userId = userId;

        this.sendMessage(ws, {
          type: 'auth_success',
          userId: userId
        });

        log(`WebSocket client authenticated: ${userId}`);
      });

    } catch (error) {
      log(`WebSocket authentication error: ${error}`);
      this.sendMessage(ws, {
        type: 'auth_error',
        message: 'Authentication failed'
      });
    }
  }

  private async handleMessage(ws: AuthenticatedWebSocket, message: WsMessage) {
    switch (message.type) {
      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        break;

      case 'subscribe':
        if (!ws.isAuthenticated) {
          this.sendMessage(ws, {
            type: 'error',
            message: 'Authentication required for subscription'
          });
          return;
        }

        try {
          ws.eventFilter = message.filter ? eventFilterSchema.parse(message.filter) : undefined;
          log(`Client subscribed with filter: ${JSON.stringify(ws.eventFilter)}`);
        } catch (error) {
          this.sendMessage(ws, {
            type: 'error',
            message: 'Invalid filter format',
            code: 'INVALID_FILTER'
          });
        }
        break;

      case 'unsubscribe':
        ws.eventFilter = undefined;
        log('Client unsubscribed from events');
        break;

      case 'auth':
        // L'authentification se fait automatiquement via les cookies
        // Ce message peut être ignoré ou utilisé pour re-authentifier
        break;

      default:
        this.sendMessage(ws, {
          type: 'error',
          message: 'Unknown message type',
          code: 'UNKNOWN_MESSAGE_TYPE'
        });
    }
  }

  private sendMessage(ws: AuthenticatedWebSocket, message: WsMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        log(`Error sending WebSocket message: ${error}`);
      }
    }
  }

  private setupHeartbeat() {
    // Heartbeat toutes les 30 secondes
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((ws) => {
        // Supprimer les connexions qui n'ont pas répondu au ping depuis 60s
        if (now - ws.lastPong > 60000) {
          log('Terminating stale WebSocket connection');
          ws.terminate();
          this.clients.delete(ws);
          return;
        }

        // Envoyer ping
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      });
    }, 30000);
  }

  private subscribeToEvents() {
    this.eventBus.subscribe((event: RealtimeEvent) => {
      this.broadcastEvent(event);
    });
  }

  private broadcastEvent(event: RealtimeEvent) {
    const authenticatedClients = Array.from(this.clients).filter(ws => 
      ws.isAuthenticated && ws.readyState === WebSocket.OPEN
    );

    if (authenticatedClients.length === 0) {
      return;
    }

    const message: WsMessage = {
      type: 'event',
      data: event
    };

    let sentCount = 0;

    authenticatedClients.forEach((ws) => {
      // Appliquer le filtre d'événements si défini
      if (ws.eventFilter && !this.matchesFilter(event, ws.eventFilter)) {
        return;
      }

      // Filtrer par userId si spécifié dans l'événement
      if (event.userId && event.userId !== ws.userId) {
        return;
      }

      this.sendMessage(ws, message);
      sentCount++;
    });

    if (sentCount > 0) {
      log(`Broadcasted event ${event.type} to ${sentCount} clients`);
    }
  }

  private matchesFilter(event: RealtimeEvent, filter: EventFilter): boolean {
    // Filtrer par types d'événements
    if (filter.eventTypes && !filter.eventTypes.includes(event.type)) {
      return false;
    }

    // Filtrer par entités
    if (filter.entities && !filter.entities.includes(event.entity)) {
      return false;
    }

    // Filtrer par IDs d'entité
    if (filter.entityIds && !filter.entityIds.includes(event.entityId)) {
      return false;
    }

    // Filtrer par projets
    if (filter.projectIds && event.projectId && !filter.projectIds.includes(event.projectId)) {
      return false;
    }

    // Filtrer par offres
    if (filter.offerIds && event.offerId && !filter.offerIds.includes(event.offerId)) {
      return false;
    }

    // Filtrer par sévérité
    if (filter.severities && !filter.severities.includes(event.severity)) {
      return false;
    }

    // Filtrer par utilisateur
    if (filter.userId && filter.userId !== event.userId) {
      return false;
    }

    return true;
  }

  public handleUpgrade(request: IncomingMessage, socket: any, head: Buffer) {
    const { pathname } = parse(request.url || '');
    
    if (pathname === '/ws') {
      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  }

  public getConnectedClientsCount(): number {
    return Array.from(this.clients).filter(ws => 
      ws.isAuthenticated && ws.readyState === WebSocket.OPEN
    ).length;
  }

  public close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.clients.forEach(ws => {
      ws.close();
    });
    
    this.wss.close();
  }
}