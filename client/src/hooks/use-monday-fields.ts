import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { 
  EquipmentBattery, 
  EquipmentBatteryInsert,
  MarginTarget, 
  MarginTargetInsert,
  ProjectSubElement, 
  ProjectSubElementInsert,
  ClassificationTag, 
  ClassificationTagInsert,
  EntityTag, 
  EntityTagInsert,
  EmployeeLabel, 
  EmployeeLabelInsert,
  EmployeeLabelAssignment, 
  EmployeeLabelAssignmentInsert 
} from '@shared/schema';

// ========================================
// 1. HOOK EQUIPMENT BATTERIES
// ========================================

export function useEquipmentBatteries() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer toutes les batteries/outillages
  const {
    data: equipmentBatteries,
    isLoading,
    error,
    refetch
  } = useQuery<EquipmentBattery[]>({
    queryKey: ['/api/equipment-batteries'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation pour créer une nouvelle entrée
  const createEquipmentMutation = useMutation({
    mutationFn: (data: EquipmentBatteryInsert) => 
      apiRequest('POST', '/api/equipment-batteries', data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-batteries'] });
      toast({
        title: "✅ Équipement ajouté",
        description: "L'équipement a été ajouté au stock avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      console.error('Erreur création équipement:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'ajouter l'équipement",
        variant: "destructive",
      });
    }
  });

  // Mutation pour mettre à jour une entrée
  const updateEquipmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EquipmentBatteryInsert> }) =>
      apiRequest('PATCH', `/api/equipment-batteries/${id}`, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-batteries'] });
      toast({
        title: "✅ Équipement mis à jour",
        description: "Les informations ont été mises à jour avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de mettre à jour l'équipement",
        variant: "destructive",
      });
    }
  });

  // Mutation pour supprimer une entrée
  const deleteEquipmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/equipment-batteries/${id}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/equipment-batteries'] });
      toast({
        title: "✅ Équipement supprimé",
        description: "L'équipement a été supprimé du stock",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer l'équipement",
        variant: "destructive",
      });
    }
  });

  return {
    // Données
    equipmentBatteries: equipmentBatteries || [],
    isLoading,
    error,
    
    // Actions
    createEquipment: createEquipmentMutation.mutate,
    updateEquipment: updateEquipmentMutation.mutate,
    deleteEquipment: deleteEquipmentMutation.mutate,
    refreshEquipment: refetch,
    
    // États
    isCreating: createEquipmentMutation.isPending,
    isUpdating: updateEquipmentMutation.isPending,
    isDeleting: deleteEquipmentMutation.isPending,
  };
}

// ========================================
// 2. HOOK MARGIN TARGETS
// ========================================

export function useMarginTargets(entityId?: string, entityType?: 'project' | 'offer' | 'user' | 'team') {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer les objectifs de marge
  const {
    data: marginTargets,
    isLoading,
    error,
    refetch
  } = useQuery<MarginTarget[]>({
    queryKey: ['/api/margin-targets', entityId, entityType],
    staleTime: 5 * 60 * 1000,
  });

  // Mutation pour créer/mettre à jour un objectif
  const upsertMarginTargetMutation = useMutation({
    mutationFn: (data: MarginTargetInsert) => 
      apiRequest('POST', '/api/margin-targets', data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/margin-targets'] });
      toast({
        title: "✅ Objectif de marge mis à jour",
        description: "L'objectif a été configuré avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de configurer l'objectif de marge",
        variant: "destructive",
      });
    }
  });

  // Mutation pour supprimer un objectif
  const deleteMarginTargetMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/margin-targets/${id}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/margin-targets'] });
      toast({
        title: "✅ Objectif supprimé",
        description: "L'objectif de marge a été supprimé",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer l'objectif",
        variant: "destructive",
      });
    }
  });

  return {
    // Données
    marginTargets: marginTargets || [],
    isLoading,
    error,
    
    // Actions
    upsertMarginTarget: upsertMarginTargetMutation.mutate,
    deleteMarginTarget: deleteMarginTargetMutation.mutate,
    refreshMarginTargets: refetch,
    
    // États
    isUpdating: upsertMarginTargetMutation.isPending,
    isDeleting: deleteMarginTargetMutation.isPending,
  };
}

// ========================================
// 3. HOOK STUDY DURATION
// ========================================

export function useStudyDuration(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer la durée d'étude du projet
  const {
    data: studyDuration,
    isLoading,
    error,
    refetch
  } = useQuery<{ estimatedHours?: number; actualHours?: number; notes?: string }>({
    queryKey: [`/api/projects/${projectId}/study-duration`],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation pour mettre à jour la durée d'étude
  const updateStudyDurationMutation = useMutation({
    mutationFn: (data: { estimatedHours?: number; actualHours?: number; notes?: string }) =>
      apiRequest('PATCH', `/api/projects/${projectId}/study-duration`, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/study-duration`] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast({
        title: "✅ Durée d'étude mise à jour",
        description: "La durée d'étude a été mise à jour avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de mettre à jour la durée d'étude",
        variant: "destructive",
      });
    }
  });

  // Mutation pour estimer automatiquement la durée
  const estimateStudyDurationMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/projects/${projectId}/estimate-study-duration`),
    
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/study-duration`] });
      const { estimatedHours } = data || {};
      toast({
        title: "🔄 Estimation automatique effectuée",
        description: `Durée estimée: ${estimatedHours}h`,
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible d'estimer la durée automatiquement",
        variant: "destructive",
      });
    }
  });

  return {
    // Données
    studyDuration: studyDuration,
    isLoading,
    error,
    
    // Actions
    updateStudyDuration: updateStudyDurationMutation.mutate,
    estimateStudyDuration: estimateStudyDurationMutation.mutate,
    refreshStudyDuration: refetch,
    
    // États
    isUpdating: updateStudyDurationMutation.isPending,
    isEstimating: estimateStudyDurationMutation.isPending,
  };
}

// ========================================
// 4. HOOK CLASSIFICATION TAGS
// ========================================

export function useClassificationTags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer tous les tags de classification
  const {
    data: classificationTags,
    isLoading,
    error,
    refetch
  } = useQuery<ClassificationTag[]>({
    queryKey: ['/api/tags/classification'],
    staleTime: 10 * 60 * 1000, // 10 minutes pour les tags
  });

  // Mutation pour créer un nouveau tag
  const createTagMutation = useMutation({
    mutationFn: (data: ClassificationTagInsert) => 
      apiRequest('POST', '/api/tags/classification', data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags/classification'] });
      toast({
        title: "✅ Tag créé",
        description: "Le nouveau tag a été créé avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de créer le tag",
        variant: "destructive",
      });
    }
  });

  // Mutation pour mettre à jour un tag
  const updateTagMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClassificationTagInsert> }) =>
      apiRequest('PATCH', `/api/tags/classification/${id}`, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags/classification'] });
      toast({
        title: "✅ Tag mis à jour",
        description: "Le tag a été modifié avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de modifier le tag",
        variant: "destructive",
      });
    }
  });

  // Mutation pour supprimer un tag
  const deleteTagMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/tags/classification/${id}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags/classification'] });
      toast({
        title: "✅ Tag supprimé",
        description: "Le tag a été supprimé",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le tag",
        variant: "destructive",
      });
    }
  });

  return {
    // Données
    classificationTags: classificationTags || [],
    isLoading,
    error,
    
    // Actions
    createTag: createTagMutation.mutate,
    updateTag: updateTagMutation.mutate,
    deleteTag: deleteTagMutation.mutate,
    refreshTags: refetch,
    
    // États
    isCreating: createTagMutation.isPending,
    isUpdating: updateTagMutation.isPending,
    isDeleting: deleteTagMutation.isPending,
  };
}

// ========================================
// 5. HOOK ENTITY TAGS
// ========================================

export function useEntityTags(entityType: string, entityId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer les tags d'une entité
  const {
    data: entityTags,
    isLoading,
    error,
    refetch
  } = useQuery<EntityTag[]>({
    queryKey: ['/api/tags/entity', entityType, entityId],
    enabled: !!entityType && !!entityId,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation pour assigner un tag à une entité
  const assignTagMutation = useMutation({
    mutationFn: (data: EntityTagInsert) => 
      apiRequest('POST', '/api/tags/entity', data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags/entity', entityType, entityId] });
      toast({
        title: "✅ Tag assigné",
        description: "Le tag a été assigné avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible d'assigner le tag",
        variant: "destructive",
      });
    }
  });

  // Mutation pour retirer un tag d'une entité
  const unassignTagMutation = useMutation({
    mutationFn: (tagId: string) => 
      apiRequest('DELETE', `/api/tags/entity/${entityType}/${entityId}/${tagId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags/entity', entityType, entityId] });
      toast({
        title: "✅ Tag retiré",
        description: "Le tag a été retiré avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de retirer le tag",
        variant: "destructive",
      });
    }
  });

  return {
    // Données
    entityTags: entityTags || [],
    isLoading,
    error,
    
    // Actions
    assignTag: assignTagMutation.mutate,
    unassignTag: unassignTagMutation.mutate,
    refreshEntityTags: refetch,
    
    // États
    isAssigning: assignTagMutation.isPending,
    isUnassigning: unassignTagMutation.isPending,
  };
}

// ========================================
// 6. HOOK EMPLOYEE LABELS
// ========================================

export function useEmployeeLabels(employeeId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer les labels d'un employé
  const {
    data: employeeLabels,
    isLoading,
    error,
    refetch
  } = useQuery<EmployeeLabelAssignment[]>({
    queryKey: ['/api/employees', employeeId, 'labels'],
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });

  // Query pour récupérer tous les labels disponibles
  const {
    data: availableLabels,
    isLoading: isLoadingAvailable
  } = useQuery<EmployeeLabel[]>({
    queryKey: ['/api/employee-labels'],
    staleTime: 10 * 60 * 1000,
  });

  // Mutation pour créer un nouveau label
  const createLabelMutation = useMutation({
    mutationFn: (data: EmployeeLabelInsert) => 
      apiRequest('POST', '/api/employee-labels', data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employee-labels'] });
      toast({
        title: "✅ Label créé",
        description: "Le nouveau label a été créé avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de créer le label",
        variant: "destructive",
      });
    }
  });

  // Mutation pour assigner un label à un employé
  const assignLabelMutation = useMutation({
    mutationFn: (data: EmployeeLabelAssignmentInsert) => 
      apiRequest('POST', `/api/employees/${employeeId}/labels`, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees', employeeId, 'labels'] });
      toast({
        title: "✅ Label assigné",
        description: "Le label a été assigné à l'employé",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible d'assigner le label",
        variant: "destructive",
      });
    }
  });

  // Mutation pour retirer un label d'un employé
  const unassignLabelMutation = useMutation({
    mutationFn: (labelId: string) => 
      apiRequest('DELETE', `/api/employees/${employeeId}/labels/${labelId}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees', employeeId, 'labels'] });
      toast({
        title: "✅ Label retiré",
        description: "Le label a été retiré de l'employé",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de retirer le label",
        variant: "destructive",
      });
    }
  });

  return {
    // Données
    employeeLabels: employeeLabels || [],
    availableLabels: availableLabels || [],
    isLoading,
    isLoadingAvailable,
    error,
    
    // Actions
    createLabel: createLabelMutation.mutate,
    assignLabel: assignLabelMutation.mutate,
    unassignLabel: unassignLabelMutation.mutate,
    refreshEmployeeLabels: refetch,
    
    // États
    isCreating: createLabelMutation.isPending,
    isAssigning: assignLabelMutation.isPending,
    isUnassigning: unassignLabelMutation.isPending,
  };
}

// ========================================
// 7. HOOK PROJECT SUB ELEMENTS
// ========================================

export function useProjectSubElements(projectId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query pour récupérer les sous-éléments d'un projet
  const {
    data: projectSubElements,
    isLoading,
    error,
    refetch
  } = useQuery<ProjectSubElement[]>({
    queryKey: [`/api/projects/${projectId}/sub-elements`],
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation pour créer un sous-élément
  const createSubElementMutation = useMutation({
    mutationFn: (data: ProjectSubElementInsert) => 
      apiRequest('POST', `/api/projects/${projectId}/sub-elements`, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sub-elements`] });
      toast({
        title: "✅ Sous-élément ajouté",
        description: "Le sous-élément a été ajouté au projet",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible d'ajouter le sous-élément",
        variant: "destructive",
      });
    }
  });

  // Mutation pour mettre à jour un sous-élément
  const updateSubElementMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProjectSubElementInsert> }) =>
      apiRequest('PATCH', `/api/projects/${projectId}/sub-elements/${id}`, data),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sub-elements`] });
      toast({
        title: "✅ Sous-élément mis à jour",
        description: "Le sous-élément a été modifié avec succès",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de modifier le sous-élément",
        variant: "destructive",
      });
    }
  });

  // Mutation pour supprimer un sous-élément
  const deleteSubElementMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest('DELETE', `/api/projects/${projectId}/sub-elements/${id}`),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sub-elements`] });
      toast({
        title: "✅ Sous-élément supprimé",
        description: "Le sous-élément a été supprimé du projet",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de supprimer le sous-élément",
        variant: "destructive",
      });
    }
  });

  // Mutation pour réorganiser les sous-éléments
  const reorderSubElementsMutation = useMutation({
    mutationFn: (data: { elementId: string; newParentId?: string; newPosition: number }[]) =>
      apiRequest('PATCH', `/api/projects/${projectId}/sub-elements/reorder`, { elements: data }),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/sub-elements`] });
      toast({
        title: "✅ Réorganisation effectuée",
        description: "Les sous-éléments ont été réorganisés",
        variant: "default",
      });
    },
    
    onError: (error: any) => {
      toast({
        title: "❌ Erreur",
        description: "Impossible de réorganiser les sous-éléments",
        variant: "destructive",
      });
    }
  });

  return {
    // Données
    projectSubElements: projectSubElements || [],
    isLoading,
    error,
    
    // Actions
    createSubElement: createSubElementMutation.mutate,
    updateSubElement: updateSubElementMutation.mutate,
    deleteSubElement: deleteSubElementMutation.mutate,
    reorderSubElements: reorderSubElementsMutation.mutate,
    refreshSubElements: refetch,
    
    // États
    isCreating: createSubElementMutation.isPending,
    isUpdating: updateSubElementMutation.isPending,
    isDeleting: deleteSubElementMutation.isPending,
    isReordering: reorderSubElementsMutation.isPending,
  };
}

// ========================================
// HOOK COMPOSITE POUR TOUS LES CHAMPS MONDAY
// ========================================

export function useMondayFields(projectId?: string, employeeId?: string) {
  const equipmentBatteries = useEquipmentBatteries();
  const marginTargets = useMarginTargets(projectId, 'project');
  const studyDuration = useStudyDuration(projectId || '');
  const classificationTags = useClassificationTags();
  const entityTags = useEntityTags('project', projectId || '');
  const employeeLabels = useEmployeeLabels(employeeId);
  const projectSubElements = useProjectSubElements(projectId || '');

  const isLoading = 
    equipmentBatteries.isLoading ||
    marginTargets.isLoading ||
    studyDuration.isLoading ||
    classificationTags.isLoading ||
    entityTags.isLoading ||
    employeeLabels.isLoading ||
    projectSubElements.isLoading;

  const isAnyMutating = 
    equipmentBatteries.isCreating || equipmentBatteries.isUpdating || equipmentBatteries.isDeleting ||
    marginTargets.isUpdating || marginTargets.isDeleting ||
    studyDuration.isUpdating || studyDuration.isEstimating ||
    classificationTags.isCreating || classificationTags.isUpdating || classificationTags.isDeleting ||
    entityTags.isAssigning || entityTags.isUnassigning ||
    employeeLabels.isCreating || employeeLabels.isAssigning || employeeLabels.isUnassigning ||
    projectSubElements.isCreating || projectSubElements.isUpdating || projectSubElements.isDeleting || projectSubElements.isReordering;

  const refreshAll = () => {
    equipmentBatteries.refreshEquipment();
    marginTargets.refreshMarginTargets();
    studyDuration.refreshStudyDuration();
    classificationTags.refreshTags();
    entityTags.refreshEntityTags();
    employeeLabels.refreshEmployeeLabels();
    projectSubElements.refreshSubElements();
  };

  return {
    // Hooks individuels
    equipmentBatteries,
    marginTargets,
    studyDuration,
    classificationTags,
    entityTags,
    employeeLabels,
    projectSubElements,
    
    // États globaux
    isLoading,
    isAnyMutating,
    refreshAll,
  };
}