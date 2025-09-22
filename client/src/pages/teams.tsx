import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, User, Mail, Calendar } from "lucide-react";

export default function Teams() {
  const { toast } = useToast();
  // Authentication temporarily disabled for development
  const { data: projects = [], isLoading: projectsLoading, error } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Extract unique team members from projects
  const teamMembers = projects.reduce((acc: any[], project: any) => {
    if (project.responsibleUser) {
      const existingMember = acc.find((member: any) => member.id === project.responsibleUser.id);
      if (existingMember) {
        existingMember.projects.push(project);
      } else {
        acc.push({
          ...project.responsibleUser,
          projects: [project]
        });
      }
    }
    return acc;
  }, []);

  const getWorkloadLevel = (projectCount: number) => {
    if (projectCount === 0) return { level: "Disponible", color: "bg-success/10 text-success", percentage: 0 };
    if (projectCount <= 2) return { level: "Disponible", color: "bg-success/10 text-success", percentage: 30 };
    if (projectCount <= 4) return { level: "Occupé", color: "bg-warning/10 text-warning", percentage: 70 };
    return { level: "Surchargé", color: "bg-error/10 text-error", percentage: 100 };
  };

  return (
    <>
      <Header 
        title="Gestion des Équipes"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Équipes" }
        ]}
        actions={[
          {
            label: "Ajouter Membre",
            variant: "default",
            icon: "plus"
          }
        ]}
      />
        
        <div className="px-6 py-6 space-y-6">
          {/* Team Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">Membres d'Équipe</p>
                    <p className="text-3xl font-bold text-on-surface">{teamMembers.length}</p>
                  </div>
                  <Users className="w-12 h-12 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">Disponibles</p>
                    <p className="text-3xl font-bold text-success">
                      {teamMembers.filter((member: any) => member.projects.length <= 2).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">Occupés</p>
                    <p className="text-3xl font-bold text-warning">
                      {teamMembers.filter((member: any) => member.projects.length > 2 && member.projects.length <= 4).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-on-surface-muted">Surchargés</p>
                    <p className="text-3xl font-bold text-error">
                      {teamMembers.filter((member: any) => member.projects.length > 4).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-error" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members List */}
          <Card>
            <CardHeader>
              <CardTitle>Membres de l'Équipe</CardTitle>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">Aucun membre d'équipe trouvé.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMembers.map((member: any) => {
                    const workload = getWorkloadLevel(member.projects.length);
                    
                    return (
                      <div key={member.id} className="border rounded-lg p-6 hover:bg-surface-muted transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="w-12 h-12">
                              <AvatarImage src={member.profileImageUrl} alt={`${member.firstName} ${member.lastName}`} />
                              <AvatarFallback>
                                {`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div>
                              <h3 className="text-lg font-medium text-on-surface">
                                {member.firstName} {member.lastName}
                              </h3>
                              {member.email && (
                                <div className="flex items-center space-x-2 text-sm text-on-surface-muted">
                                  <Mail className="w-4 h-4" />
                                  <span>{member.email}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-2 text-sm text-on-surface-muted mt-1">
                                <Badge variant="outline">{member.role || 'Membre'}</Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <Badge className={workload.color}>
                              {workload.level}
                            </Badge>
                            <div className="mt-2 text-sm text-on-surface-muted">
                              {member.projects.length} projet{member.projects.length > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm text-on-surface-muted mb-2">
                            <span>Charge de travail</span>
                            <span>{workload.percentage}%</span>
                          </div>
                          <Progress value={workload.percentage} className="h-2" />
                        </div>
                        
                        {member.projects.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-on-surface mb-2">Projets assignés</h4>
                            <div className="space-y-2">
                              {member.projects.slice(0, 3).map((project: any) => (
                                <div key={project.id} className="flex items-center justify-between text-sm">
                                  <span className="text-on-surface-muted">{project.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {project.status}
                                  </Badge>
                                </div>
                              ))}
                              {member.projects.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{member.projects.length - 3} autres projets
                                </div>
                              )}
                            </div>
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
    </>
  );
}
