import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Calendar,
  FileText,
  Award,
  Target,
  Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface MilestoneTrackerProps {
  offerId?: string;
}

export default function MilestoneTracker({ offerId }: MilestoneTrackerProps) {
  const [selectedOfferId, setSelectedOfferId] = useState<string>(offerId || '');
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch offers for selection
  const { data: offers = [] } = useQuery<any[]>({
    queryKey: ['/api/offers/'],
  });

  // Fetch validation milestones
  const { data: milestones = [] } = useQuery<any[]>({
    queryKey: ['/api/validation-milestones/', selectedOfferId],
    enabled: !!selectedOfferId,
  });

  // Fetch users for validation assignment
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ['/api/users/'],
  });

  // Get selected offer details
  const selectedOffer = offers.find((offer: any) => offer.id === selectedOfferId);

  // Create validation milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/validation-milestones/`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation-milestones/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers/'] });
      setIsValidationDialogOpen(false);
      toast({
        title: "Jalon validé",
        description: "Le jalon de validation a été enregistré avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Impossible de valider le jalon. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Validate milestone mutation
  const validateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, status, comment }: any) => {
      return apiRequest(`/api/validation-milestones/${milestoneId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, validationComment: comment }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/validation-milestones/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers/'] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du jalon a été mis à jour.",
      });
    },
  });

  const handleCreateMilestone = (formData: FormData) => {
    const data = {
      offerId: selectedOfferId,
      milestoneType: formData.get('milestoneType') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      expectedCompletionDate: formData.get('expectedCompletionDate') as string,
      assignedUserId: formData.get('assignedUserId') as string,
      status: 'en_attente',
    };

    createMilestoneMutation.mutate(data);
  };

  const getMilestoneTypeIcon = (type: string) => {
    switch (type) {
      case 'fin_etudes':
        return <Award className="h-5 w-5 text-green-600" />;
      case 'validation_technique':
        return <Target className="h-5 w-5 text-blue-600" />;
      case 'validation_commerciale':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'validation_production':
        return <Zap className="h-5 w-5 text-orange-600" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMilestoneTypeLabel = (type: string) => {
    switch (type) {
      case 'fin_etudes':
        return 'Fin d\'Études';
      case 'validation_technique':
        return 'Validation Technique';
      case 'validation_commerciale':
        return 'Validation Commerciale';
      case 'validation_production':
        return 'Validation Production';
      default:
        return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_cours':
        return 'bg-blue-100 text-blue-800';
      case 'valide':
        return 'bg-green-100 text-green-800';
      case 'rejete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'en_attente':
        return 'En Attente';
      case 'en_cours':
        return 'En Cours';
      case 'valide':
        return 'Validé';
      case 'rejete':
        return 'Rejeté';
      default:
        return status;
    }
  };

  const calculateProgress = () => {
    if (milestones.length === 0) return 0;
    const completed = milestones.filter((m: any) => m.status === 'valide').length;
    return Math.round((completed / milestones.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Offer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Sélection de l'Offre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="offer-select">Offre à suivre</Label>
              <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une offre" />
                </SelectTrigger>
                <SelectContent>
                  {offers.map((offer: any) => (
                    <SelectItem key={offer.id} value={offer.id}>
                      {offer.reference} - {offer.client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedOffer && (
              <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Nouveau Jalon
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleCreateMilestone(formData);
                  }}>
                    <DialogHeader>
                      <DialogTitle>Créer un Jalon de Validation</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="milestoneType">Type de Jalon</Label>
                        <Select name="milestoneType" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner le type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fin_etudes">Fin d'Études</SelectItem>
                            <SelectItem value="validation_technique">Validation Technique</SelectItem>
                            <SelectItem value="validation_commerciale">Validation Commerciale</SelectItem>
                            <SelectItem value="validation_production">Validation Production</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assignedUserId">Responsable</Label>
                        <Select name="assignedUserId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Assigner à" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter((user: any) => ['responsable_be', 'technicien_be', 'admin'].includes(user.role)).map((user: any) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="title">Titre du Jalon</Label>
                        <Input
                          id="title"
                          name="title"
                          placeholder="ex: Validation finale des plans d'exécution"
                          required
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          placeholder="Détails des éléments à valider..."
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expectedCompletionDate">Date d'Échéance</Label>
                        <Input
                          id="expectedCompletionDate"
                          name="expectedCompletionDate"
                          type="date"
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsValidationDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={createMilestoneMutation.isPending}>
                        {createMilestoneMutation.isPending ? 'Création...' : 'Créer le Jalon'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Offer Overview */}
      {selectedOffer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Suivi des Jalons - {selectedOffer.reference}
              </div>
              <Badge className={getStatusColor(selectedOffer.status)}>
                {getStatusLabel(selectedOffer.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">Client:</span>
                <p className="font-medium">{selectedOffer.client}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Montant:</span>
                <p className="font-medium">€{Number(selectedOffer.estimatedAmount).toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Responsable BE:</span>
                <p className="font-medium">
                  {selectedOffer.responsibleUser?.firstName} {selectedOffer.responsibleUser?.lastName}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression des Jalons</span>
                <span>{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
              <p className="text-sm text-gray-600">
                {milestones.filter((m: any) => m.status === 'valide').length} sur {milestones.length} jalons validés
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestones List */}
      {selectedOfferId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Jalons de Validation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((milestone: any) => (
                <div key={milestone.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getMilestoneTypeIcon(milestone.milestoneType)}
                      <div>
                        <h4 className="font-medium">{milestone.title}</h4>
                        <p className="text-sm text-gray-600">
                          {getMilestoneTypeLabel(milestone.milestoneType)}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(milestone.status)}>
                      {getStatusLabel(milestone.status)}
                    </Badge>
                  </div>

                  {milestone.description && (
                    <p className="text-sm text-gray-700 mb-3">{milestone.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Assigné à:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={milestone.assignedUser?.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {milestone.assignedUser?.firstName?.[0]}{milestone.assignedUser?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {milestone.assignedUser?.firstName} {milestone.assignedUser?.lastName}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Échéance:</span>
                      <p className="font-medium">
                        {format(new Date(milestone.expectedCompletionDate), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Créé le:</span>
                      <p className="font-medium">
                        {format(new Date(milestone.createdAt), 'dd/MM/yyyy', { locale: fr })}
                      </p>
                    </div>
                  </div>

                  {milestone.status !== 'valide' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => validateMilestoneMutation.mutate({
                          milestoneId: milestone.id,
                          status: 'valide',
                          comment: 'Jalon validé'
                        })}
                        disabled={validateMilestoneMutation.isPending}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => validateMilestoneMutation.mutate({
                          milestoneId: milestone.id,
                          status: 'rejete',
                          comment: 'Jalon rejeté - révision nécessaire'
                        })}
                        disabled={validateMilestoneMutation.isPending}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  )}

                  {milestone.validationComment && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <strong>Commentaire:</strong> {milestone.validationComment}
                    </div>
                  )}

                  {milestone.completedAt && (
                    <div className="mt-2 text-sm text-green-600">
                      ✓ Validé le {format(new Date(milestone.completedAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </div>
                  )}
                </div>
              ))}

              {milestones.length === 0 && selectedOfferId && (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun jalon de validation créé</p>
                  <p className="text-sm">Créez le premier jalon pour commencer le suivi</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedOfferId && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
            <p className="text-gray-500">Sélectionnez une offre pour gérer ses jalons de validation</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}