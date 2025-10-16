import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import ChatbotSidebar from "@/components/ChatbotSidebar";
import ChatbotToggle from "@/components/ChatbotToggle";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  showChatbot?: boolean;
}

export default function AppLayout({ children, showSidebar = true, showChatbot = true }: AppLayoutProps) {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  
  // Initialize realtime notifications globally to show toasts
  useRealtimeNotifications({ enableToasts: true, enableCacheInvalidation: true });

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  return (
    <div className="min-h-screen flex bg-surface-muted relative">
      {showSidebar && <Sidebar />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      
      {/* Chatbot Integration */}
      {showChatbot && (
        <>
          <ChatbotToggle
            isOpen={isChatbotOpen}
            onClick={toggleChatbot}
            variant="floating"
          />
          <ChatbotSidebar
            isOpen={isChatbotOpen}
            onToggle={toggleChatbot}
          />
        </>
      )}
    </div>
  );
}