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
import { Users, User, Mail, Calendar, Briefcase, Truck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function Teams() {
  const { toast } = useToast();
  // Authentication temporarily disabled for development
  const { data: projects = [], isLoading: projectsLoading, error } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Helper function to check if certification is expiring soon (within 30 days)
  const isExpiringInMonth = (date: string | null) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const now = new Date();
    const daysDiff = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 30 && daysDiff > 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const now = new Date();
    return expiryDate < now;
  };

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
                        
                        {/* HR Monday.com Information Section */}
                        <div className="mt-4 border-t pt-4">
                          <h4 className="text-sm font-semibold text-on-surface mb-3 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-primary" />
                            Informations RH Monday.com
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Department Type */}
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-on-surface-muted uppercase tracking-wide">Département</div>
                              <Badge 
                                variant="outline" 
                                className="bg-blue-50 text-blue-700 border-blue-200"
                                data-testid={`user-department-${member.id}`}
                              >
                                <Briefcase className="h-3 w-3 mr-1" />
                                {member.departmentType || "Non défini"}
                              </Badge>
                            </div>

                            {/* Vehicle Assigned */}
                            {member.vehicleAssigned && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-on-surface-muted uppercase tracking-wide">Véhicule</div>
                                <span 
                                  className="flex items-center gap-2 text-sm text-on-surface-muted"
                                  data-testid={`user-vehicle-${member.id}`}
                                >
                                  <Truck className="h-4 w-4" />
                                  {member.vehicleAssigned}
                                </span>
                              </div>
                            )}
                            
                            {/* Monday Personnel ID */}
                            {member.mondayPersonnelId && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-on-surface-muted uppercase tracking-wide">ID Monday.com</div>
                                <span 
                                  className="text-sm text-on-surface-muted font-mono"
                                  data-testid={`user-monday-id-${member.id}`}
                                >
                                  #{member.mondayPersonnelId}
                                </span>
                              </div>
                            )}

                            {/* Certification Expiry */}
                            {member.certificationExpiry && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium text-on-surface-muted uppercase tracking-wide">Certifications</div>
                                <span 
                                  className={`flex items-center gap-2 text-sm ${
                                    isExpired(member.certificationExpiry) 
                                      ? 'text-red-600 font-medium'
                                      : isExpiringInMonth(member.certificationExpiry) 
                                      ? 'text-orange-600 font-medium'
                                      : 'text-on-surface-muted'
                                  }`}
                                  data-testid={`user-certification-${member.id}`}
                                >
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(member.certificationExpiry), 'dd/MM/yyyy', { locale: fr })}
                                  {(isExpired(member.certificationExpiry) || isExpiringInMonth(member.certificationExpiry)) && (
                                    <AlertTriangle className="h-4 w-4" />
                                  )}
                                  {isExpired(member.certificationExpiry) && (
                                    <Badge variant="destructive" className="text-xs ml-1">Expiré</Badge>
                                  )}
                                  {isExpiringInMonth(member.certificationExpiry) && !isExpired(member.certificationExpiry) && (
                                    <Badge variant="outline" className="text-xs ml-1 bg-orange-50 text-orange-700 border-orange-200">Expire bientôt</Badge>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Competencies */}
                          {member.competencies && member.competencies.length > 0 && (
                            <div className="mt-4">
                              <div className="text-xs font-medium text-on-surface-muted uppercase tracking-wide mb-2">Compétences</div>
                              <div 
                                className="flex flex-wrap gap-1"
                                data-testid={`user-competencies-${member.id}`}
                              >
                                {member.competencies.map((comp: string, index: number) => (
                                  <Badge key={`${comp}-${index}`} variant="secondary" className="text-xs">
                                    {comp}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
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
