import { useState, useMemo } from 'react';
import { useBusinessRules, createEmptyRule, type CreateRuleData } from '@/hooks/use-business-rules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  Plus, 
  Settings, 
  Edit, 
  Trash2, 
  Copy, 
  Power, 
  TrendingUp, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  Wrench
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateRuleSchema } from '@/hooks/use-business-rules';
import type { DateIntelligenceRule } from '@shared/schema';

// Composant pour les statistiques des règles
function RulesStatistics({ stats }: { stats: any }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="flex items-center p-6">
          <Settings className="h-8 w-8 text-blue-600 mr-4" />
          <div>
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Règles totales</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center p-6">
          <CheckCircle2 className="h-8 w-8 text-green-600 mr-4" />
          <div>
            <p className="text-2xl font-bold">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Règles actives</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center p-6">
          <Target className="h-8 w-8 text-purple-600 mr-4" />
          <div>
            <p className="text-2xl font-bold">{stats.phases}</p>
            <p className="text-xs text-muted-foreground">Phases couvertes</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center p-6">
          <TrendingUp className="h-8 w-8 text-orange-600 mr-4" />
          <div>
            <p className="text-2xl font-bold">{Math.round(stats.avgPriority || 0)}</p>
            <p className="text-xs text-muted-foreground">Priorité moyenne</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Composant pour le formulaire d'édition de règle
function RuleEditorModal({ 
  rule, 
  isOpen,
  onSave, 
  onClose 
}: {
  rule: Partial<CreateRuleData> | null;
  isOpen: boolean;
  onSave: (data: CreateRuleData) => void;
  onClose: () => void;
}) {
  const form = useForm<CreateRuleData>({
    resolver: zodResolver(CreateRuleSchema),
    defaultValues: rule || createEmptyRule(),
  });

  const { validateRule } = useBusinessRules();

  const onSubmit = (data: CreateRuleData) => {
    const validationErrors = validateRule(data);
    if (validationErrors.length > 0) {
      console.error('Erreurs de validation:', validationErrors);
      return;
    }
    
    onSave(data);
    onClose();
    form.reset();
  };

  const phaseOptions = [
    { value: 'passation', label: 'Passation' },
    { value: 'etude', label: 'Étude' },
    { value: 'visa_architecte', label: 'VISA Architecte' },
    { value: 'planification', label: 'Planification' },
    { value: 'approvisionnement', label: 'Approvisionnement' },
    { value: 'chantier', label: 'Chantier' },
    { value: 'sav', label: 'SAV' },
  ];

  const projectTypeOptions = [
    { value: 'neuf', label: 'Neuf' },
    { value: 'renovation', label: 'Rénovation' },
    { value: 'maintenance', label: 'Maintenance' },
  ];

  const complexityOptions = [
    { value: 'simple', label: 'Simple' },
    { value: 'normale', label: 'Normale' },
    { value: 'elevee', label: 'Élevée' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-rule-editor">
        <DialogHeader>
          <DialogTitle>
            {rule?.name ? 'Modifier la règle' : 'Nouvelle règle métier'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informations générales */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations générales</h3>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la règle *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Étude Projet Neuf Standard" {...field} data-testid="input-rule-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Décrivez le contexte d'application de cette règle..."
                        {...field}
                        data-testid="textarea-rule-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phase *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-rule-phase">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une phase" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {phaseOptions.map((option) => (
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

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priorité (1-100)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="100" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-rule-priority"
                        />
                      </FormControl>
                      <FormDescription>
                        Plus la priorité est élevée, plus la règle sera privilégiée
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type de projet</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-rule-project-type">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Type de projet (optionnel)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectTypeOptions.map((option) => (
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

                <FormField
                  control={form.control}
                  name="complexity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complexité</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} data-testid="select-rule-complexity">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Complexité (optionnelle)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {complexityOptions.map((option) => (
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
              </div>
            </div>

            {/* Calculs de durée */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Calculs de durée</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="baseDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée de base (jours) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-rule-base-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="multiplierFactor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Multiplicateur</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          min="0.1" 
                          max="5" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-rule-multiplier"
                        />
                      </FormControl>
                      <FormDescription>Entre 0.1 et 5.0</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bufferPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Buffer (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="input-rule-buffer"
                        />
                      </FormControl>
                      <FormDescription>0-100%</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="minDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée minimum (jours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          data-testid="input-rule-min-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée maximum (jours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          data-testid="input-rule-max-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Options</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="workingDaysOnly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Jours ouvrés uniquement</FormLabel>
                        <FormDescription>Exclure weekends</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-working-days"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="excludeHolidays"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Exclure jours fériés</FormLabel>
                        <FormDescription>Calendrier français</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-exclude-holidays"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Règle active</FormLabel>
                      <FormDescription>
                        Cette règle sera utilisée dans les calculs automatiques
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-rule-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-rule">
                Annuler
              </Button>
              <Button type="submit" data-testid="button-save-rule">
                {rule?.name ? 'Mettre à jour' : 'Créer'} la règle
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Composant table des règles par phase
function RulesByPhaseTable({
  rulesByPhase,
  onEdit,
  onToggle,
  onDelete,
  onDuplicate
}: {
  rulesByPhase: Record<string, DateIntelligenceRule[]>;
  onEdit: (rule: DateIntelligenceRule) => void;
  onToggle: (ruleId: string, isActive: boolean) => void;
  onDelete: (ruleId: string) => void;
  onDuplicate: (rule: DateIntelligenceRule) => void;
}) {
  const phases = Object.keys(rulesByPhase);

  if (phases.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">Aucune règle définie</p>
          <p className="text-sm text-muted-foreground">
            Créez votre première règle métier pour commencer
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue={phases[0]} className="w-full">
      <TabsList className="grid grid-cols-7 w-full">
        {phases.map((phase) => (
          <TabsTrigger key={phase} value={phase} className="text-xs capitalize">
            {phase.replace('_', ' ')}
            <Badge variant="secondary" className="ml-1 text-xs">
              {rulesByPhase[phase].length}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {phases.map((phase) => (
        <TabsContent key={phase} value={phase}>
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">
                Règles pour la phase : {phase.replace('_', ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type Projet</TableHead>
                    <TableHead>Complexité</TableHead>
                    <TableHead>Durée Base</TableHead>
                    <TableHead>Priorité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rulesByPhase[phase].map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          {rule.description && (
                            <p className="text-xs text-muted-foreground max-w-48 truncate">
                              {rule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {rule.projectType ? (
                          <Badge variant="outline" className="text-xs capitalize">
                            {rule.projectType}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Tous</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.complexity ? (
                          <Badge variant="outline" className="text-xs capitalize">
                            {rule.complexity}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Toutes</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{rule.baseDuration} jours</p>
                          <p className="text-xs text-muted-foreground">
                            × {rule.multiplierFactor} (+{rule.bufferPercentage}%)
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={rule.priority && rule.priority > 75 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {rule.priority || 50}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.isActive ?? false}
                            onCheckedChange={(checked) => onToggle(rule.id, checked)}
                            data-testid={`toggle-rule-${rule.id}`}
                          />
                          <span className={`text-xs ${rule.isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(rule)}
                            data-testid={`edit-rule-${rule.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDuplicate(rule)}
                            data-testid={`duplicate-rule-${rule.id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(rule.id)}
                            data-testid={`delete-rule-${rule.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Composant principal BusinessRulesManager
export default function BusinessRulesManager() {
  const { rules, rulesByPhase, createRule, updateRule, deleteRule, toggleRule, stats, isLoading } = useBusinessRules();
  const [editingRule, setEditingRule] = useState<Partial<CreateRuleData> | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleCreateRule = () => {
    setEditingRule(createEmptyRule());
    setIsEditorOpen(true);
  };

  const handleEditRule = (rule: DateIntelligenceRule) => {
    setEditingRule({
      ...rule,
      isActive: rule.isActive ?? false,
      priority: rule.priority ?? 50,
      phase: rule.phase ?? 'etude',
      baseDuration: typeof rule.baseDuration === 'string' ? Number(rule.baseDuration) : (rule.baseDuration ?? 5),
      multiplierFactor: typeof rule.multiplierFactor === 'string' ? Number(rule.multiplierFactor) : (rule.multiplierFactor ?? 1.0),
      bufferPercentage: typeof rule.bufferPercentage === 'string' ? Number(rule.bufferPercentage) : (rule.bufferPercentage ?? 10),
      workingDaysOnly: rule.workingDaysOnly ?? true,
      excludeHolidays: rule.excludeHolidays ?? true,
      triggerEvents: rule.triggerEvents ?? [],
      description: rule.description ?? undefined,
      projectType: rule.projectType && ['neuf', 'renovation', 'maintenance'].includes(rule.projectType) ? rule.projectType as 'neuf' | 'renovation' | 'maintenance' : undefined,
      complexity: rule.complexity && ['simple', 'normale', 'elevee'].includes(rule.complexity) ? rule.complexity as 'simple' | 'normale' | 'elevee' : undefined,
      minDuration: rule.minDuration ?? undefined,
      maxDuration: rule.maxDuration ?? undefined,
      baseConditions: rule.baseConditions ? rule.baseConditions as Record<string, any> : undefined,
      validFrom: rule.validFrom ? new Date(rule.validFrom) : new Date(),
      validUntil: rule.validUntil ? new Date(rule.validUntil) : undefined,
    });
    setIsEditorOpen(true);
  };

  const handleDuplicateRule = (rule: DateIntelligenceRule) => {
    const duplicatedRule = {
      ...rule,
      name: `${rule.name} (Copie)`,
      validFrom: new Date(),
      validUntil: undefined,
      isActive: false, // Désactiver la copie par défaut
    };
    
    // Exclure les propriétés auto-générées
    const { id, createdAt, updatedAt, ...ruleData } = duplicatedRule;
    
    setEditingRule({
      ...ruleData,
      isActive: ruleData.isActive ?? false,
      priority: ruleData.priority ?? 50,
      phase: ruleData.phase ?? 'etude',
      baseDuration: typeof ruleData.baseDuration === 'string' ? Number(ruleData.baseDuration) : (ruleData.baseDuration ?? 5),
      multiplierFactor: typeof ruleData.multiplierFactor === 'string' ? Number(ruleData.multiplierFactor) : (ruleData.multiplierFactor ?? 1.0),
      bufferPercentage: typeof ruleData.bufferPercentage === 'string' ? Number(ruleData.bufferPercentage) : (ruleData.bufferPercentage ?? 10),
      workingDaysOnly: ruleData.workingDaysOnly ?? true,
      excludeHolidays: ruleData.excludeHolidays ?? true,
      triggerEvents: ruleData.triggerEvents ?? [],
      description: ruleData.description ?? undefined,
      projectType: ruleData.projectType && ['neuf', 'renovation', 'maintenance'].includes(ruleData.projectType) ? ruleData.projectType as 'neuf' | 'renovation' | 'maintenance' : undefined,
      complexity: ruleData.complexity && ['simple', 'normale', 'elevee'].includes(ruleData.complexity) ? ruleData.complexity as 'simple' | 'normale' | 'elevee' : undefined,
      minDuration: ruleData.minDuration ?? undefined,
      maxDuration: ruleData.maxDuration ?? undefined,
      baseConditions: ruleData.baseConditions ? ruleData.baseConditions as Record<string, any> : undefined,
    });
    setIsEditorOpen(true);
  };

  const handleSaveRule = (data: CreateRuleData) => {
    if (editingRule && 'id' in editingRule && editingRule.id) {
      // Mise à jour
      updateRule({ ruleId: editingRule.id as string, updates: data });
    } else {
      // Création
      createRule(data);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
      deleteRule(ruleId);
    }
  };

  const handleToggleRule = (ruleId: string, isActive: boolean) => {
    toggleRule({ ruleId, isActive });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Règles Métier Menuiserie</h1>
          <p className="text-muted-foreground">
            Configuration des règles de calcul automatique des délais par phase
          </p>
        </div>
        <Button onClick={handleCreateRule} data-testid="button-create-rule">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Règle
        </Button>
      </div>

      {/* Statistiques règles */}
      <RulesStatistics stats={stats} />

      {/* Aide et informations */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Les règles métier définissent comment calculer automatiquement les durées des phases de projet. 
          Elles sont appliquées selon leur priorité (la plus élevée d'abord) et leurs conditions d'éligibilité.
        </AlertDescription>
      </Alert>

      {/* Table des règles par phase */}
      <RulesByPhaseTable
        rulesByPhase={rulesByPhase}
        onEdit={handleEditRule}
        onToggle={handleToggleRule}
        onDelete={handleDeleteRule}
        onDuplicate={handleDuplicateRule}
      />

      {/* Modal édition règle */}
      <RuleEditorModal
        rule={editingRule}
        isOpen={isEditorOpen}
        onSave={handleSaveRule}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingRule(null);
        }}
      />
    </div>
  );
}