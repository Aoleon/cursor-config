import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackTerrainForm } from "@/components/feedback/FeedbackTerrainForm";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

interface Feedback {
  id: string;
  projectId: string;
  reportedBy: string;
  feedbackType: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  createdAt: string;
}

export function FeedbackTerrainPage({ projectId }: { projectId?: string }) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: feedbacks = [], isLoading } = useQuery<Feedback[]>({
    queryKey: projectId ? [`/api/projects/${projectId}/feedback-terrain`] : ["/api/projects/feedback-terrain"],
    queryFn: async () => {
      const url = projectId ? `/api/projects/${projectId}/feedback-terrain` : "/api/projects/feedback-terrain";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erreur lors du chargement");
      return res.json();
    }
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      nouveau: "default",
      en_cours: "secondary",
      resolu: "default",
      ferme: "secondary"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feedback Terrain</h1>
        {projectId && (
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Feedback
          </Button>
        )}
      </div>

      {projectId && (
        <FeedbackTerrainForm
          projectId={projectId}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => setIsFormOpen(false)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Feedbacks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun feedback</div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <Card key={feedback.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{feedback.title}</span>
                          {getStatusBadge(feedback.status)}
                          {feedback.priority && <Badge variant="outline">{feedback.priority}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{feedback.description}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Type: {feedback.feedbackType}</span>
                          <span>Signalé par: {feedback.reportedBy}</span>
                          <span>Créé le: {new Date(feedback.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

