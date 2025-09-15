import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Building, User, Phone, Mail, Plus, Trash2, Star } from "lucide-react";

// Schéma de validation pour les contacts
const contactSchema = z.object({
  nom: z.string().min(1, "Le nom est obligatoire"),
  prenom: z.string().optional(),
  poste: z.enum(["directeur", "responsable", "technicien", "assistant", "architecte", "ingenieur", "coordinateur", "autre"]),
  posteLibre: z.string().optional(),
  telephone: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email("Email invalide"),
  isContactPrincipal: z.boolean().default(false),
});

// Schéma de validation pour le maître d'œuvre
const maitreOeuvreSchema = z.object({
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
  specialites: z.string().optional(),
  notes: z.string().optional(),
  contacts: z.array(contactSchema).optional(),
});

type MaitreOeuvreFormData = z.infer<typeof maitreOeuvreSchema>;
type ContactFormData = z.infer<typeof contactSchema>;

interface MaitreOeuvreFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (maitreOeuvre: any) => void;
  initialData?: any;
  mode?: "create" | "edit";
  maitreOeuvreId?: string;
}

export function MaitreOeuvreForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData,
  mode = "create",
  maitreOeuvreId 
}: MaitreOeuvreFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MaitreOeuvreFormData>({
    resolver: zodResolver(maitreOeuvreSchema),
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
      specialites: "",
      notes: "",
      contacts: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  // Charger les données initiales si en mode édition
  useEffect(() => {
    if (initialData && mode === "edit") {
      form.reset({
        ...initialData,
        contacts: Array.isArray(initialData.contacts) ? initialData.contacts : [],
      });
    }
  }, [initialData, mode, form]);

  const saveMaitreOeuvre = useMutation({
    mutationFn: async (data: MaitreOeuvreFormData) => {
      const url = mode === "create" ? "/api/maitres-oeuvre" : `/api/maitres-oeuvre/${maitreOeuvreId}`;
      const method = mode === "create" ? "POST" : "PUT";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save maître d\'œuvre');
      }
      
      return response.json();
    },
    onSuccess: async (newMaitreOeuvre) => {
      // Créer ou mettre à jour les contacts
      const contacts = form.getValues("contacts");
      if (contacts && Array.isArray(contacts) && contacts.length > 0) {
        await saveContacts(newMaitreOeuvre.id, contacts);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/maitres-oeuvre"] });
      
      toast({
        title: mode === "create" ? "Maître d'œuvre créé" : "Maître d'œuvre modifié",
        description: `${newMaitreOeuvre.nom} a été ${mode === "create" ? "créé" : "modifié"} avec succès`,
      });
      
      onSuccess?.(newMaitreOeuvre);
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      console.error("Error saving maître d'œuvre:", error);
      toast({
        title: "Erreur",
        description: `Impossible de ${mode === "create" ? "créer" : "modifier"} le maître d'œuvre`,
        variant: "destructive",
      });
    },
  });

  const saveContacts = async (maitreOeuvreId: string, contacts: ContactFormData[] | undefined) => {
    if (!contacts || !Array.isArray(contacts)) return;
    try {
      // Créer les nouveaux contacts
      const contactPromises = contacts.map(contact => 
        fetch(`/api/maitres-oeuvre/${maitreOeuvreId}/contacts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contact),
        })
      );
      
      await Promise.all(contactPromises);
    } catch (error) {
      console.error("Error saving contacts:", error);
      toast({
        title: "Attention",
        description: "Le maître d'œuvre a été sauvegardé mais certains contacts n'ont pas pu être créés",
        variant: "destructive",
      });
    }
  };

  const addContact = () => {
    append({
      nom: "",
      prenom: "",
      poste: "architecte",
      posteLibre: "",
      telephone: "",
      mobile: "",
      email: "",
      isContactPrincipal: fields.length === 0, // Premier contact = principal par défaut
    });
  };

  const removeContact = (index: number) => {
    remove(index);
  };

  const setAsMainContact = (index: number) => {
    // Marquer tous les autres comme non principal
    fields.forEach((_, i) => {
      if (i !== index) {
        update(i, { ...form.getValues(`contacts.${i}`), isContactPrincipal: false });
      }
    });
    // Marquer celui-ci comme principal
    update(index, { ...form.getValues(`contacts.${index}`), isContactPrincipal: true });
  };

  const onSubmit = (data: MaitreOeuvreFormData) => {
    // Vérifier qu'il y a au moins un contact principal si des contacts existent
    if (data.contacts && data.contacts.length > 0) {
      const hasMainContact = data.contacts.some(c => c.isContactPrincipal);
      if (!hasMainContact) {
        toast({
          title: "Contact principal requis",
          description: "Veuillez désigner un contact principal",
          variant: "destructive",
        });
        return;
      }
    }
    
    saveMaitreOeuvre.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const getPosteLabel = (poste: string) => {
    const postes = {
      directeur: "Directeur",
      responsable: "Responsable",
      technicien: "Technicien",
      assistant: "Assistant",
      architecte: "Architecte",
      ingenieur: "Ingénieur",
      coordinateur: "Coordinateur",
      autre: "Autre",
    };
    return postes[poste as keyof typeof postes] || poste;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>
              {mode === "create" ? "Créer un maître d'œuvre" : "Modifier le maître d'œuvre"}
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
                    placeholder="Nom du cabinet/bureau"
                    data-testid="input-nom"
                  />
                  {form.formState.errors.nom && (
                    <p className="text-sm text-error mt-1">{form.formState.errors.nom.message}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="typeOrganisation">Type d'organisation</Label>
                  <Select onValueChange={(value) => form.setValue("typeOrganisation", value)}>
                    <SelectTrigger data-testid="select-type-organisation">
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cabinet_architecture">Cabinet d'architecture</SelectItem>
                      <SelectItem value="bureau_etudes">Bureau d'études</SelectItem>
                      <SelectItem value="economiste">Économiste de la construction</SelectItem>
                      <SelectItem value="bet">BET (Bureau d'Études Techniques)</SelectItem>
                      <SelectItem value="moe_global">MOE Global</SelectItem>
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
                    placeholder="contact@cabinet.fr"
                    data-testid="input-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="siteWeb">Site web</Label>
                  <Input
                    id="siteWeb"
                    {...form.register("siteWeb")}
                    placeholder="https://www.cabinet.fr"
                    data-testid="input-site-web"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    {...form.register("siret")}
                    placeholder="12345678901234"
                    data-testid="input-siret"
                  />
                </div>
                
                <div>
                  <Label htmlFor="specialites">Spécialités</Label>
                  <Input
                    id="specialites"
                    {...form.register("specialites")}
                    placeholder="Logement, Tertiaire, Industriel..."
                    data-testid="input-specialites"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Contacts ({fields.length})</span>
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addContact}
                  data-testid="button-add-contact"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-on-surface-muted">
                  <User className="h-12 w-12 mx-auto mb-4 text-on-surface-muted" />
                  <p>Aucun contact ajouté</p>
                  <p className="text-sm">Cliquez sur "Ajouter un contact" pour commencer</p>
                </div>
              ) : (
                fields.map((field, index) => (
                  <Card key={field.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-2">
                          <Badge variant={form.watch(`contacts.${index}.isContactPrincipal`) ? "default" : "secondary"}>
                            Contact #{index + 1}
                          </Badge>
                          {form.watch(`contacts.${index}.isContactPrincipal`) && (
                            <Badge variant="outline" className="text-warning border-warning">
                              <Star className="h-3 w-3 mr-1" />
                              Principal
                            </Badge>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          {!form.watch(`contacts.${index}.isContactPrincipal`) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setAsMainContact(index)}
                              data-testid={`button-set-main-${index}`}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Principal
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeContact(index)}
                            data-testid={`button-remove-contact-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`contacts.${index}.nom`}>Nom *</Label>
                          <Input
                            {...form.register(`contacts.${index}.nom`)}
                            placeholder="Nom de famille"
                            data-testid={`input-contact-nom-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`contacts.${index}.prenom`}>Prénom</Label>
                          <Input
                            {...form.register(`contacts.${index}.prenom`)}
                            placeholder="Prénom"
                            data-testid={`input-contact-prenom-${index}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <Label htmlFor={`contacts.${index}.poste`}>Poste *</Label>
                          <Select 
                            onValueChange={(value) => form.setValue(`contacts.${index}.poste` as any, value)}
                            defaultValue={form.getValues(`contacts.${index}.poste`)}
                          >
                            <SelectTrigger data-testid={`select-contact-poste-${index}`}>
                              <SelectValue placeholder="Sélectionner..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="directeur">Directeur</SelectItem>
                              <SelectItem value="responsable">Responsable</SelectItem>
                              <SelectItem value="architecte">Architecte</SelectItem>
                              <SelectItem value="ingenieur">Ingénieur</SelectItem>
                              <SelectItem value="coordinateur">Coordinateur</SelectItem>
                              <SelectItem value="technicien">Technicien</SelectItem>
                              <SelectItem value="assistant">Assistant</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {form.watch(`contacts.${index}.poste`) === "autre" && (
                          <div>
                            <Label htmlFor={`contacts.${index}.posteLibre`}>Préciser le poste</Label>
                            <Input
                              {...form.register(`contacts.${index}.posteLibre`)}
                              placeholder="Titre du poste"
                              data-testid={`input-contact-poste-libre-${index}`}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <Label htmlFor={`contacts.${index}.telephone`}>Téléphone</Label>
                          <Input
                            {...form.register(`contacts.${index}.telephone`)}
                            placeholder="01 23 45 67 89"
                            data-testid={`input-contact-telephone-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`contacts.${index}.mobile`}>Mobile</Label>
                          <Input
                            {...form.register(`contacts.${index}.mobile`)}
                            placeholder="06 12 34 56 78"
                            data-testid={`input-contact-mobile-${index}`}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`contacts.${index}.email`}>Email *</Label>
                          <Input
                            type="email"
                            {...form.register(`contacts.${index}.email`)}
                            placeholder="prenom.nom@cabinet.fr"
                            data-testid={`input-contact-email-${index}`}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
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
                placeholder="Remarques particulières, historique des relations, spécialités techniques, etc."
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
              disabled={saveMaitreOeuvre.isPending}
              data-testid="button-save"
            >
              {saveMaitreOeuvre.isPending 
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