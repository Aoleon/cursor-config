import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertOfferSchema } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

const createOfferFormSchema = insertOfferSchema.extend({
  reference: z.string().min(1, "La référence est requise"),
  client: z.string().min(1, "Le nom du client est requis"),
  location: z.string().min(1, "La localisation est requise"),
  menuiserieType: z.enum([
    "fenetres_pvc",
    "fenetres_aluminium", 
    "mur_rideau",
    "portes_bois",
    "portes_alu"
  ]),
  estimatedAmount: z.string().optional(),
  deadline: z.string().optional(),
  responsibleUserId: z.string().min(1, "Un responsable BE doit être sélectionné"),
});

type CreateOfferFormData = z.infer<typeof createOfferFormSchema>;

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateOfferModal({ isOpen, onClose }: CreateOfferModalProps) {
  const [selectedAoId, setSelectedAoId] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<CreateOfferFormData>({
    resolver: zodResolver(createOfferFormSchema),
    defaultValues: {
      reference: "",
      client: "",
      location: "",
      menuiserieType: "fenetres_pvc",
      estimatedAmount: "",
      deadline: "",
      responsibleUserId: user?.id || "",
    },
  });

  // Fetch available AOs for pre-filling data
  const { data: aos } = useQuery({
    queryKey: ["/api/aos"],
    enabled: isOpen,
  });

  // Create offer mutation
  const createOfferMutation = useMutation({
    mutationFn: async (data: CreateOfferFormData) => {
      const offerData = {
        ...data,
        aoId: selectedAoId || undefined,
        estimatedAmount: data.estimatedAmount ? data.estimatedAmount : undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        status: "en_cours_chiffrage" as const,
        isPriority: false,
      };
      await apiRequest("POST", "/api/offers", offerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Succès",
        description: "Dossier d'offre créé avec succès",
      });
      handleClose();
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
        description: "Impossible de créer le dossier d'offre",
        variant: "destructive",
      });
    },
  });

  // Handle AO selection and auto-fill data
  const handleAoSelection = (aoId: string) => {
    setSelectedAoId(aoId);
    const selectedAo = aos?.find((ao: any) => ao.id === aoId);
    
    if (selectedAo) {
      form.setValue("client", selectedAo.client);
      form.setValue("location", selectedAo.location);
      form.setValue("menuiserieType", selectedAo.menuiserieType);
      if (selectedAo.estimatedAmount) {
        form.setValue("estimatedAmount", selectedAo.estimatedAmount);
      }
      
      // Generate reference based on AO reference
      const newReference = selectedAo.reference.replace("AO-", "OFF-");
      form.setValue("reference", newReference);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedAoId("");
    onClose();
  };

  const onSubmit = (data: CreateOfferFormData) => {
    createOfferMutation.mutate(data);
  };

  // Set user as default responsible when dialog opens
  useEffect(() => {
    if (isOpen && user?.id) {
      form.setValue("responsibleUserId", user.id);
    }
  }, [isOpen, user?.id, form]);

  const menuiserieTypeOptions = [
    { value: "fenetres_pvc", label: "Fenêtres PVC" },
    { value: "fenetres_aluminium", label: "Fenêtres Aluminium" },
    { value: "mur_rideau", label: "Mur-rideau" },
    { value: "portes_bois", label: "Portes Bois" },
    { value: "portes_alu", label: "Portes Alu" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium text-gray-900">
              Créer un Nouveau Dossier d'Offre
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* AO Selection for pre-filling */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Référence AO Existante
                </label>
                <Select value={selectedAoId} onValueChange={handleAoSelection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un AO existant..." />
                  </SelectTrigger>
                  <SelectContent>
                    {aos?.map((ao: any) => (
                      <SelectItem key={ao.id} value={ao.id}>
                        {ao.reference} - {ao.client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  Les données seront automatiquement pré-remplies
                </p>
              </div>

              {/* Reference */}
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence du Dossier</FormLabel>
                    <FormControl>
                      <Input placeholder="OFF-2024-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsible User */}
              <FormField
                control={form.control}
                name="responsibleUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsable BE</FormLabel>
                    <FormControl>
                      <Input
                        value={user ? `${user.firstName} ${user.lastName}` : ""}
                        disabled
                        className="bg-gray-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Client */}
              <FormField
                control={form.control}
                name="client"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client / Projet</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom du client ou projet" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localisation</FormLabel>
                    <FormControl>
                      <Input placeholder="Ville, adresse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Menuiserie Type */}
              <FormField
                control={form.control}
                name="menuiserieType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de Menuiserie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {menuiserieTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimated Amount */}
              <FormField
                control={form.control}
                name="estimatedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant Estimé (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="150000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Deadline */}
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Date d'échéance</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createOfferMutation.isPending}
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={createOfferMutation.isPending}
                className="bg-primary hover:bg-primary-dark"
              >
                {createOfferMutation.isPending ? "Création..." : "Créer le Dossier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
