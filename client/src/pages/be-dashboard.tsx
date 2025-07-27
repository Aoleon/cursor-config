import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkloadDashboard from "@/components/be-workload/workload-dashboard";
import MilestoneTracker from "@/components/validation/milestone-tracker";
import { TrendingUp, FileCheck, Users, AlertTriangle } from "lucide-react";

// Page dédiée au suivi de la charge BE - Résout les problèmes identifiés dans l'audit JLM

export default function BEDashboard() {
  const { user } = useAuth();
  const isBeUser = (user as any)?.role === "responsable_be" || (user as any)?.role === "technicien_be";

  if (!isBeUser) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Accès Réservé BE</h2>
            <p className="text-gray-600">Cette page est réservée aux membres du Bureau d'Études.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord BE</h1>
        <p className="text-gray-600">
          Suivi de la charge et validation des jalons techniques
        </p>
      </div>

      <Tabs defaultValue="workload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workload" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Charge de Travail</span>
          </TabsTrigger>
          <TabsTrigger value="milestones" className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4" />
            <span>Jalons de Validation</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workload">
          <WorkloadDashboard />
        </TabsContent>

        <TabsContent value="milestones">
          <Card>
            <CardHeader>
              <CardTitle>Jalons de Validation Globaux</CardTitle>
              <p className="text-sm text-gray-600">
                Suivi des validations "Fin d'études" pour tous les dossiers en cours
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Sélectionnez un dossier d'offre spécifique pour voir ses jalons
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}