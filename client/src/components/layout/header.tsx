import { Button } from "@/components/ui/button";
import { WebSocketStatus } from "@/components/ui/websocket-status";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "@/components/ui/breadcrumb";
import { Download, Plus, FileText, Settings } from "lucide-react";

interface HeaderProps {
  title: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  actions?: Array<{
    label: string;
    variant?: "default" | "outline" | "secondary";
    icon?: string;
    action?: string;
    onClick?: () => void;
  }>;
}

export default function Header({ title, breadcrumbs = [], actions = [] }: HeaderProps) {
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case "download": return <Download className="w-4 h-4" />;
      case "plus": return <Plus className="w-4 h-4" />;
      case "file": return <FileText className="w-4 h-4" />;
      case "settings": return <Settings className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleActionClick = (action?: string, onClick?: () => void) => {
    if (onClick) {
      onClick();
    } else if (action) {
      console.log(`Action: ${action}`);
      // Handle predefined actions here
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface" data-testid="header-title">{title}</h1>
          {breadcrumbs.length > 0 && (
            <Breadcrumb className="mt-1" data-testid="header-breadcrumbs">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href} data-testid={`breadcrumb-link-${crumb.label?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>
                          {crumb.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage data-testid={`breadcrumb-page-${crumb.label?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`}>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <WebSocketStatus variant="badge" showLabel={false} data-testid="header-websocket-status" />
          
          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" data-testid="header-actions">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={() => handleActionClick(action.action, action.onClick)}
                  className="flex items-center gap-2"
                  data-testid={`button-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {getIcon(action.icon)}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}