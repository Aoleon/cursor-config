import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Settings, 
  Target, 
  DollarSign, 
  Clock, 
  Users, 
  Zap,
  Bell,
  BarChart3,
  Filter,
  RefreshCw,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ProjectPriority, PriorityWeightsConfig } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface PriorityItem {
  id: string;
  offerId?: string;
  projectId?: string;
  name: string;
  client: string;
  type: 'offer' | 'project';
  priorityLevel: 'tres_faible' | 'faible' | 'normale' | 'elevee' | 'critique';
  priorityScore: number;
  montantScore: number;
  delaiScore: number;
  typeClientScore: number;
  complexiteScore: number;
  chargeBeScore: number;
  risqueScore: number;
  strategiqueScore: number;
  montant?: number;
  deadline?: Date;
  typeClient?: string;
  complexite?: string;
  chargeBeEstimee?: number;
  autoCalculated: boolean;
  manualOverride: boolean;
  alertCritical: boolean;
  alertSent?: boolean; // Prevent duplicate notifications
  lastCalculatedAt: Date;
  isActive: boolean;
}

interface SmartPrioritizationProps {
  'data-testid'?: string;
  onPriorityUpdate?: (itemId: string, newPriority: any) => void;
  enableNotifications?: boolean;
}

const DEFAULT_WEIGHTS: PriorityWeightsConfig = {
  montantWeight: 25,
  delaiWeight: 25,
  typeClientWeight: 15,
  complexiteWeight: 10,
  chargeBeWeight: 10,
  risqueWeight: 10,
  strategiqueWeight: 5
};

export default function SmartPrioritization({ 
  'data-testid': dataTestId,
  onPriorityUpdate,
  enableNotifications = true
}: SmartPrioritizationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // États locaux
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [showConfig, setShowConfig] = useState(false);
  const [weights, setWeights] = useState<PriorityWeightsConfig>(DEFAULT_WEIGHTS);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);

  // Récupérer les priorités
  const { data: priorities = [], isLoading, isError } = useQuery<PriorityItem[]>({
    queryKey: ['/api/priorities'],
    refetchInterval: autoRefresh ? 30000 : undefined, // Refresh toutes les 30s si activé
  });

  // Récupérer les offres et projets pour enrichir les données
  const { data: offers = [] } = useQuery<any[]>({
    queryKey: ['/api/offers'],
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
  });

  // Mutation pour recalculer les priorités
  const recalculateMutation = useMutation({
    mutationFn: async (newWeights: PriorityWeightsConfig) => {
      return await apiRequest('/api/priorities/recalculate', 'POST', newWeights);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/priorities'] });
      toast({
        title: "Priorités recalculées",
        description: "Les scores de priorité ont été mis à jour avec les nouveaux poids",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de recalculer les priorités",
        variant: "destructive",
      });
    }
  });

  // Mutation pour forcer la priorité manuellement
  const overrideMutation = useMutation({
    mutationFn: async (data: { itemId: string; priorityLevel: string; reason: string }) => {
      return await apiRequest(`/api/priorities/${data.itemId}/override`, 'POST', {
        priorityLevel: data.priorityLevel,
        reason: data.reason
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/priorities'] });
      toast({
        title: "Priorité forcée",
        description: "La priorité manuelle a été appliquée",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de forcer la priorité",
        variant: "destructive",
      });
    }
  });

  // Calculer les statistiques de priorité
  const priorityStats = useMemo(() => {
    if (!priorities.length) return { total: 0, critique: 0, elevee: 0, normale: 0, faible: 0, overdue: 0 };
    
    const now = new Date();
    return {
      total: priorities.length,
      critique: priorities.filter(p => p.priorityLevel === 'critique').length,
      elevee: priorities.filter(p => p.priorityLevel === 'elevee').length,
      normale: priorities.filter(p => p.priorityLevel === 'normale').length,
      faible: priorities.filter(p => p.priorityLevel === 'faible' || p.priorityLevel === 'tres_faible').length,
      overdue: priorities.filter(p => p.deadline && new Date(p.deadline) < now).length
    };
  }, [priorities]);

  // Filtrer les priorités
  const filteredPriorities = useMemo(() => {
    let filtered = priorities;

    if (showOnlyCritical) {
      filtered = filtered.filter(p => p.priorityLevel === 'critique' || p.alertCritical);
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(p => p.priorityLevel === selectedFilter);
    }

    // Trier par score décroissant puis par priorité
    return filtered.sort((a, b) => {
      if (a.priorityLevel !== b.priorityLevel) {
        const order = { 'critique': 5, 'elevee': 4, 'normale': 3, 'faible': 2, 'tres_faible': 1 };
        return order[b.priorityLevel as keyof typeof order] - order[a.priorityLevel as keyof typeof order];
      }
      return b.priorityScore - a.priorityScore;
    });
  }, [priorities, selectedFilter, showOnlyCritical]);

  // Obtenir la couleur selon le niveau de priorité
  const getPriorityColor = (level: string, score: number) => {
    switch (level) {
      case 'critique':
        return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500', accent: 'bg-red-500' };
      case 'elevee':
        return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-500', accent: 'bg-orange-500' };
      case 'normale':
        return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500', accent: 'bg-blue-500' };
      case 'faible':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500', accent: 'bg-green-500' };
      case 'tres_faible':
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500', accent: 'bg-gray-500' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500', accent: 'bg-gray-500' };
    }
  };

  // Recalculer les priorités avec les nouveaux poids
  const handleRecalculate = () => {
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      toast({
        title: "Erreur de configuration",
        description: "La somme des poids doit être égale à 100%",
        variant: "destructive",
      });
      return;
    }
    
    recalculateMutation.mutate(weights);
  };

  // Détection des nouveaux éléments critiques pour notifications
  useEffect(() => {
    if (enableNotifications && priorities.length > 0) {
      const criticalItems = priorities.filter(p => 
        p.priorityLevel === 'critique' && !p.alertSent
      );
      
      if (criticalItems.length > 0) {
        toast({
          title: "Alerte priorité critique",
          description: `${criticalItems.length} élément(s) nécessitent une attention immédiate`,
          variant: "destructive",
        });
      }
    }
  }, [priorities, enableNotifications, toast]);

  if (isLoading) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <CardTitle>Système de Priorisation Intelligente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Chargement des priorités...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card data-testid={dataTestId}>
        <CardHeader>
          <CardTitle>Système de Priorisation Intelligente</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Impossible de charger les données de priorité. Vérifiez votre connexion.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid={dataTestId}>
      {/* En-tête avec statistiques */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Système de Priorisation Intelligente</span>
              {autoRefresh && (
                <Badge variant="outline" className="ml-2 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                  Auto-refresh
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                data-testid="toggle-auto-refresh"
              >
                {autoRefresh ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              
              <Dialog open={showConfig} onOpenChange={setShowConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="config-button">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Configuration des Poids de Priorité</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="montant-weight">
                          Montant ({weights.montantWeight}%)
                        </Label>
                        <Slider
                          id="montant-weight"
                          min={0}
                          max={50}
                          step={1}
                          value={[weights.montantWeight]}
                          onValueChange={([value]) => setWeights(prev => ({ ...prev, montantWeight: value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="delai-weight">
                          Délai ({weights.delaiWeight}%)
                        </Label>
                        <Slider
                          id="delai-weight"
                          min={0}
                          max={50}
                          step={1}
                          value={[weights.delaiWeight]}
                          onValueChange={([value]) => setWeights(prev => ({ ...prev, delaiWeight: value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="client-weight">
                          Type Client ({weights.typeClientWeight}%)
                        </Label>
                        <Slider
                          id="client-weight"
                          min={0}
                          max={30}
                          step={1}
                          value={[weights.typeClientWeight]}
                          onValueChange={([value]) => setWeights(prev => ({ ...prev, typeClientWeight: value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="complexite-weight">
                          Complexité ({weights.complexiteWeight}%)
                        </Label>
                        <Slider
                          id="complexite-weight"
                          min={0}
                          max={30}
                          step={1}
                          value={[weights.complexiteWeight]}
                          onValueChange={([value]) => setWeights(prev => ({ ...prev, complexiteWeight: value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="charge-weight">
                          Charge BE ({weights.chargeBeWeight}%)
                        </Label>
                        <Slider
                          id="charge-weight"
                          min={0}
                          max={30}
                          step={1}
                          value={[weights.chargeBeWeight]}
                          onValueChange={([value]) => setWeights(prev => ({ ...prev, chargeBeWeight: value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="risque-weight">
                          Risque ({weights.risqueWeight}%)
                        </Label>
                        <Slider
                          id="risque-weight"
                          min={0}
                          max={30}
                          step={1}
                          value={[weights.risqueWeight]}
                          onValueChange={([value]) => setWeights(prev => ({ ...prev, risqueWeight: value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total des poids:</span>
                        <span className={`font-bold ${
                          Math.abs(Object.values(weights).reduce((sum, w) => sum + w, 0) - 100) < 0.01 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {Object.values(weights).reduce((sum, w) => sum + w, 0)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setWeights(DEFAULT_WEIGHTS)}
                      >
                        Réinitialiser
                      </Button>
                      <Button 
                        onClick={handleRecalculate}
                        disabled={recalculateMutation.isPending}
                        data-testid="recalculate-button"
                      >
                        {recalculateMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Appliquer et Recalculer
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Statistiques de priorité */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card className="p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-sm font-medium">Critique</span>
              </div>
              <div className="text-xl font-bold text-red-600 mt-1">
                {priorityStats.critique}
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded" />
                <span className="text-sm font-medium">Élevée</span>
              </div>
              <div className="text-xl font-bold text-orange-600 mt-1">
                {priorityStats.elevee}
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-sm font-medium">Normale</span>
              </div>
              <div className="text-xl font-bold text-blue-600 mt-1">
                {priorityStats.normale}
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span className="text-sm font-medium">Faible</span>
              </div>
              <div className="text-xl font-bold text-green-600 mt-1">
                {priorityStats.faible}
              </div>
            </Card>
            
            <Card className="p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">En retard</span>
              </div>
              <div className="text-xl font-bold text-red-600 mt-1">
                {priorityStats.overdue}
              </div>
            </Card>
          </div>
          
          {/* Filtres */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-40" data-testid="filter-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes priorités</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                  <SelectItem value="elevee">Élevée</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="faible">Faible</SelectItem>
                  <SelectItem value="tres_faible">Très faible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="critical-only"
                checked={showOnlyCritical}
                onCheckedChange={setShowOnlyCritical}
                data-testid="switch-critical-only"
              />
              <Label htmlFor="critical-only" className="text-sm">
                Critique uniquement
              </Label>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/priorities'] })}
              data-testid="refresh-button"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Liste des éléments priorisés */}
      <div className="space-y-3">
        {filteredPriorities.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Aucun élément trouvé avec les filtres actuels</p>
            </CardContent>
          </Card>
        ) : (
          filteredPriorities.map((item) => {
            const colors = getPriorityColor(item.priorityLevel, item.priorityScore);
            
            return (
              <Card key={item.id} className={`border-l-4 ${colors.border} ${colors.bg}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold text-lg truncate">
                          {item.name}
                        </h3>
                        
                        <Badge className={`${colors.text} ${colors.bg} border-0`}>
                          {item.priorityLevel.replace('_', ' ').toUpperCase()}
                        </Badge>
                        
                        {item.manualOverride && (
                          <Badge variant="outline" className="text-purple-600 border-purple-300">
                            Manuel
                          </Badge>
                        )}
                        
                        {item.alertCritical && (
                          <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {item.client}
                        </span>
                        
                        {item.montant && (
                          <span className="flex items-center">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {item.montant.toLocaleString()} €
                          </span>
                        )}
                        
                        {item.deadline && (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(item.deadline), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        )}
                        
                        <Badge variant="outline" className="text-xs">
                          {item.type === 'offer' ? 'Offre' : 'Projet'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {Math.round(item.priorityScore)}
                        </div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                      
                      <div className="w-24">
                        <Progress 
                          value={item.priorityScore} 
                          className="h-2"
                          // @ts-ignore - style sur Progress component
                          style={{
                            background: colors.accent,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Détail des scores par facteur */}
                  <div className="grid grid-cols-3 md:grid-cols-7 gap-2 mt-4 pt-3 border-t border-gray-200">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Montant</div>
                      <div className="font-medium">{Math.round(item.montantScore)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Délai</div>
                      <div className="font-medium">{Math.round(item.delaiScore)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Client</div>
                      <div className="font-medium">{Math.round(item.typeClientScore)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Complexité</div>
                      <div className="font-medium">{Math.round(item.complexiteScore)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Charge BE</div>
                      <div className="font-medium">{Math.round(item.chargeBeScore)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Risque</div>
                      <div className="font-medium">{Math.round(item.risqueScore)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">Stratégique</div>
                      <div className="font-medium">{Math.round(item.strategiqueScore)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Dernière mise à jour: {format(new Date(item.lastCalculatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Logic pour forcer la priorité manuellement
                          const newLevel = item.priorityLevel === 'critique' ? 'elevee' : 'critique';
                          overrideMutation.mutate({
                            itemId: item.id,
                            priorityLevel: newLevel,
                            reason: 'Modification manuelle depuis le dashboard'
                          });
                        }}
                        data-testid={`override-${item.id}`}
                      >
                        {item.priorityLevel === 'critique' ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <TrendingUp className="h-3 w-3" />
                        )}
                      </Button>
                      
                      {item.alertCritical && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Notification désactivée",
                              description: "L'alerte critique a été marquée comme vue",
                            });
                          }}
                          data-testid={`dismiss-alert-${item.id}`}
                        >
                          <Bell className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Informations sur l'algorithme de scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Algorithme de Scoring</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Facteurs de scoring:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• <strong>Montant:</strong> Plus le montant est élevé, plus le score est élevé</li>
                  <li>• <strong>Délai:</strong> Plus la date limite approche, plus le score est élevé</li>
                  <li>• <strong>Type Client:</strong> Public &gt; Privé &gt; Particulier</li>
                  <li>• <strong>Complexité:</strong> Basé sur le nombre de lots et la difficulté technique</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Niveaux de priorité:</h4>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li className="flex items-center"><span className="w-3 h-3 bg-red-500 rounded mr-2"></span><strong>Critique:</strong> Score &gt; 80</li>
                  <li className="flex items-center"><span className="w-3 h-3 bg-orange-500 rounded mr-2"></span><strong>Élevée:</strong> Score 60-80</li>
                  <li className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded mr-2"></span><strong>Normale:</strong> Score 40-60</li>
                  <li className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-2"></span><strong>Faible:</strong> Score &lt; 40</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}