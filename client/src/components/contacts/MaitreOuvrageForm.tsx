import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building, User, Phone, Mail } from "lucide-react";

// Schéma de validation
const maitreOuvrageSchema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  typeOrganisation: z.string().optional(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  departement: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  siteWeb: z.string().optional(),
  siret: z.string().optional(),
  
  // Contact principal
  contactPrincipalNom: z.string().optional(),
  contactPrincipalPoste: z.string().optional(),
  contactPrincipalTelephone: z.string().optional(),
  contactPrincipalEmail: z.string().email("Email invalide").optional().or(z.literal("")),
  
  notes: z.string().optional(),
});

type MaitreOuvrageFormData = z.infer<typeof maitreOuvrageSchema>;

interface MaitreOuvrageFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (maitreOuvrage: any) => void;
  initialData?: Partial<MaitreOuvrageFormData>;
  mode?: "create" | "edit";
  maitreOuvrageId?: string;
}

export function MaitreOuvrageForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData,
  mode = "create",
  maitreOuvrageId 
}: MaitreOuvrageFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MaitreOuvrageFormData>({
    resolver: zodResolver(maitreOuvrageSchema),
    defaultValues: {
      nom: "",
      typeOrganisation: "",
      adresse: "",
      codePostal: "",
      ville: "",
      departement: "",
      telephone: "",
      email: "",
      siteWeb: "",
      siret: "",
      contactPrincipalNom: "",
      contactPrincipalPoste: "",
      contactPrincipalTelephone: "",
      contactPrincipalEmail: "",
      notes: "",
      ...initialData,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: MaitreOuvrageFormData) => {
      const url = mode === "create" ? "/api/maitres-ouvrage" : `/api/maitres-ouvrage/${maitreOuvrageId}`;
      const method = mode === "create" ? "POST" : "PUT";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save maître d\'ouvrage');
      }
      
      return response.json();
    },
    onSuccess: (newMaitreOuvrage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/maitres-ouvrage"] });
      
      toast({
        title: mode === "create" ? "Maître d'ouvrage créé" : "Maître d'ouvrage modifié",
        description: `${newMaitreOuvrage.nom} a été ${mode === "create" ? "créé" : "modifié"} avec succès`,
      });
      
      onSuccess?.(newMaitreOuvrage);
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      console.error("Error saving maître d'ouvrage:", error);
      toast({
        title: "Erreur",
        description: `Impossible de ${mode === "create" ? "créer" : "modifier"} le maître d'ouvrage`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MaitreOuvrageFormData) => {
    createMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>
              {mode === "create" ? "Créer un maître d'ouvrage" : "Modifier le maître d'ouvrage"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom / Raison sociale *</Label>
                  <Input
                    id="nom"
                    {...form.register("nom")}
                    placeholder="Nom de l'organisme"
                    data-testid="input-nom"
                  />
                  {form.formState.errors.nom && (
                    <p className="text-sm text-red-600 mt-1">{form.formState.errors.nom.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="typeOrganisation">Type d'organisation</Label>
                  <Select onValueChange={(value) => form.setValue("typeOrganisation", value)}>
                    <SelectTrigger data-testid="select-type-organisation">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commune">Commune</SelectItem>
                      <SelectItem value="departement">Département</SelectItem>
                      <SelectItem value="region">Région</SelectItem>
                      <SelectItem value="entreprise_privee">Entreprise privée</SelectItem>
                      <SelectItem value="association">Association</SelectItem>
                      <SelectItem value="syndic">Syndic</SelectItem>
                      <SelectItem value="particulier">Particulier</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="adresse">Adresse</Label>
                <Textarea
                  id="adresse"
                  {...form.register("adresse")}
                  placeholder="Adresse complète"
                  className="min-h-[60px]"
                  data-testid="textarea-adresse"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="codePostal">Code postal</Label>
                  <Input
                    id="codePostal"
                    {...form.register("codePostal")}
                    placeholder="00000"
                    data-testid="input-code-postal"
                  />
                </div>
                
                <div>
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    {...form.register("ville")}
                    placeholder="Nom de la ville"
                    data-testid="input-ville"
                  />
                </div>
                
                <div>
                  <Label htmlFor="departement">Département</Label>
                  <Select onValueChange={(value) => form.setValue("departement", value)}>
                    <SelectTrigger data-testid="select-departement">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 - Manche</SelectItem>
                      <SelectItem value="62">62 - Pas-de-Calais</SelectItem>
                      <SelectItem value="14">14 - Calvados</SelectItem>
                      <SelectItem value="76">76 - Seine-Maritime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    {...form.register("telephone")}
                    placeholder="01 23 45 67 89"
                    data-testid="input-telephone"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="contact@organisme.fr"
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="siteWeb">Site web</Label>
                  <Input
                    id="siteWeb"
                    {...form.register("siteWeb")}
                    placeholder="https://www.site.fr"
                    data-testid="input-site-web"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="siret">SIRET</Label>
                <Input
                  id="siret"
                  {...form.register("siret")}
                  placeholder="12345678901234"
                  data-testid="input-siret"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact principal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Contact principal</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPrincipalNom">Nom du contact</Label>
                  <Input
                    id="contactPrincipalNom"
                    {...form.register("contactPrincipalNom")}
                    placeholder="Prénom NOM"
                    data-testid="input-contact-nom"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactPrincipalPoste">Poste / Fonction</Label>
                  <Input
                    id="contactPrincipalPoste"
                    {...form.register("contactPrincipalPoste")}
                    placeholder="Directeur, Maire, etc."
                    data-testid="input-contact-poste"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactPrincipalTelephone">Téléphone du contact</Label>
                  <Input
                    id="contactPrincipalTelephone"
                    {...form.register("contactPrincipalTelephone")}
                    placeholder="01 23 45 67 89"
                    data-testid="input-contact-telephone"
                  />
                </div>
                
                <div>
                  <Label htmlFor="contactPrincipalEmail">Email du contact</Label>
                  <Input
                    id="contactPrincipalEmail"
                    type="email"
                    {...form.register("contactPrincipalEmail")}
                    placeholder="contact@organisme.fr"
                    data-testid="input-contact-email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes et remarques</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                {...form.register("notes")}
                placeholder="Remarques particulières, historique des relations, etc."
                className="min-h-[80px]"
                data-testid="textarea-notes"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              data-testid="button-save"
            >
              {createMutation.isPending 
                ? (mode === "create" ? "Création..." : "Modification...") 
                : (mode === "create" ? "Créer" : "Modifier")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}