/**
 * Composant pour charger et appliquer un template de formulaire
 * 
 * Utilise les hooks useFormTemplate pour charger automatiquement
 * et appliquer les templates aux formulaires React Hook Form
 */

import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useOfferTemplateFromAo, useProjectTemplateFromOffer, useContactTemplate, FormTemplate } from "@/hooks/useFormTemplate";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface FormTemplateLoaderProps {
  sourceType: 'ao' | 'offer' | 'contact';
  sourceId: string | null | undefined;
  form: UseFormReturn<any>;
  contactType?: 'maitreOuvrage' | 'maitreOeuvre';
  onTemplateLoaded?: (template: FormTemplate) => void;
  showStatus?: boolean;
  mergeStrategy?: 'overwrite' | 'preserve' | 'smart';
}

/**
 * Composant pour charger et appliquer un template AO → Offre
 */
export function OfferTemplateLoader({ 
  aoId, 
  form, 
  onTemplateLoaded,
  showStatus = false,
  mergeStrategy = 'smart'
}: {
  aoId: string | null | undefined;
  form: UseFormReturn<any>;
  onTemplateLoaded?: (template: FormTemplate) => void;
  showStatus?: boolean;
  mergeStrategy?: 'overwrite' | 'preserve' | 'smart';
}) {
  const { data: template, isLoading, error } = useOfferTemplateFromAo(aoId, {
    onSuccess: onTemplateLoaded
  });

  useEffect(() => {
    if (template && 'fields' in template && template.fields) {
      const currentValues = form.getValues();
      const templateFields = template.fields;

      let mergedData: Record<string, unknown> = { ...currentValues };

      if (mergeStrategy === 'overwrite') {
        // Écraser toutes les valeurs avec le template
        mergedData = { ...currentValues, ...templateFields };
      } else if (mergeStrategy === 'preserve') {
        // Ne pas écraser les valeurs existantes
        Object.entries(templateFields).forEach(([key, value]) => {
          if (!currentValues[key] || currentValues[key] === '') {
            mergedData[key] = value;
          }
        });
      } else {
        // Smart merge : préserver les valeurs non-vides, utiliser le template pour les vides
        Object.entries(templateFields).forEach(([key, value]) => {
          const currentValue = currentValues[key];
          if (value !== null && value !== undefined && value !== '') {
            if (!currentValue || currentValue === '') {
              mergedData[key] = value;
            }
          }
        });
      }

      form.reset(mergedData);
    }
  }, [template, form, mergeStrategy]);

  if (!showStatus) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Chargement du template...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Erreur de chargement du template</span>
      </div>
    );
  }

  if (template) {
    const confidence = Math.round((('metadata' in template && template.metadata?.confidence) || 0) * 100);
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>Template chargé</span>
        <Badge variant="outline" className="text-xs">
          {confidence}% confiance
        </Badge>
      </div>
    );
  }

  return null;
}

/**
 * Composant pour charger et appliquer un template Offre → Projet
 */
export function ProjectTemplateLoader({ 
  offerId, 
  form, 
  onTemplateLoaded,
  showStatus = false,
  mergeStrategy = 'smart'
}: {
  offerId: string | null | undefined;
  form: UseFormReturn<any>;
  onTemplateLoaded?: (template: FormTemplate) => void;
  showStatus?: boolean;
  mergeStrategy?: 'overwrite' | 'preserve' | 'smart';
}) {
  const { data: template, isLoading, error } = useProjectTemplateFromOffer(offerId, {
    onSuccess: onTemplateLoaded
  });

  useEffect(() => {
    if (template && 'fields' in template && template.fields) {
      const currentValues = form.getValues();
      const templateFields = template.fields;

      let mergedData: Record<string, unknown> = { ...currentValues };

      if (mergeStrategy === 'overwrite') {
        mergedData = { ...currentValues, ...templateFields };
      } else if (mergeStrategy === 'preserve') {
        Object.entries(templateFields).forEach(([key, value]) => {
          if (!currentValues[key] || currentValues[key] === '') {
            mergedData[key] = value;
          }
        });
      } else {
        Object.entries(templateFields).forEach(([key, value]) => {
          const currentValue = currentValues[key];
          if (value !== null && value !== undefined && value !== '') {
            if (!currentValue || currentValue === '') {
              mergedData[key] = value;
            }
          }
        });
      }

      form.reset(mergedData);
    }
  }, [template, form, mergeStrategy]);

  if (!showStatus) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Chargement du template...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Erreur de chargement du template</span>
      </div>
    );
  }

  if (template) {
    const confidence = Math.round((('metadata' in template && template.metadata?.confidence) || 0) * 100);
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>Template chargé</span>
        <Badge variant="outline" className="text-xs">
          {confidence}% confiance
        </Badge>
      </div>
    );
  }

  return null;
}

/**
 * Composant générique pour charger un template
 */
export function FormTemplateLoader({
  sourceType,
  sourceId,
  form,
  contactType = 'maitreOuvrage',
  onTemplateLoaded,
  showStatus = false,
  mergeStrategy = 'smart'
}: FormTemplateLoaderProps) {
  const aoTemplate = useOfferTemplateFromAo(
    sourceType === 'ao' ? sourceId : null,
    { onSuccess: onTemplateLoaded, enabled: sourceType === 'ao' }
  );
  const offerTemplate = useProjectTemplateFromOffer(
    sourceType === 'offer' ? sourceId : null,
    { onSuccess: onTemplateLoaded, enabled: sourceType === 'offer' }
  );
  const contactTemplate = useContactTemplate(
    sourceType === 'contact' ? sourceId : null,
    contactType,
    { onSuccess: onTemplateLoaded, enabled: sourceType === 'contact' }
  );

  const template = sourceType === 'ao' ? aoTemplate.data : 
                   sourceType === 'offer' ? offerTemplate.data : 
                   contactTemplate.data;
  const isLoading = sourceType === 'ao' ? aoTemplate.isLoading : 
                    sourceType === 'offer' ? offerTemplate.isLoading : 
                    contactTemplate.isLoading;
  const error = sourceType === 'ao' ? aoTemplate.error : 
                sourceType === 'offer' ? offerTemplate.error : 
                contactTemplate.error;

  useEffect(() => {
    if (template && 'fields' in template && template.fields) {
      const currentValues = form.getValues();
      const templateFields = template.fields;

      let mergedData: Record<string, unknown> = { ...currentValues };

      if (mergeStrategy === 'overwrite') {
        mergedData = { ...currentValues, ...templateFields };
      } else if (mergeStrategy === 'preserve') {
        Object.entries(templateFields).forEach(([key, value]) => {
          if (!currentValues[key] || currentValues[key] === '') {
            mergedData[key] = value;
          }
        });
      } else {
        Object.entries(templateFields).forEach(([key, value]) => {
          const currentValue = currentValues[key];
          if (value !== null && value !== undefined && value !== '') {
            if (!currentValue || currentValue === '') {
              mergedData[key] = value;
            }
          }
        });
      }

      form.reset(mergedData);
    }
  }, [template, form, mergeStrategy]);

  if (!showStatus) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Chargement du template...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Erreur de chargement du template</span>
      </div>
    );
  }

  if (template) {
    const confidence = Math.round((('metadata' in template && template.metadata?.confidence) || 0) * 100);
    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>Template chargé</span>
        <Badge variant="outline" className="text-xs">
          {confidence}% confiance
        </Badge>
      </div>
    );
  }

  return null;
}

