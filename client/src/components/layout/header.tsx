import { Button } from "@/components/ui/button";
import { ChevronRight, Download, Plus } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface Action {
  label: string;
  variant: "default" | "outline";
  icon: "download" | "plus" | "calendar";
  action?: string;
}

interface HeaderProps {
  title: string;
  breadcrumbs: Breadcrumb[];
  actions?: Action[];
}

export default function Header({ title, breadcrumbs, actions }: HeaderProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "download":
        return <Download className="w-4 h-4 mr-2" />;
      case "plus":
        return <Plus className="w-4 h-4 mr-2" />;
      default:
        return null;
    }
  };

  const handleAction = (action?: string) => {
    if (action === "create-offer") {
      // This will be handled by the parent component
      const event = new CustomEvent("create-offer");
      window.dispatchEvent(event);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                {breadcrumbs.map((breadcrumb, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <ChevronRight className="text-gray-400 text-xs mx-2" />
                    )}
                    {breadcrumb.href ? (
                      <a
                        href={breadcrumb.href}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        {breadcrumb.label}
                      </a>
                    ) : (
                      <span className="text-gray-900 text-sm font-medium">
                        {breadcrumb.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">{title}</h2>
          </div>

          {actions && actions.length > 0 && (
            <div className="flex items-center space-x-3">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant}
                  onClick={() => handleAction(action.action)}
                  className={
                    action.variant === "outline"
                      ? "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      : ""
                  }
                >
                  {getIcon(action.icon)}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
