/**
 * Testing Module Routes
 * 
 * This module handles all testing and development-related routes including:
 * - Test data generation for Gantt planning
 * - Bug report submission with GitHub integration
 */

import { Router } from 'express';
import { withErrorHandling } from './utils/error-handler';
import type { Request, Response } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { asyncHandler, sendSuccess, createError } from '../../middleware/errorHandler';
import { validateBody } from '../../middleware/validation';
import { rateLimits } from '../../middleware/rate-limiter';
import { logger } from '../../utils/logger';
import type { IStorage } from '../../storage-poc';
import type { EventBus } from '../../eventBus';
import { insertBugReportSchema, type InsertBugReport, bugReports } from '@shared/schema';
import { db } from '../../db';

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Collecte automatique d'informations serveur pour le bug report
 */
async function collectServerInfo(): Promise<{
  serverLogs: string;
  version: string;
  environment: Record<string, string>;
  systemInfo: Record<string, unknown>;
  timestamp: string;
}> {
  return withErrorHandling(
    async () => {

    let serverLogs = '';
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);
      
      const logData = await execPromise('tail -n 100 /dev/null 2>/dev/null || echo "Logs serveur non disponibles"');
      serverLogs = logData.stdout || 'Logs serveur non disponibles';
    } catch (error) {
      logger.warn('Erreur lors de la collecte des logs serveur', { metadata: { error: error instanceof Error ? error.message : String(error) } });
    }
    },
    {
      operation: 'collectServerInfo',
      service: 'routes',
      metadata: {}
    }
    );
    return {
      serverLogs: 'Erreur lors de la collecte',
      version: process.version,
      environment: { NODE_ENV: process.env.NODE_ENV || 'unknown' },
      systemInfo: { error: 'Collecte impossible' },
      timestamp: new Date().toISOString()
    };
  }

/**
 * Intégration GitHub Issues API
 */
async function createGitHubIssue(bugReport: InsertBugReport, serverInfo: unknown): Promise<string | null> {
  return withErrorHandling(
    async () => {

    const githubToken = process.env.GITHUB_TOKEN;
    const repoOwner = process.env.GITHUB_REPO_OWNER || 'saxium-team';
    const repoName = process.env.GITHUB_REPO_NAME || 'saxium';

    if (!githubToken) {
      logger.warn('[Testing] GITHUB_TOKEN manquant - issue non créée');
      return null;
    }

    const issueTitle = `[${bugReport.type.toUpperCase()}] ${bugReport.title}`;
    
    const issueBody = `**Type:** ${bugReport.type} | **Priorité:** ${bugReport.priority}

**Description:**
${bugReport.description}

**Étapes pour reproduire:**
${bugReport.stepsToReproduce || 'Non spécifiées'}

**Comportement attendu:**
${bugReport.expectedBehavior || 'Non spécifié'}

**Comportement réel:**
${bugReport.actualBehavior || 'Non spécifié'}

---
**Informations techniques automatiques:**
- URL: ${bugReport.url}
- User Agent: ${bugReport.userAgent}
- Utilisateur: ${bugReport.userId || 'Anonyme'} (${bugReport.userRole || 'Non défini'})
- Timestamp: ${bugReport.timestamp}

**Logs Console (50 dernières entrées):**
\`\`\`
${(bugReport.consoleLogs || []).slice(-50).join('\n')}
\`\`\`

**Logs Serveur (100 dernières lignes):**
\`\`\`
${serverInfo.serverLogs}
\`\`\`

**Informations Système:**
- Node.js: ${serverInfo.version}
- Uptime: ${serverInfo.systemInfo.uptime}
- Mémoire: ${JSON.stringify(serverInfo.systemInfo.memory, null, 2)}
- Environnement: ${serverInfo.environment.NODE_ENV}
- Plateforme: ${serverInfo.environment.PLATFORM} (${serverInfo.environment.ARCH})`;

    const labels = [
      `type:${bugReport.type}`,
      `priority:${bugReport.priority}`,
      'bug-report',
      'automated'
    ];

    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Saxium-Bug-Reporter/1.0'
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: labels
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Testing] Erreur GitHub API', {
        metadata: { 
          context: 'bug_report_system',
          function: 'createGitHubIssue',
          status: response.status,
          errorText,
          repo: `${repoOwner}/${repoName}`,
          issueTitle: bugReport.title
        });
      return null;
    }

    const issueData = await response.json();
    logger.info('[Testing] Issue GitHub créée', { metadata: { issueUrl: issueData.html_url 
            }
 
            });
    return issueData.html_url;

  
    },
    {
      operation: 'collectServerInfo',
      service: 'routes',
      metadata: {}
    } );
    return null;
  }

// ========================================
// TESTING ROUTER FACTORY
// ========================================

export function createTestingRouter(storage: IStorage, eventBus: EventBus): Router {
  const router = Router();

  // ========================================
  // TEST DATA ROUTES
  // ========================================

  /**
   * POST /api/test-data/planning
   * Create test data for Gantt planning testing
   */
  router.post('/api/test-data/planning',
    isAuthenticated,
    rateLimits.creation,
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Testing] Création données test planning Gantt', { metadata: {
          route: '/api/test-data/planning',
          method: 'POST',
          userId: req.user?.id

                      }


                                                                                                                                                                                                                                                                                          });

      const testProjects = [
        {
          name: "École Versailles",
          client: "Mairie de Versailles", 
          location: "Versailles (78)",
          status: "planification" as const,
          startDate: new Date("2025-01-15"),
          endDate: new Date("2025-05-20"),
          responsibleUserId: "test-user-1",
          budget: "85000.00"
        },
        {
          name: "Résidence Sandettie", 
          client: "Promoteur Immobilier",
          location: "Calais (62)",
          status: "chantier" as const,
          startDate: new Date("2025-02-01"),
          endDate: new Date("2025-06-15"),
          responsibleUserId: "test-user-1", 
          budget: "120000.00"
        }
      ];

      const createdProjects = [];
      for (const projectData of testProjects) {
        const project = await storage.createProject(projectData);
        createdProjects.push(project);
      }

      const projectId = createdProjects[0].id;

      const tasks = [
        {
          projectId: projectId,
          name: "Phase d'Étude",
          description: "Diagnostic des menuiseries existantes et conception des nouvelles installations",
          status: "termine" as const,
          priority: "haute" as const,
          startDate: new Date(2025, 0, 15),
          endDate: new Date(2025, 0, 25),
          assignedUserId: "user-be-1",
          progress: 100,
        },
        {
          projectId: projectId,
          name: "Planification Détaillée",
          description: "Organisation des travaux pendant les vacances scolaires",
          status: "termine" as const,
          priority: "haute" as const,
          startDate: new Date(2025, 0, 26),
          endDate: new Date(2025, 1, 5),
          assignedUserId: "user-be-2",
          progress: 100,
        },
        {
          projectId: projectId,
          name: "Approvisionnement",
          description: "Commande et livraison des menuiseries sur mesure",
          status: "en_cours" as const,
          priority: "moyenne" as const,
          startDate: new Date(2025, 1, 6),
          endDate: new Date(2025, 2, 1),
          assignedUserId: "user-be-1",
          progress: 60,
        },
        {
          projectId: projectId,
          name: "Travaux Bâtiment Principal",
          description: "Remplacement des fenêtres des salles de classe",
          status: "a_faire" as const,
          priority: "haute" as const,
          startDate: new Date(2025, 2, 2),
          endDate: new Date(2025, 3, 15),
          assignedUserId: "user-be-2",
          progress: 0,
        },
        {
          projectId: projectId,
          name: "Travaux Préau",
          description: "Installation des portes coulissantes du préau",
          status: "a_faire" as const,
          priority: "moyenne" as const,
          startDate: new Date(2025, 3, 16),
          endDate: new Date(2025, 4, 5),
          assignedUserId: "user-be-1",
          progress: 0,
        },
        {
          projectId: projectId,
          name: "Finitions et Réception",
          description: "Contrôles qualité et réception des travaux",
          status: "a_faire" as const,
          priority: "faible" as const,
          startDate: new Date(2025, 4, 6),
          endDate: new Date(2025, 4, 20),
          assignedUserId: "user-be-2",
          progress: 0,
        },
      ];

      const createdTasks = [];
      for (const taskData of tasks) {
        const task = await storage.createProjectTask(taskData);
        createdTasks.push(task);
      }

      const project2Id = createdProjects[1].id;
      const project2Tasks = [
        {
          projectId: project2Id,
          name: "Études Techniques",
          description: "Validation technique et conception",
          status: "termine" as const,
          startDate: new Date(2025, 1, 1),
          endDate: new Date(2025, 1, 15),
          assignedUserId: "test-user-1",
          isJalon: true
        },
        {
          projectId: project2Id,
          name: "Commande Matériaux",
          description: "Commande des menuiseries",
          status: "en_cours" as const,
          startDate: new Date(2025, 1, 16),
          endDate: new Date(2025, 2, 15),
          assignedUserId: "test-user-1",
          isJalon: true
        },
        {
          projectId: project2Id,
          name: "Installation Chantier",
          description: "Pose des menuiseries",
          status: "a_faire" as const,
          startDate: new Date(2025, 2, 16),
          endDate: new Date(2025, 4, 30),
          assignedUserId: "test-user-1",
          isJalon: true
        }
      ];

      const createdTasks2 = [];
      for (const taskData of project2Tasks) {
        const task = await storage.createProjectTask(taskData);
        createdTasks2.push(task);
      }

      logger.info('[Testing] Données planning test créées', { metadata: { 
          projectsCreated: createdProjects.length, 
          tasksCreated: createdTasks.length + createdTasks2.length 
              }
 
            });

      res.json({
        projects: createdProjects,
        tasks: [...createdTasks, ...createdTasks2],
        message: "Données de test complètes créées pour le planning Gantt"
      });
          }
        })
      );

  // ========================================
  // BUG REPORT ROUTES
  // ========================================

  /**
   * POST /api/bug-reports
   * Submit a bug report with GitHub integration
   */
  router.post('/api/bug-reports',
    isAuthenticated,
    rateLimits.creation,
    validateBody(insertBugReportSchema),
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('[Testing] Création nouveau rapport de bug', { metadata: {
          route: '/api/bug-reports',
          method: 'POST',
          userId: req.user?.id

                      }


                                                                                                                                                                                                                                                                                          });
      
      const serverInfo = await collectServerInfo();
      
      const bugReportData: InsertBugReport = {
        ...req.body,
        url: req.body.url || req.get('referer') || 'Unknown',
        userAgent: req.get('user-agent') || 'Unknown',
        userId: req.user?.id || null,
        userRole: req.user?.role || null,
        timestamp: new Date(),
        consoleLogs: req.body.consoleLogs || []
      };

      return withErrorHandling(
    async () => {

        logger.info('[Testing] Insertion rapport de bug en base', { metadata: {
            type: bugReportData.type,
            priority: bugReportData.priority

              });
        
        const [savedBugReport] = await db.insert(bugReports).values(bugReportData).returning();
        
        logger.info('[Testing] Rapport sauvegardé en base', { metadata: { bugReportId: savedBugReport.id 
                }
 
            });

        let githubIssueUrl: string | null = null;
        try {
          githubIssueUrl = await createGitHubIssue(bugReportData, serverInfo);
        
    },
    {
      operation: 'collectServerInfo',
service: 'routes',;
      metadata: {}
    } );
              }

        logger.info('[Testing] Rapport créé', { metadata: {
            bugReportId: savedBugReport.id,
            type: savedBugReport.type,
            priority: savedBugReport.priority,
                  userId: savedBugReport.userId,
            githubCreated: !!githubIssueUrl,
            serverInfoCollected: !!serverInfo.timestamp
                }

            });

        const responseMessage = githubIssueUrl 
          ? 'Rapport de bug créé et issue GitHub générée avec succès'
          : 'Rapport de bug créé avec succès (issue GitHub non générée)';

        sendSuccess(res, {
          id: savedBugReport.id,
          githubIssueUrl: githubIssueUrl || undefined,
          message: responseMessage
        }, responseMessage);

      } catch (error) {
        logger.error('[Testing] Erreur création rapport', { metadata: { 
            route: '/api/bug-reports',
            method: 'POST',
            bugReportType: req.body.type,
            bugReportPriority: req.body.priority,
                  error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
                  userId: req.user?.id
                }

            });
        throw createError.database('Erreur lors de la création du rapport de bug');
            }

                      }


                                }


                              }));

  logger.info('[Testing] Routes Testing montées avec succès', { metadata: {

      module: 'Testing',
      routes: 2
      }
    });

  return router;
}
