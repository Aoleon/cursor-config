import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonList, SkeletonDetail } from "@/components/ui/skeleton-list";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton-list' | 'skeleton-detail';
  message?: string;
  count?: number;
  showSidebar?: boolean;
  showTabs?: boolean;
}

export function LoadingState({ 
  type = 'spinner',
  message,
  count = 5,
  showSidebar = false,
  showTabs = false
}: LoadingStateProps) {
  if (type === 'skeleton-list') {
    return <SkeletonList count={count} showHeader={false} />;
  }

  if (type === 'skeleton-detail') {
    return <SkeletonDetail showSidebar={showSidebar} showTabs={showTabs} />;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      {message && <p className="text-on-surface-muted">{message}</p>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ 
  title = "Erreur",
  message = "Une erreur s'est produite",
  onRetry,
  retryLabel = "Réessayer"
}: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{title}</p>
            {message && <p className="text-sm mt-1">{message}</p>}
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ 
  title = "Aucun élément",
  description,
  icon,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <p className="text-lg font-medium text-on-surface mb-1">{title}</p>
      {description && (
        <p className="text-sm text-on-surface-muted mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="default">
          {action.label}
        </Button>
      )}
    </div>
  );
}

