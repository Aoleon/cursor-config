import type { Express } from "express";
import { z } from "zod";
import { batigestService } from "./batigestService";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { batigestIntegrations, batigestAnalytics, offers } from "../shared/schema";
import { isAuthenticated } from "./replitAuth";

// Schémas de validation pour les requêtes
const syncOfferSchema = z.object({
  offerId: z.string(),
  batigestRef: z.string().optional(),
});

const analyticsRequestSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  periode: z.enum(['mensuel', 'trimestriel', 'annuel']).optional(),
});

export function registerBatigestRoutes(app: Express) {
  
  /**
   * Test de connectivité avec Sage Batigest
   */
  app.get("/api/batigest/connection-test", isAuthenticated, async (req, res) => {
    try {
      const result = await batigestService.testConnection();
      res.json(result);
    } catch (error) {
      console.error("Erreur test connexion Batigest:", error);
      res.status(500).json({ 
        connected: false, 
        message: "Erreur lors du test de connexion" 
      });
    }
  });

  /**
   * Synchronise un dossier d'offre avec Batigest
   */
  app.post("/api/batigest/sync-offer", isAuthenticated, async (req, res) => {
    try {
      const { offerId, batigestRef } = syncOfferSchema.parse(req.body);

      // Vérifier que l'offre existe
      const offer = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
      if (offer.length === 0) {
        return res.status(404).json({ error: "Dossier d'offre non trouvé" });
      }

      // Synchroniser avec Batigest
      const syncResult = await batigestService.syncDevisWithBatigest(offerId, batigestRef);

      if (!syncResult.synchronized) {
        return res.status(400).json({
          synchronized: false,
          message: syncResult.message
        });
      }

      // Vérifier si une intégration existe déjà pour cette offre
      const existingIntegration = await db.select().from(batigestIntegrations)
        .where(eq(batigestIntegrations.offerId, offerId)).limit(1);

      let integration;
      
      if (existingIntegration.length > 0) {
        // Mettre à jour l'intégration existante
        integration = await db.update(batigestIntegrations)
          .set({
            batigestRef: batigestRef || '',
            numeroDevis: syncResult.batigestData?.NUMERO_DEVIS || '',
            montantBatigest: syncResult.batigestData?.MONTANT_HT?.toString() || null,
            tauxMarge: syncResult.batigestData?.TAUX_MARGE?.toString() || null,
            statutBatigest: syncResult.batigestData?.STATUT || '',
            lastSyncAt: new Date(),
            syncStatus: 'synced',
          })
          .where(eq(batigestIntegrations.offerId, offerId))
          .returning();
      } else {
        // Créer une nouvelle intégration
        integration = await db.insert(batigestIntegrations).values({
          offerId,
          batigestRef: batigestRef || '',
          numeroDevis: syncResult.batigestData?.NUMERO_DEVIS || '',
          montantBatigest: syncResult.batigestData?.MONTANT_HT?.toString() || null,
          tauxMarge: syncResult.batigestData?.TAUX_MARGE?.toString() || null,
          statutBatigest: syncResult.batigestData?.STATUT || '',
          lastSyncAt: new Date(),
          syncStatus: 'synced',
        }).returning();
      }

      res.json({
        synchronized: true,
        integration: integration[0],
        batigestData: syncResult.batigestData,
        message: syncResult.message
      });

    } catch (error) {
      console.error("Erreur synchronisation offre:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Données invalides",
          details: error.errors
        });
      }

      res.status(500).json({
        synchronized: false,
        message: "Erreur lors de la synchronisation"
      });
    }
  });

  /**
   * Récupère les devis clients depuis Batigest
   */
  app.get("/api/batigest/devis-clients", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, statut, clientCode } = req.query;

      const filters: any = {};
      
      if (startDate) {
        filters.dateDebut = new Date(startDate as string);
      }
      
      if (endDate) {
        filters.dateFin = new Date(endDate as string);
      }
      
      if (statut) {
        filters.statut = statut as string;
      }
      
      if (clientCode) {
        filters.clientCode = clientCode as string;
      }

      const devisClients = await batigestService.getDevisClients(filters);
      
      res.json({
        success: true,
        count: devisClients.length,
        devis: devisClients
      });

    } catch (error) {
      console.error("Erreur récupération devis clients:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des devis clients"
      });
    }
  });

  /**
   * Récupère les coefficients de marge par famille
   */
  app.get("/api/batigest/coefficients-marges", isAuthenticated, async (req, res) => {
    try {
      const ouvrages = await batigestService.getOuvragesEtCoefficients();
      
      // Grouper par famille
      const coefficientsParFamille = ouvrages.reduce((acc: any, ouvrage) => {
        const famille = ouvrage.FAMILLE || 'Non classé';
        
        if (!acc[famille]) {
          acc[famille] = {
            famille,
            ouvrages: [],
            coefficientMoyen: 0,
            nombreElements: 0
          };
        }
        
        acc[famille].ouvrages.push(ouvrage);
        acc[famille].nombreElements++;
        
        return acc;
      }, {});

      // Calculer les moyennes
      Object.values(coefficientsParFamille).forEach((groupe: any) => {
        const coefficients = groupe.ouvrages.map((o: any) => o.COEFFICIENT_MARGE).filter((c: number) => c > 0);
        groupe.coefficientMoyen = coefficients.length > 0 
          ? coefficients.reduce((a: number, b: number) => a + b, 0) / coefficients.length 
          : 0;
      });

      res.json({
        success: true,
        coefficientsParFamille: Object.values(coefficientsParFamille),
        totalOuvrages: ouvrages.length
      });

    } catch (error) {
      console.error("Erreur récupération coefficients:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des coefficients de marge"
      });
    }
  });

  /**
   * Récupère l'état des facturations en cours
   */
  app.get("/api/batigest/facturations-en-cours", isAuthenticated, async (req, res) => {
    try {
      const factures = await batigestService.getFacturationsEnCours();
      
      const analyse = {
        nombreFactures: factures.length,
        montantTotal: factures.reduce((sum, f) => sum + f.MONTANT_HT, 0),
        montantEnRetard: factures
          .filter(f => new Date(f.DATE_ECHEANCE) < new Date())
          .reduce((sum, f) => sum + f.MONTANT_HT, 0),
        facturesParStatut: factures.reduce((acc: any, f) => {
          acc[f.STATUT_REGLEMENT] = (acc[f.STATUT_REGLEMENT] || 0) + 1;
          return acc;
        }, {}),
        factures: factures
      };

      res.json({
        success: true,
        analyse
      });

    } catch (error) {
      console.error("Erreur récupération facturations:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des facturations"
      });
    }
  });

  /**
   * Génère les analytics de Business Intelligence
   */
  app.post("/api/batigest/generate-analytics", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, periode } = analyticsRequestSchema.parse(req.body);

      const period = startDate && endDate ? {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      } : undefined;

      const analytics = await batigestService.generateAnalytics(period);

      // Sauvegarder en base pour historique
      const savedAnalytics = await db.insert(batigestAnalytics).values({
        periode: periode || 'custom',
        chiffreAffairesRealise: analytics.chiffreAffairesRealise.toString(),
        chiffreAffairesPrevu: analytics.chiffreAffairesPrevu.toString(),
        tauxConversion: analytics.tauxConversionDevis.toString(),
        margeReelleMoyenne: analytics.margeReelleMoyenne.toString(),
        margePrevueMoyenne: analytics.margePrevueMoyenne.toString(),
        nombreDevis: analytics.coefficientsParFamille.reduce((sum, c) => sum + c.nombreElements, 0),
        nombreFactures: analytics.factuationEnCours.nombreFactures,
        dataJson: analytics
      }).returning();

      res.json({
        success: true,
        analytics,
        saved: savedAnalytics[0]
      });

    } catch (error) {
      console.error("Erreur génération analytics:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Paramètres invalides",
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        message: "Erreur lors de la génération des analytics"
      });
    }
  });

  /**
   * Récupère l'historique des analytics
   */
  app.get("/api/batigest/analytics-history", isAuthenticated, async (req, res) => {
    try {
      const { periode, limit = '10' } = req.query;

      const baseQuery = db.select().from(batigestAnalytics);
      
      const query = periode
        ? baseQuery.where(eq(batigestAnalytics.periode, periode as string))
        : baseQuery;

      const history = await query
        .orderBy(desc(batigestAnalytics.generatedAt))
        .limit(parseInt(limit as string));

      res.json({
        success: true,
        count: history.length,
        analytics: history
      });

    } catch (error) {
      console.error("Erreur récupération historique analytics:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération de l'historique"
      });
    }
  });

  /**
   * Récupère toutes les intégrations Batigest
   */
  app.get("/api/batigest/integrations", isAuthenticated, async (req, res) => {
    try {
      const integrations = await db.select({
        integration: batigestIntegrations,
        offer: {
          id: offers.id,
          reference: offers.reference,
          client: offers.client,
          status: offers.status
        }
      })
      .from(batigestIntegrations)
      .leftJoin(offers, eq(batigestIntegrations.offerId, offers.id))
      .orderBy(desc(batigestIntegrations.lastSyncAt));

      res.json({
        success: true,
        count: integrations.length,
        integrations
      });

    } catch (error) {
      console.error("Erreur récupération intégrations:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des intégrations"
      });
    }
  });

  /**
   * Dashboard consolidé Batigest
   */
  app.get("/api/batigest/dashboard", isAuthenticated, async (req, res) => {
    try {
      // Test de connexion (sans accès aux tables pour le POC)
      const connectionTest = await batigestService.testConnection();
      
      const dashboard = {
        connectionStatus: connectionTest,
        integrationArchitecture: {
          serviceCreated: true,
          routesConfigured: true,
          databaseSchemaReady: true,
          sqlServerConnection: connectionTest.connected
        },
        features: {
          devisSync: "Disponible",
          coefficientsAnalysis: "Disponible", 
          billingTracking: "Disponible",
          businessIntelligence: "Disponible"
        },
        nextSteps: [
          "Configurer les variables d'environnement Batigest en production",
          "Établir la connexion SQL Server avec la base Sage Batigest",
          "Tester la synchronisation d'un premier devis"
        ],
        lastUpdate: new Date()
      };

      res.json({
        success: true,
        dashboard
      });

    } catch (error) {
      console.error("Erreur dashboard Batigest:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération du dashboard"
      });
    }
  });
}