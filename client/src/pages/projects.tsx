import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, User, Euro, Kanban, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import KanbanBoard from "@/components/projects/kanban-board";
import WorkloadPlanner from "@/components/projects/workload-planner";
import AdvancedWorkloadPlanner from "@/components/projects/advanced-workload-planner";
import TimelineView from "@/components/projects/timeline-view";

export default function Projects() {
  const { toast } = useToast();
  // Authentication temporarily disabled for development
  const { data: projects = [], isLoading: projectsLoading, error } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "etude": return "bg-blue-100 text-blue-800";
      case "planification": return "bg-yellow-100 text-yellow-800";
      case "approvisionnement": return "bg-orange-100 text-orange-800";
      case "chantier": return "bg-green-100 text-green-800";
      case "sav": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
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

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Gestion de Projets"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets" }
          ]}
          actions={[
            {
              label: "Nouveau Projet",
              variant: "default",
              icon: "plus"
            }
          ]}
        />
        
        <div className="px-6 py-6">
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Liste des Projets
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <Kanban className="h-4 w-4" />
                Vue Kanban
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Vue Timeline
              </TabsTrigger>
              <TabsTrigger value="workload" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Plan de Charge
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : projects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-500">Aucun projet trouvé.</p>
                  </CardContent>
                </Card>
              ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project: any) => (
                <Card key={project.id} className="hover:shadow-card-hover transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusLabel(project.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <User className="w-4 h-4" />
                      <span>{project.client}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{project.location}</span>
                    </div>
                    
                    {project.budget && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Euro className="w-4 h-4" />
                        <span>{Number(project.budget).toLocaleString('fr-FR')} €</span>
                      </div>
                    )}
                    
                    {project.startDate && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Début: {format(new Date(project.startDate), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    )}
                    
                    {project.endDate && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Fin: {format(new Date(project.endDate), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    )}

                    {project.responsibleUser && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {`${project.responsibleUser.firstName?.[0] || ''}${project.responsibleUser.lastName?.[0] || ''}`}
                          </span>
                        </div>
                        <span>
                          {project.responsibleUser.firstName} {project.responsibleUser.lastName}
                        </span>
                      </div>
                    )}

                    <div className="pt-2">
                      <Progress value={project.status === 'sav' ? 100 : 
                        project.status === 'chantier' ? 80 :
                        project.status === 'approvisionnement' ? 60 :
                        project.status === 'planification' ? 40 : 20} 
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
              )}
            </TabsContent>

            <TabsContent value="kanban" className="space-y-6">
              <KanbanBoard />
            </TabsContent>

            <TabsContent value="timeline" className="space-y-6">
              <TimelineView viewType="projects" />
            </TabsContent>

            <TabsContent value="workload" className="space-y-6">
              <AdvancedWorkloadPlanner />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
