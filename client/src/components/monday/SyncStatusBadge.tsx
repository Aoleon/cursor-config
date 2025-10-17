import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SyncStatusBadgeProps {
  status?: 'synced' | 'syncing' | 'error' | 'conflict' | null;
  lastSyncedAt?: Date;
  conflictReason?: string;
  mondayId?: string;
}

export function SyncStatusBadge({ 
  status, 
  lastSyncedAt, 
  conflictReason, 
  mondayId 
}: SyncStatusBadgeProps) {
  const config = {
    synced: {
      icon: CheckCircle,
      variant: 'default' as const,
      label: 'Synced with Monday',
      color: 'text-green-600'
    },
    syncing: {
      icon: Clock,
      variant: 'secondary' as const,
      label: 'Syncing...',
      color: 'text-blue-600'
    },
    error: {
      icon: XCircle,
      variant: 'destructive' as const,
      label: 'Sync Error',
      color: 'text-red-600'
    },
    conflict: {
      icon: AlertCircle,
      variant: 'outline' as const,
      label: 'Sync Conflict',
      color: 'text-orange-600'
    },
    notSynced: {
      icon: Clock,
      variant: 'outline' as const,
      label: 'Not synced',
      color: 'text-gray-400'
    }
  };
  
  const currentStatus = status || 'notSynced';
  const { icon: Icon, variant, label, color } = config[currentStatus];
  
  const tooltipContent = (
    <div className="text-xs">
      <div className="font-semibold">{label}</div>
      {lastSyncedAt && (
        <div className="text-gray-400 mt-1">
          Last sync: {new Date(lastSyncedAt).toLocaleString('fr-FR')}
        </div>
      )}
      {mondayId && (
        <div className="text-gray-400">Monday ID: {mondayId}</div>
      )}
      {conflictReason && (
        <div className="text-orange-300 mt-1">
          Conflict: {conflictReason}
        </div>
      )}
    </div>
  );
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant}
            className="flex items-center gap-1"
            data-testid={`monday-sync-badge-${currentStatus}`}
          >
            <Icon className={`h-3 w-3 ${color}`} />
            <span className="text-xs">{label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
