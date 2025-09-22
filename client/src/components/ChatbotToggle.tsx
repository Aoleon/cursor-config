import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle, Bot, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatbotHealth, useChatbotState } from "@/hooks/useChatbot";

// ========================================
// INTERFACES
// ========================================

interface ChatbotToggleProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
  variant?: "floating" | "inline";
  showBadge?: boolean;
}

// ========================================
// COMPOSANT BOUTON DÉCLENCHEUR CHATBOT
// ========================================

export default function ChatbotToggle({
  isOpen,
  onClick,
  className,
  variant = "floating",
  showBadge = true
}: ChatbotToggleProps) {
  
  const { data: healthStatus } = useChatbotHealth();
  const { userRole, userName } = useChatbotState();
  
  const isHealthy = healthStatus?.success ?? true;
  const hasAlert = !isHealthy;

  // ========================================
  // STYLE VARIANTS
  // ========================================
  
  const baseStyles = "relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2";
  
  const variants = {
    floating: cn(
      baseStyles,
      "fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl",
      isOpen ? "bg-primary/90 text-primary-foreground hover:bg-primary" : "bg-primary text-primary-foreground hover:bg-primary/90"
    ),
    inline: cn(
      baseStyles,
      "h-9 px-3 rounded-md",
      isOpen ? "bg-secondary text-secondary-foreground" : "bg-transparent hover:bg-secondary/50"
    )
  };

  const iconSize = variant === "floating" ? "w-6 h-6" : "w-4 h-4";

  // ========================================
  // CONTENU TOOLTIP
  // ========================================

  const tooltipContent = (
    <div className="text-center">
      <div className="font-medium">Assistant IA Saxium</div>
      <div className="text-xs opacity-80 mt-1">
        {userName} ({userRole === 'admin' ? 'Administrateur' : userRole === 'chef_projet' ? 'Chef de projet' : 'Technicien BE'})
      </div>
      {hasAlert && (
        <div className="text-xs text-orange-400 mt-1 flex items-center justify-center gap-1">
          <AlertCircle className="w-3 h-3" />
          Service dégradé
        </div>
      )}
      <div className="text-xs opacity-70 mt-1">
        {isOpen ? 'Fermer' : 'Ouvrir'} l'assistant
      </div>
    </div>
  );

  // ========================================
  // RENDU BOUTON FLOATING
  // ========================================

  if (variant === "floating") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className={cn(variants.floating, className)}
            data-testid="chatbot-toggle-floating"
            aria-label="Ouvrir/fermer l'assistant IA"
          >
            <Bot className={cn(iconSize, isOpen && "scale-110")} />
            
            {/* Badge d'alerte */}
            {hasAlert && showBadge && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-background animate-pulse" />
            )}

            {/* Animation pulse quand fermé */}
            {!isOpen && (
              <div className="absolute inset-0 rounded-full bg-primary animate-pulse opacity-30" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    );
  }

  // ========================================
  // RENDU BOUTON INLINE
  // ========================================

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={cn(variants.inline, className)}
          data-testid="chatbot-toggle-inline"
          aria-label="Ouvrir/fermer l'assistant IA"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <MessageCircle className={iconSize} />
              {hasAlert && showBadge && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </div>
            
            <span className="text-sm font-medium">Assistant IA</span>
            
            {showBadge && (
              <Badge 
                variant={isHealthy ? "default" : "destructive"} 
                className="ml-1 px-1 py-0 text-xs h-4"
              >
                {isHealthy ? "●" : "!"}
              </Badge>
            )}
          </div>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}

// ========================================
// COMPOSANT COMPACT POUR SIDEBAR
// ========================================

export function ChatbotSidebarButton({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  const { data: healthStatus } = useChatbotHealth();
  const isHealthy = healthStatus?.success ?? true;

  return (
    <Button
      variant={isOpen ? "secondary" : "ghost"}
      size="sm"
      onClick={onClick}
      className="w-full justify-start gap-2 px-3 py-2"
      data-testid="chatbot-sidebar-button"
    >
      <div className="relative">
        <Bot className="w-4 h-4" />
        {!isHealthy && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
        )}
      </div>
      <span>Assistant IA</span>
      {isOpen && <Badge className="ml-auto">Ouvert</Badge>}
    </Button>
  );
}