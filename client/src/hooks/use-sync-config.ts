import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export interface SyncConfig {
  id: string;
  isEnabled: boolean;
  cronExpression: string;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | 'running' | null;
  lastSyncResult: {
    totalAOs?: number;
    totalDocuments?: number;
    documentsAdded?: number;
    documentsUpdated?: number;
    documentsDeleted?: number;
    errors?: string[];
    duration?: number;
  };
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useSyncConfig() {
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<SyncConfig>({
    queryKey: ['/api/admin/sync-config'],
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<SyncConfig, 'isEnabled' | 'cronExpression'>>) => {
      const response = await apiRequest('/api/admin/sync-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/sync-config'] });
      toast({
        title: 'Configuration mise à jour',
        description: 'La configuration de synchronisation a été mise à jour avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour la configuration',
        variant: 'destructive',
      });
    },
  });

  return {
    config: data,
    isLoading,
    error,
    updateConfig: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
