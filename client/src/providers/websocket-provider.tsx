import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { RealtimeEvent, WsMessage, EventFilter } from '@shared/events';
import { wsMessageSchema } from '@shared/events';
import { useAuth } from '@/hooks/useAuth';

interface WebSocketContextValue {
  socket: WebSocket | null;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastEvent: RealtimeEvent | null;
  subscribe: (filter?: EventFilter) => void;
  unsubscribe: () => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketContextValue['connectionStatus']>('disconnected');
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  
  const { user } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const eventHandlersRef = useRef<((event: RealtimeEvent) => void)[]>([]);
  const isManualDisconnectRef = useRef(false);

  // Backoff strategy for reconnection (1s, 2s, 4s, 8s, 16s, then 16s)
  const getReconnectDelay = (attempts: number): number => {
    const delays = [1000, 2000, 4000, 8000, 16000];
    return delays[Math.min(attempts, delays.length - 1)];
  };

  const connectWebSocket = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (!user) {
      console.log('WebSocket: No user available, skipping connection');
      return;
    }

    try {
      setConnectionStatus('connecting');
      console.log('WebSocket: Attempting to connect...');

      // Use current origin for WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('WebSocket: Connected successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        
        // Send ping to verify connection
        newSocket.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      };

      newSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message = wsMessageSchema.parse(data);
          
          handleWebSocketMessage(message);
        } catch (error) {
          console.warn('WebSocket: Failed to parse message:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log('WebSocket: Connection closed', { code: event.code, reason: event.reason });
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setSocket(null);
        
        // Only attempt reconnection if not manually disconnected
        if (!isManualDisconnectRef.current && user) {
          scheduleReconnect();
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket: Error occurred', error);
        setConnectionStatus('error');
        setIsConnected(false);
      };

      setSocket(newSocket);
      
    } catch (error) {
      console.error('WebSocket: Failed to create connection', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  }, [user, socket]);

  const handleWebSocketMessage = (message: WsMessage) => {
    switch (message.type) {
      case 'event':
        console.log('WebSocket: Received event', message.data.type, message.data.entityId);
        setLastEvent(message.data);
        
        // Notify all event handlers
        eventHandlersRef.current.forEach(handler => {
          try {
            handler(message.data);
          } catch (error) {
            console.error('WebSocket: Error in event handler', error);
          }
        });
        break;
        
      case 'pong':
        console.log('WebSocket: Received pong');
        break;
        
      case 'auth_success':
        console.log('WebSocket: Authenticated successfully', message.userId);
        break;
        
      case 'auth_error':
        console.error('WebSocket: Authentication failed', message.message);
        setConnectionStatus('error');
        break;
        
      case 'error':
        console.error('WebSocket: Server error', message.message);
        break;
        
      default:
        console.log('WebSocket: Unknown message type', message);
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = getReconnectDelay(reconnectAttemptsRef.current);
    console.log(`WebSocket: Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connectWebSocket();
    }, delay);
  };

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (socket) {
      socket.close();
      setSocket(null);
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, [socket]);

  const reconnect = useCallback(() => {
    isManualDisconnectRef.current = false;
    reconnectAttemptsRef.current = 0;
    disconnect();
    
    // Wait a bit before reconnecting
    setTimeout(() => {
      connectWebSocket();
    }, 500);
  }, [disconnect, connectWebSocket]);

  const subscribe = useCallback((filter?: EventFilter) => {
    if (socket?.readyState === WebSocket.OPEN) {
      const message: WsMessage = {
        type: 'subscribe',
        filter
      };
      socket.send(JSON.stringify(message));
      console.log('WebSocket: Subscribed with filter', filter);
    }
  }, [socket]);

  const unsubscribe = useCallback(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      const message: WsMessage = {
        type: 'unsubscribe'
      };
      socket.send(JSON.stringify(message));
      console.log('WebSocket: Unsubscribed');
    }
  }, [socket]);

  // Auto-connect when user is available
  useEffect(() => {
    if (user && !socket) {
      isManualDisconnectRef.current = false;
      connectWebSocket();
    }
    
    return () => {
      if (socket) {
        isManualDisconnectRef.current = true;
        socket.close();
      }
    };
  }, [user, connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, [disconnect]);

  // Register event handler
  const addEventHandler = useCallback((handler: (event: RealtimeEvent) => void) => {
    eventHandlersRef.current.push(handler);
    
    return () => {
      eventHandlersRef.current = eventHandlersRef.current.filter(h => h !== handler);
    };
  }, []);

  const value: WebSocketContextValue = {
    socket,
    isConnected,
    connectionStatus,
    lastEvent,
    subscribe,
    unsubscribe,
    reconnect
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}

// Hook to register event handlers
export function useWebSocketEvent(handler: (event: RealtimeEvent) => void) {
  const context = useContext(WebSocketContext);
  
  useEffect(() => {
    if (!context) return;
    
    const unregister = (context as any).addEventHandler?.(handler);
    return unregister;
  }, [handler, context]);
}