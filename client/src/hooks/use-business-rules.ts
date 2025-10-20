import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { DateIntelligenceRule } from '@shared/schema';
import { z } from 'zod';

// Types pour les filtres de règles métier
export interface RulesFilter {
  phase?: string;
  projectType?: 'neuf' | 'renovation' | 'maintenance';
  complexity?: 'simple' | 'normale' | 'elevee';
  isActive?: boolean;
  priority?: number;
  search?: string;
}

// Schéma de validation pour création/édition de règle
export const CreateRuleSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  phase: z.string().min(1, "La phase est requise"),
  projectType: z.enum(['neuf', 'renovation', 'maintenance']).optional(),
  complexity: z.enum(['simple', 'normale', 'elevee']).optional(),
  baseDuration: z.number().min(1, "La durée de base doit être positive"),
  multiplierFactor: z.number().min(0.1).max(5, "Le multiplicateur doit être entre 0.1 et 5"),
  bufferPercentage: z.number().min(0).max(100, "Le buffer doit être entre 0 et 100%"),
  minDuration: z.number().min(1).optional(),
  maxDuration: z.number().min(1).optional(),
  workingDaysOnly: z.boolean().default(true),
  excludeHolidays: z.boolean().default(true),
  isActive: z.boolean().default(true),
  priority: z.number().min(1).max(100).default(50),
  baseConditions: z.record(z.any()).optional(),
  triggerEvents: z.array(z.string()).default([]),
  validFrom: z.date().default(() => new Date()),
  validUntil: z.date().optional(),
});

export type CreateRuleData = z.infer<typeof CreateRuleSchema>;

// Hook principal pour la gestion des règles métier
export function useBusinessRules(filters?: RulesFilter) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer les règles avec filtres
  const {
    data: rules,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['/api/date-intelligence-rules', filters],
    staleTime: 10 * 60 * 1000, // 10 minutes (règles changent moins souvent)
  });

  // Mutation pour créer une nouvelle règle
  const createRuleMutation = useMutation({
    mutationFn: (newRule: CreateRuleData) => {
      const validatedData = CreateRuleSchema.parse(newRule);
      return apiRequest('POST', '/api/date-intelligence-rules', validatedData);
    },
    
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/date-intelligence-rules'] });
      
      toast({
        title: "✅ Règle créée",
        description: "La nouvelle règle métier a été créée avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      console.error('Erreur création règle:', error);
      toast({
        title: "❌ Erreur",
        description: error.message || "Impossible de créer la règle",
        variant: "destructive",
      });
    }
  });

  // Mutation pour mettre à jour une règle existante
  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, updates }: {
      ruleId: string;
      updates: Partial<CreateRuleData>;
    }) => {
      if (Object.keys(updates).length > 0) {
        const validatedData = CreateRuleSchema.partial().parse(updates);
        return apiRequest('PATCH', `/api/date-intelligence-rules/${ruleId}`, validatedData);
      }
      return Promise.resolve({ success: true });
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/date-intelligence-rules'] });
      
      toast({
        title: "✅ Règle mise à jour",
        description: "La règle métier a été modifiée avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de mettre à jour la règle",
        variant: "destructive",
      });
    }
  });

  // Mutation pour supprimer une règle
  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => apiRequest('DELETE', `/api/date-intelligence-rules/${ruleId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/date-intelligence-rules'] });
      
      toast({
        title: "✅ Règle supprimée",
        description: "La règle métier a été supprimée avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer la règle",
        variant: "destructive",
      });
    }
  });

  // Mutation pour activer/désactiver une règle
  const toggleRuleMutation = useMutation({
    mutationFn: ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => 
      apiRequest('PATCH', `/api/date-intelligence-rules/${ruleId}`, { isActive }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/date-intelligence-rules'] });
    }
  });

  // Utilitaires de filtrage et regroupement
  const getFilteredRules = (data: DateIntelligenceRule[] | undefined): DateIntelligenceRule[] => {
    if (!data || !filters) return data || [];

    return data.filter(rule => {
      if (filters.phase && rule.phase !== filters.phase) return false;
      if (filters.projectType && rule.projectType !== filters.projectType) return false;
      if (filters.complexity && rule.complexity !== filters.complexity) return false;
      if (filters.isActive !== undefined && rule.isActive !== filters.isActive) return false;
      if (filters.priority && rule.priority !== filters.priority) return false;
      if (filters.search && !rule.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      
      return true;
    });
  };

  // Groupement des règles par phase
  const getRulesByPhase = (data: DateIntelligenceRule[] | undefined) => {
    if (!data) return {};
    
    return Object.groupBy(data, rule => rule.phase || 'non_definie');
  };

  // Statistiques des règles
  const getRulesStats = (data: DateIntelligenceRule[] | undefined) => {
    if (!data) return null;

    const activeRules = data.filter(r => r.isActive);
    const phases = [...new Set(data.map(r => r.phase).filter(Boolean))];
    
    return {
      total: data.length,
      active: activeRules.length,
      inactive: data.length - activeRules.length,
      phases: phases.length,
      avgPriority: data.reduce((acc, r) => acc + (r.priority || 50), 0) / data.length,
      byPhase: Object.fromEntries(
        phases.map(phase => [
          phase,
          data.filter(r => r.phase === phase).length
        ])
      ),
    };
  };

  // Validation d'une règle
  const validateRule = (ruleData: Partial<CreateRuleData>): string[] => {
    const errors: string[] = [];
    
    try {
      CreateRuleSchema.parse(ruleData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(...error.issues.map(e => e.message));
      }
    }

    // Validations métier supplémentaires
    if (ruleData.minDuration && ruleData.maxDuration && ruleData.minDuration > ruleData.maxDuration) {
      errors.push("La durée minimale ne peut pas être supérieure à la durée maximale");
    }

    if (ruleData.baseDuration && ruleData.multiplierFactor) {
      const calculatedDuration = ruleData.baseDuration * ruleData.multiplierFactor;
      if (ruleData.minDuration && calculatedDuration < ruleData.minDuration) {
        errors.push("La durée calculée est inférieure à la durée minimale");
      }
      if (ruleData.maxDuration && calculatedDuration > ruleData.maxDuration) {
        errors.push("La durée calculée dépasse la durée maximale");
      }
    }

    return errors;
  };

  return {
    // Données
    rules: getFilteredRules(rules?.data),
    allRules: rules?.data || [],
    rulesByPhase: getRulesByPhase(rules?.data),
    isLoading,
    error,
    
    // Actions
    createRule: createRuleMutation.mutate,
    updateRule: updateRuleMutation.mutate,
    deleteRule: deleteRuleMutation.mutate,
    toggleRule: toggleRuleMutation.mutate,
    refreshRules: refetch,
    
    // États
    isCreating: createRuleMutation.isPending,
    isUpdating: updateRuleMutation.isPending,
    isDeleting: deleteRuleMutation.isPending,
    
    // Utilitaires
    stats: getRulesStats(rules?.data),
    validateRule,
  };
}

// Hook pour une règle spécifique
export function useBusinessRule(ruleId: string) {
  const { data: rule, isLoading } = useQuery({
    queryKey: ['api', 'date-intelligence-rules', ruleId],
    enabled: !!ruleId,
  });

  return {
    rule: rule?.data,
    isLoading,
  };
}

// Fonction utilitaire pour créer une règle vide
export function createEmptyRule(): Partial<CreateRuleData> {
  return {
    name: '',
    description: '',
    phase: '',
    baseDuration: 7,
    multiplierFactor: 1.0,
    bufferPercentage: 10,
    workingDaysOnly: true,
    excludeHolidays: true,
    isActive: true,
    priority: 50,
    triggerEvents: [],
    validFrom: new Date(),
  };
}