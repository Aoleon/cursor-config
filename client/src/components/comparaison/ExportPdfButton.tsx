import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SupplierComparison {
  supplierId: string;
  supplierName: string;
  supplierInfo: {
    email?: string;
    phone?: string;
    city?: string;
    specializations?: string[];
  };
  ocrData?: {
    totalAmountHT?: number;
    totalAmountTTC?: number;
    vatRate?: number;
    currency?: string;
    deliveryDelay?: number;
    paymentTerms?: string;
    validityPeriod?: number;
    qualityScore?: number;
    completenessScore?: number;
    requiresManualReview?: boolean;
  };
  analysisStats: {
    totalAnalyses: number;
    completedAnalyses: number;
    averageQuality: number;
    averageCompleteness: number;
  };
}

interface ComparisonData {
  aoLotId: string;
  lot: {
    id: string;
    numero: string;
    designation: string;
    menuiserieType?: string;
    montantEstime?: number;
  };
  suppliers: SupplierComparison[];
  metrics: {
    totalSuppliers: number;
    validAnalyses: number;
    priceRange?: {
      min: number;
      max: number;
      average: number;
    };
    deliveryRange?: {
      min: number;
      max: number;
      average: number;
    };
    bestPrice?: number;
    fastestDelivery?: number;
  };
  sortedBy: string;
  sortOrder: string;
  generatedAt: string;
}

interface ExportPdfButtonProps {
  comparisonData: ComparisonData;
  className?: string;
}

export function ExportPdfButton({ comparisonData, className }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const formatPrice = (price?: number, currency: string = 'EUR') => {
    if (price == null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const formatDelay = (days?: number) => {
    if (days == null) return '-';
    if (days === 0) return 'Immédiat';
    if (days === 1) return '1 jour';
    return `${days} jours`;
  };

  const generatePdfContent = () => {
    // Générer un contenu HTML structuré pour le PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comparaison des devis - Lot ${comparisonData.lot.numero}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1e293b;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .header p {
            margin: 5px 0;
            color: #64748b;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
          }
          .metric-card {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .metric-card h3 {
            margin: 0 0 5px 0;
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
          }
          .metric-card p {
            margin: 0;
            font-size: 18px;
            font-weight: bold;
            color: #1e293b;
          }
          .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 12px;
          }
          .comparison-table th,
          .comparison-table td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            text-align: left;
          }
          .comparison-table th {
            background-color: #f1f5f9;
            font-weight: 600;
            color: #1e293b;
          }
          .comparison-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .best-offer {
            background-color: #dcfce7 !important;
            color: #15803d;
            font-weight: bold;
          }
          .quality-excellent { color: #15803d; }
          .quality-good { color: #ca8a04; }
          .quality-average { color: #ea580c; }
          .quality-poor { color: #dc2626; }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #64748b;
            font-size: 12px;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          .supplier-details {
            margin-bottom: 20px;
          }
          .supplier-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            background: #ffffff;
          }
          .supplier-card h3 {
            margin: 0 0 10px 0;
            color: #1e293b;
            font-size: 16px;
          }
          .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
          }
          .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .detail-label {
            font-weight: 500;
            color: #64748b;
          }
          .detail-value {
            color: #1e293b;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Comparaison des devis fournisseurs</h1>
          <p><strong>Lot ${comparisonData.lot.numero}</strong> - ${comparisonData.lot.designation}</p>
          <p>Type: ${comparisonData.lot.menuiserieType || 'Non spécifié'}</p>
          <p>Généré le ${new Date(comparisonData.generatedAt).toLocaleDateString('fr-FR', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <div class="metrics">
          <div class="metric-card">
            <h3>Fournisseurs</h3>
            <p>${comparisonData.metrics.totalSuppliers}</p>
          </div>
          <div class="metric-card">
            <h3>Analyses validées</h3>
            <p>${comparisonData.metrics.validAnalyses}</p>
          </div>
          ${comparisonData.metrics.bestPrice ? `
          <div class="metric-card">
            <h3>Meilleur prix</h3>
            <p>${formatPrice(comparisonData.metrics.bestPrice)}</p>
          </div>
          ` : ''}
          ${comparisonData.metrics.fastestDelivery ? `
          <div class="metric-card">
            <h3>Délai le plus court</h3>
            <p>${formatDelay(comparisonData.metrics.fastestDelivery)}</p>
          </div>
          ` : ''}
        </div>

        <h2>Tableau comparatif</h2>
        <table class="comparison-table">
          <thead>
            <tr>
              <th>Critères</th>
              ${comparisonData.suppliers.map(supplier => 
                `<th>${supplier.supplierName}<br><small>${supplier.supplierInfo.city || ''}</small></th>`
              ).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Prix HT</strong></td>
              ${comparisonData.suppliers.map(supplier => {
                const isMin = comparisonData.metrics.bestPrice === supplier.ocrData?.totalAmountHT;
                return `<td class="${isMin ? 'best-offer' : ''}">${formatPrice(supplier.ocrData?.totalAmountHT)}</td>`;
              }).join('')}
            </tr>
            <tr>
              <td><strong>Prix TTC</strong></td>
              ${comparisonData.suppliers.map(supplier => 
                `<td>${formatPrice(supplier.ocrData?.totalAmountTTC)}</td>`
              ).join('')}
            </tr>
            <tr>
              <td><strong>Délai livraison</strong></td>
              ${comparisonData.suppliers.map(supplier => {
                const isMin = comparisonData.metrics.fastestDelivery === supplier.ocrData?.deliveryDelay;
                return `<td class="${isMin ? 'best-offer' : ''}">${formatDelay(supplier.ocrData?.deliveryDelay)}</td>`;
              }).join('')}
            </tr>
            <tr>
              <td><strong>Conditions paiement</strong></td>
              ${comparisonData.suppliers.map(supplier => 
                `<td>${supplier.ocrData?.paymentTerms || '-'}</td>`
              ).join('')}
            </tr>
            <tr>
              <td><strong>Validité du devis</strong></td>
              ${comparisonData.suppliers.map(supplier => 
                `<td>${supplier.ocrData?.validityPeriod ? `${supplier.ocrData.validityPeriod} jours` : '-'}</td>`
              ).join('')}
            </tr>
            <tr>
              <td><strong>Qualité OCR</strong></td>
              ${comparisonData.suppliers.map(supplier => {
                const score = supplier.ocrData?.qualityScore;
                let className = '';
                if (score && score >= 80) className = 'quality-excellent';
                else if (score && score >= 60) className = 'quality-good';
                else if (score && score >= 40) className = 'quality-average';
                else className = 'quality-poor';
                
                return `<td class="${className}">${score ? `${score}%` : 'Non analysé'}</td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>

        <h2>Détails par fournisseur</h2>
        <div class="supplier-details">
          ${comparisonData.suppliers.map(supplier => `
            <div class="supplier-card">
              <h3>${supplier.supplierName}</h3>
              <div class="detail-grid">
                ${supplier.supplierInfo.email ? `
                <div class="detail-item">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${supplier.supplierInfo.email}</span>
                </div>
                ` : ''}
                ${supplier.supplierInfo.phone ? `
                <div class="detail-item">
                  <span class="detail-label">Téléphone:</span>
                  <span class="detail-value">${supplier.supplierInfo.phone}</span>
                </div>
                ` : ''}
                ${supplier.supplierInfo.city ? `
                <div class="detail-item">
                  <span class="detail-label">Ville:</span>
                  <span class="detail-value">${supplier.supplierInfo.city}</span>
                </div>
                ` : ''}
                <div class="detail-item">
                  <span class="detail-label">Analyses:</span>
                  <span class="detail-value">${supplier.analysisStats.completedAnalyses}/${supplier.analysisStats.totalAnalyses}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Qualité moy.:</span>
                  <span class="detail-value">${supplier.analysisStats.averageQuality}%</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Complétude moy.:</span>
                  <span class="detail-value">${supplier.analysisStats.averageCompleteness}%</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="footer">
          <p>Document généré automatiquement par Saxium - ${new Date().toLocaleDateString('fr-FR')}</p>
          <p>Trié par: ${comparisonData.sortedBy} (${comparisonData.sortOrder === 'asc' ? 'croissant' : 'décroissant'})</p>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Générer le contenu HTML
      const htmlContent = generatePdfContent();
      
      // Créer un blob avec le contenu HTML
      const blob = new Blob([htmlContent], { type: 'text/html' });
      
      // Créer une URL temporaire pour le téléchargement
      const url = URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement
      const link = document.createElement('a');
      link.href = url;
      link.download = `comparaison-devis-lot-${comparisonData.lot.numero}-${new Date().toISOString().split('T')[0]}.html`;
      
      // Déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Nettoyer l'URL temporaire
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export réussi",
        description: "Le fichier de comparaison a été téléchargé. Vous pouvez l'imprimer en PDF depuis votre navigateur.",
      });
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast({
        title: "Erreur d'export",
        description: "Impossible de générer le fichier de comparaison.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className={className}
      data-testid="button-export-pdf"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Download className="h-4 w-4 mr-2" />
      )}
      {isExporting ? 'Export en cours...' : 'Export PDF'}
    </Button>
  );
}