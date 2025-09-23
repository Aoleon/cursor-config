import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Plus, Settings, Trash2, Edit, Play, Pause } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const classificationRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  priority: z.number().min(0).max(100).default(0),
  mailboxId: z.string().optional(),
  conditions: z.object({
    fromEmail: z.string().optional(),
    subject: z.string().optional(),
    body: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    mailboxes: z.array(z.string()).optional(),
  }).default({}),
  actions: z.object({
    category: z.string().optional(),
    priority: z.enum(["critical", "high", "normal", "low"]).optional(),
    urgency: z.enum(["immediate", "within_24h", "within_week", "no_rush"]).optional(),
    assignToId: z.string().optional(),
    autoReply: z.boolean().optional(),
    templateId: z.string().optional(),
  }).default({}),
});

type ClassificationRuleForm = z.infer<typeof classificationRuleSchema>;

const CATEGORY_OPTIONS = [
  { value: "balance_query", label: "Balance Query" },
  { value: "docs_resend", label: "Document Resend" },
  { value: "date_change", label: "Date Change" },
  { value: "refund_request", label: "Refund Request" },
  { value: "complaint", label: "Complaint" },
  { value: "flight_change", label: "Flight Change" },
  { value: "baggage", label: "Baggage" },
  { value: "seat_selection", label: "Seat Selection" },
  { value: "cancellation", label: "Cancellation" },
  { value: "general", label: "General" },
  { value: "spam", label: "Spam" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

const URGENCY_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "within_24h", label: "Within 24 Hours" },
  { value: "within_week", label: "Within Week" },
  { value: "no_rush", label: "No Rush" },
];

export default function ClassificationRules() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const { toast } = useToast();

  // Fetch classification rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["/api/classification-rules"],
  });

  // Fetch mailboxes for selection
  const { data: mailboxes = [] } = useQuery({
    queryKey: ["/api/mailboxes"],
  });

  // Fetch concierges for assignment
  const { data: concierges = [] } = useQuery({
    queryKey: ["/api/concierges"],
  });

  // Fetch templates for auto-reply
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: (data: ClassificationRuleForm) => 
      apiRequest("/api/classification-rules", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classification-rules"] });
      setIsCreateModalOpen(false);
      toast({ title: "Rule created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create rule", variant: "destructive" });
    },
  });

  // Update rule mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClassificationRuleForm> }) =>
      apiRequest(`/api/classification-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classification-rules"] });
      setIsEditModalOpen(false);
      setEditingRule(null);
      toast({ title: "Rule updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update rule", variant: "destructive" });
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/classification-rules/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classification-rules"] });
      toast({ title: "Rule deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete rule", variant: "destructive" });
    },
  });

  // Toggle rule active status
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest(`/api/classification-rules/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/classification-rules"] });
      toast({ title: "Rule status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update rule status", variant: "destructive" });
    },
  });

  const createForm = useForm<ClassificationRuleForm>({
    resolver: zodResolver(classificationRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      priority: 0,
      conditions: {},
      actions: {},
    },
  });

  const editForm = useForm<ClassificationRuleForm>({
    resolver: zodResolver(classificationRuleSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      priority: 0,
      conditions: {},
      actions: {},
    },
  });

  const onCreateSubmit = (data: ClassificationRuleForm) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: ClassificationRuleForm) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data });
    }
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    editForm.reset({
      name: rule.name,
      description: rule.description || "",
      isActive: rule.isActive,
      priority: rule.priority,
      mailboxId: rule.mailboxId || "",
      conditions: rule.conditions || {},
      actions: rule.actions || {},
    });
    setIsEditModalOpen(true);
  };

  const handleToggle = (rule: any) => {
    toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive });
  };

  const handleDelete = (rule: any) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteMutation.mutate(rule.id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Classification Rules</h1>
        </div>
        <div>Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classification Rules</h1>
          <p className="text-muted-foreground">
            Create custom rules to automatically classify and route emails
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-rule">
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Classification Rule</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rule Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., High Priority Flight Changes" {...field} data-testid="input-create-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (0-100)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-create-priority"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this rule does..."
                          value={field.value || ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="textarea-create-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="mailboxId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apply to Mailbox (Optional)</FormLabel>
                      <FormControl>
                        <Select value={field.value || ""} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-create-mailbox">
                            <SelectValue placeholder="All mailboxes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All mailboxes</SelectItem>
                            {mailboxes.map((mailbox: any) => (
                              <SelectItem key={mailbox.id} value={mailbox.id}>
                                {mailbox.displayName} ({mailbox.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Conditions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="conditions.fromEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Email Contains</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., @example.com" {...field} data-testid="input-create-from-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="conditions.subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Contains</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., urgent, flight" {...field} data-testid="input-create-subject-contains" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="conditions.body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Contains</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., refund, cancel" {...field} data-testid="input-create-body-contains" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-4">Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
                      name="actions.category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Set Category</FormLabel>
                          <FormControl>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-create-category">
                                <SelectValue placeholder="No change" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No change</SelectItem>
                                {CATEGORY_OPTIONS.map((category) => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="actions.priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Set Priority</FormLabel>
                          <FormControl>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-create-action-priority">
                                <SelectValue placeholder="No change" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No change</SelectItem>
                                {PRIORITY_OPTIONS.map((priority) => (
                                  <SelectItem key={priority.value} value={priority.value}>
                                    {priority.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="actions.urgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Set Urgency</FormLabel>
                          <FormControl>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-create-urgency">
                                <SelectValue placeholder="No change" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No change</SelectItem>
                                {URGENCY_OPTIONS.map((urgency) => (
                                  <SelectItem key={urgency.value} value={urgency.value}>
                                    {urgency.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createForm.control}
                      name="actions.assignToId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Auto-assign to Concierge</FormLabel>
                          <FormControl>
                            <Select value={field.value || ""} onValueChange={field.onChange}>
                              <SelectTrigger data-testid="select-create-assign-to">
                                <SelectValue placeholder="No auto-assignment" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">No auto-assignment</SelectItem>
                                {concierges.filter((c: any) => c.isActive).map((concierge: any) => (
                                  <SelectItem key={concierge.id} value={concierge.id}>
                                    {concierge.name} ({concierge.email})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-save-create"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Rule"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {rules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Settings className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Classification Rules</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first rule to automatically classify and route emails
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-first-rule">
                <Plus className="mr-2 h-4 w-4" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          rules.map((rule: any) => (
            <Card key={rule.id} className="w-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <Badge 
                      variant={rule.isActive ? "default" : "secondary"}
                      data-testid={`badge-status-${rule.id}`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" data-testid={`badge-priority-${rule.id}`}>
                      Priority: {rule.priority}
                    </Badge>
                    {rule.usageCount > 0 && (
                      <Badge variant="outline" data-testid={`badge-usage-${rule.id}`}>
                        Used: {rule.usageCount}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(rule)}
                      data-testid={`button-toggle-${rule.id}`}
                    >
                      {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(rule)}
                      data-testid={`button-edit-${rule.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(rule)}
                      data-testid={`button-delete-${rule.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {rule.description && (
                  <CardDescription>{rule.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Conditions</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {rule.conditions?.fromEmail && (
                        <div>From email contains: <code>{rule.conditions.fromEmail}</code></div>
                      )}
                      {rule.conditions?.subject && (
                        <div>Subject contains: <code>{rule.conditions.subject}</code></div>
                      )}
                      {rule.conditions?.body && (
                        <div>Body contains: <code>{rule.conditions.body}</code></div>
                      )}
                      {(!rule.conditions?.fromEmail && !rule.conditions?.subject && !rule.conditions?.body) && (
                        <div className="text-muted-foreground">No specific conditions</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Actions</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {rule.actions?.category && (
                        <div>Set category: <Badge variant="outline">{rule.actions.category}</Badge></div>
                      )}
                      {rule.actions?.priority && (
                        <div>Set priority: <Badge variant="outline">{rule.actions.priority}</Badge></div>
                      )}
                      {rule.actions?.urgency && (
                        <div>Set urgency: <Badge variant="outline">{rule.actions.urgency}</Badge></div>
                      )}
                      {rule.actions?.assignToId && (
                        <div>Auto-assign to concierge</div>
                      )}
                      {(!rule.actions?.category && !rule.actions?.priority && !rule.actions?.urgency && !rule.actions?.assignToId) && (
                        <div className="text-muted-foreground">No specific actions</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Modal - Similar structure to create modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Classification Rule</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
              {/* Similar form fields as create modal - abbreviated for brevity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., High Priority Flight Changes" {...field} data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (0-100)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-priority"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}