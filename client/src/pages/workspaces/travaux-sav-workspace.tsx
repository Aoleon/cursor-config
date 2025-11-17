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
  HardHat, 
  Headphones, 
  AlertTriangle, 
  Calendar,
  Clock,
  MapPin,
  User,
  Truck,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import { OperationalKpisDashboard } from "@/components/analytics/OperationalKpisDashboard";
import { ActionableSummary } from "@/components/navigation/ActionableSummary";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { Link } from "wouter";

interface SavTask {
  id: string;
  type: 'demande' | 'intervention' | 'reserve' | 'materiel';
  title: string;
  projectId?: string;
  projectName?: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
  dueDate?: string;
  assignedTo?: string;
}

interface WorksiteTask {
  id: string;
  projectId: string;
  projectName: string;
  client: string;
  location: string;
  startDate?: string;
  status: string;
  priority: 'high' | 'medium' | 'low';
}

export default function TravauxSavWorkspace() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch SAV tasks
  const { data: savTasks = [], isLoading: savLoading } = useQuery<SavTask[]>({
    queryKey: ['/api/workspace/travaux/sav-tasks', { userId: (user as any)?.id }],
    select: (response: any) => response?.data || [],
    enabled: !!(user as any)?.id
  });

  // Fetch worksite tasks
  const { data: worksiteTasks = [], isLoading: worksiteLoading } = useQuery<WorksiteTask[]>({
    queryKey: ['/api/workspace/travaux/worksite-tasks', { userId: (user as any)?.id }],
    select: (response: any) => response?.data || [],
    enabled: !!(user as any)?.id
  });

  // Calculate statistics
  const stats = {
    urgentSav: savTasks.filter(t => t.priority === 'high' && !['termine', 'annule'].includes(t.status)).length,
    todaySav: savTasks.filter(t => {
      if (!t.dueDate) return false;
      const today = new Date();
      const due = new Date(t.dueDate);
      return due.toDateString() === today.toDateString();
    }).length,
    activeWorksites: worksiteTasks.filter(t => ['chantier', 'approvisionnement'].includes(t.status)).length,
    urgentWorksites: worksiteTasks.filter(t => t.priority === 'high').length
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'en_attente': { label: 'En attente', variant: 'outline' },
      'en_cours': { label: 'En cours', variant: 'default' },
      'termine': { label: 'Terminé', variant: 'secondary' },
      'chantier': { label: 'Chantier', variant: 'default' },
      'approvisionnement': { label: 'Approvisionnement', variant: 'secondary' }
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Header 
        title="Espace Travaux & SAV"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Travaux & SAV" }
        ]}
      />
      
      <div className="px-6 py-6 space-y-6">
        {/* Résumé Actionnable */}
        <ActionableSummary
          title="Résumé Actionnable - Travaux & SAV"
          actions={[
            ...savTasks
              .filter(t => t.priority === 'high' && !['termine', 'annule'].includes(t.status))
              .map(t => ({
                id: t.id,
                label: t.title,
                description: t.projectName || 'SAV',
                priority: t.priority,
                actionUrl: t.projectId ? `/projects/${t.projectId}` : '/sav',
                dueDate: t.dueDate
              })),
            ...worksiteTasks
              .filter(t => t.priority === 'high' && ['chantier', 'approvisionnement'].includes(t.status))
              .map(t => ({
                id: t.id,
                label: `Chantier ${t.projectName}`,
                description: `${t.client} - ${t.location}`,
                priority: t.priority,
                actionUrl: `/projects/${t.projectId}`
              }))
          ]}
          risks={[
            ...savTasks
              .filter(t => {
                if (!t.dueDate || ['termine', 'annule'].includes(t.status)) return false;
                const due = new Date(t.dueDate);
                const today = new Date();
                const daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return daysDiff <= 1 && daysDiff >= 0;
              })
              .map(t => ({
                id: `risk-${t.id}`,
                label: `SAV échéance imminente: ${t.title}`,
                severity: 'high' as const,
                description: `Échéance: ${new Date(t.dueDate!).toLocaleDateString('fr-FR')}`
              }))
          ]}
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">SAV Urgentes</p>
                  {savLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-error">{stats.urgentSav}</p>
                  )}
                </div>
                <Headphones className="h-8 w-8 text-error" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">SAV Aujourd'hui</p>
                  {savLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.todaySav}</p>
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
                  <p className="text-sm font-medium text-on-surface-muted">Chantiers Actifs</p>
                  {worksiteLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.activeWorksites}</p>
                  )}
                </div>
                <HardHat className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Chantiers Urgents</p>
                  {worksiteLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-error">{stats.urgentWorksites}</p>
                  )}
                </div>
                <AlertTriangle className="h-8 w-8 text-error" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="sav" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sav">SAV</TabsTrigger>
            <TabsTrigger value="worksites">Chantiers</TabsTrigger>
            <TabsTrigger value="kpis">KPIs</TabsTrigger>
          </TabsList>

          {/* SAV Tab */}
          <TabsContent value="sav" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Demandes SAV</CardTitle>
                <Button onClick={() => setLocation("/sav")}>
                  Voir tout <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardHeader>
              <CardContent>
                {savLoading ? (
                  <SkeletonList count={3} showHeader={false} />
                ) : savTasks.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <Headphones className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucune demande SAV pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savTasks
                      .filter(t => !['termine', 'annule'].includes(t.status))
                      .sort((a, b) => {
                        if (a.priority === 'high' && b.priority !== 'high') return -1;
                        if (b.priority === 'high' && a.priority !== 'high') return 1;
                        return 0;
                      })
                      .map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-muted transition-colors"
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`p-2 rounded ${
                              task.priority === 'high' ? 'bg-error/10 text-error' :
                              task.priority === 'medium' ? 'bg-warning/10 text-warning' :
                              'bg-muted text-on-surface-muted'
                            }`}>
                              <Headphones className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{task.title}</p>
                              {task.projectName && (
                                <p className="text-sm text-on-surface-muted">{task.projectName}</p>
                              )}
                              {task.dueDate && (
                                <p className="text-xs text-on-surface-muted mt-1">
                                  Échéance: {new Date(task.dueDate).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(task.status)}
                              <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                                {task.priority === 'high' ? 'Urgent' : task.priority === 'medium' ? 'Moyen' : 'Faible'}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (task.projectId) {
                                setLocation(`/projects/${task.projectId}`);
                              } else {
                                setLocation("/sav");
                              }
                            }}
                          >
                            Ouvrir <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Worksites Tab */}
          <TabsContent value="worksites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chantiers Actifs</CardTitle>
              </CardHeader>
              <CardContent>
                {worksiteLoading ? (
                  <SkeletonList count={3} showHeader={false} />
                ) : worksiteTasks.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <HardHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucun chantier actif pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {worksiteTasks
                      .filter(t => ['chantier', 'approvisionnement'].includes(t.status))
                      .sort((a, b) => {
                        if (a.priority === 'high' && b.priority !== 'high') return -1;
                        if (b.priority === 'high' && a.priority !== 'high') return 1;
                        return 0;
                      })
                      .map((task) => (
                        <Link key={task.id} href={`/projects/${task.projectId}`}>
                          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-muted transition-colors cursor-pointer">
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`p-2 rounded ${
                                task.priority === 'high' ? 'bg-error/10 text-error' :
                                task.priority === 'medium' ? 'bg-warning/10 text-warning' :
                                'bg-muted text-on-surface-muted'
                              }`}>
                                <HardHat className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium">{task.projectName}</p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-on-surface-muted">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {task.location}
                                  </span>
                                  {task.startDate && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(task.startDate).toLocaleDateString('fr-FR')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(task.status)}
                                <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                                  {task.priority === 'high' ? 'Urgent' : task.priority === 'medium' ? 'Moyen' : 'Faible'}
                                </Badge>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </Link>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* KPIs Tab */}
          <TabsContent value="kpis" className="space-y-4">
            <OperationalKpisDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

