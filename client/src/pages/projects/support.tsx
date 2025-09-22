import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Headphones, 
  Ticket, 
  CheckCircle, 
  Clock, 
  Calendar, 
  MapPin, 
  User, 
  Phone,
  Mail,
  AlertTriangle,
  Wrench,
  FileText,
  Eye,
  Plus,
  Shield,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Project } from "@shared/schema";

export default function ProjectSupport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newTicketData, setNewTicketData] = useState({
    projectId: '',
    title: '',
    description: '',
    priority: 'medium',
    type: 'maintenance'
  });

  // Récupérer les projets en phase SAV
  const { data: supportProjects = [], isLoading, error } = useQuery<Project[]>({
    queryKey: ["/api/projects", { status: "sav" }],
    queryFn: async () => {
      const response = await fetch("/api/projects?status=sav");
      if (!response.ok) throw new Error("Failed to fetch support projects");
      return response.json();
    },
  });

  // Récupérer les tickets SAV
  const { data: supportTickets = [] } = useQuery({
    queryKey: ["/api/support-tickets"],
    queryFn: async () => {
      const response = await fetch("/api/support-tickets");
      if (!response.ok) throw new Error("Failed to fetch support tickets");
      return response.json();
    },
  });

  // Mutation pour créer un ticket SAV
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: typeof newTicketData) => {
      return await apiRequest('/api/support-tickets', 'POST', ticketData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      toast({
        title: "Ticket Créé",
        description: "Le ticket SAV a été créé avec succès.",
      });
      setNewTicketData({
        projectId: '',
        title: '',
        description: '',
        priority: 'medium',
        type: 'maintenance'
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le ticket SAV. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour résoudre un ticket
  const resolveTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      return await apiRequest(`/api/support-tickets/${ticketId}`, 'PATCH', {
        status: 'resolved',
        resolvedAt: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-tickets"] });
      toast({
        title: "Ticket Résolu",
        description: "Le ticket SAV a été marqué comme résolu.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de résoudre le ticket. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const getProjectTickets = (projectId: string) => {
    return supportTickets.filter((ticket: any) => ticket.projectId === projectId);
  };

  const getTicketStats = (projectId: string) => {
    const tickets = getProjectTickets(projectId);
    return {
      total: tickets.length,
      open: tickets.filter((t: any) => t.status === 'open').length,
      inProgress: tickets.filter((t: any) => t.status === 'in_progress').length,
      resolved: tickets.filter((t: any) => t.status === 'resolved').length
    };
  };

  const getWarrantyStatus = (project: Project) => {
    // Fallback: utiliser dateLivraisonReelle ou dateFinChantier comme date de completion
    const completedAt = project.dateLivraisonReelle || project.dateFinChantier;
    if (!completedAt) return 'unknown';
    
    const completedDate = new Date(completedAt);
    const now = new Date();
    const monthsElapsed = (now.getTime() - completedDate.getTime()) / (1000 * 3600 * 24 * 30);
    
    if (monthsElapsed < 12) return 'active';
    if (monthsElapsed < 24) return 'extended';
    return 'expired';
  };

  const getWarrantyColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'extended': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWarrantyLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Garantie Active';
      case 'extended': return 'Garantie Étendue';
      case 'expired': return 'Garantie Expirée';
      default: return 'Statut Inconnu';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgent';
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      default: return 'Basse';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'open': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved': return 'Résolu';
      case 'in_progress': return 'En cours';
      case 'open': return 'Ouvert';
      default: return status;
    }
  };

  return (
    <>
        <Header
          title="Projets - Service Après-Vente"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Projets", href: "/projects" },
            { label: "SAV" }
          ]}
          actions={[
            {
              label: "Vue Générale",
              variant: "outline",
              icon: "eye",
              onClick: () => setLocation("/projects")
            }
          ]}
        />

        <div className="px-6 py-6">
          <Tabs defaultValue="list" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="list" className="flex items-center gap-2" data-testid="tab-list">
                <Headphones className="h-4 w-4" />
                Projets SAV
              </TabsTrigger>
              <TabsTrigger value="tickets" className="flex items-center gap-2" data-testid="tab-tickets">
                <Ticket className="h-4 w-4" />
                Tickets Ouverts
                {supportTickets.filter((t: any) => t.status === 'open').length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {supportTickets.filter((t: any) => t.status === 'open').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="warranty" className="flex items-center gap-2" data-testid="tab-warranty">
                <Shield className="h-4 w-4" />
                Garanties
              </TabsTrigger>
              <TabsTrigger value="interventions" className="flex items-center gap-2" data-testid="tab-interventions">
                <Wrench className="h-4 w-4" />
                Interventions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : supportProjects.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Headphones className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucun projet en phase SAV.</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setLocation("/projects")}
                      data-testid="button-view-all-projects"
                    >
                      Voir tous les projets
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {supportProjects.map((project) => {
                    const ticketStats = getTicketStats(project.id);
                    const warrantyStatus = getWarrantyStatus(project);
                    
                    return (
                      <Card
                        key={project.id}
                        className="hover:shadow-lg transition-shadow cursor-pointer"
                        data-testid={`project-card-${project.id}`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            <div className="flex gap-2">
                              <Badge className="bg-purple-100 text-purple-800">
                                SAV
                              </Badge>
                              <Badge className={getWarrantyColor(warrantyStatus)}>
                                {getWarrantyLabel(warrantyStatus)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <User className="w-4 h-4" />
                            <span>{project.client}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{project.location}</span>
                          </div>

                          {(project.dateLivraisonReelle || project.dateFinChantier) && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Livré: {format(new Date(project.dateLivraisonReelle || project.dateFinChantier!), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          )}

                          <div className="p-3 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Tickets SAV</span>
                              <div className="flex gap-1">
                                {ticketStats.open > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {ticketStats.open} ouvert(s)
                                  </Badge>
                                )}
                                {ticketStats.inProgress > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {ticketStats.inProgress} en cours
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <div>Total: {ticketStats.total}</div>
                              <div>Ouverts: {ticketStats.open}</div>
                              <div>Résolus: {ticketStats.resolved}</div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLocation(`/projects/${project.id}`)}
                              className="flex-1"
                              data-testid={`button-view-${project.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Voir
                            </Button>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setNewTicketData({...newTicketData, projectId: project.id})}
                                  data-testid={`button-create-ticket-${project.id}`}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Ticket
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Créer un Ticket SAV</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="title">Titre</Label>
                                    <Input
                                      id="title"
                                      value={newTicketData.title}
                                      onChange={(e) => setNewTicketData({...newTicketData, title: e.target.value})}
                                      placeholder="Titre du ticket"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                      id="description"
                                      value={newTicketData.description}
                                      onChange={(e) => setNewTicketData({...newTicketData, description: e.target.value})}
                                      placeholder="Description du problème"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor="priority">Priorité</Label>
                                      <select
                                        id="priority"
                                        value={newTicketData.priority}
                                        onChange={(e) => setNewTicketData({...newTicketData, priority: e.target.value})}
                                        className="w-full p-2 border rounded"
                                      >
                                        <option value="low">Basse</option>
                                        <option value="medium">Moyenne</option>
                                        <option value="high">Haute</option>
                                        <option value="urgent">Urgent</option>
                                      </select>
                                    </div>
                                    <div>
                                      <Label htmlFor="type">Type</Label>
                                      <select
                                        id="type"
                                        value={newTicketData.type}
                                        onChange={(e) => setNewTicketData({...newTicketData, type: e.target.value})}
                                        className="w-full p-2 border rounded"
                                      >
                                        <option value="maintenance">Maintenance</option>
                                        <option value="repair">Réparation</option>
                                        <option value="warranty">Garantie</option>
                                        <option value="improvement">Amélioration</option>
                                      </select>
                                    </div>
                                  </div>
                                  <Button
                                    onClick={() => createTicketMutation.mutate(newTicketData)}
                                    disabled={!newTicketData.title || !newTicketData.description || createTicketMutation.isPending}
                                    className="w-full"
                                  >
                                    {createTicketMutation.isPending ? "Création..." : "Créer Ticket"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tickets" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Tickets SAV Ouverts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {supportTickets.filter((t: any) => t.status !== 'resolved').length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun ticket ouvert.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {supportTickets
                        .filter((ticket: any) => ticket.status !== 'resolved')
                        .map((ticket: any) => {
                          const project = supportProjects.find(p => p.id === ticket.projectId);
                          return (
                            <div
                              key={ticket.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                              data-testid={`ticket-${ticket.id}`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{ticket.title}</h4>
                                  <Badge className={getPriorityColor(ticket.priority)}>
                                    {getPriorityLabel(ticket.priority)}
                                  </Badge>
                                  <Badge className={getStatusColor(ticket.status)}>
                                    {getStatusLabel(ticket.status)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-1">
                                  {project?.name} - {project?.client}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {ticket.description?.substring(0, 100)}...
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Créé: {format(new Date(ticket.createdAt || Date.now()), 'dd MMM yyyy', { locale: fr })}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resolveTicketMutation.mutate(ticket.id)}
                                  disabled={resolveTicketMutation.isPending}
                                  data-testid={`button-resolve-${ticket.id}`}
                                >
                                  {resolveTicketMutation.isPending ? (
                                    <Clock className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warranty" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {supportProjects.map((project) => {
                  const warrantyStatus = getWarrantyStatus(project);
                  return (
                    <Card key={project.id} data-testid={`warranty-card-${project.id}`}>
                      <CardHeader>
                        <CardTitle className="text-base">{project.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Statut Garantie:</span>
                          <Badge className={getWarrantyColor(warrantyStatus)}>
                            {getWarrantyLabel(warrantyStatus)}
                          </Badge>
                        </div>
                        
                        <div className="text-sm">
                          <p><strong>Client:</strong> {project.client}</p>
                          <p><strong>Location:</strong> {project.location}</p>
                          {(project.dateLivraisonReelle || project.dateFinChantier) && (
                            <p><strong>Livraison:</strong> {format(new Date(project.dateLivraisonReelle || project.dateFinChantier!), 'dd MMM yyyy', { locale: fr })}</p>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>• Garantie légale: 2 ans</p>
                          <p>• Garantie décennale: 10 ans</p>
                          <p>• Maintenance préventive recommandée</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="interventions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Historique des Interventions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {supportTickets.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucune intervention enregistrée.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {supportTickets
                        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                        .map((ticket: any) => {
                          const project = supportProjects.find(p => p.id === ticket.projectId);
                          return (
                            <div
                              key={ticket.id}
                              className="flex items-start justify-between p-4 border rounded-lg"
                              data-testid={`intervention-${ticket.id}`}
                            >
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium">{ticket.title}</h4>
                                  <Badge className={getStatusColor(ticket.status)}>
                                    {getStatusLabel(ticket.status)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {project?.name} - {project?.client}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Type: {ticket.type} | Priorité: {getPriorityLabel(ticket.priority)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(ticket.createdAt || Date.now()), 'dd MMM yyyy HH:mm', { locale: fr })}
                                  {ticket.resolvedAt && (
                                    <> → Résolu: {format(new Date(ticket.resolvedAt), 'dd MMM yyyy HH:mm', { locale: fr })}</>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center">
                                {ticket.status === 'resolved' ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : ticket.status === 'in_progress' ? (
                                  <Clock className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
    </>
  );
}