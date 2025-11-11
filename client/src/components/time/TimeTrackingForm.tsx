import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const timeTrackingSchema = z.object({
  projectId: z.string().uuid().optional(),
  offerId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  taskType: z.enum(['be', 'admin', 'terrain', 'chiffrage', 'commercial']),
  hours: z.string().regex(/^\d+(\.\d+)?$/, "Format invalide (ex: 8.5)"),
  date: z.string(),
  description: z.string().optional(),
  hourlyRate: z.string().optional()
});

type TimeTrackingFormData = z.infer<typeof timeTrackingSchema>;

interface TimeTrackingFormProps {
  projectId?: string;
  offerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TimeTrackingForm({ projectId, offerId, isOpen, onClose, onSuccess }: TimeTrackingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TimeTrackingFormData>({
    resolver: zodResolver(timeTrackingSchema),
    defaultValues: {
      projectId,
      offerId,
      userId: "",
      taskType: "be",
      hours: "",
      date: new Date().toISOString().split('T')[0],
      description: "",
      hourlyRate: ""
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: TimeTrackingFormData) => {
      const response = await fetch("/api/time-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          date: new Date(data.date).toISOString()
        })
      });
      if (!response.ok) throw new Error("Erreur lors de l'enregistrement");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-tracking"] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/time-tracking/summary`] });
      }
      toast({ title: "Temps enregistré", description: "Le temps a été enregistré avec succès" });
      form.reset();
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enregistrer du temps</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="taskType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de tâche</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="be">BE</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                      <SelectItem value="chiffrage">Chiffrage</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heures</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

