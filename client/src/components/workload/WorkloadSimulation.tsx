import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";

export function WorkloadSimulation() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const { data: simulation, isLoading, refetch } = useQuery({
    queryKey: ["/api/workload/simulation", startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/workload/simulation?startDate=${new Date(startDate).toISOString()}&endDate=${new Date(endDate).toISOString()}`);
      if (!res.ok) throw new Error("Erreur lors du chargement");
      return res.json();
    },
    enabled: false
  });

  const handleSimulate = () => {
    refetch();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simulation de Charge</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date de début</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Date de fin</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSimulate} disabled={isLoading}>
          {isLoading ? "Simulation..." : "Lancer la simulation"}
        </Button>

        {simulation && (
          <div className="space-y-4 mt-4">
            <div>
              <h3 className="font-semibold mb-2">Charge BE</h3>
              <div className="space-y-2">
                {simulation.beWorkload?.map((w: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 border rounded">
                    <span>{w.userId}</span>
                    <span>{w.utilization}%</span>
                  </div>
                ))}
              </div>
            </div>

            {simulation.bottlenecks && simulation.bottlenecks.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Goulots d'étranglement détectés:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {simulation.bottlenecks.map((b: any, i: number) => (
                      <li key={i}>{b.userId}: {b.utilization}% d'utilisation</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

