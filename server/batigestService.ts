import { z } from 'zod';
import { withErrorHandling } from './utils/error-handler';
import { AppError, NotFoundError, ValidationError, AuthorizationError } from './utils/error-handler';
import { logger } from './utils/logger';

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

// Mode simulation pour le POC (évite la dépendance MSSQL)
const SIMULATION_MODE = process.env.BATIGEST_SIMULATED !== 'false';

// ========================================
// DONNÉES SIMULÉES POUR LE POC
// ========================================

// Génération déterministe de données simulées réalistes
function simulateLatency(min = 100, max = 500): Promise<void> {
  return new Promise(resolve => 
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
  );
}

// Clients simulés
const simulatedClients = [
  { CODE_CLIENT: 'CLI001', NOM: 'Résidence Le Boulogne' },
  { CODE_CLIENT: 'CLI002', NOM: 'SCI Sandettie' },
  { CODE_CLIENT: 'CLI003', NOM: 'SARL Menuiseries Modernes' },
  { CODE_CLIENT: 'CLI004', NOM: 'Groupe Immobilier Atlantic' },
  { CODE_CLIENT: 'CLI005', NOM: 'Copropriété Les Jardins' },
];

// Devis simulés cohérents avec données réelles
const simulatedDevis: BatigestDevis[] = [
  {
    NUMERO_DEVIS: 'DEV-2024-001',
    REFERENCE_AFFAIRE: 'AO-2503-21612025-03-05',
    CLIENT_CODE: 'CLI001',
    CLIENT_NOM: 'Résidence Le Boulogne',
    MONTANT_HT: 245000,
    MONTANT_TTC: 294000,
    TAUX_MARGE: 28.5,
    DATE_CREATION: new Date('2024-03-05'),
    DATE_VALIDATION: new Date('2024-03-12'),
    STATUT: 'VALIDE',
    RESPONSABLE: 'Jean Martin'
  },
  {
    NUMERO_DEVIS: 'DEV-2024-002', 
    REFERENCE_AFFAIRE: 'REF-2024-SANDETTIE',
    CLIENT_CODE: 'CLI002',
    CLIENT_NOM: 'SCI Sandettie',
    MONTANT_HT: 180000,
    MONTANT_TTC: 216000,
    TAUX_MARGE: 25.2,
    DATE_CREATION: new Date('2024-03-10'),
    DATE_VALIDATION: undefined,
    STATUT: 'ENVOYE',
    RESPONSABLE: 'Marie Dubois'
  },
  {
    NUMERO_DEVIS: 'DEV-2024-003',
    REFERENCE_AFFAIRE: 'MOD-2024-001',
    CLIENT_CODE: 'CLI003',
    CLIENT_NOM: 'SARL Menuiseries Modernes',
    MONTANT_HT: 95000,
    MONTANT_TTC: 114000,
    TAUX_MARGE: 32.1,
    DATE_CREATION: new Date('2024-02-28'),
    DATE_VALIDATION: new Date('2024-03-05'),
    STATUT: 'ACCEPTE',
    RESPONSABLE: 'Pierre Leroy'
  }
];

// Ouvrages simulés par famille de menuiserie
const simulatedOuvrages: BatigestOuvrage[] = [
  {
    CODE_OUVRAGE: 'FEN-001',
    LIBELLE: 'Fenêtre PVC double vitrage 120x135cm',
    UNITE: 'U',
    PRIX_ACHAT_HT: 280,
    PRIX_VENTE_HT: 420,
    TAUX_FRAIS_GENERAUX: 15,
    TAUX_BENEFICE: 12,
    COEFFICIENT_MARGE: 1.5,
    FAMILLE: 'FENETRES',
    SOUS_FAMILLE: 'PVC'
  },
  {
    CODE_OUVRAGE: 'FEN-002',
    LIBELLE: 'Fenêtre ALU triple vitrage 140x160cm',
    UNITE: 'U',
    PRIX_ACHAT_HT: 450,
    PRIX_VENTE_HT: 720,
    TAUX_FRAIS_GENERAUX: 18,
    TAUX_BENEFICE: 15,
    COEFFICIENT_MARGE: 1.6,
    FAMILLE: 'FENETRES',
    SOUS_FAMILLE: 'ALUMINIUM'
  },
  {
    CODE_OUVRAGE: 'POR-001',
    LIBELLE: 'Porte d\'entrée ALU avec tierce 215x90cm',
    UNITE: 'U',
    PRIX_ACHAT_HT: 800,
    PRIX_VENTE_HT: 1200,
    TAUX_FRAIS_GENERAUX: 20,
    TAUX_BENEFICE: 18,
    COEFFICIENT_MARGE: 1.5,
    FAMILLE: 'PORTES',
    SOUS_FAMILLE: 'ENTREE_ALU'
  },
  {
    CODE_OUVRAGE: 'VOL-001',
    LIBELLE: 'Volet roulant électrique ALU 140cm',
    UNITE: 'U',
    PRIX_ACHAT_HT: 320,
    PRIX_VENTE_HT: 480,
    TAUX_FRAIS_GENERAUX: 12,
    TAUX_BENEFICE: 10,
    COEFFICIENT_MARGE: 1.5,
    FAMILLE: 'VOLETS',
    SOUS_FAMILLE: 'ROULANTS'
  }
];

// Factures simulées avec retards
const simulatedFactures: BatigestFacture[] = [
  {
    NUMERO_FACTURE: 'FAC-2024-001',
    NUMERO_DEVIS: 'DEV-2024-001',
    CLIENT_CODE: 'CLI001',
    MONTANT_HT: 245000,
    MONTANT_TTC: 294000,
    DATE_FACTURE: new Date('2024-03-15'),
    DATE_ECHEANCE: new Date('2024-04-14'),
    STATUT_REGLEMENT: 'NON_REGLE',
    MONTANT_REGLE: 0
  },
  {
    NUMERO_FACTURE: 'FAC-2024-002',
    NUMERO_DEVIS: 'DEV-2024-003',
    CLIENT_CODE: 'CLI003',
    MONTANT_HT: 95000,
    MONTANT_TTC: 114000,
    DATE_FACTURE: new Date('2024-03-08'),
    DATE_ECHEANCE: new Date('2024-03-31'),
    STATUT_REGLEMENT: 'PARTIELLEMENT_REGLE',
    MONTANT_REGLE: 50000
  }
];

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
  private pool: unknown = null;
  private isConnected = false;

  /**
   * Initialise la connexion à la base Sage Batigest (ou mode simulation)
   */
  async connect(): Promise<void> {
    return withErrorHandling(
    async () => {

      if (SIMULATION_MODE) {
        await simulateLatency(50, 150);
        this.isConnected = true;
        logger.info('BatigestService - Simulation mode enabled');
        return;
      }

      if (!this.isConnected) {
        // Import conditionnel de mssql seulement quand nécessaire
        const sql = (await import('mssql')).default;
        this.pool = new sql.ConnectionPool(batigestConfig);
        await this.pool.connect();
        this.isConnected = true;
        logger.info('BatigestService - Connection established');
      }
    
    },
    {
      operation: 'parseInt',
      service: 'batigestService',
      metadata: {
                                                                                }
                                                                              });
  }

  /**
   * Ferme la connexion à la base Batigest
   */
  async disconnect(): Promise<void> {
    if (this.pool && this.isConnected) {
      await this.pool.close();
      this.isConnected = false;
      logger.info('BatigestService - Connection closed');
    }
  }

  /**
   * Récupère tous les devis clients avec filtres optionnels (support simulation)
   */
  async getDevisClients(filters?: {
    dateDebut?: Date;
    dateFin?: Date;
    statut?: string;
    clientCode?: string;
  }): Promise<BatigestDevis[]> {
    await this.connect();
    
    if (SIMULATION_MODE) {
      await simulateLatency(200, 400);
      
      let devis = [...simulatedDevis];
      
      // Appliquer les filtres sur les données simulées
      if (filters?.dateDebut) {
        devis = devis.filter(d => d.DATE_CREATION >= filters.dateDebut!);
      }
      
      if (filters?.dateFin) {
        devis = devis.filter(d => d.DATE_CREATION <= filters.dateFin!);
      }
      
      if (filters?.statut) {
        devis = devis.filter(d => d.STATUT === filters.statut);
      }
      
      if (filters?.clientCode) {
        devis = devis.filter(d => d.CLIENT_CODE === filters.clientCode);
      }
      
      return devis.sort((a, b) => b.DATE_CREATION.getTime() - a.DATE_CREATION.getTime());
    }
    
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
    
    const sql = (await import('mssql')).default;
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
    return result.recordset.map((record: unknown) => BatigestDevisSchema.parse(record));
  }

  /**
   * Récupère les ouvrages et leurs coefficients de marge (support simulation)
   */
  async getOuvragesEtCoefficients(): Promise<BatigestOuvrage[]> {
    await this.connect();
    
    if (SIMULATION_MODE) {
      await simulateLatency(150, 350);
      return [...simulatedOuvrages].sort((a, b) => {
        if (a.FAMILLE !== b.FAMILLE) return a.FAMILLE!.localeCompare(b.FAMILLE!);
        if (a.SOUS_FAMILLE !== b.SOUS_FAMILLE) return a.SOUS_FAMILLE!.localeCompare(b.SOUS_FAMILLE!);
        return a.CODE_OUVRAGE.localeCompare(b.CODE_OUVRAGE);
      });
    }
    
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
    return result.recordset.map((re: unknown)unknown) => BatigestOuvrageSchema.parse(record));
  }

  /**
   * Récupère l'état des facturations en cours (support simulation)
   */
  async getFacturationsEnCours(): Promise<BatigestFacture[]> {
    await this.connect();
    
    if (SIMULATION_MODE) {
      await simulateLatency(120, 280);
      return [...simulatedFactures]
        .filter(f => f.STATUT_REGLEMENT === 'NON_REGLE' || f.STATUT_REGLEMENT === 'PARTIELLEMENT_REGLE')
        .sort((a, b) => a.DATE_ECHEANCE.getTime() - b.DATE_ECHEANCE.getTime());
    }
    
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
    return result.recordset.map: unknown)unknown)unknown) => BatigestFactureSchema.parse(record));
  }

  /**
   * Synchronise un devis JLM avec Batigest (support simulation)
   */
  async syncDevisWithBatigest(jlmOfferId: string, batigestRef?: string): Promise<{
    synchronized: boolean;
    batigestData?: BatigestDevis;
    message: string;
  }> {
    return withErrorHandling(
    async () => {

      if (!batigestRef) {
        return {
          synchronized: false,
          message: 'Référence Batigest manquante pour la synchronisation'
        };
      }

      await this.connect();
      
      if (SIMULATION_MODE) {
        await simulateLatency(300, 600);
        
        // Recherche dans les données simulées
        const batigestData = simulatedDevis.find(d => 
          d.NUMERO_DEVIS === batigestRef || d.REFERENCE_AFFAIRE === batigestRef
        );
        
        if (!batigestData) {
          return {
            synchronized: false,
            message: `Aucun devis simulé trouvé avec la référence ${batigestRef}`
          };
        }
        
        return {
          synchronized: true,
          batigestData,
          message: `Synchronisation simulée réussie - Devis ${batigestData.NUMERO_DEVIS} (${batigestData.MONTANT_HT}€ HT)`
        };
      }
      
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
      
      const sql = (await import('mssql')).default;
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
      
    
    },
    {
      operation: 'parseInt',
      service: 'batigestService',
      metadata: {
                                                                                }
                                                                              });
  }

  /**
   * Génère les analytics de Business Intelligence (support simulation)
   */
  async generateAnalytics(period?: { startDate: Date; endDate: Date }): Promise<BatigestAnalytics> {
    await this.connect();
    
    if (SIMULATION_MODE) {
      await simulateLatency(400, 800);
      
      // Filtrer les données selon la période
      let devisPeriode = simulatedDevis;
      if (period) {
        devisPeriode = simulatedDevis.filter(d => 
          d.DATE_CREATION >= period.startDate && d.DATE_CREATION <= period.endDate
        );
      }
      
      // Calculs sur données simulées
      const caPrevu = devisPeriode
        .filter(d => d.STATUT === 'VALIDE' || d.STATUT === 'ACCEPTE')
        .reduce((sum, d) => sum + d.MONTANT_HT, 0);
      
      const caRealise = devisPeriode
        .filter(d => d.STATUT === 'ACCEPTE')
        .reduce((sum, d) => sum + d.MONTANT_HT * 0.8, 0); // 80% réalisé simulé
      
      // Coefficients par famille
      const familleStats = simulatedOuvrages.reduce((acc: unknown, ouvrage) => {
        const famille = ouvrage.FAMILLE || 'Non classé';
        if (!acc[famille]) {
          acc[famille] = { coefficients: [], famille };
        }
        acc[famille].coefficients.push(ouvrage.COEFFICIENT_MARGE);
        return acc;
      }, {});
      
      const coefficientsParFamille = Object.values(familleStat: unknown)unknown)unknown any) => {
        const coefficients = stat.coefficients;
        const moyenne = coefficients.reduce((a: number, b: number) => a + b, 0) / coefficients.length;
        const variance = coefficients.reduce((acc: number, val: number) => acc + Math.pow(val - moyenne, 2), 0) / coefficients.length;
        
        return {
          famille: stat.famille,
          coefficientMoyen: Number(moyenne.toFixed(2)),
          nombreElements: coefficients.length,
          ecartType: Number(Math.sqrt(variance).toFixed(2))
        };
      });
      
      // Données facturation
      const facturesEnCours = simulatedFactures.filter(f => 
        f.STATUT_REGLEMENT === 'NON_REGLE' || f.STATUT_REGLEMENT === 'PARTIELLEMENT_REGLE'
      );
      
      const now = new Date();
      const facturesEnRetard = facturesEnCours.filter(f => f.DATE_ECHEANCE < now);
      const retardMoyen = facturesEnRetard.length > 0 
        ? facturesEnRetard.reduce((sum, f) => sum + Math.floor((now.getTime() - f.DATE_ECHEANCE.getTime()) / (1000 * 60 * 60 * 24)), 0) / facturesEnRetard.length
        : 0;
      
      return {
        chiffreAffairesRealise: caRealise,
        chiffreAffairesPrevu: caPrevu,
        tauxConversionDevis: caPrevu > 0 ? (caRealise / caPrevu) * 100 : 0,
        margeReelleMoyenne: 26.8, // Marge moyenne simulée
        margePrevueMoyenne: 28.5, // Marge prévue simulée
        
        coefficientsParFamille,
        
        factuationEnCours: {
          montantTotal: facturesEnCours.reduce((sum, f) => sum + f.MONTANT_HT, 0),
          nombreFactures: facturesEnCours.length,
          retardMoyen: Math.floor(retardMoyen)
        },
        
        evolutionMarges: [
          { periode: '2024-01', margeReelle: 25.2, margePrevue: 27.0, ecart: -1.8 },
          { periode: '2024-02', margeReelle: 26.8, margePrevue: 28.5, ecart: -1.7 },
          { periode: '2024-03', margeReelle: 28.1, margePrevue: 29.0, ecart: -0.9 }
        ]
      };
    }
    
    // Code production (SQL Server)
    const caQuery = `
      SELECT 
        SUM(CASE WHEN f.STATUT_REGLEMENT = 'REGLE' THEN f.MONTANT_HT ELSE 0 END) as CA_REALISE,
        SUM(d.MONTANT_HT) as CA_PREVU
      FROM DEVIS d
      LEFT JOIN FACTURES f ON d.NUMERO_DEVIS = f.NUMERO_DEVIS
      WHERE d.STATUT IN ('VALIDE', 'ACCEPTE')
      ${period ? "AND d.DATE_CREATION BETWEEN @startDate AND @endDate" : ""}
    `;
    
    const sql = (await import('mssql')).default;
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
      
      coefficientsParFamille: coeffResult.re: unknown)unknown)unknownrow: any) => ({
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
   * Test de connectivité Batigest (avec support simulation)
   */
  async testConnection(): Promise<{ connected: boolean; message: string; mode?: string }> {
    return withErrorHandling(
    async () => {

      if (SIMULATION_MODE) {
        await simulateLatency(100, 300);
        return {
          connected: true,
          mode: 'simulation',
          message: `Connexion simulée OK - Test effectué le ${new Date().toLocaleString('fr-FR')}`
        };
      }
      
      await this.connect();
      
      const testQuery = "SELECT TOP 1 GETDATE() as TEST_DATE";
      const result = await this.pool!.request().query(testQuery);
      
      return {
        connected: true,
        mode: 'production',
        message: `Connexion OK - Test effectué le ${result.recordset[0].TEST_DATE}`
      };
    
    },
    {
      operation: 'parseInt',
      service: 'batigestService',
      metadata: {
                                                                                }
                                                                              });
  }

  /**
   * Obtient le prochain numéro de séquence pour les chantiers (mode réel uniquement)
   */
  private async getNextChantierSequence(): Promise<number> {
    const sql = (await import('mssql')).default;
    const year = new Date().getFullYear();
    const query = `
      SELECT ISNULL(MAX(CAST(RIGHT(CODE_CHANTIER, 4) AS INT)), 0) + 1 as NEXT_SEQUENCE
      FROM CHANTIERS
      WHERE CODE_CHANTIER LIKE 'CHT-${year}-%'
    `;
    
    const request = this.pool!.request();
    const result = await request.query(query);
    
    return result.recordset[0]?.NEXT_SEQUENCE || 1;
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