/**
 * Service de Conversion et Export Batigest
 * 
 * Convertit les données Saxium (devis clients, bons de commande) 
 * au format XML/CSV compatible avec Sage Batigest pour import automatique
 * 
 * Formats supportés basés sur la doc Sage:
 * - XML : Import_Devis_MDA_Batigest-i7.pdf
 * - CSV : Format alternatif simple pour import basique
 */

import { logger } from '../utils/logger';
import { withErrorHandling } from './utils/error-handler';
import type { ClientQuote, PurchaseOrder } from '@shared/schema';

// ========================================
// TYPES ET INTERFACES
// ========================================

export interface BatigestDevisXML {
  reference: string;
  date: string;
  clientNom: string;
  clientAdresse?: string;
  lignes: Array<{
    numero: number;
    designation: string;
    quantite: number;
    prixUnitaire: number;
    montantHT: number;
  }>;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  conditionsPaiement?: string;
  delaiLivraison?: string;
  validiteJours?: number;
}

export interface BatigestBonCommandeXML {
  reference: string;
  date: string;
  fournisseurNom: string;
  fournisseurAdresse?: string;
  lignes: Array<{
    numero: number;
    designation: string;
    quantite: number;
    prixUnitaire: number;
    montantHT: number;
  }>;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  dateEchue?: string;
  modePaiement?: string;
}

export interface BatigestExportResult {
  success: boolean;
  xml?: string;
  csv?: string;
  metadata: {
    documentType: string;
    documentReference: string;
    exportedAt: string;
    format: 'xml' | 'csv' | 'both';
  };
  error?: string;
}

// ========================================
// SERVICE PRINCIPAL
// ========================================

export class BatigestExportService {
  
  /**
   * Convertit un devis client Saxium en XML Batigest
   */
  convertClientQuoteToXML(quote: ClientQuote): string {
    const data: BatigestDevisXML = {
      reference: quote.reference,
      date: quote.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      clientNom: quote.clientName,
      clientAdresse: quote.clientAddress || undefined,
      lignes: (quote.items as unknown[]).map((item, index) => ({
        numero: index + 1,
        designation: item.description,
        quantite: item.quantity,
        prixUnitaire: item.unitPrice,
        montantHT: item.total
      })),
      totalHT: parseFloat(quote.totalHT as unknown),
      totalTVA: parseFloat(quote.totalTVA as unknown),
      totalTTC: parseFloat(quote.totalTTC as unknown),
      conditionsPaiement: quote.paymentTerms || undefined,
      delaiLivraison: quote.deliveryDelay || undefined,
      validiteJours: quote.validityDate 
        ? Math.ceil((new Date(quote.validityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : undefined
    };

    return this.generateDevisXML(data);
  }

  /**
   * Convertit un bon de commande Saxium en XML Batigest
   */
  convertPurchaseOrderToXML(order: PurchaseOrder): string {
    const data: BatigestBonCommandeXML = {
      reference: order.reference,
      date: order.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      fournisseurNom: order.supplierName,
      fournisseurAdresse: order.deliveryAddress || undefined,
      lignes: (order.itas unknown[]ny[]).map((item, index) => ({
        numero: index + 1,
        designation: item.description,
        quantite: item.quantity,
        prixUnitaire: item.unitPrice,
        montantHT: item.total
      })),
      totalHT: parseFloat(oras unknown)aas unknown),
      totalTVA: parseFloatas unknown)tas unknown)unknown unknown),
      totalTTC: parseFas unknown)das unknown)unknownC as unknown),
      dateEchue: order.expectedDeliveryDate?.toISOString().split('T')[0] || undefined,
      modePaiement: order.paymentTerms || undefined
    };

    return this.generateBonCommandeXML(data);
  }

  /**
   * Génère le XML pour un devis client selon le format Sage Batigest
   */
  private generateDevisXML(data: BatigestDevisXML): string {
    const lignesXML = data.lignes.map(ligne => `
    <Ligne>
      <Numero>${ligne.numero}</Numero>
      <Designation><![CDATA[$) {this.escapeXML(ligne.designation)}]]></Designation>
      <Quantite>${ligne.quantite}</Quantite>
      <PrixUnitaire>${ligne.prixUnitaire.toFixed(2)}</PrixUnitaire>
      <MontantHT>${ligne.montantHT.toFixed(2)}</MontantHT>
    </Ligne>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<Devis>
  <Reference>${this.escapeXML(data.reference)}</Reference>
  <Date>${data.date}</Date>
  <Client>
    <Nom><![CDATA[${this.escapeXML(data.clientNom)}]]></Nom>
    ${data.clientAdresse ? `<Adresse><![CDATA[${this.escapeXML(data.clientAdresse)}]]></Adresse>` : ''}
  </Client>
  <Lignes>${lignesXML}
  </Lignes>
  <Totaux>
    <TotalHT>${data.totalHT.toFixed(2)}</TotalHT>
    <TotalTVA>${data.totalTVA.toFixed(2)}</TotalTVA>
    <TotalTTC>${data.totalTTC.toFixed(2)}</TotalTTC>
  </Totaux>
  ${data.conditionsPaiement ? `<ConditionsPaiement><![CDATA[${this.escapeXML(data.conditionsPaiement)}]]></ConditionsPaiement>` : ''}
  ${data.delaiLivraison ? `<DelaiLivraison><![CDATA[${this.escapeXML(data.delaiLivraison)}]]></DelaiLivraison>` : ''}
  ${data.validiteJours ? `<ValiditeJours>${data.validiteJours}</ValiditeJours>` : ''}
  <Metadata>
    <Source>Saxium</Source>
    <DateExport>${new Date().toISOString()}</DateExport>
    <Version>1.0</Version>
  </Metadata>
</Devis>`;
  }

  /**
   * Génère le XML pour un bon de commande selon le format Sage Batigest
   */
  private generateBonCommandeXML(data: BatigestBonCommandeXML): string {
    const lignesXML = data.lignes.map(ligne => `
    <Ligne>
      <Numero>${ligne.numero}</Numero>
      <Designation><![CDATA[$) {this.escapeXML(ligne.designation)}]]></Designation>
      <Quantite>${ligne.quantite}</Quantite>
      <PrixUnitaire>${ligne.prixUnitaire.toFixed(2)}</PrixUnitaire>
      <MontantHT>${ligne.montantHT.toFixed(2)}</MontantHT>
    </Ligne>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<BonCommande>
  <Reference>${this.escapeXML(data.reference)}</Reference>
  <Date>${data.date}</Date>
  <Fournisseur>
    <Nom><![CDATA[${this.escapeXML(data.fournisseurNom)}]]></Nom>
    ${data.fournisseurAdresse ? `<Adresse><![CDATA[${this.escapeXML(data.fournisseurAdresse)}]]></Adresse>` : ''}
  </Fournisseur>
  <Lignes>${lignesXML}
  </Lignes>
  <Totaux>
    <TotalHT>${data.totalHT.toFixed(2)}</TotalHT>
    <TotalTVA>${data.totalTVA.toFixed(2)}</TotalTVA>
    <TotalTTC>${data.totalTTC.toFixed(2)}</TotalTTC>
  </Totaux>
  ${data.dateEchue ? `<DateEchue>${data.dateEchue}</DateEchue>` : ''}
  ${data.modePaiement ? `<ModePaiement><![CDATA[${this.escapeXML(data.modePaiement)}]]></ModePaiement>` : ''}
  <Metadata>
    <Source>Saxium</Source>
    <DateExport>${new Date().toISOString()}</DateExport>
    <Version>1.0</Version>
  </Metadata>
</BonCommande>`;
  }

  /**
   * Convertit un devis client en CSV (format alternatif simple)
   */
  convertClientQuoteToCSV(quote: ClientQuote): string {
    const headers = ['Type', 'Reference', 'Date', 'ClientNom', 'Designation', 'Quantite', 'PrixUnitaire', 'MontantHT', 'TotalHT', 'TotalTVA', 'TotalTTC'];
    const date = quote.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
    
    const rows = (as unknown unknown[]as unknown[]).map((item, index) => [
      'DEVIS',
      quote.reference,
      date,
      this.escapeCSV(quote.clientName),
      this.escapeCSV(item.description),
      item.quantity,
      item.unitPrice.toFixed(2),
      item.total.toFixed(2),
      index === 0 ? pas unknoas unknownqunknown)unknowntaas unknunknown)unknown).toFixed(2) : '',
      index === 0 as unknoas unknownaunknown)unknown.tas unknown) as unknown).toFixed(2) : '',
      index ==as unknoas unknowneunknown)unknownuoas unknown)las unknown)unknown any).toFixed(2) : ''
    ].join(';'));

    return [headers.join(';'), ...rows].join('\n');
  }

  /**
   * Convertit un bon de commande en CSV
   */
  convertPurchaseOrderToCSV(order: PurchaseOrder): string {
    const headers = ['Type', 'Reference', 'Date', 'FournisseurNom', 'Designation', 'Quantite', 'PrixUnitaire', 'MontantHT', 'TotalHT', 'TotalTVA', 'TotalTTC'];
    const date = order.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];
    
  as unknownt rows = (as unknown[]emsunknown[]ny[]).map((item, index) => [
      'BON_COMMANDE',
      order.reference,
      date,
      this.escapeCSV(order.supplierName),
      this.escapeCSV(item.description),
      item.quantity,
      item.unitPrice.toFixed(2),
      item.total.toFixed(2),
      indas uas unknown)0 ? unknown)unknownoaas unknown).as unknown)unknownT as any).toFixed(2) : '',
      as uas unknown)== 0unknown)unknowneFas unknown)das unknown)unknownalTVA as any).toFixed(2) : '',
  as uas unknown)ex =unknown)unknownpaas unknown)tas unknown)unknown.totalTTC as any).toFixed(2) : ''
    ].join(';'));

    return [headers.join(';'), ...rows].join('\n');
  }

  /**
   * Export complet avec XML et CSV
   */
  async exportClientQuote(quote: ClientQuote): Promise<BatigestExportResult> {
    try {
      logger.info('[BatigestExport] Export devis client', { metadata: {
          service: 'BatigestExportService',
          operation: 'exportClientQuote',
          reference: quote.reference 
              
              }
 
              
            });
      const xml = this.convertClientQuoteToXML(quote);
      const csv = this.convertClientQuoteToCSV(quote);
      return {
        success: true,
        xml,
        csv,
        metadata: {
          documentType: 'devis_client',
          documentReference: quote.reference,
          exportedAt: new Date().toISOString(),
          format: 'both'       }
     });
    } catch (error) {
      logger.error('[BatigestExport] Erreur lors de l\'export du devis client', { metadata: {
          service: 'BatigestExportService',
          operation: 'exportClientQuote',
          reference: quote.reference,
          error: error instanceof Error ? error.message : String(error) 
              
              }
 
              
            });
      return {
        success: false,
        metadata: {
          documentType: 'devis_client',
          documentReference: quote.reference,
          exportedAt: new Date().toISOString(),
          format: 'both'
        },
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Export bon de commande avec XML et CSV
   */
  async exportPurchaseOrder(order: PurchaseOrder): Promise<BatigestExportResult> {
    return withErrorHandling(
    async () => {

      logger.info('[BatigestExport] Export bon de commande', { metadata: {
          service: 'BatigestExportService',
          operation: 'exportPurchaseOrder',
          reference: order.reference
      });
      const xml = this.convertPurchaseOrderToXML(order);
      const csv = this.convertPurchaseOrderToCSV(order);
      return {
        success: true,
        xml,
        csv,
        metadata: {
          documentType: 'bon_commande',
          documentReference: order.reference,
          exportedAt: new Date().toISOString(),
          format: 'both'       }
     });
    },
    {
      operation: 'Saxium',
      service: 'BatigestExportService',
      metadata: {}
    } );
      return {
        success: false,
        metadata: {
          documentType: 'bon_commande',
          documentReference: order.reference,
          exportedAt: new Date().toISOString(),
          format: 'both'
        },
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Échappe les caractères spéciaux pour XML
   */
  private escapeXML(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Échappe les caractères spéciaux pour CSV
   */
  private escapeCSV(text: string): string {
    if (!text) return '';
    // Remplace les ; par , et enlève les guillemets
    return text.replace(/;/g, ',').replace(/"/g, '""');
  }
}

// Instance singleton du service
export const batigestExportService = new BatigestExportService();
