import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Hook pour précharger intelligemment les données des pages liées
 * Améliore la navigation en préchargeant les données avant le clic utilisateur
 */

export const usePrefetchOfferDetail = (offerId: number | string | undefined) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (offerId) {
      // Prefetch les données de l'offre
      queryClient.prefetchQuery({
        queryKey: ['/api/offers', offerId],
        staleTime: 2 * 60 * 1000, // 2 minutes
      });
      
      // Prefetch les éléments de chiffrage de l'offre
      queryClient.prefetchQuery({
        queryKey: ['/api/chiffrage', { offerId }],
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [offerId, queryClient]);
};

export const usePrefetchProjectDetail = (projectId: number | string | undefined) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (projectId) {
      queryClient.prefetchQuery({
        queryKey: ['/api/projects', projectId],
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [projectId, queryClient]);
};

export const usePrefetchAODetail = (aoId: number | string | undefined) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (aoId) {
      queryClient.prefetchQuery({
        queryKey: ['/api/aos', aoId],
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [aoId, queryClient]);
};

/**
 * Prefetch multiple items sur hover dans une liste
 * Utilisé pour les tableaux avec beaucoup d'éléments
 */
export const usePrefetchOnHover = (
  endpoint: string,
  id: number | string | undefined,
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();
  
  const prefetch = () => {
    if (enabled && id) {
      queryClient.prefetchQuery({
        queryKey: [endpoint, id],
        staleTime: 2 * 60 * 1000,
      });
    }
  };
  
  return { prefetch };
};

/**
 * Prefetch les données dashboard au montage de l'app
 * pour réduire le temps de chargement du premier dashboard
 */
export const usePrefetchDashboards = () => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Prefetch dashboard data avec staleTime plus court (données temps réel)
    queryClient.prefetchQuery({
      queryKey: ['/api/analytics/dashboard'],
      staleTime: 30 * 1000, // 30 secondes
    });
    
    queryClient.prefetchQuery({
      queryKey: ['/api/analytics/executive-dashboard'],
      staleTime: 30 * 1000,
    });
  }, [queryClient]);
};
