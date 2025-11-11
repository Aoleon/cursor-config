import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Comparison {
  projectId: string;
  dates: {
    planned: { start: string; end: string };
    actual: { start: string; end: string };
    variance: { startDays: number; endDays: number };
  };
  budget: {
    planned: number;
    actual: number;
    variance: number;
    variancePercent: number;
  };
  hours: {
    planned: number;
    actual: number;
    variance: number;
    variancePercent: number;
  };
}

export function PrevuVsReelDashboard({ projectId }: { projectId?: string }) {
  const { data: comparison, isLoading } = useQuery<Comparison>({
    queryKey: projectId ? [`/api/analytics/projects/${projectId}/prevu-vs-reel`] : ["/api/analytics/prevu-vs-reel/global"],
    queryFn: async () => {
      const url = projectId 
        ? `/api/analytics/projects/${projectId}/prevu-vs-reel`
        : "/api/analytics/prevu-vs-reel/global";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur lors du chargement");
      return res.json();
    },
    enabled: !!projectId || true
  });

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getVarianceBadge = (variance: number, variancePercent: number) => {
    const variant = Math.abs(variancePercent) > 10 ? "destructive" : Math.abs(variancePercent) > 5 ? "secondary" : "default";
    return (
      <Badge variant={variant}>
        {getVarianceIcon(variance)}
        <span className="ml-1">{variancePercent > 0 ? "+" : ""}{variancePercent.toFixed(1)}%</span>
      </Badge>
    );
  };

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;
  if (!comparison) return <div className="text-center py-8 text-muted-foreground">Aucune donnée disponible</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Prévu vs Réel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dates */}
          <div>
            <h3 className="font-semibold mb-2">Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Prévu</p>
                <p>{new Date(comparison.dates.planned.start).toLocaleDateString()} - {new Date(comparison.dates.planned.end).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Réel</p>
                <p>{new Date(comparison.dates.actual.start).toLocaleDateString()} - {new Date(comparison.dates.actual.end).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mt-2">
              {getVarianceBadge(comparison.dates.variance.endDays, (comparison.dates.variance.endDays / 7) * 100)}
            </div>
          </div>

          {/* Budget */}
          <div>
            <h3 className="font-semibold mb-2">Budget</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Prévu</p>
                <p>{comparison.budget.planned.toLocaleString()} €</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Réel</p>
                <p>{comparison.budget.actual.toLocaleString()} €</p>
              </div>
            </div>
            <div className="mt-2">
              {getVarianceBadge(comparison.budget.variance, comparison.budget.variancePercent)}
            </div>
          </div>

          {/* Heures */}
          <div>
            <h3 className="font-semibold mb-2">Heures</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Prévu</p>
                <p>{comparison.hours.planned.toFixed(1)} h</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Réel</p>
                <p>{comparison.hours.actual.toFixed(1)} h</p>
              </div>
            </div>
            <div className="mt-2">
              {getVarianceBadge(comparison.hours.variance, comparison.hours.variancePercent)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

