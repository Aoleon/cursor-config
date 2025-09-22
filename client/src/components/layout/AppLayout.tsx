import { ReactNode, useState } from "react";
import Sidebar from "./sidebar";
import ChatbotSidebar from "@/components/ChatbotSidebar";
import ChatbotToggle from "@/components/ChatbotToggle";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  showChatbot?: boolean;
}

export default function AppLayout({ children, showSidebar = true, showChatbot = true }: AppLayoutProps) {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

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