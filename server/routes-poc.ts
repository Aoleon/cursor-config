import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { 
  insertUserSchema, insertAoSchema, insertOfferSchema, insertProjectSchema, 
  insertProjectTaskSchema, insertSupplierRequestSchema, insertTeamResourceSchema, insertBeWorkloadSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Return mock user for testing
      const mockUser = {
        id: "test-user-1",
        email: "sylvie.be@jlm-menuiserie.fr",
        firstName: "Sylvie",
        lastName: "Martin",
        role: "responsable_be",
        profileImageUrl: null
      };
      res.json(mockUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

// ========================================
// USER ROUTES - Gestion utilisateurs POC
// ========================================

app.get("/api/users", async (req, res) => {
  try {
    const users = await storage.getUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// ========================================
// AO ROUTES - Base pour éviter double saisie
// ========================================

app.get("/api/aos", async (req, res) => {
  try {
    const aos = await storage.getAos();
    res.json(aos);
  } catch (error) {
    console.error("Error fetching AOs:", error);
    res.status(500).json({ message: "Failed to fetch AOs" });
  }
});

app.get("/api/aos/:id", async (req, res) => {
  try {
    const ao = await storage.getAo(req.params.id);
    if (!ao) {
      return res.status(404).json({ message: "AO not found" });
    }
    res.json(ao);
  } catch (error) {
    console.error("Error fetching AO:", error);
    res.status(500).json({ message: "Failed to fetch AO" });
  }
});

app.post("/api/aos", async (req, res) => {
  try {
    const validatedData = insertAoSchema.parse(req.body);
    const ao = await storage.createAo(validatedData);
    res.status(201).json(ao);
  } catch (error) {
    console.error("Error creating AO:", error);
    res.status(500).json({ message: "Failed to create AO" });
  }
});

// ========================================
// OFFER ROUTES - Cœur du POC (Dossiers d'Offre & Chiffrage)
// ========================================

app.get("/api/offers", async (req, res) => {
  try {
    const { search, status } = req.query;
    const offers = await storage.getOffers(
      search as string, 
      status as string
    );
    res.json(offers);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(500).json({ message: "Failed to fetch offers" });
  }
});

app.get("/api/offers/:id", async (req, res) => {
  try {
    const offer = await storage.getOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    res.json(offer);
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({ message: "Failed to fetch offer" });
  }
});

app.post("/api/offers", async (req, res) => {
  try {
    // Convertir les dates string en objets Date si elles sont présentes
    const processedData = {
      ...req.body,
      dateRenduAO: req.body.dateRenduAO ? new Date(req.body.dateRenduAO) : undefined,
      dateAcceptationAO: req.body.dateAcceptationAO ? new Date(req.body.dateAcceptationAO) : undefined,
      demarragePrevu: req.body.demarragePrevu ? new Date(req.body.demarragePrevu) : undefined,
      deadline: req.body.deadline ? new Date(req.body.deadline) : undefined,
      // Convertir les chaînes numériques en decimals
      montantEstime: req.body.montantEstime ? req.body.montantEstime.toString() : undefined,
      prorataEventuel: req.body.prorataEventuel ? req.body.prorataEventuel.toString() : undefined,
      beHoursEstimated: req.body.beHoursEstimated ? req.body.beHoursEstimated.toString() : undefined,
    };

    const validatedData = insertOfferSchema.parse(processedData);
    const offer = await storage.createOffer(validatedData);
    res.status(201).json(offer);
  } catch (error) {
    console.error("Error creating offer:", error);
    if (error.name === 'ZodError') {
      res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    } else {
      res.status(500).json({ message: "Failed to create offer" });
    }
  }
});

app.patch("/api/offers/:id", async (req, res) => {
  try {
    const partialData = insertOfferSchema.partial().parse(req.body);
    const offer = await storage.updateOffer(req.params.id, partialData);
    res.json(offer);
  } catch (error) {
    console.error("Error updating offer:", error);
    res.status(500).json({ message: "Failed to update offer" });
  }
});

// Transformer une offre signée en projet
app.post("/api/offers/:id/convert-to-project", async (req, res) => {
  try {
    const offer = await storage.getOffer(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    if (offer.status !== "signe") {
      return res.status(400).json({ message: "Only signed offers can be converted to projects" });
    }

    // Créer le projet basé sur l'offre
    const projectData = {
      offerId: offer.id,
      name: `Projet ${offer.client} - ${offer.location}`,
      client: offer.client,
      location: offer.location,
      status: "etude" as const,
      budget: offer.montantFinal || offer.montantEstime,
      responsibleUserId: offer.responsibleUserId,
      startDate: new Date(),
      endDate: null,
      description: `Projet créé automatiquement à partir de l'offre ${offer.reference}`,
    };

    const project = await storage.createProject(projectData);

    // Mettre à jour le statut de l'offre
    await storage.updateOffer(offer.id, { status: "transforme_en_projet" });

    // Créer les tâches de base du projet (5 étapes)
    const baseTasks = [
      {
        projectId: project.id,
        name: "Phase d'Étude",
        description: "Finalisation des études techniques",
        status: "en_cours" as const,
        priority: "haute" as const,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 jours
        assignedUserId: offer.responsibleUserId,
      },
      {
        projectId: project.id,
        name: "Planification",
        description: "Planification des ressources et du planning",
        status: "a_faire" as const,
        priority: "moyenne" as const,
        startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // +8 jours
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // +14 jours
      },
      {
        projectId: project.id,
        name: "Approvisionnement",
        description: "Commande et réception des matériaux",
        status: "a_faire" as const,
        priority: "moyenne" as const,
        startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // +15 jours
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 jours
      },
      {
        projectId: project.id,
        name: "Chantier",
        description: "Pose et installation sur site",
        status: "a_faire" as const,
        priority: "haute" as const,
        startDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000), // +31 jours
        endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // +45 jours
      },
      {
        projectId: project.id,
        name: "SAV et Finalisation",
        description: "Service après-vente et finalisation",
        status: "a_faire" as const,
        priority: "faible" as const,
        startDate: new Date(Date.now() + 46 * 24 * 60 * 60 * 1000), // +46 jours
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // +60 jours
      },
    ];

    // Créer toutes les tâches
    for (const taskData of baseTasks) {
      await storage.createProjectTask(taskData);
    }

    res.status(201).json({ 
      project, 
      message: "Offer successfully converted to project with base tasks created" 
    });
  } catch (error) {
    console.error("Error converting offer to project:", error);
    res.status(500).json({ message: "Failed to convert offer to project" });
  }
});

app.delete("/api/offers/:id", async (req, res) => {
  try {
    await storage.deleteOffer(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ message: "Failed to delete offer" });
  }
});

// Validation jalon Fin d'études (spécifique POC)
app.patch("/api/offers/:id/validate-studies", async (req, res) => {
  try {
    const { finEtudesValidatedAt, status } = req.body;
    const offer = await storage.updateOffer(req.params.id, {
      finEtudesValidatedAt: finEtudesValidatedAt ? new Date(finEtudesValidatedAt) : new Date(),
      finEtudesValidatedBy: 'user-be-1', // TODO: Use real auth when available
      status: status || 'fin_etudes_validee'
    });
    res.json(offer);
  } catch (error) {
    console.error("Error validating studies:", error);
    res.status(500).json({ message: "Failed to validate studies" });
  }
});

// ========================================
// PROJECT ROUTES - 5 étapes POC
// ========================================

app.get("/api/projects", async (req, res) => {
  try {
    const projects = await storage.getProjects();
    res.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const validatedData = insertProjectSchema.parse(req.body);
    const project = await storage.createProject(validatedData);
    res.status(201).json(project);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Failed to create project" });
  }
});

app.patch("/api/projects/:id", async (req, res) => {
  try {
    const partialData = insertProjectSchema.partial().parse(req.body);
    const project = await storage.updateProject(req.params.id, partialData);
    res.json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
});

// ========================================
// PROJECT TASK ROUTES - Planning partagé
// ========================================

app.get("/api/projects/:projectId/tasks", async (req, res) => {
  try {
    const tasks = await storage.getProjectTasks(req.params.projectId);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching project tasks:", error);
    res.status(500).json({ message: "Failed to fetch project tasks" });
  }
});

app.post("/api/projects/:projectId/tasks", async (req, res) => {
  try {
    // Convertir les dates string en objets Date
    const taskData = {
      ...req.body,
      projectId: req.params.projectId,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      progress: req.body.progress || 0
    };
    
    const validatedData = insertProjectTaskSchema.parse(taskData);
    const task = await storage.createProjectTask(validatedData);
    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating project task:", error);
    res.status(500).json({ message: "Failed to create project task" });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const partialData = insertProjectTaskSchema.partial().parse(req.body);
    const task = await storage.updateProjectTask(req.params.id, partialData);
    res.json(task);
  } catch (error) {
    console.error("Error updating project task:", error);
    res.status(500).json({ message: "Failed to update project task" });
  }
});

// Récupérer toutes les tâches pour la timeline
app.get("/api/tasks/all", async (req, res) => {
  try {
    const allTasks = [];
    const projects = await storage.getProjects();
    
    for (const project of projects) {
      const tasks = await storage.getProjectTasks(project.id);
      allTasks.push(...tasks);
    }
    
    res.json(allTasks);
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    res.status(500).json({ message: "Failed to fetch all tasks" });
  }
});

// Route pour créer des tâches de test pour le projet École Versailles
app.post("/api/test-data/tasks", async (req, res) => {
  try {
    // Utiliser le projet "École Versailles" existant (project-2)
    const projectId = "project-2";

    // Créer des tâches directement dans la base de données
    const tasks = [
      {
        projectId: projectId,
        name: "Phase d'Étude",
        description: "Diagnostic des menuiseries existantes et conception des nouvelles installations",
        status: "termine" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 0, 15), // 15 janvier 2025
        endDate: new Date(2025, 0, 25), // 25 janvier 2025
        assignedUserId: "user-be-1",
        progress: 100,
      },
      {
        projectId: projectId,
        name: "Planification Détaillée",
        description: "Organisation des travaux pendant les vacances scolaires",
        status: "termine" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 0, 26), // 26 janvier 2025
        endDate: new Date(2025, 1, 5), // 5 février 2025
        assignedUserId: "user-be-2",
        progress: 100,
      },
      {
        projectId: projectId,
        name: "Approvisionnement",
        description: "Commande et livraison des menuiseries sur mesure",
        status: "en_cours" as const,
        priority: "moyenne" as const,
        startDate: new Date(2025, 1, 6), // 6 février 2025
        endDate: new Date(2025, 2, 1), // 1 mars 2025
        assignedUserId: "user-be-1",
        progress: 60,
      },
      {
        projectId: projectId,
        name: "Travaux Bâtiment Principal",
        description: "Remplacement des fenêtres des salles de classe",
        status: "a_faire" as const,
        priority: "haute" as const,
        startDate: new Date(2025, 2, 2), // 2 mars 2025
        endDate: new Date(2025, 3, 15), // 15 avril 2025
        assignedUserId: "user-be-2",
        progress: 0,
      },
      {
        projectId: projectId,
        name: "Travaux Préau",
        description: "Installation des portes coulissantes du préau",
        status: "a_faire" as const,
        priority: "moyenne" as const,
        startDate: new Date(2025, 3, 16), // 16 avril 2025
        endDate: new Date(2025, 4, 5), // 5 mai 2025
        assignedUserId: "user-be-1",
        progress: 0,
      },
      {
        projectId: projectId,
        name: "Finitions et Réception",
        description: "Contrôles qualité et réception des travaux",
        status: "a_faire" as const,
        priority: "faible" as const,
        startDate: new Date(2025, 4, 6), // 6 mai 2025
        endDate: new Date(2025, 4, 20), // 20 mai 2025
        assignedUserId: "user-be-2",
        progress: 0,
      },
    ];

    // Créer toutes les tâches directement
    const createdTasks = [];
    for (const taskData of tasks) {
      const task = await storage.createProjectTask(taskData);
      createdTasks.push(task);
    }

    res.json({
      projectId: projectId,
      tasks: createdTasks,
      message: "Tâches de test créées avec succès pour École Versailles"
    });
  } catch (error) {
    console.error("Error creating test tasks:", error);
    res.status(500).json({ message: "Failed to create test tasks" });
  }
});

// ========================================
// SUPPLIER REQUEST ROUTES - Demandes prix simplifiées
// ========================================

app.get("/api/supplier-requests", async (req, res) => {
  try {
    const { offerId } = req.query;
    const requests = await storage.getSupplierRequests(offerId as string);
    res.json(requests);
  } catch (error) {
    console.error("Error fetching supplier requests:", error);
    res.status(500).json({ message: "Failed to fetch supplier requests" });
  }
});

app.post("/api/supplier-requests", async (req, res) => {
  try {
    const validatedData = insertSupplierRequestSchema.parse(req.body);
    const request = await storage.createSupplierRequest(validatedData);
    res.status(201).json(request);
  } catch (error) {
    console.error("Error creating supplier request:", error);
    res.status(500).json({ message: "Failed to create supplier request" });
  }
});

app.patch("/api/supplier-requests/:id", async (req, res) => {
  try {
    const partialData = insertSupplierRequestSchema.partial().parse(req.body);
    const request = await storage.updateSupplierRequest(req.params.id, partialData);
    res.json(request);
  } catch (error) {
    console.error("Error updating supplier request:", error);
    res.status(500).json({ message: "Failed to update supplier request" });
  }
});

// ========================================
// TEAM RESOURCE ROUTES - Gestion équipes simplifiée
// ========================================

app.get("/api/team-resources", async (req, res) => {
  try {
    const { projectId } = req.query;
    const resources = await storage.getTeamResources(projectId as string);
    res.json(resources);
  } catch (error) {
    console.error("Error fetching team resources:", error);
    res.status(500).json({ message: "Failed to fetch team resources" });
  }
});

app.post("/api/team-resources", async (req, res) => {
  try {
    const validatedData = insertTeamResourceSchema.parse(req.body);
    const resource = await storage.createTeamResource(validatedData);
    res.status(201).json(resource);
  } catch (error) {
    console.error("Error creating team resource:", error);
    res.status(500).json({ message: "Failed to create team resource" });
  }
});

app.patch("/api/team-resources/:id", async (req, res) => {
  try {
    const partialData = insertTeamResourceSchema.partial().parse(req.body);
    const resource = await storage.updateTeamResource(req.params.id, partialData);
    res.json(resource);
  } catch (error) {
    console.error("Error updating team resource:", error);
    res.status(500).json({ message: "Failed to update team resource" });
  }
});

// ========================================
// BE WORKLOAD ROUTES - Indicateurs charge BE
// ========================================

app.get("/api/be-workload", async (req, res) => {
  try {
    const { weekNumber, year } = req.query;
    const workload = await storage.getBeWorkload(
      weekNumber ? parseInt(weekNumber as string) : undefined,
      year ? parseInt(year as string) : undefined
    );
    res.json(workload);
  } catch (error) {
    console.error("Error fetching BE workload:", error);
    res.status(500).json({ message: "Failed to fetch BE workload" });
  }
});

app.post("/api/be-workload", async (req, res) => {
  try {
    const validatedData = insertBeWorkloadSchema.parse(req.body);
    const workload = await storage.createOrUpdateBeWorkload(validatedData);
    res.status(201).json(workload);
  } catch (error) {
    console.error("Error creating/updating BE workload:", error);
    res.status(500).json({ message: "Failed to create/update BE workload" });
  }
});

// ========================================
// DASHBOARD ROUTES - Statistiques POC
// ========================================

app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});

  const httpServer = createServer(app);
  return httpServer;
}