interface PageLoaderProps {
  message?: string;
}

export default function PageLoader({ message = "Chargement..." }: PageLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-muted"></div>
          <div className="absolute top-0 left-0 h-20 w-20 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse" data-testid="loader-message">
          {message}
        </p>
      </div>
    </div>
  );
}
