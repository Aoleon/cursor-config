import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function ImportOCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier PDF",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setProgress(30);

    const formData = new FormData();
    formData.append("pdf", file);

    try {
      setProgress(60);
      const response = await fetch("/api/ocr/create-ao-from-pdf", {
        method: "POST",
        body: formData,
      });

      setProgress(90);

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Import réussi",
          description: `AO créé : ${result.ao.reference}`,
        });
        setProgress(100);
        // Redirect to AO detail page
        setTimeout(() => {
          window.location.href = `/offers/${result.ao.id}/edit`;
        }, 1500);
      } else {
        throw new Error("Erreur lors de l'import");
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors du traitement OCR",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Header
          title="Import OCR - Appels d'Offres"
          breadcrumbs={[
            { label: "Accueil", href: "/" },
            { label: "Appels d'Offres", href: "/offers" },
            { label: "Import OCR" },
          ]}
        />

        <div className="p-6">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle>Import et Analyse OCR</CardTitle>
              <CardDescription>
                Importez un PDF d'appel d'offres pour extraction automatique des données
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Glissez-déposez un fichier PDF ou cliquez pour parcourir
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Sélectionner un PDF
                </Button>
              </div>

              {file && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleUpload} disabled={processing}>
                    {processing ? "Traitement..." : "Analyser avec OCR"}
                  </Button>
                </div>
              )}

              {processing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Traitement OCR en cours...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400 mr-3" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">
                      Fonctionnalités OCR avancées
                    </p>
                    <ul className="mt-2 space-y-1 text-blue-700">
                      <li>• Extraction automatique de 35+ champs</li>
                      <li>• Détection des lots et montants</li>
                      <li>• Reconnaissance des contacts</li>
                      <li>• Analyse des dates clés</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}