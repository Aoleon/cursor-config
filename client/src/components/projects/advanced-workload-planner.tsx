import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { format, addWeeks, startOfWeek, addMonths, startOfMonth, differenceInWeeks, differenceInMonths } from "date-fns";
import { fr } from "date-fns/locale";

type ViewPeriod = "1" | "3" | "6" | "12";
type ViewType = "week" | "month";
type TeamType = "be" | "pose" | "all";

interface TaskWorkload {
  id: string;
  projectId: string;
  projectName: string;
  taskName: string;
  startDate: Date;
  endDate: Date;
  bePersonsNeeded: number;
  posePersonsNeeded: number;
  status: "planifie" | "en_cours" | "termine" | "reporte";
  priority: "basse" | "normale" | "haute" | "critique";
}

interface WeeklyWorkload {
  weekStart: Date;
  weekEnd: Date;
  beTotal: number;
  poseTotal: number;
  projects: {
    projectId: string;
    projectName: string;
    bePeople: number;
    posePeople: number;
    tasks: TaskWorkload[];
  }[];
}

interface MonthlyWorkload {
  monthStart: Date;
  monthEnd: Date;
  beTotal: number;
  poseTotal: number;
  weeksCount: number;
  projects: {
    projectId: string;
    projectName: string;
    bePeople: number;
    posePeople: number;
  }[];
}

export default function AdvancedWorkloadPlanner() {
  const [viewType, setViewType] = useState<ViewType>("week");
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>("3");
  const [teamType, setTeamType] = useState<TeamType>("all");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Récupérer les tâches réelles avec charges BE et Pose
  const { data: projectTasks = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/all-project-tasks/'],
  });

  const convertToTaskWorkload = (dbTasks: any[]): TaskWorkload[] => {
    return dbTasks.map(task => ({
      id: task.id,
      projectId: task.projectId,
      projectName: task.project?.name || 'Projet inconnu',
      taskName: task.name,
      startDate: new Date(task.startDate || new Date()),
      endDate: new Date(task.endDate || addWeeks(new Date(), 1)),
      bePersonsNeeded: task.bePersonsNeeded || 0,
      posePersonsNeeded: task.posePersonsNeeded || 0,
      status: task.status === "en_cours" ? "en_cours" : 
              task.status === "termine" ? "termine" : 
              task.status === "not_started" ? "planifie" : "planifie",
      priority: task.priority || "normale"
    }));
  };

  const tasks = convertToTaskWorkload(projectTasks);

  const calculateWeeklyWorkload = (): WeeklyWorkload[] => {
    const weeks: WeeklyWorkload[] = [];
    const weeksToShow = viewType === "week" ? parseInt(viewPeriod) * 4 : parseInt(viewPeriod) * 12;
    
    for (let i = 0; i < weeksToShow; i++) {
      const weekStart = startOfWeek(addWeeks(currentDate, i), { weekStartsOn: 1 });
      const weekEnd = addWeeks(weekStart, 1);
      
      const weekTasks = tasks.filter(task => 
        task.startDate < weekEnd && task.endDate > weekStart
      );

      const projectsMap = new Map();
      let beTotal = 0;
      let poseTotal = 0;

      weekTasks.forEach(task => {
        if (!projectsMap.has(task.projectId)) {
          projectsMap.set(task.projectId, {
            projectId: task.projectId,
            projectName: task.projectName,
            bePeople: 0,
            posePeople: 0,
            tasks: []
          });
        }
        
        const project = projectsMap.get(task.projectId);
        project.bePeople += task.bePersonsNeeded;
        project.posePeople += task.posePersonsNeeded;
        project.tasks.push(task);
        
        beTotal += task.bePersonsNeeded;
        poseTotal += task.posePersonsNeeded;
      });

      weeks.push({
        weekStart,
        weekEnd,
        beTotal,
        poseTotal,
        projects: Array.from(projectsMap.values())
      });
    }

    return weeks;
  };

  const calculateMonthlyWorkload = (): MonthlyWorkload[] => {
    const months: MonthlyWorkload[] = [];
    const monthsToShow = parseInt(viewPeriod);
    
    for (let i = 0; i < monthsToShow; i++) {
      const monthStart = startOfMonth(addMonths(currentDate, i));
      const monthEnd = addMonths(monthStart, 1);
      
      const monthTasks = tasks.filter(task => 
        task.startDate < monthEnd && task.endDate > monthStart
      );

      const projectsMap = new Map();
      let beTotal = 0;
      let poseTotal = 0;

      monthTasks.forEach(task => {
        if (!projectsMap.has(task.projectId)) {
          projectsMap.set(task.projectId, {
            projectId: task.projectId,
            projectName: task.projectName,
            bePeople: 0,
            posePeople: 0
          });
        }
        
        const project = projectsMap.get(task.projectId);
        project.bePeople += task.bePersonsNeeded;
        project.posePeople += task.posePersonsNeeded;
        
        beTotal += task.bePersonsNeeded;
        poseTotal += task.posePersonsNeeded;
      });

      months.push({
        monthStart,
        monthEnd,
        beTotal,
        poseTotal,
        weeksCount: differenceInWeeks(monthEnd, monthStart),
        projects: Array.from(projectsMap.values())
      });
    }

    return months;
  };

  const weeklyData = calculateWeeklyWorkload();
  const monthlyData = calculateMonthlyWorkload();

  const getTeamBadgeColor = (type: "be" | "pose") => {
    return type === "be" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800";
  };

  const getStatusColor = (status: TaskWorkload["status"]) => {
    switch (status) {
      case "en_cours": return "bg-yellow-100 text-yellow-800";
      case "termine": return "bg-green-100 text-green-800";
      case "planifie": return "bg-blue-100 text-blue-800";
      case "reporte": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityIcon = (priority: TaskWorkload["priority"]) => {
    switch (priority) {
      case "critique": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case "haute": return <TrendingUp className="w-4 h-4 text-orange-500" />;
      default: return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête et contrôles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Plan de Charges Avancé</h2>
          <p className="text-gray-600">Planification BE et Équipes de pose</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={viewType} onValueChange={(value: ViewType) => setViewType(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semaines</SelectItem>
              <SelectItem value="month">Mois</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewPeriod} onValueChange={(value: ViewPeriod) => setViewPeriod(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="6">6</SelectItem>
              <SelectItem value="12">12</SelectItem>
            </SelectContent>
          </Select>

          <Select value={teamType} onValueChange={(value: TeamType) => setTeamType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes équipes</SelectItem>
              <SelectItem value="be">Bureau d'Études</SelectItem>
              <SelectItem value="pose">Équipe Pose</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Charge BE Totale</p>
                <p className="text-2xl font-bold text-blue-600">
                  {viewType === "week" 
                    ? weeklyData.reduce((sum, week) => sum + week.beTotal, 0)
                    : monthlyData.reduce((sum, month) => sum + month.beTotal, 0)
                  } pers.
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Charge Pose Totale</p>
                <p className="text-2xl font-bold text-green-600">
                  {viewType === "week" 
                    ? weeklyData.reduce((sum, week) => sum + week.poseTotal, 0)
                    : monthlyData.reduce((sum, month) => sum + month.poseTotal, 0)
                  } pers.
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Projets Actifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(tasks.map(t => t.projectId)).size}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Période</p>
                <p className="text-2xl font-bold text-purple-600">
                  {viewPeriod} {viewType === "week" ? "mois" : "mois"}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vue par semaines */}
      {viewType === "week" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Planification Hebdomadaire</h3>
          <div className="grid gap-4">
            {weeklyData.map((week, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">
                      Semaine du {format(week.weekStart, "dd MMM", { locale: fr })} au {format(addWeeks(week.weekStart, 1), "dd MMM yyyy", { locale: fr })}
                    </CardTitle>
                    <div className="flex gap-2">
                      {(teamType === "all" || teamType === "be") && (
                        <Badge className={getTeamBadgeColor("be")}>
                          BE: {week.beTotal} pers.
                        </Badge>
                      )}
                      {(teamType === "all" || teamType === "pose") && (
                        <Badge className={getTeamBadgeColor("pose")}>
                          Pose: {week.poseTotal} pers.
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {week.projects.map((project) => (
                      <div key={project.projectId} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{project.projectName}</h4>
                          <div className="flex gap-1">
                            {(teamType === "all" || teamType === "be") && project.bePeople > 0 && (
                              <Badge variant="outline" className="text-xs">
                                BE: {project.bePeople}
                              </Badge>
                            )}
                            {(teamType === "all" || teamType === "pose") && project.posePeople > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Pose: {project.posePeople}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {project.tasks.map((task) => (
                            <div key={task.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {getPriorityIcon(task.priority)}
                                <span className="text-gray-700">{task.taskName}</span>
                              </div>
                              <Badge className={getStatusColor(task.status)} variant="secondary">
                                {task.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Vue par mois */}
      {viewType === "month" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Planification Mensuelle</h3>
          <div className="grid gap-4">
            {monthlyData.map((month, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base">
                      {format(month.monthStart, "MMMM yyyy", { locale: fr })}
                    </CardTitle>
                    <div className="flex gap-2">
                      {(teamType === "all" || teamType === "be") && (
                        <Badge className={getTeamBadgeColor("be")}>
                          BE: {Math.round(month.beTotal / month.weeksCount)} pers./sem
                        </Badge>
                      )}
                      {(teamType === "all" || teamType === "pose") && (
                        <Badge className={getTeamBadgeColor("pose")}>
                          Pose: {Math.round(month.poseTotal / month.weeksCount)} pers./sem
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {month.projects.map((project) => (
                      <div key={project.projectId} className="border rounded-lg p-3">
                        <h4 className="font-medium text-gray-900 mb-2">{project.projectName}</h4>
                        <div className="space-y-1">
                          {(teamType === "all" || teamType === "be") && project.bePeople > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">BE Total:</span>
                              <span className="font-medium">{project.bePeople} pers.</span>
                            </div>
                          )}
                          {(teamType === "all" || teamType === "pose") && project.posePeople > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Pose Total:</span>
                              <span className="font-medium">{project.posePeople} pers.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}