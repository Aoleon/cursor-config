import sql from 'mssql';
import { z } from 'zod';

// Configuration de connexion Sage Batigest
const batigestConfig = {
  server: process.env.BATIGEST_SQL_SERVER || 'localhost',
  database: process.env.BATIGEST_DATABASE || 'BATIGEST_CONNECT',
  user: process.env.BATIGEST_SQL_USER || '',
  password: process.env.BATIGEST_SQL_PASSWORD || '',
  port: parseInt(process.env.BATIGEST_SQL_PORT || '1433'),
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Schémas de validation pour les données Batigest
export const BatigestDevisSchema = z.object({
  NUMERO_DEVIS: z.string(),
  REFERENCE_AFFAIRE: z.string().optional(),
  CLIENT_CODE: z.string(),
  CLIENT_NOM: z.string(),
  MONTANT_HT: z.number(),
  MONTANT_TTC: z.number(),
  TAUX_MARGE: z.number(),
  DATE_CREATION: z.date(),
  DATE_VALIDATION: z.date().optional(),
  STATUT: z.enum(['BROUILLON', 'VALIDE', 'ENVOYE', 'ACCEPTE', 'REFUSE']),
  RESPONSABLE: z.string().optional(),
});

export const BatigestOuvrageSchema = z.object({
  CODE_OUVRAGE: z.string(),
  LIBELLE: z.string(),
  UNITE: z.string(),
  PRIX_ACHAT_HT: z.number(),
  PRIX_VENTE_HT: z.number(),
  TAUX_FRAIS_GENERAUX: z.number(),
  TAUX_BENEFICE: z.number(),
  COEFFICIENT_MARGE: z.number(),
  FAMILLE: z.string().optional(),
  SOUS_FAMILLE: z.string().optional(),
});

export const BatigestFactureSchema = z.object({
  NUMERO_FACTURE: z.string(),
  NUMERO_DEVIS: z.string(),
  CLIENT_CODE: z.string(),
  MONTANT_HT: z.number(),
  MONTANT_TTC: z.number(),
  DATE_FACTURE: z.date(),
  DATE_ECHEANCE: z.date(),
  STATUT_REGLEMENT: z.enum(['NON_REGLE', 'PARTIELLEMENT_REGLE', 'REGLE']),
  MONTANT_REGLE: z.number(),
});

// Types TypeScript
export type BatigestDevis = z.infer<typeof BatigestDevisSchema>;
export type BatigestOuvrage = z.infer<typeof BatigestOuvrageSchema>;
export type BatigestFacture = z.infer<typeof BatigestFactureSchema>;

// Interface d'analyse Business Intelligence
export interface BatigestAnalytics {
  // Indicateurs de performance
  chiffreAffairesRealise: number;
  chiffreAffairesPrevu: number;
  tauxConversionDevis: number;
  margeReelleMoyenne: number;
  margePrevueMoyenne: number;
  
  // Analyse des coefficients
  coefficientsParFamille: Array<{
    famille: string;
    coefficientMoyen: number;
    nombreElements: number;
    ecartType: number;
  }>;
  
  // Suivi facturation
  factuationEnCours: {
    montantTotal: number;
    nombreFactures: number;
    retardMoyen: number;
  };
  
  // Évolution temporelle
  evolutionMarges: Array<{
    periode: string;
    margeReelle: number;
    margePrevue: number;
    ecart: number;
  }>;
}

export class BatigestService {
  private pool: sql.ConnectionPool | null = null;
  private isConnected = false;

  /**
   * Initialise la connexion à la base Sage Batigest
   */
  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        this.pool = new sql.ConnectionPool(batigestConfig);
        await this.pool.connect();
        this.isConnected = true;
        console.log('Connexion Sage Batigest établie');
      }
    } catch (error) {
      console.error('Erreur connexion Batigest:', error);
      throw new Error('Impossible de se connecter à Sage Batigest');
    }
  }

  /**
   * Ferme la connexion à la base Batigest
   */
  async disconnect(): Promise<void> {
    if (this.pool && this.isConnected) {
      await this.pool.close();
      this.isConnected = false;
      console.log('Connexion Sage Batigest fermée');
    }
  }

  /**
   * Récupère tous les devis clients avec filtres optionnels
   */
  async getDevisClients(filters?: {
    dateDebut?: Date;
    dateFin?: Date;
    statut?: string;
    clientCode?: string;
  }): Promise<BatigestDevis[]> {
    await this.connect();
    
    let query = `
      SELECT 
        d.NUMERO_DEVIS,
        d.REFERENCE_AFFAIRE,
        c.CODE_CLIENT as CLIENT_CODE,
        c.NOM as CLIENT_NOM,
        d.MONTANT_HT,
        d.MONTANT_TTC,
        d.TAUX_MARGE,
        d.DATE_CREATION,
        d.DATE_VALIDATION,
        d.STATUT,
        d.RESPONSABLE
      FROM DEVIS d
      INNER JOIN CLIENTS c ON d.CLIENT_ID = c.ID
      WHERE 1=1
    `;
    
    const request = this.pool!.request();
    
    if (filters?.dateDebut) {
      query += ' AND d.DATE_CREATION >= @dateDebut';
      request.input('dateDebut', sql.DateTime, filters.dateDebut);
    }
    
    if (filters?.dateFin) {
      query += ' AND d.DATE_CREATION <= @dateFin';
      request.input('dateFin', sql.DateTime, filters.dateFin);
    }
    
    if (filters?.statut) {
      query += ' AND d.STATUT = @statut';
      request.input('statut', sql.VarChar(50), filters.statut);
    }
    
    if (filters?.clientCode) {
      query += ' AND c.CODE_CLIENT = @clientCode';
      request.input('clientCode', sql.VarChar(50), filters.clientCode);
    }
    
    query += ' ORDER BY d.DATE_CREATION DESC';
    
    const result = await request.query(query);
    return result.recordset.map((record: any) => BatigestDevisSchema.parse(record));
  }

  /**
   * Récupère les ouvrages et leurs coefficients de marge
   */
  async getOuvragesEtCoefficients(): Promise<BatigestOuvrage[]> {
    await this.connect();
    
    const query = `
      SELECT 
        o.CODE_OUVRAGE,
        o.LIBELLE,
        o.UNITE,
        o.PRIX_ACHAT_HT,
        o.PRIX_VENTE_HT,
        o.TAUX_FRAIS_GENERAUX,
        o.TAUX_BENEFICE,
        (o.PRIX_VENTE_HT / NULLIF(o.PRIX_ACHAT_HT, 0)) as COEFFICIENT_MARGE,
        f.CODE_FAMILLE as FAMILLE,
        sf.CODE_SOUS_FAMILLE as SOUS_FAMILLE
      FROM OUVRAGES o
      LEFT JOIN FAMILLES f ON o.FAMILLE_ID = f.ID
      LEFT JOIN SOUS_FAMILLES sf ON o.SOUS_FAMILLE_ID = sf.ID
      WHERE o.ACTIF = 1
      ORDER BY f.CODE_FAMILLE, sf.CODE_SOUS_FAMILLE, o.CODE_OUVRAGE
    `;
    
    const result = await this.pool!.request().query(query);
    return result.recordset.map((record: any) => BatigestOuvrageSchema.parse(record));
  }

  /**
   * Récupère l'état des facturations en cours
   */
  async getFacturationsEnCours(): Promise<BatigestFacture[]> {
    await this.connect();
    
    const query = `
      SELECT 
        f.NUMERO_FACTURE,
        f.NUMERO_DEVIS,
        c.CODE_CLIENT as CLIENT_CODE,
        f.MONTANT_HT,
        f.MONTANT_TTC,
        f.DATE_FACTURE,
        f.DATE_ECHEANCE,
        f.STATUT_REGLEMENT,
        ISNULL(f.MONTANT_REGLE, 0) as MONTANT_REGLE
      FROM FACTURES f
      INNER JOIN CLIENTS c ON f.CLIENT_ID = c.ID
      WHERE f.STATUT_REGLEMENT IN ('NON_REGLE', 'PARTIELLEMENT_REGLE')
      ORDER BY f.DATE_ECHEANCE ASC
    `;
    
    const result = await this.pool!.request().query(query);
    return result.recordset.map((record: any) => BatigestFactureSchema.parse(record));
  }

  /**
   * Synchronise un devis JLM avec Batigest
   */
  async syncDevisWithBatigest(jlmOfferId: string, batigestRef?: string): Promise<{
    synchronized: boolean;
    batigestData?: BatigestDevis;
    message: string;
  }> {
    try {
      if (!batigestRef) {
        return {
          synchronized: false,
          message: 'Référence Batigest manquante pour la synchronisation'
        };
      }

      await this.connect();
      
      const query = `
        SELECT TOP 1
          d.NUMERO_DEVIS,
          d.REFERENCE_AFFAIRE,
          c.CODE_CLIENT as CLIENT_CODE,
          c.NOM as CLIENT_NOM,
          d.MONTANT_HT,
          d.MONTANT_TTC,
          d.TAUX_MARGE,
          d.DATE_CREATION,
          d.DATE_VALIDATION,
          d.STATUT,
          d.RESPONSABLE
        FROM DEVIS d
        INNER JOIN CLIENTS c ON d.CLIENT_ID = c.ID
        WHERE d.NUMERO_DEVIS = @batigestRef OR d.REFERENCE_AFFAIRE = @batigestRef
      `;
      
      const request = this.pool!.request();
      request.input('batigestRef', sql.VarChar(50), batigestRef);
      
      const result = await request.query(query);
      
      if (result.recordset.length === 0) {
        return {
          synchronized: false,
          message: `Aucun devis trouvé dans Batigest avec la référence ${batigestRef}`
        };
      }
      
      const batigestData = BatigestDevisSchema.parse(result.recordset[0]);
      
      return {
        synchronized: true,
        batigestData,
        message: 'Synchronisation réussie avec Batigest'
      };
      
    } catch (error) {
      console.error('Erreur synchronisation Batigest:', error);
      return {
        synchronized: false,
        message: 'Erreur lors de la synchronisation avec Batigest'
      };
    }
  }

  /**
   * Génère les analytics de Business Intelligence
   */
  async generateAnalytics(period?: { startDate: Date; endDate: Date }): Promise<BatigestAnalytics> {
    await this.connect();
    
    // Calcul du CA réalisé et prévu
    const caQuery = `
      SELECT 
        SUM(CASE WHEN f.STATUT_REGLEMENT = 'REGLE' THEN f.MONTANT_HT ELSE 0 END) as CA_REALISE,
        SUM(d.MONTANT_HT) as CA_PREVU
      FROM DEVIS d
      LEFT JOIN FACTURES f ON d.NUMERO_DEVIS = f.NUMERO_DEVIS
      WHERE d.STATUT IN ('VALIDE', 'ACCEPTE')
      ${period ? "AND d.DATE_CREATION BETWEEN @startDate AND @endDate" : ""}
    `;
    
    const caRequest = this.pool!.request();
    if (period) {
      caRequest.input('startDate', sql.DateTime, period.startDate);
      caRequest.input('endDate', sql.DateTime, period.endDate);
    }
    
    const caResult = await caRequest.query(caQuery);
    const caData = caResult.recordset[0];
    
    // Calcul des coefficients par famille
    const coeffQuery = `
      SELECT 
        f.CODE_FAMILLE as famille,
        AVG(o.PRIX_VENTE_HT / NULLIF(o.PRIX_ACHAT_HT, 0)) as coefficientMoyen,
        COUNT(*) as nombreElements,
        STDEV(o.PRIX_VENTE_HT / NULLIF(o.PRIX_ACHAT_HT, 0)) as ecartType
      FROM OUVRAGES o
      INNER JOIN FAMILLES f ON o.FAMILLE_ID = f.ID
      WHERE o.ACTIF = 1
      GROUP BY f.CODE_FAMILLE
    `;
    
    const coeffResult = await this.pool!.request().query(coeffQuery);
    
    // État facturation
    const factQuery = `
      SELECT 
        SUM(MONTANT_HT) as montantTotal,
        COUNT(*) as nombreFactures,
        AVG(DATEDIFF(day, DATE_ECHEANCE, GETDATE())) as retardMoyen
      FROM FACTURES
      WHERE STATUT_REGLEMENT IN ('NON_REGLE', 'PARTIELLEMENT_REGLE')
      AND DATE_ECHEANCE < GETDATE()
    `;
    
    const factResult = await this.pool!.request().query(factQuery);
    const factData = factResult.recordset[0];
    
    return {
      chiffreAffairesRealise: caData.CA_REALISE || 0,
      chiffreAffairesPrevu: caData.CA_PREVU || 0,
      tauxConversionDevis: caData.CA_PREVU > 0 ? (caData.CA_REALISE / caData.CA_PREVU) * 100 : 0,
      margeReelleMoyenne: 0, // À calculer selon la logique métier
      margePrevueMoyenne: 0, // À calculer selon la logique métier
      
      coefficientsParFamille: coeffResult.recordset.map((row: any) => ({
        famille: row.famille,
        coefficientMoyen: row.coefficientMoyen || 0,
        nombreElements: row.nombreElements,
        ecartType: row.ecartType || 0,
      })),
      
      factuationEnCours: {
        montantTotal: factData.montantTotal || 0,
        nombreFactures: factData.nombreFactures || 0,
        retardMoyen: factData.retardMoyen || 0,
      },
      
      evolutionMarges: [], // À implémenter selon les besoins
    };
  }

  /**
   * Test de connectivité Batigest
   */
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      await this.connect();
      
      const testQuery = "SELECT TOP 1 GETDATE() as TEST_DATE";
      const result = await this.pool!.request().query(testQuery);
      
      return {
        connected: true,
        message: `Connexion OK - Test effectué le ${result.recordset[0].TEST_DATE}`
      };
    } catch (error) {
      return {
        connected: false,
        message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      };
    }
  }
}

// Instance singleton du service
export const batigestService = new BatigestService();

// Nettoyage à la fermeture de l'application
process.on('SIGINT', async () => {
  await batigestService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await batigestService.disconnect();
  process.exit(0);
});