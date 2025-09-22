import { ReactNode } from "react";
import Sidebar from "./sidebar";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export default function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex bg-surface-muted">
      {showSidebar && <Sidebar />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}