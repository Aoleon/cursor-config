import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, AlertCircle, Clock, FileCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Composant pour résoudre le problème identifié dans l'audit JLM :
// "Absence de jalon « Fin d'études » : France découvre en chantier des oublis → retouches coûteuses"

interface MilestoneTrackerProps {
  offerId?: string;
  projectId?: string;
}

export default function MilestoneTracker({ offerId, projectId }: MilestoneTrackerProps) {
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [validationComment, setValidationComment] = useState("");
  const [blockers, setBlockers] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ["/api/validation-milestones", { offerId, projectId }],
    enabled: !!(offerId || projectId),
  });

  // Type the milestones data
  const typedMilestones = (milestones as any[]) || [];

  const { data: offer } = useQuery({
    queryKey: ["/api/offers", offerId],
    enabled: !!offerId,
  });

  const validateMilestoneMutation = useMutation({
    mutationFn: async (data: { type: string; comment: string; blockers?: string }) => {
      await apiRequest("POST", "/api/validation-milestones", {
        offerId,
        projectId,
        type: data.type,
        comment: data.comment,
        blockers: data.blockers,
        validatedBy: (user as any)?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/validation-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      toast({
        title: "Succès",
        description: "Jalon validé avec succès",
      });
      setIsValidationModalOpen(false);
      setValidationComment("");
      setBlockers("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erreur",
        description: "Impossible de valider le jalon",
        variant: "destructive",
      });
    },
  });

  const milestoneTypes = [
    {
      key: "fin_etudes",
      label: "Fin d'Études",
      description: "Validation technique complète avant commande",
      required: true,
      roles: ["responsable_be", "chef_travaux"],
      icon: FileCheck,
      priority: "critical"
    },
    {
      key: "validation_technique",
      label: "Validation Technique",
      description: "Plans, nuanciers et spécifications validés",
      required: true,
      roles: ["responsable_be"],
      icon: CheckCircle,
      priority: "high"
    },
    {
      key: "validation_commerciale",
      label: "Validation Commerciale",
      description: "Conditions et prix validés",
      required: false,
      roles: ["chef_projet"],
      icon: CheckCircle,
      priority: "medium"
    }
  ];

  const getMilestoneStatus = (milestoneType: string) => {
    const milestone = typedMilestones.find((m: any) => m.type === milestoneType);
    if (milestone) {
      return {
        status: "validated",
        date: milestone.validatedAt,
        validator: milestone.validator,
        comment: milestone.comment,
        blockers: milestone.blockers
      };
    }
    return { status: "pending" };
  };

  const canValidateMilestone = (milestoneType: any) => {
    const userRole = (user as any)?.role;
    return milestoneType.roles.includes(userRole);
  };

  const handleValidate = (milestoneType: any) => {
    if (!canValidateMilestone(milestoneType)) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les droits pour valider ce jalon",
        variant: "destructive",
      });
      return;
    }

    setSelectedMilestone(milestoneType);
    setIsValidationModalOpen(true);
  };

  const handleSubmitValidation = () => {
    if (!selectedMilestone || !validationComment.trim()) {
      toast({
        title: "Erreur",
        description: "Le commentaire de validation est requis",
        variant: "destructive",
      });
      return;
    }

    validateMilestoneMutation.mutate({
      type: selectedMilestone.key,
      comment: validationComment,
      blockers: blockers.trim() || undefined,
    });
  };

  const getStatusIcon = (status: string, priority: string) => {
    if (status === "validated") {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (priority === "critical") {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
    return <Clock className="w-5 h-5 text-yellow-600" />;
  };

  const getStatusBadge = (status: string, priority: string) => {
    if (status === "validated") {
      return <Badge className="bg-green-100 text-green-800">Validé</Badge>;
    }
    if (priority === "critical") {
      return <Badge className="bg-red-100 text-red-800">Critique</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileCheck className="w-5 h-5 mr-2" />
            Jalons de Validation
          </CardTitle>
          {offer?.status === "en_chiffrage" && (
            <p className="text-sm text-gray-600">
              Validez tous les jalons critiques avant passage en production
            </p>
          )}
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {milestoneTypes.map((milestoneType) => {
              const milestoneStatus = getMilestoneStatus(milestoneType.key);
              const canValidate = canValidateMilestone(milestoneType);

              return (
                <div key={milestoneType.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(milestoneStatus.status, milestoneType.priority)}
                      <div>
                        <h4 className="font-medium flex items-center space-x-2">
                          <span>{milestoneType.label}</span>
                          {milestoneType.required && (
                            <span className="text-red-500 text-sm">*</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">{milestoneType.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(milestoneStatus.status, milestoneType.priority)}
                      {milestoneStatus.status === "pending" && canValidate && (
                        <Button
                          size="sm"
                          onClick={() => handleValidate(milestoneType)}
                          className="bg-primary hover:bg-primary-dark"
                        >
                          Valider
                        </Button>
                      )}
                    </div>
                  </div>

                  {milestoneStatus.status === "validated" && (
                    <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-800">
                          Validé par {milestoneStatus.validator?.firstName} {milestoneStatus.validator?.lastName}
                        </span>
                        <span className="text-green-600">
                          {format(new Date(milestoneStatus.date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                      {milestoneStatus.comment && (
                        <p className="mt-2 text-sm text-green-700">
                          <strong>Commentaire:</strong> {milestoneStatus.comment}
                        </p>
                      )}
                      {milestoneStatus.blockers && (
                        <p className="mt-1 text-sm text-red-700">
                          <strong>Points bloquants:</strong> {milestoneStatus.blockers}
                        </p>
                      )}
                    </div>
                  )}

                  {milestoneStatus.status === "pending" && !canValidate && (
                    <div className="mt-2 text-xs text-gray-500">
                      Validation requise par: {milestoneType.roles.join(", ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Résumé des validations */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">Résumé des Validations</h5>
            <div className="text-sm text-gray-600">
              {typedMilestones.length} / {milestoneTypes.filter(m => m.required).length} jalons critiques validés
              <div className="mt-1">
                Statut global: {
                  typedMilestones.length >= milestoneTypes.filter(m => m.required).length
                    ? <span className="text-green-600 font-medium">✓ Prêt pour production</span>
                    : <span className="text-red-600 font-medium">⚠ Validations manquantes</span>
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de validation */}
      <Dialog open={isValidationModalOpen} onOpenChange={setIsValidationModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Valider : {selectedMilestone?.label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Commentaire de validation *
              </label>
              <Textarea
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                placeholder="Décrivez les éléments validés, conditions respectées..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Points bloquants ou remarques (optionnel)
              </label>
              <Textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Signalez d'éventuels problèmes ou points d'attention..."
                rows={2}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsValidationModalOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmitValidation}
                disabled={validateMilestoneMutation.isPending || !validationComment.trim()}
              >
                {validateMilestoneMutation.isPending ? "Validation..." : "Valider"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}