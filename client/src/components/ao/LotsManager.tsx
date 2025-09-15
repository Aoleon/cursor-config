import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, Plus, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lot {
  id?: string;
  numero: string;
  designation: string;
  menuiserieType?: string;
  montantEstime?: string;
  isSelected: boolean;
  comment?: string;
}

interface LotsManagerProps {
  lots: Lot[];
  onLotsChange: (lots: Lot[]) => void;
  disabled?: boolean;
}

export function LotsManager({ lots, onLotsChange, disabled = false }: LotsManagerProps) {
  const { toast } = useToast();
  const [lotToDelete, setLotToDelete] = useState<{index: number, lot: Lot} | null>(null);
  const [newLot, setNewLot] = useState<Omit<Lot, 'id'>>({
    numero: "",
    designation: "",
    menuiserieType: "",
    montantEstime: "",
    isSelected: false,
    comment: ""
  });

  const addLot = () => {
    if (!newLot.numero.trim() || !newLot.designation.trim()) {
      toast({
        title: "Erreur",
        description: "Le numéro et la désignation du lot sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    // Vérifier que le numéro n'existe pas déjà
    if (lots.some(lot => lot.numero === newLot.numero)) {
      toast({
        title: "Erreur",
        description: "Ce numéro de lot existe déjà",
        variant: "destructive",
      });
      return;
    }

    const lot: Lot = {
      ...newLot,
      id: `temp-${Date.now()}`, // ID temporaire pour les nouveaux lots
    };

    onLotsChange([...lots, lot]);
    
    // Réinitialiser le formulaire
    setNewLot({
      numero: "",
      designation: "",
      menuiserieType: "",
      montantEstime: "",
      isSelected: false,
      comment: ""
    });

    toast({
      title: "Lot ajouté",
      description: `Le lot ${lot.numero} a été ajouté avec succès`,
    });
  };

  const confirmRemoveLot = () => {
    if (!lotToDelete) return;
    
    const { index, lot } = lotToDelete;
    const updatedLots = lots.filter((_, i) => i !== index);
    onLotsChange(updatedLots);
    
    toast({
      title: "Lot supprimé",
      description: `Le lot ${lot.numero} a été supprimé avec succès`,
    });
    
    setLotToDelete(null);
  };

  const updateLot = (index: number, field: keyof Lot, value: any) => {
    const updatedLots = [...lots];
    updatedLots[index] = { ...updatedLots[index], [field]: value };
    onLotsChange(updatedLots);
  };

  const calculateDateRendu = (dateLimiteRemise?: string) => {
    if (!dateLimiteRemise) return "";
    
    // Calculer la date de rendu automatiquement (3 jours avant la limite de remise)
    const dateLimite = new Date(dateLimiteRemise);
    const dateRendu = new Date(dateLimite);
    dateRendu.setDate(dateRendu.getDate() - 3);
    
    return dateRendu.toISOString().split('T')[0];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Gestion des Lots</span>
          {lots.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({lots.length} lot{lots.length > 1 ? 's' : ''})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Liste des lots existants */}
        {lots.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Lots de l'AO :</h4>
            {lots.map((lot, index) => (
              <div key={lot.id || index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Label className="font-medium">{lot.numero}</Label>
                    <span className="text-sm text-muted-foreground">-</span>
                    <span className="text-sm">{lot.designation}</span>
                  </div>
                  {!disabled && (
                    <TooltipProvider>
                      <Tooltip>
                        <AlertDialog open={lotToDelete?.index === index} onOpenChange={(open) => !open && setLotToDelete(null)}>
                          <AlertDialogTrigger asChild>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setLotToDelete({index, lot})}
                                data-testid={`button-remove-lot-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                          </AlertDialogTrigger>
                          <TooltipContent>
                            <p>Supprimer le lot {lot.numero}</p>
                          </TooltipContent>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer le lot</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer le lot <strong>{lot.numero} - {lot.designation}</strong> ?
                                Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={confirmRemoveLot} className="bg-error hover:bg-error">
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Type de menuiserie</Label>
                    <Select
                      value={lot.menuiserieType}
                      onValueChange={(value) => updateLot(index, 'menuiserieType', value)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fenetre">Fenêtre</SelectItem>
                        <SelectItem value="porte">Porte</SelectItem>
                        <SelectItem value="portail">Portail</SelectItem>
                        <SelectItem value="volet">Volet</SelectItem>
                        <SelectItem value="cloison">Cloison</SelectItem>
                        <SelectItem value="verriere">Verrière</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Montant estimé (€)</Label>
                    <Input
                      type="number"
                      value={lot.montantEstime}
                      onChange={(e) => updateLot(index, 'montantEstime', e.target.value)}
                      placeholder="0"
                      className="h-8"
                      disabled={disabled}
                    />
                  </div>
                </div>
                
                {lot.comment && (
                  <div>
                    <Label className="text-xs">Commentaire</Label>
                    <p className="text-sm text-on-surface-muted bg-surface-muted p-2 rounded">{lot.comment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Formulaire d'ajout de nouveau lot */}
        {!disabled && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-3">Ajouter un nouveau lot :</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="lot-numero">Numéro du lot *</Label>
                  <Input
                    id="lot-numero"
                    value={newLot.numero}
                    onChange={(e) => setNewLot({ ...newLot, numero: e.target.value })}
                    placeholder="Lot 01, Lot A, etc."
                    data-testid="input-lot-numero"
                  />
                </div>
                
                <div>
                  <Label htmlFor="lot-type">Type de menuiserie</Label>
                  <Select
                    value={newLot.menuiserieType}
                    onValueChange={(value) => setNewLot({ ...newLot, menuiserieType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fenetre">Fenêtre</SelectItem>
                      <SelectItem value="porte">Porte</SelectItem>
                      <SelectItem value="portail">Portail</SelectItem>
                      <SelectItem value="volet">Volet</SelectItem>
                      <SelectItem value="cloison">Cloison</SelectItem>
                      <SelectItem value="verriere">Verrière</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="lot-designation">Désignation *</Label>
                <Textarea
                  id="lot-designation"
                  value={newLot.designation}
                  onChange={(e) => setNewLot({ ...newLot, designation: e.target.value })}
                  placeholder="Description détaillée du lot..."
                  className="min-h-[60px]"
                  data-testid="textarea-lot-designation"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="lot-montant">Montant estimé (€)</Label>
                  <Input
                    id="lot-montant"
                    type="number"
                    value={newLot.montantEstime}
                    onChange={(e) => setNewLot({ ...newLot, montantEstime: e.target.value })}
                    placeholder="0"
                    data-testid="input-lot-montant"
                  />
                </div>
                
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={addLot}
                    className="w-full"
                    data-testid="button-add-lot"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter le lot
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="lot-comment">Commentaire (optionnel)</Label>
                <Textarea
                  id="lot-comment"
                  value={newLot.comment}
                  onChange={(e) => setNewLot({ ...newLot, comment: e.target.value })}
                  placeholder="Remarques particulières sur ce lot..."
                  className="min-h-[40px]"
                />
              </div>
            </div>
          </div>
        )}

        {lots.length === 0 && disabled && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucun lot défini pour cet AO</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}