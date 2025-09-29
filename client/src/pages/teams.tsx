import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  User, 
  Mail, 
  MapPin, 
  Briefcase, 
  Clock, 
  Star, 
  Phone,
  Calendar,
  Building2,
  UserCheck,
  UserX
} from "lucide-react";

// Types pour TypeScript
type TeamMember = {
  id: string;
  role: string;
  experienceLevel: string;
  contractType: string;
  weeklyHours: number;
  isActive: boolean;
  joinedAt: string;
  skills?: string[];
  // Membre interne
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  // Membre externe
  externalMemberName?: string;
  externalMemberEmail?: string;
  externalMemberPhone?: string;
  hourlyRate?: number;
};

type Team = {
  id: string;
  name: string;
  description?: string;
  type: string;
  specialization?: string;
  location?: string;
  isActive: boolean;
  maxMembers: number;
  memberCount: number;
  internalMembers: number;
  externalMembers: number;
  teamLeader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: TeamMember[];
};

export default function Teams() {
  const { toast } = useToast();
  
  // Récupérer les équipes via la vraie API
  const { 
    data, 
    isLoading, 
    error 
  } = useQuery<Team[]>({
    queryKey: ["/api/teams"]
  });

  // Assurer le typage correct des équipes
  const teams: Team[] = data || [];

  // Gérer les erreurs avec useEffect
  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les équipes.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Calculer les statistiques globales
  const totalMembers = teams.reduce((acc, team) => acc + team.memberCount, 0);
  const totalInternalMembers = teams.reduce((acc, team) => acc + team.internalMembers, 0);
  const totalExternalMembers = teams.reduce((acc, team) => acc + team.externalMembers, 0);
  const activeTeams = teams.filter(team => team.isActive).length;

  const getExperienceBadgeColor = (level: string) => {
    switch (level) {
      case 'debutant': return 'bg-gray-100 text-gray-700';
      case 'junior': return 'bg-blue-100 text-blue-700';
      case 'confirme': return 'bg-green-100 text-green-700';
      case 'senior': return 'bg-orange-100 text-orange-700';
      case 'expert': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getContractBadgeColor = (type: string) => {
    switch (type) {
      case 'cdi': return 'bg-green-100 text-green-800';
      case 'cdd': return 'bg-yellow-100 text-yellow-800';
      case 'freelance': return 'bg-blue-100 text-blue-800';
      case 'sous_traitance': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTeamTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'pose': return 'bg-blue-100 text-blue-800';
      case 'be': return 'bg-green-100 text-green-800';
      case 'commercial': return 'bg-orange-100 text-orange-800';
      case 'support': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (error) {
    return (
      <>
        <Header 
          title="Gestion des Équipes"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Équipes" }
          ]}
        />
        <div className="px-6 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <UserX className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Erreur de chargement
                </h3>
                <p className="text-muted-foreground">
                  Impossible de charger les données des équipes. Veuillez réessayer plus tard.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

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
            label: "Nouvelle Équipe",
            variant: "default",
            icon: "plus"
          }
        ]}
      />
        
      <div className="px-6 py-6 space-y-6">
        {/* Vue d'ensemble des équipes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Équipes Actives</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="active-teams-count">
                    {activeTeams}
                  </p>
                </div>
                <Building2 className="w-12 h-12 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Membres</p>
                  <p className="text-3xl font-bold text-foreground" data-testid="total-members-count">
                    {totalMembers}
                  </p>
                </div>
                <Users className="w-12 h-12 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Internes</p>
                  <p className="text-3xl font-bold text-green-600" data-testid="internal-members-count">
                    {totalInternalMembers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Externes</p>
                  <p className="text-3xl font-bold text-blue-600" data-testid="external-members-count">
                    {totalExternalMembers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des équipes */}
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Aucune équipe trouvée
                </h3>
                <p className="text-muted-foreground">
                  Commencez par créer votre première équipe.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {teams.map((team: Team) => (
              <Card key={team.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-xl" data-testid={`team-name-${team.id}`}>
                          {team.name}
                        </CardTitle>
                        <Badge 
                          className={getTeamTypeBadgeColor(team.type)}
                          data-testid={`team-type-${team.id}`}
                        >
                          {team.type}
                        </Badge>
                        {!team.isActive && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      
                      {team.description && (
                        <p className="text-muted-foreground text-sm mb-2">
                          {team.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {team.specialization && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            <span>{team.specialization}</span>
                          </div>
                        )}
                        {team.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{team.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{team.memberCount}/{team.maxMembers} membres</span>
                        </div>
                      </div>
                    </div>
                    
                    {team.teamLeader && (
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Chef d'équipe</div>
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs">
                              {team.teamLeader.firstName[0]}{team.teamLeader.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">
                              {team.teamLeader.firstName} {team.teamLeader.lastName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {team.teamLeader.email}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {team.members && team.members.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-medium text-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Membres de l'équipe ({team.members.length})
                      </h4>
                      
                      <div className="grid gap-4">
                        {team.members.map((member: TeamMember) => (
                          <div 
                            key={member.id} 
                            className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                            data-testid={`team-member-${member.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10">
                                  <AvatarFallback>
                                    {member.user 
                                      ? `${member.user.firstName[0]}${member.user.lastName[0]}`
                                      : member.externalMemberName 
                                        ? member.externalMemberName.split(' ').map(n => n[0]).join('')
                                        : '??'
                                    }
                                  </AvatarFallback>
                                </Avatar>
                                
                                <div>
                                  <div className="font-medium text-foreground">
                                    {member.user 
                                      ? `${member.user.firstName} ${member.user.lastName}`
                                      : member.externalMemberName || 'Nom non défini'
                                    }
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="w-3 h-3" />
                                    <span>
                                      {member.user?.email || member.externalMemberEmail || 'Email non défini'}
                                    </span>
                                  </div>
                                  
                                  {member.externalMemberPhone && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Phone className="w-3 h-3" />
                                      <span>{member.externalMemberPhone}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right space-y-2">
                                <div className="flex gap-2">
                                  <Badge variant="outline">{member.role}</Badge>
                                  <Badge className={getExperienceBadgeColor(member.experienceLevel)}>
                                    {member.experienceLevel}
                                  </Badge>
                                </div>
                                <div className="flex gap-2">
                                  <Badge className={getContractBadgeColor(member.contractType)}>
                                    {member.contractType}
                                  </Badge>
                                  {member.user ? (
                                    <Badge className="bg-green-100 text-green-800">Interne</Badge>
                                  ) : (
                                    <Badge className="bg-blue-100 text-blue-800">Externe</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Separator className="my-3" />
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {member.weeklyHours}h/semaine
                                </span>
                              </div>
                              
                              {member.hourlyRate && (
                                <div className="flex items-center gap-2">
                                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {member.hourlyRate}€/h
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  Depuis {new Date(member.joinedAt).toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                            </div>
                            
                            {member.skills && member.skills.length > 0 && (
                              <div className="mt-3">
                                <div className="text-xs font-medium text-muted-foreground mb-2">Compétences</div>
                                <div className="flex flex-wrap gap-1">
                                  {member.skills.map((skill, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <User className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Cette équipe n'a pas encore de membres.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}