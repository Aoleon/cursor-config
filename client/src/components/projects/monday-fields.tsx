import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertCircle,
  Plus,
  Edit3,
  Trash2,
  Battery,
  Target,
  Clock,
  Hash,
  Users,
  ChevronDown,
  ChevronRight,
  Search,
  Check,
  CheckCircle,
  ChevronsUpDown,
  Calculator,
  TrendingUp,
  Palette,
  Building,
  User,
  Save,
  X,
  Eye,
  EyeOff,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react';
import { useMondayFields } from '@/hooks/use-monday-fields';
import type {
  EquipmentBattery,
  EquipmentBatteryInsert,
  MarginTarget,
  MarginTargetInsert,
  ProjectSubElement,
  ProjectSubElementInsert,
  ClassificationTag,
  ClassificationTagInsert,
  EntityTag,
  EntityTagInsert,
  EmployeeLabel,
  EmployeeLabelInsert,
  EmployeeLabelAssignment,
  EmployeeLabelAssignmentInsert,
} from '@shared/schema';

// ========================================
// SCHEMAS DE VALIDATION
// ========================================

const equipmentBatterySchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  type: z.enum(['battery_lithium', 'battery_nimh', 'battery_lead_acid', 'charger', 'tool_battery_combo', 'spare_battery', 'portable_tool', 'stationary_equipment']),
  status: z.enum(['available', 'in_use', 'charging', 'maintenance', 'defective', 'retired']).optional(),
  quantity: z.coerce.number().min(0).optional(),
  voltage: z.coerce.number().min(0).optional(),
  capacity: z.coerce.number().min(0).optional(),
  assignedToUserId: z.string().optional(),
  assignedToProjectId: z.string().optional(),
  storageLocation: z.string().optional(),
  notes: z.string().optional(),
});

const marginTargetSchema = z.object({
  targetMarginHourly: z.coerce.number().min(0).optional(),
  targetMarginPercentage: z.coerce.number().min(0).max(100).optional(),
  targetRevenueHourly: z.coerce.number().min(0).optional(),
  targetCategory: z.string().optional(),
  performanceScore: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

const studyDurationSchema = z.object({
  estimatedHours: z.coerce.number().min(0).optional(),
  actualHours: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

const classificationTagSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  slug: z.string().min(1, 'Slug requis'),
  color: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

const projectSubElementSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  code: z.string().optional(),
  category: z.enum([
    'technical_detail',
    'material_specification', 
    'work_phase',
    'quality_checkpoint',
    'safety_requirement',
    'regulatory_compliance',
    'delivery_milestone',
    'other'
  ]),
  description: z.string().optional(),
  specifications: z.string().optional(),
  quantity: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
  parentElementId: z.string().optional(),
  position: z.coerce.number().min(0).optional(),
});

const employeeLabelSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  color: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
});

// ========================================
// TYPES DES PROPS
// ========================================

interface MondayFieldsProps {
  projectId?: string;
  employeeId?: string;
  mode?: 'full' | 'compact';
}

interface EquipmentBatteriesManagerProps {
  projectId?: string;
  mode?: 'full' | 'compact';
}

interface MarginTargetsEditorProps {
  projectId: string;
  entityType: 'project' | 'offer' | 'user' | 'team';
  mode?: 'full' | 'compact';
}

interface StudyDurationEditorProps {
  projectId: string;
  mode?: 'full' | 'compact';
}

interface HashtagsManagerProps {
  entityType: string;
  entityId: string;
  mode?: 'full' | 'compact';
}

interface EmployeeLabelsEditorProps {
  employeeId: string;
  mode?: 'full' | 'compact';
}

interface ProjectSubElementsManagerProps {
  projectId: string;
  mode?: 'full' | 'compact';
}

// ========================================
// 1. EQUIPMENT BATTERIES MANAGER
// ========================================

function EquipmentBatteriesManager({ projectId, mode = 'full' }: EquipmentBatteriesManagerProps) {
  const {
    equipmentBatteries,
    isLoading,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    isCreating,
    isUpdating,
    isDeleting,
  } = useMondayFields(projectId).equipmentBatteries;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentBattery | null>(null);
  const [filter, setFilter] = useState('all');

  const form = useForm<z.infer<typeof equipmentBatterySchema>>({
    resolver: zodResolver(equipmentBatterySchema),
    defaultValues: {
      name: '',
      type: 'portable_tool',
      status: 'available',
      quantity: 1,
    },
  });

  const handleCreate = (data: z.infer<typeof equipmentBatterySchema>) => {
    const equipmentData = {
      ...data,
      assignedToProjectId: projectId,
      voltage: data.voltage ? String(data.voltage) : undefined,
      capacity: data.capacity ? String(data.capacity) : undefined,
      quantity: data.quantity || 1,
    };
    createEquipment(equipmentData as any);
    form.reset();
    setIsCreateModalOpen(false);
  };

  const handleEdit = (item: EquipmentBattery) => {
    setEditingItem(item);
    form.reset(item);
    setIsCreateModalOpen(true);
  };

  const handleUpdate = (data: z.infer<typeof equipmentBatterySchema>) => {
    if (editingItem) {
      const equipmentData = {
        ...data,
        voltage: data.voltage ? String(data.voltage) : undefined,
        capacity: data.capacity ? String(data.capacity) : undefined,
        quantity: data.quantity || 1,
      };
      updateEquipment({ id: editingItem.id, data: equipmentData as any });
      setEditingItem(null);
      setIsCreateModalOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet équipement ?')) {
      deleteEquipment(id);
    }
  };

  const filteredEquipment = equipmentBatteries.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'in_use': return 'bg-blue-100 text-blue-800';
      case 'charging': return 'bg-yellow-100 text-yellow-800';
      case 'maintenance': return 'bg-orange-100 text-orange-800';
      case 'defective': return 'bg-red-100 text-red-800';
      case 'retired': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'battery_lithium':
      case 'battery_nimh':
      case 'battery_lead_acid':
      case 'spare_battery': return <Battery className="h-4 w-4" />;
      case 'charger': return <FileText className="h-4 w-4" />;
      case 'portable_tool':
      case 'stationary_equipment':
      case 'tool_battery_combo': return <Settings className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="equipment-batteries-manager">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Stock Batteries/Outillage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="equipment-batteries-manager">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Battery className="h-5 w-5" />
              Stock Batteries/Outillage
            </CardTitle>
            <CardDescription>
              Gestion du stock d'équipements, batteries et outillage
            </CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-equipment">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Modifier l\'équipement' : 'Nouvel équipement'}
                </DialogTitle>
                <DialogDescription>
                  {editingItem 
                    ? 'Modifier les informations de l\'équipement' 
                    : 'Ajouter un nouvel équipement au stock'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(editingItem ? handleUpdate : handleCreate)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Perceuse Bosch" {...field} data-testid="input-equipment-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-equipment-type">
                                <SelectValue placeholder="Sélectionner le type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="battery_lithium">Batterie Lithium</SelectItem>
                              <SelectItem value="battery_nimh">Batterie NiMH</SelectItem>
                              <SelectItem value="battery_lead_acid">Batterie Plomb</SelectItem>
                              <SelectItem value="charger">Chargeur</SelectItem>
                              <SelectItem value="tool_battery_combo">Outil + Batterie</SelectItem>
                              <SelectItem value="spare_battery">Batterie de rechange</SelectItem>
                              <SelectItem value="portable_tool">Outil portable</SelectItem>
                              <SelectItem value="stationary_equipment">Équipement fixe</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marque</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Bosch, Makita" {...field} data-testid="input-equipment-brand" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modèle</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: GSR 18V-55" {...field} data-testid="input-equipment-model" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Statut</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-equipment-status">
                                <SelectValue placeholder="Statut de l'équipement" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Disponible</SelectItem>
                              <SelectItem value="in_use">En cours d'utilisation</SelectItem>
                              <SelectItem value="charging">En charge</SelectItem>
                              <SelectItem value="maintenance">En maintenance</SelectItem>
                              <SelectItem value="defective">Défectueux</SelectItem>
                              <SelectItem value="retired">Retiré</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantité</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              placeholder="1" 
                              {...field} 
                              data-testid="input-equipment-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="voltage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Voltage (V)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              placeholder="18.0" 
                              {...field} 
                              data-testid="input-equipment-voltage"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacité (Ah)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1" 
                              min="0" 
                              placeholder="2.0" 
                              {...field} 
                              data-testid="input-equipment-capacity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="storageLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lieu de stockage</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Dépôt A, Étagère 3" {...field} data-testid="input-equipment-storage" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Notes additionnelles..." 
                            {...field} 
                            data-testid="textarea-equipment-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingItem(null);
                      form.reset();
                    }}>
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isCreating || isUpdating}
                      data-testid="button-save-equipment"
                    >
                      {(isCreating || isUpdating) && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                      {editingItem ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="filter-type">Filtrer par type:</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40" data-testid="select-filter-equipment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="battery">Batteries</SelectItem>
                <SelectItem value="tool">Outils</SelectItem>
                <SelectItem value="accessory">Accessoires</SelectItem>
                <SelectItem value="consumable">Consommables</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Total: {filteredEquipment.length} éléments</span>
          </div>
        </div>
        
        {filteredEquipment.length === 0 ? (
          <div className="text-center py-8" data-testid="empty-equipment-state">
            <Battery className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Aucun équipement</h3>
            <p className="text-muted-foreground">Commencez par ajouter vos équipements au stock.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Équipement</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Voltage</TableHead>
                  <TableHead>Stockage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((item) => (
                  <TableRow key={item.id} data-testid={`row-equipment-${item.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getTypeIcon(item.type)}
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {item.brand && item.model && (
                            <div className="text-sm text-muted-foreground">
                              {item.brand} - {item.model}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" data-testid={`badge-type-${item.id}`}>
                        {item.type === 'battery_lithium' && 'Batterie Li-Ion'}
                        {item.type === 'battery_nimh' && 'Batterie NiMH'}
                        {item.type === 'battery_lead_acid' && 'Batterie Plomb'}
                        {item.type === 'charger' && 'Chargeur'}
                        {item.type === 'tool_battery_combo' && 'Outil + Batterie'}
                        {item.type === 'spare_battery' && 'Batterie de rechange'}
                        {item.type === 'portable_tool' && 'Outil portable'}
                        {item.type === 'stationary_equipment' && 'Équipement fixe'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status || 'available')} data-testid={`badge-status-${item.id}`}>
                        {item.status === 'available' && 'Disponible'}
                        {item.status === 'in_use' && 'En cours'}
                        {item.status === 'charging' && 'En charge'}
                        {item.status === 'maintenance' && 'Maintenance'}
                        {item.status === 'defective' && 'Défectueux'}
                        {item.status === 'retired' && 'Retiré'}
                        {!item.status && 'Disponible'}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`quantity-${item.id}`}>
                      {item.quantity}
                    </TableCell>
                    <TableCell data-testid={`voltage-${item.id}`}>
                      {item.voltage ? `${Number(item.voltage).toLocaleString('fr-FR')} V` : '-'}
                    </TableCell>
                    <TableCell data-testid={`storage-${item.id}`}>
                      {item.storageLocation || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-equipment-${item.id}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting}
                          data-testid={`button-delete-equipment-${item.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// 2. MARGIN TARGETS EDITOR  
// ========================================

function MarginTargetsEditor({ projectId, entityType, mode = 'full' }: MarginTargetsEditorProps) {
  const {
    marginTargets,
    isLoading,
    upsertMarginTarget,
    deleteMarginTarget,
    isUpdating,
    isDeleting,
  } = useMondayFields(projectId).marginTargets;

  const [isEditing, setIsEditing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const form = useForm<z.infer<typeof marginTargetSchema>>({
    resolver: zodResolver(marginTargetSchema),
    defaultValues: {
      targetCategory: 'project',
    },
  });

  const currentTarget = marginTargets.find(t => 
    (entityType === 'project' && t.projectId === projectId) ||
    (entityType === 'offer' && t.offerId === projectId)
  );

  const handleSave = (data: z.infer<typeof marginTargetSchema>) => {
    const targetData: MarginTargetInsert = {
      ...data,
      ...(entityType === 'project' && { projectId }),
      ...(entityType === 'offer' && { offerId: projectId }),
    };
    
    upsertMarginTarget(targetData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (currentTarget && confirm('Supprimer cet objectif de marge ?')) {
      deleteMarginTarget(currentTarget.id);
    }
  };

  // Calculer les métriques de performance
  const performanceMetrics = {
    currentMargin: currentTarget?.targetMarginHourly || 0,
    target: currentTarget?.targetMarginTotal || 0,
    performance: currentTarget?.performanceScore || 0,
    status: currentTarget?.performanceScore > 80 ? 'excellent' : 
            currentTarget?.performanceScore > 60 ? 'good' : 
            currentTarget?.performanceScore > 40 ? 'warning' : 'poor'
  };

  const getPerformanceColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="margin-targets-editor">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Objectifs de Marge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="margin-targets-editor">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Objectifs de Marge
            </CardTitle>
            <CardDescription>
              Définir et suivre les objectifs de rentabilité
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showAdvanced ? "default" : "outline"}
              onClick={() => setShowAdvanced(!showAdvanced)}
              data-testid="button-toggle-advanced-margin"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {showAdvanced ? 'Simple' : 'Avancé'}
            </Button>
            <Button
              size="sm"
              variant={isEditing ? "secondary" : "outline"}
              onClick={() => {
                setIsEditing(!isEditing);
                if (!isEditing && currentTarget) {
                  form.reset(currentTarget);
                }
              }}
              data-testid="button-edit-margin-target"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? 'Annuler' : 'Modifier'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Métriques de performance */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/50" data-testid="metric-hourly-margin">
            <div className="text-sm font-medium text-muted-foreground">Marge/Heure</div>
            <div className="text-2xl font-bold">
              {performanceMetrics.currentMargin.toLocaleString('fr-FR')} €/h
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50" data-testid="metric-total-target">
            <div className="text-sm font-medium text-muted-foreground">Objectif Total</div>
            <div className="text-2xl font-bold">
              {performanceMetrics.target.toLocaleString('fr-FR')} €
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50" data-testid="metric-performance">
            <div className="text-sm font-medium text-muted-foreground">Performance</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{performanceMetrics.performance}%</div>
              <Badge className={getPerformanceColor(performanceMetrics.status)}>
                {performanceMetrics.status === 'excellent' && 'Excellent'}
                {performanceMetrics.status === 'good' && 'Bon'}
                {performanceMetrics.status === 'warning' && 'Attention'}
                {performanceMetrics.status === 'poor' && 'Critique'}
              </Badge>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm font-medium text-muted-foreground">Progression</div>
            <div className="mt-2">
              <Progress 
                value={performanceMetrics.performance} 
                className="h-2"
                data-testid="progress-performance"
              />
            </div>
          </div>
        </div>

        {showAdvanced && (
          <div className="p-4 rounded-lg border bg-card">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analyse Détaillée
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Marge réalisée:</span>
                <span className="ml-2 font-medium">78%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Écart objectif:</span>
                <span className="ml-2 font-medium text-red-600">-12%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tendance:</span>
                <span className="ml-2 font-medium text-green-600">↗ +5%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Prévision:</span>
                <span className="ml-2 font-medium">85%</span>
              </div>
            </div>
          </div>
        )}

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetMarginHourly"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objectif Marge/Heure (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-target-margin-hourly"
                        />
                      </FormControl>
                      <FormDescription>
                        Marge horaire ciblée pour ce projet
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetMarginTotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objectif Marge Totale (€)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0" 
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-target-margin-total"
                        />
                      </FormControl>
                      <FormDescription>
                        Marge totale ciblée pour ce projet
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie d'Objectif</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-target-category">
                            <SelectValue placeholder="Sélectionner une catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="project">Projet</SelectItem>
                          <SelectItem value="phase">Phase</SelectItem>
                          <SelectItem value="task">Tâche</SelectItem>
                          <SelectItem value="resource">Ressource</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="performanceScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Score de Performance (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-performance-score"
                        />
                      </FormControl>
                      <FormDescription>
                        Score actuel de performance (0-100%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notes sur les objectifs de marge..." 
                        {...field} 
                        data-testid="textarea-margin-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center gap-2">
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  data-testid="button-save-margin-target"
                >
                  {isUpdating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
                {currentTarget && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    data-testid="button-delete-margin-target"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            {currentTarget ? (
              <div className="p-4 rounded-lg border bg-card" data-testid="current-margin-target">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Marge/Heure:</span>
                    <span className="ml-2 font-medium">
                      {currentTarget.targetMarginHourly?.toLocaleString('fr-FR')} €/h
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Marge Totale:</span>
                    <span className="ml-2 font-medium">
                      {currentTarget.targetMarginTotal?.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Catégorie:</span>
                    <span className="ml-2 font-medium">
                      {currentTarget.targetCategory === 'project' && 'Projet'}
                      {currentTarget.targetCategory === 'phase' && 'Phase'}
                      {currentTarget.targetCategory === 'task' && 'Tâche'}
                      {currentTarget.targetCategory === 'resource' && 'Ressource'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Performance:</span>
                    <span className="ml-2 font-medium">
                      {currentTarget.performanceScore}%
                    </span>
                  </div>
                </div>
                {currentTarget.notes && (
                  <div className="mt-4">
                    <span className="text-muted-foreground text-sm">Notes:</span>
                    <p className="text-sm mt-1">{currentTarget.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8" data-testid="empty-margin-target-state">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Aucun objectif défini</h3>
                <p className="text-muted-foreground">Cliquez sur "Modifier" pour définir vos objectifs de marge.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// 3. STUDY DURATION EDITOR
// ========================================

function StudyDurationEditor({ projectId }: StudyDurationEditorProps) {
  const {
    studyDuration,
    isLoading,
    updateStudyDuration,
    estimateStudyDuration,
    isUpdating,
    isEstimating,
  } = useMondayFields(projectId).studyDuration;

  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<z.infer<typeof studyDurationSchema>>({
    resolver: zodResolver(studyDurationSchema),
    defaultValues: {
      estimatedHours: 0,
      actualHours: 0,
    },
  });

  const handleSave = (data: z.infer<typeof studyDurationSchema>) => {
    updateStudyDuration(data);
    setIsEditing(false);
  };

  const handleAutoEstimate = () => {
    estimateStudyDuration();
  };

  const progressPercentage = studyDuration?.estimatedHours 
    ? Math.min((studyDuration.actualHours || 0) / studyDuration.estimatedHours * 100, 100)
    : 0;

  const getStatusColor = (progress: number) => {
    if (progress <= 50) return 'text-green-600 bg-green-100';
    if (progress <= 80) return 'text-yellow-600 bg-yellow-100';
    if (progress <= 100) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusText = (progress: number) => {
    if (progress <= 50) return 'En avance';
    if (progress <= 80) return 'Dans les temps';
    if (progress <= 100) return 'Limite';
    return 'Dépassement';
  };

  if (isLoading) {
    return (
      <Card data-testid="study-duration-editor">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Durée d'Étude
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="study-duration-editor">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Durée d'Étude
            </CardTitle>
            <CardDescription>
              Suivi et estimation du temps d'étude du projet
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoEstimate}
              disabled={isEstimating}
              data-testid="button-auto-estimate"
            >
              {isEstimating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />}
              <Calculator className="h-4 w-4 mr-2" />
              Estimer Auto
            </Button>
            <Button
              size="sm"
              variant={isEditing ? "secondary" : "outline"}
              onClick={() => {
                setIsEditing(!isEditing);
                if (!isEditing && studyDuration) {
                  form.reset(studyDuration);
                }
              }}
              data-testid="button-edit-study-duration"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {isEditing ? 'Annuler' : 'Modifier'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Métriques actuelles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50" data-testid="metric-estimated-hours">
            <div className="text-sm font-medium text-muted-foreground">Estimé</div>
            <div className="text-2xl font-bold">
              {studyDuration?.estimatedHours || 0}h
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50" data-testid="metric-actual-hours">
            <div className="text-sm font-medium text-muted-foreground">Réalisé</div>
            <div className="text-2xl font-bold">
              {studyDuration?.actualHours || 0}h
            </div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50" data-testid="metric-remaining-hours">
            <div className="text-sm font-medium text-muted-foreground">Restant</div>
            <div className="text-2xl font-bold">
              {Math.max((studyDuration?.estimatedHours || 0) - (studyDuration?.actualHours || 0), 0)}h
            </div>
            <Badge className={getStatusColor(progressPercentage)} data-testid="badge-study-status">
              {getStatusText(progressPercentage)}
            </Badge>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-3"
            data-testid="progress-study-duration"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0h</span>
            <span>{studyDuration?.estimatedHours || 0}h</span>
          </div>
        </div>

        {isEditing ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heures Estimées</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-estimated-hours"
                        />
                      </FormControl>
                      <FormDescription>
                        Nombre d'heures estimées pour l'étude complète
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="actualHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Heures Réalisées</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.5" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-actual-hours"
                        />
                      </FormControl>
                      <FormDescription>
                        Nombre d'heures déjà passées sur l'étude
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notes sur la durée d'étude..." 
                        {...field} 
                        data-testid="textarea-study-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center gap-2">
                <Button 
                  type="submit" 
                  disabled={isUpdating}
                  data-testid="button-save-study-duration"
                >
                  {isUpdating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Sauvegarder
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            {studyDuration && (studyDuration.estimatedHours || studyDuration.actualHours) ? (
              <div className="p-4 rounded-lg border bg-card" data-testid="current-study-duration">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estimation initiale:</span>
                    <span className="font-medium">{studyDuration.estimatedHours || 0}h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Temps passé:</span>
                    <span className="font-medium">{studyDuration.actualHours || 0}h</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-medium">
                    <span>Écart:</span>
                    <span className={
                      (studyDuration.actualHours || 0) > (studyDuration.estimatedHours || 0) 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }>
                      {((studyDuration.actualHours || 0) - (studyDuration.estimatedHours || 0)) > 0 ? '+' : ''}
                      {(studyDuration.actualHours || 0) - (studyDuration.estimatedHours || 0)}h
                    </span>
                  </div>
                </div>
                {studyDuration.notes && (
                  <div className="mt-4">
                    <span className="text-muted-foreground text-sm">Notes:</span>
                    <p className="text-sm mt-1">{studyDuration.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8" data-testid="empty-study-duration-state">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Aucune durée définie</h3>
                <p className="text-muted-foreground">
                  Utilisez l'estimation automatique ou saisissez manuellement les durées.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// 4. HASHTAGS MANAGER
// ========================================

function HashtagsManager({ entityType, entityId }: HashtagsManagerProps) {
  const {
    classificationTags,
    isLoading: isLoadingTags,
    createTag,
    updateTag,
    deleteTag,
    isCreating: isCreatingTag,
    isUpdating: isUpdatingTag,
    isDeleting: isDeletingTag,
  } = useMondayFields().classificationTags;

  const {
    entityTags,
    isLoading: isLoadingEntityTags,
    assignTag,
    unassignTag,
    isAssigning,
    isUnassigning,
  } = useMondayFields().entityTags;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ClassificationTag | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const form = useForm<z.infer<typeof classificationTagSchema>>({
    resolver: zodResolver(classificationTagSchema),
    defaultValues: {
      name: '',
      category: 'other',
      color: '#3b82f6',
    },
  });

  const assignedTagIds = entityTags.map((et: any) => et.tagId);
  const availableTags = classificationTags.filter((tag: any) => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tag.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateTag = (data: z.infer<typeof classificationTagSchema>) => {
    createTag(data);
    form.reset();
    setIsCreateModalOpen(false);
  };

  const handleUpdateTag = (data: z.infer<typeof classificationTagSchema>) => {
    if (editingTag) {
      updateTag({ id: editingTag.id, data });
      setEditingTag(null);
      setIsCreateModalOpen(false);
    }
  };

  const handleEditTag = (tag: ClassificationTag) => {
    setEditingTag(tag);
    form.reset(tag);
    setIsCreateModalOpen(true);
  };

  const handleDeleteTag = (tagId: string) => {
    if (confirm('Supprimer ce tag ?')) {
      deleteTag(tagId);
    }
  };

  const handleAssignTag = (tagId: string) => {
    assignTag({
      tagId: tagId,
      entityType,
      entityId,
    });
  };

  const handleUnassignTag = (tagId: string) => {
    unassignTag(tagId);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'priority': return <AlertCircle className="h-4 w-4" />;
      case 'status': return <CheckCircle className="h-4 w-4" />;
      case 'type': return <FileText className="h-4 w-4" />;
      case 'client': return <User className="h-4 w-4" />;
      case 'technical': return <Settings className="h-4 w-4" />;
      default: return <Hash className="h-4 w-4" />;
    }
  };

  const isLoading = isLoadingTags || isLoadingEntityTags;

  if (isLoading) {
    return (
      <Card data-testid="hashtags-manager">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Tags & Classification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="hashtags-manager">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Tags & Classification
            </CardTitle>
            <CardDescription>
              Système de tags dynamiques avec auto-complétion
            </CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-tag">
                <Plus className="h-4 w-4 mr-2" />
                Créer Tag
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTag ? 'Modifier le tag' : 'Créer un nouveau tag'}
                </DialogTitle>
                <DialogDescription>
                  {editingTag 
                    ? 'Modifier les informations du tag'
                    : 'Créer un nouveau tag de classification'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(editingTag ? handleUpdateTag : handleCreateTag)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du tag *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: urgent, client-premium" {...field} data-testid="input-tag-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catégorie</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tag-category">
                                <SelectValue placeholder="Catégorie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="priority">Priorité</SelectItem>
                              <SelectItem value="status">Statut</SelectItem>
                              <SelectItem value="type">Type</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                              <SelectItem value="technical">Technique</SelectItem>
                              <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couleur</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="color" 
                                className="w-16 h-10 p-1" 
                                {...field} 
                                data-testid="input-tag-color"
                              />
                              <Input 
                                value={field.value} 
                                onChange={field.onChange} 
                                placeholder="#3b82f6"
                                data-testid="input-tag-color-text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Description du tag..." 
                            {...field} 
                            data-testid="textarea-tag-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingTag(null);
                      form.reset();
                    }}>
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isCreatingTag || isUpdatingTag}
                      data-testid="button-save-tag"
                    >
                      {(isCreatingTag || isUpdatingTag) && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                      {editingTag ? 'Modifier' : 'Créer'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Tags assignés */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Tags assignés</h4>
          <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-lg border-2 border-dashed border-muted-foreground/25" data-testid="assigned-tags">
            {assignedTagIds.length === 0 ? (
              <div className="text-sm text-muted-foreground italic w-full text-center py-2">
                Aucun tag assigné - Sélectionnez des tags ci-dessous
              </div>
            ) : (
              classificationTags
                .filter(tag => assignedTagIds.includes(tag.id))
                .map(tag => (
                  <Badge
                    key={tag.id}
                    variant="default"
                    className="flex items-center gap-1"
                    style={{ backgroundColor: tag.color }}
                    data-testid={`assigned-tag-${tag.id}`}
                  >
                    {getCategoryIcon(tag.category)}
                    {tag.name}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-white/20"
                      onClick={() => handleUnassignTag(tag.id)}
                      disabled={isUnassigning}
                      data-testid={`button-unassign-tag-${tag.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))
            )}
          </div>
        </div>

        {/* Recherche et filtres */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-tags"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40" data-testid="select-filter-tag-category">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="priority">Priorité</SelectItem>
              <SelectItem value="status">Statut</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="client">Client</SelectItem>
              <SelectItem value="technical">Technique</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tags disponibles */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Tags disponibles</h4>
          {availableTags.length === 0 ? (
            <div className="text-center py-8" data-testid="empty-tags-state">
              <Hash className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Aucun tag trouvé</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Modifiez vos critères de recherche'
                  : 'Créez votre premier tag'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableTags.map(tag => {
                const isAssigned = assignedTagIds.includes(tag.id);
                return (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    data-testid={`available-tag-${tag.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border-2"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(tag.category)}
                          <span className="font-medium">{tag.name}</span>
                        </div>
                        {tag.description && (
                          <p className="text-sm text-muted-foreground mt-1">{tag.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditTag(tag)}
                        data-testid={`button-edit-tag-${tag.id}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteTag(tag.id)}
                        disabled={isDeletingTag}
                        data-testid={`button-delete-tag-${tag.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isAssigned ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUnassignTag(tag.id)}
                          disabled={isUnassigning}
                          data-testid={`button-remove-tag-${tag.id}`}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Retirer
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAssignTag(tag.id)}
                          disabled={isAssigning}
                          data-testid={`button-assign-tag-${tag.id}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// 5. EMPLOYEE LABELS EDITOR
// ========================================

function EmployeeLabelsEditor({ employeeId }: EmployeeLabelsEditorProps) {
  const {
    employeeLabels,
    availableLabels,
    isLoading,
    isLoadingAvailable,
    createLabel,
    assignLabel,
    unassignLabel,
    isCreating,
    isAssigning,
    isUnassigning,
  } = useMondayFields(undefined, employeeId).employeeLabels;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const form = useForm<z.infer<typeof employeeLabelSchema>>({
    resolver: zodResolver(employeeLabelSchema),
    defaultValues: {
      name: '',
      category: 'other',
      color: '#3b82f6',
    },
  });

  const assignedLabelIds = employeeLabels.map(el => el.labelId);
  const filteredAvailableLabels = availableLabels.filter(label => {
    const matchesSearch = label.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || label.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateLabel = (data: z.infer<typeof employeeLabelSchema>) => {
    createLabel(data);
    form.reset();
    setIsCreateModalOpen(false);
  };

  const handleAssignLabel = (labelId: string) => {
    assignLabel({
      labelId,
      employeeId,
    });
  };

  const handleUnassignLabel = (labelId: string) => {
    unassignLabel(labelId);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'skill': return 'bg-blue-100 text-blue-800';
      case 'certification': return 'bg-green-100 text-green-800';
      case 'role': return 'bg-purple-100 text-purple-800';
      case 'level': return 'bg-orange-100 text-orange-800';
      case 'team': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'skill': return <Target className="h-4 w-4" />;
      case 'certification': return <CheckCircle className="h-4 w-4" />;
      case 'role': return <User className="h-4 w-4" />;
      case 'level': return <BarChart3 className="h-4 w-4" />;
      case 'team': return <Users className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const combinedLoading = isLoadingAvailable || isLoading;

  if (combinedLoading) {
    return (
      <Card data-testid="employee-labels-editor">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Labels Employé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="employee-labels-editor">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Labels Employé
            </CardTitle>
            <CardDescription>
              Classification et badges colorés pour les employés
            </CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-label">
                <Plus className="h-4 w-4 mr-2" />
                Créer Label
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau label</DialogTitle>
                <DialogDescription>
                  Créer un nouveau label de classification pour les employés
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateLabel)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du label *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Expert Menuiserie" {...field} data-testid="input-label-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catégorie</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-label-category">
                                <SelectValue placeholder="Catégorie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="skill">Compétence</SelectItem>
                              <SelectItem value="certification">Certification</SelectItem>
                              <SelectItem value="role">Rôle</SelectItem>
                              <SelectItem value="level">Niveau</SelectItem>
                              <SelectItem value="team">Équipe</SelectItem>
                              <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couleur</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input 
                                type="color" 
                                className="w-16 h-10 p-1" 
                                {...field} 
                                data-testid="input-label-color"
                              />
                              <Input 
                                value={field.value} 
                                onChange={field.onChange} 
                                placeholder="#3b82f6"
                                data-testid="input-label-color-text"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Description du label..." 
                            {...field} 
                            data-testid="textarea-label-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateModalOpen(false);
                      form.reset();
                    }}>
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isCreating}
                      data-testid="button-save-label"
                    >
                      {isCreating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                      Créer
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Labels assignés */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Labels assignés</h4>
          <div className="flex flex-wrap gap-2 min-h-[60px] p-3 rounded-lg border-2 border-dashed border-muted-foreground/25" data-testid="assigned-labels">
            {employeeLabels.length === 0 ? (
              <div className="text-sm text-muted-foreground italic w-full text-center py-2">
                Aucun label assigné - Sélectionnez des labels ci-dessous
              </div>
            ) : (
              employeeLabels.map(employeeLabel => {
                const label = availableLabels.find(l => l.id === employeeLabel.labelId);
                if (!label) return null;
                
                return (
                  <Badge
                    key={employeeLabel.id}
                    variant="default"
                    className="flex items-center gap-1"
                    style={{ backgroundColor: label.color }}
                    data-testid={`assigned-label-${label.id}`}
                  >
                    {getCategoryIcon(label.category)}
                    {label.name}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-white/20"
                      onClick={() => handleUnassignLabel(label.id)}
                      disabled={isUnassigning}
                      data-testid={`button-unassign-label-${label.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })
            )}
          </div>
        </div>

        {/* Recherche et filtres */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des labels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-labels"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40" data-testid="select-filter-label-category">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="skill">Compétence</SelectItem>
              <SelectItem value="certification">Certification</SelectItem>
              <SelectItem value="role">Rôle</SelectItem>
              <SelectItem value="level">Niveau</SelectItem>
              <SelectItem value="team">Équipe</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Labels disponibles */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Labels disponibles</h4>
          {filteredAvailableLabels.length === 0 ? (
            <div className="text-center py-8" data-testid="empty-labels-state">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Aucun label trouvé</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Modifiez vos critères de recherche'
                  : 'Créez votre premier label'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredAvailableLabels.map(label => {
                const isAssigned = assignedLabelIds.includes(label.id);
                return (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    data-testid={`available-label-${label.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`${getCategoryColor(label.category)} flex items-center gap-1`}
                      >
                        {getCategoryIcon(label.category)}
                        {label.category === 'skill' && 'Compétence'}
                        {label.category === 'certification' && 'Certification'}
                        {label.category === 'role' && 'Rôle'}
                        {label.category === 'level' && 'Niveau'}
                        {label.category === 'team' && 'Équipe'}
                        {label.category === 'other' && 'Autre'}
                      </Badge>
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="font-medium">{label.name}</span>
                        </div>
                        {label.description && (
                          <p className="text-sm text-muted-foreground mt-1">{label.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAssigned ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUnassignLabel(label.id)}
                          disabled={isUnassigning}
                          data-testid={`button-remove-label-${label.id}`}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Retirer
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAssignLabel(label.id)}
                          disabled={isAssigning}
                          data-testid={`button-assign-label-${label.id}`}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Assigner
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ========================================
// 6. PROJECT SUB ELEMENTS MANAGER
// ========================================

function ProjectSubElementsManager({ projectId }: ProjectSubElementsManagerProps) {
  const {
    projectSubElements,
    isLoading,
    createSubElement,
    updateSubElement,
    deleteSubElement,
    reorderSubElements,
    isCreating,
    isUpdating,
    isDeleting,
    isReordering,
  } = useMondayFields(projectId).projectSubElements;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<ProjectSubElement | null>(null);
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const form = useForm<z.infer<typeof projectSubElementSchema>>({
    resolver: zodResolver(projectSubElementSchema),
    defaultValues: {
      name: '',
      category: 'other',
      quantity: 1,
    },
  });

  // Construire la hiérarchie des éléments
  const buildHierarchy = (elements: ProjectSubElement[]) => {
    const rootElements = elements.filter(el => !el.parentElementId);
    const buildChildren = (parentId: string): ProjectSubElement[] => {
      return elements.filter(el => el.parentElementId === parentId);
    };

    const addChildren = (element: ProjectSubElement): ProjectSubElement & { children: ProjectSubElement[] } => {
      return {
        ...element,
        children: buildChildren(element.id).map(addChildren)
      };
    };

    return rootElements.map(addChildren);
  };

  const hierarchicalElements = buildHierarchy(
    selectedCategory === 'all' 
      ? projectSubElements 
      : projectSubElements.filter(el => el.category === selectedCategory)
  );

  const handleCreate = (data: z.infer<typeof projectSubElementSchema>) => {
    createSubElement({ ...data, projectId });
    form.reset();
    setIsCreateModalOpen(false);
  };

  const handleEdit = (element: ProjectSubElement) => {
    setEditingElement(element);
    form.reset(element);
    setIsCreateModalOpen(true);
  };

  const handleUpdate = (data: z.infer<typeof projectSubElementSchema>) => {
    if (editingElement) {
      updateSubElement({ id: editingElement.id, data });
      setEditingElement(null);
      setIsCreateModalOpen(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce sous-élément ?')) {
      deleteSubElement(id);
    }
  };

  const toggleExpanded = (elementId: string) => {
    const newExpanded = new Set(expandedElements);
    if (newExpanded.has(elementId)) {
      newExpanded.delete(elementId);
    } else {
      newExpanded.add(elementId);
    }
    setExpandedElements(newExpanded);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical_detail': return <Settings className="h-4 w-4" />;
      case 'material_specification': return <Building className="h-4 w-4" />;
      case 'work_phase': return <Clock className="h-4 w-4" />;
      case 'quality_checkpoint': return <CheckCircle className="h-4 w-4" />;
      case 'safety_requirement': return <AlertCircle className="h-4 w-4" />;
      case 'regulatory_compliance': return <FileText className="h-4 w-4" />;
      case 'delivery_milestone': return <Target className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical_detail': return 'bg-blue-100 text-blue-800';
      case 'material_specification': return 'bg-green-100 text-green-800';
      case 'work_phase': return 'bg-purple-100 text-purple-800';
      case 'quality_checkpoint': return 'bg-yellow-100 text-yellow-800';
      case 'safety_requirement': return 'bg-red-100 text-red-800';
      case 'regulatory_compliance': return 'bg-indigo-100 text-indigo-800';
      case 'delivery_milestone': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderElement = (element: ProjectSubElement & { children: ProjectSubElement[] }, depth = 0) => {
    const isExpanded = expandedElements.has(element.id);
    const hasChildren = element.children.length > 0;

    return (
      <div key={element.id} className="space-y-2" data-testid={`sub-element-${element.id}`}>
        <div 
          className={`flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
            depth > 0 ? 'ml-6 border-l-2 border-muted' : ''
          }`}
          style={{ marginLeft: depth * 24 }}
        >
          <div className="flex items-center gap-2 flex-1">
            {hasChildren ? (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => toggleExpanded(element.id)}
                data-testid={`button-toggle-${element.id}`}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            
            {getCategoryIcon(element.category)}
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{element.name}</span>
                {element.code && (
                  <Badge variant="outline" className="text-xs">
                    {element.code}
                  </Badge>
                )}
                <Badge className={getCategoryColor(element.category)}>
                  {element.category === 'technical_detail' && 'Technique'}
                  {element.category === 'material_specification' && 'Matériau'}
                  {element.category === 'work_phase' && 'Phase'}
                  {element.category === 'quality_checkpoint' && 'Qualité'}
                  {element.category === 'safety_requirement' && 'Sécurité'}
                  {element.category === 'regulatory_compliance' && 'Réglementation'}
                  {element.category === 'delivery_milestone' && 'Livraison'}
                  {element.category === 'other' && 'Autre'}
                </Badge>
              </div>
              {element.description && (
                <p className="text-sm text-muted-foreground mt-1">{element.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {element.quantity && (
                  <span>Qté: {element.quantity}</span>
                )}
                {element.unitPrice && (
                  <span>Prix: {Number(element.unitPrice).toLocaleString('fr-FR')} €</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(element)}
              data-testid={`button-edit-sub-element-${element.id}`}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(element.id)}
              disabled={isDeleting}
              data-testid={`button-delete-sub-element-${element.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {element.children.map(child => renderElement(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card data-testid="project-sub-elements-manager">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Sous-éléments Projet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="project-sub-elements-manager">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Sous-éléments Projet
            </CardTitle>
            <CardDescription>
              Éditeur hiérarchique de sous-éléments détaillés
            </CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-sub-element">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingElement ? 'Modifier le sous-élément' : 'Nouveau sous-élément'}
                </DialogTitle>
                <DialogDescription>
                  {editingElement 
                    ? 'Modifier les informations du sous-élément'
                    : 'Ajouter un nouveau sous-élément au projet'
                  }
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(editingElement ? handleUpdate : handleCreate)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nom *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Pose fenêtre F1" {...field} data-testid="input-sub-element-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: SE-001" {...field} data-testid="input-sub-element-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Catégorie *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-sub-element-category">
                                <SelectValue placeholder="Sélectionner la catégorie" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="technical_detail">Détail technique</SelectItem>
                              <SelectItem value="material_specification">Spécification matériau</SelectItem>
                              <SelectItem value="work_phase">Phase de travail</SelectItem>
                              <SelectItem value="quality_checkpoint">Point qualité</SelectItem>
                              <SelectItem value="safety_requirement">Exigence sécurité</SelectItem>
                              <SelectItem value="regulatory_compliance">Conformité réglementaire</SelectItem>
                              <SelectItem value="delivery_milestone">Jalon livraison</SelectItem>
                              <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="parentElementId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Élément parent</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                            <FormControl>
                              <SelectTrigger data-testid="select-parent-element">
                                <SelectValue placeholder="Aucun parent" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Aucun parent</SelectItem>
                              {projectSubElements.map(element => (
                                <SelectItem key={element.id} value={element.id}>
                                  {element.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantité</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              placeholder="1" 
                              {...field} 
                              data-testid="input-sub-element-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="unitPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix unitaire (€)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0" 
                              placeholder="0.00" 
                              {...field} 
                              data-testid="input-sub-element-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Description détaillée..." 
                            {...field} 
                            data-testid="textarea-sub-element-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spécifications</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Spécifications techniques..." 
                            {...field} 
                            data-testid="textarea-sub-element-specs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreateModalOpen(false);
                      setEditingElement(null);
                      form.reset();
                    }}>
                      Annuler
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isCreating || isUpdating}
                      data-testid="button-save-sub-element"
                    >
                      {(isCreating || isUpdating) && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                      {editingElement ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Label htmlFor="filter-category">Filtrer par catégorie:</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48" data-testid="select-filter-sub-elements">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="technical_detail">Détails techniques</SelectItem>
              <SelectItem value="material_specification">Spécifications matériau</SelectItem>
              <SelectItem value="work_phase">Phases de travail</SelectItem>
              <SelectItem value="quality_checkpoint">Points qualité</SelectItem>
              <SelectItem value="safety_requirement">Exigences sécurité</SelectItem>
              <SelectItem value="regulatory_compliance">Conformité réglementaire</SelectItem>
              <SelectItem value="delivery_milestone">Jalons livraison</SelectItem>
              <SelectItem value="other">Autres</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Total: {hierarchicalElements.length} éléments</span>
          </div>
        </div>
        
        {hierarchicalElements.length === 0 ? (
          <div className="text-center py-8" data-testid="empty-sub-elements-state">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">Aucun sous-élément</h3>
            <p className="text-muted-foreground">
              Commencez par ajouter des sous-éléments à votre projet.
            </p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="sub-elements-hierarchy">
            {hierarchicalElements.map(element => renderElement(element))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========================================
// COMPOSANT PRINCIPAL - MONDAY FIELDS
// ========================================

export default function MondayFields({ projectId, employeeId, mode = 'full' }: MondayFieldsProps) {
  const { isLoading, isAnyMutating } = useMondayFields(projectId, employeeId);

  if (isLoading && mode === 'full') {
    return (
      <div className="space-y-6" data-testid="monday-fields-loading">
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'compact') {
    const {
      equipmentBatteries,
      marginTargets,
      classificationTags,
      projectSubElements,
    } = useMondayFields(projectId, employeeId);

    return (
      <div className="p-4 rounded-lg border bg-card" data-testid="monday-fields-compact">
        <h4 className="font-medium mb-3 flex items-center gap-2">
          <Hash className="h-4 w-4" />
          Champs Monday.com
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Stock équipements:</span>
            <span className="ml-2 font-medium">
              {equipmentBatteries?.length || 0} items
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Objectifs marge:</span>
            <span className="ml-2 font-medium text-green-600">
              {marginTargets?.length || 0} définis
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Tags actifs:</span>
            <span className="ml-2 font-medium">
              {classificationTags?.length || 0} tags
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Sous-éléments:</span>
            <span className="ml-2 font-medium">
              {projectSubElements?.length || 0} items
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="monday-fields-full">
      {/* Indicateur de mutations en cours */}
      {isAnyMutating && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">
            Sauvegarde en cours...
          </span>
        </div>
      )}

      {/* Grid responsive des composants */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Colonne 1 */}
        <div className="space-y-6">
          <EquipmentBatteriesManager projectId={projectId} mode={mode} />
          {projectId && <StudyDurationEditor projectId={projectId} mode={mode} />}
          {employeeId && <EmployeeLabelsEditor employeeId={employeeId} mode={mode} />}
        </div>

        {/* Colonne 2 */}
        <div className="space-y-6">
          {projectId && (
            <MarginTargetsEditor projectId={projectId} entityType="project" mode={mode} />
          )}
          {projectId && (
            <HashtagsManager entityType="project" entityId={projectId} mode={mode} />
          )}
          {projectId && <ProjectSubElementsManager projectId={projectId} mode={mode} />}
        </div>
      </div>
    </div>
  );
}

// Export des composants individuels pour utilisation séparée
export {
  EquipmentBatteriesManager,
  MarginTargetsEditor,
  StudyDurationEditor,
  HashtagsManager,
  EmployeeLabelsEditor,
  ProjectSubElementsManager,
};