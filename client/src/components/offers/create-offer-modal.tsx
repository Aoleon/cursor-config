import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateOfferModal({ isOpen, onClose }: CreateOfferModalProps) {
  const [formData, setFormData] = useState({
    aoId: '',
    client: '',
    location: '',
    menuiserieType: '',
    estimatedAmount: '',
    responsibleUserId: '',
    deadline: '',
    isPriority: false,
    description: '',
  });

  const { toast } = useToast();

  // Fetch AOs for dropdown
  const { data: aos = [] } = useQuery({
    queryKey: ['/api/aos'],
  });

  // Fetch users for responsible assignment
  const { data: users = [] } = useQuery({
    queryKey: ['/api/users/'],
  });

  const createOfferMutation = useMutation({
    mutationFn: async (offerData: any) => {
      const response = await fetch('/api/offers/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offerData),
      });
      if (!response.ok) throw new Error('Failed to create offer');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({
        title: "Offre créée",
        description: "Le nouvel appel d'offre a été créé avec succès.",
      });
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'appel d'offre.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      aoId: '',
      client: '',
      location: '',
      menuiserieType: '',
      estimatedAmount: '',
      responsibleUserId: '',
      deadline: '',
      isPriority: false,
      description: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate reference
    const now = new Date();
    const year = now.getFullYear();
    const reference = `OFF-${year}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

    createOfferMutation.mutate({
      ...formData,
      reference,
      status: 'brouillon',
      estimatedAmount: formData.estimatedAmount ? parseFloat(formData.estimatedAmount) : 0,
      aoId: formData.aoId === 'none' ? null : formData.aoId,
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Créer un Nouvel Appel d'Offre</DialogTitle>
            <DialogDescription>
              Créer un nouvel appel d'offre pour le chiffrage
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="aoId">AO Source (optionnel)</Label>
              <Select value={formData.aoId} onValueChange={(value) => handleInputChange('aoId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un AO" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun AO source</SelectItem>
                  {(aos as any[]).map((ao: any) => (
                    <SelectItem key={ao.id} value={ao.id}>
                      {ao.reference} - {ao.client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client *</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => handleInputChange('client', e.target.value)}
                placeholder="Nom du client"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localisation *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Ville, Département"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menuiserieType">Type de Menuiserie *</Label>
              <Select value={formData.menuiserieType} onValueChange={(value) => handleInputChange('menuiserieType', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fenetres">Fenêtres</SelectItem>
                  <SelectItem value="portes">Portes</SelectItem>
                  <SelectItem value="bardage">Bardage</SelectItem>
                  <SelectItem value="mur_rideau">Mur rideau</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedAmount">Montant Estimé (€) *</Label>
              <Input
                id="estimatedAmount"
                type="number"
                step="0.01"
                value={formData.estimatedAmount}
                onChange={(e) => handleInputChange('estimatedAmount', e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsibleUserId">Responsable BE</Label>
              <Select value={formData.responsibleUserId} onValueChange={(value) => handleInputChange('responsibleUserId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Assigner un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {(users as any[]).filter((user: any) => ['responsable_be', 'technicien_be'].includes(user.role)).map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Date Limite</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Description détaillée du projet..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2 col-span-2">
              <Switch
                id="isPriority"
                checked={formData.isPriority}
                onCheckedChange={(checked) => handleInputChange('isPriority', checked)}
              />
              <Label htmlFor="isPriority">Marquer comme prioritaire</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createOfferMutation.isPending}>
              {createOfferMutation.isPending ? 'Création...' : 'Créer l\'Offre'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}