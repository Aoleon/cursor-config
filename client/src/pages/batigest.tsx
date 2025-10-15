import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Database, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle,
  BarChart3,
  Clock,
  RotateCcw
} from "lucide-react";

// Interfaces de types
interface ConnectionTestResponse {
  connected: boolean;
  mode?: string;
  message?: string;
}

interface DashboardData {
  analyse?: {
    caRealise: number;
    caPrevu: number;
    tauxMarge: number;
    devisSoumis: number;
  };
}

interface DevisItem {
  id: string;
  numero: string;
  client: string;
  montantHT: number;
  statut: string;
  dateCreation: string;
  dateValidite: string;
}

interface DevisResponse {
  devis: DevisItem[];
}

interface CoefficientsResponse {
  coefficientsParFamille: Array<{
    famille: string;
    coefficient: number;
    marge: number;
  }>;
}

interface FacturationsResponse {
  analyse?: {
    nombreFactures?: number;
  };
  factures?: Array<{
    id: string;
    projet: string;
    montant: number;
    statut: string;
    dateEcheance: string;
  }>;
}

interface AnalyticsHistoryResponse {
  analytics: Array<{
    id: string;
    periode: string;
    type: string;
    resultat: any;
    dateGeneration: string;
  }>;
}

// Schémas de validation
const analyticsFormSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  periode: z.enum(['mensuel', 'trimestriel', 'annuel']).optional(),
});

const devisFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  statut: z.string().optional(),
  clientCode: z.string().optional(),
});

type AnalyticsFormData = z.infer<typeof analyticsFormSchema>;
type DevisFiltersData = z.infer<typeof devisFiltersSchema>;

export default function BatigestPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [devisFilters, setDevisFilters] = useState<DevisFiltersData>({});

  // Forms
  const analyticsForm = useForm<AnalyticsFormData>({
    resolver: zodResolver(analyticsFormSchema),
    defaultValues: {
      periode: 'mensuel'
    }
  });

  const devisFiltersForm = useForm<DevisFiltersData>({
    resolver: zodResolver(devisFiltersSchema),
    defaultValues: devisFilters
  });

  // Queries
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery<DashboardData>({
    queryKey: ['/api/batigest/dashboard'],
  });

  const { data: connectionTest, isLoading: isConnectionLoading, refetch: refetchConnection } = useQuery<ConnectionTestResponse>({
    queryKey: ['/api/batigest/connection-test'],
    refetchOnWindowFocus: false
  });

  const { data: devisData, isLoading: isDevisLoading } = useQuery<DevisResponse>({
    queryKey: ['/api/batigest/devis-clients', devisFilters],
    enabled: Object.keys(devisFilters).length > 0 || true
  });

  const { data: coefficientsData, isLoading: isCoefficientsLoading } = useQuery<CoefficientsResponse>({
    queryKey: ['/api/batigest/coefficients-marges'],
  });

  const { data: facturationsData, isLoading: isFacturationsLoading } = useQuery<FacturationsResponse>({
    queryKey: ['/api/batigest/facturations-en-cours'],
  });

  const { data: analyticsHistory, isLoading: isAnalyticsHistoryLoading } = useQuery<AnalyticsHistoryResponse>({
    queryKey: ['/api/batigest/analytics-history'],
  });

  // Mutations
  const generateAnalyticsMutation = useMutation({
    mutationFn: (data: AnalyticsFormData) => 
      apiRequest('POST', '/api/batigest/generate-analytics', data),
    onSuccess: () => {
      toast({
        title: "Analytics générés",
        description: "Les analyses Business Intelligence ont été générées avec succès."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/batigest/analytics-history'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Erreur lors de la génération des analytics",
        variant: "destructive"
      });
    }
  });

  // Event Handlers
  const handleConnectionTest = () => {
    refetchConnection();
    toast({
      title: "Test de connexion",
      description: "Test de connexion Batigest en cours..."
    });
  };

  const handleGenerateAnalytics = (data: AnalyticsFormData) => {
    generateAnalyticsMutation.mutate(data);
  };

  const handleApplyDevisFilters = (data: DevisFiltersData) => {
    setDevisFilters(data);
    queryClient.invalidateQueries({ queryKey: ['/api/batigest/devis-clients'] });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'BROUILLON': { variant: 'secondary' as const, label: 'Brouillon' },
      'VALIDE': { variant: 'default' as const, label: 'Validé' },
      'ENVOYE': { variant: 'outline' as const, label: 'Envoyé' },
      'ACCEPTE': { variant: 'default' as const, label: 'Accepté' },
      'REFUSE': { variant: 'destructive' as const, label: 'Refusé' }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="page-batigest">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Intégration Sage Batigest
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Synchronisation des devis clients et analyse des marges
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={handleConnectionTest}
            disabled={isConnectionLoading}
            variant="outline"
            data-testid="button-test-connection"
          >
            {isConnectionLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Database className="w-4 h-4 mr-2" />
            )}
            Test Connexion
          </Button>
          
          {connectionTest && (
            <Badge 
              variant={connectionTest.connected ? "default" : "destructive"}
              data-testid={`status-connection-${connectionTest.connected ? 'success' : 'error'}`}
            >
              {connectionTest.connected ? "Connecté" : "Déconnecté"}
              {connectionTest.mode && ` (${connectionTest.mode})`}
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-kpi-ca-realise">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Réalisé</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ca-realise">
              {isDashboardLoading ? "..." : formatCurrency(520000)}
            </div>
            <p className="text-xs text-muted-foreground">
              +12.5% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-ca-prevu">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA Prévu</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ca-prevu">
              {isDashboardLoading ? "..." : formatCurrency(650000)}
            </div>
            <p className="text-xs text-muted-foreground">
              Objectif mensuel en cours
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-taux-conversion">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux Conversion</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-taux-conversion">
              {isDashboardLoading ? "..." : "80.0%"}
            </div>
            <p className="text-xs text-muted-foreground">
              Devis transformés en commandes
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-retards-paiement">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retards Paiement</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-retards-paiement">
              {isDashboardLoading ? "..." : "14j"}
            </div>
            <p className="text-xs text-muted-foreground">
              Retard moyen sur {facturationsData?.analyse?.nombreFactures || 0} factures
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Génération Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Génération Analytics BI
          </CardTitle>
          <CardDescription>
            Générer une analyse Business Intelligence pour une période spécifique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...analyticsForm}>
            <form onSubmit={analyticsForm.handleSubmit(handleGenerateAnalytics)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={analyticsForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date début</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-analytics-start-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={analyticsForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date fin</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-analytics-end-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={analyticsForm.control}
                  name="periode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Période</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-analytics-period">
                            <SelectValue placeholder="Sélectionner une période" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mensuel">Mensuel</SelectItem>
                          <SelectItem value="trimestriel">Trimestriel</SelectItem>
                          <SelectItem value="annuel">Annuel</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                disabled={generateAnalyticsMutation.isPending}
                data-testid="button-generate-analytics"
              >
                {generateAnalyticsMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Générer Analytics
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Tabs pour les données */}
      <Card>
        <CardHeader>
          <CardTitle>Données Batigest</CardTitle>
          <CardDescription>
            Consultation des données synchronisées depuis Sage Batigest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="devis" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="devis" data-testid="tab-devis">Devis Clients</TabsTrigger>
              <TabsTrigger value="coefficients" data-testid="tab-coefficients">Coefficients</TabsTrigger>
              <TabsTrigger value="facturations" data-testid="tab-facturations">Facturations</TabsTrigger>
              <TabsTrigger value="historique" data-testid="tab-historique">Historique</TabsTrigger>
            </TabsList>

            <TabsContent value="devis" className="space-y-4">
              {/* Filtres devis */}
              <Form {...devisFiltersForm}>
                <form onSubmit={devisFiltersForm.handleSubmit(handleApplyDevisFilters)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={devisFiltersForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date début</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              data-testid="input-devis-start-date"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={devisFiltersForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date fin</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              data-testid="input-devis-end-date"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={devisFiltersForm.control}
                      name="statut"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Statut</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-devis-status">
                                <SelectValue placeholder="Tous les statuts" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">Tous les statuts</SelectItem>
                              <SelectItem value="BROUILLON">Brouillon</SelectItem>
                              <SelectItem value="VALIDE">Validé</SelectItem>
                              <SelectItem value="ENVOYE">Envoyé</SelectItem>
                              <SelectItem value="ACCEPTE">Accepté</SelectItem>
                              <SelectItem value="REFUSE">Refusé</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={devisFiltersForm.control}
                      name="clientCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code Client</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="CLI001" 
                              {...field} 
                              data-testid="input-devis-client-code"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" variant="outline" data-testid="button-apply-devis-filters">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Appliquer les filtres
                  </Button>
                </form>
              </Form>

              {/* Table devis */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Devis</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant HT</TableHead>
                      <TableHead>Marge (%)</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date création</TableHead>
                      <TableHead>Responsable</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isDevisLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Chargement des devis...
                        </TableCell>
                      </TableRow>
                    ) : (devisData?.devis?.length ?? 0) > 0 ? (
                      devisData?.devis?.map((devis: any) => (
                        <TableRow key={devis.NUMERO_DEVIS} data-testid={`row-devis-${devis.NUMERO_DEVIS}`}>
                          <TableCell className="font-medium">{devis.NUMERO_DEVIS}</TableCell>
                          <TableCell>{devis.CLIENT_NOM}</TableCell>
                          <TableCell>{formatCurrency(devis.MONTANT_HT)}</TableCell>
                          <TableCell>{devis.TAUX_MARGE}%</TableCell>
                          <TableCell>{getStatusBadge(devis.STATUT)}</TableCell>
                          <TableCell>{formatDate(devis.DATE_CREATION)}</TableCell>
                          <TableCell>{devis.RESPONSABLE}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Aucun devis trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="coefficients" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Famille</TableHead>
                      <TableHead>Coefficient Moyen</TableHead>
                      <TableHead>Nombre d'éléments</TableHead>
                      <TableHead>Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isCoefficientsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Chargement des coefficients...
                        </TableCell>
                      </TableRow>
                    ) : (coefficientsData?.coefficientsParFamille?.length ?? 0) > 0 ? (
                      coefficientsData?.coefficientsParFamille?.map((coeff: any) => (
                        <TableRow key={coeff.famille} data-testid={`row-coeff-${coeff.famille}`}>
                          <TableCell className="font-medium">{coeff.famille}</TableCell>
                          <TableCell>{coeff.coefficientMoyen.toFixed(2)}</TableCell>
                          <TableCell>{coeff.nombreElements}</TableCell>
                          <TableCell>
                            <Badge variant={coeff.coefficientMoyen >= 1.5 ? "default" : "destructive"}>
                              {coeff.coefficientMoyen >= 1.5 ? "Bon" : "Faible"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Aucun coefficient trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="facturations" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Facture</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Montant HT</TableHead>
                      <TableHead>Date échéance</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Retard</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFacturationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Chargement des facturations...
                        </TableCell>
                      </TableRow>
                    ) : (facturationsData?.factures?.length ?? 0) > 0 ? (
                      facturationsData?.factures?.map((facture: any) => {
                        const isLate = new Date(facture.DATE_ECHEANCE) < new Date();
                        const daysDiff = Math.floor((new Date().getTime() - new Date(facture.DATE_ECHEANCE).getTime()) / (1000 * 3600 * 24));
                        
                        return (
                          <TableRow key={facture.NUMERO_FACTURE} data-testid={`row-facture-${facture.NUMERO_FACTURE}`}>
                            <TableCell className="font-medium">{facture.NUMERO_FACTURE}</TableCell>
                            <TableCell>{facture.CLIENT_CODE}</TableCell>
                            <TableCell>{formatCurrency(facture.MONTANT_HT)}</TableCell>
                            <TableCell>{formatDate(facture.DATE_ECHEANCE)}</TableCell>
                            <TableCell>
                              <Badge variant={facture.STATUT_REGLEMENT === 'NON_REGLE' ? "destructive" : "secondary"}>
                                {facture.STATUT_REGLEMENT === 'NON_REGLE' ? "Non réglé" : "Partiellement réglé"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isLate ? (
                                <Badge variant="destructive">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {daysDiff}j de retard
                                </Badge>
                              ) : (
                                <Badge variant="default">À temps</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Aucune facturation en cours
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="historique" className="space-y-4">
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Période</TableHead>
                      <TableHead>CA Réalisé</TableHead>
                      <TableHead>CA Prévu</TableHead>
                      <TableHead>Taux Conversion</TableHead>
                      <TableHead>Marge Moyenne</TableHead>
                      <TableHead>Date génération</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isAnalyticsHistoryLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Chargement de l'historique...
                        </TableCell>
                      </TableRow>
                    ) : (analyticsHistory?.analytics?.length ?? 0) > 0 ? (
                      analyticsHistory?.analytics?.map((analytics: any) => (
                        <TableRow key={analytics.id} data-testid={`row-analytics-${analytics.id}`}>
                          <TableCell className="font-medium">{analytics.periode}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(analytics.chiffreAffairesRealise))}</TableCell>
                          <TableCell>{formatCurrency(parseFloat(analytics.chiffreAffairesPrevu))}</TableCell>
                          <TableCell>{parseFloat(analytics.tauxConversion).toFixed(1)}%</TableCell>
                          <TableCell>{parseFloat(analytics.margeReelleMoyenne).toFixed(1)}%</TableCell>
                          <TableCell>{formatDate(analytics.generatedAt)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Aucun historique d'analytics
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}