import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  MessageCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  X,
  Wrench,
  Lightbulb,
  Clock,
  Bot,
  User,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  RotateCcw,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useChatbotQuery,
  useChatbotSuggestions,
  useChatbotHistory,
  useChatbotFeedback,
  useChatbotHealth,
  useChatbotState,
  type Message,
  type UserRole,
  ROLE_SUGGESTIONS
} from "@/hooks/useChatbot";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ========================================
// INTERFACES ET TYPES
// ========================================

interface ChatbotSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

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
}

// ========================================
// COMPOSANTS UTILITAIRES
// ========================================

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center space-x-2 p-3" data-testid="typing-indicator">
      <Avatar className="w-6 h-6">
        <AvatarFallback className="bg-primary/20 text-primary">
          <Bot className="w-3 h-3" />
        </AvatarFallback>
      </Avatar>
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
      </div>
    </div>
  );
};

const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, onClick }) => (
  <Button
    variant="outline"
    size="sm"
    onClick={() => onClick(text)}
    className="flex items-center justify-start text-left whitespace-normal h-auto p-2 hover:bg-primary/10 hover:border-primary/50 transition-colors"
    data-testid={`suggestion-chip-${text.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
  >
    <Sparkles className="w-3 h-3 mr-2 flex-shrink-0 text-primary/60" />
    <span className="text-xs">{text}</span>
  </Button>
);

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
        "flex gap-2 mb-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`message-${message.role}-${message.id}`}
    >
      <Avatar className="w-6 h-6 flex-shrink-0">
        <AvatarFallback className={cn(
          "text-xs",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-primary/20 text-primary"
        )}>
          {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn("flex flex-col max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm break-words",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground border"
          )}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
          
          {/* Métadonnées pour les réponses assistant */}
          {isAssistant && message.queryData && (
            <div className="mt-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs opacity-70">
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
                <div className="mt-1 text-xs opacity-80 font-medium">
                  💡 {message.queryData.explanation}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center mt-1 gap-1">
          <span className="text-xs text-muted-foreground">
            {format(message.timestamp, 'HH:mm', { locale: fr })}
          </span>
          
          {/* Boutons de feedback pour les réponses assistant */}
          {isAssistant && message.conversationId && (
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFeedback("positive")}
                className={cn(
                  "h-5 w-5 p-0",
                  feedbackGiven === "positive" && "text-green-600"
                )}
                disabled={!!feedbackGiven}
                data-testid={`feedback-positive-${message.id}`}
              >
                <ThumbsUp className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFeedback("negative")}
                className={cn(
                  "h-5 w-5 p-0",
                  feedbackGiven === "negative" && "text-red-600"
                )}
                disabled={!!feedbackGiven}
                data-testid={`feedback-negative-${message.id}`}
              >
                <ThumbsDown className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========================================
// COMPOSANT PRINCIPAL CHATBOT SIDEBAR
// ========================================

export default function ChatbotSidebar({ isOpen, onToggle }: ChatbotSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Hooks personnalisés
  const { userRole, roleSuggestions, userName, userId } = useChatbotState();
  const chatbotQuery = useChatbotQuery();
  const chatbotFeedback = useChatbotFeedback();
  const { data: suggestions, isLoading: suggestionsLoading } = useChatbotSuggestions(userRole);
  const { data: history, isLoading: historyLoading } = useChatbotHistory();
  const { data: healthStatus } = useChatbotHealth();
  
  // État local
  const isHealthy = healthStatus?.success ?? true;
  const isLoading = chatbotQuery.isPending;

  // ========================================
  // FONCTIONS UTILITAIRES
  // ========================================

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  // Auto-scroll quand nouveaux messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input quand sidebar s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Charger historique au premier rendu
  useEffect(() => {
    if (isOpen && history && history.length > 0 && messages.length === 0) {
      const historyMessages: Message[] = history
        .slice(-10) // Dernier 10 messages
        .map(item => [
          {
            id: `${item.id}-query`,
            role: 'user' as const,
            content: item.query,
            timestamp: new Date(item.timestamp),
            conversationId: item.id
          },
          {
            id: `${item.id}-response`,
            role: 'assistant' as const,
            content: item.response,
            timestamp: new Date(new Date(item.timestamp).getTime() + 1000),
            conversationId: item.id,
            queryData: item.confidence ? { confidence: item.confidence } : undefined
          }
        ])
        .flat()
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      setMessages(historyMessages);
    }
  }, [history, isOpen, messages.length]);

  // ========================================
  // HANDLERS D'ÉVÉNEMENTS
  // ========================================

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    // Ajout message utilisateur immédiatement (optimistic update)
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    try {
      // Appel API chatbot
      const response = await chatbotQuery.mutateAsync({
        query: userMessage.content,
        sessionId,
        options: {
          includeDebugInfo: false,
          maxResults: 50,
          timeoutMs: 15000
        }
      });

      // Création message réponse assistant
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.explanation || response.error?.message || "Désolé, je n'ai pas pu traiter votre requête.",
        timestamp: new Date(),
        conversationId: response.conversation_id,
        queryData: response.success ? {
          sql: response.sql,
          results: response.results,
          confidence: response.confidence,
          explanation: response.explanation,
          executionTime: response.execution_time_ms,
          modelUsed: response.model_used
        } : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      // Message d'erreur
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "Désolé, une erreur s'est produite lors du traitement de votre requête. Veuillez réessayer.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setInputValue(suggestionText);
    inputRef.current?.focus();
  };

  const handleFeedback = (conversationId: string, rating: "positive" | "negative") => {
    chatbotFeedback.mutate({
      conversationId,
      rating,
      comment: "",
      category: "general"
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  // ========================================
  // RENDU CONDITIONNEL - ÉTATS VIDES/LOADING
  // ========================================

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center" data-testid="chatbot-empty-state">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Assistant IA Saxium
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Posez-moi des questions sur vos projets, planning, équipes, ou toute autre donnée métier.
      </p>
      
      {!isHealthy && (
        <div className="flex items-center gap-2 text-orange-600 text-xs mb-4 p-2 bg-orange-50 rounded">
          <AlertCircle className="w-4 h-4" />
          Service partiellement indisponible
        </div>
      )}
    </div>
  );

  const renderSuggestions = () => {
    const displaySuggestions = suggestions || roleSuggestions;
    
    if (suggestionsLoading) {
      return (
        <div className="space-y-2" data-testid="suggestions-loading">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2" data-testid="chatbot-suggestions">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Suggestions pour {userRole === 'admin' ? 'Administrateur' : userRole === 'chef_projet' ? 'Chef de projet' : 'Technicien BE'}
          </span>
        </div>
        {displaySuggestions.slice(0, 5).map((suggestion, index) => (
          <SuggestionChip
            key={index}
            text={typeof suggestion === 'string' ? suggestion : suggestion.text}
            onClick={handleSuggestionClick}
          />
        ))}
      </div>
    );
  };

  // ========================================
  // RENDU PRINCIPAL
  // ========================================

  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent
        side="right"
        className="w-96 p-0 flex flex-col h-full"
        data-testid="chatbot-sidebar"
        aria-label="Assistant IA Saxium"
        role="dialog"
      >
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-surface/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Wrench className="text-primary-foreground text-sm" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold" data-testid="chatbot-title">
                  Assistant IA Saxium
                </SheetTitle>
                <p className="text-xs text-muted-foreground" data-testid="chatbot-subtitle">
                  {userName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isHealthy ? (
                <CheckCircle className="w-4 h-4 text-green-600" data-testid="chatbot-status-healthy" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-600" data-testid="chatbot-status-warning" />
              )}
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChat}
                  className="h-6 w-6 p-0"
                  data-testid="button-clear-chat"
                  title="Vider la conversation"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col min-h-0">
          {messages.length === 0 ? (
            <>
              {renderEmptyState()}
              <div className="p-4 border-t">
                {renderSuggestions()}
              </div>
            </>
          ) : (
            <>
              {/* Zone de chat */}
              <ScrollArea
                ref={scrollAreaRef}
                className="flex-1 p-4"
                data-testid="chatbot-messages-area"
              >
                <div className="space-y-0">
                  {messages.map(message => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      onFeedback={handleFeedback}
                    />
                  ))}
                  <TypingIndicator isVisible={isLoading} />
                </div>
              </ScrollArea>

              {/* Suggestions contextuelles si peu de messages */}
              {messages.length < 4 && (
                <div className="p-4 pt-0 border-t bg-muted/30">
                  {renderSuggestions()}
                </div>
              )}
            </>
          )}
        </div>

        {/* Zone de saisie */}
        <div className="p-4 border-t bg-background" data-testid="chatbot-input-area">
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez votre question..."
              disabled={isLoading || !isHealthy}
              className="flex-1"
              maxLength={500}
              data-testid="input-chatbot-query"
              aria-label="Tapez votre question pour l'assistant IA"
              aria-describedby="chatbot-input-help"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || !isHealthy}
              size="sm"
              className="px-3"
              data-testid="button-send-message"
              aria-label="Envoyer la question"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Indicateurs état */}
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="flex items-center gap-1" data-testid="chatbot-loading-indicator">
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
      </SheetContent>
    </Sheet>
  );
}