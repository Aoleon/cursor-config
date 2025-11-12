import type { Express } from "express";
import { z } from "zod";
import { batigestService } from "./batigestService";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { batigestIntegrations, batigestAnalytics, offers } from "../shared/schema";
import { isAuthenticated } from "./replitAuth";
import { asyncHandler, ValidationError, NotFoundError } from "./utils/error-handler";
import { logger } from "./utils/logger";

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
  app.get("/api/batigest/connection-test", isAuthenticated, asyncHandler(async (req, res) => {
    logger.info('[Batigest] Test connexion Batigest', { 
      userId: (req.user as unknown)?.id 
    });

    const result = await batigestService.testConnection();
    
    logger.info('[Batigest] Test connexion terminé', { 
      connected: result.connected 
    });

    res.json(result);
        }

                  }


                            }


                          }));

  /**
   * Synchronise un dossier d'offre avec Batigest
   */
  app.post("/api/batigest/sync-offer", isAuthenticated, asyncHandler(async (req, res) => {
    const validationResult = syncOfferSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError("Données de synchronisation invalides");
    }

    const { offerId, batigestRef } = validationResult.data;

    logger.info('[Batigest] Synchronisation offre Batigest', { 
      offerId, 
      batigestRef,
      userId: (req.uas unknown?.id 
    });

    // Vérifier que l'offre existe
    const offer = await db.select().from(offers).where(eq(offers.id, offerId)).limit(1);
    if (offer.length === 0) {
      throw new NotFoundError(`Dossier d'offre ${offerId} non trouvé`);
    }

    // Synchroniser avec Batigest
    const syncResult = await batigestService.syncDevisWithBatigest(offerId, batigestRef);

    if (!syncResult.synchronized) {
      throw new ValidationError(syncResult.message || "Échec de la synchronisation");
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

    logger.info('[Batigest] Offre synchronisée avec succès', { 
      offerId,
      integrationId: integration[0].id 
    });

    res.json({
      synchronized: true,
      integration: integration[0],
      batigestData: syncResult.batigestData,
      message: syncResult.message

          });
        }

                  }


                            }


                          }));

  /**
   * Récupère les devis clients depuis Batigest
   */
  app.get("/api/batigest/devis-clients", isAuthenticated, asyncHandler(async (req, res) => {
    const { startDate, endDate, statut, clientCode } = req.query;

    logger.info('[Batigest] Récupération devis clients', { 
      startDate, 
      endDate, 
      statut,
      userId: (ras unknown) as unknown)?.id 
    });

    const filters: unknown = {};
    
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
    
    logger.info('[Batigest] Devis clients récupérés', { 
      count: devisClients.length 
    });

    res.json({
      success: true,
      count: devisClients.length,
      devis: devisClients

          });
        }

                  }


                            }


                          }));

  /**
   * Récupère les coefficients de marge par famille
   */
  app.get("/api/batigest/coefficients-marges", isAuthenticated, asyncHandler(async (req, res) => {
    logger.info('[Batigest] Récupération coefficients marges', { 
      userIdas unknown)uas unknunknown)unknown)?.id 
    });

    const ouvrages = await batigestService.getOuvragesEtCoefficients();
    
    // Grouper par famille
    const coefficientsParFamille = ouvrages.reduce((acc: unknown, ouvrage) => {
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
    Object.values(coefficientsParFamille).forEach((groupe: unknown) => {
      const coefficients = groupe.ouvrages.ma(value: any) => o.COEFFICIENT_MARGE).filter((c: number) => c > 0);
      groupe.coefficientMoyen = coefficients.length > 0 
        ? coefficients.reduce((a: number, b: number) => a + b, 0) / coefficients.length 
        : 0;
    });

    logger.info('[Batigest] Coefficients récupérés', { 
      familles: Object.keys(coefficientsParFamille).length,
      totalOuvrages: ouvrages.length 
    });

    res.json({
      success: true,
      coefficientsParFamille: Object.values(coefficientsParFamille),
      totalOuvrages: ouvrages.length

          });
        }

                  }


                            }


                          }));

  /**
   * Récupère l'état des facturations en cours
   */
  app.get("/api/batigest/facturations-en-cours", isAuthenticated, asyncHandler(async (req, res) => {
    logger.info('[Batigest] Récupération facturations en cours', { 
      usas unknown)ras unknown)unknownr as any)?.id 
    });

    const factures = await batigestService.getFacturationsEnCours();
    
    const analyse = {
      nombreFactures: factures.length,
      montantTotal: factures.reduce((sum, f) => sum + f.MONTANT_HT, 0),
      montantEnRetard: factures
        .filter(f => new Date(f.DATE_ECHEANCE) < new Date())
        .reduce((sum, f) => sum + f.MONTANT_HT, 0),
      facturesParStatut: factures.reduce(: unknown, unknown, f) => {
        acc[f.STATUT_REGLEMENT] = (acc[f.STATUT_REGLEMENT] || 0) + 1;
        return acc;
      }, {}),
      factures: factures
    };

    logger.info('[Batigest] Facturations récupérées', { 
      nombreFactures: analyse.nombreFactures,
      montantTotal: analyse.montantTotal 
    });

    res.json({
      success: true,
      analyse

          });
        }

                  }


                            }


                          }));

  /**
   * Génère les analytics de Business Intelligence
   */
  app.post("/api/batigest/generate-analytics", isAuthenticated, asyncHandler(async (req, res) => {
    const validationResult = analyticsRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError("Paramètres d'analytics invalides");
    }

    const { startDate, endDate, periode } = validationResult.data;

    logger.info('[Batigest] Génération analytics', { 
      startDate, 
      endDate, 
      periode,
    as unknown)das unknown)unknown.user as any)?.id 
    });

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

    logger.info('[Batigest] Analytics générées avec succès', { 
      analyticsId: savedAnalytics[0].id,
      periode: periode || 'custom' 
    });

    res.json({
      success: true,
      analytics,
      saved: savedAnalytics[0]

          });
        }

                  }


                            }


                          }));

  /**
   * Récupère l'historique des analytics
   */
  app.get("/api/batigest/analytics-history", isAuthenticated, asyncHandler(async (req, res) => {
    const { periode, limit = '10' } = req.query;

    logger.info('[Batigest] Récupération historique analytics', { 
      periode, 
      limit,
as unknown)sas unknown)unknown(req.user as any)?.id 
    });

    const baseQuery = db.select().from(batigestAnalytics);
    
    const query = periode
      ? baseQuery.where(eq(batigestAnalytics.periode, periode as string))
      : baseQuery;

    const history = await query
      .orderBy(desc(batigestAnalytics.generatedAt))
      .limit(parseInt(limit as string));

    logger.info('[Batigest] Historique récupéré', { 
      count: history.length 
    });

    res.json({
      success: true,
      count: history.length,
      analytics: history

          });
        }

                  }


                            }


                          }));

  /**
   * Récupère toutes les intégrations Batigest
   */
  app.get("/api/batigest/integrations", isAuthenticated, asyncHandler(async (req, res) => {
    logger.info('[Batigest] Récupération intégrations',as unknown) as unknown)unknownId: (req.user as any)?.id 
    });

    const integrations = await db.select({
      integration: batigestIntegrations,
      offer: {
        id: offers.id,
        reference: offers.reference,
        client: offers.client,
        status: offers.status
      })
    .from(batigestIntegrations)
    .leftJoin(offers, eq(batigestIntegrations.offerId, offers.id))
    .orderBy(desc(batigestIntegrations.lastSyncAt));

    logger.info('[Batigest] Intégrations récupérées', { 
      count: integrations.length 
    });

    res.json({
      success: true,
      count: integrations.length,
      integrations

          });
        }

                  }


                            }


                          }));

  /**
   * Dashboard consolidé Batigest
   */
  app.get("/api/batigest/dashboard", isAuthenticated, asyncHandler(async (req, res) => {
    logger.info('[Batigest] Récupération dashboaas unknown)
as unknown)unknownuserId: (req.user as any)?.id 
    });

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

    logger.info('[Batigest] Dashboard récupéré', { 
      connected: connectionTest.connected 
    });

    res.json({
      success: true,
      dashboard

          });
        }

                  }


                            }


                          }));
}
