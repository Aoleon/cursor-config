import { useState } from "react";
import { Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function ProjectPlanningPage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const milestones = [
    {
      id: 1,
      name: "Fin d'études",
      date: "2025-03-15",
      status: "completed",
      project: "Résidence Sandettie",
    },
    {
      id: 2,
      name: "Commande matériaux",
      date: "2025-03-20",
      status: "in-progress",
      project: "Résidence Sandettie",
    },
    {
      id: 3,
      name: "Démarrage chantier",
      date: "2025-04-01",
      status: "pending",
      project: "Résidence Sandettie",
    },
    {
      id: 4,
      name: "Réception travaux",
      date: "2025-05-15",
      status: "pending",
      project: "Résidence Sandettie",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header
          title="Planification - Projets"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets", href: "/projects" },
            { label: "Planification" },
          ]}
        />

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Planning Gantt</CardTitle>
                  <CardDescription>
                    Vue d'ensemble des jalons et tâches du projet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          {milestone.status === "completed" ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : milestone.status === "in-progress" ? (
                            <Clock className="h-5 w-5 text-blue-600" />
                          ) : (
                            <Calendar className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <p className="font-medium">{milestone.name}</p>
                            <p className="text-sm text-gray-500">
                              {milestone.project}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">
                            {new Date(milestone.date).toLocaleDateString("fr-FR")}
                          </span>
                          <Badge className={getStatusColor(milestone.status)}>
                            {milestone.status === "completed"
                              ? "Terminé"
                              : milestone.status === "in-progress"
                              ? "En cours"
                              : "À venir"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      💡 Glissez-déposez les jalons pour ajuster les dates
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Alertes Planning</CardTitle>
                  <CardDescription>Jalons à surveiller</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">
                        Commande matériaux imminente
                      </p>
                      <p className="text-xs text-gray-500">
                        5 jours restants - Résidence Sandettie
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium">
                        Validation BE complétée
                      </p>
                      <p className="text-xs text-gray-500">
                        École Jean Jaurès - Aujourd'hui
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Actions Rapides</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline">
                    Ajouter un jalon
                  </Button>
                  <Button className="w-full" variant="outline">
                    Créer une tâche
                  </Button>
                  <Button className="w-full" variant="outline">
                    Exporter planning
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}