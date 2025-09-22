import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

// ========================================
// SCHÉMAS VALIDATION CHATBOT
// ========================================

// Schema pour la requête chatbot
export const chatQuerySchema = z.object({
  query: z.string().min(3, "La question doit contenir au moins 3 caractères").max(500, "La question ne peut pas dépasser 500 caractères"),
  context: z.string().optional(),
  sessionId: z.string().optional(),
  dryRun: z.boolean().optional(),
  includeDebugInfo: z.boolean().optional(),
  maxResults: z.number().min(1).max(100).optional(),
  timeoutMs: z.number().min(1000).max(30000).optional()
});

// Schema pour le feedback
export const chatFeedbackSchema = z.object({
  conversationId: z.string().uuid(),
  rating: z.enum(["positive", "negative"]),
  comment: z.string().optional(),
  category: z.string().optional()
});

// ========================================
// INTERFACES TYPESCRIPT
// ========================================

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  queryData?: {
    sql?: string;
    results?: any[];
    confidence?: number;
    explanation?: string;
    executionTime?: number;
    modelUsed?: string;
  };
  conversationId?: string;
  isTyping?: boolean;
}

export interface ChatbotQueryRequest {
  query: string;
  context?: string;
  sessionId?: string;
  options?: {
    dryRun?: boolean;
    includeDebugInfo?: boolean;
    maxResults?: number;
    timeoutMs?: number;
  };
}

export interface ChatbotQueryResponse {
  success: boolean;
  conversation_id: string;
  query: string;
  explanation?: string;
  sql?: string;
  results?: any[];
  suggestions?: string[];
  confidence?: number;
  execution_time_ms?: number;
  model_used?: string;
  cache_hit?: boolean;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
  debug_info?: any;
}

export interface ChatbotSuggestion {
  id: string;
  category: string;
  text: string;
  description?: string;
  userRole?: string[];
  priority?: number;
}

export interface ChatbotHistoryItem {
  id: string;
  userId: string;
  query: string;
  response: string;
  timestamp: string;
  sessionId?: string;
  confidence?: number;
  success: boolean;
}

// ========================================
// HOOK PRINCIPAL POUR REQUÊTES CHATBOT
// ========================================

export function useChatbotQuery() {
  const { user } = useAuth() as { user: User | null };
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: ChatbotQueryRequest): Promise<ChatbotQueryResponse> => {
      // Construction du payload avec options nested (respect contrat backend)
      const payload: any = {
        query: request.query,
        context: request.context,
        sessionId: request.sessionId,
        userId: user?.id,
        userRole: user?.role || 'technicien_be'
      };

      // Ajout des options nested si présentes
      if (request.options) {
        payload.options = {
          dryRun: request.options.dryRun,
          includeDebugInfo: request.options.includeDebugInfo,
          maxResults: request.options.maxResults,
          timeoutMs: request.options.timeoutMs
        };
      }

      // Appel API avec payload correctement structuré
      const response = await apiRequest('POST', '/api/chatbot/query', payload);

      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidation cache historique
      queryClient.invalidateQueries({ queryKey: ['/api/chatbot/history'] });
      
      if (!data.success && data.error) {
        toast({
          title: "Erreur du chatbot",
          description: data.error.message || "Une erreur s'est produite lors du traitement de votre requête",
          variant: "destructive"
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur de connexion",
        description: "Impossible de joindre l'assistant IA. Veuillez réessayer.",
        variant: "destructive"
      });
    }
  });
}

// ========================================
// HOOK SUGGESTIONS INTELLIGENTES
// ========================================

export function useChatbotSuggestions(userRole?: string) {
  return useQuery({
    queryKey: ['/api/chatbot/suggestions', userRole],
    queryFn: async (): Promise<ChatbotSuggestion[]> => {
      const params = new URLSearchParams();
      if (userRole) params.append('role', userRole);
      
      const response = await fetch(`/api/chatbot/suggestions?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Échec de récupération des suggestions');
      }
      
      return await response.json();
    },
    enabled: !!userRole,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });
}

// ========================================
// HOOK HISTORIQUE CONVERSATIONS
// ========================================

export function useChatbotHistory(limit = 50, offset = 0) {
  const { user } = useAuth() as { user: User | null };

  return useQuery({
    queryKey: ['/api/chatbot/history', limit, offset],
    queryFn: async (): Promise<ChatbotHistoryItem[]> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      const response = await fetch(`/api/chatbot/history?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Échec de récupération de l\'historique');
      }
      
      return await response.json();
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

// ========================================
// HOOK FEEDBACK UTILISATEUR
// ========================================

export function useChatbotFeedback() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (feedback: z.infer<typeof chatFeedbackSchema>) => {
      // Validation côté client
      const validatedFeedback = chatFeedbackSchema.parse(feedback);
      
      const response = await apiRequest('POST', '/api/chatbot/feedback', validatedFeedback);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Merci pour votre retour !",
        description: "Votre feedback nous aide à améliorer l'assistant IA.",
        variant: "default"
      });
    },
    onError: () => {
      toast({
        title: "Erreur d'envoi du feedback",
        description: "Impossible d'envoyer votre retour pour le moment.",
        variant: "destructive"
      });
    }
  });
}

// ========================================
// HOOK VALIDATION REQUÊTE
// ========================================

export function useChatbotValidation() {
  const { user } = useAuth() as { user: User | null };

  return useMutation({
    mutationFn: async (query: string): Promise<{ isValid: boolean; warnings?: string[]; securityIssues?: string[] }> => {
      const response = await apiRequest('POST', '/api/chatbot/validate', {
        query,
        userId: user?.id,
        userRole: user?.role || 'technicien_be'
      });
      
      return await response.json();
    },
    retry: 1
  });
}

// ========================================
// HOOK STATISTIQUES (ADMIN UNIQUEMENT)
// ========================================

export function useChatbotStats() {
  const { user } = useAuth() as { user: User | null };

  return useQuery({
    queryKey: ['/api/chatbot/stats'],
    queryFn: async () => {
      const response = await fetch('/api/chatbot/stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Accès non autorisé aux statistiques');
      }
      
      return await response.json();
    },
    enabled: user?.role === 'admin',
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 0
  });
}

// ========================================
// HOOK SANTÉ SYSTÈME
// ========================================

export function useChatbotHealth() {
  return useQuery({
    queryKey: ['/api/chatbot/health'],
    queryFn: async () => {
      const response = await fetch('/api/chatbot/health', {
        credentials: 'include'
      });
      
      return await response.json();
    },
    refetchInterval: 30000, // Vérification toutes les 30s
    staleTime: 15000, // 15s
    retry: 2
  });
}

// ========================================
// SUGGESTIONS PAR RÔLE (CONSTANTS)
// ========================================

export const ROLE_SUGGESTIONS = {
  admin: [
    "Quels projets sont en retard ?",
    "Statistiques d'équipe ce mois",
    "Budget global et rentabilité",
    "Alertes critiques en cours",
    "Performance commerciale par région"
  ],
  chef_projet: [
    "Mes projets actifs avec échéances",
    "Planning de la semaine",
    "Ressources disponibles pour nouveaux projets",
    "État d'avancement de mes chantiers",
    "Prochaines livraisons matériaux"
  ],
  technicien_be: [
    "Mes tâches BE en attente",
    "Dossiers à traiter cette semaine",
    "Charge de travail actuelle",
    "Projets nécessitant validation technique",
    "Alertes techniques non résolues"
  ],
  commercial: [
    "Nouvelles opportunités ce mois",
    "État des offres en cours",
    "Taux de conversion AO vers offres",
    "Clients potentiels à relancer",
    "Pipeline commercial par département"
  ],
  be_manager: [
    "Charge actuelle de l'équipe BE",
    "Projets en attente de validation",
    "Planning des validations cette semaine",
    "Expertise spécialisée requise",
    "Goulots d'étranglement dans le workflow"
  ]
} as const;

// Type helper pour les rôles
export type UserRole = keyof typeof ROLE_SUGGESTIONS;

// ========================================
// HOOK UTILITAIRES
// ========================================

/**
 * Hook utilitaire pour gérer l'état global du chatbot
 */
export function useChatbotState() {
  const { user } = useAuth() as { user: User | null };
  
  // Suggestions basées sur le rôle utilisateur
  const userRole = user?.role as UserRole || 'technicien_be';
  const roleSuggestions = ROLE_SUGGESTIONS[userRole] || ROLE_SUGGESTIONS.technicien_be;
  
  return {
    userRole,
    roleSuggestions,
    isAdmin: user?.role === 'admin',
    userId: user?.id,
    userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Utilisateur'
  };
}