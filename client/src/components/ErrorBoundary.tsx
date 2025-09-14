import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || undefined,
    });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4" data-testid="error-boundary-fallback">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" data-testid="error-icon" />
              </div>
              <CardTitle className="text-xl" data-testid="error-title">
                Une erreur s'est produite
              </CardTitle>
              <CardDescription data-testid="error-description">
                L'application a rencontré un problème inattendu. Veuillez réessayer ou contacter le support technique.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4" data-testid="error-details">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Détails techniques (dev uniquement)
                  </summary>
                  <div className="mt-2 rounded-md bg-gray-100 p-3 text-xs font-mono text-gray-800 overflow-auto max-h-40">
                    <div className="font-semibold">Error:</div>
                    <div>{this.state.error.message}</div>
                    {this.state.errorInfo && (
                      <>
                        <div className="mt-2 font-semibold">Stack:</div>
                        <div className="whitespace-pre-wrap">{this.state.errorInfo}</div>
                      </>
                    )}
                  </div>
                </details>
              )}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button 
                  onClick={this.handleRefresh} 
                  className="flex items-center gap-2"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualiser la page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                  data-testid="button-home"
                >
                  <Home className="h-4 w-4" />
                  Retour à l'accueil
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;