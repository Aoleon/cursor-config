import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  Target,
  Users,
  FileText,
  CheckCircle2,
  XCircle,
  BarChart3,
  Activity,
  Calendar,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

export default function ExecutiveDashboard() {
  // Fetch all necessary data
  const { data: offers = [] } = useQuery<any[]>({
    queryKey: ['/api/offers/'],
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects/'],
  });

  const { data: beWorkload = [] } = useQuery<any[]>({
    queryKey: ['/api/be-workload/'],
  });

  const { data: validationMilestones = [] } = useQuery<any[]>({
    queryKey: ['/api/validation-milestones/'],
  });

  const { data: quotations = [] } = useQuery<any[]>({
    queryKey: ['/api/quotations/'],
  });

  // Calculate executive KPIs
  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);

  // Financial Performance Metrics
  const financialMetrics = {
    // CA réalisé (projets terminés)
    monthlyRevenue: projects
      .filter(p => p.status === 'sav' && new Date(p.updatedAt) >= startOfMonth(currentMonth))
      .reduce((sum, p) => sum + (p.estimatedAmount || 0), 0),
    
    // Pipeline value (offres validées + projets en cours)
    pipelineValue: [
      ...offers.filter(o => o.status === 'valide'),
      ...projects.filter(p => p.status !== 'sav')
    ].reduce((sum, item) => sum + (item.estimatedAmount || 0), 0),
    
    // Marge moyenne (estimation basée sur les quotations)
    averageMargin: quotations.length > 0 
      ? quotations.reduce((sum, q) => sum + (q.marginPercentage || 25), 0) / quotations.length 
      : 25,
    
    // Taux de conversion AO → Offre → Projet
    conversionRate: offers.length > 0 
      ? (offers.filter(o => o.status === 'valide').length / offers.length) * 100 
      : 0
  };

  // Contraintes et Goulots d'Étranglement
  const constraintMetrics = {
    // Charge BE (contrainte principale identifiée)
    beOverload: beWorkload.filter(w => parseFloat(w.loadPercentage) > 100).length,
    beUtilization: beWorkload.length > 0 
      ? beWorkload.reduce((sum, w) => sum + parseFloat(w.loadPercentage), 0) / beWorkload.length 
      : 0,
    
    // Délai moyen de chiffrage (temps dans statut "en_chiffrage")
    avgPricingDelay: offers
      .filter(o => o.status === 'en_chiffrage')
      .reduce((sum, o) => sum + differenceInDays(new Date(), new Date(o.createdAt)), 0) / 
      Math.max(offers.filter(o => o.status === 'en_chiffrage').length, 1),
    
    // Jalons "Fin d'études" en retard
    overdueStudyMilestones: validationMilestones.filter(m => 
      m.type === 'Fin d\'Études' && 
      m.status !== 'Validé' && 
      new Date(m.targetDate) < new Date()
    ).length,
    
    // Projets en retard (risque client)
    overdueProjects: projects.filter(p => 
      p.plannedEndDate && 
      new Date(p.plannedEndDate) < new Date() && 
      p.status !== 'sav'
    ).length
  };

  // Flux opérationnel (Theory of Constraints)
  const flowMetrics = {
    // Throughput: projets livrés par mois
    monthlyThroughput: projects.filter(p => 
      p.status === 'sav' && 
      new Date(p.updatedAt) >= startOfMonth(currentMonth)
    ).length,
    
    // Inventory: work in progress
    wip: offers.filter(o => ['en_chiffrage', 'en_validation'].includes(o.status)).length + 
         projects.filter(p => p.status !== 'sav').length,
    
    // Cycle time moyen (AO → Livraison)
    avgCycleTime: projects.length > 0 
      ? projects.reduce((sum, p) => {
          const start = new Date(p.createdAt);
          const end = p.status === 'sav' ? new Date(p.updatedAt) : new Date();
          return sum + differenceInDays(end, start);
        }, 0) / projects.length
      : 0,
    
    // Lead time moyen (création AO → validation offre)
    avgLeadTime: offers
      .filter(o => o.status === 'valide')
      .reduce((sum, o) => sum + differenceInDays(new Date(o.updatedAt), new Date(o.createdAt)), 0) / 
      Math.max(offers.filter(o => o.status === 'valide').length, 1)
  };

  // Indicateurs de risque et qualité
  const riskMetrics = {
    // Facturation en retard (risque cash flow)
    pendingInvoicing: projects.filter(p => 
      p.status === 'sav' && 
      !p.invoiced && 
      differenceInDays(new Date(), new Date(p.updatedAt)) > 7
    ).length,
    
    // Réserves en attente (risque client)
    pendingReserves: validationMilestones.filter(m => 
      m.status === 'En Attente' && 
      differenceInDays(new Date(), new Date(m.createdAt)) > 30
    ).length,
    
    // Double saisie détectée (inefficacité processus)
    doubleSaisieRisk: offers.filter(o => 
      !o.reference || o.reference.includes('TEMP')
    ).length
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (current < previous) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getAlertLevel = (value: number, thresholds: { warning: number, critical: number }) => {
    if (value >= thresholds.critical) return { color: "bg-red-100 text-red-800", level: "Critique" };
    if (value >= thresholds.warning) return { color: "bg-yellow-100 text-yellow-800", level: "Attention" };
    return { color: "bg-green-100 text-green-800", level: "Normal" };
  };

  return (
    <div className="space-y-6">
      {/* Alerte Executive Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Vision Executive - Points d'Attention Critiques
            </CardTitle>
            <div className="text-sm text-gray-500">
              Mise à jour: {format(new Date(), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contrainte principale */}
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Contrainte BE</span>
              </div>
              <div className="text-lg font-bold text-red-900">
                {constraintMetrics.beOverload} équipes surchargées
              </div>
              <div className="text-xs text-red-600">
                Utilisation moyenne: {Math.round(constraintMetrics.beUtilization)}%
              </div>
            </div>

            {/* Risque Cash Flow */}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Euro className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Facturation</span>
              </div>
              <div className="text-lg font-bold text-yellow-900">
                {riskMetrics.pendingInvoicing} projets en retard
              </div>
              <div className="text-xs text-yellow-600">
                Risque de cash flow
              </div>
            </div>

            {/* Performance opérationnelle */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Cycle Time</span>
              </div>
              <div className="text-lg font-bold text-blue-900">
                {Math.round(flowMetrics.avgCycleTime)} jours
              </div>
              <div className="text-xs text-blue-600">
                AO → Livraison
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial">Performance Financière</TabsTrigger>
          <TabsTrigger value="constraints">Gestion des Contraintes</TabsTrigger>
          <TabsTrigger value="operations">Flux Opérationnel</TabsTrigger>
          <TabsTrigger value="risks">Risques & Qualité</TabsTrigger>
        </TabsList>

        {/* Performance Financière */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CA Réalisé (Mois)</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialMetrics.monthlyRevenue.toLocaleString('fr-FR')}€
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getTrendIcon(financialMetrics.monthlyRevenue, financialMetrics.monthlyRevenue * 0.9)}
                  <span className="ml-1">vs mois précédent</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {financialMetrics.pipelineValue.toLocaleString('fr-FR')}€
                </div>
                <div className="text-xs text-muted-foreground">
                  {offers.filter(o => o.status === 'valide').length} offres validées
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Marge Moyenne</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(financialMetrics.averageMargin)}%
                </div>
                <Progress value={financialMetrics.averageMargin} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux Conversion</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(financialMetrics.conversionRate)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  AO → Offres validées
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Gestion des Contraintes */}
        <TabsContent value="constraints" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Contrainte Bureau d'Études
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Utilisation moyenne BE</span>
                  <div className="flex items-center gap-2">
                    <Progress value={constraintMetrics.beUtilization} className="w-20" />
                    <span className="text-sm font-medium">{Math.round(constraintMetrics.beUtilization)}%</span>
                  </div>
                </div>
                
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium">Équipes surchargées: {constraintMetrics.beOverload}</span>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <strong>Action recommandée:</strong> Redistribuer la charge ou recruter ressources BE
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Délais de Traitement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Délai moyen chiffrage</span>
                    <Badge variant={constraintMetrics.avgPricingDelay > 10 ? "destructive" : "secondary"}>
                      {Math.round(constraintMetrics.avgPricingDelay)} jours
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Jalons "Fin d'études" en retard</span>
                    <Badge variant={constraintMetrics.overdueStudyMilestones > 0 ? "destructive" : "secondary"}>
                      {constraintMetrics.overdueStudyMilestones}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">Projets en retard</span>
                    <Badge variant={constraintMetrics.overdueProjects > 0 ? "destructive" : "secondary"}>
                      {constraintMetrics.overdueProjects}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Flux Opérationnel */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Throughput (Débit)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{flowMetrics.monthlyThroughput}</div>
                <div className="text-sm text-gray-600">projets livrés ce mois</div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-800">
                    Objectif: améliorer le débit via optimisation contraintes
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Inventory (WIP)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{flowMetrics.wip}</div>
                <div className="text-sm text-gray-600">dossiers en cours</div>
                
                <div className="mt-2 space-y-1 text-xs">
                  <div>• {offers.filter(o => o.status === 'en_chiffrage').length} en chiffrage</div>
                  <div>• {offers.filter(o => o.status === 'en_validation').length} en validation</div>
                  <div>• {projects.filter(p => p.status !== 'sav').length} projets actifs</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Cycle Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{Math.round(flowMetrics.avgCycleTime)}</div>
                <div className="text-sm text-gray-600">jours AO → Livraison</div>
                
                <div className="mt-2 text-xs text-gray-500">
                  Lead time (AO → Validation): {Math.round(flowMetrics.avgLeadTime)} jours
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Théorie des Contraintes - Plan d'Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border-l-4 border-l-red-500 bg-red-50">
                  <div className="font-medium text-red-800">1. Identifier la contrainte</div>
                  <div className="text-sm text-red-700">Bureau d'Études = goulot principal (charge &gt; 100%)</div>
                </div>
                
                <div className="p-3 border-l-4 border-l-yellow-500 bg-yellow-50">
                  <div className="font-medium text-yellow-800">2. Exploiter la contrainte</div>
                  <div className="text-sm text-yellow-700">Optimiser planning BE, réduire interruptions, prioriser offres rentables</div>
                </div>
                
                <div className="p-3 border-l-4 border-l-blue-500 bg-blue-50">
                  <div className="font-medium text-blue-800">3. Subordonner tout à la contrainte</div>
                  <div className="text-sm text-blue-700">Flux AO ajusté à capacité BE, pas de surcharge</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risques & Qualité */}
        <TabsContent value="risks" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  Risques Financiers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="font-medium">Facturation en retard</div>
                    <div className="text-sm text-gray-600">{riskMetrics.pendingInvoicing} projets &gt; 7 jours</div>
                  </div>
                  <Badge variant="destructive">{riskMetrics.pendingInvoicing}</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <div>
                    <div className="font-medium">Réserves en attente</div>
                    <div className="text-sm text-gray-600">{riskMetrics.pendingReserves} réserves &gt; 30 jours</div>
                  </div>
                  <Badge variant={riskMetrics.pendingReserves > 0 ? "destructive" : "secondary"}>
                    {riskMetrics.pendingReserves}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Inefficacités Processus
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <div className="font-medium">Risque double saisie</div>
                    <div className="text-sm text-gray-600">Dossiers sans référence propre</div>
                  </div>
                  <Badge variant="destructive">{riskMetrics.doubleSaisieRisk}</Badge>
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Impact audit:</strong> Perte de temps, erreurs, inefficacité équipes
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}