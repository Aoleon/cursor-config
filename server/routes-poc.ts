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
    const validatedData = insertOfferSchema.parse(req.body);
    const offer = await storage.createOffer(validatedData);
    res.status(201).json(offer);
  } catch (error) {
    console.error("Error creating offer:", error);
    res.status(500).json({ message: "Failed to create offer" });
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
    const validatedData = insertProjectTaskSchema.parse({
      ...req.body,
      projectId: req.params.projectId
    });
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