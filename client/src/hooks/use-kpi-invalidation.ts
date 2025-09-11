import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook custom pour l'invalidation automatique des KPIs
 * Centralise la logique d'invalidation pour toutes les mutations
 * qui impactent les métriques de performance
 */
export function useKpiInvalidation() {
  const queryClient = useQueryClient();

  /**
   * Invalide tous les KPIs et statistiques dashboard
   * À utiliser dans onSuccess des mutations critiques
   */
  const invalidateKpis = () => {
    // KPIs consolidés - toutes les variantes de paramètres
    queryClient.invalidateQueries({ 
      queryKey: ['/api/dashboard/kpis'],
      exact: false // Permet d'invalider toutes les variations de paramètres
    });
    
    // Stats dashboard classiques
    queryClient.invalidateQueries({ 
      queryKey: ['/api/dashboard/stats'] 
    });
  };

  /**
   * Invalide les KPIs + données métier liées (offres, projets)
   * À utiliser pour les mutations majeures (statut change, création, etc.)
   */
  const invalidateKpisAndRelatedData = () => {
    invalidateKpis();
    
    // Invalider toutes les offres (impact taux conversion, CA prévisionnel)
    queryClient.invalidateQueries({ 
      queryKey: ['/api/offers'],
      exact: false 
    });
    
    // Invalider tous les projets (impact charge BE, retards)
    queryClient.invalidateQueries({ 
      queryKey: ['/api/projects'],
      exact: false 
    });
    
    // Invalider les tâches (impact retards)
    queryClient.invalidateQueries({ 
      queryKey: ['/api/tasks'],
      exact: false 
    });
    
    // Invalider workload BE
    queryClient.invalidateQueries({ 
      queryKey: ['/api/be-workload'],
      exact: false 
    });
  };

  /**
   * Invalide spécifiquement pour les mutations de chiffrage
   * Impact sur les marges et CA prévisionnel
   */
  const invalidateKpisForPricing = () => {
    invalidateKpis();
    
    // Éléments de chiffrage (impact marge)
    queryClient.invalidateQueries({ 
      queryKey: ['/api/chiffrage-elements'],
      exact: false 
    });
    
    // Documents DPGF
    queryClient.invalidateQueries({ 
      queryKey: ['/api/dpgf'],
      exact: false 
    });
  };

  /**
   * Invalide pour les mutations de projet/tâches
   * Impact sur charge BE et retards
   */
  const invalidateKpisForProjects = () => {
    invalidateKpis();
    
    queryClient.invalidateQueries({ 
      queryKey: ['/api/projects'],
      exact: false 
    });
    
    queryClient.invalidateQueries({ 
      queryKey: ['/api/project-tasks'],
      exact: false 
    });
  };

  /**
   * Force refresh immédiat des KPIs
   * Utilisé pour le bouton refresh manuel
   */
  const refreshKpisNow = async () => {
    await queryClient.refetchQueries({ 
      queryKey: ['/api/dashboard/kpis'],
      type: 'active' // Seulement les requêtes actives
    });
    
    await queryClient.refetchQueries({ 
      queryKey: ['/api/dashboard/stats'] 
    });
  };

  return {
    invalidateKpis,
    invalidateKpisAndRelatedData,
    invalidateKpisForPricing,
    invalidateKpisForProjects,
    refreshKpisNow,
  };
}