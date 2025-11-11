import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface ChecklistItem {
  id: string;
  offerId: string;
  itemType: string;
  isCritical: boolean;
  status: "non_controle" | "conforme" | "non_conforme";
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
}

export function BeQualityChecklist({ offerId }: { offerId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checklist, isLoading } = useQuery<{ items: ChecklistItem[]; validation: any }>({
    queryKey: [`/api/offers/${offerId}/be-checklist`],
    queryFn: async () => {
      const res = await fetch(`/api/offers/${offerId}/be-checklist`);
      if (!res.ok) throw new Error("Erreur lors du chargement");
      return res.json();
    }
  });

  const initializeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/offers/${offerId}/be-checklist/initialize`, { method: "POST" });
      if (!res.ok) throw new Error("Erreur lors de l'initialisation");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}/be-checklist`] });
      toast({ title: "Checklist initialisée" });
    }
  });

  const checkItemMutation = useMutation({
    mutationFn: async ({ itemId, status, notes }: { itemId: string; status: string; notes?: string }) => {
      const res = await fetch(`/api/offers/${offerId}/be-checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes })
      });
      if (!res.ok) throw new Error("Erreur lors de la mise à jour");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}/be-checklist`] });
      toast({ title: "Item mis à jour" });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "conforme":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "non_conforme":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  if (isLoading) return <div className="text-center py-8">Chargement...</div>;

  if (!checklist || checklist.items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Aucune checklist initialisée</p>
            <Button onClick={() => initializeMutation.mutate()} disabled={initializeMutation.isPending}>
              Initialiser la checklist
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist Qualité BE</CardTitle>
        {checklist.validation && (
          <Badge variant={checklist.validation.isValid ? "default" : "destructive"}>
            {checklist.validation.isValid ? "Validée" : "Non validée"}
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {checklist.items.map((item) => (
            <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(item.status)}
                  <span className="font-medium">{item.itemType}</span>
                  {item.isCritical && <Badge variant="destructive">Critique</Badge>}
                </div>
                {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={item.status === "conforme" ? "default" : "outline"}
                  onClick={() => checkItemMutation.mutate({ itemId: item.id, status: "conforme" })}
                >
                  Conforme
                </Button>
                <Button
                  size="sm"
                  variant={item.status === "non_conforme" ? "destructive" : "outline"}
                  onClick={() => checkItemMutation.mutate({ itemId: item.id, status: "non_conforme" })}
                >
                  Non conforme
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

