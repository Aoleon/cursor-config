import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useWebSocketEvent } from '@/providers/websocket-provider';
import type { RealtimeEvent } from '@shared/events';

export function useMondaySync() {
  const { toast } = useToast();
  
  useWebSocketEvent((event: RealtimeEvent) => {
    // Only process Monday sync events
    if (event.entity !== 'batigest' || event.metadata?.syncType !== 'monday') {
      return;
    }
    
    const entityType = event.metadata.entityType;
    const status = event.metadata.status;
    
    // Handle sync success
    if (status === 'synced') {
      toast({
        title: 'Synchronisé avec Monday',
        description: `${entityType === 'project' ? 'Projet' : 'AO'} synchronisé avec succès`
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monday/sync-status'] });
    }
    
    // Handle sync conflict
    if (status === 'conflict') {
      const conflictReason = event.metadata.conflictReason || 'Conflit détecté';
      
      toast({
        title: 'Conflit de synchronisation',
        description: `${conflictReason}. Données Monday appliquées.`,
        variant: 'destructive'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/aos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/monday/sync-status'] });
    }
    
    // Handle sync error
    if (status === 'error') {
      toast({
        title: 'Erreur de synchronisation',
        description: 'La synchronisation avec Monday a échoué',
        variant: 'destructive'
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/monday/sync-status'] });
    }
  });
}
