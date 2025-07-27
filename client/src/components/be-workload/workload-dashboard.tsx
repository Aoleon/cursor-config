import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, TrendingUp, Clock, Users } from "lucide-react";

// Composant pour résoudre le problème majeur identifié dans l'audit JLM :
// "Aucune mesure de charge BE : Le BE ignore son propre WIP vs capacité"

export default function WorkloadDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());

  const { data: workloadData = [], isLoading } = useQuery({
    queryKey: ["/api/be-workload", selectedWeek],
    enabled: !!user,
  });

  const { data: beMembers = [] } = useQuery({
    queryKey: ["/api/users?role=responsable_be,technicien_be"],
    enabled: !!user,
  });

  // Type the workload data
  const typedWorkloadData = (workloadData as any[]) || [];

  const updateWorkloadMutation = useMutation({
    mutationFn: async (data: { userId: string; weekNumber: number; year: number; plannedHours: number; actualHours: number }) => {
      await apiRequest("POST", "/api/be-workload", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/be-workload"] });
      toast({
        title: "Succès",
        description: "Charge BE mise à jour",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la charge",
        variant: "destructive",
      });
    },
  });

  function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  function getLoadStatus(loadPercentage: number) {
    if (loadPercentage <= 80) return { status: "Disponible", color: "bg-green-100 text-green-800", icon: Users };
    if (loadPercentage <= 100) return { status: "Occupé", color: "bg-yellow-100 text-yellow-800", icon: Clock };
    return { status: "Surchargé", color: "bg-red-100 text-red-800", icon: AlertTriangle };
  }

  function getWeeklyStats() {
    const totalCapacity = typedWorkloadData.reduce((sum: number, item: any) => sum + parseFloat(item.capacityHours || 0), 0);
    const totalPlanned = typedWorkloadData.reduce((sum: number, item: any) => sum + parseFloat(item.plannedHours || 0), 0);
    const averageLoad = typedWorkloadData.length > 0 ? totalPlanned / totalCapacity * 100 : 0;
    const overloadedMembers = typedWorkloadData.filter((item: any) => parseFloat(item.loadPercentage || 0) > 100).length;

    return {
      totalCapacity: totalCapacity.toFixed(1),
      totalPlanned: totalPlanned.toFixed(1),
      averageLoad: averageLoad.toFixed(1),
      overloadedMembers,
      efficiency: totalCapacity > 0 ? ((totalPlanned / totalCapacity) * 100).toFixed(1) : "0",
    };
  }

  const weeklyStats = getWeeklyStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacité Totale</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.totalCapacity}h</div>
            <p className="text-xs text-muted-foreground">
              Semaine {selectedWeek}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Charge Planifiée</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.totalPlanned}h</div>
            <p className="text-xs text-muted-foreground">
              {weeklyStats.efficiency}% d'efficacité
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Charge Moyenne</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{weeklyStats.averageLoad}%</div>
            <p className="text-xs text-muted-foreground">
              Objectif ≤ 90%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surcharge</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{weeklyStats.overloadedMembers}</div>
            <p className="text-xs text-muted-foreground">
              {workloadData.length > 0 ? `sur ${workloadData.length} membres` : "Aucune donnée"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contrôles de navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Charge BE - Semaine {selectedWeek}</CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
              >
                ← Précédente
              </Button>
              <Input
                type="number"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value) || 1)}
                className="w-20 text-center"
                min={1}
                max={53}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedWeek(Math.min(53, selectedWeek + 1))}
              >
                Suivante →
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {typedWorkloadData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Aucune donnée de charge pour cette semaine.</p>
                <p className="text-sm">Ajoutez des données pour suivre la charge BE.</p>
              </div>
            ) : (
              typedWorkloadData.map((member: any) => {
                const loadPercentage = parseFloat(member.loadPercentage || 0);
                const { status, color, icon: StatusIcon } = getLoadStatus(loadPercentage);

                return (
                  <div key={member.userId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div>
                          <h4 className="font-medium">{member.user?.firstName} {member.user?.lastName}</h4>
                          <p className="text-sm text-gray-500">{member.user?.role}</p>
                        </div>
                      </div>
                      <Badge className={color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Charge: {member.plannedHours}h / {member.capacityHours}h</span>
                        <span className={loadPercentage > 100 ? "text-red-600 font-medium" : ""}>
                          {loadPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(loadPercentage, 100)} 
                        className="h-2"
                        aria-label={`Charge de ${member.user?.firstName}: ${loadPercentage.toFixed(1)}%`}
                      />
                      {loadPercentage > 100 && (
                        <div className="text-xs text-red-600">
                          Surcharge de {(loadPercentage - 100).toFixed(1)}%
                        </div>
                      )}
                    </div>

                    {member.actualHours && (
                      <div className="mt-2 text-sm text-gray-600">
                        Réalisé: {member.actualHours}h
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alertes et recommandations */}
      {weeklyStats.overloadedMembers > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Alerte Surcharge BE
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-700">
              <p className="mb-2">
                <strong>{weeklyStats.overloadedMembers}</strong> membre(s) en surcharge cette semaine.
              </p>
              <div className="text-sm space-y-1">
                <p>• Reporter des AO moins prioritaires</p>
                <p>• Redistribuer la charge vers les membres disponibles</p>
                <p>• Évaluer la capacité externe (freelance)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}