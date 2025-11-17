/**
 * Prioritized AO Kanban Board
 * 
 * Kanban board pour les Appels d'Offres avec priorisation intelligente
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  usePrioritizedAOs,
  useCalculateAOPriority,
  useRecalculateAllPriorities,
  type PrioritizedAO,
  type AOPriorityData
} from '@/hooks/useAOPrioritization';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  Euro, 
  RefreshCw,
  ArrowRight,
  GripVertical,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LoadingState } from '@/components/ui/loading-states';

interface PrioritizedAOKanbanProps {
  filters?: {
    priorityLevel?: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
    status?: string;
  };
  onAOClick?: (ao: PrioritizedAO) => void;
}

const PRIORITY_COLORS = {
  critique: 'bg-error text-white',
  elevee: 'bg-warning text-white',
  normale: 'bg-primary text-white',
  faible: 'bg-accent text-white',
  tres_faible: 'bg-surface-muted text-on-surface',
} as const;

const PRIORITY_LABELS = {
  critique: 'Critique',
  elevee: 'Élevée',
  normale: 'Normale',
  faible: 'Faible',
  tres_faible: 'Très faible',
} as const;

export function PrioritizedAOKanban({ filters, onAOClick }: PrioritizedAOKanbanProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPriority, setSelectedPriority] = useState<string | undefined>(filters?.priorityLevel);
  
  const { data: prioritizedData, isLoading } = usePrioritizedAOs({
    priorityLevel: selectedPriority as any,
    status: filters?.status,
  });
  const calculatePriority = useCalculateAOPriority();
  const recalculateAll = useRecalculateAllPriorities();

  const handleAOClick = (ao: PrioritizedAO) => {
    if (onAOClick) {
      onAOClick(ao);
    } else {
      setLocation(`/aos/${(ao.ao as any).id}`);
    }
  };

  const handleRecalculateAll = async () => {
    try {
      await recalculateAll.mutateAsync({});
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getPriorityBadge = (priority: AOPriorityData) => {
    return (
      <Badge className={PRIORITY_COLORS[priority.priorityLevel]}>
        {PRIORITY_LABELS[priority.priorityLevel]} ({priority.priorityScore.toFixed(1)})
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <LoadingState 
            type="skeleton-list" 
            message="Chargement des AO..."
            count={3}
          />
        </CardContent>
      </Card>
    );
  }

  const groupedAOs = prioritizedData?.groupedByPriority || {};
  const priorityLevels: Array<keyof typeof PRIORITY_COLORS> = ['critique', 'elevee', 'normale', 'faible', 'tres_faible'];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              AO par Priorité
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculateAll}
                disabled={recalculateAll.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${recalculateAll.isPending ? 'animate-spin' : ''}`} />
                Recalculer toutes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {prioritizedData && prioritizedData.count > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {priorityLevels.map((level) => {
                const aos = groupedAOs[level] || [];
                return (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between p-2 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge className={PRIORITY_COLORS[level]}>
                          {PRIORITY_LABELS[level]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          ({aos.length})
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 min-h-[200px]">
                      {aos.map((prioritizedAO) => {
                        const ao = prioritizedAO.ao as any;
                        const priority = prioritizedAO.priority;
                        return (
                          <Card
                            key={ao.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => handleAOClick(prioritizedAO)}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-semibold text-sm mb-1 line-clamp-2">
                                      {ao.reference || ao.name || 'AO sans référence'}
                                    </div>
                                    {ao.client && (
                                      <div className="text-xs text-muted-foreground mb-2">
                                        {ao.client}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  {getPriorityBadge(priority)}
                                  
                                  <div className="flex items-center gap-2 text-xs">
                                    <Progress 
                                      value={priority.priorityScore} 
                                      className="h-1.5 flex-1"
                                    />
                                    <span className="text-muted-foreground">
                                      {priority.priorityScore.toFixed(0)}
                                    </span>
                                  </div>

                                  {ao.montantEstime && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Euro className="h-3 w-3" />
                                      {new Intl.NumberFormat('fr-FR', {
                                        style: 'currency',
                                        currency: 'EUR',
                                        maximumFractionDigits: 0,
                                      }).format(Number(ao.montantEstime))}
                                    </div>
                                  )}

                                  {ao.dateLimiteRemise && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(ao.dateLimiteRemise), 'PP', { locale: fr })}
                                    </div>
                                  )}

                                  {priority.factors && (
                                    <div className="mt-2 pt-2 border-t text-xs space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Montant:</span>
                                        <span>{priority.factors.montant.toFixed(0)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Délai:</span>
                                        <span>{priority.factors.delai.toFixed(0)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Client:</span>
                                        <span>{priority.factors.typeClient.toFixed(0)}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {aos.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          Aucun AO
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun AO trouvé</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

