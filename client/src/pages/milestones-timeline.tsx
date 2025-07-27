import { PhaseNavigation } from "@/components/navigation/phase-navigation";
import Header from "@/components/layout/header";
import TimelineView from "@/components/projects/timeline-view";

export default function MilestonesTimeline() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <PhaseNavigation />
      <main className="flex-1 overflow-auto">
        <Header 
          title="Timeline des Jalons"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "BE Dashboard", href: "/be-dashboard" },
            { label: "Timeline des Jalons" }
          ]}
        />
        
        <div className="px-6 py-6">
          <TimelineView viewType="milestones" />
        </div>
      </main>
    </div>
  );
}