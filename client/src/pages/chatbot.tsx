import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  MessageCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  Lightbulb,
  Clock,
  Bot,
  User,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Sparkles,
  Play,
  Square,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock3,
  Zap,
  History,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useChatbotQuery,
  useChatbotSuggestions,
  useChatbotHistory,
  useChatbotFeedback,
  useChatbotHealth,
  useChatbotState,
  useProposeAction,
  useExecuteAction,
  type Message,
  type UserRole,
  type ActionProposal,
  type ChatbotQueryResponseWithAction,
  type ProposeActionRequest,
  type ExecuteActionRequest,
  ROLE_SUGGESTIONS
} from "@/hooks/useChatbot";
import Header from "@/components/layout/header";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// ========================================
// INTERFACES ET TYPES
// ========================================

interface TypingIndicatorProps {
  isVisible: boolean;
}

interface MessageBubbleProps {
  message: Message;
  onFeedback: (conversationId: string, rating: "positive" | "negative") => void;
}

interface SuggestionChipProps {
  text: string;
  onClick: (text: string) => void;
  large?: boolean;
}

interface ActionConfirmationDialogProps {
  action: ActionProposal;
  actionDetails: {
    type: string;
    entity: string;
    operation: string;
    parameters: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high';
    estimatedTime?: number;
    warnings?: string[];
  };
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

interface ActionMessageProps {
  message: Message;
  actionProposal?: ActionProposal;
  actionDetails?: {
    type: string;
    entity: string;
    operation: string;
    parameters: Record<string, any>;
    riskLevel: 'low' | 'medium' | 'high';
    estimatedTime?: number;
    warnings?: string[];
  };
  onActionConfirm: (actionId: string) => void;
  onFeedback: (conversationId: string, rating: "positive" | "negative") => void;
}

interface ActionHistoryItem {
  id: string;
  type: string;
  entity: string;
  operation: string;
  status: 'executed' | 'failed' | 'cancelled';
  executedAt: Date;
  parameters: Record<string, any>;
  result?: any;
}

// ========================================
// COMPOSANTS UTILITAIRES
// ========================================

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center space-x-3 py-4" data-testid="typing-indicator">
      <Avatar className="w-10 h-10">
        <AvatarFallback className="bg-primary/20 text-primary">
          <Bot className="w-5 h-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex space-x-2">
        <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-3 h-3 bg-primary/60 rounded-full animate-bounce" />
      </div>
    </div>
  );
};

const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, onClick, large = false }) => (
  <Button
    variant="outline"
    size={large ? "default" : "sm"}
    onClick={() => onClick(text)}
    className={cn(
      "flex items-center justify-start text-left whitespace-normal h-auto transition-all duration-200",
      large ? "p-4" : "p-3",
      "hover:bg-primary/10 hover:border-primary/50 hover:scale-105"
    )}
    data-testid={`suggestion-chip-${text.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
  >
    <Sparkles className={cn("flex-shrink-0 text-primary/60 mr-3", large ? "w-5 h-5" : "w-4 h-4")} />
    <span className={large ? "text-sm" : "text-xs"}>{text}</span>
  </Button>
);

// ========================================
// COMPOSANTS D'ACTIONS
// ========================================

const ActionConfirmationDialog: React.FC<ActionConfirmationDialogProps> = ({
  action,
  actionDetails,
  isOpen,
  onConfirm,
  onCancel,
  isExecuting = false
}) => {
  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <ShieldCheck className="w-5 h-5 text-green-600" />;
      case 'medium': return <Shield className="w-5 h-5 text-orange-600" />;
      case 'high': return <ShieldAlert className="w-5 h-5 text-red-600" />;
      default: return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'border-green-200 bg-green-50';
      case 'medium': return 'border-orange-200 bg-orange-50';
      case 'high': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const formatEntityLabel = (entity: string) => {
    const entityLabels = {
      offer: 'Offre commerciale',
      project: 'Projet',
      ao: 'Appel d\'offres',
      contact: 'Contact',
      task: 'Tâche',
      supplier: 'Fournisseur',
      milestone: 'Jalon'
    };
    return entityLabels[entity as keyof typeof entityLabels] || entity;
  };

  const formatOperationLabel = (operation: string) => {
    const operationLabels = {
      create_offer: 'Créer une offre',
      create_project: 'Créer un projet',
      update_status: 'Mettre à jour le statut',
      update_montant: 'Modifier le montant',
      assign_responsible: 'Assigner un responsable',
      validate_fin_etudes: 'Valider la fin d\'études',
      transform_to_project: 'Transformer en projet',
      launch_project: 'Lancer le projet',
      archive_offer: 'Archiver l\'offre',
      create_project_task: 'Créer une tâche'
    };
    return operationLabels[operation as keyof typeof operationLabels] || operation;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={() => !isExecuting && onCancel()}>
      <AlertDialogContent className="max-w-2xl" data-testid="action-confirmation-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-3 text-xl">
            <Zap className="w-6 h-6 text-primary" />
            Confirmer l'action
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            L'assistant souhaite exécuter une action sur vos données.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <Card className={cn("border-2", getRiskColor(actionDetails.riskLevel))}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  {getRiskIcon(actionDetails.riskLevel)}
                  {formatOperationLabel(actionDetails.operation)}
                </CardTitle>
                <Badge 
                  variant={actionDetails.riskLevel === 'high' ? 'destructive' : 
                          actionDetails.riskLevel === 'medium' ? 'default' : 'secondary'}
                  className="text-sm px-3 py-1"
                >
                  Risque {actionDetails.riskLevel === 'low' ? 'faible' : 
                          actionDetails.riskLevel === 'medium' ? 'modéré' : 'élevé'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Type d'action :</span>
                  <span className="font-medium">{actionDetails.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entité concernée :</span>
                  <span className="font-medium">{formatEntityLabel(actionDetails.entity)}</span>
                </div>
                {actionDetails.estimatedTime && (
                  <div className="flex justify-between items-center">
                    <span>Temps estimé :</span>
                    <div className="flex items-center gap-1">
                      <Clock3 className="w-4 h-4" />
                      <span className="font-medium">{actionDetails.estimatedTime}s</span>
                    </div>
                  </div>
                )}
              </div>

              {Object.keys(actionDetails.parameters).length > 0 && (
                <div className="mt-4 p-3 bg-background/50 rounded border">
                  <div className="text-sm font-medium mb-2">Paramètres :</div>
                  <div className="space-y-2">
                    {Object.entries(actionDetails.parameters).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key} :</span>
                        <span className="font-mono max-w-64 truncate" title={String(value)}>
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {actionDetails.warnings && actionDetails.warnings.length > 0 && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-800 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Avertissements
                  </div>
                  <ul className="text-sm text-orange-700 space-y-1">
                    {actionDetails.warnings.map((warning, index) => (
                      <li key={index} className="list-disc list-inside">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onCancel} 
            disabled={isExecuting}
            data-testid="action-cancel-button"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm} 
            disabled={isExecuting}
            className={cn(
              "flex items-center gap-2",
              actionDetails.riskLevel === 'high' && "bg-red-600 hover:bg-red-700",
              actionDetails.riskLevel === 'medium' && "bg-orange-600 hover:bg-orange-700"
            )}
            data-testid="action-confirm-button"
          >
            {isExecuting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exécution...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Confirmer l'action
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ActionMessage: React.FC<ActionMessageProps> = ({ 
  message, 
  actionProposal, 
  actionDetails, 
  onActionConfirm, 
  onFeedback 
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const hasAction = !!actionProposal && !!actionDetails;

  const handleFeedback = (rating: "positive" | "negative") => {
    if (message.conversationId && !feedbackGiven) {
      onFeedback(message.conversationId, rating);
      setFeedbackGiven(rating);
    }
  };

  const handleActionConfirm = () => {
    if (actionProposal?.action_id) {
      onActionConfirm(actionProposal.action_id);
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return <ShieldCheck className="w-5 h-5 text-green-600" />;
      case 'medium': return <Shield className="w-5 h-5 text-orange-600" />;
      case 'high': return <ShieldAlert className="w-5 h-5 text-red-600" />;
      default: return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatEntityLabel = (entity: string) => {
    const entityLabels = {
      offer: 'offre',
      project: 'projet',
      ao: 'appel d\'offres',
      contact: 'contact',
      task: 'tâche',
      supplier: 'fournisseur',
      milestone: 'jalon'
    };
    return entityLabels[entity as keyof typeof entityLabels] || entity;
  };

  return (
    <div
      className={cn(
        "flex gap-4 mb-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`action-message-${message.role}-${message.id}`}
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarFallback className={cn(
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/20 text-primary"
        )}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn("flex flex-col max-w-[70%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-5 py-3 text-base break-words",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground border"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {hasAction && isAssistant && (
          <Card className="mt-3 w-full border-2 border-primary/30 bg-primary/5 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Action proposée
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {actionDetails.operation} sur {formatEntityLabel(actionDetails.entity)}
                  </span>
                  <div className="flex items-center gap-2">
                    {getRiskIcon(actionDetails.riskLevel)}
                    <span className="text-xs text-muted-foreground">
                      Risque {actionDetails.riskLevel === 'low' ? 'faible' : 
                              actionDetails.riskLevel === 'medium' ? 'modéré' : 'élevé'}
                    </span>
                  </div>
                </div>

                {actionDetails.estimatedTime && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="w-4 h-4" />
                    Temps estimé : {actionDetails.estimatedTime}s
                  </div>
                )}

                {actionProposal.confirmation_required && (
                  <Button
                    onClick={handleActionConfirm}
                    size="lg"
                    className="w-full mt-2 flex items-center gap-2"
                    data-testid={`action-execute-${actionProposal.action_id}`}
                  >
                    <Play className="w-4 h-4" />
                    Confirmer et exécuter l'action
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex items-center mt-2 gap-2">
          <span className="text-sm text-muted-foreground">
            {format(message.timestamp, 'HH:mm', { locale: fr })}
          </span>
          
          {isAssistant && message.conversationId && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFeedback("positive")}
                className={cn(
                  "h-7 w-7 p-0",
                  feedbackGiven === "positive" && "text-green-600"
                )}
                disabled={!!feedbackGiven}
                data-testid={`feedback-positive-${message.id}`}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFeedback("negative")}
                className={cn(
                  "h-7 w-7 p-0",
                  feedbackGiven === "negative" && "text-red-600"
                )}
                disabled={!!feedbackGiven}
                data-testid={`feedback-negative-${message.id}`}
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onFeedback }) => {
  const [feedbackGiven, setFeedbackGiven] = useState<"positive" | "negative" | null>(null);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const handleFeedback = (rating: "positive" | "negative") => {
    if (message.conversationId && !feedbackGiven) {
      onFeedback(message.conversationId, rating);
      setFeedbackGiven(rating);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-4 mb-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarFallback className={cn(
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/20 text-primary"
        )}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn("flex flex-col max-w-[70%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-5 py-3 text-base break-words",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground border"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          
          {isAssistant && message.queryData && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs opacity-70 flex-wrap">
                {message.queryData.confidence && (
                  <Badge variant="outline" className="text-xs">
                    Confiance: {Math.round(message.queryData.confidence * 100)}%
                  </Badge>
                )}
                {message.queryData.executionTime && (
                  <Badge variant="outline" className="text-xs">
                    {message.queryData.executionTime}ms
                  </Badge>
                )}
                {message.queryData.modelUsed && (
                  <Badge variant="outline" className="text-xs">
                    {message.queryData.modelUsed}
                  </Badge>
                )}
              </div>
              
              {message.queryData.explanation && (
                <div className="mt-2 text-sm opacity-80 font-medium">
                  💡 {message.queryData.explanation}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center mt-2 gap-2">
          <span className="text-sm text-muted-foreground">
            {format(message.timestamp, 'HH:mm', { locale: fr })}
          </span>
          
          {isAssistant && message.conversationId && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFeedback("positive")}
                className={cn(
                  "h-7 w-7 p-0",
                  feedbackGiven === "positive" && "text-green-600"
                )}
                disabled={!!feedbackGiven}
                data-testid={`feedback-positive-${message.id}`}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFeedback("negative")}
                className={cn(
                  "h-7 w-7 p-0",
                  feedbackGiven === "negative" && "text-red-600"
                )}
                disabled={!!feedbackGiven}
                data-testid={`feedback-negative-${message.id}`}
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========================================
// COMPOSANT PRINCIPAL CHATBOT PAGE
// ========================================

export default function ChatbotPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  
  const [pendingAction, setPendingAction] = useState<{
    messageId: string;
    proposal: ActionProposal;
    details: {
      type: string;
      entity: string;
      operation: string;
      parameters: Record<string, any>;
      riskLevel: 'low' | 'medium' | 'high';
      estimatedTime?: number;
      warnings?: string[];
    };
  } | null>(null);
  
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { userRole, roleSuggestions: roleBasedSuggestions, userName } = useChatbotState();

  const queryMutation = useChatbotQuery();
  const feedbackMutation = useChatbotFeedback();
  const { data: healthData } = useChatbotHealth();
  const { data: suggestions, isLoading: suggestionsLoading } = useChatbotSuggestions(userRole);
  const { data: conversationHistory } = useChatbotHistory(50, 0);
  const executeActionMutation = useExecuteAction();

  const isHealthy = healthData?.success && healthData?.chatbot_orchestration?.status === 'healthy';
  const isLoading = queryMutation.isPending;
  const isExecutingAction = executeActionMutation.isPending;

  const roleSuggestions = roleBasedSuggestions || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isHealthy) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    try {
      const response = await queryMutation.mutateAsync({
        query: inputValue,
        sessionId,
        options: {
          includeDebugInfo: false,
          maxResults: 20
        }
      }) as ChatbotQueryResponseWithAction;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.explanation || response.error?.message || "Aucune réponse disponible",
        timestamp: new Date(),
        conversationId: response.conversation_id,
        queryData: {
          sql: response.sql,
          results: response.results,
          confidence: response.confidence,
          explanation: response.explanation,
          executionTime: response.execution_time_ms,
          modelUsed: response.model_used
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.action_proposal && response.action_proposal.confirmation_required) {
        const actionDetails = {
          type: response.action_proposal.type,
          entity: response.action_proposal.entity,
          operation: response.action_proposal.operation,
          parameters: response.action_proposal.parameters,
          riskLevel: response.action_proposal.risk_level,
          estimatedTime: response.action_proposal.estimated_time,
          warnings: response.action_proposal.warnings
        };

        setPendingAction({
          messageId: assistantMessage.id,
          proposal: response.action_proposal,
          details: actionDetails
        });
      }

    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Désolé, une erreur s'est produite lors du traitement de votre demande.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
    inputRef.current?.focus();
  };

  const handleFeedback = async (conversationId: string, rating: "positive" | "negative") => {
    try {
      await feedbackMutation.mutateAsync({
        conversationId,
        rating
      });
      
      toast({
        title: "Merci pour votre retour",
        description: "Votre évaluation nous aide à améliorer l'assistant",
      });
    } catch (error) {
      console.error('Erreur lors de l\'envoi du feedback:', error);
    }
  };

  const handleDirectActionConfirm = (actionId: string) => {
    if (pendingAction && pendingAction.proposal.action_id === actionId) {
      setShowActionDialog(true);
    }
  };

  const handleActionConfirm = async (actionId: string) => {
    if (!pendingAction) return;

    try {
      const result = await executeActionMutation.mutateAsync({
        actionId,
        confirmationId: pendingAction.proposal.confirmation_id,
        parameters: pendingAction.details.parameters
      });

      const historyItem: ActionHistoryItem = {
        id: crypto.randomUUID(),
        type: pendingAction.details.type,
        entity: pendingAction.details.entity,
        operation: pendingAction.details.operation,
        status: result.success ? 'executed' : 'failed',
        executedAt: new Date(),
        parameters: pendingAction.details.parameters,
        result: result.result
      };

      setActionHistory(prev => [historyItem, ...prev]);

      toast({
        title: result.success ? "Action exécutée" : "Échec de l'action",
        description: result.success 
          ? `${pendingAction.details.operation} effectué avec succès`
          : result.error?.message || "Une erreur s'est produite",
        variant: result.success ? "default" : "destructive"
      });

      setPendingAction(null);
      setShowActionDialog(false);
    } catch (error) {
      toast({
        title: "Erreur d'exécution",
        description: "Impossible d'exécuter l'action demandée",
        variant: "destructive"
      });
    }
  };

  const handleActionCancel = () => {
    setShowActionDialog(false);
    setPendingAction(null);
  };

  const handleClearChat = () => {
    setMessages([]);
    setActionHistory([]);
    setPendingAction(null);
    setInputValue("");
  };

  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Wrench className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-2xl font-semibold mb-3" data-testid="chatbot-welcome-title">
        Assistant IA Saxium
      </h3>
      <p className="text-muted-foreground mb-2 max-w-md text-base">
        Bonjour {userName} ! Je suis votre assistant IA intelligent.
      </p>
      <p className="text-sm text-muted-foreground max-w-md">
        Posez-moi des questions sur vos projets, offres, ou demandez-moi d'effectuer des actions.
      </p>
      
      {!isHealthy && (
        <div className="mt-6 flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          Service partiellement indisponible
        </div>
      )}
    </div>
  );

  const renderSuggestions = () => {
    const displaySuggestions = (suggestions && Array.isArray(suggestions) && suggestions.length > 0) 
                               ? suggestions 
                               : (roleSuggestions || []);
    
    if (suggestionsLoading) {
      return (
        <div className="space-y-3" data-testid="suggestions-loading">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3" data-testid="chatbot-suggestions">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="w-6 h-6 text-primary" />
          <span className="text-lg font-medium text-foreground">
            Suggestions pour {userRole === 'admin' ? 'Administrateur' : userRole === 'chef_projet' ? 'Chef de projet' : 'Technicien BE'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displaySuggestions.slice(0, 6).map((suggestion, index) => (
            <SuggestionChip
              key={index}
              text={typeof suggestion === 'string' ? suggestion : suggestion.text}
              onClick={handleSuggestionClick}
              large
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Header 
        title="Assistant IA"
        breadcrumbs={[
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Assistant IA", href: "/chatbot" }
        ]}
      />
      
      <div className="h-[calc(100vh-80px)] flex flex-col bg-background">
        <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
          {/* Status bar */}
          <div className="px-6 py-3 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {isHealthy ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" data-testid="chatbot-status-healthy" />
                      <span className="text-sm font-medium">Service opérationnel</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-orange-600" data-testid="chatbot-status-warning" />
                      <span className="text-sm font-medium text-orange-600">Service dégradé</span>
                    </>
                  )}
                </div>
                {messages.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {messages.length} messages
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {conversationHistory && conversationHistory.length > 0 && (
                  <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-show-history">
                        <History className="w-4 h-4 mr-2" />
                        Historique ({conversationHistory.length})
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-96">
                      <SheetHeader>
                        <SheetTitle>Historique des conversations</SheetTitle>
                      </SheetHeader>
                      <ScrollArea className="h-[calc(100vh-100px)] mt-4">
                        <div className="space-y-3">
                          {conversationHistory.map((item, index) => (
                            <Card key={item.id} className="p-3">
                              <div className="text-sm font-medium mb-1">{item.query}</div>
                              <div className="text-xs text-muted-foreground">{item.response.substring(0, 100)}...</div>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant={item.success ? "default" : "destructive"} className="text-xs">
                                  {item.success ? "Succès" : "Échec"}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </SheetContent>
                  </Sheet>
                )}
                
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearChat}
                    data-testid="button-clear-chat"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Vider
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-hidden">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col">
                {renderEmptyState()}
                <div className="p-6 border-t">
                  {renderSuggestions()}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <ScrollArea
                  ref={scrollAreaRef}
                  className="flex-1 px-6 py-6"
                  data-testid="chatbot-messages-area"
                >
                  <div className="space-y-0">
                    {messages.map(message => {
                      const messageAction = pendingAction && pendingAction.messageId === message.id 
                        ? pendingAction 
                        : null;
                      
                      if (messageAction) {
                        return (
                          <ActionMessage
                            key={message.id}
                            message={message}
                            actionProposal={messageAction.proposal}
                            actionDetails={messageAction.details}
                            onActionConfirm={handleDirectActionConfirm}
                            onFeedback={handleFeedback}
                          />
                        );
                      }
                      
                      return (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          onFeedback={handleFeedback}
                        />
                      );
                    })}
                    <TypingIndicator isVisible={isLoading} />
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {actionHistory.length > 0 && (
                  <div className="px-6 py-4 border-t bg-muted/30">
                    <div className="text-base font-medium mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Actions récentes ({actionHistory.length})
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {actionHistory.slice(0, 4).map((action, index) => (
                        <Card 
                          key={action.id} 
                          className="p-3"
                          data-testid={`action-history-item-${index}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {action.status === 'executed' ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : action.status === 'failed' ? (
                                <X className="w-4 h-4 text-red-600" />
                              ) : (
                                <Square className="w-4 h-4 text-orange-600" />
                              )}
                              <span className="text-sm font-medium">{action.operation}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(action.executedAt, 'HH:mm', { locale: fr })}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            sur {action.entity}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {messages.length < 4 && (
                  <div className="px-6 py-4 border-t bg-muted/30">
                    {renderSuggestions()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="px-6 py-4 border-t bg-background" data-testid="chatbot-input-area">
            <div className="flex space-x-3">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Posez votre question à l'assistant IA..."
                disabled={isLoading || !isHealthy}
                className="flex-1 h-12 text-base"
                maxLength={500}
                data-testid="input-chatbot-query"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || !isHealthy}
                size="lg"
                className="px-6"
                data-testid="button-send-message"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                {isLoading && (
                  <span className="flex items-center gap-2" data-testid="chatbot-loading-indicator">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Traitement en cours...
                  </span>
                )}
                {!isHealthy && (
                  <span className="text-orange-600" data-testid="chatbot-service-warning">
                    Service dégradé
                  </span>
                )}
              </div>
              <div>
                {inputValue.length}/500
              </div>
            </div>
          </div>
        </div>
        
        {showActionDialog && pendingAction && (
          <ActionConfirmationDialog
            action={pendingAction.proposal}
            actionDetails={pendingAction.details}
            isOpen={showActionDialog}
            onConfirm={() => handleActionConfirm(pendingAction.proposal.action_id)}
            onCancel={handleActionCancel}
            isExecuting={isExecutingAction}
          />
        )}
      </div>
    </>
  );
}
