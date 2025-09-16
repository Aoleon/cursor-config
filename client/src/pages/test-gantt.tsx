import { useState } from "react";
import GanttChart from "@/components/projects/GanttChart";
import type { GanttProject, GanttMilestone, GanttTask } from "@shared/schema";

export default function TestGanttPage() {
  // Données de test vides pour déclencher les mock data dans GanttChart
  const [projects] = useState<GanttProject[]>([]);
  const [milestones] = useState<GanttMilestone[]>([]);
  const [tasks] = useState<GanttTask[]>([]);

  console.log('🔍 TEST GANTT PAGE - Rendering with empty data to trigger mock data');

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🔍 Test Debug Hiérarchie Gantt</h1>
      <div className="bg-yellow-100 p-4 rounded mb-4">
        <p><strong>Debug Mode:</strong> Cette page utilise des données mock pour tester la hiérarchie.</p>
        <p>Ouvrez la console pour voir les logs de debug détaillés.</p>
      </div>
      
      <GanttChart
        projects={projects}
        milestones={milestones}
        tasks={tasks}
        enableHierarchy={true}
        data-testid="test-gantt-chart"
      />
    </div>
  );
}