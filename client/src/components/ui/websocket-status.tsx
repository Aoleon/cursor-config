import { useWebSocket } from '@/providers/websocket-provider';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RotateCcw, Loader2 } from 'lucide-react';

interface WebSocketStatusProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'badge' | 'icon' | 'full';
}

export function WebSocketStatus({ className, showLabel = false, variant = 'badge' }: WebSocketStatusProps) {
  const { isConnected, connectionStatus, reconnect } = useWebSocket();
  const { lastEvent } = useRealtimeNotifications();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500 hover:bg-green-600';
      case 'connecting':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      case 'disconnected':
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Temps réel actif';
      case 'connecting':
        return 'Connexion...';
      case 'error':
        return 'Erreur connexion';
      case 'disconnected':
      default:
        return 'Hors ligne';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-3 w-3" data-testid="icon-connected" />;
      case 'connecting':
        return <Loader2 className="h-3 w-3 animate-spin" data-testid="icon-connecting" />;
      case 'error':
      case 'disconnected':
      default:
        return <WifiOff className="h-3 w-3" data-testid="icon-disconnected" />;
    }
  };

  const getTooltipContent = () => {
    const baseInfo = `Statut: ${getStatusText()}`;
    
    if (lastEvent) {
      const eventTime = new Date(lastEvent.timestamp).toLocaleTimeString();
      return `${baseInfo}\nDernier événement: ${eventTime}`;
    }
    
    return baseInfo;
  };

  if (variant === 'icon') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={connectionStatus === 'error' ? reconnect : undefined}
            className={`p-1 ${className}`}
            data-testid="websocket-status-icon"
            disabled={connectionStatus === 'connecting'}
          >
            {getStatusIcon()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="whitespace-pre-line">
            {getTooltipContent()}
            {connectionStatus === 'error' && (
              <div className="mt-1 text-xs text-muted-foreground">
                Cliquer pour reconnecter
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-2 ${className}`} data-testid="websocket-status-full">
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          {showLabel && (
            <span className="text-sm font-medium">
              {getStatusText()}
            </span>
          )}
        </div>
        
        {connectionStatus === 'error' && (
          <Button
            variant="outline"
            size="sm"
            onClick={reconnect}
            className="h-6 px-2 text-xs"
            data-testid="button-reconnect"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reconnecter
          </Button>
        )}
        
        {lastEvent && (
          <div className="text-xs text-muted-foreground" data-testid="last-event-info">
            Dernier: {new Date(lastEvent.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          className={`${getStatusColor()} text-white cursor-pointer transition-colors ${className}`}
          onClick={connectionStatus === 'error' ? reconnect : undefined}
          data-testid="websocket-status-badge"
        >
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            {showLabel && <span className="text-xs">{getStatusText()}</span>}
          </div>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="whitespace-pre-line">
          {getTooltipContent()}
          {connectionStatus === 'error' && (
            <div className="mt-1 text-xs text-muted-foreground">
              Cliquer pour reconnecter
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Hook variant for programmatic access
export function useWebSocketStatus() {
  const { isConnected, connectionStatus } = useWebSocket();
  const { lastEvent } = useRealtimeNotifications();
  
  return {
    isConnected,
    connectionStatus,
    lastEvent,
    statusText: connectionStatus === 'connected' ? 'Temps réel actif' : 
                connectionStatus === 'connecting' ? 'Connexion...' :
                connectionStatus === 'error' ? 'Erreur connexion' : 'Hors ligne',
    statusColor: connectionStatus === 'connected' ? 'green' :
                 connectionStatus === 'connecting' ? 'yellow' :
                 connectionStatus === 'error' ? 'red' : 'gray'
  };
}