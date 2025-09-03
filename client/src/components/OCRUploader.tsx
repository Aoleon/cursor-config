import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  Plus,
  Brain,
  Zap,
  Clock
} from "lucide-react";

interface OCRResult {
  success: boolean;
  filename: string;
  extractedText: string;
  confidence: number;
  confidenceLevel: string;
  processedFields: Record<string, any>;
  processingMethod: string;
  message: string;
}

interface OCRUploaderProps {
  onAOCreated?: (aoData: any) => void;
  onFieldsExtracted?: (fields: Record<string, any>) => void;
  className?: string;
}

export function OCRUploader({ onAOCreated, onFieldsExtracted, className }: OCRUploaderProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Erreur",
        description: "Seuls les fichiers PDF sont acceptés",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximum est de 50MB",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setOcrResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      // Simulation du progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/ocr/process-pdf', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Erreur de traitement');
      }

      const result: OCRResult = await response.json();
      setOcrResult(result);

      // Callback pour pré-remplir les champs
      if (onFieldsExtracted) {
        onFieldsExtracted(result.processedFields);
      }

      toast({
        title: "OCR terminé",
        description: `${result.message} (confiance: ${result.confidenceLevel})`,
      });

    } catch (error: any) {
      console.error('OCR error:', error);
      toast({
        title: "Erreur OCR",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleCreateAO = async () => {
    if (!ocrResult) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = fileInput?.files?.[0];
      
      if (file) {
        formData.append('pdf', file);
      }

      const response = await fetch('/api/ocr/create-ao-from-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Erreur de création AO');
      }

      const result = await response.json();
      
      if (onAOCreated) {
        onAOCreated(result.ao);
      }

      toast({
        title: "AO créé automatiquement",
        description: result.message,
      });

    } catch (error: any) {
      console.error('AO creation error:', error);
      toast({
        title: "Erreur création AO",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'bon': return 'text-blue-600 bg-blue-50';
      case 'moyen': return 'text-yellow-600 bg-yellow-50';
      case 'faible': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getProcessingMethodIcon = (method: string) => {
    switch (method) {
      case 'native-text': return <Zap className="h-4 w-4 text-green-600" />;
      case 'ocr': return <Brain className="h-4 w-4 text-blue-600" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Traitement OCR Automatique
        </CardTitle>
        <p className="text-sm text-gray-600">
          Glissez-déposez un PDF d'appel d'offres pour extraire automatiquement les informations
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Zone d'upload */}
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Glissez-déposez votre PDF ici
            </p>
            <p className="text-sm text-gray-500">
              ou cliquez pour sélectionner un fichier
            </p>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              className="hidden"
              id="pdf-upload"
              disabled={isProcessing}
              data-testid="input-pdf-upload"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('pdf-upload')?.click()}
              disabled={isProcessing}
              data-testid="button-select-pdf"
            >
              <Upload className="h-4 w-4 mr-2" />
              Sélectionner un PDF
            </Button>
          </div>
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span className="text-sm">Traitement en cours...</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Résultats OCR */}
        {ocrResult && (
          <div className="space-y-4">
            <Separator />
            
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Résultats du traitement</h3>
              <div className="flex items-center gap-2">
                {getProcessingMethodIcon(ocrResult.processingMethod)}
                <Badge className={getConfidenceColor(ocrResult.confidenceLevel)}>
                  {ocrResult.confidenceLevel} ({ocrResult.confidence.toFixed(0)}%)
                </Badge>
              </div>
            </div>

            <Tabs defaultValue="fields" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="fields">Champs extraits</TabsTrigger>
                <TabsTrigger value="text">Texte brut</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="fields" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(ocrResult.processedFields).map(([key, value]) => (
                    value && (
                      <div key={key} className="p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm font-medium text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </div>
                        <div className="text-sm mt-1">
                          {typeof value === 'boolean' ? (
                            value ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )
                          ) : (
                            String(value)
                          )}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap">
                    {ocrResult.extractedText}
                  </pre>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={handleCreateAO}
                    disabled={isProcessing}
                    className="w-full"
                    data-testid="button-create-ao-from-ocr"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un AO automatiquement
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => onFieldsExtracted?.(ocrResult.processedFields)}
                    className="w-full"
                    data-testid="button-fill-form"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Pré-remplir le formulaire
                  </Button>
                </div>
                
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• <strong>Créer un AO</strong> : Génère automatiquement un nouvel appel d'offres</p>
                  <p>• <strong>Pré-remplir</strong> : Utilise les données pour remplir le formulaire actuel</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}