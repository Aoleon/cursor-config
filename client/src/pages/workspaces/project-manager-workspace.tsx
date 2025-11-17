import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { ActionableSummary } from "@/components/navigation/ActionableSummary";
import { 
  ClipboardList, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Plus,
  TrendingUp,
  Clock,
  FileText,
  Calculator,
  Users
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface OfferSummary {
  id: string;
  reference: string;
  client: string;
  status: string;
  montantEstime?: string;
  isPriority: boolean;
  deadline?: string;
  responsibleUser?: {
    firstName: string;
    lastName: string;
  };
}

interface ProjectSummary {
  id: string;
  name: string;
  client: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
}

interface TaskItem {
  id: string;
  type: 'validation' | 'chiffrage' | 'transformation' | 'planning';
  title: string;
  entityId: string;
  entityType: 'offer' | 'project';
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
}

export default function ProjectManagerWorkspace() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch offers assigned to current user
  const { data: myOffers = [], isLoading: offersLoading } = useQuery<OfferSummary[]>({
    queryKey: ['/api/offers', { responsibleUserId: (user as any)?.id }],
    select: (response: any) => response?.data || []
  });

  // Fetch projects assigned to current user
  const { data: myProjects = [], isLoading: projectsLoading } = useQuery<ProjectSummary[]>({
    queryKey: ['/api/projects', { responsibleUserId: (user as any)?.id }],
    select: (response: any) => response?.data || []
  });

  // Fetch tasks/actions needed
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskItem[]>({
    queryKey: ['/api/workspace/tasks', { userId: (user as any)?.id, role: 'chef_projet' }],
    select: (response: any) => response?.data || [],
    enabled: !!(user as any)?.id
  });

  // Calculate statistics
  const stats = {
    activeOffers: myOffers.filter(o => ['en_cours_chiffrage', 'en_attente_validation'].includes(o.status)).length,
    activeProjects: myProjects.filter(p => !['sav'].includes(p.status)).length,
    priorityItems: [...myOffers, ...myProjects].filter((item: any) => item.isPriority).length,
    urgentTasks: tasks.filter(t => t.priority === 'high').length
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'en_cours_chiffrage': { label: 'En chiffrage', variant: 'secondary' },
      'en_attente_validation': { label: 'En validation', variant: 'outline' },
      'valide': { label: 'Validé', variant: 'default' },
      'etude': { label: 'Étude', variant: 'secondary' },
      'planification': { label: 'Planification', variant: 'outline' },
      'approvisionnement': { label: 'Approvisionnement', variant: 'secondary' },
      'chantier': { label: 'Chantier', variant: 'default' }
    };
    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <Header 
        title="Mon Espace de Travail"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Chef de Projet" }
        ]}
        actions={[
          {
            label: "Nouvelle Offre",
            variant: "default",
            icon: "plus",
            onClick: () => setLocation("/create-offer")
          }
        ]}
      />
      
      <div className="px-6 py-6 space-y-6">
        {/* Résumé Actionnable */}
        <ActionableSummary
          title="Résumé Actionnable - Chef de Projet"
          actions={tasks
            .filter(t => t.priority === 'high')
            .map(t => ({
              id: t.id,
              label: t.title,
              description: `${t.entityType === 'offer' ? 'Offre' : 'Projet'} • ${t.dueDate ? `Échéance: ${new Date(t.dueDate).toLocaleDateString('fr-FR')}` : 'Sans échéance'}`,
              priority: t.priority,
              actionUrl: `/${t.entityType === 'offer' ? 'offers' : 'projects'}/${t.entityId}`,
              dueDate: t.dueDate
            }))}
          nextActions={tasks
            .filter(t => t.priority !== 'high')
            .slice(0, 3)
            .map(t => ({
              id: t.id,
              label: t.title,
              description: `${t.entityType === 'offer' ? 'Offre' : 'Projet'}`,
              priority: t.priority,
              actionUrl: `/${t.entityType === 'offer' ? 'offers' : 'projects'}/${t.entityId}`
            }))}
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Offres Actives</p>
                  {offersLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.activeOffers}</p>
                  )}
                </div>
                <ClipboardList className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Projets Actifs</p>
                  {projectsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.activeProjects}</p>
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
                  <p className="text-sm font-medium text-on-surface-muted">Prioritaires</p>
                  {offersLoading || projectsLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-error">{stats.priorityItems}</p>
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
                  <p className="text-sm font-medium text-on-surface-muted">Actions Urgentes</p>
                  {tasksLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-error">{stats.urgentTasks}</p>
                  )}
                </div>
                <Clock className="h-8 w-8 text-error" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks">Actions à Faire</TabsTrigger>
            <TabsTrigger value="offers">Mes Offres</TabsTrigger>
            <TabsTrigger value="projects">Mes Projets</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Actions Requises</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <SkeletonList count={3} showHeader={false} />
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucune action requise pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
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
                            {task.type === 'validation' && <CheckCircle className="h-5 w-5" />}
                            {task.type === 'chiffrage' && <Calculator className="h-5 w-5" />}
                            {task.type === 'transformation' && <ArrowRight className="h-5 w-5" />}
                            {task.type === 'planning' && <Calendar className="h-5 w-5" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-on-surface-muted">
                              {task.entityType === 'offer' ? 'Offre' : 'Projet'}
                              {task.dueDate && ` • Échéance: ${new Date(task.dueDate).toLocaleDateString('fr-FR')}`}
                            </p>
                          </div>
                          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                            {task.priority === 'high' ? 'Urgent' : task.priority === 'medium' ? 'Moyen' : 'Faible'}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/${task.entityType === 'offer' ? 'offers' : 'projects'}/${task.entityId}`)}
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

          {/* Offers Tab */}
          <TabsContent value="offers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mes Offres</CardTitle>
                <Button onClick={() => setLocation("/create-offer")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle Offre
                </Button>
              </CardHeader>
              <CardContent>
                {offersLoading ? (
                  <SkeletonList count={5} showHeader={false} />
                ) : myOffers.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucune offre assignée</p>
                    <Button className="mt-4" onClick={() => setLocation("/create-offer")}>
                      Créer une offre
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myOffers.map((offer) => (
                      <Link key={offer.id} href={`/offers/${offer.id}`}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-muted transition-colors cursor-pointer">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{offer.reference}</p>
                                {offer.isPriority && <Badge variant="destructive">Prioritaire</Badge>}
                                {getStatusBadge(offer.status)}
                              </div>
                              <p className="text-sm text-on-surface-muted">{offer.client}</p>
                              {offer.montantEstime && (
                                <p className="text-sm font-medium mt-1">{formatCurrency(parseFloat(offer.montantEstime))}</p>
                              )}
                            </div>
                            {offer.responsibleUser && (
                              <div className="flex items-center gap-2 text-sm text-on-surface-muted">
                                <Users className="h-4 w-4" />
                                {offer.responsibleUser.firstName} {offer.responsibleUser.lastName}
                              </div>
                            )}
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

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mes Projets</CardTitle>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : myProjects.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucun projet assigné</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myProjects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-surface-muted transition-colors cursor-pointer">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{project.name}</p>
                                {getStatusBadge(project.status)}
                              </div>
                              <p className="text-sm text-on-surface-muted">{project.client}</p>
                              {project.budget && (
                                <p className="text-sm font-medium mt-1">{formatCurrency(parseFloat(project.budget))}</p>
                              )}
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
        </Tabs>
      </div>
    </>
  );
}

