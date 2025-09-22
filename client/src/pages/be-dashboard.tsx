import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Clock, 
  User, 
  TrendingUp, 
  Calendar,
  CheckCircle2,
  BarChart3,
  Activity
} from "lucide-react";
import WorkloadPlanner from "@/components/projects/workload-planner";
import MilestoneTracker from "@/components/validation/milestone-tracker";

export default function BEDashboard() {
  // Fetch BE workload data for overview
  const { data: beWorkload = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/be-workload/'],
  });

  // Fetch offers data for BE statistics
  const { data: offers = [] } = useQuery<any[]>({
    queryKey: ['/api/offers/'],
  });

  // Calculate BE statistics
  const beStats = {
    totalOffers: offers.length,
    inProgress: offers.filter((offer: any) => offer.status === 'en_chiffrage').length,
    priority: offers.filter((offer: any) => offer.isPriority).length,
    overloaded: beWorkload.filter((w: any) => parseFloat(w.loadPercentage) > 100).length,
    avgWorkload: beWorkload.length > 0 
      ? Math.round(beWorkload.reduce((acc: number, w: any) => acc + parseFloat(w.loadPercentage), 0) / beWorkload.length)
      : 0
  };

  return (
    <>
        <Header 
          title="Tableau de Bord Bureau d'Études"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Bureau d'Études" }
          ]}
          actions={[
            {
              label: "Rapport",
              variant: "outline",
              icon: "file"
            }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">Offres BE</p>
                    <p className="text-2xl font-bold">{beStats.totalOffers}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">En Chiffrage</p>
                    <p className="text-2xl font-bold text-warning">{beStats.inProgress}</p>
                  </div>
                  <Clock className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">Prioritaires</p>
                    <p className="text-2xl font-bold text-error">{beStats.priority}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-error" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">Surchargés</p>
                    <p className="text-2xl font-bold text-error">{beStats.overloaded}</p>
                  </div>
                  <User className="h-8 w-8 text-error" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">Charge Moy.</p>
                    <p className="text-2xl font-bold">{beStats.avgWorkload}%</p>
                  </div>
                  <Activity className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="workload" className="space-y-4">
            <TabsList>
              <TabsTrigger value="workload">Charge de Travail</TabsTrigger>
              <TabsTrigger value="offers">Offres Prioritaires</TabsTrigger>
              <TabsTrigger value="milestones">Jalons BE</TabsTrigger>
            </TabsList>

            <TabsContent value="workload" className="space-y-4">
              <WorkloadPlanner />
            </TabsContent>

            <TabsContent value="offers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-error" />
                    Offres Prioritaires BE
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {offers.filter((offer: any) => offer.isPriority).map((offer: any) => (
                      <div key={offer.id} className="border rounded-lg p-4 bg-red-50 border-red-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-red-100 text-red-800 border-0">
                              PRIORITÉ
                            </Badge>
                            <h4 className="font-medium">{offer.reference}</h4>
                          </div>
                          <Badge variant="outline">{offer.status}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Client:</span>
                            <p className="font-medium">{offer.client}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Montant:</span>
                            <p className="font-medium">€{Number(offer.estimatedAmount).toLocaleString('fr-FR')}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Responsable:</span>
                            <p className="font-medium">
                              {offer.responsibleUser?.firstName} {offer.responsibleUser?.lastName}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {offers.filter((offer: any) => offer.isPriority).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune offre prioritaire actuellement</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milestones" className="space-y-4">
              <MilestoneTracker />
            </TabsContent>
          </Tabs>
        </div>
    </>
  );
}