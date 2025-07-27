import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { format, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

export default function Planning() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: projects, isLoading: projectsLoading, error } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  useEffect(() => {
    if (error && isUnauthorizedError(error as Error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [error, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "etude": return "bg-blue-500";
      case "planification": return "bg-yellow-500";
      case "approvisionnement": return "bg-orange-500";
      case "chantier": return "bg-green-500";
      case "sav": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "etude": return "Étude";
      case "planification": return "Planification";
      case "approvisionnement": return "Approvisionnement";
      case "chantier": return "Chantier";
      case "sav": return "SAV";
      default: return status;
    }
  };

  const calculateProgress = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const total = differenceInDays(end, start);
    const elapsed = differenceInDays(now, start);
    
    if (elapsed < 0) return 0;
    if (elapsed > total) return 100;
    
    return Math.round((elapsed / total) * 100);
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Planning Projet"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Planning" }
          ]}
          actions={[
            {
              label: "Vue Calendrier",
              variant: "outline",
              icon: "calendar"
            },
            {
              label: "Exporter Planning",
              variant: "outline",
              icon: "download"
            }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          {/* Week Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Semaine du {format(weekStart, 'dd MMM', { locale: fr })} au {format(weekEnd, 'dd MMM yyyy', { locale: fr })}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="text-center p-2 border rounded">
                    <div className="text-sm font-medium text-gray-900">
                      {format(day, 'EEE', { locale: fr })}
                    </div>
                    <div className="text-lg font-bold text-gray-600">
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Project Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Planning des Projets</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !projects || projects.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-gray-500">Aucun projet planifié.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projects
                    .filter((project: any) => project.startDate || project.endDate)
                    .map((project: any) => {
                      const progress = calculateProgress(project.startDate, project.endDate);
                      const isOverdue = project.endDate && new Date(project.endDate) < now && progress < 100;
                      
                      return (
                        <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`w-4 h-4 rounded-full ${getStatusColor(project.status)}`}></div>
                              <h3 className="font-medium text-gray-900">{project.name}</h3>
                              <Badge variant="outline">{getStatusLabel(project.status)}</Badge>
                              {isOverdue && (
                                <Badge variant="destructive">En retard</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {progress}% complété
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              <span>{project.client}</span>
                            </div>
                            
                            {project.startDate && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>Début: {format(new Date(project.startDate), 'dd/MM/yyyy')}</span>
                              </div>
                            )}
                            
                            {project.endDate && (
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>Fin: {format(new Date(project.endDate), 'dd/MM/yyyy')}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                isOverdue ? 'bg-red-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                          
                          {project.responsibleUser && (
                            <div className="flex items-center space-x-2 mt-3 text-sm text-gray-600">
                              <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                  {`${project.responsibleUser.firstName?.[0] || ''}${project.responsibleUser.lastName?.[0] || ''}`}
                                </span>
                              </div>
                              <span>
                                Responsable: {project.responsibleUser.firstName} {project.responsibleUser.lastName}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
