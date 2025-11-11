import { WorkloadSimulation } from "@/components/workload/WorkloadSimulation";

export function WorkloadSimulationPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Simulation de Charge</h1>
      </div>

      <WorkloadSimulation />
    </div>
  );
}

