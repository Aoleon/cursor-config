import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useBusinessAlerts(query = {}) {
  return useQuery({
    queryKey: ['/api/alerts', 'business', query],
    staleTime: 1000 * 60 * 2,
    select: (data: any) => ({
      alerts: data.data || [],
      summary: data.summary,
      total: data.pagination?.total || 0
    })
  });
}

export function useBusinessAlertsDashboard() {
  return useQuery({
    queryKey: ['/api/alerts', 'dashboard'],
    staleTime: 1000 * 60 * 1
  });
}

export function useAcknowledgeAlert() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      return apiRequest('POST', `/api/alerts/${alertId}/acknowledge`, { notes });
    },
    onSuccess: () => {
      toast({ title: 'Alerte accusée réception' });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
    }
  });
}

export function useResolveAlert() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ alertId, resolution_notes }: { alertId: string; resolution_notes: string }) => {
      return apiRequest('POST', `/api/alerts/${alertId}/resolve`, { resolution_notes });
    },
    onSuccess: () => {
      toast({ title: 'Alerte résolue' });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
    }
  });
}