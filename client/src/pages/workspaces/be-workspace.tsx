import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FileText,
  User,
  Activity,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { BEWorkloadDashboard } from "@/components/analytics/BEWorkloadDashboard";
import { OperationalKpisDashboard } from "@/components/analytics/OperationalKpisDashboard";
import { FinEtudesValidation } from "@/components/validation/FinEtudesValidation";
import { ActionableSummary } from "@/components/navigation/ActionableSummary";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { Link } from "wouter";

interface ValidationTask {
  id: string;
  offerId: string;
  offerReference: string;
  client: string;
  type: 'fin_etudes' | 'be_validation';
  priority: 'high' | 'medium' | 'low';
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface WorkloadItem {
  userId: string;
  userName: string;
  loadPercentage: string;
  assignedOffers: number;
  department: string;
}

export default function BEWorkspace() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch validation tasks
  const { data: validationTasks = [], isLoading: tasksLoading } = useQuery<ValidationTask[]>({
    queryKey: ['/api/workspace/be/validation-tasks', { userId: (user as any)?.id }],
    select: (response: any) => response?.data || [],
    enabled: !!(user as any)?.id
  });

  // Fetch BE workload
  const { data: beWorkload = [], isLoading: workloadLoading } = useQuery<WorkloadItem[]>({
    queryKey: ['/api/analytics/be-workload'],
    select: (response: any) => response?.data || []
  });

  // Calculate statistics
  const stats = {
    pendingValidations: validationTasks.filter(t => t.status === 'pending').length,
    urgentValidations: validationTasks.filter(t => t.priority === 'high' && t.status === 'pending').length,
    myWorkload: beWorkload.find(w => w.userId === (user as any)?.id)?.loadPercentage || '0',
    overloadedUsers: beWorkload.filter(w => parseFloat(w.loadPercentage) > 100).length
  };

  const myWorkloadValue = parseFloat(stats.myWorkload);

  return (
    <>
      <Header 
        title="Espace Bureau d'Études"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Bureau d'Études" }
        ]}
      />
      
      <div className="px-6 py-6 space-y-6">
        {/* Résumé Actionnable */}
        <ActionableSummary
          title="Résumé Actionnable - Bureau d'Études"
          actions={validationTasks
            .filter(t => t.priority === 'high' && t.status === 'pending')
            .map(t => ({
              id: t.id,
              label: `${t.type === 'fin_etudes' ? 'Fin d\'études' : 'Validation BE'} - ${t.offerReference}`,
              description: t.client,
              priority: t.priority,
              actionUrl: `/offers/${t.offerId}`,
              dueDate: t.deadline
            }))}
          milestones={validationTasks
            .filter(t => t.status !== 'completed')
            .map(t => ({
              id: t.id,
              label: `${t.type === 'fin_etudes' ? 'Fin d\'études' : 'Validation BE'} - ${t.offerReference}`,
              status: t.status === 'pending' ? 'pending' : 'in_progress' as const
            }))}
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Validations en Attente</p>
                  {tasksLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.pendingValidations}</p>
                  )}
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Urgentes</p>
                  {tasksLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-error">{stats.urgentValidations}</p>
                  )}
                </div>
                <AlertTriangle className="h-8 w-8 text-error" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-on-surface-muted mb-2">Ma Charge</p>
                  {workloadLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{Math.round(myWorkloadValue)}%</p>
                      <Progress 
                        value={myWorkloadValue} 
                        className="mt-2"
                        style={{
                          backgroundColor: myWorkloadValue > 100 ? 'var(--error)' : 
                                         myWorkloadValue > 80 ? 'var(--warning)' : 
                                         'var(--primary)'
                        }}
                      />
                    </>
                  )}
                </div>
                <Activity className="h-8 w-8 text-primary ml-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-on-surface-muted">Surchargés</p>
                  {workloadLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-error">{stats.overloadedUsers}</p>
                  )}
                </div>
                <User className="h-8 w-8 text-error" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="validations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="validations">Validations</TabsTrigger>
            <TabsTrigger value="workload">Charge BE</TabsTrigger>
            <TabsTrigger value="kpis">KPIs</TabsTrigger>
          </TabsList>

          {/* Validations Tab */}
          <TabsContent value="validations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Validations Requises</CardTitle>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <SkeletonList count={3} showHeader={false} />
                ) : validationTasks.length === 0 ? (
                  <div className="text-center py-8 text-on-surface-muted">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p>Aucune validation requise pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {validationTasks
                      .filter(t => t.status === 'pending')
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
                              {task.type === 'fin_etudes' ? <CheckCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">
                                {task.type === 'fin_etudes' ? 'Fin d\'études' : 'Validation BE'} - {task.offerReference}
                              </p>
                              <p className="text-sm text-on-surface-muted">{task.client}</p>
                              {task.deadline && (
                                <p className="text-xs text-on-surface-muted mt-1">
                                  Échéance: {new Date(task.deadline).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                            </div>
                            <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                              {task.priority === 'high' ? 'Urgent' : task.priority === 'medium' ? 'Moyen' : 'Faible'}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/offers/${task.offerId}`)}
                          >
                            Valider <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Workload Tab */}
          <TabsContent value="workload" className="space-y-4">
            <BEWorkloadDashboard />
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

