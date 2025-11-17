import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormStep {
  id: string;
  label: string;
  description?: string;
  component: ReactNode;
  isOptional?: boolean;
  isComplete?: boolean;
}

interface FormWizardProps {
  steps: FormStep[];
  onComplete?: () => void;
  onStepChange?: (stepIndex: number) => void;
  className?: string;
  showProgress?: boolean;
  allowSkipOptional?: boolean;
}

export function FormWizard({
  steps,
  onComplete,
  onStepChange,
  className,
  showProgress = true,
  allowSkipOptional = true
}: FormWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const progress = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < steps.length) {
      setCurrentStep(stepIndex);
      onStepChange?.(stepIndex);
    }
  };

  const goToNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      goToStep(currentStep + 1);
    } else {
      // Dernière étape
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      onComplete?.();
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const canSkip = currentStepData?.isOptional && allowSkipOptional;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-muted">
              Étape {currentStep + 1} sur {steps.length}
            </span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Steps Indicator */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <button
              type="button"
              onClick={() => goToStep(index)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                index === currentStep
                  ? "bg-primary text-on-primary"
                  : index < currentStep || completedSteps.has(index)
                  ? "bg-success/10 text-success"
                  : "bg-surface-muted text-on-surface-muted hover:bg-surface"
              )}
            >
              {completedSteps.has(index) || index < currentStep ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-xs">
                  {index + 1}
                </span>
              )}
              <span className="text-sm font-medium hidden sm:inline">{step.label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={cn(
                "h-0.5 flex-1 mx-2",
                index < currentStep ? "bg-success" : "bg-surface-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStepData.label}
            {currentStepData.isOptional && (
              <span className="text-xs font-normal text-on-surface-muted">(Optionnel)</span>
            )}
          </CardTitle>
          {currentStepData.description && (
            <p className="text-sm text-on-surface-muted mt-1">
              {currentStepData.description}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {currentStepData.component}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goToPrevious}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>

        <div className="flex items-center gap-2">
          {canSkip && (
            <Button
              type="button"
              variant="ghost"
              onClick={goToNext}
            >
              Passer
            </Button>
          )}
          <Button
            type="button"
            onClick={goToNext}
          >
            {currentStep === steps.length - 1 ? "Terminer" : "Suivant"}
            {currentStep < steps.length - 1 && (
              <ChevronRight className="h-4 w-4 ml-2" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

