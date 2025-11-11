import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, CheckCircle, Clock, Package } from "lucide-react";

interface SavDemande {
  id: string;
  reference: string;
  projectId: string;
  demandeType: string;
  status: string;
  description: string;
  createdAt: string;
  materielId?: string;
  rdvPlanifie?: string;
  quitusRecu?: boolean;
}

export function SavWorkflowDashboard({ projectId }: { projectId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: demandes = [], isLoading } = useQuery<SavDemande[]>({
    queryKey: ["/api/sav/demandes", projectId],
    queryFn: async () => {
      const url = projectId ? `/api/sav/demandes?projectId=${projectId}` : "/api/sav/demandes";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur lors du chargement");
      return res.json();
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      nouvelle: "default",
      materiel_commande: "secondary",
      rdv_planifie: "secondary",
      en_intervention: "secondary",
      reserve_levee: "default",
      fermee: "default"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    if (status === "reserve_levee" || status === "fermee") return <CheckCircle className="h-4 w-4" />;
    if (status.includes("materiel") || status.includes("rdv")) return <Package className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Demandes SAV</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : demandes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune demande SAV</div>
          ) : (
            <div className="space-y-4">
              {demandes.map((demande) => (
                <Card key={demande.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(demande.status)}
                          <span className="font-semibold">{demande.reference}</span>
                          {getStatusBadge(demande.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{demande.description}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Type: {demande.demandeType}</span>
                          {demande.rdvPlanifie && <span>RDV: {new Date(demande.rdvPlanifie).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

