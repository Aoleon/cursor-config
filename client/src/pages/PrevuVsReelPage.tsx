import { PrevuVsReelDashboard } from "@/components/analytics/PrevuVsReelDashboard";
import { useSearchParams } from "react-router-dom";

export function PrevuVsReelPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || undefined;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Prévu vs Réel</h1>
      </div>

      <PrevuVsReelDashboard projectId={projectId} />
    </div>
  );
}

