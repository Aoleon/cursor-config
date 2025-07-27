import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

type ViewPeriod = "1month" | "3months" | "6months" | "12months";
type TeamType = "be" | "production";

interface WeeklyLoad {
  weekStart: Date;
  weekEnd: Date;
  weekNumber: number;
  year: number;
  bePersonsNeeded: number;
  productionPersonsNeeded: number;
  beHoursPlanned: number;
  productionHoursPlanned: number;
  tasks: TaskLoad[];
}

interface TaskLoad {
  taskId: string;
  taskName: string;
  projectName: string;
  bePersonsNeeded: number;
  productionPersonsNeeded: number;
  beHoursEstimated: number;
  productionHoursEstimated: number;
  priority: string;
}

export default function ResourcePlanning() {
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("3months");
  const [selectedTeam, setSelectedTeam] = useState<TeamType>("be");

  // Récupération des tâches et projets
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks/all"],
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Calcul de la période d'affichage
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = (() => {
    switch (viewPeriod) {
      case "1month": return endOfMonth(now);
      case "3months": return endOfMonth(addMonths(now, 2));
      case "6months": return endOfMonth(addMonths(now, 5));
      case "12months": return endOfMonth(addMonths(now, 11));
      default: return endOfMonth(addMonths(now, 2));
    }
  })();

  // Génération des semaines dans la période
  const weeks = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 1 }
  );

  // Calcul des charges par semaine
  const calculateWeeklyLoads = (): WeeklyLoad[] => {
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekNumber = parseInt(format(weekStart, 'w'));
      const year = weekStart.getFullYear();

      // Filtrer les tâches qui chevauchent cette semaine
      const weekTasks = tasks.filter((task: any) => {
        if (!task.startDate || !task.endDate) return false;
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.endDate);
        return taskStart <= weekEnd && taskEnd >= weekStart;
      });

      // Calculer les besoins totaux pour la semaine
      const weeklyLoad: WeeklyLoad = {
        weekStart,
        weekEnd,
        weekNumber,
        year,
        bePersonsNeeded: 0,
        productionPersonsNeeded: 0,
        beHoursPlanned: 0,
        productionHoursPlanned: 0,
        tasks: []
      };

      weekTasks.forEach((task: any) => {
        const project = projects.find(p => p.id === task.projectId);
        
        const taskLoad: TaskLoad = {
          taskId: task.id,
          taskName: task.name,
          projectName: project?.name || 'Projet non trouvé',
          bePersonsNeeded: task.bePersonsNeeded || 0,
          productionPersonsNeeded: task.productionPersonsNeeded || 0,
          beHoursEstimated: parseFloat(task.beHoursEstimated || '0'),
          productionHoursEstimated: parseFloat(task.productionHoursEstimated || '0'),
          priority: task.priority || 'normale'
        };

        weeklyLoad.tasks.push(taskLoad);
        weeklyLoad.bePersonsNeeded += taskLoad.bePersonsNeeded;
        weeklyLoad.productionPersonsNeeded += taskLoad.productionPersonsNeeded;
        weeklyLoad.beHoursPlanned += taskLoad.beHoursEstimated;
        weeklyLoad.productionHoursPlanned += taskLoad.productionHoursEstimated;
      });

      return weeklyLoad;
    });
  };

  const weeklyLoads = calculateWeeklyLoads();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critique": return "bg-red-500";
      case "haute": return "bg-orange-500";
      case "normale": return "bg-blue-500";
      case "basse": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "critique": return "Critique";
      case "haute": return "Haute";
      case "normale": return "Normale";
      case "basse": return "Basse";
      default: return priority;
    }
  };

  const getLoadStatus = (personsNeeded: number, teamType: TeamType) => {
    // Capacité estimée par équipe (à ajuster selon vos besoins)
    const capacity = teamType === "be" ? 5 : 10; // 5 personnes BE, 10 personnes production
    const percentage = (personsNeeded / capacity) * 100;
    
    if (percentage > 100) return { status: "surcharge", color: "text-red-600", bg: "bg-red-100" };
    if (percentage > 80) return { status: "charge_elevee", color: "text-orange-600", bg: "bg-orange-100" };
    if (percentage > 50) return { status: "charge_normale", color: "text-green-600", bg: "bg-green-100" };
    return { status: "sous_charge", color: "text-gray-600", bg: "bg-gray-100" };
  };

  if (tasksLoading || projectsLoading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Plan de Charges"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Plan de Charges" }
          ]}
          actions={[
            {
              label: "Exporter",
              variant: "outline",
              icon: "download"
            }
          ]}
        />
        
        <div className="px-6 py-6 space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select value={viewPeriod} onValueChange={(value: ViewPeriod) => setViewPeriod(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Période d'affichage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">1 mois</SelectItem>
                  <SelectItem value="3months">3 mois</SelectItem>
                  <SelectItem value="6months">6 mois</SelectItem>
                  <SelectItem value="12months">12 mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>
                {format(startDate, 'dd MMM yyyy', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total BE</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {weeklyLoads.reduce((sum, week) => sum + week.bePersonsNeeded, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Production</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {weeklyLoads.reduce((sum, week) => sum + week.productionPersonsNeeded, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Heures BE</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(weeklyLoads.reduce((sum, week) => sum + week.beHoursPlanned, 0))}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Heures Production</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(weeklyLoads.reduce((sum, week) => sum + week.productionHoursPlanned, 0))}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly Load Table */}
          <Tabs value={selectedTeam} onValueChange={(value) => setSelectedTeam(value as TeamType)}>
            <TabsList>
              <TabsTrigger value="be">Bureau d'Études</TabsTrigger>
              <TabsTrigger value="production">Équipe de Pose</TabsTrigger>
            </TabsList>
            
            <TabsContent value={selectedTeam} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>
                      Plan de Charges - {selectedTeam === "be" ? "Bureau d'Études" : "Équipe de Pose"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4">Semaine</th>
                          <th className="text-center py-3 px-4">Personnes</th>
                          <th className="text-center py-3 px-4">Heures</th>
                          <th className="text-center py-3 px-4">Charge</th>
                          <th className="text-left py-3 px-4">Tâches</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyLoads.map((week, index) => {
                          const personsNeeded = selectedTeam === "be" ? week.bePersonsNeeded : week.productionPersonsNeeded;
                          const hoursPlanned = selectedTeam === "be" ? week.beHoursPlanned : week.productionHoursPlanned;
                          const loadStatus = getLoadStatus(personsNeeded, selectedTeam);
                          
                          return (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4">
                                <div>
                                  <div className="font-medium">
                                    S{week.weekNumber} {week.year}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {format(week.weekStart, 'dd MMM', { locale: fr })} - {format(week.weekEnd, 'dd MMM', { locale: fr })}
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${loadStatus.bg} ${loadStatus.color}`}>
                                  {personsNeeded}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="font-medium">{Math.round(hoursPlanned)}h</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {loadStatus.status === "surcharge" && (
                                  <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" />
                                )}
                                {loadStatus.status === "charge_elevee" && (
                                  <TrendingUp className="w-4 h-4 text-orange-500 mx-auto" />
                                )}
                                {(loadStatus.status === "charge_normale" || loadStatus.status === "sous_charge") && (
                                  <div className="w-4 h-4 bg-green-500 rounded-full mx-auto"></div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-1">
                                  {week.tasks.slice(0, 3).map((task, taskIndex) => (
                                    <div key={taskIndex} className="flex items-center space-x-2">
                                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}></div>
                                      <span className="text-xs text-gray-600 truncate">
                                        {task.projectName} - {task.taskName}
                                      </span>
                                    </div>
                                  ))}
                                  {week.tasks.length > 3 && (
                                    <div className="text-xs text-gray-500">
                                      +{week.tasks.length - 3} autres tâches
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}