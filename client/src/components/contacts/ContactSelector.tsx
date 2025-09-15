import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Building, User, Search } from "lucide-react";

interface Contact {
  id: string;
  nom: string;
  typeOrganisation?: string;
  ville?: string;
  departement?: string;
  contactPrincipalNom?: string;
  contactPrincipalEmail?: string;
  email?: string;
}

interface ContactSelectorProps {
  type: "maitre-ouvrage" | "maitre-oeuvre";
  selectedContactId?: string;
  onContactSelect: (contactId: string, contact: Contact) => void;
  onCreateNew?: () => void;
  placeholder?: string;
}

export function ContactSelector({ 
  type, 
  selectedContactId, 
  onContactSelect, 
  onCreateNew,
  placeholder = "Sélectionner un contact..." 
}: ContactSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const apiEndpoint = type === "maitre-ouvrage" ? "/api/maitres-ouvrage" : "/api/maitres-oeuvre";
  
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: [apiEndpoint],
    queryFn: async () => {
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
  });

  const filteredContacts = contacts.filter((contact: Contact) =>
    contact.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.ville?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.typeOrganisation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedContact = contacts.find((c: Contact) => c.id === selectedContactId);

  const handleContactSelect = (contact: Contact) => {
    onContactSelect(contact.id, contact);
    setIsDialogOpen(false);
  };

  const getContactDisplayName = (contact: Contact) => {
    if (type === "maitre-ouvrage") {
      return `${contact.nom}${contact.ville ? ` - ${contact.ville}` : ''}`;
    } else {
      return `${contact.nom}${contact.typeOrganisation ? ` (${contact.typeOrganisation})` : ''}`;
    }
  };

  const getContactSubtext = (contact: Contact) => {
    if (type === "maitre-ouvrage") {
      return contact.contactPrincipalNom || contact.typeOrganisation || 'Contact principal non défini';
    } else {
      return contact.ville || 'Ville non définie';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          {selectedContact ? (
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">
                      {getContactDisplayName(selectedContact)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getContactSubtext(selectedContact)}
                    </div>
                    {selectedContact.departement && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Dép. {selectedContact.departement}
                      </Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                    data-testid="button-change-contact"
                  >
                    Changer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(true)}
              className="w-full justify-start h-auto py-3"
              data-testid="button-select-contact"
            >
              <div className="flex items-center space-x-2">
                {type === "maitre-ouvrage" ? (
                  <Building className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>{placeholder}</span>
              </div>
            </Button>
          )}
        </div>
        
        {onCreateNew && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onCreateNew}
            data-testid="button-create-contact"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {type === "maitre-ouvrage" ? (
                <Building className="h-5 w-5" />
              ) : (
                <User className="h-5 w-5" />
              )}
              <span>
                Sélectionner un {type === "maitre-ouvrage" ? "maître d'ouvrage" : "maître d'œuvre"}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-on-surface-muted" />
              <Input
                placeholder="Rechercher par nom, ville, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-contacts"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-on-surface-muted">
                {filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''} trouvé{filteredContacts.length > 1 ? 's' : ''}
              </div>
              {onCreateNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onCreateNew}
                  data-testid="button-create-new-contact"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer nouveau
                </Button>
              )}
            </div>

            {/* Liste des contacts */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-on-surface-muted">
                  Chargement des contacts...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-on-surface-muted">
                  {searchTerm ? 'Aucun contact trouvé pour cette recherche' : 'Aucun contact disponible'}
                </div>
              ) : (
                filteredContacts.map((contact: Contact) => (
                  <Card 
                    key={contact.id} 
                    className={`cursor-pointer transition-colors hover:bg-surface-muted ${
                      selectedContactId === contact.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleContactSelect(contact)}
                    data-testid={`contact-item-${contact.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">
                            {getContactDisplayName(contact)}
                          </div>
                          <div className="text-sm text-on-surface-muted mt-1">
                            {getContactSubtext(contact)}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {contact.departement && (
                              <Badge variant="secondary" className="text-xs">
                                Dép. {contact.departement}
                              </Badge>
                            )}
                            {contact.typeOrganisation && (
                              <Badge variant="outline" className="text-xs">
                                {contact.typeOrganisation}
                              </Badge>
                            )}
                          </div>
                          {(contact.contactPrincipalEmail || contact.email) && (
                            <div className="text-xs text-on-surface-muted mt-1">
                              {contact.contactPrincipalEmail || contact.email}
                            </div>
                          )}
                        </div>
                        {selectedContactId === contact.id && (
                          <Badge className="ml-2">Sélectionné</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}