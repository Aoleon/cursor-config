import { useQuery } from "@tanstack/react-query";

export interface TeamMemberContract {
  id: string;
  role: string;
  weeklyHours: number;
  contractType: string;
  experienceLevel: string;
  isActive: boolean;
  joinedAt: string;
  externalMemberName?: string;
  externalMemberEmail?: string;
  hourlyRate?: number;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface TeamWithCapacity {
  id: string;
  name: string;
  description?: string;
  type: string;
  specialization?: string;
  location?: string;
  isActive: boolean;
  maxMembers: number;
  teamLeader?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: TeamMemberContract[];
  memberCount: number;
  internalMembers: number;
  externalMembers: number;
  // Capacités calculées
  totalWeeklyCapacity: number; // Total des heures contractuelles par semaine
  totalDailyCapacity: number;  // Total des heures contractuelles par jour
  availablePosteurs: number;   // Nombre de poseurs disponibles
  availableEncadrement: number; // Nombre d'encadrement disponible
}

export function useTeamsWithCapacity() {
  return useQuery({
    queryKey: ["/api/teams"],
    queryFn: async (): Promise<TeamWithCapacity[]> => {
      const response = await fetch("/api/teams");
      if (!response.ok) {
        throw new Error("Échec de récupération des équipes");
      }
      
      const teams = await response.json();
      
      // Enrichir chaque équipe avec les calculs de capacité
      return teams.map((team: any): TeamWithCapacity => {
        const activeMembers = team.members.filter((m: TeamMemberContract) => m.isActive);
        
        // Calculs de capacité
        const totalWeeklyCapacity = activeMembers.reduce((sum: number, member: TeamMemberContract) => {
          return sum + (Number(member.weeklyHours) || 35); // Défaut 35h si non spécifié
        }, 0);
        
        const totalDailyCapacity = totalWeeklyCapacity / 5; // Répartir sur 5 jours ouvrables
        
        // Compter les types de personnel
        const availablePosteurs = activeMembers.filter((m: TeamMemberContract) => 
          m.role === 'poseur' || m.role === 'aide' || m.role === 'chef_equipe'
        ).length;
        
        const availableEncadrement = activeMembers.filter((m: TeamMemberContract) => 
          m.role === 'chef_equipe' || m.role === 'responsable' || m.role === 'technicien'
        ).length;
        
        return {
          ...team,
          members: activeMembers,
          totalWeeklyCapacity,
          totalDailyCapacity,
          availablePosteurs,
          availableEncadrement,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,   // 30 minutes
  });
}

