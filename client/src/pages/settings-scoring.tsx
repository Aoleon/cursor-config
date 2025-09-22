import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Save, 
  Settings, 
  AlertTriangle,
  RefreshCw,
  Activity,
  BarChart3,
  ShieldCheck,
  Home,
  Zap,
  Shield,
  DoorOpen,
  Flame
} from "lucide-react";
import { technicalScoringConfigSchema, type TechnicalScoringConfig } from "@shared/schema";

// Schéma de validation pour le formulaire
const formSchema = technicalScoringConfigSchema;

// Interface pour les exemples de scoring
interface ScoringExample {
  name: string;
  criteria: {
    batimentPassif: boolean;
    isolationRenforcee: boolean;
    precadres: boolean;
    voletsExterieurs: boolean;
    coupeFeu: boolean;
  };
  description: string;
}

// Exemples prédéfinis pour la démonstration
const scoringExamples: ScoringExample[] = [
  {
    name: "Projet Standard",
    criteria: {
      batimentPassif: false,
      isolationRenforcee: false,
      precadres: true,
      voletsExterieurs: true,
      coupeFeu: false
    },
    description: "Projet menuiserie standard avec précadres et volets"
  },
  {
    name: "Bâtiment Passif",
    criteria: {
      batimentPassif: true,
      isolationRenforcee: true,
      precadres: true,
      voletsExterieurs: false,
      coupeFeu: false
    },
    description: "Construction haute performance énergétique"
  },
  {
    name: "Projet Complexe",
    criteria: {
      batimentPassif: true,
      isolationRenforcee: true,
      precadres: true,
      voletsExterieurs: true,
      coupeFeu: true
    },
    description: "Projet avec tous les critères techniques"
  },
  {
    name: "ERP avec Sécurité",
    criteria: {
      batimentPassif: false,
      isolationRenforcee: true,
      precadres: false,
      voletsExterieurs: false,
      coupeFeu: true
    },
    description: "Établissement recevant du public avec exigences coupe-feu"
  }
];

// Configuration des critères avec icônes et descriptions
const criteriaConfig = {
  batimentPassif: {
    label: "Bâtiment Passif",
    icon: Home,
    description: "Construction très haute performance énergétique",
    color: "text-green-600"
  },
  isolationRenforcee: {
    label: "Isolation Renforcée",
    icon: ShieldCheck,
    description: "Isolation thermique performante (RT 2012/RE 2020)",
    color: "text-blue-600"
  },
  precadres: {
    label: "Précadres",
    icon: DoorOpen,
    description: "Cadres d'attente pour menuiseries",
    color: "text-amber-600"
  },
  voletsExterieurs: {
    label: "Volets Extérieurs",
    icon: Shield,
    description: "Fermetures extérieures, BSO, persiennes",
    color: "text-purple-600"
  },
  coupeFeu: {
    label: "Coupe-Feu",
    icon: Flame,
    description: "Éléments de sécurité incendie",
    color: "text-red-600"
  }
};

export default function SettingsScoring() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<Record<string, any>>({});

  // Charger la configuration actuelle
  const { data: config, isLoading: isLoadingConfig, error: configError } = useQuery({
    queryKey: ['/api/scoring-config'],
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error)) {
        return false;
      }
      return failureCount < 3;
    }
  });

  const form = useForm<TechnicalScoringConfig>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weights: {
        batimentPassif: 5,
        isolationRenforcee: 3,
        precadres: 2,
        voletsExterieurs: 1,
        coupeFeu: 4,
      },
      threshold: 5
    }
  });

  // Synchroniser le formulaire avec les données chargées
  useEffect(() => {
    if (config) {
      form.reset(config.data);
    }
  }, [config, form]);

  // Mutation pour sauvegarder la configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (data: TechnicalScoringConfig) => {
      return await apiRequest({
        url: '/api/scoring-config',
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/scoring-config'] });
      toast({
        title: "✅ Configuration sauvegardée",
        description: "Les paramètres de scoring technique ont été mis à jour avec succès.",
      });
    },
    onError: (error: any) => {
      console.error('Erreur sauvegarde config:', error);
      toast({
        title: "❌ Erreur de sauvegarde",
        description: error.message || "Impossible de sauvegarder la configuration.",
        variant: "destructive",
      });
    }
  });

  // Calculer l'aperçu en temps réel pour tous les exemples
  const calculatePreview = async (configData: TechnicalScoringConfig) => {
    setIsPreviewLoading(true);
    try {
      const results: Record<string, any> = {};
      
      for (const example of scoringExamples) {
        const response = await apiRequest({
          url: '/api/score-preview',
          method: 'POST',
          body: {
            specialCriteria: example.criteria,
            config: configData
          }
        });
        results[example.name] = response.data.result;
      }
      
      setPreviewResults(results);
    } catch (error) {
      console.error('Erreur calcul aperçu:', error);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Recalculer les aperçus quand les valeurs du formulaire changent
  const watchedValues = form.watch();
  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePreview(watchedValues);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [watchedValues]);

  // Calculer l'aperçu initial
  useEffect(() => {
    if (config?.data) {
      calculatePreview(config.data);
    }
  }, [config]);

  const onSubmit = (data: TechnicalScoringConfig) => {
    updateConfigMutation.mutate(data);
  };

  const resetToDefaults = () => {
    const defaultValues = {
      weights: {
        batimentPassif: 5,
        isolationRenforcee: 3,
        precadres: 2,
        voletsExterieurs: 1,
        coupeFeu: 4,
      },
      threshold: 5
    };
    form.reset(defaultValues);
    toast({
      title: "🔄 Configuration réinitialisée",
      description: "Les valeurs par défaut ont été restaurées.",
    });
  };

  if (isLoadingConfig) {
    return (
      <>
          <Header />
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
      </>
    );
  }

  if (configError && isUnauthorizedError(configError)) {
    return (
      <>
          <Header />
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Accès refusé</h3>
                  <p className="text-muted-foreground">
                    Vous n'avez pas les permissions nécessaires pour accéder aux paramètres de scoring technique.
                    <br />Contactez un administrateur pour obtenir l'accès.
                  </p>
                </div>
              </CardContent>
            </Card>
      </>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col">
        <Header />
          <div className="max-w-6xl mx-auto space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="title-scoring-config">
                  <Settings className="h-8 w-8" />
                  Configuration du Scoring Technique
                </h1>
                <p className="text-muted-foreground mt-2">
                  Paramétrez les poids et seuils pour l'alerte automatique sur les AO à critères techniques spéciaux
                </p>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                {user?.role === 'admin' ? 'Administrateur' : 'Responsable'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Paramètres de Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Poids des critères */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                          Poids des critères (0-10)
                        </h3>
                        
                        {Object.entries(criteriaConfig).map(([key, config]) => {
                          const Icon = config.icon;
                          return (
                            <FormField
                              key={key}
                              control={form.control}
                              name={`weights.${key as keyof typeof criteriaConfig}`}
                              render={({ field }) => (
                                <FormItem className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <FormLabel className="flex items-center gap-2 text-sm font-medium">
                                      <Icon className={`h-4 w-4 ${config.color}`} />
                                      {config.label}
                                    </FormLabel>
                                    <Badge variant="outline" data-testid={`weight-value-${key}`}>
                                      {field.value}
                                    </Badge>
                                  </div>
                                  <FormControl>
                                    <Slider
                                      data-testid={`slider-${key}`}
                                      min={0}
                                      max={10}
                                      step={1}
                                      value={[field.value]}
                                      onValueChange={(value) => field.onChange(value[0])}
                                      className="w-full"
                                    />
                                  </FormControl>
                                  <FormDescription className="text-xs">
                                    {config.description}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          );
                        })}
                      </div>

                      <Separator />

                      {/* Seuil d'alerte */}
                      <FormField
                        control={form.control}
                        name="threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-orange-500" />
                              Seuil d'alerte
                            </FormLabel>
                            <FormControl>
                              <Input
                                data-testid="input-threshold"
                                type="number"
                                min="0"
                                max="50"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>
                              Score minimum pour déclencher une alerte (0-50)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Boutons d'action */}
                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          disabled={updateConfigMutation.isPending}
                          data-testid="button-save-config"
                          className="flex-1"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {updateConfigMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetToDefaults}
                          data-testid="button-reset-defaults"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Réinitialiser
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Aperçu en temps réel */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Aperçu du Scoring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Simulation en temps réel avec les paramètres actuels
                    </p>
                    
                    {isPreviewLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {scoringExamples.map((example) => {
                          const result = previewResults[example.name];
                          const isAlert = result?.shouldAlert;
                          
                          return (
                            <div 
                              key={example.name}
                              className={`p-3 rounded-lg border ${isAlert ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
                              data-testid={`preview-${example.name.replace(/\s+/g, '-').toLowerCase()}`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-sm">{example.name}</h4>
                                <div className="flex items-center gap-2">
                                  <Badge 
                                    variant={isAlert ? "destructive" : "secondary"}
                                    className="text-xs"
                                    data-testid={`score-badge-${example.name.replace(/\s+/g, '-').toLowerCase()}`}
                                  >
                                    Score: {result?.totalScore || 0}
                                  </Badge>
                                  {isAlert && (
                                    <Badge variant="outline" className="text-xs text-orange-600">
                                      🚨 Alerte
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {example.description}
                              </p>
                              {result?.triggeredCriteria && result.triggeredCriteria.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {result.triggeredCriteria.map((criteria: string) => (
                                    <Badge key={criteria} variant="outline" className="text-xs">
                                      {criteriaConfig[criteria as keyof typeof criteriaConfig]?.label || criteria}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Informations additionnelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-500" />
                  Comment ça fonctionne
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">🧮 Calcul du Score</h4>
                    <p className="text-muted-foreground">
                      Score = Σ(poids × critère)<br />
                      Chaque critère détecté contribue selon son poids configuré.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">🚨 Déclenchement d'Alerte</h4>
                    <p className="text-muted-foreground">
                      Une alerte est déclenchée si le score total ≥ seuil configuré.<br />
                      L'alerte notifie Julien LAMBOROT via WebSocket.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">🔍 Détection Automatique</h4>
                    <p className="text-muted-foreground">
                      Les critères sont détectés automatiquement lors du traitement OCR des PDF d'AO.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">⚡ Temps Réel</h4>
                    <p className="text-muted-foreground">
                      L'aperçu se met à jour en temps réel lors des modifications.<br />
                      Les alertes sont publiées instantanément via EventBus.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
      </div>
    </>
  );
}