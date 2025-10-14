import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MessageCircle,
  Send,
  ThumbsUp,
  ThumbsDown,
  Bot,
  User,
  Sparkles,
  Zap,
  Clock,
  Database,
  TrendingUp,
  Package,
  Calendar,
  Users,
  AlertCircle,
  CheckCircle,
  Code,
  Activity,
  BarChart3,
  Shield,
  Gauge,
  Brain,
  Search,
  Play,
  Bug,
  Eye,
  EyeOff,
  Filter,
  Layers,
  Server,
  FileText,
  ChevronRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useChatbotQuery,
  useChatbotSuggestions,
  useChatbotHistory,
  useChatbotFeedback,
  useChatbotHealth,
  type Message,
  type ChatbotQueryResponse
} from "@/hooks/useChatbot";
import Header from "@/components/layout/header";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ========================================
// INTERFACES ET TYPES
// ========================================

interface PredefinedQuery {
  id: string;
  category: string;
  icon: any;
  color: string;
  queries: {
    id: string;
    text: string;
    description: string;
    complexity: 'simple' | 'medium' | 'complex';
  }[];
}

interface QueryMetrics {
  contextGenerationTime?: number;
  sqlGenerationTime?: number;
  executionTime?: number;
  cacheHit?: boolean;
  queryType?: string;
  complexity?: string;
  modelUsed?: string;
  confidence?: number;
}

interface SQLDetails {
  rawSQL?: string;
  rbacFilters?: string[];
  performanceHints?: string[];
  tablesAccessed?: string[];
  indexSuggestions?: string[];
}

// ========================================
// DONNÉES DE DÉMO
// ========================================

const PREDEFINED_QUERIES: PredefinedQuery[] = [
  {
    id: "financial",
    category: "KPIs Financiers",
    icon: TrendingUp,
    color: "text-green-600",
    queries: [
      {
        id: "f1",
        text: "Quel est le montant total des devis ce mois ?",
        description: "Analyse du chiffre d'affaires mensuel",
        complexity: "simple"
      },
      {
        id: "f2",
        text: "Montre-moi la rentabilité par type de projet",
        description: "Comparaison des marges par catégorie",
        complexity: "medium"
      },
      {
        id: "f3",
        text: "Compare les marges entre chantiers été et hiver",
        description: "Analyse saisonnière de la rentabilité",
        complexity: "complex"
      }
    ]
  },
  {
    id: "projects",
    category: "Gestion Projets",
    icon: Package,
    color: "text-blue-600",
    queries: [
      {
        id: "p1",
        text: "Liste les projets en retard avec leurs responsables",
        description: "Suivi des projets critiques",
        complexity: "medium"
      },
      {
        id: "p2",
        text: "Quels projets nécessitent une validation urgente ?",
        description: "Identification des goulots d'étranglement",
        complexity: "complex"
      },
      {
        id: "p3",
        text: "Affiche la charge de travail de l'équipe BE cette semaine",
        description: "Planification des ressources",
        complexity: "complex"
      }
    ]
  },
  {
    id: "temporal",
    category: "Analyses Temporelles",
    icon: Calendar,
    color: "text-purple-600",
    queries: [
      {
        id: "t1",
        text: "Évolution du CA sur les 6 derniers mois",
        description: "Tendance du chiffre d'affaires",
        complexity: "medium"
      },
      {
        id: "t2",
        text: "Tendance des délais moyens de livraison",
        description: "Analyse de la performance opérationnelle",
        complexity: "complex"
      },
      {
        id: "t3",
        text: "Comparaison activité vs même période année dernière",
        description: "Analyse comparative annuelle",
        complexity: "complex"
      }
    ]
  },
  {
    id: "suppliers",
    category: "Fournisseurs",
    icon: Users,
    color: "text-orange-600",
    queries: [
      {
        id: "s1",
        text: "Meilleurs fournisseurs par rapport qualité/prix",
        description: "Ranking des partenaires",
        complexity: "complex"
      },
      {
        id: "s2",
        text: "Devis en attente de validation fournisseur",
        description: "Suivi des demandes en cours",
        complexity: "simple"
      },
      {
        id: "s3",
        text: "Analyse comparative des prix matériaux PVC",
        description: "Benchmark des coûts matériaux",
        complexity: "medium"
      }
    ]
  }
];

// ========================================
// COMPOSANTS UTILITAIRES
// ========================================

const ComplexityBadge: React.FC<{ complexity: string }> = ({ complexity }) => {
  const variants = {
    simple: { color: "bg-green-100 text-green-800", label: "Simple" },
    medium: { color: "bg-yellow-100 text-yellow-800", label: "Moyen" },
    complex: { color: "bg-red-100 text-red-800", label: "Complexe" }
  };
  
  const variant = variants[complexity as keyof typeof variants] || variants.simple;
  
  return (
    <Badge className={cn("text-xs", variant.color)}>
      {variant.label}
    </Badge>
  );
};

const MetricCard: React.FC<{ 
  icon: any; 
  label: string; 
  value: string | number | boolean | undefined;
  color?: string;
  tooltip?: string;
}> = ({ icon: Icon, label, value, color = "text-gray-600", tooltip }) => {
  const content = (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <Icon className={cn("w-5 h-5", color)} />
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold">
          {value === undefined ? "-" : 
           value === true ? "Oui" : 
           value === false ? "Non" : value}
        </p>
      </div>
    </div>
  );
  
  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return content;
};

const MessageBubble: React.FC<{ 
  message: Message; 
  showDebug?: boolean;
  onFeedback?: (conversationId: string, rating: "positive" | "negative") => void;
}> = ({ message, showDebug = false, onFeedback }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={cn(
      "flex gap-3 py-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <Avatar className="w-10 h-10">
        <AvatarFallback className={cn(
          isUser ? "bg-primary text-white" : "bg-gray-200"
        )}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        "max-w-[70%] space-y-2",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-3",
          isUser 
            ? "bg-primary text-white" 
            : "bg-gray-100 text-gray-800"
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        
        {!isUser && message.queryData && (
          <div className="space-y-2">
            {message.queryData.confidence && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Confiance: {Math.round(message.queryData.confidence * 100)}%
                </Badge>
                {message.queryData.executionTime && (
                  <Badge variant="outline" className="text-xs">
                    {message.queryData.executionTime}ms
                  </Badge>
                )}
              </div>
            )}
            
            {showDebug && message.queryData.sql && (
              <Card className="border-dashed">
                <CardHeader className="py-2">
                  <CardTitle className="text-xs flex items-center gap-2">
                    <Code className="w-3 h-3" />
                    SQL Généré
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded overflow-x-auto">
                    {message.queryData.sql}
                  </pre>
                </CardContent>
              </Card>
            )}
            
            {onFeedback && message.conversationId && (
              <div className="flex gap-2">
                <Button
                  data-testid={`feedback-positive-${message.conversationId}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => onFeedback(message.conversationId!, 'positive')}
                  className="h-6 px-2"
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  <span className="text-xs">Utile</span>
                </Button>
                <Button
                  data-testid={`feedback-negative-${message.conversationId}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => onFeedback(message.conversationId!, 'negative')}
                  className="h-6 px-2"
                >
                  <ThumbsDown className="w-3 h-3 mr-1" />
                  <span className="text-xs">Améliorer</span>
                </Button>
              </div>
            )}
          </div>
        )}
        
        <p className="text-xs text-gray-500">
          {format(message.timestamp, "HH:mm", { locale: fr })}
        </p>
      </div>
    </div>
  );
};

// ========================================
// COMPOSANT PRINCIPAL
// ========================================

export default function ChatbotDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showDebug, setShowDebug] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<QueryMetrics>({});
  const [currentSQLDetails, setCurrentSQLDetails] = useState<SQLDetails>({});
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const chatbotQuery = useChatbotQuery();
  const { data: suggestions } = useChatbotSuggestions(user?.role || 'user');
  const { data: history } = useChatbotHistory();
  const feedbackMutation = useChatbotFeedback();
  const { data: health } = useChatbotHealth();
  
  // Auto-scroll au bas des messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleQuery = async (query: string) => {
    if (!query.trim()) return;
    
    // Ajouter le message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    
    try {
      const response = await chatbotQuery.mutateAsync({
        query,
        options: {
          includeDebugInfo: showDebug,
          maxResults: 10
        }
      });
      
      // Extraire les métriques de la réponse
      const metrics: QueryMetrics = {
        executionTime: response.execution_time_ms,
        cacheHit: response.cache_hit,
        modelUsed: response.model_used,
        confidence: response.confidence,
        queryType: response.debug_info?.queryType,
        complexity: response.debug_info?.complexity,
        contextGenerationTime: response.debug_info?.contextGenerationTime,
        sqlGenerationTime: response.debug_info?.sqlGenerationTime
      };
      
      setCurrentMetrics(metrics);
      
      // Extraire les détails SQL
      const sqlDetails: SQLDetails = {
        rawSQL: response.sql,
        rbacFilters: response.debug_info?.rbacFilters,
        performanceHints: response.debug_info?.performanceHints,
        tablesAccessed: response.debug_info?.tablesAccessed,
        indexSuggestions: response.debug_info?.indexSuggestions
      };
      
      setCurrentSQLDetails(sqlDetails);
      
      // Construire la réponse
      let responseContent = response.explanation || "Voici les résultats de votre requête :";
      
      if (response.results && response.results.length > 0) {
        responseContent += "\n\n" + JSON.stringify(response.results, null, 2);
      }
      
      if (response.error) {
        responseContent = `Erreur : ${response.error.message}`;
      }
      
      // Ajouter le message assistant
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        queryData: {
          sql: response.sql,
          results: response.results,
          confidence: response.confidence,
          explanation: response.explanation,
          executionTime: response.execution_time_ms,
          modelUsed: response.model_used
        },
        conversationId: response.conversation_id
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Afficher les suggestions si disponibles
      if (response.suggestions && response.suggestions.length > 0) {
        toast({
          title: "Suggestions disponibles",
          description: "Des requêtes similaires sont disponibles dans la section Suggestions.",
        });
      }
      
    } catch (error) {
      console.error("Erreur chatbot:", error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Désolé, une erreur s'est produite lors du traitement de votre requête.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Erreur",
        description: "Impossible de traiter votre requête",
        variant: "destructive"
      });
    } finally {
      setIsTyping(false);
    }
  };
  
  const handlePredefinedQuery = (query: string) => {
    handleQuery(query);
  };
  
  const handleFeedback = (conversationId: string, rating: "positive" | "negative") => {
    feedbackMutation.mutate(
      { conversationId, rating },
      {
        onSuccess: () => {
          toast({
            title: "Merci pour votre retour",
            description: "Votre feedback nous aide à améliorer le service.",
          });
        }
      }
    );
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuery(input);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Header 
        title="Démo Chatbot IA Avancé"
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Chatbot Démo" }
        ]}
      />
      
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Barre de contrôle */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Configuration</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="debug-mode" className="text-sm">Mode Debug</Label>
                  <Switch
                    data-testid="debug-mode-toggle"
                    id="debug-mode"
                    checked={showDebug}
                    onCheckedChange={setShowDebug}
                  />
                </div>
                {health && (
                  <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                    {health.status === 'healthy' ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Opérationnel
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Dégradé
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche : Requêtes prédéfinies */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Requêtes Métier Prédéfinies
                </CardTitle>
                <CardDescription>
                  Cliquez sur une requête pour la tester
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="financial" className="w-full">
                  <TabsList className="grid grid-cols-2 gap-2 h-auto p-1">
                    {PREDEFINED_QUERIES.slice(0, 2).map(category => {
                      const Icon = category.icon;
                      return (
                        <TabsTrigger
                          key={category.id}
                          value={category.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Icon className={cn("w-4 h-4", category.color)} />
                          <span className="hidden sm:inline">{category.category}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  <TabsList className="grid grid-cols-2 gap-2 h-auto p-1 mt-2">
                    {PREDEFINED_QUERIES.slice(2, 4).map(category => {
                      const Icon = category.icon;
                      return (
                        <TabsTrigger
                          key={category.id}
                          value={category.id}
                          className="flex items-center gap-2 text-xs"
                        >
                          <Icon className={cn("w-4 h-4", category.color)} />
                          <span className="hidden sm:inline">{category.category}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                  
                  {PREDEFINED_QUERIES.map(category => (
                    <TabsContent
                      key={category.id}
                      value={category.id}
                      className="space-y-2 mt-4"
                    >
                      {category.queries.map((query, index) => (
                        <Button
                          data-testid={`preset-query-${category.id}-${index}`}
                          key={query.id}
                          variant="outline"
                          className="w-full justify-start text-left h-auto p-3 hover:bg-primary/5"
                          onClick={() => handlePredefinedQuery(query.text)}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{query.text}</p>
                              <ComplexityBadge complexity={query.complexity} />
                            </div>
                            <p className="text-xs text-gray-500">{query.description}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 ml-2 text-gray-400" />
                        </Button>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
            
            {/* Métriques de performance */}
            {(currentMetrics.executionTime || showDebug) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Métriques Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricCard
                    icon={Clock}
                    label="Temps total"
                    value={currentMetrics.executionTime ? `${currentMetrics.executionTime}ms` : undefined}
                    color="text-blue-600"
                  />
                  <MetricCard
                    icon={Zap}
                    label="Cache"
                    value={currentMetrics.cacheHit}
                    color={currentMetrics.cacheHit ? "text-green-600" : "text-orange-600"}
                  />
                  <MetricCard
                    icon={Brain}
                    label="Modèle IA"
                    value={currentMetrics.modelUsed}
                    color="text-purple-600"
                  />
                  <MetricCard
                    icon={Gauge}
                    label="Confiance"
                    value={currentMetrics.confidence ? `${Math.round(currentMetrics.confidence * 100)}%` : undefined}
                    color="text-indigo-600"
                  />
                  {showDebug && (
                    <>
                      <MetricCard
                        icon={Filter}
                        label="Type de requête"
                        value={currentMetrics.queryType}
                        color="text-gray-600"
                      />
                      <MetricCard
                        icon={Layers}
                        label="Complexité"
                        value={currentMetrics.complexity}
                        color="text-gray-600"
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Colonne centrale : Chat */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  Conversation
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                      <Bot className="w-12 h-12 mb-4" />
                      <p className="text-lg font-medium mb-2">Assistant IA prêt</p>
                      <p className="text-sm">Posez une question ou sélectionnez une requête prédéfinie</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      {messages.map(message => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          showDebug={showDebug}
                          onFeedback={handleFeedback}
                        />
                      ))}
                      {isTyping && (
                        <div className="flex gap-3 py-4">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gray-200">
                              <Bot className="w-5 h-5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-2">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-sm text-gray-500">L'assistant réfléchit...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
                
                <Separator />
                
                <div className="p-4 space-y-3">
                  {/* Suggestions basées sur le contexte */}
                  {suggestions && suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {suggestions.slice(0, 3).map((suggestion, idx) => (
                        <Button
                          data-testid={`suggestion-${idx}`}
                          key={idx}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuery(suggestion.text)}
                          className="text-xs"
                        >
                          <Search className="w-3 h-3 mr-1" />
                          {suggestion.text}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      data-testid="chatbot-input"
                      placeholder="Posez votre question..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={chatbotQuery.isPending}
                      className="flex-1"
                    />
                    <Button
                      data-testid="chatbot-send"
                      onClick={() => handleQuery(input)}
                      disabled={!input.trim() || chatbotQuery.isPending}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Section SQL et optimisations (visible en mode debug) */}
        {showDebug && currentSQLDetails.rawSQL && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                Contexte SQL Généré
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2">SQL Brut</Label>
                <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                  {currentSQLDetails.rawSQL}
                </pre>
              </div>
              
              {currentSQLDetails.rbacFilters && currentSQLDetails.rbacFilters.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Filtres RBAC Appliqués
                  </Label>
                  <div className="space-y-1">
                    {currentSQLDetails.rbacFilters.map((filter, idx) => (
                      <Badge key={idx} variant="outline" className="mr-2">
                        {filter}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {currentSQLDetails.tablesAccessed && currentSQLDetails.tablesAccessed.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Tables Accédées
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {currentSQLDetails.tablesAccessed.map((table, idx) => (
                      <Badge key={idx} variant="secondary">
                        {table}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {currentSQLDetails.performanceHints && currentSQLDetails.performanceHints.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Hints de Performance
                  </Label>
                  <ul className="space-y-1">
                    {currentSQLDetails.performanceHints.map((hint, idx) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-0.5 text-primary" />
                        {hint}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {currentSQLDetails.indexSuggestions && currentSQLDetails.indexSuggestions.length > 0 && (
                <div>
                  <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Index Suggérés
                  </Label>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div className="space-y-1">
                        {currentSQLDetails.indexSuggestions.map((suggestion, idx) => (
                          <p key={idx} className="text-xs text-yellow-800">
                            {suggestion}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}