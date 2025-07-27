import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  TrendingUp, 
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function WorkloadPlanner() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');

  // Fetch BE workload data
  const { data: beWorkload = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/be-workload/'],
  });

  // Fetch users to display team members
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users/'],
  });

  const getWorkloadLevel = (loadPercentage: number) => {
    if (loadPercentage < 80) return { level: 'low', color: 'text-green-600', bg: 'bg-green-100' };
    if (loadPercentage < 100) return { level: 'medium', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { level: 'high', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const getWorkloadLabel = (loadPercentage: number) => {
    if (loadPercentage < 80) return 'Disponible';
    if (loadPercentage < 100) return 'Occupé';
    return 'Surchargé';
  };

  const currentWeek = new Date();
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  // Calculate team statistics
  const teamStats = {
    totalMembers: users.filter((user: any) => ['responsable_be', 'technicien_be'].includes(user.role)).length,
    overloaded: beWorkload.filter((w: any) => parseFloat(w.loadPercentage) > 100).length,
    available: beWorkload.filter((w: any) => parseFloat(w.loadPercentage) < 80).length,
    avgLoad: beWorkload.length > 0 
      ? beWorkload.reduce((acc: number, w: any) => acc + parseFloat(w.loadPercentage), 0) / beWorkload.length 
      : 0
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Planificateur de Charge BE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Équipe BE</p>
                <p className="text-2xl font-bold">{teamStats.totalMembers}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Surchargés</p>
                <p className="text-2xl font-bold text-red-600">{teamStats.overloaded}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disponibles</p>
                <p className="text-2xl font-bold text-green-600">{teamStats.available}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Charge Moyenne</p>
                <p className="text-2xl font-bold">{Math.round(teamStats.avgLoad)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workload Planning */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Planification des Charges BE
            </CardTitle>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="week">Hebdomadaire</TabsTrigger>
                <TabsTrigger value="month">Mensuel</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-sm text-gray-600">
            Semaine du {format(weekStart, 'dd/MM', { locale: fr })} au {format(weekEnd, 'dd/MM/yyyy', { locale: fr })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {beWorkload.map((workload: any) => {
              const loadLevel = getWorkloadLevel(parseFloat(workload.loadPercentage));
              
              return (
                <div key={workload.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={workload.user?.profileImageUrl} />
                        <AvatarFallback>
                          {workload.user?.firstName?.[0]}{workload.user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">
                          {workload.user?.firstName} {workload.user?.lastName}
                        </h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {workload.user?.role?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${loadLevel.bg} ${loadLevel.color} border-0`}>
                      {getWorkloadLabel(parseFloat(workload.loadPercentage))}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Charge: {workload.actualHours}h / {workload.capacityHours}h</span>
                      <span className={loadLevel.color}>
                        {Math.round(parseFloat(workload.loadPercentage))}%
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(parseFloat(workload.loadPercentage), 100)} 
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Planifié: {workload.plannedHours}h</span>
                      <span>Réalisé: {workload.actualHours}h</span>
                    </div>
                  </div>

                  {parseFloat(workload.loadPercentage) > 100 && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Surcharge détectée - Redistribution recommandée</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {beWorkload.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune donnée de charge BE disponible</p>
              <p className="text-sm">Les données de workload apparaîtront ici une fois configurées</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {teamStats.overloaded > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800">Recommandations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-orange-700">
              <p>• {teamStats.overloaded} membre(s) en surcharge détecté(s)</p>
              <p>• Considérer une redistribution des tâches vers les membres disponibles</p>
              <p>• Évaluer l'ajout de ressources temporaires si nécessaire</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}