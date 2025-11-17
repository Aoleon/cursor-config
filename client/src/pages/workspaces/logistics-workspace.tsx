import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Truck, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  MapPin,
  Package,
  ArrowRight
} from "lucide-react";
import { ActionableSummary } from "@/components/navigation/ActionableSummary";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { Link } from "wouter";

interface DeliveryTask {
  id: string;
  projectId?: string;
  projectName?: string;
  scheduledDate: string;
  status: 'planned' | 'in_transit' | 'delivered' | 'delayed';
  priority: 'high' | 'medium' | 'low';
  location?: string;
}

interface UnloadingSlot {
  id: string;
  date: string;
  timeSlot: string;
  status: 'available' | 'reserved' | 'completed';
  projectId?: string;
  projectName?: string;
}

interface ReceptionTask {
  id: string;
  projectId?: string;
  projectName?: string;
  expectedDate: string;
  status: 'pending' | 'received' | 'delayed';
  priority: 'high' | 'medium' | 'low';
}

export default function LogisticsWorkspace() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch today's deliveries
  const { data: todayDeliveries = [], isLoading: deliveriesLoading } = useQuery<DeliveryTask[]>({
    queryKey: ['/api/logistics/deliveries', { date: new Date().toISOString().split('T')[0] }],
    select: (response: any) => response?.data || []
  });

  // Fetch upcoming unloading slots
  const { data: upcomingSlots = [], isLoading: slotsLoading } = useQuery<UnloadingSlot[]>({
    queryKey: ['/api/logistics/unloading-slots', { upcoming: true }],
    select: (response: any) => response?.data || []
  });

  // Fetch pending receptions
  const { data: pendingReceptions = [], isLoading: receptionsLoading } = useQuery<ReceptionTask[]>({
    queryKey: ['/api/logistics/receptions', { status: 'pending' }],
    select: (response: any) => response?.data || []
  });

  // Calculate statistics
  const stats = {
    todayDeliveries: todayDeliveries.length,
    delayedDeliveries: todayDeliveries.filter(d => d.status === 'delayed').length,
    upcomingSlots: upcomingSlots.filter(s => s.status === 'reserved').length,
    pendingReceptions: pendingReceptions.filter(r => r.status === 'pending').length
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'planned': { label: 'Planifiée', variant: 'outline' },
      'in_transit': { label: 'En transit', variant: 'default' },
      'delivered': { label: 'Livrée', variant: 'secondary' },
      'delayed': { label: 'Retardée', variant: 'destructive' },
      'available': { label: 'Disponible', variant: 'secondary' },
      'reserved': { label: 'Réservé', variant: 'default' },
      'completed': { label: 'Terminé', variant: 'secondary' },
      'pending': { label: 'En attente', variant: 'outline' },
      'received': { label: 'Reçue', variant: 'secondary' }
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Header 
        title="Espace Logistique"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Logistique" }
        ]}
        actions={[
          {
            label: "Nouvelle Livraison",
            variant: "default",
            icon: "plus",
            onClick: () => setLocation("/logistics")
          }
        ]}
      />
      
      <div className="px-6 py-6 space-y-6">
        {/* Résumé Actionnable */}
        <ActionableSummary
          title="Résumé Actionnable - Logistique"
          actions={[
            ...todayDeliveries
              .filter(d => d.status === 'delayed' || d.priority === 'high')
              .map(d => ({
                id: d.id,
                label: `Livraison ${d.projectName || d.id.slice(0, 8)}`,
                description: d.location || 'Livraison',
                priority: d.status === 'delayed' ? 'high' : d.priority,
                actionUrl: d.projectId ? `/projects/${d.projectId}` : '/logistics',
                dueDate: d.scheduledDate
              })),
            ...pendingReceptions
              .filter(r => r.priority === 'high')
              .map(r => ({
                id: r.id,
                label: `Réception ${r.projectName || r.id.slice(0, 8)}`,
                description: `Attendue le ${new Date(r.expectedDate).toLocaleDateString('fr-FR')}`,
                priority: r.priority,
                actionUrl: r.projectId ? `/projects/${r.projectId}` : '/logistics',
                dueDate: r.expectedDate
              }))
          ]}
          risks={todayDeliveries
            .filter(d => d.status === 'delayed')
            .map(d => ({
              id: `risk-${d.id}`,
              label: `Livraison en retard: ${d.projectName || d.id.slice(0, 8)}`,
              severity: 'critical' as const,
              description: d.location ? `Localisation: ${d.location}` : undefined
            }))}
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Livraisons Aujourd'hui</p>
                  {deliveriesLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.todayDeliveries}</p>
                  )}
                </div>
                <Truck className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Retardées</p>
                  {deliveriesLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-error">{stats.delayedDeliveries}</p>
                  )}
                </div>
                <AlertTriangle className="h-8 w-8 text-error" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Créneaux à Venir</p>
                  {slotsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.upcomingSlots}</p>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Réceptions en Attente</p>
                  {receptionsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.pendingReceptions}</p>
                  )}
                </div>
                <Package className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="deliveries" className="space-y-4">
          <TabsList>
            <TabsTrigger value="deliveries">Livraisons</TabsTrigger>
            <TabsTrigger value="slots">Créneaux</TabsTrigger>
            <TabsTrigger value="receptions">Réceptions</TabsTrigger>
          </TabsList>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Livraisons du Jour</CardTitle>
                <Button onClick={() => setLocation("/logistics")}>
                  Voir tout <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardHeader>
              <CardContent>
                {deliveriesLoading ? (
                  <SkeletonList count={3} showHeader={false} />
                ) : todayDeliveries.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucune livraison prévue aujourd'hui</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayDeliveries
                      .sort((a, b) => {
                        if (a.status === 'delayed' && b.status !== 'delayed') return -1;
                        if (b.status === 'delayed' && a.status !== 'delayed') return 1;
                        if (a.priority === 'high' && b.priority !== 'high') return -1;
                        if (b.priority === 'high' && a.priority !== 'high') return 1;
                        return 0;
                      })
                      .map((delivery) => (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-2 rounded ${
                              delivery.status === 'delayed' ? 'bg-error/10 text-error' :
                              delivery.priority === 'high' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-on-surface-muted'
                            }`}>
                              <Truck className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {delivery.projectName || `Livraison #${delivery.id.slice(0, 8)}`}
                              </p>
                              {delivery.location && (
                                <p className="text-sm text-on-surface-muted flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {delivery.location}
                                </p>
                              )}
                              <p className="text-xs text-on-surface-muted mt-1">
                                {new Date(delivery.scheduledDate).toLocaleString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(delivery.status)}
                              {delivery.priority === 'high' && (
                                <Badge variant="destructive">Urgent</Badge>
                              )}
                            </div>
                          </div>
                          {delivery.projectId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/projects/${delivery.projectId}`)}
                            >
                              Projet <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Slots Tab */}
          <TabsContent value="slots" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Créneaux de Déchargement</CardTitle>
              </CardHeader>
              <CardContent>
                {slotsLoading ? (
                  <SkeletonList count={3} showHeader={false} />
                ) : upcomingSlots.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucun créneau à venir</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingSlots
                      .filter(s => s.status === 'reserved')
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className="p-2 rounded bg-primary/10 text-primary">
                              <Calendar className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {slot.projectName || `Créneau #${slot.id.slice(0, 8)}`}
                              </p>
                              <p className="text-sm text-on-surface-muted">
                                {new Date(slot.date).toLocaleDateString('fr-FR')} - {slot.timeSlot}
                              </p>
                            </div>
                            {getStatusBadge(slot.status)}
                          </div>
                          {slot.projectId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/projects/${slot.projectId}`)}
                            >
                              Projet <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Receptions Tab */}
          <TabsContent value="receptions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Réceptions en Attente</CardTitle>
              </CardHeader>
              <CardContent>
                {receptionsLoading ? (
                  <SkeletonList count={3} showHeader={false} />
                ) : pendingReceptions.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucune réception en attente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingReceptions
                      .sort((a, b) => {
                        if (a.priority === 'high' && b.priority !== 'high') return -1;
                        if (b.priority === 'high' && a.priority !== 'high') return 1;
                        return new Date(a.expectedDate).getTime() - new Date(b.expectedDate).getTime();
                      })
                      .map((reception) => (
                        <div
                          key={reception.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-2 rounded ${
                              reception.priority === 'high' ? 'bg-error/10 text-error' :
                              reception.priority === 'medium' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-on-surface-muted'
                            }`}>
                              <Package className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {reception.projectName || `Réception #${reception.id.slice(0, 8)}`}
                              </p>
                              <p className="text-sm text-on-surface-muted">
                                Attendue le {new Date(reception.expectedDate).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(reception.status)}
                              {reception.priority === 'high' && (
                                <Badge variant="destructive">Urgent</Badge>
                              )}
                            </div>
                          </div>
                          {reception.projectId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/projects/${reception.projectId}`)}
                            >
                              Projet <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

