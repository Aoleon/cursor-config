import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertOfferSchema, insertProjectSchema, insertAoSchema, insertSupplierRequestSchema, insertQuotationSchema, insertProjectTaskSchema, insertBeWorkloadSchema, insertValidationMilestoneSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes - Temporarily disabled authentication
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

  // Dashboard routes
  app.get('/api/dashboard/stats', async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // AO routes
  app.get('/api/aos', async (req, res) => {
    try {
      const aos = await storage.getAos();
      res.json(aos);
    } catch (error) {
      console.error("Error fetching AOs:", error);
      res.status(500).json({ message: "Failed to fetch AOs" });
    }
  });

  app.get('/api/aos/:id', async (req, res) => {
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

  app.post('/api/aos', async (req, res) => {
    try {
      const validatedData = insertAoSchema.parse(req.body);
      const ao = await storage.createAo(validatedData);
      res.status(201).json(ao);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating AO:", error);
      res.status(500).json({ message: "Failed to create AO" });
    }
  });

  // Offer routes
  app.get('/api/offers', async (req, res) => {
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

  app.get('/api/offers/:id', async (req, res) => {
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

  app.post('/api/offers', async (req, res) => {
    try {
      const validatedData = insertOfferSchema.parse(req.body);
      const offer = await storage.createOffer(validatedData);
      res.status(201).json(offer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating offer:", error);
      res.status(500).json({ message: "Failed to create offer" });
    }
  });

  app.patch('/api/offers/:id', async (req, res) => {
    try {
      const updateData = insertOfferSchema.partial().parse(req.body);
      const offer = await storage.updateOffer(req.params.id, updateData);
      res.json(offer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating offer:", error);
      res.status(500).json({ message: "Failed to update offer" });
    }
  });

  app.delete('/api/offers/:id', async (req, res) => {
    try {
      await storage.deleteOffer(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting offer:", error);
      res.status(500).json({ message: "Failed to delete offer" });
    }
  });

  // Project routes
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
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

  app.post('/api/projects', async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', async (req, res) => {
    try {
      const updateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updateData);
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Project task routes
  app.get('/api/projects/:projectId/tasks', async (req, res) => {
    try {
      const tasks = await storage.getProjectTasks(req.params.projectId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
      res.status(500).json({ message: "Failed to fetch project tasks" });
    }
  });

  app.post('/api/projects/:projectId/tasks', async (req, res) => {
    try {
      const validatedData = insertProjectTaskSchema.parse({
        ...req.body,
        projectId: req.params.projectId,
      });
      const task = await storage.createProjectTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating project task:", error);
      res.status(500).json({ message: "Failed to create project task" });
    }
  });

  app.patch('/api/tasks/:id', async (req, res) => {
    try {
      const updateData = insertProjectTaskSchema.partial().parse(req.body);
      const task = await storage.updateProjectTask(req.params.id, updateData);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating project task:", error);
      res.status(500).json({ message: "Failed to update project task" });
    }
  });

  // Supplier request routes
  app.get('/api/supplier-requests', async (req, res) => {
    try {
      const { offerId } = req.query;
      const requests = await storage.getSupplierRequests(offerId as string);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching supplier requests:", error);
      res.status(500).json({ message: "Failed to fetch supplier requests" });
    }
  });

  app.post('/api/supplier-requests', async (req, res) => {
    try {
      const validatedData = insertSupplierRequestSchema.parse(req.body);
      const request = await storage.createSupplierRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating supplier request:", error);
      res.status(500).json({ message: "Failed to create supplier request" });
    }
  });

  app.patch('/api/supplier-requests/:id', async (req, res) => {
    try {
      const updateData = insertSupplierRequestSchema.partial().parse(req.body);
      const request = await storage.updateSupplierRequest(req.params.id, updateData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating supplier request:", error);
      res.status(500).json({ message: "Failed to update supplier request" });
    }
  });

  // Quotation routes
  app.get('/api/quotations', async (req, res) => {
    try {
      const { offerId } = req.query;
      const quotations = await storage.getQuotations(offerId as string);
      res.json(quotations);
    } catch (error) {
      console.error("Error fetching quotations:", error);
      res.status(500).json({ message: "Failed to fetch quotations" });
    }
  });

  app.post('/api/quotations', async (req, res) => {
    try {
      const validatedData = insertQuotationSchema.parse(req.body);
      const quotation = await storage.createQuotation(validatedData);
      res.status(201).json(quotation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating quotation:", error);
      res.status(500).json({ message: "Failed to create quotation" });
    }
  });

  app.patch('/api/quotations/:id', async (req, res) => {
    try {
      const updateData = insertQuotationSchema.partial().parse(req.body);
      const quotation = await storage.updateQuotation(req.params.id, updateData);
      res.json(quotation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating quotation:", error);
      res.status(500).json({ message: "Failed to update quotation" });
    }
  });

  // BE Workload routes - Solve "Aucune mesure de charge BE" issue from JLM audit
  app.get('/api/be-workload', async (req, res) => {
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

  app.post('/api/be-workload', async (req, res) => {
    try {
      const validatedData = insertBeWorkloadSchema.parse(req.body);
      const workload = await storage.createOrUpdateBeWorkload(validatedData);
      res.status(201).json(workload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating/updating BE workload:", error);
      res.status(500).json({ message: "Failed to create/update BE workload" });
    }
  });

  // Validation Milestones routes - Solve "Absence de jalon Fin d'études" issue from JLM audit
  app.get('/api/validation-milestones', async (req, res) => {
    try {
      const { offerId, projectId } = req.query;
      const milestones = await storage.getValidationMilestones(
        offerId as string,
        projectId as string
      );
      res.json(milestones);
    } catch (error) {
      console.error("Error fetching validation milestones:", error);
      res.status(500).json({ message: "Failed to fetch validation milestones" });
    }
  });

  app.post('/api/validation-milestones', async (req, res) => {
    try {
      const validatedData = insertValidationMilestoneSchema.parse(req.body);
      const milestone = await storage.createValidationMilestone(validatedData);
      res.status(201).json(milestone);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating validation milestone:", error);
      res.status(500).json({ message: "Failed to create validation milestone" });
    }
  });

  // Users route for BE member selection with more realistic JLM team
  app.get('/api/users', async (req, res) => {
    try {
      const { role } = req.query;
      // Return mock JLM team members based on audit findings
      const mockUsers = [
        {
          id: "user-sylvie",
          email: "sylvie.martin@jlm-menuiserie.fr", 
          firstName: "Sylvie",
          lastName: "Martin",
          role: "responsable_be",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "user-nicolas", 
          email: "nicolas.projeteur@jlm-menuiserie.fr",
          firstName: "Nicolas", 
          lastName: "Dupont",
          role: "technicien_be",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "user-julien",
          email: "julien.ceo@jlm-menuiserie.fr", 
          firstName: "Julien",
          lastName: "Moreau", 
          role: "admin",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "user-france",
          email: "france.chef@jlm-menuiserie.fr", 
          firstName: "France",
          lastName: "Leclerc", 
          role: "chef_travaux",
          profileImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Filter by role if specified
      if (role && role !== 'all') {
        const roleFilter = role.split(',');
        const filteredUsers = mockUsers.filter(user => roleFilter.includes(user.role));
        res.json(filteredUsers);
      } else {
        res.json(mockUsers);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Mock data initialization route for testing - Create sample offers and workload data
  app.post('/api/init-sample-data', async (req, res) => {
    try {
      // Create sample AOs
      const sampleAos = [
        {
          reference: "AO-2024-001",
          client: "Mairie de Calais",
          location: "Calais (62)",
          departement: "62" as const,
          description: "Menuiseries extérieures - Mairie",
          menuiserieType: "bardage" as const,
          estimatedAmount: 45000,
          maitreOeuvre: "Cabinet Architecture Nord",
          source: "BOMP" as const
        },
        {
          reference: "AO-2024-002", 
          client: "SCI Immobilier Pas-de-Calais",
          location: "Boulogne-sur-Mer (62)",
          departement: "62" as const,
          description: "Fenêtres PVC logements sociaux",
          menuiserieType: "fenetres" as const,
          estimatedAmount: 78000,
          maitreOeuvre: "BET Structure Plus",
          source: "Marche_Online" as const
        }
      ];

      for (const aoData of sampleAos) {
        await storage.createAo(aoData);
      }

      // Create sample offers
      const sampleOffers = [
        {
          reference: "OFF-2024-001",
          aoId: null,
          client: "Mairie de Calais", 
          location: "Calais (62)",
          menuiserieType: "bardage" as const,
          estimatedAmount: 45000,
          status: "en_chiffrage" as const,
          responsibleUserId: "user-sylvie",
          deadline: new Date("2024-02-15"),
          isPriority: true
        },
        {
          reference: "OFF-2024-002",
          aoId: null,
          client: "SCI Immobilier",
          location: "Boulogne-sur-Mer (62)", 
          menuiserieType: "fenetres" as const,
          estimatedAmount: 78000,
          status: "nouveau" as const,
          responsibleUserId: "user-nicolas",
          deadline: new Date("2024-02-20"),
          isPriority: false
        },
        {
          reference: "OFF-2024-003",
          aoId: null,
          client: "Entreprise Nordique",
          location: "Dunkerque (59)",
          menuiserieType: "bardage" as const,
          estimatedAmount: 120000,
          status: "en_validation" as const,
          responsibleUserId: "user-sylvie", 
          deadline: new Date("2024-01-30"),
          isPriority: true
        }
      ];

      for (const offerData of sampleOffers) {
        await storage.createOffer(offerData);
      }

      // Create sample BE workload data
      const currentWeek = Math.ceil(((new Date()).getDate() - 1) / 7) + 1;
      const currentYear = new Date().getFullYear();

      const sampleWorkload = [
        {
          userId: "user-sylvie",
          weekNumber: currentWeek,
          year: currentYear,
          plannedHours: 42,
          actualHours: 38,
          capacityHours: 40
        },
        {
          userId: "user-nicolas",
          weekNumber: currentWeek, 
          year: currentYear,
          plannedHours: 45,
          actualHours: 40,
          capacityHours: 40
        }
      ];

      for (const workloadData of sampleWorkload) {
        await storage.createOrUpdateBeWorkload(workloadData);
      }

      res.json({ 
        message: "Sample data created successfully",
        data: {
          aos: sampleAos.length,
          offers: sampleOffers.length, 
          workload: sampleWorkload.length
        }
      });
    } catch (error) {
      console.error("Error creating sample data:", error);
      res.status(500).json({ message: "Failed to create sample data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
